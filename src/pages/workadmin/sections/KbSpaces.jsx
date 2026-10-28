// Knowledge spaces (company console, Brain section): the admin's CRUD over the
// pickable collections of company learnings. List (name + learning count),
// add by name, rename inline, remove (reason-gated through the shared
// ReasonModal; the server keeps the learnings and ungroups them). Bound to
// /api/work/company/kb-spaces. One hairline panel in the console recipe: tinted
// count badges, ghost row actions, one filled primary (Add). Every row stays
// one line: the name truncates, the badge + actions never wrap.
import { useCallback, useEffect, useState } from 'react'
import { Library, Plus, Pencil, Trash2, Check, X, ShieldCheck } from 'lucide-react'
import { api } from '../../../api.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'

export function normalizeSpaces(r) {
  const list = Array.isArray(r && r.spaces) ? r.spaces : Array.isArray(r) ? r : []
  return list
    .filter((s) => s && s.id != null)
    .map((s) => ({ id: String(s.id), name: String(s.name || '').trim(), count: Number.isFinite(Number(s.count)) ? Number(s.count) : 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

export default function KbSpaces() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, spaces: [] })
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [editing, setEditing] = useState(null)     // { id, name }
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(null)   // space
  const [mBusy, setMBusy] = useState(false)
  const [mErr, setMErr] = useState(null)
  const [done, setDone] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: !s.spaces.length, error: null }))
    try { const r = await api.workCompanyKbSpaces(); setState({ loading: false, error: null, spaces: normalizeSpaces(r) }) }
    catch (error) { setState({ loading: false, error, spaces: [] }) }
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (msg) => { setDone(msg); setTimeout(() => setDone(null), 3200) }
  const actionable = (e) => (e && typeof e.status === 'number' && e.status >= 400 && e.status < 500 && e.message) ? e.message : t('companyBrain.kbSpaces.errSave')

  const add = async (e) => {
    if (e) e.preventDefault()
    const n = name.trim()
    if (!n) { setFormErr(t('companyBrain.kbSpaces.errName')); return }
    if (state.spaces.some((s) => sameName(s.name, n))) { setFormErr(t('companyBrain.kbSpaces.errDuplicate')); return }
    setAdding(true); setFormErr('')
    try { await api.workCompanyKbSpaceCreate(n); setName(''); flash(t('companyBrain.kbSpaces.addedToast', { name: n })); await load() }
    catch (ex) { setFormErr(actionable(ex)) }
    finally { setAdding(false) }
  }
  const saveRename = async () => {
    const n = (editing && editing.name || '').trim()
    if (!editing) return
    if (!n) { setFormErr(t('companyBrain.kbSpaces.errName')); return }
    if (state.spaces.some((s) => s.id !== editing.id && sameName(s.name, n))) { setFormErr(t('companyBrain.kbSpaces.errDuplicate')); return }
    setSaving(true); setFormErr('')
    try { await api.workCompanyKbSpaceRename(editing.id, n); setEditing(null); flash(t('companyBrain.kbSpaces.renamedToast', { name: n })); await load() }
    catch (ex) { setFormErr(actionable(ex)) }
    finally { setSaving(false) }
  }
  const confirmRemove = async (reason) => {
    if (!removing) return
    setMBusy(true); setMErr(null)
    try { await api.workCompanyKbSpaceDelete(removing.id, reason); flash(t('companyBrain.kbSpaces.removedToast', { name: removing.name })); setRemoving(null); await load() }
    catch (ex) { setMErr(ex) }
    finally { setMBusy(false) }
  }

  return (
    <div className="wka-panel wka-kbs">
      <h2><Library size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyBrain.kbSpaces.title')}</h2>
      <p className="desc">{t('companyBrain.kbSpaces.desc')}</p>

      <form className="wka-toolbar wka-kbs-add" onSubmit={add}>
        <input className="wka-input wka-kbs-name" placeholder={t('companyBrain.kbSpaces.namePh')} value={name} maxLength={60} disabled={adding}
          onChange={(e) => { setName(e.target.value); if (formErr) setFormErr('') }} aria-label={t('companyBrain.kbSpaces.add')} />
        <button type="submit" className="wka-btn primary" disabled={adding || !name.trim()}>{adding ? <Spinning /> : <Plus size={14} />} {adding ? t('companyBrain.kbSpaces.adding') : t('companyBrain.kbSpaces.add')}</button>
      </form>
      {formErr ? <div className="wka-cell-msg err" role="alert" style={{ marginTop: -6, marginBottom: 10 }}>{formErr}</div> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><ShieldCheck size={14} /> {done}</div> : null}

      {state.loading ? <Loading label={t('companyBrain.kbSpaces.loading')} />
        : state.error ? <ErrorBox error={state.error} onRetry={load} />
          : state.spaces.length === 0 ? <EmptyState title={t('companyBrain.kbSpaces.emptyTitle')} detail={t('companyBrain.kbSpaces.emptyDetail')} />
            : (
              <ul className="wka-kbs-list" aria-label={t('companyBrain.kbSpaces.title')}>
                {state.spaces.map((s) => {
                  const isEditing = editing && editing.id === s.id
                  return (
                    <li key={s.id} className="wka-kbs-row">
                      <span className="wka-kbs-ic" aria-hidden><Library size={14} /></span>
                      {isEditing ? (
                        <input className="wka-input wka-kbs-edit" value={editing.name} maxLength={60} autoFocus disabled={saving} aria-label={t('companyBrain.kbSpaces.renameAria', { name: s.name })}
                          onChange={(e) => { setEditing({ id: s.id, name: e.target.value }); if (formErr) setFormErr('') }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRename() } else if (e.key === 'Escape') { setEditing(null); setFormErr('') } }} />
                      ) : (
                        <span className="wka-kbs-nm" title={s.name}>{s.name}</span>
                      )}
                      <span className={`wka-badge${s.count > 0 ? ' premium' : ''}`}>{t.n('companyBrain.kbSpaces.count', s.count, { n: s.count })}</span>
                      <span className="wka-row-acts">
                        {isEditing ? (
                          <>
                            <button type="button" className="wka-btn sm primary" onClick={saveRename} disabled={saving || !editing.name.trim()}>{saving ? <Spinning /> : <Check size={13} />} {t('companyBrain.kbSpaces.save')}</button>
                            <button type="button" className="wka-btn sm ghost" onClick={() => { setEditing(null); setFormErr('') }} disabled={saving}><X size={13} /> {t('companyBrain.kbSpaces.cancel')}</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="wka-btn sm ghost" onClick={() => { setEditing({ id: s.id, name: s.name }); setFormErr('') }} disabled={!!editing}><Pencil size={13} /> {t('companyBrain.kbSpaces.rename')}</button>
                            <button type="button" className="wka-btn sm ghost" style={{ color: 'var(--wka-red)' }} onClick={() => { setMErr(null); setRemoving(s) }} disabled={!!editing}><Trash2 size={13} /> {t('companyBrain.kbSpaces.remove')}</button>
                          </>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

      {removing ? (
        <ReasonModal
          title={t('companyBrain.kbSpaces.removeTitle')}
          message={t.n('companyBrain.kbSpaces.removeMessage', removing.count, { name: removing.name, n: removing.count })}
          confirmLabel={t('companyBrain.kbSpaces.remove')}
          busy={mBusy} error={mErr}
          onConfirm={confirmRemove}
          onCancel={() => { if (!mBusy) setRemoving(null) }}
        />
      ) : null}
    </div>
  )
}
