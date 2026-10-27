// Plan-model copy for the two guiding surfaces that are not translated yet (the
// in-session console, src/pages/work/Guiding.jsx, and the second-monitor full
// guide, src/pages/WorkFullGuide.jsx). Both read the SAME usage snapshot
// (GET /api/work/usage) through planModel.planView, so the time left, the
// tasks-today line and the out-of-hours message can never disagree with the
// shell's plan pill or the dashboard meters (SUPREME RULE II). Pure functions,
// no React: the console passes the usage object it already polls.
//
// Honest wording for the monthly plan model: hours are included per month and
// renew on the 1st (usage.resetLabel is the renewal date, "Nov 1"), top-up hours
// never expire, and tasks are a plain per-day cap. No minutes-per-day, no
// banked credits, no trade.
import { planView, fmtDuration } from './planModel.js'

const UNITS = { h: 'h', min: 'min' }

// "58 h left" / "35 min left" / "No time left". Compact (whole hours past 10).
export function usageTimeLeft(usage) {
  if (!usage) return ''
  const plan = planView(usage)
  if (!plan) return ''
  if (plan.exhausted) return 'No time left'
  return `${fmtDuration(plan.remainingSeconds, UNITS, true)} left`
}

// "2 of 4 tasks today" or '' when the cap does not apply (unlimited / unknown).
export function usageTasksToday(usage) {
  const plan = planView(usage)
  const t = plan && plan.tasks
  if (!t || t.unlimited || t.cap == null) return ''
  return `${t.usedToday} of ${t.cap} tasks today`
}

// What to do when the plan hours are gone. A company member (the usage snapshot
// carries an `enterprise` block) asks their admin, since they cannot buy; an
// individual buys top-up hours or waits for the renewal.
export function usageOutOfTime(usage) {
  const when = (usage && usage.resetLabel) || 'the 1st'
  const isCompanyMember = !!(usage && usage.enterprise)
  return isCompanyMember
    ? `You have used your plan hours for this month. They renew on ${when}. Ask your administrator if you need more before then.`
    : `You have used your plan hours for this month. Buy top-up hours to keep going, or they renew on ${when}.`
}

// The low-hours line shown while guiding. `time` is the compact time left.
export function usageLowNote(usage) {
  if (!usage) return ''
  const plan = planView(usage)
  if (!plan) return ''
  return `About ${fmtDuration(plan.remainingSeconds, UNITS)} of guided time left this month. You can pause anytime, or add top-up hours to keep going.`
}
