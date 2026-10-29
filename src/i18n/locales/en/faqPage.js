// English strings for the public FAQ page (src/pages/WorkFaq.jsx). Keyed under
// the `faqPage` namespace; the i18n loader deep-merges every en/*.js partial into
// the English base, so this file owns its namespace and never collides with
// other i18n waves. The lead extracts these into the other locales.
//
// STRUCTURE CONTRACT (the page depends on it):
// - groups.<id>.items is an ARRAY in question order. The page keeps the per-item
//   related-page hrefs in code, in the same order (WorkFaq.jsx GROUPS); a
//   translation must keep the item order and the number of `links` labels.
// - Anchors (#what-is-workcopilot) derive from the ENGLISH question text here,
//   so a translation never moves a shared deep link.
// - `d` is optional (one-line detail). `links` is optional (chip labels).
// - {support} {legal} {sales} are the contact addresses, filled in by the page.
// HONESTY CONTRACT (docs/business-rules.md) applies to every string here.
export default {
  faqPage: {
    // Hero + search
    eyebrow: 'FAQ · WorkCoPilot',
    h1: 'Straight answers, before you start.',
    lead: 'What it is, what leaves your device, what it costs. Pick a question, get the point.',
    searchLabel: 'Search the questions',
    searchPlaceholder: 'Search: install, price, HIPAA, own key',

    // The three glance cards (icons and tones stay in code, same order)
    glanceH2: 'The three things to know',
    glance: [
      { eyebrow: 'Read-only', title: 'It guides. You stay in control.', body: 'Exact next step on your own screen. It never clicks, types or runs anything.' },
      { eyebrow: 'Private by design', title: 'Sensitive data never leaves in clear', body: 'Personal data, secrets and keys are stripped or tokenized on your device before anything is sent.' },
      { eyebrow: 'Stays current', title: 'Learns your tools as they change', body: 'Reads the screen you have today and researches the latest docs, not a stale training cutoff.' },
    ],

    // Section rail + ledger chrome
    sections: 'Sections',
    answersCount: '{n} answers',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    emptyNoMatch: 'No answer matches <b>{query}</b> yet.',
    emptyTry: 'Try a shorter word, or <a>ask us directly</a>.',
    qNum: 'Q{num}',
    linkToQuestion: 'Link to this question: {q}',

    // Closing band
    ctaAria: 'Still have a question',
    ctaEyebrow: 'Still have a question?',
    ctaH2: 'Ask us, or start and see for yourself.',
    ctaP: 'Product and billing: {support}. Privacy, legal, security: {legal}.',
    getStarted: 'Get started',
    demoBtn: '60-second demo',
    emailSupport: 'Email support',

    groups: {
      what: {
        title: 'What it is',
        items: [
          { q: 'What is WorkCoPilot?',
            a: 'WorkCoPilot watches your screen and tells you the exact next click, command, setting or code for the task in front of you, catches a wrong move, and keeps you on the correct step until the job is done.',
            d: 'Made by AdmireVeda.',
            links: ['How it works', '60-second demo'] },
          { q: 'How is it different from a chatbot or a general AI assistant?',
            a: 'A chatbot answers from memory and cannot see where you are. WorkCoPilot reads your real screen, gives the next move for the tool you are actually in, confirms each step worked, and corrects you when a tool has changed.',
            d: 'You can still ask it questions along the way.' },
          { q: 'Does it do the work for me, or change anything in my systems?',
            a: 'No. WorkCoPilot is read-only by design: it watches and guides, and never clicks, types or runs anything. You make every change yourself.',
            d: 'That is what makes it safe on production consoles, finance systems and regulated environments.',
            links: ['Security'] },
          { q: 'What is it not built for?',
            a: 'Reading or writing long documents for you, or deep analysis. WorkCoPilot is built for doing: filing, configuring, fixing, setting up, building, step by step on screen. Code is the exception; it writes and corrects code as part of the task.',
            d: 'It also supports lawful work only and declines anything illegal or harmful.',
            links: ['Acceptable Use Policy'] },
        ],
      },
      how: {
        title: 'How it works',
        items: [
          { q: 'How does a task go?',
            a: 'Say what you want to get done. WorkCoPilot plans it, then guides you one step at a time on your own screen, with copy-ready text where that helps, and checks each step worked before moving on.',
            d: 'You finish with a write-up of exactly what you did.' },
          { q: 'What happens when I make a mistake?',
            a: 'It spots the wrong turn the moment it happens, says why, and shows the fix. Risky values such as an open network range, an over-broad permission or a hard-coded secret are flagged before you save.' },
          { q: 'Can I paste an error or attach a screenshot or document mid-task?',
            a: 'Yes. Paste an error, a response, a screenshot or a document and the next steps adjust to it.',
            d: 'Advanced and Premium can also upload reference documents to ground the steps; on the desktop app the file never leaves your device.',
            links: ['Compare plans'] },
          { q: 'Do I get a record of what I did?',
            a: 'Yes. Every session ends with a clean write-up of what you did, redacted milestone screenshots, and an audit log of what was sent. Share it, repeat it, or keep it.',
            d: 'Milestone screenshots can be turned off by you or your company admin.' },
        ],
      },
      platforms: {
        title: 'Platforms and install',
        items: [
          { q: 'Do I need to install anything?',
            a: 'No. WorkCoPilot runs in your browser and floats over your work, so it guides you even on locked-down machines and virtual desktops.',
            d: 'A Windows desktop app adds a see-through overlay, hides from screen shares by default, and can run a full-screen guide on a second monitor. Browser, desktop and mobile come on one subscription.' },
          { q: 'Does it work with desktop apps, terminals and on-prem consoles, not just websites?',
            a: 'Yes. If it is on your screen, it can guide you through it: web apps, installed desktop apps, terminals, on-prem consoles at a local address, and your own custom tools.' },
          { q: 'Can I use it from my phone?',
            a: 'The browser version works on any device today. The Android app, which lets you point your camera at a screen or a device and get guided on the go, is coming soon.' },
          { q: 'Which languages does it support?',
            a: 'Sixteen languages, chosen automatically for your region. Switch anytime; your choice is remembered.' },
        ],
      },
      security: {
        title: 'Security and privacy',
        items: [
          { q: 'What actually leaves my device?',
            a: 'With data protection on, personal data, health data, secrets, keys and card numbers are stripped or tokenized on your own device before anything is sent. Only what is needed to guide the current step leaves.',
            d: 'What leaves is a reduced screen frame with sensitive lines blacked out, and text with sensitive values replaced by tokens. The real values stay with you.',
            links: ['See the protection in action', 'Privacy Policy'] },
          { q: 'Can I control what counts as sensitive?',
            a: 'Yes. Add your own words and patterns to redact, tokenize or block on top of the built-in detectors. A company admin can lock the policy for every member, and compliance presets are one click to arm.',
            links: ['Security'] },
          { q: 'Can I use my own AI key so data stays inside my boundary?',
            a: "Yes. Run WorkCoPilot on your own or your company's AI key and every call stays on that key, inside your own provider relationship, with nothing silently rerouted.",
            d: 'Keys are encrypted at rest. For per-company keys and team provisioning, ask about Enterprise.',
            links: ['Enterprise', 'DPA'] },
          { q: 'Are the commands and code it gives me safe to run?',
            a: 'Yes. Every command, snippet and fix is written the secure way and checked for injection, hard-coded secrets, over-broad access and known-vulnerable libraries before it reaches you.' },
          { q: 'Can someone manipulate it through my screen or a task?',
            a: 'No. Whatever is on your screen or typed into a task is treated as information about the work, never as instructions. Attempts to make it break its rules or reach data that is not yours are declined and recorded for your administrator.' },
          { q: 'Do you use cookies?',
            a: 'One strictly necessary sign-in cookie. Non-essential storage stays off until you allow it, and rejecting is as easy as accepting. Change your choice anytime from the footer.',
            links: ['Cookie Policy'] },
        ],
      },
      pricing: {
        title: 'Pricing and billing',
        items: [
          { q: 'How much does it cost?',
            a: 'Four self-service plans, Lite, Basic, Advanced and Premium, each with guided major tasks and hours of live guidance, plus a custom-priced Enterprise plan. Current prices are side by side on the pricing page.',
            d: 'Billed monthly; annual billing at a discount may be offered at checkout. Checkout is by Stripe, and we never see your card number.',
            links: ['See pricing'] },
          { q: 'What counts as a task?',
            a: 'A task is a major task: one goal, guided end to end through every sub-step it takes. Security and privacy come with every plan, never as an upsell.',
            d: 'Basic adds roadmaps, the floating guide and the session write-up; Advanced adds document uploads and more hours; Premium adds generated visuals and priority in the guidance queue.',
            links: ['Compare plans'] },
          { q: 'What if I run out of hours?',
            a: 'Top up an extra hour whenever you need it. An extra hour adds one more task, and purchased time never expires.',
            d: 'Your daily hours reset each evening, US Eastern time. Pause anytime and come back where you left off.',
            links: ['Top-up rates'] },
          { q: 'Can I cancel anytime?',
            a: 'Yes. Cancel yourself from the billing portal, no contract and no call. Your plan stays active until the end of the period you paid for, and your sessions stay until you delete them.',
            links: ['Refund and cancellation policy'] },
          { q: 'Can I upgrade or downgrade?',
            a: 'Yes, anytime. An upgrade applies right away with prorated credit; a downgrade takes effect at your next renewal. Invoices are in your dashboard.' },
          { q: 'Is there a plan for teams and companies?',
            a: 'Yes. Enterprise adds seat pools, SSO, a company-wide locked data policy, a finance dashboard for billing, a signed DPA and a priority SLA.',
            d: 'Write to {sales} and we reply within one business day.',
            links: ['Enterprise', 'Contact sales'] },
        ],
      },
      current: {
        title: 'Staying current',
        items: [
          { q: 'Does it get outdated like other AI tools?',
            a: 'No. WorkCoPilot reads what is on your screen today, researches the latest official documentation live, and learns the current way your tools work for next time. When a button moves or a menu is renamed, it finds the new control instead of pointing at something that is gone.' },
          { q: "Does it learn from my team's work, and what does it never keep?",
            a: 'For a company account, what it learns about how your tools currently work stays in a private knowledge base only your members benefit from. Learnings are generalized and de-identified: never personal data, secrets, screen images or document content.',
            d: 'Individual accounts contribute de-identified learnings to a shared platform knowledge base.',
            links: ['Privacy Policy', 'DPA'] },
          { q: 'Which AI is behind it?',
            a: 'Each task is planned with the strongest AI available on the key in use, never a retired one. We do not publish vendor or model names, and if anything had to change mid-task to keep you going, the task log says so.',
            links: ['How your plan is made'] },
        ],
      },
      who: {
        title: 'Who it is for',
        items: [
          { q: 'Who is WorkCoPilot for?',
            a: 'Anyone who has to get real work done on a screen: engineers, IT and security teams, admins, founders, operations, finance and compliance staff, and everyday users. It is strongest on operational, technical, administrative and hands-on work, and on code.',
            d: 'It guides work across many professional fields, and the steps read as if an expert in that field wrote them.',
            links: ['Fields', 'Use cases'] },
          { q: 'Do I need to be technical?',
            a: 'No. It starts from zero: opens the right page, walks you to the exact spot and spells out every click, so a non-technical person can finish a technical task.',
            d: 'Ask for fuller steps that also explain why, and you learn as you go.' },
          { q: 'What does it do for a company?',
            a: 'Lean teams take on specialist work in-house, finish faster, keep every change documented, and spend less on contractors and implementation partners.',
            d: 'Admins set and lock the data policy, review member sessions and audit logs, and the company knowledge base grows with every task completed.',
            links: ['Enterprise'] },
        ],
      },
      compliance: {
        title: 'Data and compliance',
        items: [
          { q: 'Is it compliant with GDPR, HIPAA, SOC 2 and similar frameworks?',
            a: 'WorkCoPilot is compliance-ready: it gives you the controls and audit evidence that support your own compliance work, with one-click presets for GDPR, HIPAA, PCI DSS, SOC 2 and ISO 27001. We do not claim a certification.',
            links: ['Compliance readiness'] },
          { q: 'What do you store, and for how long?',
            a: 'A per-session report, an audit log and your session history, encrypted at rest, until you or your admin delete them or a retention window purges them. Raw screen frames, uploaded source documents and real sensitive values are not stored.',
            links: ['Privacy Policy'] },
          { q: 'Can I delete my data?',
            a: 'Yes. Delete any session anytime, which removes its report, screenshots and audit log together. Account data is deleted on request, subject to any legal duty to keep a record.' },
          { q: 'Is there a DPA, and who are your sub-processors?',
            a: 'A summary DPA is public and a signed DPA is available on request. Guidance is produced by a major AI provider, payments by Stripe, hosting by a cloud provider; the current list with entity names is available on request.',
            d: 'Write to {legal} with your company name and the contact who will sign.',
            links: ['Read the DPA', 'Sub-processors'] },
          { q: 'Can a company admin see what members did?',
            a: "Yes. Admins can review their own members' session reports and audit logs, set and lock the data policy, and delete member sessions. Members cannot change a locked policy." },
        ],
      },
      start: {
        title: 'Getting started and support',
        items: [
          { q: 'How do I get started?',
            a: 'Sign in at admireveda.com, pick a plan, say what you want to get done, and it starts guiding you on your screen. Nothing to install.',
            links: ['Get started', 'See pricing'] },
          { q: 'Is there a demo I can watch without signing up?',
            a: 'Yes. A 60-second scripted demo shows the guidance on a real-looking task, no sign-in needed.',
            links: ['See the 60-second demo'] },
          { q: 'How do I get support?',
            a: 'Email {support} for product help and billing, {legal} for privacy, legal or security, and {sales} for Enterprise. We reply within one business day.',
            links: ['Email support'] },
        ],
      },
    },
  },
}
