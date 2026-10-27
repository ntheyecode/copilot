import { useEffect, useRef, useState, useCallback } from 'react'
import { isStuck, STUCK_MS } from './askFlow.js'

// Client-side STUCK detector. Tracks when the current step index last changed
// and, once the step has sat for STUCK_MS while guiding is live, fires
// `onStuck` once. A dismissed offer snoozes the same step for another full
// interval; advancing to another step resets the clock. The check runs on a
// coarse timer (every 15 s), so it costs nothing while the user works.
//   stepIndex  the current step index (-1 when none)
//   active     true while guiding is live (session open, not ended, not paused,
//              not already on a focus screen)
//   onStuck    called once when the rule trips
// Returns { snooze } so the host can delay the next offer after a dismiss.
const TICK_MS = 15 * 1000

export default function useStuck({ stepIndex, active, onStuck, threshold = STUCK_MS }) {
  const sinceRef = useRef(Date.now())
  const [snoozedUntil, setSnoozedUntil] = useState(0)
  const firedFor = useRef(-1)
  const cb = useRef(onStuck); cb.current = onStuck

  // A new step: restart the clock and allow one new offer for it.
  useEffect(() => { sinceRef.current = Date.now(); firedFor.current = -1; setSnoozedUntil(0) }, [stepIndex])
  // While guiding is not live (paused, answering, ended) the clock does not run.
  useEffect(() => { if (active) sinceRef.current = Date.now() }, [active])

  useEffect(() => {
    if (!active || stepIndex < 0) return undefined
    const check = () => {
      if (firedFor.current === stepIndex) return
      if (isStuck(Date.now() - sinceRef.current, snoozedUntil, Date.now(), threshold)) {
        firedFor.current = stepIndex
        try { cb.current && cb.current() } catch { /* ignore */ }
      }
    }
    const t = setInterval(check, TICK_MS)
    return () => clearInterval(t)
  }, [active, stepIndex, snoozedUntil, threshold])

  const snooze = useCallback(() => { sinceRef.current = Date.now(); firedFor.current = -1; setSnoozedUntil(Date.now() + threshold) }, [threshold])
  return { snooze }
}
