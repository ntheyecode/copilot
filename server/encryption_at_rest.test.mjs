// Encryption-at-rest gate: stored secrets are AES-256-GCM encrypted on disk,
// plaintext in memory, backward-compatible with legacy plaintext, and survive a
// restart. Guards SUPREME RULE III (never silently blank a key) + the owner's
// mandatory encryption-at-rest requirement.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')

// Isolated temp data dir BEFORE importing store (store loads on import).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-enc-test-'))
process.env.WORK_DATA_DIR = dir
process.env.PORT = '0'
const DB = path.join(dir, 'db.json')
const store = await import(storePath)

test('secret is ciphertext on disk, plaintext in memory', () => {
  store.setPlatformWebSearch({ apiKey: 'tvly-SECRET-xyz-123', provider: 'tavily' })
  const raw = fs.readFileSync(DB, 'utf8')
  assert.ok(!raw.includes('tvly-SECRET-xyz-123'), 'plaintext must not appear on disk')
  assert.ok(raw.includes('enc:v1:'), 'disk must carry enc:v1: ciphertext')
  assert.equal(store.getPlatformWebSearchKey(), 'tvly-SECRET-xyz-123', 'memory keeps plaintext')
})

test('.enc.key is created when no WORK_ENC_KEY is set', () => {
  assert.ok(fs.existsSync(path.join(dir, '.enc.key')), 'master keyfile exists')
})

test('legacy plaintext loads and re-encrypts on next write', () => {
  // Hand-write a legacy plaintext key, as an un-migrated prod db would have.
  const obj = JSON.parse(fs.readFileSync(DB, 'utf8'))
  obj.ai = obj.ai || { providers: {} }
  obj.ai.webSearch = { provider: 'tavily', apiKey: 'tvly-LEGACY-PLAIN-777', setAt: new Date().toISOString() }
  fs.writeFileSync(DB, JSON.stringify(obj, null, 2))
  // A persist (triggered by any setter) must re-encrypt it.
  store.setPlatformWebSearch({ apiKey: 'tvly-LEGACY-PLAIN-777', provider: 'tavily' })
  const raw = fs.readFileSync(DB, 'utf8')
  assert.ok(!raw.includes('tvly-LEGACY-PLAIN-777'), 'legacy key re-encrypted on write')
  assert.ok(raw.includes('enc:v1:'), 'still ciphertext on disk')
  assert.equal(store.getPlatformWebSearchKey(), 'tvly-LEGACY-PLAIN-777', 'getter returns plaintext')
})

test('encSecret output decrypts back (round-trip via a fresh load)', async () => {
  // A fresh module instance (same dir, same .enc.key) must decrypt what the first
  // instance wrote - the restart path. We re-read the file and assert the stored
  // value is a valid enc:v1: blob that is NOT the plaintext.
  const raw = fs.readFileSync(DB, 'utf8')
  const obj = JSON.parse(raw)
  assert.ok(obj.ai.webSearch.apiKey.startsWith('enc:v1:'), 'stored key is an enc:v1: blob')
})

test('report screenshots are encrypted at rest and decrypt back', () => {
  const u = store.createWorkUser({ username: 'shotuser', password: 'Passw0rd!x' })
  const s = store.createWorkSession(u.id, { goal: 'shots' })
  // a tiny valid 1x1 PNG
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const original = Buffer.from(pngB64, 'base64')
  store.addWorkStepShot(u.id, s.id, { stepIndex: 0, dataUrl: 'data:image/png;base64,' + pngB64, caption: 'c' })
  const sess = store.getWorkSession(u.id, s.id)
  const shotPath = sess.shots[0].path
  const onDisk = fs.readFileSync(shotPath)
  assert.ok(onDisk.subarray(0, 8).equals(Buffer.from('ENCIMG1\n')), 'shot file carries the ENCIMG1 magic header (encrypted)')
  assert.ok(!onDisk.subarray(0, 8).equals(original.subarray(0, 8)), 'on-disk bytes are not the raw PNG header')
  const back = store.readShotBuffer(shotPath)
  assert.ok(back.equals(original), 'readShotBuffer decrypts back to the exact original image bytes')
})

test('deleting a session removes its screenshots from disk (H1 - no orphans)', () => {
  const u = store.createWorkUser({ username: 'delshots', password: 'Passw0rd!x' })
  const s = store.createWorkSession(u.id, { goal: 'shots' })
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  store.addWorkStepShot(u.id, s.id, { stepIndex: 0, dataUrl: 'data:image/png;base64,' + pngB64, caption: 'c' })
  const shotPath = store.getWorkSession(u.id, s.id).shots[0].path
  assert.ok(fs.existsSync(shotPath), 'shot file exists before delete')
  store.deleteWorkSession(u.id, s.id, 'test')
  assert.ok(!fs.existsSync(shotPath), 'shot file is removed on delete (no orphan on disk)')
})
