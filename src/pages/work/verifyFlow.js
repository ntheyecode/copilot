// The on-demand "Verify on my screen" verdict, as a pure function of the
// /watch reply (sent with `verify: true`, see server/work_verify.js). ONE
// place decides what the user is told, shared by the console step card and
// the floating panel, so the two can never disagree. No React, no DOM: runs
// under node --test (server/verify_flow.test.mjs).
//
// Verdict shapes:
//   { kind: 'done',    observation }            step reads as done on screen
//   { kind: 'notyet',  observation, detail }    not done: `detail` = what is
//                                               wrong / what to do next
//   { kind: 'noframe' }                         no screen frame was available
//   { kind: 'error',   detail }                 the read itself failed
export const VERIFY_DONE = 'done'
export const VERIFY_NOT_YET = 'notyet'
export const VERIFY_NO_FRAME = 'noframe'
export const VERIFY_ERROR = 'error'

const clean = (v) => String(v == null ? '' : v).trim()

export function verdictFromWatch(r) {
  const res = r || {}
  const observation = clean(res.observation)
  const flag = clean(res.flag)
  const guidance = clean(res.guidance)
  // The server's verify reply carries an explicit `stepDone`; a plain watch
  // reply (older server) is mapped from its status so the button still works
  // against it. A flag always means "not yet".
  const stepDone = !flag && (res.stepDone === true || res.status === 'done')
  if (stepDone) return { kind: VERIFY_DONE, observation }
  // What is missing or wrong, then what to do next: the flag is the engine's
  // own "this is wrong" line; otherwise the live guidance is the next action.
  // The observation is kept separately as the quiet "I can see" line, and is
  // not repeated as the detail when it is all there is.
  const detail = flag || guidance
  return { kind: VERIFY_NOT_YET, observation, detail }
}

// Only show a verdict for the step it was read for: if the plan moved on
// (the continuous watch advanced it, or the user navigated), the old verdict
// is stale and must not be shown against a different step.
export function verdictForStep(verdict, stepIndex) {
  if (!verdict) return null
  if (!Number.isInteger(verdict.stepIndex) || verdict.stepIndex !== stepIndex) return null
  return verdict
}
