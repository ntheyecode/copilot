// extraction_watch.js - IP-04: detect and ALERT on bulk extraction / scripted
// abuse of the AI-generation endpoints. Alert-only by design: it never blocks a
// request (the daily task cap already bounds real resource use, and blocking
// would risk degrading a legitimate power user - SUPREME RULE VI). This raises a
// superadmin signal when one user fires an abnormal BURST of discrete generation
// calls, which is what automated response-harvesting / model-extraction looks
// like. The continuous watch loop is deliberately NOT counted here.
//
// State is in-memory (per process). That is fine: the thing we persist is the
// incident it records; the rolling counters are a transient alerting aid and may
// reset on restart without losing anything that matters.

const WINDOW_MS = 60 * 1000          // rolling window
const ALERT_THRESHOLD = 30           // discrete generation calls within the window
const COOLDOWN_MS = 10 * 60 * 1000   // at most one alert per user per 10 min
const MAX_USERS = 5000               // bound the map

const hits = new Map()               // userId -> number[] (timestamps)
const lastAlert = new Map()          // userId -> ts of last alert

// Record one discrete generation call for a user. Returns an alert descriptor
// {count, windowS} when the burst threshold is crossed and the cooldown allows,
// otherwise null. The caller records the superadmin incident (so this module
// stays free of store/db dependencies and is trivially testable).
export function noteGeneration(userId) {
  if (!userId) return null
  const now = Date.now()
  let arr = hits.get(userId)
  if (!arr) {
    if (hits.size >= MAX_USERS) {
      // Evict the oldest-tracked user to keep the map bounded.
      const firstKey = hits.keys().next().value
      if (firstKey !== undefined) { hits.delete(firstKey); lastAlert.delete(firstKey) }
    }
    arr = []
    hits.set(userId, arr)
  }
  // Drop timestamps outside the window, then add this one.
  const cutoff = now - WINDOW_MS
  let i = 0
  while (i < arr.length && arr[i] < cutoff) i++
  if (i > 0) arr.splice(0, i)
  arr.push(now)

  if (arr.length < ALERT_THRESHOLD) return null
  const prev = lastAlert.get(userId) || 0
  if (now - prev < COOLDOWN_MS) return null
  lastAlert.set(userId, now)
  return { count: arr.length, windowS: Math.round(WINDOW_MS / 1000) }
}

// Testing helper: clear all in-memory state.
export function _reset() { hits.clear(); lastAlert.clear() }

export default { noteGeneration, _reset }
