// WorkCoPilot - Security page (dedicated, linked from the main page, the FAQ,
// the Privacy Policy and the Disclaimer). PUBLIC PAGE, written for a buyer who
// cares about trust: lead with the assurance, keep every claim short and true,
// show ONE proof visual (the on-device redaction, before and after), then the
// plain data-handling facts and the compliance mapping as scannable lists.
//
// HONESTY CONTRACT (owner-enforced): every line states a real, shipped
// behavior (on-device redaction and tokenization, built-in SAST + live OSV
// dependency check, authenticator on every account, per-session audit log,
// AES-256-GCM at rest for keys, secrets and report screenshots, your own AI
// keys or on-prem, read-only guidance, per-company policy presets). Never
// "certified", never "you are compliant": we provide controls and evidence,
// the customer holds compliance. Anchors #data-handling and #compliance are
// linked from other pages and must stay.
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, ScanEye, FileText, ArrowRight, Globe, BadgeCheck, Building2, Send, Database, EyeOff, KeyRound, FileSearch, ScrollText, Hand, Code2 } from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive
import RedactionSweep from '../components/RedactionSweep.jsx'   // "watch it protect": the on-device sweep over the after screen
import useSeo from '../useSeo.js'                  // per-route title / description / canonical (WEB-01)
import { useT } from '../i18n/index.jsx'           // localized data-residency note (residency.* keys) + security.* strings

// The guarantees, one line each. Every claim maps to a shipped capability.
const GUARANTEES = [
  { icon: ScanEye, t: 'Redaction on your device', d: 'Sensitive values are blacked out in screenshots and tokenized in text before anything is sent.' },
  { icon: Code2, t: 'Code checked before you run it', d: 'Built-in SAST plus a live dependency check against the OSV vulnerability database.' },
  { icon: KeyRound, t: 'Authenticator on every account', d: 'Password, company SSO and social sign-in all pass the same second factor.' },
  { icon: ScrollText, t: 'Audit log for every session', d: 'What was sent, what was read from your screen, what was checked, filtered and flagged.' },
  { icon: Lock, t: 'Encrypted at rest', d: 'Stored keys, secrets and report screenshots are encrypted with AES-256-GCM.' },
  { icon: Hand, t: 'Your boundary, your keys', d: 'Run on your company\'s or your own AI keys, or on-prem. Read-only: it guides, it never changes your systems.' },
]

