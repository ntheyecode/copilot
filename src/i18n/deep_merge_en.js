// Deep-merge an English partial (src/i18n/locales/en/*.js) into the English
// base. ONE implementation, shared by the runtime loader (src/i18n/index.jsx)
// and the locale-parity build gate (scripts/check-locale-parity.mjs), so the
// gate checks exactly the catalog the app ships. Before this the gate loaded
// en.js alone, never saw the partial namespaces (every admin namespace), and
// reported a brand-new namespace as "OK" while it was missing from all locales.
export function deepMergeEn(target, src) {
  for (const k of Object.keys(src || {})) {
    const v = src[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) target[k] = deepMergeEn({ ...(target[k] || {}) }, v)
    else target[k] = v
  }
  return target
}
