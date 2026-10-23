// ===========================================================================
// WorkCoPilot - on-device data compute: the SAFE computation spec.
//
// Privacy boundary (the whole point): the AI NEVER sees the user's raw rows. It
// sees only a SCHEMA (column names + types + row count) and returns a bounded,
// declarative COMPUTATION SPEC in the tiny whitelisted DSL below - never code.
// This module is the SINGLE SOURCE OF TRUTH for that DSL, shared by:
//   - the SERVER (server/work.js): describeSpecForAI() for the prompt, and
//     validateSpec() to reject anything outside the whitelist before it is run.
//   - the CLIENT (src, bundled by Vite): runSpec(spec, rows) executes the spec
//     against the FULL local rows, deterministically, on the user's device.
// Pure, dependency-free, no server/browser globals, so both sides import it.
//
// The DSL is a pipeline of steps over ONE table:
//   filter   { op:'filter', where:[{col, cmp, value}] }           (AND of clauses)
//   derive   { op:'derive', as:'name', expr:'colA * 0.0825 + 2' }  (safe arithmetic)
//   select   { op:'select', cols:['a','b'] }
//   group    { op:'group', by:['region'], agg:[{fn, col, as}] }
//   sort     { op:'sort', by:'col', dir:'asc'|'desc' }
//   limit    { op:'limit', n:10 }
// Plus a top-level output: 'table' (rows) or 'number' (one aggregate):
//   { steps:[...], output:'table' }
//   { steps:[...], output:'number', value:{ fn:'sum', col:'total' } }
// cmp: eq ne gt gte lt lte contains in     agg/value.fn: sum avg min max count countDistinct
// ===========================================================================

export const CMP = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']
export const AGG = ['sum', 'avg', 'min', 'max', 'count', 'countDistinct']
export const OPS = ['filter', 'derive', 'select', 'group', 'sort', 'limit']
export const MAX_STEPS = 12
export const MAX_OUTPUT_ROWS = 500

// ---- safe arithmetic expression (for derive) ------------------------------
// Only column identifiers, numeric literals, + - * / , parentheses, and unary
// minus. No function calls, no property access, no names outside the schema.
// Tokenize -> validate -> shunting-yard to RPN. Evaluated per row in evalRpn.
function tokenizeExpr(expr) {
  const toks = []
  const s = String(expr || '')
  const re = /\s*(\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_ ]*|[()+\-*/])\s*/y
  let i = 0
  while (i < s.length) {
    re.lastIndex = i
    const m = re.exec(s)
    if (!m || m.index !== i) return null          // an illegal character
    const raw = m[1].trim()
    i = re.lastIndex
    if (raw === '') continue
    if (/^[()+\-*/]$/.test(raw)) toks.push({ t: 'op', v: raw })
    else if (/^\d/.test(raw)) toks.push({ t: 'num', v: Number(raw) })
    else toks.push({ t: 'col', v: raw })           // a column name (validated later)
  }
  return toks
}
function toRpn(toks) {
  const out = [], ops = []
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3 }
  const rightAssoc = (o) => o === 'u-'
  let prev = null
  for (const tk of (toks || [])) {
    if (tk.t === 'num' || tk.t === 'col') { out.push(tk); prev = tk; continue }
    const v = tk.v
    if (v === '(') { ops.push(tk); prev = tk; continue }
    if (v === ')') {
      while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop())
      if (!ops.length) return null                 // mismatched paren
      ops.pop(); prev = tk; continue
    }
    // operator: detect unary minus (at the start, or after another operator or '(')
    const op = (v === '-' && (prev === null || (prev.t === 'op' && prev.v !== ')'))) ? 'u-' : v
    while (ops.length) {
      const top = ops[ops.length - 1].v
      if (top === '(') break
      const higher = prec[top] > prec[op] || (prec[top] === prec[op] && !rightAssoc(op))
      if (!higher) break
      out.push(ops.pop())
    }
    ops.push({ t: 'op', v: op }); prev = { t: 'op', v }
  }
  while (ops.length) { const o = ops.pop(); if (o.v === '(') return null; out.push(o) }
  return out
}
// Build a reusable RPN once; evalRpn runs it per row. Returns null if invalid.
export function compileExpr(expr) {
  const toks = tokenizeExpr(expr)
  if (!toks || !toks.length) return null
  const rpn = toRpn(toks)
  if (!rpn) return null
  return rpn
}
function num(v) { if (v == null || v === '') return NaN; const n = Number(String(v).replace(/[$,%\s]/g, '')); return Number.isFinite(n) ? n : NaN }
function evalRpn(rpn, row) {
  const st = []
  for (const tk of rpn) {
    if (tk.t === 'num') st.push(tk.v)
    else if (tk.t === 'col') st.push(num(row[tk.v]))
    else if (tk.v === 'u-') { const a = st.pop(); st.push(-a) }
    else { const b = st.pop(), a = st.pop(); st.push(tk.v === '+' ? a + b : tk.v === '-' ? a - b : tk.v === '*' ? a * b : (b === 0 ? NaN : a / b)) }
  }
  const r = st.pop()
  return Number.isFinite(r) ? r : null
}

