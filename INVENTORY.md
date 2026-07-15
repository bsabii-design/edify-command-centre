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
- **TABLE GRID LAW**: three-column card tables share one grid — Name 24 · Data 40 · Outcome 36 (`change-row`, `ir-grid/ir-row`, `cnt-row`). The data column starts at the same x in every card; text and controls align left, a purely numeric outcome column (Cost) aligns right. Disclosure rows span the full width. Exceptions only when a table genuinely needs more columns (receiving, 4 cols) or more room.
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
