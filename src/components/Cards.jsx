import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RECEIVE_LINES, RECEIVE_MORE, BASKET } from '../data.js'
import { CURRENT_SITE, WEEK_DAYS, formatDays, requiredMissing, draftReady } from '../suppliers.js'
import { Check, Chevron, ChevDown, Clock, ArrowRight, Plus, Minus, Doc, ExtLink } from './Icons.jsx'

const spring = { type: 'spring', stiffness: 420, damping: 34 }

export function Card({ children }) {
  return (
    <motion.div className="action-card" initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </motion.div>
  )
}

/**
 * The header chip is the card's STANDING before you act. Only three cases show
 * one — all "this needs a look":
 *   attention   → flagged, awaiting your decision  (a problem)
 *   unverified  → answer has an unprovable number   (a caveat)
 *   draft/unsaved → not created yet                 (a pending thing)
 * A plain proposal shows no chip — its buttons already say "decide me". And the
 * moment you resolve it, the chip is gone: the outcome lives in the footer band.
 */
function StatusChip({ status }) {
  const map = {
    unverified: ['attention', 'One number unverified'],
    draft: ['draft', 'Not created yet'],
    unsaved: ['draft', 'Not saved yet']
  }
  const hit = map[status]
  if (!hit) return null
  const [cls, label] = hit
  return <motion.span layout key={status} className={`ac-status ${cls}`}
    initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>{label}</motion.span>
}

function CardHead({ title, sub, status, deadline, action }) {
  return (
    <div className="ac-head">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ac-title">{title}</div>
        {sub && <div className="ac-sub">{sub}</div>}
      </div>
      {/* A live deadline outranks any status; once decided, the chip retires. */}
      {action && (
        <button className="done-action head-action" onClick={action.fn}
          aria-label={action.open ? 'Hide details' : 'View details'}>
          {action.label}
          {action.icon && <ChevDown size={16} className={`bg-chev ${action.open ? 'open' : ''}`} />}
          {action.chev && <Chevron size={16} className={`wf-chev ${action.open ? 'open' : ''}`} />}
        </button>
      )}
      {deadline && status === 'proposed'
        ? <span className="deadline-chip"><Clock size={16} /> {deadline}</span>
        : <StatusChip status={status} />}
    </div>
  )
}

// The moment the world changed. A filled band, a check that springs in, the
// outcome in ink — not a grey line tacked to the bottom.
function ConfirmStrip({ label, sub, details, note, action }) {
  return (
    <motion.div className="done-band" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <div className="done-head">
        <motion.span className="done-check" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 480, damping: 16, delay: 0.12 }}>
          <Check size={12} stroke={1.9} />
        </motion.span>
        <span className="done-line">{label}</span>
        {action && <button className="done-action" onClick={action.fn}>{action.label}</button>}
      </div>
      {sub && <div className="done-sub">{sub}</div>}
      {note && <div className="done-note">{note}</div>}
    </motion.div>
  )
}
// The quiet counterpart: nothing changed, so it stays grey and small.
function KeptStrip({ label }) {
  return <div className="kept-band">{label}</div>
}

