// Start-a-task page (/work/start). WAVE 2 PART B: ONE cohesive, on-page,
// step-by-step wizard with a single progress indicator across every step. This
// RE-SEQUENCES the old split (inline TaskCoach + modal ScopeWizard) into one
// stepper and ADDS two screens (a "what I understood" reflection and a review +
// "Begin guiding" finish). The flow logic and server calls are REUSED verbatim:
// ScopeLoader, the question renderer, DocsAttach, WORKPLACES, ENV/STYLE questions,
// the per-option hints, tierRank, goalForPlan, handleGate, the desktop docs stash
// and the exact create/hand-off (api.workCreate -> showGuard -> onOpen). Nothing
// about the planner contract changes.
//
// The owner's step order (one stepper): (1) where are you working, (2) documents,
// (3) your goal, (4) NEW reflection, (5) Simple/Deep depth, (6) researching
// animation, (7) post-scope interview questions, (8) NEW review + Begin guiding.
//
// ============================ I18N KEYS ADDED ============================
// Every visible string is keyed under workStart.* (English source lives in
// src/i18n/locales/en/workStart.js). key -> English value:
//   h1 -> "Start a task"
//   lead -> "Describe what you want to get done in your own words. WorkCoPilot turns it into steps, guides you through each one on your screen, catches a wrong move and corrects it, then moves you to the next correct step."
//   eyebrow -> "Start a task"
//   stepOf -> "Step {n} of {total}"
//   stepPlace -> "Where you're working"
//   stepDocs -> "Documents or data"
//   stepGoal -> "Your goal"
//   stepReflect -> "What I understood"
//   stepDepth -> "Quick or detailed"
//   stepResearch -> "Researching"
//   stepQuestions -> "A few questions"
//   stepReview -> "Review and begin"
//   knowTask -> "I know my task"
//   back -> "Back"
//   continue -> "Continue"
//   notReadyTitle -> "AI setup is not finished yet"
//   notReady -> "Available once your administrator has finished AI setup. You can fill this in now; the final step opens when setup is done."
//   gateTooManyOpen -> "You already have {max} tasks on the go. Finish or pick one up to start another."
//   gateOutOfHours -> "You are out of guided hours. They renew {reset}, or add hours to keep going."
//   gateOutOfHoursCompany -> "You are out of guided hours. They renew {reset}. Ask your administrator if you need more before then."
//   gateOutOfHoursAct -> "Add hours"
//   gateCompanyTaskLimit -> "You have reached the task limit your company set. New tasks open {reset}. Ask your company administrator if you need more."
//   gateCompanyNoLicense -> "Your company has not assigned you a WorkCoPilot license yet, or all licenses are in use. Ask your company administrator to add you."
//   openSlots -> "{open} of {max} tasks open. Room for {n} more."
//   openFull -> "{max} of {max} tasks open. Finish or pick one up before starting another."
//   capLeft -> "{remaining} of {cap} tasks left. Resets {reset}."
//   capLeftOne -> "{remaining} of {cap} task left. Resets {reset}."
//   placeQ -> "Where are you working?"
//   placeSub -> "A quick pointer so WorkCoPilot tailors the steps to the right place. Optional, you can skip straight to your task."
//   placeSaasLabel -> "Website or SaaS app"
//   placeSaasBlurb -> "A site or web app in your browser."
//   placeDesktopLabel -> "Desktop app"
//   placeDesktopBlurb -> "A program installed on this computer."
//   placeFilesLabel -> "My own files or data"
//   placeFilesBlurb -> "Documents, spreadsheets or exports."
//   placeOtherLabel -> "Something else"
//   placeOtherBlurb -> "We'll tailor the steps to it."
//   fAppName -> "App name"
//   fUrl -> "URL"
//   fPath -> "Link or path"
//   fOptional -> "(optional)"
//   fSaasAppPh -> "e.g. Salesforce, Shopify admin"
//   fUrlPh -> "e.g. app.example.com"
//   fDeskAppPh -> "e.g. Excel, Photoshop, QuickBooks"
//   fPathPh -> "e.g. C:\\Reports\\Q3.xlsx"
//   fOtherLabel -> "Tell us in a few words"
//   fOtherPh -> "e.g. a hardware device, a phone app, a physical workflow"
//   noteSaas -> "We'll use this to sharpen the steps. No live lookup, nothing leaves until you start."
//   noteDesk -> "We'll use this to sharpen the steps."
//   placeHint -> "Pick where you are working, or skip with \"I know my task\"."
//   advancing -> "Got it. Opening the next step"
//   docsQ -> "Any documents or data?"
//   docsSub -> "Attach a spec, export or diagram to ground the plan in your own material, or skip if you do not need one."
//   docsUse -> "Use these to ground the plan"
//   docsSkip -> "Skip, no documents"
//   docsLockLead -> "Ground the plan in your own documents"
//   docsGate -> "Advanced & Premium"
//   docsRefLead -> "Reference documents"
//   docsStayOn -> "stay on this computer"
//   docsGround -> "ground your plan"
//   docsAdd -> "Add documents"
//   docsCharsTitle -> "{n} characters"
//   docsRemove -> "Remove {name}"
//   docsNoteDesktop -> "Text, PDFs, Word, and diagrams or screenshots (read on your device) all stay on your computer. Only governed text is used to plan this session, and it is not stored on our servers."
//   docsNoteWeb -> "Text is extracted on our server, scrubbed, and used to ground your plan."
//   docsErrOpen -> "Could not open documents"
//   docsErrRead -> "Could not read the documents"
//   docsErrTooLarge -> "{name}: too large (10 MB max)"
//   docsErrUpload -> "{name}: upload failed"
//   goalHeroK -> "Your task"
//   goalQ -> "Write your task"
//   goalSub -> "Name it, then describe what \"done\" looks like. The clearer it is, the better the plan."
//   nameLabel -> "Name this plan"
//   namePh -> "e.g. API pentest, transactional broker"
//   goalLabel -> "Your goal"
//   goalPh -> "What do you want to get done? Type or paste the task, the ticket, or the requirement."
//   goalReadyHint -> "WorkCoPilot plans it, then guides you step by step."
//   addContext -> "Add workspace context first"
//   reflectQ -> "Here's what I understood"
//   reflectSub -> "Looks right? Fix anything before I plan."
//   reflectWorkplace -> "Where you are working"
//   reflectDocs -> "Documents"
//   reflectGoal -> "Your goal"
//   reflectEdit -> "Edit"
//   reflectContinue -> "Looks right, continue"
//   sumSaas -> "{name}, a website or SaaS app"
//   sumSaasUrl -> "{name} ({url}), a website or SaaS app"
//   sumSaasBare -> "A website or SaaS app"
//   sumDesktop -> "{name}, a desktop app"
//   sumDesktopPath -> "{name}, a desktop app at {path}"
//   sumDesktopBare -> "A desktop app"
//   sumFiles -> "Your own files or data"
//   sumUnset -> "Not set, I will work it out from your screen"
//   docsNone -> "None attached"
//   docsOne -> "1 document attached"
//   docsMany -> "{n} documents attached"
//   docsAttached -> "Attached to ground the plan"
//   goalEmpty -> "Not written yet"
//   depthQ -> "How much should I ask before planning?"
//   depthHelp -> "Either way you can add detail later. A few sharp questions now make every step more precise."
//   depthQuickT -> "Quick"
//   depthQuickD -> "A few essentials, then straight to your plan. Best when you know the ground."
//   depthQuickM -> "Fewer questions"
//   depthDetailedT -> "Detailed"
//   depthDetailedD -> "A fuller interview about your environment, constraints and goal. Sharper, more tailored steps."
//   depthDetailedM -> "More questions"
//   scopeStageReading -> "reading your goal"
//   scopeStageResearch -> "researching the task"
//   scopeStageDetailed -> "drafting a detailed interview"
//   scopeStageQuick -> "drafting a quick interview"
//   scopeStageChecking -> "checking what to ask first"
//   scopeTermTitle -> "scoping : workcopilot"
//   scopeFoot -> "Writing the few questions that make your plan precise. A moment."
//   envQ -> "Where does this work happen?"
//   envHelp -> "Where will you actually be doing this? If you are not sure, pick \"Not sure or mixed\" and I will work it out from your screen."
//   envWebsite -> "A website or web app"
//   envWebsiteH -> "Something you use in a browser tab (Gmail, the AWS console, Salesforce, a bank site)."
//   envDesktop -> "A desktop or installed app"
//   envDesktopH -> "A program installed on your computer (Excel, Photoshop, QuickBooks, an IDE)."
//   envInstall -> "Install and configure software"
//   envInstallH -> "You need to download, install or set something up first."
//   envOnprem -> "An on-prem product at a local address"
//   envOnpremH -> "A tool you open at an internal address like 192.168.x.x or an intranet link, not the public internet."
//   envMixed -> "Not sure or mixed"
//   envMixedH -> "Not sure, or it spans a few of these. I will adapt once I can see your screen."
//   styleQ -> "How should I phrase each step?"
//   styleHelp -> "Just how the steps read. You can change this any time."
//   stylePlain -> "Plain and simple"
//   stylePlainH -> "Everyday words, no jargon. Best if this area is new to you."
//   styleBullets -> "Short bullets only"
//   styleBulletsH -> "Quick, terse steps with little explanation."
//   styleDetailed -> "Detailed, with context"
//   styleDetailedH -> "Fuller steps that also say why, so you learn as you go."
//   styleExpert -> "Expert, no hand-holding"
//   styleExpertH -> "Assumes you know the tools, high-level and concise."
//   monitorQ -> "Which screen should I watch?"
//   monitorPrimary -> "primary"
//   monitorCurrent -> "current"
//   qOptional -> "Optional"
//   qDocHelp -> "Optional. If you add documents or a diagram, your plan is grounded in them; skip and I plan from your goal and screen."
//   qGate -> "Grounding on your own documents is on Advanced and Premium. Answer anyway, I plan with what your plan allows."
//   qUpgrade -> "Upgrade"
//   qTypePh -> "Type your answer"
//   qNext -> "Next"
//   qReview -> "Review"
//   qOther -> "Other, type my own answer"
//   qCancel -> "Cancel"
//   qSkip -> "Skip"
//   qReadyReview -> "I have answered enough, review"
//   yes -> "Yes"
//   no -> "No"
//   scopeErrTitle -> "Could not scope this"
//   scopeErrGeneric -> "Could not scope this."
//   scopeErrTryAgain -> "Try again"
//   scopeErrPlanAnyway -> "Continue anyway"
//   reviewQ -> "Ready to begin"
//   reviewSub -> "A quick look at your plan setup. Begin when it looks right."
//   reviewPlan -> "Plan"
//   reviewGoal -> "Your goal"
//   reviewEnv -> "Where it happens"
//   reviewPhrasing -> "How steps read"
//   reviewAnswers -> "What you told me"
//   reviewNoAnswers -> "No extra answers, I will plan from your goal and screen."
//   reviewEnvUnset -> "From your screen"
//   reviewPhrasingUnset -> "Plain and simple"
//   beginGuiding -> "Begin guiding"
//   beginSub -> "WorkCoPilot builds your plan, then guides you step by step on your screen."
//   beginNotReady -> "The final step opens once your administrator has finished AI setup."
// =========================================================================
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, X, Plus, HelpCircle, ChevronLeft, Play, AlertTriangle, Zap, Sparkles, Compass, Monitor, Globe, FileText, PenLine, ArrowRight, MapPin, Target, Rocket, ListChecks, Wand2 } from 'lucide-react'
import { api } from '../../api.js'
import { clean } from '../../scrub.js'
import { useWorkApp } from './WorkAppContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { WIZ_CSS } from './wizard.css.js'

