// Customer = "who the work is for" (enterprise / service companies only). A service
// company tags each project/task to a client, or to Default when working for itself.
// Individual accounts never see customers. Pure array operations on a company's
// customer list; store.js holds the array + persists (SUPREME XV small module, II
// single source). Default is always present and can never be renamed or removed
// (SUPREME VIII safe fallback, so a user is never blocked).
export const DEFAULT_ID = 'default'
const norm = (s) => String(s || '').trim()
const slug = (s) => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'c'

export function defaultCustomer() { return { id: DEFAULT_ID, name: 'Default', status: 'active', system: true, createdAt: null } }

// A company's list ALWAYS carries Default (seeded on read if missing).
export function withDefault(list) {
  const arr = Array.isArray(list) ? list.slice() : []
  if (!arr.some((c) => c && c.id === DEFAULT_ID)) arr.unshift(defaultCustomer())
  return arr
}
export function activeCustomers(list) { return withDefault(list).filter((c) => c && c.status === 'active') }

export function addCustomer(list, name, now = Date.now()) {
  const nm = norm(name)
  if (!nm) return { error: 'A customer name is required.' }
  if (nm.toLowerCase() === 'default') return { error: 'A Default customer already exists.' }
  const arr = withDefault(list)
  if (arr.some((c) => c.status === 'active' && norm(c.name).toLowerCase() === nm.toLowerCase())) return { error: 'A customer with that name already exists.' }
  let id = slug(nm), n = 1
  while (arr.some((c) => c.id === id)) id = `${slug(nm)}-${++n}`
  const customer = { id, name: nm, status: 'active', system: false, createdAt: new Date(now).toISOString() }
  return { list: [...arr, customer], customer }
}

export function renameCustomer(list, id, name) {
  const nm = norm(name)
  if (!nm) return { error: 'A customer name is required.' }
  const arr = withDefault(list)
  const c = arr.find((x) => x.id === id)
  if (!c) return { error: 'Customer not found.' }
  if (c.system) return { error: 'The Default customer cannot be renamed.' }
  if (arr.some((x) => x.id !== id && x.status === 'active' && norm(x.name).toLowerCase() === nm.toLowerCase())) return { error: 'A customer with that name already exists.' }
  return { list: arr.map((x) => (x.id === id ? { ...x, name: nm } : x)), customer: { ...c, name: nm } }
}

// Soft-remove (archive): keeps history/tagging intact; Default can never be removed.
export function archiveCustomer(list, id) {
  const arr = withDefault(list)
  const c = arr.find((x) => x.id === id)
  if (!c) return { error: 'Customer not found.' }
  if (c.system) return { error: 'The Default customer cannot be removed.' }
  return { list: arr.map((x) => (x.id === id ? { ...x, status: 'archived' } : x)) }
}
