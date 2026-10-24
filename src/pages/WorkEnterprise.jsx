// WorkCoPilot - Enterprise features (dedicated public page, linked from the
// main page's "For companies & teams" section and the site nav). Every
// enterprise capability, grouped, on the design system: brand green/blue with
// the orange CTA, light + dark, on-brand inline SVG graphics, responsive.
// HONESTY CONTRACT (owner): state guarantees, never mechanism; evidence that
// SUPPORTS a compliance program - never "certified"; no invented metrics.
import React from 'react'
import {
  ShieldCheck, ScanEye, FileText, Lock, KeyRound, Bell, Radio, BookOpen, Scale, BarChart3, Palette,
  Monitor, Globe, Smartphone, Check, ArrowRight, Building2, Users, Receipt, EyeOff, Database, ListChecks, Bot, Sparkles,
} from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import useSeo from '../useSeo.js'

// The SOC / SIEM relay targets. Names only (no third-party logos).
const SIEM_TARGETS = ['Splunk', 'Microsoft Sentinel', 'IBM QRadar', 'Elastic', 'Datadog', 'Sumo Logic', 'Google Chronicle', 'PagerDuty', 'Opsgenie', 'Slack', 'Microsoft Teams', 'ServiceNow', 'Webhook', 'Syslog / CEF']

// Hero graphic: the console with a redaction mask and an alert relaying out to
// a SOC, over a dot grid and arcs - the same graphics language as the dashboard.
function EntArt() {
  return (
    <svg className="wen-art" viewBox="0 0 420 300" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="wenDots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill="var(--cyan)" opacity=".3" /></pattern>
        <linearGradient id="wenGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--em)" stopOpacity=".22" /><stop offset="1" stopColor="var(--cyan)" stopOpacity=".1" /></linearGradient>
        <linearGradient id="wenBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--em)" /><stop offset="1" stopColor="var(--cyan)" /></linearGradient>
      </defs>
      <ellipse cx="200" cy="160" rx="190" ry="118" fill="url(#wenGlow)" />
      <rect x="12" y="28" width="130" height="110" rx="14" fill="url(#wenDots)" />
      <circle cx="350" cy="70" r="60" stroke="var(--cyan)" strokeOpacity=".22" strokeWidth="1.2" />
      <circle cx="350" cy="70" r="40" stroke="var(--cyan)" strokeOpacity=".16" strokeWidth="1.2" strokeDasharray="4 6" />
      {/* the member's screen with a redacted field */}
      <rect x="44" y="52" width="224" height="170" rx="18" fill="var(--panel)" stroke="var(--line-2)" />
      <rect x="44" y="52" width="224" height="3" rx="1.5" fill="url(#wenBar)" />
      <path d="M44 82h224" stroke="var(--line)" />
      <circle cx="62" cy="67" r="3.4" fill="var(--line-2)" /><circle cx="74" cy="67" r="3.4" fill="var(--line-2)" /><circle cx="86" cy="67" r="3.4" fill="var(--line-2)" />
      <rect x="64" y="102" width="70" height="9" rx="4.5" fill="var(--line-2)" /><rect x="144" y="100" width="104" height="13" rx="4" fill="var(--line)" />
      <rect x="64" y="128" width="58" height="9" rx="4.5" fill="var(--line-2)" />
      <rect x="144" y="124" width="104" height="17" rx="5" fill="#0a0d12" /><text x="196" y="136.5" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="8.5" fontWeight="700" fill="var(--em)" letterSpacing=".08em">[REDACTED]</text>
      <rect x="64" y="156" width="76" height="9" rx="4.5" fill="var(--line-2)" /><rect x="144" y="154" width="72" height="13" rx="4" fill="var(--line)" />
      <rect x="64" y="184" width="150" height="22" rx="8" fill="var(--em-fill)" stroke="var(--em-line)" /><circle cx="78" cy="195" r="5" fill="var(--em)" /><rect x="90" y="191" width="96" height="8" rx="4" fill="var(--tx)" opacity=".42" />
      {/* the relayed alert (metadata only) */}
      <path d="M268 136c40 0 56-24 94-24" stroke="var(--cyan)" strokeWidth="1.7" strokeDasharray="3.5 4.5" strokeLinecap="round" />
      <g transform="translate(300 78)">
        <rect x="0" y="0" width="112" height="70" rx="12" fill="var(--panel)" stroke="var(--amber-line)" />
        <rect x="0" y="0" width="4" height="70" rx="2" fill="var(--amber)" />
        <circle cx="20" cy="16" r="6" fill="var(--amber-soft)" stroke="var(--amber)" strokeWidth="1.5" /><path d="M20 12.5v4" stroke="var(--amber)" strokeWidth="1.6" strokeLinecap="round" /><circle cx="20" cy="19.5" r=".9" fill="var(--amber)" />
        <rect x="32" y="12" width="60" height="8" rx="4" fill="var(--tx)" opacity=".5" />
        <rect x="14" y="32" width="84" height="7" rx="3.5" fill="var(--line-2)" /><rect x="14" y="45" width="60" height="7" rx="3.5" fill="var(--line-2)" />
        <rect x="14" y="56" width="40" height="7" rx="3.5" fill="var(--em)" opacity=".7" />
      </g>
      {/* the SOC */}
      <g transform="translate(316 178)">
        <rect x="0" y="0" width="92" height="64" rx="12" fill="var(--panel)" stroke="var(--line-2)" />
        {[0, 1, 2].map((r) => <g key={r}><rect x="12" y={12 + r * 16} width="68" height="8" rx="4" fill={r === 1 ? 'var(--cyan)' : 'var(--line-2)'} opacity={r === 1 ? '.8' : '1'} /></g>)}
      </g>
      <path d="M356 148v30" stroke="var(--cyan)" strokeWidth="1.7" strokeDasharray="3.5 4.5" strokeLinecap="round" />
      {/* shield */}
      <g transform="translate(20 196)">
        <path d="M34 4 L62 14 V40 C62 58 48 70 34 76 C20 70 6 58 6 40 V14 Z" fill="var(--em-fill)" stroke="var(--em)" strokeWidth="1.6" />
        <path d="M22 40 l9 9 l17 -19" stroke="var(--em)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <path d="M40 150l2.4 6.4 6.4 2.4-6.4 2.4L40 167.6l-2.4-6.4-6.4-2.4 6.4-2.4z" fill="var(--cyan)" opacity=".55" />
      <path d="M392 270l1.8 4.8 4.8 1.8-4.8 1.8-1.8 4.8-1.8-4.8-4.8-1.8 4.8-1.8z" fill="var(--cta)" opacity=".65" />
    </svg>
  )
}

