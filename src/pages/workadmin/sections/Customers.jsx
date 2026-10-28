// Company console: Customers ("who the work is for"). The company admin keeps the
// list of clients their people tag projects to: add, rename, archive. Default is
// system-owned (always present, never renamed or archived) so a person is never
// blocked from starting work; the server enforces that and this screen simply
// shows no controls on it. Archiving is soft (past work keeps its tag) and asks
// for an inline confirmation first.
import React, { useEffect, useState, useCallback } from 'react'
import { Briefcase, Plus, Check, Pencil, Archive, X, Lock } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, EmptyState, Spinning } from './_shared.jsx'

export default function Customers() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, customers: [] })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState('')          // '' | 'add' | <customer id>
  const [edit, setEdit] = useState(null)        // { id, name } while renaming
  const [confirmId, setConfirmId] = useState('')
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await api.workCompanyCustomers(); setState({ loading: false, error: null, customers: (d && d.customers) || [] }) }
    catch (error) { setState({ loading: false, error, customers: [] }) }
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (m) => { setOk(m); setTimeout(() => setOk(''), 3200) }
  const run = async (key, fn) => {
    if (busy) return
    setBusy(key); setErr(null); setOk('')
    try { await fn() } catch (error) { setErr(error) } finally { setBusy('') }
  }
  const add = () => {
    const nm = name.trim()
    if (!nm) { setErr(new Error(t('companyAdmin.customers.nameRequired'))); return }
    run('add', async () => { await api.workCompanyAddCustomer(nm); setName(''); flash(t('companyAdmin.customers.added', { name: nm })); await load() })
  }
  const rename = (c) => {
    const nm = (edit && edit.name || '').trim()
    if (!nm) { setErr(new Error(t('companyAdmin.customers.nameRequired'))); return }
    run(c.id, async () => { await api.workCompanyRenameCustomer(c.id, nm); setEdit(null); flash(t('companyAdmin.customers.renamed', { name: nm })); await load() })
  }
  const archive = (c) => run(c.id, async () => { await api.workCompanyArchiveCustomer(c.id); setConfirmId(''); flash(t('companyAdmin.customers.archived', { name: c.name })); await load() })

  if (state.loading) return <Loading label={t('companyAdmin.customers.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const list = state.customers
  const onlyDefault = list.every((c) => c.system)

  return (
    <div>
      <style>{CUSTOMERS_CSS}</style>
      <div className="wka-panel">
        <h2><Plus size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.customers.addTitle')}</h2>
        <div className="cu-add">
          <input className="wka-input" placeholder={t('companyAdmin.customers.namePlaceholder')} value={name} maxLength={80}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
          <button type="button" className="wka-btn primary" disabled={busy === 'add'} onClick={add}>{busy === 'add' ? <Spinning /> : <Plus size={14} />} {t('companyAdmin.customers.add')}</button>
        </div>
        {err ? <div style={{ marginTop: 10 }}><ErrorBox error={err} /></div> : null}
        {ok ? <div className="wka-note" style={{ color: 'var(--wka-emerald)', marginTop: 10, marginBottom: 0 }}><Check size={14} /> <span>{ok}</span></div> : null}
      </div>

      <div className="wka-panel">
        <h2><Briefcase size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.customers.listTitle')}</h2>
        <p className="desc">{t('companyAdmin.customers.listDesc')}</p>
        <div className="cu-list">
          {list.map((c) => {
            const editing = edit && edit.id === c.id
            const confirming = confirmId === c.id
            const rowBusy = busy === c.id
            return (
              <div key={c.id} className={`cu-row${c.system ? ' sys' : ''}`}>
                {editing ? (
                  <div className="cu-edit">
                    <input className="wka-input" value={edit.name} maxLength={80} autoFocus onChange={(e) => setEdit({ id: c.id, name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') rename(c); if (e.key === 'Escape') setEdit(null) }} />
                    <button type="button" className="wka-btn sm primary" disabled={rowBusy} onClick={() => rename(c)}>{rowBusy ? <Spinning /> : <Check size={13} />} {t('companyAdmin.customers.save')}</button>
                    <button type="button" className="wka-btn sm ghost" disabled={rowBusy} onClick={() => setEdit(null)}><X size={13} /> {t('companyAdmin.common.cancel')}</button>
                  </div>
                ) : (
                  <>
                    <span className="cu-name">{c.name}</span>
                    {c.system ? <span className="wka-chip cu-sys" title={t('companyAdmin.customers.systemHint')}><Lock size={11} aria-hidden="true" /> {t('companyAdmin.customers.systemChip')}</span> : null}
                    <span className="wka-spacer" />
                    {!c.system && !confirming ? (
                      <span className="cu-act">
                        <button type="button" className="wka-btn sm ghost" disabled={rowBusy} onClick={() => { setErr(null); setConfirmId(''); setEdit({ id: c.id, name: c.name }) }}><Pencil size={13} /> {t('companyAdmin.customers.rename')}</button>
                        <button type="button" className="wka-btn sm ghost" disabled={rowBusy} onClick={() => { setErr(null); setEdit(null); setConfirmId(c.id) }}><Archive size={13} /> {t('companyAdmin.customers.archive')}</button>
                      </span>
                    ) : null}
                  </>
                )}
                {confirming && !editing ? (
                  <div className="cu-confirm">
                    <div className="cu-confirm-t"><b>{t('companyAdmin.customers.confirmArchive', { name: c.name })}</b> <span>{t('companyAdmin.customers.confirmArchiveDetail')}</span></div>
                    <span className="cu-act">
                      <button type="button" className="wka-btn sm danger" disabled={rowBusy} onClick={() => archive(c)}>{rowBusy ? <Spinning /> : <Archive size={13} />} {t('companyAdmin.customers.confirm')}</button>
                      <button type="button" className="wka-btn sm ghost" disabled={rowBusy} onClick={() => setConfirmId('')}>{t('companyAdmin.common.cancel')}</button>
                    </span>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        {onlyDefault ? <EmptyState title={t('companyAdmin.customers.emptyTitle')} detail={t('companyAdmin.customers.emptyDetail')} /> : null}
      </div>
    </div>
  )
}

const CUSTOMERS_CSS = `
.cu-add{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.cu-add .wka-input{flex:1 1 220px;min-width:0;max-width:420px}
.cu-add .wka-btn{flex:none;white-space:nowrap}
.cu-list{display:flex;flex-direction:column;gap:8px}
.cu-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-bg-2);min-width:0}
.cu-row.sys{background:var(--wka-panel)}
.cu-name{font-size:14px;font-weight:600;color:var(--wka-text);min-width:0;overflow-wrap:anywhere}
.cu-sys{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:none;cursor:help}
.cu-act{display:inline-flex;gap:6px;flex:none;flex-wrap:wrap}
.cu-act .wka-btn{white-space:nowrap}
.cu-edit{display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex:1 1 100%;min-width:0}
.cu-edit .wka-input{flex:1 1 200px;min-width:0;max-width:420px}
.cu-confirm{flex:1 1 100%;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:8px;border-top:1px dashed var(--wka-line)}
.cu-confirm-t{flex:1 1 220px;min-width:0;font-size:12.5px;color:var(--wka-muted);line-height:1.5}
.cu-confirm-t b{color:var(--wka-text);margin-right:4px}
`
