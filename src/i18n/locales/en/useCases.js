// English strings for /workcopilot/use-cases (src/pages/WorkUseCases.jsx).
// Keyed under the existing `useCases` namespace: the i18n loader deep-merges
// every en/*.js partial into the English base, so these keys sit BESIDE the
// showcase* keys that already live in en.js (never duplicate those here).
// Extraction only: the copy is the page's exact English wording. The eight
// cases translate as one array and are joined to their icons / ids by
// position in the page; `short` is the one-word badge on the proof card
// (formerly the first word of the tag, now its own string so a translator can
// pick a short form that fits the pill).
export default {
  useCases: {
    hero: {
      badge: 'Use cases',
      // Rendered as two lines around a <br />; h1b carries the <em> gradient.
      h1a: 'Find the job that looks like yours.',
      h1b: '<em>Then finish it, guided.</em>',
      p: 'Pick the work below that matches your day. WorkCoPilot guides each step on your screen, from the first click to done.',
      chipsAria: 'Jump to a use case',
    },
    cases: [
      {
        tag: 'Setup & configuration', short: 'Setup',
        outcome: 'Set it up right, locked down',
        benefit: 'Every setting named and checked live, so your infrastructure is actually secure, not just looks it.',
        can: ['Configure a firewall', 'Harden a Linux server', 'Set up IDS / IPS rules', 'Wire a CI/CD pipeline'],
        guide: {
          goal: 'Harden a production Linux server',
          plan: ['Create a non-root sudo user', 'Lock down SSH and the firewall', 'Turn on auto security updates'],
          now: 'Default-deny the firewall, allow only ports 22 and 443, then confirm from a second session before you log out.',
          done: 'only 22 and 443 are open and a password login is refused',
        },
      },
      {
        tag: 'Build & implement', short: 'Build',
        outcome: 'Empty folder to running system',
        benefit: 'The exact commands and code, in order, with the mistakes that usually cost hours caught early.',
        can: ['Scaffold a new app or service', 'Connect two systems with an API', 'Build a data pipeline', 'Deploy to the cloud'],
        guide: {
          goal: 'Add Stripe payment webhooks',
          plan: ['Add the raw-body webhook route', 'Verify every event, make it idempotent', 'Replay test events, then go live'],
          now: 'Verify the signature before trusting the event, and skip any event id you have already seen so retries never double-charge.',
          done: 'a replayed event is accepted once and ignored the second time',
        },
      },
      {
        tag: 'AI & automation', short: 'AI',
        outcome: 'Automations that actually run',
        benefit: 'Each node, setting and connection guided, so the agent or assistant works instead of silently stalling.',
        can: ['Build an n8n workflow', 'Stand up a RAG assistant', 'Automate a repeat task', 'Wire AI into your tools'],
        guide: {
          goal: 'Ship a RAG assistant that cites sources',
          plan: ['Chunk, embed and index your docs', 'Retrieve before you generate', 'Test answers, then deploy'],
          now: 'Retrieve the top matching chunks, pass only those as context, and have it cite the source or say "I do not know".',
          done: 'answers quote the right document and refuse when the answer is not there',
        },
      },
      {
        tag: 'Product & innovation', short: 'Product',
        outcome: 'From idea to shipped',
        benefit: 'Guided through tools you have never opened, with everything pointed at the result you want.',
        can: ['Prototype a new feature', 'Spin up a landing page', 'Run a quick experiment', 'Ship a first version'],
        guide: {
          goal: 'Ship and track a landing page today',
          plan: ['Build the page, write the copy', 'Connect your domain', 'Publish and prove tracking fires'],
          now: 'Add the analytics snippet, set a conversion on the signup button, then confirm a test signup lands in real time.',
          done: 'the live URL loads and a test signup shows up as a conversion',
        },
      },
      {
        tag: 'Marketing & growth', short: 'Marketing',
        outcome: 'Launch, then read the numbers',
        benefit: 'Walked through the ad manager and analytics, with every number explained in plain words.',
        can: ['Launch an ad campaign', 'Set up conversion tracking', 'Read a traffic report', 'Plan a launch'],
        guide: {
          goal: 'Launch a Google Ads search campaign',
          plan: ['Install the tag, import the conversion', 'Set budget, keywords, tracking', 'Submit for review, go live'],
          now: 'Use exact and phrase-match keywords, not broad, set a daily cap and a target cost per action, then add three ads.',
          done: 'the campaign reads Eligible and the conversion shows Recording',
        },
      },
      {
        tag: 'Accounting & office', short: 'Accounting',
        outcome: 'Books closed, filings done',
        benefit: 'Shown exactly what to enter, with whatever does not add up flagged on the spot.',
        can: ['Reconcile a bank statement', 'Build a financial report', 'Create and send invoices', 'Prepare a filing'],
        guide: {
          goal: 'Reconcile the month to the penny',
          plan: ['Import the statement, lock the opening balance', 'Match everything, hunt the variance', 'Lock the period, export the report'],
          now: 'Auto-match deposits, clear each withdrawal, and when it will not tie out compare the uncleared dates and amounts.',
          done: 'the cleared balance equals the statement to the cent',
        },
      },
      {
        tag: 'Compliance & filings', short: 'Compliance',
        outcome: 'Compliance tasks, done clean',
        benefit: 'Forms, checklists and filings completed step by step, with a clean record of what was done.',
        can: ['Complete a compliance checklist', 'Fill a regulatory form', 'Submit a filing in the portal', 'Keep an audit trail'],
        guide: {
          goal: 'Submit a quarterly compliance filing',
          plan: ['Open the portal, start the return', 'Fill each field, attach evidence', 'Validate and submit'],
          now: 'Fill each required field from your records and attach exactly the evidence the form asks for, nothing missing.',
          done: 'the portal accepts the filing and returns a confirmation number',
        },
      },
      {
        tag: 'Everyday tasks', short: 'Everyday',
        outcome: 'Stuck on a screen? Get to done',
        benefit: 'A new tool, a form you cannot finish, an error you do not understand: point it at the screen and get walked through.',
        can: ['Learn a new tool fast', 'Fix a confusing error', 'Fill a tricky form', 'Get unstuck on a task'],
        guide: {
          goal: 'Decode and fix a cryptic error',
          plan: ['Reproduce the error reliably', 'Find the real cause, not the symptom', 'Fix it, confirm it is gone'],
          now: 'Paste the whole error: it reads the full stack, names the real cause, and points to the file and line to change.',
          done: 'the task finishes with a clean log and no error',
        },
      },
    ],
    case: {
      cta: 'Guide me on this',
      ctaAria: 'Guide me on {tag}',
    },
    // The light proof card: what a guided session looks like.
    mini: {
      aria: 'Example guided session: {goal}',
      watching: 'watching',
      youWant: 'YOU WANT',
      stepOf: 'Step {n} of {total}',
      srDone: 'Done: ',
      srNext: 'Next: ',
      doingNow: 'DOING NOW',
      doneWhen: 'done when {done}',
    },
    final: {
      h2: 'Your task is next.',
      p: 'Bring anything on your screen. WorkCoPilot takes it from the first step to done.',
      cta: 'Get started',
    },
  },
}
