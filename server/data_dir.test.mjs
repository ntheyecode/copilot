// Gate: a test can never open the real server/data. The resolver hands the Node
// test runner a temp dir when WORK_DATA_DIR is unset, and no module may compute
// its own default data dir again (that is how the two leaking tests slipped by).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDataDir, DEFAULT_DATA_DIR } from './data_dir.js'

const SERVER = path.dirname(fileURLToPath(import.meta.url))

test('WORK_DATA_DIR wins; outside the test runner the default is server/data', () => {
  assert.equal(resolveDataDir({ WORK_DATA_DIR: '/x/y' }), '/x/y')
  assert.equal(resolveDataDir({}), DEFAULT_DATA_DIR)
  assert.equal(DEFAULT_DATA_DIR, path.join(SERVER, 'data'))
})

test('under the test runner with no WORK_DATA_DIR, a fresh temp dir is assigned and written back', () => {
  const env = { NODE_TEST_CONTEXT: 'child-v8' }
  const dir = resolveDataDir(env)
  assert.notEqual(dir, DEFAULT_DATA_DIR)
  assert.ok(fs.existsSync(dir))
  assert.equal(env.WORK_DATA_DIR, dir, 'every later module in the process agrees')
  assert.equal(resolveDataDir(env), dir)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('no server module computes its own default data dir (one resolver only)', () => {
  const offenders = []
  for (const f of fs.readdirSync(SERVER)) {
    if (!f.endsWith('.js') || f === 'data_dir.js') continue
    const src = fs.readFileSync(path.join(SERVER, f), 'utf8')
    if (/^[^/\n]*path\.join\(\s*__dirname\s*,\s*['"]data['"]\s*\)/m.test(src)) offenders.push(f)
  }
  assert.deepEqual(offenders, [], `use resolveDataDir() from data_dir.js in: ${offenders.join(', ')}`)
})
