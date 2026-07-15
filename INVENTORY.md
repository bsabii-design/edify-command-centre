# Edify Command Centre — component & pattern inventory

Snapshot of everything the prototype renders, the rules it obeys, and the
state of every flow. Updated 15 Jul 2026 after the case-unification pass.

## Design tokens (styles.css `:root`)

| Token | Value | Rule |
|---|---|---|
| Blue | `#2563eb` (`--blue`, `--blue-soft` — one blue) | Confirmed discs, links, hover on document controls |
| Red | `--accent` | Only an actual unresolved discrepancy; never decoration |
| Text | `--text` ink · `--text-2` = `--text-3` = `#8a887e` (one grey) | Two text colours total |
| Borders | `rgba(60,58,48,0.055)` / strong `0.11` | Translucent; no shadows anywhere |
| Type | Poppins 20 / 13 / 11 only | Enforced by `scripts/lint-tokens.mjs` |
| Weights | Regular 400 / Medium 500 | Medium only: card titles, changed values, new totals, statuses, discrepancy lines, clickable doc names. Chat prose 100 % Regular |
| Circles | 16 px everywhere (discs, avatar, badges); glyph 12 px, check stroke 1.9 | |

## Navigation (destinations, never actions)

Sidebar holds only persistent destinations. Actions (add supplier, receive delivery, review invoice, fix count…) start from Home cards, the command bar, free text or slash commands — never a sidebar row.

- **Primary**: Home `[count]` · Chats · Journal.
- **Spaces**: Orders · Deliveries · Inventory · Invoices · Suppliers. (Reports and the setup mini-nav removed.)
- One badge only — Home, counting items needing a decision now. Background/waiting states never inflate it.

Mental model: **Home** = what needs attention now · **Chats** = what we discussed · **Journal** = what happened · **Spaces** = business objects.

- **Home** — two semantic groups. *Active work*: the review card + the background monitor accordion directly below it (compact gap, no section heading, collapsed by default, blue pulsing dot). *Saved unfinished work*: below a full-width divider, a quiet "Continue" heading + compact draft rows (neutral grey marker — never the blue pulsing dot — title + "N required details missing" left, Resume › right). Drafts are resumable structured work (a supplier draft once it has a name). Done-today lives in Journal.
- **Chats** (`ChatsPage`) lists every thread, recoverable. A command-started thread (`/add-supplier`) persists here even before it has structured data — leaving mid-conversation never loses it. Supplier rows read `Add/Update supplier · <name|No supplier selected> · <relative time>`.
- **Spaces** (`SpacePage`) render simple confirmed-object lists (Orders/Deliveries/Inventory/Invoices); Suppliers is its own directory (`SuppliersPage`).

### One page system (`Page.jsx`)

Every directory and history view (Suppliers, Orders, Deliveries, Inventory, Invoices, Chats, Journal) is built from shared primitives — pages define only column labels, widths and row content, never their own padding/type/borders:

- `PageShell` · `PageHeader` (title + optional one-line description left; single black primary action top-right only when the page genuinely supports one) · `PageToolbar` (quiet text tabs left, inline Search right) · `DirectoryTable`/`DirectoryRow` · `PrimaryObjectCell` (compact initial + Medium name + muted sub) · `StatusCell` (tone `default`/`muted`/`alert`) · `DirectoryPage` (wires tab + text filtering).
- The page is the surface: no outer card, no per-row rectangles, no separator after every row — one header divider, subtle full-row hover, `--cols` grid shared by header and rows so columns anchor identically. Gutters/width identical across pages (`.page`, 960px, `sp-8`).
- Red (`alert`) only where attention is genuinely required — Orders "Due now", Deliveries "Needs check-in", Inventory non-zero variance, Invoices "Needs review". Passive waiting ("Waiting for supplier", "Confirmed", future deliveries) stays muted/default.
- Contextual actions launch a pre-scoped Edify workflow, never a manual CRUD form: Suppliers' "Add supplier" → the same Add supplier conversation as `/add-supplier`. Orders/Deliveries/Inventory/Invoices/Reports have no create action in this prototype.
- Journal is a **chronological activity feed, not a table** (directories stay tables). Same page header + quiet filters (All/Confirmed/System handled/Flagged/Dismissed), then full-bleed feed rows grouped by date. No Event/Area/Time header row, no column grid.
  - Row = fixed 20px icon slot · main content · Area·Time rail. One icon system in the slot for every row (Spark = system handled, Check = confirmed, Alert red = flagged, Minus = dismissed) — same stroke, never letter avatars, red only on the flagged row.
  - Event meaning is the focus: title / context (object) / outcome, **all 13 Regular** — hierarchy through colour, not weight (title ink `--text`, context + outcome `--text-2`). Red appears only on the issue phrase of a flagged event (segment up to the first "·"); never the whole row/title.
  - Compact, not a card: transparent row (no border/radius/shadow), `sp-1` vertical padding, `sp-0` line gap, 1.3 line-height (~63px 3-line rows); hover is a small inset (`sp-3` margin) `--surface-2` fill with an `r-md` radius that hugs the row, not a full-bleed slab. Every title on one left anchor (the fixed 20px icon slot, at the gutter); Area·Time top-aligned with the first line, Time near the right gutter; metadata drops below the content under 860px.
