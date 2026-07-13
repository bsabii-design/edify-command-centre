import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SCENARIOS, WORKING_TEXT, PROMISE, cutoffLabel } from '../data.js'
import { useStream } from '../hooks.js'
import {
  OrderDiffCard, GpCard, InvoiceCard, CountFixCard, ReceivingCard, InvoiceCloseCard,
  SupplierAddCard, SupplierDraftCard, SupplierUpdateCard, MuffinCard
} from './Cards.jsx'
import Composer from './Composer.jsx'
import { Back, Check, Clock, Chevron, ChevDown } from './Icons.jsx'
import {
  getSupplier, detectSupplierIntent, detectSupplierSwitch, existingSupplierNames,
  parseSupplierInput, parseDeliveryDays, mergeSupplierDraft, emptyDraft, formatSupplierName, confirmationText
} from '../suppliers.js'

let uid = 0
const nid = () => `e${++uid}_${Date.now() % 100000}`

export function matchScenario(text) {
  const t = text.toLowerCase()
  if (/supplier/.test(t)) return 'supplier'
  const vm = t.match(/^(?:update|change|edit|delete|remove|add)\s+(.+)/)
  if (vm && getSupplier(vm[1])) return 'supplier'
  if (/(oat|milk).*(order|saturday)|add 20|20 l/.test(t)) return 'oatmilk'
  if (/muffin|bake|production/.test(t)) return 'muffins'
  if (/gp|margin|profit|down/.test(t)) return 'gp'
  if (/invoice|4821|credit/.test(t)) return 'invoice'
  if (/count|stock ?take|variance/.test(t)) return 'count'
  return 'fallback'
}

// tiny markdown: **bold** and *italic*
function md(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (part.startsWith('*')) return <i key={i}>{part.slice(1, -1)}</i>
    return <span key={i}>{part}</span>
  })
}

function StreamText({ text, done, onDone }) {
  const [shown, finished] = useStream(text, !done, onDone)
  return <div className="body">{md(shown)}{!finished && <span className="cursor-blink" />}</div>
}

function Thinking({ label }) {
  return (
    <motion.div className="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}>
      <span className="shimmer">{label}</span>
    </motion.div>
  )
}

// What Edify does before each card exists — and what it FOUND at each step.
// A tick that leaves a fact behind is evidence; a bare tick is theatre.
const WORKING_STEPS = {
  // Evidence only — facts Edify stands on. System actions ("drafting the
  // change") are not evidence and don't appear here.
  orderDiff: [
    { t: 'Saturday basket', r: '8 items, £1,240.60' },
    { t: 'Warm weekend demand', r: '74–81 L' },
    { t: 'Current par level', r: '60 L, set 12 May' }
  ],
  invoiceMatch: [
    { t: 'Opening invoice #4821', r: '£1,249.60' },
    { t: 'Comparing with the delivery note', r: 'signed 08:05' },
    { t: 'Checking quantities and expected prices', r: '2 differences' },
    { t: 'Preparing a resolution' }
  ],
  gpBreakdown: [
    { t: 'Pulling POS sales for the week', r: '4,182 sales' },
    { t: 'Recosting recipes against invoices', r: 'version 214' },
    { t: 'Splitting the drivers apart', r: '4 found' }
  ],
  muffinPlan: [
    { t: "Reading Monday's production plan", r: '12 baked' },
    { t: 'Checking muffin sell-through, last 4 Mondays', r: '6–7 sold' },
    { t: 'Drafting the change' }
  ],
  receiving: [
    { t: 'Order #2231', r: '8 items' },
    { t: 'Expected delivery', r: 'Saturday 07:30' }
  ],
  countFix: [
    { t: "Reading yesterday's count", r: '22 L' },
    { t: 'Comparing with POS usage', r: 'implies 8 L' },
    { t: 'Testing the crate/litre pattern', r: 'matches' }
  ],
  invoiceClose: [
    { t: 'Matching invoice #4902', r: '80 L billed' },
    { t: 'Applying your held credit', r: '£2.84' }
  ],
  supplierDraft: [
    { t: 'Reading what you sent', r: 'email + days' },
    { t: 'Pulling out the ordering details' },
    { t: 'Filling the draft' }
  ],
  supplierUpdate: [{ t: 'Loading the supplier record' }, { t: 'Preparing the fields you can change' }],
  supplierAdd: [{ t: 'Checking your other sites', r: 'found on 2' }, { t: 'Copying the setup across' }]
}

