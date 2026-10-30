// ===========================================================================
// WorkCoPilot TEACH WORKFLOWS store: company-scoped CRUD + lifecycle over the
// guided workflows a trainer authors. RBAC is enforced HERE (the acting user's
// company + canAuthorWorkflow + ownership), so the routes stay thin, exactly
// like the PM project routes. Created with the store's context so it never
// imports the store (no circular import; owner rule: no monolith). The store
// stays the single owner of db + persistence.
//
// Visibility: everyone in the company sees PUBLISHED workflows (immediately
// available to run); the author and company admins also see their drafts and
// retired versions. Authoring (create/edit/publish/revise/retire/delete) needs
// the trainer grant or company admin; edit/delete additionally need ownership
// (the author) or company admin (the cross-trainer editor).
// ===========================================================================
import * as roles from './work_roles.js'
import * as wf from './workflows_rules.js'
import { parseImageDataUrl } from './image_data_url.js'

// ctx: { db: () => object, persist, id, now, httpErr, getUser, emit, frames?, framesInUse? }
//   frames (optional): workflow_frames.js { save, read, remove } for Wave 2 capture.
//   framesInUse (optional): (companyId) -> Set of frame refs running sessions show.
export function createWorkflows(ctx) {
  const { persist, id, now, httpErr, getUser } = ctx
  const emit = ctx.emit || (() => {})
  const frames = ctx.frames || null
  const db = () => { const d = ctx.db(); if (!Array.isArray(d.workflows)) d.workflows = []; return d }
  const all = () => db().workflows

  function actor(userId) {
    const u = getUser(userId)
    if (!u || !u.companyId) throw httpErr(403, 'No company in scope.')
    const grants = roles.sanitizeGrants(u.companyRole, u.grants)
    return {
      id: u.id, companyId: u.companyId, role: u.companyRole || 'member', grants,
      canAuthor: roles.canAuthorWorkflow(u.companyRole, grants),
      isAdmin: roles.isCompanyAdmin(u.companyRole),
    }
  }
  const inCompany = (w, a) => !!w && String(w.companyId) === String(a.companyId)
  const owns = (w, a) => a.isAdmin || String(w.authorId) === String(a.id)
  const visible = (w, a) => w.state === 'published' || a.isAdmin || String(w.authorId) === String(a.id)

  // Delete captured frames that NO remaining workflow in the company still
  // references (revise copies step shots, so versions in a group can share a
  // frame; only an unreferenced one is safe to purge). Privacy: deleting or
  // editing a workflow never leaves its dropped frames behind.
  function purgeUnreferenced(companyId, candidates) {
    if (!frames || !candidates || !candidates.size) return 0
    for (const ref of referencedFrames(companyId)) candidates.delete(ref)
    return candidates.size ? frames.remove(companyId, [...candidates]) : 0
  }
  // THE rule for which frames a company still needs: any step shot of any of its
  // workflows (every state and version), plus the frames an employee's running
  // session shows (Wave 3 part B). The orphan sweep (workflow_frame_sweep.js)
  // reads this same function, so the two never disagree on what is safe to delete.
  function referencedFrames(companyId) {
    const out = new Set()
    for (const o of all()) {
      if (String(o.companyId) !== String(companyId)) continue
      for (const s of (o.steps || [])) if (s && s.shot) out.add(s.shot)
    }
    if (typeof ctx.framesInUse === 'function') {
      for (const ref of ctx.framesInUse(companyId)) out.add(ref)
    }
    return out
  }
  const shotsOf = (w) => new Set((w && w.steps ? w.steps : []).map((s) => s && s.shot).filter(Boolean))

  function publicShape(w) {
    return {
      id: w.id, groupId: w.groupId, version: w.version, state: w.state,
      meta: w.meta, steps: w.steps, authorId: w.authorId,
      createdAt: w.createdAt, updatedAt: w.updatedAt,
      publishedAt: w.publishedAt || null, retiredAt: w.retiredAt || null,
    }
  }

  function listWorkflowsForUser(userId, { state } = {}) {
    const a = actor(userId)
    let list = all().filter((w) => inCompany(w, a) && visible(w, a))
    if (state && wf.WORKFLOW_STATES.includes(state)) list = list.filter((w) => w.state === state)
    return list.sort((x, y) => String(y.updatedAt || '').localeCompare(String(x.updatedAt || ''))).map(publicShape)
  }

  function getWorkflowForUser(userId, wid) {
    const a = actor(userId)
    const w = all().find((x) => x.id === wid)
    if (!inCompany(w, a)) throw httpErr(404, 'Workflow not found.')
    if (!visible(w, a)) throw httpErr(403, 'That workflow is not visible to you.')
    return publicShape(w)
  }

  // May this user author workflows (record, upload frames, transcribe)? Never throws.
  function userCanAuthorWorkflows(userId) {
    try { return actor(userId).canAuthor } catch { return false }
  }

  function requireAuthor(a) {
    if (!a.canAuthor) throw httpErr(403, 'Only a trainer or company admin can author workflows.')
  }

  // Resolve a workflow the acting user is allowed to CHANGE (author or admin).
  function mustAct(userId, wid) {
    const a = actor(userId); requireAuthor(a)
    const w = all().find((x) => x.id === wid)
    if (!inCompany(w, a)) throw httpErr(404, 'Workflow not found.')
    if (!owns(w, a)) throw httpErr(403, 'Only the author or a company admin can change this workflow.')
    return { a, w }
  }

  function createWorkflow(userId, { meta, steps } = {}) {
    const a = actor(userId); requireAuthor(a)
    const v = wf.validateMeta(meta)
    if (!v.ok) throw httpErr(400, `Missing required fields: ${v.missing.join(', ')}.`)
    const s = wf.validateSteps(steps)   // a draft may start with no steps yet
    const t = now()
    const rec = {
      id: id(), groupId: id(), version: 1, state: 'draft',
      // a new workflow has no server readings yet; any sent by the client are dropped
      companyId: a.companyId, authorId: a.id, meta: v.meta, steps: wf.carryReadings([], s.steps),
      createdAt: t, updatedAt: t, publishedAt: null, retiredAt: null,
    }
    all().push(rec); persist()
    emit('workflow_created', { id: rec.id, companyId: a.companyId, by: a.id })
    return publicShape(rec)
  }

  function updateWorkflow(userId, wid, { meta, steps } = {}) {
    const { w } = mustAct(userId, wid)
    if (!wf.canEditContent(w.state)) throw httpErr(409, 'Only a draft can be edited. Revise a published workflow to make a new version.')
    if (meta !== undefined) {
      const v = wf.validateMeta({ ...w.meta, ...meta })
      if (!v.ok) throw httpErr(400, `Missing required fields: ${v.missing.join(', ')}.`)
      w.meta = v.meta
    }
    let dropped = null
    if (steps !== undefined) { dropped = shotsOf(w); w.steps = wf.carryReadings(w.steps, wf.validateSteps(steps).steps) }
    w.updatedAt = now()
    if (dropped) purgeUnreferenced(w.companyId, dropped)   // frames this edit removed
    persist()
    return publicShape(w)
  }

  function publishWorkflow(userId, wid) {
    const { a, w } = mustAct(userId, wid)
    if (!wf.canPublish(w.state)) throw httpErr(409, 'Only a draft can be published.')
    const v = wf.validateMeta(w.meta)
    if (!v.ok) throw httpErr(400, `Cannot publish, missing: ${v.missing.join(', ')}.`)
    if (!wf.validateSteps(w.steps).ok) throw httpErr(400, 'Add at least one step with an instruction before publishing.')
    const t = now()
    // Supersede the live version in the same group, so no user mid-task on the
    // old guide is cut off until the new one is actually published.
    for (const other of all()) {
      if (other.groupId === w.groupId && other.id !== w.id && other.state === 'published') {
        other.state = 'retired'; other.retiredAt = t; other.updatedAt = t
      }
    }
    w.state = 'published'; w.publishedAt = t; w.updatedAt = t; persist()
    emit('workflow_published', { id: w.id, groupId: w.groupId, companyId: a.companyId, by: a.id })
    return publicShape(w)
  }

  // Clone a workflow into a new draft (same group, next version). The source
  // keeps its state (a live published one stays live until the revision ships).
  function reviseWorkflow(userId, wid) {
    const { a, w } = mustAct(userId, wid)
    const t = now()
    const rec = {
      id: id(), groupId: w.groupId, version: wf.nextVersion(all().filter((x) => x.groupId === w.groupId)),
      state: 'draft', companyId: a.companyId, authorId: a.id,
      meta: { ...w.meta }, steps: w.steps.map((s) => ({ ...s })),
      createdAt: t, updatedAt: t, publishedAt: null, retiredAt: null,
    }
    all().push(rec); persist()
    return publicShape(rec)
  }

  function retireWorkflow(userId, wid) {
    const { w } = mustAct(userId, wid)
    if (!wf.canRetire(w.state)) throw httpErr(409, 'Only a published workflow can be retired.')
    const t = now(); w.state = 'retired'; w.retiredAt = t; w.updatedAt = t; persist()
    return publicShape(w)
  }

  function deleteWorkflow(userId, wid) {
    const { w } = mustAct(userId, wid)
    const i = all().findIndex((x) => x.id === w.id)
    if (i >= 0) all().splice(i, 1)
    // Purge its captured frames too, except any another version still shares.
    const framesPurged = purgeUnreferenced(w.companyId, shotsOf(w))
    persist()
    emit('workflow_deleted', { id: wid, companyId: w.companyId, framesPurged })
    return { ok: true, id: wid }
  }

  // ---- Wave 2 capture frames: scrubbed screenshots referenced by step.shot ----
  // Upload needs the trainer grant or company admin (same as authoring) and lands
  // in the uploader's own tenant folder. Read is company-scoped: a ref resolves
  // only inside the reader's own company folder, and refs are unguessable.
  function uploadWorkflowFrame(userId, dataUrl) {
    const a = actor(userId); requireAuthor(a)
    if (!frames) throw httpErr(503, 'Frame storage is not configured on this server.')
    const v = parseImageDataUrl(dataUrl)
    if (!v.ok) throw httpErr(v.status, v.error)
    if (!v.ext) throw httpErr(400, 'A workflow frame must be a JPEG, PNG or WebP image.')
    return { ref: frames.save(a.companyId, v.buffer, v.ext) }
  }
  function readWorkflowFrame(userId, ref) {
    const a = actor(userId)
    if (!frames) throw httpErr(503, 'Frame storage is not configured on this server.')
    if (!wf.isFrameRef(ref)) throw httpErr(400, 'That is not a valid frame reference.')
    const out = frames.read(a.companyId, ref)
    if (!out) throw httpErr(404, 'Frame not found.')
    return out
  }

  // ---- Wave 3 step reading: what the vision model saw in a step's frames ----
  // prepare: the author/admin of a DRAFT gets the step, its after-step and a
  // tenant-scoped frame loader (data URL) for workflow_step_reader.js.
  function prepareStepRead(userId, wid, stepId) {
    const { w } = mustAct(userId, wid)
    if (!wf.canEditContent(w.state)) throw httpErr(409, 'Only a draft can be read. Revise a published workflow to make a new version.')
    if (!frames) throw httpErr(503, 'Frame storage is not configured on this server.')
    const index = (w.steps || []).findIndex((s) => s && s.id === stepId)
    if (index < 0) throw httpErr(404, 'Step not found.')
    const companyId = w.companyId
    const loadFrame = (ref) => {
      const f = wf.isFrameRef(ref) ? frames.read(companyId, ref) : null
      if (!f) throw httpErr(404, 'The screenshot for this step is missing. Record it again or fill in the control yourself.')
      return `data:${f.mime};base64,${f.buffer.toString('base64')}`
    }
    return { step: w.steps[index], nextStep: w.steps[index + 1] || null, meta: w.meta, index, total: w.steps.length, loadFrame }
  }
  // save: attach the reading as a suggestion. It never touches the trainer's own
  // target/doneWhen, and it is dropped when the step's frame changed while the
  // read was in flight (the trainer edited the step), so a reading always
  // describes the frame the step shows now.
  function saveStepReading(userId, wid, stepId, reading) {
    const { w } = mustAct(userId, wid)
    if (!wf.canEditContent(w.state)) throw httpErr(409, 'Only a draft can be edited. Revise a published workflow to make a new version.')
    const i = (w.steps || []).findIndex((x) => x && x.id === stepId)
    if (i < 0) throw httpErr(404, 'Step not found.')
    const s = w.steps[i]
    const r = wf.normalizeReading(reading, s.shot)
    const nextShot = w.steps[i + 1] ? w.steps[i + 1].shot : null
    if (!r || (r.afterShot && r.afterShot !== nextShot)) throw httpErr(409, 'This step changed while it was being read. Read it again.')
    s.reading = r; w.updatedAt = now(); persist()
    return publicShape(w)
  }

  return {
    listWorkflowsForUser, getWorkflowForUser, createWorkflow, updateWorkflow,
    publishWorkflow, reviseWorkflow, retireWorkflow, deleteWorkflow,
    uploadWorkflowFrame, readWorkflowFrame, userCanAuthorWorkflows,
    prepareStepRead, saveStepReading, referencedFrames,
  }
}

export default { createWorkflows }
