// English strings for the public Privacy Policy page (src/pages/WorkPrivacy.jsx).
// Keyed under the `privacyPage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the policy itself.
// Interpolations: {entity} = the legal entity (AdmireVeda), {contact} and
// {support} = the two mailboxes; all three stay constants in the page, never
// translated. <a>...</a> and named link tags render via t.rich() with the page's
// own hrefs; <b> renders bold. Lists (items[], glance.cards[]) translate as units.
export default {
  privacyPage: {
    seo: {
      title: 'Privacy Policy - WorkCoPilot by AdmireVeda',
      description: 'What WorkCoPilot collects, what leaves your device after on-device redaction, what is stored and for how long (including de-identified learnings that keep guidance current), how it is protected, the third parties involved, and your rights and choices.',
    },
    hero: {
      eyebrow: 'Privacy Policy · WorkCoPilot',
      h1: 'How WorkCoPilot handles your data',
      lead: 'WorkCoPilot guides you through work on your own screen. It is read-only by design, and sensitive data is stripped or tokenized on your own device before anything is sent. This page says, in plain language, what we collect, what leaves your device, what we store, and the choices you have.',
      lastUpdated: 'Last updated',
      tagline: 'Plain-language disclosure of what the product does today',
      templateLabel: 'Template.',
      templateNotice: 'This is a template provided for transparency and is being finalized with legal counsel; it is not yet a binding agreement.',
      ownership: 'WorkCoPilot, a product of AdmireVeda.',
    },
    glance: {
      h2: 'At a glance',
      // Order matches the icon/tone list in the page (Monitor, Send, Database).
      cards: [
        { eyebrow: 'On your device', title: 'Sensitive values never leave in clear', body: 'PII, PHI and secrets are stripped or tokenized on your own device, in screen text and typed text, before any request is sent. The answer is rebuilt on your device.' },
        { eyebrow: 'What leaves', title: 'Only what is needed to guide the step', body: 'Reduced-size screen frames and the governed text. On the desktop app, documents are read locally and only the governed text is sent.' },
        { eyebrow: 'What we keep', title: 'A record of the session, until you delete it', body: 'A per-session report, audit log and your session history. Stored keys, secrets and report artifacts are encrypted at rest. Data is kept until you or your admin delete it, or a configured retention window purges older sessions on a schedule.' },
      ],
    },
    toc: { title: 'On this page' },
    // Section titles drive both the sticky table of contents and the article H2s.
    sections: {
      about: 'About this policy',
      collect: 'What we collect',
      categories: 'Data categories',
      leaves: 'What leaves your device',
      store: 'What we store and for how long',
      protect: 'How it is protected',
      cookies: 'Cookies and storage',
      third: 'Third parties',
      bases: 'Legal bases for processing',
      transfers: 'International data transfers',
      choices: 'Your choices and rights',
      california: 'California privacy rights',
      changes: 'Changes to this policy',
      contact: 'Contact',
    },
    about: {
      p1: 'This policy covers WorkCoPilot: the web app, the desktop app and the mobile app. It describes how the product treats your data when you sign in, run a guided session, and review your reports.',
      p2: '<b>Who is responsible.</b> WorkCoPilot is offered by {entity}, the legal entity and the controller of the account, sign-in and billing details described below. For the content of your guided sessions, your organization decides what is shared and {entity} acts on its behalf as described in the <a>Data Processing Addendum</a>.',
      p3: 'It is written to be read, not to impress. Where a behavior is under your control, or where we have not finished something, we say so. The <a>Security page</a> shows the full data flow, step by step, with before-and-after examples of the on-device protection.',
      note: 'This page is a plain-language disclosure of how the product works. It is not legal advice and it is not a substitute for your own legal review of how WorkCoPilot fits your obligations.',
    },
    collect: {
      lead: 'WorkCoPilot works with a small set of data, most of which stays on your device.',
      items: [
        { name: 'Account details', how: 'The sign-in details for your account, such as your email address. They are supplied by you, by your company admin, or by your identity provider when your company uses enterprise single sign-on.' },
        { name: 'Your screen and text during a session', how: 'What is on your screen and what you type or paste while WorkCoPilot guides you. Screen frames are read on your device, and sensitive values are redacted or tokenized there before anything is sent.' },
        { name: 'Documents you attach', how: 'On the desktop app, attached documents are read locally on your machine. Only the governed (redacted or tokenized) text is sent, never the file itself.' },
        { name: 'Session records', how: 'A report for each session, an audit log for each session, and your session history, so you can reopen and review past work.' },
        { name: 'Usage', how: 'The guided minutes you use, so your plan\'s allowance can be applied.' },
        { name: 'What it learns about tools', how: 'To keep guidance current, WorkCoPilot may keep generalized, de-identified learnings about how a tool or task currently works, such as where a setting now lives. These contain no personal data, secrets, screen images or document content. For a company account they are kept in that company\'s own knowledge base and benefit only its members; for individual accounts they are kept in our platform knowledge base to improve the service for everyone.' },
        { name: 'Billing', how: 'Payment details are entered with and held by Stripe, our billing provider. We receive what is needed to run your subscription, such as your plan and its status.' },
      ],
    },
    categories: {
      lead: 'WorkCoPilot is designed for everyday working screens and text. Use it for the kinds of data below, and keep to the limits that follow.',
      designedH: 'What it is designed for',
      designed: [
        { name: 'Work screens and text', how: 'Business applications, consoles, tickets, dashboards, spreadsheets, documents, code and commands that you are working in and are authorized to use.' },
        { name: 'Incidental personal data', how: 'Names, work email addresses, identifiers and similar details that appear in the course of that work.' },
        { name: 'Account and billing details', how: 'Sign-in details, plan and usage, as described above.' },
      ],
      notSubmitH: 'What not to submit',
      notSubmit: 'Do not submit data you are not authorized to process, data belonging to others that you have no right to share, or data your organization or the law forbids you from sharing with a service like this. If your work involves regulated data, make sure your organization has approved that use first. The <a>Acceptable Use Policy</a> sets out the rules in full.',
      sensitiveH: 'Sensitive data stays protected',
      sensitive: 'Sensitive data such as personal data, health data, secrets, keys and card numbers is stripped or tokenized on your own device before anything is sent, and you or your company admin can add your own words and patterns. This is a safeguard, and it does not replace your own duty to share only what you are allowed to.',
    },
    leaves: {
      lead: 'Before anything is sent, PII, PHI and secrets are stripped or tokenized on your own device, in both the text read from your screen and the text you type. The real values stay on your device, and the full answer is rebuilt there. The AI never sees the real sensitive values.',
      items: [
        { name: 'Reduced-size screen frames', how: 'Reduced in size before sending. Any line holding a sensitive value is blacked out on your device before the frame is sent.' },
        { name: 'Governed text', how: 'What you typed or pasted, with sensitive values already replaced by tokens on your device.' },
        { name: 'Governed text from documents', how: 'On the desktop app, the text extracted locally from an attached document, after redaction and tokenization. The file itself is not sent.' },
        { name: 'Nothing is done for you', how: 'WorkCoPilot is read-only. It never clicks, types, or changes a system of record on your behalf, so nothing it sends can act in your systems.' },
      ],
    },
    store: {
      lead: 'We store a record of each session and nothing more. Your source material is not kept.',
      notStoredH: 'Not stored',
      notStored: [
        { name: 'Uploaded source documents', how: 'Files you attach are not kept as stored source material.' },
        { name: 'Raw screen frames', how: 'Frames are used to guide the current step and are not kept as stored source material.' },
        { name: 'Real sensitive values', how: 'Stripped or tokenized on your device before anything is sent, so they are not ours to store.' },
      ],
      storedH: 'Stored',
      stored: [
        { name: 'Session report', how: 'One per session. It can include milestone screenshots, which are redacted on your device before they are captured. Milestone screenshots are on by default, and you or your company admin can turn them off.' },
        { name: 'Audit log', how: 'One per session, recording what was transmitted, so you can see exactly what left your device.' },
        { name: 'Session history', how: 'Your list of past sessions.' },
        { name: 'Sign-in session', how: 'A session cookie is used to keep you signed in.' },
        { name: 'Generalized learnings', how: 'De-identified facts about how tools and tasks currently work, kept so future guidance stays current. They hold no personal data, secrets, screens or document content, and they are not tied to any one session, so deleting a session does not change them. A company\'s learnings stay within that company\'s knowledge base and are removed with the company account, or earlier on request.' },
      ],
      howLongH: 'For how long',
      howLong: 'By default data is kept until you or your company admin delete it, with no automatic deletion. An automatic retention window can be configured so that sessions older than a set number of days are purged on a schedule. Either way, you and your admin can delete a session at any time.',
    },
    protect: {
      items: [
        { name: 'On-device redaction first', how: 'The main protection is that sensitive values are removed or tokenized on your device before any request is sent. Built-in detectors cover values such as emails, phone numbers, card numbers, SSNs, keys and private hosts, and you or your admin can add your own words and patterns.' },
        { name: 'Encryption at rest', how: 'Stored keys, secrets and report artifacts, including milestone screenshots, are encrypted at rest with AES-256-GCM.' },
        { name: 'Read-only by design', how: 'WorkCoPilot guides. It never runs anything in your systems, so it cannot change a system of record.' },
        { name: 'Role-based control', how: 'Company admins set and lock the data policy for their members, and review the sessions of their own members.' },
      ],
    },
    cookies: {
      p1: 'WorkCoPilot uses one strictly necessary sign-in cookie and, with your consent, a first-party referral cookie and functional browser storage (for example your language and theme). It sets no advertising cookies and no cross-site tracking.',
      p2: 'The full list, with the purpose and lifetime of each cookie and storage key, is in the <a>Cookie Policy</a>. You can turn functional and attribution storage on or off at any time from the <b>Cookie preferences</b> link in the footer, and rejecting non-essential storage is as easy as accepting it.',
    },
    third: {
      lead: 'These are the third parties involved in providing the service. The <a>Subprocessors</a> page lists the role each one plays.',
      items: [
        { name: 'The AI provider', how: 'Guidance is produced by an AI provider. By default it runs on the platform\'s keys. Your company, or you, can instead run WorkCoPilot on your own AI keys, which keeps the governed data inside your own provider boundary. The specific model in use is not shown to end users.' },
        { name: 'Stripe', how: 'Billing and payment details are handled by Stripe.' },
        { name: 'Your identity provider', how: 'When your company uses enterprise single sign-on, your identity provider authenticates you.' },
      ],
    },
    bases: {
      lead: 'Where data protection law (such as the EU/UK GDPR) applies, we rely on these legal bases to process your personal data.',
      items: [
        { name: 'Performing our contract', how: 'To give you the service you signed up for - your account, sign-in, running guided sessions and billing - we process the data needed to do that.' },
        { name: 'Legitimate interests', how: 'To keep the service secure, prevent abuse, and keep guidance current through de-identified learnings, balanced against your rights and freedoms.' },
        { name: 'Consent', how: 'For non-essential storage such as the referral cookie, we rely on your consent, which you can withdraw at any time from Cookie preferences.' },
        { name: 'Legal obligation', how: 'Where the law requires us to keep certain records (for example for tax or accounting), we process data to meet that obligation.' },
      ],
    },
    transfers: {
      p1: 'We and our subprocessors may process data in countries other than the one you are in. Where personal data is transferred across borders, we rely on an appropriate safeguard for that transfer - such as the relevant standard contractual clauses or a transfer being to a country with an adequacy decision - as applicable to the parties involved.',
      // <subs> = the Subprocessors page link, <dpa> = the Data Processing Addendum link.
      p2: 'The <subs>Subprocessors</subs> page and the <dpa>Data Processing Addendum</dpa> describe who is involved and how transfers are handled for company accounts.',
    },
    choices: {
      lead: 'Wherever the law gives you them, you have these rights over your personal data. You can use the tools in the product, or write to us and we will help.',
      rights: [
        { name: 'Access', how: 'Ask what personal data we hold about you and get a copy. Your session reports and history are available to you in the product.' },
        { name: 'Correction', how: 'Ask us to correct personal data that is wrong or incomplete. You can update your own account details, or ask us to.' },
        { name: 'Deletion', how: 'Ask us to delete your personal data. You can delete your own sessions at any time, and we will delete your account data on request, subject to any duty to keep a record that the law requires.' },
        { name: 'Export', how: 'Ask for your data in a portable format that you can take elsewhere.' },
        { name: 'Objection and limits', how: 'Ask us to limit or stop processing where the law gives you that right.' },
        { name: 'Company accounts', how: 'If your account is managed by your company, some requests go through your company admin, who controls your company\'s data and its settings.' },
      ],
      yourChoicesH: 'Your choices',
      yourChoices: [
        { name: 'Delete sessions', how: 'You can delete any of your sessions at any time. Deleting a session removes it.' },
        { name: 'Company data', how: 'Company admins manage their company\'s data, including deleting member sessions and reviewing member reports and audit logs.' },
        { name: 'Milestone screenshots', how: 'On by default. You or your company admin can turn them off.' },
        { name: 'Your own AI keys', how: 'You or your company can run WorkCoPilot on your own AI keys so the governed data stays inside your boundary.' },
        { name: 'What counts as sensitive', how: 'On top of the built-in detectors, you or your company admin can add custom words and patterns to redact, tokenize or block.' },
        { name: 'Questions or requests', how: 'For privacy requests, write to {contact}. For product help or billing, write to {support}.' },
      ],
    },
    california: {
      lead: 'If you are a California resident, the California Consumer Privacy Act as amended by the CPRA gives you specific rights. We honor these rights for California residents.',
      items: [
        { name: 'Right to know and access', how: 'Request the categories and specific pieces of personal information we have collected about you, and a copy of it.' },
        { name: 'Right to delete', how: 'Request deletion of your personal information, subject to any record we are required by law to keep.' },
        { name: 'Right to correct', how: 'Request correction of inaccurate personal information.' },
        { name: 'Sale and sharing', how: 'We do not sell your personal information, and we do not share it for cross-context behavioral advertising. There is nothing to opt out of on that front; you can still decline the referral cookie from Cookie preferences.' },
        { name: 'Sensitive information', how: 'We do not use sensitive personal information to infer characteristics about you. On-device redaction keeps sensitive values from leaving your device in the first place.' },
        { name: 'No discrimination', how: 'We will not discriminate against you for exercising any of these rights.' },
        { name: 'How to exercise', how: 'Write to {contact}. We will verify your request and respond within the time the law allows. An authorized agent may act for you where the law permits.' },
      ],
    },
    changes: {
      p1: 'When this page changes, the "Last updated" date at the top changes with it. Where a change matters to how your data is handled, we will say what changed in plain language.',
    },
    contact: {
      inquiries: 'Privacy, legal and security inquiries:',
      support: 'Product support and billing:',
      note: '<b>Honest framing.</b> WorkCoPilot provides controls and audit evidence that support your privacy and compliance work. It does not make an organization compliant on its own, and we do not claim a certification here. Your organization, working with its own advisers, decides how the product fits your obligations.',
    },
    cta: {
      ariaLabel: 'Related pages',
      flow: 'See the full data flow',
      terms: 'Terms',
      dpa: 'DPA',
      cookie: 'Cookie Policy',
      disclaimer: 'Disclaimer',
      contact: 'Contact',
      back: 'Back to WorkCoPilot',
    },
  },
}
