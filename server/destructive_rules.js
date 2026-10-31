// ===========================================================================
// Destructive-step rules: the ONE table of command patterns that would
// irreversibly delete, overwrite or disrupt, each with a stable reason CODE.
//
// Pure data plus pure functions, no Node APIs, so the SPA imports it too (the
// same way it imports server/edition_registry.js). The server sends a step's
// reason as { code, params } and the client renders the code through i18n
// (destructiveGate.reason.<code>) in the reader's language. The English phrase
// (`en`) is kept only for the English project report document and to read
// sessions saved before codes existed (they carry the English phrase alone).
//
// Conservative patterns; a false positive only adds a confirm.
// ===========================================================================

export const DESTRUCTIVE_RULES = Object.freeze([
  { code: 'deleteFiles', re: /\brm\s+-[a-z]*f|\brm\s+-[a-z]*r[a-z]*\b/i, en: 'permanently deletes files and cannot be undone' },
  { code: 'forceDelete', re: /\brmdir\s+\/s|\bdel\s+\/[fsqa]/i, en: 'force-deletes files' },
  { code: 'dropDbObject', re: /\bdrop\s+(table|database|schema|collection|index)\b/i, en: 'drops a database object' },
  { code: 'emptyTable', re: /\btruncate\s+table\b/i, en: 'empties a table' },
  { code: 'deleteAllRows', re: /\bdelete\s+from\b(?![\s\S]*\bwhere\b)/i, en: 'deletes every row (no WHERE clause)' },
  { code: 'overwriteDisk', re: /\b(mkfs|fdisk)\b|\bformat\s+[a-z]:|\bdd\s+if=\S+\s+of=\/dev/i, en: 'formats or overwrites a disk' },
  { code: 'rewriteGitHistory', re: /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|push\s+(--force\b|-f\b))/i, en: 'discards or force-overwrites git history' },
  { code: 'shutdown', re: /\b(shutdown|reboot|halt|poweroff)\b/i, en: 'shuts down or reboots the machine' },
  { code: 'killProcesses', re: /\b(kill\s+-9|pkill|killall)\b/i, en: 'force-kills running processes' },
  { code: 'teardownInfra', re: /terraform\s+destroy|kubectl\s+delete\b|docker\s+(system\s+prune\s+-a|rm\s+-f)|aws\s+s3\s+rb\b[\s\S]*--force/i, en: 'tears down infrastructure or resources' },
  { code: 'recursivePermissions', re: /\bchmod\s+-R\b|\bchown\s+-R\b/i, en: 'recursively changes permissions or ownership' },
])

// Every code a client may receive. 'unknown' is what a client shows for a
// destructive step whose code it cannot read (a newer server, a damaged record).
export const DESTRUCTIVE_CODES = Object.freeze([...DESTRUCTIVE_RULES.map((r) => r.code), 'unknown'])

const MAX_MATCH = 60

// Commands + code block -> { destructive, code, params, why }. params.match is
// the flagged part of the command (shown as code, never translated); why is the
// English phrase for the English report.
export function classifyDestructive(commands, code) {
  const text = [...(Array.isArray(commands) ? commands : []), (code && code.content) || ''].join('\n')
  if (!text.trim()) return { destructive: false, code: null, params: null, why: null }
  for (const r of DESTRUCTIVE_RULES) {
    const m = r.re.exec(text)
    if (m) return { destructive: true, code: r.code, params: { match: String(m[0]).trim().slice(0, MAX_MATCH) }, why: r.en }
  }
  return { destructive: false, code: null, params: null, why: null }
}

// A stored step -> its reason { code, params }, or null when the step is not
// destructive. Reads the code a current server stored, else maps the English
// phrase an older session stored, else 'unknown'.
export function destructiveReasonOf(step) {
  if (!step || !step.destructive) return null
  const r = step.destructiveReason
  if (r && typeof r === 'object' && DESTRUCTIVE_CODES.includes(r.code)) {
    const match = r.params && typeof r.params.match === 'string' ? r.params.match.slice(0, MAX_MATCH) : ''
    return { code: r.code, params: match ? { match } : {} }
  }
  const legacy = DESTRUCTIVE_RULES.find((x) => x.en === String(step.destructiveWhy || ''))
  return { code: legacy ? legacy.code : 'unknown', params: {} }
}

// A step about to be stored -> the same step with its destructive flag and
// reason derived from ITS OWN commands and code (never trusted from the caller),
// so every way a step is saved keeps the gate. Non-destructive steps are
// returned unchanged.
export function withDestructive(step) {
  if (!step || typeof step !== 'object') return step
  const dc = classifyDestructive(step.commands, step.code)
  if (!dc.destructive) {
    if (!('destructive' in step) && !('destructiveReason' in step)) return step
    const { destructive, destructiveReason, destructiveWhy, ...rest } = step
    return rest
  }
  return { ...step, destructive: true, destructiveReason: { code: dc.code, params: dc.params } }
}

// The English phrase for a stored step (English project report), or null.
export function destructiveEnglish(step) {
  const r = destructiveReasonOf(step)
  if (!r) return null
  const rule = DESTRUCTIVE_RULES.find((x) => x.code === r.code)
  return rule ? rule.en : (step.destructiveWhy ? String(step.destructiveWhy) : null)
}

export default { DESTRUCTIVE_RULES, DESTRUCTIVE_CODES, classifyDestructive, destructiveReasonOf, destructiveEnglish }
