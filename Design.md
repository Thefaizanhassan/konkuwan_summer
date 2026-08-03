# Design system — Konkuwan Herbs
 
**Status:** living document · **Last updated:** 2026-08-02
 
Source of truth for tokens: `client/tailwind.config.js`. When you change a token there, update this file in the same commit.
 
Related: [Architecture.md](./Architecture.md) · [RULES.md](./RULES.md) · [PRD.md](./PRD.md)
 
---
 
## 1. Design philosophy
 
**Earthy, not corporate.** The company sells medicinal herbs grown by tribal farmers. The palette is forest greens, creams and earth browns — the product's own colours, not generic SaaS blue.
 
**Calm dense information.** The admin panel shows a lot at once. Restraint carries the weight: generous whitespace, soft shadows instead of hard borders, and colour reserved for meaning. If everything is highlighted, nothing is.
 
**Serif for voice, sans for data.** Cormorant Garamond gives headings a considered, agricultural-heritage feel. DM Sans keeps tables, forms and numbers unambiguous.
 
**Explain the empty state.** A blank panel is a dead end. Every empty state says why it is empty and what to do next.
 
**Readable in the field.** Field staff use this on phones in daylight, often in Odia. Contrast, tap targets and translated copy are requirements, not polish.
 
---
 
## 2. Colour palette
 
### Brand tokens (`tailwind.config.js`)
 
| Token | Hex | Swatch | Use |
|---|---|---|---|
| `forest` | `#162F22` | ▉ | Primary. Sidebar, primary buttons, headings, table headers |
| `forest-mid` | `#2B5240` | ▉ | Hover and secondary emphasis on forest |
| `sage` | `#4A7860` | ▉ | Secondary actions, links, accents |
| `leaf` | `#6A9E7A` | ▉ | Light accent, chart secondary, highlights |
| `earth` | `#B8844A` | ▉ | Warm accent — lead badges, farm accents |
| `cream` | `#F4EFE6` | ▉ | Page background, panel fills |
| `cream-dark` | `#EAE3D6` | ▉ | Table header background, subtle dividers |
| `muted` | `#6B7B6E` | ▉ | Secondary text, captions |
| `border` | `#D8D0C4` | ▉ | Default border |
| `ink` | `#0F1A13` | ▉ | Maximum-contrast text |
 
### Semantic colours
 
Not all of these are Tailwind tokens — several are applied inline on the dashboard.
 
| Meaning | Text | Background | Border | Used by |
|---|---|---|---|---|
| **Success** | `#1d6b2e` | `#e2f0e0` | — | Delivered status, positive trends |
| **Info** | `#1c5a7a` | `#dde9f5` | — | Confirmed status |
| **Warning** | `#92400e` | `#fef3c7` | `#f3d9a4` | Dispatched status, medium severity |
| **Error** | `#991b1b` | `#fee2e2` | — | Cancelled status, destructive actions |
| **Neutral** | `#6b6b5e` | `#eae7e1` | — | Draft status, disabled |
 
### Severity scale — Needs attention
 
| Level | Accent | Background | Border | Chip | When |
|---|---|---|---|---|---|
| High | `#B3261E` | `#FDF2F1` | `#F0C9C5` | `#F7DBD8` | ≥ 3 inquiries, ≥ 5 drafts |
| Medium | `#B45309` | `#FFF8EC` | `#F3D9A4` | `#FBEBD0` | Fewer inquiries/drafts, ≥ 5 overdue visits |
| Low | `#2B5240` | `#F2F7F2` | `#CFE0D2` | `#DFEBE1` | < 5 overdue visits |
 
Severity is earned, not decorative. A single overdue farm visit reads calm green; three unanswered buyer enquiries read red.
 
### Dashboard surface colours
 
| Purpose | Hex |
|---|---|
| Heading text | `#1c2e1f` |
| Body / label | `#6a7a63` |
| Caption | `#9aa694` |
| Card background | `#ffffff` |
| Card shadow | `0 2px 12px rgba(0,0,0,0.03)` |
| Chart line | `#1f4a2a` |
| Chart grid | `rgba(0,0,0,0.04)` |
| Tooltip background | `#1c2e1f` |
 
---
 
## 3. Typography
 
### Families
 
| Role | Stack | Used for |
|---|---|---|
| `font-display` | Cormorant Garamond → Georgia → serif | Headings, page titles, panel titles, brand |
| `font-body` | DM Sans → system-ui → sans-serif | Everything else: body, tables, forms, numbers |
 
