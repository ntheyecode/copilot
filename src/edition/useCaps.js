// React hook over the live capability set (src/edition/active.js).
//   const caps = useCaps()
//   caps.has('individual_plans')
// plus the shared derived rules, so components never re-derive them:
//   const { companies, audience } = useEditionView()
import { useSyncExternalStore } from 'react'
import { getCaps, subscribeCaps } from './active.js'
import { companyTenancy, copyAudience } from '../shared/edition_caps.js'

export function useCaps() {
  return useSyncExternalStore(subscribeCaps, getCaps, getCaps)
}

// The view questions most surfaces ask, answered once from the capabilities:
//   companies        company features exist here (company console, SSO, teams)
//   individualPlans  personal Lite to Premium plans are sold here
//   soloSignup       a person can create their own account
//   audience         'organizations' | 'individuals' | null (both: base copy)
//   publicSite       our public site (and its sales conversation) is served
//                    here; off on a customer's own on-prem / managed install
//   individualSite   the public site is the individuals site
//                    (src/sites/individuals/) instead of the organization pages
export function editionView(caps) {
  return {
    caps,
    companies: companyTenancy(caps),
    individualPlans: caps.has('individual_plans'),
    soloSignup: caps.has('solo_signup'),
    audience: copyAudience(caps),
    publicSite: caps.has('public_site'),
    individualSite: caps.has('individual_site'),
  }
}

export function useEditionView() {
  return editionView(useCaps())
}