function Feature({ icon: Icon, title, children, tone }) {
  return (
    <div className={`wen-card${tone ? ` ${tone}` : ''}`}>
      <span className="wen-ic"><Icon size={18} /></span>
      <b>{title}</b>
      <p>{children}</p>
    </div>
  )
}

function Group({ id, kicker, title, lead, children, aside }) {
  return (
    <section className="wen-group" id={id}>
      <div className="wen-group-head">
        <div className="wen-eyebrow">{kicker}</div>
        <h2>{title}</h2>
        {lead ? <p className="wen-lead">{lead}</p> : null}
      </div>
      {aside}
      <div className="wen-grid">{children}</div>
    </section>
  )
}

export default function WorkEnterprise() {
  useSeo({
    title: 'Enterprise features - WorkCoPilot by AdmireVeda',
    description: 'Everything a company needs to roll WorkCoPilot out across its people: on-device redaction, audit logs, SAST and live dependency checks, DLP governance, security alerts relayed to your SIEM, company knowledge, SSO, compliance evidence reports, executive ROI, white-label and per-company billing.',
    path: '/workcopilot/enterprise',
  })
  return (
    <div className="wen">
      <style>{CSS}</style>
      <SiteHeader current="enterprise" />
      <div className="wen-bg" aria-hidden />

      {/* HERO */}
      <section className="wen-hero">
        <div className="wen-wrap wen-hero-in">
          <div>
            <div className="wen-eyebrow"><Building2 size={14} /> For enterprises &amp; teams</div>
            <h1>Enterprise-grade guidance, with your data on your terms.</h1>
            <p className="wen-sub">Everything in Premium, plus the security, governance, identity and reporting controls a company needs to roll WorkCoPilot out across its people. Read-only by design, private by default, documented when you finish.</p>
            <div className="wen-ctas">
              <a className="wen-cta" href="/workcopilot/contact">Get an enterprise quote <ArrowRight size={16} /></a>
              <a className="wen-cta alt" href="/workcopilot/security">See the data protection <ArrowRight size={15} /></a>
            </div>
            <ul className="wen-proof" aria-label="At a glance">
              <li><Check size={14} /> On-device redaction, on by default</li>
              <li><Check size={14} /> Per-session audit log and evidence reports</li>
              <li><Check size={14} /> Alerts relayed to your SOC, metadata only</li>
            </ul>
          </div>
          <EntArt />
        </div>
      </section>

      <main className="wen-wrap wen-main">
        <Group id="security" kicker="Security & privacy" title="Nothing sensitive leaves a device unprotected."
          lead="Protection is on from the first second and enforced for everyone. What you see on screen is what the platform sees: sensitive values are already masked.">
          <Feature icon={ScanEye} title="On-device redaction, on by default">Personal and health data, keys, card numbers, IDs and more are redacted on the member's device before anything is sent, and shown as <code>[REDACTED]</code>. It is on for every member and locked by your company policy.</Feature>
          <Feature icon={FileText} title="Per-session audit log">Every session records what was sent, what was read from the screen, the static and live dependency checks run on any code, what was filtered, and every flag raised. Pull it any time.</Feature>
          <Feature icon={ShieldCheck} title="Built-in SAST and live dependency check">Code in a session is checked for common weaknesses, and its dependencies are checked live against the OSV vulnerability database before you run anything.</Feature>
          <Feature icon={Database} title="Encryption at rest">Session artifacts and company data are encrypted at rest with keys you can rotate under your own operational control.</Feature>
          <Feature icon={Lock} title="Mandatory MFA (TOTP)">Every account sets up an authenticator on first sign-in: password, company SSO and social sign-in all pass through the same second factor.</Feature>
          <Feature icon={EyeOff} title="Hidden from screen shares">The desktop overlay stays out of screen shares and recordings by default, so guidance never leaks into a meeting.</Feature>
        </Group>

        <Group id="governance" kicker="Governance / DLP" title="One company policy. Every member inherits it."
          lead="Decide what may leave a device, how long records are kept, and who may remove what - with every destructive action accountable.">
          <Feature icon={ListChecks} title="Custom scrub rules">Add your own patterns and words to redact or block, on top of the built-in protections. Members cannot weaken them.</Feature>
          <Feature icon={Scale} title="Retention windows">Set how long session records and documents are kept. Expiry is automatic and visible.</Feature>
          <Feature icon={Users} title="Member oversight">Company admins can pull the report and audit log of any member session, completed or in progress.</Feature>
          <Feature icon={FileText} title="Accountable destructive actions">Deleting, disabling or clearing anything requires a reason, recorded with who, what, when and why.</Feature>
        </Group>

        <Group id="alerts" kicker="Security alerts" title="Know the moment a member enters sensitive data."
          lead="When a member types PII or PHI, it is redacted on their device, and the company admin is told who, where and what kind - never the values.">
          <Feature icon={Bell} title="Who, where, what, when" tone="amber">Each alert carries the member's name, email and role; the task and the call it happened in; the categories and counts (for example "email x1, card x1"); and the time. The actual values are never stored or sent.</Feature>
          <Feature icon={ShieldCheck} title="Redacted before submission">The alert is evidence that the protection worked: the sensitive values were masked on the device before anything reached the platform.</Feature>
        </Group>

        <Group id="siem" kicker="SOC / SIEM integrations" title="Relay alerts into the tools your SOC already runs."
          lead="Connect your SIEM, SOAR, chat and observability tools from the company console. Test the connection with a sample alert. Only alert metadata is relayed."
          aside={(
            <div className="wen-chips" aria-label="Supported destinations">
              {SIEM_TARGETS.map((t) => <span key={t} className="wen-chip"><Radio size={12} /> {t}</span>)}
            </div>
          )}>
          <Feature icon={Radio} title="Automatic relay">New security alerts are relayed to every enabled connector as they happen, with the last delivery status shown per connector.</Feature>
          <Feature icon={Lock} title="Write-only secrets">Tokens and keys are stored write-only: the console never shows them back, and they can be rotated without re-entering anything else.</Feature>
          <Feature icon={Globe} title="Generic Webhook and Syslog / CEF">Anything not on the list connects through a signed webhook or a Syslog / CEF stream.</Feature>
        </Group>

        <Group id="knowledge" kicker="Company knowledge & skills" title="Guidance that follows your playbooks."
          lead="Upload your SOPs, runbooks, playbooks and skills, exported from any AI, so every plan and step aligns with how your organization works.">
          <Feature icon={BookOpen} title="Private to your company">Your knowledge is used only to guide your own members. It is never used to train the platform and never shared with another company.</Feature>
          <Feature icon={Database} title="You keep the copy">Admins can download the company knowledge at any time and re-upload or replace it. It stays yours.</Feature>
          <Feature icon={Bot} title="Any source">Bring documents, diagrams and skills exported from the AI tools you already use.</Feature>
        </Group>

        <Group id="identity" kicker="Identity" title="Sign in the way your company already does."
          lead="Invite-only provisioning, company single sign-on with your identity provider, social sign-in for individuals, and an authenticator on every path.">
          <Feature icon={KeyRound} title="Company SSO (OIDC)">Fourteen identity providers, including Google, Microsoft Entra, Okta, Auth0, OneLogin and Ping. Members are provisioned invite-only, never self-served.</Feature>
          <Feature icon={Sparkles} title="Email-domain auto-detect">Type a company email at sign-in and WorkCoPilot recognizes the domain and routes straight to your single sign-on.</Feature>
          <Feature icon={Users} title="Social sign-in and profile completion">Individuals can continue with Google, Microsoft or Facebook; a new account completes its profile, then sets up its authenticator.</Feature>
        </Group>

        <Group id="compliance" kicker="Compliance evidence & reporting" title="Evidence your auditors can work with."
          lead="Reports that support your compliance program - grounded in what actually happened, mapped to the frameworks you answer to, and sealed so they can be verified.">
          <Feature icon={Scale} title="Mapped to 18 frameworks">Per-task compliance evidence reports map the controls exercised in a session to eighteen frameworks, each with its own focus. Evidence that supports your program; WorkCoPilot does not certify compliance.</Feature>
          <Feature icon={ShieldCheck} title="Authenticity seal">Every report carries a verifiable authenticity seal, so a recipient can confirm it is genuine and unaltered.</Feature>
          <Feature icon={FileText} title="Big-4-grade session reports">Cover, contents, charts, the confirmed steps and the outcome, with scrubbed milestone screenshots as evidence of each confirmed step.</Feature>
        </Group>

        <Group id="exec" kicker="Executive & commercial" title="Run it like a company product."
          lead="An executive view of productivity, your brand on the product, and billing that matches how companies buy.">
          <Feature icon={BarChart3} title="Executive ROI dashboard">An executive role with a productivity dashboard: tasks, time, and an illustrative view of time and cost saved, exportable to PDF, image and CSV.</Feature>
          <Feature icon={Palette} title="White-label branding">Your company name and logo on the product your people use.</Feature>
          <Feature icon={Receipt} title="Per-company pricing, seat pools, statements and invoices">Separate user and admin seat pools, a company minute pool, pricing set for your company, and billing statements with downloadable invoices.</Feature>
        </Group>

        <Group id="platform" kicker="Platform" title="Desktop, web and mobile. Guidance, not generation."
          lead="Your people use it where they work. WorkCoPilot guides; it never acts for you and never generates content on your behalf.">
          <Feature icon={Monitor} title="Desktop overlay">A floating, see-through overlay that stays on top of the app you are working in, hidden from screen shares.</Feature>
          <Feature icon={Globe} title="Web">Nothing to install. Sign in and share a screen; a floating window keeps the steps above your work.</Feature>
          <Feature icon={Smartphone} title="Mobile">Point the camera at a screen, a device or paper and follow the steps from your phone.</Feature>
          <Feature icon={Bot} title="No content generation">When a task needs a document or an image, WorkCoPilot hands you a well-formed prompt for your own AI, with security and privacy already built in. It never produces the content itself.</Feature>
        </Group>

        <section className="wen-final">
          <h2>Roll it out across your people.</h2>
          <p>A named owner for your rollout, a DPA, and on-prem options on request.</p>
          <div className="wen-ctas center">
            <a className="wen-cta big" href="/workcopilot/contact">Get an enterprise quote <ArrowRight size={17} /></a>
            <a className="wen-cta alt" href="/workcopilot/dpa">Read the DPA <ArrowRight size={15} /></a>
          </div>
        </section>
      </main>
    </div>
  )
}