Loaded from Google Fonts in `client/index.html`. Numeric data always uses DM Sans — a serif's varying digit widths make columns hard to scan. Monetary and quantity columns additionally use `font-mono` for alignment.
 
### Hierarchy
 
| Element | Class | Size | Weight | Colour |
|---|---|---|---|---|
| Page title | `font-display text-3xl` | 30px | normal | `#1c2e1f` |
| Section title | `font-display text-xl` | 20px | normal | `#1c2e1f` |
| Panel title | `font-display text-lg` | 18px | normal | `#1c2e1f` |
| KPI value | `text-3xl font-bold` | 30px | 700 | `#1c2e1f` |
| Body | `text-sm` | 14px | 400 | inherit |
| Label | `text-xs uppercase tracking-wide` | 12px | 500 | `muted` |
| Caption | `text-xs` / `text-[11px]` | 12/11px | 400 | `#9aa694` |
| Table header | `text-xs uppercase` | 12px | 500 | `muted` |
 
Form labels are uppercase with letter-spacing — small, unobtrusive, and clearly not data.
 
---
 
## 4. Components
 
### Buttons — `components/ui/Button.jsx`
 
| Variant | Appearance | Use |
|---|---|---|
| Primary (default) | Forest fill, cream text, `rounded-xl` | The main action in a view |
| Secondary | Transparent, forest border and text | Cancel, alternate actions |
| `fullWidth` | Spans the container | Modal footers, narrow panels |
 
One primary action per view. Destructive actions are text buttons in error red, never primary-filled — deletion should require intent.
 
### Inputs — `components/ui/Input.jsx`
 
`w-full border border-border rounded-xl px-3.5 py-2.5 text-sm`, focus ring `focus:ring-2 focus:ring-forest/20`. Label above, uppercase, `text-xs`, muted. Required fields marked `*`. Errors appear below in error red — never as a bare colour change, which colour-blind users miss.
 
### Tables — `components/ui/DataTable.jsx`
 
White surface, `rounded-2xl`, soft shadow, no outer border. Header `bg-cream-dark`, `text-xs uppercase`, muted. Rows divided by `divide-border`, hover `bg-cream/40`. Numeric columns right-aligned and monospaced. Row click opens the record; an actions column holds per-row controls. Supports drag-and-drop reordering where the module allows it.
 
Loading renders a spinner in place of rows; empty renders a centred explanatory line spanning all columns.
 
### Cards
 
| Kind | Radius | Padding | Background | Border/shadow |
|---|---|---|---|---|
| KPI card | `rounded-2xl` | `p-6` | white | `0 2px 12px rgba(0,0,0,0.03)` + 3px forest bottom bar |
| Overview card | `rounded-2xl` | `p-4` | white | soft shadow; amber border when alerting |
| Attention card | `rounded-xl` | `p-4` | severity background | severity border |
| Panel | `rounded-2xl` | `p-6` | white | soft shadow |
 
### Dashboard widgets
 
- **KPI card** — label, value, trend pill (`↑`/`↓` with percentage), decorative bottom bar and faded corner circle.
- **Needs attention** — severity-sorted cards, each with icon chip, count, priority tag, title, one-line rationale and a "Review →" action. The whole card is the click target.
- **Revenue chart** — 4px line, 5px dots with white halos, click-to-drill into a month.
- **Top products** — divided list, name left, quantity right.
 
### Navigation
 
**Public** — transparent over the hero, solid on scroll; hamburger below `md`.
 
**Admin sidebar** — forest background, cream text, emoji icon plus label, active item on a lighter forest fill. Collapsible to icons only; the state persists in `localStorage`, and collapsed items show a tooltip on hover. Role-gated items are hidden, not disabled.
 
### Modals — `components/ui/Modal.jsx`
 
Centred, white, `rounded-2xl`, max-width ~640px, dark scrim. Title in `font-display text-xl`, forest. Footer right-aligned with secondary then primary. Closes on scrim click and Escape. Body scrolls; header and footer do not.
 
### Charts (Recharts)
 
Line `#1f4a2a` at 4px. Grid `rgba(0,0,0,0.04)`, horizontal only. Axes have no line or ticks — labels alone. Tooltip: `#1c2e1f` background, cream text, `rounded-lg`, 12px. Currency is formatted by one shared helper so axis and tooltip cannot disagree.
 
