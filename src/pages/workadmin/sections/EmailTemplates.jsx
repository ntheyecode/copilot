// Email Templates (superadmin): EVERY email the product sends is editable here.
// Nothing is static. Edit each type's subject, heading, body and CTA label with
// <Placeholder> tokens, preview it live with sample data, and save or reset to
// the built-in default. Also sets where Contact Us + lead notifications go.
// Bound to /api/work/admin/email-templates* and /api/work/admin/notify.
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Save, RotateCcw, Mail, Eye, X, Bell } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag, RecRow, EditToggle } from './_shared.jsx'

const CATEGORY_LABEL = { account: 'Account', security: 'Security', billing: 'Billing', forms: 'Forms', notifications: 'Notifications', support: 'Support' }

export default function EmailTemplates({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [templates, setTemplates] = useState([])
  const [sel, setSel] = useState(null)        // selected type

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const r = await workAdminApi.emailTemplates()
      const t = r.templates || []
      setTemplates(t)
      setSel((cur) => cur || (t[0] && t[0].type) || null)
      setState({ loading: false, error: null })
    } catch (error) { setState({ loading: false, error }) }
  }, [])
  useEffect(() => { load() }, [load])

  if (state.loading) return <Loading label="Loading email templates" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const byCat = {}
  for (const t of templates) { (byCat[t.category] = byCat[t.category] || []).push(t) }
  const current = templates.find((t) => t.type === sel) || null

  return (
    <div>
      <NotifyCard isSuperAdmin={isSuperAdmin} />

      <div className="wka-panel">
        <h2><Mail size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Email templates</h2>
        <p className="desc">Every email WorkCoPilot sends. Edit the wording with <code>&lt;Placeholder&gt;</code> tokens, preview it live, then save. Reset returns a template to its built-in default. The branded layout (header, footer, buttons) stays consistent automatically.</p>
        <div className="wmt-wrap">
          <nav className="wmt-list">
            {Object.keys(byCat).map((cat) => (
              <div key={cat} className="wmt-group">
                <div className="wmt-group-h">{CATEGORY_LABEL[cat] || cat}</div>
                {byCat[cat].map((t) => (
                  <button key={t.type} className={`wmt-item${sel === t.type ? ' on' : ''}`} onClick={() => setSel(t.type)}>
                    <span>{t.label}</span>
                    {t.override && (t.override.subject || t.override.heading || t.override.body || t.override.ctaLabel) ? <em className="wmt-edited">edited</em> : null}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="wmt-editor">
            {current ? <Editor key={current.type} tpl={current} isSuperAdmin={isSuperAdmin} onSaved={load} /> : <div className="wka-note">Select a template.</div>}
          </div>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  )
}

function Editor({ tpl, isSuperAdmin, onSaved }) {
  const eff = (f) => (tpl.override && tpl.override[f] != null ? tpl.override[f] : tpl.defaults[f]) || ''
  const [form, setForm] = useState({ subject: eff('subject'), heading: eff('heading'), body: eff('body'), ctaLabel: eff('ctaLabel') })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  const [preview, setPreview] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const focusRef = useRef('body')
  const refs = { subject: useRef(null), heading: useRef(null), body: useRef(null), ctaLabel: useRef(null) }

  const set = (k, v) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })) }

  const insertToken = (token) => {
    const field = focusRef.current || 'body'
    const el = refs[field] && refs[field].current
    setSaved(false)
    setForm((f) => {
      const val = f[field] || ''
      if (el && typeof el.selectionStart === 'number') {
        const s = el.selectionStart, e = el.selectionEnd
        const next = val.slice(0, s) + token + val.slice(e)
        setTimeout(() => { try { el.focus(); el.selectionStart = el.selectionEnd = s + token.length } catch {} }, 0)
        return { ...f, [field]: next }
      }
      return { ...f, [field]: (val ? val + ' ' : '') + token }
    })
  }

  const doPreview = async () => {
    setPreviewing(true); setErr(null)
    try { const r = await workAdminApi.previewEmailTemplate(tpl.type, form); setPreview(r.html || '') }
    catch (error) { setErr(error) } finally { setPreviewing(false) }
  }
  useEffect(() => { doPreview() /* initial */ }, []) // eslint-disable-line

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false)
    try { await workAdminApi.saveEmailTemplate(tpl.type, form); setSaved(true); setTimeout(() => setSaved(false), 2500); onSaved() }
    catch (error) { setErr(error) } finally { setSaving(false) }
  }
  const reset = async () => {
    if (!window.confirm('Reset this email to its built-in default? Your custom wording will be removed.')) return
    setSaving(true); setErr(null)
    try { await workAdminApi.resetEmailTemplate(tpl.type); setForm({ subject: tpl.defaults.subject || '', heading: tpl.defaults.heading || '', body: tpl.defaults.body || '', ctaLabel: tpl.defaults.ctaLabel || '' }); onSaved() }
    catch (error) { setErr(error) } finally { setSaving(false) }
  }

  const disabled = !isSuperAdmin
  return (
    <div className="wmt-edit">
      <div className="wmt-edit-head">
        <div><h3>{tpl.label}</h3><p>{tpl.description}</p></div>
      </div>

      <div className="wmt-cols">
        <div className="wmt-form">
          <div className="wka-field">
            <label htmlFor={`wmt-subject-${tpl.type}`}>Subject</label>
            <input id={`wmt-subject-${tpl.type}`} ref={refs.subject} className="wka-input" disabled={disabled} value={form.subject} onFocus={() => (focusRef.current = 'subject')} onChange={(e) => set('subject', e.target.value)} />
          </div>
          <div className="wka-field">
            <label htmlFor={`wmt-heading-${tpl.type}`}>Heading</label>
            <input id={`wmt-heading-${tpl.type}`} ref={refs.heading} className="wka-input" disabled={disabled} value={form.heading} onFocus={() => (focusRef.current = 'heading')} onChange={(e) => set('heading', e.target.value)} />
          </div>
          <div className="wka-field">
            <label htmlFor={`wmt-body-${tpl.type}`}>Body <span className="hint">(blank line = new paragraph)</span></label>
            <textarea id={`wmt-body-${tpl.type}`} ref={refs.body} className="wka-input" rows={8} disabled={disabled} value={form.body} onFocus={() => (focusRef.current = 'body')} onChange={(e) => set('body', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          {tpl.hasCta && (
            <div className="wka-field">
              <label htmlFor={`wmt-cta-${tpl.type}`}>Button label <span className="hint">(leave blank for no button)</span></label>
              <input id={`wmt-cta-${tpl.type}`} ref={refs.ctaLabel} className="wka-input" disabled={disabled} value={form.ctaLabel} onFocus={() => (focusRef.current = 'ctaLabel')} onChange={(e) => set('ctaLabel', e.target.value)} />
            </div>
          )}

          {tpl.placeholders && tpl.placeholders.length > 0 && (
            <div className="wmt-ph">
              <div className="wmt-ph-h">Placeholders <span className="wmt-hint">click to insert</span></div>
              <div className="wmt-ph-chips">
                {tpl.placeholders.map((p) => (
                  <button key={p.token} type="button" className="wmt-chip" title={`${p.desc || ''}${p.sample ? ` (e.g. ${p.sample})` : ''}`} disabled={disabled} onClick={() => insertToken(p.token)}>{p.token}</button>
                ))}
              </div>
            </div>
          )}

          {err && <ErrorBox error={err} />}
          <div className="wmt-actions">
            <button type="button" className="wka-btn primary" disabled={disabled || saving} onClick={save}>{saving ? <Spinning /> : <Save size={14} />} Save</button>
            <button type="button" className="wka-btn ghost" disabled={saving} onClick={doPreview}>{previewing ? <Spinning /> : <Eye size={14} />} Refresh preview</button>
            <button type="button" className="wka-btn ghost" disabled={disabled || saving} onClick={reset}><RotateCcw size={13} /> Reset to default</button>
            <SavedTag show={saved} />
          </div>
        </div>

        <div className="wmt-preview">
          <div className="wmt-preview-h"><Eye size={13} /> Live preview <span className="wmt-hint">with sample data</span></div>
          <iframe title="Email preview" className="wmt-frame" sandbox="" srcDoc={preview || '<p style="font:14px sans-serif;color:#888;padding:20px">Rendering preview...</p>'} />
        </div>
      </div>
    </div>
  )
}

// Where Contact Us + lead notifications go, and the thank-you toggle. Collapses
// to a record after save (consistent with the other dashboards).
function NotifyCard({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [cfg, setCfg] = useState(null)
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try { const r = await workAdminApi.getNotify(); setCfg(r.notify); setForm({ ...r.notify }); setEditing(false); setState({ loading: false, error: null }) }
    catch (error) { setState({ loading: false, error }) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false)
    try { const r = await workAdminApi.setNotify(form); setCfg(r.notify); setForm({ ...r.notify }); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    catch (error) { setErr(error) } finally { setSaving(false) }
  }

  if (state.loading) return <div className="wka-panel"><Loading label="Loading notifications" /></div>
  if (state.error) return <div className="wka-panel"><ErrorBox error={state.error} onRetry={load} /></div>
  if (!cfg || !form) return null
  const disabled = !isSuperAdmin

  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ margin: 0 }}><Bell size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Notification recipients</h2>
        <EditToggle editing={editing} disabled={disabled} onEdit={() => { setForm({ ...cfg }); setEditing(true) }} />
      </div>
      <p className="desc">Where Contact Us messages and new "Validate it live" leads are emailed, and whether the person who submits gets a thank-you.</p>
      {!editing ? (
        <div className="wka-record">
          <RecRow label="Contact Us goes to" value={cfg.contactTo} />
          <RecRow label="New leads go to" value={cfg.leadTo} />
          <RecRow label="Thank-you to submitter" value={cfg.thankYou ? 'On' : 'Off'} />
        </div>
      ) : (
        <>
          <div className="wka-formgrid" style={{ marginBottom: 10 }}>
            <div className="wka-field"><label>Contact Us recipient</label><input className="wka-input" disabled={disabled} value={form.contactTo} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, contactTo: e.target.value })) }} /></div>
            <div className="wka-field"><label>New-lead recipient</label><input className="wka-input" disabled={disabled} value={form.leadTo} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, leadTo: e.target.value })) }} /></div>
          </div>
          <label className="wka-check" style={{ marginTop: 4 }}>
            <input type="checkbox" disabled={disabled} checked={!!form.thankYou} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, thankYou: e.target.checked })) }} />
            Send a thank-you email to people who submit the Contact and lead forms
          </label>
          {err && <ErrorBox error={err} />}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
            <button type="button" className="wka-btn primary" disabled={disabled || saving} onClick={save}>{saving ? <Spinning /> : <Save size={14} />} Save</button>
            <button type="button" className="wka-btn ghost" disabled={saving} onClick={() => { setForm({ ...cfg }); setEditing(false); setErr(null) }}><X size={14} /> Cancel</button>
            <SavedTag show={saved} />
          </div>
        </>
      )}
    </div>
  )
}

