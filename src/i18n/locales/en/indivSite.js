// English strings for the INDIVIDUALS marketing site (src/sites/individuals/),
// the public site an edition with the `individual_site` capability serves at
// the usual public paths (/, /workcopilot/how-it-works, /pricing, /use-cases,
// /faq, /security). Namespace `indiv`. Every other locale carries the same keys
// (locale-parity gate), and the edition copy gate scans this namespace in every
// language: no company, team, enterprise, organization, SSO, admin or seat
// wording anywhere here, in any locale.
//
// Voice: one person doing their own work on their own screen. Benefit first,
// short lines, honest claims (the product guides and checks; it never acts for
// you and it does not analyze documents), "many fields" never "any field",
// no em-dashes, no AI provider or model names, no AI cost.
// Plan names (Lite, Basic, Advanced, Premium), Stripe, Google, Microsoft and
// Facebook are product names and stay as written. Plan numbers are never typed
// here: the pages read them from /api/work/pricing through src/pricingModel.js
// and reuse the shared `pricing.*` lines for them.
export default {
  indiv: {
    nav: {
      main: 'Main',
      home: 'Home',
      how: 'How it works',
      pricing: 'Pricing',
      use: 'Who it is for',
      faq: 'FAQ',
      security: 'Privacy',
      signIn: 'Sign in',
      start: 'Choose a plan',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      language: 'Language',
    },
    footer: {
      aria: 'Site footer',
      tag: 'A guide beside you for the work you do on your own screen. Step by step, until it is done.',
      explore: 'Explore',
      account: 'Your account',
      legal: 'Legal',
      help: 'Help',
      support: 'Write to support',
      demo: 'Watch the demo',
      fields: 'Fields it knows',
      contact: 'Contact',
      accessibility: 'Accessibility',
      cookiePrefs: 'Cookie preferences',
      made: 'WorkCoPilot is made by AdmireVeda.',
      note: 'Payments are handled by Stripe. Your card details never reach our servers.',
    },
    common: {
      choosePlan: 'Choose a plan',
      seePlans: 'See the plans',
      signIn: 'Sign in',
      seeHow: 'See how it works',
      demo: 'Watch a 60-second demo',
      start: 'Start {plan}',
      perMonth: '/mo',
      readMore: 'Read more',
      new: 'New',
    },
    // ---- Home --------------------------------------------------------------
    home: {
      seo: {
        title: 'WorkCoPilot: a step-by-step guide for the work on your screen',
        description: 'Tell WorkCoPilot what you need to get done. It watches your screen, shows the exact next click or command, catches a wrong turn and confirms the finish. Plans by the hour, cancel any time.',
      },
      hero: {
        eyebrow: 'For people who do the work themselves',
        h1: 'Finish the task on your screen. <em>With a guide right beside you.</em>',
        p: 'Say what you need to get done. WorkCoPilot watches your screen, shows the exact next click or command, catches a wrong turn and confirms the finish.',
        primary: 'Choose a plan',
        secondary: 'See how it works',
        trust: ['Works in the apps already on your screen', 'Sensitive details masked on your device', 'Cancel any time, no contract'],
      },
      // The hero visual: a person's screen with the guide card beside it.
      visual: {
        aria: 'A screen with WorkCoPilot guiding one step at a time',
        window: 'Your accounting app',
        task: 'Send my first invoice with my own logo',
        stepLabel: 'Step 3 of 7',
        step: 'Open Settings, then Invoice templates. Pick the template that shows your logo.',
        checked: 'Checked: the template is saved',
        next: 'Next step',
        watching: 'Watching your screen',
      },
      who: {
        eyebrow: 'Made for your kind of day',
        h2: 'One guide for whatever you do on your own.',
        cta: 'See who it is for',
        cards: [
          { t: 'Freelancers', d: 'Invoices, client portals, new tools: done right the first time, without a day lost in help articles.' },
          { t: 'Students', d: 'Set up the software your course needs and work through the assignment, one checked step at a time.' },
          { t: 'Job seekers', d: 'Portfolios, applications, new tools from a job post: learn them while you use them.' },
          { t: 'Solo businesses', d: 'Your shop, your books, your bookings: every setup guided to the finish on your screen.' },
          { t: 'Career switchers', d: 'Walk into the tools of a new field with someone beside you who knows them.' },
        ],
      },
      how: {
        eyebrow: 'How a guided task goes',
        h2: 'Four moves, repeated until it is done.',
        steps: [
          { t: 'Say the goal', d: 'In your own words. A 30-second check makes sure the task fits what you know.' },
          { t: 'Get the exact next move', d: 'The click, the command or the setting, in the app you are in, copy-ready.' },
          { t: 'A wrong turn gets caught', d: 'It watches the screen, spots the slip the moment it happens and shows the fix.' },
          { t: 'Finish with a record', d: 'A clean write-up of what you did, with pictures, ready to keep or repeat.' },
        ],
        honest: 'It guides and checks. It never clicks for you, and your hands stay on the wheel.',
      },
      hours: {
        eyebrow: 'Plans by the hour',
        h2: 'Pay for guided time, <em>by the minute you use.</em>',
        p: 'Every plan includes hours of live guidance each month, billed by the minute you use. Busy month? Add an hour whenever you need one.',
        cta: 'Compare the plans',
        live: 'Live prices',
      },
      privacy: {
        eyebrow: 'Private by design',
        h2: 'Your screen stays yours.',
        points: [
          { t: 'Masked before it leaves', d: 'Card numbers, keys and personal details are blacked out on your device before anything is sent.' },
          { t: 'Read-only', d: 'It shows the move and checks the result. It never changes your accounts or files.' },
          { t: 'Yours to delete', d: 'Every session is yours. Delete any of them at any time.' },
        ],
        cta: 'How your data is handled',
      },
      final: {
        h2: 'Start your next task with a guide beside you.',
        p: 'Pick a plan, sign in with Google, Microsoft, Facebook or your email, and start within minutes.',
        primary: 'Choose a plan',
        secondary: 'Sign in',
      },
    },
    // ---- How it works ---------------------------------------------------------
    how: {
      seo: {
        title: 'How WorkCoPilot works: the guide on your screen',
        description: 'WorkCoPilot plans your task, shows the exact next step in the app you are in, checks that it worked, corrects a wrong turn and keeps going until the job is done. Here is how.',
      },
      hero: {
        eyebrow: 'How it works',
        h1: 'Like having the right person <em>beside you, every time.</em>',
        p: 'You bring the goal and your screen. WorkCoPilot brings the plan, the exact moves and the checks.',
      },
      loop: {
        h2: 'The loop behind every task',
        aria: 'How every task runs: plan, ask, guide, watch, correct, repeating until the task is done',
        rows: [
          { k: 'Plan', v: 'the whole task is planned before the first step' },
          { k: 'Ask', v: 'a quick question when it needs more from you' },
          { k: 'Guide', v: 'the exact next step, on your screen' },
          { k: 'Watch', v: 'checks that each step really worked' },
          { k: 'Correct', v: 'fixes a wrong turn the moment it happens' },
        ],
        again: 'repeats until the task is done',
      },
      gridH2: 'What it does for you',
      cards: [
        { t: 'The exact how, every time', d: 'The precise click, command or setting, copy-ready, the proven way.' },
        { t: 'Starts from zero', d: 'Opens the right page, gets you signed in and takes you to the exact spot.' },
        { t: 'Catches and corrects mistakes', d: 'Spots a wrong turn the moment it happens and shows the fix, even when a button has moved.' },
        { t: 'Any app on your screen', d: 'Web apps, desktop apps and your own tools: it reads whatever is on screen.' },
        { t: 'Grounded in your own notes', d: 'On Advanced and Premium, upload your reference documents and the steps follow them.' },
        { t: 'A record you keep', d: 'Finish with a clean, picture-rich write-up of what you did, ready to keep or repeat.' },
        { t: 'Teach it your way', d: 'Paste a checklist or playbook and the guidance follows your tools and your terms.' },
        { t: 'Desktop, web and phone', d: 'A desktop overlay, the browser with nothing to install, or your phone camera.' },
      ],
      depth: {
        h2: 'As simple or as technical as you like',
        p: 'Pick the depth of each step, from plain language to the exact flags. Change it any time, mid-task.',
        levels: ['Plain', 'Guided', 'Technical'],
      },
      honest: {
        h2: 'What it is, and what it is not',
        is: ['A guide that watches your screen and shows the next move', 'A checker that confirms each step worked', 'A record of what you did, with pictures'],
        not: ['Not a chat box you then have to act on yourself', 'Not an automation that clicks for you', 'Not a document analyzer: it helps you do and finish work'],
      },
      cta: { h2: 'Try it on your next task.', p: 'Plans start small and grow with your month. Cancel any time.' },
    },
    // ---- Pricing --------------------------------------------------------------
    pricing: {
      seo: {
        title: 'WorkCoPilot plans: Lite, Basic, Advanced and Premium',
        description: 'Four plans with hours of live guidance every month, billed by the minute you use. Monthly or annual. Extra hours any time, cancel whenever you like.',
      },
      hero: {
        eyebrow: 'Pricing',
        h1: 'Simple plans. <em>Real guided time.</em>',
        p: 'Pick the plan by the hours of guidance your month needs. Privacy and masking come with every plan, never as an upsell.',
      },
      toggle: { aria: 'Billing cycle', monthly: 'Monthly', annual: 'Annual', save: 'save 20%' },
      popular: 'Most chosen',
      recommended: 'Recommended for you',
      hoursHero: '{hours} hours',
      hoursSub: 'of guided time a month',
      perMonthLong: 'a month',
      secure: 'Secure checkout with Stripe',
      includedH2: 'Included on every plan',
      included: [
        'Step by step, start to finish, checked as you go',
        'The exact commands, clicks and links, copy-ready',
        'Works in the apps already on your screen',
        'Sensitive details masked on your device',
        'A written record of every task, with pictures',
      ],
      tiersH2: 'What grows with your plan',
      tiers: [
        { t: 'Hours of guided time', d: 'From a few tasks a month to a guide at your side most working days.' },
        { t: 'Your own documents', d: 'Advanced and Premium read your reference notes so the steps follow your way of working.' },
        { t: 'Generated visuals and projects', d: 'Premium adds diagrams and examples, and turns a large goal into a map of guided tasks.' },
      ],
      notesH2: 'Good to know',
      notes: [
        { t: 'By the minute', d: 'Spend your hours a few minutes at a time across the month. Never rounded up to the hour.' },
        { t: 'Extra time', d: 'Busy month? Add an hour whenever you need one. Purchased time never expires.' },
        { t: 'Cancel any time', d: 'Monthly or annual, no contract. Cancel in your account; you keep access to the end of what you paid for.' },
        { t: 'Switch plans', d: 'Move up any time with a prorated charge. Move down at your next renewal.' },
      ],
      fine: 'Final prices and entitlements are confirmed at checkout. Taxes may apply by location.',
      refund: 'Refund policy',
      cta: { h2: 'Pick a plan and start today.', p: 'Sign in with Google, Microsoft, Facebook or your email. You are guided within minutes.' },
    },
    // ---- Who it is for (use cases) ----------------------------------------------
    use: {
      seo: {
        title: 'Who WorkCoPilot is for: freelancers, students, job seekers and more',
        description: 'WorkCoPilot guides people who do their own work on their own screen: freelancers, students, job seekers, solo businesses and career switchers. See what a guided task looks like for each.',
      },
      hero: {
        eyebrow: 'Who it is for',
        h1: 'For the work you do <em>on your own.</em>',
        p: 'Pick the day that looks like yours. Each one shows a real task, the kind of step you get, and the moment the guide catches a slip.',
        chipsAria: 'Jump to a group',
      },
      labels: { goal: 'The goal', step: 'One step you get', catches: 'What it catches', done: 'Done when' },
      cases: [
        {
          tag: 'Freelancers', h2: 'Deliver like a studio of one.',
          d: 'Client portals, invoicing, contracts, new design and project tools: set up and used right, without a day lost in help articles.',
          goal: 'Send my first invoice with my logo and online payment',
          step: 'Open Settings, then Payments, and connect your account. The green badge confirms it is live.',
          catches: 'A tax rate left at zero before you hit Send.',
          done: 'the invoice is sent and the payment link opens.',
        },
        {
          tag: 'Students', h2: 'Set up the tools, then do the work.',
          d: 'The software your course expects, installed and configured, and the assignment worked through one checked step at a time.',
          goal: 'Install the data tools my course needs and run the first notebook',
          step: 'Create a new environment named course, then install the three packages listed in your syllabus.',
          catches: 'A notebook running in the wrong environment, so the import fails.',
          done: 'the first notebook runs end to end with no errors.',
        },
        {
          tag: 'Job seekers', h2: 'Learn the tools from the job post while you use them.',
          d: 'Portfolio sites, application trackers, the tools a job post expects: learn them hands-on, with a guide who knows them.',
          goal: 'Publish my portfolio site on my own domain',
          step: 'In your domain settings, add the two DNS records shown here, exactly as written.',
          catches: 'A record pasted with a trailing dot missing, so the site never resolves.',
          done: 'your domain opens the site over a secure connection.',
        },
        {
          tag: 'Solo businesses', h2: 'Run the shop, the books and the bookings yourself.',
          d: 'Online store, accounting, booking pages, email lists: every setup guided to the finish on your own screen.',
          goal: 'Set up a booking page that takes deposits',
          step: 'Turn on Require a deposit, set it to 20 percent, and pick your cancellation window.',
          catches: 'A time zone left on the default, so slots show at the wrong hours.',
          done: 'a test booking takes a deposit and lands in your calendar.',
        },
        {
          tag: 'Career switchers', h2: 'Walk into a new field with someone who knows the tools.',
          d: 'Cloud consoles, spreadsheets, design apps or code: the exact moves, explained at the depth you choose, in many fields.',
          goal: 'Deploy my first web app to a cloud host',
          step: 'Create the app, pick the smallest plan, then paste the build command from your project here.',
          catches: 'A secret key committed to the repository before the first push.',
          done: 'the app opens at its public address and the key is stored as a secret.',
        },
      ],
      cta: { h2: 'Your day looks like one of these.', p: 'Choose a plan and bring your first task. You are guided within minutes.' },
    },
    // ---- FAQ --------------------------------------------------------------------
    faq: {
      seo: {
        title: 'WorkCoPilot questions, answered',
        description: 'What WorkCoPilot does and does not do, how plans and hours work, how to cancel, and how your screen and data are protected. Short, direct answers.',
      },
      hero: { eyebrow: 'Questions', h1: 'Short answers to <em>the questions people ask.</em>', p: 'Still unsure? Write to us and a person answers.' },
      searchPh: 'Search the questions',
      noMatch: 'No question matches that. Try another word, or write to us.',
      groups: [
        {
          title: 'What it does',
          items: [
            { q: 'What does WorkCoPilot actually do?', a: 'It guides you through a task on your own screen: it plans the task, shows the exact next step in the app you are in, checks that the step worked, and keeps going until the task is done.' },
            { q: 'Does it do the work for me?', a: 'No. It shows the move and checks the result; you make every click. That is on purpose, so you stay in control and learn the tool as you go.' },
            { q: 'Which apps does it work with?', a: 'Any app on your screen: web apps, desktop apps and your own tools. It reads what is on screen, so nothing needs a plug-in.' },
            { q: 'Is it a chat assistant?', a: 'Not really. A chat answer leaves you to go and do it. WorkCoPilot stays with you on the screen, one step at a time, and confirms the finish.' },
            { q: 'Does it analyze or write my documents?', a: 'No. It helps you do and finish work on screen. On Advanced and Premium you can upload your own reference notes so the steps follow your way of working.' },
          ],
        },
        {
          title: 'Plans and billing',
          items: [
            { q: 'How do the hours work?', a: 'Every plan includes hours of guided time each month, billed by the minute you use. Nothing is rounded up to the hour. The pricing page shows the current numbers.' },
            { q: 'Can I buy more time?', a: 'Yes. Add an hour whenever you need one from your account. Purchased time never expires.' },
            { q: 'Can I switch plans?', a: 'Any time. Moving up applies right away with a prorated charge. Moving down takes effect at your next renewal, so you keep what you paid for.' },
            { q: 'How do I cancel?', a: 'From your account, in two clicks. You keep access until the end of the period you paid for, and you can resume before then with one click.' },
            { q: 'What happens if a payment fails?', a: 'You get an email and a notice in your account with a button to update your card. Your plan stays yours while you fix it.' },
            { q: 'Is annual billing available?', a: 'Where it is, the pricing page shows the annual price at a discount. You can switch between monthly and annual from your account.' },
          ],
        },
        {
          title: 'Privacy and safety',
          items: [
            { q: 'What leaves my device?', a: 'Reduced-size screen frames with sensitive lines already blacked out, and your text with sensitive values replaced by tokens. The real values stay on your device.' },
            { q: 'Can it change my accounts or files?', a: 'No. It is read-only. It shows the step and checks the result; it never acts in your apps.' },
            { q: 'Can I delete what it keeps?', a: 'Yes. Every session is yours. Delete any of them at any time from your account.' },
            { q: 'Is my card stored by you?', a: 'No. Checkout and card details are handled by Stripe. We never see or store your card number.' },
          ],
        },
        {
          title: 'Getting started',
          items: [
            { q: 'How do I start?', a: 'Pick a plan, sign in with Google, Microsoft, Facebook or your email, and bring your first task. You are guided within minutes.' },
            { q: 'Do I need to install anything?', a: 'No. It works in the browser. There is also a desktop overlay and a phone app if you prefer.' },
            { q: 'Can I try it first?', a: 'Watch the 60-second demo to see a guided task from start to finish. Plans start small, and you can cancel any time.' },
          ],
        },
      ],
      cta: { h2: 'Did not find your answer?', p: 'Write to us. A person reads every message.', write: 'Write to support' },
    },
    // ---- Security and privacy -------------------------------------------------------
    security: {
      seo: {
        title: 'Privacy and security for your screen: WorkCoPilot',
        description: 'How WorkCoPilot protects you: sensitive values masked on your device before anything is sent, read-only guidance, an authenticator on your account, a log of every session, encryption at rest, and sessions you can delete any time.',
      },
      hero: {
        eyebrow: 'Private by design',
        h1: 'Your secrets <em>never leave your device.</em>',
        p: 'Sensitive details are masked on your own device before anything is sent. The guide sees the shape of your task, never the secrets.',
      },
      visual: {
        aria: 'A form before and after masking: card number, key and phone are blacked out',
        before: 'What is on your screen',
        after: 'What leaves your device',
        fields: ['Card on file', 'API key', 'Phone', 'Plan'],
        masked: 'masked',
      },
      guaranteesAria: 'What is protected',
      guarantees: [
        { t: 'Masked on your device', d: 'Card numbers, keys and personal details are blacked out in screenshots and replaced by tokens in text before anything is sent.' },
        { t: 'Read-only, always', d: 'It shows the move and checks the result. It never changes your accounts, files or settings.' },
        { t: 'Code checked before you run it', d: 'Any command or code it suggests is checked for known problems first.' },
        { t: 'Authenticator on your account', d: 'Password, Google, Microsoft or Facebook sign-in all pass the same second factor.' },
        { t: 'A log of every session', d: 'What was sent, what was read from your screen, what was checked and flagged. Yours to read.' },
        { t: 'Encrypted at rest', d: 'Stored keys, secrets and report screenshots are encrypted with AES-256-GCM.' },
      ],
      handling: {
        h2: 'How your data is handled',
        sub: 'What the product does today. Plain words, no small print.',
        groups: [
          { title: 'What leaves your device', items: ['Reduced-size screen frames, sensitive lines already blacked out', 'Your text, sensitive values already replaced by tokens', 'Text from reference notes you chose to attach, never the file'] },
          { title: 'What we keep', items: ['One report per session, with masked milestone pictures (you can turn it off)', 'One log per session, recording what was sent', 'Your session history, so you can reopen and review'] },
          { title: 'What is never kept', items: ['Your original documents', 'Raw screen frames', 'The real sensitive values: the guide never sees them'] },
        ],
      },
      control: {
        h2: 'You stay in control',
        points: [
          { t: 'Delete any time', d: 'Every session is yours. Delete one, or all of them, whenever you like.' },
          { t: 'Add your own rules', d: 'Add your own words and patterns to mask, on top of the built-in detectors.' },
          { t: 'Payments by Stripe', d: 'Card details are handled on Stripe. We never see or store your card number.' },
        ],
      },
      contact: {
        h2: 'Found a security issue?',
        p: 'Write to support@admireveda.com. Give us time to confirm and fix it before you publish; good-faith research is welcome.',
        write: 'Write to us',
        legal: 'Privacy policy',
        terms: 'Terms',
      },
    },
  },
}
