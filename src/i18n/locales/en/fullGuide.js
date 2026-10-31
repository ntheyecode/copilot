// English strings for the FULL-SCREEN second-monitor guide (src/pages/WorkFullGuide.jsx):
// the read-only big-screen view of the current step, the roadmap rail and the
// read-only full-plan overlay. One partial per i18n wave, deep-merged into the
// English base by src/i18n/index.jsx under the `fullGuide` namespace. A non-English
// locale that lacks a key falls back to this English. The goal, step text, the
// observation and the usage line arrive from the session / shared modules and are
// keyed elsewhere (usage namespace). US spelling; no em dashes; product name as-is.
export default {
  fullGuide: {
    copied: 'Copied',
    subtitle: 'Full-screen guidance',
    paused: 'Paused',
    live: 'Live',
    tasksTip: 'Tasks open right now, of the most you can have open at once',
    themeTip: 'Light or dark',
    themeAria: 'Toggle light or dark',
    fullScreenAria: 'Toggle full screen',
    allDone: 'All steps done',
    allDoneBody: 'Every step is confirmed. Head back to the main window to finish up and get your summary.',
    pausedHint: 'Paused in the main window.',
    liveHint: 'Live. Mark it done in the main window or the floater.',
    roadmap: 'Roadmap',
    viewFullPlan: 'View full plan',
    planDialogAria: 'Full plan',
    fullPlan: 'Full plan',
    closeTip: 'Close',
    closeAria: 'Close full plan',
    yourGoal: 'Your goal',
    now: 'Now',
    runThis: 'Run this',
    calm: {
      loading: {
        t: 'Connecting',
        d: 'Waking up and finding your task.',
      },
      error: {
        t: 'Cannot reach the server',
        d: 'Retrying. Your session is safe.',
      },
      signin: {
        t: 'Sign in to WorkCoPilot',
        d: 'Sign in on the main window and your task appears here.',
      },
      empty: {
        t: 'No active task yet',
        d: 'Open WorkCoPilot and start a task. This screen then guides you, step by step.',
      },
    },
    hoursOutTip: 'Your plan hours for this month are used up',
    hoursLeftTip: 'Plan hours left this month',
    readingNext: 'Reading your screen for the next move',
  },
}
