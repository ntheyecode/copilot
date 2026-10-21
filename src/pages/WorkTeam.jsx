import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { Plus, Loader2, Users, ShieldCheck, User as UserIcon, Check, FileText, Trash2, KeyRound } from 'lucide-react'

// Company-admin Team page. A company admin sees the users in their own company
// and can add a new one. Backend:
//   api.workCompanyUsers()       -> { company, users }
//   api.workCompanyCreateUser()  -> { username, password, companyRole, tier }
// Rendered inside WorkPage's Home as the "Team" tab, only for company admins.

const ROLE_LABEL = { company_admin: 'Company admin', member: 'Member' }
const TIERS = [
  { id: 'basic', name: 'Basic' },
  { id: 'advanced', name: 'Advanced' },
  { id: 'premium', name: 'Premium' },
]
const fmt = (s) => { try { return new Date(s).toLocaleDateString() } catch { return '' } }
const fmtDT = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }

export default function WorkTeam() {
  const [company, setCompany] = useState(null)
  const [users, setUsers] = useState(null)
  const [view, setView] = useState('list')   // list | new
  const [form, setForm] = useState({ username: '', password: '', companyRole: 'member', tier: 'basic' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [activity, setActivity] = useState(null)
  const loadActivity = useCallback(() => { api.workTeamActivity().then((r) => setActivity(r.activity || [])).catch(() => setActivity([])) }, [])
  useEffect(() => { if (view === 'activity') loadActivity() }, [view, loadActivity])
  // Company's own AI keys (overrides the corporate keys we set).
  const [aiCompany, setAiCompany] = useState(null)
  const [aiForm, setAiForm] = useState({ providerId: '', apiKey: '', chatModel: '', visionModel: '' })
  const loadAi = useCallback(() => { api.workTeamAi().then((c) => setAiCompany(c || null)).catch(() => {}) }, [])
  useEffect(() => { if (view === 'ai') loadAi() }, [view, loadAi])
  const saveOwnKeys = async () => { setBusy(true); setErr(''); setOk(''); try { await api.workTeamSetAiKeys(aiForm); setOk('Your AI keys are saved — WorkCoPilot now runs on them.'); setAiForm({ providerId: '', apiKey: '', chatModel: '', visionModel: '' }); loadAi() } catch (e) { setErr(e.message || 'Could not save keys.') } finally { setBusy(false) } }
  const clearOwnKeys = async () => { setBusy(true); setErr(''); try { await api.workTeamSetAiKeys({ apiKey: '' }); loadAi() } catch (e) { setErr(e.message || 'Could not clear keys.') } finally { setBusy(false) } }

  const load = useCallback(() => {
    api.workCompanyUsers()
      .then((r) => { setCompany(r.company || null); setUsers(r.users || []) })
      .catch((e) => { setErr(e.message || 'Could not load your team.'); setUsers([]) })
  }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    if (busy) return
    const username = form.username.trim()
    if (!username || !form.password) { setErr('Enter a username and a password.'); return }
    setBusy(true); setErr(''); setOk('')
    try {
      await api.workCompanyCreateUser({
        username,
        password: form.password,
        companyRole: form.companyRole === 'company_admin' ? 'company_admin' : 'member',
        tier: form.tier,
      })
      setOk(`Added ${username}.`)
      setForm({ username: '', password: '', companyRole: 'member', tier: 'basic' })
      load()
      setView('list')
    } catch (e) { setErr(e.message || 'Could not add that user.') } finally { setBusy(false) }
  }

  return (
    <div className="wt">
      <style>{CSS}</style>

      {view === 'list' && (
        <>
          <div className="wt-head">
            <div>
              <h2><Users size={20} /> Your team{company && company.name ? ` · ${company.name}` : ''}</h2>
              <p>Add people to your company and set what they can do. New users sign in with the username and password you set here.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="wt-btn" onClick={() => setView('ai')}><KeyRound size={15} /> AI keys</button>
              <button className="wt-btn" onClick={() => setView('activity')}><FileText size={15} /> User activity</button>
              <button className="wt-btn primary" onClick={() => { setErr(''); setOk(''); setView('new') }}><Plus size={15} /> Add user</button>
            </div>
          </div>

          {ok && <div className="wt-ok"><Check size={14} /> {ok}</div>}

          {users == null ? <div className="wt-empty"><Loader2 size={18} className="spin" /> Loading your team...</div>
            : users.length === 0 ? <div className="wt-empty">No users yet. Add your first teammate to get started.</div>
              : (
                <ul className="wt-list">
                  {users.map((u) => (
                    <li key={u.id}>
                      <span className="wt-ava">{(u.displayName || u.username || '?').slice(0, 1).toUpperCase()}</span>
                      <span className="wt-name">{u.displayName || u.username}<span className="wt-uname">{u.username}</span></span>
                      <span className={`wt-role r-${u.companyRole || 'member'}`}>
                        {u.companyRole === 'company_admin' ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                        {ROLE_LABEL[u.companyRole] || 'Member'}
                      </span>
                      <span className="wt-when">Added {fmt(u.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
          {err && <div className="wt-err">{err}</div>}
        </>
      )}

      {view === 'activity' && (
        <>
          <div className="wt-head">
            <div>
              <h2><FileText size={20} /> User activity</h2>
              <p>Session deletions across your company — who deleted it, when, why, and what it was about.</p>
            </div>
            <button className="wt-btn" onClick={() => setView('list')}>Back to team</button>
          </div>
          {activity == null ? <div className="wt-empty"><Loader2 size={18} className="spin" /> Loading activity…</div>
            : activity.length === 0 ? <div className="wt-empty">No activity yet. Session deletions will appear here.</div>
              : (
                <ul className="wt-acts">
                  {activity.map((a) => (
                    <li key={a.id}>
                      <span className="wt-act-ic"><Trash2 size={14} /></span>
                      <div className="wt-act-main">
                        <div className="wt-act-top"><b>{a.displayName || a.username || 'A user'}</b> deleted a session</div>
                        <div className="wt-act-sess">{(a.title && !/^Session \d/.test(a.title)) ? a.title : (a.goal || 'Untitled session')}{a.stepsTotal ? ` · ${a.stepsDone}/${a.stepsTotal} steps` : ''}{a.status ? ` · ${a.status}` : ''}</div>
                        {a.reason && <div className="wt-act-reason">&ldquo;{a.reason}&rdquo;</div>}
                      </div>
                      <span className="wt-when">{fmtDT(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
          {err && <div className="wt-err">{err}</div>}
        </>
      )}

      {view === 'ai' && (
        <>
          <div className="wt-head">
            <div>
              <h2><KeyRound size={20} /> AI keys</h2>
              <p>By default WorkCoPilot runs on the keys we set for your company. You can switch to your <b>own</b> provider keys here — then your usage is billed on your account, not ours.</p>
            </div>
            <button className="wt-btn" onClick={() => setView('list')}>Back to team</button>
          </div>
          {aiCompany && (
            <div className="wt-ok" style={{ background: 'var(--panel,#fff)', color: 'var(--text,#141726)', border: '1px solid var(--line,#e3e6ee)' }}>
              {aiCompany.companyAi
                ? <span>Current: <b>{aiCompany.companyAi.providerId || 'provider'}</b> · key {aiCompany.companyAi.keyMasked} · {aiCompany.companyAi.chatModel || 'default model'} · {aiCompany.companyAi.owner === 'company' ? 'your own keys' : 'company keys set by WorkCoPilot'}</span>
                : <span>No keys set yet — your company is on the platform AI.</span>}
            </div>
          )}
          <div className="wt-form" style={{ maxWidth: 560 }}>
            <label className="wt-label">Provider
              <input value={aiForm.providerId} placeholder="gemini, openai, groq…" onChange={(e) => setAiForm({ ...aiForm, providerId: e.target.value })} />
            </label>
            <label className="wt-label">API key
              <input value={aiForm.apiKey} placeholder="Paste your provider API key" onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })} />
            </label>
            <label className="wt-label">Chat model <span style={{ fontWeight: 400, color: 'var(--text-dim,#667)' }}>(optional)</span>
              <input value={aiForm.chatModel} placeholder="e.g. gpt-4o-mini" onChange={(e) => setAiForm({ ...aiForm, chatModel: e.target.value })} />
            </label>
            <label className="wt-label">Vision model <span style={{ fontWeight: 400, color: 'var(--text-dim,#667)' }}>(reads the screen)</span>
              <input value={aiForm.visionModel} placeholder="e.g. gpt-4o, gemini-1.5-flash" onChange={(e) => setAiForm({ ...aiForm, visionModel: e.target.value })} />
            </label>
            {err && <div className="wt-err">{err}</div>}
            {ok && <div className="wt-ok"><Check size={14} /> {ok}</div>}
            <div className="wt-actions">
              {aiCompany && aiCompany.companyAi && aiCompany.companyAi.owner === 'company' && <button className="wt-btn" disabled={busy} onClick={clearOwnKeys}>Remove my keys</button>}
              <button className="wt-btn primary" disabled={busy || !aiForm.apiKey.trim()} onClick={saveOwnKeys}>{busy ? <Loader2 size={15} className="spin" /> : 'Use my keys'}</button>
            </div>
          </div>
        </>
      )}

      {view === 'new' && (
        <div className="wt-form">
          <h2>Add a user</h2>
          <p className="wt-form-sub">They join {company && company.name ? company.name : 'your company'} right away.</p>
          <label className="wt-label">Username
            <input value={form.username} maxLength={60} autoComplete="off" placeholder="e.g. alex" onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label className="wt-label">Temporary password
            <input type="text" value={form.password} maxLength={120} autoComplete="new-password" placeholder="Set a password to share with them" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="wt-label">Role
            <select value={form.companyRole} onChange={(e) => setForm({ ...form, companyRole: e.target.value })}>
              <option value="member">Member</option>
              <option value="company_admin">Company admin</option>
            </select>
          </label>
          <label className="wt-label">Plan
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {err && <div className="wt-err">{err}</div>}
          <div className="wt-actions">
            <button className="wt-btn" onClick={() => { setErr(''); setView('list') }}>Cancel</button>
            <button className="wt-btn primary" disabled={busy} onClick={create}>{busy ? <Loader2 size={15} className="spin" /> : 'Add user'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
.wt{max-width:860px;margin:0 auto}
.wt h2{font-size:20px;margin:0 0 4px;display:flex;align-items:center;gap:9px}
.wt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
.wt-head p{color:var(--text-dim,#667);font-size:14px;margin:0;max-width:60ch}
.wt-btn{display:inline-flex;align-items:center;gap:7px;background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);color:var(--text,#141726);border-radius:10px;padding:9px 15px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap}
.wt-btn:hover{border-color:var(--text-dim,#99a)}
.wt-btn.primary{background:linear-gradient(135deg,#0a9d66,#0a86cf);color:#fff;border:none}
.wt-btn:disabled{opacity:.55;cursor:default}
.wt-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wt-list li{display:flex;align-items:center;gap:12px;background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);border-radius:12px;padding:12px 15px}
.wt-ava{width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,#0a9d66,#0a86cf)}
.wt-name{flex:1;min-width:0;display:flex;flex-direction:column;font-weight:600;color:var(--text,#141726);overflow:hidden}
.wt-uname{font-weight:400;font-size:12px;color:var(--text-dim,#667)}
.wt-role{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap}
.r-company_admin{background:rgba(10,157,102,.15);color:#06603f}
.r-member{background:rgba(120,130,150,.15);color:#596074}
.wt-when{color:var(--text-dim,#667);font-size:12px;white-space:nowrap}
.wt-acts{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wt-acts li{display:flex;align-items:flex-start;gap:12px;background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);border-radius:12px;padding:12px 15px}
.wt-act-ic{width:30px;height:30px;flex:none;border-radius:8px;display:grid;place-items:center;color:#c0392b;background:rgba(192,57,43,.12)}
.wt-act-main{flex:1;min-width:0}
.wt-act-top{font-size:13.5px;color:var(--text,#141726)}
.wt-act-sess{font-size:12.5px;color:var(--text-dim,#667);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-act-reason{font-size:13px;color:var(--text,#141726);margin-top:6px;font-style:italic}
@media(max-width:560px){.wt-acts li{flex-wrap:wrap}.wt-acts .wt-when{order:4;width:100%}}
.wt-empty{color:var(--text-dim,#667);padding:26px 0;text-align:center;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px}
.wt-err{color:#c0392b;font-size:13px;margin-top:12px}
.wt-ok{display:inline-flex;align-items:center;gap:7px;color:#06603f;background:rgba(10,157,102,.12);border:1px solid rgba(10,157,102,.3);border-radius:10px;padding:8px 13px;font-size:13px;font-weight:600;margin-bottom:14px}
.wt-form{max-width:520px;margin:0 auto}
.wt-form-sub{color:var(--text-dim,#667);font-size:14px;margin:0 0 18px}
.wt-label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--text,#141726);margin-bottom:14px}
.wt-label input,.wt-label select{background:var(--panel,#fff);border:1px solid var(--line,#e3e6ee);border-radius:10px;padding:10px 12px;color:var(--text,#141726);font:inherit;font-size:14px;font-weight:400;outline:none}
.wt-label input:focus,.wt-label select:focus{border-color:#0a86cf}
.wt-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
.spin{animation:wt-spin 1s linear infinite}@keyframes wt-spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.wt-head{flex-direction:column}.wt-list li{flex-wrap:wrap;gap:8px}.wt-when{order:4;width:100%}}
`
