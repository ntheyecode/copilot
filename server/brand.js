// The product brands, one registry (pure data + pure functions, shared with the
// SPA the way server/edition_registry.js is).
//
// Owner decision (2026-10-31): the individuals edition is a SEPARATE product,
// LinkNotes (linknotes.com), with its own user pool and no AdmireVeda branding;
// the corporate editions stay WorkCoPilot by AdmireVeda. The base catalog is
// written in the corporate brand, so for LinkNotes every visible string passes
// through rebrandCatalog once (src/i18n/overlay.js, after the audience overlay)
// and the server's own text (emails, AI prompts) through rebrandText. One pass,
// one place: no hand-kept second copy of ~400 strings in 16 languages.
//
// Legal pages keep their text exactly as written (owner decision): their
// namespaces are never rebranded.

export const BRANDS = Object.freeze({
  admireveda: Object.freeze({ id: 'admireveda', product: 'WorkCoPilot', company: 'AdmireVeda', domain: 'admireveda.com', site: 'https://admireveda.com', supportEmail: 'support@admireveda.com' }),
  // "MyTaskPilot by LinkNotes" (owner, 2026-10-31): LinkNotes is the brand,
  // company and site; MyTaskPilot is the product, as WorkCoPilot is AdmireVeda's.
  linknotes: Object.freeze({ id: 'linknotes', product: 'MyTaskPilot', company: 'LinkNotes', domain: 'linknotes.com', site: 'https://linknotes.com', supportEmail: 'support@linknotes.com' }),
})
export const BASE_BRAND = BRANDS.admireveda

// The copy audience (copyAudience in edition_registry.js) decides the brand.
export function brandForAudience(audience) {
  return audience === 'individuals' ? BRANDS.linknotes : BRANDS.admireveda
}

// Legal text is never rebranded (it names the legal entity on purpose).
export const UNBRANDED_NAMESPACES = Object.freeze(['termsPage', 'privacyPage', 'refundPage', 'cookiePolicyPage', 'dpaPage', 'disclaimerPage', 'acceptableUsePage', 'subprocessorsPage', 'accessibilityPage'])
// Keys whose whole value says who makes the product ("WorkCoPilot, a product of
// AdmireVeda."). A brand with no parent company drops them, and drops the same
// sentence wherever another string repeats it, in that language's own words.
export const OWNERSHIP_KEYS = Object.freeze(['footer.ownership', 'indiv.footer.made', 'faqPage.groups.what.items.0.d'])
// Keys holding the localized byline ("by AdmireVeda", "von AdmireVeda", ...).
// "<base product> <byline>" collapses to the product name in every language.
export const BYLINE_KEYS = Object.freeze(['login.byAdmireVeda', 'onboarding.byAdmireVeda', 'setPasswordPage.byBrand'])

const sameName = (brand) => brand.company === brand.product
const get = (o, p) => p.split('.').reduce((v, k) => (v == null ? v : v[k]), o)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The phrases one language uses for ownership and byline, read from its own
// catalog so the rename follows that language's wording, not English.
export function brandPhrases(dict) {
  const pick = (keys) => [...new Set(keys.map((k) => get(dict, k)).filter((v) => typeof v === 'string' && v.trim()))]
  return { ownership: pick(OWNERSHIP_KEYS), bylines: pick(BYLINE_KEYS) }
}

// A short UI string in the brand: the rename, then tidy what a dropped
// ownership sentence leaves behind (double spaces, a space before punctuation).
export function rebrandText(text, brand, phrases = { ownership: [], bylines: [] }) {
  const s = renameBrand(text, brand, phrases)
  return s === text ? text : s.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim()
}

// The rename alone, no whitespace touched: safe on whole documents (an email's
// HTML and text, the page shell), where spacing and inline code must survive.
export function renameBrand(text, brand, phrases = { ownership: [], bylines: [] }) {
  if (typeof text !== 'string' || !brand || brand.id === BASE_BRAND.id) return text
  const b = BASE_BRAND
  let s = text
  // Only a brand whose company IS the product drops the ownership line and
  // collapses "<product> by <company>" (it would read "X by X"). A brand with
  // its own product name (MyTaskPilot by LinkNotes) keeps both, renamed below.
  if (sameName(brand)) {
    for (const sentence of phrases.ownership) s = s.split(sentence).join('')
    for (const by of phrases.bylines) s = s.replace(new RegExp(`${esc(b.product)}\\s+${esc(by)}`, 'g'), brand.product)
    s = s.split(`${b.product} by ${b.company}`).join(brand.product)
      .split(`${b.company} ${b.product}`).join(brand.product)
  }
  s = s.split(b.supportEmail).join(brand.supportEmail)
    .split(b.domain).join(brand.domain)
    .split(b.product).join(brand.product)
    .split(b.company).join(brand.company)
  // A brand whose company IS the product: "<product> <connector> <product>" in
  // any word order ("LinkNotes का LinkNotes", "LinkNotes의 LinkNotes",
  // "LinkNotes 旗下 LinkNotes") folds into the product name. The connector is a
  // short word with no sentence punctuation, so two real mentions in one
  // sentence ("LinkNotes plans, then LinkNotes checks") are left alone.
  if (sameName(brand)) {
    const p = esc(brand.product)
    s = s.replace(new RegExp(`${p}\\s*[^\\s.!?,;:。！？，、]{1,6}\\s*${p}`, 'gu'), brand.product)
  }
  return s
}

// Where a brand's icon set lives (public/brand/<id>/), replacing the base set
// in a page's <head>.
const BRAND_ICONS = Object.freeze({
  linknotes: [['href="/favicon.svg"', 'href="/brand/linknotes/favicon.svg"'], ['href="/favicon-32.png"', 'href="/brand/linknotes/favicon-32.png"'], ['href="/favicon-192.png"', 'href="/brand/linknotes/favicon-192.png"'], ['href="/apple-touch-icon.png"', 'href="/brand/linknotes/apple-touch-icon.png"']],
})
export const brandIconFiles = (brand) => (BRAND_ICONS[brand && brand.id] || []).map(([, to]) => to.slice('href="/'.length, -1))

// A whole HTML document (the page shell, a prerendered page) in the brand:
// the rename (whitespace untouched) plus the brand's icon set.
export function brandDocument(html, brand) {
  if (typeof html !== 'string' || !brand || brand.id === BASE_BRAND.id) return html
  let h = renameBrand(html, brand)
  for (const [from, to] of BRAND_ICONS[brand.id] || []) h = h.split(from).join(to)
  return h
}

// A whole catalog in another brand (a new object; the input is not changed).
export function rebrandCatalog(dict, brand) {
  if (!dict || !brand || brand.id === BASE_BRAND.id) return dict
  const phrases = brandPhrases(dict)
  const drop = new Set(sameName(brand) ? [...OWNERSHIP_KEYS, ...BYLINE_KEYS] : [])
  const walk = (v, path) => {
    if (typeof v === 'string') return drop.has(path) ? '' : rebrandText(v, brand, phrases)
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}.${i}`))
    if (v && typeof v === 'object') {
      const out = {}
      for (const k of Object.keys(v)) out[k] = (!path && UNBRANDED_NAMESPACES.includes(k)) ? v[k] : walk(v[k], path ? `${path}.${k}` : k)
      return out
    }
    return v
  }
  return walk(dict, '')
}
