// WorkCoPilot - shared layout for the public legal / trust pages
// (Terms, Acceptable Use, DPA, Refund & Cancellation).
// Same design language as WorkPrivacy / WorkDisclaimer (.wlx-* vocabulary, sticky
// table of contents + article, WorkCard "at a glance" row), so the pages read as
// one set. Each page supplies its content; this component owns the chrome, the
// template notice, the ownership line and the stylesheet.
//
// HONESTY CONTRACT (owner-enforced): templates only. The template notice is
// rendered by default on every page that uses this layout. No certifications, no
// invented addresses or jurisdictions, no model/provider/cost/mechanism detail.
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileText, Mail } from 'lucide-react'
import SiteHeader from './SiteHeader.jsx'
import WorkCard from './WorkCard.jsx'   // shared, site-wide premium card primitive
import useSeo from '../useSeo.js'      // per-route title / description / canonical (audit WEB-01)

// Single source of truth for identity + contacts across every legal page.
export const LEGAL_ENTITY = 'COE Security LLC'
export const OWNERSHIP_LINE = 'WorkCoPilot, by AdmireVeda, a product of COE Security LLC.'
export const LEGAL_CONTACT = 'support@coesecurity.com'      // security, legal, privacy, DPA
export const SUPPORT_CONTACT = 'support@admireveda.com'     // product support, billing
export const TEMPLATE_NOTICE = 'This is a template provided for transparency and is being finalized with legal counsel; it is not yet a binding agreement.'

// Brand fonts, loaded once (same link the sign-in and marketing pages use).
const FONT_ID = 'work-legal-fonts'
function ensureFonts() {
  if (typeof document === 'undefined' || document.getElementById(FONT_ID)) return
  const l = document.createElement('link')
  l.id = FONT_ID; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
  document.head.appendChild(l)
}

// Two-column "name / how" rows, identical to the Privacy page vocabulary.
export function Items({ items }) {
  return (
    <ul className="wlx-list">
      {items.map(([name, how]) => (
        <li key={name}><span className="wlx-name">{name}</span><span className="wlx-how">{how}</span></li>
      ))}
    </ul>
  )
}

// A clearly-marked fill-in-later value. Never invent the real value.
export function Placeholder({ children }) {
  return <span className="wlx-ph">[{children}]</span>
}

