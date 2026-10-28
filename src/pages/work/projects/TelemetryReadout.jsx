// Telemetry readout on a task card: only the whitelisted view from
// projectModel.telemetryView (duration, steps, deepened, backup path, confirmed,
// reruns). Nothing here can print a model or provider name by construction.
import { Timer, ListChecks, Layers, GitBranch, Check, AlertTriangle, RotateCcw } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { telemetryView, fmtDur } from './projectModel.js'

export default function TelemetryReadout({ telemetry }) {
  const t = useT()
  const v = telemetryView(telemetry)
  if (!v) return null
  const units = { h: t('workShell.plan.unitH'), min: t('workShell.plan.unitMin'), s: 's' }
  return (
    <div className="wd-pj-tele" aria-label={t('workProjects.task.telemetry.label')}>
      {v.durationSec != null && <span className="wd-pj-chip"><Timer size={11} /> {t('workProjects.task.telemetry.duration', { time: fmtDur(v.durationSec, units) })}</span>}
      {v.steps != null && <span className="wd-pj-chip"><ListChecks size={11} /> {t.n('workProjects.task.telemetry.steps', v.steps)}</span>}
      {v.deepened && <span className="wd-pj-chip"><Layers size={11} /> {t('workProjects.task.telemetry.deepened')}</span>}
      {v.backup && <span className="wd-pj-chip warn"><GitBranch size={11} /> {t('workProjects.task.telemetry.backup')}</span>}
      {v.success === true && <span className="wd-pj-chip ok"><Check size={11} /> {t('workProjects.task.telemetry.success')}</span>}
      {v.success === false && <span className="wd-pj-chip warn"><AlertTriangle size={11} /> {t('workProjects.task.telemetry.unverified')}</span>}
      {v.reruns != null && <span className="wd-pj-chip"><RotateCcw size={11} /> {t.n('workProjects.task.telemetry.rerun', v.reruns)}</span>}
    </div>
  )
}