- All prototype-explanation banners removed — the model reads through page naming, row content, contextual actions and navigation.
- **Supplier lifecycle**: `/add-supplier` (command, suggested action or free text — one workflow) → Chats only → name entered → Home → Continue (`Add <name> to Fitzroy Espresso`, sub = live "N required details missing" / "Ready to review") → confirmed → Suppliers + Journal, dropped from Continue. Continue is derived from the live supplier card in the thread (source of truth), not remembered chat.

### Add-supplier flow (one card, changing states)

Prompt (short): "Which supplier are you adding? / I'll first check whether they're already used at another Ferra site." Options: Caravan Coffee (New supplier) · Bidfood (Used at other sites).

- **Path A — existing** (`SupplierAddCard`): narrative "<name> is already used at A, B and C. I found a complete setup you can reuse for <site>." → review card (title `Add <name> to <site>`, meta `Existing supplier · ready to review`, rows Used at/Order email/Cut-off/Delivery days/Minimum order, helper "Nothing is created until you confirm."). Primary **Add to Fitzroy Espresso**, secondary **Choose another supplier** (returns to selection in-place, no discarded card, no Journal). Confirm → same card flips to confirmed (title "Supplier added", meta `<name> · <site>`, footer check + "<name> added / Available for ordering…", expandable snapshot). One transition line only: "<name> will now appear in Suppliers."
- **Path B — new** (`SupplierDraftCard`): narrative "I created a draft for <name>…" → structured draft shown immediately as a **two-column form** — labels left, controls in one fixed 260px right column aligned to a shared right edge (read-only Supplier/Site as plain values, not disabled inputs; Order email/Delivery days/Cut-off with a small red `*`; Minimum order optional, no `*`). Placeholders are examples only (`orders@caravan.co.uk`, `16:00`, `£200`) — required/optional lives in the label. Header meta counts down `N required field(s) missing` → `Ready to review`. Delivery-days chips fit on one line (`nowrap`, compact); Cut-off is a `type="time"` input; Minimum order is a currency `<select>` (£/€/$) + amount. All input methods write the same draft (fields, chat sentence, pasted email). **One footer** (separated by the card divider): no helper line — **Create supplier** (disabled-but-primary until complete) sits directly beside **Discard draft** as a second-level `btn-secondary`, like every other card's footer. **Discard** with entered data asks to confirm ("Discard this draft? … / Discard draft · Keep editing"), then the card flips to a final state "Draft discarded / No supplier was created." (no chat echo); an empty draft discards immediately. Confirm → confirmed card as Path A.
- One card = all states; no separate proposal/cancelled/success cards. Required helper `requiredMissing()/draftReady()` live in suppliers.js.

## Shared controls (`Controls.jsx`)

- **CompactIconButton** — one 28×28 circular container for every icon-only utility control; `secondary` (subtle standing bg/border — **BackIconButton**, persistent nav) vs `tertiary` (transparent, bg on hover — **CloseIconButton**, quiet dismiss). Shared radius, 16px icon, focus ring.
- **DeadlineChip** — one chip on Home, notifications and task headers; all read the same `DEADLINE_TS` so the time stays synced; muted by default, red only when ≤30 min out.
- **Task-chat header** (`.task-header`) — quiet sticky surface per opened conversation: `[Back] [task title] [DeadlineChip]`. Title is the task's own name (from `taskTitle(thread)` in App), not the chat message; back stable at left, title ellipsis, deadline right, soft fade beneath, first message clears the header.
- **Interrupt** — stable flex row `[status icon] [text] [action] [CloseIconButton]`; close never absolute, kept off the edge; clicking body/action opens the task, close only dismisses the notification (never resolves or alters the task).
- **Background monitoring** (`BackgroundSummary`) — one compact expandable component (no section heading): pulsing blue dot (2.6s, reduced-motion aware) + "N background task(s)" + down-chevron that rotates up; two-line rows (object title / meta · Waiting for …, sentence case, never red), clickable to the object.
- **Supplier options** — compact selectable cards (`.sup-option`, radius 8px not pill): Medium name + muted sub, equal height, hover/active states, not chat bubbles.
- **Demo timeline** — quiet service card in `.sidebar-bottom` above the account row: eyebrow "Demo timeline" + one line for the current step (clickable when it advances the world), aligned to the account-row gutters.