const CSS = `
.wmt-wrap{display:grid;grid-template-columns:230px 1fr;gap:18px;margin-top:8px}
.wmt-list{display:flex;flex-direction:column;gap:14px}
.wmt-group-h{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--wka-muted,#6b7280);margin:0 0 6px 4px}
.wmt-item{display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;text-align:left;background:transparent;border:1px solid transparent;border-radius:9px;padding:8px 11px;font-size:13.5px;color:var(--wka-text);cursor:pointer}
.wmt-item:hover{background:var(--wka-nav-hover)}
.wmt-item.on{background:var(--wka-accent-soft);border-color:var(--wka-accent-line);font-weight:600}
.wmt-edited{font-style:normal;font-size:10.5px;font-weight:700;color:var(--wka-accent-dark);background:var(--wka-accent-soft);border-radius:6px;padding:1px 6px}
.wmt-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px;min-width:0}
.wmt-form{display:flex;flex-direction:column;gap:12px;min-width:0}
.wmt-form .wka-input{width:100%}
.wmt-edit-head h3{margin:0 0 3px;font-family:var(--wka-font-head);font-size:15.5px;font-weight:700;letter-spacing:-0.1px;color:var(--wka-text)}
.wmt-edit-head p{margin:0 0 12px;color:var(--wka-muted);font-size:12px}
.wmt-hint{font-weight:400;color:var(--wka-muted)}
.wmt-ph{margin-top:2px}
.wmt-ph-h{font-size:12px;font-weight:700;color:var(--wka-text);margin-bottom:7px}
.wmt-ph-chips{display:flex;flex-wrap:wrap;gap:6px}
.wmt-chip{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;background:var(--wka-panel-2);border:1px solid var(--wka-line-2);border-radius:7px;padding:3px 8px;color:var(--wka-text);cursor:pointer}
.wmt-chip:hover{background:var(--wka-accent-soft);border-color:var(--wka-accent-line)}
.wmt-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px}
.wmt-preview{min-width:0}
.wmt-preview-h{font-size:12px;font-weight:700;color:var(--wka-text);margin-bottom:7px;display:flex;align-items:center;gap:6px}
.wmt-frame{width:100%;height:560px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-bg)}
@media(max-width:1024px){.wmt-wrap{grid-template-columns:1fr}.wmt-cols{grid-template-columns:1fr}.wmt-frame{height:460px}}
`