function tierRank(t) { const m = { lite: 0, basic: 1, advanced: 2, premium: 3 }; return m[t] != null ? m[t] : 1 }

const COACH_SKIP_KEY = 'wc.coach.skip'
// PARKED PLAN (QA H5): everything the person types in the wizard is kept in
// sessionStorage (this tab only) until the plan is created, so walking away to
// finish AI setup (or an accidental reload) never loses the goal. Cleared the
// moment "Begin guiding" succeeds.
const DRAFT_KEY = 'wc.start.draft'
function readDraft() {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); return d && typeof d === 'object' ? d : null } catch { return null }
}
function writeDraft(d) {
  try { if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}
// Steps that depend on transient server state (the scope call) are not resumed
// as-is: a parked draft reopens on the review step when answers exist, else on
// the depth step, so nothing stale is shown.
function resumeStep(s, answers) {
  if (s === 'research' || s === 'scopeerror' || s === 'questions') return answers && answers.length ? 'review' : 'depth'
  return STEP_ORDER.includes(s) ? s : null
}
// Ordered steps of the one unified stepper (research sits between depth and the
// questions; the transient scope-error state maps onto the research segment).
const STEP_ORDER = ['place', 'docs', 'goal', 'reflect', 'depth', 'research', 'questions', 'review']
const STEP_LABEL_KEY = { place: 'stepPlace', docs: 'stepDocs', goal: 'stepGoal', reflect: 'stepReflect', depth: 'stepDepth', research: 'stepResearch', questions: 'stepQuestions', review: 'stepReview' }

// Where the person is working (step 1). Owner-approved shape; ids are DATA, the
// label/blurb are display (translated at render). Icon is presentational.
const WORKPLACES = [
  { id: 'saas', labelKey: 'placeSaasLabel', blurbKey: 'placeSaasBlurb', icon: Globe },
  { id: 'desktop', labelKey: 'placeDesktopLabel', blurbKey: 'placeDesktopBlurb', icon: Monitor },
  { id: 'files', labelKey: 'placeFilesLabel', blurbKey: 'placeFilesBlurb', icon: FileText },
  { id: 'other', labelKey: 'placeOtherLabel', blurbKey: 'placeOtherBlurb', icon: Compass },
]
// ENV_Q / STYLE_Q option VALUES stay English because they are recorded and sent
// to the planner as data (preserving the exact scope contract). Only the on-screen
// label + hint are translated. OPTION_HINTS behaviour is preserved per option.
const ENV_OPTS = [
  { v: 'A website / web app', l: 'envWebsite', h: 'envWebsiteH' },
  { v: 'A desktop or installed app', l: 'envDesktop', h: 'envDesktopH' },
  { v: 'Install & configure software', l: 'envInstall', h: 'envInstallH' },
  { v: 'An on-prem product at a local address', l: 'envOnprem', h: 'envOnpremH' },
  { v: 'Not sure / mixed', l: 'envMixed', h: 'envMixedH' },
]
const STYLE_OPTS = [
  { v: 'Plain and simple', l: 'stylePlain', h: 'stylePlainH' },
  { v: 'Short bullets only', l: 'styleBullets', h: 'styleBulletsH' },
  { v: 'Detailed, with context', l: 'styleDetailed', h: 'styleDetailedH' },
  { v: 'Expert, no hand-holding', l: 'styleExpert', h: 'styleExpertH' },
]

// Terminal-style scoping progress ("csv/js box"): stages reveal line by line with
// check marks while the scope call runs; the running stage shows a live caret and
// the fill bar advances. Purely presentational (reduced-motion safe via CSS); the
// actual workScope call drives when the wizard moves on. Renders flush in the
// panel (no modal padding wrapper).
function ScopeLoader({ depth, t }) {
  const STAGES = [t('workStart.scopeStageReading'), t('workStart.scopeStageResearch'), depth === 'detailed' ? t('workStart.scopeStageDetailed') : t('workStart.scopeStageQuick'), t('workStart.scopeStageChecking')]
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n < STAGES.length - 1 ? n + 1 : n)), 1500)
    return () => clearInterval(id)
  }, [])   // eslint-disable-line
  const pct = Math.round(((i + 1) / (STAGES.length + 1)) * 100)
  return (
    <div className="wd-wz-research" role="status" aria-live="polite">
      <div className="wd-term">
        <div className="wd-term-bar">
          <span className="wd-term-dots"><i style={{ background: '#ff5f57' }} /><i style={{ background: '#febc2e' }} /><i style={{ background: '#28c840' }} /></span>
          <span className="wd-term-title">{t('workStart.scopeTermTitle')}</span>
          <span className="wd-term-pct">{pct}%</span>
        </div>
        <div className="wd-term-body">
          {STAGES.slice(0, i + 1).map((s, k) => (
            <div key={k} className={`wd-term-line ${k < i ? 'past' : 'on'}`} style={{ '--d': `${k * 40}ms` }}>
              <span className="p">$</span>
              <span>{s}</span>
              {k < i ? <Check size={13} className="ok" /> : <span className="wd-term-caret" />}
            </div>
          ))}
        </div>
        <div className="wd-term-track"><div className="wd-term-fill" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="wd-term-foot"><Loader2 size={13} className="spin" /> {t('workStart.scopeFoot')}</div>
    </div>
  )
}