// A representative integration screen. `redacted` swaps each sensitive value for
// an on-device mask, exactly what the frame redactor does before a frame is sent.
const FIELDS = [
  { k: 'Billing email', v: 'jm@northwind.com', s: true },
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
          {FIELDS.map((f, i) => (
            <div className="wsx-row" key={f.k}>
              <span className="wsx-key">{f.k}</span>
              {f.s && redacted
                /* the mask sits OVER the value, so the sweep can reveal it row by
                   row (RedactionSweep drives data-sweep; --i staggers the rows) */
                ? <span className="wsx-valwrap"><span className="wsx-val" aria-hidden="true">{f.v}</span><span className="wsx-mask" style={{ '--i': i }} /></span>
                : <span className={'wsx-val' + (f.ok ? ' ok' : '')}>{f.ok && <span className="wsx-okdot" />}{f.v}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// What leaves, what we keep, what we never keep. Short, true, and in the order
// a reviewer asks. Retention is stated plainly below the lists.
const HANDLING = [
  { id: 'leaves', icon: Send, tone: 'cyan', title: 'What leaves your device', items: [
    'Reduced-size screen frames, sensitive lines already blacked out',
    'Your text, sensitive values already replaced by tokens',
    'Governed text from attached documents, never the file (desktop app)',
  ] },
  { id: 'stored', icon: Database, tone: '', title: 'What we store', items: [
    'One session report, with redacted milestone screenshots (you can turn it off)',
    'One audit log per session, recording what was transmitted',
    'Your session history, so you can reopen and review',
  ] },
  { id: 'never', icon: EyeOff, tone: 'ok', title: 'What is never stored', items: [
    'Your source documents',
    'Raw screen frames',
    'The real sensitive values, the AI never sees them',
  ] },
]

// Compliance mapping as a roll-call. Presets that ship with the product are
// marked so a buyer sees what is one click to arm. HONESTY: readiness and
// evidence, not certification.
const FRAMEWORKS = [
  { id: 'privacy', label: 'Privacy', items: ['GDPR (EU)', 'UK GDPR / DPA 2018', 'CCPA / CPRA', 'PIPEDA', 'LGPD', 'Australia Privacy Act', 'POPIA', 'DPDP Act (India)'] },
  { id: 'standards', label: 'Standards', items: ['SOC 2', 'ISO/IEC 27001', 'ISO/IEC 27701', 'NIST SP 800-53', 'NIST CSF', 'CIS Controls'] },
  { id: 'sector', label: 'Sector', items: ['HIPAA', 'HITECH', 'PCI DSS', 'SOX', 'GLBA', 'FERPA', 'FedRAMP (readiness)'] },
]
const PRESETS = ['GDPR (EU)', 'UK GDPR / DPA 2018', 'CCPA / CPRA', 'DPDP Act (India)', 'HIPAA', 'PCI DSS']

// Accessibility (WEB-08): one <main>, a single H1 then H2 per block (cards are
// H3), the two mock screens are labeled images, decorative icons are hidden,
// and the PDF link says it opens a new tab.
export default function WorkSecurity() {
  const nav = useNavigate()
  const t = useT()
  useSeo({
    title: 'Security and Privacy - WorkCoPilot by AdmireVeda',
    description: 'How WorkCoPilot protects your data: sensitive values redacted or tokenized on your device before anything is sent, code checked before you run it, an authenticator on every account, a per-session audit log, encryption at rest, and compliance evidence mapped to the frameworks you report to.',
    path: '/workcopilot/security',
  })
  return (
    <div className="wsx">
      <style>{CSS}</style>
      <SiteHeader current="security" />

      <main id="main">
      <section className="wsx-hero">
        <div className="wsx-eyebrow"><Lock size={14} aria-hidden="true" /> Private by design</div>
        <h1>Your secrets never leave your device.</h1>
        <p>Sensitive data is stripped on your own device before anything is sent. The AI sees the shape of your task, never the secrets.</p>
        <div className="wsx-acts">
          <a className="wsx-btn" href="/api/work/security-paper.pdf" target="_blank" rel="noopener noreferrer"><FileText size={16} aria-hidden="true" /> Security &amp; Privacy paper<span className="wsx-sr"> (PDF, opens in a new tab)</span></a>
          <a className="wsx-btn alt" href="/workcopilot/enterprise">Enterprise controls <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="wsx-block" aria-labelledby="wsx-g">
        <h2 id="wsx-g" className="wsx-sr">What is protected</h2>
        <ul className="wsx-grid">
          {GUARANTEES.map((g) => {
            const Ic = g.icon
            return (
              <li key={g.t} className="wsx-g">
                <span className="wsx-gi"><Ic size={17} aria-hidden="true" /></span>
                <div className="wsx-gt"><b>{g.t}</b><span>{g.d}</span></div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="wsx-block">
        <div className="wsx-bhead"><span className="wsx-bi"><ScanEye size={16} aria-hidden="true" /></span><div><h2>{t('security.sweepH2')}</h2><p>{t('security.sweepP')}</p></div></div>
        {/* WATCH IT PROTECT: the scan sweeps the after screen and each sensitive
            value is masked as it passes, then the seal lands. Replayable. */}
        <RedactionSweep
          before={<WorkCard theme="light" tone="danger" delay={0} texPos="0% 0%"><ScreenMock redacted={false} /></WorkCard>}
          after={<WorkCard theme="light" tone="ok" delay={90} texPos="100% 0%"><ScreenMock redacted /></WorkCard>}
        />
        <div className="wsx-proof" aria-label="The same protection in text: each sensitive value becomes a token, the real value stays on your device">
          <span className="wsx-pk">In text</span>
          {/* each raw -> token swap is one unbreakable unit (design gate: a
              pair never splits across lines; on a phone the units stack) */}
          <span className="wsx-swap"><span className="wsx-raw">ops@northwind-trading.com</span><span className="wsx-arr" aria-hidden="true">&rarr;</span><span className="wsx-tok">[[EMAIL_3]]</span></span>
          <span className="wsx-swap"><span className="wsx-raw">sk-live-4eC39Hq…</span><span className="wsx-arr" aria-hidden="true">&rarr;</span><span className="wsx-tok">[[SECRET_2]]</span></span>
          <span className="wsx-swap"><span className="wsx-raw">4539 1488 0343 6467</span><span className="wsx-arr" aria-hidden="true">&rarr;</span><span className="wsx-tok">[[CARD_1]]</span></span>
          <span className="wsx-pe">Answer rebuilt on your device. Add your own words and patterns on top of the built-in detectors.</span>
        </div>
        {/* Read-only by design: the one line a security reviewer asks about first. */}
        <div className="wsx-ro">
          <span className="wsx-roi"><Hand size={16} aria-hidden="true" /></span>
          <div><b>{t('security.readOnlyT')}</b><span>{t('security.readOnlyD')}</span></div>
        </div>
      </section>

      <section className="wsx-block" id="data-handling">
        <div className="wsx-bhead"><span className="wsx-bi"><FileSearch size={16} aria-hidden="true" /></span><div><h2>How your data is handled</h2><p>What the product does today. Not a compliance claim.</p></div></div>
        <div className="wsx-hgrid">
          {HANDLING.map((g, i) => (
            <WorkCard key={g.id} theme="light" tone={g.tone || undefined} delay={i * 70} className="wsx-hcard">
              <WorkCard.Head icon={g.icon} title={g.title} />
              <WorkCard.Points items={g.items} />
            </WorkCard>
          ))}
        </div>
        <ul className="wsx-facts" aria-label="Retention and residency">
          <li><ShieldCheck size={14} aria-hidden="true" /><span><b>Kept until you delete it.</b> Delete any session at any time; admins review their own members. An automatic retention window can purge older sessions on a schedule.</span></li>
          <li><Globe size={14} aria-hidden="true" /><span><b>{t('residency.title')}.</b> {t('residency.sec')}</span></li>
        </ul>
      </section>

      <section className="wsx-block" id="compliance">
        <div className="wsx-bhead"><span className="wsx-bi"><BadgeCheck size={16} aria-hidden="true" /></span><div><h2>Evidence for the frameworks you report to</h2><p>Your admin arms a policy per company and locks it. Every session is logged and reportable. Presets marked with a tick ship ready to arm.</p></div></div>
        <div className="wsx-fw">
          {FRAMEWORKS.map((g) => (
            <div className="wsx-fwrow" key={g.id}>
              <span className="wsx-fwl">{g.label}</span>
              <ul className="wsx-call" aria-label={g.label + ' frameworks'}>
                {g.items.map((n) => <li key={n} className={'wsx-cchip' + (PRESETS.includes(n) ? ' preset' : '')}>{PRESETS.includes(n) && <><BadgeCheck size={12} aria-hidden="true" /><span className="wsx-sr">Preset ships with the product: </span></>}{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="wsx-honest">We provide the controls and the evidence. We do not claim certification against any framework; your organization holds compliance with its auditors.</p>
      </section>

      <section className="wsx-block wsx-contact" id="report">
        <ul className="wsx-facts">
          <li><ShieldCheck size={14} aria-hidden="true" /><span><b>Found a security issue?</b> Email <a href="mailto:support@coesecurity.com">support@coesecurity.com</a> (security, privacy, compliance, signed DPA). Give us time to confirm and fix before public disclosure; good-faith research is welcome.</span></li>
          <li><Building2 size={14} aria-hidden="true" /><span>Product help and billing: <a href="mailto:support@admireveda.com">support@admireveda.com</a>. WorkCoPilot, by AdmireVeda, is a product of COE Security LLC.</span></li>
        </ul>
      </section>

      <section className="wsx-cta" aria-label="Next steps">
        <a className="wsx-btn" href="/api/work/security-paper.pdf" target="_blank" rel="noopener noreferrer"><FileText size={16} aria-hidden="true" /> Read the Security &amp; Privacy paper<span className="wsx-sr"> (PDF, opens in a new tab)</span></a>
        <button className="wsx-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      </main>
      <SiteFooter />
    </div>
  )
}

const CSS = `
[data-theme='dark'] .wsx{--ink:#eef0f6;--tx2:#d3d8e6;--mut:#9aa0b4;--line:rgba(255,255,255,.09);--panel:#13141f;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff;--em-fill:rgba(140,245,196,.10);--em-line:rgba(140,245,196,.34)}
.wsx{--ink:#161a2b;--tx2:#2b3250;--mut:#5c6484;--line:#e6e8f1;--panel:#ffffff;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--em-fill:rgba(14,159,110,.08);--em-line:rgba(14,159,110,.30);background:var(--bg);color:var(--ink);min-height:100vh;overflow-x:hidden;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wsx *{box-sizing:border-box}
.wsx-hero{max-width:760px;margin:0 auto;padding:36px 20px 8px;text-align:center}
.wsx-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--em);background:var(--em-fill);border:1px solid var(--em-line);border-radius:999px;padding:5px 13px;white-space:nowrap}
.wsx-hero h1{font-size:38px;line-height:1.1;margin:16px 0 10px;letter-spacing:-.025em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;overflow-wrap:anywhere}
.wsx-hero p{font-size:17px;line-height:1.55;color:var(--mut);margin:0 auto;max-width:560px}
.wsx-acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:20px}
.wsx-block{max-width:1040px;margin:0 auto;padding:26px 20px}
.wsx-bhead{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}
.wsx-bi{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#ecfdf5;color:var(--em);border:1px solid #a7f3d0}
.wsx-bhead h2{font-size:22px;margin:0 0 3px;letter-spacing:-.015em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;overflow-wrap:anywhere}
.wsx-bhead p{font-size:14.5px;color:var(--mut);margin:0;line-height:1.5;max-width:720px}
/* GUARANTEES - six one-liners, icon + claim + one short line. 3 across, 2 at
   tablet, 1 on phones; every cell is min-width:0 so long words wrap, never spill. */
.wsx-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.wsx-g{display:flex;gap:12px;align-items:flex-start;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 15px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wsx-gi{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--em),var(--cy));box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 8px 18px -8px #0a84c2}
.wsx-gt{display:flex;flex-direction:column;gap:3px;min-width:0}
.wsx-gt b{font-size:14.5px;color:var(--ink);letter-spacing:-.005em;line-height:1.3}
.wsx-gt span{font-size:13px;line-height:1.5;color:var(--mut);overflow-wrap:anywhere}
@media(max-width:900px){.wsx-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wsx-grid{grid-template-columns:1fr}}
/* BEFORE / AFTER - the one proof visual, driven by RedactionSweep (data-sweep
   on .rs: idle -> sweep -> done). The scan line crosses the after screen and the
   masks land row by row behind it; the seal marks the finish. */
.rs{display:flex;flex-direction:column;gap:10px}
.rs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
@media(max-width:760px){.rs-grid{grid-template-columns:1fr}.wsx-hero h1{font-size:29px}}
.rs-col{min-width:0}
.rs-lab{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;margin-bottom:8px}
.rs-lab.before{color:#dc2626}.rs-lab.after{color:#15803d}
.rs-stage{position:relative}
.rs-line{position:absolute;left:0;right:0;top:0;height:3px;border-radius:2px;background:linear-gradient(90deg,transparent,#39d3ff,#8cf5c4,transparent);box-shadow:0 0 18px rgba(57,211,255,.8);opacity:0;pointer-events:none;z-index:4}
.rs[data-sweep="sweep"] .rs-line{opacity:1;animation:rs-scan 2.2s cubic-bezier(.4,0,.2,1) .2s both}
@keyframes rs-scan{from{top:0}to{top:calc(100% - 3px)}}
.rs-seal{position:absolute;right:14px;bottom:14px;z-index:4;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#16b364;color:#fff;box-shadow:0 10px 24px -8px rgba(22,179,100,.7);animation:rs-seal .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes rs-seal{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
.rs-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.rs-note{font-size:13px;color:var(--mut);min-width:0}
.rs-replay{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
.rs-replay:hover{border-color:var(--em)}
/* the masks sit over the values: hidden while idle, landing one row after
   another as the line passes (--i is the row index), on for good once done */
.wsx-valwrap{position:relative;display:inline-block;min-width:0;max-width:62%}
.wsx-valwrap .wsx-val{display:block}
.wsx-valwrap .wsx-mask{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:3px;background:#0b1220;opacity:1}
.rs[data-sweep="idle"] .wsx-valwrap .wsx-mask{opacity:0}
.rs[data-sweep="sweep"] .wsx-valwrap .wsx-mask{opacity:0;animation:rs-mask .25s ease-out forwards;animation-delay:calc(.45s + var(--i,0) * .26s)}
@keyframes rs-mask{to{opacity:1}}
@media(prefers-reduced-motion:reduce){.rs-line{display:none}.rs-seal{animation:none}.rs[data-sweep="sweep"] .wsx-valwrap .wsx-mask{animation:none;opacity:1}}
/* read-only by design */
.wsx-ro{display:flex;gap:12px;align-items:flex-start;margin-top:14px;padding:12px 14px;border-radius:12px;background:var(--panel);border:1px solid var(--line);min-width:0}
.wsx-roi{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--em),var(--cy))}
.wsx-ro b{display:block;font-size:14.5px;color:var(--ink);margin-bottom:2px}
.wsx-ro div>span{display:block;font-size:13px;line-height:1.5;color:var(--mut);overflow-wrap:anywhere}
.wsx-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wsx a:focus-visible,.wsx button:focus-visible{outline:2px solid var(--em);outline-offset:2px;border-radius:6px}
.wsx-screen{display:flex;border-radius:12px;overflow:hidden;border:1px solid var(--line);box-shadow:0 8px 24px rgba(15,23,42,.08);background:var(--panel)}
.wsx-side{flex:0 0 150px;background:#0f172a;color:#94a3b8;padding:14px 0}
.wsx-brand{display:flex;align-items:center;gap:7px;color:#e2e8f0;font-weight:700;font-size:13px;padding:0 14px 12px;white-space:nowrap}
.wsx-dot{width:9px;height:9px;border-radius:50%;background:#38bdf8;flex:0 0 auto}
.wsx-nav{font-size:13px;padding:8px 14px}
.wsx-nav.on{background:#1e293b;color:#38bdf8;font-weight:600}
.wsx-main{flex:1;min-width:0;background:#f1f5f9}
.wsx-crumb{font-size:12px;color:var(--mut);background:var(--panel);border-bottom:1px solid var(--line);padding:10px 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsx-crumb b{color:var(--ink)}.wsx-crumb span{margin:0 4px}
.wsx-card{background:var(--panel);margin:14px;border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.wsx-ctitle{font-weight:700;font-size:14px;margin-bottom:10px}
.wsx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 0;font-size:12.5px}
.wsx-key{color:#64748b;flex:0 0 auto}
.wsx-val{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--ink);text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wsx-val.ok{color:#15803d;font-weight:700;font-family:inherit}
.wsx-okdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;margin-right:6px;vertical-align:1px}
.wsx-mask{display:inline-block;height:13px;width:118px;border-radius:3px;background:#0b1220}
/* the one-line text proof under the visual: raw -> token chips, wraps as a row */
.wsx-proof{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-top:14px;padding:11px 14px;border-radius:12px;background:linear-gradient(180deg,#f4f8f7,#f8fbfa);border:1px solid var(--line);font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:12px;color:var(--tx2);line-height:1.5}
.wsx-pk{font-family:"Figtree",system-ui,sans-serif;font-weight:700;font-size:12.5px;color:var(--ink);text-transform:uppercase;letter-spacing:.06em;margin-right:4px}
.wsx-raw{color:#c0322b;text-decoration:line-through;text-decoration-color:rgba(192,50,43,.5);overflow-wrap:anywhere}
.wsx-swap{display:inline-flex;align-items:center;gap:8px;max-width:100%;min-width:0}
.wsx-arr{color:var(--mut);flex:0 0 auto}
.wsx-tok{color:#0a7fa8;font-weight:600;background:#fff;border:1px solid var(--line);border-radius:7px;padding:2px 7px;white-space:nowrap}
.wsx-pe{flex:1 1 100%;font-family:"Figtree",system-ui,sans-serif;font-size:13px;color:var(--mut)}
/* DATA HANDLING - three short cards, then two one-line facts */
.wsx-hgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}
.wsx-hcard{min-width:0;gap:12px}
.wsx-hcard .wc-title{font-size:17px}
.wsx-hcard .wc-points li{font-size:13.5px}
@media(max-width:820px){.wsx-hgrid{grid-template-columns:1fr}}
.wsx-facts{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.wsx-facts li{display:flex;align-items:flex-start;gap:8px;font-size:13.5px;line-height:1.5;color:var(--mut);background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-width:0}
.wsx-facts li>svg{color:var(--em);flex:0 0 auto;margin-top:3px}
.wsx-facts li>span{min-width:0;overflow-wrap:anywhere}
.wsx-facts b{color:var(--ink)}
.wsx-facts a{color:var(--em);font-weight:600;text-decoration:underline;text-underline-offset:2px}
/* COMPLIANCE - three labeled rows of framework chips (preset chips carry a tick) */
.wsx-fw{display:flex;flex-direction:column;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.wsx-fwrow{display:flex;gap:12px;align-items:flex-start;min-width:0}
.wsx-fwl{flex:0 0 84px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);padding-top:6px;white-space:nowrap}
.wsx-call{display:flex;flex-wrap:wrap;gap:7px;margin:0;padding:0;list-style:none;min-width:0}
.wsx-cchip{display:inline-flex;align-items:center;gap:5px;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.02em;color:var(--tx2);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:5px 9px;white-space:nowrap}
.wsx-cchip.preset{color:#0f7f58;background:#e3fbf0;border-color:rgba(15,127,88,.22);font-weight:600}
.wsx-honest{margin:14px 0 0;font-size:13.5px;line-height:1.5;color:var(--mut)}
@media(max-width:560px){.wsx-fwrow{flex-direction:column;gap:6px}.wsx-fwl{padding-top:0}}
.wsx-contact{padding-top:8px}
.wsx-contact .wsx-facts{margin-top:0}
.wsx-cta{max-width:1040px;margin:0 auto;padding:16px 20px 56px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wsx-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;background:var(--em);color:#fff;border:1px solid var(--em);border-radius:11px;padding:11px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap}
.wsx-btn.alt{background:var(--panel);color:var(--ink);border-color:var(--line)}
/* Phone: the mock's sidebar folds to a 34px rail (dot + bars, no words) so the
   values, which are the whole demonstration, show in full; a long value drops
   under its label instead of being cut with an ellipsis (design gate). */
@media(max-width:480px){
  .wsx-side{flex-basis:34px;padding:12px 0}
  .wsx-brand{padding:0 0 12px;justify-content:center;font-size:0}.wsx-brand .wsx-dot{width:10px;height:10px}
  .wsx-nav{font-size:0;height:22px;padding:0;margin:4px 9px;border-radius:4px;background:rgba(148,163,184,.25)}.wsx-nav.on{background:#38bdf8}
  .wsx-card{margin:10px;padding:12px}
  .wsx-row{flex-wrap:wrap;row-gap:2px}
  .wsx-val,.wsx-valwrap{white-space:nowrap;overflow:visible;text-overflow:clip;max-width:100%}
}
`
