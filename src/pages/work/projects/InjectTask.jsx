// "Add to this project": the mid-journey injection affordance. A small modal
// takes the request and an optional "must be done before" task; the server
// dedupes and places it (api.workProjectInject). The result is shown exactly as
// returned (projectModel.classifyInject): already covered by X / added before Y /
// added after Y / added at the end (and whether a loop was avoided).
import { useState } from 'react'
import { Plus, X, Info, Loader2, AlertTriangle, Check, Link2 } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import WdPortal from '../WdPortal.jsx'
import { classifyInject, sortedTasks } from './projectModel.js'

export function InjectNotice({ notice, onDismiss }) {
  const t = useT()
  if (!notice) return null
  const title = (notice.task && notice.task.title) || ''
  const other = (notice.other && notice.other.title) || ''
  const dup = notice.kind === 'duplicate'
  return (
    <div className={`wd-pj-notice${dup ? ' info' : ''}`} role="status">
      {dup ? <Link2 size={15} /> : <Check size={15} />}
      <div className="body">
        {dup ? <><b>{t('workProjects.inject.dupTitle')}.</b> {t('workProjects.inject.dupBody', { title })}</>
          : notice.kind === 'before' ? t.rich('workProjects.inject.before', { title, other })
          : notice.kind === 'after' ? t.rich('workProjects.inject.after', { title, other })
          : <>{t('workProjects.inject.appended', { title })}{notice.cycleAvoided ? ` ${t('workProjects.inject.cycle')}` : ''}</>}
      </div>
      <button type="button" className="x" onClick={onDismiss} aria-label={t('workProjects.inject.dismiss')}><X size={14} /></button>
    </div>
  )
}

export default function InjectTask({ project, onResult }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState('')
  const [blocks, setBlocks] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const candidates = sortedTasks(project).filter((x) => x.state !== 'done')
  const close = () => { if (!busy) { setOpen(false); setErr('') } }
  const submit = async (e) => {
    e.preventDefault()
    const r = request.trim()
    if (!r) { setErr(t('workProjects.inject.errEmpty')); return }
    if (busy) return
    setBusy(true); setErr('')
    try {
      const out = await api.workProjectInject(project.id, { request: r, ...(blocks ? { blocksTaskId: blocks } : {}) })
      const res = classifyInject(project, out)
      if (res.kind === 'error') { setErr(t('workProjects.inject.errGeneric')); setBusy(false); return }
      setBusy(false); setOpen(false); setRequest(''); setBlocks('')
      onResult(res)
    } catch (ex) { setErr(friendlyError(ex, t('workProjects.inject.errGeneric'))); setBusy(false) }
  }
  return (
    <>
      <button type="button" className="wd-pj-btn" onClick={() => setOpen(true)}><Plus size={14} /> {t('workProjects.inject.cta')}</button>
      {open && (
        <WdPortal>
        <div className="wd-modal-ov" onClick={close}>
          <form className="wd-pj-modal" role="dialog" aria-modal="true" aria-labelledby="wd-pj-inj-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <div className="wd-pj-modal-top">
              <span className="wd-wiz-eyebrow"><Plus size={13} /> {t('workProjects.inject.title')}</span>
              <button type="button" className="wd-pj-btn icon" onClick={close} disabled={busy} aria-label={t('workProjects.inject.cancel')}><X size={16} /></button>
            </div>
            <div className="wd-pj-modal-body">
              <h3 id="wd-pj-inj-title">{t('workProjects.inject.title')}</h3>
              <div className="wd-pj-help"><Info size={13} /> <span>{t('workProjects.inject.help')}</span></div>
              <div className="wd-pj-field">
                <textarea className="wd-pj-ta" rows={3} value={request} onChange={(e) => { setRequest(e.target.value); if (err) setErr('') }} placeholder={t('workProjects.inject.ph')} aria-label={t('workProjects.inject.title')} autoFocus disabled={busy} />
              </div>
              {candidates.length > 0 && (
                <div className="wd-pj-field">
                  <label htmlFor="wd-pj-inj-blocks">{t('workProjects.inject.blocks')} <span className="opt">{t('workProjects.create.optional')}</span></label>
                  <select id="wd-pj-inj-blocks" className="wd-pj-select" value={blocks} onChange={(e) => setBlocks(e.target.value)} disabled={busy}>
                    <option value="">{t('workProjects.inject.blocksNone')}</option>
                    {candidates.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}
              {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
            </div>
            <div className="wd-pj-modal-foot">
              <button type="button" className="wd-pj-btn" onClick={close} disabled={busy}>{t('workProjects.inject.cancel')}</button>
              <button type="submit" className="wd-pj-btn primary" disabled={busy || !request.trim()}>{busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} {busy ? t('workProjects.inject.adding') : t('workProjects.inject.submit')}</button>
            </div>
          </form>
        </div>
        </WdPortal>
      )}
    </>
  )
}
