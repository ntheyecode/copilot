// Company-admin "Usage & limits": the company admin governs the ONE shared pool
// AdmireVeda granted. They see the live pool and per-person consumption, set
// per-group and per-person ceilings (hours or tasks, per day/week/month) that
// can only TIGHTEN below the pool, request more hours (AdmireVeda approves), and
// read the 75% alerts. No AI model/provider name or AI cost ever appears here.
import React, { useEffect, useState, useCallback } from 'react'
import { Gauge, Users as UsersIcon, Hourglass, BellRing, Check, ChevronDown, ChevronRight, CheckCheck, RefreshCw } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, EmptyState, Spinning } from './_shared.jsx'
import { Meter, pctOf, VIZ_CSS } from './_viz.jsx'

const GROUPS = ['admin', 'supervisor', 'member']
const fmtH = (secs) => { const h = (Number(secs) || 0) / 3600; return h >= 10 || h % 1 === 0 ? `${Math.round(h)}h` : `${h.toFixed(1)}h` }
const secToH = (s) => (s == null ? '' : String(+(Number(s) / 3600).toFixed(3)))
const win = (v) => ({ day: v && v.day != null ? String(v.day) : '', week: v && v.week != null ? String(v.week) : '', month: v && v.month != null ? String(v.month) : '' })
const hoursWin = (v) => ({ day: secToH(v && v.day), week: secToH(v && v.week), month: secToH(v && v.month) })
const numOrNull = (s) => (s === '' || s == null ? null : Number(s))

// One day/week/month triple of inputs (hours as decimals, tasks as whole counts).
// `caption` names the triple (Hours / Tasks) where no column header can: it is
// shown only at narrow widths, where the group grid stacks and hides its header.
function WindowInputs({ value, onChange, step, caption = null }) {
  const t = useT()
  const clean = step === 1 ? (v) => v.replace(/[^0-9]/g, '') : (v) => v.replace(/[^0-9.]/g, '')
  return (
    <div className="ul-win">
      {caption ? <div className="ul-win-cap">{caption}</div> : null}
      {['day', 'week', 'month'].map((w) => (
        <label key={w} className="ul-win-f">
          <span>{t(`companyAdmin.usage.per.${w}`)}</span>
          <input className="wka-input" inputMode={step === 1 ? 'numeric' : 'decimal'} value={value[w]} placeholder={t('companyAdmin.usage.any')} onChange={(e) => onChange({ ...value, [w]: clean(e.target.value) })} />
        </label>
      ))}
    </div>
  )
}

