// Executive dashboard card: active workflow issues by kind (every kind shown, so
// a zero reads as "fine"), with a link to the Workflow issues inbox. Workflow
// issues are about published workflows meeting a changed screen, never about a
// person's performance. Hidden when the viewer does not receive workflow
// incidents (403); a load failure shows a small retry, never a dead end.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Signpost, ArrowRight, RefreshCw } from 'lucide-react'
import { api } from '../../api.js'
import { useT } from '../../i18n/index.jsx'
import { activeByKind, activeTotal, kindLabelKey, kindTint, INBOX_PATH } from '../work/incidents/incidentsModel.js'

const POLL_MS = 45000

const CARD_CSS = `
.wka .xi-head { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; }
.wka .xi-ikon { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; flex:0 0 auto;
  background:var(--wka-accent-soft); border:1px solid var(--wka-accent-line); color:var(--wka-accent-dark); }
.wka .xi-titles { min-width:0; flex:1 1 240px; }
.wka .xi-titles h2 { margin:0 0 3px; }
.wka .xi-titles .desc { margin:0; }
.wka .xi-head .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .xi-total { font-family:var(--wka-font-head); font-size:15px; font-weight:700; color:var(--wka-text); margin:14px 0 10px; }
.wka .xi-kinds { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; list-style:none; margin:0; padding:0; }
.wka .xi-kind { border:1px solid var(--wka-line); border-radius:11px; padding:10px 12px; background:var(--wka-panel-2); min-width:0; }
.wka .xi-kind .n { font-family:var(--wka-font-head); font-size:22px; font-weight:700; color:var(--wka-text); font-variant-numeric:tabular-nums; }
.wka .xi-kind .l { display:flex; align-items:flex-start; gap:6px; font-size:12px; line-height:1.35; color:var(--wka-muted); margin-top:2px; min-width:0; }
.wka .xi-kind .l span:last-child { min-width:0; overflow-wrap:anywhere; }
.wka .xi-dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto; margin-top:4px; }
.wka .xi-dot.blue { background:var(--wka-tint-blue-ink); } .wka .xi-dot.red { background:var(--wka-red); }
.wka .xi-dot.amber { background:var(--wka-amber); } .wka .xi-dot.green { background:var(--wka-accent); }
.wka .xi-dot.neutral { background:var(--wka-faint); }
.wka .xi-none { margin:12px 0 0; font-size:13px; color:var(--wka-muted); }
.wka .xi-err { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:12px; font-size:13px; color:var(--wka-muted); }
.wka .xi-err .wka-btn { white-space:nowrap; flex:0 0 auto; }
@media (max-width:900px){ .wka .xi-kinds { grid-template-columns:repeat(3, minmax(0,1fr)); } }
@media (max-width:560px){ .wka .xi-kinds { grid-template-columns:repeat(2, minmax(0,1fr)); } }
`

export default function ExecIncidentsCard() {
  const t = useT()
  const [summary, setSummary] = useState(null)
  const [hidden, setHidden] = useState(false)
  const [failed, setFailed] = useState(false)

  // Only the summary is read, so one row is enough (the counts cover them all).
  const load = useCallback(() => {
    return api.workflowIncidents({ state: 'active', limit: 1 })
      .then((r) => { setSummary((r && r.summary) || {}); setFailed(false) })
      .catch((e) => { if (e && e.status === 403) setHidden(true); else setFailed((prev) => prev || summaryRef.current == null) })
  }, [])
  // Live like the dashboard around it: refresh every 45 s while visible and on
  // return to the tab. A failed refresh keeps the last counts on screen.
  const summaryRef = useRef(null)
  summaryRef.current = summary
  useEffect(() => {
    load()
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  if (hidden) return null
  const total = activeTotal(summary)
  return (
    <section className="wka-panel" aria-labelledby="xi-title">
      <style>{CARD_CSS}</style>
      <div className="xi-head">
        <span className="xi-ikon"><Signpost size={19} /></span>
        <div className="xi-titles">
          <h2 id="xi-title">{t('wfIssues.exec.title')}</h2>
          <p className="desc">{t('wfIssues.exec.desc')}</p>
        </div>
        <a className="wka-btn sm" href={INBOX_PATH}>{t('wfIssues.exec.open')} <ArrowRight size={13} /></a>
      </div>
      {failed ? (
        <div className="xi-err" role="alert">
          <span>{t('wfIssues.exec.err')}</span>
          <button type="button" className="wka-btn sm ghost" onClick={() => { setFailed(false); load() }}><RefreshCw size={13} /> {t('wfIssues.exec.retry')}</button>
        </div>
      ) : summary == null ? null : total === 0 ? (
        <p className="xi-none">{t('wfIssues.exec.none')}</p>
      ) : (
        <>
          <div className="xi-total">{t.n('wfIssues.exec.total', total, { n: total })}</div>
          <ul className="xi-kinds">
            {activeByKind(summary).map(({ kind, n }) => (
              <li key={kind} className="xi-kind">
                <div className="n">{n}</div>
                <div className="l"><span className={`xi-dot ${kindTint(kind)}`} aria-hidden="true" /><span>{t(kindLabelKey(kind))}</span></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
