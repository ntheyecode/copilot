// llm_guard.js - input-side guardrail against OWASP LLM01 (prompt injection),
// LLM07 (system-prompt leakage) and direct abuse of WorkCoPilot's own AI.
//
// WHAT THIS IS: a precise detector for attempts to MANIPULATE WorkCoPilot itself
// through the user's own typed free text (the goal, a question, mid-session
// context). It is NOT a content filter on the task domain.
//
// CRITICAL (SUPREME RULE VI - never degrade functionality): WorkCoPilot guides
// security professionals. "Test my app for SQL injection", "find the login
// bypass", "ignore the cookie banner and continue" are LEGITIMATE tasks and MUST
// NOT be flagged. We only flag manipulation DIRECTED AT THE ASSISTANT - second
// person ("your instructions", "you are now", "reveal your prompt"), named
// jailbreaks, and cross-tenant data-exfiltration asks. The task vocabulary of
// pentesting (injection, bypass, exploit, payload) is deliberately NOT a trigger
// on its own.
//
// Defence in depth: even when something is flagged we usually PROCEED - the
// WORK_MODE system prompt already treats every input as untrusted data, so the
// model will not obey an injected instruction. The guard adds: a recorded
// attempt, an escalating warning to the user, and a refusal ONLY for the most
// egregious prompt-extraction / cross-tenant cases.

// Each rule: directed at the assistant (second person) or an unmistakable
// jailbreak / exfiltration shape. Severity 'high' may refuse; 'medium' warns.
const RULES = [
  // --- Instruction override aimed at the assistant (LLM01) ------------------
  { cat: 'instruction_override', sev: 'medium',
    re: /\b(ignore|disregard|forget|override|bypass)\b[^.?!]{0,40}\b(previous|prior|above|earlier|your|all|any|the)\b[^.?!]{0,20}\b(instruction|instructions|prompt|prompts|rule|rules|guideline|guidelines|guardrail|guardrails|direction|directions|context|system message|system prompt)\b/i },
  { cat: 'instruction_override', sev: 'medium',
    re: /\byou (are|will) now\b|\bfrom now on,? (you|ignore)\b|\bnew (instructions?|rules?|system prompt)\s*:/i },
  { cat: 'role_play_jailbreak', sev: 'high',
    re: /\b(developer mode|do anything now|\bDAN\b|jailbreak|unfiltered mode|without (any )?(restrictions?|rules?|filters?|guardrails?|limitations?)|no (restrictions?|rules?|filters?|guardrails?))\b/i },
  { cat: 'role_play_jailbreak', sev: 'medium',
    re: /\b(pretend|act as if|roleplay|role-play|imagine) (you|that you)\b[^.?!]{0,30}\b(no|not|without|ignore|free)\b/i },
  // --- System-prompt / identity extraction (LLM07) --------------------------
  { cat: 'prompt_extraction', sev: 'high',
    re: /\b(reveal|show|print|repeat|output|display|tell me|give me|what('?s| is| are)|share|leak|expose)\b[^.?!]{0,40}\b(your )?(system )?(prompt|instructions|rules|guidelines|configuration|config|directive|directives)\b/i },
  { cat: 'prompt_extraction', sev: 'high',
    re: /\b(repeat|print|output|show)\b[^.?!]{0,20}\b(everything|the text|all text|the words|the content)\b[^.?!]{0,20}\b(above|before this|earlier|you (were|are) (given|told))\b/i },
  { cat: 'model_probe', sev: 'medium',
    re: /\b(what|which|who)\b[^.?!]{0,30}\b(model|llm|language model|ai|engine|provider|vendor|gpt|claude|gemini|version)\b[^.?!]{0,20}\b(are you|powered by|powers? you|built on|run on|running on|using|do you (use|run))\b/i },
  { cat: 'model_probe', sev: 'medium',
    re: /\b(are you|is this)\b[^.?!]{0,15}\b(gpt|chatgpt|claude|gemini|llama|openai|anthropic|a language model|an llm)\b/i },
  // --- Cross-tenant / mass data exfiltration (LLM02 / authz) ----------------
  { cat: 'cross_tenant', sev: 'high',
    re: /\b(show|give|list|get|access|read|dump|export|reveal)\b[^.?!]{0,40}\b(other|another|all|every|different)\b[^.?!]{0,20}\b(compan(y|ies)|tenant|tenants|customer|customers|user|users|organi[sz]ation|account|accounts)('|’)?s?\b[^.?!]{0,20}\b(data|sessions?|secrets?|keys?|documents?|info|records?|knowledge)\b/i },
]

// Normalize common evasion: zero-width chars, excessive spacing, leet-ish gaps.
function normalize(s) {
  return String(s || '')
    .replace(/[​-‍﻿]/g, '')      // zero-width
    .replace(/[ \t]{2,}/g, ' ')
    .slice(0, 4000)
}

// Inspect one piece of user-typed free text. Returns the single highest-severity
// match (or null). `field` is just a label for the record (goal/question/context).
export function inspectUserText(text, { field = 'input' } = {}) {
  const t = normalize(text)
  if (t.length < 4) return null
  const hits = []
  for (const r of RULES) { if (r.re.test(t)) hits.push({ category: r.cat, severity: r.sev }) }
  if (!hits.length) return null
  const high = hits.find((h) => h.severity === 'high')
  const chosen = high || hits[0]
  return { flagged: true, field, category: chosen.category, severity: chosen.severity, categories: [...new Set(hits.map((h) => h.category))] }
}

// Escalating, non-accusatory warning shown to the user. nth = this user's running
// count of flagged attempts (1-based). Refusal is decided by the caller.
export function guardWarning({ severity, nth = 1 }) {
  const base = severity === 'high'
    ? 'That request looks like an attempt to change how WorkCoPilot works or to reach data that is not yours. WorkCoPilot only guides you through your own on-screen tasks.'
    : 'Heads up: WorkCoPilot follows its own safety rules and guides you through your on-screen task. It will not take instructions from the task text itself.'
  if (nth >= 3) return base + ' Repeated attempts like this are recorded for your administrator.'
  return base
}

export default { inspectUserText, guardWarning }