// ---------- Order diff --------------------------------------------------
export function OrderDiffCard({ entry, patch, resolve }) {
  const { status = 'proposed', add = 20, showAll = false } = entry.data || {}
  // One object = one card. Confirmed is the same card collapsed into a
  // read-only summary; View details expands the full confirmed snapshot.
  const expanded = !!(entry.data || {}).expanded
  const confirmedHead = (
    <CardHead title="Order updated" sub="Bidfood · order #2231 · delivery Sat 07:30"
      action={{ icon: true, open: expanded, fn: () => patch({ expanded: !expanded }) }} />
  )
  const confirmedSummary = (
    <div className="ac-body confirmed-summary">
      <div className="sum-first"><span className="done-check"><Check size={12} stroke={1.9} /></span>Sent to Bidfood — {60 + add} L Oatly Barista oat milk included</div>
      <div className="sum-line quiet">Basket £1,240.60 → £{(1240.6 + add * 1.42).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
    </div>
  )
  // One label, one press: the button disables briefly while the send runs.
  const [confirming, setConfirming] = useState(false)
  const runConfirm = () => {
    setConfirming(true)
    setTimeout(() => { setConfirming(false); resolve('confirm') }, 600)
  }
  const newQty = 60 + add
  const delta = add * 1.42
  const total = 1240.6 + add * 1.42
  const setQty = (q) => patch({ add: Math.max(0, Math.min(999, q)) - 60 })

  // Progressive disclosure: expanded adds the read-only table below the
  // confirmation summary — it never replaces it.
  const tableBody = (
      <div className="ac-body">
        <div className="change-row ch-headrow">
          <span className="ch-name">Item</span>
          <span className="ch-qty">Change</span>
          <span className="ch-cost">Cost</span>
        </div>
        <div className="change-row">
          <span className="ch-name">Oatly Barista oat milk</span>
          <span className="ch-qty">
            {/* Kept as is → the row shows what IS: 60 L, no arrow, no ghost of
                the proposal. Only applied cards show old → new. */}
            {status === 'declined' ? (<span>60 L</span>) : (<>
            <span className="ch-old">60 L</span>
            <ArrowRight size={16} className="ch-arrow" />
            {status === 'proposed' ? (
              <span className="stepper">
                <button onClick={() => setQty(newQty - 1)} aria-label="Less"><Minus size={16} /></button>
                <span className="step-value">
                  <input className="step-input" value={newQty} inputMode="numeric"
                    onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setQty(isNaN(v) ? 60 : v) }} />
                  <span className="unit">L</span>
                </span>
                <button onClick={() => setQty(newQty + 1)} aria-label="More"><Plus size={16} /></button>
              </span>
            ) : (<span className="ch-new">{newQty} L</span>)}
            </>)}
          </span>
          <span className={`ch-cost ${status === 'proposed' && add !== 0 ? 'val-flash' : ''}`} key={add}>
            {status === 'declined' || add === 0 ? '—' : `${add > 0 ? '+' : '−'}£${Math.abs(delta).toFixed(2)}`}
          </span>
        </div>

        <button className="change-row asrow" onClick={() => patch({ showAll: !showAll })}>
          <span className="ch-name quiet"><Chevron size={16} style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }} />{showAll ? 'Hide unchanged items' : 'Show 7 unchanged items'}</span>
        </button>
        {showAll && BASKET.filter(b => !b.isOat).map((b, i) => (
          <div key={i} className="change-row sub">
            <span className="ch-name quiet">{b.name}</span>
            <span className="ch-qty quiet">{b.qty} {b.unit}</span>
            <span className="ch-cost quiet">—</span>
          </div>
        ))}

        <div className="change-row total">
          <span className="ch-name">Basket total</span>
          <span className="ch-cost">
            {status === 'declined' ? (<span className="ch-new">£1,240.60</span>) : (<>
            <span className="ch-old">£1,240.60</span>
            <ArrowRight size={16} className="ch-arrow" />
            <span className={`ch-new ${status === 'proposed' && add !== 0 ? 'val-flash' : ''}`} key={add}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </>)}
          </span>
        </div>
      </div>
  )
  if (status === 'applied') {
    return (
      <Card>
        {confirmedHead}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }} style={{ overflow: 'hidden' }}>
              {tableBody}
            </motion.div>
          )}
        </AnimatePresence>
        {confirmedSummary}
      </Card>
    )
  }
  return (
    <Card>
      <CardHead title="Proposed order change"
        sub="Bidfood · order #2231 · delivery Sat 07:30" status={status} />
      {tableBody}
      {status === 'proposed' && (<>
        <div className="ac-footer">
          <button className="btn btn-primary" disabled={add === 0 || confirming} onClick={runConfirm}>Update basket</button>
          <button className="btn btn-secondary" disabled={!!confirming} onClick={() => resolve('decline')}>Keep as is</button>
        </div>
      </>)}
      {status === 'declined' && <KeptStrip label="No changes made — Saturday's order stays at 60 L of oat milk" />}
    </Card>
  )
}

// ---------- GP breakdown -------------------------------------------------
export function GpCard({ entry }) {
  const { countClosed = false } = entry.data || {}
  // A question, not a proposal — no status chip. Verified drivers vs the one
  // pending amount are separated in the table; the trust note explains it once.
  const drivers = countClosed
    ? [
      { driver: 'Milk and oat milk costs increased', evidence: 'Confirmed Bidfood price changes', impact: '−1.2 pts', w: 78 },
      { driver: 'Muffin waste increased by 7', evidence: '12 binned this week · typical week 5', impact: '−0.9 pts', w: 58 },
      { driver: 'Sales mix shifted toward Deliveroo', evidence: 'Higher share of lower-margin channel sales', impact: '−0.5 pts', w: 32 },
      { driver: 'Real waste', evidence: 'Confirmed by the closed Hub kitchen count', impact: '−0.5 pts', w: 32 },
      { driver: 'Counting slip — corrected at source', evidence: 'A 12 L crate logged as single litres', impact: '−0.2 pts', w: 14 }
    ]
    : [
      { driver: 'Milk and oat milk costs increased', evidence: 'Confirmed Bidfood price changes', impact: '−1.2 pts', w: 78 },
      { driver: 'Muffin waste increased by 7', evidence: '12 binned this week · typical week 5', impact: '−0.9 pts', w: 58 },
      { driver: 'Sales mix shifted toward Deliveroo', evidence: 'Higher share of lower-margin channel sales', impact: '−0.5 pts', w: 32 },
      { driver: 'Pending stocktake reconciliation', evidence: 'Waste vs count error not yet confirmed', impact: '−0.7 pts', w: 45, pending: true }
    ]
  return (
    <Card>
      <CardHead title="GP% — week of 29 Jun" sub={countClosed ? 'Recomputed Thu 18:05' : 'Recomputed 13:58'} />
      <div className="ac-body">
        <div className="gp-summary">
          <span className="gp-now">68.1%</span>
          <span className="gp-gap">−3.3 pts</span>
          <span className="gp-avg">4-week average 71.4%</span>
        </div>
        <div className="gp-table">
          <div className="gp-row gp-head"><span>Driver</span><span>Evidence</span><span className="gp-impact">Impact</span></div>
          {drivers.map(d => (
            <div key={d.driver} className={`gp-row ${d.pending ? 'pending' : ''}`}>
              <span className="gp-driver">{d.driver}</span>
              <span className="gp-evidence">{d.evidence}</span>
              <span className="gp-impact-cell">
                <span className="gp-impact">{d.impact}</span>
                <span className="gp-bar-track"><span className={`gp-bar ${d.pending ? 'pending' : ''}`} style={{ width: `${d.w}%` }} /></span>
              </span>
            </div>
          ))}
        </div>
        {countClosed ? (
          <div className="card-helper">Marco closed the Hub kitchen stocktake at 18:05 — the pending 0.7 pts split into real waste (−0.5) and a counting slip (−0.2), corrected at source.</div>
        ) : (
          <div className="card-helper">The −0.7 pts stays pending until Thursday's Hub kitchen stocktake closes — Edify can't yet separate real waste from a count error.</div>
        )}
      </div>
    </Card>
  )
}

