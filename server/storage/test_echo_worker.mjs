// TEST ONLY: a worker for sync_bridge.test.mjs.
import { workerData } from 'node:worker_threads'
import { serveSync } from './sync_bridge.js'

serveSync(workerData, {
  echo: (x) => x,
  async later(x) { await new Promise((r) => setTimeout(r, 20)); return x * 2 },
  fail() { const e = new Error('nope from the worker'); e.code = 'E_TEST'; throw e },
  sleep: (ms) => new Promise((r) => setTimeout(() => r('woke'), ms)),
  die() { setTimeout(() => process.exit(3), 10); return new Promise(() => {}) },
  throwLater() { setTimeout(() => { throw new Error('boom in the worker') }, 10); return new Promise(() => {}) },
})
