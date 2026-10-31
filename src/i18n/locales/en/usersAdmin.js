// English strings for the superadmin Users section
// (src/pages/workadmin/sections/Users.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `usersAdmin` namespace. Role/status/tier CODES are never localized here; only
// their display text is.
export default {
  usersAdmin: {
    loading: 'Loading users',

    // Table column headers
    columns: {
      user: 'User',
      tier: 'Tier',
      company: 'Company & role',
      usedToday: 'Used today',
      planLeft: 'Plan hours left',
      purchased: 'Purchased balance',
      remaining: 'Total remaining',
      sessions: 'Sessions',
      mfa: '2FA',
    },

    // Non-superadmin note + toolbar
    viewOnlyNote: 'Changing a tier or granting hours requires superadmin access. You can view everything here.',
    searchPlaceholder: 'Search by username',
    newUser: 'New user',
    newUserTitle: 'Create a new WorkCoPilot user',
    superadminOnly: 'Superadmin only',
    countOf: '{shown} of {total}',

    // Create-a-user panel
    create: {
      heading: 'Create a user',
      desc: 'Create a WorkCoPilot account. Optionally put them in a company as a member or a <b>company admin</b>, set the tier, and grant free (comped) access so they can use the service without Stripe.',
      username: 'Username',
      usernamePlaceholder: 'jordan',
      email: 'Email',
      emailHint: '(sends a set-password link)',
      emailPlaceholder: 'jordan@acme.com',
      tempPassword: 'Temporary password',
      tempPasswordHint: '(optional)',
      tempPasswordPlaceholder: 'leave blank - they set it from the email',
      company: 'Company (optional)',
      noCompanyOption: 'No company (individual user)',
      roleInCompany: 'Role in company',
      // Role / flow option labels live in companyAdmin.roles.* / companyAdmin.flows.*
      // (one label per id, read through src/shared/work_roles_options.js).
      flowInCompany: 'Work flow',
      flowHint: '(worker: assigned tasks only; mixed: both)',
      tier: 'Tier',
      freeCheckbox: 'Free (comped) access, no Stripe needed',
      submit: 'Create user',
      cancel: 'Cancel',
    },

    // Create validation + result toasts
    createMsg: {
      usernameMin: 'Enter a username (2+ characters).',
      passwordMin: 'A password must be at least 6 characters.',
      emailOrPassword: 'Add an email to send a set-password link, or set a password.',
      emailInvalid: 'Enter a valid email address.',
      created: 'Created {username}{companySuffix}.{emailSuffix}',
      setPasswordEmailed: 'A set-password link was emailed to {email}.',
      couldNotCreate: 'Could not create the user.',
    },

    // Empty states
    empty: {
      title: 'No users match',
      detailSearch: 'Try a different search.',
      detailNone: 'No WorkCoPilot users have been provisioned yet.',
    },

    // Row: disabled badge, display name, company column
    disabledBadge: 'Disabled',
    exhausted: 'exhausted',
    // Hover on the Plan hours left cell: what the number is.
    planLeftTitle: 'Included plan hours left this month. It renews on the 1st; purchased hours are counted separately.',
    companyEdit: {
      noCompany: 'No company',
      flow: 'Work flow',
      flowTitle: 'How guided tasks reach this person: Independent starts their own, Worker only does assigned tasks, Mixed does both.',
      save: 'Save',
      cancel: 'Cancel',
    },
    companyRole: {
      admin: 'admin',
      executive: 'executive',
      member: 'member',
    },
    individual: 'Individual',
    change: 'Change',
    changeCompanyTitle: 'Set company & role',

    // 2FA column
    mfaOn: 'On',
    mfaResetTitle: 'Reset authenticator (lost phone / offboarding)',
    mfaNotSet: 'Not set up',

    // Actions
    actions: {
      hoursAriaLabel: 'Hours to grant',
      add: 'Add',
      cancel: 'Cancel',
      openAsUser: 'Open as user',
      openAsUserTitle: 'Open the dashboard as this user (support view; recorded in the audit trail)',
      freeAccessOnTitle: 'Free (comped) premium access is ON - click to revoke',
      freeAccessGrantTitle: 'Grant free premium access (unlocks guidance, no charge)',
      freeAccessOn: 'Free access ✓',
      freeAccessGrant: 'Grant free access',
      grantHours: 'Grant hours',
      more: 'More',
      grantHoursTitle: 'Grant purchased hours',
      refundLast: 'Refund last',
      refundLastTitle: 'Refund the most recent payment',
      cancelSub: 'Cancel sub',
      cancelSubTitle: 'Cancel the subscription now',
      accountingRemoveTitle: 'Remove the accounting role',
      accountingGrantTitle: 'Make accounting (sees all transactions + refunds)',
      accountingOn: 'Accounting ✓',
      accounting: 'Accounting',
      enableTitle: 'Re-enable this account',
      disableTitle: 'Disable this account (signs them out, blocks sign-in)',
      enable: 'Enable',
      disable: 'Disable',
      deleteTitle: 'Delete this account and its sessions permanently',
      delete: 'Delete',
    },

    // Row action toasts
    toasts: {
      movedTo: 'Moved to {name}',
      companyFallback: 'company',
      removedFromCompany: 'Removed from company',
      couldNotUpdateCompany: 'Could not update the company',
      couldNotOpenAsUser: 'Could not open the dashboard as this user',
      refunded: 'Refunded {amt} {currency}',
      refundProcessed: 'Refund processed',
      subscriptionCanceled: 'Subscription canceled',
      twoFactorReset: 'Two-factor reset.',
      accountingGranted: 'Accounting role granted.',
      accountingRemoved: 'Accounting role removed.',
      tierSet: 'Tier set to {tier}',
      couldNotChangeTier: 'Could not change tier',
      freeRevoked: 'Free access revoked',
      freeGranted: 'Free access granted (premium)',
      couldNotChangeFree: 'Could not change free access',
      grantHoursPositive: 'Enter a positive number of hours',
      granted: 'Granted {hours}h',
      couldNotGrantHours: 'Could not grant hours',
    },

    // Confirm (ReasonModal) copy per mode
    confirm: {
      nameFallback: 'this account',
      deleteTitle: 'Delete {name}',
      deleteMessage: 'Permanently delete this account and all of its sessions and evidence. This cannot be undone.',
      deleteConfirm: 'Delete account',
      enableTitle: 'Re-enable {name}',
      enableMessage: 'The account can sign in and use the service again.',
      enableConfirm: 'Enable',
      disableTitle: 'Disable {name}',
      disableMessage: 'The account is signed out everywhere and cannot sign in until re-enabled.',
      disableConfirm: 'Disable',
      refundTitle: 'Refund {name}',
      refundMessage: 'Refund the most recent payment for this account. This moves real money and cannot be undone.',
      refundConfirm: 'Refund last payment',
      cancelTitle: 'Cancel subscription for {name}',
      cancelMessage: 'End the subscription now. Their guiding access stops immediately.',
      cancelConfirm: 'Cancel subscription',
      mfaTitle: 'Reset two-factor for {name}',
      mfaMessage: 'They are signed out and must set up their authenticator again on next sign-in. Use this when someone loses their phone.',
      mfaConfirm: 'Reset authenticator',
      accountingGrantTitle: 'Grant accounting role to {name}',
      accountingGrantMessage: 'They will see all transactions and can issue refunds, but nothing else in the admin console.',
      accountingGrantConfirm: 'Grant accounting',
      accountingRemoveTitle: 'Remove accounting role from {name}',
      accountingRemoveMessage: 'They lose access to transactions and refunds.',
      accountingRemoveConfirm: 'Remove accounting',
      defaultTitle: 'Confirm',
      defaultConfirm: 'Confirm',
    },
  },
}
