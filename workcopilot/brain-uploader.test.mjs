// ---------------------------------------------------------------------------
// Focused test for the DEVICE Company Brain uploader (Phase 1b).
//
// Runs with BRAIN_EMBED_FAKE=1 so the real device embedder (brain-embed.js)
// serves deterministic dim-384 vectors with no model and no worker, a stubbed
// fetch (manifest GET + chunks POST), a stubbed source enumerator, and a temp
// userData dir. It asserts, against the frozen contract:
//   1. the manifest CHEAP-SKIP (unchanged revision/etag/modifiedTime -> no extract, no POST)
//   2. contentHash DEDUPE (identical content -> alias POST, no embed)
//   3. chunk + on-device SCRUB + embed (sensitive values redacted, vectors dim 384)
//   4. the batch POST payload shape matches the contract (BrainRecord + SourceRow fields)
//   5. PAUSE-ON-GUIDING suspends the queue (no POST while a session guides)
//   6. RESUME-FROM-CURSOR after a simulated restart (manifest pulled at the persisted cursor)
//
// Run: BRAIN_EMBED_FAKE=1 node --test workcopilot/brain-uploader.test.mjs
// US spelling. No em dashes.
// ---------------------------------------------------------------------------
import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

process.env.BRAIN_EMBED_FAKE = '1'

const require = createRequire(import.meta.url)
const uploaderMod = require('./brain-uploader.js')
const { createBrainUploader } = uploaderMod
const embedMod = require('./brain-embed.js')

// The real shared helpers (so manifest rows carry a real contentHash).
const { EMBED, contentHashOf } = await import('../server/brain_model.js')

function tempUserData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'brain-upl-'))
}

// A document with a raw email + SSN so we can assert on-device scrub happened.
const RAW_EMAIL = 'payroll.lead@example.com'
const RAW_SSN = '123-45-6789'
const S2_TEXT = `Onboarding SOP\n\nStep 1. Email ${RAW_EMAIL} for access.\nStep 2. Reference SSN ${RAW_SSN} on the intake form.\n`
const S3_TEXT = 'Shared policy: approvals require two signers.\n'

// Build a fetch stub. `manifestSources` is the SourceRow[] the manifest returns;
// `cursor` is the manifest cursor. Records every POST body and every manifest
// `since` value seen, so tests can assert the wire shape and the resume cursor.
function makeFetch({ manifestSources, cursor }) {
  const posts = []
  const sinceSeen = []
  const fetchImpl = async (url, init) => {
    const method = (init && init.method) || 'GET'
    if (url.includes('/api/work/brain/manifest')) {
      const since = new URL(url).searchParams.get('since')
      sinceSeen.push(since)
      return {
        ok: true,
        status: 200,
        async json() { return { cursor, sources: manifestSources, model: EMBED, policyVersion: '' } },
      }
    }
    if (url.includes('/api/work/brain/chunks') && method === 'POST') {
      const body = JSON.parse(init.body)
      posts.push(body)
      return { ok: true, status: 200, async json() { return { accepted: body.records.length } } }
    }
    throw new Error(`unexpected fetch ${method} ${url}`)
  }
  return { fetchImpl, posts, sinceSeen }
}

// A counting embed spy that wraps the real device embedder (fake mode).
function embedSpy() {
  const calls = []
  const fn = async (texts) => {
    calls.push(texts)
    return embedMod.embedPassages(texts)
  }
  return { fn, calls }
}

// Enumerator that records which sources were extracted.
function makeSources(extracted) {
  return [
    // s1: unchanged vs manifest -> cheap-skip before extraction.
    { sourceId: 's1', title: 'Handbook', kind: 'doc', revision: 'r1', etag: 'e1', modifiedTime: 't1', version: '1',
      read: async () => { extracted.push('s1'); return { text: 'unchanged handbook text' } } },
    // s2: new source with sensitive text -> scrub + embed + upload.
    { sourceId: 's2', title: 'Onboarding SOP', kind: 'doc', revision: 'r1', etag: 'e2', modifiedTime: 't2', version: '1',
      read: async () => { extracted.push('s2'); return { text: S2_TEXT } } },
    // s3: revision changed but content identical to its manifest row -> alias only.
    { sourceId: 's3', title: 'Approvals', kind: 'doc', revision: 'r9', etag: 'e9', modifiedTime: 't9', version: '2',
      read: async () => { extracted.push('s3'); return { text: S3_TEXT } } },
  ]
}

