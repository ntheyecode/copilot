// English strings for the public Disclaimer page (src/pages/WorkDisclaimer.jsx).
// Keyed under the `disclaimerPage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the disclaimer itself.
// Interpolations: {entity} = the legal entity (COE Security LLC), {support} = the
// product-support mailbox; both stay constants in the page, never translated.
// <a>/<security>/<privacy> link tags render via t.rich() with the page's own hrefs;
// <b> renders bold. Lists (items[], glance.cards[]) translate as units.
export default {
  disclaimerPage: {
    seo: {
      title: 'Disclaimer - WorkCoPilot by AdmireVeda',
      description: 'What WorkCoPilot is and is not: practical guidance rather than professional advice, read-only so you decide what to run, best-effort accuracy, security checks as a backstop, and the limits of liability.',
    },
    hero: {
      eyebrow: 'Disclaimer · WorkCoPilot',
      h1: 'What WorkCoPilot is, and what it is not',
      lead: 'WorkCoPilot gives you practical, step-by-step guidance on your own screen so you can get work done. It does not act for you, it is not professional advice, and it can be wrong. This page sets out those limits in plain language so you know where you stand.',
      lastUpdated: 'Last updated',
      tagline: 'Plain-language terms, written to be read',
      templateLabel: 'Template.',
      templateNotice: 'This is a template provided for transparency and is being finalized with legal counsel; it is not yet a binding agreement.',
      ownership: 'WorkCoPilot, by AdmireVeda, a product of COE Security LLC.',
    },
    glance: {
      h2: 'At a glance',
      // Order matches the icon/tone list in the page (Compass, Hand, AlertTriangle).
      cards: [
        { eyebrow: 'Guidance', title: 'Practical help, not professional advice', body: 'WorkCoPilot shows you a sensible next step on your own screen. It is not legal, financial, medical, tax or other professional advice.' },
        { eyebrow: 'Your hands', title: 'You decide what to run', body: 'It is read-only. It never clicks, types or runs anything for you. Destructive steps are flagged for you to confirm before you act.' },
        { eyebrow: 'Accuracy', title: 'Verify before you rely on it', body: 'Guidance is best-effort. AI can be wrong or out of date, and the built-in security checks are a backstop, not a promise.' },
      ],
    },
    toc: { title: 'On this page' },
    // Section titles drive both the sticky table of contents and the article H2s.
    sections: {
      advice: 'Guidance, not professional advice',
      control: 'You are in control, and responsible',
      accuracy: 'Accuracy and the limits of AI',
      checks: 'Security checks are a backstop',
      compliance: 'Compliance',
      warranty: 'No warranty and limitation of liability',
      contact: 'Contact',
    },
    advice: {
      p1: 'WorkCoPilot gives practical guidance to help you act: what to look at next, what to click, what a setting means, how a command is usually written. It is a working aid.',
      p2: 'It is not legal, financial, medical, tax, accounting, engineering or other professional advice, and using it does not create a professional relationship with us. Where a step touches money, health, legal duties, safety or regulated work, confirm it against your own requirements and with a qualified professional before you rely on it.',
      note: 'This page is a plain-language statement of the product\'s limits. It is not a substitute for your own legal review of how WorkCoPilot fits your situation.',
    },
    control: {
      lead: 'WorkCoPilot is read-only by design. It watches your screen, with sensitive values redacted on your device, and tells you what it would do next. It never clicks, types, submits, or runs anything for you.',
      items: [
        { name: 'You decide what to run', how: 'Every action in your systems is yours. You choose whether to follow a step, change it, or stop.' },
        { name: 'Destructive steps are flagged', how: 'When a suggested step could delete, overwrite, pay, send, or otherwise be hard to undo, WorkCoPilot flags it so you can confirm it deliberately before you act.' },
        { name: 'Your systems, your rules', how: 'You remain responsible for having the right permissions, following your employer\'s and your customers\' policies, and keeping to the terms of the tools you use.' },
        { name: 'Your accounts', how: 'You are responsible for keeping your sign-in details safe and for what is done under your account.' },
      ],
    },
    accuracy: {
      lead: 'Guidance is produced with the help of AI and is best-effort. AI can misread a screen, miss context, be out of date about a tool that has changed, or simply be wrong. It can sound confident while being wrong.',
      items: [
        { name: 'Verify before you rely on it', how: 'Check anything that matters against the tool\'s own documentation, your own records, or a person who knows the system.' },
        { name: 'Screens are read, not understood perfectly', how: 'WorkCoPilot reads your screen on your device, after redaction. Small text, unusual layouts and redacted values can lead to a wrong read.' },
        { name: 'Tools change', how: 'Menus, commands and defaults move. A step that was right last month may not be right today.' },
        { name: 'Tell us', how: 'If guidance was wrong or unsafe, write to {support} so we can look into it.' },
      ],
    },
    checks: {
      p1: 'WorkCoPilot writes commands, code and scripts the secure way by default and runs checks for common problems such as injection, exposed secrets and over-broad permissions before it gives them to you. It also looks at dependencies it suggests.',
      p2: 'Those checks are a helpful backstop. They are not a guarantee that a command, script or dependency is safe, correct, or right for your environment. Review what you run, test it where it is safe to test, and keep your own security controls in place.',
    },
    compliance: {
      p1: 'WorkCoPilot provides controls and audit evidence that support your compliance work: on-device redaction and tokenization, read-only operation, per-company data policies that admins arm and lock, and per-session reports and audit logs.',
      // <security> = the Security page link, <privacy> = the Privacy Policy link.
      p2: 'Those controls do not make you compliant, and we do not claim that the product is certified against any framework. Compliance is achieved and held by your organization, working with its own auditors and advisers. See the <security>Security page</security> for how the controls map to common frameworks, and the <privacy>Privacy Policy</privacy> for how your data is handled.',
    },
    warranty: {
      p1: 'WorkCoPilot is offered by AdmireVeda, a product of {entity}, which is the legal entity behind the service. In this section, “we” means {entity}, AdmireVeda and WorkCoPilot together.',
      p2: 'WorkCoPilot is provided as is and as available. To the extent the law allows, we make no warranty, express or implied, about the guidance, including that it is accurate, complete, current, fit for a particular purpose, or free of errors.',
      p3: 'To the extent the law allows, we are not liable for loss or damage arising from actions you take, or do not take, based on the guidance, including lost data, lost revenue, downtime, or costs of recovery. You act on the guidance at your own discretion, and you remain responsible for the outcome in your systems.',
      p4: 'Nothing on this page limits rights that cannot be limited under the law that applies to you.',
      note: '<b>Why this is here.</b> It would be easy to write a page of dense legalese. We would rather be clear: WorkCoPilot is a guide that never acts for you, and the judgment and the responsibility stay with you.',
    },
    contact: {
      inquiries: 'Legal, privacy and security questions:',
      support: 'Product support and billing:',
    },
    cta: {
      ariaLabel: 'Related pages',
      privacy: 'Privacy Policy',
      terms: 'Terms',
      security: 'Security',
      contact: 'Contact',
      back: 'Back to WorkCoPilot',
    },
  },
}
