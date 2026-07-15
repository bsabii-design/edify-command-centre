import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader, PageToolbar } from './Page.jsx'
import { Check, Spark, Alert, Minus } from './Icons.jsx'

/**
 * Journal — a compact chronological activity feed (not a directory table).
 * Each event: a fixed leading icon slot, the event meaning as the focus
 * (title / context / outcome, all Regular — hierarchy through colour), and a
 * quiet Area · Time rail on the right. Full-bleed rows, gutter-aligned text.
 */
const area = (source) => (source || '').includes('—') ? source.split('—').pop().trim() : (source || '')

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

// One fixed slot, one icon system: system handled / confirmed / flagged /
// dismissed. Neutral by default; a flagged event is the only red one.
function EventIcon({ e }) {
  if (e.kind === 'flag') return <span className="feed-ico flag"><Alert size={16} /></span>
  if (e.kind === 'dismissed') return <span className="feed-ico"><Minus size={16} /></span>
  if (e.by === 'you') return <span className="feed-ico"><Check size={16} /></span>
  return <span className="feed-ico"><Spark size={16} /></span>
}

// For a flagged event, colour only the issue phrase (up to the first “·”).
function outcomeNodes(detail, flagged) {
  if (!flagged) return detail
  const i = detail.indexOf('·')
  if (i < 0) return <span className="feed-hot">{detail}</span>
  return <><span className="feed-hot">{detail.slice(0, i).trim()}</span>{' '}{detail.slice(i)}</>
}

function FeedRow({ e, onOpenChat }) {
  const [open, setOpen] = useState(false)
  const click = () => (e.threadId ? onOpenChat(e.threadId) : setOpen(o => !o))
  const flagged = e.kind === 'flag'
  return (
    <motion.div layout className="feed-row" onClick={click}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <EventIcon e={e} />
      <div className="feed-main">
        <div className={`feed-title ${e.kind === 'dismissed' ? 'muted' : ''}`}>{e.title}</div>
        {e.object && <div className="feed-ctx">{e.object}</div>}
        {e.detail && <div className="feed-out">{outcomeNodes(e.detail, flagged)}</div>}
        <AnimatePresence initial={false}>
          {open && !e.threadId && (
            <motion.div className="feed-expand" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
              {e.kind === 'dismissed'
                ? `Dismissed at ${e.time}. No action taken — kept here so nothing disappears without a trace.`
                : e.by === 'you'
                ? `Confirmed at ${e.time}. Every side-effect is listed here — nothing else changed.`
                : 'Ran automatically under your standing rules.'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="feed-meta">
        <span className="feed-area">{area(e.source)}</span>
        <span className="feed-time">{e.time}</span>
      </div>
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
      <div className="feed">
        {groups.map(([day, rows]) => rows.length > 0 && (
          <div key={day}>
            <div className="feed-group">{day}</div>
            <AnimatePresence initial={false}>
              {rows.map(e => <FeedRow key={e.id} e={e} onOpenChat={onOpenChat} />)}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {shown.length === 0 && <div className="jhead page-empty">Nothing here yet.</div>}
    </div>
  )
}