// ---------- Receiving (delivery check-in) --------------------------------
// Receiving records what actually arrived — nothing else. The money question
// (credit, dispute) belongs to the invoice moment, where Edify brings a
// drafted claim. No resolution buttons here, no blocked confirm.
function ReceiveRow({ line, i, rec, status, patch }) {
  const received = rec?.received ?? line.expected
  const diff = received - line.expected
  const setQty = (q) => patch({ [i]: { ...rec, received: Math.max(0, Math.min(999, q)) } })
  const live = status === 'proposed'
  return (
    <div className={`recv-row ${diff < 0 ? 'is-short' : ''}`}>
      <div className="recv-grid">
        <div className="recv-item">
          <div className="ws-item-name">{line.name}</div>
          <div className="ws-item-sub">{line.sub}</div>
        </div>
        <div className="recv-exp">{line.expected}<span className="recv-unit">{line.unit}</span></div>
        <div className="recv-got">
          {live ? (
            <span className="stepper sm">
              <button onClick={() => setQty(received - 1)} aria-label="Less"><Minus size={16} /></button>
              <span className="step-value">
                <input className="step-input" value={received} inputMode="numeric"
                  onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setQty(isNaN(v) ? 0 : v) }} />
                <span className="unit">{line.unit}</span>
              </span>
              <button onClick={() => setQty(received + 1)} aria-label="More"><Plus size={16} /></button>
            </span>
          ) : (<span className={`recv-final ${diff !== 0 ? 'changed' : ''}`}>{received} {line.unit}</span>)}
        </div>
        <div className={`recv-diffc ${diff < 0 ? 'is-short' : diff === 0 ? 'is-none' : ''}`}>
          {diff < 0 ? `${-diff} ${line.unit} short` : diff > 0 ? `+${diff} ${line.unit} extra` : '—'}
        </div>
      </div>
    </div>
  )
}

export function ReceivingCard({ entry, patch, resolve }) {
  const { status = 'proposed', rows = {}, orderAdd = 20 } = entry.data || {}
  const compact = status === 'applied'
  const [confirming, setConfirming] = useState(false)
  const setRows = (rowPatch) => patch({ rows: { ...rows, ...rowPatch } })
  // Every delivered line is visible — receiving means checking all of it,
  // and a hidden row is an unreviewed row. The oat milk line follows the
  // order that actually stands: 60 L if the change was declined.
  const lines = [...RECEIVE_LINES, ...RECEIVE_MORE].map(l =>
    l.name === 'Oatly Barista oat milk' ? { ...l, expected: 60 + orderAdd } : l)
  const summary = lines.reduce((acc, l, i) => {
    const received = rows[i]?.received ?? l.expected
    const diff = received - l.expected
    if (diff < 0) {
      acc.short += -diff; acc.value += -diff * l.price; acc.diffs += 1
      acc.shortLines.push({ name: l.name, unit: l.unit, invoiced: l.expected, received, short: -diff, value: -diff * l.price })
    }
    if (diff > 0) { acc.extra += diff; acc.diffs += 1 }
    return acc
  }, { short: 0, extra: 0, value: 0, diffs: 0, shortLines: [] })

  const expanded = !!(entry.data || {}).expanded
  const arrivedAt = (entry.data || {}).arrivedAt || '07:42'
  const confirmedHead = (
    <CardHead title="Delivery confirmed" sub={`Order #2231 · arrived ${arrivedAt}`}
      action={{ icon: true, open: expanded, fn: () => patch({ expanded: !expanded }) }} />
  )
  const confirmedSummary = (
    <div className="ac-body confirmed-summary">
      {summary.diffs > 0 ? (<>
        <div className="sum-first"><span className="done-check"><Check size={12} stroke={1.9} /></span>{summary.shortLines[0].name} — {summary.shortLines[0].invoiced} {summary.shortLines[0].unit} ordered · {summary.shortLines[0].received} {summary.shortLines[0].unit} received · {summary.shortLines[0].short} {summary.shortLines[0].unit} short</div>
        {summary.shortLines.slice(1).map(l => (
          <div key={l.name} className="sum-line">{l.name} — {l.invoiced} {l.unit} ordered · {l.received} {l.unit} received · {l.short} {l.unit} short</div>
        ))}
        <div className="sum-line quiet">{8 - summary.diffs} other items matched. Stock has been updated.</div>
      </>) : (<>
        <div className="sum-first"><span className="done-check"><Check size={12} stroke={1.9} /></span>All 8 items matched order #2231</div>
        <div className="sum-line quiet">Stock has been updated</div>
      </>)}
    </div>
  )
  const tableBody = (
      <div className="ac-body recv-body">
        <div className="recv-grid recv-headrow">
          <div>Item</div><div className="recv-exp">Ordered</div><div className="recv-got">Received</div><div className="recv-diffc">Difference</div>
        </div>
        {lines.map((l, i) => (<ReceiveRow key={i} line={l} i={i} rec={rows[i]} status={status} patch={setRows} />))}
        {status === 'proposed' && (
          <div className="card-helper">
            {summary.diffs > 0
              ? `${summary.diffs} difference${summary.diffs === 1 ? '' : 's'} recorded. Stock will update from the received quantities.`
              : 'Stock will update from the received quantities.'}
          </div>
        )}
      </div>
  )
  if (status === 'applied') {
    return (
      <Card>
        {confirmedHead}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }} style={{ overflow: 'hidden' }}>
              {tableBody}
            </motion.div>
          )}
        </AnimatePresence>
        {confirmedSummary}
      </Card>
    )
  }
  return (
    <Card>
      <CardHead title="Check in Bidfood delivery"
        sub={`Order #2231 · expected 07:30 · arrived ${arrivedAt}`} />
      {tableBody}
      {status === 'proposed' && (
        <div className="ac-footer">
          <button className="btn btn-primary" disabled={confirming}
            onClick={() => { setConfirming(true); setTimeout(() => resolve('receipt', { shortUnits: summary.short, extraUnits: summary.extra, value: summary.value, diffs: summary.diffs, shortLines: summary.shortLines }), 600) }}>Confirm received</button>
        </div>
      )}
    </Card>
  )
}

