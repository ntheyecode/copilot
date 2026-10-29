// English strings for the public Terms of Service page (src/pages/WorkTerms.jsx).
// Keyed under the `termsPage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the terms themselves.
// Interpolations: {entity} = the legal entity (AdmireVeda), {support} = the
// product-support mailbox; both stay constants in the page, never translated.
// Inline tags render via t.rich() / Items with the page's own hrefs: <a>, <privacy>,
// <dpa>, <disclaimer>, <aup>, <refund> are links; <ph> is a clearly-marked
// fill-in-later placeholder (never an invented value); <b> renders bold.
// Lists (items[], glance[]) translate as units.
export default {
  termsPage: {
    seo: {
      title: 'Terms of Service - WorkCoPilot by AdmireVeda',
      description: 'The plain-language terms for using WorkCoPilot: the read-only service, acceptable use, accounts, subscriptions and billing, ownership, warranties, liability and termination.',
    },
    hero: {
      eyebrow: 'Terms of Service',
      title: 'The terms for using WorkCoPilot',
      intro: 'These terms set out how you may use WorkCoPilot, what you can expect from us, and where responsibility sits. They are written to be read, and they point to the policies that go with them.',
      tagline: 'Plain-language terms, template draft',
    },
    // Order matches the icon/tone list in the page (Compass, Hand, Scale).
    glance: [
      { eyebrow: 'The service', title: 'A read-only guide on your screen', body: 'WorkCoPilot gives practical, step-by-step guidance. It never clicks, types or runs anything for you.' },
      { eyebrow: 'Your side', title: 'Authorized, lawful use only', body: 'You are responsible for having the right to use the systems and data you share, and for following the Acceptable Use Policy.' },
      { eyebrow: 'Limits', title: 'Guidance, not professional advice', body: 'Verify what matters before you rely on it. Liability is limited as set out below.' },
    ],
    // Section titles drive both the table of contents and the article H2s.
    sections: {
      parties: 'Parties and acceptance',
      service: 'The service',
      aup: 'Acceptable use',
      accounts: 'Accounts',
      billing: 'Subscriptions and billing',
      ip: 'Ownership and your content',
      improvement: 'Improving the service with skills and content you add',
      warranty: 'Guidance, warranties and disclaimers',
      liability: 'Limitation of liability',
      termination: 'Termination',
      law: 'Governing law',
      changes: 'Changes to these terms',
      contact: 'Contact',
    },
    parties: {
      p1: 'These terms are an agreement between you (or the organization you represent) and {entity} (“we”, “us”). WorkCoPilot is offered by {entity}, the legal entity behind the service.',
      p2: 'By creating an account or using WorkCoPilot, you accept these terms. If you use it on behalf of a company, you confirm you are allowed to bind that company. If you do not agree, do not use the service.',
    },
    service: {
      p1: 'WorkCoPilot is a screen-aware guide for work. It helps you see what to do next on your own screen. It is available as a web app, a desktop app and a mobile app, and its features depend on your plan.',
      items: [
        { name: 'Read-only', how: 'WorkCoPilot never clicks, types, submits or changes anything in your systems. Every action is yours.' },
        { name: 'Protection before sending', how: 'Sensitive values are stripped or tokenized on your own device before anything is sent. The Privacy Policy describes what is collected and what is kept.' },
        { name: 'Changes to the service', how: 'We may improve, change or retire features. Where a change materially reduces a paid plan, we will tell you in advance.' },
      ],
      p2: 'See the <privacy>Privacy Policy</privacy>, the <dpa>Data Processing Addendum</dpa> and the <disclaimer>Disclaimer</disclaimer>, which form part of how the service works with your data.',
    },
    aup: {
      p1: 'You must use WorkCoPilot lawfully and only on systems and data you are authorized to use. The <a>Acceptable Use Policy</a> sets out what is allowed and what is not, and it is part of these terms.',
      p2: 'We may suspend or limit access if use breaks that policy, puts the service or other customers at risk, or is required by law.',
    },
    accounts: {
      items: [
        { name: 'Accurate details', how: 'Give accurate account details and keep them current.' },
        { name: 'Keep sign-in safe', how: 'You are responsible for your sign-in details and for what is done under your account. Tell us promptly at the support address below if you suspect misuse.' },
        { name: 'Company accounts', how: 'Where an administrator creates or manages accounts for a company, that company is responsible for its members, for the roster, and for the data policy it sets.' },
        { name: 'Single sign-on', how: 'Where your company uses enterprise single sign-on, access follows your company\'s identity provider and its rules.' },
      ],
    },
    billing: {
      p1: 'Paid plans are subscriptions. The plan, price, billing period and allowance are shown before you pay. Payments are handled by our billing provider, Stripe. Cancellation and refunds are covered in the <a>Refund and Cancellation</a> page, which is part of these terms.',
      p2: 'Taxes may apply and are shown at checkout where required. If a payment fails, we may limit access to paid features until it is resolved.',
      p3: 'Billing questions: <a>{support}</a>',
    },
    ip: {
      items: [
        { name: 'Our service', how: 'WorkCoPilot, including its software, design, documentation and brand, belongs to {entity} and its licensors. You get a limited, non-exclusive, non-transferable right to use it during your subscription, under these terms.' },
        { name: 'Your content', how: 'You keep your rights in what you share with the service, such as screen content, typed text and attached documents, and in the session reports produced for you.' },
        { name: 'What we may do with it', how: 'We use your content only to provide the service to you and to keep it secure and working, as described in the Privacy Policy and the Data Processing Addendum.' },
        { name: 'Your own AI key', how: 'Where you or your company run WorkCoPilot on your own AI key, that data stays inside your own provider relationship and is subject to that provider\'s terms.' },
        { name: 'Feedback', how: 'If you send us ideas or suggestions, we may use them to improve the service without obligation to you.' },
      ],
      p1: 'You must not copy, resell, reverse engineer or build a competing service from WorkCoPilot, except to the extent the law does not allow us to restrict that.',
    },
    improvement: {
      p1: 'You can add skills - playbooks, SOPs and instructions, including ones exported from other AI tools - so that WorkCoPilot’s guidance aligns with how you work. This section explains how that content may be used, and it is shown to you when you create an individual account.',
      items: [
        { name: 'Individual accounts', how: 'To improve WorkCoPilot, skills and content you add may be used in de-identified form to enhance the service for everyone. Personal data is stripped on your device before anything is sent, and de-identified content is never attributed to you.' },
        { name: 'Company accounts are exempt', how: 'Skills and knowledge added under a company account stay private to that company. They guide only that company\'s members and are never used to train or improve the platform for anyone else. Company administrators can download, re-upload or clear them at any time.' },
        { name: 'Your control', how: 'You can remove a skill you added at any time from your dashboard. Removal stops its use from that point; de-identified improvements already derived from it cannot be traced back to you or reversed.' },
        { name: 'Not training on your work', how: 'This covers only the skills and content you deliberately add. Your screens, typed tasks, questions and session reports are used only to provide the service to you, as described in the Privacy Policy.' },
      ],
    },
    warranty: {
      p1: 'WorkCoPilot gives practical guidance. It is not legal, financial, medical, tax, accounting, engineering or other professional advice, and using it does not create a professional relationship with us. Guidance is best-effort and can be wrong or out of date. Verify anything that matters before you rely on it. The <a>Disclaimer</a> explains this in plain language.',
      p2: 'To the extent the law allows, the service is provided as is and as available, and we make no warranty, express or implied, including about accuracy, completeness, fitness for a particular purpose, or uninterrupted or error-free operation.',
      p3: 'WorkCoPilot provides controls and evidence that support your own compliance work. It does not make you compliant, and we do not claim it is certified against any framework.',
    },
    liability: {
      p1: 'To the extent the law allows, we are not liable for indirect, incidental, special, consequential or punitive loss, or for lost data, revenue, profit or goodwill, arising from your use of the service or from actions you take or do not take based on its guidance.',
      p2: 'To the extent the law allows, our total liability for all claims relating to the service is limited to the amount you paid us for it in the <ph>12 months, to be confirmed by counsel</ph> before the event giving rise to the claim.',
      p3: 'Nothing in these terms limits liability that cannot be limited by law, or rights you have that cannot be waived.',
    },
    termination: {
      items: [
        { name: 'By you', how: 'You can stop using WorkCoPilot or cancel your subscription at any time. Cancellation follows the Refund and Cancellation page.' },
        { name: 'By us', how: 'We may suspend or end access for a material breach of these terms or the Acceptable Use Policy, for non-payment, or where required by law. Where it is reasonable to do so, we will give notice first.' },
        { name: 'What happens next', how: 'Your data is handled as set out in the Privacy Policy and the Data Processing Addendum, including deletion on request and under the retention settings for your account.' },
        { name: 'What survives', how: 'Sections that by their nature should continue, such as ownership, disclaimers, limitation of liability and governing law, continue after termination.' },
      ],
    },
    law: {
      p1: 'These terms are governed by the laws of <ph>governing-law state, to be confirmed with counsel</ph>, without regard to its conflict-of-laws rules. Disputes will be brought in the courts of <ph>venue, to be confirmed with counsel</ph>, unless the law that applies to you requires otherwise.',
    },
    changes: {
      p1: 'When these terms change, the “Last updated” date at the top changes with them. Where a change matters to your rights or obligations, we will say what changed in plain language and, for paid customers, give notice before it takes effect. Continuing to use the service after that means you accept the updated terms.',
    },
    contact: {
      legal: 'Legal, privacy and security',
      support: 'Product support and billing',
      note: '<b>Honest framing.</b> This page is a template. It describes the intended terms and is not a substitute for your own legal review.',
    },
    links: {
      aup: 'Acceptable Use',
      privacy: 'Privacy Policy',
      refund: 'Refund and Cancellation',
      dpa: 'Data Processing Addendum',
    },
  },
}
