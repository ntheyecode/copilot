// ===========================================================================
// WorkCoPilot TEACH WORKFLOWS, Wave 3 part C: workflow incidents.
//
// When an employee running a published workflow hits a screen the workflow does
// not expect (workflow_deviation.js), the guide raises an incident with the
// details, the screen it saw (only when the company keeps screenshots) and why
// it thinks the workflow is off. It goes to the people who keep workflows right:
// trainers, PMs and above, company admins and executives
// (work_roles.canReceiveWorkflowIncidents), as one alert per NEW incident in
// their workflow-alert inbox (separate from billing alerts). Repeats of the same
// workflow step and kind add an occurrence, never a new alert; a DISMISSED
// incident stays quiet; a repeat after RESOLVED is a regression and alerts again.
//
// An untrained path carries the step the guide had to add; the workflow's author
// (or a company admin) can adopt it into the workflow's draft in one action (the
// autolearn loop: the product proposes, a person decides and publishes).
//
// The incident is about the WORKFLOW, not a person's performance. Deleting a
// session, an account or a company removes what it contributed (purge below).
//
// Created with the store's context (never imports the store).
// ctx: { db, persist, id, now, httpErr, getUser, emit?, companyUsers(companyId),
//        inbox: { add }, frames: { save, read, remove }, shotsAllowed(userId),
//        workflows: { getWorkflowForUser, reviseWorkflow, updateWorkflow, deleteWorkflow } }
// ===========================================================================
import * as roles from './work_roles.js'
import { DEVIATION_KINDS } from './workflow_deviation.js'
import { parseImageDataUrl } from './image_data_url.js'

export const INCIDENT_STATES = ['open', 'acknowledged', 'resolved', 'dismissed']
const ACTIVE = new Set(['open', 'acknowledged'])
const MAX_OCCURRENCES = 50          // detail kept per incident (the count keeps going)
const MAX_SESSION_IDS = 1000        // sessions remembered per incident for dedupe
const MAX_PER_SESSION = 10          // incidents one guided session may raise
const MAX_PER_COMPANY = 2000        // oldest closed ones are dropped past this
// Workflow alerts live in their own inbox per person, so a burst of incidents
// can never push billing or usage alerts out of the shared one.
export const alertInboxOf = (userId) => `wfi:${userId}`

const STR = (v, n = 400) => String(v == null ? '' : v).trim().slice(0, n)
const norm = (v) => STR(v, 200).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)

