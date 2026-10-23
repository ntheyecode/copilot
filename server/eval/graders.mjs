// ---------------------------------------------------------------------------
// WorkCoPilot accuracy benchmark - GRADERS
// ---------------------------------------------------------------------------
// Decides whether a produced result matches a task's known-correct answer.
// Grading rigor order (most -> least gameable-resistant):
//   exec  - run the answer (JS now; SQL/python in C2) against a fixture, compare
//   deterministic - exact / number / json / table / regex
//   judge - a strong model scores vs a reference + rubric (injected askJudge fn)
// Every grader returns { pass, score (0..1), detail }. Pure + dependency-free so
// the whole thing is unit-testable offline; the model run + judge are injected.
// Spec: docs/accuracy-benchmark-spec.md
// ---------------------------------------------------------------------------

const norm = (s) => String(s == null ? '' : s).replace(/\r\n/g, '\n').trim()
// Collapse whitespace + lowercase for lenient text compares.
const loose = (s) => norm(s).replace(/\s+/g, ' ').toLowerCase()

// Pull the first number out of a string (handles $, commas, %, scientific).
function firstNumber(s) {
  const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/)
  return m ? Number(m[0]) : NaN
}

// --- deterministic graders --------------------------------------------------

export function gradeExact(output, truth, { caseSensitive = false } = {}) {
  const a = caseSensitive ? norm(output) : loose(output)
  const b = caseSensitive ? norm(truth) : loose(truth)
  const pass = a === b
  return { pass, score: pass ? 1 : 0, detail: pass ? 'exact match' : `expected "${b}", got "${a.slice(0, 80)}"` }
}

// Numeric with absolute OR relative tolerance (default: exact to 1e-9 / 1e-6 rel).
export function gradeNumber(output, truth, { abs = 1e-9, rel = 1e-6 } = {}) {
  const got = firstNumber(output)
  const want = typeof truth === 'number' ? truth : firstNumber(truth)
  if (!Number.isFinite(got) || !Number.isFinite(want)) return { pass: false, score: 0, detail: `not numeric (got ${got}, want ${want})` }
  const diff = Math.abs(got - want)
  const ok = diff <= abs || diff <= Math.abs(want) * rel
  return { pass: ok, score: ok ? 1 : 0, detail: ok ? `within tolerance (${got})` : `expected ${want}, got ${got} (diff ${diff})` }
}

// Deep equality for JSON: object keys are order-INSENSITIVE, arrays are compared
// IN ORDER (positional), numbers within 1e-9. Extracts the first JSON value from
// the output. (If a future task needs set-style array compare, add an explicit
// opt; it is intentionally not assumed here so lists are graded strictly.)
function extractJson(s) {
  const t = norm(s).replace(/^```(?:json)?\s*|\s*```$/g, '')
  try { return JSON.parse(t) } catch { /* fall through */ }
  const m = t.match(/[[{][\s\S]*[\]}]/)
  if (m) { try { return JSON.parse(m[0]) } catch { /* ignore */ } }
  return undefined
}
function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false
      return a.every((x, i) => deepEqual(x, b[i]))
    }
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort()
    if (ka.length !== kb.length || !ka.every((k, i) => k === kb[i])) return false
    return ka.every((k) => deepEqual(a[k], b[k]))
  }
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9
  return false
}
export function gradeJson(output, truth) {
  const got = extractJson(output)
  const want = typeof truth === 'string' ? extractJson(truth) : truth
  if (got === undefined) return { pass: false, score: 0, detail: 'no JSON found in output' }
  const pass = deepEqual(got, want)
  return { pass, score: pass ? 1 : 0, detail: pass ? 'json deep-equal' : 'json differs from reference' }
}

// GFM / pipe table compare: parse both to a grid, compare cells (loose).
function parseTable(s) {
  const lines = norm(s).split('\n').map((l) => l.trim()).filter((l) => l.includes('|'))
  const isSep = (cells) => cells.length && cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')))
  const split = (l) => { let x = l; if (x.startsWith('|')) x = x.slice(1); if (x.endsWith('|')) x = x.slice(0, -1); return x.split('|').map((c) => c.trim()) }
  const rows = lines.map(split).filter((r) => !isSep(r))
  return rows
}
export function gradeTable(output, truth) {
  const g = parseTable(output), w = parseTable(typeof truth === 'string' ? truth : '')
  if (!w.length) return { pass: false, score: 0, detail: 'no reference table' }
  if (!g.length) return { pass: false, score: 0, detail: 'no table found in output' }
  // Compare as MULTISETS of rows (order-insensitive, cells loose-compared): each
  // output row can satisfy at most one reference row, so duplicate reference rows
  // are not over-counted by a plain set (which would false-pass a wrong answer).
  const key = (r) => r.map(loose).join('\u001f')
  const counts = new Map()
  for (const r of g.map(key)) counts.set(r, (counts.get(r) || 0) + 1)
  const ws = w.map(key)
  let hit = 0
  for (const r of ws) { const n = counts.get(r) || 0; if (n > 0) { counts.set(r, n - 1); hit++ } }
  const score = hit / ws.length
  const pass = score === 1 && g.length === w.length
  return { pass, score, detail: `${hit}/${ws.length} reference rows matched` }
}

