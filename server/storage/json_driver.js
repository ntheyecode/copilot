// The json storage driver: one db.json file in the data dir. This is the
// original store persistence moved here unchanged (same bytes on disk, same
// atomic write, same refusal messages), so the default deployment is untouched.
//
// Driver contract (every driver):
//   load()          -> the stored snapshot object, or null when nothing is stored yet.
//                      Throws (never reseeds) when stored data exists but cannot be read.
//   save(snapshot)  -> writes the whole snapshot atomically; throws on failure.
//   migrate()       -> brings the schema to the latest version; { applied: [...] }.
//   status()        -> { driver, ...details } with nothing secret in it.
//   close()         -> releases resources; the driver is unusable afterwards.
import fs from 'node:fs'
import path from 'node:path'

export function createJsonDriver({ dataDir }) {
  if (!dataDir) throw new Error('[storage] the json driver needs a data dir.')
  const DB_FILE = path.join(dataDir, 'db.json')
  const ensureDir = () => { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }) }

  function load() {
    ensureDir()
    if (!fs.existsSync(DB_FILE)) return null
    let raw
    try {
      raw = fs.readFileSync(DB_FILE, 'utf8')
    } catch (e) {
      // An existing DB we CANNOT READ must NEVER be reseeded (that silently
      // overwrites every account). Fail loud, leave the bytes untouched.
      throw new Error(
        `[store] db.json exists but is UNREADABLE (${e.code || e.message}). ` +
        `Refusing to start so your data is not overwritten. Fix ownership then restart.`)
    }
    try {
      return JSON.parse(raw)
    } catch (e) {
      // Present but CORRUPT: preserve a copy and refuse to start, rather than
      // seed an empty DB over the real one.
      const bak = `${DB_FILE}.corrupt-${Date.now()}`
      try { fs.copyFileSync(DB_FILE, bak) } catch { /* best effort */ }
      throw new Error(`[store] db.json is CORRUPT (${e.message}). Saved a copy to ${bak} and refusing to start.`)
    }
  }

  // Atomic write: write + fsync the temp file, preserve the live file's owner/mode
  // on the replacement (a root-performed write must not leave a db the service
  // user can no longer read), then rename.
  function save(snapshot) {
    ensureDir()
    const tmp = DB_FILE + '.tmp'
    const fd = fs.openSync(tmp, 'w', 0o600)
    try {
      fs.writeSync(fd, JSON.stringify(snapshot, null, 2))
      fs.fsyncSync(fd)
    } finally { fs.closeSync(fd) }
    try {
      if (fs.existsSync(DB_FILE)) {
        const st = fs.statSync(DB_FILE)
        fs.chownSync(tmp, st.uid, st.gid)
        fs.chmodSync(tmp, st.mode & 0o777)
      }
    } catch { /* non-root same-user writes keep ownership anyway */ }
    fs.renameSync(tmp, DB_FILE)
  }

  return Object.freeze({
    name: 'json',
    load,
    save,
    migrate: () => ({ applied: [] }),   // a JSON file has no schema to migrate
    status: () => ({ driver: 'json', file: DB_FILE, exists: fs.existsSync(DB_FILE) }),
    close: () => {},
  })
}