// Reference documents attach: desktop picks docs on-device (stashed for the
// session, nothing leaves the computer), web uploads to the server. Available on
// EVERY tier now; the per-tier count cap (store.WORK_DOCS_MAX, surfaced as `max`
// by GET /api/work/docs) is the paid lever and is enforced server-side on upload.
function DocsAttach({ tier, onDesktopDocs, t }) {
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  const [docs, setDocs] = useState([])
  const [max, setMax] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef(null)

  // Always learn the per-tier cap (GET returns `max`); on web it also returns the
  // persisted docs. Desktop docs are on-device only, so its own list is kept.
  useEffect(() => {
    let on = true
    api.workDocsList().then((r) => {
      if (!on || !r) return
      if (typeof r.max === 'number') setMax(r.max)
      if (!desktop) setDocs(r.docs || [])
    }).catch(() => {})
    return () => { on = false }
  }, [desktop])

  const atCap = max != null && docs.length >= max
  const pushDesktop = (list) => { const l = max != null ? list.slice(0, max) : list; setDocs(l); if (onDesktopDocs) onDesktopDocs(l) }

  const addDesktop = async () => {
    setErr(''); setBusy(true)
    try {
      const r = await desktop.pickDocs()
      if (!r || !r.ok) { setErr((r && r.error) || t('workStart.docsErrOpen')); return }
      const good = (r.docs || []).filter((d) => d.text)
      const bad = (r.docs || []).filter((d) => d.error)
      if (bad.length) setErr(bad.map((b) => `${b.name}: ${b.error}`).join(' · '))
      const next = [...docs]
      for (const d of good) next.push({ name: d.name, chars: d.chars, text: clean(d.text), method: d.method, confidence: d.confidence })   // govern on-device
      if (max != null && next.length > max) setErr(t('workStart.docsCapFull', { max }))
      pushDesktop(next)
    } catch (e) { setErr((e && e.message) || t('workStart.docsErrRead')) } finally { setBusy(false) }
  }
  const addWeb = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length) return
    setErr(''); setBusy(true)
    try {
      const room = max != null ? Math.max(0, max - docs.length) : files.length
      for (const f of files.slice(0, room)) {
        if (f.size > 10 * 1024 * 1024) { setErr(t('workStart.docsErrTooLarge', { name: f.name })); continue }
        try {
          const dataBase64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => rej(new Error('read failed')); rd.readAsDataURL(f) })
          const r = await api.workDocAdd({ name: f.name, mime: f.type, dataBase64 })
          if (r && r.doc) setDocs((d) => [...d, r.doc])
        } catch (e2) { setErr(`${f.name}: ${(e2 && e2.message) || t('workStart.docsErrUpload', { name: f.name })}`) }
      }
      if (max != null && files.length > room) setErr(t('workStart.docsCapFull', { max }))
    } finally { setBusy(false) }
  }
  const remove = async (doc, i) => {
    if (desktop) { pushDesktop(docs.filter((_, k) => k !== i)); return }
    try { await api.workDocDelete(doc.id) } catch { /* ignore */ }
    setDocs((d) => d.filter((x) => x.id !== doc.id))
  }

  return (
    <div className="wd-docs">
      <div className="wd-docs-row">
        <span className="wd-docs-lead"><FileText size={14} /> {t('workStart.docsRefLead')} <span className="wd-docs-sub">{desktop ? t('workStart.docsStayOn') : t('workStart.docsGround')}</span></span>
        {desktop
          ? <button type="button" className="wd-docs-add" onClick={addDesktop} disabled={busy || atCap}>{busy ? <Loader2 size={13} className="spin" /> : <Plus size={14} />} {t('workStart.docsAdd')}</button>
          : <button type="button" className="wd-docs-add" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy || atCap}>{busy ? <Loader2 size={13} className="spin" /> : <Plus size={14} />} {t('workStart.docsAdd')}</button>}
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown" multiple style={{ display: 'none' }} onChange={addWeb} />
      </div>
      {max != null && <div className="wd-docs-cap">{t('workStart.docsCap', { used: docs.length, max })}{atCap && <> <Zap size={11} /> {t('workStart.docsCapUpgrade')}</>}</div>}
      {docs.length > 0 && (
        <div className="wd-docs-list">
          {docs.map((d, i) => (
            <span key={d.id || i} className="wd-docs-chip" title={d.chars ? t('workStart.docsCharsTitle', { n: d.chars }) : ''}><FileText size={12} /> <span className="nm">{d.name}</span>{d.method === 'ocr' && <span className={`wd-docs-ocr${d.confidence != null && d.confidence < 70 ? ' low' : ''}`}>OCR{d.confidence != null ? ` ${d.confidence}%` : ''}</span>} <button type="button" onClick={() => remove(d, i)} aria-label={t('workStart.docsRemove', { name: d.name })}><X size={12} /></button></span>
          ))}
        </div>
      )}
      {err && <div className="wd-docs-err"><AlertTriangle size={12} /> {err}</div>}
      <div className="wd-docs-note">{desktop ? t('workStart.docsNoteDesktop') : t('workStart.docsNoteWeb')}</div>
    </div>
  )
}

