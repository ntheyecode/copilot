// Personal brain rules (pure): what a person's own brain keeps, how it merges
// new learning, and which learnings ground a task. No I/O, no AI; the flow
// lives in personal_brain.js.
//
// Owner rule (2026-10-31, LinkNotes): a person uploads their own documents; the
// server learns from them, de-duplicates and refreshes, then deletes the files.
// They cannot be downloaded back; the person sees only WHAT WAS LEARNED, and
// the guidance uses it. The desktop app sends learnings from sessions (masked
// on the device) to the same brain.
import { goalTokens } from './goal_tokens.js'

export const LIMITS = Object.freeze({
  learningChars: 320,        // one learning: a short, self-contained note
  perSource: 40,             // learnings kept from one document
  perUser: 600,              // the whole brain; the oldest go first past this
  distillChunkChars: 12000,  // text sent to one distill call
  distillChunks: 6,          // a long document is read in at most this many parts
  sameness: 0.8,             // token overlap at which two learnings are the same
})
export const KINDS = Object.freeze(['fact', 'procedure', 'preference', 'term', 'warning'])

export function normalizeLearning(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.learningChars)
}

// Token overlap (Jaccard) over the shared multilingual tokenizer.
export function similarity(a, b) {
  const A = new Set(goalTokens(a)), B = new Set(goalTokens(b))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

// Split a document's text into the parts one distill call reads.
export function distillParts(text) {
  const t = String(text || '').trim()
  const parts = []
  for (let i = 0; i < t.length && parts.length < LIMITS.distillChunks; i += LIMITS.distillChunkChars) parts.push(t.slice(i, i + LIMITS.distillChunkChars))
  return { parts, truncated: t.length > LIMITS.distillChunks * LIMITS.distillChunkChars }
}

// The distill prompt: short, self-contained learnings a guide can use later.
export const DISTILL_SYSTEM = [
  'You read part of a document a person uploaded to teach their own WorkCoPilot guide.',
  'Extract what a guide should remember to help THIS person do their work better: facts about their tools and setup, the procedures and conventions they follow, their preferences, the terms they use, and warnings about mistakes to avoid.',
  'Each learning is ONE short, self-contained sentence (under 300 characters) that still makes sense on its own months later, in the language of the document.',
  'Never copy personal data, secrets, credentials or placeholders such as [EMAIL] into a learning; skip anything that only makes sense with them. Never invent anything the text does not say.',
  'Reply with ONLY a JSON object: {"learnings":[{"text":"...","kind":"fact"|"procedure"|"preference"|"term"|"warning"}]}. At most 20 learnings for this part; an empty array when the part teaches nothing useful.',
].join('\n')

export function parseDistilled(raw) {
  const s = String(raw || '')
  const a = s.indexOf('{'), z = s.lastIndexOf('}')
  let obj = {}
  if (a >= 0 && z > a) { try { obj = JSON.parse(s.slice(a, z + 1)) } catch { obj = {} } }
  const list = Array.isArray(obj.learnings) ? obj.learnings : []
  return list
    .map((l) => ({ text: normalizeLearning(l && l.text), kind: KINDS.includes(l && l.kind) ? l.kind : 'fact' }))
    .filter((l) => l.text.length >= 12 && !/\[(EMAIL|PHONE|IP|SSN|IBAN|CARD|SECRET|KEY|HOST|DATA)[^\]]*\]/.test(l.text))
}

// Merge new learnings from one source into a brain. `refresh` (the same
// document uploaded again) first drops what that source taught before, so a
// changed document replaces its old learnings instead of piling up. A new
// learning that matches one already kept (any source) is not added twice: the
// kept one gains the source and the newer wording.
export function mergeLearnings(brain, sourceId, incoming, { now = new Date().toISOString(), refresh = false, newId } = {}) {
  let learnings = (brain.learnings || []).map((l) => ({ ...l, sources: [...(l.sources || [])] }))
  if (refresh) {
    learnings = learnings
      .map((l) => ({ ...l, sources: l.sources.filter((s) => s !== sourceId) }))
      .filter((l) => l.sources.length > 0)
  }
  let added = 0, merged = 0
  const fromThis = () => learnings.filter((l) => l.sources.includes(sourceId)).length
  for (const item of incoming) {
    const text = normalizeLearning(item.text)
    if (!text) continue
    const twin = learnings.find((l) => similarity(l.text, text) >= LIMITS.sameness)
    if (twin) {
      if (!twin.sources.includes(sourceId)) twin.sources.push(sourceId)
      twin.text = text
      twin.at = now
      merged++
      continue
    }
    if (fromThis() >= LIMITS.perSource) break
    learnings.push({ id: newId(), text, kind: KINDS.includes(item.kind) ? item.kind : 'fact', sources: [sourceId], at: now })
    added++
  }
  // The whole brain stays bounded: the oldest learnings go first.
  if (learnings.length > LIMITS.perUser) learnings = learnings.sort((x, y) => String(y.at).localeCompare(String(x.at))).slice(0, LIMITS.perUser)
  return { learnings, added, merged }
}

// Learnings that ground a task: ranked by overlap with the goal, newest first
// on a tie, packed into maxChars. Nothing matches -> empty string.
export function contextForGoal(learnings, goal, maxChars = 3000) {
  const G = new Set(goalTokens(goal))
  if (!G.size || !learnings || !learnings.length) return ''
  const scored = learnings
    .map((l) => { let hit = 0; for (const t of goalTokens(l.text)) if (G.has(t)) hit++; return { l, hit } })
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit || String(b.l.at).localeCompare(String(a.l.at)))
  let out = ''
  for (const { l } of scored) {
    const line = `- ${l.text}\n`
    if (out.length + line.length > maxChars) break
    out += line
  }
  return out.trim()
}