// ---------- Invoice #4902: line-level actions -------------------------------
// One quantity mismatch, one price mismatch. Facts are read-only, the
// quantity action is an editable dropdown (safest option recommended),
// the price action is fixed — and every action carries one consequence
// line. No accounting vocabulary anywhere.
// Native selects show one label in the field and the menu, so the
// "Recommended" mark lives in the helper under the default instead.
const qtyOptions = (l) => [
  ['credit', `Request £${l.amount.toFixed(2)} credit`],
  ['correctReceipt', 'Correct receipt'],
  ['accept', `Accept £${l.amount.toFixed(2)} charge`]
]
const priceOptions = (l) => [
  ['confirmPrice', 'Confirm price with Bidfood'],
  ['credit', `Request £${l.amount.toFixed(2)} credit`],
  ['accept', `Accept £${l.amount.toFixed(2)} charge`]
]
const lineOptions = (l) => (l.kind === 'qty' ? qtyOptions(l) : priceOptions(l))
const joinAnd = (xs) => (xs.length <= 1 ? xs[0] || '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const spokenName = (name) => name.replace(/ \d+\s?(g|kg|ml|L)$/, '')

// What the currently selected action WILL do — one plain line.
const consequence = (l) => {
  switch (l.resolution) {
    case 'credit': return l.kind === 'qty'
      ? `Requests £${l.amount.toFixed(2)} credit. Stock stays at ${l.receivedQty}.`
      : `Requests £${l.amount.toFixed(2)} credit. Expected price stays at ${l.expectedPrice}.`
    case 'accept': return l.kind === 'qty'
      ? `Accepts the £${l.amount.toFixed(2)} charge. Stock stays at ${l.receivedQty}.`
      : `Accepts the £${l.amount.toFixed(2)} charge.`
    case 'confirmPrice': return `Checks ${l.billedPrice} with Bidfood. Invoice stays open.`
    default: return null
  }
}
// After confirmation the same cell becomes a status — what HAS happened.
const lineStatus = (l) => {
  switch (l.resolution) {
    case 'credit': return ['Credit requested', `Waiting for Bidfood to issue £${l.amount.toFixed(2)} credit.`]
    case 'correctReceipt': return ['Receipt corrected', `${l.receivedQty} → ${l.corrected ?? l.invoiced} ${l.unit} · Stock updated.`]
    case 'accept': return ['Charge accepted', l.kind === 'qty'
      ? `£${l.amount.toFixed(2)} remains included in the invoice. Stock remains at ${l.receivedQty}.`
      : `£${l.amount.toFixed(2)} remains included in the invoice.`]
    case 'confirmPrice': return ['Waiting for Bidfood', `Waiting for confirmation of the ${l.billedPrice} price.`]
    default: return ['Confirmed', null]
  }
}

export function InvoiceCloseCard({ entry, resolve, patch }) {
  const d = entry.data || {}
  const { status = 'proposed' } = d
  const lines = d.lines || []
  const n = lines.length
  const invoiced = d.invoiced ?? 1269
  const num = d.num || '#4902'
  const noteLabel = d.noteLabel || 'delivery note #912'
  const expLabel = d.expLabel || 'Expected from receipt'
  // Before confirmation the summary describes the SOURCE data — dropdown
  // changes never move the totals. Only a confirmed correction does.
  const totalDiff = lines.reduce((a, l) => a + l.amount, 0)
  const expected = invoiced - totalDiff
  const remaining = (l) => (l.kind === 'qty' && l.resolution === 'correctReceipt'
    ? Math.max(0, l.invoiced - (l.corrected ?? l.invoiced)) * (l.amount / l.short)
    : l.amount)
  const unresolved = lines.reduce((a, l) => (['credit', 'confirmPrice'].includes(l.resolution) ? a + remaining(l) : l.resolution === 'correctReceipt' ? a + remaining(l) : a), 0)
  const setLine = (i, linePatch) => patch({ lines: lines.map((l, j) => (j === i ? { ...l, ...linePatch } : l)) })
  const matched = d.matched || []
  return (
    <Card>
      <div className="ac-head">
        <button className="doc-title" onClick={() => {}}>
          <Doc size={16} className="doc-ico" />
          <span className="doc-name">Bidfood invoice {num}</span>
          <ExtLink size={12} className="doc-ext" />
        </button>
      </div>
      <div className="ac-body">
        <div className="compare-cols">
          <div className="compare-col">
            <div className="cc-head">Invoice total</div>
            <div className="cc-total">£{invoiced.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
          {status === 'proposed' ? (<>
            <div className="compare-col">
              <div className="cc-head">{expLabel}</div>
              <div className="cc-total">£{expected.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="compare-col flagged">
              <div className="cc-head">Difference</div>
              <div className="cc-total">£{totalDiff.toFixed(2)}</div>
            </div>
          </>) : (<>
            <div className="compare-col flagged">
              <div className="cc-head">Unresolved</div>
              <div className="cc-total">£{unresolved.toFixed(2)}</div>
            </div>
            <div className="compare-col">
              <div className="cc-head">Status</div>
              <div className="cc-total">Open</div>
            </div>
          </>)}
        </div>
        <div className="ir-grid ir-headrow">
          <div>Item</div><div>Mismatch</div><div>Action</div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="ir-row">
            <div className="ir-item">{l.name}</div>
            <div className="ir-issue">
              <div className="mis-vals">{l.kind === 'qty'
                ? `${l.billedQty} billed · ${l.receivedQty} received`
                : `${l.billedPrice} billed · ${l.expectedPrice} expected`}</div>
              <div className={`mis-delta ${status === 'proposed' || ['credit', 'confirmPrice'].includes(l.resolution) ? 'is-open' : ''}`}>{l.kind === 'qty'
                ? `${l.short} ${l.unit} short · £${l.amount.toFixed(2)}`
                : `£${(l.amount / (l.packs || 24)).toFixed(2)} more per pack · £${l.amount.toFixed(2)}`}</div>
            </div>
            <div className="ir-res">
              {status === 'proposed' ? (<>
                <select className="ir-select" value={l.resolution} onChange={e => setLine(i, { resolution: e.target.value })}>
                  {lineOptions(l).map(([k, label]) => (<option key={k} value={k}>{label}</option>))}
                </select>
                {l.resolution === 'correctReceipt' ? (<>
                  <div className="correct-inline">
                    {l.receivedQty} → <input className="ir-num" value={l.corrected ?? l.invoiced} inputMode="numeric"
                      onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setLine(i, { corrected: isNaN(v) ? 0 : v }) }} /> {l.unit}
                  </div>
                  <div className="res-note">Updates {noteLabel} and stock.</div>
                </>) : (
                  <div className="res-note">{consequence(l)}</div>
                )}
              </>) : (() => {
                const [statusLabel, helper] = lineStatus(l)
                return (<>
                  <div className="res-status">{statusLabel}</div>
                  {helper && <div className="res-note">{helper}</div>}
                </>)
              })()}
            </div>
          </div>
        ))}
        {matched.length > 0 && (
          <button className="ir-more" onClick={() => patch({ showMatched: !d.showMatched })}>
            <span className="more-toggle"><Chevron size={16} style={{ transform: d.showMatched ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }} />{d.showMatched ? 'Hide matched lines' : `Show ${matched.length} matched lines`}</span>
          </button>
        )}
        {d.showMatched && matched.map((m, i) => (
          <div key={`m${i}`} className="ir-row muted sub">
            <div className="ir-item">{m.name}</div>
            <div className="ir-issue">{m.qty} {m.unit} × £{m.price.toFixed(2)}</div>
            <div className="ir-res">Matched</div>
          </div>
        ))}
      </div>
      {status === 'proposed' && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('invoiceResolutions', { lines, totalDiff, unresolved, invoiced })}>Confirm changes</button>
        </div>
      )}
      {status === 'applied' && (
        <ConfirmStrip label="Changes confirmed"
          sub={`Invoice remains open · £${unresolved.toFixed(2)} unresolved`} />
      )}
    </Card>
  )
}