// Route entry: the unified start-a-task wizard.
export default function StartTask() {
  const navigate = useNavigate()
  const t = useT()
  const { ready, usage, plan, renewLabel, showGuard, onOpen, setNeedsSub, isCompanyMember, isAdmin, isCompanyAdmin, canBuyHours, buyCredits, refreshUsage } = useWorkApp()
  const tier = (usage && usage.tier) || 'basic'

  // A parked draft (see DRAFT_KEY) resumes where the person left off.
  const draft = useMemo(readDraft, [])
  // Remembered-skip: repeat users who have skipped the interview land on the goal.
  const remembered = (() => { try { return localStorage.getItem(COACH_SKIP_KEY) === '1' } catch { return false } })()
  const [step, setStep] = useState((draft && resumeStep(draft.step, draft.answers)) || (remembered ? 'goal' : 'place'))

  // Interview (step 1)
  const [place, setPlace] = useState((draft && draft.place) || '')
  const [appName, setAppName] = useState((draft && draft.appName) || '')
  const [appUrl, setAppUrl] = useState((draft && draft.appUrl) || '')
  const [otherText, setOtherText] = useState((draft && draft.otherText) || '')
  const [advancing, setAdvancing] = useState(false)
  // Documents (step 2)
  const [docsChoice, setDocsChoice] = useState((draft && draft.docsChoice) || '')   // use | skip
  const [deskDocs, setDeskDocs] = useState([])
  // Goal (step 3)
  const [planTitle, setPlanTitle] = useState((draft && draft.planTitle) || '')
  const [goal, setGoal] = useState((draft && draft.goal) || '')
  const [taskContext, setTaskContext] = useState('')
  // Depth / scope (steps 5 to 7)
  const [depth, setDepth] = useState((draft && draft.depth) || '')
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState((draft && Array.isArray(draft.answers)) ? draft.answers : [])
  const [txt, setTxt] = useState('')
  const [other, setOther] = useState(false)
  const [scopeErr, setScopeErr] = useState('')
  // Create / hand-off (step 8)
  const [busy, setBusy] = useState(false)
  const [gateMsg, setGateMsg] = useState('')
  const [gateAct, setGateAct] = useState('')      // 'hours' = offer Add hours next to the out-of-hours message

  const firstFieldRef = useRef(null)
  const advTimer = useRef(null)
  const aliveRef = useRef(true)
  const goalRef = useRef(null)
  // Set alive true on (re)mount, not only once: React 18 StrictMode double-mounts
  // in dev (mount -> cleanup -> remount), so a one-shot init would leave aliveRef
  // false on the live mount and the async scope handler would bail on both paths.
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; if (advTimer.current) clearTimeout(advTimer.current) } }, [])

  const remember = () => { try { localStorage.setItem(COACH_SKIP_KEY, '1') } catch { /* ignore */ } }

  // Park the draft on every change (the goal, the interview, the depth and the
  // answers). An untouched wizard stores nothing.
  useEffect(() => {
    const touched = !!(place || appName || appUrl || otherText || docsChoice || planTitle || goal || depth || answers.length)
    writeDraft(touched ? { step, place, appName, appUrl, otherText, docsChoice, planTitle, goal, depth, answers } : null)
  }, [step, place, appName, appUrl, otherText, docsChoice, planTitle, goal, depth, answers])

  // Where AI setup happens for THIS person: platform admins in the admin
  // console, company admins in the company console, personal accounts in the
  // dashboard's AI box. Company members cannot set it up themselves (their
  // admin does), so they get no link, only the honest message.
  const aiSetupLink = isAdmin
    ? { href: '/work/admin', label: t('companyAdmin.gate.openAdmin') }
    : isCompanyAdmin
      ? { href: '/work/company', label: t('companyAdmin.gate.openAdmin') }
      : isCompanyMember
        ? null
        : { href: '/work', label: t('workStart.setupAiLink', 'Set up AI on the dashboard') }
  const goalComplete = !!(goal.trim() && planTitle.trim())

  // A gated action failed. The server's coded flags (server/index.js POST
  // /api/work/sessions) pick the message and the action:
  //   409 tooManyOpen  every at-once task slot is in use: finish or pick one up
  //   402 outOfHours   no guided hours left: renewal date + Add hours (individuals)
  //                    or ask your administrator (company members)
  //   402 taskLimit    a company member hit the admin-set task ceiling
  //   402 (no flag)    company member without a license / individual without a
  //                    plan (routes to the dashboard plan chooser)
  const handleGate = (e) => {
    const status = e && e.status
    const d = (e && e.data) || {}
    setGateAct('')
    if (d.tooManyOpen) {
      const max = d.maxOpen != null ? d.maxOpen : (plan && plan.tasks && plan.tasks.max != null ? plan.tasks.max : null)
      setGateMsg(max != null ? t('workStart.gateTooManyOpen', { max }) : (e.message || ''))
      refreshUsage && refreshUsage()
      return
    }
    if (d.outOfHours) {
      const reset = d.resetLabel || renewLabel || ''
      setGateMsg(isCompanyMember ? t('workStart.gateOutOfHoursCompany', { reset }) : t('workStart.gateOutOfHours', { reset }))
      if (!isCompanyMember && canBuyHours) setGateAct('hours')
      refreshUsage && refreshUsage()
      return
    }
    if (d.taskLimit) { setGateMsg(t('workStart.gateCompanyTaskLimit', { reset: d.resetLabel || renewLabel || '' })); return }
    if (status === 402) {
      if (isCompanyMember) setGateMsg(t('workStart.gateCompanyNoLicense'))
      else { setNeedsSub(true); navigate('/work') }
    } else if (e && e.message) { setGateMsg(e.message) }
  }

  // Fold the interview context into the goal text the planner sees (prepended).
  // Entirely client-side English DATA; preserved verbatim so the planner contract
  // does not change.
  const buildContext = useCallback(() => {
    const parts = []
    if (place === 'saas') parts.push(appName ? `Working in: ${appName}${appUrl ? ` (${appUrl})` : ''} - a website or SaaS app.` : 'Working in a website or SaaS app.')
    else if (place === 'desktop') parts.push(appName ? `Working in: ${appName} - a desktop app.` : 'Working in a desktop app.')
    else if (place === 'files') parts.push('Working with my own files or data.')
    else if (place === 'other' && otherText.trim()) parts.push(`Working on: ${otherText.trim()}.`)
    if (docsChoice === 'use') parts.push('Reference documents are attached to ground this.')
    return parts.join(' ')
  }, [place, appName, appUrl, otherText, docsChoice])
  useEffect(() => { setTaskContext(buildContext()) }, [buildContext])

  const goalForPlan = (g) => {
    const base = (typeof g === 'string' ? g : goal).trim()
    const ctx = (taskContext || '').trim()
    return ctx && base ? `${ctx}\n\n${base}` : (base || ctx)
  }

  // --- Interview place picker (auto-advance for choice-only, Continue for detail) ---
  const needsDetail = (id) => id === 'saas' || id === 'desktop' || id === 'other'
  const pickPlace = (id) => {
    if (advTimer.current) { clearTimeout(advTimer.current); advTimer.current = null }
    setPlace(id)
    if (needsDetail(id)) {
      setAdvancing(false)
      setTimeout(() => { try { firstFieldRef.current && firstFieldRef.current.focus() } catch { /* ignore */ } }, 90)
    } else {
      setAdvancing(true)
      advTimer.current = setTimeout(() => { setAdvancing(false); setStep('docs') }, 640)
    }
  }
  const onFieldKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); setStep('docs') } }

  // --- Depth -> scope call (research) -> questions ---
  const ENV_Q = useMemo(() => ({ id: 'environment', qCanon: 'Where does this work happen?', text: t('workStart.envQ'), help: t('workStart.envHelp'), kind: 'options', optList: ENV_OPTS.map((o) => ({ v: o.v, label: t('workStart.' + o.l), hint: t('workStart.' + o.h) })) }), [t])
  const STYLE_Q = useMemo(() => ({ id: 'phrasing', qCanon: 'How should I phrase each step?', text: t('workStart.styleQ'), help: t('workStart.styleHelp'), kind: 'options', optList: STYLE_OPTS.map((o) => ({ v: o.v, label: t('workStart.' + o.l), hint: t('workStart.' + o.h) })) }), [t])

  const startScoping = async (d) => {
    setDepth(d); setStep('research'); setScopeErr('')
    let monQ = null
    try {
      const desk = typeof window !== 'undefined' ? window.workDesktop : null
      if (desk && desk.getMonitors) {
        const mons = await desk.getMonitors()
        if (Array.isArray(mons) && mons.length > 1) monQ = { id: 'monitor', qCanon: 'Which screen should I watch?', text: t('workStart.monitorQ'), kind: 'monitor', monitors: mons }
      }
    } catch { /* ignore - fall back to the capture-time picker */ }
    // AI not provisioned yet (H5): the AI-written interview cannot run, so the
    // wizard asks only its own two questions (environment, phrasing) and parks
    // the plan on the review step. Nothing is lost; "Begin guiding" opens once
    // setup is done. The server is not called, so no misleading error either.
    if (!ready) {
      if (!aliveRef.current) return
      setQuestions([ENV_Q, ...(monQ ? [monQ] : []), STYLE_Q]); setIdx(0); setStep('questions')
      return
    }
    try {
      const r = await api.workScope(goal, d)
      if (!aliveRef.current) return
      const qs = (r && r.questions) || []
      setQuestions([ENV_Q, ...(monQ ? [monQ] : []), STYLE_Q, ...qs]); setIdx(0); setStep('questions')
    } catch (e) { if (aliveRef.current) { setScopeErr((e && e.message) || t('workStart.scopeErrGeneric')); setStep('scopeerror') } }
  }

  const cur = questions[idx]
  const advance = (a) => {
    const rec = (a != null && String(a).trim()) ? [...answers, { id: cur.id, q: cur.qCanon || cur.text, a: String(a).trim() }] : answers
    setAnswers(rec); setTxt(''); setOther(false)
    if (idx + 1 >= questions.length) setStep('review')
    else setIdx(idx + 1)
  }
  const back = () => { if (idx > 0) { setIdx(idx - 1); setTxt(''); setOther(false) } else setStep('depth') }
  const isDocQ = (q) => !!q && /document|diagram|upload|attach|file/i.test(`${q.id || ''} ${q.text || ''}`)

  // --- Create + hand-off (EXACT reuse) ---
  const begin = async () => {
    if (!ready || busy) return
    setBusy(true); setGateMsg('')
    try {
      const r = await api.workCreate({ title: planTitle.trim() || undefined, goal: goalForPlan(), scope: answers || [] })
      // Desktop on-device docs: stash the governed text for THIS session so the
      // console can inject it into the plan. Client-only, never uploaded.
      if (window.workDesktop && deskDocs.length) {
        try { sessionStorage.setItem('wd_docs_' + r.session.id, deskDocs.map((d) => `# ${d.name}\n${d.text}`).join('\n\n').slice(0, 8000)) } catch { /* ignore */ }
      }
      writeDraft(null)   // the plan exists now; the parked draft has done its job
      showGuard(r.guard)
      onOpen(r.session.id, r.guard)
    } catch (e) { setBusy(false); handleGate(e) }
  }

  // --- Reflection / review display helpers (translated DISPLAY of the same state) ---
  const placeSummary = () => {
    if (place === 'saas') return appName ? (appUrl ? t('workStart.sumSaasUrl', { name: appName, url: appUrl }) : t('workStart.sumSaas', { name: appName })) : t('workStart.sumSaasBare')
    if (place === 'desktop') return appName ? t('workStart.sumDesktop', { name: appName }) : t('workStart.sumDesktopBare')
    if (place === 'files') return t('workStart.sumFiles')
    if (place === 'other' && otherText.trim()) return otherText.trim()
    return t('workStart.sumUnset')
  }
  const docsSummary = () => {
    if (deskDocs.length === 1) return t('workStart.docsOne')
    if (deskDocs.length > 1) return t('workStart.docsMany', { n: deskDocs.length })
    if (docsChoice === 'use') return t('workStart.docsAttached')
    return t('workStart.docsNone')
  }
  const answerFor = (id) => { const a = answers.find((x) => x.id === id); return a ? a.a : null }
  const labelForValue = (list, v) => { const o = list.find((x) => x.v === v); return o ? t('workStart.' + o.l) : v }
  const envDisplay = () => { const v = answerFor('environment'); return v ? labelForValue(ENV_OPTS, v) : t('workStart.reviewEnvUnset') }
  const phrasingDisplay = () => { const v = answerFor('phrasing'); return v ? labelForValue(STYLE_OPTS, v) : t('workStart.reviewPhrasingUnset') }
  const extraAnswers = answers.filter((a) => a.id !== 'environment' && a.id !== 'phrasing' && a.a)

  // --- Progress indicator state ---
  const progStep = step === 'scopeerror' ? 'research' : step
  const stepIdx = Math.max(0, STEP_ORDER.indexOf(progStep))
  const stepLabel = t('workStart.' + (STEP_LABEL_KEY[progStep] || 'stepPlace'))
  const showSkip = step === 'place' || step === 'docs'
  const skipToGoal = () => { remember(); setStep('goal') }

  // Shared footer. `left` is the Back control (or null), `right` the primary move.
  const Foot = ({ left, right }) => (
    <div className="wd-wz-foot">
      {left || <span />}
      <span className="wd-wz-spacer" />
      {right}
    </div>
  )

  return (
    <section className="wd-start" id="wd-start-card" aria-label={t('workStart.h1')}>
      <style>{WIZ_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic"><PenLine size={16} /></span>
        <div>
          <h1 className="wd-wz-h1">{t('workStart.h1')}</h1>
          <p>{t('workStart.lead')}</p>
        </div>
      </div>

      {gateMsg && (
        <div className="wd-note warn" role="alert" style={{ marginBottom: 14 }}>
          <AlertTriangle size={16} />
          <span>{gateMsg}{gateAct === 'hours' && buyCredits && <> <button type="button" className="wd-note-act" onClick={() => buyCredits('hours')}>{t('workStart.gateOutOfHoursAct')}</button></>}</span>
        </div>
      )}

      <div className="wd-coach wd-wz" aria-label={t('workStart.eyebrow')}>
        <div className="wd-wz-head">
          <span className="wd-wz-eyebrow"><Sparkles size={13} /> {t('workStart.eyebrow')}</span>
          {showSkip && <button type="button" className="wd-wz-skip" onClick={skipToGoal}>{t('workStart.knowTask')} <ArrowRight size={12} /></button>}
        </div>
        <div className="wd-wz-progwrap">
          <div className="wd-wz-prog" role="progressbar" aria-valuemin={1} aria-valuemax={STEP_ORDER.length} aria-valuenow={stepIdx + 1} aria-label={t('workStart.stepOf', { n: stepIdx + 1, total: STEP_ORDER.length })}>
            {STEP_ORDER.map((s, i) => <span key={s} className={i < stepIdx ? 'done' : (i === stepIdx ? 'on' : '')} />)}
          </div>
          <div className="wd-wz-progmeta">
            <span className="wd-wz-stepn">{t('workStart.stepOf', { n: stepIdx + 1, total: STEP_ORDER.length })}</span>
            <span className="wd-wz-stepl">{stepLabel}</span>
          </div>
        </div>

        {!ready && (
          <div className="wd-wz-gate" role="note">
            <AlertTriangle size={15} />
            <span><b>{t('workStart.notReadyTitle')}</b> {t('workStart.notReady')}{aiSetupLink && <> <a className="wd-wz-gate-link" href={aiSetupLink.href}>{aiSetupLink.label} <ArrowRight size={12} /></a></>}</span>
          </div>
        )}

        {/* ---------------- STEP 1: where are you working ---------------- */}
        {step === 'place' && (
          <div className="wd-wz-panel" key="place">
            <div className="wd-coach-q wd-wiz-reveal">{t('workStart.placeQ')}</div>
            <div className="wd-coach-sub wd-wiz-reveal" style={{ '--d': '40ms' }}>{t('workStart.placeSub')}</div>
            <div className="wd-coach-kinds">
              {WORKPLACES.map((k, i) => { const Ic = k.icon; return (
                <button key={k.id} type="button" className={`wd-coach-kind wd-wiz-reveal${place === k.id ? ' on' : ''}`} style={{ '--d': `${80 + i * 45}ms` }} onClick={() => pickPlace(k.id)} aria-pressed={place === k.id} aria-label={`${t('workStart.' + k.labelKey)}. ${t('workStart.' + k.blurbKey)}`}>
                  <span className="wd-coach-kind-ic"><Ic size={17} /></span>
                  <span className="wd-coach-kind-l">{t('workStart.' + k.labelKey)}</span>
                  <span className="wd-coach-kind-b">{t('workStart.' + k.blurbKey)}</span>
                  {place === k.id && <span className="wd-coach-kind-check"><Check size={13} /></span>}
                </button>
              ) })}
            </div>
            {place === 'saas' && (
              <div className="wd-coach-fields wd-wiz-reveal">
                <div className="wd-coach-two">
                  <div className="wd-coach-field">
                    <label htmlFor="wd-ctx-app">{t('workStart.fAppName')}</label>
                    <input ref={firstFieldRef} id="wd-ctx-app" className="wd-coach-input" placeholder={t('workStart.fSaasAppPh')} value={appName} onChange={(e) => setAppName(e.target.value)} onKeyDown={onFieldKey} maxLength={80} />
                  </div>
                  <div className="wd-coach-field">
                    <label htmlFor="wd-ctx-url">{t('workStart.fUrl')} <span style={{ fontWeight: 400, color: 'var(--mut)' }}>{t('workStart.fOptional')}</span></label>
                    <input id="wd-ctx-url" className="wd-coach-input" placeholder={t('workStart.fUrlPh')} value={appUrl} onChange={(e) => setAppUrl(e.target.value)} onKeyDown={onFieldKey} maxLength={200} />
                  </div>
                </div>
                <div className="wd-coach-note"><Sparkles size={13} /> {t('workStart.noteSaas')}</div>
              </div>
            )}
            {place === 'desktop' && (
              <div className="wd-coach-fields wd-wiz-reveal">
                <div className="wd-coach-field">
                  <label htmlFor="wd-ctx-dapp">{t('workStart.fAppName')}</label>
                  <input ref={firstFieldRef} id="wd-ctx-dapp" className="wd-coach-input" placeholder={t('workStart.fDeskAppPh')} value={appName} onChange={(e) => setAppName(e.target.value)} onKeyDown={onFieldKey} maxLength={80} />
                </div>
                <div className="wd-coach-note"><Sparkles size={13} /> {t('workStart.noteDesk')}</div>
              </div>
            )}
            {place === 'other' && (
              <div className="wd-coach-fields wd-wiz-reveal">
                <div className="wd-coach-field">
                  <label htmlFor="wd-ctx-other">{t('workStart.fOtherLabel')}</label>
                  <input ref={firstFieldRef} id="wd-ctx-other" className="wd-coach-input" placeholder={t('workStart.fOtherPh')} value={otherText} onChange={(e) => setOtherText(e.target.value)} onKeyDown={onFieldKey} maxLength={160} />
                </div>
              </div>
            )}
            <Foot
              left={!place ? <span className="wd-wz-hint">{t('workStart.placeHint')}</span> : null}
              right={advancing
                ? <span className="wd-coach-adv"><Check size={14} /> {t('workStart.advancing')}<span className="bar"><i /></span></span>
                : <button type="button" className="wd-cta" disabled={!place} onClick={() => setStep('docs')}>{t('workStart.continue')} <ArrowRight size={15} /></button>}
            />
          </div>
        )}

        {/* ---------------- STEP 2: documents or data ---------------- */}
        {step === 'docs' && (
          <div className="wd-wz-panel" key="docs">
            <div className="wd-coach-q wd-wiz-reveal">{t('workStart.docsQ')}</div>
            <div className="wd-coach-sub wd-wiz-reveal" style={{ '--d': '40ms' }}>{t('workStart.docsSub')}</div>
            <div className="wd-coach-docswrap wd-wiz-reveal" style={{ '--d': '80ms' }}><DocsAttach tier={tier} onDesktopDocs={setDeskDocs} t={t} /></div>
            <div className="wd-coach-choices wd-wiz-reveal" style={{ '--d': '120ms' }}>
              <button type="button" className={`wd-coach-choice primary${docsChoice === 'use' ? ' on' : ''}`} onClick={() => { setDocsChoice('use'); setStep('goal') }}><FileText size={15} /> {t('workStart.docsUse')}</button>
              <button type="button" className="wd-coach-choice" onClick={() => { setDocsChoice('skip'); setStep('goal') }}>{t('workStart.docsSkip')}</button>
            </div>
            <Foot left={<button type="button" className="wd-wz-link" onClick={() => setStep('place')}><ChevronLeft size={14} /> {t('workStart.back')}</button>} right={null} />
          </div>
        )}

        {/* ---------------- STEP 3: your goal ---------------- */}
        {step === 'goal' && (
          <div className="wd-wz-panel" key="goal">
            <div className="wd-coach-q wd-wiz-reveal">{t('workStart.goalQ')}</div>
            <div className="wd-coach-sub wd-wiz-reveal" style={{ '--d': '40ms' }}>{t('workStart.goalSub')}</div>
            <div className="wd-coach-hero wd-wiz-reveal" style={{ '--d': '80ms' }}>
              <div className="wd-coach-hero-k"><PenLine size={12} /> {t('workStart.goalHeroK')}</div>
              <label htmlFor="wd-name">{t('workStart.nameLabel')} <span className="req">*</span></label>
              <input id="wd-name" className="wd-nameinput" placeholder={t('workStart.namePh')} value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} maxLength={80} />
              <label htmlFor="wd-goal" style={{ marginTop: 12, display: 'block' }}>{t('workStart.goalLabel')} <span className="req">*</span></label>
              <textarea id="wd-goal" ref={goalRef} rows={3} placeholder={t('workStart.goalPh')} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            {/* Visible helper text, also the Continue button's description
                (aria-describedby), so the button's NAME stays "Continue" and the
                reason it is disabled is read as its description (L6). */}
            <span className="wd-wz-hint" id="wd-wz-goal-hint" aria-live="polite">
              {!goalComplete
                ? t('workStart.continueHint', 'Add a plan name and your goal to continue.')
                : (ready ? t('workStart.goalReadyHint') : t('workStart.notReady'))}
            </span>
            {/* Task slots, from the shared derivation (planModel): open tasks of
                the at-once maximum (individuals; nothing resets), or a company
                member's admin-set ceiling with its reset. */}
            {plan && plan.tasks && !plan.tasks.unlimited && plan.tasks.max != null && (
              <div className="wd-taskcap">
                {plan.tasks.mode === 'open'
                  ? (plan.tasksFull
                      ? t('workStart.openFull', { max: plan.tasks.max })
                      : t.n('workStart.openSlots', plan.tasks.remaining, { open: plan.tasks.used, max: plan.tasks.max, n: plan.tasks.remaining }))
                  : (plan.tasks.max === 1
                      ? t('workStart.capLeftOne', { remaining: plan.tasks.remaining, cap: plan.tasks.max, reset: plan.tasks.resetLabel })
                      : t('workStart.capLeft', { remaining: plan.tasks.remaining, cap: plan.tasks.max, reset: plan.tasks.resetLabel }))}
              </div>
            )}
            <Foot
              left={<button type="button" className="wd-wz-link" onClick={() => setStep('place')}><ChevronLeft size={14} /> {t('workStart.addContext')}</button>}
              right={<button type="button" className="wd-cta" disabled={!goalComplete} onClick={() => setStep('reflect')} aria-describedby="wd-wz-goal-hint">{t('workStart.continue')} <ArrowRight size={15} /></button>}
            />
          </div>
        )}

        {/* ---------------- STEP 4: reflection (NEW) ---------------- */}
        {step === 'reflect' && (
          <div className="wd-wz-panel" key="reflect">
            <div className="wd-coach-q wd-wiz-reveal">{t('workStart.reflectQ')}</div>
            <div className="wd-coach-sub wd-wiz-reveal" style={{ '--d': '40ms' }}>{t('workStart.reflectSub')}</div>
            <div className="wd-wz-sum wd-wiz-reveal" style={{ '--d': '80ms' }}>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><MapPin size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reflectWorkplace')}</div><div className="wd-wz-row-v">{placeSummary()}</div></div>
                <button type="button" className="wd-wz-row-edit" onClick={() => setStep('place')}><PenLine size={12} /> <span>{t('workStart.reflectEdit')}</span></button>
              </div>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><FileText size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reflectDocs')}</div><div className="wd-wz-row-v">{docsSummary()}</div></div>
                <button type="button" className="wd-wz-row-edit" onClick={() => setStep('docs')}><PenLine size={12} /> <span>{t('workStart.reflectEdit')}</span></button>
              </div>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><Target size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reflectGoal')}</div><div className={`wd-wz-row-v${goal.trim() ? '' : ' mut'}`}>{goal.trim() ? goal.trim() : t('workStart.goalEmpty')}</div></div>
                <button type="button" className="wd-wz-row-edit" onClick={() => setStep('goal')}><PenLine size={12} /> <span>{t('workStart.reflectEdit')}</span></button>
              </div>
            </div>
            <Foot
              left={<button type="button" className="wd-wz-link" onClick={() => setStep('goal')}><ChevronLeft size={14} /> {t('workStart.back')}</button>}
              right={<button type="button" className="wd-cta" onClick={() => setStep('depth')}>{t('workStart.reflectContinue')} <ArrowRight size={15} /></button>}
            />
          </div>
        )}

        {/* ---------------- STEP 5: depth ---------------- */}
        {step === 'depth' && (
          <div className="wd-wz-panel" key="depth">
            <div className="wd-wiz-q wd-wiz-reveal">{t('workStart.depthQ')}</div>
            <div className="wd-wiz-help wd-wiz-reveal" style={{ '--d': '40ms' }}><HelpCircle size={13} /> {t('workStart.depthHelp')}</div>
            <div className="wd-wiz-depth">
              <button type="button" className="wd-wiz-depth-card wd-wiz-reveal" style={{ '--d': '90ms' }} onClick={() => startScoping('quick')}>
                <span className="wd-wiz-depth-ic"><Zap size={17} /></span>
                <span className="wd-wiz-depth-t">{t('workStart.depthQuickT')}</span>
                <span className="wd-wiz-depth-d">{t('workStart.depthQuickD')}</span>
                <span className="wd-wiz-depth-m">{t('workStart.depthQuickM')} <ArrowRight size={12} /></span>
              </button>
              <button type="button" className="wd-wiz-depth-card wd-wiz-reveal" style={{ '--d': '150ms' }} onClick={() => startScoping('detailed')}>
                <span className="wd-wiz-depth-ic"><Compass size={17} /></span>
                <span className="wd-wiz-depth-t">{t('workStart.depthDetailedT')}</span>
                <span className="wd-wiz-depth-d">{t('workStart.depthDetailedD')}</span>
                <span className="wd-wiz-depth-m">{t('workStart.depthDetailedM')} <ArrowRight size={12} /></span>
              </button>
            </div>
            <Foot left={<button type="button" className="wd-wz-link" onClick={() => setStep('reflect')}><ChevronLeft size={14} /> {t('workStart.back')}</button>} right={null} />
          </div>
        )}

        {/* ---------------- STEP 6: researching animation ---------------- */}
        {step === 'research' && (
          <div className="wd-wz-panel" key="research"><ScopeLoader depth={depth} t={t} /></div>
        )}

        {step === 'scopeerror' && (
          <div className="wd-wz-panel tight" key="scopeerror">
            <div className="wd-wiz-q">{t('workStart.scopeErrTitle')}</div>
            <div style={{ color: 'var(--danger)', marginBottom: 6, lineHeight: 1.5 }}>{scopeErr}</div>
            <Foot
              left={<button type="button" className="wd-wz-link" onClick={() => setStep('depth')}><ChevronLeft size={14} /> {t('workStart.scopeErrTryAgain')}</button>}
              right={<button type="button" className="wd-cta" onClick={() => { setAnswers([]); setStep('review') }}>{t('workStart.scopeErrPlanAnyway')} <ArrowRight size={15} /></button>}
            />
          </div>
        )}

        {/* ---------------- STEP 7: interview questions ---------------- */}
        {step === 'questions' && cur && (() => {
          const gated = cur.tierGate && tierRank(tier) < tierRank(cur.tierGate)
          const last = idx + 1 >= questions.length
          const docQ = isDocQ(cur)
          const choiceOpts = cur.kind === 'yesno'
            ? [{ v: 'Yes', label: t('workStart.yes') }, { v: 'No', label: t('workStart.no') }]
            : (cur.optList || (cur.options || []).map((o) => ({ v: o, label: o })))
          return (
            <div className="wd-wz-panel" key={'q:' + cur.id + ':' + idx}>
              <div className="wd-wiz-prog" aria-label={`${idx + 1} / ${questions.length}`}>{questions.map((_, i) => <span key={i} className={i <= idx ? 'on' : ''} />)}</div>
              <div className="wd-wiz-q wd-wiz-reveal">{cur.text}{(docQ || gated) && <span className="wd-wiz-tag">{t('workStart.qOptional')}</span>}</div>
              {(cur.help || docQ) && (
                <div className="wd-wiz-help wd-wiz-reveal" style={{ '--d': '40ms' }}><HelpCircle size={13} /> {cur.help || t('workStart.qDocHelp')}</div>
              )}
              {gated && (
                <div className="wd-wiz-gate wd-wiz-reveal" style={{ '--d': '70ms' }}>
                  <span><Zap size={13} /> {t('workStart.qGate')}</span>
                  <button className="btn btn-sm btn-primary" onClick={() => { setNeedsSub(true); navigate('/work') }}>{t('workStart.qUpgrade')}</button>
                </div>
              )}
              {cur.kind === 'text' ? (
                <div className="wd-wiz-text wd-wiz-reveal" style={{ '--d': '90ms' }}>
                  <textarea rows={2} autoFocus placeholder={cur.placeholder || t('workStart.qTypePh')} value={txt} onChange={(e) => setTxt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); advance(txt) } }} />
                  <button className="btn btn-primary" onClick={() => advance(txt)}>{last ? t('workStart.qReview') : t('workStart.qNext')} <ArrowRight size={15} /></button>
                </div>
              ) : cur.kind === 'monitor' ? (
                <div className="wd-wiz-choices">
                  {cur.monitors.map((m, k) => (
                    <button key={m.id} className="wd-wiz-choice wd-wiz-reveal" style={{ '--d': `${90 + k * 45}ms` }} onClick={() => { try { window.workDesktop && window.workDesktop.chooseMonitorId && window.workDesktop.chooseMonitorId(m.id) } catch { /* ignore */ } advance(m.label + (m.primary ? ` (${t('workStart.monitorPrimary')})` : '')) }}>
                      <Monitor size={15} style={{ verticalAlign: -3, marginRight: 7 }} />{m.label}{m.res ? ` · ${m.res}` : ''}{m.primary ? ` · ${t('workStart.monitorPrimary')}` : ''}{m.current ? ` · ${t('workStart.monitorCurrent')}` : ''}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="wd-wiz-choices">
                  {choiceOpts.map((o, k) => (
                    <button key={o.v} className={`wd-wiz-choice wd-wiz-reveal${o.hint ? ' has-hint' : ''}`} style={{ '--d': `${90 + k * 45}ms` }} onClick={() => advance(o.v)}>
                      <span className="wd-wiz-choice-l">{o.label}</span>
                      {o.hint && <span className="wd-wiz-choice-h">{o.hint}</span>}
                    </button>
                  ))}
                  {!other
                    ? <button type="button" className="wd-wiz-choice other wd-wiz-reveal" style={{ '--d': `${90 + choiceOpts.length * 45}ms` }} onClick={() => setOther(true)}><PenLine size={14} /> {t('workStart.qOther')}</button>
                    : <div className="wd-wiz-other wd-wiz-reveal">
                        <textarea rows={2} autoFocus placeholder={t('workStart.qTypePh')} value={txt} onChange={(e) => setTxt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (txt.trim()) advance(txt) } }} />
                        <div className="wd-wiz-other-row">
                          <button className="btn btn-outline btn-sm" onClick={() => { setOther(false); setTxt('') }}>{t('workStart.qCancel')}</button>
                          <button className="btn btn-primary btn-sm" onClick={() => advance(txt)} disabled={!txt.trim()}>{last ? t('workStart.qReview') : t('workStart.qNext')} <ArrowRight size={14} /></button>
                        </div>
                      </div>}
                </div>
              )}
              <div className="wd-wz-foot">
                <button className="wd-wz-link" onClick={back}><ChevronLeft size={14} /> {t('workStart.back')}</button>
                <button className="wd-wz-link" onClick={() => advance(null)}>{t('workStart.qSkip')}</button>
                <span className="wd-wz-spacer" />
                <button className="wd-wz-link strong" onClick={() => setStep('review')}>{t('workStart.qReadyReview')} <ArrowRight size={13} /></button>
              </div>
            </div>
          )
        })()}

        {/* ---------------- STEP 8: review + begin (NEW) ---------------- */}
        {step === 'review' && (
          <div className="wd-wz-panel" key="review">
            <div className="wd-coach-q wd-wiz-reveal">{t('workStart.reviewQ')}</div>
            <div className="wd-coach-sub wd-wiz-reveal" style={{ '--d': '40ms' }}>{t('workStart.reviewSub')}</div>
            <div className="wd-wz-sum wd-wiz-reveal" style={{ '--d': '80ms' }}>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><PenLine size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reviewPlan')}</div><div className="wd-wz-row-v">{planTitle.trim() || t('workStart.goalEmpty')}</div></div>
                <button type="button" className="wd-wz-row-edit" onClick={() => setStep('goal')}><PenLine size={12} /> <span>{t('workStart.reflectEdit')}</span></button>
              </div>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><Target size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reviewGoal')}</div><div className={`wd-wz-row-v${goal.trim() ? '' : ' mut'}`}>{goal.trim() || t('workStart.goalEmpty')}</div></div>
                <button type="button" className="wd-wz-row-edit" onClick={() => setStep('goal')}><PenLine size={12} /> <span>{t('workStart.reflectEdit')}</span></button>
              </div>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><MapPin size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reviewEnv')}</div><div className="wd-wz-row-v">{envDisplay()}</div></div>
              </div>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><Wand2 size={16} /></span>
                <div className="wd-wz-row-main"><div className="wd-wz-row-k">{t('workStart.reviewPhrasing')}</div><div className="wd-wz-row-v">{phrasingDisplay()}</div></div>
              </div>
              <div className="wd-wz-row">
                <span className="wd-wz-row-ic"><ListChecks size={16} /></span>
                <div className="wd-wz-row-main">
                  <div className="wd-wz-row-k">{t('workStart.reviewAnswers')}</div>
                  {extraAnswers.length
                    ? <ul className="wd-wz-ans">{extraAnswers.map((a, i) => <li key={i}><Check size={13} /><span><span className="q">{a.id === 'monitor' ? t('workStart.monitorQ') : a.q}: </span><span className="a">{a.a}</span></span></li>)}</ul>
                    : <div className="wd-wz-row-v mut">{t('workStart.reviewNoAnswers')}</div>}
                </div>
              </div>
            </div>
            <div className="wd-wz-beginwrap wd-wiz-reveal" style={{ '--d': '120ms' }}>
              {/* The ONLY AI-gated control (H5). When setup is not done the reason
                  and the way out are inline, visible text (not a title tooltip),
                  and the parked plan stays right here. */}
              <button type="button" className="wd-wz-begin" onClick={begin} disabled={!ready || busy} aria-describedby="wd-wz-begin-sub">
                {busy ? <Loader2 size={18} className="spin" /> : <Rocket size={18} />} {t('workStart.beginGuiding')}
              </button>
              {ready
                ? <div className="wd-wz-beginsub" id="wd-wz-begin-sub">{t('workStart.beginSub')}</div>
                : (
                  <div className="wd-wz-gate wd-wz-begingate" id="wd-wz-begin-sub" role="status">
                    <AlertTriangle size={15} />
                    <span><b>{t('workStart.notReadyTitle')}</b> {t('workStart.beginNotReady')} {t('workStart.parkedNote', 'Your plan is parked here and nothing you entered is lost.')}{aiSetupLink && <> <a className="wd-wz-gate-link" href={aiSetupLink.href}>{aiSetupLink.label} <ArrowRight size={12} /></a></>}</span>
                  </div>
                )}
            </div>
            <Foot left={<button type="button" className="wd-wz-link" onClick={() => setStep(questions.length ? 'questions' : 'depth')}><ChevronLeft size={14} /> {t('workStart.back')}</button>} right={null} />
          </div>
        )}
      </div>
    </section>
  )
}
