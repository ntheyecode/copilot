// WorkCoPilot - Disclaimer (public, plain-language).
// HONESTY CONTRACT (owner-enforced): guidance is not professional advice; the
// product is read-only and the reader decides what to run; AI can be wrong; the
// security checks are a backstop, not a promise; the product supports compliance
// but does not confer it. Plain language, no dense legalese, no invented entity
// jurisdictions. The legal entity is named per the owner's ownership hierarchy
// (AdmireVeda -> WorkCoPilot). Same light design language as
// WorkSecurity (.wsx-*).
// i18n: every visible string comes from the `disclaimerPage` namespace
// (src/i18n/locales/en/disclaimerPage.js); the legal entity, the two mailboxes
// and the date stay constants here and are interpolated, never translated.
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ArrowLeft, ArrowRight, Compass, Hand, AlertTriangle, ShieldCheck, Lock, Mail } from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive
import useSeo from '../useSeo.js'                  // per-route title / description / canonical (WEB-01)
import { useT, interpolate } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-22'
const CONTACT = 'support@admireveda.com'          // security, legal, privacy, DPA
const SUPPORT = 'support@admireveda.com'           // product support, billing
const ENTITY = 'AdmireVeda'

// Brand fonts are self-hosted and loaded globally in src/main.jsx; no runtime
// Google Fonts link is injected here.

// The three things a reader should leave with, before the detail. Icon + tone are
// design, so they stay here; the words are disclaimerPage.glance.cards[i].
const GLANCE = [
  { icon: Compass, tone: 'cyan' },
  { icon: Hand, tone: 'ok' },
  { icon: AlertTriangle, tone: 'amber' },
]

// Section list drives both the sticky table of contents and the article. Titles
// are disclaimerPage.sections.<id>.
const SECTIONS = [
  { id: 'advice', n: '01' },
  { id: 'control', n: '02' },
  { id: 'accuracy', n: '03' },
  { id: 'checks', n: '04' },
  { id: 'compliance', n: '05' },
  { id: 'warranty', n: '06' },
  { id: 'contact', n: '07' },
]

function Sec({ id, children }) {
  const t = useT()
  const s = SECTIONS.find((x) => x.id === id)
  return (
    <section className="wlx-sec" id={id} aria-labelledby={id + '-h'}>
      <h2 id={id + '-h'}><span className="wlx-n" aria-hidden="true">{s.n}</span>{t('disclaimerPage.sections.' + id)}</h2>
      {children}
    </section>
  )
}

// `items` is a translated list of { name, how }; `vars` interpolates {support}
// into the row that names the mailbox.
function Items({ items, vars }) {
  return (
    <ul className="wlx-list">
      {items.map(({ name, how }) => (
        <li key={name}><span className="wlx-name">{name}</span><span className="wlx-how">{interpolate(how, vars)}</span></li>
      ))}
    </ul>
  )
}

