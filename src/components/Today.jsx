import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PROMISE, cutoffLabel, DAY } from '../data.js'
import { RecipeCover } from './Recipes.jsx'
import Composer from './Composer.jsx'
import { Chevron, ChevDown, Clock, Truck, Sun, TrendDown, Dots } from './Icons.jsx'
import { DeadlineChip } from './Controls.jsx'

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
        {/* A time appears only when it's a deadline that can be missed —
            the same DeadlineChip shown in the task header and notification. */}
        {item.deadlineTs
          ? <DeadlineChip />
          : item.pressure ? <div className="row-press"><Clock size={16} /> {item.pressure}</div> : null}
      </div>
    </motion.div>
  )
}

// Continue — a structured draft the user can resume. A quiet list row: the
// whole row opens it, and on hover it tints and reveals its actions (Resume,
// and a ⋯ menu that will hold delete etc.) — Granola's row pattern.
function ContinueRow({ item, onOpen }) {
  return (
    <motion.div layout className="continue-row" onClick={() => item.threadId && onOpen(item)}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
      <span className="progress-pulse draft" />
      <div className="continue-main">
        <div className="q-title">{item.title}</div>
        {item.sub && <div className="q-sub">{item.sub}</div>}
      </div>
      {/* Revealed on hover. The ⋯ is a placeholder for now — no menu wired up. */}
      <div className="continue-actions">
        <span className="continue-resume">Resume <Chevron size={16} /></span>
        <button className="continue-more" aria-label="More" onClick={e => e.stopPropagation()}>
          <Dots size={16} />
        </button>
      </div>
    </motion.div>
  )
}

// Background monitoring — one compact expandable component that IS the whole
// section (no separate heading). Quieter than Needs your review: a pulsing
// dot for active monitoring, a down chevron that rotates up, two-line rows.
function BackgroundSummary({ items, onOpen }) {
  const [open, setOpen] = useState(false)
  const n = items.length
  return (
    <div className="bg-summary">
      <button className="bg-head" onClick={() => setOpen(o => !o)}>
        <span className="pulse-dot" aria-hidden />
        <span className="bg-count">{n} background task{n === 1 ? '' : 's'}</span>
        <ChevDown size={16} className={`bg-chev ${open ? 'open' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="bg-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            {items.map(it => (
              <button key={it.id} className={`bg-item ${it.threadId ? 'clickable' : ''}`} onClick={() => it.threadId && onOpen(it)}>
                <span className="bg-title">{it.title}</span>
                <span className="bg-meta">{it.meta} · {it.wait}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

export default function Home({ needsItems, continueItems, backgroundItems, deliveries, onOpen, onSend }) {
  return (
    <div className="home-layout">
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
                Nothing needs your review. Edify is watching {backgroundItems.length > 0 ? `${backgroundItems.length} case${backgroundItems.length === 1 ? '' : 's'} in the background` : 'the operation'} and will surface anything that needs you.
              </div>
            </div>
          )}

          {/* Active work — the background monitor sits directly under the
              review card, a compact gap, no separate heading. */}
          {backgroundItems.length > 0 && (
            <div className="bg-slot">
              <BackgroundSummary items={backgroundItems} onOpen={onOpen} />
            </div>
          )}

          {/* Saved unfinished work — set apart by a full-width divider and a
              quieter heading. */}
          {continueItems.length > 0 && (
            <div className="continue-section">
              <div className="home-divider" />
              <div className="continue-heading">Continue</div>
              <div className="watch-list">
                <AnimatePresence initial={false}>
                  {continueItems.map(item => <ContinueRow key={item.id} item={item} onOpen={onOpen} />)}
                </AnimatePresence>
              </div>
            </div>
          )}
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