export function gradeRegex(output, pattern, { flags = 'i' } = {}) {
  let re
  try { re = new RegExp(pattern, flags) } catch { return { pass: false, score: 0, detail: 'bad regex in task' } }
  const pass = re.test(norm(output))
  return { pass, score: pass ? 1 : 0, detail: pass ? 'regex matched' : `did not match /${pattern}/${flags}` }
}

// --- exec grader (JS now; SQL/python land in C2) ----------------------------
// Runs candidate JS in an isolated vm context against the task's `exec.inputs`,
// comparing the returned value to `exec.expected`. The candidate is expected to
// be an expression or a function body that produces `exec.entry(inputs)`; tasks
// declare `exec.kind`. Kept minimal + safe (no require, no process, timeout).
export async function gradeExec(output, task, { runJs } = {}) {
  const ex = (task && task.exec) || {}
  if (ex.kind === 'js') {
    if (typeof runJs !== 'function') return { pass: false, score: 0, detail: 'js exec runner not provided (C2)' }
    // Wall-clock deadline: the vm sync timeout bounds synchronous code, but an
    // async/never-resolving candidate (e.g. `()=>new Promise(()=>{})`) returns a
    // pending Promise under that timeout, so await it under our own deadline or
    // the whole run would hang. Deadline sits just above the sync vm timeout.
    const deadline = (ex.timeoutMs || 1000) + 500
    try {
      const got = await Promise.race([
        Promise.resolve().then(() => runJs(output, ex)),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`exec timed out (${deadline}ms)`)), deadline)),
      ])
      const pass = deepEqual(got, ex.expected)
      return { pass, score: pass ? 1 : 0, detail: pass ? 'exec output matches' : `exec got ${JSON.stringify(got)}, want ${JSON.stringify(ex.expected)}` }
    } catch (e) { return { pass: false, score: 0, detail: `exec error: ${e.message}` } }
  }
  return { pass: false, score: 0, detail: `exec kind "${ex.kind}" not supported yet (C2)` }
}

// --- judge grader (injected askJudge; only where 1-2 cannot apply) ----------
// askJudge(prompt) -> string; we parse a strict {"verdict":"correct|incorrect",
// "reason":"..."} so the result is auditable. Flagged ai_graded in the report.
export async function gradeJudge(output, task, { askJudge } = {}) {
  if (typeof askJudge !== 'function') return { pass: false, score: 0, detail: 'judge not provided', aiGraded: true }
  const prompt = [
    'You are grading whether a produced answer is CORRECT against a reference.',
    'Be strict: only "correct" if it is factually and functionally right.',
    `TASK: ${task.prompt}`,
    `REFERENCE ANSWER: ${typeof task.groundTruth === 'string' ? task.groundTruth : JSON.stringify(task.groundTruth)}`,
    task.rubric ? `RUBRIC: ${task.rubric}` : '',
    `PRODUCED ANSWER: ${norm(output)}`,
    'Reply ONLY with JSON: {"verdict":"correct"|"incorrect","reason":"<one sentence>"}',
  ].filter(Boolean).join('\n\n')
  try {
    const raw = await askJudge(prompt)
    const j = extractJson(raw) || {}
    const pass = String(j.verdict || '').toLowerCase() === 'correct'
    return { pass, score: pass ? 1 : 0, detail: j.reason || 'judge gave no reason', aiGraded: true }
  } catch (e) { return { pass: false, score: 0, detail: `judge error: ${e.message}`, aiGraded: true } }
}

// --- dispatcher -------------------------------------------------------------
// grade(task, output, deps) -> { pass, score, detail, grader, aiGraded? }
export async function grade(task, output, deps = {}) {
  const g = (task && task.grader) || 'exact'
  const opts = task.graderOpts || {}
  let r
  switch (g) {
    case 'exact': r = gradeExact(output, task.groundTruth, opts); break
    case 'number': r = gradeNumber(output, task.groundTruth, opts); break
    case 'json': r = gradeJson(output, task.groundTruth); break
    case 'table': r = gradeTable(output, task.groundTruth); break
    case 'regex': r = gradeRegex(output, task.groundTruth, opts); break
    case 'exec': r = await gradeExec(output, task, deps); break
    case 'judge': r = await gradeJudge(output, task, deps); break
    default: r = { pass: false, score: 0, detail: `unknown grader "${g}"` }
  }
  return { ...r, grader: g }
}
