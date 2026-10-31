// The LinkNotes site header: brand lockup, five links, the language picker,
// Sign in and the one violet call to action. Rendered by SiteHeader on every
// public page when the edition has `individual_site`, so legal pages and the
// sign-in page carry the same chrome as the site.
//
// FOLD BY MEASUREMENT (the lesson from SiteHeader, QA H3 2026-10-27): the bar
// lays the full row out and folds the links into a disclosure menu only when
// the row overflows the bar; it unfolds when the bar is wide enough again. That
// holds for any locale and any label length, so no language can clip the CTA.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import LinkNotesLogo from '../../components/brand/LinkNotesLogo.jsx'
import LanguageMenu from '../../components/LanguageMenu.jsx'
import { useT, useLocale } from '../../i18n/index.jsx'
import { INDIV_LINKS, SIGN_IN, START } from './links.js'

export { INDIV_LINKS, SIGN_IN, START }

function currentFromPath() {
  if (typeof window === 'undefined') return null
  const p = window.location.pathname.replace(/\/+$/, '')
  const hit = INDIV_LINKS.find((l) => l.href === p)
  return hit ? hit.key : null
}

export default function IndivHeader({ current }) {
  const t = useT()
  const { locale } = useLocale()
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
    const links = el.querySelector('.lnh-links')
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
    <header className={'lnh' + (folded ? ' folded' : '')} ref={rootRef}>
      <style>{CSS}</style>
      <div className="lnh-in" ref={innerRef}>
        <a className="lnh-brand" href="/" aria-label={t('indiv.nav.home')}><LinkNotesLogo size={30} idSuffix="lnh" product /></a>
        <nav className={'lnh-links' + (open ? ' open' : '')} id="lnh-menu" aria-label={t('indiv.nav.main')}>
          {INDIV_LINKS.map((l) => (
            <a key={l.key} href={l.href} className={active === l.key ? 'on' : undefined} aria-current={active === l.key ? 'page' : undefined} onClick={() => setOpen(false)}>{t('indiv.nav.' + l.key)}</a>
          ))}
          <a className="lnh-m" href={SIGN_IN} onClick={() => setOpen(false)}>{t('indiv.nav.signIn')}</a>
          <a className="lnh-m lnh-m-cta" href={START} onClick={() => setOpen(false)}>{t('indiv.nav.start')} <ArrowRight size={15} aria-hidden="true" className="ln-arrow" /></a>
        </nav>
        <div className="lnh-cta">
          <LanguageMenu compact />
          <a className="lnh-ghost" href={SIGN_IN}>{t('indiv.nav.signIn')}</a>
          <a className="lnh-btn" href={START}>{t('indiv.nav.start')} <ArrowRight size={15} aria-hidden="true" className="ln-arrow" /></a>
          <button type="button" className="lnh-burger" aria-expanded={open} aria-controls="lnh-menu" aria-label={open ? t('indiv.nav.closeMenu') : t('indiv.nav.openMenu')} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

// The bar floats: a white, rounded, softly shadowed card inset from the top of
// the page, sticky, with the page visible around it. The fold measures the
// inner row (.lnh-in), so the outer inset never affects the decision.
const CSS = `
.lnh{position:sticky;top:0;z-index:50;width:100%;padding:14px 16px 0;background:transparent;font-family:var(--ln-body,"Figtree",system-ui,sans-serif);text-align:start;color:var(--ln-ink,#14122b);pointer-events:none}
.lnh *{box-sizing:border-box}
.lnh a{color:inherit;text-decoration:none}
.lnh-in{position:relative;display:flex;align-items:center;gap:14px;height:72px;max-width:1180px;margin:0 auto;padding:0 12px 0 22px;background:#fff;border-radius:20px;box-shadow:0 2px 28px rgba(20,18,43,.10);pointer-events:auto}
.lnh-brand{display:inline-flex;align-items:center;flex:0 0 auto;border-radius:8px}
.lnh-links{display:flex;gap:2px;margin-inline-start:auto;font-size:15px;color:var(--ln-ink-2,#4b4a66)}
.lnh-links a{position:relative;padding:9px 12px;border-radius:10px;font-weight:500;white-space:nowrap;transition:color .15s,background .15s}
.lnh-links a:hover{color:var(--ln-violet,#5b3df5);background:var(--ln-bg-2,#f7f7fc)}
.lnh-links a.on{color:var(--ln-violet-ink,#4a2fe0);background:var(--ln-violet-soft,#ebe8ff);font-weight:600}
.lnh-m{display:none}
.lnh-cta{display:flex;gap:8px;align-items:center;margin-inline-start:8px;flex:0 0 auto}
.lnh-cta .lm-compact .lm-name{display:none}
.lnh-cta .lm-compact .lm-short{display:inline}
.lnh-cta .lm-compact .lm-btn{padding:0 9px;border-radius:10px}
.lnh-ghost{background:transparent;border:1px solid transparent;color:var(--ln-violet,#5b3df5);border-radius:10px;padding:9px 12px;font-size:15px;font-weight:600;line-height:1.3;white-space:nowrap}
.lnh-ghost:hover{background:var(--ln-violet-soft,#ebe8ff)}
.lnh-btn{display:inline-flex;align-items:center;gap:8px;background:var(--ln-lime,#c9f23a);color:var(--ln-ink,#14122b)!important;border:1px solid var(--ln-lime,#c9f23a);border-radius:12px;padding:11px 18px;font-size:15px;font-weight:700;line-height:1.3;white-space:nowrap;transition:transform .15s,box-shadow .15s}
.lnh-btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px -10px rgba(140,170,20,.7)}
.lnh-burger{display:none;align-items:center;justify-content:center;width:42px;height:42px;padding:0;background:var(--ln-bg-2,#f7f7fc);border:1px solid var(--ln-line,#e9e8f4);border-radius:12px;color:var(--ln-ink,#14122b);cursor:pointer}
.lnh a:focus-visible,.lnh button:focus-visible{outline:3px solid var(--ln-violet,#5b3df5);outline-offset:2px}
.lnh.folded .lnh-burger{display:inline-flex}
.lnh.folded .lnh-cta{margin-inline-start:auto}
.lnh.folded .lnh-links{display:none;position:absolute;left:0;right:0;top:calc(100% + 8px);margin:0;flex-direction:column;gap:2px;padding:10px 12px 14px;background:#fff;border-radius:16px;box-shadow:0 22px 48px -18px rgba(20,18,43,.35);font-size:16px}
.lnh.folded .lnh-links.open{display:flex}
.lnh.folded .lnh-links a{padding:13px 14px;border-radius:12px}
.lnh.folded .lnh-links .lnh-m{display:block;border-top:1px solid var(--ln-line,#e9e8f4);margin-top:6px;border-radius:0;padding-top:15px}
.lnh.folded .lnh-links .lnh-m-cta{display:none}
@media (max-width:520px){.lnh-brand .ln-logo-product{display:none}}
@media (max-width:880px){.lnh{padding:10px 10px 0}.lnh-in{gap:10px;padding:0 10px 0 16px;height:64px;border-radius:16px}.lnh-ghost{display:none}.lnh-btn{padding:10px 14px;font-size:14px}}
@media (max-width:520px){
  .lnh-cta .lnh-btn{display:none}
  .lnh.folded .lnh-links .lnh-m-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;border-top:0;border-radius:12px;padding:13px 12px;background:var(--ln-violet,#5b3df5);color:#fff;font-weight:700}
}
@media (prefers-reduced-motion:reduce){.lnh-btn,.lnh-links a{transition:none}.lnh-btn:hover{transform:none}}
`
