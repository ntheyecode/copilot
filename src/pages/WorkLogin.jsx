import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, Check, Building2, Lock, ChevronDown, ShieldCheck, Eye, FileText, Sparkles, AlertTriangle, BookOpen, ScanEye } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import MfaGate from '../components/MfaGate.jsx'
import { api } from '../api.js'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import WorkShell from '../workShell.jsx'
import useSeo from '../useSeo.js'                          // per-route title / description / canonical (WEB-01)

const WD_DESK = typeof window !== 'undefined' ? window.workDesktop : null
// IN-APP MODE (owner, 2026-10-24): "Admireveda app is to work, not marketing; so
// it should have just login/password & SSO, and lighter version, not dark (not
// even create the account); all should happen on the web. Social logins + email
// and password, SSO also, keep it visible. Simple and sleek design."
// The desktop shell loads this LIVE page, so when WD_DESK is truthy we render a
// single light centered sign-in card: social + company SSO + username/password
// + forgot, and one line pointing new users to admireveda.com to create an
// account. No brand panel, no create-account switch, no plan/checkout UI. The
// WEB experience (WD_DESK falsy) is unchanged. Auth logic is shared, untouched.
const IN_APP = !!WD_DESK

// ---------------------------------------------------------------------------
// AdmireVeda WorkCoPilot - the product's own create-account / log-in page
// (/workcopilot). SPLIT-PANEL: a branded panel (inline-SVG graphic in the same
// language as the dashboard hero, a value line, a calm proof element) beside
// the clean form. Brand colors: WorkCoPilot green/blue with the orange CTA.
//
// INDIVIDUAL-FIRST (owner, 2026-10-23). An individual who picked a plan on the
// marketing page lands here with ?plan=lite|basic|advanced|premium (and
// ?cycle=monthly|annual). They are a new customer: the card is the FIRST STEP
// OF CHECKOUT - create the account (or log in), then the routing effect below
// starts Stripe Checkout on its own. Company single sign-on is for members of a
// company tenant: surfaced as a clear "Sign in with company SSO" button that
// opens the existing domain -> resolve -> IdP flow. A 409 from the password
// form ("this is an SSO account") still opens that panel with its message.
//
// SOCIAL SIGN-IN (Google / Microsoft / Apple): outlined "Continue with X"
// buttons that hand the browser to GET /api/work/social/:provider/start. A
// provider the server reports as unconfigured renders disabled ("Coming soon").
// RETURN FROM A PROVIDER (server/social.js contract): the browser lands back
// here with ?social_error=<msg> (shown), ?social=complete (brand-new user) or
// ?social=1 (existing account). For the latter two the SPA asks GET
// /api/work/social/pending which step is next - 'profile' (completion form:
// full name required, phone optional, verified email shown) -> POST
// /api/work/social/complete { name, phone } -> { mfaSetup, username, enroll } or
// { user }; 'mfa_setup' / 'mfa_verify' -> the SAME MFA gate password + SSO use;
// HTTP 440 { restart } -> start over. TOTP is required on every path.
//
// AUTH BEHAVIOR IS UNCHANGED: same useAuth hooks (login / signup / loginMfa /
// loginMfaSetup / refresh), same signup fields, same submit and 409 handling,
// same MFA gate and backup-codes step, same forgot-password, same SSO
// handlers, same routing effect. Only layout, design and the two additive
// surfaces (social buttons, profile completion) are new.
//
// Accessibility (WEB-08): the card heading is the page's single H1 (the brand
// panel's headline is a styled paragraph, since that panel is hidden on phones
// and the H1 must always be present); every input has a programmatic label and
// autocomplete; errors are announced (role=alert) and tied to their field via
// aria-describedby; the busy state is exposed with aria-busy; the create /
// log-in switch is a pair of real toggle buttons (aria-pressed); focus rings
// stay visible; the legal line keeps AA contrast.
// ---------------------------------------------------------------------------

// The social set. Easy to add or drop a provider: one entry here, one brand mark.
// `label` is the accessible / in-app text; `short` is the compact web tile text.
const SOCIAL = [
  { id: 'google', label: 'Continue with Google', short: 'Google' },
  { id: 'microsoft', label: 'Continue with Microsoft', short: 'Microsoft' },
  { id: 'facebook', label: 'Continue with Facebook', short: 'Facebook' },
]
// Brand marks as small inline SVGs (no external assets), in official brand colors.
function SocialMark({ id }) {
  if (id === 'google') {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" />
        <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
        <path fill="#34A853" d="M24 48c6.2 0 11.6-2.1 15.4-5.6l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
    )
  }
  if (id === 'microsoft') {
    return (
      <svg width="17" height="17" viewBox="0 0 23 23" aria-hidden="true">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" /><rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="12" width="10" height="10" fill="#00A4EF" /><rect x="12" y="12" width="10" height="10" fill="#FFB900" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M15.9 15.5l.5-3.5h-3.3V9.7c0-1 .5-1.9 2-1.9h1.5V4.8s-1.4-.2-2.7-.2c-2.7 0-4.5 1.6-4.5 4.6V12H6.3v3.5h3.1V24a12 12 0 0 0 3.7 0v-8.5h2.8z" />
    </svg>
  )
}

// WEB brand aside (owner, 2026-10-24: "ask fable to design all new login or
// create accounts", fresh + light, keep the split panel). The aside shows the
// PRODUCT, not an illustration: a dark "watching" window (the same device-screen
// language the homepage uses on its light page) with a goal, what it can see,
// steps ticked, the current step called out, and two floating cards: a wrong
// turn caught, and company knowledge grounding a step. Pure HTML/CSS, every
// color a .wl token or a deliberate dark-screen constant. Decorative only
// (aria-hidden); the real copy is in the headline and the three trust rows.
function WlStage() {
  return (
    <div className="wl-stage" aria-hidden="true">
      <div className="wl-win">
        <div className="wl-win-bar">
          <span className="wl-win-dots"><i /><i /><i /></span>
          <span className="wl-win-t"><AVMark size={12} id="avst" /> WorkCoPilot <em><ScanEye size={11} /> watching</em></span>
          <span className="wl-win-tag">Step 3 of 7</span>
        </div>
        <div className="wl-win-row goal"><span>Goal</span><b>Set up the new vendor in the payments portal</b></div>
        <div className="wl-win-row see"><span>I can see</span><b>The Vendors tab is open and the form is empty</b></div>
        <ol className="wl-win-steps">
          <li className="done"><i /> Open Finance, then Vendors</li>
          <li className="done"><i /> Click New vendor</li>
          <li className="now"><i /><div><small>Do this now</small>Set payment terms to <b>Net 30</b>, then enter the Tax ID</div></li>
          <li><i /> Attach the signed W-9</li>
          <li><i /> Submit for approval</li>
        </ol>
      </div>
      <div className="wl-float warn">
        <span className="ic"><AlertTriangle size={15} /></span>
        <div><b>Wrong tab. Caught it.</b><span>You opened Customers. Go back to Vendors.</span></div>
      </div>
      <div className="wl-float learn">
        <span className="ic"><BookOpen size={15} /></span>
        <div><b>Knows your playbook</b><span>Net 30 comes from your Finance SOP, private to your company.</span></div>
      </div>
    </div>
  )
}

