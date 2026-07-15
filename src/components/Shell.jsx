import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Journal as JournalIcon, ChatIcon, Search, ChevDown, Chevron, Cart, Truck, Box, Building, Check, X, Clock, Alert, Doc } from './Icons.jsx'
import { GrainSwatch } from './Recipes.jsx'
import { DirectoryPage, PrimaryObjectCell, StatusCell, StatusChip } from './Page.jsx'
import { CloseIconButton } from './Controls.jsx'

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
export function Sidebar({ view, space, setView, openSpace, needsCount, demo }) {
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

      {demo && <div className="sidebar-bottom">{demo}</div>}
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
    return name || 'No supplier selected'
  }
  return t.userText || t.sub || 'Conversation'
}
// Context: what structured work, if any, the conversation is tied to.
const CTX = { oatmilk: 'Order #2231', cutoff: 'Order #2231', delivery: 'Order #2231', invoice: 'Invoice #4821', gp: 'Question', count: 'Stock count', muffins: 'Production' }
const chatContext = (t) => {
  if (t.scenarioId === 'supplier') return t.supplierFlow?.supplierName ? (t.supplierFlow?.phase === 'done' ? 'Supplier' : 'Supplier draft') : 'Question'
  return CTX[t.scenarioId] || 'Question'
}

const CHAT_TABS = [{ key: 'all', label: 'All' }, { key: 'question', label: 'Questions' }, { key: 'work', label: 'Linked to work' }]
const chatTags = (t) => {
  const ctx = chatContext(t)
  return ctx === 'Question' ? ['question'] : ['work']
}

export function ChatsPage({ threads, onOpen }) {
  const rows = threads.map(t => ({
    key: t.id, tags: chatTags(t), search: `${chatTitle(t)} ${chatSub(t)} ${chatContext(t)}`,
    onClick: () => onOpen(t.id),
    cells: [
      <PrimaryObjectCell key="c" name={chatTitle(t)} sub={chatSub(t)} />,
      <span key="x" className="dc-mut">{chatContext(t)}</span>,
      <span key="u" className="dc-mut">{relTime(t.ts)}</span>
    ]
  }))
  return (
    <DirectoryPage title="Chats" tabs={CHAT_TABS} rows={rows}
      template="minmax(0,1.7fr) minmax(0,1fr) minmax(0,0.6fr)"
      cols={[{ label: 'Conversation' }, { label: 'Context' }, { label: 'Updated', align: 'right' }]} />
  )
}

// Suppliers — a directory in the spirit of Granola's Companies list. The
// only page action is Add supplier: a contextual shortcut into the same
// Edify conversation that /add-supplier and free text use, site preselected.
const SUPPLIER_ROWS = [
  { name: 'Bidfood', domain: 'bidfood.co.uk', last: 'Thursday', orders: 24, sites: 'Holborn, Clapham, Hub kitchen' },
  { name: 'Bean Brothers', domain: 'beanbrothers.co.uk', last: 'Jul 2', orders: 9, sites: 'Holborn, Clapham' },
  { name: 'Estate Dairy', domain: 'estatedairy.co.uk', last: 'Jul 1', orders: 6, sites: 'Richmond' },
  { name: 'Fitzroy Bakehouse', domain: 'fitzroybakehouse.co.uk', last: 'Jun 29', orders: 18, sites: 'Fitzroy Espresso' }
]
const SUPPLIER_TABS = [{ key: 'all', label: 'All suppliers' }, { key: 'here', label: 'Used at this site' }]

export function SuppliersPage({ onAdd, added = [] }) {
  const addedRows = added.map(s => ({ name: s.name, domain: (s.orderEmail || '').split('@')[1] || '', last: 'just now', orders: 0, sites: 'Fitzroy Espresso' }))
  const rows = [...addedRows, ...SUPPLIER_ROWS].map(r => ({
    key: r.name, tags: /Fitzroy/.test(r.sites) ? ['here'] : [], search: `${r.name} ${r.domain} ${r.sites}`,
    cells: [
      <PrimaryObjectCell key="n" initial={r.name[0]} name={r.name} sub={r.domain} />,
      <span key="s" className="dc-mut">{r.sites}</span>,
      <span key="l" className="dc-mut">{r.last}</span>,
      <span key="o" className="dc-mut">{r.orders}</span>
    ]
  }))
  return (
    <DirectoryPage title="Suppliers" tabs={SUPPLIER_TABS} rows={rows}
      action={{ label: 'Add supplier', fn: onAdd }}
      template="minmax(0,1.6fr) minmax(0,1.4fr) minmax(0,0.8fr) minmax(0,0.5fr)"
      cols={[{ label: 'Supplier' }, { label: 'Sites' }, { label: 'Last order' }, { label: 'Orders', align: 'right' }]} />
  )
}

