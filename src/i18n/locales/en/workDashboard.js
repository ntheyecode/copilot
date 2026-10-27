// English strings for the signed-in WorkCoPilot dashboard overview
// (src/pages/work/Dashboard.jsx). One partial per i18n wave, deep-merged into
// the English base by src/i18n/index.jsx. Keys live under the `workDashboard`
// namespace. A non-English locale that lacks a key falls back to this English,
// so a newly keyed string reads in English until it is translated.
export default {
  workDashboard: {
    // ---- Co-brand strip (company users) ----
    cobrand: {
      aria: '{company}, powered by WorkCoPilot',
      eyebrow: 'Your workspace',
      poweredBy: 'powered by',
      exec: 'Executive dashboard',
    },

    // ---- Hello + plan line (the single h1) ----
    hello: 'Hello {name}',
    plan: {
      admin: 'Administrator access, guidance on',
      company: '{company} team, {mins} min of guidance left today',
      covered: '{plan} plan, {mins} min of guidance left today',
      choose: 'Free account, choose a plan to start guiding',
      free: 'Free access, {mins} min of guidance left today',
      yourCompany: 'Your company',
    },

    // ---- Metrics row (new, guided, with tooltips) ----
    metrics: {
      heading: 'Your day at a glance',
      sub: "What you have left today. Hover a tile's info for details.",
      info: 'How this works',
      minutes: {
        label: 'Minutes left today',
        unit: 'min',
        on: 'Guidance on',
        onSub: 'Always available on your account',
        tip: 'Daily minutes, resets at {reset}. Counted only while WorkCoPilot is actively guiding you, so pausing keeps time in reserve.',
        tipAdmin: 'As an administrator you have live guidance on at all times, with no daily minute limit.',
      },
      tasks: {
        label: 'Tasks left today',
        unlimited: 'Unlimited',
        tip: 'How many new tasks you can start today. Resets at {reset}.',
      },
      credits: {
        label: 'Banked credits',
        tip: 'Unused tasks you kept. These never expire.',
      },
      low: 'Running low',
      trade: {
        label: 'Trade 2 tasks to 1 hour',
        busy: 'Trading',
        note: 'Turn 2 banked credits into an extra hour of guidance time.',
      },
    },

    // ---- Big Start a task CTA (new hero) ----
    start: {
      eyebrow: 'Ready when you are',
      title: 'Start a task',
      benefit: 'Describe what you want done. WorkCoPilot guides you step by step on your screen.',
      cta: 'Start a task',
      locked: 'Finish AI setup to start guiding. The note above has the next step.',
    },

    // ---- Admin note ----
    adminNote: 'You have administrator access, so live guidance is on for you.',
    adminNoteLink: 'Open the admin console',

    // ---- Plan chooser (needsSub) ----
    sub: {
      title: 'Choose a plan to start',
      lead: 'Pick a plan to turn on live guidance. Billed per minute you use, never by the hour. Change or cancel anytime; resets daily at {reset}.',
      popular: 'Most popular',
      perMonth: '/mo',
      hours_one: '{n} hour of daily minutes',
      hours_other: '{n} hours of daily minutes',
      choose: 'Choose {plan}',
      errGeneric: 'Could not start checkout. Please try again.',
      errBilling: 'Billing is not available right now.',
      teamNote: 'On a team plan? If your company covers WorkCoPilot, ask your administrator to add you and guidance turns on automatically.',
      demoPre: 'Not ready to subscribe?',
      demoLink: 'See exactly how it works in the demo',
    },

    // ---- Add time / out of time note ----
    buy: {
      titleOut: 'You are out of time for today',
      title: 'Add more guidance time',
      body: 'Daily minutes reset at {reset}. Top-up time never expires and stacks on your plan. Ask your administrator to add time.',
      dismiss: 'Dismiss',
    },

    // ---- AI setup notes ----
    ai: {
      checkFailPre: 'We could not check your AI status just now.',
      retry: 'Retry',
      admin: 'Set the platform AI key in the admin console to turn WorkCoPilot on for everyone.',
      adminLink: 'admin console',
      companyAdmin: 'Finish AI setup for your company in the company console under AI keys. Until then, your team is on hold.',
      companyAdminLink: 'company console',
      member: 'Your workspace is being set up. Your administrator needs to finish AI setup before you can start, please check back shortly.',
      solo: 'WorkCoPilot is being provisioned for your account. Please check back shortly, or contact support if this persists.',
    },

    // ---- Resume sessions ----
    sessions: {
      title: 'Resume where you left off',
      sub: 'Pick up right where you left off. Your history lives on its own page.',
      viewAll: 'View all',
      loadErrTitle: 'Could not load your sessions',
      loadErrBodyPre: 'This looks like a connection hiccup, not an empty list.',
      tryAgain: 'Try again',
      emptyTitle: 'No sessions yet',
      emptyBody: 'Start a task and it is saved here. You can pause anytime and come back to the exact step you were on.',
      noneTitle: 'Nothing in progress',
      noneBodyPre: 'Every plan you finished is in your',
      noneBodyCompleted: 'completed tasks',
      noneBodyMid: ', and every run is in your',
      noneBodyLogs: 'session logs',
      stepWas: 'You were at: {step}',
      notStarted: 'Not started yet',
      completed: 'Completed',
      stepsLabel: 'steps',
      resume: 'Resume',
      open: 'Open',
      delete: 'Delete session',
      viewAllLogs: 'View all / Session logs',
    },

    // ---- Buddy + data protection ----
    buddy: {
      title: 'Your buddy',
      caption: 'Shows the next step on your screen.',
    },
    dp: {
      title: 'Data protection',
      captionCompanyAdmin: 'Managed in your admin console',
      captionCompany: 'Managed by your company',
      captionSolo: 'Customize what gets scrubbed before sending',
      bodyCompanyAdminPre: "Your company's data protection rules live in the",
      bodyCompanyAdminLink: 'company console',
      bodyCompanyAdminPost: 'under Data governance. The built-in protections always apply.',
      bodyCompany: 'Your company manages data protection rules for everyone on the team. The built-in protections, emails, keys, card numbers, SSNs, IP addresses and more, always apply on your device before anything is sent.',
    },

    // ---- Delete session modal ----
    del: {
      title: 'Delete this session?',
      untitled: 'Untitled session',
      reasonLabel: 'Why are you deleting it?',
      required: 'required',
      reasonPlaceholder: 'e.g. duplicate, created by mistake, task no longer needed',
      note: "This is recorded in your company's user activity log: who deleted it, when, the reason, and what the session was about.",
      cancel: 'Cancel',
      confirm: 'Delete session',
      errGeneric: 'Could not delete the session. Please try again.',
    },
  },
}
