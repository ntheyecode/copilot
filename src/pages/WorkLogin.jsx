import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, Check, MonitorPlay, Building2, Lock, ChevronDown } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import MfaGate from '../components/MfaGate.jsx'
import { api } from '../api.js'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import WorkShell from '../workShell.jsx'
import useSeo from '../useSeo.js'                          // per-route title / description / canonical (WEB-01)

const WD_DESK = typeof window !== 'undefined' ? window.workDesktop : null

// ---------------------------------------------------------------------------
// AdmireVeda WorkCoPilot - the product's own create-account / log-in page
// (/workcopilot). A branded product panel on the left, the account card on the
// right.
//
// INDIVIDUAL-FIRST (owner, 2026-10-23). An individual who picked a plan on the
// marketing page lands here with ?plan=lite|basic|advanced|premium (and
// ?cycle=monthly|annual). They are a new customer: the card is the FIRST STEP
// OF CHECKOUT - create the account (or log in), then the routing effect below
// starts Stripe Checkout on its own. Company single sign-on is only for members
// of a company tenant, so it is demoted to a quiet affordance at the bottom of
// the card and never presented as the main way in. A 409 from the password form
// ("this is an SSO account") still opens that panel with its message.
//
// Behavior is unchanged from the previous version: same auth hooks, same form
// fields and submit, same MFA gate, same routing effect, same forgot-password
// and SSO handlers. Only the layout, hierarchy and copy were redesigned.
//
// Accessibility (WEB-08): the card heading is the page's single H1 (the brand
// panel's headline is a styled paragraph, since that panel is hidden on phones
// and the H1 must always be present); every input has a programmatic label and
// autocomplete; errors are announced (role=alert) and tied to their field via
// aria-describedby; the busy state is exposed with aria-busy; the create /
// log-in switch is a pair of real toggle buttons (aria-pressed); focus rings
// stay visible; the legal line keeps AA contrast.
// ---------------------------------------------------------------------------
export default function WorkLogin() {
  const nav = useNavigate()
  const { user, login, signup, loginMfa, loginMfaSetup, refresh } = useAuth()
  const [sp] = useSearchParams()
  const plan = (sp.get('plan') || '').toLowerCase()
  useSeo({
    title: 'Create an Account or Log In - WorkCoPilot by AdmireVeda',
    description: 'Create a free WorkCoPilot account or log in to get step-by-step guidance on your own screen. Company single sign-on is available for company members.',
    path: '/workcopilot',
  })
  const cycle = (sp.get('cycle') || 'monthly').toLowerCase()   // annual selections are not auto-charged monthly
  const planName = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }[plan] || ''

  // A chosen plan means a new customer, so default to create-account; otherwise
  // default to log-in. The visitor can switch either way.
  const [mode, setMode] = useState(plan ? 'signup' : 'signin')
  const [uName, setUName] = useState(''); const [uPass, setUPass] = useState('')
  // Compliance sign-up fields (signup mode only).
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState(''); const [sPhone, setSPhone] = useState(''); const [sCompany, setSCompany] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [forgotBusy, setForgotBusy] = useState(false); const [forgotSent, setForgotSent] = useState(false)
  const doForgot = async () => {
    const login = (uName.trim() || (typeof window !== 'undefined' ? window.prompt('Enter your username or email and we will send a reset link:') : '') || '').trim()
    if (!login) return
    setForgotBusy(true)
    try { await api.workPasswordForgot(login) } catch { /* same response regardless */ }
    setForgotBusy(false); setForgotSent(true)
  }
  // MFA step: when login/signup returns a second-factor requirement we swap the
  // password form for the authenticator gate.
  const [mfa, setMfa] = useState(null)           // { mode:'setup'|'verify', enroll?, username }
  const [mfaBusy, setMfaBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState(null)
  // Company single sign-on: the user enters their email domain, we resolve it to
  // the company, then hand the browser to the server which bounces to the IdP.
  const [ssoOpen, setSsoOpen] = useState(false)
  const [ssoDomain, setSsoDomain] = useState('')
  const [ssoBusy, setSsoBusy] = useState(false)
  const [ssoErr, setSsoErr] = useState(sp.get('sso_error') || '')
  const [checkingOut, setCheckingOut] = useState(false)

  // Plan summary for the checkout-intent card. Public pricing, same endpoint
  // and same annual math (20% off, shown per month, billed yearly) the
  // marketing page uses, so the number here matches the card they just
  // clicked. If the fetch fails we simply show the plan name without a price.
  const [pricing, setPricing] = useState(null)
  useEffect(() => {
    if (!plan) return
    let dead = false
    fetch('/api/work/pricing').then((r) => r.json()).then((p) => { if (!dead) setPricing(p) }).catch(() => {})
    return () => { dead = true }
  }, [plan])
  const money = (n) => `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n).toLocaleString('en-US')}`
  const listPrice = pricing && pricing.plans && pricing.plans[plan] != null ? Number(pricing.plans[plan]) : null
  const priceLine = listPrice == null
    ? (cycle === 'annual' ? 'Billed annually' : 'Billed monthly')
    : cycle === 'annual'
      ? `${money(Math.round(listPrice * 0.8))}/mo, billed annually (${money(Math.round(listPrice * 0.8) * 12)}/yr)`
      : `${money(listPrice)}/mo, billed monthly`

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

  // In the desktop app the sign-in screen is plan mode (large, windowed, not
  // on top); it carries the custom title bar so the frameless window can be
  // moved and closed before the user is signed in.
  useEffect(() => { if (WD_DESK) { try { WD_DESK.setMode('plan') } catch { /* ignore */ } } }, [])

  // Once the account is ready: if a plan was chosen, start Checkout; otherwise
  // open the dashboard. If billing is not configured, we still open the
  // dashboard (the plan chooser there explains the next step).
  useEffect(() => {
    if (!user || checkingOut) return
    let cancelled = false
    const run = async () => {
      // Start Checkout for the chosen plan AND cycle. The server charges the
      // annual price only when cycle is annual AND annual is wired in Stripe;
      // if annual is not set up it returns 409, we catch it and land on the
      // dashboard - an annual pick is never charged the monthly price.
      if (plan) {
        setCheckingOut(true)
        try {
          const r = await api.workCheckout(plan, cycle)
          if (!cancelled && r && r.url) { window.location = r.url; return }
        } catch { /* billing not ready or annual not set up: fall through to the dashboard */ }
      }
      // Admins and superadmins land on the full console; a company admin lands
      // on their own company console; everyone else on the user dashboard. A
      // pending checkout (plan) always goes through /work first.
      const isAdmin = !!(user && (user.role === 'superadmin' || user.role === 'admin'))
      const isCompanyAdmin = !!(user && user.companyRole === 'company_admin' && !isAdmin)
      const dest = plan ? '/work' : isAdmin ? '/work/admin' : isCompanyAdmin ? '/work/company' : '/work'
      if (!cancelled) nav(dest, { replace: true })
    }
    run()
    return () => { cancelled = true }
  }, [user, plan, cycle, checkingOut, nav])

  const submit = async (e) => {
    e && e.preventDefault()
    const u = uName.trim()
    if (mode === 'signup') {
      if (!sName.trim()) { setErr('Enter your full name.'); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sEmail.trim())) { setErr('Enter a valid email address.'); return }
    }
    setBusy(true); setErr('')
    try {
      const r = mode === 'signup'
        ? await signup({ username: u, password: uPass, name: sName.trim(), email: sEmail.trim(), phone: sPhone.trim(), company: sCompany.trim() })
        : await login(u, uPass)
      if (r && r.mfaSetup) { setMfa({ mode: 'setup', enroll: r.enroll, username: u }); setBusy(false); return }
      if (r && r.mfaRequired) { setMfa({ mode: 'verify', username: u }); setBusy(false); return }
      // otherwise the effect above reacts to `user` and routes to checkout or /work
    } catch (e2) {
      // A company single sign-on account cannot use the password form: the
      // server returns 409. Send them to the SSO panel with a clear message,
      // prefilling their email domain when they typed an email as the username.
      if (e2 && e2.status === 409) {
        const at = uName.indexOf('@')
        if (at > -1) setSsoDomain(uName.slice(at + 1).trim().toLowerCase())
        setErr(''); setSsoOpen(true)
        setSsoErr(e2.message || "This is a company single sign-on account. Use 'Sign in with your company' below.")
        setBusy(false)
        return
      }
      setErr(e2.message || (mode === 'signup' ? 'Could not create your account.' : 'Could not log in. Check your details.'))
      setBusy(false)
    }
  }

  // The authenticator gate calls this with the 6-digit (or backup) code. It must
  // THROW on a bad code so MfaGate can show the message. In setup mode a success
  // yields the one-time backup codes (shown before entering the app).
  const handleMfaSubmit = async (code) => {
    setMfaBusy(true)
    try {
      if (mfa.mode === 'setup') {
        const r = await loginMfaSetup(code)
        setBackupCodes(r.backupCodes || [])
      } else {
        await loginMfa(code)   // refreshes the user; the routing effect takes over
      }
    } catch (e2) {
      if (e2 && (e2.status === 440 || (e2.data && e2.data.restart))) {
        setMfa(null); setBackupCodes(null)
        setErr('Your sign-in session timed out. Please log in again.')
      }
      throw e2   // let MfaGate render the inline error
    } finally { setMfaBusy(false) }
  }
  // Called after the user has saved their backup codes: now enter the app.
  const handleMfaDone = async () => { try { await refresh() } catch { /* routing effect still fires on next check */ } }

  const working = busy || checkingOut
  const heading = mode === 'signup'
    ? (planName ? `Create your account to start ${planName}` : 'Create your account')
    : (planName ? `Log in to start ${planName}` : 'Log in')
  const subline = mode === 'signup'
    ? (planName
      ? 'It is free to create an account; you are charged when checkout completes.'
      : 'It is free to create an account. Pick a plan when you are ready to start guiding.')
    : (planName
      ? 'Welcome back. After you log in we take you straight to secure checkout.'
      : 'Welcome back. Pick up right where you left off.')

  return (
    <div className="wl" style={WD_DESK ? { paddingTop: 40 } : undefined}>
      {WD_DESK && <WorkShell authed={false} />}
      <style>{CSS}</style>
      <div className="wl-aurora" aria-hidden />

      {/* Brand / product panel (hidden on phones) */}
      <aside className="wl-brand">
        <a className="wl-wordmark" href="/">
          <span className="wl-ad">AdmireVeda</span>
          <span className="wl-prod"><AVMark size={22} id="avlw" /> WorkCoPilot</span>
        </a>
        <div className="wl-pitch">
          <p className="wl-pitch-h">Your expert,<br />on every screen.</p>
          <p>AdmireVeda's WorkCoPilot sits beside you and guides any task, step by step, all the way to done.</p>
          <ul>
            <li><Check size={15} aria-hidden="true" /> Exact steps, commands and links</li>
            <li><Check size={15} aria-hidden="true" /> Watches your screen, catches mistakes</li>
            <li><Check size={15} aria-hidden="true" /> Keeps a clean record of what you did</li>
          </ul>
        </div>
        <div className="wl-mock" role="img" aria-label="Example of a guided step: Do this now, open the console and create the VPC, with the exact command shown">
          <div className="wl-mock-label"><MonitorPlay size={13} aria-hidden="true" /> DO THIS NOW</div>
          <div className="wl-mock-step">Open the console and create the VPC.</div>
          <code>$ aws ec2 create-vpc --cidr-block 10.0.0.0/16</code>
        </div>
      </aside>

      {/* Account card: create account / log in (primary), SSO quiet at the bottom */}
      <main className="wl-main" id="main">
        <div className="wl-card">
          <div className="wl-card-brand"><AVMark size={18} id="avlc" /> WorkCoPilot <span className="wl-by">by AdmireVeda</span></div>

          {/* Checkout intent: which plan, what it costs, what happens next. */}
          {planName && (
            <section className="wl-plan" aria-label={`You are starting the ${planName} plan`}>
              <div className="wl-plan-row">
                <div>
                  <div className="wl-plan-kicker">You are starting</div>
                  <div className="wl-plan-name">{planName}</div>
                </div>
                <div className="wl-plan-price">{priceLine}</div>
              </div>
              <ol className="wl-steps" aria-label="Checkout steps">
                <li className="on" aria-current="step"><span className="wl-step-n">1</span> Account</li>
                <li><span className="wl-step-n"><Lock size={11} aria-hidden="true" /></span> Secure checkout</li>
              </ol>
            </section>
          )}

          {mfa ? (
            <MfaGate mode={mfa.mode} enroll={mfa.enroll} username={mfa.username} backupCodes={backupCodes} busy={mfaBusy} onSubmit={handleMfaSubmit} onDone={handleMfaDone} />
          ) : (<>
          <h1>{heading}</h1>
          <p className="wl-sub">{subline}</p>

          {/* The one clear switch between the two individual paths. */}
          <div className="wl-seg" aria-label="Create an account or log in">
            <button type="button" className={`wl-seg-b${mode === 'signup' ? ' on' : ''}`} aria-pressed={mode === 'signup'} onClick={() => { setErr(''); setMode('signup') }}>Create account</button>
            <button type="button" className={`wl-seg-b${mode === 'signin' ? ' on' : ''}`} aria-pressed={mode === 'signin'} onClick={() => { setErr(''); setMode('signin') }}>Log in</button>
          </div>

          <form onSubmit={submit} aria-label={mode === 'signup' ? 'Create account' : 'Log in'} aria-busy={working}>
            {mode === 'signup' && (<>
              <div className="wl-grid2">
                <div>
                  <label htmlFor="wl-name">Full name</label>
                  <input id="wl-name" name="name" autoFocus value={sName} onChange={(e) => setSName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" aria-required="true" />
                </div>
                <div>
                  <label htmlFor="wl-email">Email</label>
                  <input id="wl-email" name="email" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" aria-required="true" />
                </div>
              </div>
              <div className="wl-grid2">
                <div>
                  <label htmlFor="wl-phone">Phone <span className="wl-opt">(optional)</span></label>
                  <input id="wl-phone" name="phone" type="tel" value={sPhone} onChange={(e) => setSPhone(e.target.value)} autoComplete="tel" placeholder="+1 555 000 1234" />
                </div>
                <div>
                  <label htmlFor="wl-company">Company <span className="wl-opt">(optional)</span></label>
                  <input id="wl-company" name="company" value={sCompany} onChange={(e) => setSCompany(e.target.value)} autoComplete="organization" placeholder="Your company" />
                </div>
              </div>
            </>)}
            <label htmlFor="wl-user">{mode === 'signup' ? 'Choose a username' : 'Username or email'}</label>
            <input id="wl-user" name="username" {...(mode !== 'signup' ? { autoFocus: true } : {})} value={uName} onChange={(e) => setUName(e.target.value)} autoComplete="username" placeholder={mode === 'signup' ? 'your username' : 'your username or email'} aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'wl-err' : undefined} />
            <label htmlFor="wl-pass">Password</label>
            <input id="wl-pass" name="password" type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'choose a password (6+ characters)' : 'your password'} aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'wl-err' : undefined} />
            {err && <div className="wl-err" id="wl-err" role="alert">{err}</div>}
            <button className="wl-cta" type="submit" disabled={working} aria-busy={working}>
              {working ? <Loader2 size={16} className="wl-spin" aria-hidden="true" /> : null}
              {working ? <span className="wl-sr">Working, please wait. </span> : null}
              {checkingOut ? 'Opening secure checkout' : mode === 'signup' ? (planName ? 'Create account and continue' : 'Create account') : (planName ? 'Log in and continue' : 'Log in')}
              {' '}<ArrowRight size={16} aria-hidden="true" />
            </button>
            {mode === 'signup' && (
              <p className="wl-consent">By creating an account you agree to the <a href="/workcopilot/terms">Terms</a> and <a href="/workcopilot/privacy">Privacy Policy</a>.</p>
            )}
            {planName && !checkingOut && (
              <p className="wl-next"><Lock size={12} aria-hidden="true" /> Next: secure checkout for {planName}. Nothing is charged until you complete it.</p>
            )}
            {mode === 'signin' && (forgotSent
              ? <p className="wl-forgot-sent" role="status"><Check size={13} aria-hidden="true" /> If an account exists for that username or email, a reset link is on its way.</p>
              : <button type="button" className="wl-forgot" onClick={doForgot} disabled={forgotBusy}>Forgot password?</button>)}
          </form>

          <div className="wl-legal">Lawful, legitimate work only. Harmful or illegal requests are declined.</div>

          {/* Company SSO: secondary, quiet, for company members only. Opens on
              demand, or automatically when the password form hits a 409. */}
          <div className={`wl-sso${ssoOpen ? ' open' : ''}`}>
            {!ssoOpen ? (
              <button type="button" className="wl-sso-link" onClick={() => { setSsoOpen(true); setSsoErr('') }} aria-expanded="false" aria-controls="wl-sso-panel">
                <Building2 size={14} aria-hidden="true" /> Part of a company team? Company / SSO sign-in <ChevronDown size={14} aria-hidden="true" />
              </button>
            ) : (
              <form onSubmit={startSso} className="wl-sso-form" id="wl-sso-panel" aria-label="Sign in with your company" aria-busy={ssoBusy}>
                <div className="wl-sso-head"><Building2 size={14} aria-hidden="true" /> Company / SSO sign-in <span className="wl-sso-note">for members of a company account</span></div>
                <label htmlFor="wl-sso-domain">Company email domain</label>
                <div className="wl-sso-row">
                  <input id="wl-sso-domain" name="domain" type="text" inputMode="url" autoFocus value={ssoDomain} onChange={(e) => setSsoDomain(e.target.value)} placeholder="example.com" autoComplete="organization" aria-required="true" aria-invalid={ssoErr ? 'true' : undefined} aria-describedby={ssoErr ? 'wl-sso-err' : undefined} />
                  <button type="submit" className="wl-sso-go" disabled={ssoBusy} aria-busy={ssoBusy}>{ssoBusy ? <Loader2 size={15} className="wl-spin" aria-hidden="true" /> : null} Continue <ArrowRight size={15} aria-hidden="true" /></button>
                </div>
              </form>
            )}
            {ssoErr && <div className="wl-err wl-sso-err" id="wl-sso-err" role="alert">{ssoErr}</div>}
          </div>
          </>)}
        </div>
      </main>
    </div>
  )
}

