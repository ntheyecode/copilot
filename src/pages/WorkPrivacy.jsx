// WorkCoPilot - Privacy Policy (public, plain-language disclosure).
// HONESTY CONTRACT (owner-enforced): every line states a real, shipped behavior.
// No "certified", no "you are compliant", no invented entity names, addresses,
// retention periods, officers or third-party lists. Where something is user-
// controlled or not yet fixed (automatic retention), it is SAID, not implied.
// The fuller data-flow lives on /workcopilot/security; this page is the policy
// a reader can cite. Same light design language as WorkSecurity (.wsx-*).
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, ArrowRight, Monitor, Send, Database, ShieldCheck, Scale, Mail } from 'lucide-react'
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

// The three facts a reader should leave with, before the detail.
const GLANCE = [
  { icon: Monitor, tone: 'ok', eyebrow: 'On your device', title: 'Sensitive values never leave in clear', body: 'PII, PHI and secrets are stripped or tokenized on your own device, in screen text and typed text, before any request is sent. The answer is rebuilt on your device.' },
  { icon: Send, tone: 'cyan', eyebrow: 'What leaves', title: 'Only what is needed to guide the step', body: 'Downscaled screen frames (about 1280px at most) and the governed text. On the desktop app, documents are read locally and only the governed text is sent.' },
  { icon: Database, tone: 'amber', eyebrow: 'What we keep', title: 'A record of the session, until you delete it', body: 'A per-session report, audit log and your session history. Stored keys, secrets and report artifacts are encrypted at rest. There is no automatic retention timer yet, so deletion is in your hands.' },
]

