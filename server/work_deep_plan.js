// ===========================================================================
// WorkCoPilot - DEEP PLANNING: cross-system round trips, decision branches,
// failure-recovery and loops, worked out ONCE at plan time so the per-frame
// navigate FOLLOWS a structured plan instead of improvising when reality forks
// (domain at GoDaddy vs Cloudflare vs Route 53; a verify that fails on a token
// mismatch vs not-yet-propagated). A flat happy-path checklist is the root
// cause of those failures; this module gives the planner the depth to encode
// the forks and recovery, and gives the runtime the rules to follow them.
//
// Pure rules + prompt text + sanitizers only. The actual model calls stay in
// server/work.js (workPlan orchestrates the draft pass and the self-critique
// pass); this module never calls the model, so it imports nothing from work.js
// and there is no import cycle. Kept small and single-responsibility on purpose
// (SUPREME RULE XV: modules, not a growing monolith).
// ===========================================================================
import { scrubGuidance } from './ai_language.js'

// ---- The cross-system handoff rule (added to the planner prompt) ----------
// Task A. This only ADDS depth to goals that span two systems; it never narrows
// a plain linear plan (SUPREME RULE VI). Plain style, US spelling, no em dashes.
export const CROSS_SYSTEM_RULE =
  'PLAN THE WHOLE CROSS-SYSTEM ROUND TRIP, NEVER JUST ONE SIDE. Many goals need the person to ' +
  'move between TWO systems: a value is issued in system A, entered in system B, then confirmed ' +
  'back in system A. When the goal is like that, plan the FULL round trip as explicit ordered ' +
  'steps and NEVER jump from "copy the value" straight to "verify". Spell out going to the second ' +
  'system, doing the exact thing there, coming back, and checking. The real cases, done ' +
  'precisely:\n' +
  '- DNS domain or ownership verification: the record is added at the user\'s OWN domain registrar ' +
  'or DNS host (GoDaddy, Cloudflare, AWS Route 53, Namecheap, Google Domains, A2 and the like), ' +
  'NOT inside the site that issued it. Name the record TYPE (TXT or CNAME), the HOST or NAME field ' +
  '(for a root-domain TXT this is usually @), and the EXACT VALUE to paste. Tell them to REPLACE ' +
  'any old or wrong value for that record rather than add a second one, wait a realistic time for ' +
  'DNS to propagate (often a few minutes, sometimes up to an hour), then return to the issuing ' +
  'site and verify.\n' +
  '- OAuth or app connect: copy the client id, client secret or API key in one console and paste ' +
  'it into the other; plan both the copy step and the paste step.\n' +
  '- Webhooks: copy the webhook URL from system A, register it in system B.\n' +
  '- SSO or SAML: exchange the metadata or certificate between the identity provider and the app, ' +
  'in both directions.\n' +
  '- API keys: create the key in one place, store or paste it in the other.\n' +
  'WHEN THE PROVIDER CHANGES THE NAVIGATION AND IT IS NOT ON SCREEN: if which registrar, DNS host ' +
  'or provider the user has would change the exact clicks and you cannot see it, either add a ' +
  'top-level "clarify" asking it (for example "Where is your domain registered?" with common ' +
  'registrars as options, and the user can still type their own), or make the step a plain "Open ' +
  'your domain registrar\'s DNS settings" and let the live screen guidance name the exact fields ' +
  'once that page is in view. Never invent a specific control (such as a provider dropdown) that ' +
  'the issuing site does not actually show.\n' +
  'ALWAYS ADD A CHECK STEP FOR THE VERIFICATION, AND PLAN FOR IT TO FAIL THE FIRST TIME. The ' +
  'verify step must carry its on-screen diagnosis and recovery (use the "onFail" field): value ' +
  'does not match (the DNS holds an old or different token, so copy the CURRENT value from the ' +
  'issuing site and REPLACE the old one at the registrar), not yet propagated (wait a few minutes ' +
  'and verify again), or wrong record type or host (fix the type or the HOST/NAME field). A guide ' +
  'that only loops "make sure it is saved and wait" without reading the mismatch is a failure.\n' +
  'For Google Search Console specifically: adding a Domain property shows ONE TXT record to create ' +
  'at the domain\'s DNS provider, with the host left as the domain or @ and the value starting ' +
  'google-site-verification=. The user adds or REPLACES that TXT at their registrar, waits for ' +
  'propagation, then clicks Verify back in Search Console. If it reports ownership verification ' +
  'failed because it found a different token, the DNS still holds an OLD value: copy the current ' +
  'value shown in Search Console and replace the old TXT, then verify again.\n'