test('cheap-skip, contentHash alias, and scrub+embed+POST shape', async () => {
  const userDataDir = tempUserData()
  const extracted = []
  const spy = embedSpy()
  const manifestSources = [
    { sourceId: 's1', title: 'Handbook', status: 'active', revision: 'r1', etag: 'e1', modifiedTime: 't1', version: '1', contentHash: 'prior-s1', chunkHashes: [] },
    { sourceId: 's3', title: 'Approvals', status: 'active', revision: 'r1', etag: 'e1', modifiedTime: 't0', version: '1', contentHash: contentHashOf(S3_TEXT), chunkHashes: [] },
  ]
  const { fetchImpl, posts } = makeFetch({ manifestSources, cursor: 100 })

  const up = createBrainUploader({
    serverUrl: 'https://test.local',
    fetch: fetchImpl,
    userDataDir,
    throttleMs: 0,
    getIdleTimeSec: () => 9999,
    enumerateSources: async () => makeSources(extracted),
    embedPassages: spy.fn,
    embedMode: () => 'fake',
  })

  const tally = await up.runOnce()

  // 1) Cheap-skip: s1 unchanged -> never extracted, never posted.
  assert.equal(tally.skippedUnchanged, 1, 'one unchanged source cheap-skipped')
  assert.ok(!extracted.includes('s1'), 's1 was NOT extracted (skipped before extraction)')

  // 2) contentHash dedupe: s3 content identical to its manifest row -> alias.
  assert.equal(tally.aliased, 1, 'one source aliased by contentHash')
  assert.ok(extracted.includes('s3'), 's3 was extracted (to compute its contentHash)')

  // 3) s2 is the only one embedded (alias + skip never embed).
  assert.equal(tally.uploaded, 1, 'one source uploaded')
  assert.equal(spy.calls.length, 1, 'embed called exactly once (s2 only)')

  // Separate the alias POST from the full upload POST.
  const aliasPosts = posts.filter((p) => p.alias)
  const fullPosts = posts.filter((p) => !p.alias)
  assert.equal(aliasPosts.length, 1, 'one alias POST')
  assert.equal(aliasPosts[0].records.length, 0, 'alias POST carries no records (no re-embed)')
  assert.equal(String(aliasPosts[0].source.sourceId), 's3')

  // 4) The full POST payload shape matches the contract.
  assert.equal(fullPosts.length, 1, 'one full chunks POST')
  const body = fullPosts[0]
  assert.equal(String(body.source.sourceId), 's2')
  assert.equal(body.source.acl, 'company-wide')
  assert.equal(body.source.status, 'active')
  assert.deepEqual(body.model, EMBED, 'model pin echoes the single-source EMBED')
  assert.equal(typeof body.policyVersion, 'string')
  assert.equal(typeof body.contentHash, 'string')
  assert.equal(body.supersede, false, 's2 is new (not in manifest) -> not a supersede')
  assert.ok(Array.isArray(body.records) && body.records.length >= 1, 'records present')

  const rec = body.records[0]
  assert.equal(rec.chunkId, 's2::0')
  assert.equal(String(rec.sourceId), 's2')
  assert.equal(rec.sourceTitle, 'Onboarding SOP')
  assert.equal(rec.ordinal, 0)
  assert.ok(Array.isArray(rec.vector), 'vector serialized as a plain number array (JSON-safe)')
  assert.equal(rec.vector.length, 384, 'vector is dim 384')
  assert.match(rec.chunkHash, /^[0-9a-f]{64}$/, 'chunkHash is a sha256 hex')
  assert.equal(typeof rec.contentHash, 'string')

  // 3b) The text was scrubbed ON DEVICE before embedding/upload.
  assert.ok(rec.text.includes('[EMAIL]'), 'email redacted to [EMAIL]')
  assert.ok(rec.text.includes('[SSN]'), 'ssn redacted to [SSN]')
  assert.ok(!rec.text.includes(RAW_EMAIL), 'raw email never left the device')
  assert.ok(!rec.text.includes(RAW_SSN), 'raw ssn never left the device')

  // The embedder was handed the SCRUBBED text, not the raw text.
  const embeddedText = spy.calls[0].join('\n')
  assert.ok(!embeddedText.includes(RAW_EMAIL) && !embeddedText.includes(RAW_SSN), 'embedder never saw raw sensitive values')
})

test('pause-on-guiding suspends the queue', async () => {
  const userDataDir = tempUserData()
  const extracted = []
  const { fetchImpl, posts } = makeFetch({ manifestSources: [], cursor: 5 })

  const up = createBrainUploader({
    serverUrl: 'https://test.local',
    fetch: fetchImpl,
    userDataDir,
    throttleMs: 0,
    getIdleTimeSec: () => 9999, // machine idle, so only guiding can hold it
    enumerateSources: async () => makeSources(extracted),
    embedPassages: async (t) => embedMod.embedPassages(t),
    embedMode: () => 'fake',
  })

  up.setGuiding(true)
  const r = await up.tick()
  assert.equal(r.skipped, 'guiding', 'tick is skipped while a session guides')
  assert.equal(posts.length, 0, 'nothing posted while guiding')
  assert.ok(!extracted.length, 'nothing extracted while guiding')

  // work:pause-save means the session paused -> nothing guiding -> resume allowed.
  up.notePauseSave()
  assert.equal(up.isSuspended(), false, 'pause-save clears the guiding suspend')
})

