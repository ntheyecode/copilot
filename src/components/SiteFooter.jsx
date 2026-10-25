// SiteFooter - the ONE footer every public page shares (single source), to match
// the shared SiteHeader. Brand lockup, four link groups (Product, Trust, Legal,
// Contact), the ownership line and the copyright. Brand tokens (emerald / cyan,
// Bricolage + Figtree).
//
// DARK BY DEFAULT (owner, 2026-10-24: "just make footer section only as dark").
// The public site is light everywhere; the footer is the single dark band that
// closes every page, so `dark` defaults to true and every `<SiteFooter />` call
// site renders dark with no per-page prop. A brand gradient hairline on its top
// edge makes the light-to-dark transition read as intentional. Pass
// `dark={false}` only if a page ever needs the light variant.
import React from 'react'
import { Mail, ArrowUpRight } from 'lucide-react'
import AdmireVedaLogo from './AdmireVedaLogo.jsx'
import { SUPPORT_CONTACT, LEGAL_CONTACT } from './LegalPage.jsx'
import { useT } from '../i18n/index.jsx'

// Link groups: the catalog key for each label (footer.<key> / nav.<key>) and the
// href. Labels are translated at render; hrefs never are.
const GROUPS = [
  { key: 'product', links: [
    ['nav.how', '/workcopilot/how-it-works'], ['nav.use', '/workcopilot/use-cases'], ['nav.fields', '/workcopilot/fields'],
    ['nav.pricing', '/workcopilot/pricing'], ['nav.faq', '/workcopilot/faq'], ['footer.demo', '/demo'],
  ] },
  { key: 'trust', links: [
    ['footer.securityData', '/workcopilot/security'], ['footer.enterpriseFeatures', '/workcopilot/enterprise'], ['footer.benchmark', '/workcopilot/benchmark'],
  ] },
  { key: 'legal', links: [
    ['footer.privacy', '/workcopilot/privacy'], ['footer.terms', '/workcopilot/terms'], ['footer.aup', '/workcopilot/acceptable-use'],
    ['footer.dpa', '/workcopilot/dpa'], ['footer.refund', '/workcopilot/refund'], ['footer.disclaimer', '/workcopilot/disclaimer'],
  ] },
]

// `dark` (default true) forces the dark palette regardless of data-theme.
export default function SiteFooter({ dark = true }) {
  const t = useT()
  return (
    <footer className={`sf${dark ? ' sf-dark' : ''}`} aria-label={t('footer.aria')}>
      <style>{CSS}</style>
      <div className="sf-in">
        <div className="sf-brand">
          <a href="/" aria-label={t('nav.home')}><AdmireVedaLogo size={26} idSuffix="sf" onDark={dark} /></a>
          <p className="sf-tag">{t('footer.tag')}</p>
          <div className="sf-ctas">
            <a className="sf-btn" href="/workcopilot">{t('common.getStarted')} <ArrowUpRight size={14} aria-hidden="true" className="sf-arrow" /></a>
            <a className="sf-btn alt" href="/workcopilot/contact">{t('common.contactUs')}</a>
          </div>
        </div>
        {GROUPS.map((g) => (
          <nav key={g.key} className="sf-group" aria-label={t('footer.' + g.key)}>
            <div className="sf-k">{t('footer.' + g.key)}</div>
            <ul>{g.links.map(([k, href]) => <li key={href}><a href={href}>{t(k)}</a></li>)}</ul>
          </nav>
        ))}
        <div className="sf-group" aria-label={t('footer.contact')}>
          <div className="sf-k">{t('footer.contact')}</div>
          <ul>
            <li><a href="/workcopilot/contact">{t('footer.sales')}</a></li>
            <li><a href={'mailto:' + SUPPORT_CONTACT} dir="ltr"><Mail size={12} aria-hidden="true" /> {SUPPORT_CONTACT}</a></li>
            <li><a href={'mailto:' + LEGAL_CONTACT} dir="ltr"><Mail size={12} aria-hidden="true" /> {LEGAL_CONTACT}</a></li>
          </ul>
        </div>
      </div>
      <div className="sf-bottom">
        <span>&copy; {new Date().getFullYear()} COE Security LLC. {t('footer.ownership')}</span>
        <span className="sf-note">{t('footer.note')}</span>
      </div>
    </footer>
  )
}

