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
// The tenant folder name for a company id (also how the sweep maps a folder back
// to a live company).
export const folderName = (companyId) => String(companyId == null ? '' : companyId).replace(/[^a-zA-Z0-9_-]/g, '')
// The temp file save() writes before its atomic rename.
const isTempName = (name) => typeof name === 'string' && name.endsWith('.tmp') && isFrameRef(name.slice(0, -4))

// ctx: { dir, seal(buf)->buf, open(buf)->buf }
export function createWorkflowFrames(ctx) {
  const { dir, seal, open } = ctx

  function companyDir(companyId) {
    const safe = folderName(companyId)
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

  // Delete frames for a tenant; returns how many were removed. A name is either
  // a frame ref or the temp file of an interrupted save (`<ref>.tmp`); anything
  // else and already-missing files are skipped.
  function remove(companyId, refs) {
    let n = 0
    for (const ref of (Array.isArray(refs) ? refs : [])) {
      if (!isFrameRef(ref) && !isTempName(ref)) continue
      try { fs.unlinkSync(path.join(companyDir(companyId), ref)); n++ } catch { /* already gone */ }
    }
    return n
  }

  // Tenant folders present on disk (folder name = sanitized company id).
  function companies() {
    try {
      return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    } catch { return [] }
  }

  // Frame files of one tenant with their mtime, for the orphan sweep. Only
  // frame refs and save temps are listed; any other file is never touched.
  function entries(companyId) {
    let names = []
    const cdir = companyDir(companyId)
    try { names = fs.readdirSync(cdir) } catch { return [] }
    const out = []
    for (const name of names) {
      const temp = isTempName(name)
      if (!temp && !isFrameRef(name)) continue
      try { out.push({ name, temp, mtimeMs: fs.statSync(path.join(cdir, name)).mtimeMs }) } catch { /* raced away */ }
    }
    return out
  }

  // Delete a tenant's whole frame folder (company deletion); returns how many
  // files it held. Missing folder = 0.
  function removeCompany(companyId) {
    const cdir = companyDir(companyId)
    let n = 0
    try { n = fs.readdirSync(cdir).length } catch { return 0 }
    fs.rmSync(cdir, { recursive: true, force: true })
    return n
  }

  return { save, read, remove, companies, entries, removeCompany }
}

export default { createWorkflowFrames, folderName }