test('resume-from-cursor after a simulated restart', async () => {
  const userDataDir = tempUserData()

  // First run: manifest cursor 100 is persisted after a clean pass.
  const firstManifest = [
    { sourceId: 's1', title: 'Handbook', status: 'active', revision: 'r1', etag: 'e1', modifiedTime: 't1', version: '1', contentHash: 'prior-s1', chunkHashes: [] },
  ]
  const first = makeFetch({ manifestSources: firstManifest, cursor: 100 })
  const upA = createBrainUploader({
    serverUrl: 'https://test.local',
    fetch: first.fetchImpl,
    userDataDir,
    throttleMs: 0,
    getIdleTimeSec: () => 9999,
    enumerateSources: async () => [
      { sourceId: 's1', title: 'Handbook', revision: 'r1', etag: 'e1', modifiedTime: 't1', version: '1', read: async () => ({ text: 'x' }) },
    ],
    embedPassages: async (t) => embedMod.embedPassages(t),
    embedMode: () => 'fake',
  })
  await upA.runOnce()
  assert.equal(first.sinceSeen[0], '0', 'first run pulls the manifest from cursor 0')
  assert.equal(upA.state().cursor, 100, 'cursor advanced to the manifest cursor')
  assert.ok(fs.existsSync(upA.stateFile), 'resume state persisted to disk')

  // Simulated restart: a NEW uploader over the SAME userData dir loads the cursor.
  const second = makeFetch({ manifestSources: firstManifest, cursor: 140 })
  const upB = createBrainUploader({
    serverUrl: 'https://test.local',
    fetch: second.fetchImpl,
    userDataDir,
    throttleMs: 0,
    getIdleTimeSec: () => 9999,
    enumerateSources: async () => [
      { sourceId: 's1', title: 'Handbook', revision: 'r1', etag: 'e1', modifiedTime: 't1', version: '1', read: async () => ({ text: 'x' }) },
    ],
    embedPassages: async (t) => embedMod.embedPassages(t),
    embedMode: () => 'fake',
  })
  const tally = await upB.runOnce()
  assert.equal(second.sinceSeen[0], '100', 'after restart the manifest is pulled at the persisted cursor 100')
  assert.equal(tally.skippedUnchanged, 1, 's1 is cheap-skipped on resume (unchanged)')
  assert.equal(second.posts.length, 0, 'nothing re-uploaded on resume')
})

// ---------------------------------------------------------------------------
// Local git code-repo ingest: a registered temp git repo is enumerated through
// workcopilot/git_source.js (the REAL connector), mapped to the source contract
// as kind:'code', uploaded through the same chunk->scrub->embed->POST pipeline;
// then a second pass with the persisted head does the INCREMENTAL diff so only
// the changed file re-uploads and a deleted file flows to the removal path.
//
// Uses a stubbed fetch (manifest GET + chunks POST + source DELETE) and the fake
// embedder. The connector itself is not stubbed - a real `git` CLI is driven.
// ---------------------------------------------------------------------------
function haveGit() {
  try { execFileSync('git', ['--version'], { stdio: 'ignore' }); return true } catch { return false }
}

function git(cwd, args) {
  // Isolated config so a developer's global hooks / signing never affect the test.
  execFileSync('git', [
    '-c', 'core.hooksPath=', '-c', 'commit.gpgsign=false',
    '-c', 'user.email=ingest@test.local', '-c', 'user.name=Ingest Test',
    ...args,
  ], { cwd, stdio: 'pipe' })
}

// A fetch stub that also understands the DELETE removal endpoint.
function makeRepoFetch({ cursor }) {
  const posts = []
  const deletes = []
  const sinceSeen = []
  const fetchImpl = async (url, init) => {
    const method = (init && init.method) || 'GET'
    if (url.includes('/api/work/brain/manifest')) {
      sinceSeen.push(new URL(url).searchParams.get('since'))
      return { ok: true, status: 200, async json() { return { cursor, sources: [], model: EMBED, policyVersion: '' } } }
    }
    if (url.includes('/api/work/brain/sources/') && method === 'DELETE') {
      deletes.push(decodeURIComponent(url.split('/api/work/brain/sources/')[1]))
      return { ok: true, status: 200, async json() { return { removed: 1 } } }
    }
    if (url.includes('/api/work/brain/chunks') && method === 'POST') {
      const body = JSON.parse(init.body)
      posts.push(body)
      return { ok: true, status: 200, async json() { return { accepted: body.records.length } } }
    }
    throw new Error(`unexpected fetch ${method} ${url}`)
  }
  return { fetchImpl, posts, deletes, sinceSeen }
}

