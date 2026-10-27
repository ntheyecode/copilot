// HTTP end-to-end for the NEW TASK gate on POST /api/work/sessions (the model of
// 2026-10-27: hours are the only usage limit; up to WORK_MAX_OPEN_TASKS tasks may
// be open at once). Boots the real Express app on an ephemeral port and asserts
// the RESPONSE BODY the client reads, not just the store's thrown error, because
// the route must forward the coded flags for the app to show the right message:
//   409 tooManyOpen  + maxOpen + open      (5th task while 4 are open)
//   402 outOfHours   + resetLabel          (no guided hours left; fires from the
//                                           requireWorkTime gate before startWorkTask,
//                                           so both gates must carry the SAME flag)
// The retired flags (mustCompleteCurrent, taskLimit for individuals, a daily
// reset in the copy) must never come back on an individual's response.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-taskgate-'))
process.env.PORT = '0'
process.env.WORK_MFA_DISABLED = '1'
process.env.SESSION_SECRET = 'task-gate-e2e-secret'

const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  const u = String(url)
  if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) return realFetch(url, opts)
  return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } })
}

const relative = (f) => 'file://' + path.join(here, f).replace(/\\/g, '/')
const index = await import(relative('index.js'))
const store = await import(relative('store.js'))

const srv = await new Promise((resolve) => { const s = index.app.listen(0, () => resolve(s)) })
const base = `http://127.0.0.1:${srv.address().port}`
after(() => { globalThis.fetch = realFetch; try { srv.closeAllConnections?.() } catch {} return new Promise((r) => srv.close(r)) })

function jar() { return { map: {} } }
async function req(j, method, p, body) {
  const headers = { 'content-type': 'application/json' }
  const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) headers.cookie = cookie
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  for (const c of sc) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}
const uniq = (p) => p + Math.random().toString(36).slice(2, 8)
const PW = 'Passw0rd!solo'

async function individual() {
  const u = store.createWorkUser({ username: uniq('solo_'), password: PW, displayName: 'Solo Tester' })
  store.setWorkTier(u.id, 'basic')
  store.recordLegalAcceptance(u.id, { method: 'test' })
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username: u.username, password: PW })
  assert.equal(r.status, 200, 'individual signs in')
  return { u, j }
}
const start = (j, n) => req(j, 'POST', '/api/work/sessions', { title: `Task ${n}`, goal: `Write the status report number ${n}` })

test('open-task cap: 4 tasks start, the 5th is 409 tooManyOpen with maxOpen/open; finishing one frees a slot', async () => {
  const { u, j } = await individual()
  const ids = []
  for (let n = 1; n <= 4; n++) {
    const r = await start(j, n)
    assert.equal(r.status, 200, `task ${n} starts`)
    ids.push(r.data.session.id)
    assert.equal(r.data.taskUsage.maxOpen, 4, 'the response carries the open-slot shape')
    assert.equal(r.data.taskUsage.open, n)
    assert.equal('usedToday' in r.data.taskUsage, false, 'no per-day field on an individual')
  }
  const fifth = await start(j, 5)
  assert.equal(fifth.status, 409)
  assert.equal(fifth.data.tooManyOpen, true, 'the route forwards the tooManyOpen flag')
  assert.equal(fifth.data.maxOpen, 4)
  assert.equal(fifth.data.open, 4)
  assert.equal('mustCompleteCurrent' in fifth.data, false, 'retired flag never returns')
  assert.equal('taskLimit' in fifth.data, false, 'company-only flag never on an individual')
  assert.doesNotMatch(String(fifth.data.error), /today|reset/i, 'no daily-reset wording: slots free when a task is finished')
  // Usage snapshot agrees with the gate (what the pill / meters read).
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.tasks.open, 4); assert.equal(usage.tasks.remaining, 0); assert.equal(usage.tasks.maxOpen, 4)
  // Finish one -> a slot frees -> the next start succeeds.
  store.endWorkSession(u.id, ids[0])
  const again = await start(j, 6)
  assert.equal(again.status, 200, 'a freed slot lets the next task start')
  assert.equal(again.data.taskUsage.open, 4)
})

test('out of hours: 402 outOfHours with resetLabel, no daily-reset wording, and the flag is identical on both gates', async () => {
  const { u, j } = await individual()
  // Empty this month's plan pool through the real admin path: a superadmin
  // change to a tier's monthly hours reaches every live pool at once as a delta
  // (never below zero), so basic -> 0 h leaves this person with no guided time.
  // (A heartbeat drain would take thousands of 60 s calls and idle the keep-alive
  // socket past the server's timeout.) Restored at the end for the next test.
  const before = store.getWorkPricing().hoursMonthly.basic
  try {
    store.setWorkPricing({ hoursMonthly: { basic: 0 } })
    const usage = store.getWorkUsage(u.id)
    assert.equal(usage.exhausted, true, 'the pool is empty')
    // The route: requireWorkTime fires first and must speak the same flag.
    const r = await start(j, 1)
    assert.equal(r.status, 402)
    assert.equal(r.data.outOfHours, true, 'the middleware carries outOfHours')
    assert.ok(r.data.resetLabel, 'the renewal label is attached')
    assert.doesNotMatch(String(r.data.error), /for today|resets at/i, 'monthly model: no daily reset in the copy')
    assert.match(String(r.data.error), /renew/i, 'says when the hours renew')
    // The store gate (defense in depth) throws the same flag.
    assert.throws(() => store.startWorkTask(u.id), (e) => e.status === 402 && e.outOfHours === true && !!e.resetLabel)
  } finally {
    store.setWorkPricing({ hoursMonthly: { basic: before } })
  }
})

test('company member without a ceiling keeps the unlimited shape and starts freely', async () => {
  const co = store.createCompany({ name: 'Slots Inc', plan: 'premium' })
  const pw = 'Passw0rd!member'
  const m = store.createManagedUser({ username: uniq('slots_member_'), password: pw, companyId: co.id, companyRole: 'member', tier: 'basic' })
  store.recordLegalAcceptance(m.id, { method: 'test' })
  const j = jar()
  const r0 = await req(j, 'POST', '/api/work/login', { username: m.username, password: pw })
  assert.equal(r0.status, 200)
  const tu = store.getWorkTaskUsage(m.id)
  assert.equal(tu.unlimited, true)
  assert.equal('maxOpen' in tu, false, 'company users keep the windowed shape, not the open-slot one')
  for (let n = 1; n <= 5; n++) {
    const r = await start(j, n)
    assert.ok(r.status === 200 || (r.status === 402 && r.data.trialExhausted), `company member start ${n}: ${r.status} ${JSON.stringify(r.data)}`)
    if (r.status === 402) break   // the company free-trial pool is a separate, honest gate
    assert.equal(r.data.taskUsage.unlimited, true)
  }
})
