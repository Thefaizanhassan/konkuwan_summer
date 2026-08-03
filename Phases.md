# Phases — development roadmap
 
**Status:** living document · **Last updated:** 2026-08-02
 
Legend: ✅ Complete · 🟡 In progress · ⬜ Planned
 
Related: [PRD.md](./PRD.md) · [Architecture.md](./Architecture.md) · [Memory.md](./Memory.md)
 
---
 
## Overview
 
| # | Phase | Status |
|---|---|---|
| 1 | Foundation | ✅ |
| 2 | Authentication & roles | ✅ |
| 3 | Core CRUD modules | ✅ |
| 4 | Orders | ✅ |
| 5 | Quotations | ✅ |
| 6 | Invoices | ✅ |
| 7 | Delivery Challans | ✅ |
| 8 | FarmOps | ✅ |
| 9 | Dashboard & analytics | ✅ |
| 10 | Finance | ✅ |
| 11 | Public website & enquiries | ✅ |
| 12 | Localization (English/Odia) | ✅ |
| 13 | Deployment (Cloudflare) | 🟡 |
| 14 | Inventory management | ⬜ |
| 15 | Notifications | ⬜ |
| 16 | Reporting UI | ⬜ |
| 17 | Future enhancements | ⬜ |
 
---
 
## Phase 1 — Foundation ✅
 
**Objective.** A running skeleton: React SPA, Express API, Supabase schema.
 
**Scope.** Vite + React + Tailwind scaffold, brand tokens, Express app with middleware and error handling, Supabase project, base schema.
 
**Deliverables.** `client/` and `server/` packages · `database/supabaseSchema.sql` · shared UI primitives (`Button`, `Input`, `Modal`, `DataTable`, `Pagination`) · `AppError` + central error handler.
 
**Dependencies.** None.
 
- [x] Client builds and serves
- [x] API responds on `/api/health`
- [x] Schema applied in Supabase
- [x] Brand tokens in `tailwind.config.js`
 
---
 
## Phase 2 — Authentication & roles ✅
 
**Objective.** Only invited staff reach the admin panel, with role-appropriate access.
 
**Scope.** Supabase Auth sign-in, JWT verification server-side, `profiles` with role and active flag, protected routes, role-gated navigation, invite → set-password, change password.
 
**Deliverables.** `AuthContext` · `ProtectedRoute` · `middlewares/auth.js` (`authenticate`, `authorize`) · `/set-password` · Account settings.
 
**Dependencies.** Phase 1.
 
- [x] Sign in / sign out
- [x] Five roles enforced
- [x] Invite by email; new user sets a password
- [x] 401 signs the user out
- [x] Users and Settings restricted to `super_admin`
 
**Note.** A legacy JWT/bcrypt auth path existed alongside this and was removed in the Cloudflare work — it was unreachable from both client and server.
 
---
 
## Phase 3 — Core CRUD modules ✅
 
**Objective.** Manage the catalogue and the buyer book.
 
**Scope.** Products (CRUD, images, tags, active toggle, drag-and-drop ordering, archive/delete), Categories, Customers (CRUD, search, lead-status filter, pagination, CSV import/export, profile page), Audit logs, Settings.
 
**Deliverables.** Product, category, customer, audit and settings modules end to end.
 
**Dependencies.** Phase 2.
 
- [x] Product ordering persists and drives the public site
- [x] Image upload to Supabase Storage
- [x] Customers paginated 20/page with search + filter
- [x] Delete blocked with a 409 when orders reference the customer
- [x] Customer profile: totals, products bought, order timeline
- [x] Audit log written on every mutation
- [x] Settings drive invoicing, EMI and AI provider
 
---
 
## Phase 4 — Orders ✅
 
**Objective.** Track a sale from draft to delivery.
 
**Scope.** Order creation with line items, status lifecycle, per-line final price, list filters, order detail.
 
**Deliverables.** Order module · `utils/orderStatus.js` defining the billable set.
 
**Dependencies.** Phase 3.
 
- [x] Create with multiple line items
- [x] Status transitions draft → confirmed → dispatched → delivered, plus cancelled
- [x] Filter by status and date range
- [x] Billable statuses shared with Analytics and Finance
 
---
 
## Phase 5 — Quotations ✅
 
**Objective.** Send a priced offer before commitment.
 
**Scope.** Generation per order, financial-year numbering, branded PDF, link to the resulting invoice.
 
