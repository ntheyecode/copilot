// LiveValidate - the public "Validate it live" widget.
//
// Single source of truth for the validator that used to live inside
// WorkMarketing as <CoverageChat>. It is now a self-contained component used on
// EVERY public page (marketing/demo + the WorkCoPilot sign-in page): it injects
// its own styles once and defines its own colour variables on .lv-root, so it
// looks identical wherever it is mounted and does not depend on the host page's
// CSS.
//
// Two stages behind one floating launcher:
//   1. LEAD GATE - before the first question we capture First/Last/Email/Phone/
//      Company, ONCE per browser session (kept in sessionStorage so it is asked
//      only once). The lead is POSTed to /api/work/leads and lands in the
//      superadmin Leads grid with a timestamp + which page it came from.
//   2. LIVE VALIDATION - the visitor describes a real task and our AI validates,
//      live, whether WorkCoPilot can guide it, how, and which plan fits. The
//      scenario is scrubbed (cleanAlways) before it leaves the browser; the
//      lead's own contact details are sent as typed (that is what they chose to
//      share), never scrubbed.
import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, ScanEye, Check, AlertTriangle, TerminalSquare, Building2,
  ShieldCheck, BadgeCheck, ArrowRight, RotateCcw, Copy, Loader2, Play,
  Compass, Wand2, Bug, Award,
} from 'lucide-react'
import { cleanAlways } from '../scrub.js'   // strip PII/PHI from the scenario before it leaves the browser (public form: always on)

// The validator is a lead-capture widget for PUBLIC web visitors only. Inside the
// desktop app or the mobile app the person is already a user, so it must never
// appear. The WorkCoPilot DESKTOP shell exposes window.workDesktop (see
// workcopilot/preload.js - NOT window.refigold, which is the other products'
// shell); the MOBILE app sets a WorkCoPilotApp/<n> user agent (see WorkPage's
// WorkCoPilotApp matcher). One gate here covers EVERY mount (marketing / demo /
// use-cases / login) - SUPREME RULE II, single source, instead of editing each
// call site. Environment-constant, so the early return is stable across renders
// (hook count never changes).
const isInApp = () => {
  try {
    if (typeof window !== 'undefined' && window.workDesktop) return true
    return /WorkCoPilotApp\/\d+/.test((typeof navigator !== 'undefined' && navigator.userAgent) || '')
  } catch { return false }
}

