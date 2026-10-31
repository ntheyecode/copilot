// The individuals site's search-engine identity: ONE source for each page's
// path, title, description and crawler text (Supreme Rule II).
//
//   * The pages call useSeo(indivSeo(t, '<page>')), so the live <title> and
//     description come from the `indiv` i18n namespace through this table.
//   * The prerender (scripts/prerender-marketing.mjs, run by build/spa_stamp.js
//     where the edition has `individual_site`) builds the static crawler copy
//     with indivPrerender() from the SAME English catalog, and the shell
//     stamp takes the home page's title from here too. There is no second,
//     hand-written copy to drift (gate: build/indiv_seo.test.mjs).
//
// Pure: no React, no DOM, so Node scripts and tests import it directly.
// `t` is any (key) -> value lookup: the app's useT() in a page, a catalog
// lookup in a script. Keys only, never English literals.

export const INDIV_SEO_PAGES = Object.freeze([
  { page: 'home', path: '/', nav: 'indiv.nav.home' },
  { page: 'how', path: '/workcopilot/how-it-works', nav: 'indiv.nav.how' },
  { page: 'use', path: '/workcopilot/use-cases', nav: 'indiv.nav.use' },
  { page: 'pricing', path: '/workcopilot/pricing', nav: 'indiv.nav.pricing' },
  { page: 'security', path: '/workcopilot/security', nav: 'indiv.nav.security' },
  { page: 'faq', path: '/workcopilot/faq', nav: 'indiv.nav.faq' },
])

const entryOf = (page) => {
  const e = INDIV_SEO_PAGES.find((x) => x.page === page)
  if (!e) throw new Error(`[individuals seo] unknown page "${page}" (one of: ${INDIV_SEO_PAGES.map((x) => x.page).join(', ')})`)
  return e
}

// What a page passes to useSeo().
export function indivSeo(t, page) {
  const e = entryOf(page)
  return { title: t(`indiv.${page}.seo.title`), description: t(`indiv.${page}.seo.description`), path: e.path }
}

// The crawler's main text for each page: the hero heading and lead the page
// shows first, then the page's own list (cards, steps, answers), all read
// from the same keys the page renders.
const list = (v) => (Array.isArray(v) ? v : [])
const td = (x) => `${x.t}. ${x.d}`
const MAIN = {
  home: (t) => ({ lede: [t('indiv.home.hero.p'), t('indiv.home.hours.p')], points: list(t('indiv.home.how.steps')).map(td) }),
  how: (t) => ({ lede: [t('indiv.how.hero.p')], points: list(t('indiv.how.cards')).map(td) }),
  use: (t) => ({ lede: [t('indiv.use.hero.p')], points: list(t('indiv.use.cases')).map((c) => `${c.tag}: ${c.d}`) }),
  pricing: (t) => ({ lede: [t('indiv.pricing.hero.p')], points: [...list(t('indiv.pricing.included')), ...list(t('indiv.pricing.notes')).map(td)] }),
  security: (t) => ({ lede: [t('indiv.security.hero.p')], points: list(t('indiv.security.guarantees')).map(td) }),
  faq: (t) => ({ lede: [t('indiv.faq.hero.p')], points: list(t('indiv.faq.groups')).flatMap((g) => list(g.items).map((i) => `${i.q} ${i.a}`)) }),
}

// Rich-text markers the pages render with t.rich (<em>...</em>) become plain text.
export const plainText = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// Everything the prerender writes for one page.
export function indivPrerender(t, page) {
  const e = entryOf(page)
  const seo = indivSeo(t, page)
  const main = MAIN[page](t)
  return {
    page, path: e.path, label: plainText(t(e.nav)),
    title: plainText(seo.title), description: plainText(seo.description),
    h1: plainText(t(`indiv.${page}.hero.h1`)),
    lede: main.lede.map(plainText).filter(Boolean),
    points: main.points.map(plainText).filter(Boolean),
  }
}

export default { INDIV_SEO_PAGES, indivSeo, indivPrerender, plainText }