// ---------- Delivery due (expected time means due, not arrived) -------------
export function DeliveryDueCard({ resolve }) {
  // Checking in confirms the van is physically here — the due prompt is
  // then replaced by the receiving form itself, not by a status card.
  return (
    <Card>
      <CardHead title="Bidfood delivery is due now" sub="Order #2231 · 8 items · expected Sat 07:30" />
      <div className="ac-footer">
        <button className="btn btn-primary" onClick={() => resolve('receiveStart')}>Check in delivery</button>
      </div>
    </Card>
  )
}

// ---------- Count fix --------------------------------------------------
// Same object pattern as the order card: facts in borderless rows, the
// proposed correction editable inline, and a confirmed card that keeps a
// summary footer with the details behind View details.
export function CountFixCard({ entry, resolve, patch }) {
  const { status = 'proposed', choice, corrected = 8, accepting = false } = entry.data || {}
  const setQty = (q) => patch({ corrected: Math.max(0, Math.min(999, q)) })
  const expanded = !!(entry.data || {}).expanded
  const rowsInner = (<>
    <div className="cnt-row cnt-headrow"><span>Figure</span><span className="cnt-val">Value</span><span>Basis</span></div>
    <div className="cnt-row"><span>Opening stock</span><span className="cnt-val">39 L</span><span className="cnt-basis">Thursday delivery + carry-over</span></div>
    <div className="cnt-row"><span>POS recipe usage</span><span className="cnt-val">−31 L</span><span className="cnt-basis">418 milk-based drinks sold</span></div>
    <div className="cnt-row"><span>Expected closing stock</span><span className="cnt-val">8 L</span><span className="cnt-basis">Sales and recipes</span></div>
    <div className="cnt-row"><span>Posted closing count</span><span className="cnt-val">22 L</span><span className="cnt-basis"><span className="cnt-delta">+14 L vs expected</span></span></div>
  </>)
  if (status === 'applied') {
    const heads = { recount: 'Recount requested', acceptCount: 'Posted count accepted' }
    const sums = {
      recount: ["Recount added to tonight's closing checklist", 'The posted 22 L stays provisional until checked.'],
      acceptCount: ['Posted count accepted — 22 L stands', 'The +14 L difference now counts in GP and variance.']
    }
    const title = heads[choice] || 'Count corrected'
    const [sumFirst, sumQuiet] = sums[choice] || [`Closing count corrected — 22 L → ${corrected} L`, 'GP and variance use the corrected value.']
    return (
      <Card>
        <CardHead title={title} sub="Whole milk · Fitzroy Espresso · posted 07:20"
          action={{ icon: true, open: expanded, fn: () => patch({ expanded: !expanded }) }} />
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }} style={{ overflow: 'hidden' }}>
              <div className="ac-body">{rowsInner}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="ac-body confirmed-summary">
          <div className="sum-first"><span className="done-check"><Check size={12} stroke={1.9} /></span>{sumFirst}</div>
          <div className="sum-line quiet">{sumQuiet}</div>
        </div>
      </Card>
    )
  }
  return (
    <Card>
      <CardHead title="Whole milk count looks too high"
        sub="Fitzroy Espresso · posted by Aisha at 07:20" />
      <div className="ac-body">
        {rowsInner}
        <div className="card-helper">The posted count remains provisional until you confirm.</div>
        <div className="prop-line">
          <span className="prop-label">Proposed correction — use closing count:</span>
          <span className="stepper sm">
            <button onClick={() => setQty(corrected - 1)} aria-label="Less"><Minus size={16} /></button>
            <span className="step-value">
              <input className="step-input" value={corrected} inputMode="numeric"
                onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setQty(isNaN(v) ? 0 : v) }} />
              <span className="unit">L</span>
            </span>
            <button onClick={() => setQty(corrected + 1)} aria-label="More"><Plus size={16} /></button>
          </span>
        </div>
      </div>
      {!accepting && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('countCorrect', { corrected })}>Confirm correction</button>
          <button className="btn btn-secondary" onClick={() => resolve('recount')}>Request recount</button>
          <div className="spacer" />
          <button className="done-action" onClick={() => patch({ accepting: true })}>Accept posted count</button>
        </div>
      )}
      {accepting && (
        <div className="ir-confirm">
          <div className="cs-title">Accept the posted count of 22 L?</div>
          <div className="cs-body">This confirms yesterday's count as correct. The +14 L difference goes into GP and variance as real.</div>
          <div className="ir-confirm-actions">
            <button className="btn btn-primary" onClick={() => resolve('acceptCount')}>Accept posted count</button>
            <button className="btn btn-secondary" onClick={() => patch({ accepting: false })}>Cancel</button>
          </div>
        </div>
      )}
    </Card>
  )
}

