// Synchronous calls into an async worker thread.
//
// The store's persistence is synchronous by design: every mutation calls
// persist(), and when persist() returns the data is durable (or it threw). A
// network database driver is asynchronous. To keep the store's contract exactly
// as it is, the async driver runs in a worker thread and the main thread blocks
// on a shared flag (Atomics.wait) until the worker answers. This is the same
// technique synckit and esbuild's sync API use; it is written out here because
// it is small and has no dependency.
//
// The cost is honest: the event loop pauses for the duration of each database
// round trip, exactly as it pauses today for the db.json write + fsync.
//
// Shared slots (Int32Array over a SharedArrayBuffer):
//   [0] reply flag: the worker posts its reply on the port, then sets 1 + notifies.
//   [1] crash flag: the worker is going down (uncaught error or exit); it posts
//       { crash } on the port, sets [1] = 1, then sets [0] = 1 + notifies, so a
//       waiting caller wakes at once with the real reason instead of timing out.
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads'

export function createSyncBridge(workerUrl, workerData = {}) {
  const sab = new SharedArrayBuffer(8)
  const flag = new Int32Array(sab)
  const { port1, port2 } = new MessageChannel()
  // execArgv: [] so the worker never inherits the parent's Node flags (with
  // `node -e` / --input-type the inherited flags stop the worker from loading
  // its file at all, and the first call would only fail at its timeout).
  const worker = new Worker(workerUrl, { workerData: { ...workerData, sab, port: port2 }, transferList: [port2], execArgv: [] })
  // The worker must never keep the process alive by itself.
  worker.unref()
  port1.unref()
  let seq = 0
  let broken = null
  let crashReason = null
  worker.on('error', (e) => { crashReason = crashReason || `the database worker crashed (${e && e.message})` })
  worker.on('exit', (code) => { crashReason = crashReason || `the database worker stopped (exit code ${code})` })

  const fail = (msg) => { broken = msg; return new Error(msg) }
  const crashed = () => fail(`[storage] ${crashReason || 'the database worker stopped unexpectedly'}. Nothing more can be written; restart the server.`)

  function call(op, payload, timeoutMs) {
    if (broken) throw new Error(broken)
    if (crashReason || Atomics.load(flag, 1)) throw crashed()
    const id = ++seq
    Atomics.store(flag, 0, 0)
    // Look again after the reset: a worker that died just before it would have
    // had its wake-up overwritten.
    if (Atomics.load(flag, 1)) throw crashed()
    port1.postMessage({ id, op, payload })
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const left = deadline - Date.now()
      // We cannot know whether a timed-out operation finished. Every later call
      // fails until restart, so nothing writes on top of an unknown state.
      if (left <= 0) throw fail(`[storage] the database did not answer "${op}" within ${timeoutMs} ms. Check the database server and network, then restart. (Raise WORK_DB_TIMEOUT_MS if the database is just slow.)`)
      // Sleep until the worker sets the flag (returns at once if it already has).
      if (Atomics.wait(flag, 0, 0, left) === 'timed-out') continue
      // The worker posts before it sets the flag, so the message is queued now.
      // Skip replies for other ids (only possible after a timeout).
      let msg
      while ((msg = receiveMessageOnPort(port1))) {
        const m = msg.message
        if (m.crash) { crashReason = crashReason || `the database worker stopped unexpectedly (${m.crash})`; continue }
        if (m.id !== id) continue
        if (m.ok) return m.value
        const err = new Error(m.error && m.error.message ? m.error.message : `[storage] ${op} failed.`)
        if (m.error && m.error.code) err.code = m.error.code
        throw err
      }
      if (crashReason || Atomics.load(flag, 1)) throw crashed()
      // Flag set but no reply for this id yet: pause 5 ms and look again.
      Atomics.wait(flag, 0, Atomics.load(flag, 0), Math.min(5, Math.max(1, left)))
    }
  }

  function terminate() {
    broken = broken || '[storage] the database connection is closed.'
    try { port1.close() } catch { /* already closed */ }
    return worker.terminate()
  }

  return { call, terminate }
}

// Worker side: answer calls from createSyncBridge with handlers[op](payload).
// Handlers may be async. Errors go back as { message, code } (no stack, no
// connection details beyond what the handler put in the message).
export function serveSync({ sab, port }, handlers) {
  const flag = new Int32Array(sab)
  const wake = () => { Atomics.store(flag, 0, 1); Atomics.notify(flag, 0) }
  const reply = (msg) => { port.postMessage(msg); wake() }
  // Going down: tell a waiting caller now (see the slot notes above).
  let down = false
  const crash = (why) => {
    if (down) return
    down = true
    try { port.postMessage({ crash: String(why) }) } catch { /* port already closed */ }
    Atomics.store(flag, 1, 1)
    wake()
  }
  process.on('uncaughtException', (e) => { crash((e && e.message) || e); process.exit(1) })
  process.on('unhandledRejection', (e) => { crash((e && e.message) || e); process.exit(1) })
  process.on('exit', (code) => crash(`exit code ${code}`))
  // Calls are strictly sequential (the caller blocks), but chain them anyway so
  // a slow handler can never overlap the next one.
  let chain = Promise.resolve()
  port.on('message', (m) => {
    chain = chain.then(async () => {
      try {
        const fn = handlers[m.op]
        if (!fn) throw new Error(`[storage] unknown operation "${m.op}".`)
        reply({ id: m.id, ok: true, value: await fn(m.payload) })
      } catch (e) {
        reply({ id: m.id, ok: false, error: { message: (e && e.message) || String(e), code: e && e.code } })
      }
    })
  })
}