test('local git repo: added entries map to kind:code, then incremental diff + removal', { skip: haveGit() ? false : 'git CLI not available' }, async () => {
  const userDataDir = tempUserData()
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-repo-'))
  const repoName = path.basename(repoDir)

  // A repo with two source files (plus an ignored lockfile that must NOT ingest).
  fs.writeFileSync(path.join(repoDir, 'a.js'), 'export const a = 1\n')
  fs.writeFileSync(path.join(repoDir, 'b.js'), 'export const b = 2\n')
  fs.writeFileSync(path.join(repoDir, 'package-lock.json'), '{"lockfileVersion":3}\n')
  git(repoDir, ['init', '-q'])
  git(repoDir, ['add', '-A'])
  git(repoDir, ['commit', '-q', '-m', 'initial'])

  const net = makeRepoFetch({ cursor: 0 })
  const up = createBrainUploader({
    serverUrl: 'https://test.local',
    fetch: net.fetchImpl,
    userDataDir,
    throttleMs: 0,
    getIdleTimeSec: () => 9999,
    enumerateSources: async () => [], // no admin sources; the repo target is the only input
    embedPassages: async (t) => embedMod.embedPassages(t),
    embedMode: () => 'fake',
    repoTargets: [repoDir],
  })

  // --- First pass: full enumeration -> both source files upload as code. ---
  const first = await up.runOnce()
  assert.equal(first.uploaded, 2, 'both repo source files uploaded on the first pass')
  assert.equal(first.removed, 0, 'nothing removed on the first pass')

  const byId = new Map(net.posts.map((p) => [String(p.source.sourceId), p]))
  const aPost = byId.get(`git:${repoName}:a.js`)
  const bPost = byId.get(`git:${repoName}:b.js`)
  assert.ok(aPost && bPost, 'both files posted with stable git: sourceIds')
  assert.ok(!byId.has(`git:${repoName}:package-lock.json`), 'ignored lockfile was not ingested')

  // Contract-shape checks on the mapped code source.
  assert.equal(aPost.source.kind, 'code', 'kind is code so the server chunks it code-aware')
  assert.equal(aPost.source.title, 'a.js', 'title is the repo-relative path')
  assert.equal(aPost.source.acl, 'company-wide')
  assert.equal(aPost.source.status, 'active')
  assert.equal(typeof aPost.source.revision, 'string')
  assert.ok(aPost.source.revision.length > 0, 'revision carries the git blob sha')
  assert.ok(Array.isArray(aPost.records) && aPost.records.length >= 1, 'code chunks present')
  assert.equal(aPost.records[0].vector.length, 384, 'embedded dim-384 vector')

  // The head was persisted as the next incremental base.
  const head1 = up.state().repos[path.resolve(repoDir)].headCommit
  assert.match(head1, /^[0-9a-f]{7,40}$/, 'repo head persisted for the next incremental pass')
  assert.equal(net.sinceSeen.length >= 1, true)

  // --- Mutate: change a.js, delete b.js, commit. ---
  fs.writeFileSync(path.join(repoDir, 'a.js'), 'export const a = 42 // changed\n')
  git(repoDir, ['rm', '-q', 'b.js'])
  git(repoDir, ['add', '-A'])
  git(repoDir, ['commit', '-q', '-m', 'change a, drop b'])

  const postsBefore = net.posts.length
  // --- Second pass: incremental from the persisted head. ---
  const second = await up.runOnce()

  // Only a.js changed -> exactly one upload; b.js deleted -> one removal.
  assert.equal(second.uploaded, 1, 'only the changed file re-uploaded on the incremental pass')
  assert.equal(second.removed, 1, 'the deleted file flowed to the removal path')
  const newPosts = net.posts.slice(postsBefore)
  assert.equal(newPosts.length, 1, 'exactly one new chunks POST on the incremental pass')
  assert.equal(String(newPosts[0].source.sourceId), `git:${repoName}:a.js`, 'the changed file is the one re-uploaded')
  assert.deepEqual(net.deletes, [`git:${repoName}:b.js`], 'the removed sourceId hit the DELETE endpoint')

  // The persisted head advanced to the new HEAD.
  const head2 = up.state().repos[path.resolve(repoDir)].headCommit
  assert.notEqual(head2, head1, 'repo head advanced after the incremental pass')
})
