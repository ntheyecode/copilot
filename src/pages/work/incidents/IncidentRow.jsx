// One workflow issue as a compact row that expands on click (platform rule:
// collapse details to rows). Collapsed: workflow title and version, the step
// number and text, the kind, how often it was seen and when last. Expanded: what
// the guide noticed, the suggested step for an untrained path, the screen it saw,
// recent runs (names and times, framed as context about the workflow), the last
// decision, and the actions (IncidentActions).
import React from 'react'
import { ChevronRight, ListPlus, Info } from 'lucide-react'
import { useLocale } from '../../../i18n/index.jsx'
import { kindLabelKey, kindTint, stateLabelKey, stateTint, stepNumber, relTime, absTime, isAdopted, INCIDENT_STATES } from './incidentsModel.js'
import IncidentShot from './IncidentShot.jsx'
import IncidentActions from './IncidentActions.jsx'

export default function IncidentRow({ incident: x, open, onToggle, canManage, canOpenDraft, onSetState, onAdopt, onDone, nowMs }) {
  const { t, tag } = useLocale()
  const ref = x.workflowRef || {}
  const title = ref.title || t('wfIssues.row.untitled')
  const step = stepNumber(x.stepIndex)
  const count = Math.max(1, Number(x.count) || 1)
  const occ = Array.isArray(x.occurrences) ? x.occurrences : []
  const bodyId = `wfi-body-${x.id}`
  const decidedState = isAdopted(x) ? t('wfIssues.state.adopted') : (INCIDENT_STATES.includes(x.state) ? t(`wfIssues.state.${x.state}`) : '')

  return (
    <div className={`wfi-row${open ? ' open' : ''}`} id={`wfi-${x.id}`}>
      <button type="button" className="wfi-rowhead" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={onToggle}>
        <ChevronRight size={16} className="wfi-chev" aria-hidden="true" />
        <span className="wfi-rowmain">
          <span className="wfi-rowtitle"><b dir="auto">{title}</b><span className="wfi-ver">{t('wfIssues.row.version', { v: ref.version || 1 })}</span></span>
          <span className="wfi-rowsub">
            <span className="n">{step != null ? t('wfIssues.row.step', { step }) : t('wfIssues.row.noStep')}</span>
            {x.stepText ? <> · <bdi>{x.stepText}</bdi></> : null}
          </span>
        </span>
        <span className="wfi-rowmeta">
          <span className={`wfi-badge wfi-t-${kindTint(x.kind)}`}>{t(kindLabelKey(x.kind))}</span>
          <span className="wfi-count">{t.n('wfIssues.row.count', count, { n: count })}</span>
          <span className="wfi-when" title={absTime(x.lastAt, tag)}>{t('wfIssues.row.last', { time: relTime(x.lastAt, nowMs, tag) })}</span>
          <span className={`wfi-badge wfi-t-${stateTint(x)}`}>{t(stateLabelKey(x))}</span>
        </span>
      </button>

      {open && (
        <div className="wfi-body" id={bodyId}>
          <div className={`wfi-grid${x.hasFrame ? '' : ' no-shot'}`}>
            <div>
              {x.why && (
                <div className="wfi-sec">
                  <span className="wfi-k">{t('wfIssues.detail.why')}</span>
                  <p className="wfi-v" dir="auto">{x.why}</p>
                </div>
              )}
              {x.stepText && (
                <div className="wfi-sec">
                  <span className="wfi-k">{t('wfIssues.detail.stepText')}</span>
                  <p className="wfi-v" dir="auto">{x.stepText}</p>
                </div>
              )}
              {x.kind === 'untrained_path' && x.extraStep && (
                <div className="wfi-sec wfi-suggest">
                  <span className="wfi-k"><ListPlus size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('wfIssues.detail.suggested')}</span>
                  <p className="wfi-v" dir="auto">{x.extraStep}</p>
                  {!isAdopted(x) && <p className="wfi-hint">{t('wfIssues.detail.suggestedHint')}</p>}
                </div>
              )}
              {occ.length > 0 && (
                <div className="wfi-sec">
                  <span className="wfi-k">{t('wfIssues.detail.runs')}</span>
                  <ul className="wfi-occ">
                    {occ.map((o, i) => (
                      <li key={`${o.at}-${i}`}>
                        <span className="wfi-occ-name" dir="auto">{o.name || t('wfIssues.detail.someone')}</span>
                        <span className="wfi-occ-when" title={absTime(o.at, tag)}>{relTime(o.at, nowMs, tag)}</span>
                        {o.why && o.why !== x.why ? <span className="wfi-occ-why" dir="auto" title={o.why}>{o.why}</span> : null}
                      </li>
                    ))}
                  </ul>
                  <p className="wfi-hint"><Info size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('wfIssues.detail.runsHint')}</p>
                </div>
              )}
              {x.decidedAt && decidedState && x.state !== 'open' && (
                <div className="wfi-sec wfi-decided">
                  {t('wfIssues.detail.decided', { state: decidedState, time: relTime(x.decidedAt, nowMs, tag) })}
                  {x.note ? <> · {t('wfIssues.detail.note')}: <q dir="auto">{x.note}</q></> : null}
                </div>
              )}
            </div>
            {x.hasFrame && (
              <div className="wfi-sec">
                <span className="wfi-k">{t('wfIssues.detail.shot')}</span>
                <IncidentShot incidentId={x.id} masked={x.masked} />
              </div>
            )}
          </div>
          <IncidentActions incident={x} canManage={canManage} canOpenDraft={canOpenDraft} onSetState={onSetState} onAdopt={onAdopt} onDone={onDone} />
        </div>
      )}
    </div>
  )
}
