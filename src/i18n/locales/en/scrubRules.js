// English strings for an individual user's data-protection rules card
// (src/components/ScrubRules.jsx), keyed under the `scrubRules` namespace.
// STRUCTURE CONTRACT: `builtin` is an ARRAY of the always-protected detector
// names shown as chips (one chip per entry; keep the count). The textarea
// placeholder keeps its "\n" so two example lines show. <b> renders via t.rich.
export default {
  scrubRules: {
    builtin: ['Emails', 'Phone numbers', 'Card numbers', 'SSNs', 'IBANs', 'API keys & tokens', 'IP addresses', 'Private hosts'],
    errors: {
      load: 'Could not load your rules',
      save: 'Could not save',
      unavailable: 'Unavailable',
    },
    loading: 'Loading your data protection rules…',
    retry: 'Retry',
    title: 'Your data protection rules',
    lead: 'These run <b>on your device</b>, before anything is sent. Add your own sensitive terms or patterns on top of what is always protected.',
    alwaysProtected: 'Always protected',
    custom: {
      title: 'Your custom rules',
      empty: 'None yet. Add a term (like a project code name) or a /regex/.',
      labelPlaceholder: 'Label (e.g. Project Orion)',
      patternPlaceholder: 'Match: a word/phrase or /regex/',
      redact: 'Redact',
      tokenize: 'Tokenize',
      block: 'Block',
      remove: 'Remove',
      add: 'Add a rule',
    },
    blockWords: {
      title: 'Block words',
      hint: '(one per line, always removed, never sent)',
      placeholder: 'Acme Confidential\nProject Orion',
    },
    saving: 'Saving',
    save: 'Save my rules',
    saved: 'Saved, on across your sessions',
  },
}
