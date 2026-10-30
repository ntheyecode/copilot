// Edition profiles: read editions/<id>/manifest.json and turn it into the
// environment a server of that edition starts with. Pure apart from reading the
// manifest file. Used by editions/start.mjs and build/compose.mjs.
//
// A manifest holds ONLY what differs per edition and is not a capability:
//   { "edition": "<id>", "env": { "<VAR>": "<default>" }, "notes": "..." }
// The capabilities stay in server/edition_registry.js (the single source). The
// edition id is written to WORK_EDITION here; nothing in a manifest may set
// WORK_EDITION itself, so the folder name, the manifest and the env never
// disagree.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EDITION_IDS } from '../server/edition_registry.js'

export const EDITIONS_DIR = path.dirname(fileURLToPath(import.meta.url))

export function loadManifest(id, dir = EDITIONS_DIR) {
  if (!EDITION_IDS.includes(id)) throw new Error(`[editions] unknown edition "${id}". Choose one of: ${EDITION_IDS.join(', ')}.`)
  const file = path.join(dir, id, 'manifest.json')
  let m
  try { m = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { throw new Error(`[editions] cannot read ${file} (${e.code || e.message}).`) }
  if (m.edition !== id) throw new Error(`[editions] ${file} says edition "${m.edition}" but lives in the "${id}" folder.`)
  const env = m.env || {}
  if (typeof env !== 'object' || Array.isArray(env)) throw new Error(`[editions] ${file}: "env" must be an object of VAR: "value".`)
  for (const [k, v] of Object.entries(env)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) throw new Error(`[editions] ${file}: "${k}" is not an environment variable name.`)
    if (typeof v !== 'string') throw new Error(`[editions] ${file}: the default for ${k} must be a string.`)
    if (k === 'WORK_EDITION') throw new Error(`[editions] ${file}: do not set WORK_EDITION in env; it comes from "edition".`)
  }
  return { edition: id, env, notes: m.notes || '' }
}

// The variables to set for this edition. A variable the operator already set
// wins over the manifest default, with one exception: WORK_EDITION must match
// the edition being started (starting "onprem" with WORK_EDITION=saas is a
// mistake that must stop, not a preference).
// A variable counts as set when it exists at all, even empty (an operator's
// WORK_DB_AUTO_MIGRATE= means "off", and must not be replaced by the default).
// WORK_EDITION is read the way the server reads it: blank means unset.
export function profileEnv(manifest, current = process.env) {
  const asked = String(current.WORK_EDITION == null ? '' : current.WORK_EDITION).trim().toLowerCase()
  if (asked && asked !== manifest.edition) {
    throw new Error(`[editions] starting the "${manifest.edition}" edition, but WORK_EDITION is set to "${current.WORK_EDITION}". Unset it or start that edition instead.`)
  }
  const out = { WORK_EDITION: manifest.edition }
  for (const [k, v] of Object.entries(manifest.env)) if (current[k] === undefined) out[k] = v
  return out
}
