// WorkCoPilot Company Brain - code-aware chunker (codebase copilot).
//
// Source code is a Brain source type. A plain ~1800-char window (brain_ingest.js
// chunkText) is wrong for code: it slices a function in half, so a retrieval hit
// lands in the middle of a body with no signature and no closing brace. This
// module chunks a source file on SYMBOL / structural boundaries instead, so a
// retrieval hit points at one whole function / class / top-level unit.
//
// It emits the SAME output contract as brain_ingest.js chunkText:
//   Array<{ ord, charStart, charEnd, text }>
// with dense ords and EXACT original-text offsets, i.e. for every chunk
//   text.slice(charStart, charEnd) === chunk.text
// so the downstream scrub -> embed -> hash -> store pipeline is byte-identical
// whether a source was chunked by chunkText or by chunkCode.
//
// Pure JS, no parser, no tree-sitter, no new dependency (SCA rule). Heuristics
// only. It NEVER throws on odd input: on anything it cannot reason about it
// degrades to blank-line / hard-character-window splitting.

// Size targets. A single top-level unit bigger than CODE_CAP has no internal
// boundary we trust, so it falls back to a hard character window WITH overlap -
// same spirit as brain_ingest.js hardWindow (CHUNK_TARGET / CHUNK_OVERLAP).
const CODE_CAP = 2400
const HARD_OVERLAP = 300

// ---------------------------------------------------------------------------
// detectLanguage: short language id from a path/extension, or 'text'.
// ---------------------------------------------------------------------------
const EXT_LANG = {
  js: 'js', mjs: 'js', cjs: 'js', jsx: 'jsx',
  ts: 'ts', mts: 'ts', cts: 'ts', tsx: 'tsx',
  py: 'py', pyw: 'py', pyi: 'py',
  java: 'java',
  c: 'c', h: 'c',
  cc: 'cpp', cpp: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp', hxx: 'cpp',
  cs: 'cs',
  go: 'go',
  rb: 'rb',
  rs: 'rs',
  php: 'php', php3: 'php', php4: 'php', php5: 'php', phtml: 'php',
  swift: 'swift',
  kt: 'kotlin', kts: 'kotlin',
  scala: 'scala', sc: 'scala',
  sh: 'sh', bash: 'sh', zsh: 'sh',
  sql: 'sql',
  pl: 'perl', pm: 'perl',
  r: 'r',
  lua: 'lua',
  dart: 'dart',
}

export function detectLanguage(path) {
  try {
    const p = String(path == null ? '' : path)
    const base = p.split(/[\\/]/).pop() || ''
    const dot = base.lastIndexOf('.')
    if (dot < 0 || dot === base.length - 1) return 'text'
    const ext = base.slice(dot + 1).toLowerCase()
    return EXT_LANG[ext] || 'text'
  } catch {
    return 'text'
  }
}