// ---- The deep structure the planner must encode ---------------------------
// Tells the planner to reason through forks, failures and loops now, and to put
// that structure on the steps (branches / onFail) while keeping the user-facing
// flow a clean one-micro-action-at-a-time sequence.
export const DEEP_PLAN_STRUCTURE =
  'PLAN THE DEPTH NOW - DECISIONS, FAILURES AND LOOPS - DO NOT LEAVE THEM TO THE MOMENT. A flat ' +
  'happy-path list breaks the instant reality forks. Before you finalize the steps, reason ' +
  'through, for this specific goal: every SYSTEM involved and each handoff between them; the ' +
  'DECISION POINTS where the right next action depends on what the user has or on what is on ' +
  'screen (for example which registrar hosts the domain); the FAILURE MODES of each risky step ' +
  '(especially any verify, connect, sign-in, install or configure step) and how to recover from ' +
  'each; and any step that must LOOP (wait and retry until a condition is true).\n' +
  'Keep the steps the person SEES as one clean linear sequence, one micro-action at a time. But ' +
  'carry the branch and recovery STRUCTURE on the step itself, so the live guidance follows your ' +
  'plan instead of guessing:\n' +
  '- "branches": when the exact next action depends on a choice the user makes or on what their ' +
  'screen shows, give an array of {"when":"<the condition in plain words, for example the domain ' +
  'is on Cloudflare>","guidance":"<the exact action for that case>"}. The live guidance picks the ' +
  'branch that matches the real screen. Prefer a top-level "clarify" when the fork is a clean ' +
  'either/or you can ask up front (such as the registrar); use "branches" when it depends on what ' +
  'appears on screen.\n' +
  '- "onFail": on any verify, confirm, connect, sign-in or save step, give an array of ' +
  '{"cause":"<how the failure reads on screen, for example it found a different token>","fix":"<the ' +
  'exact recovery micro-action>"}. Cover the real causes for that step. For DNS verification that ' +
  'means at least: value does not match (copy the current value and REPLACE the old record), not ' +
  'yet propagated (wait a few minutes and verify again), and wrong record type or host (correct ' +
  'it).\n' +
  'Only add this depth where the goal genuinely forks or can fail: cross-system handoffs, ' +
  'verification, sign-in or authorization, installing or configuring something. For a plain linear ' +
  'task, leave "branches" and "onFail" out entirely; never invent fake branches for a trivial ' +
  'goal.\n'

// ---- The self-critique / expand pass --------------------------------------
// A second planning call (strong model, text-only, once per task) that treats
// the draft as a first attempt and hardens it: missing prerequisite, the fork,
// the failure recovery, what the user may not have, and any loop. It reuses the
// full planner system prompt (so its output is the SAME JSON shape) with this
// directive appended; workPlan then runs the same sanitizer over its steps.
export const PLAN_CRITIQUE_DIRECTIVE =
  '\n\n---\nHARDEN A DRAFT PLAN\n' +
  'Below the usual inputs you are given a DRAFT plan for this goal, written quickly. Treat it as a ' +
  'first attempt that is probably missing depth. Stress-test it and return a BETTER full plan in ' +
  'the SAME JSON shape, keeping everything that is correct and fixing what is thin. Check, in ' +
  'order:\n' +
  '- What PREREQUISITE or starting step is missing (a container, a sign-in, or the navigation the ' +
  'draft assumes is already done)?\n' +
  '- Where does the path FORK on what the user has or on what is on screen, and does the draft ' +
  'carry that as a "clarify" or as step "branches"? Add the fork if it is missing (for DNS work, ' +
  'the user\'s registrar is almost always a fork).\n' +
  '- For every verify, connect, sign-in, install or save step: what happens when it FAILS, and ' +
  'does the step carry "onFail" recovery for each real cause? Add it if missing.\n' +
  '- What does the user NEED that they may not have yet (a value to copy, access, or a record to ' +
  'replace), and is getting it an explicit step?\n' +
  '- Is any step really a LOOP (wait and retry)? Encode the retry as "onFail" or as its own short ' +
  'check step.\n' +
  'Return the complete improved plan as the plan JSON (same shape, including any "branches" and ' +
  '"onFail"). Do not shorten or drop correct steps; only add missing depth and correctness.\n'

// The user half of the critique call: the goal, the observed app, and the draft
// steps rendered compactly (including any branch/onFail the draft already has).
export function planCritiqueUser({ goal, appContext = '', draftSteps = [] }) {
  const list = (draftSteps || []).map((s, i) => {
    const bits = [`${i + 1}. ${String((s && s.text) || '').trim()}`]
    if (s && s.validate) bits.push(`   done when: ${String(s.validate).trim()}`)
    if (s && Array.isArray(s.branches) && s.branches.length) {
      bits.push(`   branches: ${s.branches.map((b) => `${b && b.when} -> ${b && b.guidance}`).join(' | ')}`)
    }
    if (s && Array.isArray(s.onFail) && s.onFail.length) {
      bits.push(`   onFail: ${s.onFail.map((f) => `${f && f.cause} -> ${f && f.fix}`).join(' | ')}`)
    }
    return bits.join('\n')
  }).join('\n') || '(empty draft)'
  return (
    `GOAL:\n${String(goal || '').trim()}\n\n` +
    (appContext ? `CURRENT SCREEN / APP (observed): ${appContext}\n\n` : '') +
    `DRAFT PLAN TO HARDEN:\n${list}\n\n` +
    'Return the improved plan JSON now.')
}

