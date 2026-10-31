// Personal brain (orchestration): learn from a person's own documents and
// sessions, keep only what was learned, never the files.
//
// learnFromDocument: the file is decoded and its text extracted IN MEMORY,
// sensitive values are scrubbed, the AI distills short learnings, and they are
// merged into the person's brain (rules in personal_brain_rules.js). The file
// bytes and the full text are never written anywhere, so there is nothing to
// download back; the person sees the learnings and can delete any of them.
// addNotes: learnings the desktop app sends from sessions (already masked on
// the device; scrubbed again here).
//
// The host hands its context in (no store import): db() returns the database
// object, persist() saves it; ai + runtime() run the platform AI.
import { scrubSensitive } from './work-scrub.js'
import { DISTILL_SYSTEM, distillParts, mergeLearnings, parseDistilled, contextForGoal, normalizeLearning } from './personal_brain_rules.js'

const SESSIONS_SOURCE = 'sessions'

export function createPersonalBrain({ db, persist, ai, runtime, extractText, newId, now = () => new Date().toISOString(), log = console }) {
  for (const [k, v] of Object.entries({ db, persist, ai, runtime, extractText, newId })) if (!v) throw new Error(`createPersonalBrain: missing ${k}`)

  const brainOf = (uid) => {
    const d = db()
    if (!d.personalBrain) d.personalBrain = {}
    if (!d.personalBrain[uid]) d.personalBrain[uid] = { sources: [], learnings: [] }
    return d.personalBrain[uid]
  }
  const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra })
  const view = (b) => ({
    sources: b.sources.map((s) => ({ ...s, learned: b.learnings.filter((l) => l.sources.includes(s.id)).length })).sort((x, y) => String(y.learnedAt).localeCompare(String(x.learnedAt))),
    learnings: b.learnings.slice().sort((x, y) => String(y.at).localeCompare(String(x.at))).map(({ id, text, kind, sources, at }) => ({ id, text, kind, sources, at })),
  })
  const commit = (b, sourceId, items, { refresh = false } = {}) => {
    const r = mergeLearnings(b, sourceId, items, { now: now(), refresh, newId: () => 'pl' + newId() })
    b.learnings = r.learnings
    // A source that no longer taught anything is not listed.
    b.sources = b.sources.filter((s) => s.id === SESSIONS_SOURCE || b.learnings.some((l) => l.sources.includes(s.id)))
    persist()
    return r
  }

  async function learnFromDocument(uid, { name, mime, base64 }) {
    const cfg = runtime()
    if (!cfg) throw fail(503, 'Learning from documents needs the AI to be set up. Try again later.', { code: 'AI_NOT_CONFIGURED' })
    const docName = String(name || 'document').trim().slice(0, 200) || 'document'
    let text = await extractText({ name: docName, mime, base64 })   // in memory only
    base64 = null
    if (!text || !String(text).trim()) throw fail(422, 'Could not read any text from that file. It may be empty, image-only, or password protected.')
    const scrubbed = scrubSensitive(String(text))
    text = null
    const { parts, truncated } = distillParts(scrubbed.clean)
    const items = []
    for (const part of parts) {
      const raw = await ai.generate(cfg, DISTILL_SYSTEM, `Document: ${docName}\n"""\n${part}\n"""`)
      items.push(...parseDistilled(raw))
    }
    if (!items.length) throw fail(422, 'That document did not teach anything new to keep. Try a document about how you work.', { code: 'NOTHING_LEARNED' })
    const b = brainOf(uid)
    // The same document again (same name) refreshes what it taught.
    let src = b.sources.find((s) => s.kind === 'document' && s.name.toLowerCase() === docName.toLowerCase())
    const refresh = !!src
    if (!src) { src = { id: 'ps' + newId(), name: docName, kind: 'document', learnedAt: now() }; b.sources.push(src) } else src.learnedAt = now()
    const r = commit(b, src.id, items, { refresh })
    log.info && log.info('[personal-brain] learned', JSON.stringify({ uid, source: src.id, added: r.added, merged: r.merged, refreshed: refresh, masked: scrubbed.total, truncated }))
    return { source: { id: src.id, name: src.name, refreshed: refresh }, added: r.added, merged: r.merged, masked: scrubbed.total, truncated, fileKept: false, ...view(b) }
  }

  function addNotes(uid, notes) {
    const items = (Array.isArray(notes) ? notes : [])
      .map((n) => (typeof n === 'string' ? { text: n } : n))
      .map((n) => ({ text: normalizeLearning(scrubSensitive(n && n.text).clean), kind: n && n.kind }))
      .filter((n) => n.text.length >= 12)
      .slice(0, 50)
    if (!items.length) throw fail(400, 'No learnings to add.')
    const b = brainOf(uid)
    if (!b.sources.some((s) => s.id === SESSIONS_SOURCE)) b.sources.push({ id: SESSIONS_SOURCE, name: 'Your sessions', kind: 'sessions', learnedAt: now() })
    else b.sources.find((s) => s.id === SESSIONS_SOURCE).learnedAt = now()
    const r = commit(b, SESSIONS_SOURCE, items)
    return { added: r.added, merged: r.merged, ...view(b) }
  }

  const list = (uid) => view(brainOf(uid))
  function forgetLearning(uid, id) {
    const b = brainOf(uid)
    const before = b.learnings.length
    b.learnings = b.learnings.filter((l) => l.id !== id)
    if (b.learnings.length === before) throw fail(404, 'That learning is already gone.')
    b.sources = b.sources.filter((s) => s.id === SESSIONS_SOURCE || b.learnings.some((l) => l.sources.includes(s.id)))
    persist()
    return view(b)
  }
  function forgetSource(uid, sourceId) {
    const b = brainOf(uid)
    if (!b.sources.some((s) => s.id === sourceId)) throw fail(404, 'That source is already gone.')
    b.learnings = b.learnings.map((l) => ({ ...l, sources: l.sources.filter((s) => s !== sourceId) })).filter((l) => l.sources.length)
    b.sources = b.sources.filter((s) => s.id !== sourceId)
    persist()
    return view(b)
  }
  function clear(uid) {
    const d = db()
    if (d.personalBrain) delete d.personalBrain[uid]
    persist()
    return view(brainOf(uid))
  }
  // What grounds a task: the learnings that match the goal.
  const contextFor = (uid, goal, maxChars = 3000) => {
    const d = db()
    const b = d.personalBrain && d.personalBrain[uid]
    return b ? contextForGoal(b.learnings, goal, maxChars) : ''
  }

  return { learnFromDocument, addNotes, list, forgetLearning, forgetSource, clear, contextFor }
}
