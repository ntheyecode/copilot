// What a refused task start means for the person, in ONE place. Every surface
// that starts guided work (the start-a-task wizard, running a company workflow)
// reads the server's coded flags through this, so the wording and the follow-up
// action never drift between them (SUPREME RULE II). Pure: no React, no I/O.
//
// The server's flags (server/work_task_gate.js, shared by POST /api/work/sessions
// and POST /api/work/workflows/:id/start):
//   409 tooManyOpen  every at-once task slot is in use: finish or pick one up
//   402 outOfHours   no guided hours left: renewal date + Add hours (individuals)
//                    or ask your administrator (company members)
//   402 taskLimit    a company member hit the admin-set task ceiling
//   402 trialExhausted  the company's free trial is used up (admin adds more)
//   402 (no flag)    company member without a license / individual without a
//                    plan (the caller routes to the plan chooser)
//
// startGateOutcome(err, ctx) ->
//   { key, vars }            a translated message (workStart.gate*)
//   | { message }            the server's own sentence (no key fits)
//   | { needsSub: true }     route to the plan chooser
//   | { other: true }        not a gate refusal: the caller words it
// plus `act: 'hours'` (offer Add hours) and `refresh: true` (re-read usage).
export function startGateOutcome(err, { isCompanyMember = false, canBuyHours = false, renewLabel = '', planMaxOpen = null } = {}) {
  const status = err && err.status
  const d = (err && err.data) || {}
  if (d.tooManyOpen) {
    const max = d.maxOpen != null ? d.maxOpen : planMaxOpen
    return max != null
      ? { key: 'workStart.gateTooManyOpen', vars: { max }, refresh: true }
      : { message: (err && err.message) || '', refresh: true }
  }
  if (d.outOfHours) {
    const reset = d.resetLabel || renewLabel || ''
    return {
      key: isCompanyMember ? 'workStart.gateOutOfHoursCompany' : 'workStart.gateOutOfHours',
      vars: { reset },
      act: !isCompanyMember && canBuyHours ? 'hours' : null,
      refresh: true,
    }
  }
  if (d.taskLimit) return { key: 'workStart.gateCompanyTaskLimit', vars: { reset: d.resetLabel || renewLabel || '' } }
  if (d.trialExhausted) return { key: 'workStart.gateCompanyTrialUsed', vars: {} }
  if (status === 402) return isCompanyMember ? { key: 'workStart.gateCompanyNoLicense', vars: {} } : { needsSub: true }
  return { other: true }
}
