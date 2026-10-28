// ONE compact session row for every list in the app: the dashboard's Resume
// rows, My tasks, Completed, Logs, and the standalone-tasks area on Projects.
// White face, hairline, tinted icon tile (blue = in progress, green = done,
// neutral = paused), a title line, a muted meta line with an optional tinted
// status chip, an optional progress bar, and the actions slot (ghost pills,
// nowrap). Styled by the .wd-sess* rules in workApp.css.js (their single
// owner); this component is the single owner of the MARKUP, so a task reads
// the same everywhere (SUPREME II). Props:
//   state    'active' | 'paused' | 'ended'   (icon tile tint + glyph)
//   title    the session label (sessionLabel from WorkTasks.jsx)
//   status   optional translated status text -> a tinted chip at the start of meta
//   meta     the rest of the meta line (nodes); separators are added here
//   pct      0..100 -> a slim progress bar under the meta (omit to hide)
//   children the actions (buttons / menus), rendered after the text column
import { Play, Pause, Check } from 'lucide-react'

const GLYPH = { active: Play, paused: Pause, ended: Check }

export default function SessionRow({ state = 'active', title, status, meta, pct, children, className = '' }) {
  const Icon = GLYPH[state] || Play
  const parts = Array.isArray(meta) ? meta.filter((m) => m != null && m !== false && m !== '') : (meta != null && meta !== '' ? [meta] : [])
  return (
    <div className={`wd-sess${className ? ' ' + className : ''}`} role="listitem">
      <span className={`wd-sess-ic ${state === 'ended' ? 'done' : state}`} aria-hidden><Icon size={14} /></span>
      <div className="wd-sess-main">
        <div className="wd-sess-title" title={typeof title === 'string' ? title : undefined}>{title}</div>
        {(status || parts.length > 0) && (
          <div className="wd-sess-meta">
            {status && <span className={`wd-sess-st ${state}`}>{status}</span>}
            {parts.map((m, i) => <span key={i} className="wd-sess-m">{(status || i > 0) && <span className="wd-sess-sep" aria-hidden>&middot;</span>}{m}</span>)}
          </div>
        )}
        {typeof pct === 'number' && <div className="wd-sess-bar" aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>}
      </div>
      {children && <div className="wd-sess-acts">{children}</div>}
    </div>
  )
}
