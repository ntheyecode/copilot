// The individuals site header: brand lockup, six links, the language picker,
// Sign in and the one coral call to action. Rendered by SiteHeader on every
// public page when the edition has `individual_site`, so legal pages and the
// sign-in page carry the same chrome as the site.
//
// FOLD BY MEASUREMENT (the lesson from SiteHeader, QA H3 2026-10-27): the bar
// lays the full row out and folds the links into a disclosure menu only when
// the row overflows the bar; it unfolds when the bar is wide enough again. That
// holds for any locale and any label length, so no language can clip the CTA.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import AdmireVedaLogo from '../../components/AdmireVedaLogo.jsx'
import LanguageMenu from '../../components/LanguageMenu.jsx'
import { useT, useLocale } from '../../i18n/index.jsx'
import { useDark } from './useDark.js'   // the lockup's inline ink must follow the site theme

export const INDIV_LINKS = [
  { key: 'how', href: '/workcopilot/how-it-works' },
  { key: 'use', href: '/workcopilot/use-cases' },
  { key: 'pricing', href: '/workcopilot/pricing' },
  { key: 'security', href: '/workcopilot/security' },
  { key: 'faq', href: '/workcopilot/faq' },
]
export const SIGN_IN = '/workcopilot'
export const START = '/workcopilot/pricing'

function currentFromPath() {
  if (typeof window === 'undefined') return null
  const p = window.location.pathname.replace(/\/+$/, '')
  const hit = INDIV_LINKS.find((l) => l.href === p)
  return hit ? hit.key : null
}

