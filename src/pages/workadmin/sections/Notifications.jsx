// Superadmin notifications: the one page where AdmireVeda sees every enterprise
// alert (a company crossing its pool threshold, an additional-hours request) and
// learns who receives what. The feed is the in-app channel (email is the second
// channel, sent in parallel), so a down mailer never loses an alert.
import React, { useEffect, useState, useCallback } from 'react'
import { Bell, BellRing, Gauge, Hourglass, CheckCheck, RefreshCw, Info } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'

const ICON = { company_pool_threshold: Gauge, hours_requested: Hourglass, hours_decided: CheckCheck }

function timeAgo(t, iso) {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  const m = Math.round(ms / 60000)
  if (m < 1) return t('superAdmin.notifications.justNow')
  if (m < 60) return t('superAdmin.notifications.minsAgo', { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return t('superAdmin.notifications.hoursAgo', { n: h })
  return t('superAdmin.notifications.daysAgo', { n: Math.round(h / 24) })
}

export default function Notifications() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, items: [], unread: 0 })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.adminNotifications(100); setState({ loading: false, error: null, items: d.notifications || [], unread: d.unread || 0 }) }
    catch (e) { setState({ loading: false, error: e, items: [], unread: 0 }) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { const id = setInterval(load, 60000); return () => clearInterval(id) }, [load])

  const markAll = async () => { if (busy) return; setBusy(true); try { await workAdminApi.markAdminNotification(); await load() } finally { setBusy(false) } }
  const markOne = async (id) => { try { await workAdminApi.markAdminNotification(id); setState((s) => ({ ...s, items: s.items.map((n) => n.id === id ? { ...n, read: true } : n), unread: Math.max(0, s.unread - 1) })) } catch { /* ignore */ } }

  const RULES = [
    { icon: Gauge, who: t('superAdmin.notifications.rules.poolWho'), what: t('superAdmin.notifications.rules.poolWhat') },
    { icon: Hourglass, who: t('superAdmin.notifications.rules.requestWho'), what: t('superAdmin.notifications.rules.requestWhat') },
    { icon: Bell, who: t('superAdmin.notifications.rules.userWho'), what: t('superAdmin.notifications.rules.userWhat') },
    { icon: CheckCheck, who: t('superAdmin.notifications.rules.decisionWho'), what: t('superAdmin.notifications.rules.decisionWhat') },
  ]

  return (
    <div>
      <style>{CSS}</style>
      <div className="wka-panel">
        <div className="wn-head">
          <h2 style={{ margin: 0 }}><Info size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('superAdmin.notifications.howTitle')}</h2>
        </div>
        <p className="desc">{t('superAdmin.notifications.howDesc')}</p>
        <div className="wn-rules">
          {RULES.map((r, i) => {
            const Ic = r.icon
            return <div key={i} className="wn-rule"><span className="wn-rule-ic"><Ic size={15} /></span><div><div className="wn-rule-what">{r.what}</div><div className="wn-rule-who">{r.who}</div></div></div>
          })}
        </div>
      </div>

      <div className="wka-panel">
        <div className="wn-head">
          <h2 style={{ margin: 0 }}><BellRing size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('superAdmin.notifications.feedTitle')} {state.unread > 0 ? <span className="wn-unread">{state.unread}</span> : null}</h2>
          <span className="wka-spacer" />
          <button type="button" className="wka-btn sm ghost" onClick={load} title={t('superAdmin.notifications.refresh')}><RefreshCw size={14} /> {t('superAdmin.notifications.refresh')}</button>
          {state.unread > 0 ? <button type="button" className="wka-btn sm" disabled={busy} onClick={markAll}>{busy ? <Spinning /> : <CheckCheck size={14} />} {t('superAdmin.notifications.markAll')}</button> : null}
        </div>
        {state.loading ? <Loading label={t('superAdmin.notifications.loading')} />
          : state.error ? <ErrorBox error={state.error} onRetry={load} />
            : state.items.length === 0 ? <EmptyState title={t('superAdmin.notifications.emptyTitle')} detail={t('superAdmin.notifications.emptyDetail')} />
              : (
                <div className="wn-list">
                  {state.items.map((n) => {
                    const Ic = ICON[n.type] || Bell
                    return (
                      <div key={n.id} className={`wn-item${n.read ? '' : ' unread'}`} onClick={() => !n.read && markOne(n.id)}>
                        <span className="wn-ic"><Ic size={16} /></span>
                        <div className="wn-main">
                          <div className="wn-title">{n.title}</div>
                          {n.body ? <div className="wn-body">{n.body}</div> : null}
                        </div>
                        <span className="wn-time">{timeAgo(t, n.at)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
      </div>
    </div>
  )
}

const CSS = `
.wn-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wn-unread{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;font-size:11px;font-weight:800;color:#1a1200;background:var(--wka-amber);vertical-align:middle;margin-left:4px}
.wn-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:6px}
.wn-rule{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border:1px solid var(--wka-line);border-radius:10px;background:var(--wka-panel)}
.wn-rule-ic{display:inline-flex;color:var(--wka-accent);flex:none;margin-top:1px}
.wn-rule-what{font-size:13px;font-weight:600;color:var(--wka-text)}
.wn-rule-who{font-size:12px;color:var(--wka-faint);margin-top:2px}
.wn-list{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.wn-item{display:flex;gap:11px;align-items:flex-start;padding:12px 14px;border:1px solid var(--wka-line);border-radius:10px;background:var(--wka-panel);cursor:default}
.wn-item.unread{cursor:pointer;border-color:color-mix(in srgb, var(--wka-accent) 40%, transparent);background:color-mix(in srgb, var(--wka-accent) 5%, transparent)}
.wn-ic{display:inline-flex;color:var(--wka-accent);flex:none;margin-top:1px}
.wn-main{flex:1;min-width:0}
.wn-title{font-size:13.5px;font-weight:600;color:var(--wka-text);overflow-wrap:anywhere}
.wn-body{font-size:12.5px;color:var(--wka-muted);margin-top:3px;overflow-wrap:anywhere}
.wn-time{font-size:11.5px;color:var(--wka-faint);white-space:nowrap;flex:none}
@media(max-width:640px){.wn-time{display:none}}
`
