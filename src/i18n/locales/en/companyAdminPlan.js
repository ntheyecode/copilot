// English strings for the company-admin console pieces added with the monthly
// plan model (src/pages/workadmin/sections/CompanyPoolCard.jsx and the seat /
// consumption meters in WorkCompanyAdmin.jsx + UsageLimits.jsx). Keyed under the
// `companyPlan` namespace; the i18n loader deep-merges every en/*.js partial into
// the English base, so this file owns its own namespace and never collides with
// the `companyAdmin` block in en.js.
export default {
  companyPlan: {
    // Overview: the live hours pool card (enterprise companies).
    pool: {
      title: 'Hours pool this month',
      line: '{remaining} of {monthly} left. Renews {reset}.',
      pctUsed: '{pct}% used',
      forfeit: 'Unused hours are forfeited at month end',
      carryforward: 'Unused hours carry forward at month end',
      pending_one: '{n} request awaiting approval',
      pending_other: '{n} requests awaiting approval',
      openUsage: 'Open Usage & limits',
      requestHours: 'Request hours',
      none: 'AdmireVeda has not set a monthly hours pool for your company yet. Your people draw on their plan hours and the shared minute pool until one is set.',
      askSupport: 'Ask AdmireVeda',
    },
    // Overview seat cards: the meter under each count.
    seats: {
      meterAria: '{used} of {total} in use',
    },
    // People tables: the hover on a "used today" value shown against a ceiling.
    usedTodayCeiling: 'Guided time used today, of this person\'s own daily ceiling.',
    // Usage & limits: the bar under each person.
    usage: {
      ofLimit: '{pct}% of their monthly limit',
      ofPool: '{pct}% of the company pool',
    },
  },
}
