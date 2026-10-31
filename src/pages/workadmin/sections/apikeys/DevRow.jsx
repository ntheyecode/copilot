// One compact, expandable row for the API keys and Webhooks lists (the platform
// rule: lists of multi-field items collapse to rows that expand on click). The
// head carries an icon, a title (the only part that truncates), a second muted
// line, a nowrap chip group and the chevron; `children` is the expanded body.
// Presentational only; the parent owns the open set.
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useT } from '../../../../i18n/index.jsx'

export default function DevRow({ id, icon, title, sub, chips, open, onToggle, faded = false, children }) {
  const t = useT()
  const bodyId = `wka-dev-body-${id}`
  return (
    <div className={`wka-dev-row${open ? ' open' : ''}${faded ? ' faded' : ''}`}>
      <button type="button" className="wka-dev-head" aria-expanded={open} aria-controls={bodyId}
        title={open ? t('apiKeys.row.collapse') : t('apiKeys.row.expand')} onClick={onToggle}>
        <span className="wka-dev-ic" aria-hidden>{icon}</span>
        <span className="wka-dev-title">
          <span className="nm" title={typeof title === 'string' ? title : undefined}>{title}</span>
          {sub ? <span className="sb">{sub}</span> : null}
        </span>
        {chips ? <span className="wka-dev-chips">{chips}</span> : null}
        <span className="wka-dev-chev" aria-hidden>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {open ? <div className="wka-dev-body" id={bodyId}>{children}</div> : null}
    </div>
  )
}
