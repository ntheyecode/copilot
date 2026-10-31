// Which public surfaces an edition shows, answered once from the edition view
// (src/edition/useCaps.js editionView: companies / individualPlans /
// soloSignup / audience). Pure, no React. Every marketing link list and
// primary call to action reads this module instead of testing capabilities
// inline, so "the companies-only site never offers a personal sign-up" and
// "the individuals-only site never links to company features" each live here
// once. Unit-tested in src/shared/edition_surfaces.test.mjs.

// What a link or section needs to be shown.
//   'companies'       company features exist (company console, SSO, teams)
//   'individualPlans' personal Lite to Premium plans are sold
//   'soloSignup'      a person can create their own account
//   'individualSite'  the public site is the individuals site (src/sites/individuals/)
export function shows(view, needs) {
  if (!needs) return true
  if (!view) return true
  if (needs === 'companies') return !!view.companies
  if (needs === 'individualPlans') return !!view.individualPlans
  if (needs === 'soloSignup') return !!view.soloSignup
  if (needs === 'individualSite') return !!view.individualSite
  throw new Error(`[editions] unknown surface requirement "${needs}"`)
}

export function visibleLinks(view, links) {
  return links.filter((l) => shows(view, l.needs))
}

// The primary "get started" destination. Where a person can sign up it is the
// product's own sign-in / create page (today's behavior); where only
// organizations are served, it is the sales conversation, which exists only
// where our public site is served (a customer's own install signs in).
export const CONTACT_PATH = '/workcopilot/contact'
export function startPath(view) {
  if (!view || view.soloSignup) return '/workcopilot'
  return view.publicSite === false ? '/workcopilot' : CONTACT_PATH
}
