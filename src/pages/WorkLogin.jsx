import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, Check, Building2, Lock, ChevronDown, ShieldCheck, Eye, FileText, Sparkles } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import MfaGate from '../components/MfaGate.jsx'
import { api } from '../api.js'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import WorkShell from '../workShell.jsx'
import useSeo from '../useSeo.js'                          // per-route title / description / canonical (WEB-01)

const WD_DESK = typeof window !== 'undefined' ? window.workDesktop : null

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
// PROFILE COMPLETION: a brand-new social user is asked only for what the
// provider did not give (name / email / phone), then the normal MFA setup.
// Entry is detected from ?social=complete (with optional prefill params) or a
// `profileIncomplete` flag on the user; submit -> POST /api/work/social/complete.
// Shapes are assumed pending the backend and noted at each call site.
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
const SOCIAL = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'microsoft', label: 'Continue with Microsoft' },
  { id: 'facebook', label: 'Continue with Facebook' },
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

// Brand-panel graphic: the same inline-SVG language as the dashboard hero - a
// guided window with steps ticked off, a floating "Now, do this" micro-card and
// the buddy on a cyan guide path, over a dot-grid patch and concentric arcs.
// Every color is a .wl token, so it reads in light and dark.
function WlArt() {
  return (
    <svg className="wl-art" viewBox="0 0 400 300" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="wlDots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill="var(--cyan)" opacity=".3" /></pattern>
        <linearGradient id="wlGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--em)" stopOpacity=".22" /><stop offset="1" stopColor="var(--cyan)" stopOpacity=".1" /></linearGradient>
        <linearGradient id="wlBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--em)" /><stop offset="1" stopColor="var(--cyan)" /></linearGradient>
      </defs>
      <ellipse cx="206" cy="166" rx="182" ry="112" fill="url(#wlGlow)" />
      <rect x="14" y="34" width="132" height="110" rx="14" fill="url(#wlDots)" />
      <circle cx="326" cy="86" r="66" stroke="var(--cyan)" strokeOpacity=".22" strokeWidth="1.2" />
      <circle cx="326" cy="86" r="44" stroke="var(--cyan)" strokeOpacity=".16" strokeWidth="1.2" strokeDasharray="4 6" />
      <rect x="60" y="48" width="240" height="186" rx="18" fill="var(--panel)" stroke="var(--line-2)" />
      <rect x="60" y="48" width="240" height="3" rx="1.5" fill="url(#wlBar)" />
      <path d="M60 78h240" stroke="var(--line)" />
      <circle cx="78" cy="63" r="3.4" fill="var(--line-2)" /><circle cx="90" cy="63" r="3.4" fill="var(--line-2)" /><circle cx="102" cy="63" r="3.4" fill="var(--line-2)" />
      <rect x="228" y="57.5" width="56" height="11" rx="5.5" fill="var(--chip)" stroke="var(--line)" />
      <circle cx="92" cy="104" r="10" fill="var(--em)" /><path d="M87 104.2l3.3 3.3 6.6-7" stroke="var(--on-em)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="114" y="98.5" width="112" height="10" rx="5" fill="var(--line-2)" />
      <circle cx="92" cy="136" r="10" fill="var(--em)" /><path d="M87 136.2l3.3 3.3 6.6-7" stroke="var(--on-em)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="114" y="130.5" width="84" height="10" rx="5" fill="var(--line-2)" />
      <rect x="72" y="154" width="216" height="30" rx="10" fill="var(--em-fill)" stroke="var(--em-line)" />
      <rect x="72" y="154" width="3" height="30" rx="1.5" fill="url(#wlBar)" />
      <circle cx="92" cy="169" r="10" fill="var(--panel)" stroke="var(--em)" strokeWidth="2" /><circle cx="92" cy="169" r="3.8" fill="var(--em)" />
      <rect x="114" y="164" width="128" height="10" rx="5" fill="var(--tx)" opacity=".42" /><rect x="250" y="164" width="22" height="10" rx="5" fill="var(--em)" opacity=".8" />
      <circle cx="92" cy="202" r="10" stroke="var(--line-2)" strokeDasharray="3 3" /><rect x="114" y="196.5" width="98" height="10" rx="5" fill="var(--line)" />
      <g transform="translate(252 24)">
        <rect x="0" y="0" width="128" height="52" rx="12" fill="var(--panel)" stroke="var(--em-line)" />
        <rect x="12" y="12" width="60" height="10" rx="5" fill="var(--em)" opacity=".92" /><rect x="12" y="30" width="96" height="8" rx="4" fill="var(--line-2)" />
        <circle cx="111" cy="17" r="8" fill="var(--em-fill-2)" /><path d="M107.2 17l2.6 2.6 5-5.4" stroke="var(--em)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M330 238c-9-25-27-42-52-49" stroke="var(--cyan)" strokeWidth="1.7" strokeDasharray="3.5 4.5" strokeLinecap="round" />
      <circle cx="276" cy="188" r="3.2" fill="var(--cyan)" />
      <circle cx="342" cy="254" r="26" fill="var(--panel)" stroke="var(--em-line)" strokeWidth="1.5" /><circle cx="342" cy="254" r="18.5" fill="var(--em-fill-2)" />
      <circle cx="335.5" cy="250.5" r="2.6" fill="var(--em)" /><circle cx="348.5" cy="250.5" r="2.6" fill="var(--em)" />
      <path d="M336 259.5c3 2.9 9 2.9 12 0" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 182l2.4 6.4 6.4 2.4-6.4 2.4L40 199.6l-2.4-6.4-6.4-2.4 6.4-2.4z" fill="var(--cyan)" opacity=".55" />
      <path d="M372 150l1.8 4.8 4.8 1.8-4.8 1.8-1.8 4.8-1.8-4.8-4.8-1.8 4.8-1.8z" fill="var(--cta)" opacity=".65" />
    </svg>
  )
}

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

  // SOCIAL sign-in availability. Probe once; a failed/404 probe leaves every
  // provider "unknown" (enabled, let the start route decide). A provider the
  // server reports as false renders disabled with "Coming soon".
  // Assumed shape: { providers: { google: boolean, microsoft: boolean, apple: boolean } }
  const [providers, setProviders] = useState(null)
  const [socialErr, setSocialErr] = useState(sp.get('social_error') || '')
  useEffect(() => {
    let dead = false
    api.workSocialProviders().then((r) => { if (!dead && r && r.providers) setProviders(r.providers) }).catch(() => {})
    return () => { dead = true }
  }, [])
  const socialEnabled = (id) => !(providers && providers[id] === false)
  const startSocial = (id) => {
    setSocialErr('')
    // Carry the checkout intent through the provider round-trip (harmless if ignored).
    const q = plan ? `?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}` : ''
    window.location.assign(api.workSocialStartUrl(id) + q)
  }

  // PROFILE COMPLETION for a brand-new social user. Entered from
  // ?social=complete (optional prefill: provider, name, email, phone) or from a
  // `profileIncomplete` flag on the signed-in user. Only the missing fields are
  // asked. Submit -> POST /api/work/social/complete { name, email, phone };
  // assumed response like signup: { mfaSetup?, enroll? } then the MFA gate, else
  // refresh() and the routing effect takes over.
  const socialComplete = sp.get('social') === 'complete'
  const needsProfile = socialComplete || !!(user && (user.profileIncomplete || user.needsProfile))
  const [pName, setPName] = useState(sp.get('name') || '')
  const [pEmail, setPEmail] = useState(sp.get('email') || '')
  const [pPhone, setPPhone] = useState(sp.get('phone') || '')
  const [pBusy, setPBusy] = useState(false); const [pErr, setPErr] = useState('')
  const [profileDone, setProfileDone] = useState(false)
  const pProvider = (sp.get('provider') || '').toLowerCase()
  useEffect(() => {
    // Prefill from the user record when the provider gave us values server-side.
    if (user) { if (!pName && user.name) setPName(user.name); if (!pEmail && user.email) setPEmail(user.email); if (!pPhone && user.phone) setPPhone(user.phone) }
  }, [user])   // eslint-disable-line
  const submitProfile = async (e) => {
    e && e.preventDefault()
    if (!pName.trim()) { setPErr('Enter your full name.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(pEmail.trim())) { setPErr('Enter a valid email address.'); return }
    setPBusy(true); setPErr('')
    try {
      const r = await api.workSocialComplete({ name: pName.trim(), email: pEmail.trim(), phone: pPhone.trim() })
      setProfileDone(true)
      if (r && r.mfaSetup) { setMfa({ mode: 'setup', enroll: r.enroll, username: (user && user.username) || pEmail.trim() }); setPBusy(false); return }
      if (r && r.mfaRequired) { setMfa({ mode: 'verify', username: (user && user.username) || pEmail.trim() }); setPBusy(false); return }
      try { await refresh() } catch { /* routing effect still fires on next check */ }
      setPBusy(false)
    } catch (e2) { setPErr(e2.message || 'Could not save your profile. Please try again.'); setPBusy(false) }
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
  // social user completes their profile first (needsProfile) before routing.
  useEffect(() => {
    if (!user || checkingOut || (needsProfile && !profileDone)) return
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
  }, [user, plan, cycle, checkingOut, nav, needsProfile, profileDone])

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
  const showProfile = needsProfile && !profileDone && !mfa
  const providerName = { google: 'Google', microsoft: 'Microsoft', facebook: 'Facebook' }[pProvider] || 'your provider'

  return (
    <div className="wl" style={WD_DESK ? { paddingTop: 40 } : undefined}>
      {WD_DESK && <WorkShell authed={false} />}
      <style>{CSS}</style>
      <div className="wl-bg" aria-hidden><span className="wl-orb o1" /><span className="wl-orb o2" /></div>

      {/* BRAND PANEL (hidden on phones): wordmark, value line, the graphic, a calm proof element */}
      <aside className="wl-brand">
        <a className="wl-wordmark" href="/">
          <span className="wl-prod"><AVMark size={22} id="avlw" /> Work<i>CoPilot</i></span>
          <span className="wl-ad">by AdmireVeda</span>
        </a>
        <div className="wl-pitch">
          <p className="wl-pitch-k"><Sparkles size={13} aria-hidden="true" /> Your expert, on every screen</p>
          <p className="wl-pitch-h">Get the hard thing done.<br />One correct step at a time.</p>
          <p className="wl-pitch-p">WorkCoPilot reads your screen, tells you the exact next move, catches a wrong turn, and keeps a clean record of what you did.</p>
        </div>
        <WlArt />
        <ul className="wl-proof" aria-label="What you get">
          <li><span className="wl-proof-ic"><Eye size={15} aria-hidden="true" /></span><span><b>Watches your screen</b><small>Steps update as you work, and a wrong move is caught.</small></span></li>
          <li><span className="wl-proof-ic alt"><FileText size={15} aria-hidden="true" /></span><span><b>Exact steps, commands, links</b><small>Copy-ready, never a vague hint.</small></span></li>
          <li><span className="wl-proof-ic warm"><ShieldCheck size={15} aria-hidden="true" /></span><span><b>Read-only by design</b><small>It never clicks, types or runs anything for you.</small></span></li>
        </ul>
      </aside>

      {/* FORM PANEL: create account / log in (primary), social + company SSO, MFA, profile completion */}
      <main className="wl-main" id="main">
        <div className="wl-card">
          <div className="wl-card-brand"><AVMark size={18} id="avlc" /> Work<i>CoPilot</i> <span className="wl-by">by AdmireVeda</span></div>

          {/* Checkout intent: which plan, what it costs, what happens next. */}
          {planName && !showProfile && (
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
          ) : showProfile ? (
            /* PROFILE COMPLETION: only what the provider did not give. */
            <>
              <h1>Complete your profile</h1>
              <p className="wl-sub">You signed in with {providerName}. A couple of details finish your account, then you set up your authenticator.</p>
              <form onSubmit={submitProfile} aria-label="Complete your profile" aria-busy={pBusy}>
                {!(sp.get('name') || (user && user.name)) || pErr ? (
                  <>
                    <label htmlFor="wl-pname">Full name</label>
                    <input id="wl-pname" name="name" autoFocus value={pName} onChange={(e) => setPName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" aria-required="true" />
                  </>
                ) : <div className="wl-have"><Check size={14} aria-hidden="true" /> {pName}</div>}
                {!(sp.get('email') || (user && user.email)) || pErr ? (
                  <>
                    <label htmlFor="wl-pemail">Email</label>
                    <input id="wl-pemail" name="email" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" aria-required="true" />
                  </>
                ) : <div className="wl-have"><Check size={14} aria-hidden="true" /> {pEmail}</div>}
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

          {/* The one clear switch between the two individual paths. */}
          <div className="wl-seg" aria-label="Create an account or log in">
            <button type="button" className={`wl-seg-b${mode === 'signup' ? ' on' : ''}`} aria-pressed={mode === 'signup'} onClick={() => { setErr(''); setMode('signup') }}>Create account</button>
            <button type="button" className={`wl-seg-b${mode === 'signin' ? ' on' : ''}`} aria-pressed={mode === 'signin'} onClick={() => { setErr(''); setMode('signin') }}>Log in</button>
          </div>

          {/* SOCIAL + COMPANY SSO: outlined provider buttons, then the SSO button. */}
          <div className="wl-social" aria-label="Other ways to continue">
            {SOCIAL.map((s) => {
              const on = socialEnabled(s.id)
              return (
                <button key={s.id} type="button" className="wl-prov" disabled={!on || working} onClick={() => on && startSocial(s.id)} title={on ? s.label : `${s.label} is coming soon`}>
                  <SocialMark id={s.id} /><span>{s.label}</span>{!on && <em className="wl-soon">Coming soon</em>}
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

/* BRAND PANEL */
.wl-brand{position:relative;z-index:2;padding:44px 52px 40px;display:flex;flex-direction:column;gap:26px;border-right:1px solid var(--line);background:linear-gradient(180deg,color-mix(in srgb,var(--panel) 55%,transparent),transparent 60%)}
.wl-wordmark{display:flex;flex-direction:column;gap:3px}
.wl-prod{font-family:var(--wl-display);font-weight:800;font-size:22px;letter-spacing:-.02em;display:inline-flex;align-items:center;gap:9px}
.wl-ad{font-size:12px;color:var(--mut);letter-spacing:.02em;padding-left:31px}
.wl-pitch{margin-top:10px}
.wl-pitch-k{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--cyan);margin:0 0 12px}
.wl-pitch-h{font-family:var(--wl-display);font-weight:800;font-size:clamp(30px,3.6vw,46px);line-height:1.06;letter-spacing:-.03em;color:var(--tx);margin:0;text-wrap:balance}
.wl-pitch-p{color:var(--mut);font-size:16.5px;line-height:1.55;max-width:40ch;margin:14px 0 0}
.wl-art{display:block;width:min(100%,520px);height:auto;margin:4px 0 0 -8px;animation:wlrise .6s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 18px 30px rgba(0,0,0,.14))}
@keyframes wlrise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.wl-proof{list-style:none;margin:auto 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.wl-proof li{display:flex;flex-direction:column;gap:9px;padding:13px 14px;border-radius:14px;background:color-mix(in srgb,var(--panel) 80%,transparent);border:1px solid var(--line);box-shadow:var(--card-shadow)}
.wl-proof b{display:block;font-size:13.5px;font-weight:700;line-height:1.3;color:var(--tx)}
.wl-proof small{display:block;font-size:12px;line-height:1.45;color:var(--mut);margin-top:3px}
.wl-proof-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line)}
.wl-proof-ic.alt{background:var(--cyan-fill);color:var(--cyan);border-color:var(--cyan-line)}
.wl-proof-ic.warm{background:var(--cta-soft);color:var(--cta-text);border-color:var(--cta-line)}

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
[data-theme='dark'] .wl-art{filter:drop-shadow(0 0 28px rgba(140,245,196,.16)) drop-shadow(0 18px 30px rgba(0,0,0,.55))}
[data-theme='dark'] .wl-bg::after{opacity:.42}
[data-theme='dark'] .wl-prov{background:var(--panel-2)}
[data-theme='dark'] .wl-prov:hover:not(:disabled){background:#1e2131;box-shadow:0 0 0 1px var(--cyan-line),0 10px 24px -16px rgba(57,211,255,.5)}
[data-theme='dark'] .wl-proof li{background:color-mix(in srgb,var(--panel) 70%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),var(--card-shadow)}
[data-theme='dark'] .wl-brand{background:linear-gradient(180deg,rgba(255,255,255,.025),transparent 60%)}
@media(prefers-reduced-motion:reduce){.wl-orb{animation:none}.wl-art{animation:none}.wl-cta,.wl-prov{transition:none}}
@media(max-width:1040px){.wl-proof{grid-template-columns:1fr}.wl-proof li{flex-direction:row;align-items:flex-start}.wl-brand{padding:36px 36px 32px}}
@media(max-width:820px){
 .wl{grid-template-columns:1fr}
 .wl-brand{display:none}
}
/* reclaim side room for the card on small phones */
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
