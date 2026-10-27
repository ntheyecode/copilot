import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Trash2, Loader2, AlertTriangle, History } from 'lucide-react'
import { api, friendlyError } from '../api.js'
import { useLocale } from '../i18n/index.jsx'
import { WorkSubShell, useSessions, useOpenSession, sessionLabel, stepStats, fmtDate, statusOf, SkeletonRows, LoadError } from './WorkTasks.jsx'

// ---------------------------------------------------------------------------
// Session logs (/work/logs): every session the user started, newest first,
// with Open/Resume and an accountable Delete.
//
// Shell, tokens, hook and row helpers come from WorkTasks.jsx (one source).
// Delete reuses the dashboard's modal: a REASON is required before the Delete
// button enables, and the reason is sent with api.workDelete(id, reason)
// (DELETE /api/work/sessions/:id?reason=...), the same call the dashboard
// makes. The server records who / when / why / what for administrators.
// ---------------------------------------------------------------------------
export default function WorkLogs({ embedded } = {}) {
  const { t, tag } = useLocale()
  const { sessions, loaded, err, reload } = useSessions()
  const open = useOpenSession()
  // Session title + the delete modal read the dashboard's own keys
  // (workDashboard.del.*): same text, one key.
  const untitled = t('workDashboard.del.untitled')
  const label = (s) => sessionLabel(s, untitled)
  const [delTarget, setDelTarget] = useState(null)   // session pending delete (reason modal)
  const [delReason, setDelReason] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')
  // One helper owns the per-target modal state so opening/closing can never
  // leave a stale reason or error behind for the next session.
  const closeModal = () => { if (delBusy) return; setDelTarget(null); setDelReason(''); setDelErr('') }
  const askDelete = (s) => { setDelTarget(s); setDelReason(''); setDelErr('') }
  const confirmDelete = async () => {
    const reason = delReason.trim()
    if (!delTarget || !reason) return
    setDelBusy(true); setDelErr('')
    try {
      await api.workDelete(delTarget.id, reason)
      setDelTarget(null); setDelReason('')
      reload()
    } catch (e) {
      setDelErr(friendlyError(e, t('workDashboard.del.errGeneric')))
    } finally { setDelBusy(false) }
  }
  // api.workList already returns newest-first (startedAt desc); keep that order.
  const canDelete = !!delTarget && !!delReason.trim() && !delBusy
  return (
    <WorkSubShell active="logs" title={t('workShell.nav.logs')} embedded={embedded}>
      <div className="ws-head">
        <span className="ic"><History size={18} /></span>
        <div>
          <h1>{t('workShell.nav.logs')}{loaded && !err && sessions.length > 0 && <span className="ws-count">{sessions.length}</span>}</h1>
          <p>{t('workShell.logs.lead')}</p>
        </div>
      </div>
      {!loaded ? (
        <SkeletonRows />
      ) : err ? (
        <LoadError onRetry={reload} />
      ) : sessions.length === 0 ? (
        <div className="ws-empty">
          <span className="ic"><History size={20} /></span>
          <div>
            <b>{t('workDashboard.sessions.emptyTitle')}</b>
            <p>{t.rich('workShell.logs.emptyBody', null, { dash: (c) => <Link to="/work" className="ws-link">{c}</Link> })}</p>
          </div>
        </div>
      ) : (
        <div className="ws-list" role="list" aria-label={t('workShell.nav.logs')}>
          {sessions.map((s) => {
            const st = stepStats(s)
            const status = statusOf(s)
            const ended = status.key === 'ended'
            const when = fmtDate(ended ? (s.endedAt || s.startedAt) : s.startedAt, true, tag)
            const cur = !ended && Array.isArray(s.steps) ? s.steps[s.currentStep] : null
            return (
              <div key={s.id} className="ws-row" role="listitem">
                <span className={`ws-row-ic ${status.key}`} aria-hidden><status.Icon size={14} /></span>
                <div className="ws-row-main">
                  <div className="ws-row-t" title={label(s)}>{label(s)}</div>
                  <div className="ws-row-m">
                    <span className={`ws-st ${status.key}`}>{t(status.labelKey, status.label)}</span>
                    {when && <span>{t(ended ? 'workShell.logs.completedOn' : 'workShell.logs.startedOn', { when })}</span>}
                    <span className="sep" aria-hidden>&middot;</span>
                    <span>{t.rich('workShell.tasks.steps', { done: st.done, total: st.total }, { n: (c) => <span className="done">{c}</span> })}</span>
                    {st.total > 0 && <span className="ws-bar" aria-hidden><i style={{ width: `${st.pct}%` }} /></span>}
                    {cur && cur.text && <span className="cur" title={cur.text}>{t('workShell.logs.atStep', { step: cur.text })}</span>}
                  </div>
                </div>
                <div className="ws-row-acts">
                  <button type="button" className={`ws-btn${ended ? '' : ' go'}`} onClick={() => open(s.id)}>{ended ? t('workShell.tasks.open') : t('workShell.tasks.resume')} <ArrowRight size={14} /></button>
                  <button type="button" className="ws-del" title={t('workDashboard.sessions.delete')} aria-label={t('workShell.logs.deleteAria', { title: label(s) })} onClick={() => askDelete(s)}><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {delTarget && (
        <div className="ws-modal-ov" onClick={closeModal}>
          <div className="ws-modal" role="dialog" aria-modal="true" aria-labelledby="ws-del-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="ws-del-title"><Trash2 size={17} /> {t('workDashboard.del.title')}</h3>
            <div className="ws-modal-sess" title={label(delTarget)}>{label(delTarget)}</div>
            <label htmlFor="ws-delreason">{t('workDashboard.del.reasonLabel')} <span className="req">{t('workDashboard.del.required')}</span></label>
            <textarea id="ws-delreason" rows={3} value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder={t('workDashboard.del.reasonPlaceholder')} autoFocus disabled={delBusy} />
            <div className="ws-modal-note">{t('workShell.logs.deleteNote')}</div>
            {delErr && <div className="ws-modal-err" role="alert"><AlertTriangle size={15} /> <span>{delErr}</span></div>}
            <div className="ws-modal-btns">
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={delBusy}>{t('workDashboard.del.cancel')}</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={!canDelete}>{delBusy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} {t('workDashboard.del.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </WorkSubShell>
  )
}
