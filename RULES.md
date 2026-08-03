# RULES — engineering standards
 
**Status:** living document · **Last updated:** 2026-08-02
 
Binding on everyone who contributes, human or AI. Read [Architecture.md](./Architecture.md) before your first change.
 
Related: [PRD.md](./PRD.md) · [Design.md](./Design.md) · [Phases.md](./Phases.md) · [Memory.md](./Memory.md)
 
---
 
## 1. Development principles
 
**Keep the architecture clean.** Routes stay thin, controllers hold logic, validation lives in Joi schemas, cross-cutting concerns live in middleware. Don't put a database query in a route file.
 
**Keep modules loosely coupled.** A module owns its data and exposes it over HTTP. Cross-module reads go through the API, not by reaching into another module's internals.
 
**Define shared rules once.** If two modules must agree on a rule, that rule gets a module in `utils/` and both import it. This is not theoretical — the dashboard and Finance disagreed about which order statuses count as revenue for weeks, and the dashboard silently showed ₹0. `utils/orderStatus.js` exists because of it.
 
**Prefer reusable components.** Check `components/ui/` before writing a button, input, modal, table or pagination control.
 
**Follow what is already there.** Match the surrounding file's conventions even when your personal preference differs. Consistency beats individual taste.
 
---
 
## 2. Coding standards
 
### Naming
 
| Thing | Convention | Example |
|---|---|---|
| React component file | PascalCase `.jsx` | `CustomerProfile.jsx` |
| Non-component module | camelCase `.js` | `imageUrl.js`, `orderStatus.js` |
| Server route file | `<resource>.<scope>.routes.js` | `order.admin.routes.js` |
| Server controller | `<resource>.controller.js` | `customer.controller.js` |
| Joi schema file | `<resource>.validation.js` | `challan.validation.js` |
| Database column | `snake_case` | `total_amount`, `lead_status` |
| API JSON field | `snake_case` — mirrors the DB | `revenue_mtd`, `top_products` |
| JS variable | `camelCase` | `revenueChart` |
| Constant | `SCREAMING_SNAKE_CASE` | `BILLABLE_ORDER_STATUSES` |
| Migration file | `YYYY-MM-DD_description.sql` | `2026-07-13_user_language.sql` |
| i18n key | `module.camelCaseKey` | `dashboard.revenueMtd` |
 
**Do not translate `snake_case` API fields to `camelCase` in the client.** The boundary is already inconsistent enough; adding a mapping layer would make it worse.
 
### Folder conventions
 
| Put it in | When |
|---|---|
| `components/ui/` | Presentational, no data fetching, reusable anywhere |
| `components/layout/` | Page shell — nav, footer, sidebar wrappers |
| `components/admin/` | Admin-specific and shared across admin pages |
| `pages/` | Route-level; may fetch data |
| `lib/` | Logic with no React dependency (PDF generation, URL helpers) |
| `services/` | Outbound HTTP configuration |
| `contexts/` | Cross-cutting React state |
 
A component used by exactly one page may live inside that page's file. Extract it when a second consumer appears — not before.
 
### Import order
 
```js
// 1. React and framework
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// 2. Third-party
import { useTranslation } from 'react-i18next';
// 3. Internal — contexts, services, lib
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
// 4. Components
import Button from '../../components/ui/Button';
// 5. Assets and styles
import logo from '../../assets/logo.svg';
```
 
Server files use CommonJS `require` in the same order: config → third-party → internal.
 
### File organisation
 
Within a React file: imports → module-level constants → helper components → the default-exported component → sub-components used only here. Keep files under roughly 500 lines; past that, extract.
 
### Comments
 
Explain **why**, never **what**. `// increment counter` is noise. `// Revenue counts confirmed orders too — waiting for delivery does not make an invoiced order less real` is worth its line. Non-obvious constraints — a browser-field quirk, a runtime limitation, an ordering dependency — must be commented, or the next person will "clean up" the workaround and reintroduce the bug.
 
---
 
## 3. AI development rules
 
### Do
 
- **Read before you write.** Trace the actual call graph. `package.json` lists dependencies; it does not tell you which ones are live. This project carried `sequelize`, `pg` and `bcrypt` for months while every live path used Supabase.
- **Preserve backward compatibility.** Existing rows, URLs and API shapes must keep working. If a change breaks stored data, migrate it or keep serving the old form.
- **Work sequentially.** Finish and verify one task before starting the next.
- **Reuse.** Search for an existing utility or component before adding one.
- **Verify against the real runtime.** Testing with shell environment variables hid a bug where `.env` was never loaded. Test the way the app actually starts.
- **State your assumptions** when a requirement is ambiguous, and proceed — do not silently pick an interpretation.
- **Document architectural changes** in [Memory.md](./Memory.md) and the relevant doc.
 
### Do not
 
