// Edition wording overlay: ORGANIZATIONS (an edition with company tenants and
// no personal sign-up: admireveda.com, and on-prem / managed installs). Merged
// over the base catalog at load (src/i18n/overlay.js); it only replaces
// existing keys, never adds new ones (gate: scripts/check-edition-copy.mjs).
// Rule for this audience: the copy speaks to companies (team rollout, Company
// Brain, teach workflows, governance, hosted / managed / on-prem, talk to us)
// and never offers a personal plan, a free account or a personal sign-up.
// Honest claims only, no em-dashes, no provider names. An object keyed by
// array indexes patches those elements of a base list only
// (src/i18n/overlay_merge.js).
export default {
  common: {
    getStarted: 'Talk to us',
  },
  seo: {
    pricing: {
      title: 'Plans for Organizations - WorkCoPilot by AdmireVeda',
      description: 'WorkCoPilot plans for organizations: hosted by AdmireVeda, managed by AdmireVeda, or a private instance in your own cloud. Per user per month for at least 100 users, with company policy, single sign-on and a guided-hours pool. Talk to us.',
    },
  },
  home: {
    meta: {
      title: 'WorkCoPilot by AdmireVeda - Guided work for your whole organization',
      description: 'WorkCoPilot guides each person on your team step by step on their real screen, in your own apps, and keeps sensitive data on their device. Company Brain, teach workflows and company policy, hosted or in your own environment.',
    },
    badge: 'For organizations',
    hero: [
      { h: 'Every person on your team, <em>guided to done</em>.', s: 'It reads each screen, gives the exact next move in your own apps, and catches a wrong step as it happens.' },
      { h: 'Your know-how, <em>in every step</em>.', s: 'Company Brain and teach workflows put your own playbooks into the guidance, private to your company.' },
      { h: '<em>Governed by design</em>, redacted on each device.', s: 'Company policy you arm and lock, single sign-on, and sensitive data stripped before anything is sent.' },
    ],
    cta: {
      start: 'Talk to us',
    },
    cues: ['Works in the apps your people already use', 'Read-only: never clicks or runs anything for anyone', 'Hosted, or in your own environment'],
    pricing: {
      eyebrow: 'Plans',
      h2: 'Plans for organizations.',
      sub: 'Hosted by AdmireVeda, managed by AdmireVeda, or a private instance in your own cloud. Per user per month, and your company size sets the rate.',
      fullCompare: 'See plans for organizations',
    },
    final: {
      h2: 'Bring guided work to your organization.',
      p: 'Talk to us about a rollout for your team, or watch the 60-second demo first.',
      note2: 'Sign in with your company account, or with your work email for your company single sign-on. <a>Enterprise sign-in</a>.',
    },
  },
  login: {
    meta: {
      title: 'Sign In - WorkCoPilot by AdmireVeda',
      description: 'Sign in to WorkCoPilot with your company account or your company single sign-on to get step-by-step guidance on your own screen.',
    },
    pitchP: 'WorkCoPilot watches each screen, tells your people the exact next move, and catches a wrong turn before it costs you. It learns your own apps and playbooks, privately to your company.',
    newWeb: 'New to WorkCoPilot? <a>Talk to us at admireveda.com</a>',
  },
  pricing: {
    eyebrow: 'Plans for organizations',
    h1: 'Guided work for <em>your whole organization.</em>',
    sub: 'Choose how WorkCoPilot runs for you: hosted by AdmireVeda, managed by AdmireVeda, or a private instance in your own cloud. Security and privacy come with every plan, never as an upsell.',
    notes: {
      items: [
        { t: 'Priced by people', d: 'Each plan is priced per user per month, and your company size sets the rate for every user. A guided-hours pool your company administrator shares out.' },
        { t: 'Minutes, not blocks', d: 'Guided time is counted per minute used, never rounded up to the hour.' },
        { t: 'Your rollout', d: 'A named owner for your rollout, with single sign-on and company policy set before your people start.' },
        { t: 'How companies buy', d: 'A contract that matches how your company buys, a DPA, and invoices you download from your company console.' },
      ],
    },
    fine: 'Final terms are set in your contract. Taxes may apply by location.',
  },
  howItWorks: {
    cta: {
      start: 'Talk to us',
    },
  },
  faqPage: {
    getStarted: 'Talk to us',
    groups: {
      how: { items: { 2: { d: 'You can also upload reference documents to ground the steps; on the desktop app the file never leaves your device.' } } },
      pricing: {
        items: {
          0: {
            a: 'WorkCoPilot is sold to organizations, per user per month for at least 100 users: hosted by AdmireVeda, managed by AdmireVeda (plus AI at actual usage), or a private instance in your own cloud. Your company size sets the rate for every user. Talk to us.',
            d: 'AdmireVeda invoices your company under your contract; invoices are in your company console.',
          },
        },
      },
      compliance: {
        items: {
          3: {
            a: 'A summary DPA is public and a signed DPA is available on request. Guidance is produced by a major AI provider and hosting is by a cloud provider; the current list with entity names is available on request.',
          },
        },
      },
      start: {
        items: {
          0: {
            a: 'Talk to us to set WorkCoPilot up for your company. Once your administrator adds you, or you sign in with your company single sign-on, say what you want to get done and it starts guiding you on your screen. Nothing to install.',
            links: ['Sign in', 'See plans for organizations'],
          },
        },
      },
    },
  },
  fieldsPage: {
    startBtn: 'Bring it to your team',
  },
  securityPage: {
    guarantees: {
      2: { t: 'A second factor on every sign-in', d: 'Password sign-in needs an authenticator app on every account; company single sign-on uses the second factor your identity provider enforces.' },
    },
    mock: {
      fields: {
        2: 'Bank account',
      },
    },
  },
  useCases: {
    final: {
      cta: 'Talk to us',
    },
  },
  demoPage: {
    startFree: 'Talk to us',
    heroNote: 'Takes about a minute to watch.',
  },
  dashboardsHelp: {
    home: {
      lead: 'The dashboard is your home: your hours this month and your company pool, open tasks, the one thing to do next, and where you left off.',
      steps: {
        0: '<b>Read your plan.</b> The three tiles show hours left this month, your company pool, and your open task slots. The time chip at the top turns amber before you run low.',
        2: '<b>Add time.</b> Press <b>Add time</b> at the top to ask your administrator for more hours.',
      },
    },
  },
  workDashboard: {
    plan: {
      choose: 'No plan on this account yet',
    },
    meters: {
      sub: 'Hours this month, your company pool and open tasks. Hover the info on a tile for how it works.',
    },
  },
}