/**
 * Born from the GP% answer — the bridge from a question to a case.
 * A follow-up chip proposes this change; nothing reaches the Hub kitchen
 * until Priya confirms.
 */
export function MuffinCard({ entry, patch, resolve }) {
  const { status = 'proposed' } = entry.data || {}
  const expanded = !!(entry.data || {}).expanded
  const table = (
    <div className="ac-body">
      <div className="muf-row muf-head"><span>Plan</span><span className="muf-num">Muffins</span><span>Basis</span></div>
      <div className="muf-row"><span>Current plan</span><span className="muf-num">12</span><span className="muf-basis">Current Monday request</span></div>
      <div className="muf-row"><span>Typical Monday sales</span><span className="muf-num">6–7</span><span className="muf-basis">POS · last four Mondays</span></div>
      <div className="muf-row"><span>Proposed plan</span><span className="muf-num">8</span><span className="muf-basis">1–2 above typical sales</span></div>
    </div>
  )
  if (status === 'applied') return (
    <Card>
      <CardHead title="Production change requested" sub="Blueberry muffins · Hub kitchen"
        action={{ icon: true, open: expanded, fn: () => patch({ expanded: !expanded }) }} />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div key="d" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }} style={{ overflow: 'hidden' }}>
            {table}
            <div className="ac-body muf-meta">Estimated saving · ~£3/week · Sent to Hub kitchen at 14:06.</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="ac-body confirmed-summary">
        <div className="sum-first"><span className="done-check"><Check size={12} stroke={1.9} /></span>Monday's blueberry muffin request changed 12 → 8</div>
        <div className="sum-line quiet">Sent to Hub kitchen at 14:06 — Edify will flag an early sell-out before 15:00.</div>
      </div>
    </Card>
  )
  return (
    <Card>
      <CardHead title="Monday's production — blueberry muffins" sub="Hub kitchen" />
      {table}
      <div className="ac-body muf-meta">
        Keeps a buffer of 1–2 muffins above typical Monday sales. <span className="muf-save">Estimated saving · ~£3/week.</span>
      </div>
      <div className="ac-note">If muffins sell out before 15:00, Edify will flag it and suggest restoring two next Monday.</div>
      {status === 'proposed' && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('muffinConfirm')}>Request 8 muffins</button>
          <button className="btn btn-secondary" onClick={() => resolve('muffinKeep')}>Keep 12</button>
        </div>
      )}
      {status === 'declined' && <KeptStrip label="Kept at 12 — no change requested" />}
    </Card>
  )
}

// ---------- Supplier: shared bits -----------------------------------------
// One supplier setup = one card with changing states. These bits are shared
// by the existing-supplier and new-supplier paths so both read identically.
function SupplierRows({ rows }) {
  return (
    <div className="sup-rows">
      {rows.map(({ label, value }) => (
        <div key={label} className="sup-row"><span className="sup-label">{label}</span><span className="sup-value">{value || '—'}</span></div>
      ))}
    </div>
  )
}

