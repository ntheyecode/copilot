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
//
// i18n: the chrome this component owns (hero meta, template notice, ownership
// line, hidden glance heading, TOC title, related-pages buttons) reads from the
// `legalShared` namespace (src/i18n/locales/en/legalShared.js). The legal entity
// and the two mailboxes stay constants here and are interpolated, never translated.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Mail } from 'lucide-react'
import SiteHeader from './SiteHeader.jsx'
import SiteFooter from './SiteFooter.jsx'
import WorkCard from './WorkCard.jsx'   // shared, site-wide premium card primitive
import useSeo from '../useSeo.js'      // per-route title / description / canonical (audit WEB-01)
import { useT, interpolate, renderRich } from '../i18n/index.jsx'

// Single source of truth for identity + contacts across every legal page.
export const LEGAL_ENTITY = 'COE Security LLC'
export const LEGAL_CONTACT = 'support@coesecurity.com'      // security, legal, privacy, DPA
export const SUPPORT_CONTACT = 'support@admireveda.com'     // product support, billing

// Brand fonts are self-hosted and loaded globally in src/main.jsx; no runtime
// Google Fonts link is injected here.

// A clearly-marked fill-in-later value. Never invent the real value.
export function Placeholder({ children }) {
  return <span className="wlx-ph">[{children}]</span>
}

// Inline tags every legal page can use inside a keyed string: <ph>..</ph> renders
// the Placeholder chip (so "to be confirmed with counsel" markers are keyed copy,
// not JSX scattered through the pages). Pages add their own link renderers:
//   t.rich('dpaPage.scope.p1', null, legalTags({ terms: (c) => <a href="/workcopilot/terms">{c}</a> }))
const LEGAL_TAGS = { ph: (c) => <Placeholder>{c}</Placeholder> }
export function legalTags(extra) { return extra ? { ...LEGAL_TAGS, ...extra } : LEGAL_TAGS }