// A plain data table in the legal vocabulary (used by the DPA data-lifecycle
// section). Semantic: caption (visually hidden unless shown), column headers
// with scope, row header in the first cell. Scrolls sideways on phones rather
// than crushing the columns.
export function DataTable({ caption, columns, rows, showCaption = false }) {
  return (
    <div className="wlx-tscroll" role="region" aria-label={caption} tabIndex={0}>
      <table className="wlx-table">
        <caption className={showCaption ? undefined : 'wlx-sr'}>{caption}</caption>
        <thead>
          <tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// props:
//   icon, eyebrow, title, intro, lastUpdated, tagline
//   seo:      { title, description, path }             (per-route identity, WEB-01)
//   glance:   [{ icon, tone, eyebrow, title, body }]  (3 cards)
//   sections: [{ id, title, content }]                (content is JSX)
//   links:    [{ label, to, icon, href }]             (first one renders as primary)
//
// Accessibility (WEB-08): one <main> landmark, a single H1, a visually hidden
// H2 over the glance cards (WorkCard.Head renders H3s, so without it the order
// would jump H1 -> H3 -> H2), decorative icons hidden from the accessibility
// tree, visible focus rings, and no text below AA contrast.
export default function LegalPage({ icon: Icon = FileText, eyebrow, title, intro, lastUpdated, tagline, seo, glance = [], sections, links = [], contact = LEGAL_CONTACT }) {
  const nav = useNavigate()
  useSeo(seo || {})
  useEffect(() => { ensureFonts() }, [])
  return (
    <div className="wlx">
      <style>{CSS}</style>
      <SiteHeader />

      <main id="main">
      <section className="wlx-hero">
        <div className="wlx-eyebrow"><Icon size={14} aria-hidden="true" /> {eyebrow} &middot; WorkCoPilot</div>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="wlx-meta">
          <span><b>Last updated</b> {lastUpdated}</span>
          <span className="wlx-sep" aria-hidden="true" />
          <span>{tagline}</span>
        </div>
        <div className="wlx-template" role="note">
          <b>Template.</b> {TEMPLATE_NOTICE}
        </div>
        <div className="wlx-owner">{OWNERSHIP_LINE}</div>
      </section>

      {glance.length > 0 && (
        <section className="wlx-block" aria-labelledby="wlx-glance-h">
          <h2 id="wlx-glance-h" className="wlx-sr">At a glance</h2>
          <div className="wlx-glance">
            {glance.map((g, i) => {
              const Ic = g.icon
              return (
                <WorkCard key={g.eyebrow} theme="light" tone={g.tone} delay={i * 70} texPos={['0% 0%', '50% 50%', '100% 100%'][i % 3]} className="wlx-gcard">
                  <WorkCard.Head icon={Ic} eyebrow={g.eyebrow} title={g.title} />
                  <WorkCard.Body>{g.body}</WorkCard.Body>
                </WorkCard>
              )
            })}
          </div>
        </section>
      )}

      <section className="wlx-block wlx-doc">
        <nav className="wlx-toc" aria-labelledby="wlx-toc-h">
          <div className="wlx-toct" id="wlx-toc-h">On this page</div>
          <ol>
            {sections.map((s, i) => <li key={s.id}><a href={'#' + s.id}><span className="wlx-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{s.title}</a></li>)}
          </ol>
        </nav>

        <article className="wlx-art">
          {sections.map((s, i) => (
            <section className="wlx-sec" id={s.id} key={s.id} aria-labelledby={s.id + '-h'}>
              <h2 id={s.id + '-h'}><span className="wlx-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
              {s.content}
            </section>
          ))}
        </article>
      </section>

      <section className="wlx-cta" aria-label="Related pages">
        {links.map((l, i) => {
          const Ic = l.icon
          const cls = 'wlx-btn' + (i === 0 ? '' : ' alt')
          return l.href
            ? <a key={l.label} className={cls} href={l.href}>{Ic && <Ic size={15} aria-hidden="true" />} {l.label}</a>
            : <button key={l.label} className={cls} onClick={() => nav(l.to)}>{Ic && <Ic size={15} aria-hidden="true" />} {l.label}</button>
        })}
        <a className="wlx-btn alt" href={'mailto:' + contact}><Mail size={15} aria-hidden="true" /> Contact</a>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      </main>
    </div>
  )
}

// Identical vocabulary to WorkPrivacy / WorkDisclaimer, plus the template
// notice, ownership line and placeholder chip.
const CSS = `
.wlx{--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--em:#0f766e;--bg:#f8fafc;background:var(--bg);color:var(--ink);min-height:100vh;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.wlx *{box-sizing:border-box}
.wlx-top{display:flex;align-items:center;justify-content:space-between;max-width:1040px;margin:0 auto;padding:18px 20px}
.wlx-back{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 13px;font:inherit;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer}
.wlx-hero{max-width:760px;margin:0 auto;padding:34px 20px 6px;text-align:center}
.wlx-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em);background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:5px 13px}
.wlx-hero h1{font-size:34px;line-height:1.12;margin:16px 0 10px;letter-spacing:-.02em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif}
.wlx-hero p{font-size:16.5px;line-height:1.6;color:var(--mut);margin:0 auto;max-width:640px}
.wlx-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin:18px auto 0;font-size:13px;color:var(--mut)}
.wlx-meta b{color:var(--ink);font-weight:700;margin-right:4px}
.wlx-sep{width:4px;height:4px;border-radius:50%;background:#cbd5e1}
.wlx-template{margin:18px auto 0;max-width:640px;text-align:left;font-size:13.5px;line-height:1.55;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:10px 14px;overflow-wrap:anywhere}
.wlx-template b{color:#78350f}
.wlx-owner{margin:12px auto 0;font-size:13px;color:var(--mut)}
.wlx-block{max-width:1040px;margin:0 auto;padding:30px 20px}
.wlx-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.wlx-gcard{min-width:0}
.wlx-gcard .wc-title{font-size:18px}
.wlx-doc{display:grid;grid-template-columns:220px minmax(0,1fr);gap:36px;align-items:start;padding-top:10px}
.wlx-toc{position:sticky;top:18px;min-width:0}
.wlx-toct{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin:0 0 10px}
.wlx-toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wlx-toc a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wlx-toc a:hover{background:#fff;border:1px solid var(--line);padding:6px 9px}
.wlx-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--mut);flex:0 0 auto}
/* a11y: visually hidden but read by assistive tech; visible focus ring (never outline:none) */
.wlx-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wlx a:focus-visible,.wlx button:focus-visible,.wlx [tabindex]:focus-visible{outline:2px solid var(--em);outline-offset:2px;border-radius:6px}
/* data table (DPA data lifecycle) */
.wlx-tscroll{overflow-x:auto;margin:4px 0 0;-webkit-overflow-scrolling:touch}
.wlx-table{width:100%;min-width:640px;border-collapse:collapse;font-size:13.5px;line-height:1.5}
.wlx-table caption{text-align:left;font-weight:700;color:var(--ink);padding:0 0 8px}
.wlx-table th,.wlx-table td{text-align:left;vertical-align:top;padding:10px 12px;border-top:1px solid var(--line);color:#334155}
.wlx-table thead th{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);background:var(--bg);border-top:0}
.wlx-table tbody th{font-weight:700;color:var(--ink);white-space:nowrap}
.wlx-table tbody th::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:8px;vertical-align:2px;background:linear-gradient(135deg,#10a271,#0a93c4)}
.wlx-art{min-width:0;background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px 30px 18px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wlx-sec{padding:24px 0 26px;border-top:1px solid var(--line);scroll-margin-top:18px}
.wlx-sec:first-child{border-top:0}
.wlx-sec h2{display:flex;align-items:baseline;gap:12px;font-size:21px;margin:0 0 12px;letter-spacing:-.01em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif}
.wlx-sec h2 .wlx-n{font-size:12px;color:var(--em)}
.wlx-sec h3{font-size:14px;margin:18px 0 6px;letter-spacing:.01em;color:var(--ink)}
.wlx-sec p{font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;overflow-wrap:anywhere}
.wlx-sec p:last-child{margin-bottom:0}
.wlx-sec a{color:var(--em);font-weight:600;text-decoration:underline;text-decoration-color:#a7f3d0;text-underline-offset:2px;overflow-wrap:anywhere}
.wlx-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.wlx-list li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:4px 18px;padding:11px 0;border-top:1px solid var(--line);min-width:0}
.wlx-list li:first-child{border-top:0;padding-top:4px}
.wlx-name{display:inline-flex;align-items:flex-start;gap:8px;font-weight:700;font-size:14px;color:var(--ink);letter-spacing:-.005em;line-height:1.5}
.wlx-name::before{content:"";width:6px;height:6px;border-radius:50%;flex:0 0 auto;margin-top:8px;background:linear-gradient(135deg,#10a271,#0a93c4)}
.wlx-how{font-size:14.5px;line-height:1.6;color:var(--mut);overflow-wrap:anywhere}
.wlx-note{display:flex;align-items:flex-start;gap:8px;margin-top:16px;font-size:13.5px;line-height:1.55;color:var(--mut);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 14px;overflow-wrap:anywhere}
.wlx-note svg{color:var(--em);flex:0 0 auto;margin-top:2px}
.wlx-note b{color:var(--ink)}
.wlx-ph{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:12.5px;font-weight:500;color:#92400e;background:#fffbeb;border:1px dashed #fcd34d;border-radius:6px;padding:1px 6px}
.wlx-cta{max-width:1040px;margin:0 auto;padding:16px 20px 56px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wlx-btn{display:inline-flex;align-items:center;gap:8px;background:var(--em);color:#fff;border:1px solid var(--em);border-radius:11px;padding:11px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none}
.wlx-btn.alt{background:#fff;color:var(--ink);border-color:var(--line)}
@media(max-width:900px){
  .wlx-doc{grid-template-columns:1fr;gap:18px}
  .wlx-toc{position:static}
  .wlx-toc ol{flex-direction:row;flex-wrap:wrap;gap:6px}
  .wlx-toc a{background:#fff;border:1px solid var(--line);padding:6px 10px;font-size:12.5px;border-radius:999px}
  .wlx-toc a:hover{padding:6px 10px}
}
@media(max-width:760px){
  .wlx-glance{grid-template-columns:1fr}
  .wlx-hero h1{font-size:27px}
  .wlx-sep{display:none}
  .wlx-art{padding:6px 18px 12px;border-radius:14px}
  .wlx-list li{grid-template-columns:1fr}
}
`
