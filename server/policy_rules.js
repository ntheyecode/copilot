// ===========================================================================
// WorkCoPilot - company security-policy -> ENFORCED GUIDANCE RULES.
//
// A company admin ingests their WRITTEN security policy (the document that says,
// in prose, "secrets must go in a vault", "never use FTP", "production access
// requires MFA"). We turn that prose into structured, machine-enforceable RULES
// and the guide GATE checks every set of generated steps against them - flagging
// each violation or unmet requirement WITH A CITATION back to the policy doc +
// section, plus the compliant alternative.
//
// This is the sibling of security_gate.js: that one is a FIXED backstop (dangerous
// commands + vulnerable deps); this one enforces the COMPANY'S OWN written rules.
//
//   normalizeRule(raw)            -> a sanitized, bounded rule object (pure)
//   compileRule(rule)             -> rule + compiled regexes, or null if unusable
//   enforceRules(text, rules)     -> { findings[], checked } (pure, NO network)
//   extractRulesHeuristic(text,n) -> rules[] from prose, deterministically
//   extractRulesAI(ai,cfg,...)    -> AI-assisted extraction, with the heuristic
//                                    as the FLOOR (never silently empty - RULE III)
//
// Design laws honored:
//  - SUPREME RULE VI (no-degrade): enforcement NEVER deletes or rewrites the
//    model's guidance (that could break a correct answer). It SURFACES the
//    violation + the safe alternative + the citation, and the caller audits it.
//  - SUPREME RULE III (no-silent-fail): extraction always returns something it
//    can stand behind; if the AI path yields nothing or errors, the deterministic
//    heuristic result is returned, tagged with its honest `source`.
//  - Low false-positive bias (RULE XI): `require` rules fire ONLY when their
//    trigger context is present in the guidance, so a requirement that is simply
//    off-topic for a given step is never reported as "unmet".
// ===========================================================================

export const RULE_KINDS = ['forbid', 'require']
export const RULE_SEVERITIES = ['critical', 'high', 'medium', 'low']

// --- helpers ---------------------------------------------------------------
const clampStr = (v, n) => String(v == null ? '' : v).slice(0, n)
const reEscape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Parse a pattern field. Two forms are accepted:
//   /.../flags   - a regex literal the admin wrote (power users)
//   plain text   - one or more keywords/phrases, comma- or newline-separated;
//                  each becomes a loose, case-insensitive, whitespace-flexible
//                  match, OR'd together.
// Returns a RegExp (global+ignorecase) or null if nothing usable / it won't compile.
export function buildMatcher(pattern) {
  const raw = String(pattern || '').trim()
  if (!raw) return null
  try {
    const lit = raw.match(/^\/(.+)\/([a-z]*)$/is)
    if (lit) {
      const flags = (lit[2] || '').replace(/[^gimsuy]/g, '')
      return new RegExp(lit[1], flags.includes('g') ? flags : flags + 'g')
    }
    const terms = raw.split(/[\n,]/).map((t) => t.trim()).filter((t) => t.length >= 2).slice(0, 24)
    if (!terms.length) return null
    // A purely alphanumeric term gets word boundaries so it never matches inside a
    // larger word (so a "ftp" rule does NOT fire on the safe alternative "SFTP").
    // A term with symbols (ftp://, api-key, 0.0.0.0) is matched literally, with
    // flexible whitespace, since standard boundaries don't behave at symbol edges.
    const alts = terms.map((t) => {
      const esc = reEscape(t).replace(/\s+/g, '\\s+')
      return /^[a-z0-9]+$/i.test(t) ? `\\b${esc}\\b` : esc
    }).join('|')
    return new RegExp('(?:' + alts + ')', 'gi')
  } catch { return null }
}

