import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SCENARIOS, WORKING_TEXT, PROMISE, cutoffLabel } from '../data.js'
import { useStream } from '../hooks.js'
import {
  OrderDiffCard, GpCard, CountFixCard, ReceivingCard, InvoiceCloseCard, DeliveryDueCard,
  SupplierAddCard, SupplierDraftCard, SupplierUpdateCard, MuffinCard
} from './Cards.jsx'
import Composer from './Composer.jsx'
import { Check, Clock, Chevron, ChevDown, Spinner, ExtLink } from './Icons.jsx'
import { BackIconButton, DeadlineChip } from './Controls.jsx'
import {
  getSupplier, detectSupplierIntent, detectSupplierSwitch, existingSupplierNames,
  parseSupplierInput, parseDeliveryDays, mergeSupplierDraft, emptyDraft, formatSupplierName, CURRENT_SITE
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
// Chat prose is Regular — no bold fragments inside sentences. The old
// **bold** markers in scenario copy render as plain text; emphasis lives
// in structured UI, not in conversation.
function md(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**')) return <span key={i}>{part.slice(2, -2)}</span>
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
    { t: 'Forecast demand', r: '74–81 L' },
    { t: 'Current order', r: '60 L' }
  ],
  gpBreakdown: [
    { t: 'Sales period', r: '29 Jun – 5 Jul' },
    { t: 'Compared with', r: '4-week average' },
    { t: 'Recipe costs', r: 'version 214' },
    { t: 'Confirmed Bidfood prices', r: '3 invoices' },
    { t: 'Waste records', r: '12 muffins binned' },
    { t: 'Sales-channel mix', r: 'POS + Deliveroo' },
    { t: 'Pending stocktake', r: 'Hub kitchen — open' },
    { t: 'Channel fees', r: 'included in GP' }
  ],
  muffinPlan: [
    { t: 'Current request', r: '12' },
    { t: 'Last four Mondays sold', r: '6–7' },
    { t: 'Recorded waste', r: '12 binned' },
    { t: 'Proposed buffer', r: '1–2 above sales' },
    { t: 'Estimated unit cost', r: '~£0.75' },
    { t: 'Estimated weekly saving', r: '~£3' }
  ],
  countFix: [
    { t: "Reading yesterday's count", r: '22 L' },
    { t: 'Comparing with POS usage', r: 'implies 8 L' },
    { t: 'Testing the crate/litre pattern', r: 'matches' }
  ],
  invoiceClose: [
    { t: 'Order #2231' },
    { t: 'Delivery note #912' },
    { t: 'Bidfood price list' }
  ],
  supplierDraft: [
    { t: 'Reading what you sent', r: 'email + days' },
    { t: 'Pulling out the ordering details' },
    { t: 'Filling the draft' }
  ],
  supplierUpdate: [{ t: 'Loading the supplier record' }, { t: 'Preparing the fields you can change' }],
  supplierAdd: [{ t: 'Checking your other sites', r: 'found on 2' }, { t: 'Copying the setup across' }]
}

// The invoice fold answers three questions in three lines: which records,
// how the expected amount was built, what the comparison found. Only the
// document names are clickable — sentences stay plain. The records differ
// per case; the shape never does.
const FOLD_DOCS = {
  delivery: ['Order #2231', 'Delivery note #912', 'Bidfood price list'],
  invoice: ["Thursday's delivery note", 'Bidfood price list']
}
const FOLD_CALC = {
  delivery: 'Expected from receipt uses received quantities and saved Bidfood prices.',
  invoice: 'Expected from delivery uses the quantities Marco signed for and saved Bidfood prices.'
}
const foldBody = (sc) => (
  <>
    <div className="how-line">Compared with:</div>
    <div className="how-docs">
      {(FOLD_DOCS[sc] || FOLD_DOCS.delivery).map((d, i) => (
        <span key={d} className="how-docwrap">
          {i > 0 && <span className="how-sep">·</span>}
          <button className="how-doc">{d}<ExtLink size={12} /></button>
        </span>
      ))}
    </div>
    <div className="how-line">{FOLD_CALC[sc] || FOLD_CALC.delivery}</div>
    <div className="how-line">6 of 8 lines matched. <span className="how-strong">2 need review.</span></div>
  </>
)
const WORKING_CUSTOM = { invoiceClose: foldBody }