function DayChips({ value = [], onToggle }) {
  return (
    <div className="day-chips">
      {WEEK_DAYS.map(d => (
        <button key={d} type="button" className={`day-chip ${value.includes(d) ? 'on' : ''}`} onClick={() => onToggle(d)}>{d}</button>
      ))}
    </div>
  )
}

// The confirmed state — same card container, read-only, with the persistent
// footer and an expandable snapshot. No second paragraph repeats the setup.
function SupplierConfirmed({ entry, patch, name, rows }) {
  const expanded = !!(entry.data || {}).expanded
  return (
    <Card>
      <CardHead title="Supplier added" sub={`${name} · ${CURRENT_SITE}`}
        action={{ icon: true, open: expanded, fn: () => patch({ expanded: !expanded }) }} />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }} style={{ overflow: 'hidden' }}>
            <div className="ac-body"><SupplierRows rows={rows} /></div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="ac-body confirmed-summary">
        <div className="sum-first"><span className="done-check"><Check size={12} stroke={1.9} /></span>{name} added</div>
        <div className="sum-line quiet">Available for ordering at {CURRENT_SITE}.</div>
      </div>
    </Card>
  )
}

// Path A — an existing supplier found on another site. Ready to review, then
// confirmed. "Choose another supplier" returns to selection (handled in Chat).
export function SupplierAddCard({ entry, patch, resolve }) {
  const { status = 'proposed', supplier } = entry.data || {}
  const rows = [
    { label: 'Used at', value: supplier.usedBy.join(', ') },
    { label: 'Order email', value: supplier.orderEmail },
    { label: 'Cut-off', value: supplier.cutoff },
    { label: 'Delivery days', value: formatDays(supplier.deliveryDays) },
    { label: 'Minimum order', value: supplier.minimumOrder }
  ]
  if (status === 'applied') return <SupplierConfirmed entry={entry} patch={patch} name={supplier.name} rows={rows} />
  return (
    <Card>
      <CardHead title={`Add ${supplier.name} to ${CURRENT_SITE}`} sub="Existing supplier · ready to review" />
      <div className="ac-body"><SupplierRows rows={rows} /></div>
      <div className="card-helper">Nothing is created until you confirm.</div>
      <div className="ac-footer">
        <button className="btn btn-primary" onClick={() => resolve('supplierAddConfirm')}>Add to {CURRENT_SITE}</button>
        <button className="btn btn-secondary" onClick={() => resolve('supplierChooseAnother')}>Choose another supplier</button>
      </div>
    </Card>
  )
}

// A labelled row whose value is an editable control. Required fields carry a
// small red asterisk after the label — no "Required" text in the input.
function SupplierField({ label, required, children }) {
  return (
    <div className="sup-row field">
      <span className="sup-label">{label}{required && <span className="req-star">*</span>}</span>
      <span className="sup-control">{children}</span>
    </div>
  )
}

// Path B — a brand-new supplier. The structured draft appears immediately;
// chat, paste and direct edits all write to the same draft (source of truth).
export function SupplierDraftCard({ entry, patch, resolve }) {
  const { status = 'proposed', draft, confirmingDiscard = false } = entry.data || {}
  const d = { ...draft, site: draft.site || CURRENT_SITE, deliveryDays: draft.deliveryDays || [] }
  const missing = requiredMissing(d)
  const ready = draftReady(d)
  const set = (k, v) => patch({ draft: { ...d, [k]: v } })
  const toggleDay = (day) => {
    const next = d.deliveryDays.includes(day) ? d.deliveryDays.filter(x => x !== day) : WEEK_DAYS.filter(x => d.deliveryDays.includes(x) || x === day)
    set('deliveryDays', next)
  }
  const rows = [
    { label: 'Order email', value: d.orderEmail },
    { label: 'Delivery days', value: formatDays(d.deliveryDays) },
    { label: 'Cut-off', value: d.cutoff },
    { label: 'Minimum order', value: d.minimumOrder }
  ]
  if (status === 'applied') return <SupplierConfirmed entry={entry} patch={patch} name={d.name} rows={rows} />
  if (status === 'discarded') return (
    <Card>
      <div className="ac-body sup-discarded">
        <div className="sup-disc-title">Draft discarded</div>
        <div className="sup-disc-sub">No supplier was created.</div>
      </div>
    </Card>
  )
  const hasData = !!(d.orderEmail || d.cutoff || d.minimumOrder || d.deliveryDays.length)
  const missLabel = ready ? 'Ready to review' : `${missing} required field${missing === 1 ? '' : 's'} missing`
  return (
    <Card>
      <CardHead title={`Add ${d.name} to ${CURRENT_SITE}`} sub={`New supplier · ${missLabel}`} />
      <div className="ac-body sup-form">
        <div className="sup-row"><span className="sup-label">Supplier</span><span className="sup-control"><span className="sup-value">{d.name}</span></span></div>
        <div className="sup-row"><span className="sup-label">Site</span><span className="sup-control"><span className="sup-value">{d.site}</span></span></div>
        <SupplierField label="Order email" required>
          <input className="sup-input" value={d.orderEmail || ''} placeholder="orders@caravan.co.uk" aria-label="Order email"
            onChange={e => set('orderEmail', e.target.value)} />
        </SupplierField>
        <SupplierField label="Delivery days" required>
          <DayChips value={d.deliveryDays} onToggle={toggleDay} />
        </SupplierField>
        <SupplierField label="Cut-off" required>
          <input type="time" className="sup-input sup-time" value={d.cutoff || ''} aria-label="Cut-off"
            onChange={e => set('cutoff', e.target.value)} />
        </SupplierField>
        <SupplierField label="Minimum order">
          <span className="sup-money">
            <select className="sup-cur" value={d.currency || '£'} aria-label="Currency"
              onChange={e => patch({ draft: { ...d, currency: e.target.value, minimumOrder: d.minAmount ? `${e.target.value}${d.minAmount}` : '' } })}>
              <option value="£">£</option><option value="€">€</option><option value="$">$</option>
            </select>
            <input className="sup-input" value={d.minAmount || ''} placeholder="200" inputMode="numeric" aria-label="Minimum order amount"
              onChange={e => { const v = e.target.value.replace(/[^\d,]/g, ''); patch({ draft: { ...d, minAmount: v, minimumOrder: v ? `${d.currency || '£'}${v}` : '' } }) }} />
          </span>
        </SupplierField>
      </div>
      {confirmingDiscard ? (
        <div className="ir-confirm">
          <div className="cs-title">Discard this draft?</div>
          <div className="cs-body">The details you've entered will be removed. No supplier will be created.</div>
          <div className="ir-confirm-actions">
            <button className="btn btn-primary" onClick={() => resolve('supplierDiscard')}>Discard draft</button>
            <button className="btn btn-secondary" onClick={() => patch({ confirmingDiscard: false })}>Keep editing</button>
          </div>
        </div>
      ) : (
        <div className="ac-footer">
          <button className="btn btn-primary" disabled={!ready} onClick={() => resolve('supplierCreateConfirm')}>Create supplier</button>
          <button className="btn btn-secondary" onClick={() => (hasData ? patch({ confirmingDiscard: true }) : resolve('supplierDiscard'))}>Discard draft</button>
        </div>
      )}
    </Card>
  )
}

