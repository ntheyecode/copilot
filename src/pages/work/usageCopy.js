// Plan-model copy for the two guiding surfaces that are not translated yet (the
// in-session console, src/pages/work/Guiding.jsx, and the second-monitor full
// guide, src/pages/WorkFullGuide.jsx). Both read the SAME usage snapshot
// (GET /api/work/usage) through planModel.planView, so the time left, the
// task-slots line and the out-of-hours message can never disagree with the
// shell's plan pill or the dashboard meters (SUPREME RULE II). Pure functions,
// no React: the console passes the usage object it already polls.
//
// Honest wording for the monthly plan model: hours are included per month and
// renew on the 1st (usage.resetLabel is the renewal date, "Nov 1"), top-up hours
// never expire, and tasks are open slots (up to a few at once; a company member
// may instead have an admin-set ceiling). No minutes-per-day, no per-day task
// cap, no banked credits, no trade.
import { planView, fmtDuration } from './planModel.js'

const UNITS = { h: 'h', min: 'min' }

// Each function takes the i18n translator `t` as a parameter and returns the
// keyed string, keeping the planView / fmtDuration number logic here and passing
// the formatted values as interpolation vars. The English copy lives in
// src/i18n/locales/en/usageCopy.js (the `usage` namespace). Pure, no React: every
// caller (Guiding.jsx, FloatPanel.jsx, WorkFullGuide.jsx) passes its own useT().

// "58 h left" / "35 min left" / "No time left". Compact (whole hours past 10).
export function usageTimeLeft(usage, t) {
  if (!usage) return ''
  const plan = planView(usage)
  if (!plan) return ''
  if (plan.exhausted) return t('usage.noTime')
  return t('usage.timeLeft', { time: fmtDuration(plan.remainingSeconds, UNITS, true) })
}

// "1 of 4 tasks open" (individuals: the at-once slots) or "2 of 3 tasks" (a
// company ceiling), or '' when no limit applies (unlimited / unknown).
export function usageTasksLine(usage, t) {
  const plan = planView(usage)
  const slots = plan && plan.tasks
  if (!slots || slots.unlimited || slots.max == null) return ''
  return slots.mode === 'open'
    ? t('usage.tasksOpen', { used: slots.used, max: slots.max })
    : t('usage.tasks', { used: slots.used, max: slots.max })
}

// What to do when the plan hours are gone. A company member (the usage snapshot
// carries an `enterprise` block) asks their admin, since they cannot buy; an
// individual buys top-up hours or waits for the renewal.
export function usageOutOfTime(usage, t) {
  const when = (usage && usage.resetLabel) || 'the 1st'
  const isCompanyMember = !!(usage && usage.enterprise)
  return isCompanyMember
    ? t('usage.outCompany', { when })
    : t('usage.outIndividual', { when })
}

// The low-hours line shown while guiding. `time` is the compact time left.
export function usageLowNote(usage, t) {
  if (!usage) return ''
  const plan = planView(usage)
  if (!plan) return ''
  return t('usage.lowNote', { time: fmtDuration(plan.remainingSeconds, UNITS) })
}
