// Edition-aware wording: per-audience i18n OVERLAYS merged over the base locale.
//
// One page, one component, one key: an edition that speaks to a narrower
// audience does not fork pages, it swaps the words. The audience comes from the
// capabilities (copyAudience in server/edition_registry.js):
//   organizations  companies only (no personal sign-up or personal plans)
//   individuals    individuals only (no company wording anywhere)
//   null           both (the base catalog, nothing merged: today's product)
//
// Files: src/i18n/overlays/<audience>/<locale>.js, each a partial catalog that
// mirrors base key paths (the merge rules are in overlay_merge.js: objects merge
// deep, an index patch changes single array elements, arrays and strings
// replace). Every
// locale carries every key its audience's en overlay has (gate:
// scripts/check-edition-copy.mjs), so a reader never sees the
// base wording in their language because one overlay string was missing.
// en-GB reads the en overlay under its own en-GB overlay (British spelling).
import { mergeOverlay } from './overlay_merge.js'
import { brandForAudience, rebrandCatalog } from '../../server/brand.js'

// The English overlays are small and are every audience's fallback, so they
// ship in the main bundle (no network round trip, nothing to fail); the other
// locales load lazily like their base dictionaries.
const EAGER_EN = import.meta.glob('./overlays/*/en.js', { eager: true })
const LOADERS = import.meta.glob(['./overlays/*/*.js', '!./overlays/*/en.js'])
const loaded = new Map()   // `${audience}/${code}` -> partial catalog ({} when the locale has none)
for (const [p, mod] of Object.entries(EAGER_EN)) {
  const m = p.match(/^\.\/overlays\/([^/]+)\/en\.js$/)
  if (m) loaded.set(`${m[1]}/en`, (mod && mod.default) || {})
}
const merged = new Map()   // `${audience}/${code}` -> merged dictionary, per base object

const keyOf = (aud, code) => `${aud}/${code}`

async function loadOne(aud, code) {
  const k = keyOf(aud, code)
  if (loaded.has(k)) return loaded.get(k)
  const loader = LOADERS[`./overlays/${aud}/${code}.js`]
  let part = {}
  if (loader) {
    try { const mod = await loader(); part = (mod && mod.default) || {} } catch (e) {
      // Network hiccup: NOT cached, so the next language load retries. Until
      // then the reader sees this audience's English overlay (overlayReady
      // stays false for this locale), never the base wording. Logged.
      try { console.warn(`[i18n] overlay ${k} failed to load (${e && e.message}); retrying on the next load`) } catch { /* no console */ }
      return null
    }
  }
  loaded.set(k, part)
  return part
}

// Load what one (audience, locale) pair needs: the en overlay (the fallback
// dictionary is English) plus the locale's own.
export async function loadOverlay(aud, code) {
  if (!aud) return
  await Promise.all([loadOne(aud, 'en'), code === 'en' ? null : loadOne(aud, code)])
}

export function overlayReady(aud, code) {
  return !aud || (loaded.has(keyOf(aud, 'en')) && (code === 'en' || loaded.has(keyOf(aud, code))))
}

// The dictionary a reader of `code` sees for this audience. Returns `base`
// itself when there is no audience (nothing merged, nothing copied).
export function withOverlay(base, aud, code) {
  if (!aud || !base) return base
  const k = keyOf(aud, code)
  const hit = merged.get(k)
  if (hit && hit.base === base) return hit.dict
  const own = loaded.get(k) || {}
  const parts = code === 'en-GB' ? [loaded.get(keyOf(aud, 'en')) || {}, own] : [own]
  // The audience's brand (LinkNotes for individuals) renames the product once,
  // here, after the overlay: server/brand.js holds the one rule.
  const dict = rebrandCatalog(parts.reduce((acc, p) => mergeOverlay(acc, p), base), brandForAudience(aud))
  merged.set(k, { base, dict })
  return dict
}