export function createWorkflowIncidents(ctx) {
  const { persist, id, now, httpErr, getUser } = ctx
  const db = () => { const d = ctx.db(); if (!Array.isArray(d.workflowIncidents)) d.workflowIncidents = []; return d }
  const all = () => db().workflowIncidents
  const workflowById = (wid) => (Array.isArray(ctx.db().workflows) ? ctx.db().workflows : []).find((w) => w && w.id === wid) || null

  function viewer(userId) {
    const u = getUser(userId)
    if (!u || !u.companyId) throw httpErr(403, 'No company in scope.')
    const grants = roles.sanitizeGrants(u.companyRole, u.grants)
    const role = u.companyRole || 'member'
    return {
      id: u.id, companyId: u.companyId, role, grants,
      canSee: roles.canReceiveWorkflowIncidents(role, grants),
      canManage: roles.canManageWorkflowIncidents(role, grants),
      canAuthor: roles.canAuthorWorkflow(role, grants),
      isAdmin: roles.isCompanyAdmin(role),
    }
  }
  function mustSee(userId) {
    const v = viewer(userId)
    if (!v.canSee) throw httpErr(403, 'Workflow incidents go to trainers, project managers, admins and executives.')
    return v
  }
  const sameCompany = (x, v) => !!x && String(x.companyId) === String(v.companyId)
  const isRun = (ref) => !!ref && ref.mode !== 'plan'

  // run mode: the session's steps are the workflow's, so the step index is the
  // workflow step. plan mode: steps differ, so the step's own text identifies it.
  function keyOf(ref, stepIndex, stepText, kind) {
    const slot = isRun(ref) && Number.isInteger(stepIndex) ? `s${stepIndex}` : `p:${norm(stepText)}`
    return `${ref.id}|${slot}|${kind}`
  }

  // Structured alert only: the client words it in the reader's language.
  function notify(inc, reporterId) {
    if (!ctx.inbox || typeof ctx.companyUsers !== 'function') return 0
    let n = 0
    for (const u of ctx.companyUsers(inc.companyId) || []) {
      if (!u || u.id === reporterId || u.disabled) continue
      if (!roles.canReceiveWorkflowIncidents(u.companyRole, roles.sanitizeGrants(u.companyRole, u.grants))) continue
      ctx.inbox.add(alertInboxOf(u.id), {
        type: 'workflow_incident', incidentId: inc.id, workflowId: inc.workflowRef.id,
        workflowTitle: inc.workflowRef.title, kind: inc.kind, stepIndex: inc.stepIndex, why: inc.why,
      })
      n++
    }
    return n
  }

  function removeFrame(x) {
    if (x.frameRef && ctx.frames) { try { ctx.frames.remove(x.companyId, [x.frameRef]) } catch { /* best-effort */ } }
    x.frameRef = null; x.frameSessionId = null; x.frameUserId = null
  }
  function drop(x) { removeFrame(x); const i = all().indexOf(x); if (i >= 0) all().splice(i, 1) }

  function trim(companyId) {
    const mine = all().filter((x) => String(x.companyId) === String(companyId))
    if (mine.length <= MAX_PER_COMPANY) return
    const closed = mine.filter((x) => !ACTIVE.has(x.state)).sort((a, b) => String(a.lastAt).localeCompare(String(b.lastAt)))
    for (const x of closed.slice(0, mine.length - MAX_PER_COMPANY)) drop(x)
  }

  // Called by the watch route. Returns { incident, created } or null.
  function recordWorkflowIncident({ userId, sessionId, workflowRef, stepIndex = null, stepText = '', deviation, frameDataUrl = null, masked = false }) {
    const u = getUser(userId)
    const ref = workflowRef && workflowRef.id ? workflowRef : null
    if (!u || !u.companyId || !ref || !deviation || !DEVIATION_KINDS.includes(deviation.kind)) return null
    const sid = STR(sessionId, 80)
    const company = all().filter((x) => String(x.companyId) === String(u.companyId))
    if (company.filter((x) => (x.sessionIds || []).includes(sid)).length >= MAX_PER_SESSION) return null
    const idx = isRun(ref) && Number.isInteger(stepIndex) && stepIndex >= 0 ? stepIndex : null
    const key = keyOf(ref, idx, stepText, deviation.kind)
    const t = now()
    const occ = { at: t, userId: u.id, sessionId: sid, why: STR(deviation.why, 300) }
    // Same key: an active incident takes the occurrence; a dismissed one takes it
    // quietly (the team decided it is not a problem). A resolved one does not
    // match, so a recurrence after a fix is a new incident: a regression.
    const existing = company.find((x) => x.key === key && ACTIVE.has(x.state)) ||
      company.filter((x) => x.key === key && x.state === 'dismissed').sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))[0]
    if (existing) {
      // One occurrence per session: a guide re-reading the same broken screen
      // every few seconds is still one person hitting it once.
      if (!(existing.sessionIds || []).includes(sid)) {
        existing.count = (existing.count || 1) + 1
        existing.sessionIds = [sid, ...(existing.sessionIds || [])].slice(0, MAX_SESSION_IDS)
        existing.occurrences = [occ, ...(existing.occurrences || [])].slice(0, MAX_OCCURRENCES)
        existing.lastAt = t
        if (!existing.extraStep && deviation.extraStep) existing.extraStep = STR(deviation.extraStep, 300)
        persist()
      }
      return { incident: existing, created: false }
    }
    let frameRef = null
    const shotsOk = typeof ctx.shotsAllowed === 'function' ? !!ctx.shotsAllowed(u.id) : false
    if (frameDataUrl && ctx.frames && shotsOk) {
      const img = parseImageDataUrl(frameDataUrl)
      if (img.ok && img.ext) { try { frameRef = ctx.frames.save(u.companyId, img.buffer, img.ext) } catch { frameRef = null } }
    }
    const live = isRun(ref) ? workflowById(ref.id) : null
    const inc = {
      id: 'wi' + id(), key, companyId: u.companyId,
      workflowRef: { id: STR(ref.id, 80), groupId: STR(ref.groupId, 80), version: Number(ref.version) || 1, title: STR(ref.title, 200), mode: isRun(ref) ? 'run' : 'plan' },
      stepIndex: idx,
      // The workflow step's own id, so an adopted step lands in the right place in
      // a later draft even after other steps were added before it.
      workflowStepId: idx != null && live && live.steps && live.steps[idx] ? STR(live.steps[idx].id, 80) || null : null,
      stepText: STR(stepText, 400),
      kind: deviation.kind, why: STR(deviation.why, 300), extraStep: deviation.extraStep ? STR(deviation.extraStep, 300) : null,
      frameRef, frameSessionId: frameRef ? sid : null, frameUserId: frameRef ? u.id : null, masked: !!masked,
      state: 'open', count: 1, sessionIds: [sid], occurrences: [occ], firstAt: t, lastAt: t,
      decidedBy: null, decidedAt: null, note: null, resolution: null, draftId: null,
    }
    all().push(inc)
    trim(u.companyId)
    notify(inc, u.id)   // inbox notes are saved by the persist below
    persist()
    if (typeof ctx.emit === 'function') ctx.emit('workflow_incident', { id: inc.id, companyId: inc.companyId, workflowId: inc.workflowRef.id, kind: inc.kind })
    return { incident: inc, created: true }
  }

  // Adopt is for whoever may change that workflow: its author or a company admin
  // (the workflow store's own rule), on an untrained path from a run session.
  function adoptable(x, v) {
    if (!(v.canAuthor && x.kind === 'untrained_path' && x.extraStep && x.workflowRef.mode === 'run' && Number.isInteger(x.stepIndex) && ACTIVE.has(x.state))) return false
    if (x.draftId) { const d = workflowById(x.draftId); if (d && d.state === 'draft') return false }
    const w = workflowById(x.workflowRef.id)
    return !!w && (v.isAdmin || String(w.authorId) === String(v.id))
  }

  function publicShape(x, v) {
    return {
      id: x.id, workflowRef: x.workflowRef, stepIndex: x.stepIndex, stepText: x.stepText,
      kind: x.kind, why: x.why, extraStep: x.extraStep, hasFrame: !!x.frameRef, masked: !!x.masked,
      state: x.state, count: x.count || 1, firstAt: x.firstAt, lastAt: x.lastAt,
      occurrences: (x.occurrences || []).slice(0, 10).map((o) => {
        const p = getUser(o.userId)
        return { at: o.at, userId: o.userId, name: p ? (p.name || p.username || '') : '', why: o.why }
      }),
      decidedAt: x.decidedAt, note: x.note, resolution: x.resolution, draftId: x.draftId,
      canAdopt: adoptable(x, v),
    }
  }

  function listWorkflowIncidents(userId, { state = null, workflowId = null, limit = 200 } = {}) {
    const v = mustSee(userId)
    let list = all().filter((x) => sameCompany(x, v))
    const summary = { open: 0, acknowledged: 0, resolved: 0, dismissed: 0, byKind: {} }
    for (const x of list) {
      summary[x.state] = (summary[x.state] || 0) + 1
      if (ACTIVE.has(x.state)) summary.byKind[x.kind] = (summary.byKind[x.kind] || 0) + 1
    }
    if (state === 'active') list = list.filter((x) => ACTIVE.has(x.state))
    else if (state && INCIDENT_STATES.includes(state)) list = list.filter((x) => x.state === state)
    if (workflowId) list = list.filter((x) => x.workflowRef.id === workflowId || x.workflowRef.groupId === workflowId)
    list.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
    return { incidents: list.slice(0, Math.max(1, Math.min(500, Number(limit) || 200))).map((x) => publicShape(x, v)), summary, canManage: v.canManage }
  }

  function mustFind(v, incidentId) {
    const x = all().find((y) => y.id === incidentId)
    if (!sameCompany(x, v)) throw httpErr(404, 'Incident not found.')
    return x
  }

  function setWorkflowIncidentState(userId, incidentId, { state, note } = {}) {
    const v = mustSee(userId)
    if (!v.canManage) throw httpErr(403, 'Only trainers, project managers and company admins can update an incident.')
    if (!INCIDENT_STATES.includes(state)) throw httpErr(400, 'Unknown incident state.')
    const x = mustFind(v, incidentId)
    x.state = state; x.decidedBy = v.id; x.decidedAt = now(); x.note = STR(note, 500) || null
    if (state === 'resolved' || state === 'dismissed') x.resolution = x.resolution === 'adopted' ? 'adopted' : state
    else x.resolution = x.resolution === 'adopted' ? 'adopted' : null
    persist()
    return publicShape(x, v)
  }

  function readWorkflowIncidentFrame(userId, incidentId) {
    const v = mustSee(userId)
    const x = mustFind(v, incidentId)
    if (!x.frameRef || !ctx.frames) throw httpErr(404, 'This incident has no screenshot.')
    const f = ctx.frames.read(x.companyId, x.frameRef)
    if (!f) throw httpErr(404, 'This incident has no screenshot.')
    return f
  }

  // Put the untrained step into the workflow's DRAFT, before the workflow step
  // where the person had to take it. An existing draft in the same workflow
  // group is reused (several adopted steps make one draft to review, not one
  // draft each); otherwise the live version is revised into a new draft. The live
  // version keeps running until a person publishes the draft. A failure after a
  // new draft was made removes that draft again (nothing half-done is left).
  function adoptWorkflowIncidentStep(userId, incidentId) {
    const v = mustSee(userId)
    const x = mustFind(v, incidentId)
    if (!(x.kind === 'untrained_path' && x.extraStep && x.workflowRef.mode === 'run' && Number.isInteger(x.stepIndex))) {
      throw httpErr(409, 'This incident has no step to add.')
    }
    if (!ACTIVE.has(x.state)) throw httpErr(409, 'This incident is already closed.')
    if (x.draftId) { const d = workflowById(x.draftId); if (d && d.state === 'draft') throw httpErr(409, 'This step is already in a draft waiting for review.') }
    if (!adoptable(x, v)) throw httpErr(403, 'Only the workflow\'s author or a company admin can add a step to it.')
    const source = ctx.workflows.getWorkflowForUser(userId, x.workflowRef.id)
    const existingDraft = (Array.isArray(ctx.db().workflows) ? ctx.db().workflows : []).find((w) =>
      w && w.groupId === source.groupId && w.state === 'draft' && String(w.companyId) === String(v.companyId) &&
      (v.isAdmin || String(w.authorId) === String(v.id)))
    if (!existingDraft && source.state !== 'published') throw httpErr(409, 'That workflow version is no longer live. Add the step to its newest version instead.')
    const draft = existingDraft ? ctx.workflows.getWorkflowForUser(userId, existingDraft.id) : ctx.workflows.reviseWorkflow(userId, source.id)
    try {
      const steps = (draft.steps || []).slice()
      const anchor = x.workflowStepId ? steps.findIndex((s) => s && s.id === x.workflowStepId) : -1
      const at = anchor >= 0 ? anchor : Math.min(Math.max(0, x.stepIndex), steps.length)
      steps.splice(at, 0, { instruction: x.extraStep })
      const updated = ctx.workflows.updateWorkflow(userId, draft.id, { steps })
      x.state = 'resolved'; x.resolution = 'adopted'; x.draftId = updated.id; x.decidedBy = v.id; x.decidedAt = now()
      persist()
      return { workflow: updated, incident: publicShape(x, v) }
    } catch (e) {
      if (!existingDraft) { try { ctx.workflows.deleteWorkflow(userId, draft.id) } catch { /* best-effort */ } }
      throw e
    }
  }

  // Privacy: remove what a deleted session, account or company contributed. A
  // whole company: every incident and screenshot. A session or account: its
  // occurrences and any screenshot it supplied; an incident left with no
  // occurrence is removed.
  function purgeWorkflowIncidents({ companyId = null, sessionId = null, userId = null } = {}) {
    let changed = 0
    const hit = (o) => (sessionId && o.sessionId === sessionId) || (userId && o.userId === userId)
    for (const x of all().slice()) {
      if (companyId) {
        if (String(x.companyId) === String(companyId)) { drop(x); changed++ }
        continue
      }
      if (!sessionId && !userId) continue
      if ((sessionId && x.frameSessionId === sessionId) || (userId && x.frameUserId === userId)) { removeFrame(x); changed++ }
      const before = (x.occurrences || []).length
      x.occurrences = (x.occurrences || []).filter((o) => !hit(o))
      const gone = before - x.occurrences.length
      if (sessionId && (x.sessionIds || []).includes(sessionId)) { x.sessionIds = x.sessionIds.filter((s) => s !== sessionId); changed++ }
      if (gone) {
        changed++
        x.count = Math.max(x.occurrences.length, (x.count || before) - gone)
        if (!x.occurrences.length) drop(x)
      }
    }
    if (changed) persist()
    return changed
  }

  // ---- Company-scoped reads for the integration API (a key, not a person) ----
  // Raw records of ONE company; the v1 layer maps them to a shape with no person
  // names, user ids or frames.
  function listIncidentsForCompany(companyId, { state = null, workflowId = null, limit = 100 } = {}) {
    let list = all().filter((x) => String(x.companyId) === String(companyId))
    if (state === 'active') list = list.filter((x) => ACTIVE.has(x.state))
    else if (state && INCIDENT_STATES.includes(state)) list = list.filter((x) => x.state === state)
    if (workflowId) list = list.filter((x) => x.workflowRef.id === workflowId || x.workflowRef.groupId === workflowId)
    list.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
    return list.slice(0, Math.max(1, Math.min(500, Number(limit) || 100)))
  }
  function getIncidentForCompany(companyId, incidentId) {
    const x = all().find((i) => i.id === String(incidentId || ''))
    return x && String(x.companyId) === String(companyId) ? x : null
  }

  return {
    recordWorkflowIncident, listWorkflowIncidents, setWorkflowIncidentState,
    readWorkflowIncidentFrame, adoptWorkflowIncidentStep, purgeWorkflowIncidents,
    listIncidentsForCompany, getIncidentForCompany,
  }
}

export default { createWorkflowIncidents, INCIDENT_STATES, alertInboxOf }