const CSS = `
.wen{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--mut:#5c6484;
  --em:#0e9f6e;--cyan:#0a84c2;--em-fill:rgba(14,159,110,.08);--em-fill-2:rgba(14,159,110,.14);--em-line:rgba(14,159,110,.30);
  --cyan-fill:rgba(10,132,194,.08);--cyan-line:rgba(10,132,194,.26);
  --amber:#b7791f;--amber-soft:rgba(183,121,31,.10);--amber-line:rgba(183,121,31,.34);
  --cta:#f26a43;--cta-2:#e35a31;--cta-ink:#ffffff;
  --card-shadow:0 1px 2px rgba(26,31,54,.05),0 10px 26px -16px rgba(26,31,54,.16);--card-shadow-hover:0 1px 2px rgba(26,31,54,.06),0 14px 32px -16px rgba(26,31,54,.22);
  --display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  position:relative;min-height:100vh;background:var(--bg);color:var(--tx);font-family:"Figtree",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
[data-theme='dark'] .wen{--bg:#0a0b12;--panel:#13141f;--panel-2:#181b27;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.15);--tx:#eef0f6;--mut:#9aa0b4;
  --em:#8cf5c4;--cyan:#39d3ff;--em-fill:rgba(140,245,196,.10);--em-fill-2:rgba(140,245,196,.17);--em-line:rgba(140,245,196,.34);
  --cyan-fill:rgba(57,211,255,.10);--cyan-line:rgba(57,211,255,.30);
  --amber:#f5c86b;--amber-soft:rgba(245,200,107,.12);--amber-line:rgba(245,200,107,.36);
  --cta:#ffb561;--cta-2:#ff7a59;--cta-ink:#241206;
  --card-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 26px -20px rgba(0,0,0,.8);--card-shadow-hover:0 1px 0 rgba(255,255,255,.04) inset,0 14px 30px -18px rgba(0,0,0,.9)}
.wen *{box-sizing:border-box}
.wen h1,.wen h2{margin:0;color:var(--tx);font-family:var(--display);letter-spacing:-.025em}
.wen a{color:inherit;text-decoration:none}
.wen code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.9em;background:#0a0d12;color:var(--em);border-radius:6px;padding:1px 7px;letter-spacing:.06em;font-weight:700}
.wen-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 22%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.32;mask-image:radial-gradient(60% 50% at 70% 10%,#000 20%,transparent 100%);-webkit-mask-image:radial-gradient(60% 50% at 70% 10%,#000 20%,transparent 100%)}
.wen-wrap{max-width:1160px;margin:0 auto;padding:0 24px;position:relative;z-index:2}
.wen-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);margin-bottom:12px}

/* hero */
.wen-hero{padding:56px 0 30px}
.wen-hero-in{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:40px;align-items:center;padding-top:30px;padding-bottom:30px;border-radius:28px;border:1px solid var(--line);background:linear-gradient(135deg,color-mix(in srgb,var(--panel) 94%,transparent),color-mix(in srgb,var(--panel) 80%,transparent));backdrop-filter:blur(18px) saturate(1.15);-webkit-backdrop-filter:blur(18px) saturate(1.15);box-shadow:var(--card-shadow);position:relative;overflow:hidden}
.wen-hero-in::before{content:'';position:absolute;left:38px;right:38px;top:0;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--em),var(--cyan),transparent)}
.wen-hero-in>div{padding:10px 0 10px 16px}
.wen-hero h1{font-weight:800;font-size:clamp(32px,4.2vw,52px);line-height:1.04;text-wrap:balance;max-width:16ch}
.wen-sub{color:var(--mut);font-size:17px;line-height:1.55;max-width:52ch;margin:16px 0 22px}
.wen-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.wen-ctas.center{justify-content:center}
.wen-cta{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;background:linear-gradient(135deg,var(--cta),var(--cta-2));color:var(--cta-ink);border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 12px 30px -14px var(--cta-2);transition:transform .15s,box-shadow .15s,filter .15s}
.wen-cta:hover{transform:translateY(-2px);filter:brightness(1.04);box-shadow:0 16px 34px -14px var(--cta-2)}
.wen-cta.big{padding:16px 28px;font-size:16.5px}
.wen-cta.alt{background:var(--panel);color:var(--tx);border:1px solid var(--line-2);box-shadow:none}
.wen-cta.alt:hover{border-color:var(--cyan);color:var(--cyan)}
.wen-proof{list-style:none;margin:22px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.wen-proof li{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tx)}
.wen-proof svg{color:var(--em);flex:none}
.wen-art{display:block;width:100%;height:auto;max-width:520px;justify-self:end;margin-right:12px;animation:wen-rise .6s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 18px 30px rgba(26,31,54,.16))}
[data-theme='dark'] .wen-art{filter:drop-shadow(0 0 28px rgba(140,245,196,.16)) drop-shadow(0 18px 30px rgba(0,0,0,.55))}
@keyframes wen-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* groups */
.wen-main{padding:10px 24px 80px;display:flex;flex-direction:column;gap:22px}
.wen-group{padding:30px 32px 30px;border-radius:24px;border:1px solid var(--line);background:var(--panel);box-shadow:var(--card-shadow);position:relative;overflow:hidden}
.wen-group::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 200px at 100% 0%,var(--em-fill),transparent 70%)}
.wen-group>*{position:relative;z-index:1}
.wen-group-head{max-width:70ch;margin-bottom:20px}
.wen-group h2{font-weight:800;font-size:clamp(24px,2.8vw,34px);line-height:1.1;text-wrap:balance}
.wen-lead{color:var(--mut);font-size:15.5px;line-height:1.55;margin:12px 0 0;text-wrap:pretty}
.wen-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.wen-card{position:relative;display:flex;flex-direction:column;gap:8px;padding:18px 18px 17px;border-radius:16px;border:1px solid var(--line);background:var(--panel-2);box-shadow:var(--card-shadow);transition:border-color .18s,box-shadow .18s,transform .15s;overflow:hidden}
.wen-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--em),var(--cyan));opacity:0;transition:opacity .18s}
.wen-card:hover{border-color:var(--line-2);box-shadow:var(--card-shadow-hover);transform:translateY(-2px)}
.wen-card:hover::before{opacity:1}
.wen-card b{font-size:15.5px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.wen-card p{margin:0;font-size:13.5px;line-height:1.55;color:var(--mut)}
.wen-ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line)}
.wen-card.amber{background:var(--amber-soft);border-color:var(--amber-line)}
.wen-card.amber .wen-ic{background:var(--panel);color:var(--amber);border-color:var(--amber-line)}
.wen-card.amber::before{background:var(--amber);opacity:1}
.wen-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.wen-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;font-size:12.5px;font-weight:600;color:var(--tx);background:var(--cyan-fill);border:1px solid var(--cyan-line)}
.wen-chip svg{color:var(--cyan)}

/* final */
.wen-final{text-align:center;padding:40px 24px 10px}
.wen-final h2{font-weight:800;font-size:clamp(28px,4vw,42px);line-height:1.08}
.wen-final p{color:var(--mut);font-size:16px;margin:12px 0 22px}

@media(max-width:980px){.wen-grid{grid-template-columns:1fr 1fr}.wen-hero-in{grid-template-columns:1fr;gap:18px}.wen-art{justify-self:center;margin:0;max-width:440px}.wen-hero h1{max-width:none}}
@media(max-width:640px){.wen-hero{padding:34px 0 18px}.wen-hero-in{padding:22px 4px 22px;border-radius:20px}.wen-hero-in>div{padding:0 14px}.wen-grid{grid-template-columns:1fr}.wen-group{padding:22px 18px 22px;border-radius:18px}.wen-main{padding:6px 14px 56px;gap:14px}.wen-art{display:none}}
@media(prefers-reduced-motion:reduce){.wen-art{animation:none}.wen-card,.wen-cta{transition:none}}
`
