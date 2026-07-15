import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, PageToolbar } from './Page.jsx'

/**
 * Journal — confirmed changes and system actions. Header and filters sit at
 * the normal page gutter; the table is full-bleed: its strokes and hover run
 * edge-to-edge across the main content area, while row text keeps the gutter.
 * No leading icons — the issue reads through copy and restrained colour.
 */
const domain = (source) => (source || '').includes('—') ? source.split('—').pop().trim() : (source || '')

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'you', label: 'Confirmed' },
  { key: 'system', label: 'System handled' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'dismissed', label: 'Dismissed' }
]

const matchFilter = (e, f) => {
  if (f === 'you') return e.by === 'you' && e.kind !== 'dismissed'
  if (f === 'system') return e.kind === 'auto'
  if (f === 'flagged') return e.kind === 'flag'
  if (f === 'dismissed') return e.kind === 'dismissed'
  return true
}

// Colour only a leading "£X higher" fragment red — never the whole line.
function detailNodes(detail) {
  const m = (detail || '').match(/^(£[\d.,]+ higher)(.*)$/)
  if (!m) return detail
  return <><span className="j-hot">{m[1]}</span>{m[2]}</>
}

function Row({ e, onOpenChat }) {
  const [open, setOpen] = useState(false)
  const click = () => (e.threadId ? onOpenChat(e.threadId) : setOpen(o => !o))
  return (
    <motion.div layout className={`jrow clickable ${e.kind === 'dismissed' ? 'muted' : ''}`} onClick={click}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <span className="j-event">
        <span className="j-ev-name">{e.title}</span>
        {e.detail && <span className="j-ev-detail">{detailNodes(e.detail)}</span>}
        <AnimatePresence initial={false}>
          {open && !e.threadId && (
            <motion.span className="j-expand" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden', display: 'block' }}>
              {e.kind === 'dismissed'
                ? `Dismissed at ${e.time}. No action taken — kept here so nothing disappears without a trace.`
                : e.by === 'you'
                ? `Confirmed at ${e.time}. Every side-effect is listed here — nothing else changed.`
                : 'Ran automatically under your standing rules.'}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="j-area">{domain(e.source)}</span>
      <span className="j-time">{e.time}</span>
    </motion.div>
  )
}

export default function Journal({ entries, onOpenChat }) {
  const [filter, setFilter] = useState('all')
  const shown = entries.filter(e => matchFilter(e, filter))
  const groups = [['Today', shown]]
  return (
    <div className="journal-view">
      <div className="jhead">
        <PageHeader title="Journal" description="A history of confirmed changes and system actions." />
        <PageToolbar tabs={FILTERS} tab={filter} onTab={setFilter} searchable={false} />
      </div>
      <div className="jtable">
        <div className="jrow jhd">
          <span>Event</span><span className="j-area">Area</span><span className="j-time">Time</span>
        </div>
        {groups.map(([day, rows]) => rows.length > 0 && (
          <div key={day}>
            <div className="jgroup">{day}</div>
            <AnimatePresence initial={false}>
              {rows.map(e => <Row key={e.id} e={e} onOpenChat={onOpenChat} />)}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {shown.length === 0 && <div className="jhead page-empty">Nothing here yet.</div>}
    </div>
  )
}
