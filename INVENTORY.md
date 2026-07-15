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
