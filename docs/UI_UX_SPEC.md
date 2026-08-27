# UI/UX Specification
## LabCare — Web-Based Laboratory Equipment Fault Reporting and Maintenance Prediction System

This spec translates the approved LabCare design mockups into exact, buildable specifications: design tokens, component states, screen-by-screen layout, and interaction flows. Pair this with `DEVELOPER_GUIDE.md` (API/schema/logic) — this document covers what the developer needs to build the *interface* correctly, without needing to guess spacing, states, or behavior from the image alone. All frontend assets described here live under `client/` (stylesheets in `client/css/`, scripts in `client/js/`, HTML pages in `client/views/`), while the API they consume is in `server/`.

---

## 1. Design Principles

Clean · Modern · Role-based · Predictive · Efficient

The interface exists to make two things fast: **reporting a fault** (student, in under 60 seconds per the NFRs) and **spotting at-risk equipment** (staff, at a glance). Every screen should bias toward those two jobs — minimal chrome, high-contrast status indicators, no unnecessary steps.

---

## 2. Design Tokens

### 2.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2563EB` | Primary actions, active nav state, links, focus rings |
| `--color-accent-purple` | `#7C3AED` | Secondary accents (e.g. chart series, badges) |
| `--color-success` | `#10B981` | Resolved status, "Excellent"/"Good" health, positive deltas |
| `--color-warning` | `#F59E0B` | "Fair" health, Medium risk, warning badges |
| `--color-neutral` | `#64748B` | Secondary text, icons, borders |
| `--color-surface` | `#F8FAFC` | Page background |
| `--color-danger` | *(not swatched — use)* `#EF4444` | Poor health, High risk, Critical priority, errors |
| `--color-white` | `#FFFFFF` | Card backgrounds, sidebar-inverse text |

