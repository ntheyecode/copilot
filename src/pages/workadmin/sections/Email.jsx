// SMTP Settings (Email / SES): superadmin enters the outbound-email credentials
// the product uses to DELIVER reports, and sends a test to confirm them.
// MFA-GATED (same shared step-up window as AI config). Bound to
// GET/POST /api/work/admin/smtp and POST /api/work/admin/smtp/test. The password
// is WRITE-ONLY: the server never returns it (the view only says whether one is
// set). After Save the form COLLAPSES to a read-only record (Edit to reopen).
import React, { useEffect, useState, useCallback } from 'react'
import { Save, Mail, Send, Check, AlertTriangle, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag, StepUpGate, StepUpBanner, isLockError, RecRow, EditToggle } from './_shared.jsx'

export default function Email({ isSuperAdmin }) {
  const [gate, setGate] = useState({ loading: true, error: null, status: null })
  const loadGate = useCallback(async () => {
    setGate((g) => ({ ...g, loading: true, error: null }))
    try { const status = await workAdminApi.aiStepUp(); setGate({ loading: false, error: null, status }) }
    catch (error) { setGate({ loading: false, error, status: null }) }
  }, [])
  useEffect(() => { loadGate() }, [loadGate])

  if (gate.loading) return <Loading label="Checking access" />
  if (gate.error) return <ErrorBox error={gate.error} onRetry={loadGate} />
  if (!gate.status || !gate.status.active) {
    return <StepUpGate status={gate.status || {}} verify={workAdminApi.verifyAiStepUp} onUnlock={(status) => setGate({ loading: false, error: null, status })} label="SMTP settings" />
  }
  return <EmailBody isSuperAdmin={isSuperAdmin} stepUp={gate.status} onLocked={loadGate} />
}

function EmailBody({ isSuperAdmin, stepUp, onLocked }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [cfg, setCfg] = useState(null)          // the saved config (record view)
  const [form, setForm] = useState(null)        // the edit form
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState(null)

  const blankForm = (s) => ({ host: s.host || '', port: s.port || 587, security: s.security || 'starttls', username: s.username || '', fromEmail: s.fromEmail || '', fromName: s.fromName || 'WorkCoPilot', password: '' })

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const r = await workAdminApi.getSmtp()
      const s = r.smtp || {}
      setCfg(s)
      setForm(blankForm(s))
      setEditing(!s.host)   // nothing saved yet -> open the form; otherwise show the record
      setState({ loading: false, error: null })
    } catch (error) {
      if (isLockError(error)) { onLocked(); return }
      setState({ loading: false, error })
    }
  }, [onLocked])
  useEffect(() => { load() }, [load])

  const set = (k, v) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })) }

  const save = async () => {
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const body = { host: form.host, port: form.port, security: form.security, username: form.username, fromEmail: form.fromEmail, fromName: form.fromName }
      if (form.password) body.password = form.password
      const r = await workAdminApi.setSmtp(body)
      const s = r.smtp || {}
      setCfg(s); setForm(blankForm(s)); setEditing(false)   // collapse to the record
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { if (isLockError(error)) { onLocked(); return } setSaveErr(error) }
    finally { setSaving(false) }
  }

  const sendTest = async () => {
    setTesting(true); setTestMsg(null)
    try { const r = await workAdminApi.testSmtp(testTo.trim() || undefined); setTestMsg({ ok: true, text: `Test email sent to ${r.to}. Check the inbox (and spam).` }) }
    catch (error) { if (isLockError(error)) { onLocked(); return } setTestMsg({ ok: false, text: (error && error.message) || 'Could not send the test email.' }) }
    finally { setTesting(false) }
  }

  if (state.loading) return <Loading label="Loading SMTP settings" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!form || !cfg) return null
  const disabled = !isSuperAdmin
  const secLabel = { starttls: 'STARTTLS (587)', tls: 'TLS / SSL (465)', none: 'None' }

  return (
    <div>
      <StepUpBanner status={stepUp} onLocked={onLocked} lock={workAdminApi.lockAiConfig} label="SMTP settings" />

      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}><Mail size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />SMTP / SES credentials</h2>
          {!editing ? <EditToggle editing={editing} disabled={disabled} onEdit={() => { setForm(blankForm(cfg)); setEditing(true) }} /> : null}
        </div>
        <p className="desc">The outbound-email account used to deliver reports. For AWS SES, use the <b>SMTP credentials</b> SES issues (not your AWS access keys). The From address must be a verified SES identity.</p>

        {!editing ? (
          // ---- Collapsed record view ----
          cfg.host ? (
            <div className="wka-record">
              <RecRow label="SMTP host" value={cfg.host} />
              <RecRow label="Port" value={`${cfg.port}  (${secLabel[cfg.security] || cfg.security})`} />
              <RecRow label="Username" value={cfg.username || '-'} />
              <RecRow label="Password" value={cfg.hasPassword ? '•••••••• (set)' : 'not set'} />
              <RecRow label="From" value={cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail} />
              {cfg.updatedAt ? <RecRow label="Updated" value={new Date(cfg.updatedAt).toLocaleString()} /> : null}
            </div>
          ) : (
            <div className="wka-note"><AlertTriangle size={14} /> No SMTP settings saved yet. {disabled ? '' : 'Click Edit to configure.'}</div>
          )
        ) : (
          // ---- Edit form ----
          <>
            <div className="wka-formgrid">
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
              <div className="wka-field"><label>SMTP password {cfg.hasPassword ? <span className="hint" style={{ fontWeight: 400 }}>(set - leave blank to keep)</span> : null}</label><input className="wka-input" type="password" disabled={disabled} autoComplete="new-password" placeholder={cfg.hasPassword ? '••••••••' : 'Enter SMTP password'} value={form.password} onChange={(e) => set('password', e.target.value)} /></div>
              <div className="wka-field"><label>From email</label><input className="wka-input" disabled={disabled} placeholder="no-reply@admireveda.com" value={form.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} /><span className="hint">Must be a verified SES identity</span></div>
              <div className="wka-field"><label>From name</label><input className="wka-input" disabled={disabled} value={form.fromName} onChange={(e) => set('fromName', e.target.value)} /></div>
            </div>
            {saveErr && <ErrorBox error={saveErr} />}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <button type="button" className="wka-btn primary" disabled={disabled || saving} onClick={save}>{saving ? <Spinning /> : <Save size={14} />} Save</button>
              {cfg.host && <button type="button" className="wka-btn ghost" disabled={saving} onClick={() => { setForm(blankForm(cfg)); setEditing(false); setSaveErr(null) }}><X size={14} /> Cancel</button>}
              <SavedTag show={saved} />
            </div>
          </>
        )}
      </div>

      <div className="wka-panel">
        <h2><Send size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Send a test email</h2>
        <p className="desc">Uses the <b>saved</b> settings above. Save first, then send a test to confirm the credentials work end to end before relying on report delivery.</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="wka-field" style={{ maxWidth: 360, flex: 1 }}><label>Recipient</label><input className="wka-input" disabled={disabled || !cfg.host} placeholder="defaults to the From address" value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div>
          <button type="button" className="wka-btn" disabled={disabled || testing || !cfg.host} onClick={sendTest}>{testing ? <Spinning /> : <Send size={14} />} Send test</button>
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
