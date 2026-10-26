// English strings for the affiliate program's admin surface
// (src/pages/workadmin/sections/Affiliates.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `affiliatesAdmin` namespace. Status codes, social keys and role codes stay as
// they are in the code; only their DISPLAY text lives here.
export default {
  affiliatesAdmin: {
    // Shared buttons
    cancel: 'Cancel',
    done: 'Done',

    // Modal shell
    modal: {
      close: 'Close',
    },

    // Status filter tabs, by status code ('' = all)
    status: {
      all: 'All',
      pending: 'Pending',
      approved: 'Approved',
      suspended: 'Suspended',
      rejected: 'Rejected',
    },

    // Row status badge, by status code
    badge: {
      approved: 'Approved',
      pending: 'Pending',
      suspended: 'Suspended',
      rejected: 'Rejected',
    },

    // Stripe Connect badge + hover titles
    stripe: {
      onboarded: 'Onboarded',
      onboardedTitle: 'Stripe Connect onboarding complete',
      incomplete: 'Incomplete',
      incompleteTitle: 'Started Stripe onboarding, not finished',
      notSetUp: 'Not set up',
      notSetUpTitle: 'Has not started Stripe onboarding',
    },

    // Social channel display names, by the key the public apply form posts
    social: {
      tiktok: 'TikTok',
      instagram: 'Instagram',
      youtube: 'YouTube',
      twitter: 'X',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      other: 'Other',
    },

    // Program settings card
    settings: {
      title: 'Program settings',
      desc: 'Applies to new approvals and new referrals. An affiliate’s own rate (set at approval or edited in the table) overrides the default.',
      errRate: 'Default commission must be a number from 0 to 100.',
      errMin: 'Minimum payout must be a dollar amount of 0 or more.',
      errDays: 'Cookie window must be from 1 to 365 days.',
      applications: 'Applications',
      applicationsOpen: 'Open - the public page shows the apply form',
      applicationsClosed: 'Closed - the public page says applications are closed',
      defaultCommission: 'Default commission',
      rateOfFirstPayment: '{rate}% of first payment',
      notSet: 'Not set',
      minPayout: 'Minimum payout',
      cookieWindow: 'Referral cookie window',
      days_one: '{n} day',
      days_other: '{n} days',
      toggleOpen: 'Applications open: the public page shows the apply form',
      toggleClosed: 'Applications closed: the public page says applications are closed',
      rateLabel: 'Default commission (% of first payment)',
      rateHint: 'Offered to new affiliates at approval.',
      minHint: 'A payout is refused below this pending balance.',
      daysLabel: 'Referral cookie window (days)',
      daysHint: 'How long a click keeps crediting the affiliate.',
      save: 'Save settings',
    },

    // Affiliate admins card (superadmin)
    admins: {
      title: 'Affiliate admins',
      desc: 'A separate admin account that runs the whole affiliate program - approve affiliates, set rates, manage program settings and run payouts. They sign in and see only this Affiliates console. Add one by email; they get a set-password link.',
      added: '{email} is now an affiliate admin. A set-password email is on the way.',
      revoked: '{username} is no longer an affiliate admin.',
      name: 'Name (optional)',
      namePlaceholder: 'Jordan Lee',
      email: 'Email',
      emailPlaceholder: 'jordan@example.com',
      add: 'Add affiliate admin',
      loading: 'Loading admins',
      colAdmin: 'Admin',
      colRole: 'Role',
      roleSuperadmin: 'Superadmin',
      roleAffiliateAdmin: 'Affiliate admin',
      revoke: 'Revoke',
    },

    // Approve modal
    approve: {
      title: 'Approve affiliate',
      approvedAt: '<b>{name}</b> is approved at <b>{rate}%</b>.',
      createdNote: 'A WorkCoPilot account was created for their email, and they can sign in to see their referral link and dashboard.',
      existingNote: 'Their existing WorkCoPilot account is now the affiliate account; the dashboard appears on their next visit.',
      intro: 'Approve <b>{name}</b> ({email}) and issue their referral code. Set the commission they earn on each referral’s first payment.',
      rateLabel: 'Commission rate',
      programDefault: 'Program default is {rate}%.',
      noDefault: 'No program default is set; enter a rate.',
      range: 'Must be 0 to 100.',
      approveAt: 'Approve at {rate}',
    },

    // Payout modal
    payout: {
      stepUpLabel: 'Running a payout',
      title: 'Pay out commission',
      sent: 'Sent <b>{amount}</b> to <b>{name}</b> covering <b>{count}</b> {unit} through Stripe Connect.',
      referral_one: 'referral',
      referral_other: 'referrals',
      transfer: 'Transfer: {id}',
      intro: 'Transfer <b>{name}</b>’s pending commission of <b>{amount}</b> to their connected Stripe account. Each earned referral in the balance is marked paid.',
      notOnboarded: 'This affiliate has not finished Stripe onboarding. The payout will be refused until they do.',
      belowMin: 'Pending balance is below the {min} program minimum. The payout will be refused.',
      pay: 'Pay {amount}',
    },

    // Inline rate edit
    rate: {
      edit: 'Edit rate',
      aria: 'Commission rate percent',
    },

    // Referral status badge, by status code
    refStatus: {
      paid: 'Paid',
      void: 'Void',
      earned: 'Earned',
    },

    // Referrals detail panel
    referrals: {
      loading: 'Loading referrals',
      applied: 'Applied',
      approved: 'Approved',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
      audience: 'Audience',
      notes: 'Notes',
      rejected: 'Rejected',
      reason: 'Reason: {reason}',
      socialMedia: 'Social media',
      noneProvided: 'None provided',
      socialTitle: '{label}: {value}',
      empty: 'No referrals yet.',
      colUser: 'Referred user',
      colFirstPayment: 'First payment',
      colRate: 'Rate',
      colCommission: 'Commission',
      colStatus: 'Status',
      colCreated: 'Created',
      colPaid: 'Paid',
    },

    // Main list
    main: {
      loading: 'Loading affiliates',
      filterAria: 'Filter by status',
      refresh: 'Refresh',
      awaitingReview: '{n} awaiting review',
      dismiss: 'Dismiss',
      emptyFiltered: 'No {status} affiliates',
      emptyTitle: 'No affiliates yet',
      emptyFilteredDetail: 'Try another status.',
      emptyDetail: 'When someone applies on the public affiliate page, they appear here for review.',
      appliedOn: 'Applied {date}',
      rejected: '{name} rejected.',
      suspended: '{name} suspended.',
      reinstated: '{name} reinstated.',
      rateSet: "{name}'s rate set to {rate}%.",
      approved: '{name} approved.',
      approvedCreated: '{name} approved and a WorkCoPilot account was created for them.',
      paid: 'Paid {amount} to {name}.',
    },

    // Main table columns
    cols: {
      affiliate: 'Affiliate',
      status: 'Status',
      code: 'Code',
      rate: 'Rate',
      clicks: 'Clicks',
      clicksTitle: 'Visits through the referral link',
      conv: 'Conv.',
      convTitle: 'Referrals who made a first payment',
      earned: 'Earned',
      pending: 'Pending',
      paid: 'Paid',
      stripe: 'Stripe',
    },

    // Row actions
    actions: {
      approve: 'Approve',
      approveTitle: 'Approve and set a rate',
      reject: 'Reject',
      rejectTitle: 'Reject with a reason',
      payOut: 'Pay out',
      payOutTitle: 'Pay out the pending balance through Stripe Connect',
      suspend: 'Suspend',
      suspendTitle: 'Suspend with a reason',
      reinstate: 'Reinstate',
      reinstateTitle: 'Lift the suspension',
      hideReferrals: 'Hide referrals',
      viewReferrals: 'View referrals',
      hide: 'Hide',
      view: 'View',
    },

    // Reject / suspend reason modal
    reason: {
      rejectTitle: 'Reject application',
      suspendTitle: 'Suspend affiliate',
      rejectMessage: "Reject {name}'s application ({email}). They will not get a referral code. The reason is kept on the record.",
      suspendMessage: 'Suspend {name}. New referrals stop being credited and their dashboard shows the account is on hold. You can reinstate later.',
    },
  },
}