const CSS = `
.wl{--bg:#faf7f4;--panel:#ffffff;--line:rgba(26,22,18,.12);--tx:#1a1612;--mut:#6b625a;--acc:#f26a43;--acc2:#e35a31;--acc-soft:#fff1ea;--acc-ink:#b63f1c;--err:#b42318;
  position:relative;min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr;background:var(--bg);color:var(--tx);
  /* DESIGN-06: clip horizontally (the aurora bleeds past both edges) but NEVER
     vertically - a blanket overflow:hidden made a tall form unreachable on a
     short phone viewport. The aurora is fixed below so it adds no scroll. */
  font-family:"Figtree",system-ui,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.wl *{box-sizing:border-box}
.wl h1,.wl h2{color:var(--tx);margin:0}
.wl a{color:inherit;text-decoration:none}
.wl-aurora{position:fixed;inset:-30% 40% auto -10%;height:90vh;filter:blur(90px);opacity:.55;pointer-events:none;
  background:radial-gradient(45% 60% at 30% 20%,rgba(242,106,67,.22),transparent 70%),radial-gradient(45% 55% at 60% 60%,rgba(255,179,92,.18),transparent 70%),radial-gradient(40% 50% at 20% 80%,rgba(242,106,67,.12),transparent 70%);
  animation:wldrift 16s ease-in-out infinite alternate}
@keyframes wldrift{to{transform:translateY(5%) scale(1.06)}}

/* BRAND PANEL */
.wl-brand{position:relative;z-index:2;padding:48px 52px;display:flex;flex-direction:column;gap:38px;border-right:1px solid var(--line)}
.wl-wordmark{display:flex;flex-direction:column;gap:4px}
.wl-ad{font-family:"Bricolage Grotesque";font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:var(--mut)}
.wl-prod{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.02em;display:inline-flex;align-items:center;gap:9px}
.wl-pitch{margin-top:auto}
.wl-pitch .wl-pitch-h{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(32px,4vw,50px);line-height:1.04;letter-spacing:-.03em;color:var(--tx);margin:0;max-width:none}
.wl-pitch p{color:var(--mut);font-size:18px;max-width:34ch;margin:18px 0 24px}
.wl-pitch ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:11px}
.wl-pitch li{display:flex;gap:9px;align-items:center;color:var(--tx);font-size:15px}
.wl-pitch li svg{color:var(--acc)}
.wl-mock{background:#1c1714;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;max-width:400px;box-shadow:0 24px 50px -30px rgba(26,22,18,.5)}
.wl-mock-label{font-size:10px;letter-spacing:.14em;color:var(--acc);font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:7px}
.wl-mock-step{color:#f4efea;font-weight:600;margin-bottom:10px}
.wl-mock code{display:block;background:#120e0c;color:#f1d9cc;font-family:"JetBrains Mono",monospace;font-size:12.5px;padding:10px;border-radius:9px;overflow-x:auto;white-space:nowrap}

/* ACCOUNT CARD */
.wl-main{position:relative;z-index:2;display:grid;place-items:center;padding:40px}
.wl-card{width:100%;max-width:460px;background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:30px 32px 26px;box-shadow:0 30px 70px -40px rgba(26,22,18,.35)}
.wl-card-brand{display:flex;align-items:center;gap:8px;font-family:"Bricolage Grotesque";font-weight:800;font-size:15px;margin-bottom:18px}
.wl-by{font-family:"Figtree";font-weight:400;font-size:12px;color:var(--mut);letter-spacing:0}
.wl-card h1{font-family:"Bricolage Grotesque";font-size:27px;font-weight:700;letter-spacing:-.02em;line-height:1.15}
.wl-sub{color:var(--mut);margin:8px 0 18px;font-size:14.5px;line-height:1.5}

/* plan summary (checkout step 1) */
.wl-plan{background:var(--acc-soft);border:1px solid rgba(242,106,67,.28);border-radius:14px;padding:14px 16px;margin-bottom:18px}
.wl-plan-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.wl-plan-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--acc-ink);font-weight:700}
.wl-plan-name{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.02em;line-height:1.1;margin-top:2px}
.wl-plan-price{font-size:13.5px;color:var(--tx);font-weight:600;text-align:right}
.wl-steps{list-style:none;padding:0;margin:12px 0 0;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--mut)}
.wl-steps li{display:inline-flex;align-items:center;gap:6px}
.wl-steps li+li::before{content:"";width:22px;height:1px;background:rgba(242,106,67,.4);margin-right:2px}
.wl-steps li.on{color:var(--tx);font-weight:600}
.wl-step-n{width:20px;height:20px;border-radius:50%;display:inline-grid;place-items:center;font-size:11px;font-weight:700;background:#ffffff;border:1px solid rgba(242,106,67,.4);color:var(--acc-ink)}
.wl-steps li.on .wl-step-n{background:var(--acc);border-color:var(--acc);color:#fff}

/* create / log in switch */
.wl-seg{display:grid;grid-template-columns:1fr 1fr;background:#f3eee9;border-radius:12px;padding:4px;gap:4px;margin-bottom:18px}
.wl-seg-b{background:transparent;border:0;border-radius:9px;padding:10px 12px;font:inherit;font-size:14px;font-weight:600;color:var(--mut);cursor:pointer;transition:background .15s,color .15s}
.wl-seg-b.on{background:#ffffff;color:var(--tx);box-shadow:0 1px 3px rgba(26,22,18,.12)}
.wl-seg-b:hover:not(.on){color:var(--tx)}

/* fields */
.wl-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.wl-card label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.02em;font-weight:500}
.wl-opt{font-weight:400;opacity:.7}
.wl-card input{width:100%;background:#ffffff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--tx);font:inherit;font-size:15px;margin-bottom:14px;transition:border-color .15s,box-shadow .15s}
.wl-card input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(242,106,67,.15)}
.wl-card input:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.wl-card input[aria-invalid="true"]{border-color:var(--err)}
.wl-err{color:var(--err);font-size:13.5px;margin:-4px 0 14px}
/* a11y: visually hidden text; visible focus ring on every control (never outline:none) */
.wl-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wl a:focus-visible,.wl button:focus-visible{outline:2px solid var(--acc2);outline-offset:3px;border-radius:8px}
@media(prefers-reduced-motion:reduce){.wl-aurora{animation:none}.wl-cta{transition:none}}

/* primary action */
.wl-cta{width:100%;justify-content:center;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#ffffff;border:none;border-radius:12px;padding:15px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 14px 34px -14px rgba(242,106,67,.7);transition:transform .15s,box-shadow .15s;margin-top:4px}
.wl-cta:hover{transform:translateY(-1px);box-shadow:0 18px 38px -14px rgba(242,106,67,.8)}
.wl-cta:disabled{opacity:.72;cursor:default;transform:none}
.wl-next{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--mut);font-size:12.5px;margin:12px 0 0;text-align:center}
.wl-next svg{color:var(--acc-ink);flex:none}
.wl-consent{color:var(--mut);font-size:12px;line-height:1.5;margin:12px 0 0;text-align:center}
.wl-consent a{color:var(--acc-ink);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.wl-forgot{display:block;margin:12px auto 0;background:none;border:none;color:var(--mut);font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.wl-forgot:hover{color:var(--acc-ink)}
.wl-forgot-sent{display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;font-size:13px;color:var(--tx);margin:12px 0 0}
.wl-forgot-sent svg{color:var(--acc-ink)}
.wl-legal{color:var(--mut);font-size:12px;margin-top:16px;text-align:center}
.wl-spin{animation:wlrot 1s linear infinite}@keyframes wlrot{to{transform:rotate(360deg)}}

/* company SSO: quiet, secondary, bottom of card */
.wl-sso{margin-top:18px;padding-top:14px;border-top:1px dashed var(--line)}
.wl-sso-link{width:100%;background:none;border:0;padding:6px 0;font:inherit;font-size:12.5px;color:var(--mut);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.wl-sso-link:hover{color:var(--tx)}
.wl-sso-link svg{opacity:.8}
.wl-sso-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:10px}
.wl-sso-note{font-weight:400;color:var(--mut);font-size:12px}
.wl-sso-form label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.02em}
.wl-sso-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}
.wl-sso-form input{width:100%;background:#ffffff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;color:var(--tx);font:inherit;font-size:14px;margin-bottom:0}
.wl-sso-form input:focus{border-color:var(--acc)}
.wl-sso-form input:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.wl-sso-go{justify-content:center;background:#ffffff;color:var(--tx);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.wl-sso-go:hover{border-color:var(--acc)}
.wl-sso-go:disabled{opacity:.7;cursor:default}
.wl-sso-err{margin:10px 0 0}

@media(max-width:820px){
 .wl{grid-template-columns:1fr}
 .wl-brand{display:none}
 .wl-aurora{inset:-30% -20% auto -20%}
}
/* DESIGN-06: reclaim side room for the card on small phones (was a flat 40px) */
@media(max-width:520px){
 .wl-main{padding:20px 14px}
 .wl-card{padding:22px 18px 20px;border-radius:18px}
 .wl-card h1{font-size:24px}
 .wl-grid2{grid-template-columns:1fr}
 .wl-plan-row{align-items:flex-start;flex-direction:column;gap:4px}
 .wl-plan-price{text-align:left}
 .wl-sso-row{grid-template-columns:1fr}
 .wl-sso-go{width:100%}
}
`
