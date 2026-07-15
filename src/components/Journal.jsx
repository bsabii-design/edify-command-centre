import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Alert, Minus } from './Icons.jsx'
import { PageShell, PageHeader, PageToolbar } from './Page.jsx'

/**
 * Journal — confirmed changes and system actions, on the shared page shell
 * but grouped by date. One clear meaning per column: Event · Area · Time.
 * Icons appear only for states that carry meaning (flagged, dismissed).
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

function Row({ e, onOpenChat }) {
  const [open, setOpen] = useState(false)
  const click = () => (e.threadId ? onOpenChat(e.threadId) : setOpen(o => !o))
  const icon = e.kind === 'flag' ? <span className="j-ico flag"><Alert size={14} /></span>
    : e.kind === 'dismissed' ? <span className="j-ico dis"><Minus size={14} /></span> : null
  return (
    <motion.div layout className={`drow clickable j-row ${e.kind === 'dismissed' ? 'muted' : ''}`} onClick={click}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <span className="dc j-event">
        {icon}
        <span className="j-event-txt">
          <span className="j-event-name">{e.title}</span>
          {e.detail && <span className="j-event-detail">{e.detail}</span>}
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
      </span>
      <span className="dc dc-mut">{domain(e.source)}</span>
      <span className="dc num dc-mut">{e.time}</span>
    </motion.div>
  )
}

export default function Journal({ entries, onOpenChat }) {
  const [filter, setFilter] = useState('all')
  const shown = entries.filter(e => matchFilter(e, filter))
  // Grouped by date — the prototype runs on a single day, so one group.
  const groups = [['Today', shown]]
  const template = 'minmax(0,2fr) minmax(0,0.7fr) minmax(0,0.5fr)'
  return (
    <PageShell>
      <PageHeader title="Journal" description="A history of confirmed changes and system actions." />
      <PageToolbar tabs={FILTERS} tab={filter} onTab={setFilter} searchable={false} />
      <div className="dtable" style={{ '--cols': template }}>
        <div className="drow dhead">
          <span className="dc">Event</span><span className="dc">Area</span><span className="dc num">Time</span>
        </div>
        {groups.map(([day, rows]) => rows.length > 0 && (
          <div key={day}>
            <div className="dgroup">{day}</div>
            <AnimatePresence initial={false}>
              {rows.map(e => <Row key={e.id} e={e} onOpenChat={onOpenChat} />)}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {shown.length === 0 && <div className="page-empty">Nothing here yet.</div>}
    </PageShell>
  )
}
