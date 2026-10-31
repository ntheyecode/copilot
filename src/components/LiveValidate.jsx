// LiveValidate - the public "Try it on your task, live" widget.
//
// Single source of truth for the live validator used on EVERY public page
// (marketing / demo / use-cases / sign-in). It injects its own styles once and
// defines its own colour variables on .lv-root, so it looks identical wherever it
// is mounted and does not depend on the host page's CSS.
//
// The visitor's journey (one floating launcher, three stages in a dialog):
//   ASK    - a big, inviting prompt: describe a real task (or tap a starter chip).
//   LEAD   - once per browser session, BEFORE the plan is revealed, we capture
//            First/Last/Email/Phone/Country/Company (all mandatory). The lead is
//            POSTed to /api/work/leads and lands in the superadmin Leads grid.
//            Asking the task FIRST and the details SECOND keeps attribution exact
//            (the live check always carries the lead id) while the visitor has
//            already invested in their question.
//   REVEAL - the product itself, live: a WorkCoPilot console that reads the goal,
//            plans the exact steps with real commands, reveals them one by one,
//            then plays a short LIVE-SESSION PREVIEW on that very plan (clearly
//            labelled as simulated): a step is seen done on screen, the guide
//            corrects a wrong turn on the next one in its own words, and the plan
//            ends "Task complete, confirmed on your screen". Then it recommends
//            the plan that fits, with a straight path to the pricing page ->
//            plan -> account -> checkout.
// The scenario is scrubbed (cleanAlways) before it leaves the browser; the lead's
// own contact details are sent as typed (that is what they chose to share).
// A step's link, click path, terminal command and inline code are drawn by the
// SAME components as the real guiding floater (StepBlocks / RichText / CopyChip),
// so a command here copies and a link here opens exactly as it does in a session.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sparkles, ScanEye, Check, AlertTriangle, TerminalSquare, ShieldCheck, ArrowRight,
  RotateCcw, Loader2, ChevronDown, Lock, Zap, Eye, ListChecks, CheckCheck, Undo2, BadgeCheck, Footprints,
} from 'lucide-react'   // (Lock / ListChecks / Undo2 are still used by the CTA promise pills and the "what you get" line)
import { cleanAlways } from '../scrub.js'   // strip PII/PHI from the scenario before it leaves the browser (public form: always on)
import { useLocale, getLocale } from '../i18n/index.jsx'   // every visible string comes from the catalog (widgets.validate.*); the live check carries the locale
import { countryOptions, countryNameEn } from '../shared/countries.js'   // the ONE country list (ISO alpha-2 + localised names)
import Rich from './live_validate/rich.jsx'                 // the console's inline renderer (shared RichText with the console accent)
import { StepCards, LockedTeaser } from './live_validate/StepTaste.jsx'   // the step cards + the locked teaser (the taste of the depth)
import { STEP_TASTE_CSS } from './live_validate/step_taste.css.js'
import { planShape, simEvents, simState, STEP_STAGGER_MS } from './live_validate/plan_model.js'   // the ONE plan derivation + preview timeline
import { useEditionView } from '../edition/useCaps.js'   // edition: company field only where companies exist; plan pick only where personal plans are sold

// The validator is a lead-capture widget for PUBLIC web visitors only. Inside the
// desktop app or the mobile app the person is already a user, so it must never
// appear. The WorkCoPilot DESKTOP shell exposes window.workDesktop (see
// workcopilot/preload.js - NOT window.refigold, which is the other products'
// shell); the MOBILE app sets a WorkCoPilotApp/<n> user agent. One gate here
// covers EVERY mount (SUPREME RULE II, single source). Environment-constant, so
// the early return is stable across renders (hook count never changes).
const isInApp = () => {
  try {
    if (typeof window !== 'undefined' && window.workDesktop) return true
    return /WorkCoPilotApp\/\d+/.test((typeof navigator !== 'undefined' && navigator.userAgent) || '')
  } catch { return false }
}

const LEAD_KEY = 'wc_lv_lead_v1'   // once-per-session gate; bump suffix to re-ask
// The visitor minimised the launcher to its edge tab (kept for the session so it
// does not pop back out on every page).
const DOCK_KEY = 'wc_lv_dock_v1'
const loadDock = () => { try { return sessionStorage.getItem(DOCK_KEY) === '1' } catch { return false } }
// How far the footer may come up the viewport before the launcher docks: the
// pill's own band (16px offset + 41px pill + a 15px breathing gap). Keep in step
// with .lv-launch / .wm-cov-launch sizes in LV_CSS.
const LAUNCH_BAND_PX = 72
// At this width and below the launcher is always the edge tab (CSS media query
// in LV_CSS); keep the two in step.
const NARROW_QUERY = '(max-width:640px)'
// The plan ids the live check can recommend, and the public plan names (brand
// names, never translated). Order = the pricing ladder.
const PLAN_NAMES = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }
// Minimum time the "planning live" sequence stays on screen even when the server
// answers faster: the three status lines need to land one after another, so the
// reveal never snaps from a blank beat to a wall of text.
const SCAN_MIN_MS = 1900
const SCAN_TICK_MS = 560

// Does this element paint something a floating pill must not cover: its own
// text, an image/icon, or a control the visitor could want to click?
const paintsContent = (el) => {
  if (el.namespaceURI === 'http://www.w3.org/2000/svg') return true
  if (/^(IMG|VIDEO|CANVAS|PICTURE|INPUT|TEXTAREA|SELECT|BUTTON|A|LABEL|SUMMARY)$/.test(el.tagName)) return true
  for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true
  return false
}
// A "box": a card, panel or chip the page drew (background, border or shadow)
// that holds text and is not a full-bleed band. The pill must not lie on one
// even where it misses the glyphs. A full-bleed section background is the
// page itself, not a box; a decorative blob holds no text and is skipped.
const isBox = (el) => {
  if (!el.textContent || !el.textContent.trim()) return false
  const r = el.getBoundingClientRect()
  if (r.right >= window.innerWidth - 8 || r.width >= window.innerWidth - 16) return false
  const cs = window.getComputedStyle(el)
  const bg = cs.backgroundColor
  // A border counts when it frames the element (left + right) or bands it
  // (top + bottom); a lone divider line on a layout wrapper does not.
  const framed = (parseFloat(cs.borderLeftWidth) > 0 && parseFloat(cs.borderRightWidth) > 0)
    || (parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderBottomWidth) > 0)
  const painted = (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') || (cs.backgroundImage && cs.backgroundImage !== 'none')
    || framed || (cs.boxShadow && cs.boxShadow !== 'none')
  return !!painted
}
// What is at this point: content on the hit element itself, or a box among its
// ancestors (a card's padding hits an inner wrapper first). Stops at body.
const contentAt = (el) => {
  if (paintsContent(el)) return true
  for (let e = el; e && e !== document.body; e = e.parentElement) if (isBox(e)) return true
  return false
}
// Sample a 3x3 grid over the pill's footprint and look at the topmost page
// element under each point (skipping the widget's own layer).
const contentUnder = (root, b) => {
  if (typeof document.elementsFromPoint !== 'function') return false
  const xs = [b.left + 3, (b.left + b.right) / 2, b.right - 3]
  const ys = [b.top + 3, (b.top + b.bottom) / 2, b.bottom - 3]
  for (const x of xs) for (const y of ys) {
    const el = document.elementsFromPoint(x, y).find((e) => !root.contains(e))
    if (el && contentAt(el)) return true
  }
  return false
}
const loadLead = () => { try { const r = sessionStorage.getItem(LEAD_KEY); return r ? JSON.parse(r) : null } catch { return null } }
const saveLead = (l) => { try { sessionStorage.setItem(LEAD_KEY, JSON.stringify(l)) } catch { /* private window: live without it */ } }
// A stable per-browser id sent with the lead form AND each live check, so the
// server can attach searches to the lead even when they arrive before capture.
const ANON_KEY = 'wc_lv_anon_v1'
const anonId = (() => {
  try {
    let a = sessionStorage.getItem(ANON_KEY)
    if (!a) { a = 'a' + Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(ANON_KEY, a) }
    return a
  } catch { return '' }   // private window: live without it (leadId still associates)
})()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// The plan model (planShape, the step cards, the locked teaser and the
// live-session preview timeline) lives in live_validate/plan_model.js; the
// cards + teaser render in live_validate/StepTaste.jsx. This file is the
// wiring: stages, the lead gate, the live check and the reveal choreography.
const reducedMotion = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { return false } }

