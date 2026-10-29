# WorkCoPilot Company Brain - architecture as built

Status: built and wired (server). This document describes the Company Brain
exactly as it exists in the code today. It is technical and honest: where a
behavior has a limit or a fallback, the limit is stated. US spelling, no em
dashes.

Source of truth for this document:
- `server/brain_model.js` - shared constants, tokenizer, hashing
- `server/brain_embed.js` - server-side embedder (and its stated fallback)
- `server/brain_ingest.js` - chunking, scrub, dedupe, supersede, manifest
- `server/brain_store.js` - per-tenant encrypted vector store
- `server/brain_crypto.js` - envelope encryption + key custody
- `server/key_derive.js`, `server/recovery_phrase.js` - KDF + recovery phrase
- `server/store.js` - company-record accessors (KEK, DEK, custody)
- `server/index.js` - routes and the plan-handler grounding

Key custody and the honest security ceiling have their own document:
`docs/company-brain-security.md`.

---

## 1. What the Company Brain is

A per-company ("per-tenant") knowledge store. A company's own documents are
turned into privacy-scrubbed, embedded, content-addressed chunks. At plan time,
for a company user, those chunks become the primary company grounding for the
answer, each carrying the name of the source it came from.

The design principle throughout: **raw company documents never reach the
server.** The desktop app extracts, scrubs and embeds on device; only scrubbed
text chunks and their numeric vectors are uploaded. The server stores them
encrypted per tenant and retrieves from them. This matches the SESSION-HANDOFF
vision (desktop-first ingestion; the server learns from scrubbed learning, not
from the documents).

Scope today is company-wide sources only (no per-user ACL trimming yet), per
SESSION-HANDOFF decision A (V1).

---

## 2. Desktop-first ingestion (scrub and embed on device)

The ingestion contract (`server/brain_ingest.js` `ingestSource`, and the server
intake route `POST /api/work/brain/chunks`) is built so that the heavy, sensitive
work happens on the device:

1. **Extract** the document text on the device (reusing the existing on-device
   extraction path).
2. **Chunk** the text (`chunkText`): about 1800 characters per chunk with about
   300 characters of overlap, split on heading and blank-line boundaries and
   never cutting through a numbered or bulleted step. A single block larger than
   the target is hard-windowed by characters with overlap as a last resort.
3. **Scrub** each chunk BEFORE anything else touches it. `ingestSource` runs
   `scrubWithPolicy(chunk, policy)` when a company policy is armed, otherwise the
   `scrubSensitive` floor. The redaction tally (`redacted`) is returned so the
   operator sees what was removed. Raw PII or secrets never reach the embedder or
   the stored index.
4. **Embed** only the scrubbed chunks that will actually be stored (see dedupe
   below). No raw text is ever embedded.
5. **Upload** the scrubbed chunk text plus its vector to the server. The original
   file is never uploaded.

What leaves the device: scrubbed chunk text, the vector, and content-addressing
hashes. What stays on the device: the original document.

### Server-side scrub floor (defense in depth)

