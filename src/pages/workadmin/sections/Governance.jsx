// Data governance (DLP) policy per company. Pick a company, seed defaults from a
// compliance framework, fine-tune the action per category, add free-flow block
// words (with the honest risk warning), choose scrub vs tokenize, then arm/lock.
// The armed policy is enforced on every outbound AI call by the server.
import React, { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, Lock, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag } from './_shared.jsx'

const ACTIONS = ['send', 'mask', 'withhold', 'tokenize']
const ACTION_LABEL = { send: 'Send as-is', mask: 'Mask', withhold: 'Withhold', tokenize: 'Tokenize (on-device)' }

export default function Governance({ isSuperAdmin }) {
  const [companies, setCompanies] = useState(null)
  const [companyId, setCompanyId] = useState('')
  const [state, setState] = useState({ loading: false, error: null, policy: null, presets: {}, labels: {}, categories: [] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  useEffect(() => {
    workAdminApi.companies()
      .then((r) => { const list = (r && r.companies) || (Array.isArray(r) ? r : []); setCompanies(list); if (list.length) setCompanyId((id) => id || list[0].id) })
      .catch(() => setCompanies([]))
  }, [])   // eslint-disable-line

  const load = useCallback(() => {
    if (!companyId) return
    setState((s) => ({ ...s, loading: true, error: null })); setSaved(false); setSaveErr(null)
    workAdminApi.policy(companyId)
      .then((r) => setState({ loading: false, error: null, policy: r.policy || {}, presets: r.presets || {}, labels: r.labels || {}, categories: r.categories || [] }))
      .catch((error) => setState((s) => ({ ...s, loading: false, error })))
  }, [companyId])
  useEffect(() => { load() }, [load])

  const p = state.policy
  const patchPolicy = (patch) => setState((s) => ({ ...s, policy: { ...s.policy, ...patch } }))
  const setCat = (cat, action) => setState((s) => ({ ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), [cat]: action } } }))
  const applyPreset = (key) => {
    const preset = state.presets[key] || {}
    setState((s) => ({ ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), ...preset }, frameworks: Array.from(new Set([...(s.policy.frameworks || []), key])) } }))
  }
  const save = async () => {
    if (!isSuperAdmin || saving || !p) return
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const r = await workAdminApi.setPolicy({
        companyId, _unlock: true,   // superadmin may always change
        categories: p.categories || {}, blockWords: p.blockWords || [], frameworks: p.frameworks || [],
        customFields: (p.customFields || []).filter((f) => f && String(f.label || '').trim() && String(f.pattern || '').trim()),
        mode: p.mode || 'scrub', armed: !!p.armed, locked: !!p.locked,
      })
      setState((s) => ({ ...s, policy: r.policy })); setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }

  if (companies == null) return <Loading label="Loading companies" />
  if (!companies.length) return <div className="wka-note">Create a company first in the Companies tab, then set its data governance policy here.</div>

  return (
    <div>
      {!isSuperAdmin && <div className="wka-note"><Lock size={14} /> Only a superadmin can change a company policy.</div>}
      <div className="wka-toolbar">
        <label style={{ fontSize: 13, color: 'var(--wka-muted)' }}>Company</label>
        <select className="wka-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {state.loading ? <Loading label="Loading policy" /> : state.error ? <ErrorBox error={state.error} onRetry={load} /> : p && (
        <>
          <div className="wka-panel">
            <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Compliance frameworks</h2>
            <p className="desc">Click a framework to seed sensible defaults, then fine-tune below. (Controls and audit evidence to support your compliance, not a certification.)</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.keys(state.presets).map((k) => (
                <button key={k} type="button" className={`wka-btn sm${(p.frameworks || []).includes(k) ? ' primary' : ''}`} disabled={!isSuperAdmin} onClick={() => applyPreset(k)} title={state.labels[k] || k}>{k.toUpperCase().replace(/_/g, ' ')}</button>
              ))}
            </div>
          </div>

          <div className="wka-panel">
            <h2>What leaves the device, by category</h2>
            <p className="desc">For each kind of sensitive data: send as-is, mask, withhold, or tokenize (kept on-device and rebuilt in the response).</p>
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>Category</th><th>Action</th></tr></thead>
                <tbody>
                  {state.categories.map((cat) => (
                    <tr key={cat}>
                      <td style={{ textTransform: 'capitalize' }}>{cat}</td>
                      <td><select className="wka-select" value={(p.categories || {})[cat] || 'withhold'} disabled={!isSuperAdmin} onChange={(e) => setCat(cat, e.target.value)}>
                        {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
                      </select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="wka-panel">
            <h2>Never send these words</h2>
            <p className="desc">Exact words or phrases that must never leave the device (one per line).</p>
            <textarea className="wka-input" style={{ width: '100%', minHeight: 92, resize: 'vertical' }} disabled={!isSuperAdmin}
              value={(p.blockWords || []).join('\n')}
              onChange={(e) => patchPolicy({ blockWords: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
              placeholder={'Project Atlas\nacme-prod-db\ninternal codename'} />
            {(p.blockWords || []).length > 0 && (
              <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--wka-amber)', display: 'flex', gap: 8 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Blocking words can make an answer incomplete or wrong where a word is actually needed. WorkCoPilot never guesses a blocked value.
              </div>
            )}
          </div>

          <div className="wka-panel">
            <h2>Custom fields</h2>
            <p className="desc">Your own sensitive data types, on top of the built-in categories. Give each a name, a match (a word/phrase, or a <code>/regex/</code> like <code>/EMP-\d&#123;6&#125;/</code>), and what to do. Redact replaces it with a <code>[LABEL]</code> tag; Block replaces it with <code>[BLOCKED]</code>. Applied on the device before anything is sent.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(p.customFields || []).map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto auto', gap: 8, alignItems: 'center' }}>
                  <input className="wka-input" placeholder="Label (e.g. Employee ID)" disabled={!isSuperAdmin} value={f.label || ''}
                    onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], label: e.target.value }; patchPolicy({ customFields: cf }) }} />
                  <input className="wka-input" placeholder="Match: a word/phrase or /regex/" disabled={!isSuperAdmin} value={f.pattern || ''}
                    onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], pattern: e.target.value }; patchPolicy({ customFields: cf }) }} />
                  <select className="wka-select" disabled={!isSuperAdmin} value={f.action || 'redact'}
                    onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], action: e.target.value }; patchPolicy({ customFields: cf }) }}>
                    <option value="redact">Redact</option>
                    <option value="block">Block</option>
                  </select>
                  <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin} title="Remove"
                    onClick={() => { const cf = (p.customFields || []).filter((_, k) => k !== i); patchPolicy({ customFields: cf }) }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button type="button" className="wka-btn sm" style={{ marginTop: 10 }} disabled={!isSuperAdmin}
              onClick={() => patchPolicy({ customFields: [...(p.customFields || []), { label: '', pattern: '', action: 'redact' }] })}>
              <Plus size={13} /> Add custom field
            </button>
          </div>

          <div className="wka-panel">
            <h2>Mode and status</h2>
            <div className="wka-field" style={{ marginBottom: 16, maxWidth: 560 }}>
              <label>How sensitive data is handled</label>
              <select className="wka-select" value={p.mode || 'scrub'} disabled={!isSuperAdmin} onChange={(e) => patchPolicy({ mode: e.target.value })}>
                <option value="scrub">Scrub: remove before sending (safest; answers may have gaps)</option>
                <option value="tokenize">Tokenize: keep on device and rebuild the full answer here (premium)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!p.armed} disabled={!isSuperAdmin} onChange={(e) => patchPolicy({ armed: e.target.checked })} /> Armed (enforced on every call)</label>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!p.locked} disabled={!isSuperAdmin} onChange={(e) => patchPolicy({ locked: e.target.checked })} /> <Lock size={13} /> Locked</label>
              <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>version {p.version || 0}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18 }}>
              <button type="button" className="wka-btn primary" disabled={!isSuperAdmin || saving} onClick={save}>{saving ? <Spinning /> : null} Save policy</button>
              <SavedTag show={saved} />
            </div>
            {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
          </div>
        </>
      )}
    </div>
  )
}
