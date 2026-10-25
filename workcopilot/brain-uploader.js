// ---------------------------------------------------------------------------
// WorkCoPilot Company Brain - DEVICE background uploader (Electron main side).
// ---------------------------------------------------------------------------
// Phase 1b. The desktop quietly keeps the shared Company Brain current from the
// admin-allow-listed, COMPANY-WIDE sources this machine can reach, WITHOUT ever
// letting a raw file leave the computer: everything is extracted, chunked,
// scrubbed and embedded ON THIS DEVICE, and only scrubbed chunk text + vectors
// are POSTed. The loop is deliberately polite:
//
//   * ONE doc at a time, with gaps, and only while the machine is IDLE
//     (powerMonitor.getSystemIdleTime) so we never compete with the user.
//   * PAUSED whenever a guided session is active (watching && !paused): the main
//     process pushes brain:guiding-state, and the existing work:pause-save signal
//     is also honored. We resume only when nothing is guiding.
//   * CHEAP pre-check FIRST: compare each source's revision/etag/modifiedTime
//     against the tenant manifest and skip unchanged sources BEFORE extraction,
//     so an unchanged corpus costs almost nothing.
//   * contentHash dedupe: identical document content (same SOP in two places,
//     or a re-tagged revision with no real change) is aliased, never re-embedded.
//   * RESUMABLE: the manifest cursor + per-source state persist to
//     <userData>/brain-queue.json, so a restart picks up exactly where it left off.
//
// Single source of truth: the model pin + content/chunk hashing are IMPORTED
// from ../server/brain_model.js, and the scrub is the ONE engine
// (../server/work-scrub.js) that src/scrub.js also uses. We copy neither. The
// chunker below mirrors server/brain_ingest.js chunkText EXACTLY (same ~1800 /
// ~300 rules, same never-split-a-step guarantee); it is reimplemented rather
// than imported because importing brain_ingest.js would drag the server vector
// store + tenant crypto (brain_store.js, brain_crypto.js) onto the read-only
// desktop overlay, which must not ship them. Lead: hoisting chunkText into
// brain_model.js would let both sides import one copy - see the Phase 1b report.
//
// No silent fallback: every skip/alias/error states its reason in the returned
// tally and in the log. A degraded embedder (embedMode() !== 'model' and not the
// test fake) makes the uploader REFUSE to upload rather than poison the shared
// corpus with meaningless vectors (SUPREME RULE VI - never degrade).
//
// US spelling. No em dashes. CommonJS (loaded by main.js via require()).
// ---------------------------------------------------------------------------
'use strict'

const fs = require('node:fs')
const path = require('node:path')

// ---------------------------------------------------------------------------
// Shared ESM deps (pin + hashing + scrub), reached from CommonJS through one
// cached dynamic import(). All three are standalone modules (brain_model.js is
// node:crypto only; work-scrub.js has no imports), so this adds no server
// storage/crypto code to the device.
// ---------------------------------------------------------------------------
let _depsPromise = null
function loadDeps() {
  if (_depsPromise) return _depsPromise
  _depsPromise = (async () => {
    const model = await import('../server/brain_model.js')
    const scrub = await import('../server/work-scrub.js')
    return {
      EMBED: model.EMBED,
      contentHashOf: model.contentHashOf,
      chunkHashOf: model.chunkHashOf,
      policyVersionOf: model.policyVersionOf,
      scrubSensitive: scrub.scrubSensitive,
      scrubWithPolicy: scrub.scrubWithPolicy,
    }
  })()
  return _depsPromise
}

// ---------------------------------------------------------------------------
// chunkText - mirror of server/brain_ingest.js chunkText (single algorithm,
// kept identical; see the header note on why it is reimplemented, not imported).
// ~1800-char chunks, ~300 overlap, split on heading / blank-line boundaries,
// NEVER cutting through a numbered or bulleted step.
// ---------------------------------------------------------------------------
const CHUNK_TARGET = 1800
const CHUNK_OVERLAP = 300

function lineSpans(text) {
  const spans = []
  let pos = 0
  const parts = text.split('\n')
  for (let i = 0; i < parts.length; i++) {
    const line = parts[i]
    spans.push({ start: pos, end: pos + line.length, line })
    pos += line.length + 1
  }
  return spans
}

const isBlankLine = (l) => /^\s*$/.test(l)
const isHeadingLine = (l) => /^\s{0,3}#{1,6}\s+\S/.test(l)
const isStepMarker = (l) => /^\s{0,6}(?:[-*+]\s+|\d+[.)]\s+)\S/.test(l)

