// English strings for the superadmin Cancelled section
// (src/pages/workadmin/sections/Cancelled.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `cancelledAdmin` namespace. Plan/cycle CODES are never localized here; only
// their display text is.
export default {
  cancelledAdmin: {
    loading: 'Loading cancelled subscribers',

    // Table column headers
    columns: {
      user: 'User',
      email: 'Email',
      plan: 'Plan',
      cycle: 'Cycle',
      subscribed: 'Subscribed',
      canceled: 'Canceled',
      reason: 'Reason',
      lifetimePaid: 'Lifetime paid',
      company: 'Company',
    },

    // Billing cycle display text
    cycle: {
      monthly: 'Monthly',
      annual: 'Annual',
    },

    // Non-superadmin note
    viewOnlyNote: 'Cancelled subscribers are visible to superadmins and the accounting role. You can view everything here.',

    // Summary stat tiles
    tiles: {
      cancelledSubscribers: 'Cancelled subscribers',
      awaitingData: 'Awaiting data',
      allChurned: 'All churned subscriptions on record',
      lifetimeRevenue: 'Lifetime revenue (churned)',
      totalPaid: 'Total paid before they left',
    },

    // Toolbar
    searchPlaceholder: 'Search user, email, company, plan or reason',
    refresh: 'Refresh',
    countOf: '{shown} of {total}',

    // Empty states
    unavailableTitle: 'Cancelled subscribers are not available yet',
    unavailableDetail: 'The cancelled-subscribers endpoint is not wired on this server yet. Once it is live, every churned subscriber and the revenue they brought appear here. Use Refresh to check again.',
    noMatchTitle: 'No cancelled subscribers match',
    noMatchSearch: 'Try a different search.',
    noMatchEmpty: 'No subscriptions have been canceled yet. Churned subscribers appear here when a subscription ends.',

    // Row cells
    canceledBadge: 'Canceled',
    individual: 'Individual',
  },
}
