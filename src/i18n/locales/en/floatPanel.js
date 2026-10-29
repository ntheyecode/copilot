// English strings for the FLOATING GUIDE panel (src/pages/work/FloatPanel.jsx):
// the Document Picture-in-Picture / pop-out overlay that mirrors the console's
// live state. One partial per i18n wave, deep-merged into the English base by
// src/i18n/index.jsx under the `floatPanel` namespace. A non-English locale that
// lacks a key falls back to this English. Step text, the observation, the answer
// and the usage line arrive from the engine / shared modules and are not here.
// US spelling; no em dashes; the product name stays as-is.
export default {
  floatPanel: {
    // ONE calm status chip in the header
    status: {
      guiding: 'Guiding',
      paused: 'Paused',
    },
    // header icon controls (tooltips)
    deepTip: 'Deep pass: take a closer look at this one frame and weave it back into the steps, then carry on at normal speed.',
    switchDark: 'Switch to dark',
    switchLight: 'Switch to light',
    dimTip: 'Dim the panel to cut glare (for true see-through, use the desktop app)',
    closeTip: 'Close the floating window',
    // pinned Pause / Resume / Watch + End row
    resume: 'Resume',
    pause: 'Pause',
    watchScreen: 'Watch my screen',
    end: 'End',
    endTip: 'End this task and build a summary',
    shareHint: 'Share your whole screen so the steps update as you work.',
    // the plan mini-map rail (wide float) + the tucked-away full plan
    plan: 'Plan',
    fullPlan: 'Full plan',
    viewFullPlan: 'View full plan',
    viewFullPlanTip: 'View the full plan',
    hideFullPlanTip: 'Hide the full plan',
    doneOf: '{done} of {total} done',
    markDone: 'Mark done',
    markNotDone: 'Mark not done',
    jumpTip: 'Jump to this step',
    // task complete (the floater's celebration card)
    complete: {
      title: 'Task complete',
      allDone_one: 'All {n} step done.',
      allDone_other: 'All {n} steps done.',
      someDone: '{done} of {total} steps done.',
      nicely: 'Nicely done.',
      report: 'Your report is ready in the main window.',
      startAnother: 'Start another task',
      startAnotherTip: 'Start a new task',
    },
    // the step card's hint line
    hint: {
      paused: 'Paused. Resume to keep this live.',
      watch: 'Watch my screen to keep this live',
    },
    // Prev / Next under the step card, and the one upcoming step
    nav: {
      prev: 'Prev',
      prevTip: 'Go to the previous step',
      next: 'Next',
      nextTip: 'Go to the next step',
      finishFirst: 'Finish this step first. It advances on its own when done.',
      count: 'Step {n} of {total}',
    },
    nextUp: 'Next',
    empty: 'Plan your steps in the main window, then they appear here.',
    // the fixed Ask footer
    askPlaceholder: 'Ask, say what to analyze, or attach a screenshot or document',
    ask: 'Ask',
    attachTip: 'Attach a screenshot, photo, or document. It is considered and your steps update if needed.',
    attachAria: 'Attach a screenshot or document',
    analyze: 'Analyze',
    analyzeTip: 'Screenshot now and analyze. Type a focus above, or leave blank for a full read.',
    research: 'Research',
    researchTip: 'Look up the latest on the web, then answer (only when you tap it).',
  },
}
