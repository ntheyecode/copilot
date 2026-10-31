// Starting a guided task: the usage gates every entry point must pass, in ONE
// place (a new way to start a task, such as running a published workflow, can
// never skip one). Individuals: hours (402 outOfHours) and the open-task cap
// (409 tooManyOpen). Company members: their admin's task ceiling (402
// taskLimit) and, during a company trial, one session from the shared pool
// (402 trialExhausted). Every coded flag is forwarded so the client shows the
// matching message and action.
//
// createWorkTaskGate({ store }) -> beginWorkTask(req, res): true when the task
// may start (usage already counted), false after it has answered with the reason.
export function createWorkTaskGate({ store }) {
  return function beginWorkTask(req, res) {
    const cu = store.getUser(req.workUser.id)
    // Task gate FIRST, before consuming a company trial session.
    try {
      store.startWorkTask(req.workUser.id)
    } catch (e) {
      const body = { error: e.message }
      if (e.outOfHours) { body.outOfHours = true; body.resetLabel = e.resetLabel }
      if (e.tooManyOpen) { body.tooManyOpen = true; body.maxOpen = e.maxOpen; body.open = e.open }
      if (e.taskLimit) { body.taskLimit = true; body.cap = e.cap; body.resetLabel = e.resetLabel; if (e.window) body.window = e.window }
      res.status(e.status || 402).json(body)
      return false
    }
    if (cu && cu.companyId) {
      if (store.companyTrialRemaining(cu.companyId) <= 0) {
        res.status(402).json({ error: 'Your company free trial is used up. Your administrator can add more.', trialExhausted: true })
        return false
      }
      store.consumeCompanyTrialSession(cu.companyId)
    }
    return true
  }
}

export default { createWorkTaskGate }
