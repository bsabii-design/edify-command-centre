import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Journal as JournalIcon, ChatIcon, Search, ChevDown, Chevron, Cart, Truck, Box, Building, Check, X, Clock, Alert, Doc } from './Icons.jsx'
import { GrainSwatch } from './Recipes.jsx'

// Spaces hold persistent business objects — destinations, not actions.
export const SPACES = [
  { id: 'orders', name: 'Orders', icon: Cart },
  { id: 'deliveries', name: 'Deliveries', icon: Truck },
  { id: 'inventory', name: 'Inventory', icon: Box },
  { id: 'invoices', name: 'Invoices', icon: Doc },
  { id: 'suppliers', name: 'Suppliers', icon: Building }
]

export const ALL_PAGES = [...SPACES]

function NavGroup({ title, items, view, space, openSpace }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button className={`spaces-header ${open ? '' : 'collapsed'}`} onClick={() => setOpen(o => !o)}>
        <Chevron size={16} /> {title}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
            {items.map(s => (
              <button key={s.id} className={`nav-item sub ${view === 'space' && space === s.id ? 'active' : ''}`} onClick={() => openSpace(s.id)}>
                <s.icon size={16} /> <span className="label">{s.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Only persistent destinations live here — never actions or commands. Home is
// what needs attention now, Chats is what we discussed, Journal is what
// happened, Spaces are the business objects.
export function Sidebar({ view, space, setView, openSpace, needsCount }) {
  return (
    <div className="sidebar">
      <button className="search-box"><Search size={16} /> Search <span className="kbd">⌘K</span></button>

      <button className={`nav-item ${view === 'today' || view === 'chat' ? 'active' : ''}`} onClick={() => setView('today')}>
        <Home size={16} /> <span className="label">Home</span>
        {needsCount > 0 && <span className="badge">{needsCount}</span>}
      </button>
      <button className={`nav-item ${view === 'chats' ? 'active' : ''}`} onClick={() => setView('chats')}>
        <ChatIcon size={16} /> <span className="label">Chats</span>
      </button>
      <button className={`nav-item ${view === 'journal' ? 'active' : ''}`} onClick={() => setView('journal')}>
        <JournalIcon size={16} /> <span className="label">Journal</span>
      </button>

      <NavGroup title="Spaces" items={SPACES} view={view} space={space} openSpace={openSpace} />

      <div className="spacer" />

      <div className="user">
        <span className="u-hit">
          <span className="avatar"><GrainSwatch palette="fruit" seed="Priya Naidoo" /></span>
          <span className="name">Priya Naidoo</span>
          <ChevDown size={16} className="u-chev" />
        </span>
      </div>
    </div>
  )
}

// Chats — every conversational thread, recoverable. A thread started by a
// command (/add-supplier) lives here even before it has structured data, so
// leaving mid-conversation never loses it.
const relTime = (ts) => {
  if (!ts) return ''
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

const chatTitle = (t) => {
  if (t.scenarioId === 'supplier') return (t.supplierFlow?.action === 'update' ? 'Update supplier' : 'Add supplier')
  return t.title || 'New chat'
}
const chatSub = (t) => {
  if (t.scenarioId === 'supplier') {
    const name = t.supplierFlow?.supplierName
    return name ? `${name}${t.supplierFlow?.phase === 'done' ? '' : ' · draft'}` : 'No supplier selected'
  }
  return t.userText || t.sub || 'Conversation'
}

export function ChatsPage({ threads, onOpen }) {
  return (
    <div className="journal dir-page">
      <div className="dir-head"><h1>Chats</h1></div>
      {threads.length === 0 ? (
        <div className="space-hint spaced">No chats yet. Ask Edify anything, or start one with a slash command — it stays here so you can pick it up later.</div>
      ) : (
        <div className="chats-list">
          {threads.map(t => (
            <button key={t.id} className="chat-row" onClick={() => onOpen(t.id)}>
              <span className="chat-row-ico"><ChatIcon size={16} /></span>
              <span className="chat-row-main">
                <span className="chat-row-title">{chatTitle(t)}</span>
                <span className="chat-row-sub">{chatSub(t)} · {relTime(t.ts)}</span>
              </span>
              <Chevron size={16} className="chev-quiet" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Suppliers — a directory page in the spirit of Granola's Companies list
const SUPPLIER_ROWS = [
  { name: 'Bidfood', domain: 'bidfood.co.uk', last: 'Thursday', orders: 24, sites: 'Holborn, Clapham, Hub kitchen' },
  { name: 'Bean Brothers', domain: 'beanbrothers.co.uk', last: 'Jul 2', orders: 9, sites: 'Holborn, Clapham' },
  { name: 'Estate Dairy', domain: 'estatedairy.co.uk', last: 'Jul 1', orders: 6, sites: 'Richmond' },
  { name: 'Fitzroy Bakehouse', domain: 'fitzroybakehouse.co.uk', last: 'Jun 29', orders: 18, sites: 'Fitzroy Espresso' }
]

export function SuppliersPage({ onAdd }) {
  const [tab, setTab] = useState('all')
  return (
    <div className="journal dir-page">
      <div className="dir-head">
        <h1>Suppliers</h1>
        <div className="dir-tabs">
          <button className={`pill-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All suppliers</button>
          <button className={`pill-tab ${tab === 'here' ? 'active' : ''}`} onClick={() => setTab('here')}>Used at this site</button>
          <button className="btn btn-primary dir-add" onClick={onAdd}>Add supplier</button>
        </div>
      </div>
      <div className="dir-table">
        <div className="dir-thead"><span>Supplier</span><span className="dir-c2">Sites</span><span className="dir-c3">Last order</span><span className="dir-c4">Orders</span></div>
        {SUPPLIER_ROWS.filter(r => tab === 'all' || /Fitzroy/.test(r.sites)).map(r => (
          <div key={r.name} className="dir-row">
            <div className="dir-main">
              <span className="dir-avatar">{r.name[0]}</span>
              <div>
                <div className="dir-name">{r.name}</div>
                <div className="dir-domain">{r.domain}</div>
              </div>
            </div>
            <span className="dir-c2 dir-muted">{r.sites}</span>
            <span className="dir-c3 dir-muted">{r.last}</span>
            <span className="dir-c4 dir-muted">{r.orders}</span>
          </div>
        ))}
      </div>
      <div className="space-hint spaced">Directory view. Adding or changing a supplier happens through Edify — it asks only for what it can't already infer.</div>
    </div>
  )
}

// Simple object lists — persistent business objects, not task lists. Rows
// reflect confirmed state; live cases surface extra rows so the demo shows a
// confirmed object landing in its Space.
const SPACE_LISTS = {
  orders: {
    cols: ['Order', 'Supplier', 'Delivery', 'Status'],
    rows: [
      { c: ['#2231', 'Bidfood', 'Sat 07:30', 'Confirmed'], tone: 'ok' },
      { c: ['#2208', 'Bidfood', 'Thu 07:30', 'Completed'], tone: 'muted' },
      { c: ['#5117', 'Estate Dairy', 'Today 14:30', 'Due'], tone: 'due' }
    ]
  },
  deliveries: {
    cols: ['Delivery', 'Supplier', 'Arrived', 'Status'],
    rows: [
      { c: ['#912', 'Bidfood', 'Sat 07:42', 'Received'], tone: 'ok' },
      { c: ['#5117', 'Estate Dairy', '—', 'Due today'], tone: 'due' },
      { c: ['#889', 'Fitzroy Bakehouse', 'Fri 06:20', 'Received'], tone: 'muted' }
    ]
  },
  inventory: {
    cols: ['Item', 'On hand', 'Count', 'Variance'],
    rows: [
      { c: ['Whole milk', '8 L', 'Corrected', '—'], tone: 'ok' },
      { c: ['Oatly Barista oat milk', '78 L', 'Received', '2 L short'], tone: 'due' },
      { c: ['Espresso blend', '12 kg', 'Matched', '—'], tone: 'muted' }
    ]
  },
  invoices: {
    cols: ['Invoice', 'Supplier', 'Amount', 'Status'],
    rows: [
      { c: ['#4902', 'Bidfood', '£1,269.00', 'Waiting for supplier'], tone: 'due' },
      { c: ['#4821', 'Bidfood', '£1,249.60', 'Waiting for supplier'], tone: 'due' },
      { c: ['#4790', 'Fitzroy Bakehouse', '£212.40', 'Matched'], tone: 'ok' }
    ]
  }
}

export function SpacePage({ spaceId }) {
  const s = ALL_PAGES.find(x => x.id === spaceId) || SPACES[0]
  const list = SPACE_LISTS[spaceId]
  if (!list) return null
  return (
    <div className="journal dir-page">
      <div className="dir-head"><h1>{s.name}</h1></div>
      <div className="obj-table">
        <div className="obj-thead">{list.cols.map(c => <span key={c}>{c}</span>)}</div>
        {list.rows.map((r, i) => (
          <div key={i} className={`obj-row ${r.tone}`}>
            {r.c.map((cell, j) => (
              <span key={j} className={j === 0 ? 'obj-c-name' : j === r.c.length - 1 ? `obj-c-status ${r.tone}` : 'obj-c-mut'}>{cell}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="space-hint spaced">Objects live here once confirmed. Changes happen through Edify — from Home, the command bar, or free text.</div>
    </div>
  )
}

export function Toasts({ toasts, dismiss }) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} className="toast success" layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
            <span className="t-icon"><Check size={12} stroke={1.9} /></span>
            <div className="t-body">
              <span className="t-title">{t.title}</span>
              {t.sub && <span className="t-sub">{t.sub}</span>}
            </div>
            {t.action && <button className="t-action" onClick={() => { t.action.fn(); dismiss(t.id) }}>{t.action.label}</button>}
            <button className="t-close" onClick={() => dismiss(t.id)}><X size={16} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * A lightweight toast, not a modal: urgency pill, one short line, one action,
 * ✕. Closing only dismisses the notification — the job stays on Home.
 */
const INTERRUPT_ICONS = { clock: Clock, truck: Truck, invoice: Doc, alert: Alert }

export function Interrupt({ data, onAction, onDismiss }) {
  const Ico = INTERRUPT_ICONS[data?.icon] || Clock
  return (
    <AnimatePresence>
      {data && (
        <motion.div className="interrupt" initial={{ opacity: 0, y: -18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
          <Ico size={16} className="i-ico" />
          {data.meta && (
            <span className="deadline-chip i-meta">{data.meta}</span>
          )}
          <span className="i-title">{data.title}</span>
          <button className="i-act" onClick={onAction}>{data.cta}</button>
          <button className="i-close" onClick={() => onDismiss('close')}><X size={16} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
