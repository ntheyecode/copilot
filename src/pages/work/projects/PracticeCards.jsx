// Recommended Practices cards under the task map: up to three small, dismissible
// suggestions (title, one-line rationale, a plain-words source label), each with
// one quiet "Add to the map" action. They sit beside the plan and never block
// it: no suggestions, a non-deep user or any failure renders nothing at all.
// State + I/O live in usePractices.js; this file only renders. Styles:
// projects.css.js (wd-pr-*), on the violet "assist" tint of the design system.
import { Sparkles, Plus, X, Loader2, RotateCcw } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { sourceLabelKey } from './usePractices.js'

export default function PracticeCards({ suggestions, onAccept, onDismiss, busyId, failedId }) {
  const t = useT()
  if (!suggestions || suggestions.length === 0) return null
  return (
    <aside className="wd-pr" aria-label={t('workProjects.practices.heading')}>
      <div className="wd-pr-head">
        <span className="wd-ic ai"><Sparkles size={15} /></span>
        <div>
          <b>{t('workProjects.practices.heading')}</b>
          <p>{t('workProjects.practices.sub')}</p>
        </div>
      </div>
      <div className="wd-pr-list">
        {suggestions.map((s) => {
          const busy = busyId === s.id
          const failed = failedId === s.id
          return (
            <article key={s.id} className="wd-card tint-violet wd-pr-card" aria-label={s.title}>
              <div className="wd-pr-body">
                <div className="wd-pr-t">{s.title}</div>
                {s.rationale && <p className="wd-pr-r">{s.rationale}</p>}
                <span className="wd-pr-src">{t(sourceLabelKey(s.source))}</span>
              </div>
              <div className="wd-pr-acts">
                <button type="button" className={`wd-pj-btn wd-pr-act${failed ? ' failed' : ''}`} onClick={() => onAccept(s.id)} disabled={!!busyId} aria-label={t('workProjects.practices.acceptAria', { title: s.title })}>
                  {busy ? <Loader2 size={13} className="spin" /> : failed ? <RotateCcw size={13} /> : <Plus size={13} />}
                  <span>{busy ? t('workProjects.practices.adding') : failed ? t('workProjects.practices.retry') : t('workProjects.practices.accept')}</span>
                </button>
                <button type="button" className="wd-pr-x" onClick={() => onDismiss(s.id)} disabled={busy} aria-label={t('workProjects.practices.dismissAria', { title: s.title })}><X size={14} /></button>
              </div>
            </article>
          )
        })}
      </div>
    </aside>
  )
}
