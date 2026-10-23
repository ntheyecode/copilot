// WorkCoPilot - Data protection showcase (dedicated page, linked from the short
// main page). Shows the REAL on-device protection: sensitive values blacked out
// in a screen before a frame is sent, and sensitive values replaced by reversible
// tokens in the text that reaches the AI (the map stays on the device, so the
// answer is rebuilt locally). The text sample is real output of the shipped
// on-device protection; the screen is a representative app view. PUBLIC PAGE:
// state the guarantee (what is protected, what leaves), never the mechanism.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, ScanEye, FileText, ArrowLeft, ArrowRight, Check, Globe, HeartPulse, Landmark, BadgeCheck, Building2, Monitor, Send, Database, EyeOff, Trash2, KeyRound, Route, Undo2 } from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive
import useSeo from '../useSeo.js'                  // per-route title / description / canonical (WEB-01)

// A representative integration screen. `redacted` swaps each sensitive value for
// an on-device mask, exactly what the frame redactor does before a frame is sent.
const FIELDS = [
  { k: 'Billing email', v: 'jordan.michaels@northwind-trading.com', s: true },
  { k: 'Phone', v: '+1 (312) 555-0148', s: true },
  { k: 'Card on file', v: '4539 1488 0343 6467', s: true },
  { k: 'API key', v: 'AKIA3F7Q9ZLM2XR8KD1', s: true },
  { k: 'Tax ID', v: '84-3920117', s: true },
  { k: 'Webhook host', v: '10.20.14.7', s: true },
  { k: 'Plan', v: 'Business', s: false },
  { k: 'Status', v: 'Connected', s: false, ok: true },
]
function ScreenMock({ redacted }) {
  return (
    <div className="wsx-screen" role="img" aria-label={redacted ? 'App screen after on-device protection, with sensitive values blacked out' : 'App screen before protection, showing sensitive values'}>
      <div className="wsx-side">
        <div className="wsx-brand"><span className="wsx-dot" /> NorthWind Ops</div>
        {['Dashboard', 'Customers', 'Billing', 'Integrations', 'Settings'].map((n) => (
          <div key={n} className={'wsx-nav' + (n === 'Integrations' ? ' on' : '')}>{n}</div>
        ))}
      </div>
      <div className="wsx-main">
        <div className="wsx-crumb">Integrations <span>/</span> <b>Payment gateway</b></div>
        <div className="wsx-card">
          <div className="wsx-ctitle">Connection details</div>
          {FIELDS.map((f) => (
            <div className="wsx-row" key={f.k}>
              <span className="wsx-key">{f.k}</span>
              {f.s && redacted
                ? <span className="wsx-mask" />
                : <span className={'wsx-val' + (f.ok ? ' ok' : '')}>{f.ok && <span className="wsx-okdot" />}{f.v}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Render the sent-to-AI text with the tokens shown as chips.
function TokenText({ text }) {
  const parts = String(text).split(/(\[\[[A-Z]+_\d+\]\])/g)
  return <>{parts.map((p, i) => /^\[\[[A-Z]+_\d+\]\]$/.test(p) ? <span className="wsx-token" key={i}>{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>)}</>
}

// Compliance readiness. HONESTY CONTRACT (owner-enforced): the product provides
// controls and audit evidence; the CUSTOMER achieves compliance. Never "you are
// compliant", "certified", or "guarantees". Every "how" line below ties to a real,
// shipped capability: on-device redaction/tokenization, read-only operation
// (watches and guides, never acts), per-company policy with arm-and-lock (the
// presets named here ship with the product), per-member session audit logs +
// reports, and secure-by-default guidance.
const COMPLIANCE = [
  {
    id: 'privacy', icon: Globe, tone: '', eyebrow: 'Privacy and data protection', title: 'Personal data stays on the device',
    wide: true,
    items: [
      ['GDPR (EU)', 'Emails, phones, IPs and account ids are tokenized on the device before anything is sent, supporting data minimization and pseudonymization duties. The GDPR preset is one click to arm.'],
      ['UK GDPR / DPA 2018', 'The same on-device pseudonymization, with a UK regime preset your admin arms and locks per company.'],
      ['CCPA / CPRA (California)', 'Sensitive personal information (SSNs, financial and health values) is withheld on the device. The California preset ships ready to arm.'],
      ['PIPEDA (Canada)', 'Personal information never leaves in clear, and session reports show exactly what left, supporting your accountability and safeguards principles.'],
      ['LGPD (Brazil)', 'Personal data is redacted or tokenized before sending, and per-session audit logs give you a record of what was processed.'],
      ['Australia Privacy Act (APPs)', 'Sensitive values are stripped on the device and every session is logged, supporting your security-of-personal-information obligations.'],
      ['POPIA (South Africa)', 'Personal information is minimized on the device, and the read-only design means WorkCoPilot never alters records in your systems.'],
      ['DPDP Act (India)', 'A dedicated India preset withholds personal data on the device. Your company admin arms and locks it for every member.'],
    ],
  },
  {
    id: 'standards', icon: BadgeCheck, tone: 'violet', eyebrow: 'Security standards and attestations', title: 'Evidence your auditors can use',
    items: [
      ['SOC 2 (Type I / II)', 'Secrets and credentials are withheld, policy control is role-based, and audit logs give evidence for the Security and Confidentiality criteria.'],
      ['ISO/IEC 27001', 'Policy arm-and-lock, role-based admin control and per-session logs map to ISMS controls on access, logging and information transfer.'],
      ['ISO/IEC 27701', 'Extends 27001 with privacy: on-device pseudonymization and data minimization support your privacy information management controls.'],
      ['NIST SP 800-53', 'Supports the access control, audit and system protection families: role-based policy, an audit record of every send, and nothing sensitive in transit.'],
      ['NIST CSF', 'Supports the Protect and Detect functions: data is minimized before it moves, and every session is logged and reportable.'],
      ['CIS Controls', 'Supports data protection (Control 3) and audit log management (Control 8) through on-device redaction and session logs.'],
    ],
  },
  {
    id: 'health', icon: HeartPulse, tone: 'cyan', eyebrow: 'Healthcare', title: 'PHI never reaches the AI',
    items: [
      ['HIPAA', 'PHI and the Safe Harbor identifiers (names, dates, MRNs, SSNs, contact details) are withheld on the device, so the AI never sees them. The HIPAA preset is one click to arm.'],
      ['HITECH', 'Per-member session logs record exactly what left each device, supporting the audit-trail and accounting expectations HITECH strengthened.'],
    ],
  },
  {
    id: 'finance', icon: Landmark, tone: 'amber', eyebrow: 'Payments and finance', title: 'Cardholder and customer data withheld',
    items: [
      ['PCI DSS', 'Card numbers and sensitive authentication data are withheld on the device, never sent, never stored by us. The PCI preset is ready to arm.'],
      ['SOX', 'Read-only by design: WorkCoPilot never changes a system of record. Session reports give auditors a record of guided work on financial systems.'],
      ['GLBA', 'Customer financial identifiers (account numbers, SSNs, card data) are withheld on the device, supporting your Safeguards Rule program.'],
    ],
  },
  {
    id: 'gov', icon: Building2, tone: 'ok', eyebrow: 'Government and education', title: 'Readiness, documented',
    items: [
      ['FedRAMP (readiness)', 'Readiness support, not an authorization. NIST 800-53 aligned controls, read-only operation and audit evidence help you document the tool inside your boundary.'],
      ['FERPA', 'Student record identifiers are redacted on the device, and session reports show what left, supporting your disclosure controls.'],
    ],
  },
]

function ComplianceGroup({ g, index }) {
  // Stagger the reveal and re-crop the card wash per card so the five shells never read as copies.
  const POS = ['0% 0%', '100% 0%', '0% 100%', '100% 100%', '50% 50%']
  return (
    <WorkCard theme="light" tone={g.tone || undefined} delay={index * 70} texPos={POS[index % POS.length]} className={'wsx-cgroup' + (g.wide ? ' wide' : '')}>
      <WorkCard.Head icon={g.icon} eyebrow={g.eyebrow} title={g.title} />
      <ul className="wsx-clist">
        {g.items.map(([name, how]) => (
          <li key={name}>
            <span className="wsx-cname">{name}</span>
            <span className="wsx-chow">{how}</span>
          </li>
        ))}
      </ul>
    </WorkCard>
  )
}

// DATA HANDLING - the data flow + retention disclosure an external reviewer asked
// for. HONESTY CONTRACT (owner-enforced): every line states a real, shipped
// behavior; where something is unfinished (encryption at rest for report
// artifacts, a fixed automatic retention window) it is SAID, not implied. This is
// a disclosure of what the product does, never a compliance or deletion guarantee.
const FLOW = [
  { icon: Monitor, n: '01', t: 'Your screen and text', s: 'Read on your own device. Screen frames, and on the desktop app your documents, are read locally.' },
  { icon: ShieldCheck, n: '02', t: 'On-device redaction', s: 'Sensitive values are blacked out in frames and replaced by tokens in text before anything leaves.' },
  { icon: Send, n: '03', t: 'Sent to guide', s: 'Reduced-size frames plus the governed text. Nothing else.' },
  { icon: KeyRound, n: '04', t: 'The AI', s: 'Runs on platform keys, or on your company\'s or your own keys so the data stays inside your boundary.' },
  { icon: Undo2, n: '05', t: 'Answer rebuilt on device', s: 'Tokens are swapped back for the real values locally. The AI never saw them.' },
]

const HANDLING = [
  {
    id: 'leaves', icon: Send, tone: 'cyan', eyebrow: 'What leaves your device', title: 'Only what is needed to guide the step',
    items: [
      ['Screen frames', 'Reduced in size before sending. Any line holding a sensitive value is blacked out on your device before the frame is sent.'],
      ['Governed text', 'What you typed or pasted, with sensitive values already replaced by tokens on your device. The real values stay with you.'],
      ['Attached documents (desktop app)', 'Read on your machine. Only the governed text is sent, never the file itself.'],
      ['Which AI keys', 'Platform keys, or your company\'s or your own AI keys, which keeps the data inside your boundary. The model name is never shown to end users.'],
    ],
  },
  {
    id: 'stored', icon: Database, tone: '', eyebrow: 'What we store', title: 'A record of the session, nothing more',
    items: [
      ['Session report', 'One per session. It can include milestone screenshots, which are redacted on your device before they are captured. On by default; you or your operator can turn it off.'],
      ['Audit log', 'One per session, recording what was transmitted, so you can see exactly what left your device.'],
      ['Session history', 'Your list of past sessions, so you can reopen and review them.'],
      ['Keys and secrets', 'Stored API keys and secrets are encrypted at rest with AES-256-GCM.'],
    ],
  },
  {
    id: 'never', icon: EyeOff, tone: 'ok', eyebrow: 'What is never stored', title: 'Your sources and your secrets',
    items: [
      ['Source documents', 'Files you attach are not kept as stored source material.'],
      ['Raw screen frames', 'Frames are used to guide the current step and are not kept as stored source material.'],
      ['Real sensitive values', 'Stripped or tokenized on your device before anything is sent. The AI never sees them.'],
      ['Actions in your systems', 'WorkCoPilot is read-only. It never clicks, types, or changes a system of record on your behalf.'],
    ],
  },
  {
    id: 'retention', icon: Trash2, tone: 'amber', eyebrow: 'Retention and deletion', title: 'Kept until you delete it',
    items: [
      ['Your control', 'You can delete any session at any time. Deleting a session removes it.'],
      ['Admin review', 'Company admins can review the sessions of their own members.'],
      ['How long we keep it', 'By default sessions are kept until you or your admin delete them, with no automatic deletion. An automatic retention window can be configured so sessions older than a set number of days are purged on a schedule.'],
      ['Report screenshots', 'The milestone screenshots in your report are encrypted at rest with AES-256-GCM, the same as your keys and secrets.'],
    ],
  },
]

function FlowStep({ f }) {
  const Ic = f.icon
  return (
    <li className="wsx-fstep">
      <div className="wsx-ftop"><span className="wsx-fic"><Ic size={15} aria-hidden="true" /></span><span className="wsx-fn">{f.n}</span></div>
      <div className="wsx-ft">{f.t}</div>
      <div className="wsx-fs">{f.s}</div>
    </li>
  )
}

function HandlingGroup({ g, index }) {
  const POS = ['100% 100%', '0% 0%', '50% 50%', '100% 0%']
  return (
    <WorkCard theme="light" tone={g.tone || undefined} delay={index * 70} texPos={POS[index % POS.length]} className="wsx-cgroup wsx-hgroup">
      <WorkCard.Head icon={g.icon} eyebrow={g.eyebrow} title={g.title} />
      <ul className="wsx-clist">
        {g.items.map(([name, how]) => (
          <li key={name}>
            <span className="wsx-cname">{name}</span>
            <span className="wsx-chow">{how}</span>
          </li>
        ))}
      </ul>
    </WorkCard>
  )
}

const RAW = 'Connect our billing to Stripe. Account email ops@northwind-trading.com, API key sk-live-4eC39HqLyjWDarjtT1zdp7dc, webhook posts to 10.20.14.7, and the card on file is 4539 1488 0343 6467.'
const SENT = 'Connect our billing to Stripe. Account email [[EMAIL_3]], API key [[SECRET_2]], webhook posts to [[IP_4]], and the card on file is [[CARD_1]].'

// Accessibility (WEB-08): one <main>, a single H1 then H2 per block (cards are
// H3), the two mock screens are labeled images, the flow arrows are
// presentational, decorative icons are hidden, the PDF link says it opens a new
// tab, and the faint mock-screen / step-number inks were raised to AA contrast.
export default function WorkSecurity() {
  const nav = useNavigate()
  useSeo({
    title: 'Security and Privacy - WorkCoPilot by AdmireVeda',
    description: 'How WorkCoPilot protects your data: sensitive values redacted or tokenized on your device before anything is sent, read-only guidance, encryption at rest, the full data flow, retention, and compliance readiness.',
    path: '/workcopilot/security',
  })
  return (
    <div className="wsx">
      <style>{CSS}</style>
      <header className="wsx-top">
        <a href="/workcopilot" aria-label="AdmireVeda"><AdmireVedaLogo size={24} /></a>
        <button className="wsx-back" onClick={() => nav('/workcopilot')} aria-label="Back to WorkCoPilot"><ArrowLeft size={15} aria-hidden="true" /> WorkCoPilot</button>
      </header>

      <main id="main">
      <section className="wsx-hero">
        <div className="wsx-eyebrow"><Lock size={14} aria-hidden="true" /> Private by design &middot; on your device</div>
        <h1>See exactly what is protected</h1>
        <p>Before anything is sent, sensitive data is stripped or tokenized <b>on your own device</b>, in screenshots and in text. You decide what counts as sensitive, on top of the industry-standard detectors.</p>
      </section>

      <section className="wsx-block">
        <div className="wsx-bhead"><span className="wsx-bi"><ScanEye size={16} aria-hidden="true" /></span><div><h2>On your screen</h2><p>Each outbound frame is checked on your device, and any line with a sensitive value is blacked out before the frame leaves.</p></div></div>
        <div className="wsx-ba">
          <WorkCard theme="light" tone="danger" delay={0} texPos="0% 0%"><div className="wsx-lab before">Before (on your device)</div><ScreenMock redacted={false} /></WorkCard>
          <WorkCard theme="light" tone="ok" delay={90} texPos="100% 0%"><div className="wsx-lab after">After (what leaves the device)</div><ScreenMock redacted /></WorkCard>
        </div>
      </section>

      <section className="wsx-block">
        <div className="wsx-bhead"><span className="wsx-bi"><ShieldCheck size={16} aria-hidden="true" /></span><div><h2>In your text</h2><p>Typed or pasted text gets the same protection. Each sensitive value becomes a token, the real values never leave your device, and the answer is rebuilt locally.</p></div></div>
        <div className="wsx-ba">
          <WorkCard theme="light" tone="danger" delay={0} texPos="0% 100%"><div className="wsx-lab before">Before (what you typed)</div><pre className="wsx-code">{RAW}</pre></WorkCard>
          <WorkCard theme="light" tone="ok" delay={90} texPos="100% 100%"><div className="wsx-lab after">After (what reaches the AI)</div><pre className="wsx-code"><TokenText text={SENT} /></pre></WorkCard>
        </div>
        <div className="wsx-note"><Check size={14} aria-hidden="true" /> <span><b>You are in control of what is protected.</b> The built-in, industry-standard detectors handle emails, keys, card numbers, SSNs, IBANs, phone numbers, IP addresses and private hosts out of the box. On top of that, you (or your company admin) add your own words and patterns, and choose to redact, tokenize, or block each one. The model sees the structure of your task, never the secrets.</span></div>
      </section>

      <section className="wsx-block wsx-data" id="data-handling">
        <div className="wsx-bhead"><span className="wsx-bi"><Route size={16} aria-hidden="true" /></span><div><h2>How your data is handled</h2><p>This is a plain account of how your data moves and how long we keep it. It is a disclosure of what the product does today, not a compliance claim.</p></div></div>
        <ol className="wsx-flow" aria-label="Data flow, from your device to the AI and back">
          {FLOW.map((f, i) => (
            <React.Fragment key={f.n}>
              <FlowStep f={f} />
              {i < FLOW.length - 1 && <li className="wsx-farrow" role="presentation" aria-hidden="true"><ArrowRight size={14} aria-hidden="true" /></li>}
            </React.Fragment>
          ))}
        </ol>
        <div className="wsx-hgrid">
          {HANDLING.map((g, i) => <HandlingGroup key={g.id} g={g} index={i} />)}
        </div>
        <div className="wsx-note"><ShieldCheck size={14} aria-hidden="true" /> <span><b>We state our data practices plainly.</b> Encryption at rest covers your stored keys, secrets and report artifacts, including milestone screenshots. By default sessions stay until you or your admin delete them, and an automatic retention window can be configured to purge older sessions on a schedule. Where something is under your control or still improving, we say so rather than let you assume it is covered.</span></div>
      </section>

      <section className="wsx-block wsx-comp" id="compliance">
        <div className="wsx-bhead"><span className="wsx-bi"><BadgeCheck size={16} aria-hidden="true" /></span><div><h2>Compliance-ready, across the frameworks you report to</h2><p>WorkCoPilot gives you the controls and the audit evidence to support compliance across the frameworks you report to. Your admin arms a policy per company and locks it, sensitive data is stripped or tokenized on the device, and every session is logged and reportable. Here is how that maps, framework by framework.</p></div></div>
        <ul className="wsx-call" aria-label="Frameworks covered below">
          {COMPLIANCE.flatMap((g) => g.items.map(([n]) => n)).map((n) => <li key={n} className="wsx-cchip">{n}</li>)}
        </ul>
        <div className="wsx-cgrid">
          {COMPLIANCE.map((g, i) => <ComplianceGroup key={g.id} g={g} index={i} />)}
        </div>
        <div className="wsx-note"><ShieldCheck size={14} aria-hidden="true" /> <span><b>Honest framing.</b> WorkCoPilot does not claim a certification against any of these frameworks, and no tool can make an organization compliant on its own. We provide the controls and the evidence. Your organization, working with its auditors, achieves and holds the compliance.</span></div>
      </section>

      <section className="wsx-block" id="report">
        <div className="wsx-bhead"><span className="wsx-bi"><ShieldCheck size={16} aria-hidden="true" /></span><div><h2>Report a security issue</h2><p>We welcome responsible disclosure. If you believe you have found a security or privacy issue in WorkCoPilot, tell us and we will work with you to confirm and fix it.</p></div></div>
        <div className="wsx-note"><ShieldCheck size={14} aria-hidden="true" /> <span><b>How to reach us.</b> Email <a href="mailto:support@coesecurity.com">support@coesecurity.com</a> for anything security, privacy or compliance related, including a signed DPA. For product help and billing, email <a href="mailto:support@admireveda.com">support@admireveda.com</a>. Please include enough detail to reproduce the issue, and give us a reasonable time to investigate and remediate before any public disclosure. We will not pursue good-faith security research conducted under this policy.</span></div>
        <div className="wsx-note"><Building2 size={14} aria-hidden="true" /> <span>WorkCoPilot, by AdmireVeda, is a product of COE Security LLC.</span></div>
      </section>

      <section className="wsx-cta" aria-label="Next steps">
        <a className="wsx-btn" href="/api/work/security-paper.pdf" target="_blank" rel="noopener noreferrer"><FileText size={16} aria-hidden="true" /> Read the Security &amp; Privacy paper<span className="wsx-sr"> (PDF, opens in a new tab)</span></a>
        <button className="wsx-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      </main>
    </div>
  )
}

const CSS = `
.wsx{--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--em:#0f766e;--bg:#f8fafc;background:var(--bg);color:var(--ink);min-height:100vh;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wsx *{box-sizing:border-box}
.wsx-top{display:flex;align-items:center;justify-content:space-between;max-width:1040px;margin:0 auto;padding:18px 20px}
.wsx-back{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 13px;font:inherit;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer}
.wsx-hero{max-width:760px;margin:0 auto;padding:34px 20px 6px;text-align:center}
.wsx-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em);background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:5px 13px}
.wsx-hero h1{font-size:34px;line-height:1.12;margin:16px 0 10px;letter-spacing:-.02em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif}
.wsx-hero p{font-size:16.5px;line-height:1.6;color:var(--mut);margin:0 auto;max-width:620px}
.wsx-block{max-width:1040px;margin:0 auto;padding:30px 20px}
.wsx-bhead{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}
.wsx-bi{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#ecfdf5;color:var(--em);border:1px solid #a7f3d0}
.wsx-bhead h2{font-size:21px;margin:0 0 3px;letter-spacing:-.01em;color:var(--ink)}
.wsx-bhead p{font-size:14.5px;color:var(--mut);margin:0;line-height:1.55;max-width:760px}
.wsx-ba{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:760px){.wsx-ba{grid-template-columns:1fr}.wsx-hero h1{font-size:27px}}
.wsx-lab{font-size:12.5px;font-weight:700;margin-bottom:8px}
.wsx-lab.before{color:#dc2626}.wsx-lab.after{color:#15803d}
/* a11y: visually hidden text; visible focus ring (never outline:none) */
.wsx-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wsx a:focus-visible,.wsx button:focus-visible{outline:2px solid var(--em);outline-offset:2px;border-radius:6px}
.wsx-screen{display:flex;height:286px;border-radius:12px;overflow:hidden;border:1px solid var(--line);box-shadow:0 8px 24px rgba(15,23,42,.08);background:#fff}
.wsx-side{flex:0 0 150px;background:#0f172a;color:#94a3b8;padding:14px 0}
.wsx-brand{display:flex;align-items:center;gap:7px;color:#e2e8f0;font-weight:700;font-size:13px;padding:0 14px 12px}
.wsx-dot{width:9px;height:9px;border-radius:50%;background:#38bdf8}
.wsx-nav{font-size:13px;padding:8px 14px}
.wsx-nav.on{background:#1e293b;color:#38bdf8;font-weight:600}
.wsx-main{flex:1;min-width:0;background:#f1f5f9}
.wsx-crumb{font-size:12px;color:var(--mut);background:#fff;border-bottom:1px solid var(--line);padding:10px 16px}
.wsx-crumb b{color:var(--ink)}.wsx-crumb span{margin:0 4px}
.wsx-card{background:#fff;margin:14px;border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.wsx-ctitle{font-weight:700;font-size:14px;margin-bottom:10px}
.wsx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 0;font-size:12.5px}
.wsx-key{color:#64748b;flex:0 0 auto}
.wsx-val{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--ink);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wsx-val.ok{color:#15803d;font-weight:700;font-family:inherit}
.wsx-okdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;margin-right:6px;vertical-align:1px}
.wsx-mask{display:inline-block;height:13px;width:118px;border-radius:3px;background:#0b1220}
.wsx-code{background:#0b1220;color:#e2e8f0;border-radius:12px;padding:16px 16px;font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin:0;min-height:148px}
.wsx-token{background:rgba(140,245,196,.18);color:#8cf5c4;border-radius:5px;padding:1px 5px;font-weight:600}
.wsx-note{display:flex;align-items:flex-start;gap:8px;margin-top:16px;font-size:13.5px;color:var(--mut);background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px 14px}
.wsx-note a{color:var(--em);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.wsx-note svg{color:var(--em);flex:0 0 auto;margin-top:2px}
/* COMPLIANCE - chip roll-call of every framework, then grouped cards (WorkCard shell
   = same reveal/glow/hairline as the rest of the site), then the honest-framing note. */
.wsx-comp{padding-top:22px}
.wsx-call{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 18px;padding:0;list-style:none}
.wsx-cchip{display:inline-block;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.02em;color:#334155;background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px 9px;white-space:nowrap;box-shadow:0 1px 0 rgba(15,23,42,.03)}
.wsx-cgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.wsx-cgroup{min-width:0;gap:16px}
.wsx-cgroup.wide{grid-column:span 2}
.wsx-cgroup .wc-title{font-size:19px}
.wsx-clist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.wsx-cgroup.wide .wsx-clist{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:22px}
.wsx-clist li{display:flex;flex-direction:column;gap:3px;padding:11px 0;border-top:1px solid var(--line);min-width:0}
.wsx-clist li:first-child{border-top:0;padding-top:0}
.wsx-cgroup.wide .wsx-clist li:nth-child(2){border-top:0;padding-top:0}
.wsx-cname{display:inline-flex;align-items:center;gap:7px;font-weight:700;font-size:13.5px;color:var(--ink);letter-spacing:-.005em}
.wsx-cname::before{content:"";width:6px;height:6px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,var(--wc-ic1),var(--wc-ic2))}
.wsx-chow{font-size:13.5px;line-height:1.55;color:var(--mut);overflow-wrap:anywhere}
@media(max-width:900px){.wsx-cgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){
  .wsx-cgrid{grid-template-columns:1fr}
  .wsx-cgroup.wide{grid-column:auto}
  .wsx-cgroup.wide .wsx-clist{display:flex}
  .wsx-cgroup.wide .wsx-clist li:nth-child(2){border-top:1px solid var(--line);padding-top:11px}
  .wsx-cchip{white-space:normal}
}
/* DATA HANDLING - a five-step flow rail (device -> redaction -> sent -> AI -> rebuilt
   on device), then four WorkCard groups reusing the compliance list vocabulary
   (wsx-clist / wsx-cname / wsx-chow), then the honest-limits note. */
.wsx-data{padding-top:22px}
.wsx-flow{list-style:none;margin:0 0 18px;padding:0;display:flex;align-items:stretch;gap:8px}
.wsx-fstep{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 14px 15px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wsx-ftop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px}
.wsx-fic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#10a271,#0a93c4);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 8px 18px -8px #0a93c4}
.wsx-fn{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;color:var(--mut)}
.wsx-ft{font-weight:700;font-size:14px;color:var(--ink);letter-spacing:-.005em;line-height:1.3}
.wsx-fs{font-size:12.5px;line-height:1.5;color:var(--mut);overflow-wrap:anywhere}
.wsx-farrow{flex:0 0 auto;display:grid;place-items:center;color:#94a3b8;padding:0 1px}
.wsx-hgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:stretch}
.wsx-hgroup .wsx-clist li:first-child{border-top:0;padding-top:0}
@media(max-width:760px){
  .wsx-flow{flex-direction:column;gap:6px}
  .wsx-fstep{flex:1 1 auto}
  .wsx-farrow{padding:0}
  .wsx-farrow svg{transform:rotate(90deg)}
}
@media(max-width:640px){.wsx-hgrid{grid-template-columns:1fr}}
.wsx-cta{max-width:1040px;margin:0 auto;padding:16px 20px 56px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wsx-btn{display:inline-flex;align-items:center;gap:8px;background:var(--em);color:#fff;border:1px solid var(--em);border-radius:11px;padding:11px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none}
.wsx-btn.alt{background:#fff;color:var(--ink);border-color:var(--line)}
`
