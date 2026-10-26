// English strings for the company security-policy rules editor
// (src/pages/workadmin/sections/PolicyRules.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `policyRules` namespace.
export default {
  policyRules: {
    heading: 'Security practice rules',
    desc: 'Load your written security policy and WorkCoPilot turns it into rules it enforces <b>while guiding</b>, flagging any step that uses a <b>prohibited</b> practice or is missing a <b>required</b> one, and citing your policy by name. This governs <i>how the guidance is written</i>, on top of the data-handling rules above.',

    // Ingest a policy document
    docNameLabel: 'Policy document name',
    docNamePlaceholder: 'e.g. Acme InfoSec Policy v3',
    uploadTitle: 'Load a .txt / .md / .json policy file',
    uploadFile: 'Upload file',
    textPlaceholder: 'Paste your security policy here. For example:\n\n“Secrets must never be stored in plaintext; use the approved vault.”\n“FTP must not be used; use SFTP.”\n“Production access requires MFA.”',
    extractRules: 'Extract rules',
    notStored: 'The document text is used only to extract rules. It is not stored.',
    derivedWithoutAI: ' (derived without AI, review carefully.)',

    // Extract results / errors
    fileTooLarge: 'That file is larger than 5 MB. Paste the relevant sections instead.',
    couldNotRead: 'Could not read that file.',
    pastePolicyFirst: 'Paste or upload the policy text first (at least a short paragraph).',
    defaultDocName: 'Policy document',
    rulesAdded_one: '{n} rule added',
    rulesAdded_other: '{n} rules added',
    duplicatesSkipped_one: ' ({n} duplicate skipped)',
    duplicatesSkipped_other: ' ({n} duplicates skipped)',

    // Rule summary + review
    ruleCount_one: '{n} rule',
    ruleCount_other: '{n} rules',
    forbidCount: '{n} forbid',
    requireCount: '{n} require',
    enforcedOnEveryCall: 'Enforced on every call',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    noRulesReadOnly: 'No rules yet. Extract them from your policy above.',
    noRulesEditable: 'No rules yet. Extract them from your policy above, or add one by hand.',

    // Compact row
    enforceThisRule: 'Enforce this rule',
    kindForbid: 'Forbid',
    kindRequire: 'Require',
    severityTitle: '{label} severity',
    untitledRule: 'Untitled rule',
    needsTrigger: 'Needs a trigger',
    perCite: 'per {cite}',
    removeRule: 'Remove rule',

    // Severity labels
    sev: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },

    // Expanded editable fields
    requiredPractice: 'Required practice (must appear)',
    prohibitedPractice: 'Prohibited practice (must not appear)',
    requiredPatternPlaceholder: 'mfa, multi-factor, 2fa',
    prohibitedPatternPlaceholder: 'ftp, plaintext password, 0.0.0.0/0',
    titlePlaceholder: 'Short label (e.g. No plaintext secrets)',
    whenRelevant: 'When relevant (trigger)',
    contextPlaceholder: 'production, deploy, login',
    citedDocument: 'Cited document',
    citedDocPlaceholder: 'Acme InfoSec Policy',
    section: 'Section',
    sectionPlaceholder: '§4.2 Secrets',
    compliantAlternative: 'Compliant alternative to recommend',
    guidancePlaceholder: 'Use the approved vault instead of config files.',
    addTriggerHint: 'Add a trigger so this requirement is only checked on relevant steps.',

    // Footer
    addRuleByHand: 'Add rule by hand',
    fromLabel: 'From:',
  },
}
