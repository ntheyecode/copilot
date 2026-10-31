// Catalog gate: no visible string is left in English in another language.
// Owner (2026-10-31): "don't miss a single word, single context for all
// languages". The rendered gate (e2e/specs/locale-coverage.spec.mjs) catches an
// English sentence a locale translates differently; this one catches the other
// half, a locale value that is still the English text (copied, never
// translated), in the base catalog and in every audience overlay.
//
// A value may stay identical to English only for a stated reason: a product or
// tool name, a third-party UI label shown in English (Burp Suite's buttons), a
// protocol term, an address, or a loanword a native professional writes as is.
// Each kept value is listed in scripts/untranslated-allow.json with its reason:
//   { "<key>": { "locales": ["it", ...] | "*", "why": "..." } }
// Short tokens (fewer than two real words after names and codes) are not checked.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnglish, loadOverlay, audiences, VISIBLE, LOCALE_DIR } from './edition_copy_scan.mjs'
import { mergeOverlay } from '../src/i18n/overlay_merge.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ALLOW_FILE = path.join(HERE, 'untranslated-allow.json')
const SKIP = new Set(['en.js', 'en-GB.js'])
// Names and codes that read the same in every language.
const NAMEISH = /^(WorkCoPilot|MyTaskPilot|LinkNotes|AdmireVeda|Stripe|Google|Microsoft|Excel|SAML|SCIM|OpenID|OIDC|SSO|MFA|API|PDF|CSV|HIPAA|GDPR|PCI|SOC|ISO|CCPA|DPA|Android|Windows|iOS|macOS|Linux|AWS|Azure|GCP|Okta|Entra|Kubernetes|Terraform|Docker|GitHub|HubSpot|Salesforce|ServiceNow|SAP|Jira|Slack|Teams|Zoom|Lite|Basic|Advanced|Premium|OK|ID|URL|AI|IP|UTC|PM|AM)$/
// Markup, placeholders, code, email addresses and URLs carry no words to translate.
const words = (s) => (s.replace(/<[^>]+>|\{[^}]+\}|`[^`]*`|\S+@\S+|\bhttps?:\/\/\S+/g, ' ').match(/[A-Za-z]{3,}/g) || []).filter((w) => !NAMEISH.test(w))

export function readAllow(file = ALLOW_FILE) {
  if (!fs.existsSync(file)) return {}
  const allow = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const [k, v] of Object.entries(allow)) {
    if (!v || !v.why || !(v.locales === '*' || Array.isArray(v.locales))) throw new Error(`untranslated-allow.json: ${k} needs "locales" ("*" or a list) and a "why"`)
  }
  return allow
}

// Every string with its path (arrays expanded by index), values not types.
export const values = (v, p = '', out = new Map()) => { if (typeof v === 'string') out.set(p, v); else if (Array.isArray(v)) v.forEach((x, i) => values(x, `${p}.${i}`, out)); else if (v && typeof v === 'object') for (const k of Object.keys(v)) values(v[k], p ? `${p}.${k}` : k, out); return out }
const allowed = (allow, key, code) => { const a = allow[key]; return !!a && (a.locales === '*' || a.locales.includes(code)) }

// Pure: the keys of `loc` whose value is the English value, word-bearing, in a
// visible namespace, and not kept for a stated reason.
export function untranslatedKeys(en, loc, { code, namespaces, allow = {} }) {
  const E = values(en), L = values(loc)
  const out = []
  for (const [k, v] of E) {
    if (!namespaces.has(k.split('.')[0])) continue
    if (L.get(k) !== v || words(v).length < 2 || allowed(allow, k, code)) continue
    out.push(k)
  }
  return out
}

async function run() {
  const allow = readAllow()
  const en = await loadEnglish()
  const codes = fs.readdirSync(LOCALE_DIR).filter((f) => f.endsWith('.js') && !SKIP.has(f)).map((f) => f.replace(/\.js$/, ''))
  const all = new Set([...VISIBLE.organizations, ...VISIBLE.individuals])
  const misses = []
  for (const code of codes) {
    const loc = (await import(pathToFileURL(path.join(LOCALE_DIR, `${code}.js`)).href)).default || {}
    for (const k of untranslatedKeys(en, loc, { code, namespaces: all, allow })) misses.push(`${code} ${k}`)
    for (const aud of audiences()) {
      const enOv = (await loadOverlay(aud, 'en')) || {}
      const locOv = (await loadOverlay(aud, code)) || {}
      const ns = new Set(VISIBLE[aud] || [])
      const keys = untranslatedKeys(mergeOverlay(en, enOv), mergeOverlay(mergeOverlay(loc, enOv), locOv), { code, namespaces: ns, allow })
      for (const k of keys) if (values(enOv).has(k)) misses.push(`${code} ${k} (${aud} overlay)`)
    }
  }
  const unique = [...new Set(misses)]
  if (unique.length) {
    console.error(`[untranslated] FAIL: ${unique.length} visible string(s) still in English. Translate each, or keep it in scripts/untranslated-allow.json with the reason:`)
    for (const m of unique) console.error('  ' + m)
    process.exit(1)
  }
  console.log(`[untranslated] OK: ${codes.length} locales, every visible word-bearing string is translated or kept for a stated reason.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await run()
