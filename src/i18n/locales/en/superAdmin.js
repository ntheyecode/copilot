// English strings for the WorkCoPilot SUPERADMIN console shell
// (src/pages/workadmin/WorkAdmin.jsx): nav labels, section titles/subs, the
// access gate, the header, the sign-out control, the incidents nav badge, the
// nav footer and the Appearance panel. Values are byte-identical to the former
// hardcoded English. Non-English locales fall back to this until translated.
// "WorkCoPilot" and "AdmireVeda" are brand terms and stay literal.
export default {
  superAdmin: {
    // Left-rail nav labels (resolved from SECTIONS[].label via t()).
    nav: {
      overview: 'Overview',
      companies: 'Companies',
      notifications: 'Notifications',
      governance: 'Governance',
      users: 'Users',
      pricing: 'Pricing',
      billing: 'Billing',
      finance: 'Finance',
      subscribers: 'Subscribers',
      cancelled: 'Cancelled',
      'subscription-health': 'Subscriber health',
      email: 'SMTP Settings',
      'email-templates': 'Email Templates',
      ai: 'AI config',
      social: 'Social sign-in',
      sessions: 'Sessions',
      leads: 'Leads',
      hero: 'Hero',
      tickets: 'Tickets',
      help: 'Help',
      incidents: 'Incidents',
      affiliates: 'Affiliates',
      claims: 'Claims',
      appearance: 'Appearance',
    },

    // Section heading (title) + subheading (sub) for the main pane
    // (resolved from SECTIONS[].title / SECTIONS[].sub via t()).
    sections: {
      overview: { title: 'Overview', sub: 'WorkCoPilot at a glance.' },
      companies: { title: 'Companies', sub: 'Tenancy: companies, company admins, users and redaction policy.' },
      notifications: { title: 'Notifications', sub: 'Enterprise alerts: companies nearing their pool, and additional-hours requests to review.' },
      governance: { title: 'Data governance', sub: 'Per-company DLP policy: what leaves the device, block words, compliance frameworks, arm & lock.' },
      users: { title: 'Users', sub: 'Tiers, balances and granted hours.' },
      pricing: { title: 'Pricing', sub: 'Plan prices, included hours per month, extra-hour and image rates.' },
      billing: { title: 'Billing', sub: 'Stripe keys, plan price ids and the webhook endpoint.' },
      finance: { title: 'Finance', sub: 'All transactions, revenue by week/month/quarter/year, MRR, and refunds.' },
      subscribers: { title: 'Subscribers', sub: 'Every paying subscriber and their operations: plan, status, cycle, MRR, lifetime paid, and today\'s activity.' },
      cancelled: { title: 'Cancelled subscribers', sub: 'Churned subscriptions: who canceled, when, why, and the lifetime revenue they brought before leaving.' },
      'subscription-health': { title: 'Subscriber health', sub: 'The individuals business at a glance: MRR by plan, trials, failed payments, plans set to end, churn over 30 days, and whether Stripe is wired.' },
      email: { title: 'SMTP Settings (Email / SES)', sub: 'Outbound email for delivering reports. MFA-gated. Enter your SES SMTP credentials and send a test.' },
      'email-templates': { title: 'Email Templates', sub: 'Every email the product sends - edit the wording, placeholders and preview. Nothing is static.' },
      ai: { title: 'AI configuration', sub: 'Platform AI for WorkCoPilot users.' },
      social: { title: 'Social sign-in', sub: 'The platform Google, Microsoft and Facebook apps behind the public sign-in buttons. One app each, for every customer.' },
      sessions: { title: 'Sessions', sub: 'Recent guided sessions across users.' },
      leads: { title: 'Leads', sub: 'Everyone who ran a live validation on the demo or sign-in page - newest first.' },
      hero: { title: 'Homepage hero', sub: 'The rotating headline and subtext on the public homepage. Superadmin edits; other admins view.' },
      tickets: { title: 'Support tickets', sub: 'Feature requests, bugs, billing and access issues from users.' },
      help: { title: 'Help', sub: 'How to run the admin console, screen by screen.' },
      incidents: { title: 'System incidents', sub: 'Real causes behind the "system is busy" message users see - AI quota, keys, 5xx, timeouts. Users never see these.' },
      affiliates: { title: 'Affiliate program', sub: 'Approve affiliates, set commission rates, track referrals and run Stripe Connect payouts.' },
      claims: { title: 'Business claims', sub: 'Every public claim mapped to the file and code that backs it, with an honesty status. MFA-gated; download a signed report.' },
      appearance: { title: 'Appearance', sub: 'Your accent color for the dashboards and the guide. Personal to you; it follows you across devices.' },
    },

    // Access gate screens (loading / denied / error).
    gate: {
      checkingTitle: 'Checking access',
      checkingBody: 'One moment.',
      deniedTitle: 'You need admin access',
      deniedBody: 'The WorkCoPilot admin console is available to AdmireVeda administrators. Sign in with an admin account to continue.',
      errorTitle: 'Could not load the console',
      errorBody: 'Please try again.',
      retry: 'Try again',
    },

    // Header brand sub-label and role chip.
    brandSub: 'AdmireVeda Admin',
    roleSuper: 'Superadmin',
    roleAdmin: 'Admin',
    signOut: 'Sign out',

    // Incidents nav badge tooltip / aria-label (24h count, pluralized).
    badge: {
      incidents_one: '{n} incident in the last 24h',
      incidents_other: '{n} incidents in the last 24h',
    },

    // Nav footer note.
    navFoot: 'WorkCoPilot - a separate product surface. Changes here do not touch the interview admin.',

    // Appearance panel (per-user accent picker host).
    appearancePanel: {
      title: 'Accent color',
      desc: 'Not everyone likes green. Pick the accent for your dashboards and the guide - it applies instantly and follows you across devices. <b>Default</b> keeps each console\'s own color: blue here, green for company admins and the guide.',
    },

    // Notifications page (src/pages/workadmin/sections/Notifications.jsx).
    notifications: {
      howTitle: 'How alerts work',
      howDesc: 'Each alert is delivered in two places at once: here on this page and by email. These rules apply to every company; the threshold and whether a company can request more hours are set per company on the Companies page.',
      feedTitle: 'Your alerts',
      refresh: 'Refresh',
      markAll: 'Mark all read',
      loading: 'Loading alerts',
      emptyTitle: 'No alerts yet',
      emptyDetail: 'Pool-threshold and additional-hours alerts will appear here.',
      justNow: 'just now',
      minsAgo: '{n} min ago',
      hoursAgo: '{n} h ago',
      daysAgo: '{n} d ago',
      rules: {
        poolWhat: 'A company reaches its pool alert threshold',
        poolWho: 'AdmireVeda (here and by email)',
        requestWhat: 'A company admin requests more hours',
        requestWho: 'AdmireVeda (here and by email)',
        userWhat: 'A team member reaches their allowance threshold',
        userWho: 'That company\'s admins (their dashboard and by email)',
        decisionWhat: 'An hours request is approved or declined',
        decisionWho: 'That company\'s admins (their dashboard and by email)',
      },
    },
  },
}
