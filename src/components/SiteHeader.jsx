// WorkCoPilot - shared marketing site header.
// The homepage nav (WorkMarketing .wm-nav) reproduced as a standalone component so
// every inner marketing page carries the same top navigation. Full routes only
// (these render on many pages, so same-page #anchors would be dead links).
//
// Self-contained: scoped class prefix `wsh-`, its own palette variables (the inner
// pages each define different --ink / --line tokens, so this never reads them),
// no router dependency (plain anchors), no extra packages.
//
// props:
//   current  optional key of the page to mark: 'how' | 'use' | 'fields' |
//            'security' | 'pricing' | 'faq'. When omitted it is derived from the
//            URL, so pages do not have to pass it. Pages that are not in the nav
//            (privacy, terms, ...) simply mark nothing.
//
// Folding: the links fold into a disclosure menu (button with aria-expanded +
// aria-controls, closes on Escape, link tap or outside tap) whenever the full
// row would not fit the bar.
//
// FIT RULE (owner, 2026-10-26, "text overlaps boxes ... sitewide"): the bar
// holds the brand lockup, seven links and three controls. Measured at 1280px
// the old spacing needed ~1214px inside a 1112px bar, so "Get started" was
// clipped on every page. Now: tighter link spacing, the language picker as
// globe + code (its full name stays in the aria-label). Nothing in the bar may
// wrap or clip at any width; the links are the only part that folds.
//
// MEASURED FOLD (QA H3, 2026-10-27): a fixed 1180px fold point only fit the
// ENGLISH labels. German ("So funktioniert es", "Anwendungsfälle", "Loslegen")
// needed ~1190px inside the 1112px bar at 1280 wide, so the orange CTA was
// clipped off the right edge on every page. The fold is now decided by
// MEASUREMENT, not by a breakpoint: the bar lays out the full row, and when
// that row overflows the bar it folds to the hamburger; it unfolds again when
// the bar is wide enough for the row it last measured. That holds for any
// locale, any font, and any future label, which is what kills the class of
// "the nav clips in language X" bugs. Measurement runs in a layout effect (so
// there is no unfolded flash before paint) and re-runs on resize and whenever
// the labels change (locale switch).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import AdmireVedaLogo from './AdmireVedaLogo.jsx'
import LanguageMenu from './LanguageMenu.jsx'   // globe + language picker (16 locales), lives in the header on every public page
import { useT, useLocale } from '../i18n/index.jsx'
import { useEditionView } from '../edition/useCaps.js'
import { visibleLinks, startPath, shows } from '../edition/surfaces.js'   // which links an edition shows (capability-driven)
import IndivHeader from '../sites/individuals/IndivHeader.jsx'   // the individuals site's header, where that site is served

// Labels come from the locale catalog (nav.<key>) so the menu reads in the
// visitor's language; the hrefs are never translated. `needs` names what a
// link requires (src/edition/surfaces.js); a link without it shows everywhere.
export const SITE_LINKS = [
  { key: 'how', href: '/workcopilot/how-it-works' },
  { key: 'use', href: '/workcopilot/use-cases' },
  { key: 'fields', href: '/workcopilot/fields' },
  { key: 'security', href: '/workcopilot/security' },
  { key: 'enterprise', href: '/workcopilot/enterprise', needs: 'companies' },
  { key: 'pricing', href: '/workcopilot/pricing' },
  { key: 'faq', href: '/workcopilot/faq' },
]

// Brand fonts are self-hosted and loaded globally in src/main.jsx; no runtime
// Google Fonts link is injected here.

function currentFromPath() {
  if (typeof window === 'undefined') return null
  const p = window.location.pathname.replace(/\/+$/, '')
  const hit = SITE_LINKS.find((l) => l.href === p)
  return hit ? hit.key : null
}

export default function SiteHeader({ current }) {
  const ed = useEditionView()
  // Where the public site is the individuals site, EVERY public page (legal
  // pages, sign-in, contact, demo) carries that site's header, so the chrome
  // never switches between two sites mid-visit.
  if (shows(ed, 'individualSite') && ed.individualSite) return <IndivHeader />
  return <OrgHeader current={current} ed={ed} />
}

