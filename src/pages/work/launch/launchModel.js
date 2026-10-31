// What a launch-link outcome means for the person, in one place (pure, no
// React). The redeem codes come from the contract (POST /api/work/launch/redeem);
// a start refusal reuses the shared task-gate wording (src/shared/start_gate.js)
// and the workflow-run codes (src/pages/work/workflows/runWorkflowModel.js), so
// a launch link is refused in exactly the words the dashboard uses.
import { startGateOutcome } from '../../../shared/start_gate.js'
import { runErrorKey } from '../workflows/runWorkflowModel.js'

const REDEEM = {
  LAUNCH_INVALID: 'invalid',
  LAUNCH_EXPIRED: 'expired',
  LAUNCH_USED: 'used',
  LAUNCH_WRONG_USER: 'wrongUser',
}

// -> { kind, retry, signOut, keepStash }
//   kind: the catalog key under launchPage.err.* (title/body)
//   retry: offer "Try again" (transient)
//   signOut: offer "Sign out and switch account" (the link was for someone else)
//   keepStash: keep the parked token so the hop can finish after a re-sign-in
export function redeemOutcome(err) {
  const code = (err && err.data && err.data.code) || ''
  const kind = REDEEM[code]
  if (kind === 'wrongUser') return { kind, retry: false, signOut: true, keepStash: true }
  if (kind) return { kind, retry: false, signOut: false, keepStash: false }
  if (err && err.status === 401) return { kind: 'signedOut', retry: false, signOut: false, keepStash: true }
  return { kind: 'generic', retry: true, signOut: false, keepStash: true }
}

// -> { key, vars } | { message } | { needsSub } | { gone }: why the start was refused.
export function startOutcome(err, ctx) {
  const wf = runErrorKey(err)
  if (wf) return { key: wf, gone: true }
  const g = startGateOutcome(err, ctx || {})
  if (g.needsSub) return { needsSub: true }
  if (g.key) return { key: g.key, vars: g.vars }
  if (g.message) return { message: g.message }
  return {}
}
