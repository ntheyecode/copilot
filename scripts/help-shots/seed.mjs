// Throwaway seed for the annotated help screenshots (Teach studio, company
// workflows, workflow issues, exec drill-downs + Brain export, trainer grant,
// API & webhooks): a fictional company, Northwind Logistics, with no real data.
// Refuses to run unless WORK_DATA_DIR is set to a fresh dir outside server/.
// Usage: node --env-file=<workdir>/help.env scripts/help-shots/seed.mjs <repo> <workdir>/frames
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DIR = process.env.WORK_DATA_DIR || ''
if (!DIR || /[\\/]server[\\/]data/.test(path.resolve(DIR)) || (fs.existsSync(DIR) && fs.readdirSync(DIR).length)) {
  console.error('WORK_DATA_DIR must be a fresh, empty throwaway dir (never server/data)'); process.exit(1)
}
const PW = process.env.SEED_PASSWORD
const [, , ROOT, FRAMES] = process.argv
const store = await import(pathToFileURL(path.join(ROOT, 'server/store.js')).href)
const frame = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(FRAMES, n + '.jpg')).toString('base64')

const co = store.createCompany({ name: 'Northwind Logistics', plan: 'premium', seats: 25 })
const NAMES = {}
const mk = (username, role, name, flow) => {
  const u = store.createManagedUser({ username, password: PW, companyId: co.id, companyRole: role, tier: 'premium' })
  if (flow) store.updateCompanyMember(co.id, u.id, { workFlow: flow })
  store.recordLegalAcceptance(u.id, { method: 'accept' })
  NAMES[u.id] = name
  return u
}
const alex = mk('alex', 'company_admin', 'Alex Morgan')
const maya = mk('maya', 'member', 'Maya Lin', 'mixed')
const priya = mk('priya', 'project_manager', 'Priya Natarajan', 'mixed')
const evelyn = mk('evelyn', 'executive', 'Evelyn Park')
const omar = mk('omar', 'grc', 'Omar Haddad')
const jordan = mk('jordan', 'member', 'Jordan Lee', 'mixed')
const sam = mk('sam', 'member', 'Sam Patel', 'worker')
const elena = mk('elena', 'member', 'Elena Fischer', 'mixed')
// Last, so the Team screenshot (cropped at Jordan Lee) never changes because of it.
const marco = mk('marco', 'project_manager', 'Marco Ruiz', 'mixed')   // a PM WITHOUT the trainer grant (help role check)
store.updateCompanyMember(co.id, maya.id, { grants: ['trainer'] })
store.updateCompanyMember(co.id, priya.id, { grants: ['trainer'] })

// ---- API keys + a webhook FIRST, so the publish/incident events become deliveries.
const k1 = store.createApiKey(alex.id, { name: 'Billing sync (production)', scopes: ['workflows:read', 'incidents:read'], expiresInDays: 90 })
const k2 = store.createApiKey(alex.id, { name: 'Service desk launcher', scopes: ['workflows:read', 'workflows:run'], expiresInDays: 365, ipAllowlist: '203.0.113.0/24' })
const k3 = store.createApiKey(alex.id, { name: 'Old reporting script', scopes: ['brain:query'], expiresInDays: 30 })
store.revokeApiKey(alex.id, k3.key.id)
for (let i = 0; i < 4; i++) store.recordApiKeyUse(k1.key.id, co.id, { route: '/api/v1/workflows' })
store.recordApiKeyUse(k2.key.id, co.id, { route: '/api/v1/launch-links' })
const hook = await store.createWebhook(co.id, alex, { url: 'https://example.com/hooks/workcopilot', events: ['workflow.published', 'workflow.incident.created'], description: 'Service desk ticket sync' })
store.onStoreEvent((type, payload) => { try { store.enqueueWebhookEvent(type, payload) } catch {} })

