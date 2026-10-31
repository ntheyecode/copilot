// English strings for LINKNOTES, the individuals site (src/sites/individuals/),
// the public site an edition with the `individual_site` capability serves at
// the usual public paths (/, /workcopilot/how-it-works, /pricing, /use-cases,
// /faq, /security). Namespace `indiv`. Every other locale carries the same keys
// (locale-parity gate), and the edition copy gate scans this namespace in every
// language: no company, team, enterprise, organization, SSO, admin or seat
// wording anywhere here, in any locale.
//
// Voice (MyTaskPilot): energetic, direct, second person, short lines. One person
// becoming the best at their own work, on their own screen. Benefit first,
// honest claims (it guides and checks; it never clicks or types for you; it
// helps you do and finish work, it does not analyze documents for you), "many
// fields" never "any field", no em-dashes, no AI provider or model names.
// Plan names (Lite, Basic, Advanced, Premium), Stripe, Google, Microsoft,
// Facebook, Windows and Android are product names and stay as written. Plan
// numbers are never typed here: the pages read them from /api/work/pricing
// through src/pricingModel.js and reuse the shared `pricing.*` lines for them.
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
      start: 'Get started',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      language: 'Language',
    },
    footer: {
      aria: 'Site footer',
      tag: 'Step-by-step guidance for the work on your screen. You do it, you learn it, you keep the skill.',
      explore: 'Explore',
      legal: 'Legal',
      help: 'Help',
      support: 'Write to support',
      contact: 'Contact',
      cookiePrefs: 'Cookie preferences',
      made: 'Made for people who do the work themselves.',
      note: 'Payments are handled by Stripe. Your card details never reach our servers.',
    },
    common: {
      choosePlan: 'Choose a plan',
      seePlans: 'See the plans',
      signIn: 'Sign in',
      seeHow: 'See how it works',
      tryLive: 'Try it on your task',
      start: 'Start {plan}',
      perMonth: '/mo',
      new: 'New',
    },
    // ---- Home --------------------------------------------------------------
    home: {
      seo: {
        title: 'MyTaskPilot by LinkNotes: become the best at your work, step by step on your own screen',
        description: 'MyTaskPilot watches your screen and gives you the exact click, command or value for real tasks in the apps you already use. It catches wrong turns, checks each step and learns from your own documents. Plans by the hour, cancel any time.',
      },
      hero: {
        eyebrow: 'Your guide for real work',
        h1: 'Become the best at your work. <em>Faster.</em>',
        p: 'Tell MyTaskPilot what you need to get done. It watches your screen and gives you the exact click, command or value, step by step, in the apps you already use. You do the work. You keep the skill.',
        primary: 'Choose a plan',
        secondary: 'See how it works',
        trust: ['Works in the apps already on your screen', 'Masked on your device before anything is sent', 'Cancel any time'],
      },
      // The hero visual: a spreadsheet window, the MyTaskPilot card beside it and
      // one correction toast. The formula is a format sample, not language.
      visual: {
        aria: 'A spreadsheet with MyTaskPilot guiding one step at a time and catching a wrong turn',
        window: 'Budget 2026, sheet Q3',
        task: 'Build a monthly expense summary',
        stepLabel: 'Step 2 of 6',
        step: 'Click cell F2, then type the formula below and press Enter.',
        typeLabel: 'Type exactly',
        checked: 'Checked: the total matches column C',
        next: 'Next step',
        watching: 'Reading your screen',
        caught: 'Wrong sheet. Switch back to Q3 before you type.',
      },
      who: {
        eyebrow: 'Made for you',
        h2: 'Whatever you are becoming, <em>start today.</em>',
        cta: 'See a task for each',
        cards: [
          { t: 'Students and new grads', d: 'Set up the tools your course or first job expects, then get real work done in them.' },
          { t: 'Career switchers', d: 'Walk into a new field with a guide who knows its tools: cloud consoles, design apps, spreadsheets, code.' },
          { t: 'Freelancers and solo founders', d: 'Invoices, storefronts, bookings, client portals: set up right the first time, then move on.' },
          { t: 'Professionals leveling up', d: 'Take on the task above your current level with the exact moves at your side, and keep what you learn.' },
          { t: 'Creators', d: 'Editing tools, publishing platforms, analytics dashboards: the exact settings, checked as you go.' },
        ],
      },
      pillars: {
        eyebrow: 'Three ways it pays off',
        h2: 'Finish faster. Learn by doing. <em>Build your own edge.</em>',
        items: [
          { k: 'Productivity', t: 'Finish real tasks faster', d: 'No more hopping between tabs and help articles. The exact next move is on your screen, copy-ready, and each step is checked before you move on.', proof: 'The exact click, command or value' },
          { k: 'Training', t: 'Learn by doing, on your own work', d: 'Every guided task is a lesson in the tool you actually use. Pick the depth, from plain words to the exact flags, and change it mid-task.', proof: 'Your hands, your tools, your skill' },
          { k: 'Enablement', t: 'Your personal brain', d: 'Upload your own documents. MyTaskPilot learns from them, refreshes what changed and deletes the files. Your sessions teach it too, masked on your device. The guidance follows your way of working.', proof: 'Private to your account, always' },
        ],
      },
      how: {
        eyebrow: 'How a task goes',
        h2: 'Four moves, <em>repeated until it is done.</em>',
        steps: [
          { t: 'Say the goal', d: 'In your own words. A quick check makes sure the task fits what MyTaskPilot knows.' },
          { t: 'Get the exact move', d: 'The click, the command or the value, in the app you are in, copy-ready.' },
          { t: 'A wrong turn gets caught', d: 'It reads the screen, spots the slip as it happens and shows the fix.' },
          { t: 'Finish with a write-up', d: 'A clean record of what you did, ready to keep, repeat or share.' },
        ],
        honest: 'It guides and checks. It never clicks or types for you. Your hands stay on the wheel.',
      },
      brain: {
        eyebrow: 'New: your personal brain',
        h2: 'Teach it once. <em>It guides you your way.</em>',
        p: 'Drop in your notes, checklists, playbooks and past write-ups. MyTaskPilot learns from them, keeps what matters, refreshes what changed, then deletes the files.',
        steps: [
          { t: 'Upload', d: 'Your own documents, from a page in your dashboard.' },
          { t: 'Learn', d: 'It keeps the knowledge, de-duplicated and refreshed when you upload a newer version.' },
          { t: 'Delete', d: 'The files are gone. Nothing can be downloaded back, by anyone.' },
        ],
        learnedLabel: 'What it learned',
        learned: ['Invoices go out with 30-day payment terms', 'Deploy from the staging branch first, then main', 'Exports always as PDF, letter size'],
        sessions: 'Your desktop sessions teach it too, masked on your device, into your own profile. Only you benefit from what it learns.',
        cta: 'How your data is handled',
      },
      runs: {
        eyebrow: 'Where it runs',
        h2: 'On your desk, in your browser, <em>in your pocket.</em>',
        items: [
          { t: 'Windows desktop app', d: 'Floats over whatever you are working in and reads the screen you choose to share.' },
          { t: 'Android app', d: 'Point the camera at a screen, a device or a form and get guided on the spot.' },
          { t: 'Float on top, in the browser', d: 'Nothing to install. A floating window stays on top while you work in another tab.' },
        ],
      },
      privacy: {
        eyebrow: 'Private by design',
        h2: 'Your screen stays yours.',
        points: [
          { t: 'Masked on your device', d: 'Card numbers, keys and personal details are blacked out before anything leaves.' },
          { t: 'Read-only, always', d: 'It shows the move and checks the result. It never changes your accounts or files.' },
          { t: 'Files deleted after learning', d: 'Documents you upload are learned from, then deleted. They cannot be downloaded back.' },
        ],
        cta: 'How your data is handled',
      },
      plans: {
        eyebrow: 'Plans by the hour',
        h2: 'Pay for guided time, <em>by the minute you use.</em>',
        p: 'Every plan includes hours of live guidance each month, billed by the minute you use. Busy month? Add an hour whenever you need one.',
        cta: 'Compare the plans',
      },
      final: {
        h2: 'Your next task is <em>your first lesson.</em>',
        p: 'Pick a plan, sign in with Google, Microsoft, Facebook or your email, and start within minutes.',
        primary: 'Choose a plan',
        secondary: 'Sign in',
      },
    },
    // ---- How it works ---------------------------------------------------------
    how: {
      seo: {
        title: 'How MyTaskPilot works: the guide on your screen',
        description: 'MyTaskPilot plans your task, shows the exact next step in the app you are in, checks that it worked, corrects a wrong turn and keeps going until the job is done. It learns from your own documents and sessions, privately. Here is how.',
      },
      hero: {
        eyebrow: 'How it works',
        h1: 'Like having the best person in your field <em>beside you.</em>',
        p: 'You bring the goal and your screen. MyTaskPilot brings the plan, the exact moves and the checks, and it learns how you like things done.',
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
      gridH2: 'What you get on every task',
      cards: [
        { t: 'The exact how, every time', d: 'The precise click, command or value, copy-ready, the proven way.' },
        { t: 'Starts from zero', d: 'Opens the right page, gets you signed in and takes you to the exact spot.' },
        { t: 'Catches and corrects mistakes', d: 'Spots a wrong turn the moment it happens and shows the fix, even when a button has moved.' },
        { t: 'The apps already on your screen', d: 'Spreadsheets, design tools, cloud consoles, code, control panels, forms: it reads whatever is on screen.' },
        { t: 'Your personal brain', d: 'Upload your own documents and the steps follow your notes. Files are learned from, then deleted.' },
        { t: 'A write-up you keep', d: 'Finish with a clean, picture-rich record of what you did, ready to keep or repeat.' },
        { t: 'Pick the depth', d: 'From plain words to the exact flags. Change it any time, mid-task.' },
        { t: 'Desktop, Android and browser', d: 'The Windows app, the Android app, or a floating window in your browser with nothing to install.' },
      ],
      depth: {
        h2: 'As simple or as technical as you like',
        p: 'Pick the depth of each step, from plain language to the exact flags. Change it any time, mid-task.',
        levels: ['Plain', 'Guided', 'Technical'],
      },
      honest: {
        h2: 'What it is, and what it is not',
        is: ['A guide that watches your screen and shows the next move', 'A checker that confirms each step worked', 'A coach that learns your way of working, privately'],
        not: ['Not a chat box you then have to act on yourself', 'Not an automation that clicks or types for you', 'Not a document analyzer: it helps you do and finish work'],
      },
      cta: { h2: 'Try it on your next task.', p: 'Plans start small and grow with your month. Cancel any time.' },
    },
    // ---- Pricing --------------------------------------------------------------
    pricing: {
      seo: {
        title: 'MyTaskPilot plans: Lite, Basic, Advanced and Premium',
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
      hoursSub: 'of guided time a month',
      secure: 'Secure checkout with Stripe',
      includedH2: 'Included on every plan',
      included: [
        'Step by step, start to finish, checked as you go',
        'The exact commands, clicks and values, copy-ready',
        'Works in the apps already on your screen',
        'Sensitive details masked on your device',
        'A write-up of every task, with pictures',
      ],
      tiersH2: 'What grows with your plan',
      tiers: [
        { t: 'Hours of guided time', d: 'From a few tasks a month to a guide at your side most working days.' },
        { t: 'Your personal brain', d: 'Every plan learns from your own documents, so the steps follow your way of working. Advanced and Premium learn from many more.' },
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
        title: 'Who MyTaskPilot is for: students, career switchers, freelancers, professionals and creators',
        description: 'MyTaskPilot guides people who do their own work on their own screen: students and new grads, career switchers, freelancers and solo founders, professionals leveling up, and creators. See a real guided task for each.',
      },
      hero: {
        eyebrow: 'Who it is for',
        h1: 'For the work <em>you do yourself.</em>',
        p: 'Pick the day that looks like yours. Each one shows a real task, the kind of step you get, and the moment the guide catches a slip.',
        chipsAria: 'Jump to a group',
      },
      labels: { goal: 'The goal', step: 'One step you get', catches: 'What it catches', done: 'Done when' },
      cases: [
        {
          tag: 'Students and new grads', h2: 'Set up the tools, then do the work.',
          d: 'The software your course or first job expects, installed and configured, and the assignment worked through one checked step at a time.',
          goal: 'Install the data tools my course needs and run the first notebook',
          step: 'Create a new environment named course, then install the three packages listed in your syllabus.',
          catches: 'A notebook running in the wrong environment, so the import fails.',
          done: 'the first notebook runs end to end with no errors.',
        },
        {
          tag: 'Career switchers', h2: 'Walk into a new field with someone who knows the tools.',
          d: 'Cloud consoles, spreadsheets, design apps or code: the exact moves, explained at the depth you choose, in many fields.',
          goal: 'Deploy my first web app to a cloud host',
          step: 'Create the app, pick the smallest plan, then paste the build command from your project here.',
          catches: 'A secret key committed to the repository before the first push.',
          done: 'the app opens at its public address and the key is stored as a secret.',
        },
        {
          tag: 'Freelancers and solo founders', h2: 'Run the shop, the books and the bookings yourself.',
          d: 'Client portals, invoicing, storefronts, booking pages: every setup guided to the finish on your own screen, right the first time.',
          goal: 'Set up a booking page that takes deposits',
          step: 'Turn on Require a deposit, set it to 20 percent, and pick your cancellation window.',
          catches: 'A time zone left on the default, so slots show at the wrong hours.',
          done: 'a test booking takes a deposit and lands in your calendar.',
        },
        {
          tag: 'Professionals leveling up', h2: 'Take the task above your level, and keep the skill.',
          d: 'The report, the migration, the dashboard nobody showed you how to build: done on your own screen, with the exact moves at your side.',
          goal: 'Build a monthly expense summary with a pivot table',
          step: 'Select the whole table, then Insert, then Pivot table. Put Category in Rows and Amount in Values.',
          catches: 'A column of amounts stored as text, so every total reads zero.',
          done: 'the summary matches the raw totals and refreshes when the data changes.',
        },
        {
          tag: 'Creators', h2: 'Publish with the right settings, every time.',
          d: 'Editing tools, publishing platforms, analytics: the exact export, the exact setting, checked before you hit Publish.',
          goal: 'Export my video for the platform and schedule the post',
          step: 'Open Export, pick the platform preset, then set the frame rate to match your project.',
          catches: 'A caption file left in the wrong format, so the subtitles never show.',
          done: 'the upload passes the checks and the post is scheduled.',
        },
      ],
      cta: { h2: 'Your day looks like one of these.', p: 'Choose a plan and bring your first task. You are guided within minutes.' },
    },
    // ---- FAQ --------------------------------------------------------------------
    faq: {
      seo: {
        title: 'MyTaskPilot questions, answered',
        description: 'What MyTaskPilot does and does not do, how plans and hours work, how your personal brain learns and deletes your files, how to cancel, and how your screen and data are protected.',
      },
      hero: { eyebrow: 'Questions', h1: 'Short answers to <em>the questions people ask.</em>', p: 'Still unsure? Write to us and a person answers.' },
      searchPh: 'Search the questions',
      noMatch: 'No question matches that. Try another word, or write to us.',
      groups: [
        {
          title: 'What it does',
          items: [
            { q: 'What does MyTaskPilot actually do?', a: 'It guides you through a task on your own screen: it plans the task, shows the exact next step in the app you are in, checks that the step worked, and keeps going until the task is done.' },
            { q: 'Does it do the work for me?', a: 'No. It shows the move and checks the result; you make every click. That is on purpose, so you stay in control and learn the tool as you go.' },
            { q: 'Which apps does it work with?', a: 'The apps already on your screen: spreadsheets, design tools, cloud consoles, code, control panels, forms. It reads what is on screen, so nothing needs a plug-in.' },
            { q: 'Is it a chat assistant?', a: 'Not really. A chat answer leaves you to go and do it. MyTaskPilot stays with you on the screen, one step at a time, and confirms the finish.' },
            { q: 'Does it analyze or write my documents?', a: 'No. It helps you do and finish work on screen. What it can do is learn from your own documents, so the steps follow your way of working.' },
          ],
        },
        {
          title: 'Your personal brain',
          items: [
            { q: 'What is the personal brain?', a: 'A page in your dashboard where you upload your own documents: notes, checklists, playbooks, past write-ups. MyTaskPilot learns from them, and the guidance uses what it learned.' },
            { q: 'What happens to the files I upload?', a: 'They are learned from, de-duplicated against what it already knows, and then deleted. They cannot be downloaded back, by you or by anyone else.' },
            { q: 'Can I see what it learned?', a: 'Yes. Your dashboard shows what it learned, and uploading a newer version of a document refreshes it.' },
            { q: 'Does it learn from my sessions too?', a: 'On the desktop app, yes: masked on your device, into your own profile. Only you benefit from what it learns.' },
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
            { q: 'Do I need to install anything?', a: 'No. The floating window works in your browser. There is also the Windows desktop app and the Android app if you prefer.' },
            { q: 'Can I try it first?', a: 'Yes. Describe a real task on the home page and watch it get planned live, step by step, before you pick a plan.' },
          ],
        },
      ],
      cta: { h2: 'Did not find your answer?', p: 'Write to us. A person reads every message.', write: 'Write to support' },
    },
    // ---- Security and privacy -------------------------------------------------------
    security: {
      seo: {
        title: 'Privacy and security for your screen: MyTaskPilot',
        description: 'How MyTaskPilot protects you: sensitive values masked on your device before anything is sent, read-only guidance, uploaded documents deleted after learning and never downloadable, an authenticator on your account, a log of every session, encryption at rest, and sessions you can delete any time.',
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
        { t: 'Files deleted after learning', d: 'Documents you upload to your personal brain are learned from, then deleted. They cannot be downloaded back.' },
        { t: 'Authenticator on your account', d: 'Password, Google, Microsoft or Facebook sign-in all pass the same second factor.' },
        { t: 'A log of every session', d: 'What was sent, what was read from your screen, what was checked and flagged. Yours to read.' },
        { t: 'Encrypted at rest', d: 'Stored keys, secrets and report screenshots are encrypted with AES-256-GCM.' },
      ],
      handling: {
        h2: 'How your data is handled',
        sub: 'What the product does today. Plain words, no small print.',
        groups: [
          { title: 'What leaves your device', items: ['Reduced-size screen frames, sensitive lines already blacked out', 'Your text, sensitive values already replaced by tokens', 'Text from documents you upload to your personal brain, for learning'] },
          { title: 'What we keep', items: ['One write-up per session, with masked milestone pictures (you can turn it off)', 'One log per session, recording what was sent', 'What your personal brain learned, private to your account'] },
          { title: 'What is never kept', items: ['Your uploaded documents: learned from, then deleted', 'Raw screen frames', 'The real sensitive values: the guide never sees them'] },
        ],
      },
      brain: {
        h2: 'Your personal brain, on your terms',
        points: [
          { t: 'Learned, then deleted', d: 'A document is read once for learning and deleted right after. There is no file to download, for you or for anyone.' },
          { t: 'Visible to you', d: 'Your dashboard shows what it learned. Upload a newer version and the old knowledge is refreshed.' },
          { t: 'Masked sessions', d: 'The desktop app learns from your sessions with sensitive values already masked on your device.' },
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
        p: 'Write to us. Give us time to confirm and fix it before you publish; good-faith research is welcome.',
        write: 'Write to us',
        legal: 'Privacy policy',
        terms: 'Terms',
      },
    },
  },
}
