// English strings for the signed-in WorkCoPilot app CHROME: the shared shell
// (src/pages/work/WorkAppLayout.jsx: rail + top-bar section titles, Android
// update banner, no-access and signed-out-elsewhere screens, guardrail notice),
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