### Badges and status indicators
 
`StatusBadge` renders a pill — `rounded-full px-3 py-0.5 text-xs font-semibold` — using the semantic pair for the status. Lead status uses `earth` on cream for leads and forest on pale green for active customers.
 
### Alerts
 
Full-width panels, `rounded-2xl`, semantic background and border, `p-5`. Icon, then a bold title, then the explanation. Every alert states what to do next.
 
---
 
## 5. Spacing
 
Tailwind's 4px scale. In practice:
 
| Gap | Between |
|---|---|
| `gap-2` / 8px | Related inline elements — icon and label |
| `gap-3` / 12px | Cards in a grid |
| `gap-4` / 16px | Form fields |
| `gap-6` / 24px | KPI cards |
| `gap-7` / 28px | Major dashboard regions |
| `mb-8` / 32px | Between dashboard sections |
 
Padding: `p-4` compact cards, `p-5` alert panels, `p-6` standard panels and KPI cards, `px-4 py-3` table cells.
 
Radii: `rounded-lg` (8px) small chips · `rounded-xl` (12px) inputs, buttons, small cards · `rounded-2xl` (16px) panels and major cards · `rounded-full` pills and avatars.
 
Layout: admin content is centred with a max width; the dashboard chart row is `lg:grid-cols-[1.3fr_1fr]`, giving the chart the larger share.
 
---
 
## 6. Responsive design
 
Tailwind defaults: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.
 
| Region | Mobile | Tablet | Desktop |
|---|---|---|---|
| KPI grid | 1 column | 3 columns | 3 columns |
| Overview strip | 2 columns | 3 columns | 6 columns |
| Needs attention | 1 column | 2 columns | 3 columns |
| Chart + top products | stacked | stacked | side by side, 1.3 : 1 |
| Admin sidebar | off-canvas | off-canvas | fixed, collapsible |
| Tables | horizontal scroll | horizontal scroll | full width |
| Public nav | hamburger | hamburger | inline |
 
Tables scroll horizontally rather than reflowing into cards — an invoice row is easier to read intact on a narrow screen than fragmented. The container scrolls, never the page body.
 
Test at 375 px, 768 px and 1280 px.
 
---
 
## 7. UI/UX principles
 
### Icons
 
Emoji in navigation and status contexts — no icon-font dependency, they render everywhere, and they read well to non-English-speaking field staff. `react-icons` where a precise glyph is needed. Icons never carry meaning alone: always paired with a label, and marked `aria-hidden` when decorative.
 
### Hover and focus
 
Interactive surfaces lift with `hover:shadow-md`; rows tint `hover:bg-cream/40`; buttons darken. Focus rings are visible and never removed — `focus:ring-2 focus:ring-forest/20`. Anything clickable shows `cursor-pointer`.
 
### Animation
 
Sparse and short. Tailwind's `transition` (~150ms) on hover; the "Review →" arrow shifts 2px on hover; the loading spinner is the only continuous animation. No entrance animations in the admin panel — staff use it dozens of times a day and motion becomes friction.
 
### Loading
 
Route-level: a centred forest spinner. In-place: the panel keeps its frame and swaps content. Buttons switch to "Saving…" and disable, preventing double submission. Never leave a blank region without indication.
 
### Empty states
 
Centred, muted, and instructive. "No crops yet — add a product in Admin → Products and it appears here automatically" beats "No data". Where an empty state is caused by a filter, say so.
 
### Error states
 
The server's message is shown when there is one, in plain language, never a stack trace. Errors appear next to their cause — a field error under the field, a save error in the form footer. Destructive failures explain the reason and the resolution: "This customer has orders and cannot be deleted. Cancel or reassign them first."
 
### Accessibility
 
Current: semantic landmarks, `aria-label` on icon-only controls and the attention panel, `aria-hidden` on decorative glyphs, visible focus rings, keyboard-reachable controls, body text at or above 4.5:1.
 
Known gaps: no formal WCAG audit; drag-and-drop reordering has no keyboard alternative; colour-blind users rely on the priority text label rather than the severity colour alone (which is why the label exists).
 
### Visual hierarchy

Within a panel: title (display serif) → primary value (large bold) → supporting label (small muted) → action (small, accent). Size and weight carry hierarchy; colour carries meaning. When both compete, size wins — that is why KPI values are large and neutral rather than small and coloured.