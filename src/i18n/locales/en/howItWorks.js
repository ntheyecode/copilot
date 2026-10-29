// English strings for /workcopilot/how-it-works (src/pages/WorkCapabilities.jsx).
// Keyed under the `howItWorks` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace and
// never collides with the older `how.*` keys (demo band, apps band, Projects
// card), which stay in en.js. Extraction only: the copy is the page's exact
// English wording. Arrays translate as units (cards, loop rows, points) and
// are joined to their icons / illustrations by position in the page.
// Not keyed on purpose: the command `aws ec2 create-vpc`, the network ranges
// `0.0.0.0/0` / `10.0.0.0/16`, the `>_` prompt glyph and the product's own
// `[REDACTED]` token are code or product literals, not copy.
export default {
  howItWorks: {
    hero: {
      // Rendered as two lines around a <br />.
      h1a: 'Like having the best person',
      h1b: 'in the room, every time.',
      p: 'WorkCoPilot watches your screen, shows the exact next step in the app you are in, checks it worked, and keeps going until the job is done.',
    },
    // Illustration labels (alt text) and the short labels drawn INSIDE each
    // card illustration. Keep the viz* strings very short: they sit in pills.
    viz: {
      steps: { alt: 'Illustration: a four-step progress line with step one done, step two in progress and the rest pending', caption: 'step 2 of 4' },
      command: { alt: 'Illustration: a terminal showing an exact command with a Copied confirmation', copied: 'Copied' },
      zero: { alt: 'Illustration: three steps in a row, Open, Sign in, then Done', open: 'Open', signIn: 'Sign in', done: 'Done' },
      fix: { alt: 'Illustration: a risky open network range crossed out and replaced by a corrected, narrower one' },
      apps: { alt: 'Illustration: three app windows side by side, a web page, a desktop app and a terminal', caption: 'web  ·  desktop  ·  terminal' },
      grounded: { alt: 'Illustration: a document read on the device, with an arrow to a Best practice check mark', read: 'read on-device', best: 'Best practice' },
      record: { alt: 'Illustration: a finished PDF report with a completion check mark', pdf: 'PDF' },
      review: { alt: 'Illustration: a diagram being inspected, one box flagged, with an arrow to a generated fix', fix: 'fix' },
      learns: {
        alt: 'Illustration: two app windows, Last time with a control in one place and This time with the control moved and already found, over a readout saying learned, carried forward',
        lastTime: 'last time', thisTime: 'this time', found: 'found', learned: 'learned', carried: 'carried forward',
      },
      coach: { alt: 'Illustration: a short readiness check with three ticks, then a choice between a quick and a detailed interview', kind: 'Kind', ready: 'Ready?', sample: 'Sample', quick: 'Quick', detailed: 'Detailed' },
      shield: { alt: 'Illustration: a form field shown as REDACTED, a code check with a tick, and an authenticator lock', codeChecked: 'code checked', authenticator: 'authenticator required' },
      skills: { alt: 'Illustration: a playbook document with an arrow into a plan that now follows it', playbook: 'your playbook' },
      enterprise: { alt: 'Illustration: a security alert relayed to a SOC console, a single sign-on badge and a sealed report', soc: 'your SOC', sso: 'SSO', sealed: 'sealed' },
      anywhere: { alt: 'Illustration: a desktop overlay, a browser window and a phone side by side', desktop: 'desktop overlay', browser: 'browser', phone: 'phone' },
    },
    gridH2: 'What WorkCoPilot does for you',
    // The fourteen capability cards, in page order (the Projects card is spliced
    // in second from how.projects.*). One benefit-first sentence each.
    cards: [
      { t: 'Guided, step by step', d: 'The exact next move on your screen, explained at the depth you choose, from simplest to technical, and checked before you go on.' },
      { t: 'The exact how, every time', d: 'The precise click, command or setting, copy-ready, always the proven best way.' },
      { t: 'Starts from zero', d: 'Opens the right page, signs you in and takes you to the exact spot.' },
      { t: 'Catches and corrects mistakes', d: 'Spots a wrong turn the moment it happens and shows the fix, even when a button has moved.' },
      { t: 'Any app, not just the browser', d: 'Web apps, desktop apps, on-prem consoles and your own tools: it reads whatever is on screen.' },
      { t: 'Grounded in the best, and in your world', d: 'Steps follow current best practice and, on Advanced and Premium, your own documents, read on your computer.' },
      { t: 'A record you keep', d: 'Finish with a clean, picture-rich write-up of what you did, ready to share or repeat.' },
      { t: 'Review and generate', d: 'Show it a diagram or design. It finds the real issues and gives you a ready prompt to fix them.' },
      { t: 'Stays current, learns your tools', d: 'Learns how your tools work today, kept private to your company, so guidance never goes stale.' },
      { t: 'A better task before you spend one', d: 'A 30-second coach checks you are ready and shapes the task, so the plan fits what you know.' },
      { t: 'Teach it your skills', d: 'Paste a playbook or SOP and guidance follows your tools, standards and terminology, kept private.' },
      { t: 'Protected by default', d: 'Data redacted on your device, code checked before it runs, an authenticator on every account, a full audit log.' },
      { t: 'Built for companies', d: 'Security alerts to your SIEM, company SSO, sealed compliance reports across 18 frameworks and an executive ROI dashboard.' },
      { t: 'Desktop, web and mobile', d: 'A desktop overlay hidden from screen shares, the browser with nothing to install, or your phone camera. It guides, never acts for you.' },
    ],
    // The feature card: the loop behind every task, shown as the benefit.
    feature: {
      h2: 'How your plan is made',
      loop: {
        aria: 'How every task runs: plan, probe, guide, watch, correct, repeating until the task is done',
        // Label pills (k) never wrap; only the caption (v) wraps.
        rows: [
          { k: 'Plan', v: 'the strongest AI available to you plans the whole task' },
          { k: 'Probe', v: 'asks a question when it needs more, a tap or a quick answer' },
          { k: 'Guide', v: 'the exact next step, on your screen' },
          { k: 'Watch', v: 'checks that each step really worked, and double-checks any step the moment you ask' },
          { k: 'Correct', v: 'fixes a wrong turn the moment it happens' },
        ],
        again: 'repeats until the task is done',
        ok: 'Planned by the strongest AI for you',
      },
      line: 'It keeps your whole task in context and keeps going, improving as it learns, until the work is done.',
      eyebrow: 'The strongest AI available to you',
      title: 'Your plan comes from the strongest AI available to you.',
      body: 'Set the goal. The strongest AI on your key plans it, and live guidance keeps pace with your screen, step by step.',
      points: [
        'Chosen, not guessed: always the strongest option actually available to you right now.',
        'Your data boundary holds: every call stays on your own or your company\'s key.',
        'Honest log: every task records what planned it and any change made mid-task.',
      ],
    },
    cta: {
      aria: 'Next steps',
      start: 'Get started',
      enterprise: 'Enterprise features',
      demo: 'See a 60-second demo',
    },
  },
}