// ---- validation (server-side gate; client re-checks before running) -------
export function validateSpec(spec, schema) {
  const errors = []
  const cols = new Set((schema || []).map((c) => String(c && c.name)))
  const has = (c) => cols.has(String(c))
  if (!spec || typeof spec !== 'object') return { ok: false, errors: ['spec is not an object'] }
  const steps = Array.isArray(spec.steps) ? spec.steps : null
  if (!steps) return { ok: false, errors: ['spec.steps must be an array'] }
  if (steps.length > MAX_STEPS) errors.push(`too many steps (max ${MAX_STEPS})`)
  for (const [i, st] of steps.entries()) {
    const at = `step ${i + 1}`
    if (!st || !OPS.includes(st.op)) { errors.push(`${at}: unknown op "${st && st.op}"`); continue }
    if (st.op === 'filter') {
      if (!Array.isArray(st.where) || !st.where.length) errors.push(`${at}: filter needs where[]`)
      for (const w of (st.where || [])) {
        if (!w || !has(w.col)) errors.push(`${at}: unknown column "${w && w.col}"`)
        if (!CMP.includes(w && w.cmp)) errors.push(`${at}: bad comparator "${w && w.cmp}"`)
      }
      // a filter adds no new column; the next step still sees schema cols.
    } else if (st.op === 'derive') {
      if (!st.as || typeof st.as !== 'string') errors.push(`${at}: derive needs a name "as"`)
      const rpn = compileExpr(st.expr)
      if (!rpn) errors.push(`${at}: expr is not a valid arithmetic expression`)
      else for (const tk of rpn) if (tk.t === 'col' && !has(tk.v)) errors.push(`${at}: expr uses unknown column "${tk.v}"`)
      if (st.as) cols.add(String(st.as))            // derived column is usable downstream
    } else if (st.op === 'select') {
      if (!Array.isArray(st.cols) || !st.cols.length) errors.push(`${at}: select needs cols[]`)
      for (const c of (st.cols || [])) if (!has(c)) errors.push(`${at}: unknown column "${c}"`)
    } else if (st.op === 'group') {
      for (const c of (st.by || [])) if (!has(c)) errors.push(`${at}: group by unknown column "${c}"`)
      if (!Array.isArray(st.agg) || !st.agg.length) errors.push(`${at}: group needs agg[]`)
      const next = new Set((st.by || []).map(String))
      for (const a of (st.agg || [])) {
        if (!AGG.includes(a && a.fn)) errors.push(`${at}: bad aggregate "${a && a.fn}"`)
        if (a && a.fn !== 'count' && !has(a.col)) errors.push(`${at}: aggregate on unknown column "${a && a.col}"`)
        if (a && a.as) next.add(String(a.as))
      }
      cols.clear(); for (const c of next) cols.add(c)  // group reshapes the columns
    } else if (st.op === 'sort') {
      if (!has(st.by)) errors.push(`${at}: sort by unknown column "${st.by}"`)
      if (st.dir && !['asc', 'desc'].includes(st.dir)) errors.push(`${at}: bad sort dir`)
    } else if (st.op === 'limit') {
      if (!(Number.isInteger(st.n) && st.n > 0)) errors.push(`${at}: limit n must be a positive integer`)
    }
  }
  const out = spec.output || 'table'
  if (!['table', 'number'].includes(out)) errors.push('output must be "table" or "number"')
  if (out === 'number') {
    const v = spec.value || {}
    if (!AGG.includes(v.fn)) errors.push('output number needs value.fn (sum/avg/min/max/count/countDistinct)')
    if (v.fn !== 'count' && !has(v.col)) errors.push(`output number on unknown column "${v.col}"`)
  }
  return { ok: errors.length === 0, errors }
}

