// WorkCoPilot sensitive-data scrubber (DLP).
//
// MANDATORY privacy control: redacts PII / PHI / secrets / private network
// identifiers from TEXT so they never leave the user's device to our server or
// to any AI provider. The AI receives only what is needed to give the steps,
// with each sensitive VALUE replaced by a typed placeholder ([EMAIL], [IP],
// [SSN], ...) so the structure of the task is preserved and guidance quality is
// kept (the model still knows "there is an IP / an email here").
//
// It runs on BOTH sides (single source of truth): the client scrubs before it
// transmits (so raw data never leaves the browser/app), and the server scrubs
// again as defense in depth. Nothing is ever silently dropped - the caller gets
// a count of what was redacted so it can be surfaced to the operator.
//
// What it EXCLUDES: secrets & passwords (keys, tokens, labelled secrets, URLs
// with credentials), SSN/SIN/national ids, credit cards (Luhn), IBAN, bank
// account & routing numbers, emails, phone numbers, IP addresses (v4 + v6),
// private/internal domain names & hosts, and labelled PII/PHI (DOB, MRN,
// patient/member/policy/account ids, driver licence, passport, tax id, street
// address, postal code).
//
// What it KEEPS (so guidance still works): public product domains (aws.amazon
// .com, github.com, ...), file paths, commands, CIDR-less hostnames of public
// services, version numbers.
//
// Scope: TEXT only. Screenshots are images; on-device visual redaction (OCR +
// masking of a frame) is a separate control for the installed apps.

// Luhn so we only redact digit runs that are really card numbers.
function luhnValid(digits) {
  let sum = 0, alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (d < 0 || d > 9) return false
    if (alt) { d *= 2; if (d > 9) d -= 9 }
    sum += d; alt = !alt
  }
  return sum % 10 === 0
}

// A valid dotted-quad where every octet is 0-255 (so version strings like
// 1.2.3.4 that happen to look similar are still caught as IPs only when the
// octets are in range - an acceptable, privacy-first trade since 4-part dotted
// numbers in work text are overwhelmingly IPs; we additionally skip ones that
// are clearly version strings via a leading "v"/"version" guard at call time).
function validIpv4(s) {
  const p = s.split('.')
  if (p.length !== 4) return false
  return p.every((o) => { const n = Number(o); return o.length >= 1 && o.length <= 3 && n >= 0 && n <= 255 })
}