function WorkingSteps({ steps, done, label, card, sc }) {
  const settled = done >= steps.length
  // Granola-style: while working, ONE live line names the source being read
  // right now. When the card lands it becomes a quiet collapsed line; opening
  // it reveals the sources with what each one gave, plus the coverage note.
  const [open, setOpen] = useState(false)
  const ease = [0.25, 0.1, 0.25, 1]
  return (
    <div className="wsteps">
      <AnimatePresence initial={false} mode="wait">
        {!settled ? (
          <motion.div key="live" className="wlive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Spinner size={16} className="wspin" /><span>Working…</span>
          </motion.div>
        ) : (
          <motion.button key="fold" className="wfold-chip" onClick={() => setOpen(o => !o)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }}>
            {label || 'How Edify worked this out'}
            <Chevron size={16} className={`wf-chev ${open ? 'open' : ''}`} />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {settled && open && (
          <motion.div key="list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease }} style={{ overflow: 'hidden' }}>
            <div className="wsrc-list">
              {WORKING_CUSTOM[card] ? WORKING_CUSTOM[card](sc) : steps.map((s, i) => {
                const step = typeof s === 'string' ? { t: s } : s
                return (
                  <div key={i} className="wsrc">
                    <span className="wsrc-t">{step.t}</span>
                    {step.r && <span className="wsrc-r">{step.r}</span>}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// One disclosure label across the flow — the map stays for future
// per-card overrides but is intentionally empty.
const WORKING_LABELS = {}


const CARD_MAP = {
  orderDiff: OrderDiffCard, gpBreakdown: GpCard, countFix: CountFixCard, muffinPlan: MuffinCard,
  receiving: ReceivingCard, invoiceClose: InvoiceCloseCard, deliveryDue: DeliveryDueCard,
  supplierAdd: SupplierAddCard, supplierDraft: SupplierDraftCard,
  supplierUpdate: SupplierUpdateCard
}
const SUPPLIER_CARD = new Set(['supplierAdd', 'supplierDraft', 'supplierUpdate'])
const CARD_TITLES = {
  orderDiff: "Saturday's order change", receiving: 'Delivery check-in',
  invoiceClose: 'Invoice', countFix: 'Whole milk count', muffinPlan: "Monday's muffin bake",
  supplierAdd: 'Supplier setup', supplierDraft: 'Supplier draft', supplierUpdate: 'Supplier update'
}

export default function Chat({ thread, persist, onEvent, onBack, onSwitch, title }) {
  // The checklist is the card's evidence — it stays while the decision is
  // open, and folds away with the card once the case is settled.
  // Revisits show the thread exactly as it was left — evidence folds and
  // confirmed cards included. Nothing collapses behind a hover.
  // A working entry can be persisted mid-tick (leave the thread while the
  // spinner runs) — on revisit it settles into the evidence fold instead of
  // spinning forever.
  const [entries, setEntries] = useState(() => (thread.entries || []).map(e =>
    e.kind === 'working' && e.done < (e.steps || []).length ? { ...e, done: (e.steps || []).length } : e))
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
        let text = step.text.replace('{time}', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
        // A leading "**Monday, 06:40.**" becomes a muted metadata line of
        // its own; the message that follows stays fully Regular.
        let meta = null
        const dm = text.match(/^\*\*([A-Z][a-z]+, \d{2}:\d{2})\.?\*\*\s*/)
        if (dm) { meta = dm[1]; text = text.slice(dm[0].length) }
        setEntries(es => [...es, { id: nid(), kind: 'assistant', text, meta, done: false, scenarioId: step.scenarioId }])
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
        setEntries(es => [...es, { id: wid, kind: 'working', steps, done: 0, label: WORKING_LABELS[step.card], card: step.card, sc: step.scenarioId }])
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
        const usedList = found.usedBy.length > 1
          ? `${found.usedBy.slice(0, -1).join(', ')} and ${found.usedBy[found.usedBy.length - 1]}`
          : found.usedBy[0]
        pushAssistant(`${found.name} is already used at ${usedList}.\nI found a complete setup you can reuse for ${CURRENT_SITE}.`)
        pushCard('supplierAdd', { supplier: found })
        setSupplierFlow({ action: 'add', phase: 'review', path: 'existing', supplierName: found.name })
      } else {
        // A new supplier gets its structured draft immediately — never an
        // empty chat asking for details first. The draft is the source of truth.
        pushAssistant(`I created a draft for ${formatted}.\nAdd the missing details below, paste them here, or attach a supplier document.`)
        pushCard('supplierDraft', { draft: emptyDraft(formatted) })
        setSupplierFlow({ action: 'add', phase: 'review', path: 'new', supplierName: formatted, draft: emptyDraft(formatted) })
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
        pushPick("Which supplier are you adding?\n\nI'll first check whether they're already used at another Ferra site.", [
          { label: 'Caravan Coffee', hint: 'New supplier' },
          { label: 'Harvest Provisions', hint: 'Used at 3 sites' }
        ])
        setSupplierFlow({ action: 'add', phase: 'awaiting_name' })
      }
    }
  }, [proposeAdd, proposeUpdate, declineDelete])

  const handleSupplierMessage = useCallback((text) => {
    const flow = supplierFlow
    const t = text.trim()
    const isCommand = /^(update|change|edit|delete|remove|add|new|set ?up)\b/i.test(t)

    // Task-scoped intent routing: while a NEW supplier draft is open, a message
    // touches the draft only if it carries supplier info (or a command/switch).
    // A clearly unrelated question branches to its own chat — draft preserved,
    // and the question never appears below the supplier form.
    if (flow.phase === 'review' && flow.action === 'add' && flow.path === 'new' && !isCommand && !detectSupplierSwitch(text)) {
      const upd = parseSupplierInput(text, flow.supplierName)
      const hasInfo = !!(upd.orderEmail || upd.cutoff || upd.minimumOrder || parseDeliveryDays(text).length)
      if (!hasInfo) {
        const target = matchScenario(text)
        if (target !== 'supplier' && target !== 'fallback') {
          pushAssistant("This looks like a separate question. I'll keep the supplier draft unchanged.")
          setTimeout(() => onSwitch(target, text), 500)
          return
        }
        // No readable detail and no other scenario — stay, ask for a field.
        setEntries(es => [...es, { id: nid(), kind: 'user', text }])
        pushAssistant("I couldn't read a supplier detail there. Add the order email, delivery days, cut-off or minimum — in the fields above or here.")
        return
      }
    }

    setEntries(es => [...es, { id: nid(), kind: 'user', text }])

    // explicit new command mid-thread re-routes
    if (isCommand && !(flow.phase === 'awaiting_name' || flow.phase === 'awaiting_pick')) {
      return startSupplierFlow(text)
    }

    if (flow.phase === 'awaiting_name') return proposeAdd(text)
    if (flow.phase === 'awaiting_pick' && flow.action === 'update') return proposeUpdate(text)

    // "actually add X instead" — switch supplier while adding
    const switchName = detectSupplierSwitch(text)
    if (switchName && flow.phase !== 'awaiting_name' && flow.action === 'add') {
      setEntries(es => es.filter(e => !(e.kind === 'card' && SUPPLIER_CARD.has(e.card) && e.data?.status === 'proposed')))
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

    // supplier info by chat while a new-supplier draft is open → update + say what changed
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
      const changed = []
      if (updates.orderEmail) changed.push(`Order email: ${updates.orderEmail}`)
      if (days.length) changed.push(`Delivery days: ${days.join(', ')}`)
      if (updates.cutoff) changed.push(`Cut-off: ${updates.cutoff}`)
      if (updates.minimumOrder) changed.push(`Minimum order: ${updates.minimumOrder}`)
      pushAssistant(changed.length ? `Updated the draft — ${changed.join(' · ')}.` : 'Updated the draft.')
      return
    }
    pushAssistant('Tell me the supplier name, or use the card above to finish this.')
  }, [supplierFlow, proposeAdd, proposeUpdate, startSupplierFlow, onSwitch])

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
    const sc = SCENARIOS[entry.scenarioId]
    const statusByAction = {
      confirm: { status: 'applied' }, decline: { status: 'declined' },
      muffinConfirm: { status: 'applied' }, muffinKeep: { status: 'declined' },
      recount: { status: 'applied', choice: 'recount' }, acceptCount: { status: 'applied', choice: 'acceptCount' }, countCorrect: { status: 'applied', choice: 'countCorrect' },
      receipt: { status: 'applied' }, closeCase: { status: 'applied' },
      invoiceResolutions: { status: 'applied', resolution: 'sent' },
      supplierAddConfirm: { status: 'applied' }, supplierCreateConfirm: { status: 'applied' },
      supplierUpdateConfirm: { status: 'applied' }, supplierDiscard: { status: 'discarded' },
      supplierCancel: { status: 'cancelled' }
    }
    // Some actions remove the card from view rather than settle it: checking
    // in swaps to the receiving form; choosing another supplier or discarding
    // a draft clears the proposal without a discarded card.
    if (action === 'receiveStart' || action === 'supplierChooseAnother') {
      setEntries(es => es.filter(x => x.id !== entry.id))
    } else {
      const patch = { ...(statusByAction[action] || {}) }
      if (action === 'confirm') patch.acceptedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      patchEntry(entry.id, patch)
    }
    onEvent(action, { scenarioId: entry.scenarioId, entry, payload })

    if (action === 'supplierAddConfirm' || action === 'supplierCreateConfirm') {
      // The confirmed card carries the setup; chat says only what's next.
      const s = entry.data.supplier || entry.data.draft
      pushAssistant(`${s.name} will now appear in Suppliers.`)
      setSupplierFlow({ phase: 'done', supplierName: s.name })
    } else if (action === 'supplierChooseAnother') {
      // Back to selection, still inside the same Add supplier conversation.
      pushPick("Which supplier are you adding?\n\nI'll first check whether they're already used at another Ferra site.", [
        { label: 'Caravan Coffee', hint: 'New supplier' },
        { label: 'Harvest Provisions', hint: 'Used at 3 sites' }
      ])
      setSupplierFlow({ action: 'add', phase: 'awaiting_name' })
    } else if (action === 'supplierDiscard') {
      // The card shows the final "Draft discarded" state — no chat echo.
      setSupplierFlow({ action: 'add', phase: 'awaiting_name' })
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
        : supplierFlow.action === 'add' && supplierFlow.path === 'new'
          ? "Paste supplier details or attach a file — I'll fill the draft."
          : 'Reply, e.g. “delivery is Mon and Thu”…')
    : 'Reply, or type / for commands'

  return (
    <div className="chat-layout">
      <div className="chat-col">
        {/* A quiet sticky header: back, the task's own name, and its live
            deadline — the same title and urgency shown on the Home card. */}
        <div className="task-header">
          <BackIconButton onClick={onBack} />
          <div className="task-title">{title || thread.title}</div>
          {orderLive && <DeadlineChip />}
        </div>
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
                    {e.meta && <div className="msg-meta">{e.meta}</div>}
                    <StreamText text={e.text} done={e.done} onDone={() => onStreamDone(e.id)} />
                  </motion.div>
                )
                if (e.kind === 'card') {
                  const C = CARD_MAP[e.card]
                  // A settled card folds to one line — the thread stays scannable.
                  // Fold and reopen cross-animate through height: seamless, no swap.
                  const settled = false
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
                                <Chevron size={16} className="fold-chev" />Collapse
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
                    <WorkingSteps steps={e.steps} done={e.done} label={e.label} card={e.card} sc={e.sc} />
                  </motion.div>
                )
                if (e.kind === 'supplierPick') {
                  if (e.data?.used) return null
                  return (
                    <motion.div key={e.id} className="sup-options" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {e.options.map(opt => (
                        <button key={opt.label} className="sup-option"
                          onClick={() => { patchEntry(e.id, { used: true }); handleSupplierMessage(opt.label) }}>
                          <span className="sup-option-name">{opt.label}</span>
                          {opt.hint && <span className="sup-option-sub">{opt.hint}</span>}
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