function OrgHeader({ current, ed }) {
  const t = useT()
  const { locale } = useLocale()
  const links = visibleLinks(ed, SITE_LINKS)
  const start = startPath(ed)
  const [open, setOpen] = useState(false)
  const [folded, setFolded] = useState(false)
  const rootRef = useRef(null)
  const innerRef = useRef(null)
  const needRef = useRef(0)        // width the full (unfolded) row last needed
  const active = current || currentFromPath()

  // Measure before paint. Unfolded: fold if the row overflows the bar (and
  // remember how much it needed). Folded: unfold once the bar is at least as
  // wide as that remembered need. A locale change resets the memory and lays
  // the full row out once more, so a shorter language can unfold again.
  useLayoutEffect(() => { needRef.current = 0; setFolded(false) }, [locale])
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return undefined
    const SLACK = 8
    const check = () => {
      const avail = el.clientWidth
      if (!avail) return
      if (!folded) {
        const need = el.scrollWidth
        if (need > avail + 1) { needRef.current = need; setFolded(true) }
      } else if (needRef.current && avail >= needRef.current + SLACK) {
        setFolded(false)
      }
    }
    check()
    // A late web-font swap widens the links without changing the bar's own box,
    // so the links row is observed too, and the check re-runs once fonts land.
    let alive = true
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) check() }) } catch { /* ignore */ }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', check)
      return () => { alive = false; window.removeEventListener('resize', check) }
    }
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const links = el.querySelector('.wsh-links')
    if (links) ro.observe(links)
    return () => { alive = false; ro.disconnect() }
  }, [folded, locale])
  useEffect(() => { if (!folded) setOpen(false) }, [folded])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <header className={'wsh' + (folded ? ' wsh-folded' : '')} ref={rootRef}>
      <style>{CSS}</style>
      <div className="wsh-in" ref={innerRef}>
        <a className="wsh-brand" href="/" aria-label={t('nav.home')}><AdmireVedaLogo size={26} idSuffix="sh" /></a>

        <nav className={'wsh-links' + (open ? ' open' : '')} id="wsh-menu" aria-label={t('nav.main')}>
          {links.map((l) => (
            <a key={l.key} href={l.href} className={active === l.key ? 'on' : undefined} aria-current={active === l.key ? 'page' : undefined} onClick={() => setOpen(false)}>{t('nav.' + l.key)}</a>
          ))}
          {/* Sign in lives in the menu on phones (hidden on desktop, where it sits on the right). */}
          <a className="wsh-m-only" href="/workcopilot" onClick={() => setOpen(false)}>{t('common.signIn')}</a>
          <a className="wsh-m-only wsh-m-cta" href={start} onClick={() => setOpen(false)}>{t('common.getStarted')} <ArrowRight size={15} aria-hidden="true" className="wsh-arrow" /></a>
        </nav>

        <div className="wsh-cta">
          {/* Language picker: the visitor's own-language names, switches live. */}
          <LanguageMenu compact />
          <a className="wsh-ghost" href="/workcopilot">{t('common.signIn')}</a>
          <a className="wsh-btn" href={start}>{t('common.getStarted')} <ArrowRight size={15} aria-hidden="true" className="wsh-arrow" /></a>
          <button type="button" className="wsh-burger" aria-expanded={open} aria-controls="wsh-menu" aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

