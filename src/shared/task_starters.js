// ---------------------------------------------------------------------------
// Pre-task readiness coach - SINGLE SOURCE of the content (SUPREME RULE II).
//
// WorkCoPilot limits tasks (per-tier daily cap), so a badly-framed task is a
// WASTED task. Before the person types their goal we run a short, 100%
// client-side, zero-AI-cost coach: pick the kind of task, answer a few
// readiness questions, then see how to write a great task + a concrete sample
// built from their choices. This module holds all of that content; the UI
// (ScopeWizard / plan form) imports and renders it, and never hard-codes copy.
//
// Nothing here calls AI or the server - it runs before a task exists, so it
// costs nothing and cannot consume a task.
// ---------------------------------------------------------------------------

// The kinds of task a person brings. `sample` is an exemplary, concrete task of
// that kind - what "good" looks like - used to prime the goal box.
export const TASK_KINDS = [
  {
    id: 'configure', label: 'Set up or configure something', icon: 'settings',
    blurb: 'Create or change a setting, account, resource or environment.',
    sample: 'Set up a new S3 bucket in my AWS account (us-east-1) called "acme-backups" - versioning on, default encryption enabled, and public access fully blocked.',
  },
  {
    id: 'build', label: 'Build or implement', icon: 'blocks',
    blurb: 'Create something new - code, a page, a pipeline, a document.',
    sample: 'Create a Python FastAPI endpoint POST /invoices that validates the body with Pydantic, saves the record to Postgres, and returns the created invoice as JSON.',
  },
  {
    id: 'review', label: 'Review, audit or check', icon: 'shield',
    blurb: 'Have something checked for issues, with the fixes explained.',
    sample: 'Review my Terraform main.tf for security issues - flag anything that opens inbound ports, stores secrets in plaintext, or grants over-broad IAM, and give me the fix for each.',
  },
  {
    id: 'troubleshoot', label: 'Fix or troubleshoot', icon: 'wrench',
    blurb: 'Something is broken or not behaving - find why and fix it.',
    sample: 'My Nginx returns 502 on https://app.example.com after today’s deploy - help me find the cause and fix it, step by step.',
  },
  {
    id: 'data', label: 'Work with data', icon: 'table',
    blurb: 'A spreadsheet, report, export or analysis task.',
    sample: 'In my Excel sales sheet, add a profit-margin column, highlight rows below 10% margin, and build a pivot of revenue by region.',
  },
  {
    id: 'learn', label: 'Learn how to do something', icon: 'compass',
    blurb: 'Be walked through a how-to on your own screen.',
    sample: 'Show me how to turn on multi-factor authentication for every user in my Google Workspace admin console.',
  },
]

export function taskKind(id) { return TASK_KINDS.find((k) => k.id === id) || null }

// Readiness questions - universal, lightweight. Each option carries a `flag`
// used to raise a readiness warning (the wasted-task guard). `gate` marks an
// option that only reflects an Advanced/Premium capability (documents), never a
// blocker. Keep this SHORT: 4 taps, no typing.
export const READINESS = [
  {
    id: 'access', q: 'Are you signed in where this task happens (the app, site or account), ready to work?',
    options: [
      { v: 'ready', label: 'Signed in and ready' },
      { v: 'cansignin', label: 'I can sign in now' },
      { v: 'notyet', label: 'Not yet / not sure', flag: 'access' },
    ],
  },
  {
    id: 'details', q: 'Do you have the key details this needs - the names, values, settings and the exact requirement?',
    options: [
      { v: 'have', label: 'Yes, I have them' },
      { v: 'mostly', label: 'Mostly' },
      { v: 'no', label: 'Not really', flag: 'details' },
    ],
  },
  {
    id: 'docs', q: 'Do you have a document, spec or diagram to work from?',
    options: [
      { v: 'yes', label: 'Yes, I can attach one', gate: 'advanced' },
      { v: 'none', label: 'No, and I don’t need one' },
      { v: 'find', label: 'I should find one first', flag: 'docs' },
    ],
  },
  {
    id: 'time', q: 'Can you stay and follow along on your screen for a little while now?',
    options: [
      { v: 'now', label: 'Yes, now' },
      { v: 'short', label: 'A short while' },
      { v: 'later', label: 'Not right now', flag: 'time' },
    ],
  },
]

// How to write a great task - the checklist shown with the sample.
export const TASK_TIPS = [
  'Name the app, site or tool where you’ll work (for example AWS console, Excel, Salesforce).',
  'Say what "done" looks like - the end result you want.',
  'Include the specifics: names, values, versions, regions, limits.',
  'Call out anything that must or must not happen (security, deadlines).',
  'One task, one outcome. Split a big goal into separate tasks.',
]

// Readiness warnings from the answers. Returns ordered items {level, text}:
// 'warn' = likely to waste a task if you start now; 'info' = good to know;
// 'ready' (returned only when nothing is flagged) = you’re set to go.
export function readinessWarnings(answers = {}) {
  const out = []
  if (answers.access === 'notyet') out.push({ level: 'warn', text: 'Get signed in where this happens first. Starting before you have access can spend a task before you can act on the steps.' })
  if (answers.details === 'no') out.push({ level: 'warn', text: 'Gather the key details first - the names, values and exact requirement. A vague task leads to a vague plan, and the task still counts.' })
  if (answers.docs === 'find') out.push({ level: 'info', text: 'If a spec or diagram drives this, find it before you start so the plan can account for it. You can attach it on Advanced and Premium.' })
  if (answers.time === 'later') out.push({ level: 'info', text: 'Guidance is real-time on your screen. You can pause, but it works best when you can follow along now.' })
  if (!out.length) out.push({ level: 'ready', text: 'You’re set. Write your task below - the clearer it is, the better the plan.' })
  return out
}

// A concrete sample task for the chosen kind, used to prime the goal box. We
// keep the exemplary sample from TASK_KINDS; `answers` is accepted so the UI (or
// a later revision) can tailor further without changing the call site.
export function sampleTask(kindId, answers = {}) {
  const k = taskKind(kindId)
  return k ? k.sample : ''
}
