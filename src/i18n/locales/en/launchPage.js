// English strings for the launch-link page (src/pages/work/launch/LaunchPage.jsx,
// route /work/launch#<token>), keyed under `launchPage`. A company's own app
// made a one-time link for a specific person; opening it starts that workflow
// as a guided session. Interpolations: {title} workflow title, {name} the
// signed-in person's name. Start refusals reuse workStart.gate* and
// workDashboard.workflows.err.* (already translated). No AI-tell wording,
// no em-dashes.
export default {
  launchPage: {
    title: 'Opening your workflow',
    ready: 'Starting {title}',
    working: 'One moment while WorkCoPilot sets up your guided session.',
    signingIn: 'Taking you to sign in first. You will come straight back here.',
    steps: {
      checking: 'Checking who you are',
      redeeming: 'Checking your link',
      starting: 'Starting the workflow',
    },
    signedInAs: 'Signed in as {name}',
    foot: 'This link came from one of your company\'s own apps.',
    actions: {
      signOut: 'Sign out and switch account',
      retry: 'Try again',
      dashboard: 'Open WorkCoPilot',
    },
    err: {
      missing: {
        title: 'This link is incomplete',
        body: 'The link is missing its token. Open it exactly as your company app gave it to you, or ask it for a fresh one.',
      },
      invalid: {
        title: 'This link is not valid',
        body: 'WorkCoPilot does not recognize it. Ask your company app for a fresh link.',
      },
      expired: {
        title: 'This link has expired',
        body: 'Launch links only live for a short while. Ask your company app for a fresh one.',
      },
      used: {
        title: 'This link was already used',
        body: 'Each launch link opens its workflow once. Ask your company app for a fresh one.',
      },
      wrongUser: {
        title: 'This link was made for someone else',
        body: 'You are signed in as {name}. Sign out and sign in as the person the link was made for; the link will be waiting.',
      },
      signedOut: {
        title: 'Your session ended',
        body: 'Sign in again and the link will carry on from here.',
      },
      start: {
        title: 'The workflow could not start',
        needsPlan: 'Your account has no active plan or license right now. Open WorkCoPilot to sort that out, then use the link again.',
      },
      generic: {
        title: 'Something went wrong',
        body: 'WorkCoPilot could not open the workflow. Try again, or ask your company app for a fresh link.',
      },
    },
  },
}
