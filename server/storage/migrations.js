// SQL schema migrations for the postgres driver. Ordered, append-only: never
// edit a migration that has shipped, add the next version instead. Each one
// runs in its own transaction and is recorded in wcp_schema_migrations, so
// "deploy all tables" is `npm run db:migrate`, and re-running it is a no-op.
//
// `s` is the quoted schema name (validated in config.js before it gets here).
export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'document store: collections, records, meta',
    // The store snapshot as rows (see doc_layout.js). `doc` is `json`, not
    // `jsonb`, on purpose: json keeps the text exactly as written (key order
    // included, and \u0000 escapes, which jsonb rejects), so a load returns the
    // same object the server saved. Ad hoc reads still work with ->/->>.
    up: (s) => [
      `CREATE TABLE IF NOT EXISTS ${s}.wcp_meta (
        key text PRIMARY KEY,
        value text NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ${s}.wcp_collections (
        name text PRIMARY KEY,
        kind text NOT NULL CHECK (kind IN ('array', 'object', 'value')),
        pos integer NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ${s}.wcp_records (
        collection text NOT NULL REFERENCES ${s}.wcp_collections (name) ON DELETE CASCADE,
        rid text NOT NULL,
        pos integer NOT NULL,
        doc json NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, rid)
      )`,
      // revision: bumped by every save. A save names the revision it last saw,
      // so a second writer can never overwrite newer data unnoticed.
      `INSERT INTO ${s}.wcp_meta (key, value) VALUES ('revision', '0'), ('layout', 'wcp-records-v1') ON CONFLICT (key) DO NOTHING`,
    ],
  },
])

export const LATEST_VERSION = MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0

// Versions must be 1, 2, 3... with no gaps or repeats (checked at import).
MIGRATIONS.forEach((m, i) => {
  if (m.version !== i + 1) throw new Error(`[storage] migration ${i} has version ${m.version}; versions must run 1, 2, 3... in order.`)
})

export const pendingMigrations = (appliedVersions) => {
  const done = new Set(appliedVersions.map(Number))
  return MIGRATIONS.filter((m) => !done.has(m.version))
}
