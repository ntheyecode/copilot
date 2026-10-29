// English strings for the public Acceptable Use Policy page
// (src/pages/WorkAcceptableUse.jsx). Keyed under the `acceptableUsePage`
// namespace; the i18n loader deep-merges every en/*.js partial into the English
// base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the policy itself.
// Interpolations: {contact} = the legal/security mailbox, {support} = the
// product-support mailbox; both stay constants in the page, never translated.
// Inline tags render via t.rich() with the page's own hrefs: <a>, <contact>,
// <support> are links; <b> renders bold. Lists (items[], glance[]) translate as units.
export default {
  acceptableUsePage: {
    seo: {
      title: 'Acceptable Use Policy - WorkCoPilot by AdmireVeda',
      description: 'Where WorkCoPilot may be used, what you are responsible for, and what is off limits: lawful, authorized use only, no unauthorized access, no harm, and how concerns are reported.',
    },
    hero: {
      eyebrow: 'Acceptable Use Policy',
      title: 'Using WorkCoPilot the right way',
      intro: 'WorkCoPilot guides you on your own screen. This policy says where it may be used, what you are responsible for, and what is off limits.',
      tagline: 'Plain-language policy, template draft',
    },
    // Order matches the icon/tone list in the page (UserCheck, Hand, Ban).
    glance: [
      { eyebrow: 'Authorized', title: 'Only on what you may use', body: 'Use WorkCoPilot only on systems, accounts and data you are authorized to use, and keep your organization\'s approval in place.' },
      { eyebrow: 'Responsible', title: 'You answer for what you share', body: 'You are responsible for the authorization to use the screens and data you put in front of WorkCoPilot.' },
      { eyebrow: 'Prohibited', title: 'No unlawful or harmful work', body: 'Do not use it to break the law, to harm others, or to get around controls you are not allowed to get around.' },
    ],
    sections: {
      purpose: 'Purpose of this policy',
      authorized: 'Lawful and authorized use only',
      responsibility: 'You are responsible for authorization',
      prohibited: 'Prohibited uses',
      security: 'Security testing and sensitive work',
      enforcement: 'Enforcement',
      report: 'Reporting a concern',
    },
    purpose: {
      p1: 'This policy explains what you may and may not do with WorkCoPilot. It is part of the <a>Terms of Service</a>. WorkCoPilot guides you through work on your own screen, so the most important rule is simple: use it lawfully, and only where you are authorized.',
    },
    authorized: {
      items: [
        { name: 'Lawful', how: 'Use WorkCoPilot only for lawful purposes and in line with the laws and regulations that apply to you and your organization.' },
        { name: 'Authorized', how: 'Use it only on systems, applications, accounts and data that you, or your organization, are authorized to access and to use with a tool like this.' },
        { name: 'Your employer\'s rules', how: 'Follow your employer\'s and your customers\' policies, and the terms of the tools you are working in. If a policy forbids using an assistant on a system, do not use it there.' },
        { name: 'Organization authorization', how: 'For company accounts, a company administrator confirms in the product that the organization authorizes WorkCoPilot use on its systems. We record who confirmed it and when, as evidence. That confirmation does not replace the responsibility of each user described below.' },
      ],
    },
    responsibility: {
      p1: 'You are responsible for making sure you are permitted to share what is on your screen, and what you type or attach, with the service. Browser or device access to a system does not by itself mean you are authorized to use that system with an assistant.',
      items: [
        { name: 'Systems you share', how: 'Before sharing a screen, confirm you have the right to use that system and to show its content to the service.' },
        { name: 'Other people\'s data', how: 'Do not submit data about other people, or data belonging to a third party, unless you are authorized to process it. The Privacy Policy describes the data categories WorkCoPilot is designed for.' },
        { name: 'Your members', how: 'Company administrators are responsible for the people they add, and for the data policy they set and lock for their members.' },
        { name: 'Choosing when to share', how: 'You choose when to share your screen and which display. Do not share a display that holds material you are not authorized to process.' },
      ],
    },
    prohibited: {
      p1: 'You must not use WorkCoPilot to:',
      items: [
        { name: 'Break the law', how: 'Do anything unlawful, or help someone else do so.' },
        { name: 'Access without permission', how: 'Gain, or try to gain, access to a system, account or data that you are not authorized to access, or work around a security control you are not permitted to work around.' },
        { name: 'Cause harm', how: 'Create or spread malware, run attacks or intrusions, commit fraud, harass, defraud or deceive others, or carry out other harmful or abusive work.' },
        { name: 'Process what you may not', how: 'Submit data that you are not authorized to process, or that the law or a contract forbids you from sharing.' },
        { name: 'Misuse the service', how: 'Probe, overload or disrupt the service; attempt to bypass limits, plan allowances or protections; share your sign-in with others; or resell the service.' },
        { name: 'Misrepresent', how: 'Present guidance as professional advice from us, or misstate who you are or what you are authorized to do.' },
        { name: 'Copy or reverse engineer', how: 'Copy the service, extract its internals, or build a competing service from it, except where the law does not allow us to restrict that.' },
      ],
    },
    security: {
      p1: 'If your work involves security testing, regulated data, safety-critical systems or similar sensitive activity, you must have written authorization from the owner of the systems involved and you must stay within its scope. WorkCoPilot guides you on your screen. It does not act for you, and it does not make an unauthorized action authorized.',
      p2: 'Where a suggested step could delete, overwrite, pay, send or otherwise be hard to undo, WorkCoPilot flags it so you can confirm it deliberately. The decision, and the responsibility for it, stay with you.',
    },
    enforcement: {
      p1: 'If use breaks this policy, puts the service or other customers at risk, or is required by law, we may warn, limit, suspend or end access. Where it is reasonable to do so, we will tell you first and say why. We may also preserve and share information where the law requires it.',
      p2: 'Company administrators can review their own members’ sessions and reports, and can end a member’s access, as described in the Privacy Policy.',
    },
    report: {
      p1: 'If you think the service is being misused, or you found a security problem, write to <contact>{contact}</contact>. For product help, write to <support>{support}</support>.',
      note: '<b>Honest framing.</b> This page is a template. It states the rules we intend to apply and is not a substitute for your own legal review.',
    },
    links: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      disclaimer: 'Disclaimer',
    },
  },
}