Status-color mapping (derive consistently everywhere, don't invent new colors per screen):

| Status/Level | Color |
|---|---|
| Excellent (≥80%) / Resolved / Low risk | `--color-success` |
| Good (60–79%) | `--color-primary` |
| Fair (40–59%) / Medium risk / In Progress | `--color-warning` |
| Poor (<40%) / High risk / New/Pending | `--color-danger` |

### 2.2 Typography

- **Font family:** Inter (Google Fonts / self-hosted `.woff2`), fallback `system-ui, sans-serif`
- **Tone:** clean & readable — avoid condensed weights, keep body text ≥14px

| Style | Size | Weight | Usage |
|---|---|---|---|
| H1 | 24px | 700 | Screen titles ("Dashboard", "Predictions") |
| H2 | 18px | 600 | Card/section headers |
| Body | 14px | 400 | Table cells, descriptions |
| Small/Meta | 12px | 400 | Timestamps, helper text |
| Stat number | 32px | 700 | KPI card values (e.g. "128") |
| Button label | 14px | 600 | All buttons |

### 2.3 Spacing & Grid

- Base unit: 4px. Use multiples (8, 12, 16, 24, 32) for padding/margins.
- Card padding: 20px
- Card border-radius: 12px
- Card shadow: soft, `0 1px 3px rgba(0,0,0,0.08)`
- Sidebar width: 240px fixed (desktop); collapses to icon-only rail on tablet (see §7)
- Content max-width: fluid within sidebar-offset container, cards in a responsive grid (see per-screen grid notes)

### 2.4 Iconography

Line-style icons (matches the sidebar glyphs in the mockup — dashboard grid, box/equipment, flag/fault, wrench/maintenance, trending-chart/predictions, bell/notifications, bar-chart/analytics, users, document/reports, gear/settings). Use a single icon set throughout (e.g. Lucide or Heroicons outline) — do not mix icon styles.

---

## 3. Global Layout Pattern

Every authenticated screen (post-login) shares this shell:

```
┌─────────────┬──────────────────────────────────────────┐
│             │  Top bar: page title | date range | 🔔    │
│  Sidebar    ├──────────────────────────────────────────┤
│  (240px)    │                                            │
│             │  Page content (cards / tables / charts)   │
│             │                                            │
│  User card  │                                            │
│  (bottom)   │                                            │
└─────────────┴──────────────────────────────────────────┘
```

### 3.1 Sidebar

- Logo + "LabCare" wordmark, top-left, links to Dashboard
- Collapse/expand chevron toggle at top-right of sidebar
- Nav items (icon + label), one active state at a time — active item gets `--color-primary` background tint + primary-colored icon/text
- Badge (small red/primary circle with count) on items with pending items — mockup shows this on **Notifications** (e.g. "3")
- User card pinned to bottom: avatar, name, role label (e.g. "Aliyu Ammani / Technologist"), chevron for account menu

**Full nav item list (as shown):** Dashboard, Equipment, Fault Reports, Maintenance, Predictions, Notifications, Analytics, Users, Reports, Settings

**Role-based nav visibility (spec addition — enforce this even though the mockup shows a uniform list):**

| Nav item | Student | Technologist | Engineer | Admin |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Equipment | ✅ (view/scan only) | ✅ | ✅ | ✅ |
| Fault Reports | ✅ (own only) | ✅ | ✅ | ✅ |
| Maintenance | ❌ | ✅ | ✅ | ✅ |
| Predictions | ❌ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ | ✅ |
| Users | ❌ | ❌ | ❌ | ✅ |
| Reports | ❌ | ✅ | ✅ | ✅ |
| Settings | ✅ (own profile only) | ✅ | ✅ | ✅ |

This matches the permission matrix already defined in the developer guide — the UI must hide, not just disable, items a role can't use.

### 3.2 Top Bar

- Left: current page title (H1)
- Right: date-range picker (dashboard only), notification bell icon (with badge if unread), user avatar shortcut

---

## 4. Component Library

### 4.1 Buttons

| Variant | Style | Usage |
|---|---|---|
| Primary | Solid `--color-primary` fill, white text, 8px radius | Sign In, Next, Save, primary CTA per screen |
| Secondary/Outline | White fill, neutral border, dark text | Cancel, secondary actions |
| Icon button | Circular/square, neutral icon, transparent bg, hover tint | Quick Actions grid, table row actions |

States required for every button: default, hover, active/pressed, disabled, loading (spinner replaces label).

### 4.2 Status Badges / Pills

Rounded-full, small padding (4px 10px), colored background tint (10–15% opacity of status color) + solid-color text of the same hue. Used for:
- Fault status: `New` (danger), `In Progress` (warning), `Resolved` (success)
- Risk level: `High` (danger), `Medium` (warning), `Low` (success)
- Equipment status: `In Use` (primary), `Under Repair` (warning), `Scrapped` (neutral)

### 4.3 Stat Cards (KPI cards)

Layout: icon (top-left, colored circle bg) + label (small, neutral) + big number (stat style) + delta line (small, colored arrow + %/count, green for improvement context-dependent — e.g. "Active Faults -12%" is good, so down-arrow here is success-colored even though the metric itself is a fault count).

4-card row on Dashboard: Total Equipment, Active Faults, In Maintenance, Predicted At Risk (this one is a link — "View predictions →" instead of a delta).

### 4.4 Charts

- **Fault Reports Overview:** multi-line chart, 3 series (New/In Progress/Resolved), X-axis = days of week, Y-axis = count. Use a charting lib consistent with the stack (Chart.js or Recharts if React is introduced; otherwise Chart.js for vanilla JS).
- **Equipment Health Index (EHI) donut:** 4-segment donut (Excellent/Good/Fair/Poor), center label = average % + "Average Health" caption, legend to the right with color dot + label + count.
- **Per-equipment Health Index (small donut):** same 4-color scheme, single value in center (e.g. "72%"), status word below (e.g. "Good"), used on Equipment Details.
- **Prediction health bar (inline, in table):** horizontal segmented/gradient bar as a compact visual, not a full donut, when space is tight (Predictions table).

### 4.5 Tables

- Header row: neutral-100 background, 12px uppercase-or-semibold labels
- Row hover: light tint background
- Status/risk columns always rendered as badges, never plain text
- Action column: text link (e.g. "View") in `--color-primary`, right-aligned
- Row height comfortable enough for touch targets (≥44px) since this is used on shared lab devices, not just desktops

### 4.6 Forms

- Label above input, 12–14px, medium weight
- Input: 1px neutral border, 8px radius, 10–12px padding, focus state = primary-colored border + subtle ring
- Password field includes show/hide toggle icon (right-aligned inside field)
- Checkbox ("Remember me") + inline text link ("Forgot password?") on the same row, standard pattern
- Priority selector: **segmented button group** (Low/Medium/High/Critical), single-select, active segment filled with its status color, inactive segments outlined
- Radio group ("Affects Usage: Yes / No"): standard radio buttons, horizontal layout

### 4.7 Multi-Step Wizard (Report Fault)

- Numbered step indicator at top: `1 Equipment → 2 Fault Details → 3 Attachments → 4 Review`
- Current step: filled circle with number, primary color, label bold
- Completed steps: checkmark or dimmed filled circle
- Upcoming steps: outlined circle, neutral/gray label
- Persistent equipment preview card visible throughout all steps (right-hand panel) so context is never lost mid-flow
- Footer: Cancel (outline) + Next/Submit (primary), right-aligned, Cancel always available

---

## 5. Screen Specifications

### 5.1 Login — "Welcome Back"

**Layout:** 2-column split. Left: full-bleed lab photo with dark gradient overlay, logo + tagline ("Smart Maintenance Today, Reliable Labs Tomorrow") bottom-left over the image. Right: centered auth form, max-width ~400px.

**Fields:** Email address, Password (with visibility toggle), Remember me (checkbox), Forgot password? (link, right-aligned same row as checkbox).

**Primary action:** "Sign In" — full-width primary button.

**Footer:** "Don't have an account? Contact administrator" — since self-registration is not part of the workflow (accounts are provisioned, likely by Admin), do not build a public sign-up form; this text should link to a mailto or static contact page.

**Validation:** inline error under field on blur (invalid email format, empty password); auth failure shows a single non-field error banner above the form ("Incorrect email or password") — never reveal whether it was the email or password that was wrong.

### 5.2 Dashboard (Staff view — Technologist/Engineer/Admin)

**Row 1 — KPI cards (4-up grid, responsive to 2-up then 1-up):**
Total Equipment · Active Faults · In Maintenance · Predicted At Risk

**Row 2 — 3-column grid:**
1. Fault Reports Overview (line chart, ~1/2 width)
2. Recent Fault Reports (list, ~1/4 width) — each item: icon, equipment name + short issue, status badge, relative timestamp; "View all" link top-right
3. Equipment Health Index donut (~1/4 width) — with legend and counts per band

**Row 3 — Quick Actions:** 4 icon-buttons in a row/grid: Report Fault, Scan QR Code, Add Equipment, Generate QR. Each routes directly into the relevant flow (Add Equipment/Generate QR are Admin-only — hide for other roles per §3.1).

**Data notes:** all numbers/deltas are live queries — Total Equipment = `COUNT(equipment)`, Active Faults = `COUNT(fault_reports WHERE status IN ('Pending','In-Progress'))`, In Maintenance = `COUNT(equipment WHERE status='Under Repair')`, Predicted At Risk = `COUNT(predictions latest snapshot WHERE risk_level='High')`.

### 5.3 Scan QR Code (Student-initiated, but available to any role)

**Layout:** left panel = camera viewfinder (`html5-qrcode` mounted here) with corner-bracket frame overlay and helper text "Align the QR code within the frame." Right panel = resolved Equipment Details card (Equipment Name, Asset ID, Category, Location) populated the instant a scan resolves via `GET /equipment/qr/:qrCode`.

**Primary action:** "Select Fault Type" button — enabled only once a scan has successfully resolved an equipment record; disabled/greyed state before that.

**Error state (not in mockup, must be built):** if the scanned code doesn't match any equipment record, show an inline error in the right panel ("QR code not recognized — try scanning again or select equipment manually") with a manual-search fallback link.

### 5.4 Report Fault (Step 2 of 4 shown: "Fault Details")

**Persistent right panel:** equipment preview card (image, name, asset ID, location) — carried over from the QR scan or manual selection step.

**Step 2 fields:**
- Fault Type — dropdown (populate from a fixed enum/category list, not free text, so reports are analyzable later — e.g. Hardware Failure, Display Issue, Connectivity, Power Issue, Other)
- Description — required textarea, placeholder "Describe the issue in detail..."
- Priority — segmented control, Low/Medium/High/Critical (Medium shown pre-selected as sensible default)
- Affects Usage — radio: "Yes, affects usage" / "No, still usable" (this maps to how urgently it needs triage — consider using it to auto-suggest Priority, but don't auto-override the user's explicit choice)

**Step 3 (Attachments, not detailed in mockup but implied by objectives):** image upload dropzone, respecting the 5MB/JPEG-PNG-WebP-only rule from the developer guide; show thumbnail + remove option after upload; step is optional (skippable) since not every fault has a usable photo.

**Step 4 (Review):** read-only summary of all previous steps + final "Submit Report" primary button. This is the only step that actually calls `POST /fault-reports`.

**Footer nav:** Cancel (exits wizard, confirm-discard if data entered) / Next (advances, validates current step first) — becomes "Submit" only on step 4.

### 5.5 Predictions (Staff view)

**Tabs:** "At Risk Equipment" (default/active) / "Prediction History"

**At Risk Equipment table columns:** Equipment (name), Asset ID, Health Index (inline horizontal bar, colored by band), Predicted Failure (date + "(N days)" countdown), Risk Level (badge), Action ("View" link → Equipment Details).

Sort default: by Health Index ascending (worst first) — the whole point of this screen is triage, so don't make the user re-sort to find the worst asset.

**Footnote (must always be visible, not optional styling):** "Predictions are based on historical data and may vary." — this is the honesty disclosure required given the EHI is a rule-based estimate, not a certified forecast (per developer guide §9). Do not remove or shrink this into invisibility.

**Prediction History tab:** same table shape, but scoped to a single piece of equipment's EHI over time (line/trend), reachable also from Equipment Details.

### 5.6 Equipment Details

**Header block:** back-link to Equipment list, equipment photo/icon, name + Asset ID, status badge (e.g. "In Use"), key attributes (Category, Location, Purchase Date, Warranty Expiry).

**Right-side Health Summary card:** donut (current EHI %) + status word ("Good"/"Fair"/etc.) + "Last Updated" timestamp.

**Tabs:** History (default) / Maintenance Logs / Fault Reports / Predictions

**History tab table:** Date, Event (e.g. "Fault Reported", "Maintenance In Progress", "Fault Resolved"), Performed By, Notes — this is effectively a merged, chronological view across `fault_reports` and `maintenance_logs` for that one asset; build it as a UNION query or merge-and-sort in the controller, not as two separate unrelated tables.

---

## 6. Interaction & State Notes (things not visible in a static mockup but required for a working build)

- **Loading states:** every card/table/chart needs a skeleton or spinner state for its first data fetch — do not let the UI show "0" or empty tables while data is still loading, as that's indistinguishable from "there is no data."
- **Empty states:** e.g. a brand-new install with zero equipment — Dashboard cards should read "0" gracefully, charts should show a friendly "No data yet" placeholder rather than a broken/empty chart canvas.
- **Real-time-ish freshness:** Dashboard and Predictions don't need to be literally real-time (no WebSocket requirement per developer guide §16) — a manual refresh or on-navigation refetch is sufficient.
- **Notification badge:** the sidebar Notifications count should decrement/clear when the user visits that screen, not persist indefinitely.
- **Toasts/confirmations:** status changes (e.g. marking a fault Resolved), and Report Fault submission, should show a brief success toast — the mockup doesn't show this but it's required for a usable staff workflow.

---

## 7. Responsive Behavior

| Breakpoint | Sidebar | Grid |
|---|---|---|
| Desktop (≥1200px) | Full 240px, icon+label | As specified per screen (3–4 columns) |
| Tablet (768–1199px) | Collapses to icon-only rail (labels on hover/tooltip) | Cards reflow to 2-column |
| Mobile (<768px) | Off-canvas drawer (hamburger toggle in top bar) | Single column, stat cards stack; tables become horizontally scrollable or convert to stacked card rows |

Given students will frequently use **Scan QR Code** on a phone in the lab, that screen and the Report Fault wizard must be fully usable at mobile width as a first-class case, not an afterthought.

---

## 8. Accessibility Notes

- All status badges must not rely on color alone — pair with text label (already the mockup's pattern; keep it).
- Minimum contrast ratio 4.5:1 for body text against `--color-surface`/white backgrounds — verify `--color-warning` (#F59E0B) text-on-white specifically, as amber often fails contrast at small sizes; use it as a background tint with dark text, or a darker shade for text-only usage.
- All icon-only buttons (Quick Actions, table row actions) need `aria-label`.
- Form fields need associated `<label for>`, not placeholder-only labeling.
- QR scanner screen needs a manual-entry fallback (already noted in §5.3) for accessibility and for cases where the camera isn't available.

---

## 9. Traceability to Objectives

| Screen | Objective it satisfies |
|---|---|
| Login | Role-based access foundation |
| Dashboard | Centralized visibility (Section 3.2 of proposal) |
| Scan QR / Report Fault | QR-based reporting interface objective |
| Predictions | Predictive maintenance engine objective |
| Equipment Details | Ticket/maintenance workflow + historical traceability |

If a future design addition doesn't map to a row here, question it before building it — same scope discipline as the developer guide.
