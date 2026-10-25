// LanguageMenu - the site-wide language selector (globe + current language, a
// listbox of every supported language written in its OWN name). Used in the
// public SiteHeader and on the sign-in page. Switching is immediate (the whole
// tree re-renders through LocaleProvider) and persists in localStorage.
//
// Self-contained: own scoped CSS (prefix `lm-`), brand tokens (green #0e9f6e,
// cyan #0a84c2, orange #f26a43), site fonts (Figtree). Accessible: a real
// <button aria-haspopup="listbox"> + role=listbox/option, arrow-key navigation,
// Home/End, Escape and outside-tap close, aria-selected on the current one.
// Mirrors correctly under <html dir="rtl"> (logical properties only).
//
// props:
//   compact   header variant: on narrow screens only the globe + short code show.
//   align     'end' (default) | 'start' - which edge the popover hangs from.
//   tone      'light' (default) | 'dark' for a dark host surface.
import React, { useEffect, useId, useRef, useState } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useLocale } from '../i18n/index.jsx'

export default function LanguageMenu({ compact = false, align = 'end', tone = 'light', className = '' }) {
  const { locale, setLocale, t, locales, meta } = useLocale()
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(() => Math.max(0, locales.findIndex((l) => l.code === locale)))
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    setHi(Math.max(0, locales.findIndex((l) => l.code === locale)))
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, locale, locales])

  // Keep the highlighted option in view while arrowing.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[hi]
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
  }, [open, hi])

  const choose = (code) => { setLocale(code); setOpen(false) }

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => (i + 1) % locales.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => (i - 1 + locales.length) % locales.length) }
    else if (e.key === 'Home') { e.preventDefault(); setHi(0) }
    else if (e.key === 'End') { e.preventDefault(); setHi(locales.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(locales[hi].code) }
    else if (e.key === 'Tab') setOpen(false)
  }

  const short = meta.code.toUpperCase()
  return (
    <div className={`lm${compact ? ' lm-compact' : ''}${tone === 'dark' ? ' lm-dark' : ''}${className ? ' ' + className : ''}`} ref={rootRef} onKeyDown={onKey}>
      <style>{CSS}</style>
      <button
        type="button" className="lm-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={`lm-list-${id}`}
        aria-label={`${t('lang.label')}: ${meta.name}`} title={t('lang.choose')} onClick={() => setOpen((v) => !v)}
      >
        <Globe size={16} aria-hidden="true" />
        <span className="lm-name">{meta.name}</span>
        <span className="lm-short" aria-hidden="true">{short}</span>
        <ChevronDown size={14} aria-hidden="true" className="lm-chev" />
      </button>
      {open && (
        <div className={`lm-pop lm-${align}`} role="presentation">
          <div className="lm-head">{t('lang.choose')}</div>
          <ul className="lm-list" role="listbox" id={`lm-list-${id}`} aria-label={t('lang.label')} ref={listRef} aria-activedescendant={`lm-opt-${id}-${locales[hi].code}`}>
            {locales.map((l, i) => {
              const on = l.code === locale
              return (
                <li
                  key={l.code} id={`lm-opt-${id}-${l.code}`} role="option" aria-selected={on} lang={l.tag} dir={l.dir}
                  className={`lm-opt${on ? ' on' : ''}${i === hi ? ' hi' : ''}`}
                  onMouseEnter={() => setHi(i)} onClick={() => choose(l.code)}
                >
                  <span className="lm-opt-name">{l.name}</span>
                  <span className="lm-opt-code">{l.code.toUpperCase()}</span>
                  {on && <Check size={15} aria-hidden="true" className="lm-tick" />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

const CSS = `
.lm{--lm-tx:#161a2b;--lm-mut:#5c6484;--lm-line:#e6e8f1;--lm-panel:#ffffff;--lm-em:#0e9f6e;--lm-em-txt:#0b8259;--lm-cyan:#0a84c2;--lm-cta:#f26a43;--lm-hover:rgba(17,23,38,.05);--lm-em-fill:rgba(14,159,110,.09);
  position:relative;display:inline-flex;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-align:start}
.lm.lm-dark{--lm-tx:#eef0f6;--lm-mut:#a3a9bd;--lm-line:rgba(255,255,255,.14);--lm-panel:#151826;--lm-em:#8cf5c4;--lm-em-txt:#8cf5c4;--lm-hover:rgba(255,255,255,.07);--lm-em-fill:rgba(140,245,196,.12)}
.lm *{box-sizing:border-box}
.lm-btn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 11px 0 10px;background:var(--lm-panel);border:1px solid var(--lm-line);border-radius:11px;color:var(--lm-tx);font:inherit;font-size:13.5px;font-weight:600;line-height:1;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s,color .15s}
.lm-btn:hover{border-color:rgba(17,23,38,.28);background:var(--lm-hover)}
.lm.lm-dark .lm-btn:hover{border-color:rgba(255,255,255,.3)}
.lm-btn>svg:first-child{color:var(--lm-em-txt);flex:none}
.lm-chev{color:var(--lm-mut);transition:transform .18s}
.lm-btn[aria-expanded="true"] .lm-chev{transform:rotate(180deg)}
.lm-short{display:none;font-size:11.5px;font-weight:800;letter-spacing:.06em}
.lm-btn:focus-visible{outline:2px solid var(--lm-em);outline-offset:2px}
.lm-pop{position:absolute;top:calc(100% + 8px);inset-inline-end:0;z-index:80;min-width:250px;background:var(--lm-panel);border:1px solid var(--lm-line);border-radius:14px;box-shadow:0 1px 0 rgba(17,23,38,.05),0 24px 56px -24px rgba(17,23,38,.45);padding:8px;animation:lm-in .16s cubic-bezier(.2,.8,.2,1) both;transform-origin:top}
.lm-pop.lm-start{inset-inline-end:auto;inset-inline-start:0}
@keyframes lm-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
.lm-head{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--lm-em-txt);padding:6px 10px 8px;border-bottom:1px solid var(--lm-line);margin-bottom:6px;background:linear-gradient(90deg,var(--lm-em),var(--lm-cyan));-webkit-background-clip:text;background-clip:text;color:transparent}
.lm-list{list-style:none;margin:0;padding:0;max-height:min(62vh,420px);overflow:auto;display:grid;grid-template-columns:1fr 1fr;gap:2px;scrollbar-width:thin}
.lm-opt{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:9px;cursor:pointer;color:var(--lm-tx);font-size:14px;font-weight:500;line-height:1.2;transition:background .12s}
.lm-opt.hi{background:var(--lm-hover)}
.lm-opt.on{background:var(--lm-em-fill);color:var(--lm-em-txt);font-weight:700}
.lm-opt-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lm-opt-code{font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--lm-mut);opacity:.8}
.lm-opt.on .lm-opt-code{color:inherit}
.lm-tick{color:var(--lm-em);flex:none}
@media(max-width:880px){
  .lm-compact .lm-name{display:none}
  .lm-compact .lm-short{display:inline}
  .lm-compact .lm-btn{padding:0 9px}
  .lm-pop{min-width:min(92vw,330px)}
}
@media(max-width:400px){.lm-list{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.lm-pop{animation:none}.lm-chev{transition:none}}
`