// ---- Workflows (authored by the trainer Maya) ----
const up = (n) => store.uploadWorkflowFrame(maya.id, frame(n)).ref
const metaRefund = { productName: 'Northwind Billing', title: 'Issue a customer refund', owner: 'Finance operations', launchTarget: 'Billing > Customers', category: 'Finance', durationMin: 6, supportEmail: 'finance-help@northwind.example', prerequisites: 'You need the Refunds role in Northwind Billing.' }
const r1 = up('refund-1'), r2 = up('refund-2'), r3 = up('refund-3'), r4 = up('refund-4')
const refundSteps = [
  { instruction: 'Open Customers and search for the customer by name.', target: 'the Search box at the top of Customers', doneWhen: 'the customer shows in the results', shot: r1 },
  { instruction: 'Open the customer and go to the Invoices tab.', target: 'the Invoices tab', doneWhen: 'the invoice list shows', shot: r2 },
  { instruction: 'Press Refund on the paid invoice, then enter the amount and the reason.', target: 'the Refund button on the invoice row', doneWhen: 'the refund form is filled in', shot: r3 },
  { instruction: 'Press Issue refund and check the confirmation.', target: 'the Issue refund button', doneWhen: 'Refund issued shows at the top of Refunds', shot: r4 },
]
const refundV1 = store.createWorkflow(maya.id, { meta: { ...metaRefund, version: '2026.1' }, steps: refundSteps.slice(0, 3) })
store.publishWorkflow(maya.id, refundV1.id)
const refundV2d = store.reviseWorkflow(maya.id, refundV1.id)
store.updateWorkflow(maya.id, refundV2d.id, { meta: { version: '2026.2' }, steps: refundSteps })
const refund = store.publishWorkflow(maya.id, refundV2d.id)   // retires v1

const po = store.createWorkflow(maya.id, { meta: { productName: 'Northwind ERP', title: 'Raise a purchase order', owner: 'Procurement', launchTarget: 'Purchasing > New order', category: 'Procurement', durationMin: 8 }, steps: [
  { instruction: 'Open Purchasing and choose New order.' }, { instruction: 'Pick the supplier and the cost center.' }, { instruction: 'Add each line with its quantity and unit price.' }, { instruction: 'Attach the quote and send the order for approval.' }, { instruction: 'Check the order shows as Waiting for approval.' },
] })
store.publishWorkflow(maya.id, po.id)
const pw = store.createWorkflow(priya.id, { meta: { productName: 'Customer portal admin', title: "Reset a customer's portal password", owner: 'Service desk', launchTarget: 'Admin > Users', category: 'Support', durationMin: 3 }, steps: [
  { instruction: 'Open Admin, then Users, and find the customer by email.' }, { instruction: 'Choose Send reset link.' }, { instruction: 'Tell the customer the link is valid for one hour.' },
] })
store.publishWorkflow(priya.id, pw.id)
const ship = store.createWorkflow(maya.id, { meta: { productName: 'Northwind TMS', title: 'Book a same-day shipment', owner: 'Dispatch', launchTarget: 'Shipments > New', category: 'Logistics', durationMin: 5 }, steps: [
  { instruction: 'Open Shipments and choose New.' }, { instruction: 'Enter the pickup and delivery addresses.' }, { instruction: 'Choose Same day and book the carrier.' },
] })
store.publishWorkflow(maya.id, ship.id)

const more = [
  ['Northwind HR', 'Request paid time off', 'People team', 'Time off > New request', 'HR', 3, ['Open Time off and choose New request.', 'Pick the dates and the type of leave.', 'Add a note for your manager and submit.']],
  ['Northwind Billing', 'Update a customer billing address', 'Finance operations', 'Billing > Customers', 'Finance', 4, ['Open the customer in Billing.', 'Choose Edit on the billing address.', 'Save and check the next invoice preview.']],
  ['Northwind TMS', 'Print a bill of lading', 'Dispatch', 'Shipments', 'Logistics', 2, ['Open the shipment.', 'Choose Documents, then Bill of lading.', 'Print two copies for the driver.']],
]
for (const [productName, title, owner, launchTarget, category, durationMin, st] of more) {
  const w = store.createWorkflow(priya.id, { meta: { productName, title, owner, launchTarget, category, durationMin }, steps: st.map((instruction) => ({ instruction })) })
  store.publishWorkflow(priya.id, w.id)
}

