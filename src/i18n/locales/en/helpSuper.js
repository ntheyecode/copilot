// English strings for the superadmin Help page (src/pages/workadmin/sections/
// HelpSuper.jsx). Keyed under the `helpSuper` namespace; the i18n loader
// deep-merges every en/*.js partial into the English base, so this file owns its
// own namespace and never collides with the other i18n waves.
export default {
  helpSuper: {
    flow: {
      signin: 'Sign in',
      companies: 'Create a company',
      users: 'Set up its people',
      pricing: 'Set pricing',
      ai: 'Configure AI',
      overview: 'Watch the overview',
    },
    panel: {
      title: 'The operator flow',
      lead: 'From sign-in to a company that is live. Click a step to jump to it.',
    },
    signin: {
      title: 'Sign in',
      lead: 'An AdmireVeda admin account opens this console.',
      steps: {
        emailSso: { t: 'Email & SSO tab', d: 'On the sign-in page, pick the Email & SSO tab.' },
        account: { t: 'Your admin account', d: 'Username and password, then the code if MFA is on.' },
        console: { t: 'Admin console', d: 'Open /work/admin. Company admins land in their own console.' },
      },
      shot: {
        alt: 'The WorkCoPilot sign-in page with the Social and Email & SSO tabs.',
        caption: 'Sign-in page. Admins use the Email & SSO tab.',
      },
    },
    overview: {
      open: 'Overview',
      title: 'Overview',
      lead: 'The product at a glance.',
      steps: {
        users: { t: 'Users', d: 'Everyone on WorkCoPilot, split by tier.' },
        active: { t: 'Active now', d: 'Who is being guided in the last five minutes.' },
        sessions: { t: 'Sessions', d: 'Started today, and all time.' },
        platformAi: { t: 'Platform AI', d: 'On or off. Off means users run their own keys.' },
      },
      shot: {
        alt: 'Admin Overview cards: users, active now, sessions today, total sessions, purchased hours and platform AI.',
        caption: 'Overview cards.',
      },
    },
    companies: {
      open: 'Companies',
      title: 'Companies',
      lead: 'Every tenant, its admins, its people and its policy.',
      steps: {
        new: { t: 'New company', d: 'Name, plan and licenses. Everything after is scoped to it.' },
        expand: { t: 'Expand a row', d: 'Admins, users, SSO, AI source and redaction, all in one place.' },
        admin: { t: 'Add its admin', d: 'The first company admin runs the rest from their own console.' },
      },
      shot: {
        alt: 'Companies: the list with the New company button and a company row showing users, admins, AI and redaction status.',
        caption: 'Companies, one row per tenant.',
      },
    },
    users: {
      open: 'Users',
      title: 'Users',
      lead: 'Tiers, balances and granted hours for every user.',
      steps: {
        search: { t: 'Search', d: 'By username.' },
        tier: { t: 'Tier', d: 'Change it inline.' },
        companyRole: { t: 'Company and role', d: 'Change moves a user into a company or sets their role.' },
        hours: { t: 'Hours and access', d: 'Grant hours, or comp premium access for an individual.' },
      },
      shot: {
        alt: 'Users table: tier selector, company and role with a Change button, free time left today, purchased balance and sessions.',
        caption: 'Users with inline tier and company controls.',
      },
    },
    pricing: {
      open: 'Pricing',
      title: 'Pricing',
      lead: 'What each tier costs and what it includes.',
      steps: {
        edit: { t: 'Edit', d: 'Opens every value for change.' },
        perTier: { t: 'Per tier', d: 'Monthly price, hours per day, tasks per day, re-plans, extra hour and image rates.' },
        save: { t: 'Save', d: 'Takes effect for new purchases right away.' },
      },
      shot: {
        alt: 'Pricing: currency and the per-tier price, hours, tasks, re-plans, extra hour and image rates.',
        caption: 'Pricing record. Edit to change it.',
      },
    },
    ai: {
      open: 'AI config',
      title: 'AI configuration',
      lead: 'The platform AI that users run on when they have no key of their own.',
      steps: {
        providers: { t: 'Providers and keys', d: 'Add a provider key, test it, pick the chat and vision models.' },
        platformAi: { t: 'Platform AI', d: 'Turn it on so users without a key are covered.' },
        webSearch: { t: 'Web search', d: 'A search key for live web learning.' },
      },
      shot: {
        alt: 'AI configuration: cost-effective models, AI providers and keys, and web search.',
        caption: 'AI providers, keys and models.',
      },
    },
  },
}
