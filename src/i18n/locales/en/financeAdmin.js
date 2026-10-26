// English strings for the superadmin Finance / accounting section
// (src/pages/workadmin/sections/Finance.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `financeAdmin` namespace. Currency/number formatting, kind/status CODES and
// field keys stay in the component; only display text is localized here.
export default {
  financeAdmin: {
    loading: 'Loading finance',

    // Transaction kinds (codes stay subscription/hours/images/refund/payment/invoice/adjustment)
    kinds: {
      subscription: 'Subscription',
      hours: 'Extra hours',
      images: 'Image credits',
      refund: 'Refund',
      payment: 'Payment',
      invoice: 'Invoice',
      adjustment: 'Adjustment',
    },

    // Chart granularity (codes stay week/month/quarter/year)
    granularity: {
      week: 'Weekly',
      month: 'Monthly',
      quarter: 'Quarterly',
      year: 'Yearly',
    },

    // Revenue at a glance
    glance: {
      title: 'Revenue at a glance',
      refresh: 'Refresh',
    },
    narrative: {
      lead: 'This month you have earned {net} net{delta}. Estimated recurring revenue is {mrr} across {plans}. {refunds}',
      delta: ' ({dir} {pct}% vs last month)',
      up: 'up',
      down: 'down',
      plans_one: 'active plan',
      plans_other: 'active plans',
      refundsYtd: '{amount} refunded year to date.',
      noRefundsYtd: 'No refunds year to date.',
    },

    // Period cards
    cards: {
      week: 'This week',
      month: 'This month',
      quarter: 'This quarter',
      year: 'This year',
      vsPrevious: 'vs previous',
      foot: '{gross} gross{refunded} · {count} {payments}',
      refundedSuffix: ' · {amount} refunded',
      payments_one: 'payment',
      payments_other: 'payments',
    },

    // Revenue + MRR timeseries chart
    timeseries: {
      title: 'Revenue and MRR over time',
      granularityAria: 'Chart granularity',
      loading: 'Loading chart',
      unavailable: 'The revenue timeseries is not available on this server yet. The period cards and transactions below are live; this chart fills in once the endpoint is wired.',
      noData: 'No data in this range yet.',
      legendNet: 'Net revenue',
      legendMrr: 'MRR',
      chartAria: 'Net revenue and MRR across {n} periods',
      tipRevenue: 'Revenue: {amount}',
      tipRefunds: 'Refunds: {amount}',
      tipNet: 'Net: {amount}',
      tipMrr: 'MRR: {value}',
      tipSubs: 'New subs: {newSubs} · Cancellations: {cancellations}',
      pointMrr: '{label} MRR: {amount}',
    },

    // 12-month mini chart
    mini: {
      title: 'Net revenue, last 12 months',
      aria: 'Monthly net revenue, last 12 months',
      barTitle: '{month}: {amount} net',
    },

    // Paid users / subscriptions overview
    subs: {
      title: 'Paid users and subscriptions',
      refresh: 'Refresh',
      loading: 'Loading subscriptions',
      unavailable: 'The subscribers endpoint is not wired on this server yet. The paid-user overview fills in once it is live.',
      paying: 'Paying',
      activeTrialing: 'Active / trialing',
      mrr: 'MRR',
      none: 'No live subscriptions to manage right now.',
      colUser: 'User',
      colPlan: 'Plan',
      colStatus: 'Status',
      colCycle: 'Cycle',
      colMrr: 'MRR',
      statusPastDue: 'Past due',
      statusTrialing: 'Trialing',
      statusActive: 'Active',
      annual: 'Annual',
      monthly: 'Monthly',
      cancelTitle: 'Cancel this subscription now',
      cancelSub: 'Cancel sub',
      showing: 'Showing {count} live subscriptions. See the Subscribers tab for the full list.',
    },

    // All transactions + manual ledger CRUD
    txns: {
      title: 'All transactions',
      shown: '{count} shown',
      manualEntry: 'Manual entry',
      amount: 'Amount',
      amountHint: '(negative for a debit)',
      amountPlaceholder: 'e.g. 49.00',
      currency: 'Currency',
      kind: 'Kind',
      description: 'Description',
      descriptionPlaceholder: 'What this adjustment is for',
      recordEntry: 'Record entry',
      cancel: 'Cancel',
      none: 'No transactions yet. They appear here as payments and refunds flow through Stripe, and whenever you record a manual entry.',
      colDate: 'Date',
      colWho: 'Who',
      colType: 'Type & note',
      colAmount: 'Amount',
      colStatus: 'Status',
      notePlaceholder: 'Note',
      save: 'Save',
      statusManual: 'manual',
      editNote: 'Edit the note',
      note: 'Note',
      voidTitle: 'Void this manual entry',
      void: 'Void',
      refund: 'Refund',
    },

    // Flash messages
    msg: {
      refunded: 'Refunded {amount}.',
      amountInvalid: 'Enter a non-zero amount (use a negative amount for a debit).',
      descriptionRequired: 'Add a short description for this entry.',
      recorded: 'Recorded {amount} adjustment.',
      recordFailed: 'Could not record the entry.',
      noteUpdated: 'Note updated.',
      noteFailed: 'Could not update the note.',
      entryVoided: 'Entry voided.',
      voidFailed: 'Could not void the entry.',
      subCanceled: 'Subscription canceled for {name}.',
      cancelFailed: 'Could not cancel the subscription.',
    },

    // Reason-gate dialogs
    reason: {
      createTitle: 'Record a manual ledger entry',
      createDetail: 'Add a manual {amount} adjustment to the ledger. This is recorded against the books and logged.',
      createConfirm: 'Record entry',
      createPlaceholder: 'Reason (recorded in the audit trail)',
      voidTitle: 'Void {amount} entry',
      voidDetail: 'Remove this manual ledger entry ({kind}). This cannot be undone.',
      voidConfirm: 'Void entry',
      cancelTitle: 'Cancel subscription for {name}',
      cancelDetail: 'End this subscription now. Their access stops immediately.',
      cancelConfirm: 'Cancel subscription',
      refundTitle: 'Refund {amount}',
      refundMessage: 'Refund {amount} to {name}. This moves real money and cannot be undone.',
      refundConfirm: 'Refund',
    },

    // Account name fallbacks
    fallback: {
      account: 'account',
      thisAccount: 'this account',
    },
  },
}
