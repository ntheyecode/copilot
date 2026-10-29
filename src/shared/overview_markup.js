// The task OVERVIEW markup: the ONE parser for the light emphasis markers the
// planner writes into a task's "what you'll be doing" overview (server:
// work.js / work_project_plan.js / store.deriveTaskOverview):
//   **bold**       the action and the key nouns
//   ==highlight==  the outcome / the done-condition
//   *italics*      a quiet caveat
// Pure, dependency-free, shared by every surface that shows an overview
// (TaskOverview.jsx renders the tokens), so a marker can never leak as a
// literal character on one surface and render on another (SUPREME II).
//
// Rules the parser enforces, in one place:
//   - whitespace collapses to single spaces; the overview is ONE paragraph
//   - an UNMATCHED ** or == run is dropped (never shown raw); a lone single *
//     stays literal (it may be a real asterisk: "5 * 3")
//   - markers nested inside an emphasis are stripped, so the inner text reads
//     clean (one level of emphasis is what the prompt asks for)
//   - works on any script, including right-to-left text: it never assumes
//     word characters, only the marker characters themselves
//
// parseOverview(text) -> [{ type: 'text' | 'bold' | 'mark' | 'em', text }]
// overviewPlainText(text) -> the same text with every marker removed

const STRIP_INNER = /\*\*|==|^\*+|\*+$/g

function clean(inner) {
  return inner.replace(STRIP_INNER, '').replace(/\s+/g, ' ')
}

export function parseOverview(input) {
  const src = String(input == null ? '' : input).replace(/\s+/g, ' ').trim()
  if (!src) return []
  const out = []
  let plain = ''
  const flushPlain = () => { if (plain) { out.push({ type: 'text', text: plain }); plain = '' } }
  const push = (type, inner) => {
    const text = clean(inner)
    if (!text.trim()) { plain += text; return }      // an empty emphasis is just its spacing
    flushPlain()
    out.push({ type, text })
  }
  let i = 0
  const n = src.length
  while (i < n) {
    // ***text*** (the planner doubling up) reads as bold.
    if (src.startsWith('***', i)) {
      const end = src.indexOf('***', i + 3)
      if (end > i + 3) { push('bold', src.slice(i + 3, end)); i = end + 3; continue }
      // no closing ***: read it as ** (handled next) followed by a plain star
    }
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2)
      if (end > i + 2) { push('bold', src.slice(i + 2, end)); i = end + 2; continue }
      i += 2; continue
    }
    if (src.startsWith('==', i)) {
      const end = src.indexOf('==', i + 2)
      if (end > i + 2) { push('mark', src.slice(i + 2, end)); i = end + 2; continue }
      i += 2; continue
    }
    if (src[i] === '*') {
      // *italics*: the opening star is followed by a non-space, the closing one
      // is preceded by a non-space, and the span holds no further star.
      const next = src[i + 1]
      if (next && next !== ' ' && next !== '*') {
        const end = src.indexOf('*', i + 1)
        if (end > i + 1 && src[end - 1] !== ' ' && src[end + 1] !== '*') { push('em', src.slice(i + 1, end)); i = end + 1; continue }
      }
    }
    plain += src[i]
    i++
  }
  flushPlain()
  // Merge adjacent text runs produced by dropped markers, and trim the edges.
  const merged = []
  for (const tk of out) {
    const last = merged[merged.length - 1]
    if (tk.type === 'text' && last && last.type === 'text') last.text += tk.text
    else merged.push({ ...tk })
  }
  if (merged.length && merged[0].type === 'text') merged[0].text = merged[0].text.replace(/^\s+/, '')
  if (merged.length && merged[merged.length - 1].type === 'text') merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, '')
  return merged.filter((tk) => tk.text !== '')
}

export function overviewPlainText(input) {
  return parseOverview(input).map((tk) => tk.text).join('')
}

// True when an overview carries any content worth rendering.
export function hasOverview(input) {
  return parseOverview(input).length > 0
}
