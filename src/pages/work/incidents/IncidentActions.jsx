// What a person can do with one workflow issue. Managers (trainers, PMs, Sr PMs,
// company admins) move it through its lifecycle with an optional note; the
// workflow's author or a company admin can put a suggested step into the
// workflow's draft after confirming that the live workflow keeps running until
// the draft is published. GRC and executives get no buttons (the page notes
// once that they follow issues read-only).
// Failures arrive as i18n keys from useWorkflowIncidents (incidentsModel.errorKey).
import React, { useRef, useState } from 'react'
import { Check, CheckCheck, Archive, RotateCcw, ListPlus, X, ExternalLink, Loader2 } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { ErrorBox } from '../../workadmin/sections/_shared.jsx'
import { useDialogFocus } from './useDialogFocus.js'
import { stateActions, stepNumber, isAdopted, draftHref, NOTE_MAX } from './incidentsModel.js'

const ICON = { acknowledge: Check, resolve: CheckCheck, dismiss: Archive, reopen: RotateCcw }

function AdoptConfirm({ workflow, step, busy, onConfirm, onCancel }) {
  const t = useT()
  const confirmRef = useRef(null)
  const boxRef = useRef(null)
  useDialogFocus(boxRef, { onClose: onCancel, busy, initialRef: confirmRef })
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="wfi-adopt-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div ref={boxRef} className="wka-panel" style={{ maxWidth: 460, width: '100%', position: 'relative' }}>
        <button type="button" aria-label={t('wfIssues.act.cancel')} onClick={() => !busy && onCancel()} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wka-faint)' }}><X size={18} /></button>
        <h2 id="wfi-adopt-title" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24 }}><ListPlus size={18} style={{ color: 'var(--wka-accent)', flex: '0 0 auto' }} /> {t('wfIssues.act.adoptTitle')}</h2>
        <p className="desc" style={{ lineHeight: 1.55 }}>{t('wfIssues.act.adoptBody', { workflow, step })}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="wka-btn sm ghost" style={{ whiteSpace: 'nowrap' }} onClick={onCancel} disabled={busy}>{t('wfIssues.act.cancel')}</button>
          <button type="button" ref={confirmRef} className="wka-btn sm primary" style={{ whiteSpace: 'nowrap' }} onClick={onConfirm} disabled={busy}>{busy ? <Loader2 size={13} className="wfi-spin" /> : <ListPlus size={13} />} {t('wfIssues.act.adoptConfirm')}</button>
        </div>
      </div>
    </div>
  )
}

export default function IncidentActions({ incident, canManage, canOpenDraft, onSetState, onAdopt, onDone }) {
  const t = useT()
  const [pending, setPending] = useState(null)     // { action, to } awaiting its note
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [errKey, setErrKey] = useState('')
  const [confirmAdopt, setConfirmAdopt] = useState(false)
  const actions = stateActions(incident, canManage)
  const title = (incident.workflowRef && incident.workflowRef.title) || t('wfIssues.row.untitled')

  const begin = (a) => { setPending(a); setNote(''); setErrKey('') }
  const submit = async () => {
    if (!pending || busy) return
    setBusy(true); setErrKey('')
    const r = await onSetState(incident.id, pending.to, note)
    setBusy(false)
    if (r.ok) { onDone && onDone({ msgKey: `wfIssues.act.done.${pending.action}` }); setPending(null); setNote('') }
    else setErrKey(r.errKey)
  }
  const adopt = async () => {
    if (busy) return
    setBusy(true); setErrKey('')
    const r = await onAdopt(incident.id)
    setBusy(false); setConfirmAdopt(false)
    if (r.ok) onDone && onDone({ msgKey: 'wfIssues.act.adopted', draftId: r.draftId })
    else setErrKey(r.errKey)
  }

  // A watcher (GRC, executive) with nothing to do here gets no empty bar; the
  // page says once, at the top, that they follow issues read-only.
  const anything = actions.length > 0 || incident.canAdopt || (canOpenDraft && isAdopted(incident) && incident.draftId)
  return (
    <>
      {anything && <div className="wfi-acts">
        {canOpenDraft && isAdopted(incident) && incident.draftId && (
          <a className="wka-btn sm" href={draftHref(incident.draftId)}><ExternalLink size={13} /> {t('wfIssues.act.openDraft')}</a>
        )}
        {incident.canAdopt && (
          <button type="button" className="wka-btn sm primary" disabled={busy} onClick={() => { setErrKey(''); setConfirmAdopt(true) }}><ListPlus size={13} /> {t('wfIssues.act.adopt')}</button>
        )}
        {actions.map((a) => {
          const Icon = ICON[a.action]
          return (
            <button key={a.action} type="button" className={`wka-btn sm${a.action === 'dismiss' ? ' ghost' : ''}`} disabled={busy}
              aria-pressed={pending && pending.action === a.action ? true : undefined} onClick={() => begin(a)}>
              <Icon size={13} /> {t(`wfIssues.act.${a.action}`)}
            </button>
          )
        })}
      </div>}

      {pending && (
        <div className="wfi-notebox">
          <label htmlFor={`wfi-note-${incident.id}`}>{t('wfIssues.act.noteLabel')}</label>
          <textarea id={`wfi-note-${incident.id}`} value={note} maxLength={NOTE_MAX} placeholder={t('wfIssues.act.notePh')}
            onChange={(e) => setNote(e.target.value)} autoFocus />
          <div className="wfi-notebox-acts">
            <button type="button" className="wka-btn sm ghost" onClick={() => setPending(null)} disabled={busy}>{t('wfIssues.act.cancel')}</button>
            <button type="button" className="wka-btn sm primary" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={13} className="wfi-spin" /> : React.createElement(ICON[pending.action], { size: 13 })} {t(`wfIssues.act.confirm.${pending.action}`)}
            </button>
          </div>
        </div>
      )}

      {errKey && <div className="wfi-rowerr" role="alert"><ErrorBox error={{ status: 400, message: t(errKey) }} /></div>}

      {confirmAdopt && (
        <AdoptConfirm workflow={title} step={stepNumber(incident.stepIndex) || 1} busy={busy} onConfirm={adopt} onCancel={() => setConfirmAdopt(false)} />
      )}
    </>
  )
}

