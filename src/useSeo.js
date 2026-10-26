// useSeo - set a distinct <title>, meta description and canonical per route, so
// each page has its own crawlable identity (audit WEB-01). The static index.html
// carries the base/homepage SEO + a noscript fallback; this refines it per route
// for users and JS-rendering crawlers. Restores the previous values on unmount.
import { useEffect } from 'react'
import { LOCALES } from './i18n/locales.js'   // single source for hreflang tags + ?lang codes

const ORIGIN = 'https://admireveda.com'

function setMeta(name, content) {
  if (!content) return null
  let el = document.querySelector(`meta[name="${name}"]`)
  const created = !el
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
  const prev = el.getAttribute('content')
  el.setAttribute('content', content)
  return { el, prev, created }
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]')
  const created = !el
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el) }
  const prev = el.getAttribute('href')
  el.setAttribute('href', href)
  return { el, prev, created }
}

// hreflang alternates (international SEO): one <link rel="alternate"> per locale
// pointing at this same clean path with ?lang=<code>, plus an x-default that
// points at the clean path (no param). Because language is client-side and ?lang
// is the top-priority signal (see i18n detectLocale), each alternate URL renders
// that language for a crawler that runs our JS. We OWN these tags: on mount we
// clear any existing hreflang alternates (including ones a prerender step baked
// into the static <head>) so a route never carries another route's or a stale
// duplicate set, then add this route's. They are removed again on unmount / when
// the path changes. hreflang uses the locale's BCP-47 `tag`; the URL uses its
// stable `code`. Canonical stays the clean ORIGIN+path (handled below).
function setAlternates(path) {
  const head = document.head
  // Remove any pre-existing alternates (prerendered or from a prior route).
  head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove())
  const made = []
  const add = (hreflang, href) => {
    const el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', hreflang)
    el.setAttribute('href', href)
    el.setAttribute('data-seo-alt', '1')
    head.appendChild(el)
    made.push(el)
  }
  for (const l of LOCALES) add(l.tag, `${ORIGIN}${path}?lang=${encodeURIComponent(l.code)}`)
  add('x-default', ORIGIN + path)
  return made
}

// Inject a JSON-LD <script> safely via textContent (no HTML parsing, so no
// injection sink). For FIRST-PARTY structured data only (e.g. a FAQPage built
// from our own content). Removes it on unmount.
export function useJsonLd(json) {
  useEffect(() => {
    if (!json) return undefined
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.textContent = typeof json === 'string' ? json : JSON.stringify(json)
    document.head.appendChild(el)
    return () => { try { el.remove() } catch { /* noop */ } }
  }, [json])
}

/**
 * @param {{title?:string, description?:string, path?:string}} opts
 *   path is the route path (e.g. "/workcopilot/pricing"); canonical is ORIGIN+path.
 */
export default function useSeo({ title, description, path } = {}) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title
    const d = setMeta('description', description)
    const c = (path != null) ? setCanonical(ORIGIN + path) : null
    const alts = (path != null) ? setAlternates(path) : null
    return () => {
      document.title = prevTitle
      if (d) { if (d.created) d.el.remove(); else if (d.prev != null) d.el.setAttribute('content', d.prev) }
      if (c) { if (c.created) c.el.remove(); else if (c.prev != null) c.el.setAttribute('href', c.prev) }
      if (alts) alts.forEach((el) => { try { el.remove() } catch { /* noop */ } })
    }
  }, [title, description, path])
}
