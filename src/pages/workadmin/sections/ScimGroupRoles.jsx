// Company console, SCIM tab: map identity-provider groups to WorkCoPilot roles
// and grants (server/scim_roles.js). The role and grant choices come from the
// client role registry (src/shared/work_roles_options.js), never a second list;
// the server validates the same ids against server/work_roles.js. Membership
// then sets each person's role: the highest one across their mapped groups and
// every grant. Every string comes from i18n (ssoSetup.scimRoles.*).
import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, GitMerge, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { ErrorBox, Spinning, EmptyState, useReasonModal } from './_shared.jsx'
import { COMPANY_ROLE_OPTIONS, GRANT_OPTIONS } from '../../../shared/work_roles_options.js'

const LABEL_KEY = Object.fromEntries([...COMPANY_ROLE_OPTIONS, ...GRANT_OPTIONS].map((o) => [o.id, o.labelKey]))

export default function ScimGroupRoles() {
  const t = useT()
  const [data, setData] = useState(null)
  const [group, setGroup] = useState('')
  const [target, setTarget] = useState('project_manager')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')
  const [askReason, reasonModal] = useReasonModal()
  const load = useCallback(() => api.workCompanyScimRoleMappings().then(setData).catch(setErr), [])
  useEffect(() => { load() }, [load])

  const add = async () => {
    setBusy(true); setErr(null); setOk('')
    try {
      const r = await api.workCompanyAddScimRoleMapping({ group: group.trim(), target })
      setOk(t('ssoSetup.scimRoles.added', { n: r.changed })); setGroup(''); load()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const remove = async (m) => {
    const reason = await askReason({ title: t('ssoSetup.scimRoles.removeTitle', { group: m.group }), detail: t('ssoSetup.scimRoles.removeConfirm'), confirmLabel: t('ssoSetup.scimRoles.remove') })
    if (!reason) return
    setBusy(true); setErr(null); setOk('')
    try { const r = await api.workCompanyRemoveScimRoleMapping(m.id, reason);setOk(t('ssoSetup.scimRoles.removed', { n: r.changed })); load() }
    catch (e) { setErr(e) } finally { setBusy(false) }
  }

  const mappings = (data && data.mappings) || []
  const groups = (data && data.groups) || []
  return (
    <div className="wka-panel" data-testid="scim-roles">
      {reasonModal}
      <h2 className="sso-h"><GitMerge size={16} /> {t('ssoSetup.scimRoles.title')}</h2>
      <p className="desc">{t('ssoSetup.scimRoles.desc')}</p>
      <ul className="scr-rules">
        <li>{t('ssoSetup.scimRoles.ruleUnion')}</li>
        <li>{t('ssoSetup.scimRoles.ruleLeave')}</li>
        <li>{t('ssoSetup.scimRoles.ruleAdmin')}</li>
      </ul>
      {data && data.managed ? <div className="wka-note"><Check size={14} /> <span style={{ minWidth: 0 }}>{t('ssoSetup.scimRoles.managedCount', { n: data.managed })}</span></div> : null}
      {!data ? null : !mappings.length ? <EmptyState title={t('ssoSetup.scimRoles.none')} /> : (
        <ul className="scr-list" aria-label={t('ssoSetup.scimRoles.listAria')}>
          {mappings.map((m) => (
            <li key={m.id} className="scr-row" data-testid="scim-role-mapping">
              <div className="scr-group">
                <b>{m.matched ? m.matched.displayName : m.group}</b>
                <span className="sso-dim">{m.matched ? t('ssoSetup.scimRoles.matched', { n: m.matched.members }) : t('ssoSetup.scimRoles.notFound')}</span>
              </div>
              <ArrowRight size={14} className="scr-arrow" aria-hidden />
              <span className={`sso-pill ok scr-target ${m.kind}`}>{t(LABEL_KEY[m.target] || m.target)}</span>
              <button type="button" className="wka-btn sm ghost danger" disabled={busy} onClick={() => remove(m)}><Trash2 size={13} /> {t('ssoSetup.scimRoles.remove')}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="sso-create scr-form">
        <div className="wka-field">
          <label htmlFor="scr-group">{t('ssoSetup.scimRoles.group')}</label>
          <input id="scr-group" className="wka-input" list="scr-groups" value={group} maxLength={200} placeholder={t('ssoSetup.scimRoles.groupPlaceholder')} onChange={(e) => setGroup(e.target.value)} />
          <datalist id="scr-groups">{groups.map((g) => <option key={g.id} value={g.displayName} />)}</datalist>
        </div>
        <div className="wka-field">
          <label htmlFor="scr-target">{t('ssoSetup.scimRoles.target')}</label>
          <select id="scr-target" className="wka-select" value={target} onChange={(e) => setTarget(e.target.value)}>
            <optgroup label={t('ssoSetup.scimRoles.roles')}>{COMPANY_ROLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}</optgroup>
            <optgroup label={t('ssoSetup.scimRoles.grants')}>{GRANT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}</optgroup>
          </select>
        </div>
        <button type="button" className="wka-btn primary" disabled={busy || !group.trim()} onClick={add} data-testid="scim-role-add">{busy ? <Spinning /> : <Plus size={14} />} {t('ssoSetup.scimRoles.add')}</button>
      </div>
      {ok ? <div className="wka-note" style={{ color: 'var(--wka-emerald)', marginTop: 12 }}><Check size={14} /> <span style={{ minWidth: 0 }}>{ok}</span></div> : null}
      {err ? <div style={{ marginTop: 12 }}><ErrorBox error={err} /></div> : null}
      <style>{SCR_CSS}</style>
    </div>
  )
}

// Scoped (scr-), on the wka tokens so light and dark follow the console theme.
// Rows wrap instead of overflowing; long group names break anywhere.
const SCR_CSS = `
.scr-rules{margin:0 0 12px;padding-left:18px;display:grid;gap:4px;font-size:12.5px;color:var(--wka-muted);line-height:1.5}
.scr-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.scr-row{display:flex;align-items:center;gap:10px;border:1px solid var(--wka-line);border-radius:11px;padding:10px 12px;min-width:0;flex-wrap:wrap}
.scr-group{display:grid;gap:2px;flex:1 1 200px;min-width:0}
.scr-group b{overflow-wrap:anywhere}
.scr-arrow{color:var(--wka-faint);flex-shrink:0}
.scr-target{flex-shrink:0}
.scr-target.grant{color:var(--wka-accent);border-color:color-mix(in srgb, var(--wka-accent) 40%, transparent);background:color-mix(in srgb, var(--wka-accent) 8%, transparent)}
.scr-row .wka-btn{flex-shrink:0;white-space:nowrap}
.scr-form .wka-input,.scr-form .wka-select{height:40px;box-sizing:border-box}
.scr-form .wka-btn{flex-shrink:0;white-space:nowrap}
`