// ---- execution (CLIENT-side, with the full local rows) --------------------
function aggregate(fn, rows, col) {
  if (fn === 'count') return rows.length
  if (fn === 'countDistinct') return new Set(rows.map((r) => r[col])).size
  const nums = rows.map((r) => num(r[col])).filter((n) => Number.isFinite(n))
  if (!nums.length) return fn === 'sum' ? 0 : null
  if (fn === 'sum') return nums.reduce((a, b) => a + b, 0)
  if (fn === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length
  if (fn === 'min') return Math.min(...nums)
  if (fn === 'max') return Math.max(...nums)
  return null
}
function cmp(cmpOp, a, b) {
  if (cmpOp === 'contains') return String(a ?? '').toLowerCase().includes(String(b ?? '').toLowerCase())
  if (cmpOp === 'in') return Array.isArray(b) && b.map(String).includes(String(a))
  if (cmpOp === 'eq') return String(a) === String(b)
  if (cmpOp === 'ne') return String(a) !== String(b)
  const x = num(a), y = num(b)
  if (Number.isFinite(x) && Number.isFinite(y)) {
    if (cmpOp === 'gt') return x > y; if (cmpOp === 'gte') return x >= y
    if (cmpOp === 'lt') return x < y; if (cmpOp === 'lte') return x <= y
  }
  return false
}
// runSpec: execute the validated spec on rows (array of plain objects). Returns
// { output, columns, rows, value, rowCount, truncated }. Deterministic; the spec
// is the reproducible "basis" shown to the user.
export function runSpec(spec, rows) {
  let data = Array.isArray(rows) ? rows.slice() : []
  let columns = data.length ? Object.keys(data[0]) : ((spec && spec._cols) || [])
  for (const st of ((spec && spec.steps) || [])) {
    if (st.op === 'filter') {
      data = data.filter((r) => (st.where || []).every((w) => cmp(w.cmp, r[w.col], w.value)))
    } else if (st.op === 'derive') {
      const rpn = compileExpr(st.expr)
      data = data.map((r) => ({ ...r, [st.as]: rpn ? evalRpn(rpn, r) : null }))
      if (!columns.includes(st.as)) columns = columns.concat(st.as)
    } else if (st.op === 'select') {
      data = data.map((r) => { const o = {}; for (const c of st.cols) o[c] = r[c]; return o })
      columns = st.cols.slice()
    } else if (st.op === 'group') {
      const by = st.by || []
      const groups = new Map()
      for (const r of data) {
        const key = by.map((c) => String(r[c])).join('\u0001')
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(r)
      }
      const outRows = []
      for (const [, g] of groups) {
        const o = {}
        for (const c of by) o[c] = g[0][c]
        for (const a of (st.agg || [])) o[a.as || `${a.fn}_${a.col || ''}`] = aggregate(a.fn, g, a.col)
        outRows.push(o)
      }
      data = outRows
      columns = by.concat((st.agg || []).map((a) => a.as || `${a.fn}_${a.col || ''}`))
    } else if (st.op === 'sort') {
      const dir = st.dir === 'desc' ? -1 : 1
      data.sort((p, q) => {
        const a = p[st.by], b = q[st.by], x = num(a), y = num(b)
        if (Number.isFinite(x) && Number.isFinite(y)) return (x - y) * dir
        return String(a).localeCompare(String(b)) * dir
      })
    } else if (st.op === 'limit') {
      data = data.slice(0, st.n)
    }
  }
  if ((spec && spec.output) === 'number') {
    const v = spec.value || {}
    return { output: 'number', value: aggregate(v.fn, data, v.col), rowCount: data.length, columns, rows: [] }
  }
  const truncated = data.length > MAX_OUTPUT_ROWS
  return { output: 'table', columns, rows: data.slice(0, MAX_OUTPUT_ROWS), rowCount: data.length, truncated }
}

// ---- the DSL guide injected into the AI prompt (so it emits a valid spec) --
export function describeSpecForAI() {
  return (
    'YOU ARE WRITING A DATA COMPUTATION SPEC, NOT CODE AND NOT A RESULT.\n' +
    'You are given ONLY the column schema and row count of the user\'s table - never the rows, which stay on their device. ' +
    'Return a spec in this exact JSON shape, using ONLY these operations, and ONLY columns that exist in the schema:\n' +
    '{"steps":[ ...ordered steps... ],"output":"table"|"number","value":{"fn":"sum","col":"<col>"}}\n' +
    'Steps (a pipeline over the one table):\n' +
    '- {"op":"filter","where":[{"col":"<c>","cmp":"eq|ne|gt|gte|lt|lte|contains|in","value":<v or [..] for in>}]}  (all clauses AND)\n' +
    '- {"op":"derive","as":"<newcol>","expr":"<arithmetic over columns and numbers, only + - * / and parentheses>"}\n' +
    '- {"op":"select","cols":["<c>",...]}\n' +
    '- {"op":"group","by":["<c>",...],"agg":[{"fn":"sum|avg|min|max|count|countDistinct","col":"<c>","as":"<name>"}]}\n' +
    '- {"op":"sort","by":"<c>","dir":"asc|desc"}\n' +
    '- {"op":"limit","n":<positive int>}\n' +
    'Use "output":"number" with "value" when the answer is a single figure (a total, an average, a count); otherwise "table". ' +
    'The expr in derive is plain arithmetic ONLY - no functions, no text, no other columns than the schema. ' +
    'If the schema does not contain what the question needs, do not guess: return {"steps":[],"output":"table","need":"<what column or data is missing>"}.'
  )
}
