// English strings for the SHARED plan-model + step-progress copy that two guide
// surfaces render through pure helper modules (not React components):
//   - src/pages/work/usageCopy.js  (time left, task slots, out-of-time, low note)
//   - src/shared/step_window.js    (the "Step N of M" / "All N done" progress line)
// Those helpers take `t` as a parameter and return keyed strings, so the console
// (Guiding.jsx), the floating panel (FloatPanel.jsx) and the full-screen guide
// (WorkFullGuide.jsx) all read ONE source and can never disagree (SUPREME RULE II).
// One partial per i18n wave, deep-merged into the English base by
// src/i18n/index.jsx under the `usage` namespace. US spelling; no em dashes; the
// product name stays as-is; the middle dot in the progress line is house style.
export default {
  usage: {
    // usageTimeLeft(usage, t): the compact "time left" chip
    noTime: 'No time left',
    timeLeft: '{time} left',
    // usageTasksLine(usage, t): open at-once slots, or a company ceiling
    tasksOpen: '{used} of {max} tasks open',
    tasks: '{used} of {max} tasks',
    // usageOutOfTime(usage, t): what to do when the plan hours are gone. Two
    // sentences each, kept verbatim, with {when} where the renewal date goes.
    outCompany: 'You have used your plan hours for this month. They renew on {when}. Ask your administrator if you need more before then.',
    outIndividual: 'You have used your plan hours for this month. Buy top-up hours to keep going, or they renew on {when}.',
    // usageLowNote(usage, t): the low-hours line shown while guiding
    lowNote: 'About {time} of guided time left this month. You can pause anytime, or add top-up hours to keep going.',
    // progressText(steps, t, size): the quiet progress sentence
    allStepsDone: 'All {total} steps done',
    stepProgress: 'Step {current} of {total} · {done} done',
  },
}
