import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Trash2, Loader2, AlertTriangle, History } from 'lucide-react'
import { api, friendlyError } from '../api.js'
import { useLocale } from '../i18n/index.jsx'
import { WorkSubShell, useSessions, useOpenSession, sessionLabel, stepStats, fmtDate, statusOf, SkeletonRows, LoadError, PageHead, EmptyState, useInShell } from './WorkTasks.jsx'
import SessionRow from './work/SessionRow.jsx'

// ---------------------------------------------------------------------------
// Session logs (/work/logs): every session the user started, newest first,
// with Open/Resume and an accountable Delete.
//
// Shell, hook and row helpers come from WorkTasks.jsx (one source). Inside the
// app shell the rows are the shared SessionRow recipe (wd-sess*) and the
// delete modal is the dashboard's own (wd-modal*), both on the .wd tokens;
// the legacy standalone host keeps its ws-* markup. Delete requires a REASON
// before the button enables, sent with api.workDelete(id, reason) (DELETE
// /api/work/sessions/:id?reason=...), the same call the dashboard makes. The
// server records who / when / why / what for administrators.
// ---------------------------------------------------------------------------
export default function WorkLogs({ embedded } = {}) {
  const { t, tag } = useLocale()
  const inShell = useInShell(embedded)
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
  const p = inShell ? 'wd' : 'ws'   // modal class prefix (dashboard recipe in the shell)
  const rows = sessions.map((s) => {
    const st = stepStats(s)
    const status = statusOf(s)
    const ended = status.key === 'ended'
    const when = fmtDate(ended ? (s.endedAt || s.startedAt) : s.startedAt, true, tag)
    const cur = !ended && Array.isArray(s.steps) ? s.steps[s.currentStep] : null
    const acts = (
      <>
        <button type="button" className={inShell ? 'wd-resume' : `ws-btn${ended ? '' : ' go'}`} onClick={() => open(s.id)}>{ended ? t('workShell.tasks.open') : t('workShell.tasks.resume')} <ArrowRight size={14} /></button>
        <button type="button" className={inShell ? 'wd-del' : 'ws-del'} title={t('workDashboard.sessions.delete')} aria-label={t('workShell.logs.deleteAria', { title: label(s) })} onClick={() => askDelete(s)}><Trash2 size={15} /></button>
      </>
    )
    if (inShell) {
      return (
        <SessionRow key={s.id} state={status.key} title={label(s)} status={t(status.labelKey, status.label)}
          meta={[
            when ? t(ended ? 'workShell.logs.completedOn' : 'workShell.logs.startedOn', { when }) : null,
            t.rich('workShell.tasks.steps', { done: st.done, total: st.total }, { n: (c) => <span className="wd-sess-done">{c}</span> }),
            cur && cur.text ? <span className="cur" title={cur.text}>{t('workShell.logs.atStep', { step: cur.text })}</span> : null,
          ]}
          pct={st.total > 0 ? st.pct : undefined}>
          {acts}
        </SessionRow>
      )
    }
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
        <div className="ws-row-acts">{acts}</div>
      </div>
    )
  })
  return (
    <WorkSubShell active="logs" title={t('workShell.nav.logs')} embedded={embedded}>
      <PageHead icon={<History size={18} />} title={t('workShell.nav.logs')} count={loaded && !err && sessions.length > 0 ? sessions.length : null} lead={t('workShell.logs.lead')} inShell={inShell} />
      {!loaded ? (
        <SkeletonRows />
      ) : err ? (
        <LoadError onRetry={reload} />
      ) : sessions.length === 0 ? (
        <EmptyState icon={<History size={20} />} title={t('workDashboard.sessions.emptyTitle')} inShell={inShell}>
          {t.rich('workShell.logs.emptyBody', null, { dash: (c) => <Link to="/work" className={inShell ? 'wd-link' : 'ws-link'}>{c}</Link> })}
        </EmptyState>
      ) : (
        <div className={inShell ? 'wd-sess-list' : 'ws-list'} role="list" aria-label={t('workShell.nav.logs')}>{rows}</div>
      )}

      {delTarget && (
        <div className={`${p}-modal-ov`} onClick={closeModal}>
          <div className={`${p}-modal`} role="dialog" aria-modal="true" aria-labelledby="ws-del-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="ws-del-title"><Trash2 size={17} /> {t('workDashboard.del.title')}</h3>
            <div className={`${p}-modal-sess`} title={label(delTarget)}>{label(delTarget)}</div>
            <label htmlFor="ws-delreason">{t('workDashboard.del.reasonLabel')} <span className="req">{t('workDashboard.del.required')}</span></label>
            <textarea id="ws-delreason" rows={3} value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder={t('workDashboard.del.reasonPlaceholder')} autoFocus disabled={delBusy} />
            <div className={`${p}-modal-note`}>{t('workShell.logs.deleteNote')}</div>
            {delErr && <div className={inShell ? 'wd-note warn' : 'ws-modal-err'} role="alert"><AlertTriangle size={15} /> <span>{delErr}</span></div>}
            <div className={`${p}-modal-btns`}>
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={delBusy}>{t('workDashboard.del.cancel')}</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={!canDelete}>{delBusy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} {t('workDashboard.del.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </WorkSubShell>
  )
}
