// English strings for the ask / stuck focus screens (src/pages/work/AskFocus.jsx):
// the proactive "stuck?" check-in card and the focused-answer actions, shared by
// the console and the floater. One partial per i18n wave, deep-merged into the
// English base by src/i18n/index.jsx under the `askFocus` namespace. A non-English
// locale that lacks a key falls back to this English. US spelling; no em dashes.
export default {
  askFocus: {
    checkIn: 'A quick check-in',
    stuckTitle: 'Stuck? Any issues?',
    inWayPlaceholder: 'For example: the Verify button is grey',
    inWayAria: 'What is in the way',
    fine: 'I am fine, keep going',
    youAsked: 'You asked:',
    planUpdated: 'Your plan was updated.',
    followUp: 'Ask a follow-up',
    offerOpen: 'This step has been open for a while. Tell me what is in the way, or I can explain it another way.',
    offerOpenStep: 'This step has been open for a while: <step></step>. Tell me what is in the way, or I can explain it another way.',
    explainAgain: 'Explain this step again',
    working: {
      research: 'Looking this up',
      analyze: 'Reading your screen',
      stuck: 'Taking a closer look at this step',
      question: 'Working on your question',
    },
    label: {
      research: 'What I found',
      analyze: 'What I see',
      betterWay: 'A better way through',
      explained: 'This step, explained',
    },
    resumeAt: 'Continue picks up at step {n}.',
    resumeAtStep: 'Continue picks up at step {n}: <step></step>',
    continue: {
      plan: 'Continue with the updated plan',
      step: 'Got it, back to the step',
      guiding: 'Continue guiding',
    },
    backToStep: 'Back to step {n}.',
  },
}