// Object lists — persistent business objects. One clear meaning per column;
// red only where attention is genuinely required (never passive waiting).
const num = (v) => <span className="dc-mut">{v}</span>
const SPACE_LISTS = {
  orders: {
    template: 'minmax(0,0.7fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
    cols: [{ label: 'Order' }, { label: 'Supplier' }, { label: 'Delivery' }, { label: 'Status', align: 'right' }],
    rows: [
      { id: '#2231', supplier: 'Bidfood', delivery: 'Sat 07:30', status: 'Confirmed', tone: 'active' },
      { id: '#2208', supplier: 'Bidfood', delivery: 'Thu 07:30', status: 'Completed', tone: 'success' },
      { id: '#5117', supplier: 'Estate Dairy', delivery: 'Today 14:30', status: 'Due now', tone: 'attention' }
    ].map(r => ({ key: r.id, search: `${r.id} ${r.supplier} ${r.status}`, cells: [
      <PrimaryObjectCell key="i" name={r.id} />, num(r.supplier), num(r.delivery), <StatusChip key="s" label={r.status} tone={r.tone} />] }))
  },
  deliveries: {
    template: 'minmax(0,0.7fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,0.9fr)',
    cols: [{ label: 'Delivery' }, { label: 'Supplier' }, { label: 'Timing' }, { label: 'Status', align: 'right' }],
    rows: [
      { id: '#912', supplier: 'Bidfood', timing: 'Arrived Sat 07:42', status: 'Received', tone: 'success' },
      { id: '#5117', supplier: 'Estate Dairy', timing: 'Due today 14:30', status: 'Needs check-in', tone: 'attention' },
      { id: '#889', supplier: 'Fitzroy Bakehouse', timing: 'Arrived Fri 06:20', status: 'Received', tone: 'success' }
    ].map(r => ({ key: r.id, search: `${r.id} ${r.supplier} ${r.timing} ${r.status}`, cells: [
      <PrimaryObjectCell key="i" name={r.id} />, num(r.supplier), num(r.timing), <StatusChip key="s" label={r.status} tone={r.tone} />] }))
  },
  inventory: {
    template: 'minmax(0,1.5fr) minmax(0,0.7fr) minmax(0,1fr) minmax(0,0.7fr)',
    cols: [{ label: 'Item' }, { label: 'On hand', align: 'right' }, { label: 'Latest count' }, { label: 'Variance', align: 'right' }],
    rows: [
      { item: 'Whole milk', hand: '8 L', count: '8 L · corrected', variance: '—', tone: 'default' },
      { item: 'Oatly Barista oat milk', hand: '78 L', count: '78 L · received', variance: '−2 L', tone: 'alert' },
      { item: 'Espresso blend', hand: '12 kg', count: '12 kg · matched', variance: '—', tone: 'muted' }
    ].map(r => ({ key: r.item, search: `${r.item} ${r.count}`, cells: [
      <PrimaryObjectCell key="i" name={r.item} />, num(r.hand), num(r.count),
      <StatusCell key="v" label={r.variance} tone={r.variance === '—' ? 'muted' : 'alert'} />] }))
  },
  invoices: {
    template: 'minmax(0,0.7fr) minmax(0,1fr) minmax(0,0.8fr) minmax(0,1.1fr)',
    tabs: [{ key: 'all', label: 'All' }, { key: 'review', label: 'Needs review' }, { key: 'waiting', label: 'Waiting' }, { key: 'resolved', label: 'Resolved' }],
    cols: [{ label: 'Invoice' }, { label: 'Supplier' }, { label: 'Amount', align: 'right' }, { label: 'Status', align: 'right' }],
    rows: [
      { id: '#4902', supplier: 'Bidfood', amount: '£1,269.00', status: 'Waiting for supplier', tone: 'waiting', tag: 'waiting' },
      { id: '#4821', supplier: 'Bidfood', amount: '£1,249.60', status: 'Waiting for supplier', tone: 'waiting', tag: 'waiting' },
      { id: '#4790', supplier: 'Fitzroy Bakehouse', amount: '£212.40', status: 'Resolved', tone: 'success', tag: 'resolved' }
    ].map(r => ({ key: r.id, tags: [r.tag], search: `${r.id} ${r.supplier} ${r.status}`, cells: [
      <PrimaryObjectCell key="i" name={r.id} />, num(r.supplier), num(r.amount), <StatusChip key="s" label={r.status} tone={r.tone} />] }))
  }
}

export function SpacePage({ spaceId }) {
  const s = ALL_PAGES.find(x => x.id === spaceId) || SPACES[0]
  const list = SPACE_LISTS[spaceId]
  if (!list) return null
  return <DirectoryPage title={s.name} tabs={list.tabs} rows={list.rows} template={list.template} cols={list.cols} />
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
          <span className="i-ico"><Ico size={16} /></span>
          <button className="i-body" onClick={onAction}>{data.title}</button>
          {data.cta && <button className="i-act" onClick={onAction}>{data.cta}</button>}
          <CloseIconButton onClick={() => onDismiss('close')} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