// ---------------------------------------------------------------------------
// Per-language lexing profile: which comment / string forms to honor while we
// count brace/paren depth. Best-effort - the only thing that MUST be right for
// correct offsets is that we never report depth 0 inside a block, and we never
// cut a chunk (we cut only on whole-line boundaries at depth 0).
// ---------------------------------------------------------------------------
const C_FAMILY = new Set(['js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'swift', 'kotlin', 'scala', 'dart'])
const JS_FAMILY = new Set(['js', 'jsx', 'ts', 'tsx'])
const HASH_COMMENT = new Set(['py', 'rb', 'sh', 'perl', 'r'])

function langProfile(language) {
  const lang = language || 'text'
  return {
    block: C_FAMILY.has(lang) || lang === 'sql',      // /* ... */
    backtick: JS_FAMILY.has(lang),                     // `template`
    hash: HASH_COMMENT.has(lang),                      // # line comment
    triple: lang === 'py',                             // ''' / """ docstrings
    line: C_FAMILY.has(lang) ? '//' : (lang === 'sql' ? '--' : ''),
  }
}

// Advance the lexer state across one line's characters. Mutates `st` which may
// carry an open block comment / string / triple-quote into the next line.
function feedLine(line, st, prof) {
  const n = line.length
  let i = 0
  while (i < n) {
    const c = line[i]
    const c2 = i + 1 < n ? line[i + 1] : ''
    const c3 = i + 2 < n ? line[i + 2] : ''
    if (st.inTriple) {
      if (c === st.tripleCh && c2 === st.tripleCh && c3 === st.tripleCh) { st.inTriple = false; i += 3; continue }
      i++; continue
    }
    if (st.inBlock) {
      if (c === '*' && c2 === '/') { st.inBlock = false; i += 2; continue }
      i++; continue
    }
    if (st.inStr) {
      if (c === '\\') { i += 2; continue }
      if (c === st.strCh) { st.inStr = false; st.strCh = '' }
      i++; continue
    }
    // Not inside any construct.
    if (prof.triple && (c === '"' || c === "'") && c2 === c && c3 === c) { st.inTriple = true; st.tripleCh = c; i += 3; continue }
    if (prof.block && c === '/' && c2 === '*') { st.inBlock = true; i += 2; continue }
    if (prof.line && c === prof.line[0] && c2 === prof.line[1]) break // // or -- : rest of line is comment
    if (prof.hash && c === '#') break
    if (c === '"' || c === "'" || (prof.backtick && c === '`')) { st.inStr = true; st.strCh = c; i++; continue }
    if (c === '{' || c === '(' || c === '[') st.depth++
    else if (c === '}' || c === ')' || c === ']') { st.depth--; if (st.depth < 0) st.depth = 0 }
    i++
  }
}

// ---------------------------------------------------------------------------
// Boundary heuristics. A line STARTS a new top-level unit when it begins at
// column 0 (no leading whitespace) and matches one of the common declaration
// shapes below - AND the lexer is at depth 0 with no open string/comment (that
// second half is checked by the caller). Requiring column 0 is what keeps
// methods / nested defs attached to their enclosing class or function, so a
// "top-level unit" is exactly what a human would call one.
// ---------------------------------------------------------------------------

// Lines that look like declarations but are really file-header / re-exports.
const HEADER_LINE = /^(import|from|package|use|using|require|include|#include|#import|#!|export\s*\{|export\s+\*|export\s+(?:type\s+)?\{|module\.exports|@)/

// Keywords that can sit at column 0 followed by "(...) {" but are control flow,
// not declarations - guards the generic "name() {" shape against if/for/while...
const CONTROL_KW = /^(if|for|while|switch|catch|do|else|return|with|await|yield|throw|new|typeof|case|default|in|of|try)\b/

const DECL_PATTERNS = [
  /^(export\s+)?(default\s+)?(async\s+)?function\b/,                              // JS/TS function (incl generator function*)
  /^(export\s+)?(default\s+)?(abstract\s+)?class\b/,                              // class
  /^(export\s+)?(declare\s+)?(interface|enum|namespace)\b/,                       // TS interface/enum/namespace
  /^(export\s+)?type\s+[\w$]+\s*[=<]/,                                            // TS type alias
  /^(export\s+)?(const|let|var)\s+[\w$]+\s*=/,                                    // const X = ... (arrow, value, IIFE)
  /^(async\s+)?def\s+\w+/,                                                        // Python def
  /^func\b/,                                                                      // Go func
  /^(pub\s+)?(default\s+)?(async\s+)?(unsafe\s+)?fn\s+\w+/,                        // Rust fn
  /^(pub\s+)?(struct|enum|trait|impl|mod)\b/,                                     // Rust items
  /^(def|module)\b/,                                                              // Ruby def/module (class caught above)
  /^(abstract\s+|final\s+)?(public|private|protected|internal|static)\b/,         // Java/C#/C++ member w/ modifier
  /^(public|private|protected)?\s*(static\s+)?(final\s+)?(func|fun|sub|procedure)\b/, // Swift/Kotlin func, VB sub
  /^[\w$][\w$<>,\s.*&:\[\]]*\s+[\w$~]+\s*\([^;{]*\)\s*(const\s*)?\{?\s*$/,          // C/C++/Java/C# "retType name(args) {"
  /^[A-Za-z_$][\w$]*\s*\([^;]*\)\s*\{\s*$/,                                        // bare "name(args) {"  (method shorthand)
]

function isDeclLine(line) {
  if (!line || line[0] === ' ' || line[0] === '\t') return false // column 0 only
  if (HEADER_LINE.test(line)) return false
  if (CONTROL_KW.test(line)) return false
  for (const re of DECL_PATTERNS) {
    if (re.test(line)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Line spans over the ORIGINAL text so every chunk keeps exact char offsets.
// Same semantics as brain_ingest.js lineSpans.
// ---------------------------------------------------------------------------
function lineSpans(text) {
  const spans = []
  let pos = 0
  const parts = text.split('\n')
  for (let i = 0; i < parts.length; i++) {
    const line = parts[i]
    spans.push({ start: pos, end: pos + line.length, line })
    pos += line.length + 1 // + the '\n' we split on
  }
  return spans
}

// Hard character-window fallback for a single span (a unit bigger than CODE_CAP,
// or the whole file when no structure was found). Offsets stay absolute. Same
// spirit as brain_ingest.js hardWindow: CODE_CAP windows with HARD_OVERLAP.
function hardWindow(text, start, end) {
  const out = []
  const body = text.slice(start, end)
  let i = 0
  while (i < body.length) {
    const stop = Math.min(i + CODE_CAP, body.length)
    out.push({ charStart: start + i, charEnd: start + stop, text: body.slice(i, stop) })
    if (stop >= body.length) break
    i = Math.max(0, stop - HARD_OVERLAP)
  }
  return out.length ? out : [{ charStart: start, charEnd: end, text: body }]
}

// Degrade path: blank-line blocks greedily packed into <=CODE_CAP chunks, with
// any oversized block hard-windowed. Used when no declaration boundary is found
// (minified blob, data file, unknown shape) so we never return garbage.
function fallbackChunks(text) {
  const spans = lineSpans(text)
  // Blocks = maximal runs of lines separated by blank lines.
  const blocks = []
  let curStart = null
  let curEnd = 0
  const flush = () => { if (curStart != null) { blocks.push({ start: curStart, end: curEnd }); curStart = null } }
  for (const s of spans) {
    if (/^\s*$/.test(s.line)) { flush(); continue }
    if (curStart == null) curStart = s.start
    curEnd = s.end
  }
  flush()
  if (!blocks.length) return hardWindow(text, 0, text.length)

  const pieces = []
  for (const b of blocks) {
    if (b.end - b.start > CODE_CAP) pieces.push(...hardWindow(text, b.start, b.end))
    else pieces.push({ charStart: b.start, charEnd: b.end, text: text.slice(b.start, b.end) })
  }
  return pieces
}

// ---------------------------------------------------------------------------
// chunkCode: file-header chunk (top-of-file up to the first top-level
// declaration), then one chunk per top-level unit. An oversized unit is
// hard-windowed with overlap. Output matches chunkText's contract exactly.
// ---------------------------------------------------------------------------
export function chunkCode(text, { language } = {}) {
  let src
  try {
    src = String(text == null ? '' : text)
    if (!src.trim()) return []

    const prof = langProfile(language)
    const spans = lineSpans(src)

    // Walk lines, tracking depth + open-construct state, recording the line
    // indices that begin a top-level unit.
    const st = { depth: 0, inBlock: false, inStr: false, strCh: '', inTriple: false, tripleCh: '' }
    const boundaries = []
    for (let i = 0; i < spans.length; i++) {
      const clean = st.depth === 0 && !st.inBlock && !st.inStr && !st.inTriple
      if (clean && isDeclLine(spans[i].line)) boundaries.push(i)
      feedLine(spans[i].line, st, prof)
    }

    // No structure detected -> degrade gracefully.
    if (!boundaries.length) return renumber(fallbackChunks(src))

    const raw = []

    // File-header chunk: everything before the first declaration (imports, top
    // comment, license banner). Emit only if it carries real content.
    const headerEnd = spans[boundaries[0]].start
    if (src.slice(0, headerEnd).trim()) {
      raw.push({ charStart: 0, charEnd: headerEnd, text: src.slice(0, headerEnd) })
    }

    // One unit per boundary, running to the next boundary (or EOF). Spans are
    // contiguous by line start, so charEnd of one unit == charStart of the next
    // and the whole file is covered with exact offsets. A unit bigger than the
    // cap has no boundary we trust inside it -> hard-window it.
    for (let b = 0; b < boundaries.length; b++) {
      const start = spans[boundaries[b]].start
      const end = b + 1 < boundaries.length ? spans[boundaries[b + 1]].start : src.length
      if (end - start > CODE_CAP) raw.push(...hardWindow(src, start, end))
      else raw.push({ charStart: start, charEnd: end, text: src.slice(start, end) })
    }

    return renumber(raw)
  } catch {
    // Never throw: last-resort hard window over whatever we managed to coerce.
    try {
      const s = String(text == null ? '' : text)
      if (!s.trim()) return []
      return renumber(hardWindow(s, 0, s.length))
    } catch {
      return []
    }
  }
}

function renumber(list) {
  return list.map((c, i) => ({ ord: i, charStart: c.charStart, charEnd: c.charEnd, text: c.text }))
}

// ---------------------------------------------------------------------------
// symbolOf: best-effort symbol name from a chunk's first declaration line, for
// provenance like "login.ts > validateToken()". Returns '' when none is found
// (e.g. the file-header chunk or a hard-window fragment). Never throws.
// ---------------------------------------------------------------------------
const NAME_EXTRACTORS = [
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/,     // function name / function* name
  /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,            // class Name
  /^(?:export\s+)?(?:declare\s+)?(?:interface|enum|namespace)\s+([A-Za-z_$][\w$]*)/,     // interface/enum/namespace Name
  /^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/,                                            // type Name
  /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/,                           // const Name =
  /^(?:async\s+)?def\s+([A-Za-z_][\w]*)/,                                                // Python def name
  /^func\s*(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)/,                                           // Go func name / func (recv) name
  /^(?:pub\s+)?(?:default\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+([A-Za-z_][\w]*)/,          // Rust fn name
  /^(?:pub\s+)?(?:struct|enum|trait|impl|mod)\s+(?:[\w:<>]+\s+for\s+)?([A-Za-z_][\w]*)/,  // Rust item name
  /^(?:def|module)\s+([A-Za-z_][\w]*)/,                                                  // Ruby def/module name
  /^(?:[\w$][\w$<>,\s.*&:\[\]]*\s+)?([A-Za-z_$][\w$~]*)\s*\(/,                            // typed/bare "name(" (C/C++/Java/C#/methods)
]

export function symbolOf(chunkText, language) {
  try {
    const src = String(chunkText == null ? '' : chunkText)
    if (!src.trim()) return ''
    const prof = langProfile(language)
    // First non-blank, non-comment, non-header line that reads like a decl.
    for (const rawLine of src.split('\n')) {
      const line = rawLine.replace(/\s+$/, '')
      if (!line.trim()) continue
      if (HEADER_LINE.test(line.trimStart())) continue
      if (prof.line && line.trimStart().startsWith(prof.line)) continue
      if (prof.hash && line.trimStart().startsWith('#')) continue
      if (line.trimStart().startsWith('/*') || line.trimStart().startsWith('*')) continue
      if (CONTROL_KW.test(line.trimStart())) return ''
      for (const re of NAME_EXTRACTORS) {
        const m = re.exec(line)
        if (m && m[1]) return m[1]
      }
      return '' // first real line was not a recognizable declaration
    }
    return ''
  } catch {
    return ''
  }
}

export default { chunkCode, detectLanguage, symbolOf }
