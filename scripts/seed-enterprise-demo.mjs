// Seed a THROWAWAY WorkCoPilot data dir for verifying the enterprise billing
// consoles in a browser: one company with a monthly pool + overage price, a
// company admin, two members (one with a tight per-user ceiling and some usage,
// so the meters and alerts have something to show), and one pending hours
// request. Never run this against a real data dir: it refuses to run unless
// WORK_DATA_DIR is set, and it creates accounts.
//
// Usage:
//   WORK_DATA_DIR=<throwaway dir> WORK_MFA_DISABLED=1 WORK_ADMIN_PASSWORD=<pw> SEED_PASSWORD=<pw> \
//     node scripts/seed-enterprise-demo.mjs
// Then start the server with the SAME env (+ PORT) and sign in as:
//   superadmin    -> admin / $WORK_ADMIN_PASSWORD   (console: /workadmin)
//   company admin -> nw_admin / $SEED_PASSWORD      (console: /work/company)
//   members       -> nw_jordan, nw_sam / $SEED_PASSWORD
import { pathToFileURL } from 'node:url'

if (!process.env.WORK_DATA_DIR) { console.error('set WORK_DATA_DIR to a throwaway dir first'); process.exit(1) }
const password = process.env.SEED_PASSWORD
if (!password || password.length < 8) { console.error('set SEED_PASSWORD (8+ chars) for the seeded accounts'); process.exit(1) }
const store = await import(pathToFileURL(new URL('../server/store.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).href)

const co = store.createCompany({ name: 'Northwind Logistics', plan: 'advanced', seats: 25 })
const admin = store.createManagedUser({ username: 'nw_admin', password, companyId: co.id, companyRole: 'company_admin', tier: 'advanced', displayName: 'Alex Morgan' })
const m1 = store.createManagedUser({ username: 'nw_jordan', password, companyId: co.id, companyRole: 'member', tier: 'advanced', displayName: 'Jordan Lee' })
const m2 = store.createManagedUser({ username: 'nw_sam', password, companyId: co.id, companyRole: 'member', tier: 'advanced', displayName: 'Sam Patel' })

// AdmireVeda sets the pool: 100 h / month, $12/h overage, forfeit at month end.
store.setCompanyEnterprise(co.id, { poolHours: 100, overageUsdPerHour: 12, monthEnd: 'forfeit', timezone: 'America/New_York', notifyPct: 75, requestsEnabled: true })
// The company admin tightens the member group to 2 h/day and 3 tasks/day, and
// gives Jordan a personal 0.5 h/day ceiling that is already mostly used.
store.setCompanyAllocation(co.id, { groups: { member: { hours: { day: 2 }, tasks: { day: 3 } } }, taskPolicy: { mode: 'unlimited' } })
store.setUserAllocation(co.id, m1.id, { group: 'member', alloc: { hours: { day: 0.5 } } })
for (let i = 0; i < 25; i++) store.addWorkUsage(m1.id, 60)     // 25 min of 30 -> 83% -> company-admin alert
for (let i = 0; i < 8; i++) store.addWorkUsage(m2.id, 60)
store.startWorkTask(m2.id)
// A pending additional-hours request for the superadmin to decide.
store.requestCompanyHours(co.id, admin.id, { hours: 40, note: 'Quarter-end close' })

// An INDIVIDUAL subscriber on Basic (60 h a month, 4 tasks a day) with some of
// this month's hours used, two tasks started today, and a one-hour top-up, so the
// personal dashboard's plan box, meters and task counter have something to show.
const solo = store.createWorkUser({ username: 'solo_dev', password, displayName: 'Riley Chen' })
store.setWorkTier(solo.id, 'basic')
for (let i = 0; i < 95; i++) store.addWorkUsage(solo.id, 60)   // 1 h 35 min of the 60 h
store.startWorkTask(solo.id); store.startWorkTask(solo.id)
store.grantWorkPurchasedSeconds(solo.id, 3600)

console.log(JSON.stringify({ companyId: co.id, admin: admin.username, members: [m1.username, m2.username], individual: solo.username }))
