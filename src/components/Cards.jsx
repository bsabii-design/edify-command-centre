import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { INVOICE_LINES, INVOICE_TOTALS, RECEIVE_LINES, RECEIVE_MORE, BASKET } from '../data.js'
import { CURRENT_SITE, WEEK_DAYS, formatDays } from '../suppliers.js'
import { GrainSwatch } from './Recipes.jsx'
import { Check, CheckCircle, Chevron, Clock, Alert, AlertCircle, ArrowRight, Plus, Minus, Eye } from './Icons.jsx'

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

function CardHead({ title, sub, status, deadline }) {
  return (
    <div className="ac-head">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ac-title">{title}</div>
        {sub && <div className="ac-sub">{sub}</div>}
      </div>
      {/* A live deadline outranks any status; once decided, the chip retires. */}
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
          <Check size={16} />
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

  return (
    <Card>
      <CardHead title="Proposed order change"
        sub="Bidfood — delivers Saturday 07:30" status={status} />
      {/* No table furniture. Three rows on one grid; old → new is the only
          pattern (grey → ink), the stepper is the only outlined = editable
          thing, and the total is the only bold number. */}
      <div className="ac-body">
        <div className="change-row ch-headrow">
          <span className="ch-name">Item</span>
          <span className="ch-qty">Change</span>
          <span className="ch-cost">Cost</span>
        </div>
        <div className="change-row">
          <span className="ch-name">
            <span className="line-swatch"><GrainSwatch palette="dairy" seed="Oat milk" /></span>
            Oat milk
          </span>
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
          <span className="ch-name quiet"><Chevron size={16} style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }} /> 7 other items</span>
          <span className="ch-qty quiet">Unchanged</span>
          <span className="ch-cost quiet">—</span>
        </button>
        {showAll && BASKET.filter(b => !b.isOat).map((b, i) => (
          <div key={i} className="change-row sub">
            <span className="ch-name quiet">
              <span className="line-swatch sm"><GrainSwatch palette={b.cat} seed={b.name} /></span>
              {b.name}
            </span>
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
      {/* The decision comes before the evidence — the working sits quietly under it. */}
      {status === 'proposed' && (<>
        <div className="card-summary inpad">
          <span className="cs-ico"><Eye size={16} /></span>
          <div className="cs-copy">
            <div className="cs-title">1 change proposed</div>
            <div className="cs-body">Confirming sends the updated basket to Bidfood. Keeping it leaves oat milk at <b>60 L</b> — nothing is sent.</div>
          </div>
        </div>
        <div className="ac-footer">
          <button className="btn btn-primary" disabled={add === 0 || confirming} onClick={runConfirm}>Update basket</button>
          <button className="btn btn-secondary" disabled={!!confirming} onClick={() => resolve('decline')}>Keep as is</button>
        </div>
      </>)}
      {status === 'applied' && <ConfirmStrip label="Order sent to Bidfood"
        sub={<>{newQty} L oat milk added. Accepted {(entry.data || {}).acceptedAt || '22:31'}. Delivery Sat 07:30.</>}
        action={{ label: 'View order', fn: () => {} }} />}
      {status === 'declined' && <KeptStrip label="No changes made — Saturday's order stays at 60 L of oat milk" />}
    </Card>
  )
}

// ---------- GP breakdown -------------------------------------------------
export function GpCard({ entry, resolve }) {
  const { status = 'proposed', countClosed = false } = entry.data || {}
  // Store-manager words only. The muffin row carries a handle — it's the one
  // driver Priya can act on today, and the chevron says so. Once the count
  // closes, the hatched guess resolves into two solid, verified rows.
  const drivers = [
    { label: 'Milk & oat milk price up 8% since Monday', sub: 'Bidfood price change — hits every white-based drink', pts: 1.2, w: 78 },
    { label: 'Muffin waste doubled', sub: '12 binned this week vs 5 in a normal week', pts: 0.9, w: 58, action: true },
    { label: 'More sales went through Deliveroo', sub: 'Deliveroo keeps 30%, so those sales earn less', pts: 0.5, w: 32 },
    ...(countClosed ? [
      { label: 'Real waste', sub: 'Confirmed by the closed count', pts: 0.5, w: 32 },
      { label: 'Counting slip — corrected', sub: 'A 12 L crate logged as single litres', pts: 0.2, w: 14 }
    ] : [
      { label: 'Unexplained difference', sub: 'Can’t split waste vs count error yet', pts: 0.7, w: 45, uncertain: true }
    ])
  ]
  return (
    <Card>
      {/* This card answers a question. It proposes no change, so it never says
          "Awaiting your call" — it says which part of the answer it can't stand behind. */}
      <CardHead title="GP% — week of 29 Jun" sub={countClosed ? 'Recomputed Thu 18:05 — count closed' : 'Recomputed 13:58'}
        status={countClosed ? 'verified' : 'unverified'} />
      <div className="ac-body">
        <div className="gp-headline">
          <span className="big">68.1%</span>
          <span className="delta-chip">−3.3 pts</span>
          <span className="target">4-week average 71.4%</span>
        </div>
        {drivers.map((d, i) => (
          <motion.div key={d.label} className={`driver ${d.uncertain ? 'uncertain' : ''} ${d.action ? 'act' : ''}`}
            onClick={d.action ? () => resolve('openMuffins') : undefined}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}>
            <div className="d-label">{d.label}<div className="d-sub">{d.sub}</div></div>
            <div className="d-bar-track">
              <motion.div className="d-bar" initial={{ width: 0 }} animate={{ width: `${d.w}%` }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.45, ease: 'easeOut' }} />
            </div>
            <div className="d-val">−{d.pts.toFixed(1)} pts</div>
            <span className="d-slot">{d.action && <Chevron size={16} />}</span>
          </motion.div>
        ))}
        {countClosed ? (
          /* The promise, paid: the range resolved itself the moment Marco closed
             the count — no button was ever needed. */
          <div className="uncertain-note resolved">
            <CheckCircle size={16} />
            <div>
              <div className="un-title">Count closed — nothing here is a guess now</div>
              <div className="un-body">Marco closed the Hub kitchen count at 18:05. The unexplained −0.7 pts split into real waste (−0.5) and a counting slip (−0.2), corrected at source.</div>
            </div>
          </div>
        ) : (
          <div className="uncertain-note">
            <AlertCircle size={16} />
            <div>
              <div className="un-title">One number here is a range, not a fact</div>
              <div className="un-body">
                Thursday's stocktake at <b>Hub kitchen</b> — our prep site — is still open, so I can't split the
                unexplained −0.7 pts between real waste and a counting error. Until it closes, read it as −0.3 to −1.1 pts.
              </div>
              {/* No button: closing the count is the stocktake's job, not this
                  answer's. Edify recomputes the moment it lands — nothing to press. */}
              <div className="un-actions">
                <span className="un-passive">This updates itself the moment the count closes.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ---------- Invoice review (decision flow) --------------------------------
function receiptLine(name, choice) {
  if (name === 'Double cream 2 L') {
    if (/later/.test(choice)) return '2 Double cream logged as coming in a later delivery'
    if (/Accept/.test(choice)) return 'Double cream accepted as charged'
    return 'Credit note requested for 2 missing Double cream units'
  }
  if (/Accept/.test(choice)) return 'Butter expected price updated to £5.15'
  if (/Hold/.test(choice)) return 'Butter price held for supplier review'
  return 'Butter price difference sent to Bidfood for confirmation'
}

export function InvoiceCard({ entry, patch, resolve }) {
  const { status = 'proposed', changing = false, showMatched = false, choices = {} } = entry.data || {}
  const flagged = INVOICE_LINES.filter(l => l.bad)
  const matched = INVOICE_LINES.filter(l => !l.bad)
  const chosen = (l) => choices[l.name] || l.options[0]
  const pickOption = (name, opt) => patch({ choices: { ...choices, [name]: opt } })

  if (status === 'applied') {
    const bothAccepted = flagged.every(l => /Accept/.test(chosen(l)))
    return (
      <Card>
        <CardHead title="Bidfood invoice #4821 — resolved"
          sub="Compared with delivery note signed by Marco, Thu 08:05" status="applied" />
        <div className="ac-body">
          <ul className="ac-receipt-list">
            {flagged.map(l => <li key={l.name}>{receiptLine(l.name, chosen(l))}</li>)}
            <li>{/Accept new price/.test(chosen(flagged[1])) ? 'Butter price updated for future orders' : 'No supplier prices were updated'}</li>
          </ul>
        </div>
        <ConfirmStrip label="Resolution confirmed"
          sub={bothAccepted ? 'Invoice approved and passed for payment' : 'Invoice moved to Waiting for supplier'} />
      </Card>
    )
  }

  return (
    <Card>
      <CardHead title="Bidfood invoice #4821 needs review"
        sub="Compared with delivery note signed by Marco, Thu 08:05" status="attention" />
      <div className="ac-body">
        <div className="compare-cols three">
          <div className="compare-col">
            <div className="cc-head">Supplier charged</div>
            <div className="cc-total">{INVOICE_TOTALS.charged}</div>
            <div className="cc-sub">arrived overnight</div>
          </div>
          <div className="compare-col">
            <div className="cc-head">Delivery received</div>
            <div className="cc-total">{INVOICE_TOTALS.received}</div>
            <div className="cc-sub">delivery note, Thu 08:05</div>
          </div>
          <div className="compare-col flagged">
            <div className="cc-head">Difference</div>
            <div className="cc-total">{INVOICE_TOTALS.difference}</div>
            <div className="cc-sub">across {INVOICE_TOTALS.items} items</div>
          </div>
        </div>
        <table className="diff-table fixed">
          <colgroup><col style={{ width: '30%' }} /><col style={{ width: '22%' }} /><col style={{ width: '26%' }} /><col style={{ width: '22%' }} /></colgroup>
          <thead><tr><th>Item</th><th className="num">Charged</th><th className="num">Received / expected</th><th className="num">Difference</th></tr></thead>
          <tbody>
            {flagged.map((l, i) => (
              <tr key={i} className="mismatch">
                <td><b>{l.name}</b></td>
                <td className="num">{l.charged}</td>
                <td className="num">{l.received}</td>
                <td className="num"><span className="flag">{l.diff}</span></td>
              </tr>
            ))}
            <tr className="more-row" onClick={() => patch({ showMatched: !showMatched })}>
              <td colSpan={4}><span className="more-toggle"><Chevron size={16} style={{ transform: showMatched ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }} /> {showMatched ? 'Hide matched items' : `${matched.length} other items matched`}</span></td>
            </tr>
            {showMatched && matched.map((l, i) => (
              <tr key={`m${i}`} className="sub-row">
                <td className="muted">{l.name}</td>
                <td className="num muted">{l.charged}</td>
                <td className="num muted">{l.received}</td>
                <td className="num muted">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="resolution-block">
        <div className="card-summary noline">
          <span className="cs-ico"><Eye size={16} /></span>
          <div className="cs-copy">
            <div className="cs-title">2 differences found</div>
            <div className="cs-body">Edify prepared a resolution for each — nothing changes until you confirm. Unresolved, this invoice holds Friday's payment run.</div>
          </div>
        </div>
        {flagged.map((l, i) => (
          <div key={i} className="res-item">
            <span className="res-num">{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="res-name">{l.name}</div>
              <div className="res-issue">{l.issue}</div>
              <div className="res-action"><span className="res-label">Resolution</span> {chosen(l)}</div>
              {changing && (
                <div className="res-options">
                  {l.options.map(opt => (
                    <button key={opt} className={`seg-btn ${chosen(l) === opt ? 'on' : ''}`} onClick={() => pickOption(l.name, opt)}>{opt}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="ac-footer">
        <button className="btn btn-primary" onClick={() => resolve('invoiceConfirm', { choices })}>Confirm resolution</button>
        <button className="btn btn-secondary" onClick={() => patch({ changing: !changing })}>{changing ? 'Done' : 'Change resolution'}</button>
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
          ) : (<span className="recv-final">{received} {line.unit}</span>)}
        </div>
        <div className={`recv-diffc ${diff < 0 ? 'is-short' : diff === 0 ? 'is-none' : ''}`}>
          {diff < 0 ? `${-diff} ${line.unit} short` : diff > 0 ? `+${diff} ${line.unit} extra` : '—'}
        </div>
      </div>
    </div>
  )
}

export function ReceivingCard({ entry, patch, resolve }) {
  const { status = 'proposed', rows = {} } = entry.data || {}
  const [confirming, setConfirming] = useState(false)
  const setRows = (rowPatch) => patch({ rows: { ...rows, ...rowPatch } })
  // Every delivered line is visible — receiving means checking all of it,
  // and a hidden row is an unreviewed row.
  const lines = [...RECEIVE_LINES, ...RECEIVE_MORE]
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

  return (
    <Card>
      <CardHead title="Receive Bidfood delivery"
        sub="Order #2231 — expected Sat 07:30" status={status === 'proposed' ? null : 'applied'} />
      <div className="ac-body recv-body">
        <div className="recv-grid recv-headrow">
          <div>Item</div><div className="recv-exp">Ordered</div><div className="recv-got">Received</div><div className="recv-diffc">Difference</div>
        </div>
        {lines.map((l, i) => (<ReceiveRow key={i} line={l} i={i} rec={rows[i]} status={status} patch={setRows} />))}
        {status === 'proposed' && (
          <div className="card-summary">
            <span className="cs-ico"><Eye size={16} /></span>
            <div className="cs-copy">
              <div className="cs-title">{summary.diffs > 0 ? `${summary.diffs} difference${summary.diffs === 1 ? '' : 's'} found` : 'All items match the order'}</div>
              <div className="cs-body">
                Confirming will update stock using the received quantities.
                {summary.diffs > 0 && <> Edify will check {summary.diffs === 1 ? 'this difference' : 'these differences'} against the invoice when it arrives.</>}
              </div>
            </div>
          </div>
        )}
      </div>
      {status === 'proposed' && (
        <div className="ac-footer">
          <button className="btn btn-primary" disabled={confirming}
            onClick={() => { setConfirming(true); setTimeout(() => resolve('receipt', { shortUnits: summary.short, extraUnits: summary.extra, value: summary.value, diffs: summary.diffs, shortLines: summary.shortLines }), 600) }}>Confirm received</button>
        </div>
      )}
      {status === 'applied' && (summary.diffs > 0 ? (
        <ConfirmStrip label="Delivery confirmed"
          sub={<>8 items received, {summary.diffs} difference{summary.diffs === 1 ? '' : 's'} recorded. Stock has been updated.</>}
          note={`Edify will check the difference${summary.diffs === 1 ? '' : 's'} against Bidfood's invoice when it arrives.`} />
      ) : (
        <ConfirmStrip label="Delivery confirmed"
          sub="8 items received. Stock has been updated."
          note="Edify will match the invoice when it arrives." />
      ))}
    </Card>
  )
}

// ---------- Invoice close (final decision of the Saturday case) ------------
// ---------- Invoice #4902: line-level resolutions ---------------------------
// The user never edits invoice facts, delivery facts or received quantities.
// They only confirm — or change — how Edify handles each difference.
const QTY_OPTIONS = [
  ['credit', 'Request credit note'],
  ['accept', 'Accept difference'],
  ['hold', 'Hold for supplier review']
]
const PRICE_OPTIONS = [
  ['confirmPrice', 'Ask supplier to confirm price'],
  ['acceptOnce', 'Accept price once'],
  ['updateExpected', 'Update expected price'],
  ['creditDiff', 'Request credit for price difference'],
  ['holdLine', 'Hold line']
]
const resLabel = (line) => {
  const opts = line.kind === 'qty' ? QTY_OPTIONS : PRICE_OPTIONS
  const label = (opts.find(o => o[0] === line.resolution) || opts[0])[1]
  return line.resolution === 'credit' || line.resolution === 'creditDiff'
    ? `${label} — £${line.amount.toFixed(2)}` : label
}

export function InvoiceCloseCard({ entry, resolve, patch }) {
  const d = entry.data || {}
  const { status = 'proposed', accepting = false } = d
  const lines = d.lines || []
  const n = lines.length
  const totalDiff = lines.reduce((a, l) => a + l.amount, 0)
  const received = 1269 - lines.filter(l => l.kind === 'qty').reduce((a, l) => a + l.amount, 0)
  const setRes = (i, resolution) => patch({ lines: lines.map((l, j) => (j === i ? { ...l, resolution } : l)) })
  const matched = d.matched || []
  return (
    <Card>
      <CardHead title={`Bidfood invoice #4902 has ${n} difference${n === 1 ? '' : 's'}`}
        sub="Checked against order #2231, delivery note #912 and expected prices" />
      <div className="ac-body">
        <div className="compare-cols">
          <div className="compare-col">
            <div className="cc-head">Invoiced total</div>
            <div className="cc-total">£1,269.00</div>
          </div>
          <div className="compare-col">
            <div className="cc-head">Received value</div>
            <div className="cc-total">£{received.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="compare-col flagged">
            <div className="cc-head">Difference</div>
            <div className="cc-total">£{totalDiff.toFixed(2)}</div>
          </div>
        </div>
        <div className="ir-grid ir-headrow">
          <div>Item</div><div>Issue</div><div>Resolution</div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="ir-row">
            <div className="ir-item">{l.name}</div>
            <div className="ir-issue">{l.issue}</div>
            <div className="ir-res">
              {status === 'proposed' ? (
                <span className="ir-res-edit">
                  <select className="ir-select" value={l.resolution} onChange={e => setRes(i, e.target.value)}>
                    {(l.kind === 'qty' ? QTY_OPTIONS : PRICE_OPTIONS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                  {(l.resolution === 'credit' || l.resolution === 'creditDiff') && <span className="ir-amt">£{l.amount.toFixed(2)}</span>}
                </span>
              ) : resLabel(l)}
            </div>
          </div>
        ))}
        {matched.length > 0 && (
          <button className="ir-more" onClick={() => patch({ showMatched: !d.showMatched })}>
            {d.showMatched ? 'Hide matched lines' : `Show ${matched.length} matched lines`}
          </button>
        )}
        {d.showMatched && matched.map((m, i) => (
          <div key={`m${i}`} className="ir-row muted">
            <div className="ir-item">{m}</div>
            <div className="ir-issue">—</div>
            <div className="ir-res">Matched</div>
          </div>
        ))}

      </div>
      {status === 'proposed' && !accepting && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('invoiceResolutions', { lines, totalDiff })}>Confirm {n} resolution{n === 1 ? '' : 's'}</button>
          <div className="spacer" />
          <button className="done-action" onClick={() => patch({ accepting: true })}>Accept invoice as is</button>
        </div>
      )}
      {status === 'proposed' && accepting && (
        <div className="ir-confirm">
          <div className="cs-title">Accept invoice as billed?</div>
          <div className="cs-body">This will accept Bidfood invoice #4902 without requesting corrections. No credit note will be requested. Expected supplier prices will not be updated.</div>
          <div className="ir-confirm-actions">
            <button className="btn btn-primary" onClick={() => resolve('invoiceAcceptAll', { totalDiff })}>Accept invoice</button>
            <button className="btn btn-secondary" onClick={() => patch({ accepting: false })}>Cancel</button>
          </div>
        </div>
      )}
      {status === 'applied' && (d.resolution === 'acceptedAll' ? (
        <ConfirmStrip label="Invoice accepted as billed"
          sub="No supplier correction was requested. Stock remains based on received quantities."
          note="Invoice #4902 was closed." />
      ) : (
        <ConfirmStrip label="Resolutions confirmed"
          sub={lines.map(l => l.kind === 'qty'
            ? `Credit note requested for ${l.name}.`
            : `${l.name} price difference sent to Bidfood for confirmation.`).join(' ')}
          note="Invoice #4902 is waiting for supplier response. Stock remains based on received quantities. No supplier prices were updated." />
      ))}
    </Card>
  )
}

// ---------- Count fix --------------------------------------------------
export function CountFixCard({ entry, resolve, patch }) {
  // Facts are read-only; the proposed corrected count is editable inline.
  const { status = 'proposed', choice, corrected = 8, accepting = false } = entry.data || {}
  const setQty = (q) => patch({ corrected: Math.max(0, Math.min(999, q)) })
  return (
    <Card>
      <CardHead title="Whole milk count looks too high"
        sub="Fitzroy Espresso · posted by Aisha at 07:20" />
      <div className="ac-body">
        <table className="diff-table fixed">
          <colgroup><col style={{ width: '36%' }} /><col style={{ width: '20%' }} /><col style={{ width: '44%' }} /></colgroup>
          <thead><tr><th>Figure</th><th className="num">Value</th><th>Basis</th></tr></thead>
          <tbody>
            <tr><td>Opening stock</td><td className="num">39 L</td><td className="muted">Thursday delivery + carry-over</td></tr>
            <tr><td>POS recipe usage</td><td className="num">−31 L</td><td className="muted">418 milk-based drinks sold</td></tr>
            <tr><td>Expected closing stock</td><td className="num"><b>8 L</b></td><td className="muted">Based on sales and recipes</td></tr>
            <tr><td><b>Posted closing count</b></td><td className="num"><b>22 L</b></td><td><span className="flag">+14 L vs expected</span></td></tr>
          </tbody>
        </table>
        <div className="card-summary">
          <span className="cs-ico"><Eye size={16} /></span>
          <div className="cs-copy">
            <div className="cs-title">Likely counting issue</div>
            <div className="cs-body">The pattern looks like a counting-unit error. Edify will not change a posted count without confirmation.</div>
          </div>
        </div>
        <div className="prop-line">
          <span className="prop-label">Proposed correction — use closing count:</span>
          <span className="stepper sm">
            <button onClick={() => setQty(corrected - 1)} aria-label="Less" disabled={status !== 'proposed'}><Minus size={16} /></button>
            <span className="step-value">
              <input className="step-input" value={corrected} inputMode="numeric" disabled={status !== 'proposed'}
                onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setQty(isNaN(v) ? 0 : v) }} />
              <span className="unit">L</span>
            </span>
            <button onClick={() => setQty(corrected + 1)} aria-label="More" disabled={status !== 'proposed'}><Plus size={16} /></button>
          </span>
        </div>
      </div>
      {status === 'proposed' && !accepting && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('countCorrect', { corrected })}>Confirm correction</button>
          <button className="btn btn-secondary" onClick={() => resolve('recount')}>Request recount</button>
          <div className="spacer" />
          <button className="done-action" onClick={() => patch({ accepting: true })}>Accept posted count</button>
        </div>
      )}
      {status === 'proposed' && accepting && (
        <div className="ir-confirm">
          <div className="cs-title">Accept the posted count of 22 L?</div>
          <div className="cs-body">This confirms yesterday's count as correct. The +14 L difference goes into GP% and variance as real.</div>
          <div className="ir-confirm-actions">
            <button className="btn btn-primary" onClick={() => resolve('acceptCount')}>Accept posted count</button>
            <button className="btn btn-secondary" onClick={() => patch({ accepting: false })}>Cancel</button>
          </div>
        </div>
      )}
      {status === 'applied' && (
        <ConfirmStrip
          label={choice === 'recount' ? 'Recount requested' : choice === 'acceptCount' ? 'Posted count accepted' : 'Count corrected'}
          sub={choice === 'recount'
            ? "Added to tonight's closing checklist. The posted 22 L stays provisional until checked."
            : choice === 'acceptCount'
            ? 'The 22 L stands. The +14 L difference now counts in GP and variance.'
            : `Closing count set to ${corrected} L. GP and variance now use the corrected value.`} />
      )}
    </Card>
  )
}

/**
 * Born from the GP% answer — the bridge from a question to a case.
 * A follow-up chip proposes this change; nothing reaches the Hub kitchen
 * until Priya confirms.
 */
export function MuffinCard({ entry, resolve }) {
  const { status = 'proposed' } = entry.data || {}
  return (
    <Card>
      <CardHead title="Monday's production — blueberry muffins"
        sub="Hub kitchen" status={status} />
      <div className="ac-body">
        <table className="diff-table fixed">
          <colgroup><col style={{ width: '40%' }} /><col style={{ width: '22%' }} /><col style={{ width: '38%' }} /></colgroup>
          <thead><tr><th>Plan</th><th className="num">Muffins</th><th>Basis</th></tr></thead>
          <tbody>
            <tr><td>Current plan</td><td className="num">12</td><td className="muted">Same as every Monday</td></tr>
            <tr><td>Sold on a typical Monday</td><td className="num"><b>6–7</b></td><td className="muted">POS, last 4 Mondays</td></tr>
            <tr className="mismatch"><td><b>Proposed plan</b></td><td className="num"><b>8</b></td><td><span className="delta">Saves ~£3/week</span></td></tr>
          </tbody>
        </table>
        <div className="ac-note">If Monday sells out before 15:00, I'll flag it and suggest putting two back — this isn't one-way.</div>
      </div>
      {status === 'proposed' && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('muffinConfirm')}>Send to Hub kitchen</button>
          <button className="btn btn-secondary" onClick={() => resolve('muffinKeep')}>Keep 12</button>
        </div>
      )}
      {status === 'applied' && (
        <ConfirmStrip label="Plan sent to Hub kitchen" sub="Monday's bake now 8 — Edify watches sell-through" />
      )}
      {status === 'declined' && (
        <KeptStrip label="Kept at 12 — no change sent" />
      )}
    </Card>
  )
}

// ---------- Supplier: shared bits -----------------------------------------
function SupplierDetailRows({ rows }) {
  return (
    <div className="supplier-details">
      {rows.map(({ label, value }) => (
        <div key={label} className="supplier-row"><span className="label">{label}</span><span className="value">{value}</span></div>
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

// Add existing supplier (copied from another site)
export function SupplierAddCard({ entry, resolve }) {
  const { status = 'proposed', supplier } = entry.data || {}
  const rows = [
    { label: 'Currently on', value: supplier.usedBy.join(', ') },
    { label: 'Order email', value: supplier.orderEmail },
    { label: 'Cut-off', value: supplier.cutoff },
    { label: 'Delivery days', value: formatDays(supplier.deliveryDays) },
    { label: 'Minimum order', value: supplier.minimumOrder }
  ]
  return (
    <Card>
      <CardHead title={`Add ${supplier.name} to ${CURRENT_SITE}`}
        sub="Already set up on another site — nothing missing" status={status === 'proposed' ? 'draft' : status} />
      {status === 'proposed' && <div className="supplier-draft"><SupplierDetailRows rows={rows} /></div>}
      {status === 'applied' && <ConfirmStrip label={`${supplier.name} added`} sub={`Now orderable at ${CURRENT_SITE}`} />}
      {status === 'cancelled' && <KeptStrip label="Discarded — no changes made" />}
      {status === 'proposed' && (
        <div className="ac-footer">
          <button className="btn btn-primary" onClick={() => resolve('supplierAddConfirm')}>Add to {CURRENT_SITE}</button>
          <button className="btn btn-secondary" onClick={() => resolve('supplierCancel')}>Cancel</button>
        </div>
      )}
    </Card>
  )
}

// Add new supplier — the operator gives the details, Edify structures them.
const CAPTURED_FIELDS = [['orderEmail', 'Order email'], ['cutoff', 'Cut-off'], ['minimumOrder', 'Minimum order']]

export function SupplierDraftCard({ entry, patch, resolve }) {
  const { status = 'proposed', draft } = entry.data || {}
  const d = { ...draft, site: draft.site || CURRENT_SITE, deliveryDays: draft.deliveryDays || [] }
  const hasDays = d.deliveryDays.length > 0
  const hasEmail = !!d.orderEmail
  const canCreate = hasEmail && hasDays
  const [showMore, setShowMore] = useState(false)

  const toggleDay = (day) => {
    const next = d.deliveryDays.includes(day) ? d.deliveryDays.filter(x => x !== day) : WEEK_DAYS.filter(x => d.deliveryDays.includes(x) || x === day)
    patch({ draft: { ...d, deliveryDays: next } })
  }
  const setEmail = (v) => patch({ draft: { ...d, orderEmail: v } })

  const capturedRows = [{ label: 'Supplier', value: d.name }, { label: 'Site', value: d.site }]
  CAPTURED_FIELDS.forEach(([k, label]) => { if (d[k]) capturedRows.push({ label, value: d[k] }) })

  const sub = canCreate
    ? `Everything's set for ${d.name}. Create the supplier when you're ready.`
    : `${d.name} isn't on file yet. Add their ordering details and I'll create it.`

  return (
    <Card>
      <CardHead title="New supplier" sub={sub} status={status === 'proposed' ? 'draft' : status} />
      {status === 'proposed' && (
        <div className="supplier-draft">
          <div className="supplier-section-title">What you told me</div>
          <SupplierDetailRows rows={capturedRows} />
          <div className="supplier-section-title">Still needed</div>
          {!hasEmail && (
            <label className="supplier-row needs-input">
              <span className="label">Order email</span>
              <input className="supplier-inline-input" value={d.orderEmail || ''} placeholder="orders@…"
                aria-label="Order email" onChange={e => setEmail(e.target.value)} />
            </label>
          )}
          <div className="supplier-mini-label">Delivery days</div>
          <DayChips value={d.deliveryDays} onToggle={toggleDay} />
          <div className="supplier-later-note">Accounts email, phone and other details can be added later.</div>
        </div>
      )}
      {status === 'applied' && <ConfirmStrip label={`${d.name} created`} sub={`Now orderable at ${CURRENT_SITE}`} />}
      {status === 'cancelled' && <KeptStrip label="Discarded — no changes made" />}
      {status === 'proposed' && (
        <div className="ac-footer supplier-create-footer">
          <button className="btn btn-primary" disabled={!canCreate} onClick={() => resolve('supplierCreateConfirm')}>Create supplier</button>
          {!canCreate && <div className="supplier-create-helper">{!hasEmail ? 'Add an order email and pick delivery days to create.' : 'Pick at least one delivery day to create.'}</div>}
          <button className="btn btn-secondary" onClick={() => resolve('supplierCancel')}>Cancel</button>
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