function splitBlocks(text) {
  const spans = lineSpans(text)
  const blocks = []
  let cur = null
  const push = () => { if (cur) { blocks.push(cur); cur = null } }
  for (const s of spans) {
    if (isBlankLine(s.line)) { push(); continue }
    if (isHeadingLine(s.line) || isStepMarker(s.line)) push()
    if (!cur) cur = { start: s.start, end: s.end }
    else cur.end = s.end
  }
  push()
  return blocks.map((b) => ({ start: b.start, end: b.end, text: text.slice(b.start, b.end) }))
}

function hardWindow(block) {
  const out = []
  const { start, text } = block
  let i = 0
  while (i < text.length) {
    const end = Math.min(i + CHUNK_TARGET, text.length)
    out.push({ start: start + i, end: start + end, text: text.slice(i, end) })
    if (end >= text.length) break
    i = Math.max(0, end - CHUNK_OVERLAP)
  }
  return out
}

function chunkText(text) {
  const src = String(text == null ? '' : text)
  if (!src.trim()) return []

  const atoms = []
  for (const b of splitBlocks(src)) {
    if (b.text.length > CHUNK_TARGET) atoms.push(...hardWindow(b))
    else atoms.push(b)
  }

  const chunks = []
  let cur = []
  let curLen = 0
  let carryLen = 0

  const emit = () => {
    if (!cur.length) return
    const first = cur[0]
    const last = cur[cur.length - 1]
    chunks.push({ ord: chunks.length, charStart: first.start, charEnd: last.end, text: src.slice(first.start, last.end) })
  }

  for (const a of atoms) {
    const alen = a.text.length
    if (curLen > carryLen && curLen + alen > CHUNK_TARGET) {
      emit()
      const carry = []
      let clen = 0
      for (let j = cur.length - 1; j >= 0; j--) {
        if (carry.length && clen + cur[j].text.length > CHUNK_OVERLAP) break
        carry.unshift(cur[j])
        clen += cur[j].text.length
        if (clen >= CHUNK_OVERLAP) break
      }
      cur = carry
      curLen = clen
      carryLen = clen
    }
    cur.push(a)
    curLen += alen
  }
  emit()

  return chunks.map((c, i) => ({ ord: i, charStart: c.charStart, charEnd: c.charEnd, text: c.text }))
}

// ---------------------------------------------------------------------------
// Persistence helpers. Atomic write (temp + rename) so a crash mid-write never
// leaves a half-written queue file (the resume state must be trustworthy).
// ---------------------------------------------------------------------------
const STATE_VERSION = 1

function emptyState() {
  return { version: STATE_VERSION, cursor: 0, sources: {} }
}

function loadState(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyState()
    return {
      version: STATE_VERSION,
      cursor: parsed.cursor || 0,
      sources: parsed.sources && typeof parsed.sources === 'object' ? parsed.sources : {},
    }
  } catch {
    // Missing or corrupt file -> fresh state (a corrupt resume file must never
    // wedge ingestion; we just start the inventory over, which is safe because
    // the manifest + contentHash dedupe make re-uploads idempotent).
    return emptyState()
  }
}

function saveState(file, state) {
  const tmp = file + '.tmp'
  const data = JSON.stringify({ version: STATE_VERSION, cursor: state.cursor || 0, sources: state.sources || {} })
  const fd = fs.openSync(tmp, 'w')
  try {
    fs.writeSync(fd, data)
    fs.fsyncSync(fd)
  } finally {
    fs.closeSync(fd)
  }
  fs.renameSync(tmp, file)
}

