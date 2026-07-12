import { useEffect, useRef, useState } from 'react'

// Reveals `text` progressively, ~3 chars per tick. Calls onDone once.
export function useStream(text, active, onDone, speed = 8) {
  const [shown, setShown] = useState(active ? '' : text)
  const doneRef = useRef(!active)

  useEffect(() => {
    if (!active) { setShown(text); return }
    let i = 0
    setShown('')
    doneRef.current = false
    const id = setInterval(() => {
      i += 3
      setShown(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        doneRef.current = true
        onDone && onDone()
      }
    }, speed)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active])

  return [shown, doneRef.current || shown.length >= text.length]
}

export function useCountdown(seconds, running, onEnd) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (!running) return
    setLeft(seconds)
    const started = Date.now()
    const id = setInterval(() => {
      const rem = seconds - (Date.now() - started) / 1000
      if (rem <= 0) {
        clearInterval(id)
        setLeft(0)
        onEnd && onEnd()
      } else setLeft(rem)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds])
  return left
}
