// The guided-task FLOW: what a task looks like, as five beats on one line
// (watching -> next step -> correction -> confirmed -> complete). It is the
// dashboard's onboarding / empty state, shown instead of the "Resume where you
// left off" list until the person has a first session, so they see what will
// happen before they start. Honest copy: the beats are what the console does
// (watches the shared screen, shows the exact next move, catches a wrong turn,
// confirms each step, ends with a report). Styles: taskFlow.css.js.
import { Eye, ListChecks, RotateCcw, CheckCircle2, Flag, ArrowRight, Route } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { TASK_FLOW_CSS } from './taskFlow.css.js'

const BEATS = [
  { id: 'watch', Icon: Eye },
  { id: 'next', Icon: ListChecks },
  { id: 'correct', Icon: RotateCcw },
  { id: 'confirm', Icon: CheckCircle2 },
  { id: 'complete', Icon: Flag },
]
// The first beat is lit from the start; beats 2 to 5 light up as the connector
// reaches them (the per-beat keyframes in the stylesheet share one 7.5 s cycle).

export default function TaskFlow({ onStart, canStart = true }) {
  const t = useT()
  return (
    <section className="wd-tf" aria-label={t('workDashboard.flow.heading')}>
      <style>{TASK_FLOW_CSS}</style>
      <div className="wd-tf-head">
        <span className="wd-ic"><Route size={16} /></span>
        <div>
          <h2>{t('workDashboard.flow.heading')}</h2>
          <p>{t('workDashboard.flow.sub')}</p>
        </div>
      </div>
      <ol className="wd-tf-flow" aria-label={t('workDashboard.flow.aria')}>
        {BEATS.map(({ id, Icon }, k) => (
          <li key={id} className={`wd-tf-node${k === 0 ? ' lit' : ' beat'}`}>
            <span className="wd-tf-ic" aria-hidden><Icon size={19} /></span>
            <span className="wd-tf-n" aria-hidden>{k + 1}</span>
            <div>
              <div className="wd-tf-t">{t(`workDashboard.flow.${id}`)}</div>
              <div className="wd-tf-d">{t(`workDashboard.flow.${id}D`)}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="wd-tf-foot">
        <span className="wd-tf-note">{t('workDashboard.flow.note')}</span>
        {onStart && <button type="button" className="wd-tf-cta" onClick={onStart} disabled={!canStart}>{t('workDashboard.flow.cta')} <ArrowRight size={16} /></button>}
      </div>
    </section>
  )
}
