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
  },
}
