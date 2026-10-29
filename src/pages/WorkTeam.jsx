import { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { Plus, Loader2, Users, ShieldCheck, User as UserIcon, Check, FileText, Trash2, KeyRound, Globe } from 'lucide-react'
import { useT } from '../i18n/index.jsx'

// Company-admin Team page. A company admin sees the users in their own company
// and can add a new one. Backend:
//   api.workCompanyUsers()       -> { company, users }
//   api.workCompanyCreateUser()  -> { username, password, companyRole, tier }
// Rendered inside WorkPage's Home as the "Team" tab, only for company admins.
// Every user-facing string comes from the teamPage i18n namespace; plan names
// (Basic / Advanced / Premium) are product names and stay as-is.

const ROLE_KEY = { company_admin: 'teamPage.roles.companyAdmin', member: 'teamPage.roles.member' }
const TIERS = [
  { id: 'basic', name: 'Basic' },
  { id: 'advanced', name: 'Advanced' },
  { id: 'premium', name: 'Premium' },
]
const fmt = (s) => { try { return new Date(s).toLocaleDateString() } catch { return '' } }
const fmtDT = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }

export default function WorkTeam() {
  const t = useT()
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
  const [aiForm, setAiForm] = useState({ providerId: '', apiKey: '' })
  const loadAi = useCallback(() => { api.workTeamAi().then((c) => setAiCompany(c || null)).catch(() => {}) }, [])
  useEffect(() => { if (view === 'ai') loadAi() }, [view, loadAi])
  const saveOwnKeys = async () => { setBusy(true); setErr(''); setOk(''); try { await api.workTeamSetAiKeys(aiForm); setOk(t('teamPage.ok.keysSaved')); setAiForm({ providerId: '', apiKey: '' }); loadAi() } catch (e) { setErr(e.message || t('teamPage.errors.saveKeys')) } finally { setBusy(false) } }
  const clearOwnKeys = async () => { setBusy(true); setErr(''); try { await api.workTeamSetAiKeys({ apiKey: '' }); loadAi() } catch (e) { setErr(e.message || t('teamPage.errors.clearKeys')) } finally { setBusy(false) } }
  // Company's own web-search (Tavily) key.
  const [wsKey, setWsKey] = useState('')
  const saveWebSearch = async (clear) => { setBusy(true); setErr(''); setOk(''); try { await api.workTeamSetWebSearch(clear ? '' : wsKey.trim(), 'tavily'); setOk(clear ? t('teamPage.ok.webSearchRemoved') : t('teamPage.ok.webSearchSaved')); setWsKey(''); loadAi() } catch (e) { setErr(e.message || t('teamPage.errors.saveWebSearch')) } finally { setBusy(false) } }

  const load = useCallback(() => {
    api.workCompanyUsers()
      .then((r) => { setCompany(r.company || null); setUsers(r.users || []) })
      .catch((e) => { setErr(e.message || t('teamPage.errors.loadTeam')); setUsers([]) })
  }, [t])
  useEffect(() => { load() }, [load])

  const create = async () => {
    if (busy) return
    const username = form.username.trim()
    if (!username || !form.password) { setErr(t('teamPage.errors.needUserPass')); return }
    setBusy(true); setErr(''); setOk('')
    try {
      await api.workCompanyCreateUser({
        username,
        password: form.password,
        companyRole: form.companyRole === 'company_admin' ? 'company_admin' : 'member',
        tier: form.tier,
      })
      setOk(t('teamPage.ok.added', { name: username }))
      setForm({ username: '', password: '', companyRole: 'member', tier: 'basic' })
      load()
      setView('list')
    } catch (e) { setErr(e.message || t('teamPage.errors.addUser')) } finally { setBusy(false) }
  }

  return (
    <div className="wt">
      <style>{CSS}</style>

      {view === 'list' && (
        <>
          <div className="wt-head">
            <div>
              <h2><Users size={20} /> {t('teamPage.list.title')}{company && company.name ? ` · ${company.name}` : ''}</h2>
              <p>{t('teamPage.list.sub')}</p>
            </div>
            <div className="wt-headacts">
              <button className="wt-btn" onClick={() => setView('ai')}><KeyRound size={15} /> {t('teamPage.list.aiKeys')}</button>
              <button className="wt-btn" onClick={() => setView('activity')}><FileText size={15} /> {t('teamPage.list.activity')}</button>
              <button className="wt-btn primary" onClick={() => { setErr(''); setOk(''); setView('new') }}><Plus size={15} /> {t('teamPage.list.addUser')}</button>
            </div>
          </div>

          {ok && <div className="wt-ok"><Check size={14} /> {ok}</div>}

          {users == null ? <div className="wt-empty"><Loader2 size={18} className="spin" /> {t('teamPage.list.loading')}</div>
            : users.length === 0 ? <div className="wt-empty">{t('teamPage.list.empty')}</div>
              : (
                <ul className="wt-list">
                  {users.map((u) => (
                    <li key={u.id}>
                      <span className="wt-ava">{(u.displayName || u.username || '?').slice(0, 1).toUpperCase()}</span>
                      <span className="wt-name"><span className="wt-dname">{u.displayName || u.username}</span><span className="wt-uname">{u.username}</span></span>
                      <span className={`wt-role r-${u.companyRole || 'member'}`}>
                        {u.companyRole === 'company_admin' ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                        {t(ROLE_KEY[u.companyRole] || ROLE_KEY.member)}
                      </span>
                      <span className="wt-when">{t('teamPage.list.addedOn', { date: fmt(u.createdAt) })}</span>
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
              <h2><FileText size={20} /> {t('teamPage.activity.title')}</h2>
              <p>{t('teamPage.activity.sub')}</p>
            </div>
            <button className="wt-btn" onClick={() => setView('list')}>{t('teamPage.activity.back')}</button>
          </div>
          {activity == null ? <div className="wt-empty"><Loader2 size={18} className="spin" /> {t('teamPage.activity.loading')}</div>
            : activity.length === 0 ? <div className="wt-empty">{t('teamPage.activity.empty')}</div>
              : (
                <ul className="wt-acts">
                  {activity.map((a) => (
                    <li key={a.id}>
                      <span className="wt-act-ic"><Trash2 size={14} /></span>
                      <div className="wt-act-main">
                        <div className="wt-act-top">{t.rich('teamPage.activity.deleted', { name: a.displayName || a.username || t('teamPage.activity.someone') })}</div>
                        <div className="wt-act-sess">{(a.title && !/^Session \d/.test(a.title)) ? a.title : (a.goal || t('teamPage.activity.untitled'))}{a.stepsTotal ? ` · ${t('teamPage.activity.steps', { done: a.stepsDone, total: a.stepsTotal })}` : ''}{a.status ? ` · ${a.status}` : ''}</div>
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
              <h2><KeyRound size={20} /> {t('teamPage.ai.title')}</h2>
              <p>{t.rich('teamPage.ai.sub')}</p>
            </div>
            <button className="wt-btn" onClick={() => setView('list')}>{t('teamPage.ai.back')}</button>
          </div>
          {aiCompany && (
            <div className="wt-ok" style={{ background: 'var(--panel,#fff)', color: 'var(--tx,#1b2033)', border: '1px solid var(--line,#e7eaf2)' }}>
              {aiCompany.companyAi
                ? <span>{t('teamPage.ai.current', { key: aiCompany.companyAi.keyMasked, owner: aiCompany.companyAi.owner === 'company' ? t('teamPage.ai.ownerCompany') : t('teamPage.ai.ownerPlatform') })}</span>
                : <span>{t('teamPage.ai.none')}</span>}
            </div>
          )}
          <div className="wt-form" style={{ maxWidth: 560 }}>
            <label className="wt-label">{t('teamPage.ai.providerLabel')}
              <input value={aiForm.providerId} placeholder={t('teamPage.ai.providerPlaceholder')} onChange={(e) => setAiForm({ ...aiForm, providerId: e.target.value })} />
            </label>
            <label className="wt-label">{t('teamPage.ai.keyLabel')}
              <input value={aiForm.apiKey} placeholder={t('teamPage.ai.keyPlaceholder')} onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })} />
            </label>
            {err && <div className="wt-err">{err}</div>}
            {ok && <div className="wt-ok"><Check size={14} /> {ok}</div>}
            <div className="wt-actions">
              {aiCompany && aiCompany.companyAi && aiCompany.companyAi.owner === 'company' && <button className="wt-btn" disabled={busy} onClick={clearOwnKeys}>{t('teamPage.ai.remove')}</button>}
              <button className="wt-btn primary" disabled={busy || !aiForm.apiKey.trim()} onClick={saveOwnKeys}>{busy ? <Loader2 size={15} className="spin" /> : t('teamPage.ai.use')}</button>
            </div>
          </div>

          <div className="wt-form" style={{ maxWidth: 560, marginTop: 26 }}>
            <h2 style={{ fontSize: 17 }}><Globe size={18} /> {t('teamPage.ai.webTitle')}</h2>
            <p className="wt-form-sub">{t('teamPage.ai.webSub')}</p>
            {aiCompany && (
              <div className="wt-ok" style={{ background: 'var(--panel,#fff)', color: 'var(--tx,#1b2033)', border: '1px solid var(--line,#e7eaf2)' }}>
                {aiCompany.webSearchConfigured
                  ? <span>{t.rich('teamPage.ai.webCurrent', { provider: (aiCompany.webSearch && aiCompany.webSearch.provider) || 'tavily', key: aiCompany.webSearch && aiCompany.webSearch.keyMasked })}</span>
                  : <span>{t('teamPage.ai.webNone')}</span>}
              </div>
            )}
            <label className="wt-label">{t('teamPage.ai.webKeyLabel')}
              <input type="password" autoComplete="new-password" value={wsKey} placeholder={t('teamPage.ai.webKeyPlaceholder')} onChange={(e) => setWsKey(e.target.value)} />
            </label>
            <div className="wt-actions">
              {aiCompany && aiCompany.webSearchConfigured && <button className="wt-btn" disabled={busy} onClick={() => saveWebSearch(true)}>{t('teamPage.ai.webRemove')}</button>}
              <button className="wt-btn primary" disabled={busy || !wsKey.trim()} onClick={() => saveWebSearch(false)}>{busy ? <Loader2 size={15} className="spin" /> : t('teamPage.ai.webSave')}</button>
            </div>
          </div>
        </>
      )}

      {view === 'new' && (
        <div className="wt-form">
          <h2>{t('teamPage.add.title')}</h2>
          <p className="wt-form-sub">{t('teamPage.add.sub', { company: company && company.name ? company.name : t('teamPage.add.yourCompany') })}</p>
          <label className="wt-label">{t('teamPage.add.usernameLabel')}
            <input value={form.username} maxLength={60} autoComplete="off" placeholder={t('teamPage.add.usernamePlaceholder')} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label className="wt-label">{t('teamPage.add.passwordLabel')}
            <input type="text" value={form.password} maxLength={120} autoComplete="new-password" placeholder={t('teamPage.add.passwordPlaceholder')} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="wt-label">{t('teamPage.add.roleLabel')}
            <select value={form.companyRole} onChange={(e) => setForm({ ...form, companyRole: e.target.value })}>
              <option value="member">{t('teamPage.roles.member')}</option>
              <option value="company_admin">{t('teamPage.roles.companyAdmin')}</option>
            </select>
          </label>
          <label className="wt-label">{t('teamPage.add.planLabel')}
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              {TIERS.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
            </select>
          </label>
          {err && <div className="wt-err">{err}</div>}
          <div className="wt-actions">
            <button className="wt-btn" onClick={() => { setErr(''); setView('list') }}>{t('teamPage.add.cancel')}</button>
            <button className="wt-btn primary" disabled={busy} onClick={create}>{busy ? <Loader2 size={15} className="spin" /> : t('teamPage.add.submit')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles consume the product tokens the WorkCoPilot dashboard defines on its
// `.wd` root (WorkPage) - this Team panel always renders inside it - so it reads
// as the same white/emerald product family as the admin console and the rest of
// the app: one emerald accent (--em #0e9f6e, solid primary, NO blue-green
// gradient), one hairline, one ink/muted pair. Every var carries the correct
// emerald fallback so it still looks on-brand if ever mounted standalone.
const CSS = `
.wt{max-width:860px;margin:0 auto}
.wt h2{font-size:20px;margin:0 0 4px;display:flex;align-items:center;gap:9px;font-family:var(--wd-display,"Bricolage Grotesque","Figtree",system-ui,sans-serif);letter-spacing:-.01em;min-width:0}
.wt h2 svg{flex-shrink:0;color:var(--em,var(--accent,#0e9f6e))}
.wt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;min-width:0}
.wt-head>div:first-child{min-width:0}
.wt-head p{color:var(--mut,#5c6484);font-size:14px;margin:0;max-width:60ch}
.wt-headacts{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
.wt-btn{display:inline-flex;align-items:center;gap:7px;background:var(--panel,#fff);border:1px solid var(--line,#e7eaf2);color:var(--tx,#1b2033);border-radius:10px;padding:9px 15px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,border-color .15s,color .15s}
.wt-btn svg{flex-shrink:0}
.wt-btn:hover:not(:disabled){border-color:var(--line-2,#d5d9e6);background:var(--line-soft,#eef1f7);color:var(--tx,#1b2033)}
.wt-btn.primary{background:var(--em,var(--accent,#0e9f6e));color:#fff;border:1px solid var(--em,var(--accent,#0e9f6e));box-shadow:0 1px 2px var(--accent-shadow,rgba(14,159,110,.22))}
.wt-btn.primary:hover:not(:disabled){background:var(--em-deep,var(--accent-dark,#0b7a53));border-color:var(--em-deep,var(--accent-dark,#0b7a53));color:#fff}
.wt-btn:disabled{opacity:.55;cursor:default}
.wt-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wt-list li{display:flex;align-items:center;gap:12px;background:var(--panel,#fff);border:1px solid var(--line,#e7eaf2);border-radius:var(--r,12px);padding:12px 15px;box-shadow:var(--card-shadow,0 1px 2px rgba(20,24,44,.03))}
.wt-ava{width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,var(--em,var(--accent,#0e9f6e)),var(--em-2,#0a84c2))}
.wt-name{flex:1;min-width:0;display:flex;flex-direction:column;font-weight:600;color:var(--tx,#1b2033);overflow:hidden}
.wt-dname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-uname{font-weight:400;font-size:12px;color:var(--mut,#5c6484);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-role{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;flex-shrink:0;border:1px solid transparent}
.r-company_admin{background:var(--em-fill,var(--accent-soft,#eafaf3));color:var(--em-deep,var(--accent-dark,#0b7a53));border-color:var(--em-line,var(--accent-line,#bde9d5))}
.r-member{background:var(--chip,#f1f3fa);color:var(--mut,#5c6484);border-color:var(--chip-line,#e2e6f1)}
.wt-when{color:var(--mut,#5c6484);font-size:12px;white-space:nowrap;flex-shrink:0}
.wt-acts{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wt-acts li{display:flex;align-items:flex-start;gap:12px;background:var(--panel,#fff);border:1px solid var(--line,#e7eaf2);border-radius:var(--r,12px);padding:12px 15px;box-shadow:var(--card-shadow,0 1px 2px rgba(20,24,44,.03))}
.wt-act-ic{width:30px;height:30px;flex:none;border-radius:8px;display:grid;place-items:center;color:var(--danger,#e23b4e);background:color-mix(in srgb,var(--danger,#e23b4e) 12%,transparent)}
.wt-act-main{flex:1;min-width:0}
.wt-act-top{font-size:13.5px;color:var(--tx,#1b2033)}
.wt-act-sess{font-size:12.5px;color:var(--mut,#5c6484);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wt-act-reason{font-size:13px;color:var(--tx,#1b2033);margin-top:6px;font-style:italic;overflow-wrap:anywhere}
@media(max-width:560px){.wt-acts li{flex-wrap:wrap}.wt-acts .wt-when{order:4;width:100%}}
.wt-empty{color:var(--mut,#5c6484);padding:26px 0;text-align:center;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px}
.wt-err{color:var(--danger,#e23b4e);font-size:13px;margin-top:12px}
.wt-ok{display:inline-flex;align-items:center;gap:7px;color:var(--em-deep,var(--accent-dark,#0b7a53));background:var(--em-fill,var(--accent-soft,#eafaf3));border:1px solid var(--em-line,var(--accent-line,#bde9d5));border-radius:10px;padding:8px 13px;font-size:13px;font-weight:600;margin-bottom:14px}
.wt-ok svg{flex-shrink:0}
.wt-form{max-width:520px;margin:0 auto}
.wt-form-sub{color:var(--mut,#5c6484);font-size:14px;margin:0 0 18px}
.wt-label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--tx,#1b2033);margin-bottom:14px}
.wt-label input,.wt-label select{background:var(--field,#fcfdff);border:1px solid var(--line,#e7eaf2);border-radius:10px;padding:10px 12px;color:var(--tx,#1b2033);font:inherit;font-size:14px;font-weight:400;outline:none;transition:border-color .15s,box-shadow .15s}
.wt-label input:focus,.wt-label select:focus{border-color:var(--em,var(--accent,#0e9f6e));box-shadow:0 0 0 3px var(--em-fill,var(--accent-soft,#eafaf3))}
.wt-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;flex-wrap:wrap}
.spin{animation:wt-spin 1s linear infinite}@keyframes wt-spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.wt-head{flex-direction:column}.wt-headacts{justify-content:flex-start}.wt-list li{flex-wrap:wrap;gap:8px}.wt-when{order:4;width:100%}}
`