export default function IndivHeader({ current }) {
  const t = useT()
  const { locale } = useLocale()
  const dark = useDark()
  const [open, setOpen] = useState(false)
  const [folded, setFolded] = useState(false)
  const rootRef = useRef(null)
  const innerRef = useRef(null)
  const needRef = useRef(0)
  const active = current || currentFromPath()

  useLayoutEffect(() => { needRef.current = 0; setFolded(false) }, [locale])
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return undefined
    const check = () => {
      const avail = el.clientWidth
      if (!avail) return
      if (!folded) {
        const need = el.scrollWidth
        if (need > avail + 1) { needRef.current = need; setFolded(true) }
      } else if (needRef.current && avail >= needRef.current + 8) setFolded(false)
    }
    check()
    let alive = true
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) check() }) } catch { /* ignore */ }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', check)
      return () => { alive = false; window.removeEventListener('resize', check) }
    }
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const links = el.querySelector('.ivh-links')
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
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [open])

  return (
    <header className={'ivh' + (folded ? ' folded' : '')} ref={rootRef}>
      <style>{CSS}</style>
      <div className="ivh-in" ref={innerRef}>
        <a className="ivh-brand" href="/" aria-label={t('indiv.nav.home')}><AdmireVedaLogo size={26} idSuffix="ivh" onDark={dark} /></a>
        <nav className={'ivh-links' + (open ? ' open' : '')} id="ivh-menu" aria-label={t('indiv.nav.main')}>
          {INDIV_LINKS.map((l) => (
            <a key={l.key} href={l.href} className={active === l.key ? 'on' : undefined} aria-current={active === l.key ? 'page' : undefined} onClick={() => setOpen(false)}>{t('indiv.nav.' + l.key)}</a>
          ))}
          <a className="ivh-m" href={SIGN_IN} onClick={() => setOpen(false)}>{t('indiv.nav.signIn')}</a>
          <a className="ivh-m ivh-m-cta" href={START} onClick={() => setOpen(false)}>{t('indiv.nav.start')} <ArrowRight size={15} aria-hidden="true" className="iv-arrow" /></a>
        </nav>
        <div className="ivh-cta">
          <LanguageMenu compact />
          <a className="ivh-ghost" href={SIGN_IN}>{t('indiv.nav.signIn')}</a>
          <a className="ivh-btn" href={START}>{t('indiv.nav.start')} <ArrowRight size={15} aria-hidden="true" className="iv-arrow" /></a>
          <button type="button" className="ivh-burger" aria-expanded={open} aria-controls="ivh-menu" aria-label={open ? t('indiv.nav.closeMenu') : t('indiv.nav.openMenu')} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

const CSS = `
.ivh{position:sticky;top:0;z-index:50;width:100%;background:color-mix(in srgb,var(--iv-paper) 86%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--iv-line);font-family:var(--iv-body);text-align:start}
.ivh *{box-sizing:border-box}
.ivh a{color:inherit;text-decoration:none}
.ivh-in{display:flex;align-items:center;gap:14px;height:70px;max-width:1160px;margin:0 auto;padding:0 24px}
.ivh-brand{display:inline-flex;align-items:center;flex:0 0 auto;border-radius:8px}
.ivh-links{display:flex;gap:2px;margin-inline-start:auto;font-size:14.5px;color:var(--iv-ink-2)}
.ivh-links a{position:relative;padding:8px 10px;border-radius:10px;font-weight:600;white-space:nowrap;transition:color .15s,background .15s}
.ivh-links a:hover{color:var(--iv-ink);background:var(--iv-paper-3)}
.ivh-links a.on{color:var(--iv-mint-ink)}
.ivh-links a.on::after{content:"";position:absolute;inset-inline:10px;bottom:3px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--iv-mint),var(--iv-sky))}
.ivh-m{display:none}
.ivh-cta{display:flex;gap:8px;align-items:center;margin-inline-start:8px;flex:0 0 auto}
.ivh-cta .lm-compact .lm-name{display:none}
.ivh-cta .lm-compact .lm-short{display:inline}
.ivh-cta .lm-compact .lm-btn{padding:0 9px}
.ivh-ghost{background:var(--iv-paper-2);border:1px solid var(--iv-line-2);color:var(--iv-ink);border-radius:12px;padding:9px 15px;font-size:14px;font-weight:600;line-height:1.3;white-space:nowrap}
.ivh-ghost:hover{border-color:var(--iv-ink-3)}
.ivh-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--iv-coral),var(--iv-coral-2));color:var(--iv-coral-ink)!important;border-radius:12px;padding:9px 15px;font-size:14px;font-weight:800;line-height:1.3;white-space:nowrap;box-shadow:0 12px 30px -12px rgba(242,106,67,.6);transition:transform .15s}
.ivh-btn:hover{transform:translateY(-2px)}
.ivh-burger{display:none;align-items:center;justify-content:center;width:40px;height:40px;padding:0;background:var(--iv-paper-2);border:1px solid var(--iv-line-2);border-radius:12px;color:var(--iv-ink);cursor:pointer}
.ivh a:focus-visible,.ivh button:focus-visible{outline:3px solid var(--iv-sky);outline-offset:2px}
.ivh.folded .ivh-burger{display:inline-flex}
.ivh.folded .ivh-cta{margin-inline-start:auto}
.ivh.folded .ivh-links{display:none;position:absolute;left:0;right:0;top:100%;margin:0;flex-direction:column;gap:2px;padding:10px 16px 16px;background:var(--iv-paper-2);border-bottom:1px solid var(--iv-line);box-shadow:0 22px 40px -24px rgba(17,23,38,.35);font-size:16px}
.ivh.folded .ivh-links.open{display:flex}
.ivh.folded .ivh-links a{padding:13px 12px;border-radius:10px}
.ivh.folded .ivh-links a.on::after{inset-inline-start:12px;inset-inline-end:auto;width:22px;bottom:7px}
.ivh.folded .ivh-links .ivh-m{display:block;border-top:1px solid var(--iv-line);margin-top:6px;border-radius:0;padding-top:15px}
.ivh.folded .ivh-links .ivh-m-cta{display:none}
@media (max-width:880px){.ivh-in{gap:10px;padding:0 16px;height:62px}.ivh-ghost{display:none}.ivh-btn{padding:9px 13px;font-size:13.5px}}
@media (max-width:520px){
  .ivh-cta .ivh-btn{display:none}
  .ivh.folded .ivh-links .ivh-m-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;border-top:0;border-radius:12px;padding:13px 12px;background:linear-gradient(135deg,var(--iv-coral),var(--iv-coral-2));color:var(--iv-coral-ink);font-weight:800}
}
`
