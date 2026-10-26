// English strings for the superadmin Subscribers section
// (src/pages/workadmin/sections/Subscribers.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `subscribersAdmin` namespace. Status/plan/cycle CODES are never localized
// here; only their display text is.
export default {
  subscribersAdmin: {
    loading: 'Loading subscribers',

    // Table column headers
    columns: {
      user: 'User',
      email: 'Email',
      plan: 'Plan',
      status: 'Status',
      cycle: 'Cycle',
      since: 'Since',
      renews: 'Renews',
      mrr: 'MRR',
      lifetimePaid: 'Lifetime paid',
      tasksToday: 'Tasks today',
      hoursToday: 'Hours today',
      sessions: 'Sessions',
      lastActive: 'Last active',
      company: 'Company',
    },

    // Status badge display text (keyed by status code)
    status: {
      active: 'Active',
      trialing: 'Trialing',
      past_due: 'Past due',
      canceled: 'Canceled',
      comp: 'Comp',
    },

    // Billing cycle display text
    cycle: {
      monthly: 'Monthly',
      annual: 'Annual',
    },

    // Hours used today
    hoursZero: '0h',
    hours: '{v}h',

    // Plan display text for the by-plan tile (keyed by plan code)
    plan: {
      lite: 'Lite',
      basic: 'Basic',
      advanced: 'Advanced',
      premium: 'Premium',
    },
    planFootItem: '{plan} {count}',
    noPlanBreakdown: 'No plan breakdown',

    // Non-superadmin note
    viewOnlyNote: 'Subscribers are visible to superadmins. You can view everything here.',

    // Summary stat tiles
    tiles: {
      payingSubscribers: 'Paying subscribers',
      awaitingData: 'Awaiting data',
      allOnRecord: 'All subscriptions on record',
      active: 'Active',
      activeFoot: 'Active or trialing right now',
      mrr: 'MRR',
      mrrFoot: 'Estimated monthly recurring revenue',
      byPlan: 'By plan',
    },

    // Toolbar
    searchPlaceholder: 'Search user, email, company or plan',
    refresh: 'Refresh',
    countOf: '{shown} of {total}',

    // Empty states
    unavailable: {
      title: 'Subscribers are not available yet',
      detail: 'The subscribers endpoint is not wired on this server yet. Once it is live, every paying subscriber and their operations appear here. Use Refresh to check again.',
    },
    empty: {
      title: 'No subscribers match',
      detailSearch: 'Try a different search.',
      detailNone: 'No paying subscribers yet. They appear here as subscriptions are created.',
    },

    // Row
    individual: 'Individual',
  },
}
