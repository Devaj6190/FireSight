// Small motion helpers for the shell. Reduced motion keeps every state change and drops the movement.
import { useEffect, useRef, useState } from 'react'

export const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// a light tick on Android when a control commits; iOS ignores it
export const tap = (ms = 8) => { try { navigator.vibrate?.(ms) } catch { /* not allowed in this frame */ } }

// counts from the previous value to the new one, ease-out, so a changed number reads as a change
export function useCountUp(value: number, ms = 650) {
  const [shown, setShown] = useState(reduced ? value : 0)
  const from = useRef(reduced ? value : 0)
  useEffect(() => {
    if (reduced) return
    const start = performance.now(), a = from.current
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      const v = Math.round(a + (value - a) * (1 - (1 - k) ** 3))
      setShown(v); from.current = v
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return reduced ? value : shown
}
