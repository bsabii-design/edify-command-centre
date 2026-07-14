import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PROMISE, cutoffLabel, DAY } from '../data.js'
import { RecipeCover } from './Recipes.jsx'
import Composer from './Composer.jsx'
import { CheckCircle, Bot, Chevron, Clock, Truck, Sun, TrendDown } from './Icons.jsx'

const spring = { type: 'spring', stiffness: 420, damping: 34 }

/**
 * No defer, no snooze. A row leaves this list only when it's resolved.
 * Hiding a job the operator hasn't decided on would put it nowhere she can
 * find it again — there is no inbox, no "my tasks", no second list. If she
 * wants to come back to something later, she says so inside the case, and
 * Edify brings it back here.
 *
 * Nothing appears or moves on hover either: the row tints, the chevron
 * darkens, and the whole row is the target.
 */
function useMinuteTick() {
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 30000); return () => clearInterval(t) }, [])
}

function NeedsRow({ item, onOpen }) {
  useMinuteTick()
  return (
    <motion.div layout className={`brief-row ${item.urgent ? 'is-urgent' : ''}`} onClick={() => onOpen(item)}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.22 } }} transition={spring}>
      {/* The whole row is one slab — stake, bar and text all sit inside the hover. */}
      <div className="row-slab">
        {/* The stake leads: how much is on the line, and which way it points. */}
        <div className="row-stake">
          <div className="stake-value">{item.stake}</div>
          <div className="stake-unit">{item.stakeUnit}</div>
        </div>
        {/* Urgency is carried by the bar and the cut-off chip — one signal, not three. */}
        <div className="row-bar" />
        <div className="row-main">
          <div className="row-title">{item.title}</div>
          <div className="row-sub">{item.why}</div>
        </div>
        {/* A time appears only when it's a deadline that can be missed. */}
        {(item.deadlineTs || item.pressure) && (
          <div className="row-press"><Clock size={16} /> {item.deadlineTs ? cutoffLabel() : item.pressure}</div>
        )}
      </div>
    </motion.div>
  )
}

function ProgressRow({ item, onOpen }) {
  return (
    <motion.div layout className="progress-row" onClick={() => item.threadId && onOpen(item)}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}
      style={{ cursor: item.threadId ? 'pointer' : 'default' }}>
      <span className="progress-pulse" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="q-title">{item.title}</div>
        {item.sub && <div className="q-sub">{item.sub}</div>}
        {item.helper && <div className="q-next">{item.helper}</div>}
      </div>
      <div className="q-right">
        {item.status && <span className="q-status">{item.status}</span>}
        <span className="case-chip">{item.chip}</span>
      </div>
      {item.threadId && <Chevron size={16} className="chev-quiet" />}
    </motion.div>
  )
}

function DoneRow({ item }) {
  return (
    <motion.div layout className={`done-row ${item.by === 'you' ? 'you' : ''}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <span className="done-icon">{item.by === 'edify' ? <Bot size={16} /> : <CheckCircle size={16} />}</span>
      <span className="done-title">{item.title}</span>
      <span className="done-time">{item.time}</span>
    </motion.div>
  )
}

/* Today's context and exceptions only — never the normal state of things.
   A delivery coming, a weather anomaly moving demand, GP materially off.
   A normal staff count or a normal Tuesday shows nothing here.
   Each pill: line icon, muted label, one strong value — no sentences. */
function DayBar({ deliveries }) {
  const [open, setOpen] = useState(null)
  const toggle = (k) => setOpen(o => (o === k ? null : k))
  const next = deliveries[0]
  const pop = (key, body) => (
    <AnimatePresence>
      {open === key && (
        <motion.div className="ds-pop" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
          {body}
        </motion.div>
      )}
    </AnimatePresence>
  )
  return (
    <div className="day-bar">
      {open && <div className="ds-veil" onClick={() => setOpen(null)} />}

      <span className="ds-wrap">
        <button className={`ds-pill ${open === 'delivery' ? 'on' : ''}`} onClick={() => toggle('delivery')}>
          <Truck size={16} className="ds-ico" />
          <span className="ds-text">{deliveries.length === 1 ? 'Delivery' : 'Deliveries'}</span>
          <span className="ds-num">{deliveries.length}, next {next.when}</span>
        </button>
        {pop('delivery', <>
          {deliveries.map(d => (
            <div key={d.id} className="ds-pop-body">{d.name} expected at {d.when}.</div>
          ))}
          <div className="ds-pop-body">Edify will ask you to confirm when it arrives.</div>
        </>)}
      </span>

      <span className="ds-wrap">
        <button className={`ds-pill ${open === 'demand' ? 'on' : ''}`} onClick={() => toggle('demand')}>
          <Sun size={16} className="ds-ico" />
          <span className="ds-text">Weather</span>
          <span className="ds-num">{DAY.weatherDelta}, warmer</span>
        </button>
        {pop('demand', <>
          <div className="ds-pop-body">Saturday is forecast 4° warmer than usual. Expected higher iced drink and oat milk demand.</div>
        </>)}
      </span>

      {/* Left group is operational context; the business signal sits apart,
          flushed right. Shown only while the drift is material. */}
      {Math.abs(DAY.gpDrift) >= 1.5 && (
        <span className="ds-wrap ds-right">
          <button className={`ds-pill ${open === 'gp' ? 'on' : ''}`} onClick={() => toggle('gp')}>
            <TrendDown size={16} className="ds-ico" />
            <span className="ds-text">GP</span>
            <span className="ds-num">−{DAY.gpDrift} pts</span>
          </button>
          {pop('gp', <>
            <div className="ds-pop-body">GP is tracking 3.3 pts below average. Clearest checks: Bidfood invoice and whole milk count.</div>
          </>)}
        </span>
      )}
    </div>
  )
}

export default function Home({ needsItems, inProgress, doneToday, deliveries, onOpen, onSend }) {
  return (
    <div className="home-layout">
      {/* pinned above the scroll, like the menu bar it borrows from */}
      <DayBar deliveries={deliveries} />
      <div className="home-scroll">
        <div className="today">
          <h1 className="page-title">Needs your review</h1>

          {needsItems.length > 0 ? (
            <div className="brief-block">
              <AnimatePresence initial={false}>
                {needsItems.map(item => <NeedsRow key={item.id} item={item} onOpen={onOpen} />)}
              </AnimatePresence>
            </div>
          ) : (
            <div className="empty-note art">
              <div className="empty-art"><RecipeCover color="blue" label="All clear" /></div>
              <div>
                <div className="empty-title">All clear</div>
                Nothing needs your review. Edify is watching {inProgress.length > 0 ? `${inProgress.length} live case${inProgress.length === 1 ? '' : 's'}` : 'the operation'} and will surface anything that needs you.
              </div>
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="brief-section spaced">
              <div className="block-title">In progress</div>
              <div className="watch-list">
                <AnimatePresence initial={false}>
                  {inProgress.map(item => <ProgressRow key={item.id} item={item} onOpen={onOpen} />)}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="brief-section spaced">
            <div className="block-title">Done today</div>
            <div className="brief-block quiet">
              {doneToday.map(item => <DoneRow key={item.id} item={item} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="home-dock">
        <div className="dock-inner">
          <Composer placeholder="Ask Edify, or type / for commands"
            hint={PROMISE} onSend={onSend} />
        </div>
      </div>
    </div>
  )
}
