// The store writes each secret's ciphertext once and keeps it while the secret
// is unchanged (so a save does not rewrite every record that holds a key), but
// two fields holding the same secret never share a ciphertext. Runs the real
// store on the default json driver in a temp data dir.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-cipher-'))
process.env.WORK_DATA_DIR = dataDir
process.env.PORT = '0'
const store = await import('../store.js')
after(() => { try { fs.rmSync(dataDir, { recursive: true, force: true }) } catch { /* best effort */ } })

const KEY = 'sk-same-key-for-both-' + Math.random().toString(36).slice(2)
const keysOnDisk = () => {
  const d = JSON.parse(fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8'))
  return d.companies.map((c) => (c.companyAi && c.companyAi.apiKey) || null)
}

test('the same secret in two fields is stored under two different ciphertexts', () => {
  const a = store.createCompany({ name: 'Cipher A' })
  const b = store.createCompany({ name: 'Cipher B' })
  store.setCompanyAiKeys(a.id, { providerId: 'openai', apiKey: KEY })
  store.setCompanyAiKeys(b.id, { providerId: 'openai', apiKey: KEY })
  const [ka, kb] = keysOnDisk()
  assert.match(ka, /^enc:v1:/)
  assert.match(kb, /^enc:v1:/)
  assert.notEqual(ka, kb, 'equal secrets must not be visible as equal on disk')
  assert.ok(!fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8').includes(KEY))
})

test('an unrelated save keeps both ciphertexts as they are; changing one key changes only that one', () => {
  const before = keysOnDisk()
  store.createWorkUser({ username: 'cipher-unrelated', password: 'Passw0rd!x' })
  assert.deepEqual(keysOnDisk(), before)
  const b = store.listCompanies().find((c) => c.name === 'Cipher B')
  store.setCompanyAiKeys(b.id, { providerId: 'openai', apiKey: KEY + '-rotated' })
  const now = keysOnDisk()
  assert.equal(now[0], before[0])
  assert.notEqual(now[1], before[1])
})
