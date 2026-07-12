import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Journal as JournalIcon, Search, ChevDown, Chevron, Cart, Truck, Book, Box, BarChart, Star, Clipboard, Building, Gear, Check, X, Clock, Alert, Doc } from './Icons.jsx'
import { GrainSwatch } from './Recipes.jsx'

// Day-to-day operational reference pages
export const SPACES = [
  { id: 'orders', name: 'Orders', icon: Cart },
  { id: 'deliveries', name: 'Deliveries', icon: Truck },
  { id: 'inventory', name: 'Inventory', icon: Box },
  { id: 'reports', name: 'Reports', icon: BarChart }
]

// Library / setup pages — reached from the mini icon nav at the bottom,
// not as another row of menu items.
export const SETUP = [
  { id: 'recipes', name: 'Recipes', icon: Book },
  { id: 'suppliers', name: 'Suppliers', icon: Building },
  { id: 'checklists', name: 'Checklists', icon: Clipboard },
  { id: 'settings', name: 'Settings', icon: Gear }
]

export const ALL_PAGES = [...SPACES, ...SETUP]

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

export function Sidebar({ view, space, setView, openSpace, needsCount }) {
  return (
    <div className="sidebar">
      <button className="search-box"><Search size={16} /> Search <span className="kbd">⌘K</span></button>

      <button className={`nav-item ${view === 'today' || view === 'chat' ? 'active' : ''}`} onClick={() => setView('today')}>
        <Home size={16} /> <span className="label">Home</span>
        {needsCount > 0 && <span className="badge">{needsCount}</span>}
      </button>
      <button className={`nav-item ${view === 'journal' ? 'active' : ''}`} onClick={() => setView('journal')}>
        <JournalIcon size={16} /> <span className="label">Journal</span>
      </button>

      <NavGroup title="Spaces" items={SPACES} view={view} space={space} openSpace={openSpace} />

      <div className="spacer" />

      {/* Mini nav — the library/setup pages, not another menu list */}
      <div className="mini-nav">
        {SETUP.map(s => (
          <button key={s.id} className={`mini-btn ${view === 'space' && space === s.id ? 'active' : ''}`}
            onClick={() => openSpace(s.id)} aria-label={s.name}>
            <s.icon size={16} />
            <span className="mini-tip">{s.name}</span>
          </button>
        ))}
      </div>

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

export function SpacePage({ spaceId }) {
  const s = ALL_PAGES.find(x => x.id === spaceId) || SPACES[0]
  const Icon = s.icon
  return (
    <div className="journal space-page">
      <div className="space-icon"><Icon size={16} /></div>
      <h1>{s.name}</h1>
      <div className="j-sub">For Fitzroy Espresso.</div>
      <div className="space-body">
        <p>This is where the full <b>{s.name}</b> screen lives — the tables, filters and forms for working manually, exactly as before.</p>
        <p>The <b>Command Centre</b> (Home) sits alongside it: instead of clicking through here, you ask Edify — “<i>why is GP% down?</i>”, “<i>add 20 L oat milk to Saturday's order</i>”, “<i>set up a supplier</i>” — and it does the work, showing its reasoning and asking you to confirm.</p>
        <div className="space-hint">Static reference page in this prototype — the interactive flows live on Home.</div>
      </div>
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
            <span className="t-icon"><Check size={16} /></span>
            <div className="t-body">
              <div className="t-title">{t.title}</div>
              {t.sub && <div className="t-sub">{t.sub}</div>}
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