// A recorded draft with suggestions read from each screenshot (confidence bands).
const c1 = up('carrier-1'), c2 = up('carrier-2'), c3 = up('carrier-3')
const carrier = store.createWorkflow(maya.id, { meta: { productName: 'Northwind TMS', title: 'Add a carrier to a rate table', owner: 'Dispatch', launchTarget: 'Rate tables', category: 'Logistics', durationMin: 4 }, steps: [
  { instruction: 'Open Rate tables and pick the Midwest region.', shot: c1 },
  { instruction: 'Choose New carrier and fill in the name, mode, base rate and fuel surcharge.', shot: c2 },
  { instruction: 'Check the new carrier shows in the rate table.', shot: c3 },
] })
const at = new Date().toISOString()
const cs = carrier.steps
store.saveStepReading(maya.id, carrier.id, cs[0].id, { controlLabel: 'New carrier', controlKind: 'button', doneWhen: 'The New carrier form opens', confidence: 0.92, shot: c1, afterShot: c2, at })
store.saveStepReading(maya.id, carrier.id, cs[1].id, { controlLabel: 'Save carrier', controlKind: 'button', doneWhen: 'A banner says the carrier was added to Midwest', confidence: 0.64, shot: c2, afterShot: c3, at })
store.saveStepReading(maya.id, carrier.id, cs[2].id, { controlLabel: 'Red Oak Logistics row', controlKind: 'other', doneWhen: 'Red Oak Logistics is listed with its base rate', confidence: 0.38, shot: c3, afterShot: null, at })

// ---- Workflow issues (deviations raised while employees ran the refund guide) ----
const ref = { id: refund.id, groupId: refund.groupId, version: refund.version, title: refund.meta.title, mode: 'run' }
const run = (u, title) => { const s = store.createWorkSession(u.id, { title, goal: title }); store.setWorkSessionWorkflowRef(u.id, s.id, ref); return s.id }
const sJ = run(jordan, 'Issue a customer refund'), sE = run(elena, 'Issue a customer refund'), sS = run(sam, 'Issue a customer refund')
const step3 = refundSteps[2].instruction
const inc1 = store.recordWorkflowIncident({ userId: jordan.id, sessionId: sJ, workflowRef: ref, stepIndex: 2, stepText: step3, deviation: { kind: 'untrained_path', why: 'The refund form now asks for a refund method before it can be submitted.', extraStep: 'Under Refund method, choose Original payment method.' }, frameDataUrl: frame('incident-1'), masked: true })
store.recordWorkflowIncident({ userId: elena.id, sessionId: sE, workflowRef: ref, stepIndex: 2, stepText: step3, deviation: { kind: 'untrained_path', why: 'The refund form now asks for a refund method before it can be submitted.', extraStep: 'Under Refund method, choose Original payment method.' } })
store.recordWorkflowIncident({ userId: sam.id, sessionId: sS, workflowRef: ref, stepIndex: 2, stepText: step3, deviation: { kind: 'untrained_path', why: 'The refund form now asks for a refund method before it can be submitted.', extraStep: 'Under Refund method, choose Original payment method.' } })
const inc2 = store.recordWorkflowIncident({ userId: elena.id, sessionId: sE, workflowRef: ref, stepIndex: 3, stepText: refundSteps[3].instruction, deviation: { kind: 'ui_changed', why: 'The Issue refund button is now labeled Submit refund.' } })
const inc3 = store.recordWorkflowIncident({ userId: jordan.id, sessionId: sJ, workflowRef: ref, stepIndex: 0, stepText: refundSteps[0].instruction, deviation: { kind: 'error', why: 'Customers showed "Search is temporarily unavailable".' } })
store.setWorkflowIncidentState(maya.id, inc2.incident.id, { state: 'acknowledged', note: 'Updating step 4 with the new label this week.' })
store.setWorkflowIncidentState(maya.id, inc3.incident.id, { state: 'resolved', note: 'A short outage in Northwind Billing. Nothing to change in the workflow.' })

