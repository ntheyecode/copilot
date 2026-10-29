// English strings for SecurityNote (src/components/SecurityNote.jsx): the in-app
// security check shown for code results / compositions. One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx under the `securityNote`
// namespace. A non-English locale that lacks a key falls back to this English.
// US spelling; no em dashes.
export default {
  securityNote: {
    cleanBody: 'No dangerous commands and no known-vulnerable libraries were found in this code.',
    dbUnreachable: 'The vulnerability database could not be reached, so library versions were not checked this time.',
  },
}