- **Delete working functionality** because it looks unused. Prove it is unreachable first — and expect side effects: removing the dead Sequelize layer also removed the `dotenv.config()` call that everything depended on, and the server stopped booting.
- **Rewrite unrelated modules.** Fix what was asked. Note other problems; don't fix them uninvited.
- **Introduce a second way to do something** that already has a way.
- **Ignore business rules** encoded in constants or comments.
- **Change an API response shape** without updating every consumer in the same change.
- **Hardcode configuration.** Tax rates, EMI amounts, terms, bank details and API URLs come from Settings or environment variables.
- **Assume — verify.** Do not report a fix as working without evidence that it runs.
 
### Verification standard
 
A change is not done because it compiles. Before reporting completion:
 
| Change type | Minimum evidence |
|---|---|
| Server logic | Runs against real or mocked data with the expected output shown |
| Client UI | `npm run build` passes and the behaviour is exercised |
| Anything deployable | `npx wrangler dev` boots with no startup errors |
| Bug fix | The failure reproduced **before** the fix, and passes after |
 
Show the output. "It should work now" is not a report.
 
---
 
## 4. Error handling standards
 
### API errors
 
Throw or forward `AppError(message, statusCode)`. Never `res.status(500).json(...)` inline — the error handler is the single exit point.
 
```js
if (error) return next(new AppError(error.message, 500));
if (!data) return next(new AppError('Product not found.', 404));
```
 
| Code | Use for |
|---|---|
| 400 | Validation failure, malformed input |
| 401 | Missing, invalid or expired token |
| 403 | Authenticated but not permitted |
| 404 | Resource does not exist |
| 409 | Conflict — e.g. deleting a customer with orders |
| 500 | Unexpected failure |
 
A 409 must explain the conflict and how to resolve it. "Cannot delete" is not enough.
 
### Validation errors
 
Joi with `stripUnknown: true`, returning the first message with a 400. Never trust the client to send only editable fields.
 
### Configuration errors
 
Fail at startup, not at first use, and name the fix. `Missing SUPABASE_URL` is accurate but useless — say where to set it, and mention the setting it is commonly confused with.
 
### Logging
 
Use `utils/logger` (`error` / `warn` / `info` / `debug`), never bare `console.log` in server code. There is no persistent filesystem in production; the logger writes structured JSON to the console, which Workers Logs captures. Never log a key, token or password — log a prefix if you must.
 
### User-facing messages
 
Plain language, no stack traces, no internal identifiers. Every string goes through `t()`. Say what happened and what to do: not "Error 500" but "Could not save the product. Please try again."
 
### Loading, empty and error states
 
Every data-driven view needs all three.
 
- **Loading** — spinner or skeleton, never a blank panel.
- **Empty** — explain *why* it is empty and what to do: "No crops yet — add a product in Admin → Products and it appears here automatically."
- **Error** — surface the server's message when there is one, with a way to retry.
 
Distinguish empty from broken. A chart showing ₹0 because a filter excluded everything looks identical to one showing ₹0 because the API failed — that ambiguity cost real debugging time here.
 
### Retry behaviour
 
TanStack Query defaults are fine for reads. Do not auto-retry mutations. Never retry a 401 — sign the user out.
 
---
 
## 5. Testing checklist
 
Before marking any task complete:
 
**Always**
- [ ] `npm --prefix client run build` passes
- [ ] `node --check` passes on every changed server file
- [ ] The server boots from `server/.env` alone: `npm --prefix server run dev`
- [ ] No secret is committed; `git status` is clean of `.env` files
 
**When server code changed**
- [ ] `/api/health` returns 200
- [ ] A protected route returns 401 without a token
- [ ] The changed endpoint returns the expected shape
- [ ] `npx wrangler dev` starts with zero startup errors
 
**When client code changed**
- [ ] The affected screens render in both English and Odia
- [ ] Loading, empty and error states all reachable
- [ ] Layout holds at 375 px, 768 px and 1280 px
- [ ] No new console errors
 
**When i18n keys changed**
- [ ] `en.json` and `or.json` have identical key sets
- [ ] Every `t('…')` in the code resolves to a real key
 
**When data shape or the database changed**
- [ ] Existing rows still render
- [ ] The migration is idempotent (`IF NOT EXISTS`)
- [ ] Every consumer of the changed field is updated
 
**Before deploying**
- [ ] Worker secrets set — confirm the binding list in the build log
- [ ] `VITE_*` set as **build variables**, not secrets
- [ ] All migrations applied in Supabase
 
---
 
## 6. Git conventions
 
Commit subject in the imperative, under ~72 characters, describing the effect rather than the mechanics: `Count confirmed and dispatched orders as dashboard revenue`, not `fix analytics`.
 
The body explains **why**, what the user-visible symptom was, and how it was verified. Reviewers can read the diff; they cannot read your reasoning.
 
One logical change per commit. Never mix a refactor with a fix — if the fix turns out to be wrong, the refactor should not have to be reverted with it.