// WorkCoPilot - Privacy Policy (public, plain-language disclosure).
// HONESTY CONTRACT (owner-enforced): every line states a real, shipped behavior.
// No "certified", no "you are compliant", no invented addresses, retention
// periods, officers or third-party lists. The legal entity (COE Security LLC) is
// named as controller, per the owner's ownership hierarchy. Where something is
// user-controlled (deletion, or a configurable retention window), it is SAID, not implied.
// States guarantees, not mechanisms (docs/business-rules.md).
// The fuller data-flow lives on /workcopilot/security; this page is the policy
// a reader can cite. Same light design language as WorkSecurity (.wsx-*).
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, ArrowRight, Monitor, Send, Database, ShieldCheck, Scale, Mail, Gavel, FileSignature } from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive
import useSeo from '../useSeo.js'                  // per-route title / description / canonical (WEB-01)

const LAST_UPDATED = '2026-10-23'
const CONTACT = 'support@coesecurity.com'          // security, legal, privacy, DPA
const SUPPORT = 'support@admireveda.com'           // product support, billing
const ENTITY = 'COE Security LLC'
const OWNERSHIP = 'WorkCoPilot, by AdmireVeda, a product of COE Security LLC.'
const TEMPLATE_NOTICE = 'This is a template provided for transparency and is being finalized with legal counsel; it is not yet a binding agreement.'

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
  { icon: Send, tone: 'cyan', eyebrow: 'What leaves', title: 'Only what is needed to guide the step', body: 'Reduced-size screen frames and the governed text. On the desktop app, documents are read locally and only the governed text is sent.' },
  { icon: Database, tone: 'amber', eyebrow: 'What we keep', title: 'A record of the session, until you delete it', body: 'A per-session report, audit log and your session history. Stored keys, secrets and report artifacts are encrypted at rest. Data is kept until you or your admin delete it, or a configured retention window purges older sessions on a schedule.' },
]

// Section list drives both the sticky table of contents and the article.
const SECTIONS = [
  { id: 'about', n: '01', title: 'About this policy' },
  { id: 'collect', n: '02', title: 'What we collect' },
  { id: 'categories', n: '03', title: 'Data categories' },
  { id: 'leaves', n: '04', title: 'What leaves your device' },
  { id: 'store', n: '05', title: 'What we store and for how long' },
  { id: 'protect', n: '06', title: 'How it is protected' },
  { id: 'third', n: '07', title: 'Third parties' },
  { id: 'choices', n: '08', title: 'Your choices and rights' },
  { id: 'changes', n: '09', title: 'Changes to this policy' },
  { id: 'contact', n: '10', title: 'Contact' },
]

