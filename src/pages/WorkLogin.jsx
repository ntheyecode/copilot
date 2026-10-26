import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Loader2, Check, Building2, Lock, ShieldCheck, Eye, FileText, Sparkles, AlertTriangle, BookOpen, ScanEye, Mail, KeyRound } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import MfaGate from '../components/MfaGate.jsx'
import { api } from '../api.js'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import WorkShell from '../workShell.jsx'
import useSeo from '../useSeo.js'                          // per-route title / description / canonical (WEB-01)
import LanguageMenu from '../components/LanguageMenu.jsx'   // pick a language at login; the app adopts it
import { useT } from '../i18n/index.jsx'

const WD_DESK = typeof window !== 'undefined' ? window.workDesktop : null
// IN-APP MODE (owner, 2026-10-24): "Admireveda app is to work, not marketing; so
// it should have just login/password & SSO, and lighter version, not dark (not
// even create the account); all should happen on the web."
// The desktop shell loads this LIVE page, so when WD_DESK is truthy we render a
// single light centered sign-in card. Accounts are created on the web.
// DEV ONLY: `?inapp=1` simulates the desktop branch in a browser so the layout
// can be verified without the shell (tree-shaken out of production builds).
const IN_APP = !!WD_DESK || (import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('inapp'))

// ---------------------------------------------------------------------------
// AdmireVeda WorkCoPilot - create-account / log-in page (/workcopilot).
//
// REDESIGN (owner, 2026-10-25): "too long, badly laid out". The card is now
// COMPACT and TABBED: Tab 1 = Social (Google / Microsoft / Facebook), Tab 2 =
// Email & SSO (username/password or the create-account fields, plus a clear
// "Continue with company SSO" entry). Company SSO is no longer an inline
// dropdown crammed into the form: it is its own FOCUSED STEP inside the card
// (a clean view with one domain field and a Back link). The "or log in with
// email" separator is gone - the tabs replace it. The same tabbed pattern is
// used by the Create account view (web) with the same terminology. The bottom
// helper line ("New to WorkCoPilot? ...") has its own slot and never wraps
// awkwardly. The web keeps the brand aside; the app renders the card alone.
//
// AUTH LOGIC IS UNCHANGED: same useAuth hooks (login / signup / loginMfa /
// loginMfaSetup / refresh), same signup fields, same submit and 409 handling,
// same MFA gate and backup-codes step, same forgot-password, same SSO resolve
// -> start flow, same social start/pending/complete contract, same routing
// effect. Only layout, design and the i18n wrapping are new.
//
// LOCALIZED: every visible string comes from the locale catalog (login.*).
// Server-produced error messages (e2.message) still arrive in English - see
// the i18n report for the server-side hook.
//
// Accessibility: one H1; real tablist/tab/tabpanel; every input labelled with
// autocomplete; errors role=alert and tied via aria-describedby; aria-busy on
// forms; focus rings always visible; the SSO step is a focused view with a
// Back control, so nothing is hidden behind a disclosure.
// ---------------------------------------------------------------------------

