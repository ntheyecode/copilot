// WorkCoPilot - Disclaimer (public, plain-language).
// HONESTY CONTRACT (owner-enforced): guidance is not professional advice; the
// product is read-only and the reader decides what to run; AI can be wrong; the
// security checks are a backstop, not a promise; the product supports compliance
// but does not confer it. Plain language, no dense legalese, no invented entity
// names or jurisdictions. Same light design language as WorkSecurity (.wsx-*).
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ArrowLeft, ArrowRight, Compass, Hand, AlertTriangle, ShieldCheck, Lock, Mail } from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive

const LAST_UPDATED = '2026-10-22'
const CONTACT = 'sales@admireveda.com'

// Brand fonts, loaded once (same link the sign-in and marketing pages use).
const FONT_ID = 'work-legal-fonts'
function ensureFonts() {
  if (typeof document === 'undefined' || document.getElementById(FONT_ID)) return
  const l = document.createElement('link')
  l.id = FONT_ID; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
  document.head.appendChild(l)
}

// The three things a reader should leave with, before the detail.
const GLANCE = [
  { icon: Compass, tone: 'cyan', eyebrow: 'Guidance', title: 'Practical help, not professional advice', body: 'WorkCoPilot shows you a sensible next step on your own screen. It is not legal, financial, medical, tax or other professional advice.' },
  { icon: Hand, tone: 'ok', eyebrow: 'Your hands', title: 'You decide what to run', body: 'It is read-only. It never clicks, types or runs anything for you. Destructive steps are flagged for you to confirm before you act.' },
  { icon: AlertTriangle, tone: 'amber', eyebrow: 'Accuracy', title: 'Verify before you rely on it', body: 'Guidance is best-effort. AI can be wrong or out of date, and the built-in security checks are a backstop, not a promise.' },
]

// Section list drives both the sticky table of contents and the article.
const SECTIONS = [
  { id: 'advice', n: '01', title: 'Guidance, not professional advice' },
  { id: 'control', n: '02', title: 'You are in control, and responsible' },
  { id: 'accuracy', n: '03', title: 'Accuracy and the limits of AI' },
  { id: 'checks', n: '04', title: 'Security checks are a backstop' },
  { id: 'compliance', n: '05', title: 'Compliance' },
  { id: 'warranty', n: '06', title: 'No warranty and limitation of liability' },
  { id: 'contact', n: '07', title: 'Contact' },
]

function Sec({ id, children }) {
  const s = SECTIONS.find((x) => x.id === id)
  return (
    <section className="wlx-sec" id={id}>
      <h2><span className="wlx-n">{s.n}</span>{s.title}</h2>
      {children}
    </section>
  )
}

function Items({ items }) {
  return (
    <ul className="wlx-list">
      {items.map(([name, how]) => (
        <li key={name}><span className="wlx-name">{name}</span><span className="wlx-how">{how}</span></li>
      ))}
    </ul>
  )
}