// Where the funnel goes next. The primary CTA takes the visitor to the PRICING
// page with the recommended plan highlighted (?plan=X&from=validate); choosing a
// plan there carries it to sign-up, and the account step continues straight into
// Stripe Checkout (WorkLogin). `go` is kept for hosts that pass their own router.
const defaultToPricing = (plan) => {
  try { window.location.href = `/workcopilot/pricing${plan ? `?plan=${encodeURIComponent(plan)}&from=validate` : ''}` } catch { /* noop */ }
}
const money = (n) => (n == null ? '' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`)

export default function LiveValidate({ toPricing = defaultToPricing, theme = 'light', source = 'site' }) {
  if (isInApp()) return null   // hide the lead widget inside the desktop/mobile app
  const { t, locale } = useLocale()   // `locale` is reactive: the country names re-sort when the visitor switches language
  const ed = useEditionView()
  const [open, setOpen] = useState(false)
  const [lead, setLead] = useState(loadLead)          // null until captured this session
  // 'ask' -> ('lead' once per session) -> 'reveal'
  const [stage, setStage] = useState('ask')
  // The lead captured a moment ago has not flushed into state when the check
  // starts right after capture; the ref is set synchronously so the fresh id is
  // always on the request (exact attribution in the Leads grid).
  const leadRef = useRef(lead)
  useEffect(() => { leadRef.current = lead }, [lead])

  // ---- lead-capture form state -------------------------------------------
  // `country` holds the ISO alpha-2 code the visitor picked ('' until chosen).
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', country: '', company: '' })
  const [ferr, setFerr] = useState({})
  const [fbusy, setFbusy] = useState(false)
  const [ftop, setFtop] = useState('')               // server/connection error, shown at top
  const setField = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); if (ferr[k]) setFerr((p) => ({ ...p, [k]: '' })) }
  const firstRef = useRef(null)
  // Country dropdown options, named in the visitor's language and sorted in it;
  // recomputed only when the language changes (~250 Intl lookups otherwise per keystroke).
  const countries = useMemo(() => countryOptions(locale), [locale])

  // ---- live check state --------------------------------------------------
  const [q, setQ] = useState('')
  const [pendingQ, setPendingQ] = useState('')         // the task being planned (shown as the GOAL)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  // reveal choreography: 'scan' (status lines tick on) -> 'verdict' -> 'steps' -> 'done' (CTA)
  const [phase, setPhase] = useState('idle')
  const [scanTick, setScanTick] = useState(0)
  const [fire, setFire] = useState(false)
  // the live-session preview: index of the last event played (-1 = not started)
  const [simAt, setSimAt] = useState(-1)
  const taRef = useRef(null)
  const timers = useRef([])
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => clearTimers(), [])
  const [coach, setCoach] = useState(false)   // one-time nudge pointing at the launcher
  const dismissCoach = () => { setCoach(false); try { sessionStorage.setItem('wc_lv_coach_v1', '1') } catch { /* private window */ } }
  const openWidget = () => { setOpen(true); dismissCoach() }
  // Live plan prices/allowances for the recommendation card (same endpoint the
  // pricing page uses). Fetched once, the first time the dialog opens.
  const [pricing, setPricing] = useState(null)
  useEffect(() => {
    if (!open || pricing) return
    let alive = true
    fetch('/api/work/pricing').then((r) => r.json()).then((p) => { if (alive) setPricing(p) }).catch(() => {})
    return () => { alive = false }
  }, [open, pricing])

  // ---- launcher placement: never over page text ---------------------------
  // The launcher floats over EVERY public page, so its placement is solved
  // here once (DESIGN-TIME QUALITY GATE: a floating pill must not cover text).
  //   * docked  - the visitor minimised it: it becomes a slim tab hugging the
  //               inline-end edge, inside the page gutter, still opening the
  //               validator on click. Kept for the session.
  //   * nearFoot - the footer has scrolled up into the launcher's band: the
  //               pill would sit on the footer's links / legal line, so it docks
  //               by itself and comes back when the footer scrolls away.
  //   * overText - the page settled (scroll end / resize / reflow) with text, an
  //               image or a control under the pill's footprint: it tucks into
  //               the tab and comes back once that spot is clear. Checked only
  //               when the page settles, so it never flickers mid-scroll.
  //   * narrow  - at 640px and below the CSS media query docks it always: a
  //               full pill covers the right column of any list on a phone.
  const rootRef = useRef(null)
  const launchRef = useRef(null)
  const [docked, setDocked] = useState(loadDock)
  const [nearFoot, setNearFoot] = useState(false)
  const [overText, setOverText] = useState(false)
  const tucked = docked || nearFoot || overText
  const dockLauncher = () => { setDocked(true); dismissCoach(); try { sessionStorage.setItem(DOCK_KEY, '1') } catch { /* private window */ } }
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    // The widget is mounted right after the page footer; fall back to the
    // document's footer on a page that mounts it elsewhere.
    const prev = rootRef.current && rootRef.current.previousElementSibling
    const foot = prev && prev.tagName === 'FOOTER' ? prev : document.querySelector('footer')
    if (!foot) return
    const io = new IntersectionObserver(
      (entries) => { const e = entries[entries.length - 1]; setNearFoot(!!(e && e.isIntersecting)) },
      { rootMargin: `0px 0px -${LAUNCH_BAND_PX}px 0px`, threshold: 0 },
    )
    io.observe(foot)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (open || docked) return   // no launcher on screen / visitor's own choice wins
    const root = rootRef.current
    // `mayUntuck`: a scroll or resize is the visitor moving the page, so the
    // pill may come back when its spot is clear. A reflow (animated content
    // changing height, images loading) may only tuck it, never bring it back,
    // so moving content can never make the launcher oscillate on its own.
    const check = (mayUntuck) => {
      const btn = launchRef.current
      if (!btn || !root) return
      if (window.matchMedia && window.matchMedia(NARROW_QUERY).matches) { setOverText(false); return }
      // Measure the PILL's footprint even while tucked: drop the class for the
      // measurement only (same task, nothing paints in between).
      const wasTucked = root.classList.contains('lv-docked')
      if (wasTucked) root.classList.remove('lv-docked')
      const b = btn.getBoundingClientRect()
      if (wasTucked) root.classList.add('lv-docked')
      const hit = contentUnder(root, b)
      if (hit || mayUntuck) setOverText(hit)
    }
    // One pending check at a time. A scroll/resize restarts the 120ms settle
    // and grants untuck; a reflow only joins a pending check (or starts a
    // tuck-only one) and never cancels a granted untuck.
    let tm = 0, want = false
    const run = () => { tm = 0; const w = want; want = false; check(w) }
    const onMove = () => { want = true; clearTimeout(tm); tm = setTimeout(run, 120) }
    const onReflow = () => { if (!tm) tm = setTimeout(run, 120) }
    onMove()
    window.addEventListener('scroll', onMove, { passive: true })
    window.addEventListener('resize', onMove)
    // Content can change under the pill without a scroll (a tab switch, images
    // loading): any reflow of the page body re-checks too (tuck only).
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onReflow) : null
    if (ro) ro.observe(document.body)
    return () => { clearTimeout(tm); window.removeEventListener('scroll', onMove); window.removeEventListener('resize', onMove); if (ro) ro.disconnect() }
  }, [open, docked])

  // The banner demo / any page can open the validator directly (its "run YOUR
  // task" nudge dispatches wc:open-validate). Also raise a one-time coachmark that
  // points at the launcher, so after watching the demo a visitor knows they can
  // run their own scenario live. Shown once per session, after a short delay.
  useEffect(() => {
    const openIt = () => openWidget()
    window.addEventListener('wc:open-validate', openIt)
    let tm
    try { if (!sessionStorage.getItem('wc_lv_coach_v1')) tm = setTimeout(() => setCoach(true), 6500) } catch { /* private window */ }
    return () => { window.removeEventListener('wc:open-validate', openIt); if (tm) clearTimeout(tm) }
  }, [])

  // Focus the right first input when the dialog opens / stage changes.
  useEffect(() => {
    if (!open) return
    const tm = setTimeout(() => { (stage === 'lead' ? firstRef.current : stage === 'ask' ? taRef.current : null)?.focus() }, 30)
    return () => clearTimeout(tm)
  }, [open, stage])

  // Reset to a fresh question (the lead stays captured for the session).
  const tryAnother = () => {
    clearTimers(); setRes(null); setErr(''); setFire(false); setPhase('idle'); setScanTick(0); setSimAt(-1); setPendingQ(''); setQ('')
    setStage('ask'); setTimeout(() => taRef.current && taRef.current.focus(), 0)
  }

  // The live check with its reveal choreography. The request and the minimum
  // on-screen time of the "planning live" lines run in parallel, so a fast
  // answer still lands as a sequence and a slow one never looks stuck.
  const runCheck = async (question) => {
    clearTimers(); setErr(''); setRes(null); setFire(false); setScanTick(0); setSimAt(-1); setPhase('scan'); setStage('reveal'); setBusy(true)
    const tick = setInterval(() => setScanTick((n) => (n < 2 ? n + 1 : n)), SCAN_TICK_MS)
    const minWait = new Promise((r) => later(r, SCAN_MIN_MS))
    const call = fetch('/api/work/coverage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      // `locale` = the visitor's global language choice, so the server answers in it.
      // The lead captured a moment ago may not have flushed into state yet, so the
      // ref (set synchronously on capture) is the source of the id: exact attribution.
      body: JSON.stringify({ question: cleanAlways(question), leadId: (leadRef.current && leadRef.current.id) ? leadRef.current.id : undefined, anonId, locale: getLocale() }),
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { const e = new Error(r.status >= 500 ? t('widgets.validate.busy') : (data.error || t('widgets.validate.tryAgain'))); e.status = r.status; throw e }
      return data
    })
    try {
      const [data] = await Promise.all([call, minWait])
      clearInterval(tick); setScanTick(3)
      setRes(data); setQ('')
      // Verdict stamp first, then the steps slide in one by one, then the CTA.
      later(() => {
        setPhase('verdict')
        if (data.verdict === 'covered' || data.verdict === 'about') { setFire(true); later(() => setFire(false), 1800) }
      }, 380)
      later(() => setPhase('steps'), 1150)
      const { shown, remaining } = planShape(data)
      const stepsIn = 1150 + 420 + shown * STEP_STAGGER_MS   // the last step card has risen
      later(() => setPhase('done'), stepsIn + 450)
      // The live-session preview starts once the steps have been on screen a
      // moment, and plays event by event. Reduced motion: the end state at once.
      if (shown > 0) {
        const ev = simEvents(shown, remaining)
        if (reducedMotion()) later(() => setSimAt(ev.length - 1), stepsIn + 600)
        else { let at = stepsIn + 600; ev.forEach((e, n) => { at += e.ms; later(() => setSimAt(n), at) }) }
      }
    } catch (e) {
      clearInterval(tick)
      setErr(e && e.message && e.status ? e.message : t('widgets.validate.unreachable'))
      setPhase('idle'); setStage('ask'); setQ(question)
    } finally { setBusy(false) }
  }

  // ASK -> the lead gate (once per session) or straight to the live check.
  const submitAsk = () => {
    const question = q.trim()
    if (!question || busy) return
    setErr(''); setPendingQ(question)
    if (lead) runCheck(question)
    else { setFtop(''); setFerr({}); setStage('lead') }
  }
  const onKey = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitAsk() } }

  const submitLead = async (e) => {
    e && e.preventDefault()
    if (fbusy) return
    // The lead stores the country as its stable English name (readable in the
    // superadmin Leads grid + lead email whatever language the visitor used) and
    // the ISO code beside it. An unknown/empty code resolves to '' -> required error.
    const countryCode = f.country.trim().toUpperCase()
    const v = {
      firstName: f.firstName.trim(), lastName: f.lastName.trim(),
      email: f.email.trim(), phone: f.phone.trim(),
      country: countryNameEn(countryCode), countryCode,
      company: f.company.trim(),
    }
    const errs = {}
    if (!v.firstName) errs.firstName = t('widgets.validate.required')
    if (!v.lastName) errs.lastName = t('widgets.validate.required')
    if (!EMAIL_RE.test(v.email)) errs.email = t('widgets.validate.validEmail')
    if (v.phone.replace(/\D/g, '').length < 7) errs.phone = t('widgets.validate.validPhone')
    if (!v.country) errs.country = t('widgets.validate.validCountry')
    if (ed.companies && !v.company) errs.company = t('widgets.validate.required')
    if (Object.keys(errs).length) { setFerr(errs); setFtop(''); return }
    setFbusy(true); setFtop('')
    try {
      const r = await fetch('/api/work/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, source, anonId, locale: getLocale(), question: pendingQ }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setFtop(r.status >= 500 ? t('widgets.validate.busy') : (data.error || t('widgets.validate.saveFail'))); return }
      const stored = { ...v, id: data.id || null, at: Date.now() }
      saveLead(stored); setLead(stored)   // gate cleared for this session -> reveal the plan
      runCheckWithLead(stored, pendingQ)
    } catch { setFtop(t('widgets.validate.offline')) }
    finally { setFbusy(false) }
  }
  const runCheckWithLead = (stored, question) => { leadRef.current = stored; runCheck(question) }

  const verdictMeta = {
    covered: { label: t('widgets.validate.verdict.covered'), cls: 'ok', Icon: Check },
    about: { label: t('widgets.validate.verdict.about'), cls: 'ok', Icon: Sparkles },
    partial: { label: t('widgets.validate.verdict.partial'), cls: 'mid', Icon: AlertTriangle },
    no: { label: t('widgets.validate.verdict.no'), cls: 'no', Icon: AlertTriangle },
    offtopic: { label: t('widgets.validate.verdict.offtopic'), cls: 'off', Icon: Sparkles },
  }
  const vm = res ? (verdictMeta[res.verdict] || verdictMeta.about) : null
  const VIcon = vm ? vm.Icon : null
  const { preview, shown, roadmap, total, remaining } = planShape(res)
  // The live-session preview as it stands right now (all false until it starts).
  const sim = simState(simEvents(shown, remaining), simAt)
  const stepsLanded = phase === 'steps' || phase === 'done'
  // The recommendation: the plan the live check names, else the popular plan when
  // the visitor asked about the product. Never for an off-topic question.
  const recPlan = res ? ((res.plan && PLAN_NAMES[String(res.plan).toLowerCase()]) ? String(res.plan).toLowerCase() : (res.verdict === 'no' || res.verdict === 'offtopic' ? '' : 'basic')) : ''
  const recPrice = pricing && pricing.plans ? pricing.plans[recPlan] : null
  // Allowances come from the pricing API, never hardcoded: hoursMonthly is the
  // guided hours included per calendar month, tasks the guided tasks per day.
  // An API that does not carry hoursMonthly yet (the older shape) hides the
  // hours rather than showing a number with the wrong unit.
  const recHours = pricing && pricing.hoursMonthly ? pricing.hoursMonthly[recPlan] : null
  const showCta = !!(res && recPlan && res.verdict !== 'offtopic' && res.verdict !== 'no')

  // A plain render helper (NOT a component) - defining a component inside render
  // would give each field a new type every keystroke and drop focus. Inlined
  // elements keep their identity across renders.
  const field = (k, label, { type = 'text', placeholder, half, inputRef, autoComplete } = {}) => (
    <div className={`lv-field${half ? ' half' : ''}${ferr[k] ? ' err' : ''}`} key={k}>
      <label>{label}{ferr[k] && <span className="lv-fe">{ferr[k]}</span>}</label>
      <input ref={inputRef} type={type} value={f[k]} onChange={setField(k)} placeholder={placeholder}
        autoComplete={autoComplete} spellCheck={false} />
    </div>
  )
  // Same wrapper/label/error pattern as `field`, with a native <select> (styled to
  // match the inputs) so leads carry a clean ISO country, never free text.
  const selectField = (k, label, options, { placeholder, half, autoComplete } = {}) => (
    <div className={`lv-field${half ? ' half' : ''}${ferr[k] ? ' err' : ''}`} key={k}>
      <label>{label}{ferr[k] && <span className="lv-fe">{ferr[k]}</span>}</label>
      <span className="lv-sel">
        <select value={f[k]} onChange={setField(k)} autoComplete={autoComplete} className={f[k] ? '' : 'lv-ph'} aria-required="true">
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
        </select>
        <ChevronDown size={16} className="lv-sel-ic" aria-hidden />
      </span>
    </div>
  )

  const scanRows = [t('widgets.validate.scan1'), t('widgets.validate.scan2'), t('widgets.validate.scan3')]
  // Reveal timing in ms, shared with the CSS stagger via inline --d.
  const afterSteps = 420 + shown * STEP_STAGGER_MS

  return (
    <div ref={rootRef} className={`lv-root${tucked ? ' lv-docked' : ''}`} data-lvtheme={theme === 'dark' ? 'dark' : 'light'}>
      <style>{LV_CSS}</style>
      {!open && coach && !tucked && (
        <div className="lv-coach" role="note">
          <button className="lv-coach-x" onClick={dismissCoach} aria-label={t('widgets.validate.dismiss')}>&times;</button>
          <button type="button" className="lv-coach-body" onClick={openWidget}>
            <span className="lv-coach-ic"><Sparkles size={15} /></span>
            <span className="lv-coach-tx"><b>{t('widgets.validate.coachB')}</b><span>{t.rich('widgets.validate.coachS')}</span></span>
            <ArrowRight size={16} className="lv-coach-go lv-arrow" />
          </button>
          <span className="lv-coach-arrow" aria-hidden />
        </div>
      )}
      {!open && (
        <div className="lv-launch">
          <button ref={launchRef} className="wm-cov-launch" onClick={openWidget} aria-label={t('widgets.validate.launchAria')}>
            <span className="lv-live-dot" aria-hidden /><Sparkles size={16} /><span className="lv-launch-tx">{t('widgets.validate.launch')}</span>
          </button>
          {/* Minimise to the edge tab (pill form only; the tab is already minimal). */}
          {!tucked && (
            <button type="button" className="lv-min" onClick={dockLauncher} aria-label={t('widgets.validate.dismiss')} title={t('widgets.validate.dismiss')}>&times;</button>
          )}
        </div>
      )}
      {open && (
        <div className="wm-cov-overlay" onClick={() => setOpen(false)}>
          <div className="wm-cov" role="dialog" aria-modal="true" aria-label={t('widgets.validate.title')} onClick={(e) => e.stopPropagation()}>
            {fire && (
              <div className="wm-fw" aria-hidden>
                {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`wm-fw-burst b${i}`}>{Array.from({ length: 12 }).map((__, j) => <i key={j} style={{ '--a': j * 30 }} />)}</span>)}
              </div>
            )}
            <div className="wm-cov-head">
              <div className="wm-cov-head-t">
                <ScanEye size={18} />
                <span>{t('widgets.validate.title')}</span>
                <span className="lv-live-pill"><span className="lv-live-dot" /><span className="lv-live-pill-tx">{t('widgets.validate.live')}</span></span>
              </div>
              <button className="wm-cov-x" onClick={() => setOpen(false)} aria-label={t('widgets.validate.close')}>&times;</button>
            </div>

            {/* STAGE 1 - ASK: a real task, in the visitor's words */}
            {stage === 'ask' && (
              <div className="wm-cov-body lv-ask">
                <h3 className="lv-ask-h">{t('widgets.validate.askH')}</h3>
                <p className="lv-ask-sub">{t('widgets.validate.askSub')}</p>
                {err && <p className="wm-cov-err lv-top-err">{err}</p>}
                <textarea ref={taRef} rows={3} value={q} maxLength={1200} placeholder={t('widgets.validate.askPh')}
                  onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} aria-label={t('widgets.validate.askH')} />
                <div className="lv-chips" aria-label={t('widgets.validate.tryOne')}>
                  <span className="lv-chips-l">{t('widgets.validate.tryOne')}</span>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <button type="button" key={i} className="lv-chip" onClick={() => { setQ(t(`widgets.validate.chip${i}`)); taRef.current && taRef.current.focus() }}>{t(`widgets.validate.chip${i}`)}</button>
                  ))}
                </div>
                <button type="button" className="lv-go" onClick={submitAsk} disabled={busy || !q.trim()}>
                  <Zap size={17} /> {t('widgets.validate.watchIt')} <ArrowRight size={17} className="lv-arrow" />
                </button>
                <p className="lv-privacy"><ShieldCheck size={13} /> {t('widgets.validate.privacy')}</p>
              </div>
            )}

            {/* STAGE 2 - LEAD (once per session): the plan is being prepared; where do we send it */}
            {stage === 'lead' && (
              <form className="wm-cov-body lv-form" onSubmit={submitLead}>
                <div className="lv-prep" role="status">
                  <span className="lv-prep-bar" aria-hidden />
                  <ScanEye size={15} /><b>{t('widgets.validate.prepH')}</b>
                  <span className="lv-prep-q">&ldquo;{pendingQ}&rdquo;</span>
                </div>
                {ftop && <p className="wm-cov-err lv-top-err">{ftop}</p>}
                <p className="wm-cov-intro">{t.rich('widgets.validate.leadIntro')}</p>
                <div className="lv-grid">
                  {field('firstName', t('widgets.validate.firstName'), { placeholder: t('widgets.validate.firstNamePh'), half: true, inputRef: firstRef, autoComplete: 'given-name' })}
                  {field('lastName', t('widgets.validate.lastName'), { placeholder: t('widgets.validate.lastNamePh'), half: true, autoComplete: 'family-name' })}
                  {field('email', t('widgets.validate.workEmail'), { type: 'email', placeholder: t('widgets.validate.workEmailPh'), autoComplete: 'email' })}
                  {field('phone', t('widgets.validate.phone'), { type: 'tel', placeholder: t('widgets.validate.phonePh'), half: true, autoComplete: 'tel' })}
                  {selectField('country', t('widgets.validate.country'), countries, { placeholder: t('widgets.validate.countryPh'), half: true, autoComplete: 'country' })}
                  {ed.companies && field('company', t('widgets.validate.company'), { placeholder: t('widgets.validate.companyPh'), autoComplete: 'organization' })}
                </div>
                <button type="submit" className="lv-submit" disabled={fbusy}>
                  {fbusy ? <><Loader2 size={16} className="lv-spin" /> {t('widgets.validate.saving')}</> : <>{t('widgets.validate.reveal')} <ArrowRight size={16} className="lv-arrow" /></>}
                </button>
                <button type="button" className="lv-back" onClick={() => { setStage('ask'); setErr('') }}>{t('widgets.validate.editTask')}</button>
                <p className="lv-privacy"><ShieldCheck size={13} /> {t('widgets.validate.privacy')}</p>
              </form>
            )}

            {/* STAGE 3 - REVEAL: the product, live, on the visitor's task */}
            {stage === 'reveal' && (
              <>
                <div className="wm-cov-body lv-reveal">
                  <div className="lv-console" aria-live="polite">
                    <div className="lv-con-head">
                      <span className="d r" /><span className="d y" /><span className="d g" />
                      <b>WorkCoPilot</b>
                      <span className="lv-con-live"><i aria-hidden />{t('widgets.validate.watching')}</span>
                      {res && vm && <span className="lv-con-tag">{t('widgets.validate.live')}</span>}
                    </div>
                    <div className="lv-con-goal"><span className="lv-k">{t('widgets.validate.goal')}</span>{pendingQ}</div>

                    {phase === 'scan' && (
                      <div className="lv-scan">
                        <span className="lv-scan-beam" aria-hidden />
                        {scanRows.map((row, i) => (
                          <div key={i} className={`lv-scan-row${scanTick > i ? ' done' : scanTick === i ? ' on' : ''}`}>
                            <span className="tick">{scanTick > i ? <Check size={12} /> : null}</span>{row}
                          </div>
                        ))}
                      </div>
                    )}

                    {phase !== 'scan' && res && vm && (
                      <>
                        <div className={`lv-verdict ${vm.cls}`}>
                          <span className="lv-vbadge">{VIcon && <VIcon size={20} />}</span>
                          <span className="lv-vlabel">{vm.label}</span>
                        </div>
                        {res.answer && <p className="lv-answer"><Rich text={res.answer} /></p>}
                        {res.sees && (
                          <div className="lv-sees">
                            <span className="lv-scan-beam soft" aria-hidden />
                            <span className="lv-seek"><Eye size={12} /> {t('widgets.validate.iCanSee')}</span>
                            <span className="lv-seetxt">{res.sees}</span>
                          </div>
                        )}
                        {/* The one precondition line (signed in, the app open): never a step. */}
                        {stepsLanded && shown > 0 && res.ready && (
                          <div className="lv-ready"><Check size={13} /><span><span className="lv-k">{t('widgets.validate.ready')}</span><Rich text={res.ready} /></span></div>
                        )}

                        {/* The live-session preview, labelled as what it is: simulated, on this plan. */}
                        {sim.on && (
                          <div className="lv-sim" role="note">
                            <span className="lv-sim-h"><i aria-hidden /> {t('widgets.validate.sim.eyebrow')}</span>
                            <span className="lv-sim-n">{t('widgets.validate.sim.note')}</span>
                          </div>
                        )}

                        {/* the previewed steps in full (sub-steps in view), then the rest as the live-session teaser */}
                        {stepsLanded && shown > 0 && <StepCards t={t} preview={preview} total={total} sim={sim} />}
                        {stepsLanded && remaining > 0 && (
                          <LockedTeaser t={t} roadmap={roadmap} shown={shown} remaining={remaining} sim={sim} delayMs={afterSteps} />
                        )}

                        {/* the end of every live session: the result seen and confirmed */}
                        {sim.complete && (
                          <div className="lv-complete" role="status">
                            <span className="lv-vbadge"><CheckCheck size={20} /></span>
                            <span><b>{t('widgets.validate.sim.complete')}</b><span>{t('widgets.validate.sim.completeSub')}</span></span>
                          </div>
                        )}

                        {stepsLanded && res.verdict !== 'offtopic' && (
                          <div className="lv-val" style={{ '--d': `${afterSteps + 120}ms` }}>
                            {total > 0 && <span><ListChecks size={13} /> {t.n('widgets.validate.step', total)}</span>}
                            <span><TerminalSquare size={13} /> {t('widgets.validate.valExact')}</span>
                            <span><Check size={13} /> {t('widgets.validate.valCheck')}</span>
                            <span><ShieldCheck size={13} /> {t('widgets.validate.valRo')}</span>
                          </div>
                        )}

                        {phase === 'done' && showCta && (
                          <div className="lv-cta">
                            <div className="lv-cta-h">{t('widgets.validate.ctaH')}</div>
                            <p className="lv-cta-sub">{t('widgets.validate.ctaSub')}</p>
                            {/* the three things a live session does, in three pills */}
                            <ul className="lv-promise" aria-label={t('widgets.validate.sim.eyebrow')}>
                              <li><Undo2 size={13} /> {t('widgets.validate.promise1')}</li>
                              <li><Footprints size={13} /> {t('widgets.validate.promise2')}</li>
                              <li><BadgeCheck size={13} /> {t('widgets.validate.promise3')}</li>
                            </ul>
                            {ed.individualPlans ? (<>
                            <div className="lv-plan">
                              <span className="lv-plan-rib">{t('widgets.validate.recommended')}</span>
                              <span className="lv-plan-n">{PLAN_NAMES[recPlan]}</span>
                              {recPrice != null && <span className="lv-plan-p">{money(recPrice)}<small>{t('common.perMonth')}</small></span>}
                              {recHours != null && (
                                <span className="lv-plan-d">
                                  {recHours != null && t.n('widgets.validate.hrsMonth', recHours)}
                                </span>
                              )}
                            </div>
                            <div className="lv-cta-btns">
                              <button type="button" className="lv-start" onClick={() => toPricing(recPlan)}>{t('widgets.validate.startWith', { plan: PLAN_NAMES[recPlan] })} <ArrowRight size={16} className="lv-arrow" /></button>
                              <button type="button" className="lv-compare" onClick={() => toPricing('')}>{t('widgets.validate.comparePlans')}</button>
                            </div>
                            <p className="lv-trust"><span><Check size={12} /> {t('widgets.validate.trustCancel')}</span><span><Lock size={12} /> {t('widgets.validate.trustStripe')}</span></p>
                            </>) : (
                              // Organizations only: no personal plan to pick; the next step is the sales conversation.
                              <div className="lv-cta-btns">
                                <a className="lv-start" href="/workcopilot/contact">{t('edition.validate.talk')} <ArrowRight size={16} className="lv-arrow" /></a>
                                <a className="lv-compare" href="/workcopilot/pricing">{t('edition.validate.plans')}</a>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {err && <p className="wm-cov-err">{err}</p>}
                </div>
                <div className="wm-cov-input lv-again">
                  <button type="button" className="wm-cov-clear" onClick={tryAnother} disabled={busy}><RotateCcw size={15} /> {t('widgets.validate.tryAnother')}</button>
                  {phase === 'done' && showCta && ed.individualPlans && (
                    <button type="button" className="lv-again-go" onClick={() => toPricing(recPlan)}>{t('widgets.validate.startWith', { plan: PLAN_NAMES[recPlan] })} <ArrowRight size={15} className="lv-arrow" /></button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Edge-tab (docked) form of the launcher: a 24px tab hugging the inline-end edge,
// inside the page gutter, so it sits beside the text column instead of on it.
// Still the same button (opens the validator); only the label is hidden. One
// definition, used for the docked state AND for every width at or below 640px.
const LV_DOCK = (s) => `
${s} .lv-launch{inset-inline-end:0;max-width:none}
${s} .wm-cov-launch{flex-direction:column;gap:7px;width:24px;padding:10px 0;border-radius:9px 0 0 9px;box-shadow:0 10px 26px -10px rgba(255,122,89,.65);animation:lv-tab-in .2s ease}
[dir="rtl"] ${s} .wm-cov-launch{border-radius:0 9px 9px 0}
${s} .wm-cov-launch:hover{transform:translateX(-1px)}
[dir="rtl"] ${s} .wm-cov-launch:hover{transform:translateX(1px)}
${s} .wm-cov-launch svg{width:15px;height:15px}
${s} .lv-launch-tx,${s} .lv-min,${s} .lv-coach{display:none}
`

// All styles are scoped to .lv-root so the widget is identical on every page and
// independent of the host. The colour variables are defined here (not inherited
// from the page), light by default, dark under [data-lvtheme="dark"]. The reveal
// console is always dark: it is the product's own surface, shown as-is.
const LV_CSS = `
.lv-root{--ink:#f4f7fb;--panel:#ffffff;--line:#e2e7f0;--tx:#0c1222;--mut:#3f4a5c;--em:#0a9d66;--em2:#0a86cf;--warm:#ff9a4d;--warm2:#f26a43;--chip:rgba(10,20,40,.04);--disp:"Bricolage Grotesque","Figtree",sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace}
.lv-root[data-lvtheme="dark"]{--ink:#070810;--panel:#12141d;--line:rgba(255,255,255,.09);--tx:#eef0f6;--mut:#9aa0b4;--em:#8cf5c4;--em2:#39d3ff;--warm:#ffb35c;--warm2:#ff7a59;--chip:rgba(255,255,255,.05)}
/* RTL: the launcher + coachmark hug the inline-end corner; arrows flip; commands stay LTR. */
.lv-root{text-align:start}
[dir="rtl"] .lv-arrow{transform:scaleX(-1)}
[dir="rtl"] .lv-coach-body{text-align:right}
/* Launcher. The fixed wrapper carries the placement (inline-end corner, clear of
   the device safe area); the pill itself is static inside it so the minimise
   badge can sit on its corner. nowrap + max-width: the pill can never wrap or
   push a horizontal scrollbar. Dock rules (edge-tab form) are in LV_DOCK. */
.lv-launch{position:fixed;inset-inline-end:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;max-width:calc(100vw - 32px)}
.wm-cov-launch{position:relative;display:inline-flex;align-items:center;gap:8px;max-width:100%;white-space:nowrap;background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:999px;padding:12px 18px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 16px 40px -12px rgba(255,122,89,.6);transition:transform .15s}
.wm-cov-launch:hover{transform:translateY(-2px)}
.wm-cov-launch{animation:lv-launch-in .2s ease}
/* Fade only (no transform): a background tab does not advance animations, so a
   stalled first frame must still be in place, just not yet visible. */
@keyframes lv-launch-in{from{opacity:0}to{opacity:1}}
@keyframes lv-tab-in{from{opacity:0}to{opacity:1}}
.wm-cov-launch:focus-visible,.lv-min:focus-visible,.lv-coach-x:focus-visible{outline:3px solid var(--em2);outline-offset:3px}
.wm-cov-launch svg{flex:0 0 auto}
.lv-launch-tx{min-width:0;overflow:hidden;text-overflow:ellipsis}
.lv-min{position:absolute;top:-8px;inset-inline-start:-8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--mut);font:inherit;font-size:15px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;z-index:1}
.lv-min:hover{color:var(--tx)}
/* One-time coachmark: after the banner demo, point the visitor at the launcher so
   they run THEIR own task. Bobs gently; dismissible; opens the validator. */
.lv-coach{position:fixed;inset-inline-end:16px;bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:61;width:min(302px,calc(100vw - 36px));background:var(--panel);border:1px solid var(--line);border-radius:15px;box-shadow:0 26px 64px -18px rgba(0,0,0,.45);padding:4px;animation:lv-coach-in .42s cubic-bezier(.2,.8,.2,1) both,lv-coach-bob 2.6s ease-in-out .6s infinite}
@keyframes lv-coach-in{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
@keyframes lv-coach-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.lv-coach-x{position:absolute;top:-9px;right:-9px;width:23px;height:23px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--mut);font-size:15px;line-height:1;cursor:pointer;z-index:2}
.lv-coach-x:hover{color:var(--tx)}
.lv-coach-body{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:linear-gradient(135deg,rgba(255,154,77,.12),rgba(242,106,67,.06));border:none;border-radius:11px;padding:11px 12px;cursor:pointer;font:inherit}
.lv-coach-ic{flex:0 0 30px;width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08}
.lv-coach-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.lv-coach-tx>b{font-size:13px;color:var(--tx);font-weight:800}
.lv-coach-tx>span{font-size:11.5px;color:var(--mut);line-height:1.4}
.lv-coach-tx span b{color:var(--warm2);font-weight:800}
.lv-coach-go{flex:0 0 auto;color:var(--warm2)}
.lv-coach-arrow{position:absolute;inset-inline-end:30px;bottom:-7px;width:14px;height:14px;background:var(--panel);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg)}
@media(prefers-reduced-motion:reduce){.lv-coach{animation:lv-coach-in .42s ease both}}
/* No floater nudge on mobile - it crowds the small screen (the launcher stays). */
@media(max-width:768px){.lv-coach{display:none}}
.lv-live-dot{width:8px;height:8px;border-radius:50%;background:#e23b3b;box-shadow:0 0 0 0 rgba(226,59,59,.6);animation:lv-pulse 1.5s infinite}
@keyframes lv-pulse{0%{box-shadow:0 0 0 0 rgba(226,59,59,.55)}70%{box-shadow:0 0 0 7px rgba(226,59,59,0)}100%{box-shadow:0 0 0 0 rgba(226,59,59,0)}}
.wm-cov-overlay{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,20,16,.5);backdrop-filter:blur(4px);animation:wm-cov-fade .18s ease}
.wm-cov{position:relative;z-index:71;width:min(760px,calc(100vw - 36px));max-height:min(900px,calc(100vh - 56px));display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 60px 140px -34px rgba(0,0,0,.55);animation:wm-cov-pop .22s cubic-bezier(.2,.8,.2,1)}
@keyframes wm-cov-fade{from{opacity:0}to{opacity:1}}
@keyframes wm-cov-pop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
.wm-cov-head{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(57,211,255,.06),transparent)}
.wm-cov-head-t{display:inline-flex;align-items:center;gap:10px;min-width:0;font-family:var(--disp);font-weight:800;font-size:18px;color:var(--tx)}
.wm-cov-head-t>span:first-of-type{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wm-cov-head-t svg{color:var(--em2);flex:0 0 auto}
.lv-live-pill{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;font-family:"Figtree",system-ui,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:.1em;color:#e23b3b;background:rgba(226,59,59,.1);border:1px solid rgba(226,59,59,.3);border-radius:999px;padding:3px 9px}
.wm-cov-x{background:none;border:none;color:var(--mut);font-size:26px;line-height:1;cursor:pointer;padding:0 6px;flex:0 0 auto}
.wm-cov-x:hover{color:var(--tx)}
.wm-cov-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:22px 24px;min-height:130px}
.wm-cov-intro{color:var(--mut);font-size:14.5px;line-height:1.6;margin:0}
.wm-cov-intro b{color:var(--tx)}
.wm-cov-err{margin-top:12px;color:#c0392b;font-size:14px}
.lv-top-err{margin:0}
/* ===== ASK =============================================================== */
.lv-ask{display:flex;flex-direction:column;gap:13px}
.lv-ask-h{margin:0;font-family:var(--disp);font-weight:800;font-size:25px;letter-spacing:-.015em;line-height:1.15;color:var(--tx)}
.lv-ask-sub{margin:0;color:var(--mut);font-size:14.5px;line-height:1.55;max-width:60ch}
.lv-ask textarea{width:100%;box-sizing:border-box;min-height:98px;resize:vertical;background:var(--ink);border:1px solid var(--line);border-radius:14px;padding:13px 15px;color:var(--tx);font:inherit;font-size:15.5px;line-height:1.5;outline:none;transition:border-color .14s,box-shadow .14s}
.lv-ask textarea::placeholder{color:var(--mut);opacity:.75}
.lv-ask textarea:focus{border-color:var(--em2);box-shadow:0 0 0 3px rgba(57,211,255,.14)}
.lv-chips{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.lv-chips-l{font-size:12px;font-weight:700;color:var(--mut);margin-inline-end:2px;white-space:nowrap}
.lv-chip{border:1px solid var(--line);background:var(--chip);color:var(--tx);border-radius:999px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;max-width:100%;text-align:start;line-height:1.3;transition:border-color .14s,background .14s,transform .14s}
.lv-chip:hover{border-color:var(--em2);background:rgba(57,211,255,.08);transform:translateY(-1px)}
.lv-go{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;border:none;border-radius:13px;padding:15px 18px;font:inherit;font-weight:800;font-size:16px;color:#1a0e08;background:linear-gradient(135deg,var(--warm),var(--warm2));cursor:pointer;box-shadow:0 16px 36px -14px rgba(255,122,89,.6);transition:transform .14s,opacity .14s,box-shadow .14s}
.lv-go:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 20px 40px -14px rgba(255,122,89,.7)}
.lv-go:disabled{opacity:.55;cursor:default}
.lv-go svg{flex:0 0 auto}
/* ===== LEAD ============================================================== */
.lv-form{display:flex;flex-direction:column;gap:15px}
.lv-prep{position:relative;display:flex;align-items:center;gap:9px;flex-wrap:wrap;overflow:hidden;padding:11px 13px 13px;border-radius:12px;border:1px solid rgba(57,211,255,.32);background:rgba(57,211,255,.07);font-size:13.5px;color:var(--tx)}
.lv-prep svg{color:var(--em2);flex:0 0 auto}
.lv-prep b{font-weight:800}
.lv-prep-q{flex-basis:100%;min-width:0;color:var(--mut);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-prep-bar{position:absolute;left:0;bottom:0;height:3px;width:38%;border-radius:2px;background:linear-gradient(90deg,var(--em2),var(--em));animation:lv-prepbar 1.5s ease-in-out infinite}
@keyframes lv-prepbar{0%{transform:translateX(-110%)}100%{transform:translateX(290%)}}
.lv-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.lv-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.lv-field.half{grid-column:span 1}
.lv-field:not(.half){grid-column:1 / -1}
.lv-field label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--tx);letter-spacing:.01em}
.lv-fe{font-size:11px;font-weight:700;color:#e23b3b;background:rgba(226,59,59,.1);border-radius:999px;padding:1px 8px}
.lv-field input{background:var(--ink);border:1px solid var(--line);border-radius:11px;padding:11px 13px;color:var(--tx);font:inherit;font-size:15px;outline:none;transition:border-color .14s,box-shadow .14s}
.lv-field input::placeholder{color:var(--mut);opacity:.7}
.lv-field input:focus{border-color:var(--em2);box-shadow:0 0 0 3px rgba(57,211,255,.14)}
.lv-field.err input{border-color:#e23b3b;box-shadow:0 0 0 3px rgba(226,59,59,.12)}
/* Country <select>: same box as the inputs; native arrow hidden, ours overlaid.
   width:100% + min-width:0 so the longest country name can never widen a half
   column past the grid (a bare <select> sizes to its longest option). */
.lv-sel{position:relative;display:block;min-width:0}
.lv-sel select{appearance:none;-webkit-appearance:none;width:100%;min-width:0;background:var(--ink);border:1px solid var(--line);border-radius:11px;padding:11px 38px 11px 13px;color:var(--tx);font:inherit;font-size:15px;line-height:normal;outline:none;cursor:pointer;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;transition:border-color .14s,box-shadow .14s}
[dir="rtl"] .lv-sel select{padding:11px 13px 11px 38px}
.lv-sel select.lv-ph{color:var(--mut);opacity:.85}
.lv-sel select option{color:#0c1222;background:#fff}
.lv-sel select:focus{border-color:var(--em2);box-shadow:0 0 0 3px rgba(57,211,255,.14)}
.lv-field.err .lv-sel select{border-color:#e23b3b;box-shadow:0 0 0 3px rgba(226,59,59,.12)}
.lv-sel-ic{position:absolute;top:50%;inset-inline-end:12px;transform:translateY(-50%);color:var(--mut);pointer-events:none}
.lv-submit{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;border:none;border-radius:13px;padding:14px 18px;font:inherit;font-weight:800;font-size:15.5px;color:#1a0e08;background:linear-gradient(135deg,var(--warm),var(--warm2));cursor:pointer;transition:transform .14s,box-shadow .14s;box-shadow:0 14px 34px -14px rgba(255,122,89,.55)}
.lv-submit:hover{transform:translateY(-1px)}
.lv-submit:disabled{opacity:.6;cursor:default;transform:none}
.lv-back{align-self:center;background:none;border:none;color:var(--mut);font:inherit;font-size:13px;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:2px 6px;margin-top:-6px}
.lv-back:hover{color:var(--tx)}
.lv-spin{animation:lv-rot 1s linear infinite}
@keyframes lv-rot{to{transform:rotate(360deg)}}
.lv-privacy{display:flex;align-items:flex-start;gap:8px;margin:0;font-size:12px;line-height:1.5;color:var(--mut)}
.lv-privacy svg{flex:0 0 auto;margin-top:2px;color:var(--em)}
@media(max-width:560px){.lv-grid{grid-template-columns:1fr}.lv-field.half{grid-column:1 / -1}}
/* ===== REVEAL: the product console ======================================= */
.lv-reveal{padding:16px 18px 18px}
.lv-console{background:linear-gradient(180deg,#151829 0%,#0c0e18 100%);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:14px 16px 16px;color:#eef0f6;box-shadow:0 34px 80px -34px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.05);min-width:0;overflow:hidden}
.lv-con-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:0 2px 12px;color:#cfd6e6;min-width:0}
.lv-con-head .d{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.lv-con-head .d.r{background:#ff5f57}.lv-con-head .d.y{background:#febc2e}.lv-con-head .d.g{background:#28c840}
.lv-con-head b{margin-inline-start:6px;font-family:var(--disp);font-weight:800;color:#fff;white-space:nowrap}
.lv-con-live{display:inline-flex;align-items:center;gap:5px;margin-inline-start:8px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8cf5c4;white-space:nowrap}
.lv-con-live i{width:7px;height:7px;border-radius:50%;background:#e23b3b;animation:lv-pulse 1.5s infinite}
.lv-con-tag{margin-inline-start:auto;font-size:10px;letter-spacing:.12em;color:#8cf5c4;border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 9px;white-space:nowrap}
.lv-con-goal{font-size:14px;line-height:1.5;color:#f3f5fa;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:11px;padding:9px 12px;overflow-wrap:anywhere}
.lv-k{font-size:10px;letter-spacing:.14em;color:#8cf5c4;font-weight:800;margin-inline-end:8px;vertical-align:1px}
/* planning live: three status lines that land one after another */
.lv-scan{position:relative;margin-top:12px;display:flex;flex-direction:column;gap:10px;padding:13px 13px;border:1px solid rgba(57,211,255,.28);border-radius:13px;background:rgba(57,211,255,.05);overflow:hidden}
.lv-scan-beam{position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(57,211,255,.14),transparent);animation:lv-beam 1.7s linear infinite;pointer-events:none}
.lv-scan-beam.soft{opacity:.7;animation-duration:2.2s}
@keyframes lv-beam{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
.lv-scan-row{position:relative;display:flex;align-items:center;gap:10px;font-size:13.5px;line-height:1.4;color:#7f879b;transition:color .25s}
.lv-scan-row .tick{position:relative;width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(255,255,255,.16);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:transparent;transition:background .25s,border-color .25s,box-shadow .25s}
.lv-scan-row.on{color:#eef0f6}
.lv-scan-row.on .tick{border-color:#39d3ff;box-shadow:0 0 0 4px rgba(57,211,255,.12)}
.lv-scan-row.on .tick:after{content:'';width:8px;height:8px;border-radius:50%;background:#39d3ff;animation:lv-blip .9s ease-in-out infinite}
@keyframes lv-blip{0%,100%{transform:scale(.6);opacity:.5}50%{transform:scale(1);opacity:1}}
.lv-scan-row.done{color:#cfd6e6}
.lv-scan-row.done .tick{background:#0a9d66;border-color:#0a9d66;color:#042}
/* verdict stamp + answer + what it sees */
.lv-verdict{display:flex;align-items:center;gap:12px;margin-top:13px;padding:12px 14px;border-radius:14px;animation:lv-pop .55s cubic-bezier(.2,1.4,.4,1) both}
@keyframes lv-pop{0%{opacity:0;transform:scale(.6)}55%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.lv-vbadge{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
.lv-vlabel{font-family:var(--disp);font-weight:800;font-size:19px;line-height:1.2;letter-spacing:-.01em;min-width:0;overflow-wrap:anywhere}
.lv-verdict.ok{background:rgba(10,157,102,.16);border:1px solid rgba(140,245,196,.38)}
.lv-verdict.ok .lv-vbadge{background:#0a9d66;color:#042;animation:lv-glow 1.7s ease-in-out infinite}
.lv-verdict.ok .lv-vlabel{color:#8cf5c4}
@keyframes lv-glow{0%,100%{box-shadow:0 0 0 5px rgba(10,157,102,.12)}50%{box-shadow:0 0 0 11px rgba(10,157,102,.18)}}
.lv-verdict.mid{background:rgba(255,179,92,.14);border:1px solid rgba(255,179,92,.4)}
.lv-verdict.mid .lv-vbadge{background:#ffb35c;color:#2a1206}.lv-verdict.mid .lv-vlabel{color:#ffcf8a}
.lv-verdict.no{background:rgba(255,99,99,.12);border:1px solid rgba(255,99,99,.35)}
.lv-verdict.no .lv-vbadge{background:#ff6363;color:#fff}.lv-verdict.no .lv-vlabel{color:#ff9b9b}
.lv-verdict.off{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
.lv-verdict.off .lv-vbadge{background:rgba(255,255,255,.08);color:#cfd6e6}.lv-verdict.off .lv-vlabel{color:#cfd6e6;font-size:16px}
.lv-answer{margin:12px 2px 0;font-size:14.5px;line-height:1.65;color:#dfe4f0;overflow-wrap:anywhere;opacity:0;animation:lv-rise .45s ease .2s forwards}
/* Inline code / keys / links come from the shared RichText (inline styles); only
   the focus ring is the console's. Every control in the console shows focus. */
.lv-console a:focus-visible,.lv-console button:focus-visible,.lv-console summary:focus-visible{outline:2px solid #39d3ff;outline-offset:2px;border-radius:6px}
.lv-sees{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px;padding:9px 12px;border:1px solid rgba(57,211,255,.3);background:rgba(57,211,255,.07);border-radius:11px;font-size:13px;line-height:1.5;color:#eef0f6;overflow:hidden;opacity:0;animation:lv-rise .45s ease .32s forwards}
.lv-seek{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#39d3ff}
.lv-seetxt{flex:1;min-width:0;overflow-wrap:anywhere}
@keyframes lv-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* The step cards, "Exactly how" and the locked teaser: live_validate/step_taste.css.js */
${STEP_TASTE_CSS}
/* The step's link-out / copy row (shared StepLink markup, the console's look).
   The terminal block carries its own styles (shared CmdBlock), only its font
   scale variable is set here. Commands and paths stay LTR in RTL locales. */
.lv-console{--wc-fs:1}
.lv-console .wc-open{display:inline-flex;align-items:center;gap:6px;max-width:100%;margin-top:9px;padding:6px 11px 6px 10px;border-radius:9px;color:#39d3ff;background:rgba(57,211,255,.1);border:1px solid rgba(57,211,255,.35);font-size:13px;font-weight:700;text-decoration:none;overflow-wrap:anywhere;transition:background .14s}
.lv-console .wc-open:hover,.lv-console .wc-open:focus-visible{background:rgba(57,211,255,.2);text-decoration:underline;text-underline-offset:3px}
.lv-console .wc-open svg{flex:0 0 auto}
.lv-console .wc-copyrow{display:flex;align-items:center;gap:8px;margin-top:9px;padding:5px 7px 5px 11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:9px;max-width:100%;min-width:0;direction:ltr;text-align:left}
.lv-console .wc-copyrow-t{flex:1;min-width:0;font-family:var(--mono);font-size:12.5px;color:#eef0f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lv-console .wc-copybtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#cfe9ff;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .14s}
.lv-console .wc-copybtn:hover{background:rgba(255,255,255,.12)}
.lv-console .wc-copybtn.done{color:#8cf5c4;border-color:rgba(140,245,196,.4);background:rgba(10,157,102,.18)}
.lv-console pre{max-width:100%}
/* ===== the live-session preview, on the plan ============================= */
/* the one precondition line */
.lv-ready{display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:0 2px;font-size:13px;line-height:1.5;color:#dfe4f0;overflow-wrap:anywhere;opacity:0;animation:lv-rise .45s ease .3s forwards}
.lv-ready>svg{flex:0 0 auto;margin-top:3px;color:#8cf5c4}
.lv-ready>span{min-width:0}
/* the band that names what is playing: simulated, on this plan */
.lv-sim{margin-top:14px;display:flex;flex-direction:column;gap:3px;padding:9px 12px;border-radius:11px;border:1px solid rgba(255,179,92,.38);background:rgba(255,179,92,.08);min-width:0;animation:lv-rise .4s ease both}
.lv-sim-h{display:inline-flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#ffcf8a}
.lv-sim-h i{width:7px;height:7px;border-radius:50%;background:#ffb35c;flex:0 0 auto;animation:lv-pulse-warm 1.5s infinite}
@keyframes lv-pulse-warm{0%{box-shadow:0 0 0 0 rgba(255,179,92,.5)}70%{box-shadow:0 0 0 6px rgba(255,179,92,0)}100%{box-shadow:0 0 0 0 rgba(255,179,92,0)}}
.lv-sim-n{font-size:12px;line-height:1.45;color:#cfd6e6;overflow-wrap:anywhere}
/* step card states: being watched, seen done, corrected */
.lv-step{transition:border-color .3s,background .3s,box-shadow .3s}
.lv-step.cur{border-color:rgba(57,211,255,.6);background:rgba(57,211,255,.06);box-shadow:0 0 0 3px rgba(57,211,255,.13)}
.lv-step.drift{border-color:rgba(255,179,92,.65);background:rgba(255,179,92,.06);box-shadow:0 0 0 3px rgba(255,179,92,.14)}
.lv-step.ok{border-color:rgba(140,245,196,.6);background:rgba(10,157,102,.11)}
.lv-step-l .watch{color:#39d3ff}
.lv-step-l .ok{color:#8cf5c4}
.lv-step-st{display:flex;align-items:flex-start;gap:7px;margin-top:9px;font-size:12.5px;line-height:1.45;color:#8cf5c4;overflow-wrap:anywhere;animation:lv-rise .35s ease both}
.lv-step-st>svg{flex:0 0 auto;margin-top:2px}
.lv-step-st>span{min-width:0}
.lv-step-st b{font-weight:800}
.lv-step-st .m{color:#cfd6e6;font-weight:500}
.lv-step-st.watch{color:#39d3ff;align-items:center}
.lv-step-st.watch i{width:8px;height:8px;border-radius:50%;background:#39d3ff;flex:0 0 auto;animation:lv-blip .9s ease-in-out infinite}
/* the guide's correction bubble, in its own words */
.lv-bubble{position:relative;margin-top:10px;padding:9px 11px 9px 38px;border-radius:12px;border:1px solid rgba(255,179,92,.45);background:rgba(255,179,92,.12);font-size:13px;line-height:1.5;color:#ffe9cf;overflow-wrap:anywhere;animation:lv-bubble-in .4s cubic-bezier(.2,.9,.3,1.2) both}
[dir="rtl"] .lv-bubble{padding:9px 38px 9px 11px}
.lv-bubble .av{position:absolute;inset-inline-start:10px;top:10px;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#ffb35c,#ff7a59);color:#1a0e08;display:inline-flex;align-items:center;justify-content:center}
.lv-bubble .who{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#ffcf8a;margin-bottom:2px}
.lv-bubble .fix{display:flex;align-items:center;gap:5px;margin-top:7px;font-size:11.5px;font-weight:800;color:#8cf5c4;animation:lv-rise .3s ease both}
@keyframes lv-bubble-in{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
/* the end of the plan: seen and confirmed */
.lv-complete{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px 14px;border-radius:14px;background:rgba(10,157,102,.16);border:1px solid rgba(140,245,196,.45);min-width:0;animation:lv-pop .55s cubic-bezier(.2,1.4,.4,1) both}
.lv-complete .lv-vbadge{background:#0a9d66;color:#042;animation:lv-glow 1.7s ease-in-out infinite}
.lv-complete>span:last-child{min-width:0}
.lv-complete b{display:block;font-family:var(--disp);font-weight:800;font-size:16.5px;line-height:1.2;color:#8cf5c4;overflow-wrap:anywhere}
.lv-complete span span{display:block;font-size:12.5px;line-height:1.4;color:#cfd6e6;margin-top:2px;overflow-wrap:anywhere}
/* the three promises, as pills (rows on a phone, so a pill never wraps) */
.lv-promise{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:7px}
.lv-promise li{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:5px 11px 5px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);font-size:12px;font-weight:700;color:#eef0f6;white-space:nowrap}
.lv-promise svg{flex:0 0 auto;color:#ffcf8a}
/* what you get, in one line */
.lv-val{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:#9aa0b4;opacity:0;animation:lv-rise .4s ease forwards;animation-delay:var(--d,0ms)}
.lv-val span{display:inline-flex;align-items:center;gap:6px}
.lv-val svg{color:#8cf5c4;flex:0 0 auto}
/* the ask: your plan, every day */
.lv-cta{margin-top:14px;border-radius:16px;padding:16px;background:linear-gradient(135deg,rgba(255,154,77,.18),rgba(242,106,67,.1));border:1px solid rgba(255,154,77,.42);animation:lv-ctain .5s cubic-bezier(.2,.8,.2,1) both;min-width:0}
@keyframes lv-ctain{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
.lv-cta-h{font-family:var(--disp);font-weight:800;font-size:20px;color:#fff;letter-spacing:-.01em;line-height:1.2}
.lv-cta-sub{margin:5px 0 26px;font-size:13.5px;color:#dfe4f0;line-height:1.5}
.lv-plan{position:relative;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:14px 13px 11px;min-width:0}
.lv-plan-rib{position:absolute;top:-10px;inset-inline-start:12px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#1a0e08;background:linear-gradient(135deg,#ffb35c,#ff7a59);border-radius:999px;padding:3px 9px;white-space:nowrap}
.lv-plan-n{font-family:var(--disp);font-weight:800;font-size:19px;color:#fff}
.lv-plan-p{font-weight:800;font-size:17px;color:#ffcf8a;white-space:nowrap}
.lv-plan-p small{font-weight:600;font-size:12px;color:#9aa0b4;margin-inline-start:1px}
.lv-plan-d{flex-basis:100%;font-size:12.5px;color:#cfd6e6;line-height:1.4}
.lv-cta-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.lv-start{flex:1 1 230px;display:inline-flex;align-items:center;justify-content:center;gap:9px;border:none;border-radius:12px;padding:13px 18px;font:inherit;font-weight:800;font-size:15px;color:#1a0e08;background:linear-gradient(135deg,#ffb35c,#ff7a59);cursor:pointer;box-shadow:0 16px 36px -14px rgba(255,122,89,.7);transition:transform .14s,box-shadow .14s;white-space:nowrap;min-width:0}
.lv-start:hover{transform:translateY(-1px);box-shadow:0 20px 40px -14px rgba(255,122,89,.8)}
.lv-compare{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef0f6;border-radius:12px;padding:13px 16px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;transition:background .14s}
.lv-compare:hover{background:rgba(255,255,255,.06)}
.lv-trust{margin:11px 0 0;font-size:12px;color:#9aa0b4;display:flex;flex-wrap:wrap;gap:6px 14px}
.lv-trust span{display:inline-flex;align-items:center;gap:5px}
.lv-trust svg{color:#8cf5c4}
/* footer bar in the reveal: try another / start */
.wm-cov-input{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 18px;border-top:1px solid var(--line)}
.wm-cov-clear{flex:0 0 auto;height:44px;padding:0 15px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--mut);display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:color .15s,border-color .15s;white-space:nowrap}
.wm-cov-clear:hover:not(:disabled){color:var(--tx);border-color:var(--em2)}
.wm-cov-clear:disabled{opacity:.5;cursor:default}
.lv-again-go{flex:1 1 220px;height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:12px;padding:0 16px;font:inherit;font-weight:800;font-size:14.5px;color:#1a0e08;background:linear-gradient(135deg,var(--warm),var(--warm2));cursor:pointer;white-space:nowrap;min-width:0;transition:transform .14s}
.lv-again-go:hover{transform:translateY(-1px)}
/* fireworks on a covered verdict */
.wm-fw{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;border-radius:18px}
.wm-fw-burst{position:absolute;width:0;height:0}
.wm-fw-burst.b0{left:22%;top:34%}.wm-fw-burst.b1{left:70%;top:26%}.wm-fw-burst.b2{left:46%;top:46%}.wm-fw-burst.b3{left:30%;top:62%}.wm-fw-burst.b4{left:78%;top:56%}.wm-fw-burst.b5{left:56%;top:22%}.wm-fw-burst.b6{left:16%;top:50%}
.wm-fw-burst i{position:absolute;left:0;top:0;width:6px;height:6px;border-radius:50%;background:hsl(calc(var(--a) + 150),92%,56%);box-shadow:0 0 6px currentColor;animation:wm-fw-pop 1.25s cubic-bezier(.15,.7,.3,1) forwards}
.wm-fw-burst.b1 i{animation-delay:.12s}.wm-fw-burst.b2 i{animation-delay:.22s}.wm-fw-burst.b3 i{animation-delay:.34s}.wm-fw-burst.b4 i{animation-delay:.18s}.wm-fw-burst.b5 i{animation-delay:.3s}.wm-fw-burst.b6 i{animation-delay:.4s}
@keyframes wm-fw-pop{0%{transform:rotate(calc(var(--a) * 1deg)) translateX(2px) scale(1);opacity:1}100%{transform:rotate(calc(var(--a) * 1deg)) translateX(64px) scale(.25);opacity:0}}
/* ===== narrow + motion + dock =========================================== */
@media(max-width:560px){
 .wm-cov{width:calc(100vw - 24px);max-height:calc(100vh - 40px)}
 .wm-cov-body{padding:18px}.lv-reveal{padding:12px}.wm-cov-head{padding:14px 16px}.wm-cov-input{padding:12px 14px}
 .lv-ask-h{font-size:21px}.lv-console{padding:12px}.lv-vlabel{font-size:17px}.lv-cta{padding:14px}.lv-cta-h{font-size:18px}
 /* The title must never truncate: smaller type and the LIVE pill keeps only its dot. */
 .wm-cov-head-t{font-size:16px;gap:8px}.lv-live-pill{padding:4px 6px}.lv-live-pill-tx{display:none}
 .lv-start,.lv-compare,.lv-again-go{flex:1 1 100%}
 .lv-promise li{flex:1 1 100%;white-space:normal;border-radius:11px}
}
/* On a phone the starter chips become full-width rows (a chip never wraps). */
@media(max-width:640px){
 .lv-chips-l{flex-basis:100%}
 .lv-chip{flex:1 1 100%;border-radius:11px}
}
/* On a phone a long click path wraps instead of truncating, so the visitor
   reads the whole thing (the full value is also what the button copies). */
@media(max-width:560px){
 .lv-console .wc-copyrow{align-items:flex-start}
 .lv-console .wc-copyrow-t{white-space:normal;overflow-wrap:anywhere;text-overflow:clip;line-height:1.45;padding:4px 0}
}
@media(prefers-reduced-motion:reduce){
 .lv-step,.lv-locked,.lv-val,.lv-answer,.lv-sees,.lv-ready,.lv-sim,.lv-step-st,.lv-bubble,.lv-bubble .fix,.lv-complete{animation:none;opacity:1}
 .lv-scan-beam,.lv-prep-bar{display:none}
 .lv-verdict,.lv-cta{animation:none}
 .lv-verdict.ok .lv-vbadge,.lv-complete .lv-vbadge,.lv-sim-h i,.lv-step-st.watch i{animation:none}
 .lv-step{transition:none}
 .lv-root .wm-cov-launch,.lv-root.lv-docked .wm-cov-launch{animation:none}
}
/* Margin-bearing paragraphs, scoped under .lv-root: a host page's own tag reset
   (e.g. ".page p{margin:0}", specificity 0,1,1) outranks a lone class (0,1,0) and
   silently collapsed the widget's spacing - the "Recommended" ribbon then sat on
   the CTA sub-line. Two classes (0,2,0) win on every host. The ribbon clearance
   lives on the plan card's top margin so it never depends on the paragraph. */
.lv-root .lv-ask-sub{margin:0}
.lv-root .wm-cov-intro{margin:0}
.lv-root .lv-privacy{margin:0}
.lv-root .wm-cov-err{margin-top:12px}
.lv-root .lv-top-err{margin:0}
.lv-root .lv-answer{margin:12px 2px 0}
.lv-root .lv-cta-sub{margin:5px 0 8px}
.lv-root .lv-plan{margin-top:18px}
.lv-root .lv-trust{margin:11px 0 0}
${LV_DOCK('.lv-root.lv-docked')}
@media(max-width:640px){${LV_DOCK('.lv-root')}}
`
