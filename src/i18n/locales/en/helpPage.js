// English strings for the in-app How-to / Help page (src/pages/work/Help.jsx).
// Keyed under the `helpPage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace and
// never collides with the other i18n waves. Lists translate as units (arrays);
// inline <b> markup is rendered by t.rich / renderRich, never as HTML. The
// per-dashboard how-tos live in dashboardsHelp.js. US spelling.
export default {
  helpPage: {
    nav: {
      aria: 'How-to guide sections',
      label: 'How-to guide',
      flow: 'On screen',
      start: 'Getting started',
      how: 'How guidance works',
      styles: 'Guide styles',
      ask: 'Ask, Analyze & Research',
      deep: 'Deep pass',
      float: 'The floating overlay',
      where: 'Desktop, mobile & browser',
      time: 'Your time & pausing',
      record: 'Keeping a record',
      safe: 'Safety & acceptable use',
      faq: 'FAQ',
      desktop: 'The desktop app',
      desktopsec: 'Security & safety (desktop)',
      desktopfaq: 'Desktop FAQ',
    },
    startTask: 'Start a task',
    title: 'How to use WorkCoPilot',
    titleDesktop: 'How to use the WorkCoPilot desktop app',
    lead: 'An expert that watches your screen, tells you the exact next move one step at a time, catches a wrong move and corrects it, and keeps you on the next correct step until the job is done. Here is everything it does and how to get the most from it.',
    flowAlt: 'How WorkCoPilot works, in four steps: 1) Tell it your goal. 2) Follow the exact next move it shows on your screen - the click, the command or the code. 3) It catches and corrects a wrong move. 4) Keep going until done, with an audit trail and a clean report.',
    // The guiding-card mockup (inline SVG). The command and the class are code, not keyed.
    guideShot: {
      aria: 'The guiding card shows the current step with the exact command or code to use, and a Mark done button.',
      nowDoThis: 'NOW, DO THIS',
      stepOf: 'Step 2 of 9',
      stepTitle: 'Create the Apex class in the Developer Console',
      terminal: 'TERMINAL',
      markDone: 'Mark done',
      hideHow: 'Hide how',
      caption: 'The guiding card: one step at a time, with the exact command or code and a Mark done button.',
    },
    // The on-device redaction mockup (inline SVG). [REDACTED] is the product token, not keyed.
    redactShot: {
      aria: 'Sensitive on-screen values are replaced with REDACTED on your device before anything is sent.',
      account: 'Account: Acme Corp',
      email: 'Email',
      apiKey: 'API key',
      note: 'Redacted on your device - only the scrubbed text is ever sent.',
      caption: 'Governance on: sensitive values are stripped on your device before anything leaves it.',
    },
    flow: {
      h2: 'On screen: the main flow',
      lead: 'Four screens, from your goal to the answer. Everything else in this guide builds on them.',
      steps: {
        start: {
          t: 'Start a task',
          d: 'Name the plan, write the goal in your own words, press <b>Start guiding me</b>.',
          alt: 'The Start a task box on the Dashboard: a plan name, the goal, and the Start guiding me button.',
        },
        follow: {
          t: 'Follow Now, do this',
          d: 'One step at a time, with the exact command and a Copy button. The plan sits on the left; finished steps tick off as it sees them done.',
          alt: 'The Now, do this card in the guiding console: the current step, the terminal command with Copy, and how to do it.',
        },
        tools: {
          t: 'Open Tools',
          d: 'Make something (Answer, Write, Compute), read the screen, Deep pass, re-plan, the full guide, text size and theme.',
          alt: 'The Tools menu: Answer, Write, Compute, Read my screen, Deep pass, View full plan, Re-plan, Full guide, text size, accent color and dark mode.',
        },
        answer: {
          t: 'Get the answer',
          d: 'Tools, then <b>Answer</b>, then <b>Get the result</b>. The card gives the result, its confidence, how it got it, how to verify it, and any company policy flags.',
          alt: 'The Answer card: the result, a confidence meter, how I got it, verify by, the security check and company policy flags.',
        },
      },
    },
    desktop: {
      h2: 'The desktop app',
      lead: 'The desktop app is a quiet overlay that floats over whatever you are working in. It runs <b>read-only</b> - it shows the next move, it never clicks, types or runs anything for you.',
      modesH: 'Two modes',
      modes: [
        '<b>Planning</b> - a normal, resizable window (expand it to full screen) for setting your goal, answering the quick scoping questions and adding documents. It does not sit on top of other windows here.',
        '<b>Guiding</b> - once a plan starts it becomes a compact overlay that floats on top of your work, with see-through and click-behind so you can work underneath it.',
        '<b>Buddy</b> - minimize and it shrinks to a small card that keeps the current step in view. Bring it back any time.',
      ],
      titleBarH: 'The title bar (after you sign in)',
      titleBar: [
        '<b>On top</b> - keep the window above everything else.',
        '<b>Hidden / On share</b> - hide the window from screen shares and recordings (on by default), or reveal it when you want to show it.',
        "<b>See-through</b> - cycle the window's transparency so the work behind shows through.",
        '<b>Click-behind</b> (while guiding) - let your clicks pass straight to the app underneath. The title bar itself still takes clicks, so you can always turn it off again there (or with Ctrl+Shift+Alt+W).',
        '<b>Buddy</b> - shrink to the buddy card.',
      ],
      shortcutsH: 'Keyboard shortcuts',
      shortcuts: [
        '<b>Ctrl+Shift+Alt+H</b> hide / show · <b>Ctrl+Shift+Alt+S</b> hide-from-share · <b>Ctrl+Shift+Alt+T</b> on top',
        '<b>Ctrl+Shift+Alt+O</b> see-through · <b>Ctrl+Shift+Alt+W</b> click-behind · <b>Ctrl+Shift+Alt+B</b> buddy · <b>Ctrl+Shift+Alt+M</b> choose monitor',
      ],
      docsH: 'Your own documents & diagrams',
      docs: 'On the goal card, use <b>Add documents</b> to ground the plan in your own material - PDFs, Word, text, and <b>diagrams or screenshots</b> (read on your device). The file stays on your machine; only the extracted, governed text is used to plan.',
    },
    desktopsec: {
      h2: 'Security & safety (desktop)',
      items: [
        '<b>Read-only by design.</b> It never clicks, types, runs commands or changes anything. You stay in control of every action.',
        '<b>Hidden from screen shares.</b> The overlay is content-protected by default, so it stays out of Zoom / Teams / Meet shares and recordings. Toggle it with <b>On share</b> or Ctrl+Shift+Alt+S when you want it visible.',
        '<b>Your documents stay on your computer.</b> Files you add are read on your device. The raw file is never uploaded, and the text is not stored on our servers - it is used only to plan that session.',
        "<b>Least data leaves.</b> To guide you, downscaled screen frames and the governed text go to the AI service (ours, or your company's own key). When governance is on, sensitive values are stripped or tokenized <b>before</b> anything is sent, and rebuilt on your device.",
        '<b>Signed & updated safely.</b> The app is code-signed and updates are delivered over HTTPS.',
      ],
      tip: 'These are controls and audit evidence that support your compliance (GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, CCPA). They do not, by themselves, make you certified.',
    },
    desktopfaq: {
      h2: 'Desktop FAQ',
      items: [
        { q: 'Can people on a call see the overlay?', a: 'No, not while it is hidden (the default). It is excluded from screen capture and recording. Press Ctrl+Shift+Alt+S or the On share button if you deliberately want to show it.' },
        { q: 'Does my diagram or document get uploaded?', a: 'No. On the desktop app the file is read on your computer. Only the governed text is sent to plan, and it is not stored on our servers.' },
        { q: 'Will it do things on my machine?', a: 'Never. It is read-only. It reads the screen and tells you the next step; you perform every action yourself.' },
        { q: 'How do I keep it out of the way?', a: 'Use See-through and Click-behind while guiding, minimize to the Buddy card, or Ctrl+Shift+Alt+H to hide it entirely. It keeps working while minimized.' },
        { q: 'I turned on Click-behind and now I cannot click WorkCoPilot.', a: 'That is Click-behind doing its job: your clicks go to the app underneath. Move the mouse over the WorkCoPilot title bar, which always takes clicks, and press Click-behind there, or press Ctrl+Shift+Alt+W.' },
        { q: 'It says it cannot reach WorkCoPilot.', a: 'The app needs a connection to the WorkCoPilot server. Check your internet, VPN or proxy. The window retries on its own and opens the console as soon as the server answers; Retry now and Close are always there.' },
        { q: 'Does it update itself?', a: 'Yes. It checks for a signed update over HTTPS on launch and installs it on the next restart.' },
      ],
    },
    start: {
      h2: 'Getting started',
      steps: [
        'On the <b>Dashboard</b>, type what you want to get done in <b>Your goal</b>, or pick a space to start from. You can paste a whole ticket, a requirement, or an error message.',
        'Press <b>Start guiding me</b>. WorkCoPilot reads the goal, plans the task, and asks to read your screen.',
        'Allow screen sharing. Choose <b>your whole screen</b> so it can guide you through other apps, not just this tab.',
        'Follow the <b>DO THIS NOW</b> step. As your screen changes, the next step appears on its own.',
      ],
      tip: 'First time only: set up your AI in the box on the Dashboard. It is what reads your screen. After that, it just works.',
    },
    how: {
      h2: 'How guidance works',
      lead: 'WorkCoPilot reads your screen and tells you the exact next move. It does not click or type for you, so you stay in control the whole time. It starts from the very beginning, opening the right page and signing in, and assumes nothing.',
      seeH: 'What you see',
      see: [
        '<b>DO THIS NOW</b> shows the current step, rewritten for exactly what is on your screen right now.',
        'Exact <b>commands, code and links</b> come copy-ready, each with a Copy button that works on the page and in the floating window.',
        'The <b>checklist</b> shows the whole plan. Finished steps tick off by themselves as it sees them done.',
      ],
      keepH: 'How it keeps up',
      keep: 'It watches in downscaled frames and only looks closely when the screen actually changes, so an idle screen uses almost nothing. When it sees you take a wrong turn, it says so and corrects the step. You can press <b>Re-plan</b> at any time to rebuild the steps from what is on screen now.',
    },
    styles: {
      h2: 'Guide styles',
      lead: 'Pick the depth that fits you from the <b>Guide style</b> menu. You can switch styles mid-task.',
      items: [
        '<b>Step by step</b> - one action at a time with the exact command, each confirmed before the next.',
        '<b>Very beginner</b> - everything spelled out, every click and keystroke, with jargon explained in plain words.',
        '<b>Architect level</b> - design, trade-offs and best practices, written for someone experienced who wants the why.',
        '<b>Problem solving</b> - debug together: read the error, test one idea at a time, and narrow down the cause.',
      ],
    },
    ask: {
      h2: 'Ask, Analyze and Research',
      lead: 'Three things you can do at any point in a task, without losing your place:',
      items: [
        '<b>Ask</b> - type a question about what is on screen and get a direct answer, grounded in what it can see.',
        '<b>Analyze</b> (called <b>Photo</b> on mobile) - takes one screenshot now and reads it against your goal. Add a focus note to point it at the part you care about.',
        '<b>Research</b> - looks up the latest on the web, then answers. It runs only when you tap it, so nothing happens behind your back.',
      ],
    },
    deep: {
      h2: 'Deep pass',
      body: 'Hit a hard spot? Tap <b>Deep pass</b>. It runs that one screenshot with more reasoning, folds the result back into your steps, then carries on at normal speed. It is a one-time boost, not a mode you have to turn off. WorkCoPilot also does this on its own when a step gets tricky, so you rarely need to ask.',
      tip: 'Reach for Deep pass when a step is ambiguous, an error is unfamiliar, or the screen does not match what you expected.',
    },
    float: {
      h2: 'The floating overlay',
      p1: 'Tap <b>Float on top</b> to pop the guide into a small always-on-top window, so you never switch tabs while you work. Move and resize it freely. Use the sun and moon to switch light or dark, and the percentage control to dim it so it stays out of the way.',
      p2: 'On Chrome, Edge, Brave and Opera the float sits on top of every app. On Firefox and Safari it opens as a separate pop-out window instead, which you can still move anywhere.',
      tip: 'Keep the WorkCoPilot tab open while you use the float. It can sit in the background, that is fine.',
    },
    where: {
      h2: 'Desktop, mobile and browser',
      lead: 'Every way to run WorkCoPilot is included in one subscription. Use whichever fits the moment.',
      items: [
        '<b>Browser</b> - nothing to install, works even on locked-down machines. Share your whole screen to be guided through any app. You are using this one now.',
        '<b>Desktop app</b> - a true overlay with see-through and click-behind, and it hides itself from screen shares, so people on a call do not see it.',
        '<b>Mobile app</b> - point your phone camera at a screen, a device or paper, and get guided. Tap <b>Photo</b> to ask about what the camera sees, or let it watch live.',
      ],
    },
    time: {
      h2: 'Your time and pausing',
      lead: 'Your plan gives you hours of live guidance each day, counted only while it is actively guiding, never while idle. The <b>min left</b> badge at the top shows how much time remains today, and it turns amber to warn you before you run low.',
      items: [
        'Tap <b>Pause</b> to freeze the clock and your session while you step away or do other work, then <b>Resume</b> when you are back.',
        'Daily minutes reset at <b>11:59 PM ET</b>.',
        'Purchased top-up time never expires and is used only after your daily minutes are gone.',
        'Need more now? Use <b>Add time</b> at the top of the Dashboard.',
      ],
    },
    record: {
      h2: 'Keeping a record',
      body: 'Every session can be saved as a clean record: the task, what was achieved, every confirmed step with its exact commands and code, any warnings, and your questions and answers. Use <b>Download</b> to choose the format - a <b>PDF report</b>, a plain-<b>text report</b>, or the full <b>audit log</b> - or <b>Print</b> for a paper copy. Commands and code appear only for steps you actually completed, and the report includes up to five <b>scrubbed milestone screenshots</b> as evidence.',
      tip: 'The report is handy as a runbook for next time, or to hand to a teammate who needs to do the same task. Every screenshot is redacted on your device before capture - only the scrubbed image is ever stored.',
    },
    safe: {
      h2: 'Safety and acceptable use',
      p1: 'WorkCoPilot supports lawful, legitimate work only. It will not help build weapons or means of mass harm, create malware or exploits, break into systems or accounts you do not own, or do anything illegal. Those requests are declined when you set the goal.',
      p2: 'It reads your screen to guide you and never acts for you. It does not click, type, or submit anything on your behalf, so you decide every action.',
    },
    faq: {
      h2: 'FAQ',
      items: [
        { q: 'Do I need to install anything?', a: 'No. It runs in your browser. Install the desktop or mobile app only if you want the extra overlay or camera features.' },
        { q: 'Will people on a call see the overlay?', a: 'If you share your whole screen in the browser, yes. The desktop app hides itself from screen shares.' },
        { q: 'Does it work for non-technical work?', a: 'Yes. Finance, marketing, legal, office, product, anything that happens on a screen.' },
        { q: 'What if the steps are wrong for my screen?', a: 'It re-reads your screen and corrects as you go. Press <b>Read my screen</b> anytime to take a fresh screenshot, verify the current step and move on, or <b>Re-plan</b> to rebuild the steps.' },
        { q: 'Does it type or click for me?', a: 'No. It only reads and guides. You stay in control of every action.' },
        { q: 'What does it do with my screen?', a: 'Frames are downscaled and read only to guide the task. An unchanged screen is not sent at all.' },
      ],
    },
  },
}
