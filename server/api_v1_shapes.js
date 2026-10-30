// ===========================================================================
// WorkCoPilot integration API v1: the PUBLIC shapes (pure, allowlist-built).
//
// Each function copies named fields only, so a new internal field (author ids,
// frames, readings, occurrences with person names) can never leak by default.
// What is deliberately left out:
//   workflows: authorId, owner / support contact (people), step screenshots and
//              the step reader's suggestions, drafts and retired versions;
//   incidents: who hit it (user ids, names, sessions), the captured screen, the
//              reviewer's note.
// ===========================================================================

const s = (v) => (v == null ? '' : String(v))

export function v1WorkflowSummary(w) {
  const m = w.meta || {}
  return {
    id: s(w.id), groupId: s(w.groupId), version: Number(w.version) || 1,
    title: s(m.title), productName: s(m.productName), productVersion: s(m.version), category: s(m.category),
    language: s(m.language) || 'en', durationMin: Number.isFinite(m.durationMin) ? m.durationMin : null,
    prerequisites: s(m.prerequisites), launchTarget: s(m.launchTarget), webLink: s(m.webLink),
    publishedAt: w.publishedAt || null, updatedAt: w.updatedAt || null,
    stepCount: Array.isArray(w.steps) ? w.steps.length : 0,
  }
}

export function v1Workflow(w) {
  return {
    ...v1WorkflowSummary(w),
    steps: (Array.isArray(w.steps) ? w.steps : []).map((st, i) => ({
      id: s(st && st.id), index: i, instruction: s(st && st.instruction),
      target: (st && st.target) || null, doneWhen: (st && st.doneWhen) || null,
    })),
  }
}

export function v1Incident(x) {
  const r = x.workflowRef || {}
  return {
    id: s(x.id), kind: s(x.kind), state: s(x.state), why: s(x.why),
    stepIndex: Number.isInteger(x.stepIndex) ? x.stepIndex : null, stepText: s(x.stepText),
    extraStep: x.extraStep ? s(x.extraStep) : null, count: Number(x.count) || 1,
    firstAt: x.firstAt || null, lastAt: x.lastAt || null, decidedAt: x.decidedAt || null,
    workflow: { id: s(r.id), groupId: s(r.groupId), version: Number(r.version) || null, title: s(r.title) },
  }
}

export default { v1WorkflowSummary, v1Workflow, v1Incident }
