// doc_layout: snapshot <-> rows must round-trip exactly (key order included),
// and a save must write only what changed. Pure, no database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { toLayout, fromRows, layoutFromRows, diffLayout, isEmptyDiff } from './doc_layout.js'

const rowsOf = (layout) => ({
  collections: [...layout.collections].map(([name, c]) => ({ name, ...c })),
  records: [...layout.records.values()],
})
const roundTrip = (snap) => { const r = rowsOf(toLayout(snap)); return fromRows(r.collections, r.records) }
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b))

test('a store-shaped snapshot round-trips exactly, key order included', () => {
  const snap = {
    users: [{ id: '1', username: 'admin', role: 'superadmin' }, { id: '7', username: 'b' }],
    seq: 9,
    sessionSecret: 'enc:v1:abc',
    sessions: {},
    ai: { activeProvider: null, systemPrompt: 'x', providers: { zeta: { apiKey: 'enc:v1:z' }, alpha: { apiKey: 'enc:v1:a' } } },
    workUsage: { '1:2026-10-30': { usedSeconds: 5 }, '7:2026-10-29': { usedSeconds: 1 } },
    leads: [],
    practiceStats: { '10': { offered: 1 }, b: 2, '2': 3 },
    nothing: null,
    flag: false,
    text: 'line\nwith "quotes" and \u0000 and emoji \u{1F600}',
  }
  same(roundTrip(snap), snap)
})

test('arrays without usable ids keep order by index, mixed shapes included', () => {
  for (const arr of [[1, 2, 3], [{ a: 1 }, { a: 2 }], [{ id: 'x' }, { id: 'x' }], [{ id: '#1' }], [{ id: '' }], [null, 'a', [1]], [{ id: 1 }, { id: '1' }]]) {
    same(roundTrip({ arr }), { arr })
  }
})

test('random snapshots round-trip (property check)', () => {
  let seed = 42
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const val = (d) => {
    const r = rnd()
    if (d > 3 || r < 0.3) return [null, true, 0, -1.5, 'só', ''][Math.floor(rnd() * 6)]
    if (r < 0.6) return Array.from({ length: Math.floor(rnd() * 4) }, (_, i) => (rnd() < 0.5 ? { id: 'k' + i, v: val(d + 1) } : val(d + 1)))
    const o = {}; for (let i = 0; i < Math.floor(rnd() * 4); i++) o[rnd() < 0.3 ? String(i) : 'k' + Math.floor(rnd() * 9)] = val(d + 1); return o
  }
  for (let n = 0; n < 300; n++) {
    const snap = {}; for (let i = 0; i < 1 + Math.floor(rnd() * 5); i++) snap['c' + i] = val(0)
    same(roundTrip(snap), snap)
  }
})

test('the diff writes only what changed', () => {
  const a = { users: [{ id: '1', n: 'a' }, { id: '2', n: 'b' }, { id: '3', n: 'c' }], seq: 3, ai: { p: 1, q: 2 } }
  const la = toLayout(a)
  assert.ok(isEmptyDiff(diffLayout(la, toLayout(structuredClone(a)))), 'an unchanged snapshot writes nothing')

  const b = structuredClone(a); b.users[1].n = 'B'
  let d = diffLayout(la, toLayout(b))
  assert.deepEqual(d.upsertRecords.map((r) => r.rid), ['2'])
  assert.equal(d.deleteRecords.length + d.upsertCollections.length + d.deleteCollections.length, 0)

  const c = structuredClone(a); c.users.push({ id: '4', n: 'd' }); c.seq = 4
  d = diffLayout(la, toLayout(c))
  assert.deepEqual(d.upsertRecords.map((r) => `${r.collection}/${r.rid}`).sort(), ['seq/', 'users/4'])

  const e = structuredClone(a); e.users.splice(0, 1); delete e.ai.q
  d = diffLayout(la, toLayout(e))
  assert.deepEqual(d.deleteRecords.map((r) => `${r.collection}/${r.rid}`).sort(), ['ai/q', 'users/1'])
  // The remaining users moved up one position: a move, their documents are not re-sent.
  assert.deepEqual(d.upsertRecords, [])
  assert.deepEqual(d.moveRecords.map((r) => r.rid).sort(), ['2', '3'])

  const f = structuredClone(a); delete f.ai; f.extra = []
  d = diffLayout(la, toLayout(f))
  assert.deepEqual(d.deleteCollections, ['ai'])
  assert.deepEqual(d.upsertCollections.map((x) => x.name), ['extra'])
})

test('layoutFromRows equals toLayout for what was written', () => {
  const snap = { users: [{ id: 'u1' }], m: { a: 1 }, v: 3 }
  const lay = toLayout(snap)
  const r = rowsOf(lay)
  assert.ok(isEmptyDiff(diffLayout(layoutFromRows(r.collections, r.records), lay)))
})

test('stored rows that do not fit the layout stop the load', () => {
  assert.throws(() => fromRows([{ name: 'a', kind: 'weird', pos: 0 }], []), /unknown kind/)
  assert.throws(() => fromRows([], [{ collection: 'ghost', rid: '', pos: 0, doc: '1' }]), /unknown collections: ghost/)
  assert.throws(() => fromRows([{ name: 'v', kind: 'value', pos: 0 }], []), /expected 1/)
  assert.throws(() => fromRows([{ name: 'a', kind: 'array', pos: 0 }], [{ collection: 'a', rid: '#0', pos: 0, doc: '{bad' }]), /not valid JSON/)
  assert.throws(() => toLayout([]), /plain object/)
})

test('keys a text column cannot hold, and __proto__, round-trip as own keys', () => {
  const snap = JSON.parse(String.raw`{"__proto__":{"x":1},"m":{"__proto__":2,"a\u0000b":3,"lone\ud800":4,"~json:literal":5,"ok":6},"n\u0000ame":[1]}`)
  const back = roundTrip(snap)
  same(back, snap)
  assert.ok(Object.hasOwn(back, '__proto__') && Object.hasOwn(back.m, '__proto__'), 'own keys, not prototypes')
  assert.equal(Object.getPrototypeOf(back), Object.prototype)
  const rids = [...toLayout(snap).records.values()].map((r) => r.collection + '/' + r.rid)
  assert.ok(rids.every((k) => !k.includes('\u0000') && !/[\ud800-\udfff]/.test(k)), 'stored names and rids are text-safe')
})

test('an unshift moves the others without re-sending their documents', () => {
  const a = { log: [{ id: 'a', t: 1 }, { id: 'b', t: 2 }] }
  const b = { log: [{ id: 'z', t: 0 }, ...a.log] }
  const d = diffLayout(toLayout(a), toLayout(b))
  assert.deepEqual(d.upsertRecords.map((r) => r.rid), ['z'])
  assert.deepEqual(d.moveRecords.map((r) => `${r.rid}@${r.pos}`), ['a@1', 'b@2'])
})