const LEAD_KEY = 'wc_lv_lead_v1'   // once-per-session gate; bump suffix to re-ask
const loadLead = () => { try { const r = sessionStorage.getItem(LEAD_KEY); return r ? JSON.parse(r) : null } catch { return null } }
const saveLead = (l) => { try { sessionStorage.setItem(LEAD_KEY, JSON.stringify(l)) } catch { /* private window: live without it */ } }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Render light markdown emphasis in the answer: **bold** and `code`, so the
// response reads as structured guidance, not flat running text. A backticked
// span is ALWAYS shown in full (as a chip when short, plain when long) so a
// command or code line is never collapsed to a fragment.
function renderRich(text) {
  const out = []
  const s = String(text || '')
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g
  const plain = (t) => t.replace(/[`*]/g, '')
  let last = 0, m, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(plain(s.slice(last, m.index)))
    if (m[2] !== undefined) out.push(<strong key={k++} className="wm-cov-b">{m[2]}</strong>)
    else if (m[3].length > 22 || /[,;]/.test(m[3])) out.push(m[3])   // long/code: render plain, never a giant chip
    else out.push(<code key={k++} className="wm-cov-code">{m[3]}</code>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(plain(s.slice(last)))
  return out
}

const defaultGo = (plan) => { try { window.location.href = `/workcopilot${plan ? `?plan=${plan}` : ''}` } catch { /* noop */ } }

export default function LiveValidate({ go = defaultGo, theme = 'light', source = 'site' }) {
  if (isInApp()) return null   // hide the lead widget inside the desktop/mobile app
  const [open, setOpen] = useState(false)
  const [lead, setLead] = useState(loadLead)          // null until captured this session

  // ---- lead-capture form state -------------------------------------------
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '' })
  const [ferr, setFerr] = useState({})
  const [fbusy, setFbusy] = useState(false)
  const [ftop, setFtop] = useState('')               // server/connection error, shown at top
  const setField = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); if (ferr[k]) setFerr((p) => ({ ...p, [k]: '' })) }
  const firstRef = useRef(null)

  // ---- validator (live check) state --------------------------------------
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const [fire, setFire] = useState(false)
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState(-1)
  const copyCmd = (text, i) => { try { navigator.clipboard.writeText(text || ''); setCopiedCmd(i); setTimeout(() => setCopiedCmd(-1), 1400) } catch { /* clipboard blocked */ } }
  const taRef = useRef(null)
  const [coach, setCoach] = useState(false)   // one-time nudge pointing at the launcher
  const dismissCoach = () => { setCoach(false); try { sessionStorage.setItem('wc_lv_coach_v1', '1') } catch { /* private window */ } }
  const openWidget = () => { setOpen(true); dismissCoach() }

  // The banner demo / any page can open the validator directly (its "run YOUR
  // task" nudge dispatches wc:open-validate). Also raise a one-time coachmark that
  // points at the launcher, so after watching the demo a visitor knows they can
  // run their own scenario live. Shown once per session, after a short delay.
  useEffect(() => {
    const openIt = () => openWidget()
    window.addEventListener('wc:open-validate', openIt)
    let t
    try { if (!sessionStorage.getItem('wc_lv_coach_v1')) t = setTimeout(() => setCoach(true), 6500) } catch { /* private window */ }
    return () => { window.removeEventListener('wc:open-validate', openIt); if (t) clearTimeout(t) }
  }, [])

  // Focus the right first input when the dialog opens / stage changes.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => { (lead ? taRef.current : firstRef.current)?.focus() }, 30)
    return () => clearTimeout(t)
  }, [open, lead])

  // Typewriter reveal of the answer.
  useEffect(() => {
    if (!res || !res.answer) { setTyped(''); setTypingDone(false); return }
    const full = String(res.answer).replace(/\*\*/g, '').replace(/`/g, '')
    setTyped(''); setTypingDone(false)
    let i = 0
    const id = setInterval(() => {
      i += 2
      if (i >= full.length) { setTyped(full); setTypingDone(true); clearInterval(id) }
      else setTyped(full.slice(0, i))
    }, 16)
    return () => clearInterval(id)
  }, [res])

  const clearAll = () => { setQ(''); setRes(null); setErr(''); setTyped(''); setTypingDone(false); setFire(false); setTimeout(() => taRef.current && taRef.current.focus(), 0) }

  const submitLead = async (e) => {
    e && e.preventDefault()
    if (fbusy) return
    const v = {
      firstName: f.firstName.trim(), lastName: f.lastName.trim(),
      email: f.email.trim(), phone: f.phone.trim(), company: f.company.trim(),
    }
    const errs = {}
    if (!v.firstName) errs.firstName = 'Required'
    if (!v.lastName) errs.lastName = 'Required'
    if (!EMAIL_RE.test(v.email)) errs.email = 'Enter a valid email'
    if (v.phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone'
    if (!v.company) errs.company = 'Required'
    if (Object.keys(errs).length) { setFerr(errs); setFtop(''); return }
    setFbusy(true); setFtop('')
    try {
      const r = await fetch('/api/work/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, source }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setFtop(r.status >= 500 ? 'WorkCoPilot is busy, please try again in a moment.' : (data.error || 'Could not save that - please try again.')); return }
      const stored = { ...v, id: data.id || null, at: Date.now() }
      saveLead(stored); setLead(stored)   // gate cleared for this session -> straight to the live check
    } catch { setFtop('Could not reach us. Check your connection and try again.') }
    finally { setFbusy(false) }
  }

  const ask = async () => {
    const question = q.trim()
    if (!question || busy) return
    setBusy(true); setErr(''); setRes(null); setFire(false); setTyped(''); setTypingDone(false)
    try {
      const r = await fetch('/api/work/coverage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanAlways(question), leadId: lead && lead.id ? lead.id : undefined }),
      })
      const data = await r.json()
      if (!r.ok) { setErr(r.status >= 500 ? 'WorkCoPilot is busy, please try again in a moment.' : (data.error || 'Please try again.')) }
      else {
        setRes(data); setQ('')
        if (data.verdict === 'covered') { setFire(true); setTimeout(() => setFire(false), 1800) }
      }
    } catch { setErr('Could not reach the validator. Please try again.') }
    finally { setBusy(false) }
  }
  const onKey = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask() } }

  const verdictMeta = {
    covered: { label: 'Covered', cls: 'ok', Icon: Check },
    partial: { label: 'Partly covered', cls: 'mid', Icon: AlertTriangle },
    no: { label: 'Not a fit', cls: 'no', Icon: AlertTriangle },
    offtopic: { label: 'Describe a task', cls: 'off', Icon: Sparkles },
    about: { label: 'How WorkCoPilot helps', cls: 'ok', Icon: Sparkles },
  }
  const vm = res ? verdictMeta[res.verdict] : null
  const VIcon = vm ? vm.Icon : null

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

  return (
    <div className="lv-root" data-lvtheme={theme === 'dark' ? 'dark' : 'light'}>
      <style>{LV_CSS}</style>
      {!open && coach && (
        <div className="lv-coach" role="note">
          <button className="lv-coach-x" onClick={dismissCoach} aria-label="Dismiss">&times;</button>
          <button type="button" className="lv-coach-body" onClick={openWidget}>
            <span className="lv-coach-ic"><Sparkles size={15} /></span>
            <span className="lv-coach-tx"><b>Is WorkCoPilot right for you?</b><span>Test your own scenario <b>live</b> and see exactly how it would guide you.</span></span>
            <ArrowRight size={16} className="lv-coach-go" />
          </button>
          <span className="lv-coach-arrow" aria-hidden />
        </div>
      )}
      {!open && (
        <button className="wm-cov-launch" onClick={openWidget} aria-label="Validate your scenario live">
          <span className="lv-live-dot" aria-hidden /> <Sparkles size={16} /> Validate it live
        </button>
      )}
      {open && (
        <div className="wm-cov-overlay" onClick={() => setOpen(false)}>
          <div className="wm-cov" role="dialog" aria-modal="true" aria-label="Validate it live" onClick={(e) => e.stopPropagation()}>
            {fire && (
              <div className="wm-fw" aria-hidden>
                {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`wm-fw-burst b${i}`}>{Array.from({ length: 12 }).map((__, j) => <i key={j} style={{ '--a': j * 30 }} />)}</span>)}
              </div>
            )}
            <div className="wm-cov-head">
              <div className="wm-cov-head-t">
                <ScanEye size={18} />
                <span>Validate it live</span>
                <span className="lv-live-pill"><span className="lv-live-dot" /> LIVE</span>
              </div>
              <button className="wm-cov-x" onClick={() => setOpen(false)} aria-label="Close">&times;</button>
            </div>

            {/* STAGE 1 - lead gate (once per session) */}
            {!lead && (
              <form className="wm-cov-body lv-form" onSubmit={submitLead}>
                {ftop && <p className="wm-cov-err lv-top-err">{ftop}</p>}
                <p className="wm-cov-intro">Tell us who you are, then put in your real task. We check it <b>live</b> and tell you whether WorkCoPilot can guide you through it, step by step.</p>
                <div className="lv-grid">
                  {field('firstName', 'First name', { placeholder: 'Jordan', half: true, inputRef: firstRef, autoComplete: 'given-name' })}
                  {field('lastName', 'Last name', { placeholder: 'Rivera', half: true, autoComplete: 'family-name' })}
                  {field('email', 'Work email', { type: 'email', placeholder: 'jordan@company.com', autoComplete: 'email' })}
                  {field('phone', 'Phone', { type: 'tel', placeholder: '+1 555 010 0100', half: true, autoComplete: 'tel' })}
                  {field('company', 'Company', { placeholder: 'Company name', half: true, autoComplete: 'organization' })}
                </div>
                <button type="submit" className="lv-submit" disabled={fbusy}>
                  {fbusy ? <><Loader2 size={16} className="lv-spin" /> Saving…</> : <>Start the live check <ArrowRight size={16} /></>}
                </button>
                <p className="lv-privacy"><ShieldCheck size={13} /> We use this only to follow up about WorkCoPilot. Your task text is scrubbed of sensitive data on your device before anything is sent.</p>
              </form>
            )}

            {/* STAGE 2 - live validation */}
            {lead && (
              <>
                <div className="wm-cov-body">
                  {!res && !busy && <p className="wm-cov-intro">Put in your real task or scenario, or ask <b>how WorkCoPilot supports your apps</b>. We answer it <b>live</b> and tell you whether it can guide you through it, how, and which plan fits.</p>}
                  {busy && <div className="wm-cov-think"><span /><span /><span /> Validating it live…</div>}
                  {res && (
                    <div className="wm-cov-ans" key={res.answer}>
                      {vm && (
                        <div className={`wm-cov-verdict ${vm.cls}`}>
                          <span className="wm-cov-vbadge">{VIcon && <VIcon size={22} />}</span>
                          <span className="wm-cov-vlabel">{vm.label}</span>
                        </div>
                      )}
                      <p className="wm-cov-text">{typingDone ? renderRich(res.answer) : <>{typed}<span className="wm-cov-caret" /></>}</p>
                      {res.preview && res.preview.length > 0 && (() => {
                        const preview = res.preview
                        const shown = preview.length
                        // The whole-task roadmap; fall back to the preview titles if the
                        // model did not return a longer one. The first `shown` are
                        // expanded; the rest are upcoming guided steps.
                        const roadmap = (Array.isArray(res.roadmap) && res.roadmap.length >= shown) ? res.roadmap : preview.map((p) => p.do)
                        const total = roadmap.length
                        const remaining = total - shown
                        return (
                          <div className={`wm-cov-flow${typingDone ? ' show' : ''}`}>
                            {res.sees && (
                              <div className="wm-cov-sees">
                                <span className="wm-cov-scan" aria-hidden />
                                <span className="wm-cov-seek"><ScanEye size={13} /> I can see</span>
                                <span className="wm-cov-seetxt">{res.sees}</span>
                              </div>
                            )}
                            <div className="wm-cov-flow-h"><TerminalSquare size={14} /> Your step-by-step plan{total ? <span className="wm-cov-flow-sub"> · {total} steps{remaining > 0 ? `, first ${shown} in full` : ''}</span> : null}</div>
                            <ol className="wm-cov-steps">
                              {roadmap.map((title, i) => {
                                if (i >= shown) return (
                                  <li key={i} className="next">
                                    <span className="n play"><Play size={10} /></span>
                                    <div className="s"><div className="do up">{renderRich(title)}</div></div>
                                  </li>
                                )
                                const p = preview[i]
                                return (
                                  <li key={i}>
                                    <span className="n">{i + 1}</span>
                                    <div className="s">
                                      <div className="do">{renderRich(p.do)}</div>
                                      {p.cmd && (
                                        <div className="cmd">
                                          <code>{p.cmd}</code>
                                          <button onClick={() => copyCmd(p.cmd, i)} title="Copy" aria-label="Copy command">{copiedCmd === i ? <Check size={13} /> : <Copy size={13} />}</button>
                                        </div>
                                      )}
                                      {p.how && p.how.length > 0 && (
                                        <details className="wm-cov-how">
                                          <summary>Show how</summary>
                                          <ol>{p.how.map((h, k) => <li key={k}>{renderRich(h)}</li>)}</ol>
                                        </details>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ol>
                            {remaining > 0 && <div className="wm-cov-more"><Play size={12} /> {remaining} more guided step{remaining === 1 ? '' : 's'} in a real session, each the same depth</div>}
                          </div>
                        )
                      })()}
                      {res.points && res.points.length > 0 && (
                        <ul className={`wm-cov-points${typingDone ? ' show' : ''}`}>
                          {res.points.map((pt, i) => <li key={i}><Check size={15} /><span>{renderRich(pt)}</span></li>)}
                        </ul>
                      )}
                      {(res.verdict === 'covered' || res.verdict === 'partial' || res.verdict === 'about') && (
                        <div className={`wm-cov-loop slim${typingDone ? ' show' : ''}`}>
                          <div className="wm-cov-loop-h"><span className="lv-live-dot" aria-hidden /> In a live session it does all of this, on your screen</div>
                          <div className="wm-cov-loop-grid">
                            <div className="wm-cov-cap watch"><span className="ic"><ScanEye size={16} /></span><b>Watches</b></div>
                            <div className="wm-cov-cap arrow" aria-hidden><ArrowRight size={14} /></div>
                            <div className="wm-cov-cap guide"><span className="ic"><Compass size={16} /></span><b>Navigates</b></div>
                            <div className="wm-cov-cap arrow" aria-hidden><ArrowRight size={14} /></div>
                            <div className="wm-cov-cap correct"><span className="ic"><Wand2 size={16} /></span><b>Corrects</b></div>
                            <div className="wm-cov-cap arrow" aria-hidden><ArrowRight size={14} /></div>
                            <div className="wm-cov-cap fix"><span className="ic"><Bug size={16} /></span><b>Fixes</b></div>
                          </div>
                        </div>
                      )}
                      {res.verdict !== 'offtopic' && (
                        <div className={`wm-cov-trust${typingDone ? ' show' : ''}`}>
                          <div className="wm-cov-trust-row">
                            <div className="wm-cov-pillar"><span className="ic qlt"><Award size={16} /></span><div><b>Quality-first</b><p>Grounded in your real screen and current best practice - no filler.</p></div></div>
                            <div className="wm-cov-pillar"><span className="ic ent"><Building2 size={16} /></span><div><b>Enterprise-grade</b><p>Admin, SSO, team seats, locked policy, audit trail.</p></div></div>
                            <div className="wm-cov-pillar"><span className="ic sec"><ShieldCheck size={16} /></span><div><b>Security-first</b><p>Secrets stripped on your device, least sent, read-only.</p></div></div>
                            <div className="wm-cov-pillar"><span className="ic cmp"><BadgeCheck size={16} /></span><div><b>Compliant</b><p>Controls and audit evidence for your frameworks - never a certification claim.</p></div></div>
                          </div>
                          <div className="wm-cov-chips">
                            {['GDPR', 'HIPAA', 'PCI-DSS', 'SOC 2', 'ISO 27001', 'CCPA', 'FedRAMP', 'NIST 800-53', 'HITRUST'].map((c) => <span key={c}>{c}</span>)}
                          </div>
                        </div>
                      )}
                      <div className={`wm-cov-foot${typingDone ? ' show' : ''}`}>
                        {res.plan && <div className="wm-cov-plan">Best fit: <b>{res.plan}</b>{res.product && res.product !== 'WorkCoPilot' ? ` (see ${res.product})` : ''}</div>}
                        {res.verdict !== 'offtopic' && (
                          <button className="lv-cta" onClick={() => go(res.plan ? res.plan.toLowerCase() : '')}>Get started <ArrowRight size={14} /></button>
                        )}
                      </div>
                    </div>
                  )}
                  {err && <p className="wm-cov-err">{err}</p>}
                </div>
                <div className="wm-cov-input">
                  <textarea ref={taRef} rows={2} value={q} maxLength={1200} placeholder="e.g. Set up a VPC on AWS and lock it down, reconcile last month's books in Excel, or: can it guide my in-house apps?"
                    onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
                  <div className="wm-cov-ibtns">
                    {(q || res) && <button className="wm-cov-clear" onClick={clearAll} title="Clear and ask a new question" aria-label="Clear"><RotateCcw size={15} /> Clear</button>}
                    <button className="wm-cov-send" onClick={ask} disabled={busy || !q.trim()} aria-label="Validate">
                      {busy ? <span className="wm-cov-sdots"><i /><i /><i /></span> : <ArrowRight size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// All styles are scoped to .lv-root so the widget is identical on every page and
// independent of the host. The colour variables are defined here (not inherited
// from the page), light by default, dark under [data-lvtheme="dark"]. The
// .wm-cov*/.wm-fw* rules are the validator's original styles, moved here so
// there is exactly ONE copy (they were deleted from WorkMarketing).
const LV_CSS = `
.lv-root{--ink:#f4f7fb;--panel:#ffffff;--line:#e2e7f0;--tx:#0c1222;--mut:#3f4a5c;--em:#0a9d66;--em2:#0a86cf;--warm:#ff9a4d;--warm2:#f26a43;--chip:rgba(10,20,40,.04)}
.lv-root[data-lvtheme="dark"]{--ink:#070810;--panel:#12141d;--line:rgba(255,255,255,.09);--tx:#eef0f6;--mut:#9aa0b4;--em:#8cf5c4;--em2:#39d3ff;--warm:#ffb35c;--warm2:#ff7a59;--chip:rgba(255,255,255,.05)}
.wm-cov-launch{position:fixed;right:20px;bottom:20px;z-index:60;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:999px;padding:12px 18px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 16px 40px -12px rgba(255,122,89,.6);transition:transform .15s}
.wm-cov-launch:hover{transform:translateY(-2px)}
/* One-time coachmark: after the banner demo, point the visitor at the launcher so
   they run THEIR own task. Bobs gently; dismissible; opens the validator. */
.lv-coach{position:fixed;right:20px;bottom:78px;z-index:61;width:min(302px,calc(100vw - 36px));background:var(--panel);border:1px solid var(--line);border-radius:15px;box-shadow:0 26px 64px -18px rgba(0,0,0,.45);padding:4px;animation:lv-coach-in .42s cubic-bezier(.2,.8,.2,1) both,lv-coach-bob 2.6s ease-in-out .6s infinite}
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
.lv-coach-arrow{position:absolute;right:30px;bottom:-7px;width:14px;height:14px;background:var(--panel);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg)}
@media(prefers-reduced-motion:reduce){.lv-coach{animation:lv-coach-in .42s ease both}}
/* No floater nudge on mobile - it crowds the small screen (the launcher stays). */
@media(max-width:768px){.lv-coach{display:none}}
.lv-live-dot{width:8px;height:8px;border-radius:50%;background:#e23b3b;box-shadow:0 0 0 0 rgba(226,59,59,.6);animation:lv-pulse 1.5s infinite}
@keyframes lv-pulse{0%{box-shadow:0 0 0 0 rgba(226,59,59,.55)}70%{box-shadow:0 0 0 7px rgba(226,59,59,0)}100%{box-shadow:0 0 0 0 rgba(226,59,59,0)}}
.wm-cov-overlay{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,20,16,.5);backdrop-filter:blur(4px);animation:wm-cov-fade .18s ease}
.wm-cov{z-index:71;width:min(720px,calc(100vw - 36px));max-height:min(860px,calc(100vh - 56px));display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 60px 140px -34px rgba(0,0,0,.55);animation:wm-cov-pop .22s cubic-bezier(.2,.8,.2,1)}
@keyframes wm-cov-fade{from{opacity:0}to{opacity:1}}
@keyframes wm-cov-pop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
.wm-cov-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(57,211,255,.06),transparent)}
.wm-cov-head-t{display:inline-flex;align-items:center;gap:10px;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:19px;color:var(--tx)}
.wm-cov-head-t svg{color:var(--em2)}
.lv-live-pill{display:inline-flex;align-items:center;gap:6px;font-family:"Figtree",system-ui,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:.1em;color:#e23b3b;background:rgba(226,59,59,.1);border:1px solid rgba(226,59,59,.3);border-radius:999px;padding:3px 9px}
.wm-cov-x{background:none;border:none;color:var(--mut);font-size:26px;line-height:1;cursor:pointer;padding:0 6px}
.wm-cov-x:hover{color:var(--tx)}
.wm-cov-body{flex:1;overflow-y:auto;padding:22px 24px;min-height:130px}
.wm-cov-intro{color:var(--mut);font-size:15px;line-height:1.6;margin:0}
.wm-cov-intro b{color:var(--tx)}
.wm-cov-think{display:flex;align-items:center;gap:10px;color:var(--mut);font-size:14px;font-weight:500}
.wm-cov-think span{width:8px;height:8px;border-radius:50%;background:var(--em2);animation:wm-cov-bounce 1s infinite}
.wm-cov-think span:nth-child(2){animation-delay:.15s}.wm-cov-think span:nth-child(3){animation-delay:.3s}
@keyframes wm-cov-bounce{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
/* lead-capture form */
.lv-form{display:flex;flex-direction:column;gap:16px}
.lv-top-err{margin:0}
.lv-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.lv-field{display:flex;flex-direction:column;gap:6px}
.lv-field.half{grid-column:span 1}
.lv-field:not(.half){grid-column:1 / -1}
.lv-field label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--tx);letter-spacing:.01em}
.lv-fe{font-size:11px;font-weight:700;color:#e23b3b;background:rgba(226,59,59,.1);border-radius:999px;padding:1px 8px}
.lv-field input{background:var(--ink);border:1px solid var(--line);border-radius:11px;padding:11px 13px;color:var(--tx);font:inherit;font-size:15px;outline:none;transition:border-color .14s,box-shadow .14s}
.lv-field input::placeholder{color:var(--mut);opacity:.7}
.lv-field input:focus{border-color:var(--em2);box-shadow:0 0 0 3px rgba(57,211,255,.14)}
.lv-field.err input{border-color:#e23b3b;box-shadow:0 0 0 3px rgba(226,59,59,.12)}
.lv-submit{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;border:none;border-radius:13px;padding:14px 18px;font:inherit;font-weight:800;font-size:15.5px;color:#1a0e08;background:linear-gradient(135deg,var(--warm),var(--warm2));cursor:pointer;transition:transform .14s,box-shadow .14s;box-shadow:0 14px 34px -14px rgba(255,122,89,.55)}
.lv-submit:hover{transform:translateY(-1px)}
.lv-submit:disabled{opacity:.6;cursor:default;transform:none}
.lv-spin{animation:lv-rot 1s linear infinite}
@keyframes lv-rot{to{transform:rotate(360deg)}}
.lv-privacy{display:flex;align-items:flex-start;gap:8px;margin:0;font-size:12px;line-height:1.5;color:var(--mut)}
.lv-privacy svg{flex:0 0 auto;margin-top:2px;color:var(--em)}
@media(max-width:560px){.lv-grid{grid-template-columns:1fr}.lv-field.half{grid-column:1 / -1}}
.wm-cov-ans{border:1px solid var(--line);border-radius:16px;padding:18px 20px;background:linear-gradient(180deg,rgba(140,245,196,.08),transparent);animation:wm-cov-rise .3s cubic-bezier(.2,.8,.2,1)}
@keyframes wm-cov-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.wm-cov-verdict{display:inline-flex;align-items:center;gap:13px;margin-bottom:16px;animation:wm-cov-vpop .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes wm-cov-vpop{0%{opacity:0;transform:scale(.55)}55%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
.wm-cov-vbadge{width:44px;height:44px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.wm-cov-vlabel{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:27px;letter-spacing:-.01em;line-height:1}
.wm-cov-verdict.ok .wm-cov-vbadge{background:rgba(10,157,102,.18);color:#0a9d66;animation:wm-cov-glow 1.7s ease-in-out infinite}
.wm-cov-verdict.ok .wm-cov-vlabel{color:#0a9d66}
@keyframes wm-cov-glow{0%,100%{box-shadow:0 0 0 5px rgba(10,157,102,.09)}50%{box-shadow:0 0 0 11px rgba(10,157,102,.14)}}
.wm-cov-verdict.mid .wm-cov-vbadge{background:rgba(255,179,92,.22);color:#b5790f}.wm-cov-verdict.mid .wm-cov-vlabel{color:#b5790f}
.wm-cov-verdict.no .wm-cov-vbadge{background:rgba(255,99,99,.18);color:#c0392b}.wm-cov-verdict.no .wm-cov-vlabel{color:#c0392b}
.wm-cov-verdict.off .wm-cov-vbadge{background:rgba(120,130,150,.16);color:var(--mut)}.wm-cov-verdict.off .wm-cov-vlabel{color:var(--mut);font-size:21px}
.wm-cov-text{color:var(--tx);font-size:16px;line-height:1.7;margin:0;min-height:1.2em;overflow-wrap:anywhere}
.wm-cov-b{font-weight:800;color:var(--tx);background:linear-gradient(transparent 62%,rgba(140,245,196,.45) 0);padding:0 1px}
.wm-cov-code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.86em;background:rgba(57,211,255,.12);color:var(--em2);border:1px solid rgba(57,211,255,.28);border-radius:6px;padding:1px 6px;white-space:normal;overflow-wrap:anywhere}
.wm-cov-caret{display:inline-block;width:2px;height:1.05em;background:var(--em2);margin-left:2px;vertical-align:-2px;animation:wm-cov-blink .8s step-end infinite}
@keyframes wm-cov-blink{50%{opacity:0}}
.wm-cov-points{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:11px;opacity:0;transform:translateY(6px);transition:opacity .4s ease .08s,transform .4s ease .08s}
.wm-cov-points.show{opacity:1;transform:none}
.wm-cov-points li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.55;color:var(--tx)}
.wm-cov-points li svg{color:var(--em);flex-shrink:0;margin-top:3px}
/* LIVE LOOP showcase - what the real product does: watch -> navigate -> correct -> fix */
.wm-cov-loop{margin-top:16px;border:1px solid rgba(57,211,255,.3);border-radius:16px;padding:16px;background:linear-gradient(145deg,rgba(57,211,255,.1),rgba(140,245,196,.07) 55%,rgba(255,179,92,.08));opacity:0;transform:translateY(8px);transition:opacity .45s ease .1s,transform .45s ease .1s}
.wm-cov-loop.show{opacity:1;transform:none}
.wm-cov-loop-h{display:inline-flex;align-items:center;gap:8px;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:14px;color:var(--tx);margin-bottom:14px}
.wm-cov-loop-grid{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;align-items:stretch;gap:9px}
.wm-cov-cap{display:flex;flex-direction:column;gap:5px;padding:12px 11px;border-radius:12px;background:var(--panel);border:1px solid var(--line);min-width:0}
.wm-cov-cap .ic{width:34px;height:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#042;margin-bottom:3px}
.wm-cov-cap b{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-size:14.5px;font-weight:800;color:var(--tx);letter-spacing:-.01em}
.wm-cov-cap p{margin:0;font-size:12px;line-height:1.45;color:var(--mut)}
.wm-cov-cap.watch .ic{background:linear-gradient(135deg,#39d3ff,#0a86cf)}
.wm-cov-cap.guide .ic{background:linear-gradient(135deg,#8cf5c4,#0a9d66)}
.wm-cov-cap.correct .ic{background:linear-gradient(135deg,#b98cff,#7a4bd8);color:#fff}
.wm-cov-cap.fix .ic{background:linear-gradient(135deg,#ffb35c,#f26a43);color:#2a1206}
.wm-cov-cap.watch{box-shadow:0 0 0 0 rgba(57,211,255,.4);animation:wm-cov-cappulse 3.2s ease-in-out infinite}
.wm-cov-cap.guide{animation:wm-cov-cappulse 3.2s ease-in-out .8s infinite}
.wm-cov-cap.correct{animation:wm-cov-cappulse 3.2s ease-in-out 1.6s infinite}
.wm-cov-cap.fix{animation:wm-cov-cappulse 3.2s ease-in-out 2.4s infinite}
@keyframes wm-cov-cappulse{0%,100%{box-shadow:0 0 0 0 rgba(57,211,255,0)}30%{box-shadow:0 10px 26px -14px rgba(57,211,255,.6)}}
.wm-cov-cap.arrow{flex-direction:row;align-items:center;justify-content:center;background:none;border:none;padding:0;color:var(--em2);animation:wm-cov-arrflow 2.4s ease-in-out infinite}
@keyframes wm-cov-arrflow{0%,100%{opacity:.35;transform:translateX(-2px)}50%{opacity:1;transform:translateX(2px)}}
.wm-cov-loop-foot{display:flex;align-items:flex-start;gap:8px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px;line-height:1.55;color:var(--mut)}
.wm-cov-loop-foot svg{flex:0 0 auto;margin-top:1px;color:var(--em2)}
.wm-cov-loop-foot b{color:var(--tx)}
@media(max-width:620px){.wm-cov-loop-grid{grid-template-columns:1fr 1fr;gap:9px}.wm-cov-cap.arrow{display:none}}
.wm-cov-flow{margin-top:16px;border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:rgba(57,211,255,.05);opacity:0;transform:translateY(6px);transition:opacity .4s ease .12s,transform .4s ease .12s}
.wm-cov-flow.show{opacity:1;transform:none}
.wm-cov-flow-h{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--em2);margin-bottom:12px}
.wm-cov-flow-sub{color:var(--mut);font-weight:700;letter-spacing:.02em;text-transform:none}
/* "I can see" - the product perceiving. Highlighted + scanning to match the
   demo card, with a one-time glow as it appears (quality: consistent language). */
.wm-cov-sees{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding:10px 12px;border:1px solid rgba(57,211,255,.32);background:rgba(57,211,255,.07);border-radius:11px;font-size:13px;line-height:1.5;color:var(--tx);overflow:hidden;animation:wm-cov-seeglow 1.6s ease-out .05s both}
@keyframes wm-cov-seeglow{0%{box-shadow:0 0 0 0 rgba(57,211,255,0)}26%{box-shadow:0 0 0 4px rgba(57,211,255,.2),0 12px 30px -12px rgba(57,211,255,.5)}100%{box-shadow:0 0 0 0 rgba(57,211,255,0)}}
.wm-cov-scan{position:absolute;top:0;bottom:0;left:0;width:38%;background:linear-gradient(90deg,transparent,rgba(57,211,255,.16),transparent);animation:wm-cov-scanx 2s linear infinite;pointer-events:none}
@keyframes wm-cov-scanx{from{transform:translateX(-120%)}to{transform:translateX(330%)}}
.wm-cov-seek{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--em2)}
.wm-cov-seek svg{color:var(--em2);flex-shrink:0}
.wm-cov-seetxt{flex:1;min-width:0;color:var(--tx)}
@media(prefers-reduced-motion:reduce){.wm-cov-sees{animation:none}.wm-cov-scan{display:none}}
.wm-cov-steps li.next{opacity:.85}
.wm-cov-steps .n.play{background:rgba(255,255,255,.06);color:var(--mut);border:1px solid var(--line)}
.wm-cov-steps .do.up{color:var(--mut);font-size:14px;padding-top:2px}
.wm-cov-more{display:flex;align-items:center;gap:8px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px;color:var(--mut)}
.wm-cov-more svg{color:var(--em2);flex-shrink:0}
.wm-cov-live{display:flex;gap:11px;align-items:flex-start;margin-bottom:14px;padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(57,211,255,.14),rgba(140,245,196,.11));border:1px solid rgba(57,211,255,.32)}
.wm-cov-live-ic{flex:0 0 32px;width:32px;height:32px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--em),var(--em2));color:#042}
.wm-cov-live div{font-size:13.5px;line-height:1.55;color:var(--tx)}
.wm-cov-live b{color:var(--tx);font-weight:700}
.wm-cov-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;counter-reset:cv}
.wm-cov-steps li{display:flex;gap:11px;align-items:flex-start}
.wm-cov-steps .n{flex:0 0 22px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#042;background:linear-gradient(135deg,var(--em),var(--em2));margin-top:1px}
.wm-cov-steps .s{flex:1;min-width:0}
.wm-cov-steps .do{font-size:14.5px;line-height:1.5;color:var(--tx)}
.wm-cov-steps .cmd{margin-top:7px;display:flex;align-items:center;gap:8px;background:#0b1020;border:1px solid rgba(57,211,255,.22);border-radius:9px;padding:8px 10px}
.wm-cov-steps .cmd code{flex:1;min-width:0;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;color:#8ff0c4;white-space:pre-wrap;overflow-wrap:anywhere}
.wm-cov-steps .cmd button{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:28px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#cfe9ff;cursor:pointer;transition:background .14s}
.wm-cov-steps .cmd button:hover{background:rgba(255,255,255,.12)}
.wm-cov-how{margin-top:9px}
.wm-cov-how summary{cursor:pointer;font-size:12.5px;font-weight:700;color:var(--em2);list-style:none;display:inline-flex;align-items:center;gap:6px;user-select:none}
.wm-cov-how summary::-webkit-details-marker{display:none}
.wm-cov-how summary:before{content:'▸';display:inline-block;transition:transform .15s}
.wm-cov-how[open] summary:before{transform:rotate(90deg)}
.wm-cov-how ol{margin:9px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:7px}
.wm-cov-how li{font-size:13px;line-height:1.55;color:var(--mut);overflow-wrap:anywhere}
.wm-cov-trust{margin-top:16px;border:1px solid var(--line);border-radius:14px;padding:15px 16px;background:linear-gradient(180deg,rgba(140,245,196,.06),transparent);opacity:0;transform:translateY(6px);transition:opacity .4s ease .16s,transform .4s ease .16s}
.wm-cov-trust.show{opacity:1;transform:none}
.wm-cov-trust-row{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.wm-cov-pillar{display:flex;gap:10px;align-items:flex-start}
.wm-cov-pillar .ic{flex:0 0 30px;width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center}
.wm-cov-pillar .ic.qlt{background:rgba(255,179,92,.18);color:#e08a2a}
.wm-cov-pillar .ic.ent{background:rgba(185,140,255,.16);color:#b98cff}
.wm-cov-pillar .ic.sec{background:rgba(57,211,255,.14);color:var(--em2)}
.wm-cov-pillar .ic.cmp{background:rgba(10,157,102,.16);color:var(--em)}
.wm-cov-pillar b{display:block;font-size:13.5px;color:var(--tx);margin-bottom:3px}
.wm-cov-pillar p{margin:0;font-size:12.5px;line-height:1.5;color:var(--mut)}
.wm-cov-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px;padding-top:13px;border-top:1px solid var(--line)}
.wm-cov-chips span{font-size:11.5px;font-weight:700;letter-spacing:.02em;color:var(--tx);background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:4px 11px}
@media(max-width:620px){.wm-cov-trust-row{grid-template-columns:1fr;gap:12px}}
.wm-cov-foot{opacity:0;transform:translateY(6px);transition:opacity .4s ease,transform .4s ease;pointer-events:none}
.wm-cov-foot.show{opacity:1;transform:none;pointer-events:auto}
.wm-cov-plan{margin-top:14px;font-size:14px;color:var(--mut)}.wm-cov-plan b{color:var(--em2)}
.lv-cta{margin-top:14px;display:inline-flex;align-items:center;gap:8px;border:none;border-radius:12px;padding:12px 18px;font:inherit;font-weight:800;font-size:14.5px;color:#1a0e08;background:linear-gradient(135deg,var(--warm),var(--warm2));cursor:pointer;transition:transform .14s}
.lv-cta:hover{transform:translateY(-1px)}
.wm-cov-err{margin-top:12px;color:#c0392b;font-size:14px}
.wm-cov-input{display:flex;gap:10px;align-items:flex-end;padding:16px 20px;border-top:1px solid var(--line)}
.wm-cov-input textarea{flex:1;resize:none;background:var(--ink);border:1px solid var(--line);border-radius:13px;padding:12px 14px;color:var(--tx);font:inherit;font-size:15px;line-height:1.5;outline:none}
.wm-cov-input textarea:focus{border-color:var(--em2);box-shadow:0 0 0 3px rgba(57,211,255,.12)}
.wm-cov-ibtns{display:flex;align-items:center;gap:8px}
.wm-cov-clear{flex:0 0 auto;height:46px;padding:0 15px;border-radius:13px;border:1px solid var(--line);background:transparent;color:var(--mut);display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:color .15s,border-color .15s}
.wm-cov-clear:hover{color:var(--tx);border-color:var(--em2)}
.wm-cov-send{flex:0 0 auto;width:46px;height:46px;border-radius:13px;border:none;background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.wm-cov-send:disabled{opacity:.5;cursor:default}
.wm-cov-sdots{display:inline-flex;gap:3px}.wm-cov-sdots i{width:5px;height:5px;border-radius:50%;background:#1a0e08;animation:wm-cov-bounce 1s infinite}.wm-cov-sdots i:nth-child(2){animation-delay:.15s}.wm-cov-sdots i:nth-child(3){animation-delay:.3s}
@media(max-width:560px){.wm-cov-launch{right:12px;bottom:12px}.wm-cov{width:calc(100vw - 24px);max-height:calc(100vh - 48px)}.wm-cov-body{padding:18px}.wm-cov-head{padding:15px 18px}.wm-cov-input{padding:14px 16px}}
.wm-fw{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;border-radius:18px}
.wm-fw-burst{position:absolute;width:0;height:0}
.wm-fw-burst.b0{left:22%;top:34%}.wm-fw-burst.b1{left:70%;top:26%}.wm-fw-burst.b2{left:46%;top:46%}.wm-fw-burst.b3{left:30%;top:62%}.wm-fw-burst.b4{left:78%;top:56%}.wm-fw-burst.b5{left:56%;top:22%}.wm-fw-burst.b6{left:16%;top:50%}
.wm-fw-burst i{position:absolute;left:0;top:0;width:6px;height:6px;border-radius:50%;background:hsl(calc(var(--a) + 150),92%,56%);box-shadow:0 0 6px currentColor;animation:wm-fw-pop 1.25s cubic-bezier(.15,.7,.3,1) forwards}
.wm-fw-burst.b1 i{animation-delay:.12s}.wm-fw-burst.b2 i{animation-delay:.22s}.wm-fw-burst.b3 i{animation-delay:.34s}.wm-fw-burst.b4 i{animation-delay:.18s}.wm-fw-burst.b5 i{animation-delay:.3s}.wm-fw-burst.b6 i{animation-delay:.4s}
@keyframes wm-fw-pop{0%{transform:rotate(calc(var(--a) * 1deg)) translateX(2px) scale(1);opacity:1}100%{transform:rotate(calc(var(--a) * 1deg)) translateX(64px) scale(.25);opacity:0}}
`
