import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Plus, Mic, SlashSq, Camera, X, Doc } from './Icons.jsx'

const COMMANDS = [
  { cmd: '/add-supplier', desc: 'Set up a new supplier', maps: 'Add supplier' },
  { cmd: '/update-supplier', desc: 'Change a supplier’s details', maps: 'Update supplier' },
  { cmd: '/delete-supplier', desc: 'Remove a supplier from this site', maps: 'Delete supplier' },
  { cmd: '/order', desc: 'Change or review an order', maps: "Add 20 litres of oat milk to Saturday's order" },
  { cmd: '/gp', desc: 'Margin breakdown for this site', maps: 'Why is GP% down at this site this week?' },
  { cmd: '/invoice', desc: 'Review a flagged invoice', maps: 'Review Bidfood invoice #4821' },
  { cmd: '/count', desc: 'Check or fix a stock count', maps: "Check yesterday's whole milk count" }
]

const DICTATION = "Add 20 litres of oat milk to Saturday's order"

export default function Composer({ placeholder, hint, onSend, autoFocus }) {
  const [input, setInput] = useState('')
  const [attach, setAttach] = useState(null)
  const [plusOpen, setPlusOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const taRef = useRef(null)

  const slashOpen = input.startsWith('/')
  const token = input.trim().split(' ')[0]
  const matches = COMMANDS.filter(c => c.cmd.startsWith(token))

  const send = (text) => {
    const t = (text ?? input).trim()
    if (!t && !attach) return
    const payload = t || (attach ? `Attached ${attach}` : '')
    setInput('')
    const file = attach
    setAttach(null)
    const cmd = COMMANDS.find(c => c.cmd === t.split(' ')[0])
    onSend(cmd ? cmd.maps : payload, file)
  }

  const dictate = () => {
    if (listening) return
    setListening(true)
    setTimeout(() => {
      setListening(false)
      setInput(DICTATION)
      taRef.current?.focus()
    }, 1700)
  }

  return (
    <div className="composer-shell">
      <AnimatePresence>
        {plusOpen && (
          <>
            <div className="pop-overlay" onClick={() => setPlusOpen(false)} />
            <motion.div className="pop-menu" initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.14 }}>
              <button className="pop-item" onClick={() => { setAttach('delivery-note.jpg'); setPlusOpen(false) }}>
                <Camera size={16} /> <span>Add photo or file</span><span className="pop-hint">counts, labels, delivery notes</span>
              </button>
              <button className="pop-item" onClick={() => { setPlusOpen(false); setInput('/'); taRef.current?.focus() }}>
                <SlashSq size={16} /> <span>Slash commands</span><span className="pop-hint">/order /gp /waste…</span>
              </button>
            </motion.div>
          </>
        )}
        {slashOpen && matches.length > 0 && (
          <motion.div key="slash" className="pop-menu wide" initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}>
            {matches.map(c => (
              <button key={c.cmd} className="pop-item" onClick={() => send(c.cmd)}>
                <span className="cmd">{c.cmd}</span><span className="pop-hint">{c.desc}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="composer split">
        {attach && (
          <motion.div className="attach-chip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <Doc size={16} /> {attach}
            <button onClick={() => setAttach(null)} aria-label="Remove attachment"><X size={16} /></button>
          </motion.div>
        )}
        <div className="cmd-input">
          <button className="icon-btn" aria-label="Add" onClick={() => setPlusOpen(o => !o)}><Plus size={16} /></button>
          <textarea ref={taRef} rows={1} placeholder={listening ? 'Listening…' : placeholder} value={input}
            autoFocus={autoFocus} disabled={listening}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              if (e.key === 'Escape') setInput('')
            }} />
          <button className={`icon-btn ${listening ? 'mic-live' : ''}`} aria-label="Dictate" onClick={dictate}><Mic size={16} /></button>
          <button className="send" disabled={(!input.trim() && !attach) || listening} onClick={() => send()}><ArrowUp size={16} /></button>
        </div>
        <div className="cmd-toolbar">
          <span className="hint">{listening ? 'Listening — try “add 20 litres of oat milk…”' : hint}</span>
        </div>
      </div>
    </div>
  )
}
