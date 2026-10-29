// Project-map planner (Depth-2). Given a LARGE goal, break it into an ordered list
// of TASKS (each a self-contained workflow with its own done-state and dependencies)
// and define the project end-state - the "plan the whole map at once" step. Each
// task's micro-steps are expanded JUST-IN-TIME later (reusing workPlan), so this
// prompt stays at the workstream level. Own module (SUPREME XV); reuses extractJson
// + scrubGuidance (SUPREME II). Pure prompt builder + one AI call; no store/db.
import { extractJson } from './work.js'
import { scrubGuidance } from './ai_language.js'

export function planProjectMapSystem({ base }) {
  return String(base || '').trim() +
    '\n\n---\nPLAN A PROJECT AS AN ORDERED MAP OF TASKS\n' +
    'The goal is a LARGE initiative that spans several distinct pieces of work. Break it into an ' +
    'ordered list of TASKS, where each task is ONE self-contained workflow a person completes on ' +
    'its own (for example, for a ServiceNow rollout: "Provision the instance", "Build the CMDB", ' +
    '"Configure Incident/Change/Problem", "Set up SLAs and the portal", "Run UAT", "Go live"). Do ' +
    'NOT plan the individual clicks here - only the tasks; each task is expanded into exact steps ' +
    'later, when the person reaches it.\n' +
    'ONE WORKFLOW = ONE TASK. If the whole goal is really a single workflow, return exactly ONE ' +
    'task - do not pad it into several (a false project). Only split genuinely separate workflows. ' +
    'Every task MUST be a real, independently meaningful and verifiable deliverable: give each a ' +
    'clear "title", a one-line "goal" (what that task achieves), and a "doneState" (what is visibly ' +
    'true once that task is complete). Never invent filler tasks.\n' +
    'ORDER + DEPENDENCIES. List the tasks in the order they should be done. For each task set ' +
    '"dependsOn": an array of the INDEX NUMBERS (0-based, into this tasks list) of the earlier tasks ' +
    'that must be finished first; use [] when it can start on its own. Keep dependencies real and ' +
    'acyclic.\n' +
    'END STATE (keep the end in mind). Define the project "endState": "done" is one sentence stating ' +
    'what is true when the WHOLE project is complete, and "checks" is a short list of concrete things ' +
    'that must all hold at the end. The tasks together must reach this end state with no gap and ' +
    'nothing extra.\n' +
    'Give the project a short "name". If the goal is one you must not help with (SAFETY), return ' +
    '{"refusal":"one short sentence"} and no tasks.\n' +
    'TASK OVERVIEW. For EACH task also give an "overview": a 3 to 5 sentence, plain-language description ' +
    'of WHAT THE PERSON WILL DO in that task and what being done looks like (so someone opening it later ' +
    'understands it at a glance). Use **bold** on the main action and key nouns, wrap the final outcome / ' +
    'done-condition in ==double equals==, and use *italics* for a caveat or dependency. Write it in the ' +
    'goal\'s language; be specific and concrete, no filler.\n' +
    'Return ONLY JSON: {"refusal":"<only when declining>","name":"<short project name>","endState":{"done":"<one sentence>","checks":["<concrete check>"]},"tasks":[{"title":"<short>","goal":"<what this task achieves>","doneState":"<visible when done>","overview":"<3-5 sentences with **bold**, ==highlight==, *italics*>","dependsOn":[<indices>]}]}'
}

export function planProjectMapUser({ goal, appContext = '', research = '', learnings = '' }) {
  return (
    `GOAL (a large initiative):\n${String(goal || '').trim() || '(none given)'}\n\n` +
    (appContext ? `CONTEXT / ENVIRONMENT: ${appContext}\n\n` : '') +
    (String(learnings || '').trim() ? `WHAT WE LEARNED BEFORE (treat as current, verified):\n${String(learnings).trim()}\n\n` : '') +
    (String(research || '').trim() ? `CURRENT RESEARCH NOTES (more up to date than memory):\n${String(research).trim()}\n\n` : '') +
    'Produce the project map JSON now.')
}

const S = (v, n = 400) => scrubGuidance(String(v || '').trim()).slice(0, n)

export async function planProjectMap(ai, cfg, { base, goal, appContext = '', research = '', learnings = '', tele = null } = {}) {
  const system = planProjectMapSystem({ base })
  const user = planProjectMapUser({ goal, appContext, research, learnings })
  const raw = await ai.generate(cfg, system, user, tele)
  const parsed = extractJson(raw, 'tasks') || {}
  const refusal = S(parsed.refusal, 300)
  if (refusal) return { refusal, name: null, endState: { done: '', checks: [] }, tasks: [] }
  const endState = {
    done: S(parsed.endState && parsed.endState.done, 300),
    checks: Array.isArray(parsed.endState && parsed.endState.checks) ? parsed.endState.checks.map((c) => S(c, 200)).filter(Boolean).slice(0, 20) : [],
  }
  const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : []).map((t) => ({
    title: S(t && t.title, 160),
    goal: S(t && t.goal, 400) || S(t && t.title, 160),
    doneState: S(t && t.doneState, 300),
    overview: S(t && t.overview, 1000),
    // dependsOn: keep only valid 0-based indices that point BACKWARD (acyclic by construction);
    // the final cycle/validity gate is validateBreakdown in the caller.
    dependsOn: Array.isArray(t && t.dependsOn) ? t.dependsOn.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0) : [],
  })).filter((t) => t.title)
  // Prune dependsOn indices that are out of range (defensive).
  for (const t of tasks) t.dependsOn = t.dependsOn.filter((d) => d < tasks.length)
  return { refusal: null, name: S(parsed.name, 120) || 'Project', endState, tasks }
}