// Section list drives both the sticky table of contents and the article.
const SECTIONS = [
  { id: 'about', n: '01', title: 'About this policy' },
  { id: 'collect', n: '02', title: 'What we collect' },
  { id: 'leaves', n: '03', title: 'What leaves your device' },
  { id: 'store', n: '04', title: 'What we store and for how long' },
  { id: 'protect', n: '05', title: 'How it is protected' },
  { id: 'third', n: '06', title: 'Third parties' },
  { id: 'choices', n: '07', title: 'Your choices' },
  { id: 'changes', n: '08', title: 'Changes to this policy' },
  { id: 'contact', n: '09', title: 'Contact' },
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

export default function WorkPrivacy() {
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
        <div className="wlx-eyebrow"><Lock size={14} /> Privacy Policy &middot; WorkCoPilot</div>
        <h1>How WorkCoPilot handles your data</h1>
        <p>WorkCoPilot guides you through work on your own screen. It is read-only by design, and sensitive data is stripped or tokenized on your own device before anything is sent. This page says, in plain language, what we collect, what leaves your device, what we store, and the choices you have.</p>
        <div className="wlx-meta">
          <span><b>Last updated</b> {LAST_UPDATED}</span>
          <span className="wlx-sep" aria-hidden="true" />
          <span>Plain-language disclosure of what the product does today</span>
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
          <Sec id="about">
            <p>This policy covers WorkCoPilot: the web app, the desktop app and the mobile app. It describes how the product treats your data when you sign in, run a guided session, and review your reports.</p>
            <p>It is written to be read, not to impress. Where a behavior is under your control, or where we have not finished something, we say so. The <a href="/workcopilot/security#data-handling">Security page</a> shows the full data flow, step by step, with before-and-after examples of the on-device protection.</p>
            <div className="wlx-note"><Scale size={14} /><span>This page is a plain-language disclosure of how the product works. It is not legal advice and it is not a substitute for your own legal review of how WorkCoPilot fits your obligations.</span></div>
          </Sec>

          <Sec id="collect">
            <p>WorkCoPilot works with a small set of data, most of which stays on your device.</p>
            <Items items={[
              ['Account details', 'The sign-in details for your account, such as your email address. They are supplied by you, by your company admin, or by your identity provider when your company uses enterprise single sign-on.'],
              ['Your screen and text during a session', 'What is on your screen and what you type or paste while WorkCoPilot guides you. Screen frames are read on your device (OCR), and sensitive values are redacted or tokenized there before anything is sent.'],
              ['Documents you attach', 'On the desktop app, attached documents are read and OCR\'d locally on your machine. Only the governed (redacted or tokenized) text is sent, never the file itself.'],
              ['Session records', 'A report for each session, an audit log for each session, and your session history, so you can reopen and review past work.'],
              ['Usage', 'The guided minutes you use, so your plan\'s allowance can be applied.'],
              ['Billing', 'Payment details are entered with and held by Stripe, our billing provider. We receive what is needed to run your subscription, such as your plan and its status.'],
            ]} />
          </Sec>

          <Sec id="leaves">
            <p>Before anything is sent, PII, PHI and secrets are stripped or tokenized on your own device, in both the text read from your screen and the text you type. The token-to-value map stays on your device, and the full answer is rebuilt there. The AI never sees the real sensitive values.</p>
            <Items items={[
              ['Downscaled screen frames', 'About 1280px at most. Any line holding a sensitive value is blacked out on your device before the frame is sent.'],
              ['Governed text', 'What you typed or pasted, with sensitive values already replaced by tokens on your device.'],
              ['Governed text from documents', 'On the desktop app, the text extracted locally from an attached document, after redaction and tokenization. The file itself is not sent.'],
              ['Nothing is done for you', 'WorkCoPilot is read-only. It never clicks, types, or changes a system of record on your behalf, so nothing it sends can act in your systems.'],
            ]} />
          </Sec>

          <Sec id="store">
            <p>We store a record of each session and nothing more. Your source material is not kept.</p>
            <h3>Not stored</h3>
            <Items items={[
              ['Uploaded source documents', 'Files you attach are not kept as stored source material.'],
              ['Raw screen frames', 'Frames are used to guide the current step and are not kept as stored source material.'],
              ['Real sensitive values', 'Stripped or tokenized on your device before anything is sent, so they are not ours to store.'],
            ]} />
            <h3>Stored</h3>
            <Items items={[
              ['Session report', 'One per session. It can include milestone screenshots, which are redacted on your device before they are captured. Milestone screenshots are on by default, and you or your company admin can turn them off.'],
              ['Audit log', 'One per session, recording what was transmitted, so you can see exactly what left your device.'],
              ['Session history', 'Your list of past sessions.'],
              ['Sign-in session', 'A session cookie is used to keep you signed in.'],
            ]} />
            <h3>For how long</h3>
            <p>By default data is kept until you or your company admin delete it, with no automatic deletion. An automatic retention window can be configured so that sessions older than a set number of days are purged on a schedule. Either way, you and your admin can delete a session at any time.</p>
          </Sec>

          <Sec id="protect">
            <Items items={[
              ['On-device redaction first', 'The main protection is that sensitive values are removed or tokenized on your device before any request is sent. Built-in detectors cover values such as emails, phone numbers, card numbers, SSNs, keys and private hosts, and you or your admin can add your own words and patterns.'],
              ['Encryption at rest', 'Stored keys, secrets and report artifacts, including milestone screenshots, are encrypted at rest with AES-256-GCM.'],
              ['Read-only by design', 'WorkCoPilot guides. It never runs anything in your systems, so it cannot change a system of record.'],
              ['Role-based control', 'Company admins set and lock the data policy for their members, and review the sessions of their own members.'],
            ]} />
          </Sec>

          <Sec id="third">
            <p>These are the third parties involved in providing the service.</p>
            <Items items={[
              ['The AI provider', 'Guidance is produced by an AI provider. By default it runs on the platform\'s keys. Your company, or you, can instead run WorkCoPilot on your own AI keys, which keeps the governed data inside your own provider boundary. The specific model in use is not shown to end users.'],
              ['Stripe', 'Billing and payment details are handled by Stripe.'],
              ['Your identity provider', 'When your company uses enterprise single sign-on, your identity provider authenticates you.'],
            ]} />
          </Sec>

          <Sec id="choices">
            <Items items={[
              ['Delete sessions', 'You can delete any of your sessions at any time. Deleting a session removes it.'],
              ['Company data', 'Company admins manage their company\'s data, including deleting member sessions and reviewing member reports and audit logs.'],
              ['Milestone screenshots', 'On by default. You or your company admin can turn them off.'],
              ['Your own AI keys', 'You or your company can run WorkCoPilot on your own AI keys so the governed data stays inside your boundary.'],
              ['What counts as sensitive', 'On top of the built-in detectors, you or your company admin can add custom words and patterns to redact, tokenize or block.'],
              ['Questions or requests', `Write to ${CONTACT} and we will help.`],
            ]} />
          </Sec>

          <Sec id="changes">
            <p>When this page changes, the "Last updated" date at the top changes with it. Where a change matters to how your data is handled, we will say what changed in plain language.</p>
          </Sec>

          <Sec id="contact">
            <p>Questions about this policy or about your data: <a href={'mailto:' + CONTACT}>{CONTACT}</a></p>
            <div className="wlx-note"><ShieldCheck size={14} /><span><b>Honest framing.</b> WorkCoPilot provides controls and audit evidence that support your privacy and compliance work. It does not make an organization compliant on its own, and we do not claim a certification here. Your organization, working with its own advisers, decides how the product fits your obligations.</span></div>
          </Sec>
        </article>
      </section>

      <section className="wlx-cta">
        <button className="wlx-btn" onClick={() => nav('/workcopilot/security')}><ShieldCheck size={16} /> See the full data flow</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/disclaimer')}><Scale size={15} /> Disclaimer</button>
        <a className="wlx-btn alt" href={'mailto:' + CONTACT}><Mail size={15} /> Contact</a>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} /></button>
      </section>
    </div>
  )
}

// Same tokens, header, hero, note and button vocabulary as WorkSecurity (.wsx-*),
// plus a two-column document layout (sticky table of contents + article) that
// collapses to a single column, with the contents as wrapping chips, on phones.
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
