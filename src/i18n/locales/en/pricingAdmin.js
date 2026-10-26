// English strings for the superadmin Pricing section
// (src/pages/workadmin/sections/Pricing.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `pricingAdmin` namespace. Tier CODES (lite/basic/advanced/premium) are never
// localized here; only their display text is.
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
      desc: 'What each tier costs and the per-tier limits.',
      descEdit: 'Click Edit to change any of it.',
      currency: 'Currency',
      tierSummary: '{price}/mo  ·  {hours} hrs/day  ·  {tasks} tasks/day  ·  {replans} re-plans  ·  {extraHr}/extra hr  ·  {image}/image',
      corporate: 'Corporate',
      corporateValue: 'Unlimited tasks and re-plans',
      bulkMin: 'Bulk minimum',
      bulkMinValue: '{count} images',
      bonusTasks: 'Bonus tasks per extra hour',
      bonusTasksValue_one: '{count} task per hour bought (all tiers)',
      bonusTasksValue_other: '{count} tasks per hour bought (all tiers)',
      freeImages: 'Free images per day',
    },

    // Edit view panels
    edit: {
      monthly: {
        title: 'Monthly plan price',
        desc: 'What each tier costs per month. The daily guiding hours each tier includes are set below.',
      },
      dailyHours: {
        title: 'Daily included hours, per tier',
        desc: 'How many hours of real guiding time each tier includes per day (the "bucket"). This is the daily allowance; extra hours beyond it are billed at the per-tier rate below. A change here applies to every user immediately. Fractional hours are allowed (e.g. 1.5). Resets 11:59 PM ET.',
        hint: 'hours per day',
      },
      dailyTasks: {
        title: 'Daily task limit, per tier',
        desc: 'Maximum guided tasks (sessions) a user can start per day. Users must finish the current task before starting a new one, and spend their minutes inside each task. Resets 11:59 PM ET. Corporate (company) accounts are unlimited.',
        hint: 'tasks per day',
      },
      replans: {
        title: 'Re-plans per task, per tier',
        desc: 'How many times a user can re-plan a single task. A re-plan only re-adapts the steps to new information, it never changes the original request, so it is not a backdoor to a new task. Counts per task (not per day). Corporate (company) accounts are unlimited.',
        hint: 're-plans per task',
      },
      extraHour: {
        title: 'Extra hour, per tier',
        desc: 'Price of one additional hour beyond the daily allowance. Purchased hours never expire.',
        bonusLabel: 'Bonus tasks per extra hour (all tiers)',
        bonusHint: 'Task credits granted when a user buys one extra hour. Same for every tier. 0 turns it off.',
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
      noDailyTaskCap: 'Company accounts have no daily task cap.',
      noReplanCap: 'Company accounts have no re-plan cap.',
      currency: 'Currency',
      save: 'Save pricing',
      cancel: 'Cancel',
      invalid: 'All prices must be zero or more; bulk minimum at least 1.',
    },
  },
}