const RULES = [
  // --- secrets / credentials -------------------------------------------------
  // PEM private key blocks (RSA/EC/OpenSSH/DSA/PGP).
  { type: 'private_key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, tag: '[PRIVATE_KEY]' },
  // URLs that embed credentials: scheme://user:pass@host
  { type: 'secret', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@[^\s]+/gi, tag: '[URL_WITH_CREDENTIALS]' },
  // Well-known token formats.
  { type: 'secret', re: /\b[sprk]k_(?:live|test)_[A-Za-z0-9]{10,}\b/g, tag: '[SECRET]' },               // Stripe-style
  { type: 'secret', re: /\bAKIA[0-9A-Z]{16}\b/g, tag: '[AWS_KEY]' },                                    // AWS access key id
  { type: 'secret', re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g, tag: '[TOKEN]' },  // GitHub tokens/PATs
  { type: 'secret', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, tag: '[TOKEN]' },                          // Slack
  { type: 'secret', re: /\bAIza[0-9A-Za-z_-]{30,}\b/g, tag: '[API_KEY]' },                              // Google API key
  { type: 'secret', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, tag: '[JWT]' }, // JWT
  // Labelled secrets/passwords: keep the label, redact the value.
  { type: 'secret', re: /\b(pass(?:word|wd|phrase)?|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|bearer|auth[_-]?token)\b([\s:=]+["']?)([^\s"',;]{4,})(["']?)/gi, tag: (m, p1, p2, _v, p4) => `${p1}${p2}[REDACTED]${p4}` },

  // --- labelled PII / PHI. Two shapes to catch real data without eating prose:
  //   (a) label + a real delimiter (: = # -) + value   e.g. "DOB: 01/02/1990"
  //   (b) label + whitespace + a VALUE THAT STARTS WITH A DIGIT   e.g. "MRN 12345678"
  // Prose like "the account number is important" matches neither (no delimiter,
  // and "is" is not digit-led), so it is left alone.
  { type: 'phi', re: /\b(d\.?o\.?b\.?|date of birth|born on|mrn|medical record(?:\s*(?:no|number|#))?|patient(?:\s*(?:id|no|number|#))?|member(?:\s*(?:id|no|number|#))?|policy(?:\s*(?:no|number|#))?)(\s*[:#=-]\s*)([^\n;,]{2,60})/gi, tag: (m, p1, p2) => `${p1}${p2}[REDACTED]` },
  { type: 'phi', re: /\b(mrn|patient(?:\s*(?:id|no|number|#))?|member(?:\s*(?:id|no|number|#))?|policy(?:\s*(?:no|number|#))?)(\s+)((?=[\w-]*\d)[A-Za-z0-9][\w-]{3,})\b/gi, tag: (m, p1, p2) => `${p1}${p2}[REDACTED]` },
  { type: 'pii', re: /\b(account(?:\s*(?:no|number|#))?|acct|routing(?:\s*(?:no|number|#))?|swift|bic|driver'?s?\s*licen[sc]e(?:\s*(?:no|number|#))?|licen[sc]e(?:\s*(?:no|number|#))?|passport(?:\s*(?:no|number|#))?|national\s*id|tax\s*id|ein|tin|ssn|sin|address|addr|zip(?:\s*code)?|postal\s*code)(\s*[:#=-]\s*)([^\n;,]{2,60})/gi, tag: (m, p1, p2) => `${p1}${p2}[REDACTED]` },
  { type: 'pii', re: /\b(account(?:\s*(?:no|number|#))?|acct|routing(?:\s*(?:no|number|#))?|passport(?:\s*(?:no|number|#))?|licen[sc]e(?:\s*(?:no|number|#))?)(\s+)((?=[\w-]*\d)[A-Za-z0-9][\w-]{3,})\b/gi, tag: (m, p1, p2) => `${p1}${p2}[REDACTED]` },

  // --- structured identifiers (unlabelled) ----------------------------------
  { type: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g, tag: '[SSN]' },
  { type: 'iban', re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g, tag: '[IBAN]' },
  { type: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, tag: '[EMAIL]' },
  { type: 'phone', re: /(?<![\w.])(?:\+?\d{1,3}[\s.-])?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?![\w.])/g, tag: '[PHONE]' },

  // --- network identifiers ---------------------------------------------------
  // Private / internal domain names and hosts (public product domains are kept).
  { type: 'private_host', re: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:local|internal|intranet|corp|lan|home|test|localdomain|priv|private)\b/gi, tag: '[HOST]' },
  // IPv6 (full/compressed, at least two groups).
  { type: 'ip', re: /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi, tag: '[IP]' },
]

// Run the redaction rules over `text`. `active` is a Set of internal rule types
// to apply, or null to apply ALL (the default, legacy behavior). `counts` is
// mutated with per-type tallies.
function applyRules(text, counts, active) {
  const bump = (t, n = 1) => { counts[t] = (counts[t] || 0) + n }
  const on = (t) => !active || active.has(t)

  // Credit cards first (before phone, whose separators overlap).
  if (on('card')) text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => {
    const digits = m.replace(/[ -]/g, '')
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) { bump('card'); return '[CARD]' }
    return m
  })

  for (const r of RULES) {
    if (!on(r.type)) continue
    text = text.replace(r.re, (...args) => {
      bump(r.type)
      return typeof r.tag === 'function' ? r.tag(...args) : r.tag
    })
  }

  // IPv4 last: redact valid dotted-quads, but not version strings or longer runs.
  if (on('ip')) text = text.replace(/(v(?:ersion)?[\s.]?)?\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b(\.\d)?/gi, (m, vguard, ip, trailing) => {
    if (vguard || trailing) return m
    if (!validIpv4(ip)) return m
    bump('ip'); return '[IP]'
  })
  return text
}

// Returns { clean, counts: {type: n}, total }. Safe on any input. Applies ALL
// rules - the default control used everywhere a boolean scrub is on.
export function scrubSensitive(input) {
  let text = String(input == null ? '' : input)
  const counts = {}
  if (!text) return { clean: '', counts, total: 0 }
  text = applyRules(text, counts, null)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { clean: text, counts, total }
}

// Coarse policy categories -> the internal rule types each one controls.
const CATEGORY_TYPES = {
  secrets: ['private_key', 'secret'], credentials: ['secret'],
  phi: ['phi'], dob: ['phi'], pii: ['pii'], account: ['pii'],
  ssn: ['ssn'], iban: ['iban'], card: ['card'],
  email: ['email'], phone: ['phone'], ip: ['ip'], host: ['private_host'],
}
// The categories an operator policy can set an action for.
export const POLICY_CATEGORIES = ['secrets', 'phi', 'pii', 'ip', 'host', 'email', 'phone', 'card', 'ssn', 'iban']

// Escape a user-supplied block word for use in a regex.
function reEscape(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

// Apply an armed governance policy to text: the free-flow block words first
// (always removed, never sent, never guessed), then the detectors for every
// category whose action is NOT "send". mask/withhold/tokenize all REDACT here;
// true on-device tokenize+rehydrate is a separate (client) control. Returns
// { clean, counts, blocked, total }.
export function scrubWithPolicy(input, policy) {
  let text = String(input == null ? '' : input)
  const counts = {}
  if (!text) return { clean: '', counts, blocked: 0, total: 0 }
  let blocked = 0
  const words = Array.isArray(policy && policy.blockWords) ? policy.blockWords : []
  for (const w of words) {
    const word = String(w || '').trim()
    if (word.length < 2) continue
    try {
      const re = new RegExp('(^|[^\\w])(' + reEscape(word) + ')(?=[^\\w]|$)', 'gi')
      text = text.replace(re, (m, pre) => { blocked++; return pre + '[BLOCKED]' })
    } catch (_) { /* skip a word that will not compile */ }
  }
  // Build the set of internal types to redact from the policy categories.
  const cats = (policy && policy.categories) || {}
  const active = new Set()
  for (const [cat, action] of Object.entries(cats)) {
    if (action && action !== 'send' && CATEGORY_TYPES[cat]) for (const t of CATEGORY_TYPES[cat]) active.add(t)
  }
  // A policy with no categories set behaves like a full scrub (safe default).
  const hasAny = Object.keys(cats).length > 0
  text = applyRules(text, counts, hasAny ? active : null)
  const total = Object.values(counts).reduce((a, b) => a + b, 0) + blocked
  if (blocked) counts.blocked = blocked
  return { clean: text, counts, blocked, total }
}

export function scrub(input) {
  return scrubSensitive(input).clean
}

// A short, human one-liner describing what was redacted, for the operator.
export function redactionSummary(counts) {
  const label = { private_key: 'private key', secret: 'secret', ssn: 'SSN', card: 'card number', iban: 'IBAN', email: 'email', phone: 'phone number', ip: 'IP address', private_host: 'private host', phi: 'PHI field', pii: 'personal detail' }
  const parts = Object.entries(counts || {})
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${label[t] || t.replace(/_/g, ' ')}${n > 1 ? 's' : ''}`)
  if (!parts.length) return ''
  return `Stripped on your device before sending: ${parts.join(', ')}.`
}
