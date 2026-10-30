// ===========================================================================
// WorkCoPilot data directory: the ONE place it is resolved (store.js, brain_store.js
// and report_sign.js all read it from here instead of each computing a default).
//
// WORK_DATA_DIR wins (owner: point the DB anywhere). Otherwise the default is
// server/data next to this file, EXCEPT under the Node test runner: there a test
// that forgot to set WORK_DATA_DIR would open and rewrite the real database, so a
// fresh temp dir is assigned instead (and written back to the env, so every module
// in that test process agrees on it). `node --test` marks its child processes with
// NODE_TEST_CONTEXT; that is the signal. Gate: server/data_dir.test.mjs.
// ===========================================================================
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')

// env is injectable for the unit test; production passes nothing.
export function resolveDataDir(env = process.env) {
  if (env.WORK_DATA_DIR) return env.WORK_DATA_DIR
  if (env.NODE_TEST_CONTEXT) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-test-data-'))
    env.WORK_DATA_DIR = tmp
    if (env === process.env) process.once('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { /* best effort */ } })
    return tmp
  }
  return DEFAULT_DATA_DIR
}

export default { resolveDataDir, DEFAULT_DATA_DIR }