export default function UsageLimits() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [groupForm, setGroupForm] = useState(null)
  const [taskPolicy, setTaskPolicy] = useState({ mode: 'unlimited', day: '', week: '', month: '' })
  const [savingGroups, setSavingGroups] = useState(false)
  const [groupsOk, setGroupsOk] = useState(false)
  const [openUser, setOpenUser] = useState(null)
  const [userEdit, setUserEdit] = useState({})
  const [reqForm, setReqForm] = useState({ hours: '', note: '' })
  const [reqMsg, setReqMsg] = useState('')
  const [reqs, setReqs] = useState([])
  const [notifs, setNotifs] = useState([])
  const [msg, setMsg] = useState('')

  const hydrate = (d) => {
    const g = {}
    for (const grp of GROUPS) { const a = (d.groups && d.groups[grp]) || {}; g[grp] = { hours: hoursWin(a.hours), tasks: win(a.tasks) } }
    setGroupForm(g)
    const tp = (d.policy && d.policy.task) || { mode: 'unlimited' }
    setTaskPolicy({ mode: tp.mode || 'unlimited', day: tp.day != null ? String(tp.day) : '', week: tp.week != null ? String(tp.week) : '', month: tp.month != null ? String(tp.month) : '' })
  }
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [d, rq, nt] = await Promise.all([
        api.workTeamPool(),
        api.workTeamHourRequests().catch(() => ({ requests: [] })),
        api.workTeamNotifications().catch(() => ({ notifications: [] })),
      ])
      hydrate(d); setReqs(rq.requests || []); setNotifs(nt.notifications || [])
      setState({ loading: false, error: null, data: d })
    } catch (e) { setState({ loading: false, error: e, data: null }) }
  }, [])
  useEffect(() => { load() }, [load])

  const saveGroups = async () => {
    if (savingGroups) return
    setSavingGroups(true); setGroupsOk(false); setMsg('')
    const groups = {}
    for (const grp of GROUPS) {
      const f = groupForm[grp]
      groups[grp] = {
        hours: { day: numOrNull(f.hours.day), week: numOrNull(f.hours.week), month: numOrNull(f.hours.month) },
        tasks: { day: numOrNull(f.tasks.day), week: numOrNull(f.tasks.week), month: numOrNull(f.tasks.month) },
      }
    }
    const body = { groups, taskPolicy: { mode: taskPolicy.mode, day: numOrNull(taskPolicy.day), week: numOrNull(taskPolicy.week), month: numOrNull(taskPolicy.month) } }
    try { await api.workTeamSetAllocation(body); setGroupsOk(true); await load() }
    catch (e) { setMsg(e.message || t('companyAdmin.usage.saveFailed')) } finally { setSavingGroups(false) }
  }

  const openUserEdit = (u) => {
    if (openUser === u.id) { setOpenUser(null); return }
    setOpenUser(u.id)
    setUserEdit((s) => ({ ...s, [u.id]: { group: u.group, hours: hoursWin(u.alloc && u.alloc.hours), tasks: win(u.alloc && u.alloc.tasks) } }))
  }
  const saveUser = async (u) => {
    const e = userEdit[u.id]; if (!e) return
    const alloc = {
      hours: { day: numOrNull(e.hours.day), week: numOrNull(e.hours.week), month: numOrNull(e.hours.month) },
      tasks: { day: numOrNull(e.tasks.day), week: numOrNull(e.tasks.week), month: numOrNull(e.tasks.month) },
    }
    const empty = !['day', 'week', 'month'].some((w) => alloc.hours[w] != null || alloc.tasks[w] != null)
    try { await api.workCompanySetUserAllocation(u.id, { group: e.group, alloc: empty ? null : alloc }); setOpenUser(null); await load() }
    catch (err) { setMsg(err.message) }
  }

  const requestHours = async () => {
    const h = Number(reqForm.hours)
    if (!h || h <= 0) { setReqMsg(t('companyAdmin.usage.enterHours')); return }
    setReqMsg('')
    try { await api.workTeamRequestHours(h, reqForm.note.trim()); setReqForm({ hours: '', note: '' }); await load() }
    catch (e) { setReqMsg(e.message) }
  }
  const markNotif = async (id) => { try { await api.workTeamMarkNotification(id); setNotifs((ns) => ns.map((n) => n.id === id ? { ...n, read: true } : n)) } catch { /* ignore */ } }

  if (state.loading) return <Loading label={t('companyAdmin.usage.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const d = state.data
  const pool = d.pool || {}
  const hasPool = pool.monthlySeconds > 0
  const usedPct = pool.usedPct || 0
  const pending = (reqs || []).filter((r) => r.status === 'pending')
  const unread = (notifs || []).filter((n) => !n.read)

  return (
    <div>
      <style>{CSS}{VIZ_CSS}</style>

      {/* Live pool */}
      <div className="wka-panel">
        <h2 style={{ margin: 0 }}><Gauge size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.usage.poolTitle')}</h2>
        {hasPool ? (
          <>
            <p className="desc">{t('companyAdmin.usage.poolDesc', { remaining: fmtH(pool.remainingSeconds), monthly: fmtH(pool.monthlySeconds), reset: d.resetLabel })}</p>
            <div className="ul-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, usedPct)}%` }} className={usedPct >= 90 ? 'hot' : usedPct >= (d.policy.notifyPct || 75) ? 'warn' : ''} /></div>
            <div className="ul-poolstats">
              <div><span>{t('companyAdmin.usage.remaining')}</span><b>{fmtH(pool.remainingSeconds)}</b></div>
              <div><span>{t('companyAdmin.usage.monthly')}</span><b>{fmtH(pool.monthlySeconds)}</b></div>
              <div><span>{t('companyAdmin.usage.used')}</span><b>{usedPct}%</b></div>
              <div><span>{t('companyAdmin.usage.monthEnd')}</span><b>{t(pool.monthEnd === 'carryforward' ? 'companyAdmin.usage.carryforward' : 'companyAdmin.usage.forfeit')}</b></div>
            </div>
          </>
        ) : <p className="desc">{t('companyAdmin.usage.noPool')}</p>}

        {d.policy.requestsEnabled ? (
          <div className="ul-req">
            <div className="co-block-t" style={{ marginBottom: 6 }}><Hourglass size={14} /> {t('companyAdmin.usage.requestTitle')}</div>
            <div className="ul-req-row">
              <input className="wka-input" inputMode="numeric" style={{ width: 120 }} placeholder={t('companyAdmin.usage.hoursPlaceholder')} value={reqForm.hours} onChange={(e) => setReqForm({ ...reqForm, hours: e.target.value.replace(/[^0-9]/g, '') })} />
              <input className="wka-input" style={{ flex: '1 1 200px' }} placeholder={t('companyAdmin.usage.notePlaceholder')} value={reqForm.note} onChange={(e) => setReqForm({ ...reqForm, note: e.target.value })} />
              <button type="button" className="wka-btn primary" onClick={requestHours}>{t('companyAdmin.usage.requestSubmit')}</button>
            </div>
            {reqMsg && <div className="co-msg" style={{ marginTop: 8 }}>{reqMsg}</div>}
            {pending.length > 0 && <div className="ul-dim">{t('companyAdmin.usage.pendingNote', { n: pending.length })}</div>}
            {(reqs || []).slice(0, 5).map((r) => (
              <div key={r.id} className="ul-reqitem"><span>{t('companyAdmin.usage.reqLine', { hours: r.hours })}</span><span className={`ul-status ${r.status}`}>{t(`companyAdmin.usage.status.${r.status}`)}</span></div>
            ))}
          </div>
        ) : <div className="ul-dim" style={{ marginTop: 10 }}>{t('companyAdmin.usage.requestsOff')}</div>}
      </div>

      {/* Group ceilings + task policy */}
      {groupForm && (
        <div className="wka-panel">
          <h2 style={{ margin: 0 }}><UsersIcon size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.usage.groupsTitle')}</h2>
          <p className="desc">{t('companyAdmin.usage.groupsDesc')}</p>
          <div className="ul-grouprow ul-grouphead">
            <span />
            <span className="ul-col-h">{t('companyAdmin.usage.hoursCol')}</span>
            <span className="ul-col-h">{t('companyAdmin.usage.tasksCol')}</span>
          </div>
          {GROUPS.map((grp) => (
            <div key={grp} className="ul-grouprow">
              <div className="ul-group-name">{t(`companyAdmin.usage.groups.${grp}`)}</div>
              <WindowInputs value={groupForm[grp].hours} onChange={(v) => setGroupForm((g) => ({ ...g, [grp]: { ...g[grp], hours: v } }))} step={0.1} caption={t('companyAdmin.usage.hoursCol')} />
              <WindowInputs value={groupForm[grp].tasks} onChange={(v) => setGroupForm((g) => ({ ...g, [grp]: { ...g[grp], tasks: v } }))} step={1} caption={t('companyAdmin.usage.tasksCol')} />
            </div>
          ))}
          <div className="co-block-t" style={{ marginTop: 12 }}>{t('companyAdmin.usage.taskPolicyTitle')}</div>
          <div className="ul-req-row" style={{ marginBottom: 4 }}>
            <select className="wka-select" value={taskPolicy.mode} onChange={(e) => setTaskPolicy({ ...taskPolicy, mode: e.target.value })}>
              <option value="unlimited">{t('companyAdmin.usage.tasksUnlimited')}</option>
              <option value="limited">{t('companyAdmin.usage.tasksLimited')}</option>
            </select>
            {taskPolicy.mode === 'limited' && <WindowInputs value={{ day: taskPolicy.day, week: taskPolicy.week, month: taskPolicy.month }} onChange={(v) => setTaskPolicy({ ...taskPolicy, ...v })} step={1} />}
          </div>
          <div className="ul-dim" style={{ marginBottom: 8 }}>{t('companyAdmin.usage.anyHint')}</div>
          {msg && <div className="co-msg">{msg}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="wka-btn primary" disabled={savingGroups} onClick={saveGroups}>{savingGroups ? <Spinning /> : <Check size={14} />} {t('companyAdmin.usage.saveGroups')}</button>
            {groupsOk && <span className="wka-saved"><Check size={14} /> {t('companyAdmin.usage.saved')}</span>}
          </div>
        </div>
      )}

      {/* Per-person consumption + overrides */}
      <div className="wka-panel">
        <h2 style={{ margin: 0 }}><UsersIcon size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.usage.peopleTitle')}</h2>
        <p className="desc">{t('companyAdmin.usage.peopleDesc')}</p>
        {(!d.byUser || d.byUser.length === 0) ? <EmptyState title={t('companyAdmin.usage.noPeople')} />
          : (
            <div className="ul-people">
              {d.byUser.map((u) => {
                const hM = u.hours && u.hours.month, tM = u.tasks && u.tasks.month
                const open = openUser === u.id, ed = userEdit[u.id]
                // The bar reads against this person's monthly hour limit when one
                // is set, else as their share of the company pool (honest, no cap).
                const usedM = u.consumedSeconds.month
                const limited = !!(hM && hM.limit != null)
                const barMax = limited ? hM.limit : (pool.monthlySeconds || 0)
                const barHint = limited ? t('companyPlan.usage.ofLimit', { pct: hM.pct != null ? hM.pct : pctOf(usedM, hM.limit) }) : t('companyPlan.usage.ofPool', { pct: pctOf(usedM, barMax) })
                return (
                  <div key={u.id} className="ul-person">
                    <button className="ul-person-head" onClick={() => openUserEdit(u)} aria-expanded={open}>
                      {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      <span className="ul-person-name">{u.displayName}</span>
                      <span className="ul-chip">{t(`companyAdmin.usage.groups.${u.group}`)}</span>
                      <span className="ul-person-use">
                        {t('companyAdmin.usage.usedHoursMonth', { used: fmtH(u.consumedSeconds.month) })}
                        {hM && hM.limit != null ? ` / ${fmtH(hM.limit)} (${hM.pct}%)` : ''}
                        {' · '}{t('companyAdmin.usage.usedTasksMonth', { n: u.taskCount.month })}
                        {tM && tM.limit != null ? ` / ${tM.limit}` : ''}
                      </span>
                      {barMax > 0 ? (
                        <span className="ul-person-bar" title={barHint}>
                          <Meter value={usedM} max={barMax} thin warnAt={limited ? (d.policy.notifyPct || 75) : 101} hotAt={limited ? 100 : 101} tone={limited ? undefined : 'accent'} ariaLabel={`${u.displayName}: ${barHint}`} />
                        </span>
                      ) : null}
                    </button>
                    {open && ed && (
                      <div className="ul-person-body">
                        <label className="ul-win-f" style={{ maxWidth: 200 }}>
                          <span>{t('companyAdmin.usage.group')}</span>
                          <select className="wka-select" value={ed.group} onChange={(e) => setUserEdit((s) => ({ ...s, [u.id]: { ...s[u.id], group: e.target.value } }))}>
                            {GROUPS.map((g) => <option key={g} value={g}>{t(`companyAdmin.usage.groups.${g}`)}</option>)}
                          </select>
                        </label>
                        <div className="ul-override-grid">
                          <div><div className="ul-sub">{t('companyAdmin.usage.hoursCol')}</div><WindowInputs value={ed.hours} onChange={(v) => setUserEdit((s) => ({ ...s, [u.id]: { ...s[u.id], hours: v } }))} step={0.1} /></div>
                          <div><div className="ul-sub">{t('companyAdmin.usage.tasksCol')}</div><WindowInputs value={ed.tasks} onChange={(v) => setUserEdit((s) => ({ ...s, [u.id]: { ...s[u.id], tasks: v } }))} step={1} /></div>
                        </div>
                        <div className="ul-dim">{t('companyAdmin.usage.overrideHint')}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="wka-btn sm primary" onClick={() => saveUser(u)}><Check size={13} /> {t('companyAdmin.usage.saveUser')}</button>
                          <button type="button" className="wka-btn sm ghost" onClick={() => setOpenUser(null)}>{t('companyAdmin.usage.cancel')}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {/* Alerts */}
      <div className="wka-panel">
        <div className="ul-head">
          <h2 style={{ margin: 0 }}><BellRing size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('companyAdmin.usage.alertsTitle')} {unread.length > 0 ? <span className="ul-unread">{unread.length}</span> : null}</h2>
          <span className="wka-spacer" />
          <button type="button" className="wka-btn sm ghost" onClick={load}><RefreshCw size={14} /> {t('companyAdmin.usage.refresh')}</button>
          {unread.length > 0 && <button type="button" className="wka-btn sm" onClick={() => api.workTeamMarkNotification().then(load)}><CheckCheck size={14} /> {t('companyAdmin.usage.markAll')}</button>}
        </div>
        {(!notifs || notifs.length === 0) ? <EmptyState title={t('companyAdmin.usage.noAlerts')} detail={t('companyAdmin.usage.noAlertsDetail')} />
          : (
            <div className="ul-notifs">
              {notifs.map((n) => (
                <div key={n.id} className={`ul-notif${n.read ? '' : ' unread'}`} onClick={() => !n.read && markNotif(n.id)}>
                  <div className="ul-notif-title">{n.title}</div>
                  {n.body ? <div className="ul-notif-body">{n.body}</div> : null}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

const CSS = `
.ul-meter{height:9px;border-radius:999px;background:var(--wka-line-2);overflow:hidden;margin:4px 0 12px}
.ul-meter>span{display:block;height:100%;background:var(--wka-emerald);border-radius:999px;transition:width .3s}
.ul-meter>span.warn{background:var(--wka-amber)}
.ul-meter>span.hot{background:var(--wka-red)}
.ul-poolstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
.ul-poolstats>div{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid var(--wka-line);border-radius:10px;background:var(--wka-panel)}
.ul-poolstats span{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--wka-faint)}
.ul-poolstats b{font-size:16px;color:var(--wka-text)}
.ul-req{margin-top:16px;padding-top:14px;border-top:1px solid var(--wka-line)}
.ul-req-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ul-reqitem{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--wka-muted);padding:6px 0;border-top:1px dashed var(--wka-line);margin-top:6px}
.ul-status{font-weight:700;font-size:11.5px;padding:2px 9px;border-radius:999px;white-space:nowrap}
.ul-status.pending{color:var(--wka-amber);background:color-mix(in srgb,var(--wka-amber) 12%,transparent)}
.ul-status.approved{color:var(--wka-emerald);background:color-mix(in srgb,var(--wka-emerald) 12%,transparent)}
.ul-status.denied{color:var(--wka-red);background:color-mix(in srgb,var(--wka-red) 12%,transparent)}
.ul-dim{font-size:12px;color:var(--wka-faint);margin-top:6px}
.ul-grouprow{display:grid;grid-template-columns:120px 1fr 1fr;gap:14px;align-items:center;padding:10px 0;border-top:1px solid var(--wka-line)}
.ul-grouphead{border-top:none;padding-bottom:0}
.ul-col-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--wka-faint)}
.ul-group-name{font-size:13px;font-weight:600;color:var(--wka-text)}
.ul-win{display:flex;gap:8px;flex-wrap:wrap}
.ul-win-cap{display:none;flex:1 0 100%;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--wka-faint);margin-bottom:-2px}
.ul-win-f{display:flex;flex-direction:column;gap:3px;flex:1 1 72px;min-width:64px}
.ul-win-f>span{font-size:11px;color:var(--wka-faint)}
.ul-win-f .wka-input{width:100%}
.ul-people{display:flex;flex-direction:column;gap:8px}
.ul-person{border:1px solid var(--wka-line);border-radius:10px;background:var(--wka-panel);overflow:hidden}
.ul-person-head{width:100%;display:flex;align-items:center;gap:9px;flex-wrap:wrap;background:none;border:none;cursor:pointer;font:inherit;color:var(--wka-text);padding:11px 13px;text-align:left}
.ul-person-head:hover{background:var(--wka-panel-2)}
.ul-person-head>svg{flex:none;color:var(--wka-faint)}
.ul-person-name{font-weight:600;font-size:13.5px}
.ul-chip{font-size:11px;font-weight:700;color:var(--wka-accent-ink,var(--wka-accent));background:var(--wka-accent-soft,color-mix(in srgb,var(--wka-accent) 12%,transparent));border-radius:999px;padding:2px 9px;white-space:nowrap}
.ul-person-use{margin-left:auto;font-size:12px;color:var(--wka-muted);white-space:nowrap}
.ul-person-bar{flex:1 0 100%;display:block;min-width:0;padding-left:24px}
.ul-person-body{padding:12px 13px;border-top:1px solid var(--wka-line);background:var(--wka-bg-2);display:flex;flex-direction:column;gap:12px}
.ul-override-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ul-sub{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--wka-faint);margin-bottom:5px}
.ul-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.ul-unread{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;font-size:11px;font-weight:800;color:#1a1200;background:var(--wka-amber);margin-left:4px}
.ul-notifs{display:flex;flex-direction:column;gap:8px}
.ul-notif{padding:11px 13px;border:1px solid var(--wka-line);border-radius:10px;background:var(--wka-panel)}
.ul-notif.unread{cursor:pointer;border-color:color-mix(in srgb,var(--wka-accent) 40%,transparent);background:color-mix(in srgb,var(--wka-accent) 5%,transparent)}
.ul-notif-title{font-size:13px;font-weight:600;color:var(--wka-text);overflow-wrap:anywhere}
.ul-notif-body{font-size:12.5px;color:var(--wka-muted);margin-top:3px;overflow-wrap:anywhere}
@media(max-width:720px){
  .ul-grouprow{grid-template-columns:1fr;gap:8px}
  .ul-grouphead{display:none}
  .ul-win-cap{display:block}
  .ul-group-name{margin-top:4px}
  .ul-override-grid{grid-template-columns:1fr}
  .ul-person-use{margin-left:0;width:100%;white-space:normal}
  .ul-person-bar{padding-left:0}
}
`
