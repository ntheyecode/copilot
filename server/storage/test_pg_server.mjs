// TEST ONLY: a real Postgres for the driver tests, with no install. PGlite is
// Postgres compiled to WebAssembly; pglite-socket serves it over the normal
// wire protocol, so the production `pg` client talks to it unchanged.
//
// It runs in its own worker thread on purpose: the postgres driver blocks the
// main thread while it waits for the database (sync_bridge.js), so a database
// served from the main thread would never answer.
//
// PGlite is one Postgres backend shared by every socket connection. That is
// enough for the driver contract (one writer, one connection), but it cannot
// show two separate sessions, so the advisory-lock refusal of a second writer
// is only tested against a real server (WORK_TEST_PG_URL, see the tests).
import { Worker, isMainThread, parentPort } from 'node:worker_threads'

export async function startTestPostgres() {
  const worker = new Worker(new URL(import.meta.url), { execArgv: [] })
  const port = await new Promise((resolve, reject) => {
    worker.once('message', (m) => (m && m.port ? resolve(m.port) : reject(new Error(String(m && m.error)))))
    worker.once('error', reject)
  })
  return {
    url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
    stop: () => worker.terminate(),
  }
}

if (!isMainThread && parentPort) {
  try {
    const { PGlite } = await import('@electric-sql/pglite')
    const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket')
    const db = await PGlite.create()
    const server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1', maxConnections: 64 })
    await server.start()
    parentPort.postMessage({ port: server.port })
  } catch (e) {
    parentPort.postMessage({ error: (e && e.message) || String(e) })
  }
}
