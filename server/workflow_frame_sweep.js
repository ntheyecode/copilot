// ===========================================================================
// WorkCoPilot TEACH workflow frames: orphan sweep. Deletes captured frames that
// no workflow step references and no running session shows: frames a trainer
// uploaded but never saved into a workflow, the temp file of an interrupted
// save, and frames of a company that no longer exists.
//
// Safety:
//   - The "still needed" rule is NOT here: it is workflows_store.js
//     referencedFrames(companyId), injected, so edit/delete purge and this sweep
//     always agree.
//   - Grace period: a frame younger than graceMs (default 24h, by file mtime) is
//     never deleted, because a trainer mid-recording holds uploaded frames that
//     are not saved into a workflow yet.
//   - Fully synchronous per company, so no workflow save can land between
//     reading the referenced set and deleting.
//   - If the referenced set cannot be computed, that company is skipped.
// Created with injected ctx; never imports store.js. Returns counts only (no
// file names), so callers can log them safely.
// ===========================================================================
import { folderName } from './workflow_frames.js'

export const FRAME_SWEEP_GRACE_MS = 24 * 60 * 60 * 1000
export const FRAME_SWEEP_EVERY_MS = 24 * 60 * 60 * 1000

// ctx: { frames, referencedFrames(companyId)->Set, companyIds?()->array, now?()->ms, graceMs? }
//   frames: workflow_frames.js { companies, entries, remove }
//   companyIds (optional): ids of companies that exist; a folder with no live
//     company is treated as fully unreferenced (grace still applies). Omitted =
//     every folder is assumed to be a live company.
export function createWorkflowFrameSweep(ctx) {
  const { frames, referencedFrames } = ctx
  const now = ctx.now || (() => Date.now())
  const graceMs = Number.isFinite(ctx.graceMs) ? ctx.graceMs : FRAME_SWEEP_GRACE_MS

  // Live companies keyed by their folder name, so a folder maps back to the real id.
  function liveFolders() {
    if (typeof ctx.companyIds !== 'function') return null
    const m = new Map()
    for (const cid of (ctx.companyIds() || [])) { const f = folderName(cid); if (f) m.set(f, cid) }
    return m
  }

  // Sweep one tenant folder. companyId null = the company is gone.
  function sweepFolder(folder, companyId, t) {
    let refs
    try { refs = companyId == null ? new Set() : referencedFrames(companyId) } catch { return { scanned: 0, removed: 0, kept: 0, skipped: true } }
    const list = frames.entries(folder)
    const orphans = []
    for (const e of list) {
      if (t - e.mtimeMs < graceMs) continue          // too young: may be mid-recording
      if (e.temp || !refs.has(e.name)) orphans.push(e.name)
    }
    const removed = orphans.length ? frames.remove(folder, orphans) : 0
    return { scanned: list.length, removed, kept: list.length - removed, skipped: false }
  }

  function sweepAll() {
    const t = now()
    const live = liveFolders()
    const total = { companies: 0, scanned: 0, removed: 0, kept: 0, skipped: 0 }
    for (const folder of frames.companies()) {
      const cid = live ? (live.has(folder) ? live.get(folder) : null) : folder
      const r = sweepFolder(folder, cid, t)
      total.companies++
      total.scanned += r.scanned; total.removed += r.removed; total.kept += r.kept
      if (r.skipped) total.skipped++
    }
    return total
  }

  return { sweepAll }
}

// Run `run` once shortly after boot (deferred, so startup is never blocked) and
// then every `everyMs`. Timers are unref'd: a sweep never keeps the process alive.
export function scheduleFrameSweep(run, { firstDelayMs = 60 * 1000, everyMs = FRAME_SWEEP_EVERY_MS } = {}) {
  const first = setTimeout(run, firstDelayMs)
  const every = setInterval(run, everyMs)
  if (first.unref) first.unref()
  if (every.unref) every.unref()
  return { stop() { clearTimeout(first); clearInterval(every) } }
}

export default { createWorkflowFrameSweep, scheduleFrameSweep, FRAME_SWEEP_GRACE_MS, FRAME_SWEEP_EVERY_MS }
