// English strings for PolicyNote (src/components/PolicyNote.jsx): the in-app
// company-policy check for generated guidance. One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx under the `policyNote`
// namespace. A non-English locale that lacks a key falls back to this English.
// US spelling; no em dashes.
export default {
  policyNote: {
    cleanBody: 'This guidance was checked against your company security policy and nothing was flagged.',
    headFlag: 'Company policy: review before you use this',
    headClean_one: 'Company policy: clear (checked against {n} rule)',
    headClean_other: 'Company policy: clear (checked against {n} rules)',
    forbid: 'Prohibited: {title}.',
    forbidAny: 'Prohibited: a prohibited practice.',
    require: 'Required: {title}.',
    requireAny: 'Required: a required practice.',
    per: '(per {cite})',
  },
}
