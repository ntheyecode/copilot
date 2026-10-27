// WorkCoPilot - "Work we guide": the breadth showcase, on its own page linked
// from the footer (owner rule: extra content lives on separate pages; the main
// page stays short and salesy).
//
// HONESTY (owner supreme rule): WorkCoPilot guides people to DO and FINISH work
// on screen, step by step. Its strength is doing tasks (filing in software,
// preparing a form or invoice, configuring a tool, charting a visit, shipping
// code), NOT reviewing contracts, running audits, deep tax analysis or drafting
// long documents. So the roster below lists the DOING groups it is strong in,
// not "every field". Document-analysis professions (legal review, financial
// audit, paralegal research) are intentionally left off. Source code is the
// exception that stays, because code is a strength.
//
// FIELD_FAMILIES is the ONE place the roster lives in the renderer. WorkPage and
// the FAQ import FIELD_TOTAL / FIELD_FAMILIES.length for their numbers, so the
// pages can never drift (SUPREME RULE II: single source of truth). FIELD_TOTAL
// is DERIVED from the list, never typed. Benefit-only copy: names the work,
// never the method behind the guidance.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Shapes, Code2, ShieldCheck, BrainCircuit, Kanban, Cpu,
  Landmark, Briefcase, Megaphone, HeartPulse, GraduationCap, MonitorPlay,
} from 'lucide-react'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive
import FieldVignettes from '../components/FieldVignettes.jsx'   // real-screen photographs per field, each opening its guided session below
import GuideShowcase from '../components/GuideShowcase.jsx'     // pick a field, watch the guide console on that work
import useSeo from '../useSeo.js'
import { useT } from '../i18n/index.jsx'           // localized <title>/description (seo.* keys)
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'