// The social set. Easy to add or drop a provider: one entry here, one brand mark.
const SOCIAL = [
  { id: 'google', short: 'Google' },
  { id: 'microsoft', short: 'Microsoft' },
  { id: 'facebook', short: 'Facebook' },
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

// WEB brand aside: the PRODUCT, not an illustration - a dark "watching" window
// with a goal, what it can see, steps ticked, the current step called out, and
// two floating cards. Decorative (aria-hidden); the real copy is the headline
// and the three trust rows.
function WlStage({ t }) {
  return (
    <div className="wl-stage" aria-hidden="true">
      <div className="wl-win">
        <div className="wl-win-bar">
          <span className="wl-win-dots"><i /><i /><i /></span>
          <span className="wl-win-t"><AVMark size={12} id="avst" /> WorkCoPilot <em><ScanEye size={11} /> {t('login.stage.watching')}</em></span>
          <span className="wl-win-tag">{t('login.stage.stepTag')}</span>
        </div>
        <div className="wl-win-row goal"><span>{t('login.stage.goal')}</span><b>{t('login.stage.goalText')}</b></div>
        <div className="wl-win-row see"><span>{t('login.stage.see')}</span><b>{t('login.stage.seeText')}</b></div>
        <ol className="wl-win-steps">
          <li className="done"><i /> {t('login.stage.s1')}</li>
          <li className="done"><i /> {t('login.stage.s2')}</li>
          <li className="now"><i /><div><small>{t('login.stage.doThisNow')}</small>{t.rich('login.stage.s3')}</div></li>
          <li><i /> {t('login.stage.s4')}</li>
          <li><i /> {t('login.stage.s5')}</li>
        </ol>
      </div>
      <div className="wl-float warn">
        <span className="ic"><AlertTriangle size={15} /></span>
        <div><b>{t('login.stage.warnB')}</b><span>{t('login.stage.warnS')}</span></div>
      </div>
      <div className="wl-float learn">
        <span className="ic"><BookOpen size={15} /></span>
        <div><b>{t('login.stage.learnB')}</b><span>{t('login.stage.learnS')}</span></div>
      </div>
    </div>
  )
}

export default function WorkLogin() {
  const nav = useNavigate()
  const t = useT()
  const { user, login, signup, loginMfa, loginMfaSetup, refresh } = useAuth()
  const [sp] = useSearchParams()
  // In the app there is no checkout path: ignore any ?plan so no plan card,
  // no checkout step and no "Log in to start X" copy can appear.
  const plan = IN_APP ? '' : (sp.get('plan') || '').toLowerCase()
  useSeo({ title: t('login.meta.title'), description: t('login.meta.description'), path: '/workcopilot' })
  const cycle = (sp.get('cycle') || 'monthly').toLowerCase()   // annual selections are not auto-charged monthly
  const planName = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }[plan] || ''

  // A chosen plan means a new customer, so default to create-account; otherwise
  // default to log-in. The visitor can switch either way (web only).
  const [modeState, setMode] = useState(plan ? 'signup' : 'signin')
  const mode = IN_APP ? 'signin' : modeState   // the app is sign-in only; accounts are created on the web
  // The two tabs: 'social' | 'email'. A returning SSO error lands on the email
  // tab (that is where company SSO lives).
  const [tab, setTab] = useState(sp.get('sso_error') ? 'email' : 'social')
  // The focused company-SSO step (replaces the old inline dropdown).
  const [ssoView, setSsoView] = useState(false)
  const [uName, setUName] = useState(''); const [uPass, setUPass] = useState('')
  // Compliance sign-up fields (signup mode only).
  const [sName, setSName] = useState(''); const [sEmail, setSEmail] = useState(''); const [sPhone, setSPhone] = useState(''); const [sCompany, setSCompany] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [forgotBusy, setForgotBusy] = useState(false); const [forgotSent, setForgotSent] = useState(false)
  const doForgot = async () => {
    const login = (uName.trim() || (typeof window !== 'undefined' ? window.prompt(t('login.form.forgotPrompt')) : '') || '').trim()
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
  const [ssoDomain, setSsoDomain] = useState('')
  const [ssoBusy, setSsoBusy] = useState(false)
  const [ssoErr, setSsoErr] = useState(sp.get('sso_error') || '')
  const [checkingOut, setCheckingOut] = useState(false)

  // SSO AUTO-DETECT. When the typed email (sign-in "username or email", or the
  // sign-up email) is syntactically valid, debounce ~400ms (or fire on blur) and
  // ask the EXISTING public resolver whether its domain is configured for
  // Company SSO. A hit swaps the password fields for a one-tap "Continue with
  // SSO" (never a hard redirect mid-typing); a miss / 404 / offline resolver
  // silently keeps the normal password flow. The 409 backstop is unchanged.
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
    const tm = setTimeout(() => { detectSso(candidateDomain) }, 400)
    return () => clearTimeout(tm)
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
      setErr(e2 && (e2.status === 440 || (e2.data && e2.data.restart)) ? t('login.err.timedOut') : (e2.message || t('login.err.finishFail')))
    })
    return () => { dead = true }
  }, [socialStep])   // eslint-disable-line
  const submitProfile = async (e) => {
    e && e.preventDefault()
    if (!pName.trim()) { setPErr(t('login.err.enterName')); return }
    setPBusy(true); setPErr('')
    try {
      const r = await api.workSocialComplete({ name: pName.trim(), phone: pPhone.trim() })
      if (r && r.mfaSetup) { setMfa({ mode: 'setup', enroll: r.enroll, username: r.username || pEmail }); setSocialStep(null); setPBusy(false); return }
      setSocialStep(null)
      try { await refresh() } catch { /* routing effect still fires on next check */ }   // { user }: MFA globally disabled
      setPBusy(false)
    } catch (e2) {
      if (e2 && (e2.status === 440 || (e2.data && e2.data.restart))) { setSocialStep(null); setErr(t('login.err.timedOut')); setPBusy(false); return }
      setPErr(e2.message || t('login.err.saveProfile')); setPBusy(false)
    }
  }

  // Plan summary for the checkout-intent card. Public pricing, same endpoint
  // and same annual math (20% off, shown per month, billed yearly) the
  // marketing page uses. If the fetch fails we show the plan name without a price.
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
    ? (cycle === 'annual' ? t('login.plan.billedAnnually') : t('login.plan.billedMonthly'))
    : cycle === 'annual'
      ? t('login.plan.priceAnnual', { price: money(Math.round(listPrice * 0.8)), total: money(Math.round(listPrice * 0.8) * 12) })
      : t('login.plan.priceMonthly', { price: money(listPrice) })

  const startSso = async (e) => {
    e && e.preventDefault()
    const domain = ssoDomain.trim().toLowerCase().replace(/^@/, '')
    if (!domain) { setSsoErr(t('login.err.enterDomain')); return }
    setSsoBusy(true); setSsoErr('')
    try {
      const r = await api.workSsoResolve(domain)
      window.location.assign(api.workSsoStartUrl(r.companyId))
    } catch (e2) {
      setSsoErr(e2.message || t('login.err.ssoNotFound'))
      setSsoBusy(false)
    }
  }
  const openSso = () => { setSsoErr(''); setSsoView(true) }
  const closeSso = () => { setSsoView(false); setSsoErr('') }

  useEffect(() => {
    const id = 'wm-fonts'
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
      document.head.appendChild(l)
    }
  }, [])

  // In the desktop app the sign-in screen is plan mode (large, windowed, not
  // on top); it carries the custom title bar so the frameless window can be
  // moved and closed before the user is signed in.
  useEffect(() => { if (WD_DESK) { try { WD_DESK.setMode('plan') } catch { /* ignore */ } } }, [])

  // Once the account is ready: if a plan was chosen, start Checkout; otherwise
  // open the dashboard. If billing is not configured, we still open the
  // dashboard. A brand-new social return finishes its pending step first.
  useEffect(() => {
    if (!user || checkingOut || socialStep) return
    let cancelled = false
    const run = async () => {
      if (plan) {
        setCheckingOut(true)
        try {
          const r = await api.workCheckout(plan, cycle)
          if (!cancelled && r && r.url) { window.location = r.url; return }
        } catch { /* billing not ready or annual not set up: fall through to the dashboard */ }
      }
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
      if (!sName.trim()) { setErr(t('login.err.enterName')); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sEmail.trim())) { setErr(t('login.err.validEmail')); return }
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
      // server returns 409. Open the focused SSO step with a clear message,
      // prefilling their email domain when they typed an email as the username.
      if (e2 && e2.status === 409) {
        const at = uName.indexOf('@')
        if (at > -1) setSsoDomain(uName.slice(at + 1).trim().toLowerCase())
        setErr(''); setTab('email'); setSsoView(true)
        setSsoErr(e2.message || t('login.err.ssoAccount'))
        setBusy(false)
        return
      }
      setErr(e2.message || (mode === 'signup' ? t('login.err.createFail') : t('login.err.loginFail')))
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
        setErr(t('login.err.loginAgain'))
      }
      throw e2   // let MfaGate render the inline error
    } finally { setMfaBusy(false) }
  }
  // Called after the user has saved their backup codes: now enter the app.
  const handleMfaDone = async () => { try { await refresh() } catch { /* routing effect still fires on next check */ } }

  const working = busy || checkingOut
  const heading = mode === 'signup'
    ? (planName ? t('login.heading.createPlan', { plan: planName }) : t('login.heading.create'))
    : (planName ? t('login.heading.loginPlan', { plan: planName }) : t('login.heading.welcome'))
  const subline = mode === 'signup'
    ? (planName ? t('login.subline.createPlan') : t('login.subline.create'))
    : (planName ? t('login.subline.loginPlan') : t('login.subline.login'))
  const showProfile = socialStep === 'profile' && !mfa
  const socialLoading = socialStep === 'loading' && !mfa
  const switchMode = (m) => { setErr(''); setForgotSent(false); setSsoView(false); setMode(m) }
  const ctaLabel = checkingOut ? t('login.form.openingCheckout')
    : mode === 'signup' ? (planName ? t('login.form.createContinue') : t('login.form.create'))
      : (planName ? t('login.form.loginContinue') : t('login.form.login'))

  return (
    <div className={`wl ${IN_APP ? 'wl-app' : 'wl-web'}`} style={WD_DESK ? { paddingTop: 40 } : undefined}>
      {WD_DESK && <WorkShell authed={false} />}
      <style>{CSS}</style>
      <div className="wl-bg" aria-hidden><span className="wl-orb o1" /><span className="wl-orb o2" /></div>

      {/* BRAND ASIDE (web only, hidden on phones, never rendered in the app). */}
      {!IN_APP && <aside className="wl-brand">
        <a className="wl-wordmark" href="/">
          <span className="wl-prod"><AVMark size={22} id="avlw" /> Work<i>CoPilot</i></span>
          <span className="wl-ad">{t('login.byAdmireVeda')}</span>
        </a>
        <div className="wl-pitch">
          <p className="wl-pitch-k"><Sparkles size={13} aria-hidden="true" /> {t('login.pitchK')}</p>
          <p className="wl-pitch-h">{t.rich('login.pitchH', null, { hl: (c) => <span className="wl-hl">{c}</span> })}</p>
          <p className="wl-pitch-p">{t('login.pitchP')}</p>
        </div>
        <WlStage t={t} />
        <ul className="wl-proof" aria-label={t('login.proofAria')}>
          {t('login.proof').map((p, i) => (
            <li key={i}><span className={`wl-proof-ic${i === 1 ? ' alt' : i === 2 ? ' warm' : ''}`}>{[<Eye size={15} aria-hidden="true" />, <ShieldCheck size={15} aria-hidden="true" />, <FileText size={15} aria-hidden="true" />][i]}</span><span><b>{p.b}</b><small>{p.s}</small></span></li>
          ))}
        </ul>
      </aside>}

      {/* FORM PANEL */}
      <main className="wl-main" id="main">
        <div className="wl-card">
          {/* Card top: brand (app + phones) and the language picker. */}
          <div className="wl-top">
            <div className="wl-card-brand"><AVMark size={18} id="avlc" /> Work<i>CoPilot</i> <span className="wl-by">{t('login.byAdmireVeda')}</span></div>
            <LanguageMenu className="wl-lang" />
          </div>

          {/* Checkout intent: which plan, what it costs, what happens next (one compact row). */}
          {planName && !showProfile && !socialLoading && !mfa && (
            <section className="wl-plan" aria-label={t('login.plan.aria', { plan: planName })}>
              <div><div className="wl-plan-kicker">{t('login.plan.kicker')}</div><div className="wl-plan-name">{planName}</div></div>
              <div className="wl-plan-side">
                <div className="wl-plan-price">{priceLine}</div>
                <ol className="wl-steps" aria-label={t('login.plan.stepsAria')}>
                  <li className="on" aria-current="step"><span className="wl-step-n">1</span> {t('login.plan.account')}</li>
                  <li><span className="wl-step-n"><Lock size={10} aria-hidden="true" /></span> {t('login.plan.checkout')}</li>
                </ol>
              </div>
            </section>
          )}

          {mfa ? (
            <MfaGate mode={mfa.mode} enroll={mfa.enroll} username={mfa.username} backupCodes={backupCodes} busy={mfaBusy} onSubmit={handleMfaSubmit} onDone={handleMfaDone} />
          ) : socialLoading ? (
            /* Back from the provider: asking the server which step comes next. */
            <div className="wl-social-wait" role="status" aria-live="polite">
              <Loader2 size={22} className="wl-spin" aria-hidden="true" />
              <h1>{t('login.finishing.h1')}</h1>
              <p className="wl-sub">{t('login.finishing.p')}</p>
            </div>
          ) : showProfile ? (
            /* PROFILE COMPLETION (brand-new social user): full name required, phone optional. */
            <>
              <h1>{t('login.profile.h1')}</h1>
              <p className="wl-sub">{t('login.profile.sub')}</p>
              <form onSubmit={submitProfile} aria-label={t('login.profile.aria')} aria-busy={pBusy}>
                {pEmail && <div className="wl-have" dir="ltr"><Check size={14} aria-hidden="true" /> {pEmail}</div>}
                <label htmlFor="wl-pname">{t('login.form.fullName')}</label>
                <input id="wl-pname" name="name" autoFocus value={pName} onChange={(e) => setPName(e.target.value)} autoComplete="name" placeholder={t('login.form.namePh')} aria-required="true" aria-invalid={pErr ? 'true' : undefined} aria-describedby={pErr ? 'wl-perr' : undefined} />
                <label htmlFor="wl-pphone">{t('login.form.phone')} <span className="wl-opt">{t('common.optional')}</span></label>
                <input id="wl-pphone" name="phone" type="tel" value={pPhone} onChange={(e) => setPPhone(e.target.value)} autoComplete="tel" placeholder={t('login.form.phonePh')} />
                {pErr && <div className="wl-err" id="wl-perr" role="alert">{pErr}</div>}
                <button className="wl-cta" type="submit" disabled={pBusy} aria-busy={pBusy}>
                  {pBusy ? <Loader2 size={16} className="wl-spin" aria-hidden="true" /> : null} {t('common.continue')} <ArrowRight size={16} aria-hidden="true" className="wl-arrow" />
                </button>
                <p className="wl-consent">{t.rich('login.profile.consent', null, { terms: (c) => <a href="/workcopilot/terms">{c}</a>, privacy: (c) => <a href="/workcopilot/privacy">{c}</a> })}</p>
              </form>
            </>
          ) : ssoView ? (
            /* FOCUSED COMPANY-SSO STEP: its own clean view - one field, one action, a Back link. */
            <div className="wl-ssostep" role="region" aria-label={t('login.ssoStep.aria')}>
              <button type="button" className="wl-back" onClick={closeSso}><ArrowLeft size={15} aria-hidden="true" className="wl-arrow" /> {t('login.ssoStep.back')}</button>
              <span className="wl-ssostep-ic"><Building2 size={20} aria-hidden="true" /></span>
              <h1>{t('login.ssoStep.h1')}</h1>
              <p className="wl-sub">{t('login.ssoStep.p')}</p>
              <form onSubmit={startSso} aria-busy={ssoBusy}>
                <label htmlFor="wl-sso-domain">{t('login.ssoStep.domain')}</label>
                <div className="wl-domain" dir="ltr">
                  <span className="wl-domain-at" aria-hidden="true">@</span>
                  <input id="wl-sso-domain" name="domain" type="text" inputMode="url" autoFocus value={ssoDomain} onChange={(e) => setSsoDomain(e.target.value)} placeholder="example.com" autoComplete="organization" aria-required="true" aria-invalid={ssoErr ? 'true' : undefined} aria-describedby={ssoErr ? 'wl-sso-err' : undefined} />
                </div>
                {ssoErr && <div className="wl-err" id="wl-sso-err" role="alert">{ssoErr}</div>}
                <button type="submit" className="wl-cta" disabled={ssoBusy} aria-busy={ssoBusy}>{ssoBusy ? <Loader2 size={16} className="wl-spin" aria-hidden="true" /> : null} {t('login.ssoStep.continue')} <ArrowRight size={16} aria-hidden="true" className="wl-arrow" /></button>
              </form>
              <p className="wl-ssostep-note">{t('login.ssoStep.note')}</p>
            </div>
          ) : (<>
          <h1>{heading}</h1>
          <p className="wl-sub">{subline}</p>

          {/* THE TWO TABS: Social | Email & SSO (same pattern for log in and create account). */}
          <div className="wl-tabs" role="tablist" aria-label={t('login.tabs.aria')}>
            <button type="button" role="tab" id="wl-tab-social" aria-selected={tab === 'social'} aria-controls="wl-panel-social" className={`wl-tab${tab === 'social' ? ' on' : ''}`} onClick={() => setTab('social')}><Sparkles size={14} aria-hidden="true" /> {t('login.tabs.social')}</button>
            <button type="button" role="tab" id="wl-tab-email" aria-selected={tab === 'email'} aria-controls="wl-panel-email" className={`wl-tab${tab === 'email' ? ' on' : ''}`} onClick={() => setTab('email')}><Mail size={14} aria-hidden="true" /> {t('login.tabs.email')}</button>
          </div>

          {tab === 'social' ? (
            <div className="wl-panel" role="tabpanel" id="wl-panel-social" aria-labelledby="wl-tab-social">
              <div className="wl-social">
                {SOCIAL.map((s) => {
                  const on = socialEnabled(s.id)
                  const soon = !!(providers && providers[s.id] !== true)   // probed and not configured
                  const label = t('login.social.' + s.id)
                  return (
                    <button key={s.id} type="button" className="wl-prov" disabled={!on || working} onClick={() => on && startSocial(s.id)} aria-label={label} title={on ? label : (soon ? t('login.social.soonTitle', { label }) : t('login.social.checking'))}>
                      <SocialMark id={s.id} /><span>{label}</span>{soon ? <em className="wl-soon">{t('common.comingSoon')}</em> : <ArrowRight size={15} aria-hidden="true" className="wl-prov-arrow wl-arrow" />}
                    </button>
                  )
                })}
              </div>
              {socialErr && <div className="wl-err" role="alert">{socialErr}</div>}
              <p className="wl-hint"><ShieldCheck size={13} aria-hidden="true" /> {t('login.social.hint')}</p>
              {planName && !checkingOut && <p className="wl-next"><Lock size={12} aria-hidden="true" /> {t('login.form.next', { plan: planName })}</p>}
            </div>
          ) : (
            <div className="wl-panel" role="tabpanel" id="wl-panel-email" aria-labelledby="wl-tab-email">
              <form onSubmit={submit} aria-label={mode === 'signup' ? t('login.form.ariaCreate') : t('login.form.ariaLogin')} aria-busy={working}>
                {mode === 'signup' && (<>
                  <div className="wl-grid2">
                    <div>
                      <label htmlFor="wl-name">{t('login.form.fullName')}</label>
                      <input id="wl-name" name="name" autoFocus value={sName} onChange={(e) => setSName(e.target.value)} autoComplete="name" placeholder={t('login.form.namePh')} aria-required="true" />
                    </div>
                    <div>
                      <label htmlFor="wl-email">{t('login.form.email')}</label>
                      <input id="wl-email" name="email" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} onBlur={() => detectSso(candidateDomain)} autoComplete="email" placeholder={t('login.form.emailPh')} aria-required="true" />
                    </div>
                  </div>
                  <div className="wl-grid2">
                    <div>
                      <label htmlFor="wl-phone">{t('login.form.phone')} <span className="wl-opt">{t('common.optional')}</span></label>
                      <input id="wl-phone" name="phone" type="tel" value={sPhone} onChange={(e) => setSPhone(e.target.value)} autoComplete="tel" placeholder={t('login.form.phonePh')} />
                    </div>
                    <div>
                      <label htmlFor="wl-company">{t('login.form.company')} <span className="wl-opt">{t('common.optional')}</span></label>
                      <input id="wl-company" name="company" value={sCompany} onChange={(e) => setSCompany(e.target.value)} autoComplete="organization" placeholder={t('login.form.companyPh')} />
                    </div>
                  </div>
                </>)}
                {/* sign-in: the username-or-email field is the SSO detector too */}
                {(mode !== 'signup' || !ssoActive) && (<>
                <label htmlFor="wl-user">{mode === 'signup' ? t('login.form.chooseUsername') : t('login.form.usernameOrEmail')}</label>
                <input id="wl-user" name="username" {...(mode !== 'signup' ? { autoFocus: true } : {})} value={uName} onChange={(e) => setUName(e.target.value)} onBlur={() => mode !== 'signup' && detectSso(candidateDomain)} autoComplete="username" placeholder={mode === 'signup' ? t('login.form.usernamePh') : t('login.form.usernameOrEmailPh')} aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'wl-err' : undefined} />
                </>)}
                {/* SSO AUTO-DETECTED: swap the password for a one-tap Continue with SSO */}
                {ssoActive && (
                  <div className="wl-ssodetect" role="status">
                    <span className="wl-ssodetect-ic"><Building2 size={16} aria-hidden="true" /></span>
                    <div className="wl-ssodetect-body">
                      <div className="wl-ssodetect-t">{t('login.sso.detectedTitle')}</div>
                      <div className="wl-ssodetect-d">{ssoHit.companyName ? t.rich('login.sso.detectedCompany', { company: ssoHit.companyName, domain: ssoHit.domain }) : t.rich('login.sso.detectedDomain', { domain: ssoHit.domain })}</div>
                      <button type="button" className="wl-cta wl-ssodetect-go" onClick={goSso}>{t('login.sso.continue')} <ArrowRight size={16} aria-hidden="true" className="wl-arrow" /></button>
                      <button type="button" className="wl-forgot wl-ssodetect-alt" onClick={() => setSsoDismissed(ssoHit.domain)}>{t('login.sso.usePassword')}</button>
                    </div>
                  </div>
                )}
                {ssoChecking && !ssoActive && <div className="wl-ssochk"><Loader2 size={13} className="wl-spin" aria-hidden="true" /> {t('login.sso.checking')}</div>}
                {!ssoActive && (<>
                <div className="wl-lblrow">
                  <label htmlFor="wl-pass">{t('login.form.password')}</label>
                  {mode === 'signin' && !forgotSent && <button type="button" className="wl-forgot" onClick={doForgot} disabled={forgotBusy}>{t('login.form.forgot')}</button>}
                </div>
                <input id="wl-pass" name="password" type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? t('login.form.passwordNewPh') : t('login.form.passwordPh')} aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'wl-err' : undefined} />
                {err && <div className="wl-err" id="wl-err" role="alert">{err}</div>}
                {forgotSent && <p className="wl-forgot-sent" role="status"><Check size={13} aria-hidden="true" /> {t('login.form.forgotSent')}</p>}
                {/* Individual sign-up consent (owner requirement), visible above the action. */}
                {mode === 'signup' && (
                  <div className="wl-improve" role="note">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>{t.rich('login.form.improve', null, { a: (c) => <a href="/workcopilot/terms#improvement">{c}</a> })}</span>
                  </div>
                )}
                <button className="wl-cta" type="submit" disabled={working} aria-busy={working}>
                  {working ? <Loader2 size={16} className="wl-spin" aria-hidden="true" /> : null}
                  {working ? <span className="wl-sr">{t('login.form.working')} </span> : null}
                  {ctaLabel}{' '}<ArrowRight size={16} aria-hidden="true" className="wl-arrow" />
                </button>
                </>)}
                {mode === 'signup' && (
                  <p className="wl-consent">{t.rich('login.form.consent', null, { terms: (c) => <a href="/workcopilot/terms">{c}</a>, privacy: (c) => <a href="/workcopilot/privacy">{c}</a> })}</p>
                )}
                {planName && !checkingOut && (
                  <p className="wl-next"><Lock size={12} aria-hidden="true" /> {t('login.form.next', { plan: planName })}</p>
                )}
              </form>
              {/* COMPANY SSO ENTRY: one clear row that opens the focused SSO step (no inline dropdown). */}
              <button type="button" className="wl-ssoentry" onClick={openSso}>
                <span className="wl-ssoentry-ic"><KeyRound size={15} aria-hidden="true" /></span>
                <span className="wl-ssoentry-t"><b>{t('login.ssoEntry.btn')}</b><small>{t('login.ssoEntry.q')}</small></span>
                <ArrowRight size={15} aria-hidden="true" className="wl-arrow wl-ssoentry-arrow" />
              </button>
            </div>
          )}

          {/* BOTTOM HELPER: its own slot, centered, wraps cleanly. Web: switch between
              log in / create account. App: the one "create on the web" mention. */}
          <p className="wl-switch">
            {IN_APP
              ? t.rich('login.newWeb', null, { a: (c) => <a href="https://admireveda.com/workcopilot" target="_blank" rel="noopener noreferrer">{c}</a> })
              : mode === 'signup'
                ? t.rich('login.switch.toLogin', null, { a: (c) => <button type="button" className="wl-link" onClick={() => switchMode('signin')}>{c}</button> })
                : t.rich('login.switch.toCreate', null, { a: (c) => <button type="button" className="wl-link" onClick={() => switchMode('signup')}>{c}</button> })}
          </p>
          <div className="wl-legal">{t('login.legal')}</div>
          </>)}
        </div>
      </main>
    </div>
  )
}

