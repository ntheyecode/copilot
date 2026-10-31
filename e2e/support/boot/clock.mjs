// Fake wall clock for the server process under E2E.
//
// Installed BEFORE the server is imported, so every `Date.now()` and `new Date()`
// in the product reads (real time + offset). A test moves time forward through
// the control channel (`clock.advance`) to exercise expiry rules for real:
// the 8 hour session cookie, API key expiry, quota windows. Timers are not
// touched (setTimeout still runs on real time), which is what we want: only the
// date the product READS moves.
const RealDate = Date
let offsetMs = 0

class E2EDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + offsetMs)
    else super(...args)
  }
  static now() { return RealDate.now() + offsetMs }
}

export function installClock() {
  if (globalThis.Date === E2EDate) return
  globalThis.Date = E2EDate
}

export function advanceClock(ms) {
  offsetMs += Math.max(0, Number(ms) || 0)
  return { offsetMs, now: E2EDate.now() }
}

export function resetClock() {
  offsetMs = 0
  return { offsetMs, now: E2EDate.now() }
}