// Sanitize an arbitrary object into a stored rule. Never throws.
let _seq = 0
export function normalizeRule(raw, i = 0) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const kind = RULE_KINDS.includes(r.kind) ? r.kind : 'forbid'
  const severity = RULE_SEVERITIES.includes(r.severity) ? r.severity : 'high'
  const id = clampStr(r.id, 40) || `r${Date.now().toString(36)}${(_seq++).toString(36)}${i}`
  return {
    id,
    kind,
    title: clampStr(r.title, 120),
    pattern: clampStr(r.pattern, 400),
    // `context` only applies to `require` rules: the requirement is checked ONLY
    // when the guidance is actually about this topic (keeps false positives down).
    context: kind === 'require' ? clampStr(r.context, 400) : '',
    severity,
    doc: clampStr(r.doc, 160),            // the policy document this came from
    section: clampStr(r.section, 160),    // the section/heading inside it
    rationale: clampStr(r.rationale, 400),
    guidance: clampStr(r.guidance, 400),  // the compliant alternative to show
    enabled: r.enabled !== false,
  }
}

// Validate+compile a rule for enforcement. Returns the rule with _re (and _ctx
// for require rules) attached, or null when it is disabled / has no usable match.
export function compileRule(rule) {
  const r = normalizeRule(rule)
  if (!r.enabled) return null
  const re = buildMatcher(r.pattern)
  if (!re) return null
  if (r.kind === 'require') {
    const ctx = buildMatcher(r.context)
    if (!ctx) return null   // a require rule with no trigger is inert (never guesses)
    return { ...r, _re: re, _ctx: ctx }
  }
  return { ...r, _re: re }
}

// A finding the gate surfaces. One per rule that fired.
function makeFinding(rule, sample) {
  return {
    ruleId: rule.id,
    kind: rule.kind,
    title: rule.title || (rule.kind === 'forbid' ? 'Prohibited practice' : 'Required practice missing'),
    severity: rule.severity,
    doc: rule.doc || '',
    section: rule.section || '',
    rationale: rule.rationale || '',
    guidance: rule.guidance || '',
    sample: clampStr(sample, 120),
  }
}

// Enforce a compiled or raw ruleset against generated guidance TEXT. Pure.
//   forbid  -> the pattern appears in the guidance              => VIOLATION
//   require -> the context appears but the pattern does NOT      => UNMET
// Returns { findings, checked, counts }. `checked` is always true (deterministic).
export function enforceRules(text, rules) {
  const s = String(text || '')
  const list = (Array.isArray(rules) ? rules : [])
    .map((r) => (r && r._re ? r : compileRule(r)))
    .filter(Boolean)
  const findings = []
  if (s.trim()) {
    for (const r of list) {
      r._re.lastIndex = 0
      if (r.kind === 'forbid') {
        const m = r._re.exec(s)
        if (m) findings.push(makeFinding(r, m[0]))
      } else {
        r._ctx.lastIndex = 0
        const c = r._ctx.exec(s)
        if (c) {
          r._re.lastIndex = 0
          if (!r._re.test(s)) findings.push(makeFinding(r, c[0]))
        }
      }
    }
  }
  // Most serious first (critical > high > medium > low).
  const rank = { critical: 0, high: 1, medium: 2, low: 3 }
  findings.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9))
  const counts = { forbid: 0, require: 0, critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of findings) { counts[f.kind]++; counts[f.severity]++ }
  return { findings, checked: true, counts }
}

// --- deterministic extraction (the FLOOR when AI is off / fails) ------------
const STOPWORDS = new Set(('the a an and or of to in on for with without is are be must should shall will would can may not no any all our we you they it this that these those as at by from into than then so such only also more most other any their your its his her them who whom which when where what how why be being been have has had do does did use used using ensure always never').split(/\s+/))
// Low-information words that over-match if used as a pattern (a forbid rule on
// "file" would fire on any step that mentions a file). Penalized, never preferred.
const GENERIC = new Set(('file files data system systems server servers service services user users account information policy policies team company companies process processes resource resources environment following allowed permitted prohibited required require requires requirement standard standards control controls management procedure procedures document documents application applications software hardware device devices access store stored storing kept keep keeping sent send sending approved transfer transferred').split(/\s+/))
// High-value security terms that make a crisp, specific pattern. Preferred.
const SECURITY = new Set(('ftp sftp scp ssh telnet smb rdp http https tls ssl mtls vpn mfa 2fa otp vault kms hsm plaintext cleartext secret secrets password passwords passphrase credential credentials token tokens apikey api-key key keys certificate cert privatekey rsa prod production staging root sudo admin administrator superuser encryption encrypt encrypted decrypt hashed salted bcrypt pbkdf2 pii phi phi pci ssn card cardholder backup backups firewall waf iam s3 bucket sql injection xss csrf cors wildcard 0.0.0.0 localhost internet public private least-privilege rbac audit logging mask tokenize redact').split(/\s+/))

