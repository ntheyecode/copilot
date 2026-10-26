// Data governance (DLP) policy per company. Pick a company, seed defaults from a
// compliance framework, fine-tune the action per category, add free-flow block
// words (with the honest risk warning), choose scrub vs tokenize, then arm/lock.
// The armed policy is enforced on every outbound AI call by the server.
//
// UX: both the retention card and the policy editor COLLAPSE to a read-only
// record after they have values; an Edit button reopens the form (Cancel reverts
// to the last-saved values). The armed/locked status stays visible on the policy
// record. Non-superadmins only ever see the records.
import React, { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Lock, AlertTriangle, Plus, Trash2, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag, RecRow, EditToggle } from './_shared.jsx'
import PolicyRules from './PolicyRules.jsx'
import { useT } from '../../../i18n/index.jsx'

const ACTIONS = ['send', 'mask', 'withhold', 'tokenize']

// Platform-wide automatic data retention. 0 = keep forever (default). When set,
// sessions (and their screenshots + audit) older than N days are auto-purged on
// an hourly sweep, and immediately when saved. Superadmin-only.
function RetentionCard({ isSuperAdmin }) {
  const t = useT()
  const [days, setDays] = useState('')
  const [baseline, setBaseline] = useState('0')   // last-saved value, for Cancel
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [purged, setPurged] = useState(null)

  const load = useCallback(async () => {
    try { const d = await workAdminApi.getRetention(); const v = String(d.retentionDays ?? 0); setDays(v); setBaseline(v); setEditing(false); setLoaded(true) }
    catch (e) { setError(e); setLoaded(true) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!isSuperAdmin || saving) return
    const n = Number(days)
    setSaving(true); setError(null); setSaved(false); setPurged(null)
    try {
      const r = await workAdminApi.setRetention(n)
      const v = String(r.retentionDays); setDays(v); setBaseline(v); setPurged(r.purged || 0); setEditing(false)
      setSaved(true); setTimeout(() => setSaved(false), 2400)
    } catch (e) { setError(e) } finally { setSaving(false) }
  }
  const cancel = () => { setDays(baseline); setError(null); setSaved(false); setEditing(false) }

  const n = Number(days)
  const recLabel = Number(baseline) > 0 ? t.n('governanceAdmin.retention.days', Number(baseline)) : t('governanceAdmin.retention.keepForever')
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('governanceAdmin.retention.title')}</h2>
        {loaded && !editing ? <EditToggle editing={editing} disabled={!isSuperAdmin} onEdit={() => { setDays(baseline); setEditing(true); setError(null) }} /> : null}
      </div>
      <p className="desc">{t.rich('governanceAdmin.retention.desc')}</p>
      {!loaded ? <Loading label={t('governanceAdmin.retention.loading')} />
        : !editing ? (
          <>
            <div className="wka-record"><RecRow label={t('governanceAdmin.retention.windowLabel')} value={recLabel} /></div>
            {error ? <div style={{ margin: '10px 0' }}><ErrorBox error={error} /></div> : null}
            {!isSuperAdmin ? <div className="wka-note" style={{ marginTop: 8 }}><Lock size={14} /> {t('governanceAdmin.retention.superadminOnly')}</div> : null}
            <SavedTag show={saved} />
            {purged != null && purged > 0 ? <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{t.n('governanceAdmin.retention.purgedLastSave', purged)}</span> : null}
          </>
        ) : (
          <>
            <div className="wka-field" style={{ maxWidth: 260 }}>
              <label>{t('governanceAdmin.retention.windowDays')}</label>
              <input className="wka-input" type="number" min="0" max="3650" step="1" disabled={!isSuperAdmin}
                value={days} onChange={(e) => setDays(e.target.value)} />
              <span className="hint">{n > 0 ? t.n('governanceAdmin.retention.purgeHint', n) : t('governanceAdmin.retention.keepForeverDot')}</span>
            </div>
            {error ? <div style={{ margin: '10px 0' }}><ErrorBox error={error} /></div> : null}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button type="button" className="wka-btn primary" disabled={saving || !Number.isInteger(n) || n < 0 || n > 3650} onClick={save}>{saving ? <Spinning /> : null} {t('governanceAdmin.retention.save')}</button>
              <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('governanceAdmin.retention.cancel')}</button>
              <SavedTag show={saved} />
              {purged != null && purged > 0 ? <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{t.n('governanceAdmin.retention.purgedNow', purged)}</span> : null}
              {purged === 0 && saved ? <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('governanceAdmin.retention.nothingToPurge')}</span> : null}
            </div>
          </>
        )}
    </div>
  )
}