const CSS = `
.wsh{--sh-tx:#161a2b;--sh-mut:#5c6484;--sh-line:#e6e8f1;--sh-em:#0e9f6e;--sh-em-txt:#0b8259;--sh-warm:#ff9a4d;--sh-warm2:#f26a43;--sh-bg:rgba(255,255,255,.86);--sh-panel:#ffffff;
  width:100%;background:var(--sh-bg);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
  border-bottom:1px solid var(--sh-line);box-shadow:0 1px 0 rgba(17,23,38,.05),0 12px 34px -26px rgba(17,23,38,.35);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-align:start}
/* RTL (Arabic): the bar uses logical margins (inline-start/end) so the link row
   and CTAs mirror on their own; arrows point the reading direction. */
[dir="rtl"] .wsh-arrow{transform:scaleX(-1)}
/* ALWAYS LIGHT (owner, 2026-10-24: "revert back to old that bar, it was good";
   "our site doesn't use darker versions by default"). The public site reads
   light on every page, homepage included; the ONLY dark element is SiteFooter.
   No data-theme / .wm override here on purpose, so the bar + logo never flip. */
/* Doubled selector on purpose: the homepage's generic ".wm header{position:relative;
   z-index:2}" out-specifies a single ".wsh", which left the bar un-sticky there and
   let the hero paint OVER the open language menu. (0,2,0) beats (0,1,1). */
.wsh.wsh{position:sticky;top:0;z-index:50}
.wsh *{box-sizing:border-box}
.wsh a{color:inherit;text-decoration:none}
.wsh-in{display:flex;align-items:center;gap:16px;height:70px;max-width:1160px;margin:0 auto;padding:0 24px}
.wsh-brand{display:inline-flex;align-items:center;flex:0 0 auto;border-radius:8px}
.wsh-links{display:flex;gap:2px;margin-inline-start:auto;font-size:14.5px;color:var(--sh-mut)}
.wsh-links a{position:relative;padding:8px 9px;border-radius:9px;font-weight:500;white-space:nowrap;transition:color .15s,background .15s}
.wsh-links a:hover{color:var(--sh-tx);background:rgba(17,23,38,.05)}
.wsh-links a.on{color:var(--sh-em-txt);font-weight:700}
.wsh-links a.on::after{content:"";position:absolute;left:9px;right:9px;bottom:2px;height:2px;border-radius:2px;background:linear-gradient(90deg,#10a271,#0a93c4)}
.wsh-m-only{display:none}
.wsh-cta{display:flex;gap:8px;align-items:center;margin-inline-start:8px;flex:0 0 auto}
/* Language picker in the bar: globe + language code at every width (the full
   language name is ~140px and is what pushed "Get started" off the bar). The
   picker's own compact rule only kicks in under 880px; the header needs it
   always, so it is applied here, scoped to the bar. The full name remains in
   the button's aria-label and in the open list. */
.wsh-cta .lm-compact .lm-name{display:none}
.wsh-cta .lm-compact .lm-short{display:inline}
.wsh-cta .lm-compact .lm-btn{padding:0 9px}
.wsh-ghost{background:#fff;border:1px solid var(--sh-line);color:var(--sh-tx);border-radius:11px;padding:9px 15px;font-size:14px;font-weight:500;line-height:1.3;transition:border-color .15s}
.wsh-ghost:hover{border-color:rgba(17,23,38,.28)}
.wsh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--sh-warm),var(--sh-warm2));color:#1a0e08!important;border-radius:11px;padding:9px 15px;font-size:14px;font-weight:700;line-height:1.3;white-space:nowrap;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s,box-shadow .15s}
.wsh-btn:hover{transform:translateY(-2px);box-shadow:0 18px 44px -14px rgba(255,122,89,.75)}
.wsh-burger{display:none;align-items:center;justify-content:center;width:40px;height:40px;padding:0;background:#fff;border:1px solid var(--sh-line);border-radius:11px;color:var(--sh-tx);cursor:pointer}
.wsh a:focus-visible,.wsh button:focus-visible{outline:2px solid var(--sh-em);outline-offset:2px}

/* Folded menu (.wsh-folded, set by MEASUREMENT, see the header note): the full
   link row did not fit beside the brand and the controls, so the links fold
   into a disclosure panel under the bar. */
.wsh-folded .wsh-burger{display:inline-flex}
.wsh-folded .wsh-cta{margin-inline-start:auto}
.wsh-folded .wsh-links{display:none;position:absolute;left:0;right:0;top:100%;margin:0;flex-direction:column;gap:2px;padding:10px 16px 16px;background:#fff;border-bottom:1px solid var(--sh-line);box-shadow:0 22px 40px -24px rgba(17,23,38,.35);font-size:16px}
.wsh-folded .wsh-links.open{display:flex}
.wsh-folded .wsh-links a{padding:13px 12px;border-radius:10px}
.wsh-folded .wsh-links a.on::after{inset-inline-start:12px;inset-inline-end:auto;left:auto;right:auto;width:22px;bottom:7px}
.wsh-folded .wsh-links .wsh-m-only{display:block;border-top:1px solid var(--sh-line);margin-top:6px;border-radius:0;padding-top:15px}
.wsh-folded .wsh-links .wsh-m-cta{display:none}
/* Phone and small tablet: a shorter bar, and Sign in moves into the menu. */
@media(max-width:880px){
  .wsh-in{gap:10px;padding:0 16px;height:62px}
  .wsh-ghost{display:none}
  .wsh-btn{padding:9px 13px;font-size:13.5px}
}
/* Phone: the brand lockup + CTA + menu button would exceed 360px, so the CTA moves into the menu. */
@media(max-width:520px){
  .wsh-cta .wsh-btn{display:none}
  .wsh-links .wsh-m-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;border-top:0;border-radius:11px;padding:13px 12px;background:linear-gradient(135deg,var(--sh-warm),var(--sh-warm2));color:#1a0e08;font-weight:700}
}
`