Even though the device already scrubbed, the intake route
`POST /api/work/brain/chunks` re-applies the scrub (`scrubWithPolicy` with the
company's effective policy, else `scrubSensitive`) before storing, and records a
PII alert count if anything was caught. This is a second floor, not the primary
control.

### Embedding model and the stated fallback

The embedder (`server/brain_embed.js`) runs the SAME pinned model the desktop
uses, so query-time vectors live in the same space as passage-time vectors:

- Pinned model: `Xenova/bge-small-en-v1.5`, revision `main`, dimension **384**,
  int8 quantization (`brain_model.EMBED`).
- Runtime: transformers.js on the onnxruntime-web (WASM) backend, loaded lazily
  and LOCAL ONLY (`env.allowRemoteModels = false`); no network call at runtime.
- Query vs passage asymmetry: passages are embedded with no prefix; queries are
  embedded with the bge search prefix `"Represent this sentence for searching
  relevant passages:"`. This lives in exactly one place.
- Output vectors are L2-normalized, so cosine similarity reduces to a dot
  product.

**Honest fallback (stated, never silent):** if the transformers.js package is
not installed, or `BRAIN_EMBED_FAKE=1` is set, or model inference fails, the
embedder drops to a **deterministic hash-seeded vector** (sha256 over the text,
mapped into a unit vector). This keeps sibling modules runnable with no model
present, but these vectors are NOT semantically meaningful: in fallback mode
dense retrieval is effectively noise and only the keyword/BM25 arm carries
signal. The mode is logged once per process with its reason, and
`embedderReady()` returns `false` in fallback mode. See the mismatch note in the
report: there is no admin-facing route surfacing `embedderReady()` yet, so an
operator reads the mode from the process log.

---

## 3. Per-tenant encrypted vector store

`server/brain_store.js` exposes one store object, `brainStore`, with
`upsert`, `query`, `supersede`, `delete`, `stats`, `listSources`. Every tenant's
state lives under `DATA_DIR/brain/<companyId>/` where
`DATA_DIR = process.env.WORK_DATA_DIR || <server>/data`.

### On-disk layout: three sealed blobs

Every byte on disk is sealed (AES-256-GCM) under the tenant's key. The state is
split into three files so the hot retrieval path never decrypts cold text:

| File | Sealed contents | When decrypted |
|---|---|---|
| `index.sealed` | JSON manifest: `sources` (SourceRow[]), `tombstones`, and per-chunk metadata (`chunkId`, `sourceId`, `sourceTitle`, `ordinal`, `contentHash`, `chunkHash`). No text, no vectors. | Once, when the tenant becomes hot |
| `vectors.sealed` | Little-endian float32 bytes for every chunk vector, in `index.chunks` order. | Once on hot-load, into a single resident `Float32Array` |
| `texts.sealed` | JSON map `{ chunkId: base64(perChunkSealedTextBytes) }`. The outer map is sealed, and each value is additionally sealed per chunk. | Outer map once on hot-load; each chunk's text only when that chunk is a returned hit |

This double-sealing of text is deliberate: at query time, only the top-K returned
chunk texts are ever opened to plaintext. Text is never kept resident.

Writes are atomic (temp file, `fsync`, preserve owner/mode, `rename`), mirroring
`store.js` persist. A whole batch of records produces exactly one persist (three
blob writes), not one per record. When a tenant drops to zero chunks, the vector
and text blobs are removed so stats and disk reflect reality.

### Resident working set (LRU)

A hot tenant keeps: the source rows, the tombstones, the chunk metadata array,
the resident vector `Float32Array`, and the still-sealed per-chunk text
ciphertext map. The LRU default is 8 tenants (`BRAIN_LRU_TENANTS`). Evicting a
tenant drops all of that from memory.

Missing files mean "no brain yet" and yield an empty resident set (not an error).
A present-but-undecryptable blob THROWS and is never served as an empty corpus
(no silent fallback to an unkeyed or empty state).

### Pure-JS brute-force cosine behind a swappable boundary

`brainStore.query` scores every resident chunk vector against the query vector
with a plain dot-product loop over the 384 dimensions (vectors are L2-normalized,
so dot == cosine), then selects the top-K with a bounded worst-first selection
(`topKSelect`, O(N * topK), no full sort of N). Only the selected K chunk texts
are decrypted.

This is a pure-JavaScript linear scan with zero native dependencies. It is the
single concrete implementation today. The module is written so the storage and
scoring boundary can be swapped later (an embedded vector DB or pgvector), but
that swap is not built yet - see the mismatch note in the report (SESSION-HANDOFF
decision 1 anticipated LanceDB or SQLite-vec behind an adapter).

---

## 4. Content addressing, dedupe, versioning, tombstones

All identity helpers live in `server/brain_model.js` (one source of truth, pure,
deterministic):

- `normalizeText` - canonical text form (CRLF to LF, strip per-line trailing
  whitespace, collapse 3+ blank lines, trim). Every hash is taken over this form,
  so copies that differ only in line endings hash identically.
- `contentHashOf(text)` - sha256 over normalized whole-document text. The same
  document in two places, or fifty users with the same SOP, hash to one
  `contentHash` and are processed once.
- `chunkHashOf({ modelId, rev, policyVersion, text })` - binds the normalized
  chunk text to the embedding model id, the model revision, and the effective
  scrub policy version. Any of those changing yields a new `chunkHash`, which
  forces a partial re-embed. A stale vector is never served against a new model
  or policy.
- `policyVersionOf(policy)` - a short stable fingerprint of the armed scrub
  policy, or `''` when there is no policy (an unscrubbed corpus gets an honest
  empty version, not a fake one).

### Dedupe (ingest)

`ingestSource` inspects what already lives in the store (`listSources`):
- For a brand-new source or a same/older re-ingest, it stores only chunks whose
  `chunkHash` is not already resident (checked against the prior source's hashes,
  or the whole-tenant hash set for a new source). Identical chunks are skipped.
- A fully unchanged re-ingest writes nothing.

The returned tally is honest: `{ accepted, skipped, superseded, tombstoned,
redacted }`.

### Versioning and supersede (latest wins)

When an incoming version is strictly newer than the stored one (`isVersionNewer`
handles numeric versions, ISO timestamps, and plain string revisions),
`ingestSource` calls `brainStore.supersede`, which atomically replaces that one
source's chunk set and records the old version as a tombstone before dropping its
chunks. "Latest" is driven by the source's own revision when provided
(clock-skew safe), not upload time.

### Tombstones

Tombstones (`{ sourceId, version, chunkHashes, reason, supersededBy, at }`) are
recorded on supersede and on delete. They live in the manifest for audit. They
are NEVER retrieved: `query` scores only resident chunks, and tombstoned chunks
are not resident.

### Manifest (sync)

`buildManifest(companyId, { since })` returns one row per source (latest by
revision), optionally only those changed since a cursor, plus the pinned model
(`EMBED`) and the effective policy version, so a client can tell when a re-embed
is required.

---

## 5. Hybrid retrieval with provenance and a stated fallback

`server/brain_retrieve.js` `retrieveForGoal({ companyId, goal, app, topK=6 })` is
the primary grounding for the plan handler. It is a hybrid dense + sparse
retriever, fused, re-ranked, and gated:

1. **No brain yet** (no active source) returns the stated fallback
   `{ hits: [], grounded: false, fallbackReason: 'no_matching_sources' }` before
   it even embeds.
2. **Dense candidate pool:** embed the query (`embedQuery`), pull a candidate
   pool of size `K1 = max(topK*4, 20)` via `brainStore.query`.
3. **Two arms over the pool:**
   - Dense: the raw cosine (`vectorScore`) from the store.
   - Sparse: BM25 (`k1=1.5`, `b=0.75`) computed over the pool's own token sets,
     using the SAME tokenizer as ingestion (`brain_model.tokenize`).
   - Each arm is min-max normalized into [0,1].
4. **Fusion:** `score = 0.6 * normVector + 0.4 * normKeyword`, plus a `+0.1`
   bonus when the exact multi-word goal phrase appears verbatim in a chunk.
5. **Anti-fabrication raw-evidence gate:** min-max normalization alone would lift
   the best pure-noise candidate to 1.0 and fabricate grounding on an empty
   match. So a candidate counts as real only if it has genuine raw evidence from
   at least one arm: raw cosine >= `0.30` OR any keyword overlap. This is what
   makes the `no_matching_sources` fallback reachable even on a non-empty brain.
6. **Floor + re-rank:** keep only real-evidence hits whose fused score clears
   `MIN_SCORE = 0.35`; sort by score, with per-source recency as the tiebreak.
7. **Source-diversity cap:** at most 2 hits from any one source, then take up to
   `topK`.
8. Every returned hit carries `sourceTitle` as provenance, plus `vectorScore`,
   `keywordScore`, and the fused `score`.

If nothing clears the floor, the result is the same stated fallback. The module
never returns a silent empty result dressed as grounded, and never a fabricated
source.

### How the plan handler uses it (`server/index.js`)

For a company user, the plan handler calls `retrieveForGoal` and, when grounded,
injects the hits as "YOUR COMPANY'S OWN KNOWLEDGE" notes (each cited by source
title, routed through the `govScrub` chokepoint). Important, and a mismatch worth
noting against SESSION-HANDOFF: the brain **adds to** skills and learnings, it
does not **replace** them, so an empty brain never degrades the plan.

The fallbacks are surfaced to the user, never silent:
- grounded but nothing matched, with sources present: an event "No company
  document covered this, so I planned from general knowledge. Add it to your
  Company Brain..."
- the brain is locked (customer custody, see the security doc): a flag event
  "Your Company Brain is locked. Unlock it to ground this plan..."

---

## 6. Server routes

Document-plane routes (`server/index.js`), all under `requireWorkAuth`, all
company-scoped (solo users have no brain):

| Method + path | Gate | Purpose |
|---|---|---|
| `POST /api/work/brain/chunks` | company user | Intake scrubbed chunks + vectors (<= 1000 records/call `BRAIN_MAX_RECORDS`). Re-applies the scrub floor; `supersede` or `upsert`; returns the tally + `redacted`. A dedupe `alias` body is acknowledged and stores nothing. |
| `GET /api/work/brain/manifest` | company user | The sync manifest (latest-by-source, delta `since`), with the pinned model + policy version. |
| `GET /api/work/brain/inventory` | company admin (superadmin passes) | `stats` (chunks, active sources, dims, on-disk bytes, resident flag) + a per-source listing. |
| `DELETE /api/work/brain/sources/:id` | company admin | Remove one source's chunks (reason required, >= 3 chars; audit-logged). |
| `POST /api/work/brain/clear` | company admin | Remove every source (reason required; audit-logged). |
| `POST /api/work/brain/query` | company user | Read-only retrieval: `{ q, topK? }` -> top matching SCRUBBED chunks with provenance (`source` + `revision`) and a relevance `score`. See section 9. |
| `POST /api/work/brain/reembed` | company admin | Rebuild the tenant's vectors under a different catalog model `{ model, batchSize? }`, with NO re-upload. Audit-logged. See section 10. |

Key-custody routes are documented in `docs/company-brain-security.md`.

### Inventory (admin-facing)

`GET /api/work/brain/inventory` is the company-admin view: it returns store stats
(`chunks`, active `sources`, `dims`, on-disk `bytes`, whether the tenant is
resident) and one row per source (`sourceId`, `title`, `kind`, `version`, chunk
count, `status`, `updatedAt`, `policyVersion`). A platform superadmin passes the
`requireCompanyAdmin` gate and so sees the same view for the company in scope.
There is no separate cross-tenant superadmin brain inventory route today - see
the report mismatch note.

---

## 7. Boot wiring

At server start (`server/index.js`), the brain is injected with the store's
master key and the company-record accessors (single source of truth for the
master cipher):

```
configureBrainCrypto({ getMasterKey: store.brainMasterKey })
configureBrainStore({
  getWrappedDek: store.getCompanyBrainDek,
  setWrappedDek: store.setCompanyBrainDek,
  getCustody:    store.getCompanyBrainCustody,
})
```

An idle auto-lock timer locks customer-custody brains whose unlock window has
elapsed (see the security doc).

---

## 9. Query interface (read-only, company-scoped)

`POST /api/work/brain/query` (`server/brain_query.js`, orchestration; the route in
`server/index.js` is thin) lets a company user query their OWN tenant's brain
without exporting it. It reuses the one embedder and the one hybrid retriever
(`retrieveForGoal`) - there is no parallel retrieval path - and returns only
already-scrubbed chunk text plus provenance and a relevance score.

Request: `{ q: string, topK?: number }`. `topK` is clamped to `[1, 20]` (default
6). Response:

```
{
  matched: boolean,            // true when at least one source matched
  topK: number,                // the effective (clamped) topK
  semanticSearchReady: boolean,// false when the on-device embedder is not serving
  hits: [ { text, score, source: { sourceId, title, revision } } ],
  note?: string,               // present when matched === false (stated no-match)
  semanticNote?: string        // present when semanticSearchReady === false
}
```

What it returns and what it never returns:
- `text` is the already-scrubbed chunk text. `source` carries the provenance
  (`sourceId`, `title`, `revision`). `score` is the fused relevance (higher is
  closer). It returns NO vectors, NO content/chunk hashes, NO raw screens or
  secrets, and NO chat AI provider/model name.
- Company scope: the only tenant read is `req.workUser.companyId`.

Never a silent empty (SUPREME RULE III):
- A LOCKED customer-held brain returns HTTP 423 with code `BRAIN_LOCKED` and a
  message telling the caller to unlock it (the store throws `BRAIN_LOCKED` from
  `loadTenant`; the module maps it).
- An EMPTY brain (no active source) returns HTTP 409 `BRAIN_EMPTY`.
- An empty query returns HTTP 400 `BAD_QUERY`.
- A genuine no-match returns HTTP 200 with `matched:false` and a stated `note`
  (nothing is fabricated). This is honest, not silent.
- When the on-device embedding model is not serving, the request still succeeds in
  keyword-only mode and says so in `semanticNote` (honest degradation, never a
  silent drop).

## 10. Re-embedding under a larger or newer model

The store keeps the scrubbed chunk TEXT, not only vectors (`texts.sealed`), so a
tenant's vectors can be rebuilt by a different embedding model with NO re-upload.

- **Model catalog (single source of truth):** `server/brain_model.js`
  `EMBED_MODELS` lists the available models; all are the standard, open bge family
  (so the one bge query prefix is valid for every one). `EMBED` is the default pin,
  derived from the catalog but kept as the canonical 4-field public shape
  (`{ id, rev, dim, quant }`) the desktop and the manifest rely on. The larger
  entries today are `bge-base-en-v1.5` (dim 768) and `bge-large-en-v1.5` (dim
  1024). An unknown model name is a STATED error, never a silent default.
- **Dimension-aware store:** `server/brain_store.js` now carries each tenant's own
  `dim` (read from its manifest; default 384 for every existing tenant, so legacy
  tenants load byte-identically). Scoring, persistence, and the query-vector guard
  all use the tenant's dim. A query vector of the wrong dim throws rather than
  scoring past the end.
- **Model-aware retrieval:** `retrieveForGoal` embeds the query under the SAME
  model the tenant's passages were embedded with (resolved from the active
  sources' `embeddingModelVersion`, default `EMBED`), so query and passage vectors
  always share one space and one dim. `buildManifest` reports the tenant's ACTUAL
  pinned model (still normalized to the 4-field shape).
- **Atomic swap:** `server/brain_reembed.js` `reembedTenant` reads the chunk text
  (`brainStore.listChunksWithText`), embeds it in batches under the target model
  (`embedPassagesWith`), recomputes each `chunkHash`, and calls
  `brainStore.reembed`, which replaces every vector + the tenant `dim` + each
  source's pinned model, and re-seals any re-scrubbed text, in ONE persist. It is
  all-or-nothing: `reembed` asserts exactly one new vector per resident chunk
  (never silently truncates), so an abort or crash mid-run leaves the OLD vectors
  intact. Re-running simply redoes the work from the unchanged source; that is the
  resumability guarantee (there is deliberately no half-swapped, mixed-dim state on
  disk). Progress is surfaced per batch via an `onProgress` callback and an
  `AbortSignal` is honored before the swap.
- **Optional policy re-scrub:** when a new `policy` is supplied, each chunk's
  stored (already-scrubbed) text is re-scrubbed under it before embedding (which
  can only redact MORE), the re-scrubbed text is re-sealed, and the policy version
  is bumped. When omitted, the text and policy version are preserved.
- **Route:** `POST /api/work/brain/reembed` (company admin) runs it synchronously
  and returns `{ ok, chunks, sources, dim, model:{name,id,rev,dim}, policyVersion,
  batches }`. The embedding-model identifier here is a neutral, standard id of the
  same kind already in the manifest (for portability); it is NOT the chat AI
  provider/model. For a very large corpus this should move to a background job with
  streamed progress (the function already supports `onProgress`/`signal`); the
  synchronous route is the V1.

Known follow-up (flagged, not degraded): the executive export
(`readSealedBlobsForExport` -> `customer_export.js`) reports `dim` as the default
384 because it copies sealed bytes without the DEK and cannot read the encrypted
manifest's true dim. After a non-default-dim re-embed the archive's `dim` header
would read 384 while the vectors are larger. Wiring the real dim through (the
exporter holds the DEK during a password export) is a small follow-up; the export
flow itself is unchanged by this work.

## 11. External-platform query access (token design - NOT YET WIRED)

Requirement: a company-scoped, admin-issued, hashed, revocable, read-only
(`brain:query`) API token so another platform can call `POST /api/work/brain/query`
without a browser session.

Decision for THIS pass: the query endpoint is wired under SESSION auth only
(`requireWorkAuth` + company scope). The token is DESIGNED here but NOT built,
because a clean persistent home for the hashed tokens is not available right now:
`server/store.js` is being actively split by another session and billing is adding
to it (growing it is off limits per the no-monolith rule), and this task must not
create or touch db files. Half-building the security-sensitive path would be worse
than deferring it. The query route is structured so the token branch is a single
insertion (see the AUTH NOTE comment above `POST /api/work/brain/query`).

Proposed design (for review):
- **Shape:** an opaque token `wcpq_<base64url(32 random bytes)>`. Only a SHA-256
  hash of the token is stored (tokens are high-entropy, so a fast hash is the right
  primitive, as for GitHub-style PATs; no KDF needed). The plaintext is shown once
  at issue and never again.
- **Record (per company):** `{ id, name, hash, scope: 'brain:query', createdBy,
  createdAt, lastUsedAt, expiresAt?, revokedAt? }`. Scope is fixed to `brain:query`
  (read-only); the token can never ingest, export, or administer.
- **Issue / list / revoke:** company-admin routes
  (`POST/GET/DELETE /api/work/brain/tokens`), audit-logged like the other admin
  brain actions. Revoke sets `revokedAt` (the hash stays, so a leaked token keeps
  failing).
- **Check on the query route:** before `requireWorkAuth`, a small middleware reads
  `Authorization: Bearer wcpq_...`, hashes it, looks up the record, rejects when
  missing / revoked / expired, sets `req.workUser = { companyId }` (company scope
  only), and updates `lastUsedAt`. Everything else in `brain_query.js` is unchanged
  (it is already company-scoped and read-only).
- **Persistence home (the open choice for the owner):** either (a) a dedicated
  small `server/brain_token_store.js` with its own atomic-write sealed file under
  `DATA_DIR/brain/` (keeps `store.js` untouched, matches the no-monolith rule), or
  (b) company-record accessors added to `store.js` AFTER its split settles. (a) is
  recommended.
- **Rate limiting / abuse:** a per-token request cap is advisable since this path
  has no session; out of scope for the first cut.

## 12. Related documents

- `docs/company-brain-security.md` - envelope encryption, platform vs
  customer-held key custody, the honest security ceiling, and the custody routes.
- `docs/data-governance-and-company-spec.md` - the scrub policy, the governance
  wizard, and the single outbound chokepoint the brain consumes.
- `SESSION-HANDOFF.md` - the original design and decisions this build descends
  from (and where it diverges).
