// Pre-pass for the IP-hardening build step (ipHardenPlugin in vite.config.js).
//
// Vite 8 bundles with Rolldown, which calls a CommonJS package's named export as
// `(0, ns.fn)(...)`. The leading 0 makes the call indirect so `this` stays
// undefined, exactly as when calling an ES import. This app has ~11k of them
// (react/jsx-runtime jsx/jsxs and the React hooks). javascript-obfuscator's
// numbersToExpressions turns every numeric literal into an arithmetic
// expression, so each of those zeros grew by ~20 bytes and the hardened
// initial-load JS came out ~10% heavier (gzip) than the Vite 5 build.
//
// `null` is an equally side-effect-free first operand: `(null, ns.fn)(...)` is
// still an indirect call with `this` undefined, and it is not a number, so the
// obfuscator leaves it as is. Every other number is still obfuscated.
//
// Edits land at parser offsets (the bundler's own ESTree parser), never by
// regex, so look-alike text inside strings, templates or regexes is untouched.

/**
 * @param {string} code  chunk code
 * @param {(code: string) => any} parse  ESTree parser returning a Program node
 *   whose start/end are JS string indices (Rolldown's `this.parse`, `parseAst`)
 * @returns {{ code: string, count: number, skipped?: string }}
 */
export function nullIndirectCallZeros(code, parse) {
  // The pre-pass only saves bytes: if it cannot run, the caller still
  // obfuscates the chunk unchanged and reports why (never a silent skip).
  let ast
  try { ast = parse(code) } catch (e) { return { code, count: 0, skipped: `parse failed: ${(e && e.message) || e}` } }
  // Splicing at byte offsets would corrupt the chunk: refuse, never guess.
  if (!ast || ast.end !== code.length) return { code, count: 0, skipped: 'parser offsets do not match the code length' }

  const starts = []
  const stack = [ast]
  while (stack.length) {
    const node = stack.pop()
    if (Array.isArray(node)) { for (const n of node) if (n && typeof n === 'object') stack.push(n); continue }
    if (node.type === 'CallExpression') {
      // A parser that keeps parentheses wraps the sequence in a
      // ParenthesizedExpression; look through it so the pass still applies.
      let callee = node.callee
      while (callee && callee.type === 'ParenthesizedExpression') callee = callee.expression
      const first = callee && callee.type === 'SequenceExpression' ? callee.expressions[0] : null
      if (first && first.type === 'Literal' && first.value === 0 && code.slice(first.start, first.end) === '0' && code[first.end] === ',') starts.push(first.start)
    }
    for (const key in node) {
      const v = node[key]
      if (v && typeof v === 'object') stack.push(v)
    }
  }
  if (!starts.length) return { code, count: 0 }

  starts.sort((a, b) => a - b)
  let out = ''
  let last = 0
  for (const s of starts) { out += code.slice(last, s) + 'null'; last = s + 1 }
  return { code: out + code.slice(last), count: starts.length }
}
