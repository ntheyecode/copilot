// A directory rename that survives Windows' transient locks. On Windows a
// rename fails with EPERM / EACCES / EBUSY while another process holds a
// handle inside the folder (antivirus scanning files that were just written,
// the search indexer). The lock clears within moments, so the rename is
// retried with a short, growing wait (the approach graceful-fs takes) instead
// of failing the bundle (2026-10-31: compose.test failed with EPERM on this PC
// under load, on an untouched branch too). Any other error throws at once.
import fs from 'node:fs'

const TRANSIENT = new Set(['EPERM', 'EACCES', 'EBUSY'])
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

export function renameWithRetry(from, to, { attempts = 12, fsImpl = fs, wait = sleep } = {}) {
  for (let i = 1; ; i++) {
    try { return fsImpl.renameSync(from, to) } catch (e) {
      if (!TRANSIENT.has(e && e.code) || i >= attempts) throw e
      wait(Math.min(1000, 25 * 2 ** (i - 1)))   // 25 ms doubling, capped at 1 s: about 6 s in all
    }
  }
}
