// Parent side of the E2E server: spawns e2e/support/boot/server-child.mjs (the
// REAL server/index.js start(), on a free port the OS picks, with a fresh temp
// WORK_DATA_DIR) and talks to it over the Node IPC channel.
//
// ctl(cmd, args) runs one whitelisted harness command inside the server process
// (seed a tenant, script the fake AI, move the clock, read the webhook receiver).
// It never reaches into product internals the product does not export.
import { fork } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '..', '..')
const CHILD = path.join(HERE, 'boot', 'server-child.mjs')

export async function bootServer({ edition = 'all', env = {}, label = 'e2e' } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `wc-e2e-${edition}-`))
  // The product's own AI deploy seed (store.js loadAiSeedIfNeeded): the platform
  // runtime is openai, and net-fakes routes that host to the fake provider.
  if (!env.E2E_NO_AI) {
    fs.writeFileSync(path.join(dataDir, 'ai-seed.json'), JSON.stringify({
      providers: { openai: { apiKey: 'sk-e2e-fake-key', chatModel: 'gpt-6-luna', visionModel: 'gpt-6-luna' } },
      activeProvider: 'openai',
      platformAiAllowed: true,
    }))
  }
  const logFile = path.join(dataDir, 'server.log')
  const out = fs.openSync(logFile, 'a')
  const child = fork(CHILD, [], {
    cwd: REPO,
    stdio: ['ignore', out, out, 'ipc'],
    execArgv: [],
    env: {
      ...process.env,
      WORK_EDITION: edition,
      WORK_DATA_DIR: dataDir,
      PORT: '0',
      WORK_ADMIN_PASSWORD: 'E2e-Admin-Pass-123!',
      SESSION_SECRET: `e2e-${edition}-${Date.now()}`,
      WORK_MFA_DISABLED: '1',
      BRAIN_EMBED_FAKE: '1',
      WORK_EMAIL_SINK_FILE: path.join(dataDir, 'emails.jsonl'),
      WORK_SANCTIONS_OFF: '1',
      WORK_API_RATE_PER_MIN: '100000',
      WORK_API_COMPANY_RATE_PER_MIN: '100000',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      ...env,
    },
  })

  let seq = 0
  const pending = new Map()
  let ready
  const readyP = new Promise((resolve, reject) => {
    ready = { resolve, reject }
    child.once('exit', (code) => reject(new Error(`E2E server (${label}) exited early with code ${code}. Log: ${logFile}\n${tail(logFile)}`)))
  })
  child.on('message', (m) => {
    if (m && m.type === 'ready') ready.resolve(m)
    else if (m && m.type === 'reply' && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id)
      if (m.error) p.reject(new Error(`ctl ${p.cmd}: ${m.error}`)); else p.resolve(m.result)
    }
  })
  const info = await withTimeout(readyP, 60000, `E2E server (${label}) did not start in 60 s. Log: ${logFile}`)

  function ctl(cmd, args = {}) {
    const id = ++seq
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, cmd })
      child.send({ type: 'ctl', id, cmd, args })
    })
  }

  async function close() {
    try { await withTimeout(ctl('shutdown'), 10000, 'shutdown timeout') } catch { /* killed below */ }
    try { child.kill() } catch { /* already gone */ }
    try { fs.closeSync(out) } catch { /* ignore */ }
    if (!process.env.E2E_KEEP_DATA) {
      try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 }) } catch { /* Windows may hold a handle a moment longer; the OS temp cleanup gets it */ }
    }
  }

  return { baseURL: `http://127.0.0.1:${info.port}`, port: info.port, edition, dataDir, logFile, ctl, close, info }
}

function withTimeout(p, ms, msg) {
  let t
  return Promise.race([p.finally(() => clearTimeout(t)), new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms) })])
}

function tail(file, n = 40) {
  try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(-n).join('\n') } catch { return '' }
}
