// The desktop app's brand, chosen at BUILD time: one codebase ships
// WorkCoPilot (corporate, admireveda.com) and LinkNotes (individuals,
// linknotes.com). The LinkNotes build injects `"brand": "linknotes"` into the
// packaged package.json (build/linknotes.builder.cjs, extraMetadata); a dev run
// can set WORK_BRAND. Mirrors server/brand.js (name, domain); the server stays
// the source of truth for everything the web console shows.
const BRANDS = Object.freeze({
  workcopilot: Object.freeze({ id: 'workcopilot', name: 'WorkCoPilot', server: 'https://admireveda.com' }),
  // MyTaskPilot by LinkNotes: the app is named for the product, served from linknotes.com.
  linknotes: Object.freeze({ id: 'linknotes', name: 'MyTaskPilot', server: 'https://linknotes.com' }),
})

function pickBrand({ env = process.env, pkg = safePkg() } = {}) {
  const id = String(env.WORK_BRAND || (pkg && pkg.brand) || 'workcopilot').toLowerCase()
  return BRANDS[id] || BRANDS.workcopilot
}
function safePkg() {
  try { return require('./package.json') } catch { return null }
}

module.exports = { BRANDS, pickBrand, BRAND: pickBrand() }