## Laws

- **Edify proposes, the operator confirms.** Facts read-only; proposals editable inline; nothing sends without a labelled tap.
- **Confirmed object** = same card, three states: editable → collapsed (header + footer) → expanded (header + details + footer). Footer is persistent: 16 px check disc inline with the first summary line, 8 px gap, lines 0 px apart. Expanding adds details, never replaces the summary.
- **TABLE LAW**: 16 px outer/row spacing, 8 px header-to-content, 11 px grey Regular headers, borderless sub-rows, dividers `--border`.
- **MASTER GRID** — every table row (header and body) sits on one 5-track grid `25fr 30fr 15fr 15fr 15fr`, 8 px gaps → shared anchors at 0 · 25 · 55 · 70 · 85 · 100 %. Cells take fixed column spans, never content-driven widths; one left gutter, one right gutter across title, rows, totals, footers. Placements:
  - **Order** (`change-row`): Item 1–3 · Change 3–5 left (begins 55 %) · Cost 5–6 right (ends 100 %); total row Cost 3–6 right; disclosure 1–6.
  - **Delivery** (`recv-grid`): Item 1–3 · Ordered 3–4 **left** (begins 55 %, same anchor as the order card's Change — kept off the Received stepper) · Received 4–5 centred (stepper and read-only value share the track) · Difference 5–6 right (ends 100 %).
  - **Invoice** (`ir-row`): Item 1–2 · Mismatch 2–4 (begins 25 %; two compact lines, amount in the delta line) · Action 4–6 (begins 70 %) — dropdowns one anchor, one width.
  - **Figure/count** (`cnt-row`): Figure 1–2 · Value 2–3 right (begins 25 %) · Basis 3–6 (begins 55 %).
  - Verified anchors (live): Change/Ordered/Basis all begin at 55 %; Mismatch/Value begin at 25 %; Received/Action begin at 70 %; Cost/Difference end at 100 %. Headers share their content's placement and alignment; numbers tabular; no space-between, no auto columns.

### One page-header system (Spaces, Journal, Chats)

- Every page shares `.page-hdr`: intro (`PageHeader` — title left, one-line muted subtitle directly below, optional primary action at the right gutter) then `PageToolbar` (filters left, Search right). Same gutters, heights and rhythm (title → subtitle → toolbar `sp-4` → content). Subtitles on every page; Search sits at one shared right anchor (`sp-8`) even when a page has no filters (Orders/Deliveries/Inventory); Journal has filters and no Search.
- **Title alignment**: every page title (page-hdr pages + Home `.today`) sits on the sidebar Search line — `padding-top: sp-3`, so the h1 centre (~27) aligns with the sidebar search centre (~26), consistent regardless of the notification. (The earlier `has-notif` safe-area offset was removed in favour of this alignment; the interrupt can again overlap Suppliers' Add-supplier action when visible.)
- **Shared page controls** (one text style + `--ctl-h: 30px`): primary CTA (`.page-action`) 13 Medium white, height 30 (was 11 — no longer smaller than Search); Search 13 Regular, muted placeholder, height 30; filters (`.ptab`) height 30, active Medium dark on `--surface-2`, inactive Regular muted. Sidebar Search is a separate system, untouched.

### Directory pages — full-width surface + status chips

- **Full-bleed** (like Journal): `DirectoryPage` header/search/filters sit at the page gutter (`.page-hdr`), but the table spans the full main content area — rows, the header divider and hover run edge-to-edge while row content keeps the `sp-8` gutter (first column on the title's left anchor, last column near the right gutter). No centred wrapper, no outer card. Applies to Suppliers/Orders/Deliveries/Inventory/Invoices/Chats.
- **Toolbar only when it has controls** — no empty rows, no lone floating Search. Suppliers/Invoices/Chats: filters + Search. Journal: filters only. Orders/Deliveries/Inventory: no toolbar (table begins right after the intro). Sidebar Spaces group collapsed by default.
- **StatusChip** (`Page.jsx`) — one compact pill (20px, `r-full`, 11 Medium, no border/shadow, not clickable), **only two treatments**: `neutral` = one grey bg `--surface-2` for every normal workflow state, with text tone as the only hierarchy — darker ink (Confirmed, Waiting for supplier/approval) vs softer `--text-2` (Completed/Received/Resolved/Matched); `attention` = light-red `--red-bg` + red `--chip-red-text` #E12E07 (Due now/Needs check-in/Needs review/Late/Overdue). No blue/green/amber, no per-status backgrounds — colour is reserved for attention. Inventory **variance** stays plain text (muted `—` / red `−2 L`), not a chip.
- **Chat prose**: Regular, no bold fragments; leading dates become a muted `.msg-meta` line.
- **Disclosure toggles** («Show N …») — Regular, quiet, chevron 16 px.
- **Evidence fold** (Granola): spinner «Working…» → chip «How Edify worked this out» → three lines: sources (clickable doc names + ↗), one calculation sentence, one result sentence.
- **Buttons**: primary (navy pill) / secondary / tertiary (`.done-action`, 11 px). One primary per card.
- **Dropdown**: `.ir-select` only — custom 16 px chevron, one-line consequence under it.
- **Document control**: doc icon + name + ↗, hover/focus turns blue with underline (invoice header).

## Cards (src/components/Cards.jsx)

| Card | Used by | States |
|---|---|---|
| `OrderDiffCard` | order case | proposed (stepper, unchanged items, basket) · declined · confirmed |
| `DeliveryDueCard` | order case | single CTA «Check in delivery» — the click is the arrival record |
| `ReceivingCard` | order case | proposed (8 lines, steppers) · confirmed |
| `InvoiceCloseCard` | **both** invoice cases (#4902 from the order case, #4821 standalone) | proposed (tiles, Item/Mismatch/Action, dropdowns) · confirmed (Unresolved/Status tiles, line statuses, strip) — parametrised by `num`, `noteLabel`, `expLabel`, `lines`, `matched`, `invoiced` |
| `CountFixCard` | count case | proposed (`.cnt-row` facts, red delta, stepper, 3-level footer, accept guard) · confirmed (header + View details + footer summary, per choice) |
| `GpCard` | GP question | unverified → verified after count closes; drivers with one actionable handle |
| `MuffinCard` | GP follow-up | proposed · applied · declined |
| `SupplierAddCard` / `SupplierDraftCard` / `SupplierUpdateCard` | supplier flows | draft → applied/cancelled |

Removed: legacy `InvoiceCard` (#4821 old layout), `PriceReplyCard`, seg-btn resolution picker, «View original» head action, intermediate «Checked in» status card, «Not arrived» branch.

## Flows (all verified end-to-end in the browser, 15 Jul 2026)

1. **Order → delivery → invoice #4902** — oat 60→80 L, check-in (arrival 07:42), differences vs invoice, «Confirm changes» ends the demo (unresolved lines stay open). ✓
2. **Invoice #4821** (Home, £13.40) — same card, same table, same dropdowns and texts as #4902; cream 2 pc short £6.20 + butter £0.30/pack £7.20; fold compares Thursday's delivery note + Bidfood price list; confirm → watching + Journal. ✓
3. **Whole milk count** (Home, 14 L) — facts table in the order-card language, red `+14 L vs expected`, stepper correction, three resolutions; confirmed card with footer summary and expandable details. ✓
4. **GP %** — breakdown, unverified slice, count-close update, muffin follow-up. ✓
5. **Suppliers** — add existing / draft new / update. ✓

## Texts

- Intros: «…is £N higher than … I found N differences and proposed an action for each.» (both invoices).
- Consequences: third person, one line — «Requests £X credit. Stock stays at N.» / «Checks £X with Bidfood. Invoice stays open.»
- Post-confirm statuses: Credit requested / Receipt corrected / Charge accepted / Waiting for Bidfood.
- Closing line: «Waiting for the {item} credit and {item} price confirmation.» (shared `invoiceWaitingLine`).
- Product names identical across order, receiving, invoices (e.g. «Oatly Barista oat milk», «Butter 250g»).

## Known intentional gaps

- Document links (invoice title, fold sources) are visibly clickable but inert — prototype scope.
- Legacy `.diff-table` remains only in GpCard/MuffinCard tables, restyled to the current laws (11 px Regular headers, Medium emphasis, no bold).
