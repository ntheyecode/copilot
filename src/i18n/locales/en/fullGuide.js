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
  },
}