// Two-column "name / how" rows, identical to the Privacy page vocabulary.
// `items` is a translated list of { name, how } - or a [name, how] tuple when a
// page builds a row around its own JSX (a mailto link). A string `how` (or name)
// is interpolated with `vars` ({entity}, {contact}, {support}) and rendered
// through the i18n rich parser with legalTags(tags), so <ph>, <a> and <b> inside
// a keyed row become elements. ONE renderer for every legal page: a keyed row
// never needs a per-page wrapper (SUPREME RULE II).
export function Items({ items, vars, tags }) {
  const tagMap = legalTags(tags)
  return (
    <ul className="wlx-list">
      {items.map((it, i) => {
        const [name, how] = Array.isArray(it) ? it : [it.name, it.how]
        const nm = typeof name === 'string' ? interpolate(name, vars) : name
        const hw = typeof how === 'string' ? renderRich(interpolate(how, vars), tagMap) : how
        return <li key={typeof nm === 'string' ? nm : i}><span className="wlx-name">{nm}</span><span className="wlx-how">{hw}</span></li>
      })}
    </ul>
  )
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
  const t = useT()
  useSeo(seo || {})
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
          <span><b>{t('legalShared.lastUpdated')}</b> {lastUpdated}</span>
          <span className="wlx-sep" aria-hidden="true" />
          <span>{tagline}</span>
        </div>
        <div className="wlx-template" role="note">
          <b>{t('legalShared.templateLabel')}</b> {t('legalShared.templateNotice')}
        </div>
        <div className="wlx-owner">{t('legalShared.ownership', { entity: LEGAL_ENTITY })}</div>
      </section>

      {glance.length > 0 && (
        <section className="wlx-block" aria-labelledby="wlx-glance-h">
          <h2 id="wlx-glance-h" className="wlx-sr">{t('legalShared.glanceH2')}</h2>
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
          <div className="wlx-toct" id="wlx-toc-h">{t('legalShared.tocTitle')}</div>
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

      <section className="wlx-cta" aria-label={t('legalShared.relatedPages')}>
        {links.map((l, i) => {
          const Ic = l.icon
          const cls = 'wlx-btn' + (i === 0 ? '' : ' alt')
          return l.href
            ? <a key={l.label} className={cls} href={l.href}>{Ic && <Ic size={15} aria-hidden="true" />} {l.label}</a>
            : <button key={l.label} className={cls} onClick={() => nav(l.to)}>{Ic && <Ic size={15} aria-hidden="true" />} {l.label}</button>
        })}
        <a className="wlx-btn alt" href={'mailto:' + contact}><Mail size={15} aria-hidden="true" /> {t('legalShared.contact')}</a>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot')}>{t('legalShared.back')} <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      </main>
      <SiteFooter />
    </div>
  )
}

// Identical vocabulary to WorkPrivacy / WorkDisclaimer, plus the template
// notice, ownership line and placeholder chip. BRAND tokens (emerald / cyan,
// orange CTA) with a dark override: a clean legal-document layout in the site shell.
const CSS = `
.wlx{--ink:#161a2b;--tx2:#2b3250;--mut:#5c6484;--line:#e6e8f1;--panel:#ffffff;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--em-fill:rgba(14,159,110,.08);--em-line:rgba(14,159,110,.30);--amber:#8a5a12;--amber-b:#b7791f;--amber-fill:rgba(183,121,31,.10);--amber-line:rgba(183,121,31,.36);--cta:#f26a43;--cta2:#e35a31;--cta-ink:#ffffff;
  background:var(--bg);color:var(--ink);min-height:100vh;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
[data-theme='dark'] .wlx{--ink:#eef0f6;--tx2:#d3d8e6;--mut:#9aa0b4;--line:rgba(255,255,255,.09);--panel:#13141f;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff;--em-fill:rgba(140,245,196,.10);--em-line:rgba(140,245,196,.34);--amber:#f5c86b;--amber-b:#f5c86b;--amber-fill:rgba(245,200,107,.12);--amber-line:rgba(245,200,107,.36);--cta:#ffb561;--cta2:#ff7a59;--cta-ink:#241206}
.wlx *{box-sizing:border-box}
.wlx-hero{max-width:760px;margin:0 auto;padding:34px 20px 6px;text-align:center}
.wlx-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em);background:var(--em-fill);border:1px solid var(--em-line);border-radius:999px;padding:5px 13px}
.wlx-hero h1{font-size:34px;line-height:1.12;margin:16px 0 10px;letter-spacing:-.02em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif}
.wlx-hero p{font-size:16.5px;line-height:1.6;color:var(--mut);margin:0 auto;max-width:640px}
.wlx-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin:18px auto 0;font-size:13px;color:var(--mut)}
.wlx-meta b{color:var(--ink);font-weight:700;margin-right:4px}
.wlx-sep{width:4px;height:4px;border-radius:50%;background:var(--line)}
.wlx-template{margin:18px auto 0;max-width:640px;text-align:left;font-size:13.5px;line-height:1.55;color:var(--amber);background:var(--amber-fill);border:1px solid var(--amber-line);border-radius:10px;padding:10px 14px;overflow-wrap:anywhere}
.wlx-template b{color:var(--amber)}
.wlx-owner{margin:12px auto 0;font-size:13px;color:var(--mut)}
.wlx-block{max-width:1040px;margin:0 auto;padding:30px 20px}
.wlx-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.wlx-gcard{min-width:0}
.wlx-gcard .wc-title{font-size:18px}
/* The rail column sizes to its LONGEST link (fit-content, capped at 400px) so a
   section title never wraps onto a second line at desktop widths, whatever the
   document (the Terms rail needs ~390px); only a title longer than the cap would
   wrap, and nothing clips. The document block is a little wider than the other
   blocks so the article keeps a comfortable measure beside a wide rail. */
.wlx-doc{display:grid;grid-template-columns:fit-content(400px) minmax(0,1fr);gap:36px;align-items:start;padding-top:10px;max-width:1120px}
.wlx-toc{position:sticky;top:18px;min-width:0}
.wlx-toct{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin:0 0 10px}
.wlx-toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wlx-toc a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wlx-toc a:hover{background:var(--panel);border:1px solid var(--line);padding:6px 9px}
.wlx-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--mut);flex:0 0 auto}
/* a11y: visually hidden but read by assistive tech; visible focus ring (never outline:none) */
.wlx-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wlx a:focus-visible,.wlx button:focus-visible,.wlx [tabindex]:focus-visible{outline:2px solid var(--em);outline-offset:2px;border-radius:6px}
/* data table (DPA data lifecycle) */
.wlx-tscroll{overflow-x:auto;margin:4px 0 0;-webkit-overflow-scrolling:touch}
.wlx-table{width:100%;min-width:640px;border-collapse:collapse;font-size:13.5px;line-height:1.5}
.wlx-table caption{text-align:left;font-weight:700;color:var(--ink);padding:0 0 8px}
.wlx-table th,.wlx-table td{text-align:left;vertical-align:top;padding:10px 12px;border-top:1px solid var(--line);color:var(--tx2)}
.wlx-table thead th{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);background:var(--bg);border-top:0}
.wlx-table tbody th{font-weight:700;color:var(--ink);white-space:nowrap}
.wlx-table tbody th::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:8px;vertical-align:2px;background:linear-gradient(135deg,var(--em),var(--cy))}
.wlx-art{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:12px 30px 18px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wlx-sec{padding:24px 0 26px;border-top:1px solid var(--line);scroll-margin-top:18px}
.wlx-sec:first-child{border-top:0}
.wlx-sec h2{display:flex;align-items:baseline;gap:12px;font-size:21px;margin:0 0 12px;letter-spacing:-.01em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif}
.wlx-sec h2 .wlx-n{font-size:12px;color:var(--em)}
.wlx-sec h3{font-size:14px;margin:18px 0 6px;letter-spacing:.01em;color:var(--ink)}
.wlx-sec p{font-size:15px;line-height:1.65;color:var(--tx2);margin:0 0 12px;overflow-wrap:anywhere}
.wlx-sec p:last-child{margin-bottom:0}
.wlx-sec a{color:var(--em);font-weight:600;text-decoration:underline;text-decoration-color:var(--em-line);text-underline-offset:2px;overflow-wrap:anywhere}
.wlx-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.wlx-list li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:4px 18px;padding:11px 0;border-top:1px solid var(--line);min-width:0}
.wlx-list li:first-child{border-top:0;padding-top:4px}
.wlx-name{display:inline-flex;align-items:flex-start;gap:8px;font-weight:700;font-size:14px;color:var(--ink);letter-spacing:-.005em;line-height:1.5}
.wlx-name::before{content:"";width:6px;height:6px;border-radius:50%;flex:0 0 auto;margin-top:8px;background:linear-gradient(135deg,var(--em),var(--cy))}
.wlx-how{font-size:14.5px;line-height:1.6;color:var(--mut);overflow-wrap:anywhere}
.wlx-note{display:flex;align-items:flex-start;gap:8px;margin-top:16px;font-size:13.5px;line-height:1.55;color:var(--mut);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 14px;overflow-wrap:anywhere}
.wlx-note svg{color:var(--em);flex:0 0 auto;margin-top:2px}
.wlx-note b{color:var(--ink)}
.wlx-ph{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:12.5px;font-weight:500;color:var(--amber);background:var(--amber-fill);border:1px dashed var(--amber-line);border-radius:6px;padding:1px 6px}
.wlx-cta{max-width:1040px;margin:0 auto;padding:16px 20px 56px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wlx-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--cta),var(--cta2));color:var(--cta-ink);border:1px solid transparent;border-radius:11px;padding:11px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none}
.wlx-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line)}
@media(max-width:900px){
  .wlx-doc{grid-template-columns:1fr;gap:18px}
  .wlx-toc{position:static}
  .wlx-toc ol{flex-direction:row;flex-wrap:wrap;gap:6px}
  .wlx-toc a{background:var(--panel);border:1px solid var(--line);padding:6px 10px;font-size:12.5px;border-radius:999px}
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
