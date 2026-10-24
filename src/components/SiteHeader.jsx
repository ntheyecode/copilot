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
// Mobile: below 880px the links fold into a disclosure menu (button with
// aria-expanded + aria-controls, closes on Escape, link tap or outside tap).
import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import AdmireVedaLogo from './AdmireVedaLogo.jsx'

export const SITE_LINKS = [
  { key: 'how', label: 'How it works', href: '/workcopilot/how-it-works' },
  { key: 'use', label: 'Use cases', href: '/workcopilot/use-cases' },
  { key: 'fields', label: 'Fields', href: '/workcopilot/fields' },
  { key: 'security', label: 'Security', href: '/workcopilot/security' },
  { key: 'enterprise', label: 'Enterprise', href: '/workcopilot/enterprise' },
  { key: 'pricing', label: 'Pricing', href: '/workcopilot/pricing' },
  { key: 'faq', label: 'FAQ', href: '/workcopilot/faq' },
]

// Brand fonts, loaded once (same link the other marketing pages use).
const FONT_ID = 'work-legal-fonts'
function ensureFonts() {
  if (typeof document === 'undefined' || document.getElementById(FONT_ID)) return
  const l = document.createElement('link')
  l.id = FONT_ID; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
  document.head.appendChild(l)
}

function currentFromPath() {
  if (typeof window === 'undefined') return null
  const p = window.location.pathname.replace(/\/+$/, '')
  const hit = SITE_LINKS.find((l) => l.href === p)
  return hit ? hit.key : null
}

export default function SiteHeader({ current }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const active = current || currentFromPath()

  useEffect(() => { ensureFonts() }, [])

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
    <header className="wsh" ref={rootRef}>
      <style>{CSS}</style>
      <div className="wsh-in">
        <a className="wsh-brand" href="/" aria-label="AdmireVeda WorkCoPilot, home"><AdmireVedaLogo size={26} idSuffix="sh" /></a>

        <nav className={'wsh-links' + (open ? ' open' : '')} id="wsh-menu" aria-label="Main">
          {SITE_LINKS.map((l) => (
            <a key={l.key} href={l.href} className={active === l.key ? 'on' : undefined} aria-current={active === l.key ? 'page' : undefined} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          {/* Sign in lives in the menu on phones (hidden on desktop, where it sits on the right). */}
          <a className="wsh-m-only" href="/workcopilot" onClick={() => setOpen(false)}>Sign in</a>
          <a className="wsh-m-only wsh-m-cta" href="/workcopilot" onClick={() => setOpen(false)}>Get started <ArrowRight size={15} aria-hidden="true" /></a>
        </nav>

        <div className="wsh-cta">
          <a className="wsh-ghost" href="/workcopilot">Sign in</a>
          <a className="wsh-btn" href="/workcopilot">Get started <ArrowRight size={15} aria-hidden="true" /></a>
          <button type="button" className="wsh-burger" aria-expanded={open} aria-controls="wsh-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

const CSS = `
.wsh{--sh-tx:#0c1222;--sh-mut:#3f4a5c;--sh-line:#e2e7f0;--sh-em:#0a9d66;--sh-em-txt:#077a4f;--sh-warm:#ff9a4d;--sh-warm2:#f26a43;
  position:sticky;top:0;z-index:50;width:100%;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);
  border-bottom:1px solid var(--sh-line);box-shadow:0 1px 0 rgba(17,23,38,.05),0 12px 34px -26px rgba(17,23,38,.35);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-align:left}
.wsh *{box-sizing:border-box}
.wsh a{color:inherit;text-decoration:none}
.wsh-in{display:flex;align-items:center;gap:22px;height:70px;max-width:1160px;margin:0 auto;padding:0 24px}
.wsh-brand{display:inline-flex;align-items:center;flex:0 0 auto;border-radius:8px}
.wsh-links{display:flex;gap:4px;margin-left:auto;font-size:15px;color:var(--sh-mut)}
.wsh-links a{position:relative;padding:8px 11px;border-radius:9px;font-weight:500;white-space:nowrap;transition:color .15s,background .15s}
.wsh-links a:hover{color:var(--sh-tx);background:rgba(17,23,38,.05)}
.wsh-links a.on{color:var(--sh-em-txt);font-weight:700}
.wsh-links a.on::after{content:"";position:absolute;left:11px;right:11px;bottom:2px;height:2px;border-radius:2px;background:linear-gradient(90deg,#10a271,#0a93c4)}
.wsh-m-only{display:none}
.wsh-cta{display:flex;gap:10px;align-items:center;margin-left:14px;flex:0 0 auto}
.wsh-ghost{background:#fff;border:1px solid var(--sh-line);color:var(--sh-tx);border-radius:11px;padding:9px 15px;font-size:14px;font-weight:500;line-height:1.3;transition:border-color .15s}
.wsh-ghost:hover{border-color:rgba(17,23,38,.28)}
.wsh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--sh-warm),var(--sh-warm2));color:#1a0e08!important;border-radius:11px;padding:9px 15px;font-size:14px;font-weight:700;line-height:1.3;white-space:nowrap;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s,box-shadow .15s}
.wsh-btn:hover{transform:translateY(-2px);box-shadow:0 18px 44px -14px rgba(255,122,89,.75)}
.wsh-burger{display:none;align-items:center;justify-content:center;width:40px;height:40px;padding:0;background:#fff;border:1px solid var(--sh-line);border-radius:11px;color:var(--sh-tx);cursor:pointer}
.wsh a:focus-visible,.wsh button:focus-visible{outline:2px solid var(--sh-em);outline-offset:2px}

@media(max-width:880px){
  .wsh-in{gap:10px;padding:0 16px;height:62px}
  .wsh-burger{display:inline-flex}
  .wsh-cta{margin-left:auto}
  .wsh-ghost{display:none}
  .wsh-btn{padding:9px 13px;font-size:13.5px}
  .wsh-links{display:none;position:absolute;left:0;right:0;top:100%;margin:0;flex-direction:column;gap:2px;padding:10px 16px 16px;background:#fff;border-bottom:1px solid var(--sh-line);box-shadow:0 22px 40px -24px rgba(17,23,38,.35);font-size:16px}
  .wsh-links.open{display:flex}
  .wsh-links a{padding:13px 12px;border-radius:10px}
  .wsh-links a.on::after{left:12px;right:auto;width:22px;bottom:7px}
  .wsh-links .wsh-m-only{display:block;border-top:1px solid var(--sh-line);margin-top:6px;border-radius:0;padding-top:15px}
  .wsh-links .wsh-m-cta{display:none}
}
/* Phone: the brand lockup + CTA + menu button would exceed 360px, so the CTA moves into the menu. */
@media(max-width:520px){
  .wsh-cta .wsh-btn{display:none}
  .wsh-links .wsh-m-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;border-top:0;border-radius:11px;padding:13px 12px;background:linear-gradient(135deg,var(--sh-warm),var(--sh-warm2));color:#1a0e08;font-weight:700}
}
`
