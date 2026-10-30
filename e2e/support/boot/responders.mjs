// Which AI call is this, and what does a sensible deterministic model answer?
//
// The kind is read from the section markers the product's own prompts carry
// (server/work.js, work_deep_plan.js, workflow_step_reader.js). Order matters:
// the harden prompt also contains "PLAN THE WORK", so it is checked first.
const MARKERS = [
  ['project', /PLAN A PROJECT AS AN ORDERED MAP OF TASKS/],
  ['harden', /HARDEN A DRAFT PLAN/],
  ['watch', /GUIDE CONTINUOUSLY BY WATCHING THE SCREEN/],
  ['ask', /ANALYZE THIS SCREEN/],
  ['result', /RETURN THE RESULT, NOT JUST THE STEPS/],
  ['plan', /PLAN THE WORK/],
  ['ping', /You are a connectivity check/],
  ['scope', /You are the scoping step of WorkCoPilot/],
  ['summary', /You are summarizing a WorkCoPilot session/],
  ['stepRead', /You are reading one recorded step of a guided workflow/],
]

export function classify(text, images) {
  for (const [kind, re] of MARKERS) if (re.test(text)) return kind
  return images ? 'vision' : 'chat'
}

// Default plan: three plain steps. Deliberately free of the words that trigger
// the second "harden" pass (install, sign in, verify, saved...), so one plan is
// one call; a test that wants the harden pass scripts it.
export const DEFAULT_PLAN = Object.freeze({
  appContext: 'Spreadsheet app in a browser',
  overview: 'Build the monthly expense summary.',
  steps: [
    { text: 'Open the **Expenses** sheet.', validate: 'The Expenses sheet is showing.', url: '', commands: [] },
    { text: 'Select the **Month** column and choose **Sort A to Z**.', validate: 'Rows are sorted by month.', url: '', commands: [] },
    { text: 'Click **Insert** then **Pivot table** to total each month.', validate: 'A pivot table with monthly totals is on screen.', url: '', commands: [] },
  ],
})

// Default project map: three real, distinct, ordered tasks (passes the product's
// own breakdown quality gate).
export const DEFAULT_PROJECT = Object.freeze({
  name: 'Quarter close',
  endState: { done: 'The quarter is closed and reported.', checks: ['All invoices reconciled', 'Report sent to finance'] },
  tasks: [
    { title: 'Reconcile vendor invoices', goal: 'Match every vendor invoice to a payment', doneState: 'No unmatched invoices remain', overview: 'You **match invoices** to payments until ==none are left==.', dependsOn: [] },
    { title: 'Review open purchase orders', goal: 'Close or carry each open purchase order', doneState: 'Every open order has a decision', overview: 'You **review each order** and ==record a decision==.', dependsOn: [0] },
    { title: 'Publish the close report', goal: 'Send the quarter report to finance', doneState: 'Finance has the report', overview: 'You **compile the report** and ==send it to finance==.', dependsOn: [0, 1] },
  ],
})

export function defaultAnswer(kind, text) {
  switch (kind) {
    case 'project':
      return DEFAULT_PROJECT
    case 'plan':
    case 'harden':
      return DEFAULT_PLAN
    case 'watch':
      // Neutral: nothing finished yet. Tests script progress explicitly.
      return { completed: [], current: 1, guidance: 'Keep going with the current step.', observation: 'The app is open on the expected screen.', flag: '', done: false, deviation: null }
    case 'ask':
      return { answer: 'The Sort button is in the Data menu, at the top of the window.', planChanged: false, steps: [] }
    case 'result':
      return { kind: 'number', body: '4,250.00', basis: 'Sum of the October rows in the Amount column', verifyBy: 'Check the pivot total', confidence: 0.9, need: '' }
    case 'summary':
      return 'You built the monthly expense summary: sorted the sheet by month and added a pivot table with the totals.'
    case 'ping':
      return 'OK'
    case 'scope':
      return { questions: [{ id: 'tool', text: 'Which spreadsheet app are you using?', kind: 'choice', options: ['Excel', 'Google Sheets'], tierGate: null, placeholder: '' }] }
    case 'stepRead':
      return { controlLabel: 'Save', controlKind: 'button', doneWhen: 'A confirmation banner reads Changes saved.', confidence: 0.92 }
    default:
      return '{}'
  }
}
