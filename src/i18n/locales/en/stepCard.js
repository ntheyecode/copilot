// English strings for the shared StepCard (src/pages/work/StepCard.jsx): the
// current micro-step card used by the console, the floater and the full guide.
// One partial per i18n wave, deep-merged into the English base by
// src/i18n/index.jsx under the `stepCard` namespace. A non-English locale that
// lacks a key falls back to this English. US spelling; no em dashes.
export default {
  stepCard: {
    plan: 'Plan',
    doneWhen: 'Done when',
    markDoneTip: 'Mark this step done and move to the next',
    // {n} = this step's number, {total} = how many steps the plan has.
    stepOf: 'Step {n} of {total}',
    stepN: 'Step {n}',
    confirmed: 'Step {n} confirmed',
    // The quiet goal line above the step card (GoalLine.jsx).
    yourPlan: 'Your plan',
    collapse: 'Collapse',
    // The step's screenshot from the company workflow it came from (StepShot.jsx).
    shot: {
      label: 'What the screen should look like',
      larger: 'Show larger',
      smaller: 'Show smaller',
      alt: "The trainer's screenshot for this step",
      caption: 'Your screen may look a little different, for example with your own data in it.',
      missing: 'The screenshot for this step could not be loaded.',
    },
  },
}