function WorkingSteps({ steps, done, label }) {
  const settled = done >= steps.length
  // Live run: the list stays open through the ticking, then folds to one quiet
  // line as the card lands. Revisits start folded — the evidence is a tap away.
  const [open, setOpen] = useState(!settled)
  useEffect(() => {
    if (settled) { const t = setTimeout(() => setOpen(false), 600); return () => clearTimeout(t) }
  }, [settled])
  const rows = steps.map((s, i) => {
    const step = typeof s === 'string' ? { t: s } : s
    return (
      <div key={i} className={`wstep ${i < done ? 'done' : i === done ? 'active' : 'todo'}`}>
        <span className="wstep-mark">{i < done ? <Check size={16} /> : i === done ? <span className="wpulse" /> : <span className="wdot" />}</span>
        {i === done
          ? <span className="shimmer">{step.t}</span>
          : <span>{step.t}{i < done && step.r ? <span className="wres">: {step.r}</span> : null}</span>}
      </div>
    )
  })
  const ease = [0.25, 0.1, 0.25, 1]
  return (
    <div className="wsteps">
      <AnimatePresence initial={false}>
        {settled && (
          <motion.button key="fold" className="wfold-toggle" onClick={() => setOpen(o => !o)}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.28, ease }} style={{ overflow: 'hidden' }}>
            <Chevron size={16} className={`wf-chev ${open ? 'open' : ''}`} /> {label || 'How Edify checked this'}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {(!settled || open) && (
          <motion.div key="list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease }} style={{ overflow: 'hidden' }}>
            {rows}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// The fold line names what the work WAS, per card.
const WORKING_LABELS = { receiving: 'How Edify prepared this' }

const CARD_MAP = {
  orderDiff: OrderDiffCard, gpBreakdown: GpCard, invoiceMatch: InvoiceCard, countFix: CountFixCard, muffinPlan: MuffinCard,
  receiving: ReceivingCard, invoiceClose: InvoiceCloseCard,
  supplierAdd: SupplierAddCard, supplierDraft: SupplierDraftCard,
  supplierUpdate: SupplierUpdateCard
}
const SUPPLIER_CARD = new Set(['supplierAdd', 'supplierDraft', 'supplierUpdate'])
const CARD_TITLES = {
  orderDiff: "Saturday's order change", receiving: 'Delivery check-in', invoiceMatch: 'Invoice #4821',
  invoiceClose: 'Invoice #4902', countFix: 'Whole milk count', muffinPlan: "Monday's muffin bake",
  supplierAdd: 'Supplier setup', supplierDraft: 'Supplier draft', supplierUpdate: 'Supplier update'
}

export default function Chat({ thread, persist, onEvent, onBack, onSwitch }) {
  // The checklist is the card's evidence — it stays while the decision is
  // open, and folds away with the card once the case is settled.
  const [entries, setEntries] = useState(() => {
    const list = thread.entries || []
    if (!thread.started) return list
    return list.filter((e, i) => {
      if (e.kind !== 'working') return true
      const next = list.slice(i + 1).find(x => x.kind === 'card')
      return next && !['applied', 'declined', 'cancelled'].includes(next.data?.status)
    })
  })
  const [thinking, setThinking] = useState(false)
  const [thinkingLabel, setThinkingLabel] = useState('Edify is checking…')
  const [supplierFlow, setSupplierFlow] = useState(thread.supplierFlow || { action: 'add', phase: 'awaiting_name' })
  const queueRef = useRef(thread.queue || [])
  // Cards settled before this visit fold to a line; a card resolved right now
  // stays open — the confirmation moment is the point.
  const settledAtMount = useRef(new Set(
    (thread.entries || []).filter(e => e.kind === 'card' && ['applied', 'declined', 'cancelled'].includes(e.data?.status)).map(e => e.id)
  ))
  const startedRef = useRef(thread.started || false)
  const scrollRef = useRef(null)

  useEffect(() => { persist({ entries, queue: queueRef.current, started: startedRef.current, supplierFlow }) }, [entries, supplierFlow])
  // The deadline follows the decision into the thread — same ticking chip as Home.
  const [, tickMin] = useState(0)
  useEffect(() => { const t = setInterval(() => tickMin(x => x + 1), 30000); return () => clearInterval(t) }, [])
  const orderLive = (thread.scenarioId === 'cutoff' || thread.scenarioId === 'oatmilk') &&
    entries.some(e => e.kind === 'card' && e.card === 'orderDiff' && (e.data?.status ?? 'proposed') === 'proposed')
  const entryCount = useRef(0)
  const [atBottom, setAtBottom] = useState(true)
  useEffect(() => {
    const grew = entries.length !== entryCount.current
    entryCount.current = entries.length
    if (grew || thinking) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries, thinking])
  const onScroll = () => {
    const el = scrollRef.current
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })

  const pump = useCallback(() => {
    const step = queueRef.current.shift()
    if (!step) return
    if (step.type === 'assistant') {
      setThinkingLabel('Edify is checking…')
      setThinking(true)
      setTimeout(() => {
        setThinking(false)
        const text = step.text.replace('{time}', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
        setEntries(es => [...es, { id: nid(), kind: 'assistant', text, done: false, scenarioId: step.scenarioId }])
      }, 500)
    } else if (step.type === 'card') {
      const steps = WORKING_STEPS[step.card]
      const addCard = () => {
        setEntries(es => [...es, { id: nid(), kind: 'card', card: step.card, scenarioId: step.scenarioId, data: step.data || {} }])
        setTimeout(pump, 450)
      }
      if (!steps) { setTimeout(addCard, 350); return }
      // Show Edify doing the work, one step at a time, then hand over the card.
      const wid = nid()
      setTimeout(() => {
        setEntries(es => [...es, { id: wid, kind: 'working', steps, done: 0, label: WORKING_LABELS[step.card] }])
        let i = 0
        const tick = () => {
          i += 1
          setEntries(es => es.map(e => (e.id === wid ? { ...e, done: i } : e)))
          if (i < steps.length) setTimeout(tick, 550)
          else setTimeout(addCard, 500)
        }
        setTimeout(tick, 550)
      }, 300)
    } else if (step.type === 'chips') {
      setTimeout(() => {
        setEntries(es => [...es, { id: nid(), kind: 'chips', scenarioId: step.scenarioId }])
        setTimeout(pump, 300)
      }, 300)
    } else if (step.type === 'followups') {
      // The bridge from answer to action: tapping one starts a real case.
      setTimeout(() => {
        setEntries(es => [...es, { id: nid(), kind: 'followups', label: step.label, options: step.options }])
        setTimeout(pump, 300)
      }, 300)
    }
  }, [])

  const onStreamDone = useCallback((id) => {
    setEntries(es => es.map(e => (e.id === id ? { ...e, done: true } : e)))
    setTimeout(pump, 350)
  }, [pump])

  const playScenario = useCallback((scId, userText) => {
    const sc = SCENARIOS[scId]
    if (!sc) return
    if (userText) setEntries(es => [...es, { id: nid(), kind: 'user', text: userText }])
    queueRef.current.push(...sc.steps.map(s => ({ ...s, scenarioId: scId })))
    setTimeout(pump, userText ? 350 : 150)
  }, [pump])

  // ---- Supplier flow -------------------------------------------------------
  const pushAssistant = (text) => setEntries(es => [...es, { id: nid(), kind: 'assistant', text, done: true, scenarioId: 'supplier' }])
  const pushCard = (card, data) => setEntries(es => [...es, { id: nid(), kind: 'card', card, scenarioId: 'supplier', data: { ...data, status: 'proposed' } }])
  const pushPick = (prompt, options) => setEntries(es => [...es,
    { id: nid(), kind: 'assistant', text: prompt, done: true, scenarioId: 'supplier' },
    { id: nid(), kind: 'supplierPick', options, scenarioId: 'supplier' }])

  const proposeAdd = useCallback((name) => {
    const formatted = formatSupplierName(name)
    setThinkingLabel(`Looking up ${formatted}…`)
    setThinking(true)
    setSupplierFlow({ action: 'add', phase: 'searching', supplierName: formatted })
    setTimeout(() => {
      setThinking(false)
      const found = getSupplier(formatted)
      if (found) {
        pushAssistant(`**${found.name}** is already set up on ${found.usedBy.join(' and ')}. I can copy that setup here — nothing's missing:`)
        pushCard('supplierAdd', { supplier: found })
        setSupplierFlow({ action: 'add', phase: 'review', path: 'existing', supplierName: found.name })
      } else {
        pushAssistant(`I don't have **${formatted}** on any site yet — I can't invent their details. Tell me their **order email** and **delivery days** (add cut-off or minimum if you have them), or paste their order email, and I'll build the draft.`)
        setSupplierFlow({ action: 'add', phase: 'awaiting_details', path: 'new', supplierName: formatted })
      }
    }, 1000)
  }, [])

  const proposeUpdate = useCallback((name) => {
    const s = getSupplier(name)
    if (!s) { pushPick(`I couldn't find **${formatSupplierName(name)}** on your suppliers. Which one did you mean?`, existingSupplierNames().map(n => ({ label: n }))); setSupplierFlow({ action: 'update', phase: 'awaiting_pick' }); return }
    pushAssistant(`Here's **${s.name}** — pick what changed and I'll update just that.`)
    pushCard('supplierUpdate', { supplier: s, active: [], edits: {} })
    setSupplierFlow({ action: 'update', phase: 'review', supplierName: s.name })
  }, [])

  // Deleting a supplier is out of chat's reach on purpose: destructive,
  // account-level, and rare. Edify says where it lives instead of doing it.
  const declineDelete = useCallback(() => {
    pushAssistant("Removing a supplier isn't something I do from chat — it affects every order and invoice history at this site. You can archive a supplier from the **Suppliers** page. I can help you add or update one here.")
  }, [])

  const startSupplierFlow = useCallback((text) => {
    const { action, name } = detectSupplierIntent(text)
    if (action === 'delete') {
      declineDelete()
    } else if (action === 'update') {
      if (name) proposeUpdate(name)
      else { pushPick('Which supplier do you want to update?', existingSupplierNames().map(n => ({ label: n }))); setSupplierFlow({ action: 'update', phase: 'awaiting_pick' }) }
    } else {
      if (name) proposeAdd(name)
      else {
        pushPick("Which supplier are you adding? Name anyone — I'll check your other sites first. Already set up somewhere → you just confirm. Brand new → one message with the details is enough.", [
          { label: 'Caravan Coffee', hint: 'new — you add the details' },
          { label: 'Bidfood', hint: 'already on other sites' }
        ])
        setSupplierFlow({ action: 'add', phase: 'awaiting_name' })
      }
    }
  }, [proposeAdd, proposeUpdate, declineDelete])

  const handleSupplierMessage = useCallback((text) => {
    setEntries(es => [...es, { id: nid(), kind: 'user', text }])
    const flow = supplierFlow

    // explicit new command mid-thread re-routes
    if (/^(update|change|edit|delete|remove|add|new|set ?up)\b/i.test(text.trim()) &&
        !(flow.phase === 'awaiting_name' || flow.phase === 'awaiting_pick')) {
      return startSupplierFlow(text)
    }

    if (flow.phase === 'awaiting_name') return proposeAdd(text)
    if (flow.phase === 'awaiting_pick' && flow.action === 'update') return proposeUpdate(text)
    
    // "actually add X instead" — switch supplier while adding
    const switchName = detectSupplierSwitch(text)
    if (switchName && flow.phase !== 'awaiting_name' && flow.action === 'add') {
      setEntries(es => es.map(e => e.kind === 'card' && SUPPLIER_CARD.has(e.card) && e.data?.status === 'proposed'
        ? { ...e, data: { ...e.data, status: 'cancelled' } } : e))
      return proposeAdd(switchName)
    }

    // operator provides the details for a brand-new supplier
    if (flow.phase === 'awaiting_details' && flow.action === 'add') {
      const draft = parseSupplierInput(text, flow.supplierName)
      pushAssistant('Got it — here’s the draft. Fill anything still missing on the card, then create it.')
      pushCard('supplierDraft', { draft })
      setSupplierFlow({ ...flow, phase: 'review', path: 'new', draft })
      return
    }

    // adding more details / delivery days by chat while a new-supplier draft is open
    if (flow.phase === 'review' && flow.action === 'add' && flow.path === 'new') {
      const updates = parseSupplierInput(text, flow.supplierName)
      const days = parseDeliveryDays(text)
      setEntries(es => es.map(e => {
        if (e.kind === 'card' && e.card === 'supplierDraft' && e.data?.status === 'proposed') {
          const merged = mergeSupplierDraft(e.data.draft, updates)
          if (days.length) merged.deliveryDays = days
          setSupplierFlow(f => ({ ...f, draft: merged }))
          return { ...e, data: { ...e.data, draft: merged } }
        }
        return e
      }))
      pushAssistant('Updated the draft.')
      return
    }
    pushAssistant('Tell me the supplier name, or use the card above to finish this.')
  }, [supplierFlow, proposeAdd, proposeUpdate, startSupplierFlow])

  // ---- mount ---------------------------------------------------------------
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (thread.scenarioId === 'supplier') {
      startSupplierFlow(thread.userText || 'Add supplier')
    } else {
      const sc = SCENARIOS[thread.scenarioId]
      playScenario(thread.scenarioId, thread.userText ?? sc.userText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!thread.pendingSteps?.length) return
    const steps = thread.pendingSteps
    persist({ pendingSteps: [] })
    queueRef.current.push(...steps)
    setTimeout(pump, 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.pendingSteps])

  const patchEntry = (id, data) => setEntries(es => es.map(e => (e.id === id ? { ...e, data: { ...e.data, ...data } } : e)))

  const resolve = (entry) => (action, payload) => {
    // A driver row with a handle opens its own case, like the follow-up chip.
    if (action === 'openMuffins') { handleSend("Trim Monday's muffin bake"); return }
    if (action === 'editRequest') { pushAssistant('Tell me what to change — the amount, the wording, or which line it covers — and I\'ll redraft the request before anything is sent.'); return }
    const sc = SCENARIOS[entry.scenarioId]
    const statusByAction = {
      confirm: { status: 'applied' }, decline: { status: 'declined' }, invoiceConfirm: { status: 'applied' },
      muffinConfirm: { status: 'applied' }, muffinKeep: { status: 'declined' },
      recount: { status: 'applied', choice: 'recount' }, acceptCount: { status: 'applied', choice: 'acceptCount' },
      receipt: { status: 'applied' }, closeCase: { status: 'applied' },
      requestCredit: { status: 'applied', resolution: 'credit' }, acceptDiff: { status: 'applied', resolution: 'accepted' },
      supplierAddConfirm: { status: 'applied' }, supplierCreateConfirm: { status: 'applied' },
      supplierUpdateConfirm: { status: 'applied' },
      supplierCancel: { status: 'cancelled' }
    }
    const patch = { ...(statusByAction[action] || {}) }
    if (action === 'confirm') patch.acceptedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    patchEntry(entry.id, patch)
    onEvent(action, { scenarioId: entry.scenarioId, entry, payload })

    if (action === 'supplierAddConfirm' || action === 'supplierCreateConfirm') {
      const s = entry.data.supplier || entry.data.draft
      pushAssistant(confirmationText(s, action === 'supplierCreateConfirm'))
      setSupplierFlow({ phase: 'done', supplierName: s.name })
    } else if (action === 'supplierUpdateConfirm') {
      const s = entry.data.supplier
      const n = (payload?.changed || []).length
      pushAssistant(`Updated **${s.name}** — ${n} change${n === 1 ? '' : 's'} saved for Fitzroy Espresso. Nothing else touched.`)
      setSupplierFlow({ phase: 'done', supplierName: s.name })
    } else if (action === 'supplierDeleteConfirm') {
      const s = entry.data.supplier
      pushAssistant(`Removed **${s.name}** from Fitzroy Espresso. Past orders and invoices are still in Journal.`)
      setSupplierFlow({ phase: 'done', supplierName: s.name })
    } else if (action === 'supplierCancel') {
      pushAssistant('Okay — nothing changed.')
      setSupplierFlow({ phase: 'awaiting_name', action: 'add' })
    }

    let follow = sc.resolutions?.[action]
    if (typeof follow === 'function') follow = follow(payload, entry)
    if (follow) {
      queueRef.current.push(...follow.map(s => ({ ...s, scenarioId: entry.scenarioId })))
      setTimeout(pump, 650)
    }
  }

  // Talk to shape the proposal; the change only fires on a labelled tap. A
  // quantity typed while an order card is live re-renders its stepper — Edify
  // acknowledges in words, but never commits from parsed text.
  const tryAdjustOrder = (text) => {
    const card = entries.find(e => e.kind === 'card' && e.card === 'orderDiff' && (e.data?.status ?? 'proposed') === 'proposed')
    if (!card) return false
    const cur = 60 + (card.data?.add ?? 20)
    let next = null
    let m
    if ((m = text.match(/(?:make it|set (?:it )?to|change to|just|=)\s*(\d{1,3})/i))) next = +m[1]
    else if ((m = text.match(/(?:add|up|increase(?:\s+by)?|more)\s*(\d{1,3})/i))) next = cur + +m[1]
    else if ((m = text.match(/(?:less|down|reduce(?:\s+by)?|drop)\s*(\d{1,3})/i))) next = cur - +m[1]
    else if ((m = text.match(/^\s*(\d{1,3})\s*(?:l|litres?|liters?)?\s*$/i))) next = +m[1]
    if (next == null || isNaN(next)) return false
    next = Math.max(0, Math.min(999, next))
    setEntries(es => [...es, { id: nid(), kind: 'user', text }])
    patchEntry(card.id, { add: next - 60 })
    const extra = (next * 1.42 - 60 * 1.42)
    const line = next === cur
      ? `Already at **${next} L** — nothing changed. Tap Send order when you're happy.`
      : `Done — set to **${next} L** (${extra >= 0 ? '+' : '−'}£${Math.abs(extra).toFixed(2)}). Nothing's sent yet — tap **Send order** to confirm, or keep adjusting.`
    queueRef.current.push({ type: 'assistant', text: line, scenarioId: thread.scenarioId })
    setTimeout(pump, 300)
    return true
  }

  const handleSend = (text) => {
    if (thread.scenarioId === 'supplier') { handleSupplierMessage(text); return }
    // Provenance is a question, answered in the thread it was asked in.
    if (/worked out|how .*(checked|computed|know)|where .*numbers/i.test(text)) {
      askProvenance(thread.scenarioId, text)
      return
    }
    // Shape a live order by talking to it.
    if (tryAdjustOrder(text)) return
    // A new topic starts its own case. The old thread gets a handoff line;
    // mixed-topic scrollback is how chat products become unfindable.
    const FAM = (id) => (id === 'oatmilk' || id === 'cutoff' ? 'order' : id)
    const target = matchScenario(text)
    if (target !== 'fallback' && FAM(target) !== FAM(thread.scenarioId)) {
      onSwitch(target, text)
      return
    }
    playScenario(matchScenario(text), text)
  }

  const askProvenance = (key, userText) => {
    setEntries(es => [...es, { id: nid(), kind: 'user', text: userText }])
    queueRef.current.push({ type: 'assistant', text: WORKING_TEXT[key] || WORKING_TEXT.default, scenarioId: thread.scenarioId })
    setTimeout(pump, 350)
  }

  const scenario = SCENARIOS[thread.scenarioId]
  const composerPlaceholder = thread.scenarioId === 'supplier'
    ? (supplierFlow.phase === 'awaiting_name' || supplierFlow.phase === 'awaiting_pick'
        ? 'Type a supplier name, or tap one above…'
        : supplierFlow.phase === 'awaiting_details'
          ? 'e.g. orders@caravan.co.uk, delivery Mon & Thu, min £200'
          : 'Reply, e.g. “delivery is Mon and Thu”…')
    : 'Reply, or type / for commands'

  return (
    <div className="chat-layout">
      <div className="chat-col">
        {/* No header bar — a floating pill, like Granola. The case names itself
            in the conversation; the deadline floats opposite while it's live. */}
        <button className="chat-back" onClick={onBack} aria-label="Home"><Back size={16} /></button>
        {orderLive && <span className="deadline-chip chat-deadline"><Clock size={16} /> {cutoffLabel()}</span>}
        <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
          <div className="chat-thread">
            <AnimatePresence initial={false}>
              {entries.map(e => {
                if (e.kind === 'user') return (
                  <motion.div key={e.id} className="msg user" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, ease: 'easeOut' }}>
                    <div className="msg-user-bubble">{e.text}</div>
                  </motion.div>
                )
                // No avatar, no name — the answer just speaks, like Granola.
                if (e.kind === 'assistant') return (
                  <motion.div key={e.id} className="msg msg-assistant" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
                    <StreamText text={e.text} done={e.done} onDone={() => onStreamDone(e.id)} />
                  </motion.div>
                )
                if (e.kind === 'card') {
                  const C = CARD_MAP[e.card]
                  // A settled card folds to one line — the thread stays scannable.
                  // Fold and reopen cross-animate through height: seamless, no swap.
                  const settled = settledAtMount.current.has(e.id) && ['applied', 'declined', 'cancelled'].includes(e.data?.status)
                  const expanded = settled && e.data?.reopened
                  const ease = [0.25, 0.1, 0.25, 1]
                  const word = { applied: 'done', declined: 'kept as is', cancelled: 'discarded' }[e.data?.status]
                  return (
                    <div key={e.id} className="card-slot">
                      <AnimatePresence initial={false}>
                        {settled && !e.data?.reopened ? (
                          <motion.button key="folded" className="card-collapsed" onClick={() => patchEntry(e.id, { reopened: true })}
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease }} style={{ overflow: 'hidden' }}>
                            <span className="cc-inner">
                              <span className="cc-check"><Check size={16} /></span>
                              {CARD_TITLES[e.card] || 'Card'} — {word}
                              <span className="cc-view">view</span>
                            </span>
                          </motion.button>
                        ) : (
                          <motion.div key="full" className="msg"
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} style={{ overflow: 'hidden' }}>
                            <C entry={e} patch={(d) => {
                              patchEntry(e.id, d)
                              if (e.card === 'supplierDraft' && d.draft) setSupplierFlow(flow => ({ ...flow, phase: 'review', path: 'new', supplierName: d.draft.name, draft: d.draft }))
                            }} resolve={resolve(e)} />
                            {expanded && (
                              <button className="fold-row" onClick={() => patchEntry(e.id, { reopened: false })}>
                                <Chevron size={16} className="fold-chev" /> Collapse
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }
                if (e.kind === 'working') return (
                  <motion.div key={e.id} className="msg" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <WorkingSteps steps={e.steps} done={e.done} label={e.label} />
                  </motion.div>
                )
                if (e.kind === 'supplierPick') {
                  if (e.data?.used) return null
                  return (
                    <motion.div key={e.id} className="suggestions supplier-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {e.options.map(opt => (
                        <button key={opt.label} className="suggestion pick-chip"
                          onClick={() => { patchEntry(e.id, { used: true }); handleSupplierMessage(opt.label) }}>
                          {opt.label}{opt.hint && <span className="pick-hint">{opt.hint}</span>}
                        </button>
                      ))}
                    </motion.div>
                  )
                }
                if (e.kind === 'chips') return (
                  <motion.div key={e.id} className="suggestions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {['Add supplier', "Add 20 litres of oat milk to Saturday's order", 'Why is GP% down at this site this week?', 'Review Bidfood invoice #4821'].map(s => (
                      <button key={s} className="suggestion" onClick={() => handleSend(s)}>{s}</button>
                    ))}
                  </motion.div>
                )
                if (e.kind === 'followups') {
                  if (e.data?.used) return null
                  return (
                    <motion.div key={e.id} className="followups" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      {e.label && <span className="fu-label">{e.label}</span>}
                      {e.options.map(opt => (
                        <button key={opt} className="suggestion"
                          onClick={() => { patchEntry(e.id, { used: true }); handleSend(opt) }}>{opt}</button>
                      ))}
                    </motion.div>
                  )
                }
                return null
              })}
            </AnimatePresence>
            <AnimatePresence>{thinking && <Thinking key="think" label={thinkingLabel} />}</AnimatePresence>
          </div>
        </div>
        <div className="chat-composer-wrap">
          <AnimatePresence>
            {!atBottom && (
              <motion.button key="sd" className="scroll-down" onClick={scrollToBottom} aria-label="Scroll to latest"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
                <ChevDown size={16} />
              </motion.button>
            )}
          </AnimatePresence>
          <div className="chat-composer-inner">
            <Composer placeholder={composerPlaceholder}
              hint={PROMISE} onSend={handleSend} />
          </div>
        </div>
      </div>
    </div>
  )
}
