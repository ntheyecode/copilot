// The company's workflows as collapsed, expandable rows (one per record), with
// a state badge and the lifecycle actions the record's state allows. Expanding a
// row reveals its metadata and authored steps. Publish / revise / retire / delete
// round-trip to the API here; retire and delete confirm first. Small + focused:
// the page (TeachStudio) owns loading and the wizard; this owns the rows.
import React, { useState } from 'react'
import {
  ChevronRight, GraduationCap, Pencil, Rocket, Archive, Copy, Trash2, X, AlertTriangle,
} from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Spinning, ErrorBox } from '../../workadmin/sections/_shared.jsx'
import {
  stateLabelKey, stateBadgeClass, canEditContent, canPublishState, canRetireState, canReviseState,
} from './workflowModel.js'

const META_ROWS = ['owner', 'launchTarget', 'category', 'durationMin', 'version', 'language', 'supportEmail', 'supportContact', 'webLink', 'prerequisites']

function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '' } }

// A small yes/cancel confirm (the delete/retire endpoints take no reason, so the
// shared ReasonModal would force an unused reason). Scoped, dependency-free.
function Confirm({ title, message, confirmLabel, danger, busy, onConfirm, onCancel }) {
  const t = useT()
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="wka-panel" style={{ maxWidth: 440, width: '100%', position: 'relative' }}>
        <button type="button" aria-label={t('teach.list.close')} onClick={() => !busy && onCancel()} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wka-faint)' }}><X size={18} /></button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} style={{ color: danger ? 'var(--wka-red)' : 'var(--wka-accent)' }} /> {title}</h2>
        <p className="desc">{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="wka-btn sm ghost" onClick={onCancel} disabled={busy}>{t('teach.list.cancel')}</button>
          <button type="button" className="wka-btn sm" onClick={onConfirm} disabled={busy} style={danger ? { background: 'var(--wka-red)', borderColor: 'var(--wka-red)', color: '#fff' } : undefined}>{busy ? <Spinning /> : null} {confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowList({ workflows, onEdit, onChanged, onToast }) {
  const t = useT()
  const [openId, setOpenId] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(null)        // { wf, mode: 'retire'|'delete' }
  const [confirmBusy, setConfirmBusy] = useState(false)

  const act = async (wf, fn, toastKey) => {
    setBusyId(wf.id); setErr('')
    try {
      const r = await fn(wf.id)
      onToast && onToast(t(toastKey, { title: wf.meta && wf.meta.title ? wf.meta.title : t('teach.list.untitled') }))
      return r
    } catch (e) { setErr(friendlyError(e, t('teach.list.errAction'))); return null }
    finally { setBusyId('') }
  }

  const publish = async (wf) => { const r = await act(wf, api.workflowPublish, 'teach.list.publishedOk'); if (r) onChanged() }
  const retire = async (wf) => { const r = await act(wf, api.workflowRetire, 'teach.list.retiredOk'); if (r) onChanged() }
  const del = async (wf) => { const r = await act(wf, api.workflowDelete, 'teach.list.deletedOk'); if (r) onChanged() }
  const revise = async (wf) => {
    const r = await act(wf, api.workflowRevise, 'teach.list.revisedOk')
    if (r && r.workflow) onEdit(r.workflow)       // open the fresh draft for editing
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    const { wf, mode } = confirm
    try {
      if (mode === 'retire') await retire(wf)
      else if (mode === 'delete') await del(wf)
    } finally { setConfirmBusy(false); setConfirm(null) }
  }

  return (
    <div>
      {err && <div style={{ marginBottom: 12 }}><ErrorBox error={{ status: 400, message: err }} /></div>}
      <div className="tch-rows">
        {workflows.map((wf) => {
          const open = openId === wf.id
          const title = (wf.meta && wf.meta.title) || t('teach.list.untitled')
          const product = (wf.meta && wf.meta.productName) || ''
          const steps = Array.isArray(wf.steps) ? wf.steps : []
          const rowBusy = busyId === wf.id
          return (
            <div key={wf.id} className={`tch-row${open ? ' open' : ''}`}>
              <button type="button" className="tch-rowhead" aria-expanded={open} onClick={() => setOpenId(open ? null : wf.id)}>
                <ChevronRight size={16} className="tch-chev" />
                <span className="tch-rowmain">
                  <span className="tch-rowtitle">{title}</span>
                  <span className="tch-rowsub">{product ? product + ' · ' : ''}{t.n('teach.list.stepCount', steps.length, { n: steps.length })} · {t('teach.list.updated', { date: fmtDate(wf.updatedAt) })}</span>
                </span>
                <span className="tch-rowmeta">
                  <span className="tch-ver">{t('teach.list.version', { v: wf.version })}</span>
                  <span className={`wka-badge ${stateBadgeClass(wf.state)}`}>{t(stateLabelKey(wf.state))}</span>
                </span>
              </button>
              {open && (
                <div className="tch-rowbody">
                  <div className="tch-detail">
                    {META_ROWS.map((k) => {
                      const v = wf.meta && wf.meta[k] != null ? String(wf.meta[k]).trim() : ''
                      if (!v) return null
                      return <div className="tch-detrow" key={k}><span className="tch-detk">{t('teach.wizard.fieldName.' + k)}</span><span className="tch-detv">{v}</span></div>
                    })}
                  </div>
                  {steps.length > 0 && (
                    <ol className="tch-steplist">
                      {steps.map((s, i) => <li key={s.id || i}><span>{s.instruction}</span></li>)}
                    </ol>
                  )}
                  <div className="tch-rowacts">
                    {canEditContent(wf.state) && <button type="button" className="wka-btn sm primary" disabled={rowBusy} onClick={() => onEdit(wf)}><Pencil size={13} /> {t('teach.list.edit')}</button>}
                    {canPublishState(wf.state) && <button type="button" className="wka-btn sm" disabled={rowBusy} onClick={() => publish(wf)}>{rowBusy ? <Spinning /> : <Rocket size={13} />} {t('teach.list.publish')}</button>}
                    {canReviseState(wf.state) && <button type="button" className="wka-btn sm" disabled={rowBusy} onClick={() => revise(wf)}>{rowBusy ? <Spinning /> : <Copy size={13} />} {t('teach.list.revise')}</button>}
                    {canRetireState(wf.state) && <button type="button" className="wka-btn sm ghost" disabled={rowBusy} onClick={() => setConfirm({ wf, mode: 'retire' })}><Archive size={13} /> {t('teach.list.retire')}</button>}
                    <button type="button" className="wka-btn sm ghost" disabled={rowBusy} title={t('teach.list.deleteTitle')} onClick={() => setConfirm({ wf, mode: 'delete' })} style={{ color: 'var(--wka-red)' }}><Trash2 size={13} /> {t('teach.list.delete')}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {confirm && (
        <Confirm
          danger={confirm.mode === 'delete'}
          title={confirm.mode === 'delete' ? t('teach.list.deleteConfirmTitle') : t('teach.list.retireConfirmTitle')}
          message={confirm.mode === 'delete' ? t('teach.list.deleteConfirmMsg') : t('teach.list.retireConfirmMsg')}
          confirmLabel={confirm.mode === 'delete' ? t('teach.list.deleteConfirm') : t('teach.list.retireConfirm')}
          busy={confirmBusy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
