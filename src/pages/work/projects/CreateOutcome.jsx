// The outcome cards of the create flow, one per server answer (projectModel.
// classifyCreate): single task (start it as a task), refusal (plain), the
// upgrade-or-shorten fork (403 needsUpgrade), the quality gate (422 errors) and
// an invalid/generic error. Each card offers a way forward; none is a dead end.
// Starting a task reuses the ordinary session create (api.workCreate) and opens
// the guided console through the shell's onOpen, exactly like /work/start.
import { useState } from 'react'
import { Loader2, Play, ArrowRight, Sparkles, ShieldAlert, Scissors, ListChecks, AlertTriangle, Pencil } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'

// Start one task from a goal string -> open its console. Errors stay user-safe.
function useStartTask(onOpen) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const start = async (goal) => {
    const g = String(goal || '').trim()
    if (!g || busy) return
    setBusy(true); setErr('')
    try {
      const r = await api.workCreate({ goal: g })
      if (r && r.session && r.session.id) { onOpen(r.session.id, r.guard); return }
      setErr(t('workProjects.outcome.startErr'))
    } catch (e) { setErr(friendlyError(e, t('workProjects.outcome.startErr'))) }
    setBusy(false)
  }
  return { start, busy, err }
}

export function SingleTaskOutcome({ suggestedGoal, goal, onEdit, onOpen }) {
  const t = useT()
  const { start, busy, err } = useStartTask(onOpen)
  const g = suggestedGoal || goal
  return (
    <div className="wd-pj-out info" role="status">
      <h4><ListChecks size={17} /> {t('workProjects.outcome.singleTitle')}</h4>
      <p>{t('workProjects.outcome.singleBody')}</p>
      <div className="wd-pj-k">{t('workProjects.outcome.singleGoal')}</div>
      <div className="wd-pj-out-goal">{g}</div>
      {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
      <div className="wd-pj-out-acts">
        <button type="button" className="wd-pj-btn primary" onClick={() => start(g)} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <Play size={14} />} {busy ? t('workProjects.outcome.starting') : t('workProjects.outcome.singleStart')}</button>
        <button type="button" className="wd-pj-btn" onClick={onEdit} disabled={busy}><Pencil size={13} /> {t('workProjects.outcome.edit')}</button>
      </div>
    </div>
  )
}

export function RefusalOutcome({ text, onEdit }) {
  const t = useT()
  return (
    <div className="wd-pj-out warn" role="alert">
      <h4><ShieldAlert size={17} /> {t('workProjects.outcome.refusalTitle')}</h4>
      <p style={{ color: 'var(--tx)' }}>{text}</p>
      <div className="wd-pj-out-acts">
        <button type="button" className="wd-pj-btn" onClick={onEdit}><Pencil size={13} /> {t('workProjects.outcome.edit')}</button>
      </div>
    </div>
  )
}

// 403 needsUpgrade: Premium upsell + "or shorten it to one task you can start now".
export function UpgradeOutcome({ goal, canUpgrade, upgradeHref, isCompanyMember, onOpen, onEdit }) {
  const t = useT()
  const [short, setShort] = useState(goal || '')
  const { start, busy, err } = useStartTask(onOpen)
  return (
    <div className="wd-pj-out premium" role="status">
      <h4><Sparkles size={17} /> {t('workProjects.outcome.upgradeTitle')}</h4>
      <p>{t('workProjects.outcome.upgradeBody')}</p>
      {isCompanyMember && !canUpgrade && <p>{t('workProjects.outcome.upgradeCompany')}</p>}
      {canUpgrade && (
        <div className="wd-pj-out-acts">
          <a className="wd-pj-btn primary" href={upgradeHref || '/workcopilot/pricing'}><Sparkles size={14} /> {t('workProjects.outcome.upgradeCta')}</a>
        </div>
      )}
      <div className="wd-pj-divider" />
      <h4 style={{ fontSize: 15 }}><Scissors size={16} /> {t('workProjects.outcome.shortenTitle')}</h4>
      <p>{t('workProjects.outcome.shortenHelp')}</p>
      <textarea className="wd-pj-ta" rows={3} value={short} onChange={(e) => setShort(e.target.value)} placeholder={t('workProjects.outcome.shortenPh')} aria-label={t('workProjects.outcome.shortenTitle')} />
      {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
      <div className="wd-pj-out-acts">
        <button type="button" className="wd-pj-btn primary" onClick={() => start(short)} disabled={busy || !short.trim()}>{busy ? <Loader2 size={14} className="spin" /> : <Play size={14} />} {busy ? t('workProjects.outcome.starting') : t('workProjects.outcome.shortenCta')}</button>
        <button type="button" className="wd-pj-btn" onClick={onEdit} disabled={busy}><Pencil size={13} /> {t('workProjects.outcome.edit')}</button>
      </div>
    </div>
  )
}

// 422 quality gate: shown gently with the server's reasons, then back to the goal.
export function QualityOutcome({ errors, onEdit }) {
  const t = useT()
  return (
    <div className="wd-pj-out warn" role="status">
      <h4><AlertTriangle size={17} /> {t('workProjects.outcome.qualityTitle')}</h4>
      <p>{t('workProjects.outcome.qualityBody')}</p>
      {errors && errors.length > 0 && <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      <div className="wd-pj-out-acts">
        <button type="button" className="wd-pj-btn primary" onClick={onEdit}><Pencil size={13} /> {t('workProjects.outcome.edit')} <ArrowRight size={13} /></button>
      </div>
    </div>
  )
}
