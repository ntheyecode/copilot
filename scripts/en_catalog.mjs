// The English catalog exactly as the SPA builds it, for Node scripts:
// en.js + every partial in src/i18n/locales/en/ (deepMergeEn, the runtime's
// own merge, in file order like import.meta.glob), then the audience's
// wording overlay (mergeOverlay, src/i18n/overlay.js does the same at load).
// The prerender and its tests read crawler copy from here, so the static
// pages say what the live pages say.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'
import { mergeOverlay } from '../src/i18n/overlay_merge.js'
import { brandForAudience, rebrandCatalog } from '../server/brand.js'

const LOCALES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales')

export async function loadEnCatalog(audience = null) {
  const load = async (f) => ((await import(pathToFileURL(f).href)).default) || {}
  let en = { ...(await load(path.join(LOCALES, 'en.js'))) }
  for (const f of fs.readdirSync(path.join(LOCALES, 'en')).filter((x) => x.endsWith('.js')).sort()) en = deepMergeEn(en, await load(path.join(LOCALES, 'en', f)))
  if (audience) en = mergeOverlay(en, await load(path.join(LOCALES, '..', 'overlays', audience, 'en.js')))
  // ...and the audience's brand, exactly as src/i18n/overlay.js applies it.
  return rebrandCatalog(en, brandForAudience(audience))
}

// A t()-style lookup over a catalog: 'a.b.c' -> value (string, array or object).
export function lookup(catalog) {
  return (key) => String(key).split('.').reduce((x, k) => (x == null ? undefined : x[k]), catalog)
}

export default { loadEnCatalog, lookup }
