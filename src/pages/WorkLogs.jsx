import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Trash2, Loader2, AlertTriangle, History } from 'lucide-react'
import { api, friendlyError } from '../api.js'
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
  const { sessions, loaded, err, reload } = useSessions()
  const open = useOpenSession()
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
      setDelErr(friendlyError(e, 'Could not delete the session. Please try again.'))
    } finally { setDelBusy(false) }
  }
  // api.workList already returns newest-first (startedAt desc); keep that order.
  const canDelete = !!delTarget && !!delReason.trim() && !delBusy
  return (
    <WorkSubShell active="logs" title="Session logs" embedded={embedded}>
      <div className="ws-head">
        <span className="ic"><History size={18} /></span>
        <div>
          <h1>Session logs{loaded && !err && sessions.length > 0 && <span className="ws-count">{sessions.length}</span>}</h1>
          <p>Every task you start is logged here.</p>
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
            <b>No sessions yet</b>
            <p>Start a task from your <Link to="/work" className="ws-link">dashboard</Link> and it is logged here. You can pause anytime and come back to the exact step you were on.</p>
          </div>
        </div>
      ) : (
        <div className="ws-list" role="list" aria-label="Session logs">
          {sessions.map((s) => {
            const st = stepStats(s)
            const status = statusOf(s)
            const ended = status.key === 'ended'
            const when = fmtDate(ended ? (s.endedAt || s.startedAt) : s.startedAt, true)
            const cur = !ended && Array.isArray(s.steps) ? s.steps[s.currentStep] : null
            return (
              <div key={s.id} className="ws-row" role="listitem">
                <span className={`ws-row-ic ${status.key}`} aria-hidden><status.Icon size={14} /></span>
                <div className="ws-row-main">
                  <div className="ws-row-t" title={sessionLabel(s)}>{sessionLabel(s)}</div>
                  <div className="ws-row-m">
                    <span className={`ws-st ${status.key}`}>{status.label}</span>
                    {when && <span>{ended ? 'Completed' : 'Started'} {when}</span>}
                    <span className="sep" aria-hidden>&middot;</span>
                    <span><span className="done">{st.done}/{st.total}</span> steps</span>
                    {st.total > 0 && <span className="ws-bar" aria-hidden><i style={{ width: `${st.pct}%` }} /></span>}
                    {cur && cur.text && <span className="cur" title={cur.text}>At: {cur.text}</span>}
                  </div>
                </div>
                <div className="ws-row-acts">
                  <button type="button" className={`ws-btn${ended ? '' : ' go'}`} onClick={() => open(s.id)}>{ended ? 'Open' : 'Resume'} <ArrowRight size={14} /></button>
                  <button type="button" className="ws-del" title="Delete session" aria-label={`Delete session: ${sessionLabel(s)}`} onClick={() => askDelete(s)}><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {delTarget && (
        <div className="ws-modal-ov" onClick={closeModal}>
          <div className="ws-modal" role="dialog" aria-modal="true" aria-labelledby="ws-del-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="ws-del-title"><Trash2 size={17} /> Delete this session?</h3>
            <div className="ws-modal-sess" title={sessionLabel(delTarget)}>{sessionLabel(delTarget)}</div>
            <label htmlFor="ws-delreason">Why are you deleting it? <span className="req">required</span></label>
            <textarea id="ws-delreason" rows={3} value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder="e.g. duplicate, created by mistake, task no longer needed" autoFocus disabled={delBusy} />
            <div className="ws-modal-note">This is recorded in your activity log for administrators: who deleted it, when, the reason, and what the session was about.</div>
            {delErr && <div className="ws-modal-err" role="alert"><AlertTriangle size={15} /> <span>{delErr}</span></div>}
            <div className="ws-modal-btns">
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={delBusy}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={!canDelete}>{delBusy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Delete session</button>
            </div>
          </div>
        </div>
      )}
    </WorkSubShell>
  )
}
