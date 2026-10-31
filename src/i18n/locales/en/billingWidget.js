// English strings for the self-serve Billing section of the /work dashboard
// (src/components/WorkBilling.jsx), keyed under the `billingWidget` namespace.
// Interpolations: {plan} = a plan name (Lite/Basic/Advanced/Premium, never
// translated), {cycle} = the lower-case cycle word (cycle.annualLower /
// cycle.monthlyLower), {date} = a formatted date, {n} = an hour count.
// Stripe and PCI are never translated. <b> and <a> render via t.rich; in the
// comingOnline note <a> is the inline Manage billing button.
export default {
  billingWidget: {
    aria: 'Billing and subscription',
    status: {
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Past due',
      canceled: 'Canceled',
      none: 'No active plan',
    },
    invStatus: {
      paid: 'Paid',
      open: 'Open',
      draft: 'Draft',
      void: 'Void',
      uncollectible: 'Uncollectible',
    },
    errors: {
      portalOpen: 'Could not open billing. Please try again.',
      portalUnavailable: 'Billing is not available right now.',
      change: 'Could not change your plan right now. Please try again, or use Manage billing.',
    },
    head: {
      title: 'Billing and plan',
      sub: 'Manage your subscription, payment method and invoices. Changes are handled securely through Stripe.',
      manage: 'Manage billing',
    },
    settingUp: 'Billing is being set up. Your plan details and invoices will appear here once it is live.',
    pastDue: {
      title: 'Your last payment did not go through.',
      body: 'Update your payment method to keep your access. Your plan stays active while you fix this.',
      fix: 'Fix payment',
    },
    canceledNote: {
      canceled: 'Your plan is canceled.',
      scheduled: 'Your plan is set to cancel.',
      access: 'You keep full access until <b>{date}</b>. You can pick a plan again any time before then.',
    },
    current: {
      noPlan: 'No plan',
      perYear: 'year',
      perMonth: 'month',
      hoursPerMonth_one: '{n} hour / month',
      hoursPerMonth_other: '{n} hours / month',
      accessUntil: 'Access until',
      trialEnds: 'Trial ends',
      renews: 'Renews',
    },
    cycle: {
      annual: 'Annual',
      monthly: 'Monthly',
      annualLower: 'annual',
      monthlyLower: 'monthly',
      perYr: 'yr',
      perMo: 'mo',
    },
    result: {
      now: 'You are now on {plan} ({cycle}). The change is effective immediately.',
      scheduledOn: 'Your switch to {plan} ({cycle}) is scheduled for {date}. You keep your current plan until then.',
      scheduledPeriodEnd: 'Your switch to {plan} ({cycle}) is scheduled for the end of your current period. You keep your current plan until then.',
    },
    comingOnline: 'In-app plan changes are coming online shortly. In the meantime you can change your plan through <a>Manage billing</a>.',
    change: {
      title: 'Change your plan',
      cycleAria: 'Billing cycle',
      current: 'Current',
      contactUs: 'Contact us',
      hoursGuided_one: '{n} hour of guided time / month',
      hoursGuided_other: '{n} hours of guided time / month',
      yourPlan: 'Your plan',
      upgrade: 'Upgrade',
      downgrade: 'Downgrade',
      switchAnnual: 'Switch to annual',
      switchMonthly: 'Switch to monthly',
      note: 'Downgrades take effect at your next renewal; upgrades apply right away with prorated credit.',
      cancel: 'Cancel plan',
    },
    noPlanYet: 'You do not have a plan yet. Start one from the plan chooser above to unlock guidance, then manage it here.',
    invoices: {
      title: 'Invoices',
      paymentMethod: 'Payment method',
      loading: 'Loading invoices...',
      empty: 'No invoices yet. They appear here after your first payment.',
      view: 'View',
      pdf: 'PDF',
    },
    trust: {
      badge: 'Secured by Stripe',
      text: 'PCI-compliant checkout · your card details are never stored on our servers.',
    },
    confirm: {
      aria: 'Confirm plan change',
      upgradeTo: 'Upgrade to {plan}',
      changeTo: 'Change to {plan}',
      upNote: 'This upgrade takes effect immediately. Stripe prorates your current period, so you are only charged the difference now.',
      downNote: 'This change takes effect at the end of your current billing period. You keep your current plan and its included hours until then, with no new charge today.',
      fine: 'You will see the exact amount and timing confirmed on the next screen. You can change or cancel again any time.',
      notNow: 'Not now',
      confirmUpgrade: 'Confirm upgrade',
      confirmChange: 'Confirm change',
    },
    cancelModal: {
      aria: 'Cancel plan',
      title: 'Cancel your plan?',
      noteDate: 'Your plan stays active and you keep full access until the end of your current billing period (<b>{date}</b>). You will not be charged again. You can pick a plan back up any time.',
      note: 'Your plan stays active and you keep full access until the end of your current billing period. You will not be charged again. You can pick a plan back up any time.',
      fine: 'Cancellation is completed on the secure Stripe portal, where you can confirm and see your exact end date.',
      keep: 'Keep my plan',
      continue: 'Continue to cancel',
    },
    // In-app cancel at the period end, and resume (server/billing_lifecycle.js).
    lifecycle: {
      reasonLabel: 'Tell us why (optional)',
      reasonPh: 'A line or two helps us improve',
      fine: 'Your plan ends at the period end, with no new charge. Change your mind before then and resume with one click.',
      confirmCancel: 'Cancel at period end',
      resume: 'Resume my plan',
      errCancel: 'Could not cancel your plan right now. Please try again or write to support.',
      errResume: 'Could not resume your plan right now. Please try again or write to support.',
    },
    // The one billing state that needs action, on the dashboard and the billing page.
    alert: {
      pastDueTitle: 'Your last payment did not go through',
      pastDueBody: 'Update your payment method to keep your plan. Guidance pauses until the payment clears.',
      pastDueCta: 'Update payment method',
      endingTitle: 'Your plan ends on {date}',
      endingBody: 'You keep full access until then. Resume any time before that date to keep renewing.',
      endingCta: 'Resume plan',
      pendingTitle: 'Switching to {plan} on {date}',
      pendingBody: 'You keep your current plan and its hours until then. Nothing is charged today.',
    },
    page: {
      title: 'Billing',
      sub: 'Your plan, payment method and invoices.',
    },
  },
}