// ---- Projects, so the exec drill-downs have something to show ----
const T = (title, doneState, extra = {}) => ({ title, goal: title, doneState, ...extra })
const crm = store.createCompanyProject(priya.id, { name: 'Migrate the sales team to the new CRM', goal: 'Move the sales team from the spreadsheet pipeline to the new CRM.', tasks: [T('Export the current pipeline', 'CSV files downloaded'), T('Create the pipeline stages', 'Stages match'), T('Import accounts and contacts', 'Zero skipped rows'), T('Rebuild the weekly report', 'Monday email arrives')] })
const close = store.createCompanyProject(priya.id, { name: 'Run the quarter-end close in the new ledger', goal: 'First quarter-end close in the new ledger.', tasks: [T('Load the chart of accounts', 'All codes exist'), T('Enter the opening balances', 'Trial balance matches'), T('Build the close checklist', 'Every step has an owner')] })
const dallas = store.createCompanyProject(priya.id, { name: 'Onboard the Dallas warehouse onto the scanner app', goal: 'Bring Dallas onto the handheld scanner app.', tasks: [T('Enroll the handheld devices', 'All devices enrolled'), T('Load the bin locations', 'Every bin scans'), T('Train the pickers', 'Every picker did one scan'), T('Retire the paper pick lists', 'No paper for a week')] })
const plan = [[crm, 0, jordan, 'done'], [crm, 1, jordan, 'done'], [crm, 2, elena, 'active'], [crm, 3, sam, null], [close, 0, elena, 'done'], [close, 1, jordan, 'done'], [close, 2, elena, 'done'], [dallas, 0, sam, 'done'], [dallas, 1, jordan, 'active'], [dallas, 2, elena, null]]
for (const [p, i, who] of plan) store.assignProjectTask(priya.id, p.id, p.tasks[i].id, who.id)
for (const [p, i, , st] of plan) {
  if (!st) continue
  store.setWorkProjectTaskState(priya.id, p.id, p.tasks[i].id, 'active')
  if (st === 'done') store.setWorkProjectTaskState(priya.id, p.id, p.tasks[i].id, 'done')
}

// Finished guided tasks (ended sessions), so the exec "by tasks completed" axis has people.
const finished = [[jordan, 6], [elena, 4], [sam, 3], [maya, 2], [priya, 1]]
const tasksDone = ['Reconcile the carrier invoices', 'Update the rate table', 'Close a support ticket', 'Book a same-day shipment', 'Issue a customer refund', 'Raise a purchase order']
for (const [u, n] of finished) for (let i = 0; i < n; i++) { const ss = store.createWorkSession(u.id, { title: tasksDone[i % tasksDone.length], goal: tasksDone[i % tasksDone.length] }); store.endWorkSession(u.id, ss.id) }

// ---- Executive Brain export passphrase ----
store.setExportKey(evelyn.id, process.env.EXPORT_PASS)

// Every queued webhook delivery is marked delivered, so the local server's
// worker never calls out to the network while screenshots are taken.
const dels = store.listWebhookDeliveries(co.id, hook.id || (hook.endpoint && hook.endpoint.id)) || []
const list = Array.isArray(dels) ? dels : (dels.deliveries || [])
list.forEach((d, i) => store.recordWebhookAttempt(d.id, { ok: i !== 1, httpStatus: i !== 1 ? 200 : 503 }))

store.closeStore()
await new Promise((r) => setTimeout(r, 400))
const file = path.join(DIR, 'db.json')
const db = JSON.parse(fs.readFileSync(file, 'utf8'))
for (const u of db.users || []) if (NAMES[u.id]) u.displayName = NAMES[u.id]
// The failed delivery should stay terminal: no retry against the network.
for (const d of db.webhookDeliveries || []) if (d.status === 'pending') { d.status = 'dead'; d.nextAttemptAt = null }
fs.writeFileSync(file, JSON.stringify(db, null, 2))
console.log(JSON.stringify({ company: co.id, refund: refund.id, carrier: carrier.id, inc1: inc1 && inc1.incident.id, hook: hook.id || hook.endpoint?.id, deliveries: list.length, keys: [k1.key.id, k2.key.id] }))
