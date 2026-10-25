// WorkCoPilot - "Fields we cover": the full breadth showcase, moved off the
// short main page onto its own page (owner rule: extra content lives on
// separate pages linked from the footer; the main page stays short and salesy).
//
// FIELD_FAMILIES is the ONE place the roster lives in the renderer. The main
// page imports it for its teaser numbers, so the two can never drift (SUPREME
// RULE II: single source of truth). It mirrors docs/professions-and-disciplines.md;
// adding or renaming a field is a one-line edit here. FIELD_TOTAL is DERIVED
// from the list so the headline number is always exactly what the page shows.
// Benefit-only copy: names the fields, never the method behind the guidance.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Shapes, Code2, ShieldCheck, BrainCircuit, Kanban, Cpu,
  Landmark, Briefcase, Megaphone, HeartPulse, GraduationCap,
} from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive
import useSeo from '../useSeo.js'
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'

export const FIELD_FAMILIES = [
  { k: 'Software & engineering', ic: Code2, tone: '', wide: true,
    d: 'From the first commit to the on-call rotation.',
    items: [
      'Developer', 'Frontend & accessibility', 'Mobile development', 'Game development', 'Embedded / firmware',
      'Database', 'SDET', 'QA', 'DevOps', 'SRE', 'Network engineering', 'Sysadmin / IT ops', 'Blockchain development',
      'Backend & API development', 'Full-stack web development', 'Software architecture', 'Cloud architecture',
      'Platform engineering', 'Release management', 'ERP & CRM administration', 'Low-code & RPA automation',
    ] },
  { k: 'Security & resilience', ic: ShieldCheck, tone: 'cyan', wide: true,
    d: 'Find it, prove it, contain it, and answer for it.',
    items: [
      'Penetration testing', 'Network pentest', 'Mobile pentest', 'API security', 'Cloud security', 'DevSecOps',
      'Threat modeling', 'Incident response', 'Compliance & GRC',
      'Application security', 'Security operations (SOC)', 'Vulnerability management', 'Identity & access management',
      'Digital forensics', 'Privacy & data protection', 'Security architecture', 'Business continuity & disaster recovery',
    ] },
  { k: 'Data, AI & math', ic: BrainCircuit, tone: 'violet',
    d: 'Pipelines, models and numbers that hold up.',
    items: [
      'Data engineering', 'Data analytics', 'MLOps', 'Applied math', 'Research & science', 'Quant / FP&A',
      'Data science', 'Machine learning engineering', 'AI & prompt engineering', 'Analytics engineering',
      'Business intelligence', 'Data governance', 'Statistics & biostatistics', 'Geospatial & GIS analysis',
    ] },
  { k: 'Product, project & design', ic: Kanban, tone: 'amber',
    d: 'From the idea to the roadmap to the shipped thing.',
    items: [
      'Product management', 'Project management', 'Agile / scrum', 'Business analysis', 'UX design',
      'Program management', 'Technical program management', 'PMO & portfolio management', 'Change management',
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
  { k: 'Finance & legal', ic: Landmark, tone: 'ok',
    d: 'Books, audits, filings and contracts, done right.',
    items: [
      'Accounting & finance', 'Financial audit', 'Tax', 'Legal & contracts',
      'Accounts payable & receivable', 'Payroll', 'Treasury & cash management', 'Cost & management accounting',
      'Credit & risk analysis', 'Banking operations & AML', 'Insurance underwriting & claims',
      'Paralegal & legal research', 'Intellectual property',
    ] },
  { k: 'Business operations', ic: Briefcase, tone: 'amber',
    d: 'The work that keeps a company moving.',
    items: [
      'Sales', 'HR & recruiting', 'Customer support', 'Procurement & vendor', 'Supply chain & operations', 'Leadership',
      'Account management', 'Customer success', 'Sales operations & RevOps', 'Office & executive administration',
      'Event planning', 'Real estate & property management', 'Retail & store operations',
      'Hospitality & restaurant management', 'Logistics & transportation', 'Nonprofit & fundraising',
      'Government & public administration',
    ] },
  { k: 'Content, marketing & communication', ic: Megaphone, tone: 'pink',
    d: 'Say it well, and reach the right people.',
    items: [
      'Marketing & growth', 'Content & copywriting', 'SEO', 'Social media', 'Video & media', 'Technical writing',
      'Translation & localization',
      'Graphic & brand design', 'Brand strategy', 'Public relations & communications', 'Journalism & editing',
      'Email & lifecycle marketing', 'Paid media & advertising', 'Product marketing', 'Market research',
      'Audio & podcast production', 'Grant & proposal writing',
    ] },
  { k: 'Healthcare', ic: HeartPulse, tone: 'pink',
    d: 'Clinical and care workflows, guided with care.',
    items: [
      'Healthcare / clinical',
      'Physician practice', 'Registered nursing', 'Nurse practitioner', 'Pharmacy', 'Physical & occupational therapy',
      'Radiology & imaging', 'Medical laboratory science', 'Medical coding & billing', 'Clinical research coordination',
      'Health information management', 'Dental hygiene & practice', 'Paramedic & EMS', 'Dietetics & nutrition',
      'Behavioral health & counseling', 'Public health',
    ] },
  { k: 'Education', ic: GraduationCap, tone: 'violet',
    d: 'Teach it so it sticks.',
    items: [
      'Teaching & instructional design',
      'K-12 teaching', 'University teaching & lecturing', 'School administration', 'Academic advising',
      'Registrar & student records', 'Curriculum development', 'Special education', 'Librarian & information science',
      'Admissions & enrollment', 'E-learning development', 'Corporate training & L&D', 'Early childhood education',
      'Language teaching (ESL)', 'School counseling',
    ] },
]
export const FIELD_TOTAL = FIELD_FAMILIES.reduce((n, f) => n + f.items.length, 0)   // derived; never typed

// Texture crops so the ten reused cards never read as one repeated tile.
const TEX = ['0% 0%', '100% 0%', '50% 100%', '0% 100%', '100% 100%', '50% 0%', '0% 50%', '100% 50%', '25% 25%', '75% 75%']

export default function WorkFields() {
  const nav = useNavigate()
  useSeo({
    title: `Fields we cover - ${FIELD_TOTAL} professional fields - WorkCoPilot by AdmireVeda`,
    description: `WorkCoPilot guides work across ${FIELD_TOTAL} professional fields in ${FIELD_FAMILIES.length} families, from software and security to finance, operations, marketing, healthcare and education. One tool your whole company can use.`,
    path: '/workcopilot/fields',
  })
  // Deep links like /workcopilot/fields#security-resilience land on the family.
  useEffect(() => {
    const id = (window.location.hash || '').slice(1)
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])
  const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return (
    <div className="wfl">
      <style>{CSS}</style>
      <SiteHeader current="fields" />

      <section className="wfl-hero">
        <div className="wfl-eyebrow"><Shapes size={14} aria-hidden /> Every field &middot; one tool</div>
        <h1>Expert in your field, <em>whatever your field is.</em></h1>
        <p>One tool your whole company can use. WorkCoPilot guides work across {FIELD_TOTAL} professional fields, and the steps read like an expert in that field wrote them.</p>
        <dl className="wfl-stats" aria-label="Coverage at a glance">
          <div className="wfl-stat"><dt>professional fields</dt><dd>{FIELD_TOTAL}</dd></div>
          <div className="wfl-stat"><dt>families of work</dt><dd>{FIELD_FAMILIES.length}</dd></div>
          <div className="wfl-stat"><dt>tool for all of them</dt><dd>1</dd></div>
        </dl>
      </section>

      <section className="wfl-grid" aria-label="Families of work and the fields in each">
        {FIELD_FAMILIES.map((f, i) => (
          <WorkCard key={f.k} theme="light" tone={f.tone || undefined} delay={i * 45}
            className={f.wide ? 'wfl-wide' : ''} texPos={TEX[i % TEX.length]} style={{ scrollMarginTop: 24 }} id={slug(f.k)}>
            <WorkCard.Head icon={f.ic} eyebrow={`${f.items.length} ${f.items.length === 1 ? 'field' : 'fields'}`} title={f.k} align="start" />
            <WorkCard.Body>{f.d}</WorkCard.Body>
            <ul className="wfl-tags" aria-label={`${f.k} fields`}>
              {f.items.map((t, j) => <li key={t} className="wfl-tag" style={{ '--i': j }}>{t}</li>)}
            </ul>
          </WorkCard>
        ))}
      </section>

      <p className="wfl-cap">Not on the list by name? If it is on a screen, you are guided through it.</p>

      <section className="wfl-cta">
        <button className="wfl-btn" onClick={() => nav('/workcopilot')}>Start guiding me <ArrowRight size={15} aria-hidden /></button>
        <a className="wfl-btn alt" href="/workcopilot/use-cases">See the use cases</a>
        <a className="wfl-btn alt" href="/workcopilot/pricing">See pricing</a>
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
.wfl-hero{max-width:1160px;margin:0 auto;padding:30px 24px 6px;text-align:center}
.wfl-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wfl-hero h1{font-size:clamp(30px,4.4vw,46px);line-height:1.06;letter-spacing:-.022em;margin:0 0 14px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfl-hero h1 em{font-style:normal;background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wfl-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:600px;line-height:1.55}
/* stat triptych: big Bricolage numerals in the brand gradient, quiet labels */
.wfl-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;max-width:640px;margin:28px auto 0}
.wfl-stat{display:flex;flex-direction:column-reverse;text-align:center;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 12px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 16px 36px -26px rgba(10,13,18,.2)}
.wfl-stat dd{margin:0;font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:clamp(28px,3.6vw,40px);letter-spacing:-.02em;background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.02}
.wfl-stat dt{margin-top:6px;color:var(--dim);font-size:13px;line-height:1.35}
/* dense-flow family grid: the two biggest families span two columns */
.wfl-grid{max-width:1160px;margin:0 auto;padding:30px 24px 6px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:dense;gap:16px}
.wfl-grid .wfl-wide{grid-column:span 2}
.wfl-tags{list-style:none;padding:0;margin:2px 0 0;display:flex;flex-wrap:wrap;gap:6px}
.wfl-tag{font-size:12.5px;font-weight:500;line-height:1.3;color:var(--wc-mut,var(--mut));background:var(--panel);border:1px solid var(--wc-line,var(--line));border-radius:999px;padding:5px 11px;white-space:nowrap;transition:border-color .25s var(--wc-ease,ease),color .25s var(--wc-ease,ease),transform .35s var(--wc-ease,ease);transition-delay:0s,0s,calc(var(--i,0)*14ms)}
.wc-card:hover .wfl-tag{transform:translateY(-1px)}
.wfl-tag:hover{color:var(--wc-ink,var(--ink));border-color:color-mix(in srgb,var(--wc-ink,var(--ink)) 45%,var(--wc-line,var(--line)));transition-delay:0s}
.wfl-cap{text-align:center;color:var(--dim);font-size:14px;margin:22px auto 0;max-width:60ch;padding:0 24px}
.wfl-cta{max-width:1160px;margin:0 auto;padding:26px 24px 40px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wfl-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 20px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(10,147,196,.6)}
.wfl-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
@media(max-width:1080px){.wfl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wfl-grid{grid-template-columns:1fr}.wfl-grid .wfl-wide{grid-column:auto}.wfl-stats{gap:10px}.wfl-stat{padding:14px 8px;border-radius:13px}.wfl-stat dt{font-size:12px}}
@media(prefers-reduced-motion:reduce){.wfl-tag{transition:border-color .25s,color .25s}.wc-card:hover .wfl-tag{transform:none}}
`