// Accessibility (WEB-08): one <main>, a single H1, a hidden H2 over the glance
// cards (WorkCard.Head renders H3s), decorative icons hidden, visible focus rings.
export default function WorkDisclaimer() {
  const nav = useNavigate()
  const t = useT()
  useSeo({
    title: t('disclaimerPage.seo.title'),
    description: t('disclaimerPage.seo.description'),
    path: '/workcopilot/disclaimer',
  })
  const mail = { contact: CONTACT, support: SUPPORT }
  const cards = t('disclaimerPage.glance.cards')
  return (
    <div className="wlx">
      <style>{CSS}</style>
      <SiteHeader />

      <main id="main">
      <section className="wlx-hero">
        <div className="wlx-eyebrow"><Scale size={14} aria-hidden="true" /> {t('disclaimerPage.hero.eyebrow')}</div>
        <h1>{t('disclaimerPage.hero.h1')}</h1>
        <p>{t('disclaimerPage.hero.lead')}</p>
        <div className="wlx-meta">
          <span><b>{t('disclaimerPage.hero.lastUpdated')}</b> {LAST_UPDATED}</span>
          <span className="wlx-sep" aria-hidden="true" />
          <span>{t('disclaimerPage.hero.tagline')}</span>
        </div>
        <div className="wlx-template" role="note"><b>{t('disclaimerPage.hero.templateLabel')}</b> {t('disclaimerPage.hero.templateNotice')}</div>
        <div className="wlx-owner">{t('disclaimerPage.hero.ownership')}</div>
      </section>

      <section className="wlx-block" aria-labelledby="wlx-glance-h">
        <h2 id="wlx-glance-h" className="wlx-sr">{t('disclaimerPage.glance.h2')}</h2>
        <div className="wlx-glance">
          {GLANCE.map((g, i) => {
            const Ic = g.icon
            const c = cards[i]
            return (
              <WorkCard key={c.eyebrow} theme="light" tone={g.tone} delay={i * 70} texPos={['0% 0%', '50% 50%', '100% 100%'][i]} className="wlx-gcard">
                <WorkCard.Head icon={Ic} eyebrow={c.eyebrow} title={c.title} />
                <WorkCard.Body>{c.body}</WorkCard.Body>
              </WorkCard>
            )
          })}
        </div>
      </section>

      <section className="wlx-block wlx-doc">
        <nav className="wlx-toc" aria-labelledby="wlx-toc-h">
          <div className="wlx-toct" id="wlx-toc-h">{t('disclaimerPage.toc.title')}</div>
          <ol>
            {SECTIONS.map((s) => <li key={s.id}><a href={'#' + s.id}><span className="wlx-n" aria-hidden="true">{s.n}</span>{t('disclaimerPage.sections.' + s.id)}</a></li>)}
          </ol>
        </nav>

        <article className="wlx-art">
          <Sec id="advice">
            <p>{t('disclaimerPage.advice.p1')}</p>
            <p>{t('disclaimerPage.advice.p2')}</p>
            <div className="wlx-note"><Scale size={14} aria-hidden="true" /><span>{t('disclaimerPage.advice.note')}</span></div>
          </Sec>

          <Sec id="control">
            <p>{t('disclaimerPage.control.lead')}</p>
            <Items items={t('disclaimerPage.control.items')} />
          </Sec>

          <Sec id="accuracy">
            <p>{t('disclaimerPage.accuracy.lead')}</p>
            <Items items={t('disclaimerPage.accuracy.items')} vars={mail} />
          </Sec>

          <Sec id="checks">
            <p>{t('disclaimerPage.checks.p1')}</p>
            <p>{t('disclaimerPage.checks.p2')}</p>
          </Sec>

          <Sec id="compliance">
            <p>{t('disclaimerPage.compliance.p1')}</p>
            <p>{t.rich('disclaimerPage.compliance.p2', null, { security: (c) => <a href="/workcopilot/security#compliance">{c}</a>, privacy: (c) => <a href="/workcopilot/privacy">{c}</a> })}</p>
          </Sec>

          <Sec id="warranty">
            <p>{t('disclaimerPage.warranty.p1', { entity: ENTITY })}</p>
            <p>{t('disclaimerPage.warranty.p2')}</p>
            <p>{t('disclaimerPage.warranty.p3')}</p>
            <p>{t('disclaimerPage.warranty.p4')}</p>
            <div className="wlx-note"><ShieldCheck size={14} aria-hidden="true" /><span>{t.rich('disclaimerPage.warranty.note')}</span></div>
          </Sec>

          <Sec id="contact">
            <p>{t('disclaimerPage.contact.inquiries')} <a href={'mailto:' + CONTACT}>{CONTACT}</a></p>
            <p>{t('disclaimerPage.contact.support')} <a href={'mailto:' + SUPPORT}>{SUPPORT}</a></p>
          </Sec>
        </article>
      </section>

      <section className="wlx-cta" aria-label={t('disclaimerPage.cta.ariaLabel')}>
        <button className="wlx-btn" onClick={() => nav('/workcopilot/privacy')}><Lock size={16} aria-hidden="true" /> {t('disclaimerPage.cta.privacy')}</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/terms')}><Scale size={15} aria-hidden="true" /> {t('disclaimerPage.cta.terms')}</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/security')}><ShieldCheck size={15} aria-hidden="true" /> {t('disclaimerPage.cta.security')}</button>
        <a className="wlx-btn alt" href={'mailto:' + CONTACT}><Mail size={15} aria-hidden="true" /> {t('disclaimerPage.cta.contact')}</a>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot')}>{t('disclaimerPage.cta.back')} <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      </main>
      <SiteFooter />
    </div>
  )
}

// Same tokens, header, hero, note and button vocabulary as WorkSecurity (.wsx-*),
// plus a two-column document layout (sticky table of contents + article) that
// collapses to a single column, with the contents as wrapping chips, on phones.
// Kept identical to WorkPrivacy's stylesheet so the two legal pages read as one.
const CSS = `
[data-theme='dark'] .wlx{--ink:#eef0f6;--tx2:#d3d8e6;--mut:#9aa0b4;--line:rgba(255,255,255,.09);--panel:#13141f;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff;--em-fill:rgba(140,245,196,.10);--em-line:rgba(140,245,196,.34);--amber:#f5c86b;--amber-fill:rgba(245,200,107,.12);--amber-line:rgba(245,200,107,.36)}
.wlx{--ink:#161a2b;--tx2:#2b3250;--mut:#5c6484;--line:#e6e8f1;--panel:#ffffff;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--em-fill:rgba(14,159,110,.08);--em-line:rgba(14,159,110,.30);--amber:#8a5a12;--amber-fill:rgba(183,121,31,.10);--amber-line:rgba(183,121,31,.36);background:var(--bg);color:var(--ink);min-height:100vh;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
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
/* document: sticky contents + article */
/* Rail sized to its longest link (fit-content, 400px cap) so no section title
   wraps at desktop widths; mirrors components/LegalPage.jsx (QA M9). */
.wlx-doc{display:grid;grid-template-columns:fit-content(400px) minmax(0,1fr);gap:36px;align-items:start;padding-top:10px;max-width:1120px}
.wlx-toc{position:sticky;top:18px;min-width:0}
.wlx-toct{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin:0 0 10px}
.wlx-toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wlx-toc a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wlx-toc a:hover{background:var(--panel);border:1px solid var(--line);padding:6px 9px}
.wlx-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--mut);flex:0 0 auto}
/* a11y: visually hidden but read by assistive tech; visible focus ring (never outline:none) */
.wlx-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wlx a:focus-visible,.wlx button:focus-visible{outline:2px solid var(--em);outline-offset:2px;border-radius:6px}
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
.wlx-cta{max-width:1040px;margin:0 auto;padding:16px 20px 56px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wlx-btn{display:inline-flex;align-items:center;gap:8px;background:var(--em);color:#fff;border:1px solid var(--em);border-radius:11px;padding:11px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none}
.wlx-btn.alt{background:var(--panel);color:var(--ink);border-color:var(--line)}
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
