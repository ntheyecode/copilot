// useSeo - set a distinct <title>, meta description and canonical per route, so
// each page has its own crawlable identity (audit WEB-01). The static index.html
// carries the base/homepage SEO + a noscript fallback; this refines it per route
// for users and JS-rendering crawlers. Restores the previous values on unmount.
import { useEffect } from 'react'

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
    return () => {
      document.title = prevTitle
      if (d) { if (d.created) d.el.remove(); else if (d.prev != null) d.el.setAttribute('content', d.prev) }
      if (c) { if (c.created) c.el.remove(); else if (c.prev != null) c.el.setAttribute('href', c.prev) }
    }
  }, [title, description, path])
}
