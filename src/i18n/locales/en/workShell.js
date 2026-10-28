// English strings for the signed-in WorkCoPilot app CHROME: the shared shell
// (src/pages/work/WorkAppLayout.jsx: rail + top-bar section titles and
// controls, the plan pill + its popover (src/pages/work/PlanPill.jsx), the buy
// hours modal, Android update banner, no-access and signed-out-elsewhere
// screens, guardrail notice),
// the My tasks / Completed tasks / Session logs sub-pages (src/pages/WorkTasks.jsx,
// src/pages/WorkLogs.jsx) and the legal re-consent gate
// (src/components/LegalConsentGate.jsx). One partial per i18n wave, deep-merged
// into the English base by src/i18n/index.jsx. Keys live under the `workShell`
// namespace. A non-English locale that lacks a key falls back to this English.
//
// Text these surfaces SHARE with the dashboard (the sessions load error + Try
// again, "No sessions yet", "Untitled session", "Delete session" and the
// delete-session modal) is NOT duplicated here: the pages read the existing
// `workDashboard.sessions.*` / `workDashboard.del.*` keys (SUPREME RULE II:
// one text, one key).
export default {
  workShell: {
    // ---- Rail items + top-bar section titles. One key per in-shell route, read
    // by BOTH the rail item and the top-bar <h2>, so they can never disagree. ----
    nav: {
      sections: 'Sections',
      dashboard: 'Dashboard',
      start: 'Start a task',
      projects: 'Projects',
      projectsTip: 'Projects (large goals as a map of tasks)',
      tasks: 'My tasks',
      tasksTip: 'My tasks (in progress or paused)',
      completed: 'Completed tasks',
      logs: 'Session logs',
      skills: 'Skills',
      help: 'Help',
      helpTip: 'Help & how-to',
      howto: 'How-to',
      support: 'Support',
      team: 'Team',
      exec: 'Executive dashboard',
      admin: 'Admin console',
    },

    // ---- Android self-update banner ----
    update: {
      body: 'A new version of WorkCoPilot is ready.',
      bodyVersion: 'A new version of WorkCoPilot ({version}) is ready.',
      cta: 'Update',
    },

    // ---- Signed in, but the account has no WorkCoPilot access ----
    noAccess: {
      body: 'Your account does not have WorkCoPilot access. Ask your administrator to enable it.',
      signOut: 'Sign out',
    },

    // ---- AI input guardrail notice (warn-and-proceed) ----
    guard: {
      dismiss: 'Dismiss notice',
    },

    // ---- Signed out because the account signed in elsewhere ----
    evicted: {
      title: 'Signed out',
      body: 'Your account was just signed in from another location. For your security, WorkCoPilot keeps <b>one active session at a time</b>, so this session was signed out.',
      cta: 'Sign in again',
    },

    // ---- Top bar: menu toggle, the time chip, buy hours, add time, upgrade,
    // the Windows app link, sign out, and the admin impersonation banner ----
    top: {
      viewingAs: 'You are viewing as <b>{name}</b> (admin support)',
      stop: 'Stop',
      collapseMenu: 'Collapse menu',
      expandMenu: 'Expand menu',
      retryUsage: 'Could not load your plan. Retry',
      retry: 'Retry',
      timeChipTitle: '{plan} plan: {time} of guided time left',
      left: 'left',
      buyHoursTitle: 'Buy top-up hours. They never expire.',
      buyHours: 'Buy hours',
      buyHoursShort: 'Buy',
      addTime: 'Add time',
      upgradeTitle: 'Upgrade to {tier}',
      upgradeTitleGeneric: 'Upgrade your plan',
      upgrade: 'Upgrade',
      windowsAppTitle: 'Get the Windows app',
      windowsApp: 'Windows app',
      signOut: 'Sign out',
    },

    // ---- The plan pill (src/pages/work/PlanPill.jsx) and its popover: this
    // month's included hours, top-up hours, a company allowance or pool, today's
    // tasks, and the one actionable state. The unit words feed fmtDuration. ----
    plan: {
      unitH: 'h',
      unitMin: 'min',
      active: 'Active',
      name: '{plan} plan',
      open: '{plan} plan, {time} of guided time left, {tasks}. Open plan details',
      close: 'Close plan details',
      dialog: 'Your plan',
      hoursTitle: 'Hours this month',
      usedOf: '{used} used of {included}',
      renews: 'Renews {date}',
      carry: 'Unused hours carry over to next month',
      carryCap: 'Unused hours carry over, up to {hours}',
      carried: '{time} carried over from last month',
      allowance: 'Your allowance',
      allowanceUsed: '{used} used of {limit} per {window}',
      allowanceResets: 'Resets {reset}',
      windowDay: 'day',
      windowWeek: 'week',
      windowMonth: 'month',
      companyPool: 'Company pool',
      companyPoolNote: 'Shared hours your whole team draws from this month.',
      topup: 'Top-up hours',
      topupNote: 'Bought on top of your plan. They never expire.',
      // Task slots. Individuals: open tasks of the at-once maximum (hours are
      // the only usage limit, nothing resets). Company members with an
      // admin-set ceiling: started of cap, and when it resets.
      tasksOpenTitle: 'Open tasks',
      tasksTitle: 'Tasks',
      tasksUnlimited: 'Unlimited',
      tasksUnlimitedAria: 'unlimited tasks',
      tasksOpenAria: '{open} of {max} tasks open',
      tasksRoom_one: 'Room for {n} more',
      tasksRoom_other: 'Room for {n} more',
      tasksFull: 'Finish or pick one up to start another',
      tasksLeftAria: '{remaining} of {cap} tasks left',
      tasksReset: 'Resets {reset}',
      tasksLimitHit: 'New tasks open {reset}',
      statePool: "Your company's shared hours for this month are used up. Ask your administrator to add hours.",
      stateCeiling: 'You have used the guided time {company} set for you. It opens again at the next reset.',
      stateExhausted: 'Your plan hours for this month are used up. Buy top-up hours, upgrade, or wait for {date}.',
      stateExhaustedCompany: 'Your plan hours for this month are used up. They renew {date}. Ask your administrator if you need more before then.',
      stateLow: 'Only {time} of guided time left this month.',
      stateLowCompany: 'Only {time} of guided time left this month. Ask your administrator if you need more.',
      stateTasksFull: 'You have {max} tasks open, the most at once. Finish or pick one up to start another.',
      stateTasksLimit: 'You have started all {cap} tasks your company allows for now. New tasks open {reset}.',
      actBuy: 'Buy hours',
      actUpgrade: 'Upgrade',
      actTasks: 'My tasks',
    },

    // ---- Buy top-up hours / an image bundle (one-time checkout modal) ----
    buy: {
      titleHours: 'Buy top-up hours',
      titleImages: 'Buy an image bundle',
      bodyHours: 'Top-up hours stack on your {plan} plan and never expire. You pay once; your subscription does not change.',
      bodyImages: 'Images on the {plan} plan come in bundles of {min} or more. They never expire.',
      qtyHours: 'Number of hours',
      qtyImages: 'Number of images',
      required: 'required',
      unit: 'Price',
      perHour: 'per hour',
      perImage: 'per image',
      total: 'Total',
      cancel: 'Cancel',
      continue: 'Continue to checkout',
      errWhole: 'Enter a whole number greater than zero.',
      errMin: 'The smallest image bundle is {min}.',
      errCheckout: 'Could not start checkout. Please try again.',
    },

    // ---- My tasks / Completed tasks (+ the standalone sub-page top bar) ----
    tasks: {
      backToDashboard: 'Back to dashboard',
      sessionsNav: 'Your sessions',
      tasksTip: 'My tasks (active)',
      leadActive: 'Tasks you have in progress or paused. Open one to pick up at the exact step you left off. Pausing one lets you start another.',
      leadCompleted: 'Every task you finished, with its report. Open one to review the steps, or download it as a PDF, text report or audit log.',
      emptyActiveTitle: 'No active tasks',
      emptyActiveBody: 'A task you start and pause shows here so you can resume it. <start>Start a task</start>, or see your <completed>completed tasks</completed>.',
      emptyCompletedTitle: 'No completed tasks yet',
      emptyCompletedBody: 'When you finish a task it lands here with its report. <start>Start a task</start>.',
      steps: '<n>{done}/{total}</n> steps',
      stepsDone: '<n>{done}/{total}</n> steps done',
      status: {
        active: 'In progress',
        ended: 'Completed',
        paused: 'Paused',
      },
      resume: 'Resume',
      open: 'Open',
      download: 'Download',
    },

    // ---- Session logs ----
    logs: {
      lead: 'Every task you start is logged here.',
      emptyBody: 'Start a task from your <dash>dashboard</dash> and it is logged here. You can pause anytime and come back to the exact step you were on.',
      completedOn: 'Completed {when}',
      startedOn: 'Started {when}',
      atStep: 'At: {step}',
      deleteAria: 'Delete session: {title}',
      deleteNote: 'This is recorded in your activity log for administrators: who deleted it, when, the reason, and what the session was about.',
    },

    // ---- Legal re-consent gate (first login / agreements changed) ----
    legal: {
      title: 'One step before you continue',
      body: 'We updated the agreements that govern WorkCoPilot. Please review them and accept to keep using your account.',
      listAria: 'Agreements to review',
      // Display titles keyed by the manifest doc key (server/legal.js), so both
      // the server list and the client fallback list render translated.
      docs: {
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        acceptableUse: 'Acceptable Use Policy',
        cookiePolicy: 'Cookie Policy',
        disclaimer: 'Disclaimer',
        dpa: 'Data Processing Addendum',
      },
      agree: 'I have read and agree to the agreements listed above.',
      errGeneric: 'We could not record your acceptance. Please try again.',
      cta: 'Agree and continue',
      signOut: 'Sign out instead',
    },
  },
}
