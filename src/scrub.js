// Client-side DLP. When ENABLED for this user (superadmin policy, off by
// default), it strips PII / PHI / secrets / network identifiers from text
// BEFORE it leaves the browser or installed app, so raw sensitive data never
// reaches our server or any AI provider. Uses the SAME scrubber as the server
// (single source of truth); the server scrubs again as defense in depth.
import { scrubSensitive } from '../server/work-scrub.js'

let enabled = false
// Set from /api/work/me (the user's superadmin-controlled `scrub` flag).
export function setScrubEnabled(v) { enabled = !!v }
export function isScrubEnabled() { return enabled }

// Gated scrub: only redacts when enabled; otherwise returns the text unchanged
// so guidance quality is untouched for users without the policy.
export function clean(s) {
  const str = s == null ? '' : String(s)
  return enabled ? scrubSensitive(str).clean : str
}
// Ungated scrub (always redact) - for the public coverage widget where there is
// no per-user policy to consult and scrubbing a public input is a safe default.
export function cleanAlways(s) {
  return scrubSensitive(String(s == null ? '' : s)).clean
}
export { scrubSensitive }
