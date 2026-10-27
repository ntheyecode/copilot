// English strings for the signed-in WorkCoPilot dashboard overview
// (src/pages/work/Dashboard.jsx) and the sections it is built from: the plan
// meters (PlanMeters.jsx), the month view (MonthGraph.jsx), recent outcomes
// (Outcomes.jsx) and the guided-task flow (TaskFlow.jsx). One partial per i18n
// wave, deep-merged into the English base by src/i18n/index.jsx. Keys live
// under the `workDashboard` namespace. A non-English locale that lacks a key
// falls back to this English, so a newly keyed string reads in English until it
// is translated.
//
// Plan model (2026-10): every plan includes guided HOURS PER MONTH, renewed on
// the 1st, plus a plain number of guided TASKS PER DAY. Top-up hours never
// expire. There are no daily minutes, no banked credits and no trade.
export default {
  workDashboard: {
    // ---- Co-brand strip (company users) ----
    cobrand: {
      aria: '{company}, powered by WorkCoPilot',
      eyebrow: 'Your workspace',
      poweredBy: 'powered by',
      exec: 'Executive dashboard',
    },

    // ---- Hello + plan line (the single h1). {time} is the compact time left. ----
    hello: 'Hello {name}',
    plan: {
      admin: 'Administrator access, guidance on',
      company: '{company} team, {time} of guided time left',
      covered: '{plan} plan, {time} of guided time left this month',
      choose: 'Free account, choose a plan to start guiding',
      free: 'Free access, {time} of guided time left',
      yourCompany: 'Your company',
    },

    // ---- Plan meters: "Your plan at a glance" (PlanMeters.jsx) ----
    meters: {
      heading: 'Your plan at a glance',
      sub: "Hours this month, top-ups and today's tasks. Hover the info on a tile for how it works.",
      info: 'How this works',
      on: 'Guidance on',
      onSub: 'Always available on your account',
      tipAdmin: 'As an administrator you have live guidance on at all times, with no hour limit.',
      hours: {
        label: 'Hours this month',
        left: 'left',
        usedOf: '{used} used of {included}',
        renews: 'Renews {date}',
        carry: 'unused hours carry over',
        carried: '{time} carried over from last month',
        tip: 'Your plan includes {included} of guided time each month, renewed {date}. Time counts only while WorkCoPilot is actively guiding you, so pausing keeps it in reserve.',
        tipCarry: 'Your plan includes {included} of guided time each month, renewed {date}, and unused hours carry over to the next month. Time counts only while WorkCoPilot is actively guiding you.',
      },
      allowance: {
        label: 'Your allowance',
        tip: 'Guided time your administrator set for you. When it is used up, it opens again at the next reset.',
        usedOf: '{used} used of {limit} per {window}',
        resets: 'Resets {reset}',
      },
      pool: {
        label: 'Company pool',
        tip: 'Shared hours your whole team draws from this month. Your administrator manages the pool.',
        leftOf: '{left} left of {monthly}',
        resets: 'Renews {reset}',
        shared: 'Shared with your team',
      },
      topup: {
        label: 'Top-up hours',
        tip: 'Hours you bought on top of your plan. They never expire and are used after your plan hours.',
        none: 'None yet',
        never: 'Never expire',
        buy: 'Buy hours',
      },
      tasks: {
        label: "Today's tasks",
        tip: 'How many guided tasks you can start each day. Resets {reset}.',
        tipUnlimited: 'You can start as many guided tasks as you need.',
        unlimited: 'Unlimited',
        unlimitedSub: 'Start as many tasks as you need',
        usedOf: '{used} of {cap} started',
        pipsAria: '{used} of {cap} tasks started today',
        capHit: 'New tasks open {reset}',
        resets: 'Resets {reset}',
      },
      // The one state banner under the tiles, with the action that resolves it.
      state: {
        pool: "Your company's shared hours for this month are used up. Ask your administrator to add hours.",
        ceiling: 'You have used the guided time {company} set for you. It opens again at the next reset.',
        exhausted: 'Your plan hours for this month are used up. Buy top-up hours, upgrade, or wait for {date}.',
        exhaustedCompany: 'Your plan hours for this month are used up. They renew {date}. Ask your administrator if you need more before then.',
        low: 'Only {time} of guided time left this month.',
        lowCompany: 'Only {time} of guided time left this month. Ask your administrator if you need more.',
        taskCap: 'You have started all {cap} tasks for today. New tasks open {reset}.',
        buy: 'Buy hours',
        upgrade: 'Upgrade',
      },
    },

    // ---- Month view: guided time per day + tasks started (MonthGraph.jsx) ----
    month: {
      heading: 'This month',
      sub: 'Guided time per day and the tasks you started, over the last 31 days.',
      legendTime: 'Guided time',
      legendTasks: 'Tasks started',
      today: 'Today',
      tasks_one: '{n} task',
      tasks_other: '{n} tasks',
      aria: 'Guided time per day over the last 31 days: {total} in total, {tasks} started.',
      dayAria: '{date}: {time} of guided time, {tasks}',
      axisH: '{n} h',
      axisMin: '{n} min',
      empty: 'No guided time in the last 31 days yet. Start a task and this fills in.',
      total: '{time} guided',
      busiest: 'Busiest day {date}, {time}',
      table: 'Show as a table',
      tableHide: 'Hide the table',
      colDay: 'Day',
      colTime: 'Guided time',
      colTasks: 'Tasks',
      tableNote: 'Days with no guided time and no tasks are left out.',
      errTitle: 'Could not load this month',
      errBody: 'This looks like a connection hiccup. Your data is safe.',
      retry: 'Retry',
    },

    // ---- Recent outcomes: the last completed tasks (Outcomes.jsx) ----
    outcomes: {
      heading: 'Recent outcomes',
      sub: 'Your last completed tasks, each with its report.',
      viewAll: 'View all',
      finished: 'Finished {date}',
      steps: '<n>{done}/{total}</n> steps done',
      goal: 'Goal',
      stepsTitle: 'Steps',
      moreSteps: '{n} more steps',
      open: 'Open',
      download: 'Download',
    },

    // ---- What a guided task looks like: the first-run flow (TaskFlow.jsx) ----
    flow: {
      heading: 'What a guided task looks like',
      sub: 'Five beats, every time. Start one and watch it happen on your screen.',
      aria: 'The five beats of a guided task',
      watch: 'Watching',
      watchD: 'Reads the screen you choose to share, so it knows where you are.',
      next: 'Next step',
      nextD: 'Shows the exact next move, right when you need it.',
      correct: 'Correction',
      correctD: 'Catches a wrong turn and steers you back.',
      confirm: 'Confirmed',
      confirmD: 'Checks each step is done before moving on.',
      complete: 'Complete',
      completeD: 'Ends with a report of what was done.',
      note: 'Time counts only while WorkCoPilot is actively guiding you.',
      cta: 'Start your first task',
    },

    // ---- Big Start a task CTA (the hero, once you have a session) ----
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
      lead: 'Pick a plan to turn on live guidance. Every plan includes guided hours each month, renewed on the 1st, plus a number of guided tasks per day. Change or cancel anytime.',
      popular: 'Most popular',
      perMonth: '/mo',
      hours_one: '{n} guided hour per month',
      hours_other: '{n} guided hours per month',
      tasks_one: '{n} task per day',
      tasks_other: '{n} tasks per day',
      choose: 'Choose {plan}',
      errGeneric: 'Could not start checkout. Please try again.',
      errBilling: 'Billing is not available right now.',
      teamNote: 'On a team plan? If your company covers WorkCoPilot, ask your administrator to add you and guidance turns on automatically.',
      demoPre: 'Not ready to subscribe?',
      demoLink: 'See exactly how it works in the demo',
    },

    // ---- Add time / out of hours note ----
    buy: {
      titleOut: 'You are out of plan hours for this month',
      title: 'Add more guided time',
      body: 'Your plan hours renew {date}. Top-up hours never expire and stack on your plan. If your company manages your account, ask your administrator to add hours.',
      buy: 'Buy hours',
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
