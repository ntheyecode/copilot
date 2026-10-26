// English (US) - the BASE catalog. Every other locale mirrors these keys.
// Conventions:
//   {name}            interpolated variable
//   <b> <em> <a>      inline rich text, rendered with t.rich() (never innerHTML)
//   key_one/_other    plural forms, picked by t.n(key, n)
// Never translated anywhere: code, commands, URLs/paths, brand names
// (WorkCoPilot, AdmireVeda, COE Security LLC), plan names (Lite/Basic/Advanced/Premium).
export default {
  lang: {
    label: 'Language',
    choose: 'Choose your language',
  },

  // First-login language attestation modal (LanguagePinModal). Shown once to a
  // paid user; pins the language for the app AND their emails.
  languagePin: {
    title: 'Choose your language',
    intro: 'This sets your language for the WorkCoPilot app and for the emails we send you.',
    note: 'Pick the language you are most comfortable working in. You can change it later from the language menu.',
    confirm: 'Save language',
    saving: 'Saving...',
    error: 'Could not save your language. Please try again.',
  },

  common: {
    signIn: 'Sign in',
    getStarted: 'Get started',
    contactUs: 'Contact us',
    continue: 'Continue',
    optional: '(optional)',
    comingSoon: 'Coming soon',
    seeInDetail: 'See in detail',
    hour_one: '{n} hour',
    hour_two: '{n} hours',
    hour_other: '{n} hours',
    task_one: '{n} task',
    task_two: '{n} tasks',
    task_other: '{n} tasks',
    perMonth: '/mo',
    perYear: '/yr',
  },

  // Shared widgets rendered on the public surfaces.
  widgets: {
    copy: {
      copy: 'Copy',
      copied: 'Copied',
      copyCommand: 'Copy the command',
      copyAria: 'Copy to clipboard',
      copiedAria: 'Copied to clipboard',
    },
    // The floating "Validate it live" lead widget (LiveValidate.jsx).
    validate: {
      launch: 'Validate it live',
      launchAria: 'Validate your scenario live',
      title: 'Validate it live',
      live: 'LIVE',
      close: 'Close',
      dismiss: 'Dismiss',
      coachB: 'Is WorkCoPilot right for you?',
      coachS: 'Test your own scenario <b>live</b> and see exactly how it would guide you.',
      introLead: 'Tell us who you are, then put in your real task. We check it <b>live</b> and tell you whether WorkCoPilot can guide you through it, step by step.',
      firstName: 'First name', firstNamePh: 'Jordan',
      lastName: 'Last name', lastNamePh: 'Rivera',
      workEmail: 'Work email', workEmailPh: 'jordan@company.com',
      phone: 'Phone', phonePh: '+1 555 010 0100',
      country: 'Country', countryPh: 'Select your country',
      company: 'Company', companyPh: 'Company name',
      required: 'Required',
      validEmail: 'Enter a valid email',
      validPhone: 'Enter a valid phone',
      validCountry: 'Select a country',
      saving: 'Saving…',
      startCheck: 'Start the live check',
      privacy: 'We use this only to follow up about WorkCoPilot. Your task text is scrubbed of sensitive data on your device before anything is sent.',
      introAsk: 'Put in your real task or scenario, or ask <b>how WorkCoPilot supports your apps</b>. We answer it <b>live</b> and tell you whether it can guide you through it, how, and which plan fits.',
      validating: 'Validating it live…',
      verdict: { covered: 'Covered', partial: 'Partly covered', no: 'Not a fit', offtopic: 'Describe a task', about: 'How WorkCoPilot helps' },
      iCanSee: 'I can see',
      planH: 'Your step-by-step plan',
      step_one: '{n} step', step_two: '{n} steps', step_other: '{n} steps',
      firstInFull: 'first {n} in full',
      showHow: 'Show how',
      more: '{steps} more in a real session, each the same depth',
      askPh: 'e.g. Set up a VPC on AWS and lock it down, reconcile last month\'s books in Excel, or: can it guide my in-house apps?',
      clear: 'Clear',
      clearTitle: 'Clear and ask a new question',
      send: 'Validate',
      busy: 'WorkCoPilot is busy, please try again in a moment.',
      saveFail: 'Could not save that - please try again.',
      offline: 'Could not reach us. Check your connection and try again.',
      tryAgain: 'Please try again.',
      unreachable: 'Could not reach the validator. Please try again.',
    },
  },

  nav: {
    home: 'AdmireVeda WorkCoPilot, home',
    main: 'Main',
    how: 'How it works',
    use: 'Use cases',
    fields: 'Fields',
    security: 'Security',
    enterprise: 'Enterprise',
    pricing: 'Pricing',
    faq: 'FAQ',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },

  footer: {
    aria: 'Site footer',
    tag: 'Your expert, on every screen. Read-only guidance that watches your screen and tells you the exact next move, in any app, with your data protected on your device.',
    product: 'Product',
    demo: '60-second demo',
    trust: 'Trust',
    securityData: 'Security & data protection',
    enterpriseFeatures: 'Enterprise features',
    benchmark: 'Accuracy benchmark',
    legal: 'Legal',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    aup: 'Acceptable Use',
    dpa: 'Data Processing Addendum',
    refund: 'Refund & Cancellation',
    disclaimer: 'Disclaimer',
    contact: 'Contact',
    sales: 'Sales and enterprise',
    ownership: 'WorkCoPilot, by AdmireVeda, a product of COE Security LLC.',
    note: 'Lawful, legitimate work only. Guidance, not professional advice.',
    cookiePrefs: 'Cookie preferences',
    cookiePolicy: 'Cookie Policy',
    subprocessors: 'Subprocessors',
    accessibility: 'Accessibility',
  },

  // Cookie / storage consent banner (ConsentBanner.jsx). GDPR + CCPA: reject is
  // as easy as accept, and non-essential storage stays off until allowed.
  consent: {
    aria: 'Cookie and privacy choices',
    title: 'Your privacy choices',
    body: 'We use one strictly necessary cookie to keep you signed in. With your consent we also turn on functional storage and referral attribution. You can change this anytime.',
    acceptAll: 'Accept all',
    rejectAll: 'Reject non-essential',
    manage: 'Manage preferences',
    save: 'Save choices',
    back: 'Back',
    close: 'Close',
    reopen: 'Cookie preferences',
    manageTitle: 'Manage your preferences',
    manageBody: 'Choose which categories to allow. Strictly necessary storage is always on so the site and sign-in keep working.',
    alwaysOn: 'Always on',
    on: 'On',
    off: 'Off',
    necessaryT: 'Strictly necessary',
    necessaryD: 'A single sign-in cookie that keeps you logged in and the site working. Cannot be turned off.',
    functionalT: 'Functional',
    functionalD: 'Remembers your language, theme and other preferences on this device. No cross-site tracking.',
    analyticsT: 'Analytics and attribution',
    analyticsD: 'Lets us credit a partner who referred you (a first-party referral cookie). Off until you allow it, and never used to profile you.',
    learn: 'Read our <a>Cookie Policy</a> and <p>Privacy Policy</p>.',
  },

  // "New in this release" marketing highlights (ReleaseNote.jsx), shown on the
  // home page (all four) and one card on each relevant page. HONEST: every point
  // describes shipped behavior - no certifications, invented numbers or unshipped
  // specifics. 16 is the real supported-language count (LOCALES).
  rel: {
    title: 'New in this release',
    sub: 'Shipping today, on every plan.',
    global: {
      eyebrow: 'Global by default',
      h: 'Works in 16 languages, picked for your region',
      line: 'The site and the product speak 16 languages, chosen automatically for your region.',
      points: [
        'The site and the product speak 16 languages.',
        'The right one is chosen automatically from your region - English where English is the working language, such as India, the US and the UK, and the local professional language elsewhere.',
        'You can switch language anytime, and your choice is remembered.',
      ],
    },
    privacy: {
      eyebrow: 'Private and compliant',
      h: 'Built to GDPR and CCPA, private by design',
      points: [
        'On-device redaction: personal data, health data, secrets and keys are stripped or tokenized on your own device before anything is sent.',
        'Read-only by design: WorkCoPilot guides, and never clicks, types or runs anything for you.',
        'A cookie-consent control you own: accept or reject non-essential storage in one click, and change it anytime.',
        'Aligned with GDPR and CCPA. A Data Processing Addendum is available for companies.',
      ],
    },
    billing: {
      eyebrow: 'Self-serve billing',
      h: 'Change your plan yourself, anytime',
      points: [
        'Upgrade anytime and it applies right away, with prorated credit for what you have already paid.',
        'Downgrade anytime and it takes effect at your next renewal.',
        'Cancel yourself anytime, with no contract.',
        'See your monthly invoices in your dashboard, and extra hours you buy never expire.',
      ],
    },
    enterprise: {
      eyebrow: 'Company controls',
      h: 'Governance your admins set once',
      points: [
        'Company admins set a data-loss-prevention policy that governs what may leave the device, once, for everyone.',
        'Per-company controls, and private company knowledge that is never used to train the platform.',
        'An accounting role with a finance dashboard for billing and spend.',
        'Single sign-on through your identity provider, and a DPA your legal team can sign.',
      ],
    },
  },

  // Data residency / data-localization claim for enterprise and company
  // customers. HONESTY CONTRACT (owner-enforced): best-efforts, NOT a blanket
  // present-tense guarantee. Must stay consistent with the Privacy page's
  // international-transfers section (data may be processed in other countries,
  // with safeguards), bring-your-own-keys, and on-prem options. Shown on the
  // Enterprise page (feature) and the Security page (brief note). Hyphens only.
  residency: {
    title: 'Data residency for enterprise',
    ent: 'We make all reasonable efforts to keep enterprise and company customers\' data in their region - European data in Europe, Indian data in India, US data in the US - as part of enterprise onboarding. Run WorkCoPilot on your own AI keys, or on-prem, to keep the governed data inside your own boundary.',
    sec: 'We make all reasonable efforts to keep enterprise and company customers\' data in their region - European data in Europe, Indian data in India, US data in the US - as part of enterprise onboarding. Companies can also run on their own AI keys, or on-prem, to keep the governed data inside their boundary.',
  },

  // Per-route <title> + meta description for the MARKETING pages (home + login
  // keep their own home.meta/login.meta). Read by each page's useSeo() as
  // seo.<key>.title / .description. Legal pages stay English and are NOT here.
  // {total}/{families} on the fields entry are injected from WorkFields.jsx.
  seo: {
    'how-it-works': {
      title: 'How It Works - WorkCoPilot by AdmireVeda',
      description: 'Everything WorkCoPilot does: step-by-step guidance on your screen, the exact command or click, starting from zero, catching and correcting mistakes, any app, grounded in your own documents, a record you keep, staying current by learning your tools, a pre-task coach, your own skills, on-device redaction with SAST and live dependency checks, company controls, and plans from the strongest AI available to you.',
    },
    'use-cases': {
      title: 'Use Cases - WorkCoPilot by AdmireVeda',
      description: 'What WorkCoPilot guides, in detail: technical setup and config, builds and integrations, AI and automation, product work, marketing, accounting and office tasks, legal and compliance, and everyday work on any screen.',
    },
    fields: {
      title: 'Fields we cover - {total} professional fields - WorkCoPilot by AdmireVeda',
      description: 'WorkCoPilot guides work across {total} professional fields in {families} families, from software and security to finance, operations, marketing, healthcare and education. One tool your whole company can use.',
    },
    pricing: {
      title: 'Pricing - WorkCoPilot by AdmireVeda',
      description: 'WorkCoPilot plans compared side by side: Lite, Basic, Advanced and Premium with monthly guided tasks and live guidance hours, document upload, generated visuals, security on every plan, overage and cancellation terms. Enterprise is custom.',
    },
    faq: {
      title: 'FAQ - WorkCoPilot by AdmireVeda',
      description: 'Straight answers about WorkCoPilot: what it is, how the step-by-step guidance works, platforms and install, what leaves your device, pricing and billing, how it stays current by learning your tools, who it is for, data and compliance, and getting started.',
    },
    contact: {
      title: 'Contact us - WorkCoPilot by AdmireVeda',
      description: 'Get in touch with the WorkCoPilot team about the product, a demo for your team, security or compliance, or anything else. Send a note and we will get back to you.',
    },
    enterprise: {
      title: 'Enterprise features - WorkCoPilot by AdmireVeda',
      description: 'WorkCoPilot learns your enterprise: upload your SOPs, playbooks, app guides and data, and it hand-holds your people through every exact step on their own screens, grounded in how your company works. Private to your tenant. Plus on-device redaction, audit logs, DLP governance, SIEM alerts, SSO, compliance evidence reports, executive ROI, white-label and per-company billing.',
    },
    demo: {
      title: '60-Second Demo - WorkCoPilot by AdmireVeda',
      description: 'Watch WorkCoPilot guide one real task start to finish: it reads the screen, gives the exact next step and command, checks it worked, catches a mistake before it costs you, and hands you the write-up.',
    },
    benchmark: {
      title: 'Accuracy Benchmark - WorkCoPilot by AdmireVeda',
      description: 'How accurate WorkCoPilot is, measured honestly: result correctness on tasks with known answers, reported per domain and per AI tier with sample sizes and 95% confidence intervals, plus the methodology.',
    },
  },

  home: {
    meta: {
      title: 'WorkCoPilot by AdmireVeda - Your expert, on every screen',
      description: 'WorkCoPilot plans your task with the strongest AI, then guides you step by step on your real screen and corrects a wrong move as it happens, in any app. Read-only, private by design, documented when you finish.',
    },
    badge: 'Your expert, on every screen',
    // Five rotating lines, each a DIFFERENT promise. Lines that restated a
    // section further down the page (the strongest-AI band, the enterprise
    // headline, compliance) were cut so the page never says one thing twice.
    hero: [
      { h: 'Get <em>anything</em> done right, the first time.', s: 'It watches your screen, tells you the exact next move, and corrects you the moment a step goes wrong. Any task, any field.' },
      { h: 'The <em>sharpest person</em> in the room, on every screen.', s: 'An expert beside you in any app. It reads your screen, gives you the exact next click or command, and catches your mistakes as you make them.' },
      { h: 'Code that is <em>safe to run</em>, checked before you see it.', s: 'Every command, script and fix is scanned for injection, exposed secrets, over-broad access and vulnerable libraries before it reaches you.' },
      { h: '<em>Private by design</em>, redacted on your device.', s: 'Sensitive data is stripped or tokenized on your machine before anything is sent. Your files and secrets never leave.' },
      { h: 'The AI is <em>on us</em>, always included.', s: 'You are never billed for how much AI a task takes. Bring every task, big or small, and focus on the work.' },
    ],
    cta: { start: 'Start guiding me', demo: 'See a 60-second demo' },
    anyapp: {
      cap: 'Works in any app you already use: web, desktop, on-prem, or your own in-house tools.',
      tiles: ['Web browser', 'Terminal', 'Code editor', 'Spreadsheets', 'Documents', 'Design tools'],
    },
    marquee: [
      'AWS', 'Invoices', 'Kubernetes', 'Payroll', 'RAG pipelines', 'Tax filing', 'Firewalls', 'Pitch decks',
      'Terraform', 'Grant applications', 'CI/CD', 'Budgets', 'Stripe', 'Procurement', 'Ansible', 'Onboarding',
      'Postgres', 'Insurance claims', 'n8n', 'Contracts', 'Grafana', 'Resumes', 'Docker', 'Expense reports',
      'SIEM', 'Fundraising', 'Salesforce', 'Email campaigns', 'Shopify', 'Board decks', 'Python & APIs', 'Inventory',
      'SSO / OAuth', 'Compliance', 'Nginx', 'Market research',
    ],
    best: {
      eyebrow: 'The strongest AI available to you',
      h: 'Planned by the <ai>strongest AI</ai> you can use. <em>Then guided, watched and corrected, live on your screen.</em>',
      p: 'Say the goal. It plans with the strongest AI on your key, then walks you through it on your real screen, one exact move at a time, and <b>catches a wrong step before it costs you</b>. A live loop, not a page of instructions.',
      link: 'See everything it does',
      receiptAria: 'How each task is planned, guided, watched and corrected',
      planK: 'plan', planV: '<b>strongest AI</b> on your key',
      guideK: 'guide', guideV: '<b>live</b>, step by step',
      watchK: 'watch', watchV: 'your <b>screen</b>, as you go',
      correctK: 'correct', correctV: 'a wrong step, <b>caught and fixed</b>',
      proofOk: 'Planned by the strongest AI for you',
      proofDim: 'the best one available on the key in use',
    },
    // THE enterprise section (one, not two): the ROI ledger carries the money
    // argument, the control chips (home.enterprise.chips) carry the assurance,
    // and the two CTAs go to contact and the full enterprise page.
    roi: {
      eyebrow: 'For companies and teams',
      h2: 'Do more with the team you already have.',
      lead: '<b>Same payroll, more output.</b> Your people take on the specialist work you were about to hire or outsource, guided step by step in the apps they already use, with every step documented as it happens. No new headcount. No rip-and-replace.',
      splitAria: 'Before and after, for the same team',
      beforeTag: 'Before',
      beforeH: 'Where the budget goes today.',
      afterTag: 'With WorkCoPilot',
      afterH: 'What the same team does now.',
      rows: [
        { t: 'Specialist projects', before: 'Migrations, hardening, pentests, builds: sent to contractors or a partner.', now: 'Done by <em>your own people</em>, step by step, the first time.' },
        { t: 'Time to ship', before: 'Work queues behind the one person who knows how.', now: 'Anyone on the team can take the next step. <em>Weeks become days.</em>' },
        { t: 'Consultants and partners', before: 'A statement of work for every new platform or tool.', now: 'Your team stands it up, and the know-how <em>stays in-house</em>.' },
        { t: 'Onboarding', before: 'Months of shadowing before a new hire is trusted on real work.', now: 'Productive from their <em>first task</em>, in your apps, your way.' },
        { t: 'Mistakes', before: 'Found in review, in production, or by the auditor.', now: 'A wrong turn is <em>caught on screen</em> and corrected as it happens.' },
        { t: 'Documentation', before: 'Written up later, if at all.', now: 'Every step logged as it happens. <em>Audit-ready</em> when you finish.' },
      ],
      controlsLbl: 'Enterprise controls, included',
      note: 'One company policy, set once. Redaction and guidance rules apply to every seat, and your SOC sees who and what kind, never the values.',
      ctaTeam: 'Talk about your team',
      ctaEnt: 'See every enterprise control',
    },
    fields: {
      eyebrow: 'Every field. One tool.',
      h2: 'Expert in your field, <em>whatever your field is.</em>',
      sub: 'Technical or not: {total} professional fields in {families} families, with steps that read like a specialist wrote them. Pick yours.',
      statsAria: 'Coverage at a glance',
      cards: [
        { k: 'Technical Setup & Config', d: 'Firewalls, IDS/IPS, cloud, DevOps, infrastructure.' },
        { k: 'Build & Implement', d: 'Pipelines, integrations, end-to-end builds.' },
        { k: 'AI & Automation', d: 'Agents, RAG, enterprise AI, automated workflows.' },
        { k: 'Product & Innovation', d: 'Prototype, build and ship a brand new idea.' },
        { k: 'Marketing & Growth', d: 'Campaigns, analytics, launches, outreach.' },
        { k: 'Accounting & Office', d: 'Reconciliations, reports, spreadsheets, filings.' },
        { k: 'Legal & Compliance', d: 'Reviews, forms, process, compliance checks.' },
        { k: 'Anything else', d: 'If it is on a screen, you are guided through it.' },
      ],
      exploreAll: 'Explore the use cases',
      browseAll: 'Browse all {total} fields',
    },
    // PROOF section: the two facts a buyer checks before trusting a tool on
    // real work. "Read-only, never clicks or runs anything" lives HERE, once.
    trust: {
      eyebrow: 'Security and privacy',
      h2: 'Safe on real work. Private by default.',
      sec: {
        eyebrow: 'Security',
        title: 'Written the secure way. Checked before you see it.',
        points: [
          'Every command, script and fix is checked for injection, hard-coded secrets and over-broad access before it reaches you.',
          'Read-only by design. It guides you and never clicks, types or runs anything on your machine.',
        ],
        chips: ['injection', 'secrets', 'least-priv'],
        checked: 'checked',
        link: 'See security in action',
      },
      priv: {
        eyebrow: 'Privacy',
        title: 'Scrubbed on your device, before anything leaves.',
        points: [
          'PII, PHI and secrets are masked or tokenized on your machine. The real values never leave, and the answer is rebuilt locally.',
          'You decide what gets scrubbed. On your own AI key, calls stay on that key. Nothing is rerouted.',
        ],
        link: 'See privacy in action',
      },
      ctaShow: 'See data protection in action',
      ctaPaper: 'Read the Security and Privacy paper (PDF)',
    },
    pricing: {
      eyebrow: 'Pricing',
      h2: 'Simple plans. Real guided time.',
      sub: 'Guided tasks and live guidance hours every month, with the AI included. Pause anytime and pick up where you left off.',
      billingAria: 'Billing period',
      monthly: 'Monthly',
      annual: 'Annual',
      save: 'Save 20%',
      mostPopular: 'Most popular',
      billedAnnually: 'billed annually',
      billedMonthly: 'billed monthly',
      // Monthly framing. Every number is injected from the live pricing config
      // (daily cap x 30) as a PLAIN NUMBER: {tasks}/{hours} are the monthly
      // totals, {dailyTasks}/{dailyHours} the per-day rate. The unit words stay
      // inside the string (not common.task/hour) so a locale that has not yet
      // translated these keys falls back to a consistent English line rather
      // than a mixed-language one. Monthly totals are never 1, so the plural is
      // safe. Tasks are stated plainly (unused ones bank); hours are always
      // "up to" with the asterisk, because a day's hours expire at midnight.
      // NOTE: these are NEW key names on purpose (the old hoursLine/dailyMinutes/
      // upTo were daily-framed and still exist in other locales): reusing an old
      // name would let a stale daily string swallow a monthly number.
      monthlyLine: '{tasks} tasks a month · up to {hours} hrs a month*',
      tasksMonthLine: '{tasks} guided tasks a month ({dailyTasks} a day - unused ones bank as credits)',
      hoursMonthLine: 'Up to {hours} hours of guidance a month ({dailyHours} h a day, resets at midnight)*',
      mins: 'Billed per minute you use, never by the hour.',
      choose: 'Choose {plan}',
      extraHour: 'Extra hour {price}',
      // The one asterisk note under the cards. Plan-independent on purpose: the
      // per-plan daily rate is already on each card, so this states the model.
      footnote: '*Each day you get your plan\'s guided tasks and hours of guidance. Daily hours reset at midnight (US Eastern) - they don\'t roll over. Unused tasks bank as credits you keep, or trade 2 tasks for 1 extra hour (expires that day). Billed per minute you actually use.',
      feats: {
        // The daily-task line is NOT here any more: it is rendered from the live
        // pricing config (tasksLine/hoursLine above) so a cap change follows.
        lite: ['Step-by-step on any task', 'Exact commands, code & links', 'Data privacy & security built in'],
        basic: ['Step-by-step on any task', 'Exact commands, code & links', 'Roadmaps included', 'Floating guide + session write-up'],
        advanced: ['Everything in Basic', 'Upload your own documents', 'Visual examples where they help', 'Priority guidance'],
        premium: ['Everything in Advanced', 'Generated visuals on demand', 'Highest-fidelity guidance', 'First in line, always'],
      },
      trustStripe: 'Secure checkout, powered by Stripe',
      trustCancel: 'Cancel anytime, no contract',
      trustExpire: 'Purchased time never expires',
      fineprint: 'Premium adds generated visuals. Image packs from {price} each (min {min}).',
      fullCompare: 'Compare every plan in detail',
    },
    // The enterprise control chips, shown inside the single enterprise section
    // (home.roi). The old second enterprise section (a 6-card feature grid) was
    // removed: the full feature list lives on /workcopilot/enterprise.
    enterprise: {
      stripAria: 'Enterprise controls',
      chips: ['SSO (OIDC)', 'Mandatory MFA', 'Unlimited seats', 'Your SOPs and playbooks', 'Audit logs', 'SOC / SIEM relay', 'DPA', 'On-prem on request'],
    },
    final: {
      h2: 'Stop guessing. Start being guided.',
      p: 'Bring any task. It takes you from the first step to done.',
      useYourWay: 'Use it your way',
      browser: { rec: 'No install', b: 'Use in your browser', i: 'Nothing to install', title: 'WorkCoPilot runs right in your browser - nothing to download, no installation needed. Just sign in and go.' },
      windows: { b: 'Windows app', i: 'Desktop overlay', aria: 'Download the Windows desktop app', title: 'A floating overlay that sits on top of whatever app you are working in' },
      android: { b: 'Android app', i: 'Phone & camera' },
      note2: 'Sign in with Google, Microsoft or Facebook, or use your work email for your company SSO. <a>Enterprise sign-in</a>.',
    },
    disclaimer: '<b>Responsible use.</b> WorkCoPilot supports lawful, legitimate work only. It will not help build weapons or means of mass harm, create malware or exploits, break into systems or accounts you do not own, or do anything illegal or harmful. Requests like these are declined.',
    demo: {
      watching: 'watching',
      watchingTitle: 'reading your screen',
      goal: 'GOAL',
      iCanSee: 'I can see',
      holdOn: 'HOLD ON',
      stepOf: 'Step {n} of {total}',
      doThisNow: 'DO THIS NOW',
      exactlyHow: 'EXACTLY HOW',
      doneWhen: 'done when {what}',
      terminal: 'TERMINAL',
      promptLbl: 'PROMPT FOR YOUR AI',
      beforeAfter: 'BEFORE → AFTER',
      vulnFixed: 'VULNERABLE → FIXED',
      tagBefore: 'before', tagAfter: 'after', tagVuln: 'vuln', tagFixed: 'fixed',
      scenarios: [
        {
          tag: 'Private by design', app: 'Billing console', goal: 'Set up a billing integration without leaking customer data',
          steps: [
            { sees: 'The screen shows a customer email, a card number and a live API key', say: 'Those are PII, a card and a secret - they must never reach an AI', do: 'They are blacked out in the screenshot and swapped for placeholders in text, on your device, before anything is sent', click: 'Protect on-device', done: 'only [EMAIL], [CARD] and [API_KEY] leave your device' },
            { sees: 'You paste an error that still contains sk-live-... and an internal IP', say: 'A pasted log carries the secret and your private host', do: 'They are tokenized too, and the real values stay on your machine', click: 'Tokenize', done: 'the AI sees [[SECRET_1]] and [[IP_2]], never the real values' },
            { sees: 'The answer comes back referencing the placeholders', step: 'Rebuild the answer locally', how: ['The real values are restored on your device', 'You get the full, usable answer', 'Nothing sensitive was ever transmitted'], click: 'Rebuild', done: 'you get the real answer; the AI never did' },
          ],
        },
        {
          tag: 'Agentic GenAI', app: 'Agent build', goal: 'Build a tool-calling RAG agent',
          steps: [
            { sees: 'An empty agent project is open', step: 'Create the vector store and embed your docs', how: ['Pick a vector store (pgvector or Chroma)', 'Chunk your docs to ~800 tokens with overlap', 'Embed the chunks and upsert them'], click: 'Create collection', done: 'the collection holds your vectors' },
            { sees: 'Retrieval returns whole documents', say: 'Returning full docs blows the context window and buries the answer', do: 'Return the top matching chunks with a score threshold, not whole files', click: 'Set top-k', done: 'retrieval returns focused chunks' },
            { sees: 'Tools are defined but the agent free-forms answers', step: 'Wire the tool-calling loop', how: ['Bind the tools to the model', 'Add the reason, call-tool, observe loop', 'Stop when the model returns a final answer'], click: 'Bind tools', done: 'the agent actually calls your tools' },
            { sees: 'User text is concatenated into the system prompt', say: 'That is a prompt-injection hole: a user can override your instructions', do: 'Keep user input in a user turn, never in the system prompt, and allowlist tool arguments', click: 'Separate roles', done: 'user text cannot hijack the system prompt' },
            { sees: 'You want a starter you can paste into your own AI', step: 'Copy a ready-to-run prompt, tuned to your stack', how: ['Scoped to your vector store and model', 'Security and privacy baked in - placeholders, never real secrets', 'Paste it into your AI and attach your docs'], click: 'Copy prompt', done: 'you have a prompt ready to paste into your AI' },
          ],
        },
        {
          tag: 'API pentest', app: 'Burp Suite', goal: 'Pentest your orders API with Burp Suite',
          steps: [
            { sees: 'Burp is open on the Proxy tab', step: 'Route your app through Burp', how: ['Open Proxy, then Proxy settings', 'Point your browser proxy at 127.0.0.1:8080', 'Install Burp\'s CA cert so HTTPS is trusted'], click: 'Proxy settings', done: 'requests show up in HTTP history' },
            { sees: 'A GET /api/orders/1024 is captured', step: 'Send it to Repeater', how: ['Right-click the request in HTTP history', 'Choose "Send to Repeater"', 'Open the Repeater tab'], click: 'Send to Repeater', done: 'the request is loaded in Repeater' },
            { sees: 'The order id is in the path and you own 1024', say: 'Swapping the id to another user\'s order tests for IDOR, broken object-level auth', do: 'In Repeater change 1024 to 1025 and Send; a 200 with someone else\'s order is a real finding', click: 'Send', done: 'you get a 403 (safe) or a logged finding' },
            { sees: 'An error response leaks a full stack trace', say: 'The stack trace hands an attacker your framework, versions and file paths', do: 'Record it as an info-leak finding and recommend generic error responses', click: 'Log finding', done: 'the finding is documented' },
          ],
        },
        {
          tag: 'ServiceNow admin', app: 'ServiceNow', goal: 'Ship a ServiceNow catalog item and lock down who can see it',
          steps: [
            { sees: 'A new Business Rule is set to run on every table, on every operation', say: 'An unconditioned global Business Rule fires on all records and can slow the whole instance', do: 'Scope it to the one table and add a condition so it runs only when it should', click: 'Scope the rule', done: 'the rule runs only where it is needed' },
            { sees: 'The table ACL grants read with an empty role, so everyone can read it', say: 'An empty role on an ACL means every logged-in user can read these records', do: 'Require a specific role so only the right group can see them', click: 'Restrict ACL', done: 'only catalog_viewer can read the records' },
            { sees: 'A catalog variable collects an employee SSN in a plain text field', say: 'That is PII sitting in a readable variable, and it must never reach an AI', do: 'It is masked on your device and swapped for a placeholder before anything is sent', click: 'Protect on-device', done: 'only [SSN] leaves your device, never the real value' },
          ],
        },
        {
          tag: 'Salesforce dev', app: 'Salesforce Apex', goal: 'Ship an Apex trigger without a security or governor-limit bug',
          steps: [
            { sees: 'A SOQL query sits inside a for loop over the trigger records', say: 'Querying inside a loop hits the SOQL governor limit and fails on a bulk load', do: 'Pull the query out of the loop and work from a map - bulkify it', click: 'Bulkify', done: 'one query serves the whole batch' },
            { sees: 'The query reads fields without enforcing the user access', say: 'Without field-level security the trigger can expose fields the user cannot see', do: 'Add WITH SECURITY_ENFORCED so FLS and sharing are respected', click: 'Enforce FLS', done: 'the query respects the user access' },
            { sees: 'An API key is hard-coded in the Apex class', say: 'A secret in Apex source leaks to every deploy and the metadata history', do: 'Move it to a Named Credential so the key never lives in code', click: 'Use Named Credential', done: 'no secret left in the code' },
          ],
        },
        {
          tag: 'Cloud security', app: 'AWS IAM', goal: 'Replace a wildcard IAM policy with least privilege',
          steps: [
            { sees: 'The role grants Action "*" on Resource "*"', say: 'That is full admin - one leaked key owns the whole account', do: 'Scope it to exactly the actions this app makes, on its own resources', click: 'Edit policy', done: 'the policy is scoped to one bucket' },
            { sees: 'CloudTrail shows the role also calls SQS', step: 'Add only what it really uses', how: ['Open CloudTrail, filter events by this role', 'List the distinct API calls it actually makes', 'Grant exactly those - nothing speculative'], click: 'Add sqs:SendMessage', done: 'every real call is allowed, nothing more' },
            { sees: 'Access Analyzer flags the bucket as public', say: 'The bucket policy still allows a wildcard principal, so anyone can read it', do: 'Remove Principal "*" so only this role can reach the data', click: 'Fix bucket policy', done: 'Access Analyzer goes green' },
          ],
        },
      ],
    },
  },

  login: {
    meta: {
      title: 'Create an Account or Log In - WorkCoPilot by AdmireVeda',
      description: 'Create a free WorkCoPilot account or log in to get step-by-step guidance on your own screen. Company single sign-on is available for company members.',
    },
    byAdmireVeda: 'by AdmireVeda',
    stage: {
      watching: 'watching',
      stepTag: 'Step 3 of 7',
      goal: 'Goal',
      goalText: 'Set up the new vendor in the payments portal',
      see: 'I can see',
      seeText: 'The Vendors tab is open and the form is empty',
      doThisNow: 'Do this now',
      s1: 'Open Finance, then Vendors',
      s2: 'Click New vendor',
      s3: 'Set payment terms to <b>Net 30</b>, then enter the Tax ID',
      s4: 'Attach the signed W-9',
      s5: 'Submit for approval',
      warnB: 'Wrong tab. Caught it.',
      warnS: 'You opened Customers. Go back to Vendors.',
      learnB: 'Knows your playbook',
      learnS: 'Net 30 comes from your Finance SOP, private to your company.',
    },
    pitchK: 'Your expert, on every screen',
    pitchH: 'It hand-holds you through <hl>every step.</hl>',
    pitchP: 'WorkCoPilot watches your screen, tells you the exact next move, and catches a wrong turn before it costs you. For companies, it learns your own apps and playbooks, privately.',
    proofAria: 'What you get',
    proof: [
      { b: 'Read-only by design', s: 'It never clicks, types or runs anything for you.' },
      { b: 'Private on your device', s: 'Sensitive values are scrubbed before anything leaves.' },
      { b: 'Documented when you finish', s: 'A clean record of every confirmed step.' },
    ],
    plan: {
      aria: 'You are starting the {plan} plan',
      kicker: 'You are starting',
      stepsAria: 'Checkout steps',
      account: 'Account',
      checkout: 'Secure checkout',
      billedAnnually: 'Billed annually',
      billedMonthly: 'Billed monthly',
      priceAnnual: '{price}/mo, billed annually ({total}/yr)',
      priceMonthly: '{price}/mo, billed monthly',
    },
    tabs: { aria: 'How would you like to continue?', social: 'Social', email: 'Email & SSO' },
    social: {
      google: 'Continue with Google',
      microsoft: 'Continue with Microsoft',
      facebook: 'Continue with Facebook',
      soonTitle: '{label} is coming soon',
      checking: 'Checking availability',
      hint: 'Quick and secure. We only use your name and email.',
    },
    ssoEntry: { q: 'Part of a company account?', btn: 'Continue with company SSO' },
    ssoStep: {
      aria: 'Company single sign-on',
      back: 'Back',
      h1: 'Company single sign-on',
      p: 'Type your work email domain and we will send you to your company\'s login.',
      domain: 'Company email domain',
      continue: 'Continue to company login',
      note: 'For members of a company account. Your company controls who can sign in.',
    },
    switch: {
      toCreate: 'New to WorkCoPilot? <a>Create an account</a>',
      toLogin: 'Already have an account? <a>Log in</a>',
    },
    finishing: { h1: 'Finishing your sign-in', p: 'One moment while we confirm your account.' },
    profile: {
      h1: 'Complete your profile',
      sub: 'You are almost in. Your name finishes your account, then you set up your authenticator.',
      aria: 'Complete your profile',
      consent: 'By continuing you agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.',
    },
    heading: {
      createPlan: 'Create your account to start {plan}',
      create: 'Create your account',
      loginPlan: 'Log in to start {plan}',
      welcome: 'Welcome back',
    },
    subline: {
      createPlan: 'It is free to create an account; you are charged when checkout completes.',
      create: 'It is free to create an account. Pick a plan when you are ready to start guiding.',
      loginPlan: 'After you log in we take you straight to secure checkout.',
      login: 'Log in to pick up right where you left off.',
    },
    sso: {
      detectedTitle: 'Your organization uses single sign-on',
      detectedCompany: '<b>{company}</b> signs in through its identity provider for <b>@{domain}</b>.',
      detectedDomain: 'Accounts at <b>@{domain}</b> sign in through your company\'s identity provider.',
      continue: 'Continue with SSO',
      usePassword: 'Use a password instead',
      checking: 'Checking your organization\'s sign-in…',
    },
    form: {
      ariaCreate: 'Create account',
      ariaLogin: 'Log in',
      fullName: 'Full name',
      namePh: 'Alex Morgan',
      email: 'Email',
      emailPh: 'you@example.com',
      phone: 'Phone',
      phonePh: '+1 555 000 1234',
      company: 'Company',
      companyPh: 'Your company',
      chooseUsername: 'Choose a username',
      usernameOrEmail: 'Username or email',
      usernamePh: 'your username',
      usernameOrEmailPh: 'your username or email',
      password: 'Password',
      passwordNewPh: 'choose a password (6+ characters)',
      passwordPh: 'your password',
      improve: 'To improve WorkCoPilot, skills and content you add may be used in de-identified form to enhance the service. Your personal data is stripped on your device first. Company accounts are exempt: company knowledge stays private. <a>Learn more</a>.',
      working: 'Working, please wait.',
      openingCheckout: 'Opening secure checkout',
      createContinue: 'Create account and continue',
      create: 'Create account',
      loginContinue: 'Log in and continue',
      login: 'Log in',
      consent: 'By creating an account you agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.',
      next: 'Next: secure checkout for {plan}. Nothing is charged until you complete it.',
      forgotSent: 'If an account exists for that username or email, a reset link is on its way.',
      forgot: 'Forgot password?',
      forgotPrompt: 'Enter your username or email and we will send a reset link:',
    },
    newWeb: 'New to WorkCoPilot? <a>Create your account at admireveda.com</a>',
    legal: 'Lawful, legitimate work only. Harmful or illegal requests are declined.',
    // Two-factor step (MfaGate.jsx): setup, verify and the backup-codes panel.
    mfa: {
      sixDigit: '6-digit code',
      backupCode: 'Backup code',
      errBackup: 'Enter your full backup code.',
      errCode: 'Enter the 6-digit code from your authenticator app.',
      errWrong: 'That code did not work. Please try again.',
      onEyebrow: 'Two-factor is on',
      saveCodes: 'Save your backup codes',
      saveCodesP: 'If you lose your phone, each of these one-time codes lets you sign in once. They are shown only now, so keep them somewhere safe, such as a password manager.',
      backupCodes: 'Backup codes',
      copyAll: 'Copy all',
      download: 'Download .txt',
      codesCopied: 'Backup codes copied to the clipboard.',
      savedCheck: 'I have saved these codes',
      fileTitle: 'WorkCoPilot backup codes',
      fileGenerated: 'Generated {date}',
      fileNote1: 'Each code works once. Use one if you cannot reach your authenticator app.',
      fileNote2: 'Keep this file somewhere safe and private.',
      verifyEyebrow: 'Two-step check',
      verifyH: 'Enter your authenticator code',
      signingAs: 'Signing in as <b>{user}</b>',
      verifyP: 'Open your authenticator app and type the 6-digit code shown for WorkCoPilot.',
      verifyBackupP: 'Enter one of the backup codes you saved when you set up two-factor. Each one works only once.',
      verify: 'Verify',
      verified: 'Verified',
      useApp: 'Use my authenticator app instead',
      useBackup: 'Use a backup code instead',
      yourAccount: 'your account',
      setupEyebrow: 'Required security step',
      setupH: 'Set up two-factor authentication',
      setupP: 'Two-factor protects your account even if your password is ever stolen. It takes about a minute and is required to continue.',
      s1H: '1. Install Microsoft Authenticator',
      s1P: 'It is free on the App Store and Google Play. Any standard authenticator app works too.',
      s2H: '2. Scan this QR code in the app',
      s2P: 'In the app, add an account, choose a work or other account, and point the camera here.',
      qrAlt: 'QR code for {acct}',
      qrFail: 'The QR code could not be drawn. Use the manual key below instead.',
      cantScan: 'Can\'t scan? Enter the key manually',
      account: 'Account',
      key: 'Key',
      notAvailable: 'Not available',
      type: 'Type',
      typeValue: 'Time-based (6 digits)',
      copyKey: 'Copy key',
      keyCopied: 'Key copied to the clipboard.',
      s3H: '3. Enter the 6-digit code',
      s3P: 'Type the code the app shows for WorkCoPilot to confirm it is working.',
      verifiedPreparing: 'Verified, preparing your backup codes',
      verifyContinue: 'Verify and continue',
    },
    err: {
      timedOut: 'Your sign-in session timed out. Please start again.',
      finishFail: 'Could not finish signing you in. Please try again.',
      enterName: 'Enter your full name.',
      saveProfile: 'Could not save your profile. Please try again.',
      enterDomain: 'Enter your company email domain.',
      ssoNotFound: 'We could not find single sign-on for that domain.',
      ssoAccount: 'This is a company single sign-on account. Use \'Sign in with company SSO\' below.',
      createFail: 'Could not create your account.',
      loginFail: 'Could not log in. Check your details.',
      validEmail: 'Enter a valid email address.',
      loginAgain: 'Your sign-in session timed out. Please log in again.',
    },
  },
}