export const FIELD_FAMILIES = [
  { k: 'Software & engineering', ic: Code2, tone: '', wide: true,
    d: 'Ship code, set up the stack, keep it running.',
    items: [
      'Developer', 'Frontend & accessibility', 'Mobile development', 'Game development', 'Embedded / firmware',
      'Database', 'SDET', 'QA', 'DevOps', 'SRE', 'Network engineering', 'Sysadmin / IT ops', 'Blockchain development',
      'Backend & API development', 'Full-stack web development', 'Software architecture', 'Cloud architecture',
      'Platform engineering', 'Release management', 'ERP & CRM administration', 'Low-code & RPA automation',
    ] },
  { k: 'Security & resilience', ic: ShieldCheck, tone: 'cyan', wide: true,
    d: 'Test it, break in, contain it, respond.',
    items: [
      'Penetration testing', 'Network pentest', 'Mobile pentest', 'API security', 'Cloud security', 'DevSecOps',
      'Incident response', 'Application security', 'Security operations (SOC)', 'Vulnerability management',
      'Identity & access management', 'Digital forensics', 'Malware triage', 'Red team operations',
    ] },
  { k: 'Data, AI & ML', ic: BrainCircuit, tone: 'violet',
    d: 'Build the pipeline, train the model, read the dashboard.',
    items: [
      'Data engineering', 'Data analytics', 'MLOps', 'Data science', 'Machine learning engineering',
      'AI & prompt engineering', 'Analytics engineering', 'Business intelligence', 'Geospatial & GIS',
    ] },
  { k: 'Product, project & design', ic: Kanban, tone: 'amber',
    d: 'Plan the work, run the board, design the screens.',
    items: [
      'Product management', 'Project management', 'Agile / scrum', 'UX design', 'Program management',
      'Technical program management', 'PMO & portfolio management', 'Change management',
      'User research', 'UI & visual design', 'Design systems', 'Product analytics',
    ] },
  { k: 'OT, IoT & physical systems', ic: Cpu, tone: 'cyan',
    d: 'Where the software meets the machine.',
    items: [
      'OT / ICS', 'IoT', 'Robotics', 'Aviation operations',
      'Mechanical engineering', 'Electrical engineering', 'Civil & structural engineering', 'Construction management',
      'CAD & BIM design', 'Manufacturing & quality engineering', 'Energy & utilities operations',
      'Facilities & building systems', 'Environmental health & safety',
    ] },
  { k: 'Finance & accounting', ic: Landmark, tone: 'ok',
    d: 'Books, payroll, invoices and filings, in your own tools.',
    items: [
      'Bookkeeping & accounting', 'Invoicing & billing', 'Accounts payable & receivable', 'Payroll',
      'Tax filing & returns', 'Treasury & cash management', 'Banking operations', 'Expense & reconciliation',
      'Insurance claims processing',
    ] },
  { k: 'Business operations', ic: Briefcase, tone: 'amber',
    d: 'The daily work that keeps a company moving.',
    items: [
      'Sales', 'HR & recruiting', 'Customer support', 'Procurement & vendor', 'Supply chain & operations',
      'Account management', 'Customer success', 'Sales operations & RevOps', 'Office & executive administration',
      'Event planning', 'Real estate & property management', 'Retail & store operations',
      'Hospitality & restaurant management', 'Logistics & transportation', 'Government & public administration',
    ] },
  { k: 'Content & marketing', ic: Megaphone, tone: 'pink',
    d: 'Make it, publish it, reach the right people.',
    items: [
      'Marketing & growth', 'Content & copywriting', 'SEO', 'Social media', 'Video & media',
      'Translation & localization', 'Graphic & brand design', 'Email & lifecycle marketing',
      'Paid media & advertising', 'Product marketing', 'Audio & podcast production',
    ] },
  { k: 'Healthcare', ic: HeartPulse, tone: 'pink',
    d: 'Charting, coding and care workflows, step by step.',
    items: [
      'Physician practice', 'Registered nursing', 'Nurse practitioner', 'Pharmacy', 'Physical & occupational therapy',
      'Radiology & imaging', 'Medical laboratory science', 'Medical coding & billing', 'Clinical research coordination',
      'Health information management', 'Dental hygiene & practice', 'Paramedic & EMS', 'Dietetics & nutrition',
      'Behavioral health & counseling', 'Public health',
    ] },
  { k: 'Education', ic: GraduationCap, tone: 'violet',
    d: 'Set up the class, the records, and the lessons.',
    items: [
      'K-12 teaching', 'University teaching & lecturing', 'School administration', 'Academic advising',
      'Registrar & student records', 'Special education', 'Librarian & information science',
      'Admissions & enrollment', 'E-learning development', 'Corporate training & L&D', 'Early childhood education',
      'Language teaching (ESL)', 'School counseling',
    ] },
]
export const FIELD_TOTAL = FIELD_FAMILIES.reduce((n, f) => n + f.items.length, 0)   // derived; never typed

// Texture crops so the reused cards never read as one repeated tile.
const TEX = ['0% 0%', '100% 0%', '50% 100%', '0% 100%', '100% 100%', '50% 0%', '0% 50%', '100% 50%', '25% 25%', '75% 75%']

