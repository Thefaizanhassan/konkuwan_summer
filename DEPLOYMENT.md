# Deployment
 
Two supported targets. **Cloudflare Workers is the primary one**; Docker exists
for self-hosting and for production-like local testing.
 
Both run the SPA and the API on a single origin, which is why `VITE_API_URL`
defaults to a relative `/api` and there is no CORS configuration anywhere.
 
---
 
## Before either target
 
### 1. Run the outstanding migrations
 
In the Supabase SQL editor, in order. All are idempotent and safe to re-run.
 
```
database/2026-07-13_user_language.sql
database/2026-08-02_warehouses_and_challan_types.sql
database/2026-08-03_custom_products_and_stakeholder.sql
```
 
### 2. Know which key goes where
 
| Value | Where it lives | Visible to the browser? |
|---|---|---|
| `SUPABASE_URL` | server runtime | no |
| `SUPABASE_SERVICE_ROLE_KEY` | server runtime | **never** |
| `VITE_SUPABASE_URL` | build time | yes, compiled into the bundle |
| `VITE_SUPABASE_ANON_KEY` | build time | yes, compiled into the bundle |
 
The service-role key bypasses row-level security. It must never be a build
argument, never be committed, and never reach the client. The anon (publishable)
key is designed to be public — Supabase enforces access with RLS and the user's
JWT.
 
`VITE_*` values are **compiled into the bundle**, so changing one requires a
rebuild, not a restart.
 
---
 
## Target A — Cloudflare Workers (primary)
 
One Worker serves both. `wrangler.jsonc` routes `/api/*` through the Express
app (`run_worker_first`) and everything else through Workers Static Assets.
 
### Runtime secrets
 
Workers & Pages → your Worker → Settings → Variables and Secrets → Add → **Secret**:
 
| Name | Required |
|---|---|
| `SUPABASE_URL` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes |
| `OPENAI_API_KEY` | only for the Farm Ops AI features |
 
Or from the CLI:
 
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
 
The server refuses to start without the first two, so a missing value fails the
deploy rather than shipping a broken Worker.
 
### Build variables
 
Workers Builds → Settings → **Build variables** (a different setting from
Secrets — build variables exist only while `vite build` runs and are never
visible to the Worker at runtime, which is exactly right for `VITE_*`):
 
| Name |
|---|
| `VITE_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` |
 
`VITE_SUPABASE_URL` is also what the build derives the Content-Security-Policy
from (`client/vite-plugin-headers.js`). If it is missing, the build fails with
a message saying so — deliberately, because a deployed SPA whose CSP omits the
Supabase origin cannot log anyone in, and that is far harder to diagnose from
the browser than a build error is.
 
### Build settings
 
| Setting | Value |
|---|---|
| Build command | `npm --prefix client ci && npm --prefix client run build && npm --prefix server ci --omit=dev` |
| Deploy command | `npx wrangler deploy` |
| Output directory | leave blank — `wrangler.jsonc` sets `assets.directory` |
 
### Deploy
 
```bash
npm --prefix client run build
npx wrangler deploy
```
 
### After the first deploy
 
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Log in as super_admin; the dashboard shows real figures
- [ ] Generate an invoice PDF
- [ ] Switch the language to Odia and Hindi
- [ ] Add a **WAF rate-limiting rule on `/api/*`** — the app deliberately has no
      in-process limiter, because on Workers an in-memory counter is per-isolate
      and resets constantly, so the limit would be unenforced. The public
      contact endpoints (`POST /api/contact/buyer`, `/investor`) are
      unauthenticated and this is their only protection.
- [ ] Custom domain, TLS mode **Full (strict)**, HSTS on
 
---
 
## Target B — Docker
 
A single image: the SPA is built, then Express serves it alongside the API.
 
### Build and run
 
```bash
cp .env.docker.example .env      # fill in the real values
docker compose up --build
open http://localhost:8080
```
 
Or without compose:
 
```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sb_publishable_xxx \
  -t konkuwan-herbs:latest .
 
docker run -d --name konkuwan \
  -p 8080:8080 \
  -e SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
  konkuwan-herbs:latest
```
 
### What the image does
 
| | |
|---|---|
| Base | `node:22-alpine` |
| Stages | 3 — client build, server dependencies, runtime. Only the last is shipped, so neither build toolchain is in the final image. |
| User | `node` (uid 1000), not root |
| Init | `dumb-init`, so `docker stop` reaches Node and the graceful shutdown in `server/src/server.js` actually runs |
| Port | 8080 |
| Healthcheck | `GET /api/health` every 30s. Unauthenticated and touches no database, so it reports "the process is up and routing" rather than failing when Supabase is briefly unreachable. |
| Volumes | none. Uploads go to Supabase Storage and logs go to stdout, so the container holds no state. |
 
### Ports and networking
 
Only 8080 is exposed. Put a reverse proxy (nginx, Caddy, a cloud load balancer)
in front for TLS — the container speaks plain HTTP and assumes something else
terminates TLS, the same assumption the Cloudflare deployment makes.
 
The container needs outbound HTTPS to `*.supabase.co`, and to `api.openai.com`
only if the AI features are enabled. No inbound access to anything else.
 
### Environment variables
 
Runtime (`-e` / `environment:`):
 
| Name | Required | Default |
|---|---|---|
| `SUPABASE_URL` | yes | — |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | — |
| `NODE_ENV` | no | `production` |
| `PORT` | no | `8080` |
| `SUPABASE_IMAGE_BUCKET` | no | `product-images` |
| `MAX_FILE_SIZE` | no | `5242880` (5 MB) |
| `AI_PROVIDER` | no | `openai` |
| `OPENAI_API_KEY` | no | — |
 
Build (`--build-arg` / `args:`):
 
| Name | Required |
|---|---|
| `VITE_SUPABASE_URL` | yes |
| `VITE_SUPABASE_ANON_KEY` | yes |
| `VITE_API_URL` | no, defaults to `/api` |
 
### Security headers in a container
 
`client/dist/_headers` is Cloudflare-specific: Static Assets reads it, Express
does not. So when Express serves the SPA it sets the same Content-Security-Policy,
`X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` itself, derived
from `SUPABASE_URL`. The two paths are kept deliberately in step — if you edit
one, edit the other (`client/vite-plugin-headers.js` and the SPA block in
`server/src/app.js`).
 
HSTS is **not** set by the container, because the container does not terminate
TLS. Set it at your reverse proxy.
 
---
 
## Verifying a deployment
 
```bash
BASE=https://your-host
 
curl -s $BASE/api/health                      # {"status":"ok",...}
curl -s -o /dev/null -w '%{http_code}\n' $BASE/          # 200, the SPA
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/nope  # 404 JSON, not HTML
curl -sI $BASE/ | grep -i content-security-policy        # present
curl -s $BASE/api/admin/orders                # 401, not a stack trace
```
 
A 500 in production returns a generic message plus an `error_id`; the real error
is in the logs against that same id. Quote the id when reporting a problem.
 
---
 
## Rollback
 
**Cloudflare** — Workers & Pages → your Worker → Deployments → pick the previous
version → Rollback. Instant, and it does not touch the database.
 
**Docker** — images are tagged; keep the previous tag and
`docker compose up -d` with it.
 
Neither rolls back a database migration. All three migrations are additive
(new columns and tables, one dropped NOT NULL), so an older build runs against
the newer schema without error.