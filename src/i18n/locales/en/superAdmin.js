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
      governance: 'Governance',
      users: 'Users',
      pricing: 'Pricing',
      billing: 'Billing',
      finance: 'Finance',
      subscribers: 'Subscribers',
      cancelled: 'Cancelled',
      email: 'SMTP Settings',
      'email-templates': 'Email Templates',
      ai: 'AI config',
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
      governance: { title: 'Data governance', sub: 'Per-company DLP policy: what leaves the device, block words, compliance frameworks, arm & lock.' },
      users: { title: 'Users', sub: 'Tiers, balances and granted hours.' },
      pricing: { title: 'Pricing', sub: 'Plan prices, extra-hour and image rates.' },
      billing: { title: 'Billing', sub: 'Stripe keys, plan price ids and the webhook endpoint.' },
      finance: { title: 'Finance', sub: 'All transactions, revenue by week/month/quarter/year, MRR, and refunds.' },
      subscribers: { title: 'Subscribers', sub: 'Every paying subscriber and their operations: plan, status, cycle, MRR, lifetime paid, and today\'s activity.' },
      cancelled: { title: 'Cancelled subscribers', sub: 'Churned subscriptions: who canceled, when, why, and the lifetime revenue they brought before leaving.' },
      email: { title: 'SMTP Settings (Email / SES)', sub: 'Outbound email for delivering reports. MFA-gated. Enter your SES SMTP credentials and send a test.' },
      'email-templates': { title: 'Email Templates', sub: 'Every email the product sends - edit the wording, placeholders and preview. Nothing is static.' },
      ai: { title: 'AI configuration', sub: 'Platform AI for WorkCoPilot users.' },
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
  },
}
