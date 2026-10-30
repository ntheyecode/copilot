// ===========================================================================
// WorkCoPilot TEACH workflow frames (Wave 2): disk store for the scrubbed
// screenshots a trainer's capture produces, referenced from workflow steps as
// `shot`. Frames are stored ENCRYPTED AT REST: `seal`/`open` are the store's own
// shot cipher, injected so the crypto stays single-source in store.js. Layout:
// <dir>/<companyId>/<ref>, one folder per tenant.
//
// Refs are 128-bit random hex + an image extension: unguessable, and validated
// (workflows_rules.isFrameRef) BEFORE any path join, so a ref can never escape its
// company folder. RBAC is NOT here: workflows_store.js decides who may upload or
// read; this module only does safe, tenant-scoped byte IO.
// ===========================================================================
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { isFrameRef } from './workflows_rules.js'

const MIME_BY_EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

// ctx: { dir, seal(buf)->buf, open(buf)->buf }
export function createWorkflowFrames(ctx) {
  const { dir, seal, open } = ctx

  function companyDir(companyId) {
    const safe = String(companyId == null ? '' : companyId).replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safe) throw new Error('[workflow_frames] a company id is required')
    return path.join(dir, safe)
  }

  // Store one frame; returns its ref. Written via a temp file + rename so a crash
  // never leaves a half-written frame under a valid ref.
  function save(companyId, buffer, ext) {
    if (!MIME_BY_EXT[ext]) throw new Error('[workflow_frames] unsupported image type')
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('[workflow_frames] empty frame')
    const cdir = companyDir(companyId)
    fs.mkdirSync(cdir, { recursive: true })
    const ref = `${crypto.randomBytes(16).toString('hex')}.${ext}`
    const tmp = path.join(cdir, `${ref}.tmp`)
    fs.writeFileSync(tmp, seal(buffer))
    fs.renameSync(tmp, path.join(cdir, ref))
    return ref
  }

  // Read one frame for a tenant: { buffer, mime } or null (bad ref, missing, or
  // undecryptable). Never throws.
  function read(companyId, ref) {
    if (!isFrameRef(ref)) return null
    try {
      const buffer = open(fs.readFileSync(path.join(companyDir(companyId), ref)))
      return { buffer, mime: MIME_BY_EXT[ref.split('.').pop()] }
    } catch { return null }
  }

  // Delete frames for a tenant; returns how many were removed. Invalid refs and
  // already-missing files are skipped.
  function remove(companyId, refs) {
    let n = 0
    for (const ref of (Array.isArray(refs) ? refs : [])) {
      if (!isFrameRef(ref)) continue
      try { fs.unlinkSync(path.join(companyDir(companyId), ref)); n++ } catch { /* already gone */ }
    }
    return n
  }

  return { save, read, remove }
}

export default { createWorkflowFrames }
