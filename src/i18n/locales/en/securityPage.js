// English strings for the public Security & Privacy page (src/pages/WorkSecurity.jsx).
// One partial per i18n wave, deep-merged into the English base by
// src/i18n/index.jsx under the `securityPage` namespace; a non-English locale
// that lacks a key falls back to this English. US spelling; no em dashes.
//
// NOT here (kept verbatim, by design):
//  - framework NAMES and the "ships ready to arm" preset mark: read from the
//    canonical registry (server/compliance_frameworks.js), never typed here.
//  - the demo screen's fixture VALUES (NorthWind Ops, example emails, card and
//    key samples, the raw -> token examples): format examples, not language.
//  - brand / product / legal names: WorkCoPilot, AdmireVeda, COE Security LLC.
//  - tech tokens kept in Latin everywhere: SAST, OSV, SSO, AES-256-GCM, PDF, DPA.
// The redaction-sweep heading/body and the read-only line reuse the shared
// `security.*` keys; the data-residency line reuses `residency.*`.
export default {
  securityPage: {
    seo: {
      title: 'Security and Privacy - WorkCoPilot by AdmireVeda',
      description: 'How WorkCoPilot protects your data: sensitive values redacted or tokenized on your device before anything is sent, code checked before you run it, an authenticator on every account, a per-session audit log, encryption at rest, and compliance evidence mapped to the frameworks you report to.',
    },
    // shared screen-reader suffix on the PDF buttons
    pdfNewTab: ' (PDF, opens in a new tab)',
    hero: {
      eyebrow: 'Private by design',
      h1: 'Your secrets never leave your device.',
      p: 'Sensitive data is stripped on your own device before anything is sent. The AI sees the shape of your task, never the secrets.',
      paper: 'Security & Privacy paper',
      enterprise: 'Enterprise controls',
    },
    // the six one-line guarantees (icon is fixed in the component; text here)
    guaranteesAria: 'What is protected',
    guarantees: [
      { t: 'Redaction on your device', d: 'Sensitive values are blacked out in screenshots and tokenized in text before anything is sent.' },
      { t: 'Code checked before you run it', d: 'Built-in SAST plus a live dependency check against the OSV vulnerability database.' },
      { t: 'Authenticator on every account', d: 'Password, company SSO and social sign-in all pass the same second factor.' },
      { t: 'Audit log for every session', d: 'What was sent, what was read from your screen, what was checked, filtered and flagged.' },
      { t: 'Encrypted at rest', d: 'Stored keys, secrets and report screenshots are encrypted with AES-256-GCM.' },
      { t: 'Your boundary, your keys', d: 'Run on your company\'s or your own AI keys, or on-prem. Read-only: it guides, it never changes your systems.' },
    ],
    // the "in text" proof row under the before/after visual
    proof: {
      inText: 'In text',
      aria: 'The same protection in text: each sensitive value becomes a token, the real value stays on your device',
      end: 'Answer rebuilt on your device. Add your own words and patterns on top of the built-in detectors.',
    },
    handling: {
      h2: 'How your data is handled',
      sub: 'What the product does today. Not a compliance claim.',
      groups: [
        { title: 'What leaves your device', items: [
          'Reduced-size screen frames, sensitive lines already blacked out',
          'Your text, sensitive values already replaced by tokens',
          'Governed text from attached documents, never the file (desktop app)',
        ] },
        { title: 'What we store', items: [
          'One session report, with redacted milestone screenshots (you can turn it off)',
          'One audit log per session, recording what was transmitted',
          'Your session history, so you can reopen and review',
        ] },
        { title: 'What is never stored', items: [
          'Your source documents',
          'Raw screen frames',
          'The real sensitive values, the AI never sees them',
        ] },
      ],
    },
    facts: {
      aria: 'Retention and residency',
      // <b> around the lead clause
      retention: '<b>Kept until you delete it.</b> Delete any session at any time; admins review their own members. An automatic retention window can purge older sessions on a schedule.',
    },
    compliance: {
      h2: 'Evidence for the frameworks you report to',
      sub: 'Your admin arms a policy per company and locks it. Every session is logged and reportable. Presets marked with a tick ship ready to arm.',
      groups: { privacy: 'Privacy', standards: 'Standards', sector: 'Sector' },
      frameworksAria: '{group} frameworks',
      presetSr: 'Preset ships with the product: ',
      honest: 'We provide the controls and the evidence. We do not claim certification against any framework; your organization holds compliance with its auditors.',
    },
    contact: {
      // <b> lead clause; <a> wraps the security mailbox (kept verbatim)
      issue: '<b>Found a security issue?</b> Email <a>support@coesecurity.com</a> (security, privacy, compliance, signed DPA). Give us time to confirm and fix before public disclosure; good-faith research is welcome.',
      // <a> wraps the support mailbox; brand + legal names kept verbatim
      help: 'Product help and billing: <a>support@admireveda.com</a>. WorkCoPilot, by AdmireVeda, is a product of COE Security LLC.',
    },
    cta: {
      aria: 'Next steps',
      paper: 'Read the Security & Privacy paper',
      back: 'Back to WorkCoPilot',
    },
    // the illustrative integration screen (a fictional app being redacted). Only
    // the LABELS are language; the values are fixture examples, kept verbatim.
    mock: {
      beforeAria: 'App screen before protection, showing sensitive values',
      afterAria: 'App screen after on-device protection, with sensitive values blacked out',
      nav: ['Dashboard', 'Customers', 'Billing', 'Integrations', 'Settings'],
      crumbRoot: 'Integrations',
      crumbLeaf: 'Payment gateway',
      cardTitle: 'Connection details',
      fields: ['Billing email', 'Phone', 'Card on file', 'API key', 'Tax ID', 'Webhook host', 'Plan', 'Status'],
    },
  },
}
