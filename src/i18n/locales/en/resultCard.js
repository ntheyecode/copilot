// English strings for ResultCard (src/components/ResultCard.jsx): the answer card
// with its honesty contract (how I got it, verify by). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx under the `resultCard`
// namespace. A non-English locale that lacks a key falls back to this English.
// US spelling; no em dashes.
export default {
  resultCard: {
    emptyBody: 'No result text came back.',
    need: 'I need:',
    howIGotIt: 'How I got it',
    verifyBy: 'Verify by',
  },
}