export default function WorkLogin() {
  const nav = useNavigate()
  const { user, login, signup, loginMfa, loginMfaSetup, refresh } = useAuth()
  const [sp] = useSearchParams()
  // In the app there is no checkout path: ignore any ?plan so no plan card,
  // no checkout step and no "Log in to start X" copy can appear.
  const plan = IN_APP ? '' : (sp.get('plan') || '').toLowerCase()
  useSeo({
    title: 'Create an Account or Log In - WorkCoPilot by AdmireVeda',
    description: 'Create a free WorkCoPilot account or log in to get step-by-step guidance on your own screen. Company single sign-on is available for company members.',
    path: '/workcopilot',
  })
  const cycle = (sp.get('cycle') || 'monthly').toLowerCase()   // annual selections are not auto-charged monthly
  const planName = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }[plan] || ''

  // A chosen plan means a new customer, so default to create-account; otherwise
  // default to log-in. The visitor can switch either way.
  const [modeState, setMode] = useState(plan ? 'signup' : 'signin')
  const mode = IN_APP ? 'signin' : modeState   // the app is sign-in only; accounts are created on the web
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

  // SSO AUTO-DETECT. When the typed email (sign-in "username or email", or the
  // sign-up email) is syntactically valid, debounce ~400ms (or fire on blur) and
  // ask the EXISTING public resolver whether its domain is configured for
  // Company SSO. A hit swaps the password fields for a one-tap "Continue with
  // SSO" (never a hard redirect mid-typing); a miss / 404 / offline resolver
  // silently keeps the normal password + social flow. The 409 backstop on a
  // password submit is unchanged.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  const [ssoHit, setSsoHit] = useState(null)             // { domain, companyId, companyName }
  const [ssoChecking, setSsoChecking] = useState(false)
  const [ssoDismissed, setSsoDismissed] = useState('')   // domain the user chose to bypass ("use a password instead")
  const ssoSeen = useRef({})                             // domain -> resolved result | false, so we never re-ask
  const candidateEmail = (mode === 'signup' ? sEmail : uName).trim().toLowerCase()
  const candidateDomain = EMAIL_RE.test(candidateEmail) ? candidateEmail.slice(candidateEmail.indexOf('@') + 1) : ''
  const detectSso = async (domain) => {
    if (!domain) return
    if (domain in ssoSeen.current) { const v = ssoSeen.current[domain]; setSsoHit(v || null); return }
    setSsoChecking(true)
    try {
      const r = await api.workSsoResolve(domain)
      const hit = r && r.companyId ? { domain, companyId: r.companyId, companyName: r.companyName || r.name || '' } : false
      ssoSeen.current[domain] = hit
      setSsoHit(hit || null)
      if (hit) setSsoDomain(domain)
    } catch { ssoSeen.current[domain] = false; setSsoHit(null) }   // not an SSO domain, or resolver unavailable: password flow
    finally { setSsoChecking(false) }
  }
  useEffect(() => {
    if (!candidateDomain) { setSsoHit(null); return undefined }
    const t = setTimeout(() => { detectSso(candidateDomain) }, 400)
    return () => clearTimeout(t)
  }, [candidateDomain])   // eslint-disable-line
  const ssoActive = !!(ssoHit && ssoHit.domain === candidateDomain && ssoDismissed !== ssoHit.domain)
  const goSso = () => { if (ssoHit) window.location.assign(api.workSsoStartUrl(ssoHit.companyId)) }

  // SOCIAL sign-in (server/social.js). Providers: enable a button ONLY when the
  // server reports it configured (true); false -> disabled "Coming soon"; while
  // the probe is in flight the buttons are disabled without a tag.
  const [providers, setProviders] = useState(null)
  const [socialErr, setSocialErr] = useState(sp.get('social_error') || '')
  useEffect(() => {
    let dead = false
    api.workSocialProviders().then((r) => { if (!dead) setProviders((r && r.providers) || {}) }).catch(() => { if (!dead) setProviders({}) })
    return () => { dead = true }
  }, [])
  const socialEnabled = (id) => !!(providers && providers[id] === true)
  // The start route is a FULL-PAGE navigation (the server redirects to the
  // provider), never an XHR. The checkout intent rides along, harmless if ignored.
  const startSocial = (id) => {
    setSocialErr('')
    const q = plan ? `?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}` : ''
    window.location.assign(api.workSocialStartUrl(id) + q)
  }

  // RETURN FROM THE PROVIDER. ?social=complete (brand-new user) or ?social=1
  // (existing account): ask GET /pending which step comes next and branch -
  //   profile    -> the completion form (name required, phone optional; email shown)
  //   mfa_setup  -> the existing MFA-setup gate with the given enroll
  //   mfa_verify -> the existing MFA-verify gate
  //   HTTP 440 { restart } -> the sign-in session expired; start over.
  // socialStep: null | 'loading' | 'profile'. While set, the routing effect waits.
  const socialParam = sp.get('social')
  const [socialStep, setSocialStep] = useState(socialParam === 'complete' || socialParam === '1' ? 'loading' : null)
  const [pName, setPName] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [pBusy, setPBusy] = useState(false); const [pErr, setPErr] = useState('')
  useEffect(() => {
    if (socialStep !== 'loading') return undefined
    let dead = false
    api.workSocialPending().then((r) => {
      if (dead) return
      const step = r && r.step
      if (step === 'profile') { setPName(r.name || ''); setPEmail(r.email || ''); setSocialStep('profile'); return }
      if (step === 'mfa_setup') { setMfa({ mode: 'setup', enroll: r.enroll, username: r.username || '' }); setSocialStep(null); return }
      if (step === 'mfa_verify') { setMfa({ mode: 'verify', username: r.username || '' }); setSocialStep(null); return }
      setSocialStep(null)   // nothing pending (e.g. already signed in): the routing effect takes over
    }).catch((e2) => {
      if (dead) return
      setSocialStep(null)
      setErr(e2 && (e2.status === 440 || (e2.data && e2.data.restart)) ? 'Your sign-in session timed out. Please start again.' : (e2.message || 'Could not finish signing you in. Please try again.'))
    })
    return () => { dead = true }
  }, [socialStep])   // eslint-disable-line
  const submitProfile = async (e) => {
    e && e.preventDefault()
    if (!pName.trim()) { setPErr('Enter your full name.'); return }
    setPBusy(true); setPErr('')
    try {
      const r = await api.workSocialComplete({ name: pName.trim(), phone: pPhone.trim() })
      if (r && r.mfaSetup) { setMfa({ mode: 'setup', enroll: r.enroll, username: r.username || pEmail }); setSocialStep(null); setPBusy(false); return }
      setSocialStep(null)
      try { await refresh() } catch { /* routing effect still fires on next check */ }   // { user }: MFA globally disabled
      setPBusy(false)
    } catch (e2) {
      if (e2 && (e2.status === 440 || (e2.data && e2.data.restart))) { setSocialStep(null); setErr('Your sign-in session timed out. Please start again.'); setPBusy(false); return }
      setPErr(e2.message || 'Could not save your profile. Please try again.'); setPBusy(false)
    }
  }

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
  // dashboard (the plan chooser there explains the next step). A brand-new
  // social return finishes its pending step first (socialStep) before routing.
  useEffect(() => {
    if (!user || checkingOut || socialStep) return
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
      const isAdmin = !!(user && ['superadmin', 'admin', 'accounting', 'affiliate_admin'].includes(user.role))
      const isCompanyAdmin = !!(user && user.companyRole === 'company_admin' && !isAdmin)
      const dest = plan ? '/work' : isAdmin ? '/work/admin' : isCompanyAdmin ? '/work/company' : '/work'
      if (!cancelled) nav(dest, { replace: true })
    }
    run()
    return () => { cancelled = true }
  }, [user, plan, cycle, checkingOut, nav, socialStep])

  const submit = async (e) => {
    e && e.preventDefault()
    const u = uName.trim()
    // A detected SSO domain routes straight to single sign-on on submit (no
    // password post, no 409 round trip). "Use a password instead" clears this.
    if (ssoActive) { goSso(); return }
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
        setSsoErr(e2.message || "This is a company single sign-on account. Use 'Sign in with company SSO' below.")
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
    : (planName ? `Log in to start ${planName}` : 'Welcome back')
  const subline = mode === 'signup'
    ? (planName
      ? 'It is free to create an account; you are charged when checkout completes.'
      : 'It is free to create an account. Pick a plan when you are ready to start guiding.')
    : (planName
      ? 'After you log in we take you straight to secure checkout.'
      : 'Log in to pick up right where you left off.')
  const showProfile = socialStep === 'profile' && !mfa
  const socialLoading = socialStep === 'loading' && !mfa

  return (
    <div className={`wl ${IN_APP ? 'wl-app' : 'wl-web'}`} style={WD_DESK ? { paddingTop: 40 } : undefined}>
      {WD_DESK && <WorkShell authed={false} />}
      <style>{CSS}</style>
      <div className="wl-bg" aria-hidden><span className="wl-orb o1" /><span className="wl-orb o2" /></div>

      {/* BRAND ASIDE (web only, hidden on phones, never rendered in the app):
          wordmark, the positioning, the live-step stage, three trust rows. */}
      {!IN_APP && <aside className="wl-brand">
        <a className="wl-wordmark" href="/">
          <span className="wl-prod"><AVMark size={22} id="avlw" /> Work<i>CoPilot</i></span>
          <span className="wl-ad">by AdmireVeda</span>
        </a>
        <div className="wl-pitch">
          <p className="wl-pitch-k"><Sparkles size={13} aria-hidden="true" /> Your expert, on every screen</p>
          <p className="wl-pitch-h">It hand-holds you through <span className="wl-hl">every step.</span></p>
          <p className="wl-pitch-p">WorkCoPilot watches your screen, tells you the exact next move, and catches a wrong turn before it costs you. For companies, it learns your own apps and playbooks, privately.</p>
        </div>
        <WlStage />
        <ul className="wl-proof" aria-label="What you get">
          <li><span className="wl-proof-ic"><Eye size={15} aria-hidden="true" /></span><span><b>Read-only by design</b><small>It never clicks, types or runs anything for you.</small></span></li>
          <li><span className="wl-proof-ic alt"><ShieldCheck size={15} aria-hidden="true" /></span><span><b>Private on your device</b><small>Sensitive values are scrubbed before anything leaves.</small></span></li>
          <li><span className="wl-proof-ic warm"><FileText size={15} aria-hidden="true" /></span><span><b>Documented when you finish</b><small>A clean record of every confirmed step.</small></span></li>
        </ul>
      </aside>}

      {/* FORM PANEL: create account / log in (primary), social + company SSO, MFA, profile completion */}
      <main className="wl-main" id="main">
        <div className="wl-card">
          <div className="wl-card-brand"><AVMark size={18} id="avlc" /> Work<i>CoPilot</i> <span className="wl-by">by AdmireVeda</span></div>

          {/* Checkout intent: which plan, what it costs, what happens next. */}
          {planName && !showProfile && !socialLoading && (
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
          ) : socialLoading ? (
            /* Back from the provider: asking the server which step comes next. */
            <div className="wl-social-wait" role="status" aria-live="polite">
              <Loader2 size={22} className="wl-spin" aria-hidden="true" />
              <h1>Finishing your sign-in</h1>
              <p className="wl-sub">One moment while we confirm your account.</p>
            </div>
          ) : showProfile ? (
            /* PROFILE COMPLETION (brand-new social user): full name required, phone
               optional; the email the provider verified is shown, not edited. */
            <>
              <h1>Complete your profile</h1>
              <p className="wl-sub">You are almost in. Your name finishes your account, then you set up your authenticator.</p>
              <form onSubmit={submitProfile} aria-label="Complete your profile" aria-busy={pBusy}>
                {pEmail && <div className="wl-have"><Check size={14} aria-hidden="true" /> {pEmail}</div>}
                <label htmlFor="wl-pname">Full name</label>
                <input id="wl-pname" name="name" autoFocus value={pName} onChange={(e) => setPName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" aria-required="true" aria-invalid={pErr ? 'true' : undefined} aria-describedby={pErr ? 'wl-perr' : undefined} />
                <label htmlFor="wl-pphone">Phone <span className="wl-opt">(optional)</span></label>
                <input id="wl-pphone" name="phone" type="tel" value={pPhone} onChange={(e) => setPPhone(e.target.value)} autoComplete="tel" placeholder="+1 555 000 1234" />
                {pErr && <div className="wl-err" id="wl-perr" role="alert">{pErr}</div>}
                <button className="wl-cta" type="submit" disabled={pBusy} aria-busy={pBusy}>
                  {pBusy ? <Loader2 size={16} className="wl-spin" aria-hidden="true" /> : null} Continue <ArrowRight size={16} aria-hidden="true" />
                </button>
                <p className="wl-consent">By continuing you agree to the <a href="/workcopilot/terms">Terms</a> and <a href="/workcopilot/privacy">Privacy Policy</a>.</p>
              </form>
            </>
          ) : (<>
          <h1>{heading}</h1>
          <p className="wl-sub">{subline}</p>

          {/* The one clear switch between the two individual paths (web only; the app is sign-in only). */}
          {!IN_APP && (
            <div className="wl-seg" aria-label="Create an account or log in">
              <button type="button" className={`wl-seg-b${mode === 'signup' ? ' on' : ''}`} aria-pressed={mode === 'signup'} onClick={() => { setErr(''); setMode('signup') }}>Create account</button>
              <button type="button" className={`wl-seg-b${mode === 'signin' ? ' on' : ''}`} aria-pressed={mode === 'signin'} onClick={() => { setErr(''); setMode('signin') }}>Log in</button>
            </div>
          )}

          {/* SOCIAL + COMPANY SSO: outlined provider buttons, then the SSO button. */}
          <div className="wl-social" aria-label="Other ways to continue">
            {SOCIAL.map((s) => {
              const on = socialEnabled(s.id)
              const soon = !!(providers && providers[s.id] !== true)   // probed and not configured
              return (
                <button key={s.id} type="button" className="wl-prov" disabled={!on || working} onClick={() => on && startSocial(s.id)} aria-label={s.label} title={on ? s.label : (soon ? `${s.label} is coming soon` : 'Checking availability')}>
                  <SocialMark id={s.id} /><span>{IN_APP ? s.label : s.short}</span>{soon && <em className="wl-soon">Coming soon</em>}
                </button>
              )
            })}
            <button type="button" className={`wl-prov wl-prov-sso${ssoOpen ? ' on' : ''}`} onClick={() => { setSsoOpen((v) => !v); setSsoErr('') }} aria-expanded={ssoOpen} aria-controls="wl-sso-panel">
              <Building2 size={17} aria-hidden="true" /><span>Sign in with company SSO</span><ChevronDown size={15} aria-hidden="true" className="wl-prov-chev" />
            </button>
            {socialErr && <div className="wl-err" role="alert">{socialErr}</div>}
          </div>

          {/* Company SSO panel: opens from the button above, or automatically when
              the password form hits a 409. Same domain -> resolve -> IdP flow. */}
          {ssoOpen && (
            <form onSubmit={startSso} className="wl-sso-form" id="wl-sso-panel" aria-label="Sign in with your company" aria-busy={ssoBusy}>
              <div className="wl-sso-head"><Building2 size={14} aria-hidden="true" /> Company single sign-on <span className="wl-sso-note">for members of a company account</span></div>
              <label htmlFor="wl-sso-domain">Company email domain</label>
              <div className="wl-sso-row">
                <input id="wl-sso-domain" name="domain" type="text" inputMode="url" autoFocus value={ssoDomain} onChange={(e) => setSsoDomain(e.target.value)} placeholder="example.com" autoComplete="organization" aria-required="true" aria-invalid={ssoErr ? 'true' : undefined} aria-describedby={ssoErr ? 'wl-sso-err' : undefined} />
                <button type="submit" className="wl-sso-go" disabled={ssoBusy} aria-busy={ssoBusy}>{ssoBusy ? <Loader2 size={15} className="wl-spin" aria-hidden="true" /> : null} Continue <ArrowRight size={15} aria-hidden="true" /></button>
              </div>
              {ssoErr && <div className="wl-err wl-sso-err" id="wl-sso-err" role="alert">{ssoErr}</div>}
            </form>
          )}
          {!ssoOpen && ssoErr && <div className="wl-err wl-sso-err" id="wl-sso-err" role="alert">{ssoErr}</div>}

          <div className="wl-or" role="separator" aria-label="or"><span>or {mode === 'signup' ? 'create with email' : 'log in with email'}</span></div>

          <form onSubmit={submit} aria-label={mode === 'signup' ? 'Create account' : 'Log in'} aria-busy={working}>
            {mode === 'signup' && (<>
              <div className="wl-grid2">
                <div>
                  <label htmlFor="wl-name">Full name</label>
                  <input id="wl-name" name="name" autoFocus value={sName} onChange={(e) => setSName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" aria-required="true" />
                </div>
                <div>
                  <label htmlFor="wl-email">Email</label>
                  <input id="wl-email" name="email" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} onBlur={() => detectSso(candidateDomain)} autoComplete="email" placeholder="you@example.com" aria-required="true" />
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
            {/* sign-in: the username-or-email field is the SSO detector too */}
            {(mode !== 'signup' || !ssoActive) && (<>
            <label htmlFor="wl-user">{mode === 'signup' ? 'Choose a username' : 'Username or email'}</label>
            <input id="wl-user" name="username" {...(mode !== 'signup' ? { autoFocus: true } : {})} value={uName} onChange={(e) => setUName(e.target.value)} onBlur={() => mode !== 'signup' && detectSso(candidateDomain)} autoComplete="username" placeholder={mode === 'signup' ? 'your username' : 'your username or email'} aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'wl-err' : undefined} />
            </>)}
            {/* SSO AUTO-DETECTED: swap the password for a one-tap Continue with SSO */}
            {ssoActive && (
              <div className="wl-ssodetect" role="status">
                <span className="wl-ssodetect-ic"><Building2 size={16} aria-hidden="true" /></span>
                <div className="wl-ssodetect-body">
                  <div className="wl-ssodetect-t">Your organization uses single sign-on</div>
                  <div className="wl-ssodetect-d">{ssoHit.companyName ? <><b>{ssoHit.companyName}</b> signs in through its identity provider for <b>@{ssoHit.domain}</b>.</> : <>Accounts at <b>@{ssoHit.domain}</b> sign in through your company's identity provider.</>}</div>
                  <button type="button" className="wl-cta wl-ssodetect-go" onClick={goSso}>Continue with SSO <ArrowRight size={16} aria-hidden="true" /></button>
                  <button type="button" className="wl-forgot wl-ssodetect-alt" onClick={() => setSsoDismissed(ssoHit.domain)}>Use a password instead</button>
                </div>
              </div>
            )}
            {ssoChecking && !ssoActive && <div className="wl-ssochk"><Loader2 size={13} className="wl-spin" aria-hidden="true" /> Checking your organization's sign-in…</div>}
            {!ssoActive && (<>
            <label htmlFor="wl-pass">Password</label>
            <input id="wl-pass" name="password" type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'choose a password (6+ characters)' : 'your password'} aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'wl-err' : undefined} />
            {err && <div className="wl-err" id="wl-err" role="alert">{err}</div>}
            {/* Individual sign-up consent (owner requirement), visible above the
                action. Company members never use this form: they are provisioned
                invite-only, and company knowledge stays private. */}
            {mode === 'signup' && (
              <div className="wl-improve" role="note">
                <Sparkles size={14} aria-hidden="true" />
                <span>To improve WorkCoPilot, skills and content you add may be used in de-identified form to enhance the service. Your personal data is stripped on your device first. Company accounts are exempt: company knowledge stays private. <a href="/workcopilot/terms#improvement">Learn more</a>.</span>
              </div>
            )}
            <button className="wl-cta" type="submit" disabled={working} aria-busy={working}>
              {working ? <Loader2 size={16} className="wl-spin" aria-hidden="true" /> : null}
              {working ? <span className="wl-sr">Working, please wait. </span> : null}
              {checkingOut ? 'Opening secure checkout' : mode === 'signup' ? (planName ? 'Create account and continue' : 'Create account') : (planName ? 'Log in and continue' : 'Log in')}
              {' '}<ArrowRight size={16} aria-hidden="true" />
            </button>
            </>)}
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

          {/* App only: the one required "create on the web" mention. Opens the public site. */}
          {IN_APP && (
            <p className="wl-newweb">New to WorkCoPilot? <a href="https://admireveda.com/workcopilot" target="_blank" rel="noopener noreferrer">Create your account at admireveda.com</a></p>
          )}
          <div className="wl-legal">Lawful, legitimate work only. Harmful or illegal requests are declined.</div>
          </>)}
        </div>
      </main>
    </div>
  )
}

const CSS = `
/* WorkCoPilot auth: brand green/blue with the orange CTA (no teal). Light by
   default; dark follows the app's data-theme attribute. Tokens mirror the
   dashboard so the two surfaces read as one product. */
.wl{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--tx-2:#2b3250;--mut:#5c6484;
  --em:#0e9f6e;--cyan:#0a84c2;--on-em:#ffffff;--em-fill:rgba(14,159,110,.08);--em-fill-2:rgba(14,159,110,.14);--em-line:rgba(14,159,110,.30);
  --cyan-fill:rgba(10,132,194,.08);--cyan-line:rgba(10,132,194,.26);
  --cta:#f26a43;--cta-2:#e35a31;--cta-ink:#ffffff;--cta-soft:rgba(242,106,67,.10);--cta-line:rgba(242,106,67,.32);--cta-text:#b63f1c;
  --chip:#f1f3fa;--field:#fbfcff;--err:#b42318;
  --shadow:0 30px 70px -40px rgba(26,31,54,.35);--card-shadow:0 1px 2px rgba(26,31,54,.05),0 8px 22px -14px rgba(26,31,54,.14);
  --wl-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  position:relative;min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr;background:var(--bg);color:var(--tx);
  /* clip horizontally only; a blanket overflow:hidden made a tall form unreachable on short phones */
  font-family:"Figtree",system-ui,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
[data-theme='dark'] .wl{--bg:#0a0b12;--panel:#13141f;--panel-2:#181b27;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.15);--tx:#eef0f6;--tx-2:#d3d8e6;--mut:#9aa0b4;
  --em:#8cf5c4;--cyan:#39d3ff;--on-em:#052a1d;--em-fill:rgba(140,245,196,.10);--em-fill-2:rgba(140,245,196,.17);--em-line:rgba(140,245,196,.34);
  --cyan-fill:rgba(57,211,255,.10);--cyan-line:rgba(57,211,255,.30);
  --cta:#ffb561;--cta-2:#ff7a59;--cta-ink:#241206;--cta-soft:rgba(255,160,80,.10);--cta-line:rgba(255,160,80,.32);--cta-text:#ffb561;
  --chip:rgba(255,255,255,.05);--field:#0b0c13;--err:#ff8b81;
  --shadow:0 30px 70px -46px rgba(0,0,0,.85);--card-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 26px -20px rgba(0,0,0,.8)}
.wl *{box-sizing:border-box}
.wl h1,.wl h2{color:var(--tx);margin:0}
.wl a{color:inherit;text-decoration:none}
.wl i{font-style:normal;color:var(--em)}
/* atmosphere: two soft orbs + a faint Fluent dot grid, fixed so they add no scroll */
.wl-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wl-bg::after{content:'';position:absolute;inset:0;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 22%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.32;mask-image:radial-gradient(60% 60% at 25% 30%,#000 20%,transparent 100%);-webkit-mask-image:radial-gradient(60% 60% at 25% 30%,#000 20%,transparent 100%)}
.wl-orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.26;animation:wldrift 18s ease-in-out infinite alternate}
.wl-orb.o1{width:46vw;height:46vw;left:-14vw;top:-16vw;background:radial-gradient(circle,color-mix(in srgb,var(--cyan) 60%,transparent),transparent 65%)}
.wl-orb.o2{width:40vw;height:40vw;left:18vw;bottom:-18vw;background:radial-gradient(circle,color-mix(in srgb,var(--em) 55%,transparent),transparent 65%);animation-delay:-6s}
@keyframes wldrift{to{transform:translateY(4%) scale(1.05)}}

@keyframes wlrise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ===================== WEB (.wl-web): the split-panel redesign =====================
   Owner 2026-10-24: "I don't like our design at all for login pages and create
   accounts"; chose FRESH, modern, LIGHT, keep the split panel. Everything below
   is scoped to .wl-web so the approved in-app card (.wl-app) is untouched.
   LEFT: a brand-tinted aside with the positioning and a live product stage.
   RIGHT: a flat white form column (no card-in-a-card), underline tabs, a 3-up
   provider row, taller fields, the orange CTA. */
.wl.wl-web{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);background:var(--panel)}
.wl-web .wl-bg{display:none}

/* aside */
.wl-web .wl-brand{position:relative;z-index:2;display:flex;flex-direction:column;gap:0;padding:36px 56px 32px;min-height:100vh;overflow:hidden;border-right:1px solid var(--line);
  background:
    radial-gradient(820px 520px at 8% -4%,color-mix(in srgb,var(--em) 16%,transparent),transparent 62%),
    radial-gradient(760px 520px at 100% 104%,color-mix(in srgb,var(--cyan) 16%,transparent),transparent 62%),
    linear-gradient(180deg,color-mix(in srgb,var(--panel) 70%,var(--bg)),var(--bg))}
.wl-web .wl-brand::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 26%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.35;mask-image:radial-gradient(70% 60% at 60% 50%,#000 10%,transparent 100%);-webkit-mask-image:radial-gradient(70% 60% at 60% 50%,#000 10%,transparent 100%)}
.wl-web .wl-brand>*{position:relative;z-index:1}
.wl-web .wl-wordmark{display:flex;flex-direction:column;gap:3px;align-self:flex-start}
.wl-web .wl-prod{font-family:var(--wl-display);font-weight:800;font-size:22px;letter-spacing:-.02em;display:inline-flex;align-items:center;gap:9px}
.wl-web .wl-ad{font-size:12px;color:var(--mut);letter-spacing:.02em;padding-left:31px}
.wl-web .wl-pitch{margin:auto 0 26px;padding-top:34px;max-width:560px}
.wl-web .wl-pitch-k{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--cyan);margin:0 0 14px}
.wl-web .wl-pitch-h{font-family:var(--wl-display);font-weight:800;font-size:clamp(34px,3.9vw,52px);line-height:1.02;letter-spacing:-.035em;color:var(--tx);margin:0;text-wrap:balance}
.wl-web .wl-hl{background:linear-gradient(92deg,var(--em),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
.wl-web .wl-pitch-p{color:var(--mut);font-size:16.5px;line-height:1.55;max-width:46ch;margin:16px 0 0;text-wrap:pretty}

/* the live-step stage: a dark product window with two floating cards */
.wl-web .wl-stage{position:relative;width:min(100%,520px);margin:0 0 auto 0;padding:0 0 26px 0;animation:wlrise .6s cubic-bezier(.2,.8,.2,1) both}
.wl-web .wl-win{--s-bg:#0f1420;--s-bg2:#0b0f18;--s-line:rgba(255,255,255,.09);--s-tx:#eef1f8;--s-mut:#9aa6ba;--s-em:#8cf5c4;--s-cy:#5bd0ff;
  position:relative;z-index:1;width:min(100%,440px);border-radius:18px;background:linear-gradient(180deg,var(--s-bg),var(--s-bg2));border:1px solid var(--s-line);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 40px 80px -36px rgba(17,23,38,.6);color:var(--s-tx);font-size:13px;overflow:hidden}
.wl-web .wl-win::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,var(--s-em),var(--s-cy))}
.wl-web .wl-win-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--s-line);font-size:12px}
.wl-web .wl-win-dots{display:inline-flex;gap:5px}
.wl-web .wl-win-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.14)}
.wl-web .wl-win-t{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--s-tx)}
.wl-web .wl-win-t em{display:inline-flex;align-items:center;gap:4px;font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--s-em);background:rgba(140,245,196,.1);border:1px solid rgba(140,245,196,.25);border-radius:999px;padding:2px 7px;margin-left:4px}
.wl-web .wl-win-tag{margin-left:auto;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;color:var(--s-mut)}
.wl-web .wl-win-row{display:grid;grid-template-columns:62px 1fr;gap:10px;align-items:baseline;padding:9px 14px;border-bottom:1px solid var(--s-line)}
.wl-web .wl-win-row span{font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--s-mut)}
.wl-web .wl-win-row.see span{color:var(--s-cy)}
.wl-web .wl-win-row b{font-weight:600;color:var(--s-tx);line-height:1.4}
.wl-web .wl-win-row.see b{color:#cfe6f6}
.wl-web .wl-win-steps{list-style:none;margin:0;padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px}
.wl-web .wl-win-steps li{display:flex;align-items:flex-start;gap:9px;padding:6px 8px;border-radius:9px;color:var(--s-mut);line-height:1.4}
.wl-web .wl-win-steps li i{flex:none;width:16px;height:16px;border-radius:50%;border:1.5px dashed rgba(255,255,255,.22);margin-top:1px}
.wl-web .wl-win-steps li.done{color:#c4ccdc}
.wl-web .wl-win-steps li.done i{border:0;background:var(--s-em);position:relative}
.wl-web .wl-win-steps li.done i::after{content:'';position:absolute;left:5px;top:3px;width:4px;height:7px;border:solid #06201a;border-width:0 2px 2px 0;transform:rotate(45deg)}
.wl-web .wl-win-steps li.now{color:var(--s-tx);background:rgba(140,245,196,.09);border:1px solid rgba(140,245,196,.28);padding:9px 10px;box-shadow:inset 3px 0 0 var(--s-em)}
.wl-web .wl-win-steps li.now i{border:2px solid var(--s-em);background:radial-gradient(circle,var(--s-em) 38%,transparent 42%);margin-top:3px}
.wl-web .wl-win-steps li.now small{display:block;font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--s-em);margin-bottom:2px}
.wl-web .wl-win-steps li.now b{color:var(--s-tx);background:rgba(255,255,255,.08);border-radius:4px;padding:0 4px}
.wl-web .wl-float{position:absolute;z-index:2;display:flex;gap:10px;align-items:flex-start;width:238px;padding:11px 12px;border-radius:14px;background:var(--panel);border:1px solid var(--line);box-shadow:0 1px 2px rgba(26,31,54,.06),0 22px 44px -22px rgba(26,31,54,.4);animation:wlfloat 6s ease-in-out infinite}
.wl-web .wl-float .ic{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center}
.wl-web .wl-float b{display:block;font-size:13px;font-weight:700;line-height:1.25;color:var(--tx)}
.wl-web .wl-float span:not(.ic){display:block;font-size:11.5px;line-height:1.4;color:var(--mut);margin-top:2px}
.wl-web .wl-float.warn{right:-14px;top:146px;border-color:rgba(183,121,31,.36)}
.wl-web .wl-float.warn .ic{background:rgba(183,121,31,.12);color:#b7791f}
.wl-web .wl-float.learn{right:6px;bottom:-4px;border-color:var(--em-line);animation-delay:-3s}
.wl-web .wl-float.learn .ic{background:var(--em-fill-2);color:var(--em)}
@keyframes wlfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}

/* trust rows */
.wl-web .wl-proof{list-style:none;margin:26px 0 0;padding:22px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.wl-web .wl-proof li{display:flex;gap:10px;align-items:flex-start}
.wl-web .wl-proof b{display:block;font-size:13px;font-weight:700;line-height:1.3;color:var(--tx)}
.wl-web .wl-proof small{display:block;font-size:12px;line-height:1.4;color:var(--mut);margin-top:2px}
.wl-web .wl-proof-ic{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line)}
.wl-web .wl-proof-ic.alt{background:var(--cyan-fill);color:var(--cyan);border-color:var(--cyan-line)}
.wl-web .wl-proof-ic.warm{background:var(--cta-soft);color:var(--cta-text);border-color:var(--cta-line)}

/* form column: flat, generous, white */
.wl-web .wl-main{padding:48px 60px;background:var(--panel);align-content:center}
.wl-web .wl-card{max-width:440px;background:transparent;border:0;border-radius:0;padding:0;box-shadow:none;overflow:visible}
.wl-web .wl-card::before{display:none}
.wl-web .wl-card-brand{display:none}
.wl-web .wl-card h1{font-size:clamp(28px,2.6vw,34px);font-weight:800;letter-spacing:-.03em;line-height:1.1}
.wl-web .wl-sub{font-size:15px;margin:10px 0 22px}
/* underline tabs instead of a pill segment */
.wl-web .wl-seg{display:flex;gap:24px;background:none;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:0;margin-bottom:22px}
.wl-web .wl-seg-b{position:relative;background:none;border-radius:0;padding:2px 2px 12px;font-size:15px;font-weight:600;color:var(--mut);box-shadow:none}
.wl-web .wl-seg-b.on{color:var(--tx);background:none;box-shadow:none}
.wl-web .wl-seg-b.on::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2.5px;border-radius:2px;background:linear-gradient(90deg,var(--em),var(--cyan))}
/* providers: a 3-up tile row, company SSO full width beneath */
.wl-web .wl-social{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.wl-web .wl-prov{flex-direction:column;justify-content:center;gap:7px;height:auto;min-height:72px;padding:12px 8px 11px;border-radius:14px;text-align:center;background:var(--panel);border-color:var(--line-2)}
.wl-web .wl-prov>span{flex:none;font-size:13px;white-space:normal}
.wl-web .wl-prov:hover:not(:disabled){border-color:var(--em);background:var(--panel-2);transform:translateY(-2px);box-shadow:var(--card-shadow)}
.wl-web .wl-prov:disabled{opacity:.6}
.wl-web .wl-soon{position:absolute;top:-8px;left:50%;transform:translateX(-50%);font-size:9px;padding:2px 7px;background:var(--panel);white-space:nowrap}
.wl-web .wl-prov-sso{grid-column:1 / -1;flex-direction:row;justify-content:flex-start;min-height:0;height:46px;padding:0 14px;gap:11px;text-align:left}
.wl-web .wl-prov-sso>span{flex:1 1 auto;font-size:14px}
.wl-web .wl-social .wl-err{grid-column:1 / -1;margin:0}
.wl-web .wl-or{margin:18px 0 16px}
/* fields + action */
.wl-web .wl-card label{font-size:13px;color:var(--tx-2);margin-bottom:7px}
.wl-web .wl-card input{padding:13px 15px;border-radius:13px;font-size:15px;margin-bottom:15px}
.wl-web .wl-cta{border-radius:13px;padding:15px;font-size:16px;margin-top:6px}
.wl-web .wl-sso-form{border-radius:14px}
.wl-web .wl-legal{margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}

/* FORM PANEL */
.wl-main{position:relative;z-index:2;display:grid;place-items:center;padding:40px}
.wl-card{position:relative;width:100%;max-width:480px;background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:30px 32px 26px;box-shadow:var(--shadow);overflow:hidden}
.wl-card::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--em),var(--cyan))}
.wl-card-brand{display:flex;align-items:center;gap:8px;font-family:var(--wl-display);font-weight:800;font-size:15px;margin-bottom:18px}
.wl-by{font-family:"Figtree";font-weight:400;font-size:12px;color:var(--mut);letter-spacing:0}
.wl-card h1{font-family:var(--wl-display);font-size:27px;font-weight:700;letter-spacing:-.02em;line-height:1.15}
.wl-sub{color:var(--mut);margin:8px 0 18px;font-size:14.5px;line-height:1.5}

/* plan summary (checkout step 1) */
.wl-plan{background:var(--em-fill);border:1px solid var(--em-line);border-radius:14px;padding:14px 16px;margin-bottom:18px}
.wl-plan-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.wl-plan-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--em);font-weight:700}
.wl-plan-name{font-family:var(--wl-display);font-weight:800;font-size:22px;letter-spacing:-.02em;line-height:1.1;margin-top:2px}
.wl-plan-price{font-size:13.5px;color:var(--tx);font-weight:600;text-align:right}
.wl-steps{list-style:none;padding:0;margin:12px 0 0;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--mut)}
.wl-steps li{display:inline-flex;align-items:center;gap:6px}
.wl-steps li+li::before{content:"";width:22px;height:1px;background:var(--em-line);margin-right:2px}
.wl-steps li.on{color:var(--tx);font-weight:600}
.wl-step-n{width:20px;height:20px;border-radius:50%;display:inline-grid;place-items:center;font-size:11px;font-weight:700;background:var(--panel);border:1px solid var(--em-line);color:var(--em)}
.wl-steps li.on .wl-step-n{background:var(--em);border-color:var(--em);color:var(--on-em)}

/* create / log in switch */
.wl-seg{display:grid;grid-template-columns:1fr 1fr;background:var(--chip);border:1px solid var(--line);border-radius:12px;padding:4px;gap:4px;margin-bottom:16px}
.wl-seg-b{background:transparent;border:0;border-radius:9px;padding:10px 12px;font:inherit;font-size:14px;font-weight:600;color:var(--mut);cursor:pointer;transition:background .15s,color .15s}
.wl-seg-b.on{background:var(--panel);color:var(--tx);box-shadow:0 1px 3px rgba(26,31,54,.12),inset 0 0 0 1px var(--line)}
.wl-seg-b:hover:not(.on){color:var(--tx)}

/* social + company SSO: outlined provider buttons */
.wl-social{display:flex;flex-direction:column;gap:9px}
.wl-prov{position:relative;width:100%;display:flex;align-items:center;gap:11px;height:44px;padding:0 14px;background:var(--panel);border:1px solid var(--line-2);border-radius:12px;color:var(--tx);font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-align:left;transition:border-color .15s,background .15s,transform .12s,box-shadow .15s}
.wl-prov>svg:first-child{flex:0 0 auto}
.wl-prov>span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wl-prov:hover:not(:disabled){border-color:var(--cyan);background:var(--panel-2);box-shadow:var(--card-shadow);transform:translateY(-1px)}
.wl-prov:disabled{cursor:default;opacity:.62}
.wl-soon{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:2px 8px}
.wl-prov-sso>svg:first-child{color:var(--em)}
.wl-prov-sso.on{border-color:var(--em);background:var(--em-fill)}
.wl-prov-chev{color:var(--mut);transition:transform .18s}
.wl-prov-sso.on .wl-prov-chev{transform:rotate(180deg)}
.wl-or{display:flex;align-items:center;gap:12px;margin:16px 0 14px;color:var(--mut);font-size:12.5px}
.wl-or::before,.wl-or::after{content:'';flex:1;height:1px;background:var(--line)}

/* fields */
.wl-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.wl-card label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.02em;font-weight:600}
.wl-opt{font-weight:400;opacity:.75}
.wl-card input{width:100%;background:var(--field);border:1px solid var(--line-2);border-radius:12px;padding:12px 14px;color:var(--tx);font:inherit;font-size:15px;margin-bottom:14px;transition:border-color .15s,box-shadow .15s,background .15s}
.wl-card input::placeholder{color:var(--mut);opacity:.7}
.wl-card input:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill-2);background:var(--panel);outline:none}
.wl-card input:focus-visible{outline:2px solid var(--em);outline-offset:1px}
.wl-card input[aria-invalid="true"]{border-color:var(--err)}
.wl-err{color:var(--err);font-size:13.5px;margin:-4px 0 14px}
.wl-have{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tx);background:var(--em-fill);border:1px solid var(--em-line);border-radius:12px;padding:10px 13px;margin-bottom:14px}
.wl-have svg{color:var(--em)}
/* Individual sign-up consent: a visible note, not fine print. */
.wl-improve{display:flex;gap:9px;align-items:flex-start;margin:2px 0 12px;padding:10px 12px;border-radius:11px;background:var(--cyan-fill);border:1px solid var(--cyan-line);font-size:12.5px;line-height:1.5;color:var(--tx)}
.wl-improve svg{flex:none;margin-top:2px;color:var(--cyan)}
.wl-improve a{color:var(--cyan);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.wl-social-wait{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:26px 8px 18px}
.wl-social-wait svg{color:var(--em)}
.wl-social-wait .wl-sub{margin:0}
/* a11y: visually hidden text; visible focus ring on every control (never outline:none) */
.wl-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wl a:focus-visible,.wl button:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:8px}

/* primary action: the ORANGE brand CTA */
.wl-cta{width:100%;justify-content:center;background:linear-gradient(135deg,var(--cta),var(--cta-2));color:var(--cta-ink);border:none;border-radius:12px;padding:15px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 14px 34px -14px var(--cta-2);transition:transform .15s,box-shadow .15s,filter .15s;margin-top:4px}
.wl-cta:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.04);box-shadow:0 18px 38px -14px var(--cta-2)}
.wl-cta:disabled{opacity:.72;cursor:default;transform:none}
.wl-next{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--mut);font-size:12.5px;margin:12px 0 0;text-align:center}
.wl-next svg{color:var(--em);flex:none}
.wl-consent{color:var(--mut);font-size:12px;line-height:1.5;margin:12px 0 0;text-align:center}
.wl-consent a{color:var(--cyan);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.wl-forgot{display:block;margin:12px auto 0;background:none;border:none;color:var(--mut);font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.wl-forgot:hover{color:var(--cyan)}
.wl-forgot-sent{display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;font-size:13px;color:var(--tx);margin:12px 0 0}
.wl-forgot-sent svg{color:var(--em)}
.wl-legal{color:var(--mut);font-size:12px;margin-top:16px;text-align:center}
.wl-spin{animation:wlrot 1s linear infinite}@keyframes wlrot{to{transform:rotate(360deg)}}

/* company SSO panel (opens below the SSO button) */
.wl-sso-form{margin:10px 0 2px;padding:14px;border-radius:14px;background:var(--panel-2);border:1px solid var(--line)}
.wl-sso-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:10px}
.wl-sso-head svg{color:var(--em)}
.wl-sso-note{font-weight:400;color:var(--mut);font-size:12px}
.wl-sso-form label{display:block;font-size:12.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.02em}
.wl-sso-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start}
.wl-sso-form input{width:100%;background:var(--field);border:1px solid var(--line-2);border-radius:10px;padding:10px 12px;color:var(--tx);font:inherit;font-size:14px;margin-bottom:0}
.wl-sso-form input:focus{border-color:var(--em);outline:none;box-shadow:0 0 0 3px var(--em-fill-2)}
.wl-sso-form input:focus-visible{outline:2px solid var(--em);outline-offset:1px}
.wl-sso-go{justify-content:center;background:var(--panel);color:var(--tx);border:1px solid var(--line-2);border-radius:10px;padding:10px 12px;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.wl-sso-go:hover{border-color:var(--em)}
.wl-sso-go:disabled{opacity:.7;cursor:default}
.wl-sso-err{margin:10px 0 0}

/* SSO auto-detected: an emerald callout that replaces the password fields with
   a one-tap Continue with SSO and a quiet "use a password instead" escape. */
.wl-ssodetect{display:flex;gap:12px;align-items:flex-start;padding:14px 14px 14px 15px;margin:2px 0 14px;border-radius:14px;background:var(--em-fill);border:1px solid var(--em-line);animation:wlrise .3s cubic-bezier(.2,.8,.2,1) both}
.wl-ssodetect-ic{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:var(--panel);color:var(--em);border:1px solid var(--em-line)}
.wl-ssodetect-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.wl-ssodetect-t{font-family:var(--wl-display);font-weight:700;font-size:15.5px;letter-spacing:-.01em;color:var(--tx)}
.wl-ssodetect-d{font-size:13.5px;line-height:1.5;color:var(--mut)}
.wl-ssodetect-d b{color:var(--tx);font-weight:600}
.wl-ssodetect-go{margin-top:6px}
.wl-ssodetect-alt{margin:4px auto 0}
.wl-ssochk{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--mut);margin:-6px 0 12px}
[data-theme='dark'] .wl-ssodetect{box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 10px 24px -18px rgba(140,245,196,.5)}
@media(prefers-reduced-motion:reduce){.wl-ssodetect{animation:none}}
/* DARK = first-class: real depth on dark (inner highlight on the card, provider
   buttons on an elevated surface), art tuned with an emerald glow so it never
   washes out, a slightly stronger dot grid, vivid-not-harsh accents. */
[data-theme='dark'] .wl-card{box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.05)}
[data-theme='dark'] .wl-bg::after{opacity:.42}
[data-theme='dark'] .wl-prov{background:var(--panel-2)}
[data-theme='dark'] .wl-prov:hover:not(:disabled){background:#1e2131;box-shadow:0 0 0 1px var(--cyan-line),0 10px 24px -16px rgba(57,211,255,.5)}
[data-theme='dark'] .wl-web .wl-card{box-shadow:none}
[data-theme='dark'] .wl-web .wl-win{box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 40px 80px -36px rgba(0,0,0,.8)}
@media(prefers-reduced-motion:reduce){.wl-orb{animation:none}.wl-stage,.wl-float{animation:none}.wl-cta,.wl-prov{transition:none}}
/* ===== IN-APP MODE (.wl-app): one light centered sign-in card. =====
   FORCED LIGHT: the desktop shell sets data-theme="dark" on <html>; the owner
   wants the app sign-in light, so the light defaults are re-declared under the
   dark selector (same values as the .wl root above) and the dark-only depth
   rules are neutralized. Plain, calm background; no brand aside; no toggle. */
.wl.wl-app{grid-template-columns:1fr;background:#f3f5fb;min-height:100vh}
[data-theme='dark'] .wl.wl-app{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--tx-2:#2b3250;--mut:#5c6484;
  --em:#0e9f6e;--cyan:#0a84c2;--on-em:#ffffff;--em-fill:rgba(14,159,110,.08);--em-fill-2:rgba(14,159,110,.14);--em-line:rgba(14,159,110,.30);
  --cyan-fill:rgba(10,132,194,.08);--cyan-line:rgba(10,132,194,.26);
  --cta:#f26a43;--cta-2:#e35a31;--cta-ink:#ffffff;--cta-soft:rgba(242,106,67,.10);--cta-line:rgba(242,106,67,.32);--cta-text:#b63f1c;
  --chip:#f1f3fa;--field:#fbfcff;--err:#b42318;
  --shadow:0 30px 70px -40px rgba(26,31,54,.35);--card-shadow:0 1px 2px rgba(26,31,54,.05),0 8px 22px -14px rgba(26,31,54,.14);
  background:#f3f5fb;color:var(--tx)}
.wl.wl-app .wl-bg{background:
  radial-gradient(640px 320px at 18% -6%,rgba(14,159,110,.10),transparent 62%),
  radial-gradient(640px 320px at 86% 108%,rgba(10,132,194,.10),transparent 62%)}
.wl.wl-app .wl-bg::after{opacity:.22;mask-image:radial-gradient(70% 60% at 50% 40%,#000 10%,transparent 100%);-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000 10%,transparent 100%)}
.wl.wl-app .wl-orb{display:none}
.wl.wl-app .wl-main{padding:34px 24px 44px;align-content:center}
.wl.wl-app .wl-card{max-width:420px;padding:28px 30px 24px;border-radius:20px;box-shadow:0 1px 2px rgba(26,31,54,.06),0 24px 60px -34px rgba(26,31,54,.35);background:#fff;border-color:#e6e8f1}
.wl.wl-app .wl-card-brand{justify-content:center;margin-bottom:22px}
.wl.wl-app .wl-card h1{text-align:center;font-size:26px}
.wl.wl-app .wl-sub{text-align:center;margin:6px 0 20px}
.wl.wl-app .wl-prov{height:42px;border-color:#d3d7e5;background:#fff;color:#161a2b}
.wl.wl-app .wl-prov:hover:not(:disabled){background:#f7f9fd;border-color:#0a84c2;box-shadow:0 8px 22px -14px rgba(26,31,54,.14)}
.wl.wl-app .wl-card input{background:#fbfcff;color:#161a2b;border-color:#d3d7e5}
.wl.wl-app .wl-newweb{margin:14px 0 0;text-align:center;font-size:13px;line-height:1.5;color:var(--mut)}
.wl.wl-app .wl-newweb a{color:var(--cyan);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.wl.wl-app .wl-newweb a:hover{color:#0e9f6e}
.wl.wl-app .wl-legal{margin-top:12px;font-size:11.5px}
/* dark-only depth rules must not bleed into the forced-light app card */
[data-theme='dark'] .wl.wl-app .wl-card{box-shadow:0 1px 2px rgba(26,31,54,.06),0 24px 60px -34px rgba(26,31,54,.35)}
[data-theme='dark'] .wl.wl-app .wl-prov{background:#fff}
[data-theme='dark'] .wl.wl-app .wl-prov:hover:not(:disabled){background:#f7f9fd;box-shadow:0 8px 22px -14px rgba(26,31,54,.14)}
[data-theme='dark'] .wl.wl-app .wl-ssodetect{box-shadow:none}
[data-theme='dark'] .wl.wl-app .wl-bg::after{opacity:.22}
@media(max-width:1180px){.wl-web .wl-brand{padding:32px 36px 28px}.wl-web .wl-main{padding:40px 36px}.wl-web .wl-float.warn{right:0}}
@media(max-width:1040px){.wl-web .wl-proof{grid-template-columns:1fr;gap:12px}.wl-web .wl-stage{width:min(100%,460px)}}
@media(max-width:880px){
 .wl.wl-web{grid-template-columns:1fr}
 .wl-web .wl-brand{display:none}
 .wl-web .wl-card-brand{display:flex;justify-content:center}
 .wl-web .wl-main{padding:32px 20px 40px;background:var(--bg)}
 .wl-web .wl-card{max-width:460px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:26px 24px 22px;box-shadow:var(--card-shadow)}
}
/* reclaim side room for the card on small phones */
@media(max-width:520px){
 .wl-main,.wl-web .wl-main{padding:20px 14px}
 .wl-card,.wl-web .wl-card{padding:22px 18px 20px;border-radius:18px}
 .wl-card h1{font-size:24px}
 .wl-web .wl-social{grid-template-columns:1fr}
 .wl-web .wl-prov{flex-direction:row;justify-content:flex-start;min-height:0;height:44px;padding:0 14px;text-align:left}
 .wl-web .wl-soon{position:static;transform:none;margin-left:auto}
 .wl-grid2{grid-template-columns:1fr}
 .wl-plan-row{align-items:flex-start;flex-direction:column;gap:4px}
 .wl-plan-price{text-align:left}
 .wl-sso-row{grid-template-columns:1fr}
 .wl-sso-go{width:100%}
}
`
