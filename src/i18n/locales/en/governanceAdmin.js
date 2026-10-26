// English strings for the superadmin data-governance (DLP) section
// (src/pages/workadmin/sections/Governance.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `governanceAdmin` namespace. Policy category/action CODES stay as-is in the
// component; only their display labels live here.
export default {
  governanceAdmin: {
    // Category action labels, keyed by the action code
    actions: {
      send: 'Send as-is',
      mask: 'Mask',
      withhold: 'Withhold',
      tokenize: 'Tokenize (on-device)',
    },

    // Platform-wide retention card (individual accounts)
    retention: {
      title: 'Data retention (individual accounts)',
      desc: 'Automatically delete sessions (and their milestone screenshots and audit log) older than this many days, for <b>individual (non-company) accounts</b>. Company accounts are governed by their own company admin, not here. <b>0 means keep forever</b>; users can still delete their own sessions anytime. Applied on an hourly sweep.',
      loading: 'Loading retention',
      days_one: '{n} day',
      days_other: '{n} days',
      keepForever: 'Keep forever (no automatic deletion)',
      keepForeverDot: 'Keep forever (no automatic deletion).',
      windowLabel: 'Retention window',
      windowDays: 'Retention window (days)',
      superadminOnly: 'Only a superadmin can change data retention.',
      purgedLastSave_one: 'Purged {n} session on the last save.',
      purgedLastSave_other: 'Purged {n} sessions on the last save.',
      purgeHint_one: 'Sessions older than {n} day are purged.',
      purgeHint_other: 'Sessions older than {n} days are purged.',
      save: 'Save retention',
      cancel: 'Cancel',
      purgedNow_one: 'Purged {n} session now.',
      purgedNow_other: 'Purged {n} sessions now.',
      nothingToPurge: 'Nothing to purge.',
    },

    // Company picker + empty / loading states
    loadingCompanies: 'Loading companies',
    loadingPolicy: 'Loading policy',
    createCompanyFirst: 'Create a company first in the Companies tab, then set its data governance policy here.',
    superadminOnlyPolicy: 'Only a superadmin can change a company policy.',
    companyLabel: 'Company',

    // Collapsed policy record
    record: {
      title: 'Data governance policy',
      desc: 'The saved DLP policy for this company.',
      clickEdit: 'Click Edit to change what leaves the device.',
      status: 'Status',
      armed: 'Armed (enforced on every call)',
      notArmed: 'Not armed',
      locked: 'Locked',
      unlocked: 'Unlocked',
      mode: 'Mode',
      modeTokenize: 'Tokenize (rebuilt on-device)',
      modeScrub: 'Scrub (removed before sending)',
      frameworks: 'Frameworks',
      none: 'None',
      categoryRules: 'Category rules',
      categoryRulesSet: '{n} set',
      blockWords: 'Block words',
      customFields: 'Custom fields',
      practiceRules: 'Practice rules',
      practiceRulesBreakdown: ' ({forbid} forbid, {require} require)',
      version: 'Version',
    },

    // Compliance frameworks
    frameworks: {
      title: 'Compliance frameworks',
      desc: 'Click a framework to seed sensible defaults, then fine-tune below. (Controls and audit evidence to support your compliance, not a certification.)',
    },

    // Per-category actions
    categories: {
      title: 'What leaves the device, by category',
      desc: 'For each kind of sensitive data: send as-is, mask, withhold, or tokenize (kept on-device and rebuilt in the response).',
      colCategory: 'Category',
      colAction: 'Action',
    },

    // Block words
    blockWords: {
      title: 'Never send these words',
      desc: 'Exact words or phrases that must never leave the device (one per line).',
      placeholder: 'Project Atlas\nacme-prod-db\ninternal codename',
      warning: 'Blocking words can make an answer incomplete or wrong where a word is actually needed. WorkCoPilot never guesses a blocked value.',
    },

    // Custom fields
    customFields: {
      title: 'Custom fields',
      desc: 'Your own sensitive data types, on top of the built-in categories. Give each a name, a match (a word/phrase, or a <code>/regex/</code> like <code>/EMP-\\d{6}/</code>), and what to do. Redact replaces it with a <code>[LABEL]</code> tag; Block replaces it with <code>[BLOCKED]</code>. Applied on the device before anything is sent.',
      labelPlaceholder: 'Label (e.g. Employee ID)',
      matchPlaceholder: 'Match: a word/phrase or /regex/',
      redact: 'Redact',
      block: 'Block',
      remove: 'Remove',
      add: 'Add custom field',
    },

    // Mode and status
    modeStatus: {
      title: 'Mode and status',
      howHandled: 'How sensitive data is handled',
      optScrub: 'Scrub: remove before sending (safest; answers may have gaps)',
      optTokenize: 'Tokenize: keep on device and rebuild the full answer here (premium)',
      armed: 'Armed (enforced on every call)',
      locked: 'Locked',
      versionN: 'version {n}',
      save: 'Save policy',
      cancel: 'Cancel',
    },
  },
}