// Update existing supplier (pick fields → edit → save)
const UPDATE_FIELDS = [
  ['cutoff', 'Order cut-off', '14:00'],
  ['leadTime', 'Lead time', 'e.g. 2 days'],
  ['minimumOrder', 'Minimum order', '£ amount'],
  ['deliveryDays', 'Delivery days', null],
  ['orderEmail', 'Email', 'orders@…'],
  ['phone', 'Phone', '+44 …']
]

export function SupplierUpdateCard({ entry, patch, resolve }) {
  const { status = 'proposed', supplier, active = [], edits = {} } = entry.data || {}
  const toggleField = (key) => patch({ active: active.includes(key) ? active.filter(k => k !== key) : [...active, key] })
  const setEdit = (key, value) => patch({ edits: { ...edits, [key]: value } })
  const toggleDay = (day) => {
    const cur = edits.deliveryDays || supplier.deliveryDays
    const next = cur.includes(day) ? cur.filter(x => x !== day) : WEEK_DAYS.filter(x => cur.includes(x) || x === day)
    setEdit('deliveryDays', next)
  }
  const changed = active.filter(k => {
    const v = edits[k]
    if (k === 'deliveryDays') return v && v.join() !== supplier.deliveryDays.join()
    return v != null && v !== '' && v !== supplier[k]
  })

  return (
    <Card>
      <CardHead title={`${supplier.name} — update`} sub="Fitzroy Espresso — pick what changed, Edify keeps the rest"
        status={status === 'proposed' ? 'unsaved' : status} />
      {status === 'proposed' && (
        <div className="supplier-draft">
          <div className="supplier-section-title">What changed? Pick one or more</div>
          <div className="field-chips">
            {UPDATE_FIELDS.map(([key, label]) => (
              <button key={key} type="button" className={`toggle-chip ${active.includes(key) ? 'on' : ''}`} onClick={() => toggleField(key)}>{label}</button>
            ))}
          </div>
          {active.map(key => {
            const [, label, ph] = UPDATE_FIELDS.find(f => f[0] === key)
            const oldVal = key === 'deliveryDays' ? formatDays(supplier.deliveryDays) : supplier[key]
            return (
              <div key={key} className="update-field">
                <div className="supplier-mini-label">{label}</div>
                {key === 'deliveryDays'
                  ? <DayChips value={edits.deliveryDays || supplier.deliveryDays} onToggle={toggleDay} />
                  : <input className="supplier-inline-input update-input" placeholder={ph} value={edits[key] ?? ''} onChange={e => setEdit(key, e.target.value)} />}
                <div className="update-was">was {oldVal}</div>
              </div>
            )
          })}
          {active.length === 0 && <div className="supplier-later-note">Nothing selected — pick a field above to change it.</div>}
        </div>
      )}
      {status === 'applied' && <ConfirmStrip label={`${supplier.name} updated`} sub="Changes saved for this site" />}
      {status === 'cancelled' && <KeptStrip label="No changes made" />}
      {status === 'proposed' && (
        <div className="ac-footer supplier-create-footer">
          <button className="btn btn-primary" disabled={changed.length === 0}
            onClick={() => resolve('supplierUpdateConfirm', { changed })}>Save {changed.length || ''} change{changed.length === 1 ? '' : 's'}</button>
          {changed.length === 0 && <div className="supplier-create-helper">Change a value to save.</div>}
          <button className="btn btn-secondary" onClick={() => resolve('supplierCancel')}>Cancel</button>
        </div>
      )}
    </Card>
  )
}

// Delete supplier (destructive, guarded)