const CSS = `
/* WorkCoPilot auth: brand green/blue with the orange CTA. Light by default;
   dark follows the app's data-theme attribute. Tokens mirror the dashboard. */
.wl{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--tx-2:#2b3250;--mut:#5c6484;
  --em:var(--accent,#0e9f6e);--cyan:#0a84c2;--on-em:var(--accent-contrast,#ffffff);--em-fill:var(--accent-soft,rgba(14,159,110,.08));--em-fill-2:var(--accent-soft,rgba(14,159,110,.14));--em-line:var(--accent-line,rgba(14,159,110,.30));
  --cyan-fill:rgba(10,132,194,.08);--cyan-line:rgba(10,132,194,.26);
  --cta:#f26a43;--cta-2:#e35a31;--cta-ink:#ffffff;--cta-soft:rgba(242,106,67,.10);--cta-line:rgba(242,106,67,.32);--cta-text:#b63f1c;
  --chip:#f1f3fa;--field:#fbfcff;--err:#b42318;
  --shadow:0 30px 70px -40px rgba(26,31,54,.35);--card-shadow:0 1px 2px rgba(26,31,54,.05),0 8px 22px -14px rgba(26,31,54,.14);
  --wl-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  position:relative;min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr;background:var(--bg);color:var(--tx);
  font-family:"Figtree",system-ui,sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;text-align:start}
[data-theme='dark'] .wl{--bg:#0a0b12;--panel:#13141f;--panel-2:#181b27;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.15);--tx:#eef0f6;--tx-2:#d3d8e6;--mut:#9aa0b4;
  --em:var(--accent,#8cf5c4);--cyan:#39d3ff;--on-em:var(--accent-contrast,#052a1d);--em-fill:var(--accent-soft,rgba(140,245,196,.10));--em-fill-2:var(--accent-soft,rgba(140,245,196,.17));--em-line:var(--accent-line,rgba(140,245,196,.34));
  --cyan-fill:rgba(57,211,255,.10);--cyan-line:rgba(57,211,255,.30);
  --cta:#ffb561;--cta-2:#ff7a59;--cta-ink:#241206;--cta-soft:rgba(255,160,80,.10);--cta-line:rgba(255,160,80,.32);--cta-text:#ffb561;
  --chip:rgba(255,255,255,.05);--field:#0b0c13;--err:#ff8b81;
  --shadow:0 30px 70px -46px rgba(0,0,0,.85);--card-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 26px -20px rgba(0,0,0,.8)}
.wl *{box-sizing:border-box}
.wl h1,.wl h2{color:var(--tx);margin:0}
.wl a{color:inherit;text-decoration:none}
.wl i{font-style:normal;color:var(--em)}
[dir="rtl"] .wl .wl-arrow{transform:scaleX(-1)}
/* atmosphere: two soft orbs + a faint dot grid, fixed so they add no scroll */
.wl-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wl-bg::after{content:'';position:absolute;inset:0;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 22%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.32;mask-image:radial-gradient(60% 60% at 25% 30%,#000 20%,transparent 100%);-webkit-mask-image:radial-gradient(60% 60% at 25% 30%,#000 20%,transparent 100%)}
.wl-orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.26;animation:wldrift 18s ease-in-out infinite alternate}
.wl-orb.o1{width:46vw;height:46vw;left:-14vw;top:-16vw;background:radial-gradient(circle,color-mix(in srgb,var(--cyan) 60%,transparent),transparent 65%)}
.wl-orb.o2{width:40vw;height:40vw;left:18vw;bottom:-18vw;background:radial-gradient(circle,color-mix(in srgb,var(--em) 55%,transparent),transparent 65%);animation-delay:-6s}
@keyframes wldrift{to{transform:translateY(4%) scale(1.05)}}
@keyframes wlrise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ===================== WEB (.wl-web): split panel ===================== */
.wl.wl-web{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);background:var(--panel)}
.wl-web .wl-bg{display:none}
.wl-web .wl-brand{position:relative;z-index:2;display:flex;flex-direction:column;gap:0;padding:30px 52px 28px;min-height:100vh;overflow:hidden;border-inline-end:1px solid var(--line);
  background:
    radial-gradient(820px 520px at 8% -4%,color-mix(in srgb,var(--em) 16%,transparent),transparent 62%),
    radial-gradient(760px 520px at 100% 104%,color-mix(in srgb,var(--cyan) 16%,transparent),transparent 62%),
    linear-gradient(180deg,color-mix(in srgb,var(--panel) 70%,var(--bg)),var(--bg))}
.wl-web .wl-brand::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 26%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.35;mask-image:radial-gradient(70% 60% at 60% 50%,#000 10%,transparent 100%);-webkit-mask-image:radial-gradient(70% 60% at 60% 50%,#000 10%,transparent 100%)}
.wl-web .wl-brand>*{position:relative;z-index:1}
.wl-web .wl-wordmark{display:flex;flex-direction:column;gap:3px;align-self:flex-start}
.wl-web .wl-prod{font-family:var(--wl-display);font-weight:800;font-size:22px;letter-spacing:-.02em;display:inline-flex;align-items:center;gap:9px}
.wl-web .wl-ad{font-size:12px;color:var(--mut);letter-spacing:.02em;padding-inline-start:31px}
.wl-web .wl-pitch{margin:auto 0 22px;padding-top:28px;max-width:560px}
.wl-web .wl-pitch-k{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--cyan);margin:0 0 12px}
.wl-web .wl-pitch-h{font-family:var(--wl-display);font-weight:800;font-size:clamp(32px,3.6vw,48px);line-height:1.04;letter-spacing:-.035em;color:var(--tx);margin:0;text-wrap:balance}
.wl-web .wl-hl{background:linear-gradient(92deg,var(--em),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
.wl-web .wl-pitch-p{color:var(--mut);font-size:16px;line-height:1.55;max-width:46ch;margin:14px 0 0;text-wrap:pretty}

/* the live-step stage */
.wl-web .wl-stage{position:relative;width:min(100%,520px);margin:0 0 auto 0;padding:0 0 24px 0;animation:wlrise .6s cubic-bezier(.2,.8,.2,1) both}
.wl-web .wl-win{--s-bg:#0f1420;--s-bg2:#0b0f18;--s-line:rgba(255,255,255,.09);--s-tx:#eef1f8;--s-mut:#9aa6ba;--s-em:#8cf5c4;--s-cy:#5bd0ff;
  position:relative;z-index:1;width:min(100%,440px);border-radius:18px;background:linear-gradient(180deg,var(--s-bg),var(--s-bg2));border:1px solid var(--s-line);box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 40px 80px -36px rgba(17,23,38,.6);color:var(--s-tx);font-size:13px;overflow:hidden}
.wl-web .wl-win::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,var(--s-em),var(--s-cy))}
.wl-web .wl-win-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--s-line);font-size:12px}
.wl-web .wl-win-dots{display:inline-flex;gap:5px}
.wl-web .wl-win-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.14)}
.wl-web .wl-win-t{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--s-tx)}
.wl-web .wl-win-t em{display:inline-flex;align-items:center;gap:4px;font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--s-em);background:rgba(140,245,196,.1);border:1px solid rgba(140,245,196,.25);border-radius:999px;padding:2px 7px;margin-inline-start:4px}
.wl-web .wl-win-tag{margin-inline-start:auto;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;color:var(--s-mut)}
.wl-web .wl-win-row{display:grid;grid-template-columns:70px 1fr;gap:10px;align-items:baseline;padding:9px 14px;border-bottom:1px solid var(--s-line)}
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
.wl-web .wl-float.warn{inset-inline-end:-14px;top:146px;border-color:rgba(183,121,31,.36)}
.wl-web .wl-float.warn .ic{background:rgba(183,121,31,.12);color:#b7791f}
.wl-web .wl-float.learn{inset-inline-end:6px;bottom:-4px;border-color:var(--em-line);animation-delay:-3s}
.wl-web .wl-float.learn .ic{background:var(--em-fill-2);color:var(--em)}
@keyframes wlfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.wl-web .wl-proof{list-style:none;margin:22px 0 0;padding:20px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.wl-web .wl-proof li{display:flex;gap:10px;align-items:flex-start}
.wl-web .wl-proof b{display:block;font-size:13px;font-weight:700;line-height:1.3;color:var(--tx)}
.wl-web .wl-proof small{display:block;font-size:12px;line-height:1.4;color:var(--mut);margin-top:2px}
.wl-web .wl-proof-ic{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line)}
.wl-web .wl-proof-ic.alt{background:var(--cyan-fill);color:var(--cyan);border-color:var(--cyan-line)}
.wl-web .wl-proof-ic.warm{background:var(--cta-soft);color:var(--cta-text);border-color:var(--cta-line)}

/* web form column: flat, white, compact */
.wl-web .wl-main{padding:28px 56px 32px;background:var(--panel);align-content:center}
.wl-web .wl-card{max-width:430px;background:transparent;border:0;border-radius:0;padding:0;box-shadow:none;overflow:visible}
.wl-web .wl-card::before{display:none}
.wl-web .wl-card-brand{display:none}
.wl-web .wl-card h1{font-size:clamp(26px,2.4vw,31px);font-weight:800;letter-spacing:-.03em;line-height:1.1}

/* ===================== CARD (shared) ===================== */
.wl-main{position:relative;z-index:2;display:grid;place-items:center;padding:28px}
.wl-card{position:relative;width:100%;max-width:440px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:20px 24px 18px;box-shadow:var(--shadow);overflow:visible}
.wl-card::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;border-radius:20px 20px 0 0;background:linear-gradient(90deg,var(--em),var(--cyan))}
.wl-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;min-height:38px}
.wl-card-brand{display:flex;align-items:center;gap:7px;font-family:var(--wl-display);font-weight:800;font-size:15px;white-space:nowrap}
.wl-by{font-family:"Figtree";font-weight:400;font-size:12px;color:var(--mut);letter-spacing:0}
.wl-lang{margin-inline-start:auto}
.wl-card h1{font-family:var(--wl-display);font-size:25px;font-weight:800;letter-spacing:-.025em;line-height:1.12}
.wl-sub{color:var(--mut);margin:5px 0 14px;font-size:14px;line-height:1.5}

/* plan summary (checkout step 1): ONE compact row */
.wl-plan{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--em-fill);border:1px solid var(--em-line);border-radius:12px;padding:10px 13px;margin-bottom:14px}
.wl-plan-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--em);font-weight:800}
.wl-plan-name{font-family:var(--wl-display);font-weight:800;font-size:19px;letter-spacing:-.02em;line-height:1.1}
.wl-plan-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.wl-plan-price{font-size:12.5px;color:var(--tx);font-weight:600;text-align:end}
.wl-steps{list-style:none;padding:0;margin:0;display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--mut)}
.wl-steps li{display:inline-flex;align-items:center;gap:5px}
.wl-steps li+li::before{content:"";width:14px;height:1px;background:var(--em-line)}
.wl-steps li.on{color:var(--tx);font-weight:600}
.wl-step-n{width:17px;height:17px;border-radius:50%;display:inline-grid;place-items:center;font-size:10px;font-weight:700;background:var(--panel);border:1px solid var(--em-line);color:var(--em)}
.wl-steps li.on .wl-step-n{background:var(--em);border-color:var(--em);color:var(--on-em)}

/* THE TABS: Social | Email & SSO */
.wl-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:var(--chip);border:1px solid var(--line);border-radius:12px;margin-bottom:14px}
.wl-tab{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;border:0;border-radius:9px;background:transparent;color:var(--mut);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s;white-space:nowrap}
.wl-tab svg{color:currentColor;opacity:.8}
.wl-tab:hover:not(.on){color:var(--tx)}
.wl-tab.on{background:var(--panel);color:var(--tx);box-shadow:0 1px 3px rgba(26,31,54,.12),inset 0 0 0 1px var(--line)}
.wl-tab.on svg{color:var(--em);opacity:1}
.wl-panel{animation:wlrise .22s cubic-bezier(.2,.8,.2,1) both}

/* social: three clean rows */
.wl-social{display:flex;flex-direction:column;gap:8px}
.wl-prov{position:relative;width:100%;display:flex;align-items:center;gap:11px;height:44px;padding:0 13px;background:var(--panel);border:1px solid var(--line-2);border-radius:11px;color:var(--tx);font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-align:start;transition:border-color .15s,background .15s,transform .12s,box-shadow .15s}
.wl-prov>svg:first-child{flex:0 0 auto}
.wl-prov>span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wl-prov-arrow{color:var(--mut);flex:none;opacity:0;transform:translateX(-4px);transition:opacity .15s,transform .15s}
.wl-prov:hover:not(:disabled){border-color:var(--em);background:var(--panel-2);box-shadow:var(--card-shadow);transform:translateY(-1px)}
.wl-prov:hover:not(:disabled) .wl-prov-arrow{opacity:1;transform:none;color:var(--em)}
.wl-prov:disabled{cursor:default;opacity:.62}
.wl-soon{flex:none;font-style:normal;font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:2px 8px}
.wl-hint{display:flex;align-items:center;justify-content:center;gap:6px;margin:12px 0 0;font-size:12.5px;color:var(--mut);text-align:center}
.wl-hint svg{color:var(--em);flex:none}

/* fields */
.wl-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.wl-card label{display:block;font-size:12.5px;color:var(--tx-2);margin:0 0 5px;font-weight:600}
.wl-lblrow{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.wl-lblrow .wl-forgot{margin:0 0 5px}
.wl-opt{font-weight:400;opacity:.75}
.wl-card input{width:100%;background:var(--field);border:1px solid var(--line-2);border-radius:11px;padding:0 13px;height:42px;color:var(--tx);font:inherit;font-size:14.5px;margin-bottom:11px;transition:border-color .15s,box-shadow .15s,background .15s}
.wl-card input::placeholder{color:var(--mut);opacity:.7}
.wl-card input:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill-2);background:var(--panel);outline:none}
.wl-card input:focus-visible{outline:2px solid var(--em);outline-offset:1px}
.wl-card input[aria-invalid="true"]{border-color:var(--err)}
.wl-err{color:var(--err);font-size:13px;margin:-3px 0 10px;line-height:1.4}
.wl-have{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tx);background:var(--em-fill);border:1px solid var(--em-line);border-radius:11px;padding:9px 12px;margin-bottom:11px}
.wl-have svg{color:var(--em)}
.wl-improve{display:flex;gap:9px;align-items:flex-start;margin:0 0 10px;padding:9px 11px;border-radius:10px;background:var(--cyan-fill);border:1px solid var(--cyan-line);font-size:12px;line-height:1.45;color:var(--tx)}
.wl-improve svg{flex:none;margin-top:2px;color:var(--cyan)}
.wl-improve a{color:var(--cyan);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.wl-social-wait{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:22px 8px 14px}
.wl-social-wait svg{color:var(--em)}
.wl-social-wait .wl-sub{margin:0}
.wl-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wl a:focus-visible,.wl button:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:8px}

/* primary action: the ORANGE brand CTA */
.wl-cta{width:100%;justify-content:center;background:linear-gradient(135deg,var(--cta),var(--cta-2));color:var(--cta-ink);border:none;border-radius:11px;padding:0 14px;height:44px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 14px 34px -14px var(--cta-2);transition:transform .15s,box-shadow .15s,filter .15s;margin-top:2px}
.wl-cta:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.04);box-shadow:0 18px 38px -14px var(--cta-2)}
.wl-cta:disabled{opacity:.72;cursor:default;transform:none}
.wl-next{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--mut);font-size:12px;margin:10px 0 0;text-align:center}
.wl-next svg{color:var(--em);flex:none}
.wl-consent{color:var(--mut);font-size:11.5px;line-height:1.45;margin:10px 0 0;text-align:center}
.wl-consent a{color:var(--cyan);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.wl-forgot{display:inline-block;background:none;border:none;color:var(--mut);font:inherit;font-size:12.5px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:0}
.wl-forgot:hover{color:var(--cyan)}
.wl-forgot-sent{display:flex;align-items:flex-start;gap:6px;font-size:12.5px;line-height:1.4;color:var(--tx);margin:-3px 0 10px}
.wl-forgot-sent svg{color:var(--em);flex:none;margin-top:2px}
.wl-spin{animation:wlrot 1s linear infinite}@keyframes wlrot{to{transform:rotate(360deg)}}

/* company SSO entry row (opens the focused step) */
.wl-ssoentry{display:flex;align-items:center;gap:11px;width:100%;margin-top:12px;padding:9px 12px;background:var(--panel-2);border:1px dashed var(--line-2);border-radius:11px;color:var(--tx);font:inherit;cursor:pointer;text-align:start;transition:border-color .15s,background .15s}
.wl-ssoentry:hover{border-style:solid;border-color:var(--em);background:var(--em-fill)}
.wl-ssoentry-ic{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line)}
.wl-ssoentry-t{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.wl-ssoentry-t b{font-size:13.5px;font-weight:700}
.wl-ssoentry-t small{font-size:11.5px;color:var(--mut);margin-top:1px}
.wl-ssoentry-arrow{color:var(--mut);flex:none}
.wl-ssoentry:hover .wl-ssoentry-arrow{color:var(--em)}

/* the focused company-SSO step */
.wl-ssostep{animation:wlrise .22s cubic-bezier(.2,.8,.2,1) both}
.wl-back{display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:0;margin:0 0 14px;color:var(--mut);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.wl-back:hover{color:var(--em)}
.wl-ssostep-ic{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line);margin-bottom:12px}
.wl-domain{position:relative}
.wl-domain-at{position:absolute;left:13px;top:0;height:42px;display:flex;align-items:center;color:var(--mut);font-weight:700;font-size:14px;pointer-events:none}
.wl-domain input{padding-left:30px}
.wl-ssostep-note{display:flex;gap:6px;align-items:flex-start;margin:12px 0 0;font-size:12px;line-height:1.45;color:var(--mut)}

/* SSO auto-detected: an emerald callout that replaces the password fields */
.wl-ssodetect{display:flex;gap:11px;align-items:flex-start;padding:12px 13px;margin:0 0 11px;border-radius:12px;background:var(--em-fill);border:1px solid var(--em-line);animation:wlrise .3s cubic-bezier(.2,.8,.2,1) both}
.wl-ssodetect-ic{width:32px;height:32px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center;background:var(--panel);color:var(--em);border:1px solid var(--em-line)}
.wl-ssodetect-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.wl-ssodetect-t{font-family:var(--wl-display);font-weight:700;font-size:15px;letter-spacing:-.01em;color:var(--tx)}
.wl-ssodetect-d{font-size:13px;line-height:1.5;color:var(--mut)}
.wl-ssodetect-d b{color:var(--tx);font-weight:600}
.wl-ssodetect-go{margin-top:4px}
.wl-ssodetect-alt{margin:2px auto 0}
.wl-ssochk{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--mut);margin:-4px 0 10px}

/* bottom helper + legal: own slots, centered, never clipped */
.wl-switch{margin:16px 0 0;padding-top:13px;border-top:1px solid var(--line);text-align:center;font-size:13px;line-height:1.5;color:var(--mut);overflow-wrap:anywhere}
.wl-switch a,.wl-link{color:var(--cyan);font-weight:700;text-decoration:underline;text-underline-offset:3px;background:none;border:0;padding:0;font:inherit;font-weight:700;cursor:pointer}
.wl-switch a:hover,.wl-link:hover{color:var(--em)}
.wl-legal{color:var(--mut);font-size:11.5px;margin-top:8px;text-align:center;line-height:1.4}

[data-theme='dark'] .wl-card{box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.05)}
[data-theme='dark'] .wl-bg::after{opacity:.42}
[data-theme='dark'] .wl-prov{background:var(--panel-2)}
[data-theme='dark'] .wl-web .wl-card{box-shadow:none}
@media(prefers-reduced-motion:reduce){.wl-orb{animation:none}.wl-stage,.wl-float,.wl-panel,.wl-ssostep,.wl-ssodetect{animation:none}.wl-cta,.wl-prov{transition:none}}

/* ===== IN-APP MODE (.wl-app): one light, COMPACT, centered sign-in card. =====
   FORCED LIGHT: the desktop shell sets data-theme="dark" on <html>; the owner
   wants the app sign-in light, so the light tokens are re-declared under the
   dark selector. Plain, calm background; no brand aside. */
.wl.wl-app{grid-template-columns:1fr;background:#f3f5fb;min-height:100vh}
[data-theme='dark'] .wl.wl-app{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--tx-2:#2b3250;--mut:#5c6484;
  --em:var(--accent,#0e9f6e);--cyan:#0a84c2;--on-em:var(--accent-contrast,#ffffff);--em-fill:var(--accent-soft,rgba(14,159,110,.08));--em-fill-2:var(--accent-soft,rgba(14,159,110,.14));--em-line:var(--accent-line,rgba(14,159,110,.30));
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
.wl.wl-app .wl-main{padding:22px 20px 28px;align-content:center}
.wl.wl-app .wl-card{max-width:400px;padding:18px 22px 16px;border-radius:18px;box-shadow:0 1px 2px rgba(26,31,54,.06),0 24px 60px -34px rgba(26,31,54,.35);background:#fff;border-color:#e6e8f1}
.wl.wl-app .wl-card h1{font-size:23px}
.wl.wl-app .wl-sub{margin:4px 0 12px;font-size:13.5px}
.wl.wl-app .wl-prov{height:42px;border-color:#d3d7e5;background:#fff;color:#161a2b}
.wl.wl-app .wl-prov:hover:not(:disabled){background:#f7f9fd;border-color:#0e9f6e}
.wl.wl-app .wl-card input{background:#fbfcff;color:#161a2b;border-color:#d3d7e5}
.wl.wl-app .wl-legal{margin-top:8px;font-size:11px}
[data-theme='dark'] .wl.wl-app .wl-card{box-shadow:0 1px 2px rgba(26,31,54,.06),0 24px 60px -34px rgba(26,31,54,.35)}
[data-theme='dark'] .wl.wl-app .wl-prov{background:#fff}
[data-theme='dark'] .wl.wl-app .wl-ssodetect{box-shadow:none}
[data-theme='dark'] .wl.wl-app .wl-bg::after{opacity:.22}

@media(max-width:1180px){.wl-web .wl-brand{padding:28px 34px 26px}.wl-web .wl-main{padding:28px 34px}.wl-web .wl-float.warn{inset-inline-end:0}}
@media(max-width:1040px){.wl-web .wl-proof{grid-template-columns:1fr;gap:10px}.wl-web .wl-stage{width:min(100%,460px)}}
@media(max-width:880px){
 .wl.wl-web{grid-template-columns:1fr}
 .wl-web .wl-brand{display:none}
 .wl-web .wl-card-brand{display:flex}
 .wl-web .wl-main{padding:24px 18px 32px;background:var(--bg)}
 .wl-web .wl-card{max-width:450px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px 20px 16px;box-shadow:var(--card-shadow)}
}
@media(max-width:520px){
 .wl-main,.wl-web .wl-main{padding:16px 12px}
 .wl-card,.wl-web .wl-card{padding:16px 16px 14px;border-radius:16px}
 .wl-card h1{font-size:22px}
 .wl-grid2{grid-template-columns:1fr}
 .wl-plan{flex-direction:column;align-items:flex-start;gap:6px}
 .wl-plan-side{align-items:flex-start}
 .wl-plan-price{text-align:start}
 .wl-tab{font-size:12.5px;gap:5px}
}
`