const CSS = `
.sf{--sf-bg:#f3f5fb;--sf-panel:#ffffff;--sf-line:#e6e8f1;--sf-tx:#161a2b;--sf-mut:#5c6484;--sf-em:#0e9f6e;--sf-cyan:#0a84c2;--sf-cta:#f26a43;--sf-cta2:#e35a31;--sf-cta-ink:#ffffff;
  position:relative;z-index:2;border-top:1px solid var(--sf-line);background:var(--sf-bg);color:var(--sf-tx);font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
[data-theme='dark'] .sf,.sf.sf-dark{--sf-bg:#0b0d16;--sf-panel:#151826;--sf-line:rgba(255,255,255,.09);--sf-tx:#eef0f6;--sf-mut:#a3a9bd;--sf-em:#8cf5c4;--sf-cyan:#39d3ff;--sf-cta:#ffb561;--sf-cta2:#ff7a59;--sf-cta-ink:#241206;
  border-top-color:transparent;background:radial-gradient(900px 260px at 50% -40px,rgba(14,159,110,.16),transparent 70%),var(--sf-bg)}
/* Intentional light-to-dark seam: a 3px brand gradient hairline (emerald to cyan to orange) along the top edge. */
.sf.sf-dark::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#0e9f6e 0%,#0a84c2 55%,#f26a43 100%)}
/* RTL: the grid and flex rows mirror on their own under dir=rtl; only the arrow glyph needs flipping. */
[dir="rtl"] .sf-arrow{transform:scaleX(-1)}
.sf{text-align:start}
.sf.sf-dark .sf-btn.alt{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.14)}
.sf.sf-dark .sf-btn.alt:hover{background:rgba(255,255,255,.07)}
.sf *{box-sizing:border-box}
.sf a{color:inherit;text-decoration:none}
.sf-in{max-width:1160px;margin:0 auto;padding:44px 24px 26px;display:grid;grid-template-columns:minmax(0,1.5fr) repeat(4,minmax(0,1fr));gap:28px}
.sf-brand{min-width:0;display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.sf-tag{margin:0;font-size:13.5px;line-height:1.55;color:var(--sf-mut);max-width:38ch}
.sf-ctas{display:flex;gap:8px;flex-wrap:wrap}
.sf-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:10px;font-size:13.5px;font-weight:700;background:linear-gradient(135deg,var(--sf-cta),var(--sf-cta2));color:var(--sf-cta-ink);box-shadow:0 10px 24px -14px var(--sf-cta2);transition:transform .15s,filter .15s}
.sf-btn:hover{transform:translateY(-1px);filter:brightness(1.04)}
.sf-btn.alt{background:var(--sf-panel);color:var(--sf-tx);border:1px solid var(--sf-line);box-shadow:none}
.sf-btn.alt:hover{border-color:var(--sf-cyan);color:var(--sf-cyan)}
.sf-k{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--sf-em);margin-bottom:12px}
.sf-group ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.sf-group a{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;color:var(--sf-mut);transition:color .15s;overflow-wrap:anywhere}
.sf-group a:hover{color:var(--sf-tx)}
.sf-group a:focus-visible,.sf-btn:focus-visible,.sf-brand a:focus-visible{outline:2px solid var(--sf-cyan);outline-offset:3px;border-radius:6px}
.sf-bottom{max-width:1160px;margin:0 auto;padding:16px 24px 28px;border-top:1px solid var(--sf-line);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--sf-mut)}
.sf-note{opacity:.9}
@media(max-width:980px){.sf-in{grid-template-columns:1fr 1fr 1fr}.sf-brand{grid-column:1 / -1}}
@media(max-width:560px){.sf-in{grid-template-columns:1fr 1fr;gap:22px;padding:34px 18px 20px}.sf-bottom{flex-direction:column;gap:6px;padding:14px 18px 24px}}
@media(prefers-reduced-motion:reduce){.sf-btn{transition:none}}
`
