// Error-disclosure tests (audit IP-18). Proves that:
//  (a) redactIncidentText (store.js) strips secrets, emails and PEM blocks before
//      an incident message is stored for the superadmin feed, and
//  (b) the USER-facing error path (sendWorkError in index.js) returns a generic
//      "system is busy" message and never leaks stack traces, absolute paths,
//      provider/model names or secrets, while the REAL cause goes (redacted) to
//      the incident feed only.
//
// Import strategy:
//  - redactIncidentText is a real export of store.js, imported directly. store.js
//    runs load()+seed() on import, so WORK_DATA_DIR is pointed at a temp dir FIRST
//    (same pattern as the other server/*.test.mjs files) and never touches live data.
//  - sendWorkError / isSystemError are NOT exported from index.js (it is the server
//    entrypoint: importing it would start app.listen and the whole stack, and we
//    were told not to refactor it). Instead we extract the two function declarations
//    VERBATIM from index.js source and instantiate them against a fake `store`
//    whose recordWorkIncident is the REAL redactIncidentText -> real store shape.
//    This tests the actual shipped code, not a copy. If index.js ever renames or
//    reshapes those functions, the extraction fails loudly (see "contract" test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-errdisc-'))
const { redactIncidentText } = await import('./store.js')

const here = path.dirname(fileURLToPath(import.meta.url))

// ---- obviously-fake fixtures ----------------------------------------------
const FAKE_SK = 'sk-test-ABCDEF0123456789'
const FAKE_AKIA = 'AKIA' + '0000EXAMPLE00000'.slice(0, 16) // AKIA + 16 chars
const FAKE_GH = 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4'
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.SflKxwRJSMeKKF2QT4fw'
const FAKE_PEM = '-----BEGIN PRIVATE KEY-----\nMIIFAKEFAKEFAKE0000\n-----END PRIVATE KEY-----'
const FAKE_EMAIL = 'jane.doe@example.com'

// ---- (a) redactIncidentText ------------------------------------------------
test('AKIA fixture is AKIA + 16 chars', () => {
  assert.equal(FAKE_AKIA.length, 20)
})

test('redactIncidentText strips API-key shaped secrets', () => {
  for (const secret of [FAKE_SK, FAKE_AKIA, FAKE_GH, FAKE_JWT]) {
    const out = redactIncidentText(`upstream said: bad key ${secret} for request`)
    assert.ok(!out.includes(secret), `secret leaked: ${secret} -> ${out}`)
    assert.ok(out.includes('[redacted-secret]'), `no marker for ${secret}: ${out}`)
  }
})

test('redactIncidentText strips emails', () => {
  const out = redactIncidentText(`quota exceeded for ${FAKE_EMAIL}`)
  assert.ok(!out.includes(FAKE_EMAIL))
  assert.ok(out.includes('[redacted-email]'))
})

// Regression guard: the whole PEM block (header, base64 body, and END line) must
// be redacted, not just the BEGIN header. (The redactor previously matched only
// the BEGIN header line and left the key body in the stored message; fixed by
// matching lazily through the END line. This test is the guard against that
// regression returning.)
test('redactIncidentText strips whole PEM blocks incl. key body', () => {
  const out = redactIncidentText(`config dump: ${FAKE_PEM} end`)
  assert.ok(!out.includes('MIIFAKE'), out)
  assert.ok(!out.includes('BEGIN PRIVATE KEY'), out)
  assert.ok(out.includes('[redacted-key]'))
})

test('redactIncidentText strips key=value credentials', () => {
  const out = redactIncidentText('request failed password=hunter2 api_key: zzz-fake-value Authorization: Bearer')
  assert.ok(!out.includes('hunter2'))
  assert.ok(!out.includes('zzz-fake-value'))
})

test('redactIncidentText handles a combined message and non-string input', () => {
  const out = redactIncidentText(`${FAKE_SK} ${FAKE_AKIA} ${FAKE_GH} ${FAKE_JWT} ${FAKE_EMAIL} ${FAKE_PEM}`)
  for (const s of [FAKE_SK, FAKE_AKIA, FAKE_GH, FAKE_JWT, FAKE_EMAIL]) assert.ok(!out.includes(s), `leaked ${s}`)
  assert.equal(redactIncidentText(null), '')
  assert.equal(redactIncidentText(undefined), '')
})

test('redactIncidentText leaves harmless text alone', () => {
  assert.equal(redactIncidentText('timeout after 30s'), 'timeout after 30s')
})

// ---- (b) user-facing error path -------------------------------------------
// Pull the shipped declarations out of index.js and bind them to a fake store.
function loadErrorPath() {
  const src = fs.readFileSync(path.join(here, 'index.js'), 'utf8')
  const start = src.indexOf('function isSystemError(')
  const endMarker = 'const wrap = '
  const end = src.indexOf(endMarker, start)
  assert.ok(start > -1 && end > start, 'could not locate isSystemError/sendWorkError in index.js (renamed or moved?)')
  const body = src.slice(start, end)
  assert.ok(/function sendWorkError\s*\(res, e, req\)/.test(body), 'sendWorkError signature changed in index.js')
  const incidents = []
  const fakeStore = {
    // Mirror the real store: message goes through the real redactor, then is capped.
    recordWorkIncident: (inc) => incidents.push({ ...inc, message: redactIncidentText(inc.message).slice(0, 1000) }),
  }
  const factory = new Function('store', `${body}\nreturn { isSystemError, sendWorkError }`)
  return { ...factory(fakeStore), incidents }
}

