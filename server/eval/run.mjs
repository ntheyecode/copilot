// ---------------------------------------------------------------------------
// WorkCoPilot accuracy benchmark - RUNNER
// ---------------------------------------------------------------------------
// Feeds each corpus task through the REAL result pipeline (work.workResult),
// grades the output, and aggregates per-domain + overall, for a STRONG and a
// FAST model separately (reported separately per the spec). Writes an internal
// detail file (exact model + per-task) and a public summary (generic model
// labels, aggregates only, held-out tasks excluded from the published sample).
//
// Offline (no key): validates the corpus + grader wiring and prints stats, so
// the pipeline is checkable without spending a model call.
//
// Run live:
//   WORK_EVAL_PROVIDER=openai WORK_EVAL_KEY=sk-... \
//   WORK_EVAL_STRONG_MODEL=gpt-4.1 WORK_EVAL_FAST_MODEL=gpt-4.1-mini \
//   node server/eval/run.mjs [corpus.json]
// Spec: docs/accuracy-benchmark-spec.md
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { grade } from './graders.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const GRADERS = new Set(['exact', 'number', 'json', 'table', 'regex', 'exec', 'judge'])

function loadCorpus(file) {
  const p = file ? path.resolve(file) : path.join(HERE, 'corpus', 'pilot.json')
  const c = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (!Array.isArray(c.tasks)) throw new Error('corpus has no tasks[]')
  return { ...c, _path: p }
}

// Validate every task is well-formed BEFORE we spend any model call.
function validateCorpus(c) {
  const errors = []
  const ids = new Set()
  for (const t of c.tasks) {
    if (!t.id) errors.push('a task has no id')
    if (ids.has(t.id)) errors.push(`duplicate id ${t.id}`); ids.add(t.id)
    if (!t.domain) errors.push(`${t.id}: no domain`)
    if (!t.prompt) errors.push(`${t.id}: no prompt`)
    if (!GRADERS.has(t.grader)) errors.push(`${t.id}: unknown grader "${t.grader}"`)
    if (t.grader === 'exec' && (!t.exec || !t.exec.kind)) errors.push(`${t.id}: exec grader needs exec.kind`)
    if (t.grader === 'exec' && t.exec && t.exec.kind === 'js' && t.exec.expected === undefined) errors.push(`${t.id}: exec(js) needs exec.expected (else undefined grades as a pass)`)
    if (t.grader !== 'exec' && t.groundTruth === undefined) errors.push(`${t.id}: no groundTruth`)
    if (t.visibility && !['public', 'heldout'].includes(t.visibility)) errors.push(`${t.id}: bad visibility`)
  }
  return errors
}

// Sandboxed JS exec for exec(js) tasks: run the candidate as `(<code>)(...args)`
// in an isolated context with a hard timeout, no require/process/globals.
async function runJs(code, ex) {
  const ctx = vm.createContext(Object.create(null))
  const script = new vm.Script(`(${code})(...${JSON.stringify(ex.args || [])})`)
  return script.runInContext(ctx, { timeout: ex.timeoutMs || 1000 })
}

// Wilson 95% confidence interval for a pass rate.
function wilson(pass, n) {
  if (!n) return [0, 0]
  const z = 1.96, p = pass / n
  const d = 1 + z * z / n
  const c = p + z * z / (2 * n)
  const m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]
}

async function produce(work, ai, cfg, base, task) {
  const out = await work.workResult(ai, cfg, {
    base, mode: 'stepwise', goal: task.prompt, question: task.prompt,
    steps: [], currentStep: 0, events: [], appContext: '', docsText: '',
  })
  return (out && out.body) || ''
}

async function runModel(label, cfg, corpus, { work, ai, base, askJudge }) {
  const rows = []
  for (const t of corpus.tasks) {
    let output = '', prodErr = null
    try { output = await produce(work, ai, cfg, base, t) } catch (e) { prodErr = e.message }
    const g = prodErr ? { pass: false, score: 0, detail: `produce error: ${prodErr}`, grader: t.grader } : await grade(t, output, { runJs, askJudge })
    rows.push({ id: t.id, domain: t.domain, visibility: t.visibility || 'public', grader: g.grader, pass: !!g.pass, score: g.score, aiGraded: !!g.aiGraded, detail: g.detail })
  }
  return rows
}

function aggregate(rows) {
  const byDomain = {}
  for (const r of rows) {
    const d = byDomain[r.domain] || (byDomain[r.domain] = { n: 0, pass: 0 })
    d.n++; if (r.pass) d.pass++
  }
  const domains = {}
  for (const [d, v] of Object.entries(byDomain)) { const [lo, hi] = wilson(v.pass, v.n); domains[d] = { n: v.n, pass: v.pass, rate: v.pass / v.n, ci95: [lo, hi] } }
  const n = rows.length, pass = rows.filter((r) => r.pass).length
  const [lo, hi] = wilson(pass, n)
  const aiGraded = rows.filter((r) => r.aiGraded).length
  return { overall: { n, pass, rate: n ? pass / n : 0, ci95: [lo, hi], aiGradedCount: aiGraded }, domains }
}

