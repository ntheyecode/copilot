// WorkCoPilot sensitive-data scrubber.
//
// Redacts PII / PHI / secrets from TEXT before it is sent to any AI provider,
// so the person's private data does not leave in prompts. Conservative by
// design: it redacts clearly-sensitive VALUES (private keys, API tokens,
// labelled secrets, SSNs, credit cards, emails, phone numbers) and does NOT
// touch operational technical data (IPs, hostnames, file paths, commands,
// CIDRs, version numbers), so guidance quality is never degraded
// (SUPREME RULE VI). Nothing is ever silently dropped: the caller gets a count
// of what was redacted so it can be surfaced to the operator (SUPREME RULE III).
//
// Scope: this scrubs TEXT (the goal, questions, pasted content, uploaded
// document text, research notes). Screenshots are images and are not
// text-redacted here; visual redaction (OCR + blur of a frame) is a separate,
// heavier capability and is tracked as a follow-up.

// Luhn check so we only redact digit runs that are really card numbers, not
// any 13-19 digit id (order numbers, serials, etc.).
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

// Each rule: a type (for the count), a regex, and a replacement tag (string, or
// a function of the match for labelled secrets where we keep the label).
const RULES = [
  // PEM private key blocks (RSA/EC/OpenSSH/DSA/PGP).
  { type: 'private_key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, tag: '[PRIVATE_KEY]' },
  // Well-known token formats.
  { type: 'secret', re: /\b[sprk]k_(?:live|test)_[A-Za-z0-9]{10,}\b/g, tag: '[SECRET]' },               // Stripe-style keys
  { type: 'secret', re: /\bAKIA[0-9A-Z]{16}\b/g, tag: '[AWS_KEY]' },                                    // AWS access key id
  { type: 'secret', re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g, tag: '[TOKEN]' },  // GitHub tokens / PATs
  { type: 'secret', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, tag: '[TOKEN]' },                          // Slack tokens
  { type: 'secret', re: /\bAIza[0-9A-Za-z_-]{30,}\b/g, tag: '[API_KEY]' },                              // Google API key
  { type: 'secret', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, tag: '[JWT]' }, // JWT
  // Labelled secrets: password=..., api_key: "...", bearer ... - keep the label, redact the value.
  { type: 'secret', re: /\b(pass(?:word|wd)?|secret|api[_-]?key|access[_-]?token|client[_-]?secret|bearer)\b([\s:=]+["']?)([^\s"',;]{6,})(["']?)/gi, tag: (m, p1, p2, _v, p4) => `${p1}${p2}[REDACTED]${p4}` },
  // US Social Security number.
  { type: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g, tag: '[SSN]' },
  // Email address.
  { type: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, tag: '[EMAIL]' },
  // Phone number - require phone-like separators so we do not redact plain ids.
  { type: 'phone', re: /(?<![\w.])(?:\+?\d{1,3}[\s.-])?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?![\w.])/g, tag: '[PHONE]' },
]

// Returns { clean, counts: {type: n}, total }. Safe on any input.
export function scrubSensitive(input) {
  let text = String(input == null ? '' : input)
  const counts = {}
  if (!text) return { clean: '', counts, total: 0 }
  const bump = (t, n = 1) => { counts[t] = (counts[t] || 0) + n }

  // Credit cards first (before phone, whose separators overlap): 13-19 digits
  // with optional spaces/dashes, kept only when Luhn-valid.
  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => {
    const digits = m.replace(/[ -]/g, '')
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) { bump('card'); return '[CARD]' }
    return m
  })

  for (const r of RULES) {
    text = text.replace(r.re, (...args) => {
      bump(r.type)
      return typeof r.tag === 'function' ? r.tag(...args) : r.tag
    })
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { clean: text, counts, total }
}

// Convenience: scrub and return just the clean string (for call sites that do
// not need the counts). Use scrubSensitive when you want to surface what was
// redacted.
export function scrub(input) {
  return scrubSensitive(input).clean
}

// A short, human one-liner describing what was redacted, for the operator.
// Empty string when nothing was redacted.
export function redactionSummary(counts) {
  const parts = Object.entries(counts || {})
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${t.replace(/_/g, ' ')}${n > 1 ? 's' : ''}`)
  if (!parts.length) return ''
  return `Redacted before sending to AI: ${parts.join(', ')}.`
}
