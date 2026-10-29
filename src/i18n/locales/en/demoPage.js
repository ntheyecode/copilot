// English strings for the scripted 60-second demo page (src/pages/WorkDemo.jsx),
// keyed under the `demoPage` namespace. en.js already carries demo.pick* (the
// "your field next" head shared with the showcase); this partial owns the rest
// of the page under its own namespace and deep-merges beside it.
//
// STRUCTURE CONTRACT (the page depends on it):
// - steps is an ARRAY in playback order. A step is either a normal one
//   ({ sees, step, how: [{ do, tip }], done }) or a correction
//   ({ sees, fix: { say, do }, done }). The exact shell command shown for a
//   step stays in code (WorkDemo.jsx STEP_CMDS, same index), so a translation
//   keeps the step count and order.
// - Inside `how[].do`, **double asterisks** mark the exact button, menu or
//   value; the page renders them bold. Keep the markers around the same words.
// - writeup is the ARRAY of lines in the closing session write-up.
// - {n} / {total} are numbers filled in by the page.
export default {
  demoPage: {
    // Hero
    heroBadge: 'A real session, start to finish',
    h1: 'Watch it guide one real task, step by step.',
    lead: 'It reads your screen, calls the next move, and catches a mistake before it costs you.',
    startFree: 'Start free',
    heroNote: 'Takes about a minute to watch. Free to try.',

    // The co-pilot loop
    loopBadge: 'A live co-pilot, not a how-to page',
    loopH2: 'It does not just tell you. It walks every step with you.',
    caps: [
      { t: 'Watches', d: 'Sees what is on your screen and keeps pace with you.' },
      { t: 'Guides', d: 'Points to the exact click, command or value, one step at a time.' },
      { t: 'Corrects', d: 'Catches a wrong move the moment it happens and puts you back on track.' },
      { t: 'Fixes', d: 'Debugs the error in front of you and gets you unstuck.' },
    ],
    grounded: 'Grounded in what is really on your screen. No guessing, no invented steps.',

    // Closing band
    finalH2: 'Now bring your own task.',
    finalP: 'WorkCoPilot takes it from the first step to done, and hands you the write-up.',

    // The scripted player (the dark card)
    playerAria: 'Scripted demo of one guided session. It plays automatically and can be replayed at the end.',
    watchingTitle: 'reading your screen',
    watching: 'watching',
    tag: 'Cloud',
    goalLabel: 'GOAL',
    goal: 'Set up a private network (VPC) on AWS',
    planHead: 'Reading your screen, here is the plan',
    sees: 'I can see',
    terminal: 'TERMINAL',
    holdOn: 'HOLD ON',
    doThisNow: 'DO THIS NOW',
    exactlyHow: 'EXACTLY HOW',
    stepOf: 'Step {n} of {total}',
    howCount: '{n} steps',
    doneWhen: 'done when {what}',
    wrapupH: 'Session write-up',
    wrapupSub: 'A clean record of exactly what you did, ready to keep, share or repeat.',
    taskComplete: 'Task complete',
    replay: 'Replay',
    replayAria: 'Replay the demo',

    steps: [
      {
        sees: 'You are in the VPC dashboard',
        step: 'Create the VPC',
        how: [
          { do: 'Click **Create VPC**', tip: 'Top-right of the VPC dashboard' },
          { do: 'Choose **VPC only** and name it', tip: 'e.g. prod-vpc, something meaningful' },
          { do: 'Set the IPv4 CIDR to **10.0.0.0/16**', tip: 'Leave IPv6 off unless you need it' },
          { do: 'Click **Create VPC** to finish', tip: 'It appears in the list within a second' },
        ],
        done: 'the VPC is listed',
      },
      {
        sees: 'You typed CIDR 10.0.0.0/24',
        fix: {
          say: 'A /24 is only 256 addresses, too small to grow into later.',
          do: 'Change the CIDR to 10.0.0.0/16 before you create it.',
        },
        done: 'the range reads 10.0.0.0/16',
      },
      {
        sees: 'The VPC has no path to the internet',
        step: 'Attach an internet gateway',
        how: [
          { do: 'Open **Internet gateways** → **Create**', tip: 'Left nav, under Virtual private cloud' },
          { do: 'Name it, then click **Create**', tip: 'e.g. prod-igw' },
          { do: 'Select it → **Actions** → **Attach to VPC**', tip: 'It has to be Detached to attach' },
          { do: 'Pick your VPC and click **Attach**', tip: 'Status flips to Attached' },
        ],
        done: 'the gateway shows Attached',
      },
      {
        sees: 'Traffic still has nowhere to go',
        step: 'Route outbound traffic to the gateway',
        how: [
          { do: "Open your VPC's **route table**", tip: 'Route tables → the one tied to your VPC' },
          { do: 'Click **Edit routes** → **Add route**', tip: 'Opens the editable route list' },
          { do: 'Set the destination to **0.0.0.0/0**', tip: 'That means all outbound IPv4 traffic' },
          { do: 'Target your **internet gateway**, then **Save**', tip: 'Pick the igw-… you just attached' },
        ],
        done: '0.0.0.0/0 points at the igw',
      },
    ],

    writeup: [
      'Created a VPC with a /16 range (10.0.0.0/16) so it has room to grow.',
      'Caught a too-small /24 CIDR before it was created and corrected it.',
      'Attached an internet gateway and confirmed it shows Attached.',
      'Added a 0.0.0.0/0 route to the gateway so traffic can get out.',
    ],
  },
}
