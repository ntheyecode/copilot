// ===========================================================================
// WorkCoPilot integration API: per-principal rate limiting (token bucket).
//
// Pure and clock-injected so it is unit-tested without timers. Each key gets a
// bucket of `capacity` tokens refilled at `perMinute / 60` tokens a second; a
// request takes one token, and an empty bucket answers with the seconds until
// the next token (the Retry-After value). The map is bounded: idle buckets are
// evicted, so a flood of distinct keys can never grow memory without limit.
//
// In-memory per process by design (a restart refills buckets, which is the safe
// direction). A multi-node deployment would move this behind a shared store.
// ===========================================================================

export function createRateLimiter({ perMinute = 120, burst = null, maxBuckets = 20000, clock = Date.now } = {}) {
  const rate = Math.max(1, Number(perMinute) || 120) / 60000      // tokens per ms
  const capacity = Math.max(1, Number(burst) || Number(perMinute) || 120)
  const buckets = new Map()

  function evict(t) {
    // Drop buckets that have refilled completely (idle); oldest first if still full.
    for (const [k, b] of buckets) {
      if (buckets.size < maxBuckets) break
      if (b.tokens + (t - b.at) * rate >= capacity) buckets.delete(k)
    }
    while (buckets.size >= maxBuckets) buckets.delete(buckets.keys().next().value)
  }

  // take(key) -> { ok, remaining, retryAfterSec, limit }
  function take(key) {
    const t = clock()
    let b = buckets.get(key)
    if (!b) {
      if (buckets.size >= maxBuckets) evict(t)
      b = { tokens: capacity, at: t }
      buckets.set(key, b)
    } else {
      b.tokens = Math.min(capacity, b.tokens + (t - b.at) * rate)
      b.at = t
    }
    if (b.tokens >= 1) {
      b.tokens -= 1
      return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0, limit: capacity }
    }
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((1 - b.tokens) / rate / 1000)), limit: capacity }
  }

  // peek(key) -> { ok, retryAfterSec }: would a request pass right now? Takes nothing.
  function peek(key) {
    const b = buckets.get(key)
    if (!b) return { ok: true, retryAfterSec: 0 }
    const tokens = Math.min(capacity, b.tokens + (clock() - b.at) * rate)
    return tokens >= 1 ? { ok: true, retryAfterSec: 0 } : { ok: false, retryAfterSec: Math.max(1, Math.ceil((1 - tokens) / rate / 1000)) }
  }

  return { take, peek, size: () => buckets.size }
}

export default { createRateLimiter }
