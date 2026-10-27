// Mid-task ASK flow, the pure state machine (no React, no DOM) so it can be
// unit-tested and shared by the console and the floating panel.
//
// The interaction: the user asks anything while guiding -> the step view
// steps aside and a FOCUSED answer takes the screen -> one primary action,
// "Continue", ropes them back into guiding (an adapted plan if the question
// changed it) -> smooth fade back to the current step.
//
// ENGINE CONTRACT (the ask / research / analyze / context replies):
//   { answer, planChanged: boolean, steps?: [...], resumeAt: <step index> }
//   planChanged true  -> replace the forward steps with `steps`, resume at resumeAt
//   planChanged false -> resume where they were
// normalizeAskResponse() builds that shape from any reply, including the
// older { answer, steps, index } shape, so the UI is wired to ONE contract and
// the engine side can land independently.

export const ASK_IDLE = 'idle'           // guiding; no focused answer on screen
export const ASK_OFFER = 'offer'         // proactive "Stuck? Any issues?" card (the step steps aside)
export const ASK_ASKING = 'asking'       // the question is in flight: a short "working" moment
export const ASK_ANSWERED = 'answered'   // the focused answer is on screen with Continue
export const ASK_RESUMING = 'resuming'   // Continue pressed: the answer fades, guiding fades back in

// PROACTIVE STUCK HELP: when the current step has not advanced for this long,
// the guide steps aside and gently asks "Stuck? Any issues?". An offer that is
// dismissed waits a full interval again before offering on the same step.
export const STUCK_MS = 5 * 60 * 1000
// The question sent when the user takes the offer without typing anything: the
// engine then re-explains the current step more clearly (planChanged false) or
// adapts the plan (planChanged true). Plain words, honest about what we want.
export const STUCK_DEFAULT_QUESTION = 'I am stuck on this step. Explain it more clearly, or adapt the plan if something needs to change.'

export const initialAsk = Object.freeze({
  phase: ASK_IDLE, kind: 'ask', question: '', answer: '',
  planChanged: false, steps: null, resumeAt: null, error: '',
})

export function askReducer(state, action) {
  switch (action.type) {
    case 'offer':
      // Only interrupt plain guiding; never over an answer or a question in flight.
      return state.phase === ASK_IDLE ? { ...initialAsk, phase: ASK_OFFER, kind: 'stuck' } : state
    case 'begin':
      return { ...initialAsk, phase: ASK_ASKING, kind: action.kind || (state.phase === ASK_OFFER ? 'stuck' : 'ask'), question: String(action.question || '') }
    case 'receive':
      return {
        ...state, phase: ASK_ANSWERED, error: '',
        answer: String(action.answer || ''), planChanged: !!action.planChanged,
        steps: action.planChanged && Array.isArray(action.steps) ? action.steps : null,
        resumeAt: Number.isInteger(action.resumeAt) ? action.resumeAt : null,
      }
    case 'fail':
      // Nothing to show: drop back to guiding and let the host surface the error.
      return { ...initialAsk, error: String(action.error || '') }
    case 'resume':
      return state.phase === ASK_ANSWERED ? { ...state, phase: ASK_RESUMING } : state
    case 'done':
    case 'dismiss':
      return { ...initialAsk }
    default:
      return state
  }
}

// True while a focus screen (offer, working, answer) owns the view and the step
// card is hidden. ONE screen at a time: the host renders exactly one of them.
export const askFocused = (ask) => !!ask && ask.phase !== ASK_IDLE

// Stuck rule, pure: the step has not advanced for STUCK_MS and no snooze is in
// effect. `sinceMs` = now - the time the current step index last changed.
export function isStuck(sinceMs, snoozedUntil = 0, now = Date.now(), threshold = STUCK_MS) {
  if (!Number.isFinite(sinceMs) || sinceMs < threshold) return false
  return !(Number.isFinite(snoozedUntil) && snoozedUntil > now)
}

// Build the contract shape from an engine reply.
//   r           the raw JSON reply
//   ctx.steps   the plan as currently shown (to clamp resumeAt)
//   ctx.current the index the user was on (the default resume point)
export function normalizeAskResponse(r, ctx = {}) {
  const raw = r && typeof r === 'object' ? r : {}
  const current = Number.isInteger(ctx.current) ? ctx.current : 0
  const hasSteps = Array.isArray(raw.steps) && raw.steps.length > 0
  const planChanged = typeof raw.planChanged === 'boolean' ? raw.planChanged && hasSteps : hasSteps
  const steps = planChanged ? raw.steps : null
  const len = steps ? steps.length : (Array.isArray(ctx.steps) ? ctx.steps.length : 0)
  let resumeAt = Number.isInteger(raw.resumeAt) ? raw.resumeAt : Number.isInteger(raw.index) ? raw.index : current
  if (len > 0) resumeAt = Math.max(0, Math.min(len - 1, resumeAt))
  else resumeAt = Math.max(0, resumeAt)
  return { answer: String(raw.answer || ''), planChanged, steps, resumeAt }
}

// Apply a Continue to the session: when the plan changed, the engine's steps
// replace the plan (a full list, or forward steps spliced after the kept
// prefix), and the step at resumeAt becomes current. When it did not change,
// only the current step moves to resumeAt (normally where the user already
// was). Pure: returns a new session object, never mutates.
export function applyResume(sess, ask) {
  if (!sess) return sess
  const prev = Array.isArray(sess.steps) ? sess.steps : []
  let steps = prev
  if (ask && ask.planChanged && Array.isArray(ask.steps) && ask.steps.length) {
    const incoming = ask.steps
    const at = Number.isInteger(ask.resumeAt) ? ask.resumeAt : 0
    // A FULL plan carries its own history (a done or current mark on some
    // step); FORWARD steps are only what comes next, unmarked, and are spliced
    // after the kept prefix. Either way the kept prefix never loses a done mark.
    const isFull = incoming.some((s) => s && (s.status === 'done' || s.status === 'current'))
    steps = isFull ? incoming.slice() : [...prev.slice(0, at), ...incoming.map((s) => ({ ...s, status: (s && s.status) || 'pending' }))]
  }
  const total = steps.length
  if (!total) return { ...sess, steps, currentStep: 0 }
  const at = Math.max(0, Math.min(total - 1, Number.isInteger(ask && ask.resumeAt) ? ask.resumeAt : (sess.currentStep || 0)))
  steps = steps.map((s, i) => {
    const st = s && s.status
    if (i === at) return { ...s, status: 'current' }
    if (st === 'current') return { ...s, status: i < at ? 'done' : 'pending' }
    return s
  })
  return { ...sess, steps, currentStep: at }
}
