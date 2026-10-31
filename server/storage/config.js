// Storage configuration: which driver persists the store, and how to reach it.
// Read from the environment (the on-prem setup and the managed provisioning
// write these). Pure: takes an env object, returns a frozen config or throws an
// actionable error. Never puts a password in a message (redactDbUrl).
//
//   WORK_DB_DRIVER            json (default) | postgres
//   WORK_DB_URL               postgres://user:pass@host:5432/dbname  (postgres only)
//   WORK_DB_SSL               disable | require | verify-full
//                             (default: the URL's sslmode, else disable for a
//                             local host and verify-full for any other host;
//                             sslmode=prefer/allow are read as require: there
//                             is no silent fallback to plaintext. Any URL
//                             ?parameter other than sslmode and
//                             application_name is refused.)
//   WORK_DB_SSL_CA            path to a PEM CA bundle for verify-full (optional)
//   WORK_DB_SCHEMA            schema that holds the tables (default workcopilot)
//   WORK_DB_TIMEOUT_MS        per-operation timeout (default 30000)
//   WORK_DB_CONNECT_TIMEOUT_MS  connect timeout (default 15000)
//   WORK_DB_AUTO_MIGRATE      1 = apply pending migrations at server start
//                             (default: refuse to start and say to run db:migrate)
import fs from 'node:fs'

export const DRIVERS = Object.freeze(['json', 'postgres'])
const SSL_MODES = Object.freeze(['disable', 'require', 'verify-full'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

// Everything between "//user:" and the last "@" of the authority, masked on the
// raw text. Done before any URL parsing, so a password that a parser would
// misread (an unencoded #, ? or /) is still hidden.
const maskRaw = (s) => s.replace(/(\/\/[^:/@]*:).*@/, '$1***@')

// A connection string with the password replaced, safe for logs and errors.
export function redactDbUrl(url) {
  const s = maskRaw(String(url || ''))
  try {
    const u = new URL(s)
    if (u.password) u.password = '***'
    return u.toString()
  } catch {
    return s
  }
}

// The pg client copies EVERY query parameter over the connection settings
// (?host=... changes the server, ?password=... the password, ?ssl=0 turns TLS
// off), behind the back of WORK_DB_SSL and of what status shows. So only these
// are accepted; anything else is refused. sslmode is read below and removed.
const URL_PARAMS_ALLOWED = new Set(['sslmode', 'application_name'])

function positiveInt(env, name, dflt) {
  const raw = env[name]
  if (raw == null || String(raw).trim() === '') return dflt
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`[storage] ${name} must be a positive whole number of milliseconds (got "${raw}").`)
  return n
}

function parsePostgres(env) {
  const raw = String(env.WORK_DB_URL || '').trim()
  if (!raw) throw new Error('[storage] WORK_DB_DRIVER=postgres needs WORK_DB_URL, for example postgres://user:password@db-host:5432/workcopilot.')
  let u
  try { u = new URL(raw) } catch { throw new Error(`[storage] WORK_DB_URL is not a valid connection string (${redactDbUrl(raw)}). Use postgres://user:password@host:5432/dbname. Percent-encode special characters in the password: # as %23, ? as %3F, / as %2F, @ as %40.`) }
  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') throw new Error(`[storage] WORK_DB_URL must start with postgres:// or postgresql:// (got ${u.protocol}//).`)
  if (!u.hostname) throw new Error(`[storage] WORK_DB_URL has no host (${redactDbUrl(raw)}).`)
  // A password holding an unencoded #, ? or / is split by the URL parser (part
  // of it becomes the host or the path). Refuse, and say how to encode it.
  // (An "@" in the raw text with no user parsed out means the parser cut the
  // authority short; an empty password, as in user:@host, is fine.)
  if (raw.includes('#') || u.pathname.includes('@') || u.search.includes('@') || (/^[a-z][a-z0-9+.-]*:\/\/[^@]*@/i.test(raw) && !u.username)) {
    throw new Error(`[storage] WORK_DB_URL could not be read as user:password@host (${redactDbUrl(raw)}). Percent-encode special characters in the password: # as %23, ? as %3F, / as %2F, @ as %40.`)
  }
  const names = [...new Set(u.searchParams.keys())]
  const refused = names.filter((k) => !URL_PARAMS_ALLOWED.has(k.toLowerCase()))
  if (refused.length) {
    const tls = refused.some((k) => /^ssl/i.test(k)) ? ' Set TLS with WORK_DB_SSL (disable, require, verify-full) and WORK_DB_SSL_CA.' : ''
    throw new Error(`[storage] remove ${refused.join(', ')} from WORK_DB_URL: put the host, port, user, password and database in the URL itself, not as ?parameters (only sslmode and application_name are accepted).${tls}`)
  }
  // TLS: WORK_DB_SSL wins, then the URL's sslmode (any letter case), then a
  // host-based default. sslmode is removed so the pg client cannot reinterpret it.
  const modeKey = names.find((k) => k.toLowerCase() === 'sslmode')
  const urlMode = modeKey ? String(u.searchParams.get(modeKey) || '').toLowerCase() : ''
  if (modeKey) u.searchParams.delete(modeKey)
  const fromUrl = urlMode === 'verify-ca' ? 'verify-full' : (urlMode === 'prefer' || urlMode === 'allow') ? 'require' : urlMode
  const local = LOCAL_HOSTS.has(u.hostname)
  const ssl = String(env.WORK_DB_SSL || fromUrl || (local ? 'disable' : 'verify-full')).trim().toLowerCase()
  if (!SSL_MODES.includes(ssl)) throw new Error(`[storage] WORK_DB_SSL must be one of ${SSL_MODES.join(', ')} (got "${env.WORK_DB_SSL || urlMode}").`)
  let ca = null
  const caPath = String(env.WORK_DB_SSL_CA || '').trim()
  if (caPath) {
    try { ca = fs.readFileSync(caPath, 'utf8') } catch (e) { throw new Error(`[storage] WORK_DB_SSL_CA could not be read (${e.code || e.message}): ${caPath}`) }
  }
  const schema = String(env.WORK_DB_SCHEMA || 'workcopilot').trim()
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error(`[storage] WORK_DB_SCHEMA must be lowercase letters, digits and underscores, starting with a letter or underscore (got "${schema}").`)
  if (/^pg_/.test(schema) || schema === 'information_schema') throw new Error(`[storage] WORK_DB_SCHEMA "${schema}" is reserved by PostgreSQL. Pick another name (default workcopilot).`)
  return {
    driver: 'postgres',
    url: u.toString(),
    display: redactDbUrl(u.toString()),
    ssl, ca, schema,
    timeoutMs: positiveInt(env, 'WORK_DB_TIMEOUT_MS', 30000),
    connectTimeoutMs: positiveInt(env, 'WORK_DB_CONNECT_TIMEOUT_MS', 15000),
    autoMigrate: String(env.WORK_DB_AUTO_MIGRATE || '') === '1',
  }
}

// env -> config. dataDir is where the json driver keeps db.json.
export function storageConfig(env = process.env, { dataDir } = {}) {
  const driver = String(env.WORK_DB_DRIVER || 'json').trim().toLowerCase()
  if (!DRIVERS.includes(driver)) throw new Error(`[storage] unknown WORK_DB_DRIVER "${env.WORK_DB_DRIVER}". Use one of: ${DRIVERS.join(', ')} (or leave it unset for json).`)
  if (driver === 'json') return Object.freeze({ driver: 'json', dataDir })
  return Object.freeze(parsePostgres(env))
}
