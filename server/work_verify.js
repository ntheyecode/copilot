// On-demand "Verify this step" read: ONE place that turns the engine's navigate
// result into a yes/no verdict for the CURRENT step, without applying it.
//
// Why a separate module: the continuous watch loop APPLIES what the engine
// says (steps marked done, the pointer advanced, milestone shots kept). The
// optional verify button must read the same screen with the same engine, then
// leave the decision to the user ("Looks done" + Mark done, or "Not yet").
// The engine's verify/navigate logic is untouched; this only interprets its
// output. Pure, so it runs under node --test.

// The engine reports 0-based `completed` indices, an optional new `current`
// pointer, and `done` (every step complete). The current step reads as done
// when any of those says the user has moved past it: the same "advanced"
// notion the engine's own consistency guard uses on the verification step
// (work.js workNavigate). Note the continuous loop (store.applyWorkNav) only
// MARKS a step done when it is listed in `completed`; a bare pointer move
// relabels it and moves on. Here that case still reads "Looks done", because
// the engine has left the step behind and the user's Mark done is the click
// that records it.
export function verifyVerdict(r, currentStep) {
  const res = r || {}
  const cur = Number.isFinite(Number(currentStep)) ? Math.round(Number(currentStep)) : 0
  const completed = Array.isArray(res.completed) ? res.completed.map(Number).filter(Number.isFinite) : []
  const current = res.current != null && Number.isFinite(Number(res.current)) ? Math.round(Number(res.current)) : null
  const flag = String(res.flag || '').trim()
  // A flag is the engine saying something is wrong on screen; it always wins
  // over an "advanced" signal (the engine itself already guards this on the
  // verification step, this keeps the verdict honest for any shape).
  const stepDone = !flag && (res.done === true || completed.includes(cur) || (current != null && current > cur))
  return {
    stepDone,
    status: flag ? 'wrong' : (stepDone ? 'done' : 'working'),
  }
}

// The verify-only response: the read (observation / flag / guidance), the
// verdict, and the session's UNCHANGED position, so the client can show the
// result without the plan moving under the user.
export function verifyResponse(r, session, extra) {
  const s = session || {}
  const steps = Array.isArray(s.steps) ? s.steps : []
  const idx = Number.isFinite(Number(s.currentStep)) ? Math.round(Number(s.currentStep)) : 0
  const v = verifyVerdict(r, idx)
  const step = steps[idx] ? { ...steps[idx], source: steps[idx].source || '' } : null
  return {
    verify: true,
    stepDone: v.stepDone,
    status: v.status,
    observation: (r && r.observation) || '',
    flag: (r && r.flag) || '',
    guidance: (r && r.guidance) || '',
    index: idx,
    step,
    done: false,
    ...(extra || {}),
  }
}
