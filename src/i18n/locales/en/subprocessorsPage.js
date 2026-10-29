// English strings for the public Subprocessors page (src/pages/WorkSubprocessors.jsx).
// Keyed under the `subprocessorsPage` namespace; the i18n loader deep-merges
// every en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the disclosure itself.
// Inline tags render via t.rich() / Items with the page's own hrefs: <dpa>,
// <privacy> are links; <ph> is a clearly-marked fill-in-later placeholder (never
// an invented vendor). Lists (items[], glance[]) and the table (columns[],
// rows[]) translate as units; row order is fixed. In table.rows the `provider`
// cell is omitted where the page supplies a brand name (Stripe) and is wrapped in
// a placeholder chip by the page where the vendor is not publicly named.
export default {
  subprocessorsPage: {
    seo: {
      title: 'Subprocessors - WorkCoPilot by AdmireVeda',
      description: 'The subprocessors that help provide WorkCoPilot and the role each plays: Stripe for payments, an AI model provider for guidance (or your own keys), cloud hosting, email delivery, and your own identity provider for company sign-on. Subprocessors see governed data only.',
    },
    hero: {
      eyebrow: 'Subprocessors',
      title: 'Who processes data for WorkCoPilot',
      intro: 'The third parties that help provide WorkCoPilot, the role each plays, and the data each is involved with.',
      tagline: 'Plain-language disclosure, read alongside the DPA',
    },
    // Order matches the icon/tone list in the page (Cpu, CreditCard, KeyRound).
    glance: [
      { eyebrow: 'On your device first', title: 'Subprocessors see governed data only', body: 'Sensitive values are redacted or tokenized on your device before anything is sent, so a subprocessor never receives real secrets or PII.' },
      { eyebrow: 'Payments', title: 'Stripe handles billing', body: 'Card and payment details are entered with and held by Stripe. We receive only what is needed to run your subscription.' },
      { eyebrow: 'Your option', title: 'Bring your own AI keys', body: 'You or your company can run WorkCoPilot on your own AI keys, so governed data stays inside your own provider boundary.' },
    ],
    sections: {
      about: 'About this list',
      list: 'Current subprocessors',
      keys: 'Running on your own keys',
      changes: 'Changes and notification',
      contact: 'Contact',
    },
    table: {
      caption: 'Subprocessors and the role each plays',
      columns: ['Role', 'Provider', 'Purpose', 'Data involved'],
      rows: [
        { role: 'Payments', purpose: 'Subscription billing, invoices and affiliate payouts.', data: 'Billing contact and plan status. Card and payment details are held by Stripe, not by us.' },
        { role: 'AI guidance', provider: 'AI model provider - configurable, or your own key', purpose: 'Turns the governed text of a step into guidance.', data: 'Governed (redacted or tokenized) text and reduced-size screen frames. Never real secrets, PII or your source files.' },
        { role: 'Cloud hosting', provider: 'cloud hosting and infrastructure provider', purpose: 'Runs the service and stores your session records, encrypted at rest.', data: 'Account details and per-session reports, audit logs and history (encrypted at rest).' },
        { role: 'Email delivery', provider: 'transactional email provider', purpose: 'Sends account, security and billing emails.', data: 'Your email address and the content of the message.' },
        { role: 'Company sign-on', provider: 'Your chosen identity provider', purpose: 'Authenticates company members through enterprise single sign-on.', data: 'Authentication only. Chosen and controlled by your company, not selected by us.' },
      ],
    },
    about: {
      p1: 'A subprocessor is a third party that processes data on our behalf to provide WorkCoPilot. This page lists the roles those subprocessors play and the data each one is involved with, so you can see who is in the chain before you rely on the product.',
      p2: 'It complements the <dpa>Data Processing Addendum</dpa> and the <privacy>Privacy Policy</privacy>. Where we do not publicly name a specific vendor, the role is listed with a clearly-marked placeholder rather than an invented name; your DPA names the specific vendors where that applies to your account.',
    },
    list: {
      note: 'Because sensitive values are redacted or tokenized on your device before anything leaves, subprocessors that handle guidance receive governed text only, never the real values.',
    },
    keys: {
      p1: 'You or your company can run WorkCoPilot on your own AI keys. In that mode the governed data for guidance stays inside your own provider boundary, and the AI-provider role above is filled by your own account rather than ours. Company deployments can also be run on-prem on request.',
    },
    changes: {
      items: [
        { name: 'Updates', how: 'When we add, remove or replace a subprocessor, we update this page and the "Last updated" date above.' },
        { name: 'Advance notice', how: 'Where a signed agreement provides for it, enterprise customers can ask to be notified of new subprocessors in advance so they can object. The specific notice period for your account is set in your agreement <ph>to be confirmed with counsel</ph>.' },
        { name: 'Objections', how: 'If you have a signed agreement and object to a new subprocessor on reasonable data-protection grounds, contact us using the address below and we will work with you in good faith.' },
      ],
    },
    contact: {
      legal: 'Privacy, legal and subprocessor questions',
      support: 'Product support',
    },
    links: {
      dpa: 'Data Processing Addendum',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },
  },
}
