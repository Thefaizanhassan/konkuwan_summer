# Memory — living project log
 
**Update this file after every significant task.** It is the fastest way for a person or an AI to learn the current state without re-reading the codebase.
 
**Last updated:** 2026-08-02
 
Related: [PRD.md](./PRD.md) · [Architecture.md](./Architecture.md) · [RULES.md](./RULES.md) · [Phases.md](./Phases.md) · [Design.md](./Design.md)
 
---
 
## 1. Project summary
 
Konkuwan Herbs is a B2B platform for sourcing medicinal herbs from smallholder farmers in Ghotiya, Bastar and selling them to bulk buyers. It combines a public marketing site with an admin panel covering products, customers, orders, quotations, invoices, delivery challans, farm operations and finance.
 
React 19 SPA + Express API, both deployed as a **single Cloudflare Worker**. Data lives in Supabase (managed Postgres) and is reached over HTTPS/PostgREST — there is no SQL connection and no ORM. Interface available in English and Odia.
 
---
 
## 2. Current status
 
### Completed
 
Foundation · Authentication and roles · Products, categories, customers, audit, settings · Orders with a full status lifecycle (catalogue **and** off-catalogue lines) · Quotations · Invoices · Warehouses · Delivery challans (farmer→warehouse and warehouse→warehouse) · FarmOps (CropOS, FarmerOS, War Room) · Financial-year dashboard analytics · Customer purchase analytics · Stakeholder role with per-user dashboard grants · Finance · Public site and enquiry capture · English/Odia/**Hindi** localisation · Cloudflare Worker configuration.
 
See [Phases.md](./Phases.md) for the phase-by-phase checklist.
 
### In progress
 
**Phase 13 — production deployment.** Code is deploy-ready and verified against the real Workers runtime. Blocked on Cloudflare configuration, not code.
 
### Pending
 
1. Set Worker secrets in Cloudflare (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`)
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **build variables**
3. First successful production deploy
4. Custom domain + TLS
5. Migrate legacy `/uploads/...` image rows
6. WAF rate-limiting rule on `/api/*`
 
### Known issues
 
| Issue | Impact | Priority |
|---|---|---|
| Worker secrets not set — deploy fails validation | Blocks production | **P0** |
| Legacy `product_images.url` rows hold `/uploads/...` | Those images 404 in production | P1 |
| Client bundle is one 1.6 MB chunk | Slow first load | P2 |
| PDFs render English only | Odia users get English documents | P2 |
| No test runner — `vite.config.js` points `setupFiles` at a missing file | No automated regression safety | P2 |
| Dashboard aggregates in JS | Fine now; degrades past a few thousand orders | P3 |
| No inventory UI; stock never decrements | Manual stock tracking | P3 |
 
### Technical debt
 
- `config/supabase.js` and `config/supabaseAdmin.js` are near-duplicates kept apart for historical reasons; they now resolve the same key and could merge.
- `users`, `roles`, `user_roles` tables survive from the pre-Supabase-Auth design; `profiles` is authoritative.
- `errorHandler.js` still carries a `handleSequelizeValidationError` branch that can never fire.
- Several files contain large commented-out earlier versions.
- No shared type or schema contract between client and server.
 
### Recent fixes
 
Dashboard revenue and Top Products · Needs attention redesign · Revenue chart drill-down · `.env` load-order regression · `iconv-lite` and Joi Workers bundling · Supabase key-role guard · connection diagnostic.
 
---
 
## 3. Development timeline
 
Reverse chronological. Dates are when the work landed.
 
### 2026-08-02 — Project documentation
**Added:** `PRD.md`, `Architecture.md`, `RULES.md`, `Phases.md`, `Design.md`, `Memory.md`
**Why:** No single source of truth existed; onboarding a person or an AI required replaying the whole conversation history.
 
### 2026-08-02 — Actionable configuration errors
**Files:** `server/src/config/index.js`
**Why:** "Missing SUPABASE_URL" sent people to Cloudflare's *Build variables* screen instead of *Variables and Secrets*. The guard now lists every missing name at once and states where to set them.
 
### 2026-08-01 — Dashboard fixes and chart drill-down
**Files:** `server/src/utils/orderStatus.js` (new), `server/src/controllers/analytics.controller.js`, `server/src/controllers/farm.controller.js`, `server/src/app.js`, `client/src/pages/admin/Dashboard.jsx`, locales, `wrangler.jsonc`
**Why:** Revenue (MTD) showed ₹0 and Top Products was empty — both filtered on `status = 'delivered'` alone while Finance counted confirmed/dispatched/delivered, so the two screens disagreed and the dashboard read zero until something was marked delivered. Also restored `/uploads` static serving for legacy images, redesigned the Needs attention widget, and added day-by-day drill-down to the revenue chart.
 
### 2026-08-01 — `.env` load-order regression
**Files:** `server/src/app.js`, `server/src/config/index.js`, `config/supabaseAdmin.js`, `config/supabase.js`, `middlewares/auth.js`
**Why:** The server crashed at startup with "Missing SUPABASE_URL" despite a correct `.env`. Removing the dead Sequelize layer had removed the accidental `dotenv.config()` that ran first. `app.js` now requires `./config` on line 1, and every module reading `process.env` at load time requires config itself.
 
### 2026-08-01 — Connection diagnostic
**Files:** `server/diagnose.js` (new), `server/src/config/supabaseAdmin.js`
**Why:** An empty admin panel had at least five possible causes that all looked identical. The diagnostic walks each hop and reports the first break. `supabaseAdmin.js` also warns when the key is an anon key rather than service-role — a case where login works but every query silently returns nothing.
 
### 2026-07-31 — Workers dependency bundling
**Files:** `server/package.json` (iconv-lite override), `wrangler.jsonc` (joi alias)
**Why:** Deploy passed bundling but failed startup validation. Two dependencies point `browser` fields at stripped builds: `iconv-lite@0.4` stubs `./lib/streams` while still calling it, and Joi ships a browser bundle without the TLD list, throwing on `.email()`.
 
### 2026-07-30 — Single-Worker deployment
**Files:** `wrangler.jsonc`, `worker.js` (new), removed `server/src/models/**`, legacy auth, `config/database.js`; `middlewares/upload.js`, `product.controller.js`, `utils/logger.js`, `client/src/services/api.js`
**Why:** First deploy served a blank page — no wrangler config, so it uploaded `client/` including `node_modules` and served the unbuilt Vite template. Also removed Workers-incompatible dependencies, moved uploads to Supabase Storage, and replaced Winston file transports with a console sink.
 
### 2026-08-05 — Trilingual admin panel and regression review
**Files:** `client/src/i18n/locales/hi.json` (new), `i18n/index.js`, `server/src/controllers/me.controller.js`, `routes/analytics.admin.routes.js`, `utils/dashboardWidgets.js`, `validations/order.validation.js`, `validations/challan.validation.js`, `controllers/analytics.controller.js`, `pages/admin/Dashboard.jsx`, all three locales
**Why:** Added Hindi (673 keys, three-way parity). The regression review over Tasks 2–6 then found six defects — the worst being that a stakeholder was 403'd from `/api/admin/analytics/dashboard`, the one endpoint the whole role depends on, and that six granted widgets rendered nothing because they sat inside `{!restricted && …}` blocks. All fixed; see `TASKS.md` §4 for the full table.
 
### 2026-08-02/03 — Warehouses, challan redesign, FY analytics, custom products, stakeholder role
**Files:** `database/2026-08-02_*.sql`, `database/2026-08-03_*.sql`, `utils/financialYear.js`, `utils/dashboardWidgets.js`, `warehouse.*`, `WarehouseManagement.jsx`, `CustomerPurchaseChart.jsx`, `DeliveryChallan.jsx`, `analytics.controller.js`, `Dashboard.jsx`, `user.admin.*`
**Why:** Challans had one shape but two real workflows; the dashboard reported calendar months while the business runs on the Indian financial year; one-off crops could not be sold without polluting the catalogue; and investors needed visibility without operational access.
 
### 2026-07-30 — Multilingual admin panel and PDF address overflow
**Files:** `client/src/i18n/**` (new), `server/src/controllers/me.controller.js` (new), `database/2026-07-13_user_language.sql`, `client/src/lib/invoice.js`, most admin pages
**Why:** Field staff needed Odia. Added i18next with 572 keys per locale, persisted per user. Also fixed long "Billed To" addresses overflowing their panel in generated PDFs.
 
### Earlier
 
Delivery challan printing · customer purchase totals · farmer CSV import/export · collapsible sidebar · inquiry reply templates · invoice layout matching the sample · quotation generation · customer profile page · public multi-select contact form · dashboard overhaul · finance cash-position history · farmer profiles and search · CropOS fixes · product ordering and lifecycle.
 
---
 
## 4. Active work
 
| | |
|---|---|
| **Objective** | Complete Phase 13 — first successful production deploy |
| **Branch** | `claude/practical-feynman-073rag` |
| **Blocked on** | Cloudflare dashboard configuration (secrets), not code |
| **Recently touched** | `financialYear.js`, `dashboardWidgets.js`, `analytics.controller.js`, `analytics.admin.routes.js`, `Dashboard.jsx`, `order.validation.js`, `challan.validation.js`, `locales/hi.json` |
 
**Delivery note.** This session cannot push (`403 denied`), so every change ships as a `git format-patch` file to be applied and pushed locally.
 
---
 
## 5. Decisions log
 
**Single Worker rather than two services.** Same origin removes CORS and cross-service URL configuration entirely; `VITE_API_URL` defaults to a relative `/api` that is correct everywhere. Cost: frontend and backend release together — acceptable for a single-team internal panel.
 
**Express on Workers rather than Cloudflare Containers.** Workers gained `node:http`, so Express runs directly. Containers would have added a Docker build, cold starts and per-10ms billing for no benefit — but they remain the only option if the `bcrypt`-style native dependencies ever come back.
 
**Supabase over PostgREST, no ORM.** All access is HTTPS, which is precisely what makes the API deployable to Workers. A SQL connection would have required Hyperdrive or a container.
 
**Service-role key server-side only.** The server is the trusted tier and bypasses RLS deliberately. The browser only ever receives the publishable key.
 
**Billable statuses in a shared module.** Confirmed and dispatched orders are revenue; drafts and cancellations are not. Defined once in `utils/orderStatus.js` because two modules already disagreed in production.
 
**PDFs generated client-side.** Keeps PDF work off the Worker's CPU budget and lets the API return a plain JSON document.
 
**PDFs stay English.** jsPDF performs no Indic shaping, so Odia matras and conjuncts would render reordered — worse than English on a legal document. Gated by `PDF_LANGUAGES` in one place.
 
**Uploads to Supabase Storage, not R2.** Receipts already used Supabase Storage; adding R2 would mean a second storage system and the AWS SDK in a size-limited Worker.
 
**Fail loudly at startup.** Missing configuration aborts the boot — on Workers this fails the *deploy* rather than shipping a broken Worker.

**A widget grant is a promise, so the registry only lists what renders.** Four
widgets (customer analytics, farmer coverage, warehouse summary, inventory
movement) were designed but have no data in the dashboard payload. Rather than
offer a checkbox that saves a permission and shows nothing, they are documented
as Future Work in `utils/dashboardWidgets.js` and are not grantable. Add the
data first, then the key.
 
**Two gates for the stakeholder role, not one.** The route decides which
endpoints exist for the role; `filterDashboardForWidgets` decides which fields
come back from the one endpoint that does. Either alone would be wrong — a route
check cannot express per-user field grants, and a field filter on an
unauthorised route is not a gate at all.
 
**Blank strings collapse to undefined before Joi's `.or()`.** `.or()` tests key
presence, so `product_name: ''` satisfied "one of these is required" and let a
line through with no product. `.empty(Joi.valid('', null))` makes the rule mean
what it reads as, and turns a raw Postgres CHECK violation into a sentence.
 
**Joi aliased to its Node build.** The browser bundle strips the TLD list and throws on `.email()`. Aliasing keeps validation identical in dev and production instead of relaxing each validator.
 
---
 
## 6. Known bugs
 
| # | Bug | Root cause | Priority | Status |
|---|---|---|---|---|
| 1 | Production deploy fails validation | Worker secrets not set in Cloudflare | P0 | Open — configuration, not code |
| 2 | Legacy product images 404 | Rows hold relative `/uploads/...`; files were on local disk | P1 | Open — needs a data migration |
| 3 | Slow first load | Single 1.6 MB JS chunk | P2 | Open — route-level `React.lazy` planned |
| 4 | Odia users get English PDFs | jsPDF has no Indic shaping | P2 | Open by design; see Decisions |
| 5 | No automated tests | No runner configured; `setupFiles` path missing | P2 | Open |
| 6 | Drag-and-drop has no keyboard path | Native HTML5 DnD only | P3 | Open |
 
To find bug 2's scope: `SELECT id, product_id, url FROM product_images WHERE url LIKE '/uploads/%';`
 
---
 
## 7. Upcoming tasks
 
Ordered.
 
0. **Run the two pending migrations** in Supabase — `database/2026-08-02_warehouses_and_challan_types.sql` and `database/2026-08-03_custom_products_and_stakeholder.sql`
1. **Set Worker secrets** — unblocks everything else
2. **Set `VITE_*` build variables** — otherwise the deploy succeeds and login silently fails
3. **Deploy and verify** — `/api/health`, login, dashboard, PDF generation, language switch
4. **Migrate legacy image rows**
5. **Custom domain + TLS**, Full (strict), HSTS
6. **WAF rate-limiting rule** on `/api/*`
7. **Code-split the client bundle**
8. **Set up a test runner** and cover the revenue calculation first
9. **Inventory management UI** (Phase 14)
10. **Notifications** (Phase 15)
11. **Reporting UI** (Phase 16)
 
---
 
## 8. Maintenance
 
Update this file whenever you add, change or remove a feature: add a timeline entry (date, what, files, why), adjust Current status, and log any architectural decision.
 
Also update:
 
| Document | When |
|---|---|
| [PRD.md](./PRD.md) | Requirements, modules or business rules change |
| [Architecture.md](./Architecture.md) | Structure, stack, data flow or deployment changes |
| [RULES.md](./RULES.md) | Standards or conventions change |
| [Phases.md](./Phases.md) | A milestone completes or a phase is added |
| [Design.md](./Design.md) | Tokens, components or UI patterns change |
 
Documentation drifting from the implementation is worse than no documentation, because it is trusted. If you cannot update a document in the same commit, say so in the commit body.