// ---------------------------------------------------------------------------
// createBrainUploader - the controller main.js wires in. Everything the uploader
// touches is injectable so it is fully testable with a stubbed fetch, a stubbed
// source enumerator, the deterministic embedder (BRAIN_EMBED_FAKE=1) and a temp
// userData dir. Real defaults are used for anything not injected.
// ---------------------------------------------------------------------------
function createBrainUploader(opts = {}) {
  const serverUrl = String(opts.serverUrl || process.env.WORK_SERVER || 'https://admireveda.com').replace(/\/+$/, '')
  const fetchImpl = opts.fetch || globalThis.fetch
  const logger = opts.logger || console
  const now = opts.now || Date.now
  const idleThresholdSec = Number.isFinite(opts.idleThresholdSec) ? opts.idleThresholdSec : 60
  const throttleMs = Number.isFinite(opts.throttleMs) ? opts.throttleMs : 1500
  const intervalMs = Number.isFinite(opts.intervalMs) ? opts.intervalMs : 30000
  const policy = opts.policy || null // optional armed governance policy (else always-redact floor)

  // userData dir: injected in tests; from Electron otherwise.
  let userDataDir = opts.userDataDir
  if (!userDataDir) {
    try { userDataDir = require('electron').app.getPath('userData') } catch { userDataDir = process.cwd() }
  }
  const stateFile = path.join(userDataDir, opts.queueFileName || 'brain-queue.json')

  // Idle time (seconds). Injected in tests; powerMonitor otherwise.
  const getIdleTimeSec = opts.getIdleTimeSec || (() => {
    try { return require('electron').powerMonitor.getSystemIdleTime() } catch { return idleThresholdSec }
  })

  // Source enumeration: the admin-allow-listed, company-wide sources this device
  // can reach. The lead supplies this hook (see the Phase 1b report). Each entry:
  //   { sourceId, title, kind, revision, etag, modifiedTime, version, acl,
  //     read: async () => ({ filePath } | { text }) }
  const enumerateSources = opts.enumerateSources || (async () => [])

  // Extraction: reuse main.js extractDocLocally verbatim (the lead passes it in).
  // Default honors an entry that already carries text (read() -> { text }).
  const extract = opts.extract || (async (source) => {
    const r = source && typeof source.read === 'function' ? await source.read() : null
    if (r && typeof r.text === 'string') return { text: r.text, method: 'text' }
    throw new Error('no extractor provided (lead wires extractDocLocally)')
  })

  // Embedder: the device embed worker (fake in tests via BRAIN_EMBED_FAKE=1).
  const embedPassages = opts.embedPassages || ((...a) => require('./brain-embed.js').embedPassages(...a))
  const embedMode = opts.embedMode || (() => { try { return require('./brain-embed.js').embedMode() } catch { return 'unknown' } })

  // Auth: a main-process fetch does NOT automatically carry the renderer's
  // session cookie, so the lead injects headers/credentials here (see the report).
  const getRequestInit = opts.getRequestInit || (async () => ({}))

  let state = loadState(stateFile)
  let guiding = false   // a guided session is active -> suspend
  let busy = false      // a pass is in flight -> never overlap
  let timer = null
  let stopped = false

  function sleep(ms) {
    if (ms <= 0) return Promise.resolve()
    return new Promise((r) => setTimeout(r, ms))
  }

  async function doFetch(url, init) {
    const extra = await getRequestInit()
    const headers = Object.assign({ Accept: 'application/json' }, (extra && extra.headers) || {}, (init && init.headers) || {})
    return fetchImpl(url, Object.assign({}, extra, init, { headers }))
  }

  // Pull the tenant manifest at/after the persisted cursor.
  async function pullManifest() {
    const url = `${serverUrl}/api/work/brain/manifest?since=${encodeURIComponent(state.cursor || 0)}`
    const res = await doFetch(url, { method: 'GET' })
    if (!res || !res.ok) throw new Error(`manifest ${res ? res.status : 'no-response'}`)
    const body = await res.json()
    return body && typeof body === 'object' ? body : { cursor: state.cursor || 0, sources: [] }
  }

  // Batch POST the scrubbed, embedded chunks for ONE document.
  async function postChunks(payload) {
    const url = `${serverUrl}/api/work/brain/chunks`
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res || !res.ok) throw new Error(`chunks ${res ? res.status : 'no-response'}`)
    try { return await res.json() } catch { return {} }
  }

  function unchanged(local, manifestRow) {
    // Cheap pre-check, BEFORE any extraction: a source is unchanged when the
    // manifest already has it active with the same revision/etag/modifiedTime.
    if (!manifestRow || manifestRow.status !== 'active') return false
    const eq = (a, b) => String(a == null ? '' : a) === String(b == null ? '' : b)
    return eq(local.revision, manifestRow.revision) &&
      eq(local.etag, manifestRow.etag) &&
      eq(local.modifiedTime, manifestRow.modifiedTime)
  }

  // Process ONE source end to end. Returns a reason string for the tally.
  async function processSource(source, deps, manifestById, activeByContentHash) {
    const sourceId = source.sourceId != null ? source.sourceId : source.id
    if (sourceId == null) return 'skipped:no-id'
    const manifestRow = manifestById.get(String(sourceId))

    // 1) Cheap pre-check - skip unchanged BEFORE extraction.
    if (unchanged(source, manifestRow)) {
      state.sources[String(sourceId)] = {
        revision: source.revision, etag: source.etag, modifiedTime: source.modifiedTime,
        contentHash: manifestRow.contentHash, version: manifestRow.version, uploadedAt: state.sources[String(sourceId)] ? state.sources[String(sourceId)].uploadedAt : now(),
      }
      return 'skipped:unchanged'
    }

    // 2) Extract on this device (raw file never leaves the machine).
    const extracted = await extract(source)
    const text = String((extracted && extracted.text) || '')
    const contentHash = deps.contentHashOf(text)
    const policyVersion = deps.policyVersionOf(policy)

    const baseSource = {
      sourceId,
      title: source.title || source.name || String(sourceId),
      kind: source.kind || 'doc',
      revision: source.revision,
      etag: source.etag,
      modifiedTime: source.modifiedTime,
      version: source.version,
      acl: 'company-wide',
      status: 'active',
    }

    // 3) contentHash dedupe - identical content to an ACTIVE manifest entry is
    // aliased, never re-embedded (same SOP in two places / re-tagged no-op edit).
    const aliasTarget = activeByContentHash.get(contentHash)
    if (aliasTarget && String(aliasTarget.sourceId) !== String(sourceId)) {
      await postChunks({ source: baseSource, model: deps.EMBED, policyVersion, contentHash, alias: true, aliasOf: aliasTarget.sourceId, records: [] })
      state.sources[String(sourceId)] = { revision: source.revision, etag: source.etag, modifiedTime: source.modifiedTime, contentHash, version: source.version, uploadedAt: now() }
      return 'aliased'
    }
    // Same source, same content, revision merely re-tagged: refresh metadata only.
    if (manifestRow && manifestRow.status === 'active' && manifestRow.contentHash === contentHash) {
      await postChunks({ source: baseSource, model: deps.EMBED, policyVersion, contentHash, alias: true, aliasOf: sourceId, records: [] })
      state.sources[String(sourceId)] = { revision: source.revision, etag: source.etag, modifiedTime: source.modifiedTime, contentHash, version: source.version, uploadedAt: now() }
      return 'aliased'
    }

    // 4) Chunk -> SCRUB each chunk ON DEVICE (same engine + logic as src/scrub.js
    //    cleanForStore: armed policy -> scrubWithPolicy, else always-redact floor)
    //    -> embed the SCRUBBED text. Raw PII/secrets never reach the embedder or
    //    the wire.
    const chunks = chunkText(text)
    const scrubbed = chunks.map((c) => {
      const r = policy ? deps.scrubWithPolicy(c.text, policy) : deps.scrubSensitive(c.text)
      return { ord: c.ord, clean: (r && r.clean) || '' }
    }).filter((c) => c.clean.trim().length > 0)

    if (!scrubbed.length) {
      state.sources[String(sourceId)] = { revision: source.revision, etag: source.etag, modifiedTime: source.modifiedTime, contentHash, version: source.version, uploadedAt: now() }
      return 'skipped:empty'
    }

    // Never push degraded vectors into the shared corpus. The test fake is the
    // one allowed non-model mode; a real model that failed to load stops here
    // with a STATED reason (SUPREME RULE VI / III - never silently degrade).
    const vectors = await embedPassages(scrubbed.map((c) => c.clean))
    const mode = embedMode()
    if (mode !== 'model' && process.env.BRAIN_EMBED_FAKE !== '1') {
      logger.warn(`[brain] uploader: holding ${baseSource.title} - embedder in '${mode}' mode, refusing to upload fallback vectors`)
      return 'held:embedder-degraded'
    }

    const records = scrubbed.map((c, i) => ({
      chunkId: `${sourceId}::${c.ord}`,
      sourceId,
      sourceTitle: baseSource.title,
      ordinal: c.ord,
      text: c.clean, // scrubbed
      vector: Array.from(vectors[i] || []), // JSON cannot carry Float32Array; L2-normalized dim-384
      contentHash,
      chunkHash: deps.chunkHashOf({ modelId: deps.EMBED.id, rev: deps.EMBED.rev, policyVersion, text: c.clean }),
    }))

    // 5) Batch POST the whole document in one request. supersede=true when the
    //    manifest already had this source active (server does chunk-level dedupe
    //    + tombstoning per the contract; this flag is a device hint).
    await postChunks({
      source: baseSource,
      model: deps.EMBED,
      policyVersion,
      contentHash,
      supersede: Boolean(manifestRow && manifestRow.status === 'active'),
      records,
    })

    state.sources[String(sourceId)] = { revision: source.revision, etag: source.etag, modifiedTime: source.modifiedTime, contentHash, version: source.version, uploadedAt: now() }
    return 'uploaded'
  }

  // One full pass. Directly callable in tests (no idle/guiding gate here; tick()
  // applies those). Processes one doc at a time, with a throttle gap, and bails
  // out cleanly the moment a guided session starts.
  async function runOnce() {
    if (busy) return { skipped: 'busy' }
    busy = true
    const tally = { pulled: 0, skippedUnchanged: 0, aliased: 0, uploaded: 0, held: 0, empty: 0, errors: 0, suspended: false }
    try {
      const deps = await loadDeps()
      let manifest
      try {
        manifest = await pullManifest()
      } catch (e) {
        logger.warn(`[brain] uploader: manifest pull failed (${(e && e.message) || e}); will retry`)
        tally.errors++
        return tally
      }

      const rows = Array.isArray(manifest.sources) ? manifest.sources : []
      const manifestById = new Map()
      const activeByContentHash = new Map()
      for (const row of rows) {
        manifestById.set(String(row.sourceId), row)
        if (row.status === 'active' && row.contentHash) activeByContentHash.set(row.contentHash, row)
      }

      const sources = await enumerateSources()
      tally.pulled = Array.isArray(sources) ? sources.length : 0

      for (let i = 0; i < (sources || []).length; i++) {
        if (guiding || stopped) { tally.suspended = true; break }
        const source = sources[i]
        let reason
        try {
          reason = await processSource(source, deps, manifestById, activeByContentHash)
        } catch (e) {
          tally.errors++
          logger.warn(`[brain] uploader: source ${source && (source.sourceId || source.id)} failed (${(e && e.message) || e})`)
          continue
        }
        if (reason === 'skipped:unchanged') tally.skippedUnchanged++
        else if (reason === 'aliased') tally.aliased++
        else if (reason === 'uploaded') tally.uploaded++
        else if (reason === 'held:embedder-degraded') tally.held++
        else if (reason === 'skipped:empty') tally.empty++

        // Persist after every doc so a restart resumes exactly here.
        saveState(stateFile, state)

        // Throttle between docs (low priority), and recheck guiding mid-gap.
        if (i < sources.length - 1) {
          await sleep(throttleMs)
          if (guiding || stopped) { tally.suspended = true; break }
        }
      }

      // Advance the cursor only after a clean pass (not when suspended), so a
      // suspended pass re-pulls the same window next time rather than skipping it.
      if (!tally.suspended && typeof manifest.cursor !== 'undefined' && manifest.cursor !== null) {
        state.cursor = manifest.cursor
        saveState(stateFile, state)
      }
      return tally
    } finally {
      busy = false
    }
  }

  // The gated entry point the interval calls: suspended while guiding, and only
  // runs when the machine is idle so we never fight the user for the CPU.
  async function tick() {
    if (stopped) return { skipped: 'stopped' }
    if (guiding) return { skipped: 'guiding' }
    if (busy) return { skipped: 'busy' }
    let idle
    try { idle = Number(getIdleTimeSec()) } catch { idle = 0 }
    if (!Number.isFinite(idle) || idle < idleThresholdSec) return { skipped: 'active', idle }
    return runOnce()
  }

  return {
    // Lifecycle.
    start() {
      stopped = false
      if (timer) return
      timer = setInterval(() => { tick().catch(() => {}) }, intervalMs)
      if (timer && typeof timer.unref === 'function') timer.unref() // never hold the app open
      return this
    },
    async stop() {
      stopped = true
      if (timer) { clearInterval(timer); timer = null }
    },
    // Guiding gate: driven by the brain:guiding-state IPC (watching && !paused).
    setGuiding(on) { guiding = !!on },
    // The existing work:pause-save signal means a session just paused/saved, so
    // nothing is guiding now - safe to let the uploader resume on the next tick.
    notePauseSave() { guiding = false },
    // Direct drivers (interval uses tick(); tests use runOnce()).
    tick,
    runOnce,
    isSuspended() { return guiding },
    isBusy() { return busy },
    state() { return { cursor: state.cursor, sources: Object.assign({}, state.sources) } },
    stateFile,
  }
}

module.exports = { createBrainUploader, chunkText }