**Deliverables.** `downloadQuotation()` · quotation fields on `orders` · quotation terms in Settings.
 
**Dependencies.** Phase 4.
 
- [x] Unique number per financial year (`K/2026-27/K1`)
- [x] Number stored on the order
- [x] PDF: parties, items, total in words, terms
- [x] Reference printed on the invoice
 
---
 
## Phase 6 — Invoices ✅
 
**Objective.** Issue a compliant GST invoice.
 
**Scope.** Generation per order, `KON/<FY>/<n>` numbering, PDF matching the supplied sample, tax and due days from Settings, bank details, Indian number-to-words.
 
**Deliverables.** `downloadInvoice()` · invoice fields · bank settings.
 
**Dependencies.** Phase 5.
 
- [x] Layout matches the reference document
- [x] HSN/SAC, IGST, shipping
- [x] Total in words (lakh/crore)
- [x] Tax % and due days read from Settings
- [x] Long addresses wrap inside the panel; the panel grows to fit
 
---
 
## Phase 7 — Delivery Challans ✅
 
**Objective.** Record procurement from farmers.
 
**Scope.** Challan against a farmer with line items and charges, `CH/<FY>/<n>` numbering, printable PDF with signature lines.
 
**Deliverables.** Challan module · `downloadChallan()` · challan tables.
 
**Dependencies.** Phase 4, Phase 8.
 
- [x] Create against a farmer with purchase rates
- [x] Challan charges separate from goods value
- [x] PDF with signature lines
- [x] Numbering per financial year
 
---
 
## Phase 8 — FarmOps ✅
 
**Objective.** Run cultivation and the farmer network.
 
**Scope.** CropOS (setup, area, planting date, generated package of practice, observations), FarmerOS (enrolment, types, search, coverage targets, profiles, visits, CSV), War Room (AI Monday brief, saved).
 
**Deliverables.** Farm module with four tabs · crop/farmer/visit/observation tables · `war_room_briefs`.
 
**Dependencies.** Phase 3 (products supply the crop list).
 
- [x] Crops derived from products, not hard-coded
- [x] Cultivated area editable per crop
- [x] Package of practice generated from the planting date
- [x] Connected vs independent farmers
- [x] Editable per-crop coverage targets
- [x] Farmer profile with activity timeline
- [x] Farmer CSV import/export with duplicate skipping
- [x] War Room briefs persisted and re-openable
 
---
 
## Phase 9 — Dashboard & analytics ✅
 
**Objective.** One screen for daily operating decisions.
 
**Scope.** KPI cards with trends, operational strip, Needs attention panel, 12-month revenue chart with day drill-down, top products, recent orders, status distribution, recent activity.
 
**Deliverables.** `analytics.controller.js` · Dashboard page · `NeedsAttention` component.
 
**Dependencies.** Phases 3–8.
 
- [x] Revenue MTD, Orders MTD, Total customers with month-on-month trends
- [x] Revenue counts confirmed, dispatched and delivered — matching Finance
- [x] Top products from actual sales
- [x] Needs attention: severity-ranked cards with actions
- [x] Revenue chart drills into a month day-by-day with no extra request
- [x] Every card links to its module
 
---
 
## Phase 10 — Finance ✅
 
**Objective.** Keep cash and obligations visible.
 
**Scope.** EMI alert from Settings, cash position with update history, safe-deploy figure, monthly revenue split, expenses by category, receipt upload.
 
**Deliverables.** Finance page · FinanceOS · `expenses`, `cash_balance` · finance endpoints.
 
**Dependencies.** Phase 4, Phase 8.
 
- [x] EMI driven by Settings, no dummy values
- [x] Cash position with full audit trail (old → new, who, when)
- [x] Safe deploy = cash − 2× EMI
- [x] Revenue splits logged revenue vs product sales
- [x] Receipts uploaded to Supabase Storage
- [x] Finance moved to the main sidebar
 
---
 
## Phase 11 — Public website & enquiries ✅
 
**Objective.** Establish credibility and capture demand.
 
**Scope.** Seven public pages, catalogue driven by the admin panel, buyer and investor forms, admin inbox with reply templates.
 
**Deliverables.** Public pages · `contact_submissions` · ContactInbox · reply-template builders.
 
**Dependencies.** Phase 3.
 
