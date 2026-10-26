// English (UK) - the US catalog with British spelling and phrasing where it
// differs (organisation, licence, centre, programme, enrol, -ise). Everything
// else is inherited from en.js at runtime via the fallback, so this file only
// lists the keys that actually change. Never translated: code, commands,
// URLs/paths, brand names, plan names.
import en from './en.js'

const deepMerge = (base, patch) => {
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const k of Object.keys(patch)) {
    const b = base ? base[k] : undefined, p = patch[k]
    out[k] = (p && typeof p === 'object' && !Array.isArray(p) && b && typeof b === 'object' && !Array.isArray(b)) ? deepMerge(b, p) : p
  }
  return out
}

export default deepMerge(en, {
  lang: { choose: 'Choose your language' },
  languagePin: {
    title: 'Choose your language',
    intro: 'This sets your language for the WorkCoPilot app and for the emails we send you.',
    note: 'Pick the language you are most comfortable working in. You can change it later from the language menu.',
    confirm: 'Save language',
    saving: 'Saving...',
    error: 'Could not save your language. Please try again.',
  },
  footer: {
    tag: 'Your expert, on every screen. Read-only guidance that watches your screen and tells you the exact next move, in any app, with your data protected on your device.',
    aup: 'Acceptable Use',
    refund: 'Refund & Cancellation',
  },
  home: {
    // hero: inherited from en.js (the five lines carry no US-only spelling).
    // Never index en.home.hero by position here: the list is trimmed on purpose.
    hero: en.home.hero.map((p) => (p.s.includes('tokenized') ? { ...p, s: p.s.replace('tokenized', 'tokenised') } : p)),
    anyapp: { cap: 'Works in any app you already use: web, desktop, on-prem, or your own in-house tools.' },
    marquee: [
      'AWS', 'Invoices', 'Kubernetes', 'Payroll', 'RAG pipelines', 'Tax returns', 'Firewalls', 'Pitch decks',
      'Terraform', 'Grant applications', 'CI/CD', 'Budgets', 'Stripe', 'Procurement', 'Ansible', 'Onboarding',
      'Postgres', 'Insurance claims', 'n8n', 'Contracts', 'Grafana', 'CVs', 'Docker', 'Expense claims',
      'SIEM', 'Fundraising', 'Salesforce', 'Email campaigns', 'Shopify', 'Board packs', 'Python & APIs', 'Stock control',
      'SSO / OAuth', 'Compliance', 'Nginx', 'Market research',
    ],
    roi: {
      rows: [
        en.home.roi.rows[0], en.home.roi.rows[1], en.home.roi.rows[2],
        { t: 'Onboarding', before: 'Months of shadowing before a new starter is trusted on real work.', now: 'Productive from their <em>first task</em>, in your apps, your way.' },
        en.home.roi.rows[4], en.home.roi.rows[5],
      ],
    },
    fields: {
      cards: [
        en.home.fields.cards[0], en.home.fields.cards[1], en.home.fields.cards[2],
        { k: 'Product & Innovation', d: 'Prototype, build and ship a brand-new idea.' },
        en.home.fields.cards[4],
        { k: 'Accounting & Office', d: 'Reconciliations, reports, spreadsheets, filings.' },
        en.home.fields.cards[6], en.home.fields.cards[7],
      ],
    },
    trust: {
      priv: { points: [
        'PII, PHI and secrets are masked or tokenised on your machine. The real values never leave, and the answer is rebuilt locally.',
        'You decide what gets scrubbed. On your own AI key, calls stay on that key. Nothing is rerouted.',
      ] },
    },
    pricing: {
      sub: 'Guided tasks and live guidance hours every month, with the AI included. Pause any time and pick up where you left off.',
      footnote: '*Each day you get your plan\'s guided tasks and hours of guidance. Daily hours reset at midnight (US Eastern) - they don\'t roll over. Unused tasks bank as credits you keep, or trade 2 tasks for 1 extra hour (expires that day). Billed per minute you actually use.',
      trustCancel: 'Cancel any time, no contract',
      feats: {
        // Daily-task line comes from the live pricing config (en.js tasksLine), not from here.
        lite: ['Step-by-step on any task', 'Exact commands, code & links', 'Data privacy & security built in'],
        basic: ['Step-by-step on any task', 'Exact commands, code & links', 'Roadmaps included', 'Floating guide + session write-up'],
        advanced: ['Everything in Basic', 'Upload your own documents', 'Visual examples where they help', 'Priority guidance'],
        premium: ['Everything in Advanced', 'Generated visuals on demand', 'Highest-fidelity guidance', 'First in line, always'],
      },
    },
    demo: {
      scenarios: [
        {
          ...en.home.demo.scenarios[0],
          steps: [
            { sees: 'The screen shows a customer email, a card number and a live API key', say: 'Those are PII, a card and a secret - they must never reach an AI', do: 'They are blacked out in the screenshot and swapped for placeholders in text, on your device, before anything is sent', click: 'Protect on-device', done: 'only [EMAIL], [CARD] and [API_KEY] leave your device' },
            { sees: 'You paste an error that still contains sk-live-... and an internal IP', say: 'A pasted log carries the secret and your private host', do: 'They are tokenised too, and the real values stay on your machine', click: 'Tokenise', done: 'the AI sees [[SECRET_1]] and [[IP_2]], never the real values' },
            en.home.demo.scenarios[0].steps[2],
          ],
        },
        en.home.demo.scenarios[1], en.home.demo.scenarios[2], en.home.demo.scenarios[3], en.home.demo.scenarios[4], en.home.demo.scenarios[5],
      ],
    },
  },
  login: {
    stage: {
      s3: 'Set payment terms to <b>Net 30</b>, then enter the VAT number',
      s4: 'Attach the signed supplier form',
    },
    pitchP: 'WorkCoPilot watches your screen, tells you the exact next move, and catches a wrong turn before it costs you. For companies, it learns your own apps and playbooks, privately.',
    sso: {
      detectedTitle: 'Your organisation uses single sign-on',
      checking: 'Checking your organisation\'s sign-in…',
    },
    form: {
      phonePh: '+44 7700 000000',
      improve: 'To improve WorkCoPilot, skills and content you add may be used in de-identified form to enhance the service. Your personal data is stripped on your device first. Company accounts are exempt: company knowledge stays private. <a>Learn more</a>.',
    },
  },
})
