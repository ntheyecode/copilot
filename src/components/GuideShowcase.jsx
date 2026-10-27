import React, { useEffect, useRef, useState } from 'react'
import GuideConsole from './GuideConsole.jsx'
import { useT } from '../i18n/index.jsx'

// GuideShowcase - "pick a field, watch it guide": a tab row of fields over ONE
// GuideConsole. The tabs are the scenario tags from the catalog
// (guide.scenarios.<id>.tag); choosing one restarts the console on that
// scenario. Used on use-cases, fields and the demo page, so a visitor from any
// field sees the same hand-holding on work that looks like theirs.
//
// Deep link: #watch-<id> on the page URL preselects that field and scrolls the
// showcase into view (the field vignettes link here that way).
//
// Accessibility: a real tablist (arrow keys move between tabs, the console is
// the tabpanel); the tab row scrolls sideways on a phone instead of wrapping
// badly (design gate: no wrapped or clipped pills).

const STYLE_ID = 'guideshowcase-css'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style')
    s.id = STYLE_ID; s.textContent = CSS
    document.head.appendChild(s)
  }
}

export const SHOWCASE_IDS = ['finance', 'logistics', 'healthcare', 'retail', 'hr', 'engineering', 'support']

export default function GuideShowcase({ ids = SHOWCASE_IDS, initial, idPrefix = 'gs', className = '' }) {
  ensureStyle()
  const t = useT()
  const scenarios = t('guide.scenarios') || {}
  const list = ids.filter((id) => scenarios[id])
  const fromHash = () => {
    try {
      const m = (window.location.hash || '').match(/^#watch-([a-z]+)$/)
      return m && list.includes(m[1]) ? m[1] : null
    } catch { return null }
  }
  const [sel, setSel] = useState(() => (typeof window !== 'undefined' && fromHash()) || (list.includes(initial) ? initial : list[0]))
  const rootRef = useRef(null)
  const tabRefs = useRef({})

  // #watch-<id> deep link: select and bring the showcase into view, both on
  // mount (a link from another page) and on a hash change (a vignette on the
  // same page), so one mechanism serves every entry point.
  useEffect(() => {
    let timers = []
    const apply = () => {
      const id = fromHash()
      if (!id) return
      setSel(id)
      // Two attempts (after paint, and once the page's own reveals and late
      // layout have settled), the same pattern the pricing page uses for its
      // recommended plan; skipped when the showcase is already in view.
      const go = () => {
        const el = rootRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top >= 0 && r.top < window.innerHeight * 0.4) return
        try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }) } catch { /* ignore */ }
      }
      timers.forEach(clearTimeout)
      timers = [setTimeout(go, 120), setTimeout(go, 700)]
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => { window.removeEventListener('hashchange', apply); timers.forEach(clearTimeout) }
  }, []) // eslint-disable-line

  const onKey = (e) => {
    const i = list.indexOf(sel)
    if (i < 0) return
    let n = null
    if (e.key === 'ArrowRight') n = (i + 1) % list.length
    if (e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length
    if (e.key === 'Home') n = 0
    if (e.key === 'End') n = list.length - 1
    if (n == null) return
    e.preventDefault()
    setSel(list[n])
    const b = tabRefs.current[list[n]]
    if (b) b.focus()
  }

  if (!list.length) return null
  const cur = scenarios[sel] || scenarios[list[0]]
  return (
    <div className={`gs ${className}`} ref={rootRef}>
      <div className="gs-tabs" role="tablist" aria-label={t('guide.showcase.tabsAria')} onKeyDown={onKey}>
        {list.map((id) => (
          <button
            key={id} type="button" role="tab" id={`${idPrefix}-tab-${id}`}
            aria-selected={sel === id} aria-controls={`${idPrefix}-panel`} tabIndex={sel === id ? 0 : -1}
            className={`gs-tab${sel === id ? ' on' : ''}`} onClick={() => setSel(id)}
            ref={(el) => { tabRefs.current[id] = el }}
          >
            {scenarios[id].tag}
          </button>
        ))}
      </div>
      <div className="gs-panel" role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${sel}`}>
        <GuideConsole key={sel} scenario={cur} />
      </div>
      <p className="gs-hint">{t('guide.showcase.hint')}</p>
    </div>
  )
}

const CSS = `
.gs{display:flex;flex-direction:column;gap:14px;min-width:0;max-width:100%}
.gs-tabs{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:4px 2px 6px;margin:0 -2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.gs-tabs::-webkit-scrollbar{display:none}
.gs-tab{flex:0 0 auto;white-space:nowrap;font:inherit;font-size:13px;font-weight:600;color:var(--gs-mut,#5c6484);background:var(--gs-panel,#fff);border:1px solid var(--gs-line,#e6e8f1);border-radius:999px;padding:8px 14px;cursor:pointer;box-shadow:0 1px 2px rgba(17,23,38,.04);transition:color .2s,border-color .2s,background .2s,transform .15s}
.gs-tab:hover{color:var(--gs-tx,#161a2b);border-color:rgba(14,159,110,.45);transform:translateY(-1px)}
.gs-tab.on{color:#06201a;background:linear-gradient(135deg,#8cf5c4,#39d3ff);border-color:transparent;box-shadow:0 10px 24px -14px rgba(10,147,196,.6)}
.gs-tab:focus-visible{outline:2px solid #0a84c2;outline-offset:2px}
.gs-panel{min-width:0}
.gs-hint{margin:0;font-size:13px;color:var(--gs-mut,#5c6484);text-align:center}
[data-theme='dark'] .gs-tab{--gs-mut:#9aa0b4;--gs-panel:#13141f;--gs-line:rgba(255,255,255,.12);--gs-tx:#eef0f6}
@media(prefers-reduced-motion:reduce){.gs-tab{transition:none}.gs-tab:hover{transform:none}}
`
