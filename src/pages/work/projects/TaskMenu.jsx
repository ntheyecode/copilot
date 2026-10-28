// The per-task "more" menu: the secondary state transitions projectModel.
// taskActions allows from the task's state (mark done / pause / rerun). Closes
// on outside click and Escape. Pure presentation; the parent runs the call.
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Check, Pause, RotateCcw } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

const ICONS = { done: Check, pause: Pause, rerun: RotateCcw }
const LABEL = { done: 'workProjects.task.markDone', pause: 'workProjects.task.pause', rerun: 'workProjects.task.rerun' }

export default function TaskMenu({ items, title, disabled, onPick }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  if (!items || !items.length) return null
  return (
    <span ref={ref} style={{ display: 'inline-flex' }}>
      <button type="button" className="wd-pj-btn icon" aria-haspopup="menu" aria-expanded={open} aria-label={t('workProjects.task.more', { title })} onClick={() => setOpen((v) => !v)} disabled={disabled}><MoreHorizontal size={16} /></button>
      {open && (
        <div className="wd-pj-menu" role="menu">
          {items.map((k) => { const I = ICONS[k]; return <button key={k} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(k) }}>{I && <I size={14} />} {t(LABEL[k])}</button> })}
        </div>
      )}
    </span>
  )
}
