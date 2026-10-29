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

// ctx: { db: () => object, persist, id, now, httpErr, getUser, emit }
export function createWorkflows(ctx) {
  const { persist, id, now, httpErr, getUser } = ctx
  const emit = ctx.emit || (() => {})
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
      companyId: a.companyId, authorId: a.id, meta: v.meta, steps: s.steps,
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
    if (steps !== undefined) w.steps = wf.validateSteps(steps).steps
    w.updatedAt = now(); persist()
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
    if (i >= 0) { all().splice(i, 1); persist() }
    emit('workflow_deleted', { id: wid, companyId: w.companyId })
    return { ok: true, id: wid }
  }

  return {
    listWorkflowsForUser, getWorkflowForUser, createWorkflow, updateWorkflow,
    publishWorkflow, reviseWorkflow, retireWorkflow, deleteWorkflow,
  }
}

export default { createWorkflows }
