import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SCENARIOS, JOURNAL_SEED, BRIEF, cutoffLabel, DAY, RECEIVE_LINES, RECEIVE_MORE } from './data.js'
import { requiredMissing, CURRENT_SITE, formatDays } from './suppliers.js'
import { Sidebar, Toasts, Interrupt, SpacePage, SuppliersPage, ChatsPage } from './components/Shell.jsx'
import RecipesPage from './components/Recipes.jsx'
import { Clock } from './components/Icons.jsx'
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
  const [addedSuppliers, setAddedSuppliers] = useState([])
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
    const t = { id: uid('th'), scenarioId: scId, title: sc.title, time: now(), ts: Date.now(), entries: [], queue: [], started: false, userText, caseState: null }
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
      case 'receiveStart': {
        setInterrupt(null)
        const t = threadsRef.current.find(x => x.id === threadId)
        // The click IS the arrival record — expected vs actual stays on the
        // delivery for future punctuality reporting.
        const arrivedAt = '07:42'
        patchThread(threadId, { caseState: 'receiving', arrivedAt, pendingSteps: SCENARIOS.delivery.steps.map(st => (st.type === 'card' ? { ...st, scenarioId: 'delivery', data: { orderAdd: t?.orderAdd ?? 20, arrivedAt } } : { ...st, scenarioId: 'delivery' })) })
        break
      }
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
        const unresolved = payload?.unresolved ?? 0
        const num = scenarioId === 'invoice' ? '#4821' : '#4902'
        const noteRef = scenarioId === 'invoice' ? "Thursday's delivery note" : 'Delivery note #912'
        const detailFor = (l) => {
          switch (l.resolution) {
            case 'credit': return `£${l.amount.toFixed(2)} credit requested for ${l.name}`
            case 'accept': return `£${l.amount.toFixed(2)} ${l.name} charge accepted as a cost variance`
            case 'correctReceipt': return `${noteRef} corrected — ${l.name} ${l.received} → ${l.corrected ?? l.invoiced} ${l.unit}`
            default: return `${l.name} price confirmation emailed to Bidfood`
          }
        }
        const detail = lines.map(detailFor).join(' · ')
        // The prototype ends here: Edify would keep each unresolved line open
        // and connect Bidfood's replies to this same invoice case.
        if (scenarioId === 'invoice') markResolved('invoice')
        else patchThread(threadId, { caseState: 'awaiting_credit', unresolvedAmt: unresolved })
        if (unresolved > 0) {
          setWatching(w => [...w, { id: 'wcredit' + num, title: `Bidfood invoice ${num}`, sub: `Fitzroy Espresso · £${unresolved.toFixed(2)} unresolved`, helper: "Waiting for Bidfood's reply", status: 'Waiting', chip: 'by Wed', threadId }])
        }
        J('action', 'you', `Invoice ${num} changes confirmed`, detail, 'Invoices')
        if (lines.some(l => l.resolution === 'confirmPrice')) {
          J('action', 'you', 'Supplier price confirmation requested by Priya', `Sent to accounts@bidfood.co.uk by Edify — the reply stays linked to invoice ${num}`, 'Invoices')
        }
        toast('Changes confirmed', unresolved > 0 ? `Invoice remains open — £${unresolved.toFixed(2)} unresolved.` : 'Every line has a final state.')
        break
      }
      case 'closeCase':
        setInterrupt(null)
        patchThread(threadId, { caseState: 'closed' })
        J('action', 'you', 'Saturday order case closed — invoice #4902 posted net £1,266.16', 'Order → +20 L change → delivery (2 L short) → credit → invoice: one thread', 'Case — Saturday order')
        toast('Case closed', 'Order, delivery and invoice settled in one decision', { label: 'Journal', fn: () => setView('journal') })
        break
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
        setAddedSuppliers(a => [{ name: s.name, orderEmail: s.orderEmail, cutoff: s.cutoff, deliveryDays: s.deliveryDays, minimumOrder: s.minimumOrder }, ...a])
        J('action', 'you', `${s.name} added to Fitzroy Espresso`, `Reused the ${s.usedBy[0]} setup — orders to ${s.orderEmail}, cut-off ${s.cutoff}, added by Priya`, 'Suppliers')
        toast(`${s.name} added`, `Available for ordering at ${CURRENT_SITE}`)
        break
      }
      case 'supplierCreateConfirm': {
        const s = entry.data.draft
        setAddedSuppliers(a => [{ name: s.name, orderEmail: s.orderEmail, cutoff: s.cutoff, deliveryDays: s.deliveryDays, minimumOrder: s.minimumOrder }, ...a])
        J('action', 'you', `${s.name} added to Fitzroy Espresso`, `Created for Fitzroy Espresso — orders to ${s.orderEmail}, cut-off ${s.cutoff || '—'}, added by Priya`, 'Suppliers')
        toast(`${s.name} added`, `Available for ordering at ${CURRENT_SITE}`)
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
    : orderThread.caseState === 'delivery_due' ? 1.4
    : orderThread.caseState === 'receiving' ? 1.5
    : orderThread.caseState === 'awaiting_invoice' ? 2
    : orderThread.caseState === 'invoice_decision' ? 2.5
    : orderThread.caseState === 'awaiting_credit' ? 2.8
    : 3

  // Expected time means DUE, not arrived — the receiving form opens only
  // when Priya says the van is actually here.
  const fireDelivery = () => {
    const t = orderThread
    if (!t) return
    patchThread(t.id, {
      caseState: 'delivery_due',
      pendingSteps: [{ type: 'card', card: 'deliveryDue', scenarioId: 'delivery', data: {} }]
    })
    announce({ icon: 'truck', threadId: t.id, title: 'Bidfood delivery is due now', cta: 'Receive', snoozeLabel: 'Not arrived yet' })
  }

  // The invoice always needs a decision: even when the delivery matched the
  // order perfectly, Bidfood billed butter above the expected price — so the
  // price case survives a clean receiving.
  const fireInvoice = () => {
    const t = orderThread
    if (!t) return
    // The safest action is the default: shortages ask for a credit.
    const qtyLines = (t.diffLines || []).map(l => ({
      kind: 'qty', name: l.name, amount: l.value, resolution: 'credit',
      invoiced: l.invoiced, received: l.received, short: l.short, unit: l.unit,
      billedQty: `${l.invoiced} ${l.unit}`, receivedQty: `${l.received} ${l.unit}`
    }))
    const lines = [...qtyLines, {
      kind: 'price', name: 'Butter 250g', amount: 7.20, resolution: 'confirmPrice',
      billedPrice: '£5.15', expectedPrice: '£4.85', qtyStr: '24 packs', packs: 24
    }]
    const mismatched = new Set(lines.map(l => l.name.split(' 250g')[0]))
    const matched = [...RECEIVE_LINES, ...RECEIVE_MORE]
      .filter(x => ![...mismatched].some(m => x.name.includes(m) || m.includes(x.name.split(',')[0])))
      .map(x => ({ name: x.name, qty: x.expected, unit: x.unit, price: x.price }))
    const n = lines.length
    const diffLabel = `${n} difference${n === 1 ? '' : 's'}`
    // The invoiced total follows the order that actually stands — £1,240.60
    // if the change was declined, £1,269.00 with the extra 20 L.
    const invoiced = 1240.6 + (t.orderAdd ?? 20) * 1.42
    patchThread(t.id, {
      caseState: 'invoice_decision', invoiced,
      pendingSteps: [
        { type: 'assistant', scenarioId: 'delivery', text: `**Monday, 06:40.** Bidfood invoice **#4902** is in. I found **${diffLabel}** and proposed an action for each.` },
        { type: 'card', card: 'invoiceClose', scenarioId: 'delivery', data: { lines, matched, diffLabel, invoiced } }
      ]
    })
    announce({ icon: 'invoice', threadId: t.id, title: `Invoice #4902 has ${diffLabel}`, cta: 'Review' })
  }

  // The count closing is the one trust-promise the GP answer makes. This demo
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
    ...(['delivery_due', 'receiving'].includes(orderThread?.caseState) ? [{ id: 'recv', tier: 'urgent', urgent: true, stake: '8', stakeUnit: 'items', pressure: 'due now', threadId: orderThread.id, title: 'Bidfood delivery is due now', why: 'Order #2231 · 8 items · expected Sat 07:30', cta: 'Check in delivery' }] : []),
    ...(orderThread?.caseState === 'invoice_decision' ? [{ id: 'inv2', tier: 'important', urgent: true, stake: `£${((orderThread.diffLines || []).reduce((a, l) => a + l.value, 0) + 7.20).toFixed(2)}`, stakeUnit: 'over', threadId: orderThread.id, title: 'Invoice #4902 has differences to review', why: 'Edify proposed an action for each', cta: 'Review' }] : []),
    ...BRIEF.needsCall.filter(i => !resolved.has(i.scenario) && !deferred[i.id] && !dismissed.has(i.id))
  ]

  const deliveries = [
    { id: 'today', name: DAY.supplier, when: DAY.nextDelivery },
    ...(orderThread && orderThread.caseState === 'awaiting_delivery' ? [{ id: 'sat', name: 'Saturday order — Bidfood', when: 'Sat 07:30' }] : [])
  ]

  // Continue — structured drafts the user can resume, derived from the live
  // supplier card in each thread (source of truth). A draft appears once the
  // card exists; it drops off the moment it's confirmed (applied) or removed.
  const supplierDraftEntry = (t) => (t.entries || []).find(e =>
    e.kind === 'card' && (e.card === 'supplierAdd' || e.card === 'supplierDraft') &&
    !['applied', 'cancelled'].includes(e.data?.status))
  const continueItems = threads.flatMap(t => {
    if (t.scenarioId !== 'supplier') return []
    const e = supplierDraftEntry(t)
    if (!e) return []
    if (e.card === 'supplierAdd') {
      return [{ id: 'cont-' + t.id, threadId: t.id, title: `Add ${e.data.supplier.name} to ${CURRENT_SITE}`, sub: 'Ready to review' }]
    }
    const missing = requiredMissing(e.data.draft)
    return [{ id: 'cont-' + t.id, threadId: t.id, title: `Add ${e.data.draft.name} to ${CURRENT_SITE}`,
      sub: missing === 0 ? 'Ready to review' : `${missing} required detail${missing === 1 ? '' : 's'} missing` }]
  })

  // Background monitoring — waiting states. None count toward the Home badge;
  // each is a two-line row (object title · what it's waiting for).
  const backgroundItems = [
    { id: 'bg-estate', title: `${DAY.supplier} delivery`, meta: DAY.orderNo, wait: 'Waiting for delivery' },
    ...(orderThread && orderThread.caseState === 'awaiting_delivery' ? [{ id: 'bg-order', threadId: orderThread.id, title: 'Bidfood delivery', meta: 'Order #2231', wait: 'Waiting for delivery' }] : []),
    ...(orderThread && orderThread.caseState === 'awaiting_invoice' ? [{ id: 'bg-order', threadId: orderThread.id, title: 'Bidfood delivery', meta: 'Delivery #912', wait: 'Waiting for invoice' }] : []),
    ...watching.map(w => ({ id: w.id, threadId: w.threadId, title: w.title, meta: (w.sub || 'Fitzroy Espresso').split('·')[0].trim(), wait: w.helper || w.status || 'In progress' }))
  ]

  const activeThread = threads.find(t => t.id === activeId)
  const needsCount = needsItems.length

  // The opened task keeps the name it had on Home — evolving only when the
  // object's state genuinely changes (order → delivery → invoice).
  const taskTitle = (t) => {
    if (!t) return ''
    if (isOrder(t)) {
      const cs = t.caseState
      if (cs === 'invoice_decision' || cs === 'awaiting_credit' || cs === 'closed') return 'Review Bidfood invoice #4902'
      if (cs === 'delivery_due' || cs === 'receiving') return 'Check in Bidfood delivery'
      if (cs === 'awaiting_invoice') return 'Bidfood order #2231'
      if (cs === 'awaiting_delivery') return "Saturday's oat milk order"
      return "Saturday's oat milk order needs review"
    }
    if (t.scenarioId === 'invoice') return 'Review Bidfood invoice #4821'
    if (t.scenarioId === 'count') return 'Check whole milk count'
    if (t.scenarioId === 'gp') return 'Why is GP% down this week?'
    if (t.scenarioId === 'muffins') return "Monday's muffin bake"
    if (t.scenarioId === 'supplier') {
      const f = t.supplierFlow || {}
      if (!f.supplierName) return f.action === 'update' ? 'Update supplier' : 'Add supplier'
      return `${f.action === 'update' ? 'Update' : 'Add'} ${f.supplierName}${f.action === 'update' ? '' : ' to ' + CURRENT_SITE}`
    }
    return t.title || 'New chat'
  }

  // Demo timeline — a quiet service card pinned to the bottom of the sidebar,
  // just above the account row. One line for the current step; if the step
  // has a world event, the whole line advances it.
  const demoLines = []
  if (demoStage === 0) demoLines.push({ text: "Confirm Saturday's order to unlock" })
  if (demoStage === 1) demoLines.push({ text: 'Sat 07:30 — the van arrives', fn: fireDelivery })
  if (demoStage === 1.4 || demoStage === 1.5) demoLines.push({ text: 'Receive the delivery to continue' })
  if (demoStage === 2) demoLines.push({ text: 'Mon 06:40 — the invoice lands', fn: fireInvoice })
  if (gpThread && !countFired) demoLines.push({ text: 'Thu 18:05 — Marco closes the count', fn: fireCount })
  if (demoStage === 2.5) demoLines.push({ text: 'Review the invoice to continue' })
  if (demoStage === 2.8) demoLines.push({ text: 'Unresolved lines stay open — demo ends here' })
  if (demoStage === 3) demoLines.push({ text: 'Demo complete — one thread in Journal' })
  const demoNode = demoLines.length > 0 && (
    <div className="demo-card">
      <div className="demo-eyebrow"><Clock size={14} /> Demo timeline</div>
      {demoLines.map((l, i) => (l.fn
        ? <button key={i} className="demo-line action" onClick={l.fn}>{l.text}</button>
        : <div key={i} className="demo-line">{l.text}</div>))}
    </div>
  )

  return (
    <div className="app">
      <Sidebar view={view} space={space} setView={setView} openSpace={(id) => { setSpace(id); setView('space') }} needsCount={needsCount} demo={demoNode} />
      <div className="main">
        <motion.div key={view + (view === 'chat' ? activeId : '') + (view === 'space' ? space : '')} className={['journal', 'space', 'chats'].includes(view) ? 'scroll-area' : 'view-wrap'}
          style={!['journal', 'space', 'chats'].includes(view) ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {view === 'today' && (
            <Home needsItems={needsItems} continueItems={continueItems} backgroundItems={backgroundItems} deliveries={deliveries}
              onOpen={handleHomeOpen} onSend={handleSend} onSpace={(id) => { setSpace(id); setView('space') }} />
          )}
          {view === 'chats' && <ChatsPage threads={threads} onOpen={openThread} />}
          {view === 'chat' && activeThread && (
            <Chat key={activeThread.id} thread={activeThread} persist={persistThread(activeThread.id)}
              onEvent={handleChatEvent} onBack={() => setView('today')}
              onSwitch={handleCaseSwitch} title={taskTitle(activeThread)} />
          )}
          {view === 'journal' && <Journal entries={journal} onOpenChat={openThread} />}
          {view === 'space' && (space === 'suppliers'
            ? <SuppliersPage onAdd={() => handleSend('Add supplier')} added={addedSuppliers} />
            : space === 'recipes'
            ? <RecipesPage onCreate={() => handleSend('New recipe')} />
            : <SpacePage spaceId={space} />)}
        </motion.div>
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
