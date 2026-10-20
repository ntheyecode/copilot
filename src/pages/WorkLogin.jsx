import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, Check, MonitorPlay, Building2 } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { AVMark } from '../components/AdmireVedaLogo.jsx'

// ---------------------------------------------------------------------------
// AdmireVeda WorkCoPilot - the product's own sign-in page (/workcopilot/login).
// A separate, graphical login: a branded product panel on the left, the sign-in
// form on the right. Reuses the shared auth. Lands you on /work.
// ---------------------------------------------------------------------------
export default function WorkLogin() {
  const nav = useNavigate()
  const { user, login, verify } = useAuth()
  const [sp] = useSearchParams()
  const plan = sp.get('plan') || ''
  const planName = { basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }[plan] || ''

  const [uName, setUName] = useState(''); const [uPass, setUPass] = useState('')
  const [code, setCode] = useState(''); const [stage, setStage] = useState('password')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  // Company single sign-on: the user enters their email domain, we resolve it to
  // the company, then hand the browser to the server which bounces to the IdP.
  const [ssoOpen, setSsoOpen] = useState(false)
  const [ssoDomain, setSsoDomain] = useState('')
  const [ssoBusy, setSsoBusy] = useState(false)
  const [ssoErr, setSsoErr] = useState(sp.get('sso_error') || '')

  const startSso = async (e) => {
    e && e.preventDefault()
    const domain = ssoDomain.trim().toLowerCase().replace(/^@/, '')
    if (!domain) { setSsoErr('Enter your company email domain.'); return }
    setSsoBusy(true); setSsoErr('')
    try {
      const r = await api.workSsoResolve(domain)
      window.location.assign(api.workSsoStartUrl(r.companyId))
    } catch (e2) {
      setSsoErr(e2.message || 'We could not find single sign-on for that domain.')
      setSsoBusy(false)
    }
  }

  useEffect(() => {
    const id = 'wm-fonts'
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap'
      document.head.appendChild(l)
    }
  }, [])
  useEffect(() => { if (user) nav('/work', { replace: true }) }, [user, nav])

  const submit = async (e) => {
    e && e.preventDefault(); setBusy(true); setErr('')
    try {
      if (stage === 'password') {
        const r = await login(uName.trim(), uPass)
        if (r.user) { nav('/work', { replace: true }); return }
        if (r.twofaRequired) { setStage('code'); return }
        setErr('Could not sign in.')
      } else {
        await verify(code.trim()); nav('/work', { replace: true })
      }
    } catch (e2) { setErr(e2.message || 'Could not sign in. Check your details.') } finally { setBusy(false) }
  }

  return (
    <div className="wl">
      <style>{CSS}</style>
      <div className="wl-aurora" aria-hidden />

      {/* Brand / product panel */}
      <aside className="wl-brand">
        <a className="wl-wordmark" href="/">
          <span className="wl-ad">AdmireVeda</span>
          <span className="wl-prod"><AVMark size={22} id="avlw" /> WorkCoPilot</span>
        </a>
        <div className="wl-pitch">
          <h1>Your expert,<br />on every screen.</h1>
          <p>AdmireVeda's WorkCoPilot sits beside you and guides any task, step by step, all the way to done.</p>
          <ul>
            <li><Check size={15} /> Exact steps, commands and links</li>
            <li><Check size={15} /> Watches your screen, catches mistakes</li>
            <li><Check size={15} /> Keeps a clean record of what you did</li>
          </ul>
        </div>
        <div className="wl-mock">
          <div className="wl-mock-label"><MonitorPlay size={13} /> DO THIS NOW</div>
          <div className="wl-mock-step">Open the console and create the VPC.</div>
          <code>$ aws ec2 create-vpc --cidr-block 10.0.0.0/16</code>
        </div>
      </aside>

      {/* Sign-in */}
      <main className="wl-main">
        <div className="wl-card">
          <div className="wl-card-brand"><AVMark size={18} id="avlc" /> WorkCoPilot <span className="wl-by">by AdmireVeda</span></div>
          <h2>{stage === 'code' ? 'Enter your code' : (planName ? `Sign in to start ${planName}` : 'Sign in')}</h2>
          <p className="wl-sub">{stage === 'code' ? 'Open your authenticator and enter the 6-digit code.' : 'Welcome back. Pick up right where you left off.'}</p>
          <form onSubmit={submit}>
            {stage === 'password' ? (
              <>
                <label>Username</label>
                <input autoFocus value={uName} onChange={(e) => setUName(e.target.value)} autoComplete="username" placeholder="your username" />
                <label>Password</label>
                <input type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} autoComplete="current-password" placeholder="your password" />
              </>
            ) : (
              <>
                <label>Verification code</label>
                <input autoFocus inputMode="numeric" maxLength={9} value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" />
              </>
            )}
            {err && <div className="wl-err">{err}</div>}
            <button className="wl-cta" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="wl-spin" /> : null} {stage === 'code' ? 'Verify' : 'Sign in'} <ArrowRight size={16} /></button>
          </form>

          {stage === 'password' && (
            <div className="wl-sso">
              <div className="wl-or"><span>or</span></div>
              {!ssoOpen ? (
                <button type="button" className="wl-sso-btn" onClick={() => { setSsoOpen(true); setSsoErr('') }}>
                  <Building2 size={16} /> Sign in with your company (SSO)
                </button>
              ) : (
                <form onSubmit={startSso} className="wl-sso-form">
                  <label>Company email domain</label>
                  <input autoFocus value={ssoDomain} onChange={(e) => setSsoDomain(e.target.value)} placeholder="example.com" />
                  <button type="submit" className="wl-sso-go" disabled={ssoBusy}>{ssoBusy ? <Loader2 size={15} className="wl-spin" /> : null} Continue <ArrowRight size={15} /></button>
                </form>
              )}
              {ssoErr && <div className="wl-err wl-sso-err">{ssoErr}</div>}
            </div>
          )}

          <div className="wl-foot">New here? Ask your administrator for access. <a href="/login">Another product?</a></div>
          <div className="wl-legal">Lawful, legitimate work only. Harmful or illegal requests are declined.</div>
        </div>
      </main>
    </div>
  )
}

