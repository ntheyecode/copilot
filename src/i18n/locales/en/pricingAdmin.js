// English strings for the superadmin Pricing section
// (src/pages/workadmin/sections/Pricing.jsx + PricingGlance.jsx). One partial per
// i18n wave, deep-merged into the English base by src/i18n/index.jsx. Keys live
// under the `pricingAdmin` namespace. Tier CODES (lite/basic/advanced/premium)
// are never localized here; only their display text is.
//
// Plan model (2026-10-27): each tier includes guided HOURS PER MONTH (one pool
// per person, renewed on the 1st, with a month-end policy) and a plain number of
// guided TASKS PER DAY. The former daily hours bucket and the "bonus tasks per
// extra hour" trade are retired, so no key here describes them.
export default {
  pricingAdmin: {
    loading: 'Loading pricing',
    superadminNote: 'Editing pricing requires superadmin access. Values below are read-only for you.',

    // Tier display names (codes stay lite/basic/advanced/premium in the logic)
    tiers: {
      lite: 'Lite',
      basic: 'Basic',
      advanced: 'Advanced',
      premium: 'Premium',
    },

    // Collapsed record summary
    record: {
      title: 'Pricing',
      desc: 'What each tier costs, the guided hours it includes each month and its per-day task cap.',
      descEdit: 'Click Edit to change any of it.',
      currency: 'Currency',
      tierSummary: '{price}/mo  ·  {hours} h/month  ·  {tasks} tasks/day  ·  {replans} re-plans  ·  {extraHr}/extra hr  ·  {image}/image',
      monthEnd: 'At month end',
      monthEndForfeit: 'Unused plan hours are forfeited; purchased hours never expire.',
      monthEndCarry: 'Unused plan hours carry forward, up to {cap} h in total.',
      monthEndCarryNoCap: 'Unused plan hours carry forward with no cap.',
      corporate: 'Corporate',
      corporateValue: 'Unlimited tasks and re-plans',
      bulkMin: 'Bulk minimum',
      bulkMinValue: '{count} images',
      freeImages: 'Free images per day',
      // Plans at a glance: the per-tier ladder under the record.
      glanceTitle: 'Plans at a glance',
      perMonthShort: '/mo',
      glanceLine: '{hours} h/month  ·  {tasks} tasks/day',
      glanceFoot: 'Bars compare the included hours per month across tiers.',
    },

    // Edit view panels
    edit: {
      monthly: {
        title: 'Monthly plan price',
        desc: 'What each tier costs per month. The guided hours each tier includes per month and its tasks per day are set below.',
      },
      monthlyHours: {
        title: 'Monthly included hours, per tier',
        desc: 'How many hours of real guiding time each tier includes per calendar month. Every person has one monthly pool that renews on the 1st (US Eastern). A change here reaches every person\'s live pool at once, as the difference against their current balance, never below zero. Hours beyond the pool come from purchased hours at the per-tier rate below. Fractional hours are allowed (e.g. 37.5).',
        hint: 'hours per month',
      },
      monthEnd: {
        title: 'At month end',
        desc: 'What happens to plan hours a person did not use when the month renews. Purchased hours are a separate balance and never expire.',
        mode: 'Unused plan hours',
        modeHint: 'Applies to individuals and to seat-based company members. Enterprise pools have their own month-end rule on the Companies page.',
        forfeit: 'Forfeit unused hours',
        carryforward: 'Carry unused hours forward',
        cap: 'Carry-forward cap (hours)',
        capHint: 'The most that can ever build up in one pool. Leave blank for no cap.',
        noCap: 'No cap',
      },
      dailyTasks: {
        title: 'Guided tasks per day, per tier',
        desc: 'How many guided tasks (sessions) a person may start per day: 4 on Lite and Basic, 6 on Advanced, 8 on Premium by default. A plain cap: nothing banks, nothing is earned or traded. Someone must pause or finish the current task before starting another. Resets 11:59 PM ET. Corporate (company) accounts are unlimited unless their admin sets a ceiling.',
        hint: 'tasks per day',
      },
      replans: {
        title: 'Re-plans per task, per tier',
        desc: 'How many times a user can re-plan a single task. A re-plan only re-adapts the steps to new information, it never changes the original request, so it is not a backdoor to a new task. Counts per task (not per day). Corporate (company) accounts are unlimited.',
        hint: 're-plans per task',
      },
      extraHour: {
        title: 'Extra hour, per tier',
        desc: 'Price of one additional hour beyond the monthly included hours. Purchased hours never expire and are drawn only after the plan hours are used up.',
      },
      image: {
        title: 'Image generation, per tier',
        desc: 'Price per generated image. Purchased image credits never expire.',
        bulkLabel: 'Bulk minimum (images)',
        bulkHint: 'Smallest image bundle a user can buy.',
      },
      freeImages: {
        title: 'Free images per day, per tier',
        desc: 'How many images each tier may generate for free per day (0 = none). Beyond this daily allowance, images are billed at the per-tier price above. A change here applies to every user immediately. Resets 11:59 PM ET.',
        hint: 'free images per day',
      },
      corporate: 'Corporate',
      unlimited: 'Unlimited',
      noDailyTaskCap: 'Company accounts have no per-day task cap unless their company admin sets one.',
      noReplanCap: 'Company accounts have no re-plan cap.',
      currency: 'Currency',
      save: 'Save pricing',
      cancel: 'Cancel',
      invalid: 'Prices must be zero or more, hours per month between 0 and 744, tasks and re-plans whole numbers up to 1000, the carry-forward cap 0 to 100000, and the bulk minimum at least 1.',
    },
  },
}