// ---- When depth is worth a second pass ------------------------------------
// Honest gate (coordinator point 4): run the self-critique only where the goal
// genuinely forks or can fail, so a trivial linear task pays nothing extra. True
// when the draft is already structured (branch/onFail/verify step) or the goal,
// app or step text names a cross-system / verification / auth / install / config
// surface.
const BRANCHY_RE = /\b(verif\w*|verification|dns|domain|subdomain|cname|txt record|name ?server|nameserver|registrar|propagat\w*|ownership|oauth|o-auth|sso|saml|webhook|api key|client secret|client id|access token|refresh token|connect|integrat\w*|install\w*|configur\w*|sign[- ]?in|log[- ]?in|authenticat\w*|credential|certificate|metadata)\b/i
export function deepWorthy({ goal = '', appContext = '', draftSteps = [] } = {}) {
  const steps = Array.isArray(draftSteps) ? draftSteps : []
  // Already structured, or holds a verify step -> worth hardening.
  if (steps.some((s) => s && ((Array.isArray(s.branches) && s.branches.length) ||
    (Array.isArray(s.onFail) && s.onFail.length) || isVerifyStep(s)))) return true
  const hay = `${goal} ${appContext} ${steps.map((s) => `${(s && s.text) || ''} ${(s && s.validate) || ''}`).join(' ')}`
  return BRANCHY_RE.test(hay)
}

// ---- Shared runtime helpers (used by navigate + watch too) ----------------
// A verify/confirm/success-or-failure moment, judged from the step text and its
// validate condition. Reading pass/fail and exact values correctly is exactly
// where the cheap model fails, so navigate reads these at full resolution on the
// strong model, and the consistency guard watches them for a hallucinated done.
const VERIFY_RE = /verif|confirm|success|succeed|saved|propagat|record found|ownership|validat/i
export function isVerifyStep(step) {
  if (!step) return false
  return VERIFY_RE.test(`${(step.text || '')} ${(step.validate || '')}`.toLowerCase())
}

// Deterministic failure backstop (SUPREME RULE III: never silently pass a wrong
// state). Only clear, unambiguous on-screen failure words count, and negated
// forms ("no errors", "without any problem", "error-free") are stripped first so
// a genuinely successful step is never blocked.
const FAILURE_SIGNALS = [
  /\bfail(?:ed|ure|s|ing)?\b/i,
  /\berrors?\b/i,
  /\binvalid\b/i,
  /\bcould\s*n['’]?t\s+find\b/i,
  /\bcould\s+not\s+find\b/i,
  /\bcan\s*n['’]?t\s+find\b/i,
  /\bcannot\s+find\b/i,
  /\bunable\s+to\s+find\b/i,
  /\bdoes\s*n['’]?t\s+match\b/i,
  /\bdoes\s+not\s+match\b/i,
  /\bdo\s*n['’]?t\s+match\b/i,
  /\bdo\s+not\s+match\b/i,
  /\bnot\s+found\b/i,
  /\bno\s+\S+\s+record\b/i,
]
export function hasFailureSignal(text) {
  let t = String(text || '')
  if (!t) return false
  // Neutralize negated / absence-of forms so "no errors" or "without any problem"
  // or "error-free" never read as a failure.
  t = t
    .replace(/\b(?:no|zero|without|free\s+of|not\s+any|n['’]?t\s+any)\s+(?:error|failure|problem|issue)s?\b/gi, ' ')
    .replace(/\b(?:error|problem|issue|failure)[-\s]?free\b/gi, ' ')
  return FAILURE_SIGNALS.some((re) => re.test(t))
}

// ---- Sanitizers for the new optional step fields --------------------------
// Scrubbed prose, bounded length and count; drop anything empty. Returns [] when
// absent so workPlan can attach the field only when it has real content (keeps
// existing flows and stored sessions unchanged - backward compatible).
export function cleanBranches(v) {
  if (!Array.isArray(v)) return []
  return v.map((b) => {
    if (!b || typeof b !== 'object') return null
    const when = scrubGuidance(String(b.when || b.condition || '').trim()).slice(0, 160)
    const guidance = scrubGuidance(String(b.guidance || b.text || b.do || '').trim()).slice(0, 400)
    if (!when || !guidance) return null
    return { when, guidance }
  }).filter(Boolean).slice(0, 8)
}
export function cleanOnFail(v) {
  if (!Array.isArray(v)) return []
  return v.map((f) => {
    if (!f || typeof f !== 'object') return null
    const cause = scrubGuidance(String(f.cause || f.when || '').trim()).slice(0, 160)
    const fix = scrubGuidance(String(f.fix || f.guidance || f.recovery || '').trim()).slice(0, 400)
    if (!cause || !fix) return null
    return { cause, fix }
  }).filter(Boolean).slice(0, 8)
}