export default function Governance({ isSuperAdmin }) {
  const t = useT()
  const [companies, setCompanies] = useState(null)
  const [companyId, setCompanyId] = useState('')
  const [state, setState] = useState({ loading: false, error: null, policy: null, presets: {}, labels: {}, categories: [] })
  const [baseline, setBaseline] = useState(null)   // last-saved policy, for Cancel
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  useEffect(() => {
    workAdminApi.companies()
      .then((r) => { const list = (r && r.companies) || (Array.isArray(r) ? r : []); setCompanies(list); if (list.length) setCompanyId((id) => id || list[0].id) })
      .catch(() => setCompanies([]))
  }, [])   // eslint-disable-line

  // A policy is "configured" (start collapsed) once it has been armed, saved, or
  // given any frameworks/words/fields. A brand-new blank policy opens in the form.
  const isConfigured = (pol) => !!(pol && (pol.version > 0 || pol.armed || (pol.frameworks || []).length || (pol.blockWords || []).length || (pol.customFields || []).length))

  const load = useCallback(() => {
    if (!companyId) return
    setState((s) => ({ ...s, loading: true, error: null })); setSaved(false); setSaveErr(null)
    workAdminApi.policy(companyId)
      .then((r) => {
        const pol = r.policy || {}
        setState({ loading: false, error: null, policy: pol, presets: r.presets || {}, labels: r.labels || {}, categories: r.categories || [] })
        setBaseline(pol)
        setEditing(isSuperAdmin && !isConfigured(pol))   // superadmin + brand-new policy -> open the form; else start on the record
      })
      .catch((error) => setState((s) => ({ ...s, loading: false, error })))
  }, [companyId, isSuperAdmin])
  useEffect(() => { load() }, [load])

  const p = state.policy
  const patchPolicy = (patch) => setState((s) => ({ ...s, policy: { ...s.policy, ...patch } }))
  const setCat = (cat, action) => setState((s) => ({ ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), [cat]: action } } }))
  const applyPreset = (key) => {
    setState((s) => {
      const cur = s.policy.frameworks || []
      const isOn = cur.includes(key)
      if (isOn) {
        // Toggle OFF: deselect the framework. Category actions it seeded are left
        // as-is (the operator tuned them); clearing all frameworks resets nothing.
        return { ...s, policy: { ...s.policy, frameworks: cur.filter((k) => k !== key) } }
      }
      // Toggle ON: select it and seed its sensible category defaults.
      const preset = s.presets[key] || {}
      return { ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), ...preset }, frameworks: [...cur, key] } }
    })
  }
  const save = async () => {
    if (!isSuperAdmin || saving || !p) return
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const r = await workAdminApi.setPolicy({
        companyId, _unlock: true,   // superadmin may always change
        categories: p.categories || {}, blockWords: p.blockWords || [], frameworks: p.frameworks || [],
        customFields: (p.customFields || []).filter((f) => f && String(f.label || '').trim() && String(f.pattern || '').trim()),
        guidanceRules: (p.guidanceRules || []).filter((r) => r && String(r.pattern || '').trim()),
        policyDocs: p.policyDocs || [],
        mode: p.mode || 'scrub', armed: !!p.armed, locked: !!p.locked,
      })
      setState((s) => ({ ...s, policy: r.policy })); setBaseline(r.policy); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }
  const cancel = () => { setState((s) => ({ ...s, policy: baseline })); setSaveErr(null); setSaved(false); setEditing(false) }

  if (companies == null) return <Loading label={t('governanceAdmin.loadingCompanies')} />
  if (!companies.length) return (
    <div>
      <RetentionCard isSuperAdmin={isSuperAdmin} />
      <div className="wka-note">{t('governanceAdmin.createCompanyFirst')}</div>
    </div>
  )

  return (
    <div>
      <RetentionCard isSuperAdmin={isSuperAdmin} />
      {!isSuperAdmin && <div className="wka-note"><Lock size={14} /> {t('governanceAdmin.superadminOnlyPolicy')}</div>}
      <div className="wka-toolbar">
        <label style={{ fontSize: 13, color: 'var(--wka-muted)' }}>{t('governanceAdmin.companyLabel')}</label>
        <select className="wka-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {state.loading ? <Loading label={t('governanceAdmin.loadingPolicy')} /> : state.error ? <ErrorBox error={state.error} onRetry={load} /> : p && (
        !editing ? (
          // ---- Collapsed policy record ----
          <div className="wka-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('governanceAdmin.record.title')}</h2>
              <EditToggle editing={editing} disabled={!isSuperAdmin} onEdit={() => { setState((s) => ({ ...s, policy: baseline })); setEditing(true); setSaveErr(null) }} />
            </div>
            <p className="desc">{t('governanceAdmin.record.desc')} {isSuperAdmin ? t('governanceAdmin.record.clickEdit') : ''}</p>
            <div className="wka-record">
              <RecRow label={t('governanceAdmin.record.status')} value={
                <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: p.armed ? 'var(--wka-emerald)' : 'var(--wka-amber)', fontWeight: 600 }}>{p.armed ? t('governanceAdmin.record.armed') : t('governanceAdmin.record.notArmed')}</span>
                  <span style={{ color: 'var(--wka-faint)' }}>·</span>
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{p.locked ? <><Lock size={12} /> {t('governanceAdmin.record.locked')}</> : t('governanceAdmin.record.unlocked')}</span>
                </span>
              } />
              <RecRow label={t('governanceAdmin.record.mode')} value={p.mode === 'tokenize' ? t('governanceAdmin.record.modeTokenize') : t('governanceAdmin.record.modeScrub')} />
              <RecRow label={t('governanceAdmin.record.frameworks')} value={(p.frameworks || []).length ? (p.frameworks || []).map((k) => k.toUpperCase().replace(/_/g, ' ')).join(', ') : t('governanceAdmin.record.none')} />
              <RecRow label={t('governanceAdmin.record.categoryRules')} value={t('governanceAdmin.record.categoryRulesSet', { n: Object.keys(p.categories || {}).length })} />
              <RecRow label={t('governanceAdmin.record.blockWords')} value={`${(p.blockWords || []).length}`} />
              <RecRow label={t('governanceAdmin.record.customFields')} value={`${(p.customFields || []).length}`} />
              <RecRow label={t('governanceAdmin.record.practiceRules')} value={`${(p.guidanceRules || []).length}${(p.guidanceRules || []).length ? t('governanceAdmin.record.practiceRulesBreakdown', { forbid: (p.guidanceRules || []).filter((r) => r.kind !== 'require').length, require: (p.guidanceRules || []).filter((r) => r.kind === 'require').length }) : ''}`} />
              <RecRow label={t('governanceAdmin.record.version')} value={`${p.version || 0}`} />
            </div>
            <SavedTag show={saved} />
          </div>
        ) : (
        <>
          <div className="wka-panel">
            <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('governanceAdmin.frameworks.title')}</h2>
            <p className="desc">{t('governanceAdmin.frameworks.desc')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(state.presets).map((k) => (
                <button key={k} type="button" className={`wka-btn sm${(p.frameworks || []).includes(k) ? ' primary' : ''}`} disabled={!isSuperAdmin} onClick={() => applyPreset(k)} title={state.labels[k] || k}>{k.toUpperCase().replace(/_/g, ' ')}</button>
              ))}
            </div>
          </div>

          <div className="wka-panel">
            <h2>{t('governanceAdmin.categories.title')}</h2>
            <p className="desc">{t('governanceAdmin.categories.desc')}</p>
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>{t('governanceAdmin.categories.colCategory')}</th><th>{t('governanceAdmin.categories.colAction')}</th></tr></thead>
                <tbody>
                  {state.categories.map((cat) => (
                    <tr key={cat}>
                      <td style={{ textTransform: 'capitalize' }}>{cat}</td>
                      <td><select className="wka-select" value={(p.categories || {})[cat] || 'withhold'} disabled={!isSuperAdmin} onChange={(e) => setCat(cat, e.target.value)}>
                        {ACTIONS.map((a) => <option key={a} value={a}>{t(`governanceAdmin.actions.${a}`)}</option>)}
                      </select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="wka-panel">
            <h2>{t('governanceAdmin.blockWords.title')}</h2>
            <p className="desc">{t('governanceAdmin.blockWords.desc')}</p>
            <textarea className="wka-input" style={{ width: '100%', minHeight: 92, resize: 'vertical' }} disabled={!isSuperAdmin}
              value={(p.blockWords || []).join('\n')}
              onChange={(e) => patchPolicy({ blockWords: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
              placeholder={t('governanceAdmin.blockWords.placeholder')} />
            {(p.blockWords || []).length > 0 && (
              <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--wka-amber)', display: 'flex', gap: 8 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {t('governanceAdmin.blockWords.warning')}
              </div>
            )}
          </div>

          <div className="wka-panel">
            <h2>{t('governanceAdmin.customFields.title')}</h2>
            <p className="desc">{t.rich('governanceAdmin.customFields.desc')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(p.customFields || []).map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto auto', gap: 8, alignItems: 'center' }}>
                  <input className="wka-input" placeholder={t('governanceAdmin.customFields.labelPlaceholder')} disabled={!isSuperAdmin} value={f.label || ''}
                    onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], label: e.target.value }; patchPolicy({ customFields: cf }) }} />
                  <input className="wka-input" placeholder={t('governanceAdmin.customFields.matchPlaceholder')} disabled={!isSuperAdmin} value={f.pattern || ''}
                    onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], pattern: e.target.value }; patchPolicy({ customFields: cf }) }} />
                  <select className="wka-select" disabled={!isSuperAdmin} value={f.action || 'redact'}
                    onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], action: e.target.value }; patchPolicy({ customFields: cf }) }}>
                    <option value="redact">{t('governanceAdmin.customFields.redact')}</option>
                    <option value="block">{t('governanceAdmin.customFields.block')}</option>
                  </select>
                  <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin} title={t('governanceAdmin.customFields.remove')}
                    onClick={() => { const cf = (p.customFields || []).filter((_, k) => k !== i); patchPolicy({ customFields: cf }) }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button type="button" className="wka-btn sm" style={{ marginTop: 10 }} disabled={!isSuperAdmin}
              onClick={() => patchPolicy({ customFields: [...(p.customFields || []), { label: '', pattern: '', action: 'redact' }] })}>
              <Plus size={13} /> {t('governanceAdmin.customFields.add')}
            </button>
          </div>

          <PolicyRules
            rules={p.guidanceRules || []}
            docs={p.policyDocs || []}
            readOnly={!isSuperAdmin}
            armed={!!p.armed}
            extract={(body) => workAdminApi.extractPolicyRules({ ...body, companyId })}
            onChange={({ guidanceRules, policyDocs }) => patchPolicy({ guidanceRules, policyDocs })}
          />

          <div className="wka-panel">
            <h2>{t('governanceAdmin.modeStatus.title')}</h2>
            <div className="wka-field" style={{ marginBottom: 16, maxWidth: 560 }}>
              <label>{t('governanceAdmin.modeStatus.howHandled')}</label>
              <select className="wka-select" value={p.mode || 'scrub'} disabled={!isSuperAdmin} onChange={(e) => patchPolicy({ mode: e.target.value })}>
                <option value="scrub">{t('governanceAdmin.modeStatus.optScrub')}</option>
                <option value="tokenize">{t('governanceAdmin.modeStatus.optTokenize')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!p.armed} disabled={!isSuperAdmin} onChange={(e) => patchPolicy({ armed: e.target.checked })} /> {t('governanceAdmin.modeStatus.armed')}</label>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!p.locked} disabled={!isSuperAdmin} onChange={(e) => patchPolicy({ locked: e.target.checked })} /> <Lock size={13} /> {t('governanceAdmin.modeStatus.locked')}</label>
              <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('governanceAdmin.modeStatus.versionN', { n: p.version || 0 })}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18 }}>
              <button type="button" className="wka-btn primary" disabled={!isSuperAdmin || saving} onClick={save}>{saving ? <Spinning /> : null} {t('governanceAdmin.modeStatus.save')}</button>
              <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('governanceAdmin.modeStatus.cancel')}</button>
              <SavedTag show={saved} />
            </div>
            {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
          </div>
        </>
        )
      )}
    </div>
  )
}