// Score a token by how SPECIFIC/useful it is as a match pattern.
function tokenScore(t) {
  let s = t.length
  if (SECURITY.has(t)) s += 100
  if (/[0-9:/._-]/.test(t)) s += 20          // ftp://, 0.0.0.0, api-key, s3://
  if (GENERIC.has(t)) s -= 60
  return s
}
// Scored, de-duplicated content tokens from a clause, best (most specific) first.
function keywordsScored(clause) {
  const toks = String(clause).toLowerCase().match(/[a-z0-9][a-z0-9+./_:-]{2,}/g) || []
  const seen = new Set(); const uniq = []
  for (const raw of toks) {
    const t = raw.replace(/^[._/:-]+|[._/:-]+$/g, '')
    if (!t || STOPWORDS.has(t) || t.length < 3 || seen.has(t)) continue
    if (/^\d+$/.test(t)) continue
    seen.add(t); uniq.push(t)
  }
  return uniq.map((t) => ({ t, s: tokenScore(t) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)
}
// Nouns that name the data/thing a policy PROTECTS (the subject), not the
// prohibited METHOD. A forbid rule keyed to one of these over-matches, because the
// subject word also appears in compliant guidance ("keep SECRETS in the vault").
// So forbid patterns prefer the method term and use a subject noun only as a last
// resort. (Require rules are unaffected - they are context-gated.)
const SUBJECT_NOUNS = new Set(('secret secrets credential credentials password passwords passphrase key keys apikey api-key token tokens data pii phi information card cardholder account accounts identity identities').split(/\s+/))

// Forbid terms: lock onto the prohibited METHOD, not the protected subject. Prefer
// the most-specific non-subject term (+ a second only if it is also specific,
// score >= 15). Fall back to a subject noun only when nothing else is available.
function forbidTerms(clause) {
  const sc = keywordsScored(clause)
  if (!sc.length) return []
  const method = sc.filter((x) => !SUBJECT_NOUNS.has(x.t))
  const pick = method.length ? method : sc
  const out = [pick[0].t]
  if (pick[1] && pick[1].s >= 15 && !SUBJECT_NOUNS.has(pick[1].t)) out.push(pick[1].t)
  return out
}

// Pull the most salient content keywords out of a clause, ranked by specificity
// (so a forbid pattern locks onto "ftp"/"plaintext", not generic "file"/"data").
function keywordsFrom(clause, max = 3) {
  // Tokens may start with a letter OR a digit, so IP/CIDR literals (0.0.0.0/0) and
  // ports/versions are captured, not just words.
  const toks = String(clause).toLowerCase().match(/[a-z0-9][a-z0-9+./_:-]{2,}/g) || []
  const seen = new Set(); const uniq = []
  for (const raw of toks) {
    // Strip sentence punctuation the loose token class swept up (e.g. "plaintext."
    // or "ftp://" -> "plaintext" / "ftp"); keep internal dots/hyphens (0.0.0.0, api-key).
    const t = raw.replace(/^[._/:-]+|[._/:-]+$/g, '')
    // Drop a bare integer (e.g. "100 users" -> "100"); keep ones with an internal
    // dot/slash/colon (an IP, CIDR, version, or host:port carries real meaning).
    if (!t || STOPWORDS.has(t) || t.length < 3 || seen.has(t)) continue
    if (/^\d+$/.test(t)) continue
    seen.add(t); uniq.push(t)
  }
  return uniq
    .map((t) => ({ t, s: tokenScore(t) }))
    .sort((a, b) => b.s - a.s)
    .filter((x) => x.s > 0)          // drop net-generic tokens entirely
    .slice(0, max)
    .map((x) => x.t)
}

const SENSITIVE_RE = /\b(secret|secrets|password|passwords|credential|credentials|api[\s-]?key|private key|token|pii|phi|ssn|card|cardholder|production|prod\b|root|admin|database|encryption|mfa|2fa)\b/i
const FORBID_RE = /\b(?:must\s+not|must\s+never|shall\s+not|should\s+not|may\s+not|cannot|can\s*not|never|do\s*not|don'?t|doesn'?t|prohibit(?:ed)?|forbidden|disallow(?:ed)?|not\s+(?:be\s+)?(?:allowed|permitted|used)|no\s+[\w-]+\s+(?:is|are)\s+(?:allowed|permitted))\b/i
const REQUIRE_RE = /\b(?:must|shall|require[sd]?|required\s+to|has\s+to|have\s+to|always|ensure(?:s|d)?|enforce(?:s|d)?|mandat(?:e|ory|ed))\b/i

// Is this line a heading? (markdown #, numbered "4.2 Secrets", or a short
// Title/UPPER case line with no terminal period.)
function headingOf(line) {
  const t = line.trim()
  if (!t) return null
  const md = t.match(/^#{1,6}\s+(.{2,120})$/); if (md) return md[1].trim()
  if (t.length <= 80 && !/[.:;,]$/.test(t)) {
    if (/^(\d+(?:\.\d+)*)[.)]?\s+\S/.test(t)) return t.replace(/\s{2,}/g, ' ')
    const letters = t.replace(/[^A-Za-z]/g, '')
    if (letters.length >= 3 && letters === letters.toUpperCase()) return t
  }
  return null
}

// Extract first-draft rules from a written policy. Deterministic, bounded.
// The admin ALWAYS reviews/edits these before arming (human in the loop), so this
// aims for good recall of imperative security statements, not perfect precision.
export function extractRulesHeuristic(text, docName = '') {
  const doc = clampStr(docName, 160)
  const src = String(text || '').replace(/\r\n?/g, '\n')
  const lines = src.split('\n')
  const rules = []
  let section = ''
  const pushUnique = (rule) => {
    const key = rule.kind + '|' + rule.pattern.toLowerCase()
    if (rules.some((r) => (r.kind + '|' + r.pattern.toLowerCase()) === key)) return
    rules.push(rule)
  }
  for (const line of lines) {
    const h = headingOf(line); if (h) { section = h.slice(0, 160); continue }
    // Split a line into sentences/clauses so one bullet with two rules is caught.
    const clauses = line.split(/(?<=[.;])\s+|\s+[-•]\s+|\s{2,}/).map((c) => c.trim()).filter((c) => c.length >= 8)
    for (const clause of clauses) {
      if (clause.length > 400) continue
      const isForbid = FORBID_RE.test(clause)
      const isRequire = !isForbid && REQUIRE_RE.test(clause)
      if (!isForbid && !isRequire) continue
      const kw = keywordsFrom(clause, 3)
      if (!kw.length) continue
      const severity = SENSITIVE_RE.test(clause) ? 'critical' : 'high'
      const title = clause.replace(/\s+/g, ' ').slice(0, 120)
      const rationale = clause.replace(/\s+/g, ' ').slice(0, 400)
      if (isForbid) {
        // Forbid: the most specific term (+ a second only if it is also specific),
        // so the match is tight and does not fire on generic words.
        const ft = forbidTerms(clause)
        if (!ft.length) continue
        pushUnique(normalizeRule({
          kind: 'forbid', title, pattern: ft.join(', '),
          severity, doc, section, rationale,
        }, rules.length))
      } else {
        // Require: context = the topic (so it is only checked on-topic); pattern =
        // the same draft terms. The admin edits the pattern to the exact required
        // practice on review (the heuristic can't reliably separate the two).
        pushUnique(normalizeRule({
          kind: 'require', title, pattern: kw.join(', '), context: kw.slice(0, 2).join(', '),
          severity, doc, section, rationale,
        }, rules.length))
      }
      if (rules.length >= 200) return rules
    }
  }
  return rules
}

// --- AI-assisted extraction (primary path; heuristic is the floor) ---------
export function extractRulesSystem() {
  return [
    'You convert a company\'s WRITTEN security / IT policy into a precise, machine-enforceable JSON ruleset for a guidance gate.',
    'Read the policy text. Emit ONLY rules that express a security PRACTICE the company requires or forbids in how work is done (e.g. "secrets must be stored in a vault", "never use FTP", "production access requires MFA"). Ignore prose that is background, scope, definitions, or legal boilerplate.',
    'Each rule is an object:',
    '  "kind": "forbid" | "require"',
    '  "title": a short human label (<= 90 chars)',
    '  "pattern": the thing to detect in generated guidance - comma-separated keywords/phrases, OR a /regex/. For "forbid" this is the prohibited practice (e.g. "ftp, plaintext password, http://"). For "require" this is the practice that MUST appear (e.g. "mfa, multi-factor, 2fa").',
    '  "context": (REQUIRE rules only) keywords that say WHEN the requirement is relevant, so it is only checked on-topic (e.g. for an MFA-on-prod rule: "production, prod, deploy, login"). Omit for forbid.',
    '  "severity": "critical" | "high" | "medium" | "low" (critical for secrets/credentials/production/PII).',
    '  "section": the heading/section in the policy this came from (quote it).',
    '  "rationale": one sentence on why, drawn from the policy.',
    '  "guidance": the compliant alternative to recommend instead (<= 220 chars).',
    'Be precise and conservative: a wrong forbid pattern creates false alarms. Prefer specific keywords over broad ones. Max 120 rules.',
    'Return STRICT JSON only: {"rules":[ ... ]}. No prose, no code fence.',
  ].join('\n')
}
export function extractRulesUser(text, docName) {
  return `POLICY DOCUMENT${docName ? ` ("${docName}")` : ''}:\n"""\n${String(text || '').slice(0, 24000)}\n"""`
}

// Run the AI extraction, then UNION with the deterministic heuristic so we never
// return fewer rules than the floor and never silently come back empty. Returns
// { rules, source: 'ai'|'heuristic'|'both', note }.
export async function extractRulesAI(ai, cfg, text, docName = '') {
  const floor = extractRulesHeuristic(text, docName)
  let aiRules = []
  let ok = false
  try {
    const raw = await ai.generate(cfg, extractRulesSystem(), extractRulesUser(text, docName))
    const a = String(raw).indexOf('{'), z = String(raw).lastIndexOf('}')
    if (a >= 0 && z > a) {
      const parsed = JSON.parse(String(raw).slice(a, z + 1))
      if (parsed && Array.isArray(parsed.rules)) {
        aiRules = parsed.rules.slice(0, 120)
          .map((r, i) => normalizeRule({ ...r, doc: clampStr(docName, 160) }, i))
          .filter((r) => r.pattern && compileRule(r))   // keep only enforceable ones
        ok = aiRules.length > 0
      }
    }
  } catch { ok = false }
  if (!ok) return { rules: floor, source: 'heuristic', note: 'AI extraction was unavailable; rules were derived deterministically from the policy text. Review them before arming.' }
  // Merge: AI rules first, then any heuristic rule whose pattern the AI missed.
  const have = new Set(aiRules.map((r) => r.kind + '|' + r.pattern.toLowerCase()))
  const extra = floor.filter((r) => !have.has(r.kind + '|' + r.pattern.toLowerCase()))
  const merged = aiRules.concat(extra).slice(0, 200)
  return { rules: merged, source: extra.length ? 'both' : 'ai', note: 'Review and edit before arming. Patterns are matched case-insensitively against the generated steps.' }
}

// Public summary of a ruleset for records/UI (no compiled internals).
export function ruleSummary(rules) {
  const list = Array.isArray(rules) ? rules : []
  let forbid = 0, require = 0, enabled = 0
  for (const r of list) { if (r.kind === 'require') require++; else forbid++; if (r.enabled !== false) enabled++ }
  return { total: list.length, forbid, require, enabled }
}
