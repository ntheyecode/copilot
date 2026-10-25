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
  footer: {
    tag: 'Your expert, on every screen. Read-only guidance that watches your screen and tells you the exact next move, in any app, with your data protected on your device.',
    aup: 'Acceptable Use',
    refund: 'Refund & Cancellation',
  },
  home: {
    hero: [
      en.home.hero[0], en.home.hero[1], en.home.hero[2],
      { h: 'Code that is <em>safe to run</em>, checked before you see it.', s: 'Every command, script and fix is written the secure way, then scanned for injection, exposed secrets, over-broad access and known-vulnerable libraries, so what you get is ready to go.' },
      en.home.hero[4], en.home.hero[5],
      { h: 'Do more with the <em>team you already have</em>.', s: 'Lean teams take on specialist work and ship like experts, without new hires or outsourcing.' },
      en.home.hero[7], en.home.hero[8],
      { h: '<em>Quality over quantity</em>, on every step.', s: 'You get the one correct next move, done the proven way for your field and checked before you see it, not a pile of options to sort through. Do it once, and do it properly.' },
    ],
    anyapp: { cap: 'Any app you already use - web, desktop, on-prem, and your own in-house, custom apps and processes.' },
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
        { t: 'Onboarding', before: 'Months of shadowing before a new starter is trusted on real work.', now: 'Guided through real tasks from their <em>first task</em>, in your apps and your way of working.' },
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
      sec: { points: [
        'Every command, snippet and script is self-checked for injection, hard-coded secrets and least privilege before it reaches you.',
        'Read-only, grounded in your field\'s proven methodology, and kept current - never stale AI knowledge.',
      ] },
      priv: { points: [
        'When data protection is on, PII, PHI and secrets are masked or tokenised on your machine first - the real values never leave, and the answer is rebuilt locally.',
        'You decide what gets scrubbed, and on your own AI key calls stay on that key. Nothing is silently rerouted.',
      ] },
    },
    pricing: {
      mins: 'Spend them any time across the whole day. Billed per minute you actually use, never by the hour.',
      trustCancel: 'Cancel any time, no contract',
      fineprint: 'Need more? Top up extra hours any time. Premium adds generated visuals, and image packs start from {price} each (min {min}). Purchased time never expires.',
      feats: {
        lite: ['1 guided task a day', 'Step-by-step on any task', 'Exact commands, code & links', 'Data privacy & security built in'],
        basic: ['Step-by-step on any task', 'Exact commands, code & links', 'Roadmaps included', 'Floating guide + session write-up'],
        advanced: ['Everything in Basic', 'Upload your own documents', 'Visual examples where they help', 'Priority guidance'],
        premium: ['Everything in Advanced', 'Generated visuals on demand', 'Highest-fidelity guidance', 'First in line, always'],
      },
    },
    enterprise: {
      cards: [
        { t: 'Your people, working the way your company works', d: 'Your SOPs, playbooks and app guides shape every on-screen step, so new starters get up to speed faster and veterans stop guessing. Private to your company, never used to train the platform.' },
        { t: 'ROI your leaders can see', d: 'A productivity view for leadership: tasks completed, time spent, and an illustrative view of time and cost saved, with your brand on the product your people use.' },
        { t: 'Fewer mistakes, nothing sensitive leaks', d: 'A wrong turn is caught as it happens, and PII and PHI are redacted on the device under one company policy you set once. Your SOC hears who and what kind, never the values.' },
        { t: 'Audit-ready, without the scramble', d: 'Sealed per-task evidence mapped to 18 frameworks, a full per-session audit log, and a DPA your legal team can sign. Evidence that supports your programme.' },
        { t: 'Live across your company, no project plan', d: 'Unlimited seats, one central admin console, and sign-in through your own identity provider (OIDC, 14 providers) with invite-only provisioning. Your people start in the apps they already know.' },
        { t: 'Runs on your terms', d: 'Per-company AI keys or bring your own, and on-prem deployment on request. Your keys, your control, nothing shared.' },
      ],
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