const CSS = `
.wl{--ink:#0a0b10;--panel:#14161f;--line:rgba(255,255,255,.1);--tx:#eef0f6;--mut:#9aa0b4;--em:#8cf5c4;--em2:#39d3ff;--warm:#ffb35c;--warm2:#ff7a59;
  position:relative;min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr;background:var(--ink);color:var(--tx);
  font-family:"Figtree",system-ui,sans-serif;overflow:hidden;-webkit-font-smoothing:antialiased}
.wl *{box-sizing:border-box}
.wl h1,.wl h2{color:var(--tx);margin:0}
.wl a{color:inherit;text-decoration:none}
.wl-aurora{position:absolute;inset:-30% 40% auto -10%;height:90vh;filter:blur(80px);opacity:.5;pointer-events:none;
  background:radial-gradient(45% 60% at 30% 20%,rgba(57,211,255,.4),transparent 70%),radial-gradient(45% 55% at 60% 60%,rgba(140,245,196,.32),transparent 70%),radial-gradient(40% 50% at 20% 80%,rgba(255,122,89,.2),transparent 70%);
  animation:wldrift 16s ease-in-out infinite alternate}
@keyframes wldrift{to{transform:translateY(5%) scale(1.06)}}

/* BRAND PANEL */
.wl-brand{position:relative;z-index:2;padding:48px 52px;display:flex;flex-direction:column;gap:38px;border-right:1px solid var(--line)}
.wl-wordmark{display:flex;flex-direction:column;gap:4px}
.wl-ad{font-family:"Bricolage Grotesque";font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:var(--mut)}
.wl-prod{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.02em;display:inline-flex;align-items:center;gap:9px}
.wl-dot{width:11px;height:11px;border-radius:50%;background:linear-gradient(135deg,var(--em),var(--em2));box-shadow:0 0 14px var(--em)}
.wl-pitch{margin-top:auto}
.wl-pitch h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(32px,4vw,50px);line-height:1.04;letter-spacing:-.03em}
.wl-pitch p{color:var(--mut);font-size:18px;max-width:34ch;margin:18px 0 24px}
.wl-pitch ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:11px}
.wl-pitch li{display:flex;gap:9px;align-items:center;color:var(--tx);font-size:15px}
.wl-pitch li svg{color:var(--em)}
.wl-mock{background:rgba(21,23,32,.8);border:1px solid var(--line);border-radius:16px;padding:16px;max-width:400px}
.wl-mock-label{font-size:10px;letter-spacing:.14em;color:var(--em);font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:7px}
.wl-mock-step{font-weight:600;margin-bottom:10px}
.wl-mock code{display:block;background:#0c1222;color:#d6e9d6;font-family:"JetBrains Mono",monospace;font-size:12.5px;padding:10px;border-radius:9px;overflow-x:auto;white-space:nowrap}

/* FORM */
.wl-main{position:relative;z-index:2;display:grid;place-items:center;padding:40px}
.wl-card{width:100%;max-width:400px}
.wl-card-brand{display:flex;align-items:center;gap:8px;font-family:"Bricolage Grotesque";font-weight:800;font-size:15px;margin-bottom:22px}
.wl-by{font-family:"Figtree";font-weight:400;font-size:12px;color:var(--mut);letter-spacing:0}
.wl-card h2{font-family:"Bricolage Grotesque";font-size:30px;letter-spacing:-.02em}
.wl-sub{color:var(--mut);margin:7px 0 26px}
.wl-card label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.02em}
.wl-card input{width:100%;background:#0b0c12;border:1px solid var(--line);border-radius:12px;padding:13px 14px;color:var(--tx);font:inherit;font-size:15px;margin-bottom:16px;outline:none}
.wl-card input:focus{border-color:var(--em)}
.wl-err{color:#ff8a8a;font-size:13.5px;margin:-6px 0 14px}
.wl-cta{width:100%;justify-content:center;background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:12px;padding:14px;font:inherit;font-weight:600;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s}
.wl-cta:hover{transform:translateY(-2px)}
.wl-cta:disabled{opacity:.7;cursor:default;transform:none}
.wl-foot{color:var(--mut);font-size:13px;margin-top:20px}
.wl-foot a{color:var(--em);text-decoration:underline;text-underline-offset:3px}
.wl-legal{color:var(--mut);font-size:11.5px;margin-top:10px;opacity:.75}
.wl-spin{animation:wlrot 1s linear infinite}@keyframes wlrot{to{transform:rotate(360deg)}}
.wl-sso{margin-top:18px}
.wl-or{display:flex;align-items:center;gap:12px;color:var(--mut);font-size:12px;margin:4px 0 14px}
.wl-or::before,.wl-or::after{content:"";flex:1;height:1px;background:var(--line)}
.wl-sso-btn{width:100%;justify-content:center;background:#0b0c12;color:var(--tx);border:1px solid var(--line);border-radius:12px;padding:13px;font:inherit;font-weight:600;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:9px;transition:border-color .15s}
.wl-sso-btn:hover{border-color:var(--em)}
.wl-sso-btn svg{color:var(--em2)}
.wl-sso-form label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.02em}
.wl-sso-form input{width:100%;background:#0b0c12;border:1px solid var(--line);border-radius:12px;padding:13px 14px;color:var(--tx);font:inherit;font-size:15px;margin-bottom:12px;outline:none}
.wl-sso-form input:focus{border-color:var(--em)}
.wl-sso-go{width:100%;justify-content:center;background:#0b0c12;color:var(--tx);border:1px solid var(--line);border-radius:12px;padding:13px;font:inherit;font-weight:600;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.wl-sso-go:hover{border-color:var(--em)}
.wl-sso-go:disabled{opacity:.7;cursor:default}
.wl-sso-err{margin-top:10px}

@media(max-width:820px){
 .wl{grid-template-columns:1fr}
 .wl-brand{display:none}
 .wl-aurora{inset:-30% -20% auto -20%}
}
`
