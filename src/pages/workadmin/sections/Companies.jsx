// Companies (tenancy): superadmin creates companies, adds company admins and
// company users, and sets the per-company / per-user PII-PHI redaction policy.
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Building2, ShieldCheck, Shield, Loader2, ChevronRight, ChevronDown, UserPlus } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState } from './_shared.jsx'

export default function Companies({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null, companies: [] })
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', plan: 'basic', seats: '', scrub: false })
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [uForm, setUForm] = useState({ username: '', password: '', companyRole: 'member', tier: 'basic' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.companies(); setState({ loading: false, error: null, companies: d.companies || [] }) }
    catch (e) { setState({ loading: false, error: e, companies: [] }) }
  }, [])
  useEffect(() => { load() }, [load])

  const createCompany = async () => {
    if (busy || !form.name.trim()) return
    setBusy(true); setMsg('')
    try { await workAdminApi.createCompany({ name: form.name, plan: form.plan, seats: Number(form.seats) || 0, scrub: form.scrub }); setForm({ name: '', plan: 'basic', seats: '', scrub: false }); setShowNew(false); await load() }
    catch (e) { setMsg(e.message || 'Could not create the company.') } finally { setBusy(false) }
  }
  const openCompany = async (id) => {
    if (openId === id) { setOpenId(null); setDetail(null); return }
    setOpenId(id); setDetail(null); setMsg('')
    try { setDetail(await workAdminApi.company(id)) } catch (e) { setMsg(e.message) }
  }
  const refreshDetail = async (id) => { try { setDetail(await workAdminApi.company(id)) } catch {} ; load() }
  const toggleCompanyScrub = async (c) => {
    if (!isSuperAdmin) return
    try { await workAdminApi.companyScrub(c.id, !c.scrub); refreshDetail(c.id) } catch (e) { setMsg(e.message) }
  }
  const addUser = async (companyId) => {
    if (busy || !uForm.username.trim() || !uForm.password) { setMsg('Username (3+) and password (6+) required.'); return }
    setBusy(true); setMsg('')
    try { await workAdminApi.createUser({ ...uForm, companyId }); setUForm({ username: '', password: '', companyRole: 'member', tier: 'basic' }); refreshDetail(companyId) }
    catch (e) { setMsg(e.message || 'Could not add the user.') } finally { setBusy(false) }
  }
  const toggleUserScrub = async (u, companyId) => {
    if (!isSuperAdmin) return
    try { await workAdminApi.userScrub(u.id, !u.scrub); refreshDetail(companyId) } catch (e) { setMsg(e.message) }
  }

  if (state.loading) return <Loading label="Loading companies" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div className="wka-panel">
      <style>{CSS}</style>
      <div className="co-head">
        <p className="desc">Create companies, add company admins and users, and set the data-redaction policy per company or per user.</p>
        {isSuperAdmin && <button className="wka-btn primary" onClick={() => setShowNew((v) => !v)}><Plus size={15} /> New company</button>}
      </div>

      {showNew && (
        <div className="co-new">
          <input className="wka-input" placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="wka-input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="basic">Basic</option><option value="advanced">Advanced</option><option value="premium">Premium</option></select>
          <input className="wka-input" type="number" min="0" placeholder="Seats" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} style={{ maxWidth: 90 }} />
          <label className="co-chk"><input type="checkbox" checked={form.scrub} onChange={(e) => setForm({ ...form, scrub: e.target.checked })} /> Redaction on</label>
          <button className="wka-btn primary" disabled={busy} onClick={createCompany}>{busy ? <Loader2 size={14} className="spin" /> : 'Create'}</button>
        </div>
      )}
      {msg && <div className="co-msg">{msg}</div>}

      {state.companies.length === 0 ? <EmptyState title="No companies yet" detail="Create one to onboard a company admin and users." />
        : (
          <div className="co-list">
            {state.companies.map((c) => (
              <div key={c.id} className="co-row">
                <button className="co-row-head" onClick={() => openCompany(c.id)}>
                  {openId === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="co-ic"><Building2 size={16} /></span>
                  <span className="co-name">{c.name}</span>
                  <span className={`wka-badge ${c.plan}`}>{c.plan}</span>
                  <span className="co-meta">{c.userCount} users &middot; {c.adminCount} admin</span>
                  <span className={`co-scrub ${c.scrub ? 'on' : ''}`}>{c.scrub ? <><ShieldCheck size={13} /> Redaction on</> : <><Shield size={13} /> Redaction off</>}</span>
                </button>
                {openId === c.id && (
                  <div className="co-detail">
                    {!detail ? <Loading label="Loading users" /> : (
                      <>
                        <div className="co-detail-top">
                          <div>Plan <b>{detail.company.plan}</b> &middot; Seats <b>{detail.company.seats || '-'}</b> &middot; SSO <b>{detail.company.sso && detail.company.sso.connected ? detail.company.sso.provider : 'not connected'}</b></div>
                          {isSuperAdmin && <button className="wka-btn sm" onClick={() => toggleCompanyScrub(c)}>{c.scrub ? 'Turn redaction off' : 'Turn redaction on'}</button>}
                        </div>
                        <table className="wka-table co-users">
                          <thead><tr><th>User</th><th>Role</th><th>Tier</th><th>Redaction</th></tr></thead>
                          <tbody>
                            {detail.users.length === 0 && <tr><td colSpan={4} className="co-empty">No users yet.</td></tr>}
                            {detail.users.map((u) => (
                              <tr key={u.id}>
                                <td>{u.username}</td>
                                <td>{u.companyRole === 'company_admin' ? <span className="wka-chip ok">Company admin</span> : 'Member'}</td>
                                <td><span className={`wka-badge ${u.tier || 'basic'}`}>{u.tier || 'basic'}</span></td>
                                <td>{isSuperAdmin
                                  ? <button className={`co-toggle ${u.scrub ? 'on' : ''}`} onClick={() => toggleUserScrub(u, c.id)}>{u.scrub ? 'On' : 'Off'}</button>
                                  : (u.scrub ? 'On' : 'Off')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="co-adduser">
                          <UserPlus size={15} />
                          <input className="wka-input" placeholder="Username" value={uForm.username} onChange={(e) => setUForm({ ...uForm, username: e.target.value })} />
                          <input className="wka-input" type="password" placeholder="Password" value={uForm.password} onChange={(e) => setUForm({ ...uForm, password: e.target.value })} />
                          <select className="wka-input" value={uForm.companyRole} onChange={(e) => setUForm({ ...uForm, companyRole: e.target.value })}><option value="member">Member</option><option value="company_admin">Company admin</option></select>
                          <select className="wka-input" value={uForm.tier} onChange={(e) => setUForm({ ...uForm, tier: e.target.value })}><option value="basic">Basic</option><option value="advanced">Advanced</option><option value="premium">Premium</option></select>
                          <button className="wka-btn primary" disabled={busy} onClick={() => addUser(c.id)}>{busy ? <Loader2 size={14} className="spin" /> : 'Add user'}</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

const CSS = `
.co-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
.co-new{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;padding:14px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-bg-2)}
.co-chk{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--wka-muted)}
.co-msg{color:var(--wka-red);font-size:13px;margin-bottom:12px}
.co-list{display:flex;flex-direction:column;gap:10px}
.co-row{border:1px solid var(--wka-line);border-radius:12px;overflow:hidden;background:var(--wka-panel)}
.co-row-head{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:none;border:none;cursor:pointer;font:inherit;color:var(--wka-text);text-align:left}
.co-row-head:hover{background:var(--wka-panel-2)}
.co-ic{display:inline-flex;color:var(--wka-cyan)}
.co-name{font-weight:700;font-size:15px}
.co-meta{color:var(--wka-muted);font-size:12.5px;margin-left:auto}
.co-scrub{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--wka-faint);border:1px solid var(--wka-line-2);border-radius:999px;padding:3px 10px}
.co-scrub.on{color:var(--wka-emerald);border-color:rgba(10,157,102,.4);background:rgba(10,157,102,.08)}
.co-detail{border-top:1px solid var(--wka-line);padding:16px;background:var(--wka-bg-2)}
.co-detail-top{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--wka-muted);margin-bottom:12px}
.co-users{width:100%;margin-bottom:14px}
.co-empty{color:var(--wka-faint);text-align:center;padding:14px}
.co-toggle{font:inherit;font-size:12px;font-weight:700;border-radius:7px;padding:4px 12px;cursor:pointer;border:1px solid var(--wka-line-2);background:var(--wka-panel);color:var(--wka-muted)}
.co-toggle.on{color:var(--wka-emerald);border-color:rgba(10,157,102,.4);background:rgba(10,157,102,.1)}
.co-adduser{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--wka-line)}
.co-adduser svg{color:var(--wka-cyan)}
.spin{animation:co-spin 1s linear infinite}@keyframes co-spin{to{transform:rotate(360deg)}}
@media(max-width:720px){.co-meta{margin-left:0;width:100%}.co-adduser{flex-direction:column;align-items:stretch}}
`