function Sec({ id, children }) {
  const s = SECTIONS.find((x) => x.id === id)
  return (
    <section className="wlx-sec" id={id} aria-labelledby={id + '-h'}>
      <h2 id={id + '-h'}><span className="wlx-n" aria-hidden="true">{s.n}</span>{s.title}</h2>
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

// Accessibility (WEB-08): one <main>, a single H1, a hidden H2 over the glance
// cards (WorkCard.Head renders H3s), decorative icons hidden, visible focus rings.
export default function WorkPrivacy() {
  const nav = useNavigate()
  useSeo({
    title: 'Privacy Policy - WorkCoPilot by AdmireVeda',
    description: 'What WorkCoPilot collects, what leaves your device after on-device redaction, what is stored and for how long (including de-identified learnings that keep guidance current), how it is protected, the third parties involved, and your rights and choices.',
    path: '/workcopilot/privacy',
  })
  useEffect(() => { ensureFonts() }, [])
  return (
    <div className="wlx">
      <style>{CSS}</style>
      <SiteHeader />

      <main id="main">
      <section className="wlx-hero">
        <div className="wlx-eyebrow"><Lock size={14} aria-hidden="true" /> Privacy Policy &middot; WorkCoPilot</div>
        <h1>How WorkCoPilot handles your data</h1>
        <p>WorkCoPilot guides you through work on your own screen. It is read-only by design, and sensitive data is stripped or tokenized on your own device before anything is sent. This page says, in plain language, what we collect, what leaves your device, what we store, and the choices you have.</p>
        <div className="wlx-meta">
          <span><b>Last updated</b> {LAST_UPDATED}</span>
          <span className="wlx-sep" aria-hidden="true" />
          <span>Plain-language disclosure of what the product does today</span>
        </div>
        <div className="wlx-template" role="note"><b>Template.</b> {TEMPLATE_NOTICE}</div>
        <div className="wlx-owner">{OWNERSHIP}</div>
      </section>

      <section className="wlx-block" aria-labelledby="wlx-glance-h">
        <h2 id="wlx-glance-h" className="wlx-sr">At a glance</h2>
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
        <nav className="wlx-toc" aria-labelledby="wlx-toc-h">
          <div className="wlx-toct" id="wlx-toc-h">On this page</div>
          <ol>
            {SECTIONS.map((s) => <li key={s.id}><a href={'#' + s.id}><span className="wlx-n" aria-hidden="true">{s.n}</span>{s.title}</a></li>)}
          </ol>
        </nav>

        <article className="wlx-art">
          <Sec id="about">
            <p>This policy covers WorkCoPilot: the web app, the desktop app and the mobile app. It describes how the product treats your data when you sign in, run a guided session, and review your reports.</p>
            <p><b>Who is responsible.</b> WorkCoPilot is offered by AdmireVeda, a product of {ENTITY}. {ENTITY} is the legal entity and the controller of the account, sign-in and billing details described below. For the content of your guided sessions, your organization decides what is shared and {ENTITY} acts on its behalf as described in the <a href="/workcopilot/dpa">Data Processing Addendum</a>.</p>
            <p>It is written to be read, not to impress. Where a behavior is under your control, or where we have not finished something, we say so. The <a href="/workcopilot/security#data-handling">Security page</a> shows the full data flow, step by step, with before-and-after examples of the on-device protection.</p>
            <div className="wlx-note"><Scale size={14} aria-hidden="true" /><span>This page is a plain-language disclosure of how the product works. It is not legal advice and it is not a substitute for your own legal review of how WorkCoPilot fits your obligations.</span></div>
          </Sec>

          <Sec id="collect">
            <p>WorkCoPilot works with a small set of data, most of which stays on your device.</p>
            <Items items={[
              ['Account details', 'The sign-in details for your account, such as your email address. They are supplied by you, by your company admin, or by your identity provider when your company uses enterprise single sign-on.'],
              ['Your screen and text during a session', 'What is on your screen and what you type or paste while WorkCoPilot guides you. Screen frames are read on your device, and sensitive values are redacted or tokenized there before anything is sent.'],
              ['Documents you attach', 'On the desktop app, attached documents are read locally on your machine. Only the governed (redacted or tokenized) text is sent, never the file itself.'],
              ['Session records', 'A report for each session, an audit log for each session, and your session history, so you can reopen and review past work.'],
              ['Usage', 'The guided minutes you use, so your plan\'s allowance can be applied.'],
              ['What it learns about tools', 'To keep guidance current, WorkCoPilot may keep generalized, de-identified learnings about how a tool or task currently works, such as where a setting now lives. These contain no personal data, secrets, screen images or document content. For a company account they are kept in that company\'s own knowledge base and benefit only its members; for individual accounts they are kept in our platform knowledge base to improve the service for everyone.'],
              ['Billing', 'Payment details are entered with and held by Stripe, our billing provider. We receive what is needed to run your subscription, such as your plan and its status.'],
            ]} />
          </Sec>

          <Sec id="categories">
            <p>WorkCoPilot is designed for everyday working screens and text. Use it for the kinds of data below, and keep to the limits that follow.</p>
            <h3>What it is designed for</h3>
            <Items items={[
              ['Work screens and text', 'Business applications, consoles, tickets, dashboards, spreadsheets, documents, code and commands that you are working in and are authorized to use.'],
              ['Incidental personal data', 'Names, work email addresses, identifiers and similar details that appear in the course of that work.'],
              ['Account and billing details', 'Sign-in details, plan and usage, as described above.'],
            ]} />
            <h3>What not to submit</h3>
            <p>Do not submit data you are not authorized to process, data belonging to others that you have no right to share, or data your organization or the law forbids you from sharing with a service like this. If your work involves regulated data, make sure your organization has approved that use first. The <a href="/workcopilot/acceptable-use">Acceptable Use Policy</a> sets out the rules in full.</p>
            <h3>Sensitive data stays protected</h3>
            <p>Sensitive data such as personal data, health data, secrets, keys and card numbers is stripped or tokenized on your own device before anything is sent, and you or your company admin can add your own words and patterns. This is a safeguard, and it does not replace your own duty to share only what you are allowed to.</p>
          </Sec>

          <Sec id="leaves">
            <p>Before anything is sent, PII, PHI and secrets are stripped or tokenized on your own device, in both the text read from your screen and the text you type. The real values stay on your device, and the full answer is rebuilt there. The AI never sees the real sensitive values.</p>
            <Items items={[
              ['Reduced-size screen frames', 'Reduced in size before sending. Any line holding a sensitive value is blacked out on your device before the frame is sent.'],
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
              ['Generalized learnings', 'De-identified facts about how tools and tasks currently work, kept so future guidance stays current. They hold no personal data, secrets, screens or document content, and they are not tied to any one session, so deleting a session does not change them. A company\'s learnings stay within that company\'s knowledge base and are removed with the company account, or earlier on request.'],
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
            <p>Wherever the law gives you them, you have these rights over your personal data. You can use the tools in the product, or write to us and we will help.</p>
            <Items items={[
              ['Access', 'Ask what personal data we hold about you and get a copy. Your session reports and history are available to you in the product.'],
              ['Correction', 'Ask us to correct personal data that is wrong or incomplete. You can update your own account details, or ask us to.'],
              ['Deletion', 'Ask us to delete your personal data. You can delete your own sessions at any time, and we will delete your account data on request, subject to any duty to keep a record that the law requires.'],
              ['Export', 'Ask for your data in a portable format that you can take elsewhere.'],
              ['Objection and limits', 'Ask us to limit or stop processing where the law gives you that right.'],
              ['Company accounts', 'If your account is managed by your company, some requests go through your company admin, who controls your company\'s data and its settings.'],
            ]} />
            <h3>Your choices</h3>
            <Items items={[
              ['Delete sessions', 'You can delete any of your sessions at any time. Deleting a session removes it.'],
              ['Company data', 'Company admins manage their company\'s data, including deleting member sessions and reviewing member reports and audit logs.'],
              ['Milestone screenshots', 'On by default. You or your company admin can turn them off.'],
              ['Your own AI keys', 'You or your company can run WorkCoPilot on your own AI keys so the governed data stays inside your boundary.'],
              ['What counts as sensitive', 'On top of the built-in detectors, you or your company admin can add custom words and patterns to redact, tokenize or block.'],
              ['Questions or requests', `For privacy requests, write to ${CONTACT}. For product help or billing, write to ${SUPPORT}.`],
            ]} />
          </Sec>

          <Sec id="changes">
            <p>When this page changes, the "Last updated" date at the top changes with it. Where a change matters to how your data is handled, we will say what changed in plain language.</p>
          </Sec>

          <Sec id="contact">
            <p>Privacy, legal and security inquiries: <a href={'mailto:' + CONTACT}>{CONTACT}</a></p>
            <p>Product support and billing: <a href={'mailto:' + SUPPORT}>{SUPPORT}</a></p>
            <div className="wlx-note"><ShieldCheck size={14} aria-hidden="true" /><span><b>Honest framing.</b> WorkCoPilot provides controls and audit evidence that support your privacy and compliance work. It does not make an organization compliant on its own, and we do not claim a certification here. Your organization, working with its own advisers, decides how the product fits your obligations.</span></div>
          </Sec>
        </article>
      </section>

      <section className="wlx-cta" aria-label="Related pages">
        <button className="wlx-btn" onClick={() => nav('/workcopilot/security')}><ShieldCheck size={16} aria-hidden="true" /> See the full data flow</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/terms')}><Gavel size={15} aria-hidden="true" /> Terms</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/dpa')}><FileSignature size={15} aria-hidden="true" /> DPA</button>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot/disclaimer')}><Scale size={15} aria-hidden="true" /> Disclaimer</button>
        <a className="wlx-btn alt" href={'mailto:' + CONTACT}><Mail size={15} aria-hidden="true" /> Contact</a>
        <button className="wlx-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      </main>
      <SiteFooter />
    </div>
  )
}

// Same tokens, header, hero, note and button vocabulary as WorkSecurity (.wsx-*),
// plus a two-column document layout (sticky table of contents + article) that
// collapses to a single column, with the contents as wrapping chips, on phones.
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
.wlx-doc{display:grid;grid-template-columns:220px minmax(0,1fr);gap:36px;align-items:start;padding-top:10px}
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
