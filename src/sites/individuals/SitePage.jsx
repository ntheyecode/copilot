// The ONE switch between the organization marketing pages and the LinkNotes
// site (the individuals site), decided by a capability
// (src/edition/surfaces.js `individualSite`), never by an edition name.
// App.jsx renders each public route through this:
//
//   <SitePage page="pricing" fallback={<WorkPricing />} />
//
// With the capability off (the organization editions, or a build that has not
// learned its capabilities yet) the fallback renders exactly as before, so
// those editions do not change. With it on, the LinkNotes page renders at the
// same path. The LinkNotes pages are code-split: a visitor to the organization
// site never downloads them.
import { lazy, Suspense } from 'react'
import { useEditionView } from '../../edition/useCaps.js'
import { shows } from '../../edition/surfaces.js'

const PAGES = {
  home: lazy(() => import('./pages/Home.jsx')),
  how: lazy(() => import('./pages/HowItWorks.jsx')),
  pricing: lazy(() => import('./pages/Pricing.jsx')),
  use: lazy(() => import('./pages/UseCases.jsx')),
  faq: lazy(() => import('./pages/Faq.jsx')),
  security: lazy(() => import('./pages/Security.jsx')),
}
export const SITE_PAGES = Object.freeze(Object.keys(PAGES))

export default function SitePage({ page, fallback }) {
  const ed = useEditionView()
  const Page = PAGES[page]
  if (!Page) throw new Error(`[individuals site] unknown page "${page}" (one of: ${SITE_PAGES.join(', ')})`)
  if (!shows(ed, 'individualSite')) return fallback
  // The shell paints the site's white paper while the chunk loads, so there is
  // no color flash and no layout jump before the page lands.
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#ffffff' }} />}><Page /></Suspense>
}
