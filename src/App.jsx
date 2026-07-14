import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SCENARIOS, JOURNAL_SEED, BRIEF, cutoffLabel, DAY, RECEIVE_LINES, RECEIVE_MORE } from './data.js'
import { Sidebar, Toasts, Interrupt, SpacePage, SuppliersPage } from './components/Shell.jsx'
import RecipesPage from './components/Recipes.jsx'
import Home from './components/Today.jsx'
import Chat, { matchScenario } from './components/Chat.jsx'
import Journal from './components/Journal.jsx'

let seq = 0
const uid = (p) => `${p}${++seq}_${Date.now() % 100000}`
const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const isOrder = (t) => t.scenarioId === 'oatmilk' || t.scenarioId === 'cutoff'

export default function App() {
  const [view, setView] = useState('today')
  const [space, setSpace] = useState(null)
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [journal, setJournal] = useState(JOURNAL_SEED)
  const [toasts, setToasts] = useState([])
  const [resolved, setResolved] = useState(new Set())
  const [watching, setWatching] = useState([])
  const [deferred, setDeferred] = useState({})
  const [dismissed, setDismissed] = useState(new Set())
  const [interrupt, setInterrupt] = useState(null)
  const [gpSeen, setGpSeen] = useState(false)
  const interruptShown = useRef(false)
  const resolvedRef = useRef(resolved)
  resolvedRef.current = resolved

  const toast = (title, sub, action) => {
    const id = uid('t')
    setToasts(ts => [...ts, { id, title, sub, action }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }
  const dismissToast = (id) => setToasts(ts => ts.filter(t => t.id !== id))
  const addJournal = (entry) => setJournal(j => [{ id: uid('j'), time: now(), ...entry }, ...j])
  const markResolved = (scId) => setResolved(r => new Set([...r, scId === 'oatmilk' ? 'cutoff' : scId, scId]))
  const patchThread = (id, patch) => setThreads(ts => ts.map(t => (t.id === id ? { ...t, ...patch } : t)))

  // ---- Threads / cases ---------------------------------------------------
  const openScenario = (scId, userText) => {
    const existing = threads.find(t => t.scenarioId === scId || (isOrder({ scenarioId: scId }) && isOrder(t)))
    if (existing && scId !== 'supplier') { setActiveId(existing.id); setView('chat'); return }
    const sc = SCENARIOS[scId]
    const t = { id: uid('th'), scenarioId: scId, title: sc.title, time: now(), entries: [], queue: [], started: false, userText, caseState: null }
    setThreads(ts => [t, ...ts])
    setActiveId(t.id)
    setView('chat')
  }
  const openThread = (id) => { setActiveId(id); setView('chat') }
  // A new topic typed inside a case starts its own case. The move itself is
  // the message — a clean thread with her question on top and its own title.
  // The old case keeps no scar; it lives on Home and in History as before.
  const handleCaseSwitch = (scId, text) => {
    openScenario(scId, text)
    toast(SCENARIOS[scId].title, 'Opened as its own case — the one you left is unchanged')
  }
  const handleSend = (text) => openScenario(matchScenario(text), text)
  const handleHomeOpen = (item) => {
    if (item.scenario === 'gp') setGpSeen(true)  // seen once → quiet until the next recompute
    if (item.threadId) return openThread(item.threadId)
    if (item.send) return handleSend(item.send)
    return openScenario(item.scenario)
  }

  const persistThread = (id) => (patch) => setThreads(ts => ts.map(t => (t.id === id ? { ...t, ...patch } : t)))

  // ---- Chat events → case state / history / toasts -------------------------
  const handleChatEvent = (action, { scenarioId, entry, payload }) => {
    const threadId = activeId
    const J = (kind, by, title, detail, source) => addJournal({ kind, by, title, detail, source, threadId })
    switch (action) {
      case 'confirm': {
        const add = entry.data?.add ?? 20
        setInterrupt(null)
        markResolved(scenarioId)
        patchThread(threadId, { caseState: 'awaiting_delivery', orderAdd: add })
        J('action', 'you', `Saturday's Bidfood order updated — oat milk 60 → ${60 + add} L`, `+£${(add * 1.42).toFixed(2)} — proposed by Edify, confirmed by you, sent to Bidfood`, 'Case — Saturday order')
        toast('Order updated', 'Bidfood accepted the change.')
        break
      }
      case 'viewOrder':
        setSpace('orders'); setView('space')
        break
      case 'decline':
        setInterrupt(null)
        markResolved(scenarioId)
        // Declining the change is not cancelling the order — the 60 L
        // standing order still arrives Saturday, so the case keeps moving
        // through delivery and invoice on the original numbers.
        patchThread(threadId, { caseState: 'awaiting_delivery', orderAdd: 0 })
        // The promise to keep watching is visible, not just spoken.
        setWatching(w => [...w, { id: 'wforecast', title: 'Saturday order — watching until it locks', sub: 'You kept 60 L — anything that changes this call comes straight back', chip: 'until 16:00', threadId }])
        // Recorded in the thread and History, but not paraded in Done today —
        // deciding not to change something is not a completed operation.
        addJournal({ kind: 'action', by: 'you', quiet: true, title: "Saturday's basket kept at 60 L", detail: "Reviewed Edify's +20 L oat-milk suggestion and kept it as is — no change sent to Bidfood", source: 'Case — Saturday order', threadId })
        toast('Kept as is', 'Saturday basket stays at 60 L — nothing sent')
        break
      case 'receipt': {
        setInterrupt(null)
        const short = payload?.shortUnits || 0
        const diffs = payload?.diffs || 0
        const creditPath = short > 0 ? 'hold' : 'clean'
        patchThread(threadId, { caseState: 'awaiting_invoice', creditPath, shortValue: payload?.value || 0, shortUnits: short, diffLines: payload?.shortLines || [] })
        J('action', 'you', diffs > 0 ? `Bidfood delivery received — ${diffs} difference${diffs === 1 ? '' : 's'} recorded` : 'Bidfood delivery received — 8 items checked in', diffs > 0 ? `Delivery note #912 posted — stock updated with received quantities, differences go against the invoice` : 'Delivery note #912 posted — all quantities matched order #2231', 'Case — Saturday order')
        toast('Delivery confirmed', diffs > 0 ? 'Stock updated — Edify will check the difference against the invoice' : '8 items checked in — stock updated')
        break
      }
      case 'invoiceResolutions': {
        setInterrupt(null)
        const lines = payload?.lines || []
        const detail = lines.map(l => l.kind === 'qty' ? `Credit requested for ${l.name}`
          : l.resolution === 'sendApproval' ? `${l.name} price change sent for approval`
          : `${l.name} price confirmation emailed to Bidfood`).join(' · ')
        // Which waiting room the invoice enters depends on where the price
        // line went: supplier email, head office, or nowhere (qty only).
        const pricePath = lines.find(l => l.kind === 'price')?.resolution || null
        const toSupplier = lines.some(l => l.resolution === 'credit' || l.resolution === 'confirmPrice')
        const internal = pricePath === 'sendApproval'
        patchThread(threadId, { caseState: 'awaiting_credit', pricePath })
        setWatching(w => [...w, { id: 'wcredit', title: 'Bidfood invoice #4902', sub: `Fitzroy Espresso · ${lines.length} resolution${lines.length === 1 ? '' : 's'} sent`, helper: toSupplier && internal ? 'Waiting for Bidfood and head office' : internal ? 'Waiting for internal approval' : "Waiting for Bidfood's reply", status: 'Waiting', chip: 'by Wed', threadId }])
        J('action', 'you', 'Invoice #4902 resolutions confirmed', detail, 'Invoices')
        if (lines.some(l => l.resolution === 'confirmPrice')) {
          J('action', 'you', 'Supplier price confirmation requested by Priya', 'Sent to accounts@bidfood.co.uk by Edify — the reply stays linked to invoice #4902', 'Invoices')
        }
        if (internal) {
          J('action', 'you', 'Price change requested by Priya', 'Butter 250g £4.85 → £5.15 — waiting for head-office approval', 'Invoices')
        }
        toast('Resolutions confirmed', internal && !toSupplier ? 'Sent to head office for review.' : 'Bidfood has been asked to respond.')
        break
      }
      case 'priceApprovalRequest': {
        setInterrupt(null)
        patchThread(threadId, { caseState: 'awaiting_approval' })
        setWatching(w => w.map(x => (x.id === 'wcredit' ? { ...x, helper: 'Waiting for head-office approval', chip: 'by Thu' } : x)))
        J('action', 'you', 'Price change requested by Priya', 'Butter 250g £4.85 → £5.15 — waiting for head-office approval', 'Invoices')
        toast('Price change sent for approval', 'Head office will review the impact on recipes and GP.')
        break
      }
      case 'invoiceAcceptAll': {
        setInterrupt(null)
        patchThread(threadId, { caseState: 'closed' })
        J('action', 'you', 'Invoice #4902 accepted as billed', 'No corrections requested', 'Invoices')
        toast('Invoice accepted', 'Invoice #4902 posted as billed.')
        break
      }
      case 'closeCase':
        setInterrupt(null)
        patchThread(threadId, { caseState: 'closed' })
        J('action', 'you', 'Saturday order case closed — invoice #4902 posted net £1,266.16', 'Order → +20 L change → delivery (2 L short) → credit → invoice: one thread', 'Case — Saturday order')
        toast('Case closed', 'Order, delivery and invoice settled in one decision', { label: 'Journal', fn: () => setView('journal') })
        break
      case 'invoiceConfirm': {
        markResolved(scenarioId)
        const c = payload?.choices || {}
        const cream = c['Double cream 2 L'] || 'Request credit note'
        const butter = c['Butter 250 g'] || 'Ask supplier to confirm'
        const bothAccepted = /Accept/.test(cream) && /Accept/.test(butter)
        if (bothAccepted) {
          J('action', 'you', 'Invoice #4821 approved and passed for payment', 'Both differences accepted as charged — butter now £5.15', 'Case — Invoice #4821')
          toast('Invoice approved', 'Passed for payment as charged')
        } else {
          setWatching(w => [...w, { id: 'w4821', title: 'Invoice #4821 — Bidfood', sub: 'Waiting for supplier — sent back to Bidfood', chip: 'by Fri', threadId }])
          J('action', 'you', 'Invoice #4821 resolution confirmed — waiting for supplier', 'Credit note requested for 2 Double cream, butter price sent to Bidfood to confirm — no prices changed', 'Case — Invoice #4821')
          toast('Sent to Bidfood', 'Invoice #4821 is now waiting for supplier')
        }
        break
      }
      case 'muffinConfirm':
        markResolved('muffins')
        setWatching(w => [...w, { id: 'wmuffin', title: "Monday's muffin bake — Hub kitchen", sub: 'Plan updated to 8 — watching Monday sell-through', chip: 'Mon', threadId }])
        J('action', 'you', "Monday's muffin bake trimmed 12 → 8", 'Proposed by Edify from the GP% breakdown, confirmed by you — Hub kitchen notified, ~£3/week less waste', 'Case — Production plan')
        toast('Plan sent to Hub kitchen', "Monday's bake is now 8 — Edify watches the sell-through")
        break
      case 'muffinKeep':
        markResolved('muffins')
        J('action', 'you', "Monday's muffin bake kept at 12", "Reviewed Edify's proposal from the GP% breakdown and kept the plan — nothing sent", 'Case — Production plan')
        toast('Kept at 12', 'No change sent to the Hub kitchen')
        break
      case 'countCorrect': {
        const v = payload?.corrected ?? 8
        setInterrupt(null)
        markResolved('count')
        J('action', 'you', `Whole milk count corrected 22 → ${v} L`, `Counting-unit error confirmed — GP and variance now use the corrected value`, 'Stock counts')
        toast('Count corrected', `Closing count set to ${v} L.`)
        break
      }
      case 'recount':
        markResolved(scenarioId)
        setWatching(w => [...w, { id: 'wcount', title: 'Whole milk recount — tonight', sub: 'Yesterday’s figure held as provisional', chip: 'tonight', threadId }])
        J('action', 'you', 'Chilled recount added to tonight’s close', 'Whole milk held as provisional until recounted', 'Case — Stock count')
        toast('Recount scheduled', 'First item on tonight’s closing checklist')
        break
      case 'acceptCount':
        markResolved(scenarioId)
        J('action', 'you', 'Whole milk count accepted as entered', '+14 L will show as an unexplained gain in this week’s difference', 'Case — Stock count')
        break
      case 'supplierAddConfirm': {
        const s = entry.data.supplier
        setWatching(w => [...w, { id: 'wsup-' + s.name, title: `${s.name} — new supplier`, sub: 'Set up and orderable — watching for the first order window', chip: 'ready', threadId }])
        J('action', 'you', 'Supplier added to site', `${s.name} added to Fitzroy Espresso using ${s.usedBy[0]} setup — added by Priya`, 'Suppliers — Setup')
        toast(`${s.name} added`, `Orders → ${s.orderEmail}, cut-off ${s.cutoff}`)
        break
      }
      case 'supplierCreateConfirm': {
        const s = entry.data.draft
        setWatching(w => [...w, { id: 'wsup-' + s.name, title: `${s.name} — new supplier`, sub: 'Set up and orderable — watching for the first order window', chip: 'ready', threadId }])
        J('action', 'you', 'Supplier created', `${s.name} created for Fitzroy Espresso — created by Priya`, 'Suppliers — Setup')
        toast(`${s.name} created`, `Orders → ${s.orderEmail}, cut-off ${s.cutoff || '—'}`)
        break
      }
      case 'supplierUpdateConfirm': {
        const s = entry.data.supplier
        const n = (payload?.changed || []).length
        J('action', 'you', `${s.name} updated`, `${n} field${n === 1 ? '' : 's'} changed for Fitzroy Espresso — rest kept as-is, updated by Priya`, 'Suppliers — Update')
        toast(`${s.name} updated`, `${n} change${n === 1 ? '' : 's'} saved`)
        break
      }
      default: break
    }
  }

  // ---- World events (demo time control) ------------------------------------
  const orderThread = threads.find(isOrder)
  const demoStage = !orderThread || !orderThread.caseState ? 0
    : orderThread.caseState === 'awaiting_delivery' ? 1
    : orderThread.caseState === 'receiving' ? 1.5
    : orderThread.caseState === 'awaiting_invoice' ? 2
    : orderThread.caseState === 'invoice_decision' ? 2.5
    : orderThread.caseState === 'awaiting_credit' ? 2.8
    : orderThread.caseState === 'awaiting_approval' ? 2.9
    : 3

  const fireDelivery = () => {
    const t = orderThread
    if (!t) return
    patchThread(t.id, { caseState: 'receiving', pendingSteps: SCENARIOS.delivery.steps.map(s => (s.type === 'card' ? { ...s, scenarioId: 'delivery', data: { orderAdd: t.orderAdd ?? 20 } } : { ...s, scenarioId: 'delivery' })) })
    announce({ icon: 'truck', threadId: t.id, title: 'Bidfood delivery due now', cta: 'Receive' })
  }

  // The invoice always needs a decision: even when the delivery matched the
  // order perfectly, Bidfood billed butter above the expected price — so the
  // price case survives a clean receiving.
  const fireInvoice = () => {
    const t = orderThread
    if (!t) return
    const qtyLines = (t.diffLines || []).map(l => ({
      kind: 'qty', name: l.name, amount: l.value, resolution: 'credit',
      issue: `${l.invoiced} ${l.unit} billed · ${l.received} ${l.unit} received`,
      delta: `${l.short} ${l.unit} short × £${(l.value / l.short).toFixed(2)}`
    }))
    const lines = [...qtyLines, {
      kind: 'price', name: 'Butter 250g', amount: 7.20, resolution: 'confirmPrice',
      issue: '24 packs billed at £5.15 · expected £4.85',
      delta: '+£0.30 per pack'
    }]
    const mismatched = new Set(lines.map(l => l.name.split(' 250g')[0]))
    const matched = [...RECEIVE_LINES, ...RECEIVE_MORE]
      .filter(x => ![...mismatched].some(m => x.name.includes(m) || m.includes(x.name.split(',')[0])))
      .map(x => ({ name: x.name, qty: x.expected, unit: x.unit, price: x.price }))
    const n = lines.length
    // Name the kind of trouble when it is only one kind — "1 price
    // difference" reads sharper than a generic count.
    const priceN = lines.filter(l => l.kind === 'price').length
    const qtyN = n - priceN
    const diffLabel = qtyN === 0 ? `${priceN} price difference${priceN === 1 ? '' : 's'}`
      : priceN === 0 ? `${qtyN} quantity difference${qtyN === 1 ? '' : 's'}`
      : `${n} differences`
    // The invoiced total follows the order that actually stands — £1,240.60
    // if the change was declined, £1,269.00 with the extra 20 L.
    const invoiced = 1240.6 + (t.orderAdd ?? 20) * 1.42
    patchThread(t.id, {
      caseState: 'invoice_decision',
      pendingSteps: [
        { type: 'assistant', scenarioId: 'delivery', text: `**Monday, 06:40.** Bidfood invoice **#4902** is in. Against order #2231, delivery note #912 and expected prices, I found **${diffLabel}** and proposed a resolution for each. Nothing is sent until you confirm.` },
        { type: 'card', card: 'invoiceClose', scenarioId: 'delivery', data: { lines, matched, diffLabel, invoiced } }
      ]
    })
    announce({ icon: 'invoice', threadId: t.id, title: `Invoice #4902 has ${diffLabel}`, cta: 'Review' })
  }

  // The count closing is the one trust-promise the GP answer makes. This demo
  // The price-difference tail: Bidfood's reply lands in the case, Priya can
  // only route the new price to head office, and the decision comes back as
  // a compact follow-up — prices never change silently.
  const fireReply = () => {
    const t = orderThread
    if (!t) return
    patchThread(t.id, {
      pendingSteps: [
        { type: 'assistant', scenarioId: 'delivery', text: '**Tuesday, 09:12.** Bidfood replied about invoice **#4902**:' },
        { type: 'card', card: 'priceReply', scenarioId: 'delivery', data: {} }
      ]
    })
    announce({ icon: 'invoice', threadId: t.id, title: 'Bidfood replied about invoice #4902', cta: 'Review' })
  }
  const fireApproval = () => {
    const t = orderThread
    if (!t) return
    patchThread(t.id, {
      caseState: 'closed',
      pendingSteps: [{ type: 'assistant', scenarioId: 'delivery', text: '**Wednesday, 10:20.** Head office approved the change. **Expected price updated** — Butter 250g for Bidfood changed from **£4.85 to £5.15**. 4 recipes were recosted. Projected GP decreased by **0.4 pts**. Menu prices were not changed.' }]
    })
    setWatching(w => w.filter(x => x.id !== 'wcredit'))
    addJournal({ kind: 'auto', by: 'edify', title: 'Expected price approved by Head Office', detail: 'Butter 250g · £4.85 → £5.15 — 4 recipes recosted, projected GP −0.4 pts, menu prices unchanged', source: 'Invoices', threadId: t.id })
    toast('Expected price updated', 'Butter 250g £4.85 → £5.15. 4 recipes recosted.')
  }

  // control pays it: the thread gets the update through the same pendingSteps
  // channel deliveries use, and the card recomputes itself.
  const gpThread = threads.find(t => t.scenarioId === 'gp')
  const [countFired, setCountFired] = useState(false)
  const fireCount = () => {
    if (!gpThread) return
    setCountFired(true)
    patchThread(gpThread.id, {
      pendingSteps: [
        { type: 'assistant', scenarioId: 'gp', text: "**Thursday, 18:05.** Marco closed the Hub kitchen count. The unexplained **−0.7 pts** just resolved — here's the same answer, now with nothing I can't stand behind:" },
        { type: 'card', card: 'gpBreakdown', scenarioId: 'gp', data: { countClosed: true } }
      ]
    })
    addJournal({ kind: 'auto', by: 'edify', title: 'Hub kitchen count closed — GP% answer updated', detail: 'Unexplained −0.7 pts resolved: real waste −0.5, counting slip −0.2 corrected', source: 'Edify — Costing', threadId: gpThread.id })
    toast('Count closed at Hub kitchen', 'The GP% answer updated itself — nothing unverified left', { label: 'See it', fn: () => openThread(gpThread.id) })
  }

  // ---- Proactive interrupt (cut-off) ----------------------------------------
  // Toast rule: never announce a task the user can already see. On Home the
  // oat-milk row (with its ticking badge) IS the announcement, so the toast
  // arms quietly and fires only if the deadline is still live when the user
  // is elsewhere. Opening the order case disarms it — they've seen the task.
  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])
  const activeIdRef = useRef(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  const threadsRef = useRef(threads)
  threadsRef.current = threads
  const cutoffToastArmed = useRef(false)
  // One rule, checked everywhere: never announce a task the user can already
  // see — neither on Home (the row is right there) nor inside its own case.
  const lookingAtOrderCase = () => {
    const active = threadsRef.current.find(t => t.id === activeIdRef.current)
    return viewRef.current === 'chat' && active && isOrder(active)
  }
  // World events (delivery arrives, invoice lands) announce through one gate.
  // Inside the case the update streams in place; on Home the row appears, so
  // the toast arms quietly and fires only if the user leaves without acting.
  const armedInterrupt = useRef(null)
  const announce = (i) => {
    if (lookingAtOrderCase()) return
    if (viewRef.current === 'today') { armedInterrupt.current = i; return }
    setInterrupt(i)
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (interruptShown.current) return
      interruptShown.current = true
      if (resolvedRef.current.has('cutoff')) return
      if (lookingAtOrderCase()) return                    // she's in the case — done, never toast
      if (viewRef.current === 'today') { cutoffToastArmed.current = true; return }
      setInterrupt({ icon: 'clock', scenario: 'cutoff', title: `Oat milk order locks ${cutoffLabel()}`, cta: 'Review' })
    }, 20000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    // Entering the order case dismisses and disarms anything about it —
    // the cutoff toast and any world-event toast tied to that thread.
    if (lookingAtOrderCase()) {
      cutoffToastArmed.current = false
      armedInterrupt.current = null
      setInterrupt(i => (i && (i.scenario === 'cutoff' || i.threadId === activeIdRef.current) ? null : i))
      return
    }
    if (view === 'today') return
    if (armedInterrupt.current) {
      setInterrupt(armedInterrupt.current)
      armedInterrupt.current = null
      return
    }
    if (!cutoffToastArmed.current) return
    if (resolvedRef.current.has('cutoff')) { cutoffToastArmed.current = false; return }
    cutoffToastArmed.current = false
    setInterrupt({ icon: 'clock', scenario: 'cutoff', title: `Oat milk order locks ${cutoffLabel()}`, cta: 'Review' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeId])

  // ---- Home data -----------------------------------------------------------
  const needsItems = [
    ...(orderThread?.caseState === 'receiving' ? [{ id: 'recv', tier: 'urgent', urgent: true, stake: '8', stakeUnit: 'items', pressure: 'due now', threadId: orderThread.id, title: 'Bidfood delivery ready to check in', why: `Order #2231 — 8 items, including ${60 + (orderThread.orderAdd ?? 20)} L oat milk.`, cta: 'Receive delivery' }] : []),
    ...(orderThread?.caseState === 'invoice_decision' ? [{ id: 'inv2', tier: 'important', urgent: true, stake: `£${((orderThread.diffLines || []).reduce((a, l) => a + l.value, 0) + 7.20).toFixed(2)}`, stakeUnit: 'over', threadId: orderThread.id, title: 'Invoice #4902 has differences to review', why: 'Edify proposed a resolution for each.', cta: 'Review' }] : []),
    ...BRIEF.needsCall.filter(i => !resolved.has(i.scenario) && !deferred[i.id] && !dismissed.has(i.id))
  ]

  const deliveries = [
    { id: 'today', name: DAY.supplier, when: DAY.nextDelivery },
    ...(orderThread && orderThread.caseState === 'awaiting_delivery' ? [{ id: 'sat', name: 'Saturday order — Bidfood', when: 'Sat 07:30' }] : [])
  ]

  const inProgress = [
    { id: 'ip-today-delivery', title: `${DAY.supplier} delivery ${DAY.orderNo}`, sub: `Fitzroy Espresso · ${DAY.items} items · ${DAY.value}`, helper: 'Next step: receive delivery', status: 'Due today', chip: DAY.nextDelivery },
    ...(orderThread && orderThread.caseState === 'awaiting_delivery' ? [{ id: 'ip-order', threadId: orderThread.id, title: 'Bidfood delivery #2231', sub: `Fitzroy Espresso · 8 items · £${(1240.6 + (orderThread.orderAdd ?? 20) * 1.42).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, helper: 'Next step: receive delivery', status: 'Confirmed', chip: 'Sat 07:30' }] : []),
    ...(orderThread && orderThread.caseState === 'awaiting_invoice' ? [{ id: 'ip-order', threadId: orderThread.id, title: 'Bidfood order #2231', sub: orderThread.creditPath === 'hold' ? `Fitzroy Espresso · delivered · ${orderThread.shortUnits || 1} L short recorded` : 'Fitzroy Espresso · delivered · all quantities matched', helper: 'Next step: invoice matching', status: 'Watching', chip: 'Mon 06:40' }] : []),
    ...watching
  ]

  const doneToday = journal.filter(e => (e.kind === 'action' || e.kind === 'auto') && !e.quiet).slice(0, 5).map(e => ({ id: 'd' + e.id, title: e.title, detail: e.detail, time: e.time, by: e.by }))

  const activeThread = threads.find(t => t.id === activeId)
  const needsCount = needsItems.length

  return (
    <div className="app">
      <Sidebar view={view} space={space} setView={setView} openSpace={(id) => { setSpace(id); setView('space') }} needsCount={needsCount} />
      <div className="main">
        <motion.div key={view + (view === 'chat' ? activeId : '') + (view === 'space' ? space : '')} className={view === 'journal' || view === 'space' ? 'scroll-area' : 'view-wrap'}
          style={view !== 'journal' && view !== 'space' ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {view === 'today' && (
            <Home needsItems={needsItems} inProgress={inProgress} doneToday={doneToday} deliveries={deliveries}
              onOpen={handleHomeOpen} onSend={handleSend} onSpace={(id) => { setSpace(id); setView('space') }} />
          )}
          {view === 'chat' && activeThread && (
            <Chat key={activeThread.id} thread={activeThread} persist={persistThread(activeThread.id)}
              onEvent={handleChatEvent} onBack={() => setView('today')}
              onSwitch={handleCaseSwitch} />
          )}
          {view === 'journal' && <Journal entries={journal} onOpenChat={openThread} />}
          {view === 'space' && (space === 'suppliers'
            ? <SuppliersPage onAdd={() => handleSend('Add supplier')} />
            : space === 'recipes'
            ? <RecipesPage onCreate={() => handleSend('New recipe')} />
            : <SpacePage spaceId={space} />)}
        </motion.div>
      </div>

      <div className="demo-ctl">
        {demoStage === 0 && <span className="demo-hint">Demo timeline — confirm Saturday's order to unlock</span>}
        {demoStage === 1 && <button className="demo-btn" onClick={fireDelivery}>⏩ Sat 07:30 — the van arrives</button>}
        {demoStage === 1.5 && <span className="demo-hint">Receive the delivery in its case to continue</span>}
        {demoStage === 2 && <button className="demo-btn" onClick={fireInvoice}>⏩ Mon 06:40 — the invoice lands</button>}
        {gpThread && !countFired && <button className="demo-btn" onClick={fireCount}>⏩ Thu 18:05 — Marco closes the count</button>}
        {demoStage === 2.5 && <span className="demo-hint">Review the invoice in its case to continue</span>}
        {demoStage === 2.8 && orderThread?.pricePath === 'confirmPrice' && <button className="demo-btn" onClick={fireReply}>⏩ Tue 09:12 — Bidfood replies</button>}
        {demoStage === 2.8 && orderThread?.pricePath === 'sendApproval' && <button className="demo-btn" onClick={fireApproval}>⏩ Wed 10:20 — head office decides</button>}
        {demoStage === 2.8 && !orderThread?.pricePath && <span className="demo-hint">Credit note sent — the case closes when Bidfood replies</span>}
        {demoStage === 2.9 && <button className="demo-btn" onClick={fireApproval}>⏩ Wed 10:20 — head office decides</button>}
        {demoStage === 3 && <span className="demo-hint">✓ Demo complete — the whole case is one thread in Journal</span>}
      </div>

      <Toasts toasts={toasts} dismiss={dismissToast} />
      <Interrupt data={interrupt}
        onAction={() => { const i = interrupt; setInterrupt(null); i.threadId ? openThread(i.threadId) : openScenario(i.scenario) }}
        onDismiss={(how) => {
          const last = interrupt
          setInterrupt(null)
          if (how === 'snooze') {
            if (last.snoozeLabel === 'Not arrived yet') {
              toast("I'll keep watching this delivery", 'It stays on your list — open it when the van shows up')
              return
            }
            toast('Snoozed', 'Comes back with a buffer before cut-off — the order stays on your list')
            setTimeout(() => {
              if (!resolvedRef.current.has('cutoff')) setInterrupt({ ...last })
            }, 25000)
          }
        }} />
    </div>
  )
}