export default function WorkFields() {
  const nav = useNavigate()
  const t = useT()
  useSeo({
    title: t('seo.fields.title', { total: FIELD_TOTAL, families: FIELD_FAMILIES.length }),
    description: t('seo.fields.description', { total: FIELD_TOTAL, families: FIELD_FAMILIES.length }),
    path: '/workcopilot/fields',
  })
  const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  // Deep links like /workcopilot/fields#security-and-resilience land on the group.
  useEffect(() => {
    const id = (window.location.hash || '').slice(1)
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <div className="wfl">
      <style>{CSS}</style>
      <SiteHeader current="fields" />

      <section className="wfl-hero">
        <div className="wfl-eyebrow"><Shapes size={14} aria-hidden /> Work we guide</div>
        <h1>Find your work. We guide it <em>step by step.</em></h1>
        <p>WorkCoPilot walks you through doing real tasks in the tools you already use, one step at a time. These are the groups of work it is strong in.</p>
        <p className="wfl-note">Our strength is doing and finishing tasks on screen. Long-document review and deep analysis are not what it is for.</p>
        <div className="wfl-cta-row">
          <button className="wfl-btn" onClick={() => nav('/workcopilot')}>Start guiding me <ArrowRight size={15} aria-hidden /></button>
          <a className="wfl-btn alt" href="/workcopilot/use-cases">See the use cases</a>
        </div>
      </section>

      <nav className="wfl-jumps" aria-label="Jump to a group of work">
        {FIELD_FAMILIES.map((f) => (
          <a key={f.k} className="wfl-jump" href={`#${slug(f.k)}`}>
            <f.ic size={14} aria-hidden /> {f.k}
          </a>
        ))}
      </nav>

      {/* REAL SCREENS: seven field photographs, each a link to that field's
          guided session in the showcase further down (#watch-<id>). */}
      <section className="wfl-vig" aria-labelledby="wfl-vig-h">
        <div className="wfl-sec-head">
          <div className="wfl-eyebrow"><MonitorPlay size={14} aria-hidden /> {t('fieldsPage.vignettesEyebrow')}</div>
          <h2 id="wfl-vig-h">{t('fieldsPage.vignettesH2')}</h2>
          <p>{t('fieldsPage.vignettesSub')}</p>
        </div>
        <FieldVignettes to="/workcopilot/fields" className="wfl-fv" />
      </section>

      <section className="wfl-grid" aria-label="Groups of work and the fields in each">
        {FIELD_FAMILIES.map((f, i) => (
          <WorkCard key={f.k} theme="light" tone={f.tone || undefined} delay={i * 45}
            className={f.wide ? 'wfl-wide' : ''} texPos={TEX[i % TEX.length]} style={{ scrollMarginTop: 24 }} id={slug(f.k)}>
            <WorkCard.Head icon={f.ic} eyebrow={`${f.items.length} ${f.items.length === 1 ? 'field' : 'fields'}`} title={f.k} align="start" />
            <WorkCard.Body>{f.d}</WorkCard.Body>
            <ul className="wfl-tags" aria-label={`${f.k} fields`}>
              {f.items.map((tag, j) => <li key={tag} className="wfl-tag" style={{ '--i': j }}>{tag}</li>)}
            </ul>
          </WorkCard>
        ))}
      </section>

      {/* PICK A FIELD: the shared showcase, the target of the vignette links. */}
      <section className="wfl-show" id="watch" aria-labelledby="wfl-show-h">
        <div className="wfl-sec-head">
          <div className="wfl-eyebrow"><Shapes size={14} aria-hidden /> {t('fieldsPage.showcaseEyebrow')}</div>
          <h2 id="wfl-show-h">{t('fieldsPage.showcaseH2')}</h2>
        </div>
        <div className="wfl-show-body"><GuideShowcase idPrefix="wfl" /></div>
      </section>

      <section className="wfl-cta">
        <div className="wfl-cta-card">
          <h2>Your work is probably in here.</h2>
          <p>Pick it on screen and WorkCoPilot takes you through it, one step at a time.</p>
          <div className="wfl-cta-row">
            <button className="wfl-btn" onClick={() => nav('/workcopilot')}>Start guiding me <ArrowRight size={15} aria-hidden /></button>
            <a className="wfl-btn alt" href="/workcopilot/pricing">See pricing</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

// Same light inner-page shell as /how-it-works and /security (tokens, dot grid,
// Bricolage display + Figtree body) so the page reads as native.
const CSS = `
[data-theme='dark'] .wfl{--ink:#eef0f6;--mut:#9aa0b4;--dim:#6c7780;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.15);--panel:#13141f;--panel2:#181b27;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff}
.wfl{--ink:#161a2b;--mut:#5c6484;--dim:#8b93a1;--line:#e6e8f1;--line-strong:#d3d7e5;--panel:#ffffff;--panel2:#f6f8fd;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    var(--bg)}
.wfl *{box-sizing:border-box}
.wfl a{color:inherit;text-decoration:none}
.wfl::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wfl>*{position:relative;z-index:1}
.wfl :focus-visible{outline:2px solid var(--cy);outline-offset:3px;border-radius:8px}
.wfl-hero{max-width:860px;margin:0 auto;padding:34px 24px 6px;text-align:center}
.wfl-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wfl-hero h1{font-size:clamp(30px,4.4vw,46px);line-height:1.06;letter-spacing:-.022em;margin:0 0 14px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfl-hero h1 em{font-style:normal;background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wfl-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:600px;line-height:1.55}
.wfl-note{margin-top:12px !important;font-size:14.5px;color:var(--dim)}
.wfl-cta-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:22px}
/* quick-jump nav: pill per group, each nowrap, the row wraps cleanly */
.wfl-jumps{max-width:1000px;margin:26px auto 0;padding:0 24px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.wfl-jump{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;font-size:12.5px;font-weight:600;color:var(--mut);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 12px;box-shadow:0 1px 2px rgba(10,13,18,.04);transition:border-color .2s ease,color .2s ease,transform .2s ease}
.wfl-jump svg{color:var(--em);flex-shrink:0}
.wfl-jump:hover{color:var(--ink);border-color:var(--line-strong);transform:translateY(-1px)}
/* section heads shared by the vignettes and the showcase */
.wfl-sec-head{max-width:760px;margin:0 auto 18px;padding:0 24px;text-align:center}
.wfl-sec-head h2{font-size:clamp(24px,3vw,32px);line-height:1.1;letter-spacing:-.02em;margin:0 0 10px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;text-wrap:balance}
.wfl-sec-head p{color:var(--mut);font-size:15.5px;margin:0;line-height:1.55}
.wfl-vig{max-width:1160px;margin:30px auto 0;padding:0 24px}
.wfl-fv{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:1080px){.wfl-fv{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.wfl-fv{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:380px){.wfl-fv{grid-template-columns:1fr}}
.wfl-show{max-width:1160px;margin:34px auto 0;padding:0 24px;scroll-margin-top:24px}
.wfl-show-body{max-width:760px;margin:0 auto}
/* dense-flow group grid: the two biggest groups span two columns */
.wfl-grid{max-width:1160px;margin:0 auto;padding:28px 24px 6px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:dense;gap:16px}
.wfl-grid .wfl-wide{grid-column:span 2}
.wfl-tags{list-style:none;padding:0;margin:2px 0 0;display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px}
.wfl-tag{font-size:12.5px;font-weight:500;line-height:1.3;color:var(--wc-mut,var(--mut));background:var(--panel);border:1px solid var(--wc-line,var(--line));border-radius:999px;padding:5px 11px;max-width:100%;white-space:normal;overflow-wrap:break-word;transition:border-color .25s var(--wc-ease,ease),color .25s var(--wc-ease,ease),transform .35s var(--wc-ease,ease);transition-delay:0s,0s,calc(var(--i,0)*14ms)}
.wc-card:hover .wfl-tag{transform:translateY(-1px)}
.wfl-tag:hover{color:var(--wc-ink,var(--ink));border-color:color-mix(in srgb,var(--wc-ink,var(--ink)) 45%,var(--wc-line,var(--line)));transition-delay:0s}
/* closing CTA: one clear panel, strong primary action */
.wfl-cta{max-width:1160px;margin:0 auto;padding:30px 24px 44px}
.wfl-cta-card{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:34px 26px;text-align:center;box-shadow:0 1px 2px rgba(10,13,18,.04),0 24px 48px -34px rgba(10,13,18,.28)}
.wfl-cta-card h2{margin:0 0 8px;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;font-size:clamp(22px,2.6vw,30px);letter-spacing:-.02em;color:var(--ink)}
.wfl-cta-card p{margin:0 auto;max-width:460px;color:var(--mut);font-size:15.5px;line-height:1.55}
.wfl-cta-card .wfl-cta-row{margin-top:20px}
.wfl-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 20px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(10,147,196,.6)}
.wfl-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
@media(max-width:1080px){.wfl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wfl-grid{grid-template-columns:1fr}.wfl-grid .wfl-wide{grid-column:auto}}
@media(prefers-reduced-motion:reduce){.wfl-tag,.wfl-jump{transition:border-color .25s,color .25s}.wc-card:hover .wfl-tag{transform:none}}
`
