// WorkCoPilot - set / reset password. The emailed link lands here with a
// one-time token. Validates the token, lets the person choose a password, then
// sends them to sign in. Used for both "welcome, set your password" and
// "forgot password" (same token purpose).
import React, { useEffect, useState } from 'react'
import { KeyRound, Check, Loader2, ArrowRight, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { api } from '../api.js'

function getToken() {
  try { return new URLSearchParams(window.location.search).get('token') || '' } catch { return '' }
}

export default function WorkSetPassword() {
  const [token] = useState(getToken)
  const [state, setState] = useState({ loading: true, valid: false, username: '', error: '' })
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!token) { setState({ loading: false, valid: false, username: '', error: 'This link is missing its token.' }); return }
    api.workPasswordToken(token)
      .then((r) => setState({ loading: false, valid: !!r.valid, username: r.username || '', error: '' }))
      .catch((e) => setState({ loading: false, valid: false, username: '', error: (e && e.message) || 'This link is invalid or has expired.' }))
  }, [token])

  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy) return
    if (pw.length < 6) { setErr('Choose a password of at least 6 characters.'); return }
    if (pw !== pw2) { setErr('The two passwords do not match.'); return }
    setBusy(true); setErr('')
    try { await api.workPasswordSet(token, pw); setDone(true) }
    catch (error) { setErr((error && error.message) || 'Could not set your password. The link may have expired.') }
    finally { setBusy(false) }
  }

  return (
    <div className="wsp-root">
      <style>{CSS}</style>
      <div className="wsp-card">
        <a className="wsp-brand" href="/"><span className="wsp-mark" aria-hidden /> WorkCoPilot</a>
        {state.loading ? (
          <div className="wsp-center"><Loader2 size={26} className="wsp-spin" /><p>Checking your link...</p></div>
        ) : done ? (
          <div className="wsp-center">
            <div className="wsp-ok"><Check size={26} /></div>
            <h1>Password set</h1>
            <p>Your password is ready. Sign in to get started.</p>
            <a className="wsp-btn" href="/workcopilot">Sign in <ArrowRight size={15} /></a>
          </div>
        ) : !state.valid ? (
          <div className="wsp-center">
            <div className="wsp-bad"><AlertTriangle size={24} /></div>
            <h1>Link expired</h1>
            <p>{state.error || 'This link is invalid or has expired.'}</p>
            <a className="wsp-btn ghost" href="/workcopilot">Go to sign in</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="wsp-ic"><KeyRound size={22} /></div>
            <h1>Set your password</h1>
            <p>{state.username ? <>for <b>{state.username}</b></> : 'Choose a password to finish setting up your account.'}</p>
            <div className="wsp-field">
              <label>New password</label>
              <div className="wsp-pw">
                <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => { setErr(''); setPw(e.target.value) }} autoFocus placeholder="At least 6 characters" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide' : 'Show'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div className="wsp-field">
              <label>Confirm password</label>
              <input type={show ? 'text' : 'password'} value={pw2} onChange={(e) => { setErr(''); setPw2(e.target.value) }} placeholder="Re-enter it" />
            </div>
            {err && <div className="wsp-err">{err}</div>}
            <button className="wsp-btn" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="wsp-spin" /> : <Check size={16} />} Set password</button>
          </form>
        )}
      </div>
    </div>
  )
}

const CSS = `
.wsp-root{min-height:100vh;display:grid;place-items:center;padding:24px;background:
  radial-gradient(900px 420px at 80% -10%, #eafaf1 0%, transparent 60%), #f6f9f7;
  font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0c1222}
.wsp-card{width:100%;max-width:420px;background:#fff;border:1px solid #e6ebf1;border-radius:18px;padding:30px 28px;box-shadow:0 18px 50px -28px rgba(12,18,34,.3);text-align:center}
.wsp-brand{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:17px;color:#0c1222;text-decoration:none;margin-bottom:18px}
.wsp-mark{width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#0a9d66,#2f6f3e)}
.wsp-ic,.wsp-ok,.wsp-bad{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;margin:4px auto 14px}
.wsp-ic{background:#eafaf1;border:1px solid #bfe9d2;color:#0a9d66}
.wsp-ok{background:#eafaf1;border:1px solid #bfe9d2;color:#0a9d66}
.wsp-bad{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
.wsp-card h1{font-size:22px;margin:0 0 6px}
.wsp-card p{color:#5b6676;font-size:14.5px;line-height:1.5;margin:0 0 18px}
.wsp-field{text-align:left;margin-bottom:14px}
.wsp-field label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
.wsp-field input{width:100%;box-sizing:border-box;border:1px solid #e6ebf1;border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;background:#fcfdfe;outline:none}
.wsp-field input:focus{border-color:#0a9d66;box-shadow:0 0 0 3px rgba(10,157,102,.14)}
.wsp-pw{position:relative;display:flex}
.wsp-pw input{padding-right:42px}
.wsp-pw button{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;color:#5b6676;cursor:pointer;padding:6px}
.wsp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;background:linear-gradient(135deg,#ff9a4d,#f26a43);color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 26px -12px rgba(242,106,67,.6)}
.wsp-btn:disabled{opacity:.7}
.wsp-btn.ghost{background:#fff;color:#2f6f3e;border:1px solid #e6ebf1;box-shadow:none}
.wsp-err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:14px;text-align:left}
.wsp-center p{margin-bottom:16px}
.wsp-spin{animation:wsp-sp .8s linear infinite}@keyframes wsp-sp{to{transform:rotate(360deg)}}
`
