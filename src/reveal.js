// Scroll-reveal, ONE mechanism for the whole site (QA M5, 2026-10-27).
//
// Before this, the home page, the use-cases page and WorkCard each ran their
// own IntersectionObserver with a 12-14% threshold, a 0.6-0.75s fade and (for
// cards) a per-card stagger. On a phone a tall section needed a long scroll
// before 12% of it was on screen, and then faded for most of a second, so the
// visitor scrolled into whole blank screens, and a crawler that never scrolls
// saw opacity:0 content. This module is the single source of truth for the
// timing and the safety rules, so every surface reveals the same way:
//
//   * reveal the moment ANY part of the element enters the viewport
//     (threshold 0, a small bottom margin so the very edge does not count);
//   * the fade itself is short (REVEAL_MS, consumed by the CSS of each surface);
//   * no observer, reduced motion, an automated/crawler browser, or printing:
//     everything is shown at once, nothing is ever left at opacity 0;
//   * belt and braces: shortly after mount, anything already inside the
//     viewport that the observer has not reported is revealed anyway.
//
// revealOnScroll(root, onReveal, opts) observes every `[data-reveal]` under
// `root` and calls onReveal(el) once per element. It returns a cleanup fn.
// The WorkCard hook reuses the same constants and the same "reveal at once"
// decision through shouldRevealAtOnce().

export const REVEAL_MS = 300          // fade duration every surface uses
export const REVEAL_MAX_STAGGER_MS = 160   // cap for any per-item stagger

const IO_OPTS = { threshold: 0, rootMargin: '0px 0px -6% 0px' }

export function shouldRevealAtOnce() {
  if (typeof window === 'undefined') return true
  if (typeof IntersectionObserver === 'undefined') return true
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true } catch { /* ignore */ }
  try {
    const n = navigator
    if (n && (n.webdriver || /bot|crawl|spider|slurp|prerender|headless|lighthouse|pagespeed/i.test(n.userAgent || ''))) return true
  } catch { /* ignore */ }
  return false
}

function inViewport(el) {
  const r = el.getBoundingClientRect()
  const h = window.innerHeight || document.documentElement.clientHeight
  return r.bottom > 0 && r.top < h
}

export function revealOnScroll(root, onReveal, { selector = '[data-reveal]' } = {}) {
  if (!root) return () => {}
  const els = Array.from(root.querySelectorAll(selector))
  if (!els.length) return () => {}
  const seen = new Set()
  const show = (el) => { if (seen.has(el)) return; seen.add(el); onReveal(el) }
  const showAll = () => els.forEach(show)

  if (shouldRevealAtOnce()) { showAll(); return () => {} }

  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target) } })
  }, IO_OPTS)
  els.forEach((el) => io.observe(el))

  // Anything already on screen that the observer has not reported yet.
  const sweep = setTimeout(() => els.forEach((el) => { if (!seen.has(el) && inViewport(el)) { show(el); io.unobserve(el) } }), 600)
  // Print: the whole document must be visible.
  const onPrint = () => showAll()
  window.addEventListener('beforeprint', onPrint)

  return () => { clearTimeout(sweep); window.removeEventListener('beforeprint', onPrint); io.disconnect() }
}