function fakeRes() {
  const r = { statusCode: null, body: null }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  return r
}
const fakeReq = { workUser: { id: 'u1', username: 'tester', companyId: null }, params: { id: 's1' }, path: '/api/work/sessions/s1/step' }

// Things that must NEVER appear in anything a user can see.
const FORBIDDEN_IN_USER_OUTPUT = [
  /D:\\/i, /C:\\/i, /\/opt\//, /\/home\//, /node_modules/, /\.js:\d+/, /\.mjs:\d+/, /\bat\s+\S+\s+\(/, // stack frames / paths
  /openai/i, /anthropic/i, /gemini/i, /groq/i, /gpt-?\d/i, /claude/i, /llama/i, /mistral/i,       // provider / model names
  /sk-test-/, /AKIA/, /ghp_/, /eyJ[A-Za-z0-9_-]{10,}/, /BEGIN/, /@example\.com/,                    // secrets / PII
]
function assertUserSafe(res) {
  const wire = JSON.stringify(res.body)
  for (const re of FORBIDDEN_IN_USER_OUTPUT) assert.ok(!re.test(wire), `user response leaked ${re}: ${wire}`)
}

test('contract: sendWorkError / isSystemError are present in index.js', () => {
  const { sendWorkError, isSystemError } = loadErrorPath()
  assert.equal(typeof sendWorkError, 'function')
  assert.equal(typeof isSystemError, 'function')
})

test('unexpected throw with stack, path, provider and secret -> generic 503, nothing leaked', () => {
  const { sendWorkError, incidents } = loadErrorPath()
  const e = new Error(`OpenAI gpt-4o call failed for ${FAKE_EMAIL} key ${FAKE_SK} at D:\\RadarOps\\copilot\\server\\ai.js:412`)
  e.stack = `Error: boom\n    at callProvider (/opt/workcopilot/server/ai.js:412:9)\n    at D:\\RadarOps\\copilot\\server\\index.js:900:5\n${FAKE_SK}`
  const res = fakeRes()
  sendWorkError(res, e, fakeReq)
  assert.equal(res.statusCode, 503)
  assert.equal(res.body.busy, true)
  assert.match(res.body.error, /system is busy/i)
  assertUserSafe(res)
  assert.ok(!('stack' in res.body))
  // The incident feed got the cause, but REDACTED (no key, no email).
  assert.equal(incidents.length, 1)
  assert.ok(!incidents[0].message.includes(FAKE_SK))
  assert.ok(!incidents[0].message.includes(FAKE_EMAIL))
  assert.equal(incidents[0].kind, 'system_error')
})

test('AI-layer failure (e.ai) is hidden behind the generic message and recorded as ai_error', () => {
  const { sendWorkError, incidents } = loadErrorPath()
  const e = Object.assign(new Error(`Anthropic claude-sonnet 401 invalid x-api-key ${FAKE_SK}`), { ai: true, status: 401, code: 'AI_KEY' })
  const res = fakeRes()
  sendWorkError(res, e, fakeReq)
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /system is busy/i)
  assert.match(res.body.error, /ref AI_KEY/) // opaque code only
  assertUserSafe(res)
  assert.equal(incidents[0].kind, 'ai_error')
  assert.ok(!incidents[0].message.includes(FAKE_SK))
})

test('429 and 5xx are system errors (generic 503); 429 adds only a wait hint', () => {
  const { sendWorkError, isSystemError } = loadErrorPath()
  assert.equal(isSystemError(Object.assign(new Error('x'), { status: 429 })), true)
  assert.equal(isSystemError(Object.assign(new Error('x'), { status: 502 })), true)
  assert.equal(isSystemError(null), true)
  const res = fakeRes()
  sendWorkError(res, Object.assign(new Error('rate limited by groq llama-3 at /opt/app/ai.js:1'), { status: 429 }), fakeReq)
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /few minutes/i)
  assertUserSafe(res)
})

test('error with no message/status still returns a generic response', () => {
  const { sendWorkError } = loadErrorPath()
  const res = fakeRes()
  sendWorkError(res, undefined, undefined)
  assert.equal(res.statusCode, 503)
  assert.match(res.body.error, /system is busy/i)
  assertUserSafe(res)
})

test('deliberate actionable 4xx passes through with its own safe message', () => {
  const { sendWorkError, isSystemError, incidents } = loadErrorPath()
  const e = Object.assign(new Error('Add a goal first'), { status: 400 })
  assert.equal(isSystemError(e), false)
  const res = fakeRes()
  sendWorkError(res, e, fakeReq)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.error, 'Add a goal first')
  assert.equal(incidents.length, 0) // not an incident
})
