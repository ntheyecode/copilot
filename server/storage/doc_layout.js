// How the in-memory store snapshot maps onto SQL rows, and back. Pure.
//
// The store keeps one object `db` whose top-level keys are collections:
// arrays (users, companies, workSessions...), maps or config objects (ai,
// billing, workUsage...), and plain values (seq, sessionSecret). Each one
// becomes a row in `collections` (name, kind, pos) and its members become rows
// in `records` (collection, rid, pos, doc):
//
//   array  -> one record per element. rid = the element's id when every element
//             is an object with a distinct non-empty id; otherwise rid = '#<index>'.
//   object -> one record per own key (rid = the key).
//   value  -> one record (rid = '').
//
// `pos` keeps array order and object key order, so a snapshot read back is
// identical, key order included (JSON.stringify of the result matches the
// input). `doc` is the member serialized with JSON.stringify.
//
// Names and rids go into text columns, which cannot hold U+0000 and would
// silently replace a lone surrogate. Such a key is stored as '~json:' plus its
// JSON encoding (plain ASCII); a key that itself starts with '~json:' is
// encoded too, so decoding is never ambiguous.
//
// Saving writes only what changed since the last successful save or load:
// diffLayout compares two layouts and returns the rows to upsert, move (same
// doc, new position: no doc is re-sent) and delete.

const KEY_SEP = '\u0000'
export const recordKey = (collection, rid) => collection + KEY_SEP + rid

const ENC = '~json:'
const UNSAFE = /[\u0000]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
export const encodeKey = (k) => (k.startsWith(ENC) || UNSAFE.test(k) ? ENC + JSON.stringify(k) : k)
export const decodeKey = (k) => (k.startsWith(ENC) ? JSON.parse(k.slice(ENC.length)) : k)

// Own property, even for "__proto__" (plain assignment would set the prototype
// instead and the key would vanish), matching what JSON.parse produces.
const setOwn = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true })

function kindOf(v) {
  if (Array.isArray(v)) return 'array'
  if (v !== null && typeof v === 'object') return 'object'
  return 'value'
}

function arrayRids(arr) {
  const seen = new Set()
  for (const el of arr) {
    if (!el || typeof el !== 'object' || Array.isArray(el)) return null
    const id = el.id
    if ((typeof id !== 'string' && typeof id !== 'number') || id === '') return null
    const s = String(id)
    if (s.startsWith('#') || seen.has(s)) return null
    seen.add(s)
  }
  return [...seen].map(encodeKey)
}

// snapshot -> { collections: Map(name -> { kind, pos }), records: Map(key -> { collection, rid, pos, doc }) }
export function toLayout(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('[storage] a snapshot must be a plain object.')
  const collections = new Map()
  const records = new Map()
  let cpos = 0
  for (const rawName of Object.keys(snapshot)) {
    const v = snapshot[rawName]
    if (v === undefined) continue
    const name = encodeKey(rawName)
    const kind = kindOf(v)
    collections.set(name, { kind, pos: cpos++ })
    const put = (rid, pos, member) => {
      const doc = JSON.stringify(member === undefined ? null : member)
      records.set(recordKey(name, rid), { collection: name, rid, pos, doc })
    }
    if (kind === 'array') {
      const rids = arrayRids(v)
      v.forEach((el, i) => put(rids ? rids[i] : '#' + i, i, el))
    } else if (kind === 'object') {
      let i = 0
      for (const k of Object.keys(v)) { if (v[k] !== undefined) put(encodeKey(k), i++, v[k]) }
    } else {
      put('', 0, v)
    }
  }
  return { collections, records }
}

// rows -> snapshot. collectionRows: [{ name, kind, pos }], recordRows: [{ collection, rid, pos, doc }]
// (doc as JSON text). Unknown kinds or orphan records throw: stored data that
// does not fit the layout must stop the load, never be silently dropped.
export function fromRows(collectionRows, recordRows) {
  const byCollection = new Map()
  for (const r of recordRows) {
    if (!byCollection.has(r.collection)) byCollection.set(r.collection, [])
    byCollection.get(r.collection).push(r)
  }
  const out = {}
  const cols = [...collectionRows].sort((a, b) => a.pos - b.pos)
  for (const c of cols) {
    const rows = (byCollection.get(c.name) || []).sort((a, b) => a.pos - b.pos)
    byCollection.delete(c.name)
    const name = decodeKey(c.name)
    const parse = (r) => {
      try { return JSON.parse(r.doc) } catch (e) { throw new Error(`[storage] record ${name}/${r.rid} is not valid JSON (${e.message}).`) }
    }
    if (c.kind === 'array') setOwn(out, name, rows.map(parse))
    else if (c.kind === 'object') { const o = {}; for (const r of rows) setOwn(o, decodeKey(r.rid), parse(r)); setOwn(out, name, o) }
    else if (c.kind === 'value') {
      if (rows.length !== 1) throw new Error(`[storage] value collection ${name} has ${rows.length} records (expected 1).`)
      setOwn(out, name, parse(rows[0]))
    } else throw new Error(`[storage] collection ${name} has unknown kind "${c.kind}".`)
  }
  if (byCollection.size) throw new Error(`[storage] records exist for unknown collections: ${[...byCollection.keys()].map(decodeKey).join(', ')}.`)
  return out
}

// The layout exactly as stored (rows as read), so the next save diffs against
// what the database really holds.
export function layoutFromRows(collectionRows, recordRows) {
  const collections = new Map(collectionRows.map((c) => [c.name, { kind: c.kind, pos: c.pos }]))
  const records = new Map(recordRows.map((r) => [recordKey(r.collection, r.rid), { collection: r.collection, rid: r.rid, pos: r.pos, doc: r.doc }]))
  return { collections, records }
}

// What to write to move the database from layout `prev` (null = empty) to `next`.
export function diffLayout(prev, next) {
  const pc = prev ? prev.collections : new Map()
  const pr = prev ? prev.records : new Map()
  const upsertCollections = []
  const deleteCollections = []
  for (const [name, c] of next.collections) {
    const old = pc.get(name)
    if (!old || old.kind !== c.kind || old.pos !== c.pos) upsertCollections.push({ name, kind: c.kind, pos: c.pos })
  }
  for (const name of pc.keys()) if (!next.collections.has(name)) deleteCollections.push(name)
  const upsertRecords = []
  const moveRecords = []
  const deleteRecords = []
  for (const [k, r] of next.records) {
    const old = pr.get(k)
    if (!old || old.doc !== r.doc) upsertRecords.push(r)
    else if (old.pos !== r.pos) moveRecords.push({ collection: r.collection, rid: r.rid, pos: r.pos })
  }
  for (const [k, r] of pr) if (!next.records.has(k)) deleteRecords.push({ collection: r.collection, rid: r.rid })
  return { upsertCollections, deleteCollections, upsertRecords, moveRecords, deleteRecords }
}

export const isEmptyDiff = (d) => !d.upsertCollections.length && !d.deleteCollections.length && !d.upsertRecords.length && !d.moveRecords.length && !d.deleteRecords.length