async function main() {
  const corpus = loadCorpus(process.argv[2])
  const errs = validateCorpus(corpus)
  console.log(`[eval] corpus "${corpus.name}" (${corpus._path}): ${corpus.tasks.length} tasks`)
  const dist = corpus.tasks.reduce((m, t) => ((m[t.domain] = (m[t.domain] || 0) + 1), m), {})
  const gdist = corpus.tasks.reduce((m, t) => ((m[t.grader] = (m[t.grader] || 0) + 1), m), {})
  console.log(`[eval] by domain: ${JSON.stringify(dist)}  by grader: ${JSON.stringify(gdist)}`)
  const held = corpus.tasks.filter((t) => t.visibility === 'heldout').length
  console.log(`[eval] held-out (private): ${held} / ${corpus.tasks.length}`)
  if (errs.length) { console.error(`[eval] CORPUS INVALID:\n - ${errs.join('\n - ')}`); process.exit(1) }
  console.log('[eval] corpus is valid.')

  const provider = process.env.WORK_EVAL_PROVIDER, key = process.env.WORK_EVAL_KEY
  if (!provider || !key) {
    console.log('\n[eval] No WORK_EVAL_PROVIDER / WORK_EVAL_KEY set - validate-only run (no model calls).')
    console.log('[eval] To produce numbers, set the env vars shown at the top of this file and re-run.')
    return
  }
  // Live run: strong + fast, reported separately.
  const [{ default: ai }, work, store] = await Promise.all([
    import('../ai.js').then((m) => ({ default: m })),
    import('../work.js'),
    import('../store.js'),
  ])
  const base = store.getSystemPrompt()
  const strongCfg = { providerId: provider, apiKey: key, chatModel: process.env.WORK_EVAL_STRONG_MODEL }
  const fastCfg = { providerId: process.env.WORK_EVAL_FAST_PROVIDER || provider, apiKey: process.env.WORK_EVAL_FAST_KEY || key, chatModel: process.env.WORK_EVAL_FAST_MODEL || process.env.WORK_EVAL_STRONG_MODEL }
  const askJudge = async (prompt) => (await ai.chat(strongCfg, 'You are a strict, fair grader. Reply only as instructed.', [{ role: 'user', content: prompt }]))

  const runs = {}
  for (const [label, cfg] of [['strong', strongCfg], ['fast', fastCfg]]) {
    console.log(`\n[eval] running ${label} model (${cfg.chatModel})...`)
    const rows = await runModel(label, cfg, corpus, { work, ai, base, askJudge })
    runs[label] = { model: cfg.chatModel, provider: cfg.providerId, summary: aggregate(rows), rows }
    const s = runs[label].summary.overall
    console.log(`[eval] ${label}: ${s.pass}/${s.n} = ${(s.rate * 100).toFixed(1)}%  (95% CI ${(s.ci95[0] * 100).toFixed(0)}-${(s.ci95[1] * 100).toFixed(0)}%)`)
  }

  const at = new Date().toISOString()
  const outDir = path.join(HERE, 'results'); fs.mkdirSync(outDir, { recursive: true })
  // Internal detail (exact model + per-task) - superadmin only, never published.
  const internal = { corpus: corpus.name, at, runs }
  fs.writeFileSync(path.join(outDir, `${corpus.name}-${at.replace(/[:.]/g, '-')}.json`), JSON.stringify(internal, null, 2))
  // Public summary (generic labels, aggregates only, NO per-task for held-out).
  const publicSummary = {
    corpus: corpus.name, at,
    models: { strong: { label: 'Higher-capability tier', summary: runs.strong && runs.strong.summary }, fast: { label: 'Speed-optimized tier', summary: runs.fast && runs.fast.summary } },
    sampleTasks: corpus.tasks.filter((t) => t.visibility !== 'heldout').slice(0, 8).map((t) => ({ domain: t.domain, prompt: t.prompt })),
    method: 'Answers are verified mechanically wherever possible; held-out tasks are scored but not published. Results are reported per tier, with no model or provider named.',
  }
  fs.writeFileSync(path.join(outDir, `${corpus.name}-public.json`), JSON.stringify(publicSummary, null, 2))
  console.log(`\n[eval] wrote results to ${outDir}`)
}

main().catch((e) => { console.error('[eval] fatal:', e.message); process.exit(1) })
