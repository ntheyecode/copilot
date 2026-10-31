// ===========================================================================
// WorkCoPilot MFA STEP-UP policy: the ONE rule for when a sensitive action needs
// a fresh authenticator code. On the HOSTED service, with MFA globally on, an
// account that has MFA enrolled must enter a current code; on-premise (the
// operator owns the box) and for accounts without MFA it is not asked.
//
// Wrong codes are counted per account (one process-wide counter shared by every
// step-up in the app, so the export passphrase and API keys cannot be guessed in
// parallel): after MAX_FAILURES wrong codes in WINDOW_MS the account is locked out
// of step-up actions until the window passes (429 STEP_UP_LOCKED), so a stolen
// session cannot brute-force the 6-digit code.
//
// Extracted from export_key.js so the executive export passphrase and the company
// API keys share one policy instead of two copies (SUPREME RULE II). Pure and
// dependency-injected, so it is unit-tested without the store.
// ===========================================================================

export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60 * 1000
const MAX_TRACKED = 10000

const sharedFailures = new Map()   // userId -> { count, first }

function err(status, message, code) { const e = new Error(message); e.status = status; if (code) e.code = code; return e }

// deps: { verifyMfa(user, token)->bool, hosted:boolean, mfaGloballyEnabled():boolean,
//         onFailure?(user, { locked }), clock?, failures? (Map, tests only) }
export function makeMfaStepUp({ verifyMfa, hosted, mfaGloballyEnabled, onFailure = () => {}, clock = Date.now, failures = sharedFailures }) {
  function stepUpNeeded(user) {
    if (!hosted) return false
    if (!mfaGloballyEnabled()) return false
    return !!(user && user.mfa && user.mfa.enabled)
  }
  const keyOf = (user) => String((user && (user.id || user.username)) || '')
  function current(k) {
    const f = failures.get(k)
    if (f && clock() - f.first > WINDOW_MS) { failures.delete(k); return null }
    return f || null
  }
  // Throws 401 (with `code`) unless the step-up is not needed or the token
  // verifies; 429 STEP_UP_LOCKED once too many wrong codes were entered.
  function assertStepUp(user, token, { message = 'Enter a current authenticator code to continue.', code = 'STEP_UP_REQUIRED' } = {}) {
    if (!stepUpNeeded(user)) return
    const k = keyOf(user)
    const f = current(k)
    if (f && f.count >= MAX_FAILURES) {
      const mins = Math.max(1, Math.ceil((WINDOW_MS - (clock() - f.first)) / 60000))
      throw err(429, `Too many wrong authenticator codes. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, 'STEP_UP_LOCKED')
    }
    if (!token) throw err(401, message, code)
    if (verifyMfa(user, String(token))) { failures.delete(k); return }
    const next = f ? { count: f.count + 1, first: f.first } : { count: 1, first: clock() }
    if (!f && failures.size >= MAX_TRACKED) failures.delete(failures.keys().next().value)
    failures.set(k, next)
    try { onFailure(user, { locked: next.count >= MAX_FAILURES }) } catch { /* never block on audit */ }
    throw err(401, message, code)
  }
  return { stepUpNeeded, assertStepUp }
}

export default { makeMfaStepUp, MAX_FAILURES, WINDOW_MS }
