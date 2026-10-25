// Client-side DLP. Uses the SAME engine as the server (single source of truth).
//
// Three modes, decided by the user's effective governance policy from /me:
//  - no policy, scrub flag on -> scrubSensitive (strip before sending)
//  - armed policy, mode "scrub" -> scrubWithPolicy (per-category + block words)
//  - armed policy, mode "tokenize" -> replace sensitive values with device-only
//    tokens before sending, then REHYDRATE them back into responses on-device,
//    so the model never sees the values but the user still gets a full answer.
// The token->value map lives ONLY here, in memory, and never leaves the device.
import { scrubSensitive, scrubWithPolicy, tokenizeSensitive, rehydrate } from '../server/work-scrub.js'

let enabled = false
let govPolicy = null         // effective policy {armed, mode, categories, blockWords}
const tokenMap = {}          // session token -> value, device-only

export function setScrubEnabled(v) { enabled = !!v }
export function isScrubEnabled() { return enabled }
// Set from /api/work/me (the user's effective, armed governance policy or null).
export function setGovPolicy(p) { govPolicy = (p && p.armed) ? p : null }
export function isTokenizeMode() { return !!(govPolicy && govPolicy.mode === 'tokenize') }
// True when ANY data-protection control is active (an armed governance policy or
// the legacy on/off scrub). Used to decide whether to redact outbound screen
// frames on-device, so screen protection follows the same switch as text.
export function isDlpActive() { return !!govPolicy || enabled }
export function activePolicy() { return govPolicy }
export function resetTokenMap() { for (const k of Object.keys(tokenMap)) delete tokenMap[k] }

// Gated clean of outbound text: tokenize (reversible) or scrub per the policy;
// otherwise the legacy on/off scrub; otherwise untouched.
export function clean(s) {
  const str = s == null ? '' : String(s)
  if (govPolicy) {
    if (govPolicy.mode === 'tokenize') return tokenizeSensitive(str, { policy: govPolicy, map: tokenMap }).clean
    return scrubWithPolicy(str, govPolicy).clean
  }
  return enabled ? scrubSensitive(str).clean : str
}
// Ungated scrub (always redact) - for the public coverage widget.
export function cleanAlways(s) { return scrubSensitive(String(s == null ? '' : s)).clean }

// Clean for PERSISTENT storage (skills / playbooks). Same engine and policy as
// clean(), but it ALWAYS REDACTS - never reversible device-only tokens - because
// a stored skill is shared and never rehydrated, so a [[TOKEN]] would be a dead
// placeholder. With an armed policy it honors the per-category actions + block
// words; with the legacy scrub on it full-scrubs; with neither it passes through
// (the server then applies the mandatory full-scrub floor on write).
export function cleanForStore(s) {
  const str = s == null ? '' : String(s)
  if (govPolicy) return scrubWithPolicy(str, govPolicy).clean
  return enabled ? scrubSensitive(str).clean : str
}

// Rehydrate a response on-device: substitute the token map back so the user sees
// the full answer. Deep-walks objects/arrays; only our tokens are replaced, so
// it is a no-op when not in tokenize mode or nothing was tokenized.
export function rehydrateDeep(v) {
  if (!isTokenizeMode() || !Object.keys(tokenMap).length) return v
  if (typeof v === 'string') return rehydrate(v, tokenMap)
  if (Array.isArray(v)) return v.map(rehydrateDeep)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = rehydrateDeep(v[k]); return o }
  return v
}
export { scrubSensitive }
