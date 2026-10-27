import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

// The goal, kept QUIET: one muted, ellipsized line ("Your plan: <title>") that
// expands on tap to the full goal text. It never competes with the step card.
// Shared by the console and the floater; styled by guideView.css.js (.gv-goal).
export default function GoalLine({ title, goal, kicker = 'Your plan' }) {
  const [open, setOpen] = useState(false)
  const t = String(title || '').trim()
  const g = String(goal || '').trim()
  const line = (t && !/^Session \d/.test(t)) ? t : g
  if (!line) return null
  return (
    <button type="button" className={`gv-goal${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} title={open ? 'Collapse' : line}>
      <ChevronRight size={13} aria-hidden="true" />
      <span className="gv-k">{kicker}</span>
      <span className="gv-goal-t">{open && g && g !== line ? <>{line}<br />{g}</> : line}</span>
    </button>
  )
}
