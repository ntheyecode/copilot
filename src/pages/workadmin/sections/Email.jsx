// Email (SMTP / SES): superadmin enters the outbound-email credentials the
// product uses to DELIVER reports, and sends a test to confirm them end to end.
// Bound to GET/POST /api/work/admin/smtp and POST /api/work/admin/smtp/test.
// The password is WRITE-ONLY: the server never returns it (the view only says
// whether one is set), so the field stays blank on load and is only sent when
// the operator types a new one.
import React, { useEffect, useState, useCallback } from 'react'
import { Save, Lock, Mail, Send, Check, AlertTriangle } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag } from './_shared.jsx'

export default function Email({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [form, setForm] = useState(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState(null)   // { ok, text }

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const r = await workAdminApi.getSmtp()
      const s = r.smtp || {}
      setForm({ host: s.host || '', port: s.port || 587, security: s.security || 'starttls', username: s.username || '', fromEmail: s.fromEmail || '', fromName: s.fromName || 'WorkCoPilot', password: '' })
      setHasPassword(!!s.hasPassword)
      setState({ loading: false, error: null })
    } catch (error) { setState({ loading: false, error }) }
  }, [])
  useEffect(() => { load() }, [load])

  const set = (k, v) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })) }

  const save = async () => {
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const body = { host: form.host, port: form.port, security: form.security, username: form.username, fromEmail: form.fromEmail, fromName: form.fromName }
      if (form.password) body.password = form.password   // only send when typed
      const r = await workAdminApi.setSmtp(body)
      const s = r.smtp || {}
      setHasPassword(!!s.hasPassword)
      setForm((f) => ({ ...f, password: '' }))
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }

  const sendTest = async () => {
    setTesting(true); setTestMsg(null)
    try {
      const r = await workAdminApi.testSmtp(testTo.trim() || undefined)
      setTestMsg({ ok: true, text: `Test email sent to ${r.to}. Check the inbox (and spam).` })
    } catch (error) { setTestMsg({ ok: false, text: (error && error.message) || 'Could not send the test email.' }) }
    finally { setTesting(false) }
  }

  if (state.loading) return <Loading label="Loading email settings" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!form) return null
  const disabled = !isSuperAdmin

  return (
    <div>
      {disabled ? <div className="wka-note"><Lock size={14} /> Email settings require superadmin access. Values below are read-only for you.</div> : null}

      <div className="wka-panel">
        <h2><Mail size={15} style={{ verticalAlign: -2, marginRight: 6 }} />SMTP / SES credentials</h2>
        <p className="desc">The outbound-email account used to deliver reports. For AWS SES, use the <b>SMTP credentials</b> SES issues (Account dashboard &rarr; SMTP settings &rarr; Create SMTP credentials) - these are <b>not</b> your AWS access keys. The From address must be a verified SES identity.</p>
        <div className="wka-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="wka-field" style={{ gridColumn: '1 / -1' }}><label>SMTP host</label><input className="wka-input" disabled={disabled} placeholder="email-smtp.us-east-1.amazonaws.com" value={form.host} onChange={(e) => set('host', e.target.value)} /></div>
          <div className="wka-field"><label>Port</label><input className="wka-input" type="number" min="1" max="65535" disabled={disabled} value={form.port} onChange={(e) => set('port', e.target.value)} /><span className="hint">587 = STARTTLS, 465 = TLS</span></div>
          <div className="wka-field"><label>Security</label>
            <select className="wka-select" disabled={disabled} value={form.security} onChange={(e) => set('security', e.target.value)}>
              <option value="starttls">STARTTLS (587)</option>
              <option value="tls">TLS / SSL (465)</option>
              <option value="none">None (loopback relay only)</option>
            </select>
          </div>
          <div className="wka-field"><label>SMTP username</label><input className="wka-input" disabled={disabled} autoComplete="off" value={form.username} onChange={(e) => set('username', e.target.value)} /></div>
          <div className="wka-field"><label>SMTP password {hasPassword ? <span className="hint" style={{ fontWeight: 400 }}>(set - leave blank to keep)</span> : null}</label><input className="wka-input" type="password" disabled={disabled} autoComplete="new-password" placeholder={hasPassword ? '••••••••' : 'Enter SMTP password'} value={form.password} onChange={(e) => set('password', e.target.value)} /></div>
          <div className="wka-field"><label>From email</label><input className="wka-input" disabled={disabled} placeholder="no-reply@admireveda.com" value={form.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} /><span className="hint">Must be a verified SES identity</span></div>
          <div className="wka-field"><label>From name</label><input className="wka-input" disabled={disabled} value={form.fromName} onChange={(e) => set('fromName', e.target.value)} /></div>
        </div>
        {saveErr && <ErrorBox error={saveErr} />}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
          <button type="button" className="wka-btn primary" disabled={disabled || saving} onClick={save}>{saving ? <Spinning /> : <Save size={14} />} Save</button>
          <SavedTag show={saved} />
        </div>
      </div>

      <div className="wka-panel">
        <h2><Send size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Send a test email</h2>
        <p className="desc">Uses the <b>saved</b> settings above. Save first, then send a test to confirm the credentials work end to end before relying on report delivery.</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="wka-field" style={{ maxWidth: 360, flex: 1 }}><label>Recipient</label><input className="wka-input" disabled={disabled} placeholder="defaults to the From address" value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div>
          <button type="button" className="wka-btn" disabled={disabled || testing} onClick={sendTest}>{testing ? <Spinning /> : <Send size={14} />} Send test</button>
        </div>
        {testMsg && (
          <div className="wka-note" style={{ marginTop: 12, color: testMsg.ok ? 'var(--wka-emerald, #16a34a)' : 'var(--wka-amber, #b45309)' }}>
            {testMsg.ok ? <Check size={14} /> : <AlertTriangle size={14} />} {testMsg.text}
          </div>
        )}
      </div>
    </div>
  )
}