export default function WorkDisclaimer() {
  const nav = useNavigate()
  useEffect(() => { ensureFonts() }, [])
  return (
    <div className="wlx">
      <style>{CSS}</style>
      <header className="wlx-top">
        <a href="/workcopilot" aria-label="AdmireVeda"><AdmireVedaLogo size={24} /></a>
        <button className="wlx-back" onClick={() => nav('/workcopilot')}><ArrowLeft size={15} /> WorkCoPilot</button>
      </header>

      <section className="wlx-hero">
        <div className="wlx-eyebrow"><Scale size={14} /> Disclaimer &middot; WorkCoPilot</div>
        <h1>What WorkCoPilot is, and what it is not</h1>
        <p>WorkCoPilot gives you practical, step-by-step guidance on your own screen so you can get work done. It does not act for you, it is not professional advice, and it can be wrong. This page sets out those limits in plain language so you know where you stand.</p>
        <div className="wlx-meta">
          <span><b>Last updated</b> {LAST_UPDATED}</span>
          <span className="wlx-sep" aria-hidden="true" />
          <span>Plain-language terms, written to be read</span>
        </div>
      </section>

      <section className="wlx-block">
        <div className="wlx-glance">
          {GLANCE.map((g, i) => {
            const Ic = g.icon
            return (
              <WorkCard key={g.eyebrow} theme="light" tone={g.tone} delay={i * 70} texPos={['0% 0%', '50% 50%', '100% 100%'][i]} className="wlx-gcard">
                <WorkCard.Head icon={Ic} eyebrow={g.eyebrow} title={g.title} />
                <WorkCard.Body>{g.body}</WorkCard.Body>
              </WorkCard>
            )
          })}
        </div>
      </section>

      <section className="wlx-block wlx-doc">
        <nav className="wlx-toc" aria-label="On this page">
          <div className="wlx-toct">On this page</div>
          <ol>
            {SECTIONS.map((s) => <li key={s.id}><a href={'#' + s.id}><span className="wlx-n">{s.n}</span>{s.title}</a></li>)}
          </ol>
        </nav>

        <article className="wlx-art">
          <Sec id="advice">
            <p>WorkCoPilot gives practical guidance to help you act: what to look at next, what to click, what a setting means, how a command is usually written. It is a working aid.</p>
            <p>It is not legal, financial, medical, tax, accounting, engineering or other professional advice, and using it does not create a professional relationship with us. Where a step touches money, health, legal duties, safety or regulated work, confirm it against your own requirements and with a qualified professional before you rely on it.</p>
            <div className="wlx-note"><Scale size={14} /><span>This page is a plain-language statement of the product's limits. It is not a substitute for your own legal review of how WorkCoPilot fits your situation.</span></div>
          </Sec>

          <Sec id="control">
            <p>WorkCoPilot is read-only by design. It watches your screen, with sensitive values redacted on your device, and tells you what it would do next. It never clicks, types, submits, or runs anything for you.</p>
            <Items items={[
              ['You decide what to run', 'Every action in your systems is yours. You choose whether to follow a step, change it, or stop.'],
              ['Destructive steps are flagged', 'When a suggested step could delete, overwrite, pay, send, or otherwise be hard to undo, WorkCoPilot flags it so you can confirm it deliberately before you act.'],
              ['Your systems, your rules', 'You remain responsible for having the right permissions, following your employer\'s and your customers\' policies, and keeping to the terms of the tools you use.'],
              ['Your accounts', 'You are responsible for keeping your sign-in details safe and for what is done under your account.'],
            ]} />
          </Sec>

          <Sec id="accuracy">
            <p>Guidance is produced with the help of AI and is best-effort. AI can misread a screen, miss context, be out of date about a tool that has changed, or simply be wrong. It can sound confident while being wrong.</p>
            <Items items={[
              ['Verify before you rely on it', 'Check anything that matters against the tool\'s own documentation, your own records, or a person who knows the system.'],
              ['Screens are read, not understood perfectly', 'WorkCoPilot reads your screen on your device, after redaction. Small text, unusual layouts and redacted values can lead to a wrong read.'],
              ['Tools change', 'Menus, commands and defaults move. A step that was right last month may not be right today.'],
              ['Tell us', `If guidance was wrong or unsafe, write to ${CONTACT} so we can look into it.`],
            ]} />
          </Sec>

          <Sec id="checks">
            <p>WorkCoPilot writes commands, code and scripts the secure way by default and runs checks for common problems such as injection, exposed secrets and over-broad permissions before it gives them to you. It also looks at dependencies it suggests.</p>
            <p>Those checks are a helpful backstop. They are not a guarantee that a command, script or dependency is safe, correct, or right for your environment. Review what you run, test it where it is safe to test, and keep your own security controls in place.</p>
          </Sec>

          <Sec id="compliance">
            <p>WorkCoPilot provides controls and audit evidence that support your compliance work: on-device redaction and tokenization, read-only operation, per-company data policies that admins arm and lock, and per-session reports and audit logs.</p>
            <p>Those controls do not make you compliant, and we do not claim that the product is certified against any framework. Compliance is achieved and held by your organization, working with its own auditors and advisers. See the <a href="/workcopilot/security#compliance">Security page</a> for how the controls map to common frameworks, and the <a href="/workcopilot/privacy">Privacy Policy</a> for how your data is handled.</p>
          </Sec>

          <Sec id="warranty">
            <p>WorkCoPilot is provided as is and as available. To the extent the law allows, we make no warranty, express or implied, about the guidance, including that it is accurate, complete, current, fit for a particular purpose, or free of errors.</p>
            <p>To the extent the law allows, we are not liable for loss or damage arising from actions you take, or do not take, based on the guidance, including lost data, lost revenue, downtime, or costs of recovery. You act on the guidance at your own discretion, and you remain responsible for the outcome in your systems.</p>
            <p>Nothing on this page limits rights that cannot be limited under the law that applies to you.</p>
            <div className="wlx-note"><ShieldCheck size={14} /><span><b>Why this is here.</b> It would be easy to write a page of dense legalese. We would rather be clear: WorkCoPilot is a guide that never acts for you, and the judgment and the responsibility stay with you.</span></div>
          </Sec>

          <Sec id="contact">
            <p>Questions about this page: <a href={'mailto:' + CONTACT}>{CONTACT}</a></p>
          </Sec>
        </article>
      </section>

      <section className="wlx-cta">
        <button className="wlx-btn" onClick={() => nav('/workcopilot/privacy')}><Lock size={16} /> Privacy Policy</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/security')}><ShieldCheck size={15} /> Security</button>
        <a className="wlx-btn alt" href={'mailto:' + CONTACT}><Mail size={15} /> Contact</a>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} /></button>
      </section>
    </div>
  )
}

// Same tokens, header, hero, note and button vocabulary as WorkSecurity (.wsx-*),
// plus a two-column document layout (sticky table of contents + article) that
// collapses to a single column, with the contents as wrapping chips, on phones.
// Kept identical to WorkPrivacy's stylesheet so the two legal pages read as one.
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
.wlx-block{max-width:1040px;margin:0 auto;padding:30px 20px}
.wlx-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.wlx-gcard{min-width:0}
.wlx-gcard .wc-title{font-size:18px}
/* document: sticky contents + article */
.wlx-doc{display:grid;grid-template-columns:220px minmax(0,1fr);gap:36px;align-items:start;padding-top:10px}
.wlx-toc{position:sticky;top:18px;min-width:0}
.wlx-toct{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin:0 0 10px}
.wlx-toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wlx-toc a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wlx-toc a:hover{background:#fff;border:1px solid var(--line);padding:6px 9px}
.wlx-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:#94a3b8;flex:0 0 auto}
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