- [x] Catalogue reflects admin products, order, tags and availability
- [x] Buyer form with searchable multi-select products
- [x] Investor form
- [x] Submissions stored and listed in the admin inbox
- [x] Reply templates per enquiry type
- [x] New enquiries feed the dashboard
 
---
 
## Phase 12 — Localization (English/Odia) ✅
 
**Objective.** Field staff work in their own language.
 
**Scope.** i18next, English and Odia locales, per-user persistence, full admin coverage.
 
**Deliverables.** `client/src/i18n/` · 572 keys per locale · `/api/me/preferences` · `profiles.language` · language selector in Account settings.
 
**Dependencies.** Phases 2–11.
 
- [x] Selector under Account settings
- [x] Preference stored per user and applied at login
- [x] Menus, tables, forms, buttons, dialogs, validation and notifications translated
- [x] Locale files have identical key sets
- [ ] **PDFs remain English** — jsPDF performs no Indic shaping, so Odia would render reordered. Gated by `PDF_LANGUAGES`; see Phase 17.
 
---
 
## Phase 13 — Deployment (Cloudflare) 🟡
 
**Objective.** Run in production as a single Cloudflare Worker.
 
**Scope.** Worker config, Express on Workers via `httpServerHandler`, static assets, secrets, custom domain.
 
**Deliverables.** `wrangler.jsonc` · `worker.js` · `server/diagnose.js` · deployment analysis.
 
**Dependencies.** All prior phases.
 
- [x] SPA served from `client/dist` with deep-link fallback
- [x] Express runs on Workers under `nodejs_compat`
- [x] Workers-incompatible dependencies removed (`sequelize`, `pg`, `bcrypt`)
- [x] Bundling failures fixed (`iconv-lite` browser field, Joi browser build)
- [x] Uploads moved to Supabase Storage — Workers has no persistent disk
- [x] Startup fails loudly on missing configuration
- [ ] **Worker secrets set in Cloudflare** ← current blocker
- [ ] `VITE_*` build variables set
- [ ] First successful production deploy
- [ ] Custom domain + TLS
- [ ] WAF rate-limiting rule on `/api/*`
- [ ] Legacy `/uploads/...` image rows migrated
 
---
 
## Phase 14 — Inventory management ⬜
 
**Objective.** Know what is in stock.
 
**Scope.** Stock in/out, decrement on dispatch, low-stock alerts, per-product ledger, management UI.
 
**Deliverables.** Inventory module; movements table.
 
**Dependencies.** Phase 13. Partially present: the `inventory` table and reporting endpoint exist, with no UI and no automatic movement.
 
- [ ] Record stock in from challans
- [ ] Decrement on order dispatch
- [ ] Low-stock alerts in Needs attention
- [ ] Movement history per product
 
---
 
## Phase 15 — Notifications ⬜
 
**Objective.** Push what needs attention instead of waiting to be checked.
 
**Scope.** In-app centre and email for new enquiries, overdue visits, EMI due, orders stuck in draft.
 
**Dependencies.** Phase 13.
 
- [ ] Notification model and preferences
- [ ] In-app centre
- [ ] Email delivery
- [ ] Per-user opt-out
 
---
 
## Phase 16 — Reporting UI ⬜
 
**Objective.** Surface analytics that exist only as endpoints today.
 
**Scope.** Reports section with date ranges over revenue, sales, product performance, customer insights, order trends and pricing history; CSV/PDF export.
 
**Dependencies.** Phase 13.
 
- [ ] Reports page with a date-range picker
- [ ] One view per existing endpoint
- [ ] Export
- [ ] Role-gated
 
---
 
## Phase 17 — Future enhancements ⬜
 
| Item | Notes |
|---|---|
| Odia PDFs | Needs a shaping-capable renderer; likely an HTML print path, trading vector text for correctness |
| Traceability | Order line → challan → farmer → plot |
| Mobile field flow | Focused visit-logging screen for low-bandwidth phones |
| Buyer portal | Self-service reorder and order status |
| Advanced analytics | Yield per acre, cost per kg, farmer profitability |
| Client code-splitting | 1.6 MB single chunk; route-level `React.lazy` on the admin section |
| SQL aggregation | Dashboard aggregates in JS; move to SQL past a few thousand orders |
| Accessibility audit | Formal WCAG pass |
| Automated tests | No runner is configured; `vite.config.js` references a `setupFiles` path that does not exist |