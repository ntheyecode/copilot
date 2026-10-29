// English strings for /workcopilot/enterprise (src/pages/WorkEnterprise.jsx).
// Keyed under the `enterprisePage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace and
// never collides with the older `enterprise.*` keys (the demo band), which stay
// in en.js. Extraction only: the copy is the page's exact English wording.
// Rich strings: <hl>..</hl> is the brand highlight span, <b> and <code> render
// as themselves. Arrays translate as units and are joined to their icons by
// position in the page.
// Not keyed on purpose: the SIEM / SOC destination names (Splunk, Microsoft
// Sentinel, ... Webhook, Syslog / CEF) are product and protocol names; the
// product's own `[REDACTED]` token inside <code> is a product literal.
export default {
  enterprisePage: {
    // The hero illustration's drawn labels (the SVG itself is decorative).
    art: {
      sop: 'SOP',
      playbook: 'PLAYBOOK',
      appGuide: 'APP GUIDE',
      tenant: 'YOUR TENANT',
      corrected: 'Wrong field. Corrected.',
      sharper: 'GETS SHARPER',
    },
    hero: {
      eyebrow: 'For enterprises & teams',
      h1: 'Hand-holding for every step. <hl>Trained on how your company works.</hl>',
      sub: 'It watches each person\'s screen and walks them through the exact next step in your own apps, correcting a wrong turn as it happens. Upload your SOPs and playbooks, and every step follows the way your company actually works. Read-only by design: it never clicks or types for your people.',
      ctaLearn: 'See how it learns your company',
      proofAria: 'At a glance',
      proof: [
        'Watches the screen and hand-holds through each exact step',
        'Catches a wrong turn and corrects it in real time',
        'Grounded in your playbooks, private to your tenant',
        'Checks every step against your own written security policy',
      ],
    },
    // Shared CTA labels (hero + final band use the same quote button).
    cta: {
      quote: 'Get an enterprise quote',
      dpa: 'Read the DPA',
    },
    // THE KILLER FEATURE: it learns your enterprise.
    learn: {
      eyebrow: 'The difference',
      h2: 'It learns <hl>your</hl> enterprise. Your apps, your data, your playbooks.',
      lead: 'Generic assistants know the world. WorkCoPilot knows your company: your apps, your fields, your approvals, your names. Upload once, and every on-screen step speaks your language, sharper as your knowledge grows.',
      loopAria: 'How WorkCoPilot learns your company',
      // The four numbered steps of the learning loop (01..04 stay in code).
      steps: [
        { t: 'Upload your knowledge', d: 'Your admin loads SOPs, playbooks, app guides and policies once. Every member inherits them.' },
        { t: 'Every step is grounded in it', d: 'Steps use your app names, your fields, your approval chain. Not a generic how-to.' },
        { t: 'It hand-holds, on the real screen', d: 'It points at the exact next step in your apps and corrects a wrong turn live. Read-only: it never clicks or types for anyone.' },
        { t: 'It gets sharper as you add', d: 'Add a playbook or fix an SOP, and the next session reflects it. For your company only.' },
      ],
    },
    // Before / after: the same step, generic vs grounded in your company.
    ba: {
      aria: 'The same step, with and without your company knowledge',
      q: '"Create the change request."',
      without: {
        tag: 'Without your knowledge',
        a: 'Open your ticketing system, create a new change request, fill the required fields, attach the approval, submit.',
        foot: 'Correct, but your people still have to know which system, which fields, which approval.',
      },
      with: {
        tag: 'Grounded in your company',
        a: 'In ServiceNow: <b>Change > Create New > Standard</b>. Set <b>Assignment group</b> to <b>Platform-Ops</b>, template <b>CHG-STD-07</b>, attach the CAB approval, Submit. From your <b>Change Playbook, section 3.2</b>.',
        foot: 'It hand-holds through each click and flags the wrong template before it is submitted.',
      },
      note: 'Illustrative example. Your steps come from your own uploaded knowledge and apps.',
    },
    trust: {
      title: 'Private to your tenant. Controlled by your admin.',
      sub: 'Your knowledge makes your own people better, and nobody else\'s.',
      items: [
        { t: 'Stays inside your company', d: 'Guides your own members only. Never trains a shared model or reaches another company.' },
        { t: 'You keep the copy', d: 'View what is loaded and download your knowledge any time.' },
        { t: 'Re-upload or replace', d: 'Merge in new material or swap the whole set.' },
        { t: 'Clear it when you choose', d: 'Clearing needs a reason, logged with who, what, when and why.' },
      ],
    },
    kinds: {
      aria: 'What you can upload',
      label: 'Bring',
      items: ['SOPs', 'Runbooks', 'Playbooks', 'App walkthroughs', 'Policies', 'Data dictionaries', 'Process maps', 'Checklists', 'Templates', 'Skills exported from any AI'],
    },
    // The feature groups, in page order. Each feature is { t, d }; d may carry
    // <code>..</code>. The governance group ends with residency.* (en.js).
    groups: {
      security: {
        kicker: 'Security & privacy',
        title: 'Nothing sensitive leaves a device unprotected.',
        lead: 'Protection is on from the first second and enforced for everyone. Sensitive values are masked before anything is sent.',
        features: [
          { t: 'On-device redaction, on by default', d: 'Personal data, keys, card numbers and IDs are masked on the device and shown as <code>[REDACTED]</code>. On for everyone, locked by policy.' },
          { t: 'Per-session audit log', d: 'Every session logs what was sent, read, filtered and flagged. Pull it any time.' },
          { t: 'Built-in SAST and dependency check', d: 'Code in a session is scanned for weaknesses and its dependencies checked against the OSV database before you run it.' },
          { t: 'Encryption at rest', d: 'Session artifacts and company data are encrypted at rest, with keys you can rotate.' },
          { t: 'Mandatory MFA (TOTP)', d: 'Every account uses an authenticator. Password, SSO and social sign-in all pass the same second factor.' },
          { t: 'Hidden from screen shares', d: 'The desktop overlay stays out of screen shares and recordings by default.' },
        ],
      },
      governance: {
        kicker: 'Governance / DLP',
        title: 'One company policy. Every member inherits it.',
        lead: 'Your written security policy becomes the rules every step is checked against. You decide what may leave a device, how long records are kept, and who may remove what.',
        features: [
          { t: 'Your written security policy, enforced as it guides', d: 'Paste your company\'s own security policy and your admin arms its rules. Every step, result and document is then checked against them on the server: a prohibited or skipped-required step is flagged inline and cited to your policy by name and section (for example <code>Acceptable Use Policy §4.2</code>), with the compliant alternative beside it and a line in the audit log. It flags and cites, it never rewrites your text.' },
          { t: 'Custom scrub rules', d: 'Add your own patterns and words to redact or block. Members cannot weaken them.' },
          { t: 'Retention windows', d: 'Set how long session records and documents are kept. Expiry is automatic.' },
          { t: 'Member oversight', d: 'Admins can pull the report and audit log of any member session, live or complete.' },
          { t: 'Accountable destructive actions', d: 'Deleting or clearing anything requires a reason, logged with who, what, when and why.' },
          { t: 'Per-company AI keys, or bring your own', d: 'Route through your company\'s own keys or bring your own. Nothing is shared across companies.' },
        ],
      },
      alerts: {
        kicker: 'Security alerts & SOC',
        title: 'Know the moment sensitive data is entered. Relay it to your SOC.',
        lead: 'When a member enters PII or PHI, it is masked on their device and your admin is told who, where and what kind, never the values. Relay those alerts into the SIEM, SOAR and chat tools you already run.',
        destinationsAria: 'Supported destinations',
        features: [
          { t: 'Who, where, what, when', d: 'Each alert names the member, the task, and the kind and count of data (for example email x1, card x1). The values are never stored or sent.' },
          { t: 'Redacted before submission', d: 'Proof the protection worked: values were masked on the device before anything reached the platform.' },
          { t: 'Automatic relay', d: 'New alerts reach every enabled connector as they happen, with per-connector delivery status.' },
          { t: 'Write-only secrets', d: 'Tokens are stored write-only and can be rotated. The console never shows them back.' },
          { t: 'Generic Webhook and Syslog / CEF', d: 'Anything not on the list connects through a signed webhook or a Syslog / CEF stream.' },
        ],
      },
      identity: {
        kicker: 'Identity',
        title: 'Sign in the way your company already does.',
        lead: 'Invite-only provisioning, company single sign-on with your identity provider, and an authenticator on every path.',
        features: [
          { t: 'Company SSO (OIDC)', d: 'Fourteen identity providers including Google, Microsoft Entra, Okta, Auth0 and Ping. Members are invited, never self-served.' },
          { t: 'Email-domain auto-detect', d: 'Type a company email and WorkCoPilot routes straight to your single sign-on.' },
          { t: 'Social sign-in', d: 'Individuals continue with Google, Microsoft or Facebook, then set up their authenticator.' },
        ],
      },
      compliance: {
        kicker: 'Compliance evidence & reporting',
        title: 'Evidence your auditors can work with.',
        lead: 'Reports that support your compliance program, mapped to the frameworks you answer to and sealed so they can be verified.',
        features: [
          { t: 'Mapped to 18 frameworks', d: 'Per-task evidence reports map the controls exercised in a session to eighteen frameworks. Evidence that supports your program; not a certification.' },
          { t: 'Authenticity seal', d: 'Every report carries a verifiable seal, so a recipient can confirm it is genuine and unaltered.' },
          { t: 'Big-4-grade session reports', d: 'Cover, contents, charts, the confirmed steps and the outcome, with scrubbed milestone screenshots as evidence.' },
        ],
      },
      exec: {
        kicker: 'Executive & commercial',
        title: 'Run it like a company product.',
        lead: 'An executive view of productivity, your brand on the product, and billing that matches how companies buy.',
        features: [
          { t: 'Executive ROI dashboard', d: 'A productivity dashboard of tasks, time, and an illustrative view of time and cost saved. Export to PDF, image or CSV.' },
          { t: 'White-label branding', d: 'Your company name and logo on the product your people use.' },
          { t: 'Unlimited seats, one admin console', d: 'Unlimited seats and tasks, managed from one central admin console.' },
          { t: 'Per-company pricing and billing', d: 'Separate user and admin seat pools, a company minute pool, your pricing, and statements with downloadable invoices.' },
        ],
      },
      platform: {
        kicker: 'Platform',
        title: 'Desktop, web and mobile. Hand-holding, not automation.',
        lead: 'Your people use it where they work. It guides their hands step by step; it never acts for them and never generates content for them.',
        features: [
          { t: 'Desktop overlay', d: 'A see-through overlay that stays on top of the app you are in, hidden from screen shares.' },
          { t: 'Web', d: 'Nothing to install. Sign in, share a screen, and a floating window keeps the steps above your work.' },
          { t: 'Mobile', d: 'Point your phone\'s camera at a screen, a device or paper and follow the steps.' },
          { t: 'No content generation', d: 'When a task needs a document or image, it hands you a ready prompt for your own AI. It never produces the content itself.' },
        ],
      },
    },
    final: {
      h2: 'Give your people a hand that knows your company.',
      p: 'A named owner for your rollout, a DPA, and on-prem options on request.',
    },
  },
}
