// SiteFooter - the ONE footer every public page shares (single source), to match
// the shared SiteHeader. Brand lockup, four link groups (Product, Trust, Legal,
// Contact), the ownership line and the copyright. Brand tokens (emerald / cyan,
// Bricolage + Figtree), light by default with a dark override on data-theme, so
// it sits correctly on both the light inner pages and the dark marketing page.
import React from 'react'
import { Mail, ArrowUpRight } from 'lucide-react'
import AdmireVedaLogo from './AdmireVedaLogo.jsx'
import { OWNERSHIP_LINE, SUPPORT_CONTACT, LEGAL_CONTACT } from './LegalPage.jsx'

const GROUPS = [
  { title: 'Product', links: [
    ['How it works', '/workcopilot/how-it-works'], ['Use cases', '/workcopilot/use-cases'], ['Fields', '/workcopilot/fields'],
    ['Pricing', '/workcopilot/pricing'], ['FAQ', '/workcopilot/faq'], ['60-second demo', '/demo'],
  ] },
  { title: 'Trust', links: [
    ['Security & data protection', '/workcopilot/security'], ['Enterprise features', '/workcopilot/enterprise'], ['Accuracy benchmark', '/workcopilot/benchmark'],
  ] },
  { title: 'Legal', links: [
    ['Privacy Policy', '/workcopilot/privacy'], ['Terms of Service', '/workcopilot/terms'], ['Acceptable Use', '/workcopilot/acceptable-use'],
    ['Data Processing Addendum', '/workcopilot/dpa'], ['Refund & Cancellation', '/workcopilot/refund'], ['Disclaimer', '/workcopilot/disclaimer'],
  ] },
]

// `dark` forces the dark palette regardless of data-theme (for the dark marketing page).
export default function SiteFooter({ dark = false }) {
  return (
    <footer className={`sf${dark ? ' sf-dark' : ''}`} aria-label="Site footer">
      <style>{CSS}</style>
      <div className="sf-in">
        <div className="sf-brand">
          <a href="/" aria-label="AdmireVeda WorkCoPilot, home"><AdmireVedaLogo size={26} idSuffix="sf" /></a>
          <p className="sf-tag">Your expert, on every screen. Read-only guidance that watches your screen and tells you the exact next move, in any app, with your data protected on your device.</p>
          <div className="sf-ctas">
            <a className="sf-btn" href="/workcopilot">Get started <ArrowUpRight size={14} aria-hidden="true" /></a>
            <a className="sf-btn alt" href="/workcopilot/contact">Contact us</a>
          </div>
        </div>
        {GROUPS.map((g) => (
          <nav key={g.title} className="sf-group" aria-label={g.title}>
            <div className="sf-k">{g.title}</div>
            <ul>{g.links.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
          </nav>
        ))}
        <div className="sf-group" aria-label="Contact">
          <div className="sf-k">Contact</div>
          <ul>
            <li><a href="/workcopilot/contact">Sales and enterprise</a></li>
            <li><a href={'mailto:' + SUPPORT_CONTACT}><Mail size={12} aria-hidden="true" /> {SUPPORT_CONTACT}</a></li>
            <li><a href={'mailto:' + LEGAL_CONTACT}><Mail size={12} aria-hidden="true" /> {LEGAL_CONTACT}</a></li>
          </ul>
        </div>
      </div>
      <div className="sf-bottom">
        <span>&copy; {new Date().getFullYear()} COE Security LLC. {OWNERSHIP_LINE}</span>
        <span className="sf-note">Lawful, legitimate work only. Guidance, not professional advice.</span>
      </div>
    </footer>
  )
}

const CSS = `
.sf{--sf-bg:#f3f5fb;--sf-panel:#ffffff;--sf-line:#e6e8f1;--sf-tx:#161a2b;--sf-mut:#5c6484;--sf-em:#0e9f6e;--sf-cyan:#0a84c2;--sf-cta:#f26a43;--sf-cta2:#e35a31;--sf-cta-ink:#ffffff;
  position:relative;z-index:2;border-top:1px solid var(--sf-line);background:var(--sf-bg);color:var(--sf-tx);font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
[data-theme='dark'] .sf,.sf.sf-dark{--sf-bg:#0a0b12;--sf-panel:#13141f;--sf-line:rgba(255,255,255,.08);--sf-tx:#eef0f6;--sf-mut:#9aa0b4;--sf-em:#8cf5c4;--sf-cyan:#39d3ff;--sf-cta:#ffb561;--sf-cta2:#ff7a59;--sf-cta-ink:#241206}
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
