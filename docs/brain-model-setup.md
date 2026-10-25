# Company Brain embedding model - setup

The Company Brain embedder runs the pinned model from `server/brain_model.js`:

```
EMBED = { id: 'Xenova/bge-small-en-v1.5', rev: 'main', dim: 384, quant: 'int8' }
```

It loads LOCAL-ONLY (`env.allowRemoteModels = false`), resolving files under
`<BRAIN_MODEL_DIR>/<EMBED.id>/`. Until those files exist, `server/brain_embed.js`
and `workcopilot/brain-embed.js` run a deterministic hash-seeded FALLBACK (noise
vectors) and `embedderReady()` returns `false`. Real ingestion stays blocked
until the model is placed.

## Fetch + verify + place

```
node scripts/fetch-brain-model.mjs                 # default target
node scripts/fetch-brain-model.mjs <targetDir>     # explicit target
BRAIN_MODEL_DIR=<fullModelDir> node scripts/fetch-brain-model.mjs
```

Node 18+ (global `fetch`). Node built-ins only - no new dependency, no
`npm install`. Downloads from `https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/<file>`,
SHA-256 verifies each file against the pinned `KNOWN_SHA256` map, refuses any
mismatch, and is idempotent (present + verified files are skipped).

### File manifest and pinned SHA-256 (computed 2026-10-25; confirm vs HuggingFace)

| File | Size | SHA-256 |
|---|---|---|
| `config.json` | 683 B | `fa73f90bf92c8cace1fbcb709626306f2bdbc9ea3e5b5f94b440df9b6aa56350` |
| `tokenizer.json` | 694.7 KB | `d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66` |
| `tokenizer_config.json` | 366 B | `9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3` |
| `onnx/model_quantized.onnx` | 32.44 MB | `6c9c6101a956d62dfb5e7190c538226c0c5bb9cb27b651234b6df063ee7dbfe4` |

Confirm against `https://huggingface.co/Xenova/bge-small-en-v1.5/tree/main`
(LFS sha256 for the `.onnx`, direct hash for the JSON). To intentionally change
the model: set `PINNED = false`, re-run to print fresh hashes, confirm, paste
them into `KNOWN_SHA256`, set `PINNED = true`.

## Do NOT commit the model to git

The weights are ~30-40 MB of binary. They must NOT enter git history.

- Add `server/models/` to `.gitignore` (it is not ignored today).
- The files live in `BRAIN_MODEL_DIR` / `extraResources`, placed at build or
  install time, never in the repo.

## Wiring into the server / desktop build (place model BEFORE enabling real embedding)

Default target is `server/models/Xenova/bge-small-en-v1.5`, which matches the
embedder's default `BRAIN_MODEL_DIR = server/models` (transformers.js appends
`<EMBED.id>`). The `BRAIN_MODEL_DIR` the embedder reads is a model ROOT; the
script's target is the FULL dir (root + `Xenova/bge-small-en-v1.5`).

- **Server image**: run `node scripts/fetch-brain-model.mjs` in the Dockerfile /
  build step (or mount a pre-populated volume) so the files land before the
  sidecar starts. On boot the embedder logs `embeddings: model (... local WASM)`
  instead of `deterministic-fallback`; `embedderReady()` then returns `true`.
- **Desktop / on-prem OFFLINE edition**: place the model dir as an Electron
  `extraResource` and set `BRAIN_MODEL_DIR` to that resource path's model root.
  Fetch at package time on a networked build host (the deploy target stays
  offline).
- **Verify after placing**: a boot log line of `deterministic-fallback (model
  unavailable: ...)` means the files are missing or in the wrong path - check
  `BRAIN_MODEL_DIR` points at the root that contains `Xenova/bge-small-en-v1.5`.
