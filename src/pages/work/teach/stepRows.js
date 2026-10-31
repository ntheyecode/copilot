// Pure helpers for the Teach step editor's rows. Each row carries a client-only
// `_k` key so React keeps a row's open/closed state and its inputs attached to
// the right step through edits, reorders and deletes (stepsToPayload drops `_k`,
// so it never reaches the server). Unit-tested in stepRows.test.mjs.

let seq = 0
export function newRowKey() { seq += 1; return `r${Date.now().toString(36)}${seq}` }

// Give every row a key, keeping any it already has. Returns a new array.
export function withRowKeys(steps) {
  return (Array.isArray(steps) ? steps : []).map((s) => (s && s._k ? s : { ...(s || {}), _k: newRowKey() }))
}

// Rows start open when the list is short; a long list (a recording) starts
// collapsed to compact rows with only the first open, so it reads at a glance.
export const OPEN_ALL_UP_TO = 3
export function initialOpenKeys(steps) {
  const list = Array.isArray(steps) ? steps : []
  const keys = list.map((s) => s && s._k).filter(Boolean)
  return new Set(list.length <= OPEN_ALL_UP_TO ? keys : keys.slice(0, 1))
}

export default { newRowKey, withRowKeys, OPEN_ALL_UP_TO, initialOpenKeys }
