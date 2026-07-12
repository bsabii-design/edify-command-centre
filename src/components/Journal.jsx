import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Spark, Alert, Minus } from './Icons.jsx'

/**
 * Journal is the operational audit trail — changes and decisions, not UI
 * noise. Compact log rows: small icon, title, one-line description, one
 * quiet metadata line, time on the right. A row with a case opens it;
 * seed rows without one expand in place.
 */
const KIND_ICON = {
  auto: [Spark, 'auto'],
  action: [CheckCircle, 'you'],
  flag: [Alert, 'flag'],
  dismissed: [Minus, 'dis']
}

// Sources arrive either as a bare domain ("Production") or the older
// "Case — Saturday order" form — keep only the domain half.
const domain = (source) => (source || '').includes('—') ? source.split('—').pop().trim() : source

const metaLine = (e) => {
  const d = domain(e.source)
  if (e.kind === 'dismissed') return `Dismissed by Priya · ${d}`
  if (e.kind === 'flag') return `Flagged · ${d}`
  if (e.by === 'you') return `Confirmed by Priya · ${d}`
  return `Automatic · ${d}`
}

function Entry({ e, onOpenChat }) {
  const [open, setOpen] = useState(false)
  const [Icon, tone] = KIND_ICON[e.kind] || KIND_ICON.action
  const isDismissed = e.kind === 'dismissed'
  const click = () => (e.threadId ? onOpenChat(e.threadId) : setOpen(o => !o))
  return (
    <motion.div layout className={`j-entry ${isDismissed ? 'muted' : ''} ${open ? 'open' : ''}`} onClick={click}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="j-event">
        <span className={`j-ico2 ${tone}`}><Icon size={14} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="j-title">{e.title}</div>
          <div className="j-detail">{e.detail}</div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div className="j-expand" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                {isDismissed
                  ? <>Dismissed at {e.time}. No action taken — kept here so nothing disappears without a trace. <span className="j-link" onClick={(ev) => ev.stopPropagation()}>Bring it back →</span></>
                  : e.by === 'you'
                  ? <>Confirmed at {e.time}. Every side-effect is listed here — nothing else changed.</>
                  : <>Ran automatically under your standing rules. <span className="j-link">See the rule →</span></>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="j-source">{metaLine(e)}</div>
      <span className="j-time">{e.time}</span>
    </motion.div>
  )
}

export default function Journal({ entries, onOpenChat }) {
  const [filter, setFilter] = useState('all')
  const filtered = entries.filter(e => {
    if (filter === 'you') return e.by === 'you' && e.kind !== 'dismissed'
    if (filter === 'edify') return e.kind === 'auto'
    if (filter === 'flagged') return e.kind === 'flag'
    if (filter === 'dismissed') return e.kind === 'dismissed'
    return true
  })
  return (
    <div className="journal wide">
      <h1>Journal</h1>
      <div className="j-sub">Track what changed, who confirmed it, and what Edify handled automatically.</div>
      <div className="filter-chips">
        {[['all', 'All'], ['you', 'Confirmed'], ['edify', 'Automatic'], ['flagged', 'Flagged'], ['dismissed', 'Dismissed']].map(([k, label]) => (
          <button key={k} className={`filter-chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      <div className="j-day">Today — Sunday 5 July</div>
      <div className="j-table">
        <div className="j-thead"><span>Event</span><span>Source</span><span className="j-th-time">Time</span></div>
        <AnimatePresence initial={false}>
          {filtered.map(e => <Entry key={e.id} e={e} onOpenChat={onOpenChat} />)}
        </AnimatePresence>
      </div>
      {filtered.length === 0 && (
        <div className="brief-card empty-card">Nothing here yet.</div>
      )}
    </div>
  )
}
