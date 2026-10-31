// The ONE merge for edition wording overlays (src/i18n/overlays/<audience>/).
// Used by the runtime loader (src/i18n/overlay.js), the prerender
// (scripts/prerender-marketing.mjs) and the copy gate
// (scripts/edition_copy_scan.mjs), so all three read exactly the same catalog.
//
// Rules (pure; neither input is changed):
//   - objects merge key by key, deep;
//   - an ARRAY in the overlay replaces the base value as a unit;
//   - an object whose keys are all array indexes ("0", "3", ...) laid over a
//     base ARRAY patches those elements only (deep), so one FAQ answer or one
//     card can change without copying the whole list into every locale;
//   - anything else (a string) replaces.
const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const isIndexPatch = (v) => isPlainObject(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => /^\d+$/.test(k))

export function mergeOverlay(base, overlay) {
  if (overlay === undefined) return base
  if (Array.isArray(base) && isIndexPatch(overlay)) {
    const out = base.slice()
    for (const [k, v] of Object.entries(overlay)) {
      const i = Number(k)
      if (i < out.length) out[i] = mergeOverlay(out[i], v)
    }
    return out
  }
  if (isPlainObject(base) && isPlainObject(overlay)) {
    const out = { ...base }
    for (const [k, v] of Object.entries(overlay)) out[k] = mergeOverlay(base[k], v)
    return out
  }
  return overlay
}
