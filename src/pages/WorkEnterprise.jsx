// WorkCoPilot - Enterprise features (dedicated public page, linked from the
// main page's "For companies & teams" section and the site nav).
//
// REDESIGN (owner, 2026-10-24): the KILLER FEATURE leads. "How WorkCoPilot is
// being trained from users for its own enterprise apps, data, content,
// playbooks, so the responses can be must." The hero and the first section
// now sell exactly that: your company uploads its SOPs, playbooks, app guides
// and data, and every on-screen step is grounded in how YOUR company works,
// getting sharper as that knowledge grows. And the product is HAND-HOLDING,
// not a page of tips: it watches the screen, walks each exact step, catches a
// wrong turn and corrects it live (owner: "it is not just guidance, it is
// hand-holding").
//
// HONESTY CONTRACT (owner, binding):
//   - READ-ONLY: it never clicks, types or runs anything for a person. Every
//     line says "hand-holds / guides your hands", never "does it for you".
//   - Company knowledge is PRIVATE and TENANT-SCOPED: used only to guide that
//     company's own members, never to train a shared or global model, never
//     shared across tenants. The company admin can view, download, re-upload
//     or replace, and clear it; destructive actions are logged with a reason.
//   - State guarantees, never mechanism. No model or provider names. Evidence
//     that SUPPORTS a compliance program; never "certified". No invented
//     metrics (the before/after is labeled an illustrative example).
// Design system: brand green/blue with the orange CTA, light page (the shared
// SiteHeader is light; the shared SiteFooter is the one dark band), on-brand
// inline SVG, responsive, US spelling, no em-dashes in copy.
import React from 'react'
import {
  ShieldCheck, ScanEye, FileText, Lock, KeyRound, Bell, Radio, BookOpen, Scale, BarChart3, Palette,
  Monitor, Globe, Smartphone, Check, ArrowRight, Building2, Users, Receipt, EyeOff, Database, ListChecks, Bot, Sparkles,
  UploadCloud, Hand, RefreshCw, Download, Trash2, History, Target, X, ScrollText,
} from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import ReleaseNote from '../components/ReleaseNote.jsx'   // localized "new in this release" highlights (rel.*)
import SiteHeader from '../components/SiteHeader.jsx'
import useSeo from '../useSeo.js'
import { useT } from '../i18n/index.jsx'           // localized <title>/description (seo.* keys)

// The SOC / SIEM relay targets. Names only (no third-party logos).
const SIEM_TARGETS = ['Splunk', 'Microsoft Sentinel', 'IBM QRadar', 'Elastic', 'Datadog', 'Sumo Logic', 'Google Chronicle', 'PagerDuty', 'Opsgenie', 'Slack', 'Microsoft Teams', 'ServiceNow', 'Webhook', 'Syslog / CEF']

// What a company can upload. Names only; every one goes through the admin.
const KNOWLEDGE_KINDS = ['SOPs', 'Runbooks', 'Playbooks', 'App walkthroughs', 'Policies', 'Data dictionaries', 'Process maps', 'Checklists', 'Templates', 'Skills exported from any AI']

// Hero graphic: the LEARNING LOOP. Your documents (left) flow into a shielded
// company tenant (center), which grounds the hand-holding on a member's screen
// (right): steps ticked, the current step highlighted, a wrong turn corrected.
// A dashed loop returns from the screen to the tenant: knowledge grows,
// guidance sharpens. Every color is a page token so it reads on light and dark.
function LoopArt() {
  return (
    <svg className="wen-art" viewBox="0 0 480 320" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="wenDots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="1.2" fill="var(--cyan)" opacity=".32" /></pattern>
        <linearGradient id="wenGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--em)" stopOpacity=".22" /><stop offset="1" stopColor="var(--cyan)" stopOpacity=".12" /></linearGradient>
        <linearGradient id="wenBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--em)" /><stop offset="1" stopColor="var(--cyan)" /></linearGradient>
        <marker id="wenHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--cyan)" /></marker>
        <marker id="wenHeadEm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--em)" /></marker>
      </defs>
      <ellipse cx="240" cy="168" rx="226" ry="124" fill="url(#wenGlow)" />
      <rect x="14" y="214" width="130" height="94" rx="14" fill="url(#wenDots)" />
      <circle cx="402" cy="62" r="54" stroke="var(--cyan)" strokeOpacity=".22" strokeWidth="1.2" />
      <circle cx="402" cy="62" r="36" stroke="var(--cyan)" strokeOpacity=".16" strokeWidth="1.2" strokeDasharray="4 6" />

      {/* YOUR KNOWLEDGE: three document cards */}
      {[
        { y: 56, label: 'SOP' },
        { y: 118, label: 'PLAYBOOK' },
        { y: 180, label: 'APP GUIDE' },
      ].map((d, i) => (
        <g key={d.label} transform={`translate(${26 + i * 8} ${d.y})`}>
          <rect x="0" y="0" width="112" height="52" rx="11" fill="var(--panel)" stroke="var(--line-2)" />
          <rect x="0" y="0" width="112" height="3" rx="1.5" fill="url(#wenBar)" />
          <rect x="12" y="14" width="40" height="7" rx="3.5" fill="var(--em)" opacity=".85" />
          <rect x="12" y="27" width="86" height="6" rx="3" fill="var(--line-2)" />
          <rect x="12" y="38" width="62" height="6" rx="3" fill="var(--line-2)" />
          <text x="100" y="20" textAnchor="end" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7" fontWeight="700" fill="var(--mut)" letterSpacing=".1em">{d.label}</text>
        </g>
      ))}
      {/* documents -> tenant */}
      <path d="M146 82c26 0 36 50 62 70" stroke="var(--cyan)" strokeWidth="1.6" strokeDasharray="3.5 4.5" strokeLinecap="round" markerEnd="url(#wenHead)" />
      <path d="M154 144c20 0 30 6 54 10" stroke="var(--cyan)" strokeWidth="1.6" strokeDasharray="3.5 4.5" strokeLinecap="round" markerEnd="url(#wenHead)" />
      <path d="M162 206c26 0 34 -36 46 -42" stroke="var(--cyan)" strokeWidth="1.6" strokeDasharray="3.5 4.5" strokeLinecap="round" markerEnd="url(#wenHead)" />

      {/* YOUR TENANT: shielded, private */}
      <g transform="translate(212 104)">
        <rect x="0" y="0" width="112" height="112" rx="18" fill="var(--panel)" stroke="var(--em-line)" strokeWidth="1.4" />
        <rect x="0" y="0" width="112" height="3" rx="1.5" fill="url(#wenBar)" />
        <path d="M56 22 L80 31 V54 C80 70 68 80 56 86 C44 80 32 70 32 54 V31 Z" fill="var(--em-fill)" stroke="var(--em)" strokeWidth="1.6" />
        <rect x="48" y="50" width="16" height="13" rx="3" fill="var(--em)" />
        <path d="M51 50v-4a5 5 0 0 1 10 0v4" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <text x="56" y="102" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7.5" fontWeight="700" fill="var(--em)" letterSpacing=".12em">YOUR TENANT</text>
      </g>
      {/* tenant -> screen */}
      <path d="M326 160h34" stroke="var(--em)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#wenHeadEm)" />

      {/* THE MEMBER'S SCREEN: hand-holding, step by step */}
      <g transform="translate(366 54)">
        <rect x="0" y="0" width="104" height="212" rx="16" fill="var(--panel)" stroke="var(--line-2)" />
        <rect x="0" y="0" width="104" height="3" rx="1.5" fill="url(#wenBar)" />
        <path d="M0 26h104" stroke="var(--line)" />
        <circle cx="14" cy="13" r="3" fill="var(--line-2)" /><circle cx="24" cy="13" r="3" fill="var(--line-2)" /><circle cx="34" cy="13" r="3" fill="var(--line-2)" />
        {/* done steps */}
        <circle cx="20" cy="48" r="8" fill="var(--em)" /><path d="M16 48.2l2.6 2.6 5.4-5.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="36" y="44" width="54" height="8" rx="4" fill="var(--line-2)" />
        <circle cx="20" cy="76" r="8" fill="var(--em)" /><path d="M16 76.2l2.6 2.6 5.4-5.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="36" y="72" width="40" height="8" rx="4" fill="var(--line-2)" />
        {/* current step: "Now, do this" */}
        <rect x="8" y="96" width="88" height="42" rx="10" fill="var(--em-fill)" stroke="var(--em-line)" />
        <rect x="8" y="96" width="3" height="42" rx="1.5" fill="url(#wenBar)" />
        <circle cx="22" cy="110" r="7" fill="var(--panel)" stroke="var(--em)" strokeWidth="2" /><circle cx="22" cy="110" r="2.6" fill="var(--em)" />
        <rect x="34" y="106" width="52" height="8" rx="4" fill="var(--tx)" opacity=".5" />
        <rect x="20" y="122" width="66" height="7" rx="3.5" fill="var(--em)" opacity=".7" />
        {/* next steps */}
        <circle cx="20" cy="160" r="8" stroke="var(--line-2)" strokeDasharray="3 3" /><rect x="36" y="156" width="48" height="8" rx="4" fill="var(--line)" />
        <circle cx="20" cy="188" r="8" stroke="var(--line-2)" strokeDasharray="3 3" /><rect x="36" y="184" width="36" height="8" rx="4" fill="var(--line)" />
      </g>
      {/* the correction: a wrong turn caught */}
      <g transform="translate(300 24)">
        <rect x="0" y="0" width="118" height="34" rx="10" fill="var(--panel)" stroke="var(--amber-line)" />
        <rect x="0" y="0" width="4" height="34" rx="2" fill="var(--amber)" />
        <circle cx="20" cy="17" r="7" fill="var(--amber-soft)" stroke="var(--amber)" strokeWidth="1.5" /><path d="M20 13v5" stroke="var(--amber)" strokeWidth="1.7" strokeLinecap="round" /><circle cx="20" cy="21.3" r="1" fill="var(--amber)" />
        <text x="34" y="15" fontFamily="Figtree, system-ui, sans-serif" fontSize="8.5" fontWeight="700" fill="var(--tx)">Wrong field. Corrected.</text>
        <rect x="34" y="21" width="62" height="5" rx="2.5" fill="var(--line-2)" />
      </g>
      <path d="M352 58c6 8 8 14 14 20" stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="3 3.5" strokeLinecap="round" />

      {/* the loop back: knowledge grows, guidance sharpens */}
      <path d="M418 272c-40 32 -120 34 -156 8" stroke="var(--em)" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" markerEnd="url(#wenHeadEm)" />
      <text x="342" y="304" textAnchor="middle" fontFamily="JetBrains Mono, ui-monospace, monospace" fontSize="7.5" fontWeight="700" fill="var(--em)" letterSpacing=".12em">GETS SHARPER</text>
      <path d="M186 258l2.4 6.4 6.4 2.4-6.4 2.4-2.4 6.4-2.4-6.4-6.4-2.4 6.4-2.4z" fill="var(--cyan)" opacity=".55" />
      <path d="M458 290l1.8 4.8 4.8 1.8-4.8 1.8-1.8 4.8-1.8-4.8-4.8-1.8 4.8-1.8z" fill="var(--cta)" opacity=".7" />
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

// The learning loop: four steps, in order. Copy is guarantees only.
const LOOP = [
  { icon: UploadCloud, k: '01', t: 'Upload your knowledge', d: 'Your admin loads SOPs, playbooks, app guides and policies once. Every member inherits them.' },
  { icon: Target, k: '02', t: 'Every step is grounded in it', d: 'Steps use your app names, your fields, your approval chain. Not a generic how-to.' },
  { icon: Hand, k: '03', t: 'It hand-holds, on the real screen', d: 'It points at the exact next step in your apps and corrects a wrong turn live. Read-only: it never clicks or types for anyone.' },
  { icon: RefreshCw, k: '04', t: 'It gets sharper as you add', d: 'Add a playbook or fix an SOP, and the next session reflects it. For your company only.' },
]

export default function WorkEnterprise() {
  const t = useT()
  useSeo({
    title: t('seo.enterprise.title'),
    description: t('seo.enterprise.description'),
    path: '/workcopilot/enterprise',
  })
  return (
    <div className="wen">
      <style>{CSS}</style>
      <SiteHeader current="enterprise" />
      <div className="wen-bg" aria-hidden />

      {/* HERO: hand-holding + learns your company */}
      <section className="wen-hero">
        <div className="wen-wrap wen-hero-in">
          <div>
            <div className="wen-eyebrow"><Building2 size={14} /> For enterprises &amp; teams</div>
            <h1>Hand-holding for every step. <span className="wen-hl">Trained on how your company works.</span></h1>
            <p className="wen-sub">It watches each person's screen and walks them through the exact next step in your own apps, correcting a wrong turn as it happens. Upload your SOPs and playbooks, and every step follows the way your company actually works. Read-only by design: it never clicks or types for your people.</p>
            <div className="wen-ctas">
              <a className="wen-cta" href="/workcopilot/contact">Get an enterprise quote <ArrowRight size={16} /></a>
              <a className="wen-cta alt" href="#learn">See how it learns your company <ArrowRight size={15} /></a>
            </div>
            <ul className="wen-proof" aria-label="At a glance">
              <li><Check size={14} /> Watches the screen and hand-holds through each exact step</li>
              <li><Check size={14} /> Catches a wrong turn and corrects it in real time</li>
              <li><Check size={14} /> Grounded in your playbooks, private to your tenant</li>
              <li><Check size={14} /> Checks every step against your own written security policy</li>
            </ul>
          </div>
          <LoopArt />
        </div>
      </section>

      <main className="wen-wrap wen-main">
        {/* THE KILLER FEATURE: it learns your enterprise */}
        <section className="wen-kill" id="learn">
          <div className="wen-kill-head">
            <div className="wen-eyebrow warm"><Sparkles size={14} /> The difference</div>
            <h2>It learns <span className="wen-hl">your</span> enterprise. Your apps, your data, your playbooks.</h2>
            <p className="wen-lead">Generic assistants know the world. WorkCoPilot knows your company: your apps, your fields, your approvals, your names. Upload once, and every on-screen step speaks your language, sharper as your knowledge grows.</p>
          </div>

          <ol className="wen-loop" aria-label="How WorkCoPilot learns your company">
            {LOOP.map((s) => (
              <li key={s.k} className="wen-loop-step">
                <div className="wen-loop-top"><span className="wen-loop-ic"><s.icon size={18} /></span><span className="wen-loop-k">{s.k}</span></div>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>

          {/* Before / after: the same step, generic vs grounded in your company */}
          <div className="wen-ba" aria-label="The same step, with and without your company knowledge">
            <div className="wen-ba-col generic">
              <div className="wen-ba-tag"><X size={13} /> Without your knowledge</div>
              <p className="wen-ba-q">"Create the change request."</p>
              <p className="wen-ba-a">Open your ticketing system, create a new change request, fill the required fields, attach the approval, submit.</p>
              <div className="wen-ba-foot">Correct, but your people still have to know which system, which fields, which approval.</div>
            </div>
            <div className="wen-ba-arrow" aria-hidden><ArrowRight size={18} /></div>
            <div className="wen-ba-col yours">
              <div className="wen-ba-tag"><Check size={13} /> Grounded in your company</div>
              <p className="wen-ba-q">"Create the change request."</p>
              <p className="wen-ba-a">In ServiceNow: <b>Change &gt; Create New &gt; Standard</b>. Set <b>Assignment group</b> to <b>Platform-Ops</b>, template <b>CHG-STD-07</b>, attach the CAB approval, Submit. From your <b>Change Playbook, section 3.2</b>.</p>
              <div className="wen-ba-foot"><Hand size={13} /> It hand-holds through each click and flags the wrong template before it is submitted.</div>
            </div>
          </div>
          <p className="wen-ba-note">Illustrative example. Your steps come from your own uploaded knowledge and apps.</p>

          {/* Trust: private, tenant-scoped, admin-controlled */}
          <div className="wen-trust">
            <div className="wen-trust-head">
              <span className="wen-trust-ic"><Lock size={18} /></span>
              <div>
                <b>Private to your tenant. Controlled by your admin.</b>
                <p>Your knowledge makes your own people better, and nobody else's.</p>
              </div>
            </div>
            <ul className="wen-trust-grid">
              <li><span className="wen-tick"><ShieldCheck size={15} /></span><div><b>Stays inside your company</b><span>Guides your own members only. Never trains a shared model or reaches another company.</span></div></li>
              <li><span className="wen-tick"><Download size={15} /></span><div><b>You keep the copy</b><span>View what is loaded and download your knowledge any time.</span></div></li>
              <li><span className="wen-tick"><RefreshCw size={15} /></span><div><b>Re-upload or replace</b><span>Merge in new material or swap the whole set.</span></div></li>
              <li><span className="wen-tick"><Trash2 size={15} /></span><div><b>Clear it when you choose</b><span>Clearing needs a reason, logged with who, what, when and why.</span></div></li>
            </ul>
          </div>

          <div className="wen-kinds" aria-label="What you can upload">
            <span className="wen-kinds-k"><BookOpen size={13} /> Bring</span>
            {KNOWLEDGE_KINDS.map((k) => <span key={k} className="wen-chip">{k}</span>)}
          </div>
        </section>

        <Group id="security" kicker="Security & privacy" title="Nothing sensitive leaves a device unprotected."
          lead="Protection is on from the first second and enforced for everyone. Sensitive values are masked before anything is sent.">
          <Feature icon={ScanEye} title="On-device redaction, on by default">Personal data, keys, card numbers and IDs are masked on the device and shown as <code>[REDACTED]</code>. On for everyone, locked by policy.</Feature>
          <Feature icon={FileText} title="Per-session audit log">Every session logs what was sent, read, filtered and flagged. Pull it any time.</Feature>
          <Feature icon={ShieldCheck} title="Built-in SAST and dependency check">Code in a session is scanned for weaknesses and its dependencies checked against the OSV database before you run it.</Feature>
          <Feature icon={Database} title="Encryption at rest">Session artifacts and company data are encrypted at rest, with keys you can rotate.</Feature>
          <Feature icon={Lock} title="Mandatory MFA (TOTP)">Every account uses an authenticator. Password, SSO and social sign-in all pass the same second factor.</Feature>
          <Feature icon={EyeOff} title="Hidden from screen shares">The desktop overlay stays out of screen shares and recordings by default.</Feature>
        </Group>

        <Group id="governance" kicker="Governance / DLP" title="One company policy. Every member inherits it."
          lead="Your written security policy becomes the rules every step is checked against. You decide what may leave a device, how long records are kept, and who may remove what.">
          {/* PRIME: the company's own written policy, enforced as the guide works.
              Honesty: it flags and cites, never rewrites or deletes the model's text;
              controls and evidence that support the program, never "makes you compliant". */}
          <Feature icon={ScrollText} title="Your written security policy, enforced as it guides" tone="prime">Paste your company's own security policy and your admin arms its rules. Every step, result and document is then checked against them on the server: a prohibited or skipped-required step is flagged inline and cited to your policy by name and section (for example <code>Acceptable Use Policy §4.2</code>), with the compliant alternative beside it and a line in the audit log. It flags and cites, it never rewrites your text.</Feature>
          <Feature icon={ListChecks} title="Custom scrub rules">Add your own patterns and words to redact or block. Members cannot weaken them.</Feature>
          <Feature icon={Scale} title="Retention windows">Set how long session records and documents are kept. Expiry is automatic.</Feature>
          <Feature icon={Users} title="Member oversight">Admins can pull the report and audit log of any member session, live or complete.</Feature>
          <Feature icon={History} title="Accountable destructive actions">Deleting or clearing anything requires a reason, logged with who, what, when and why.</Feature>
          <Feature icon={KeyRound} title="Per-company AI keys, or bring your own">Route through your company's own keys or bring your own. Nothing is shared across companies.</Feature>
          <Feature icon={Globe} title={t('residency.title')}>{t('residency.ent')}</Feature>
        </Group>

        <Group id="alerts" kicker="Security alerts & SOC" title="Know the moment sensitive data is entered. Relay it to your SOC."
          lead="When a member enters PII or PHI, it is masked on their device and your admin is told who, where and what kind, never the values. Relay those alerts into the SIEM, SOAR and chat tools you already run."
          aside={(
            <div className="wen-chips" aria-label="Supported destinations">
              {SIEM_TARGETS.map((t) => <span key={t} className="wen-chip cyan"><Radio size={12} /> {t}</span>)}
            </div>
          )}>
          <Feature icon={Bell} title="Who, where, what, when" tone="amber">Each alert names the member, the task, and the kind and count of data (for example email x1, card x1). The values are never stored or sent.</Feature>
          <Feature icon={ShieldCheck} title="Redacted before submission">Proof the protection worked: values were masked on the device before anything reached the platform.</Feature>
          <Feature icon={Radio} title="Automatic relay">New alerts reach every enabled connector as they happen, with per-connector delivery status.</Feature>
          <Feature icon={Lock} title="Write-only secrets">Tokens are stored write-only and can be rotated. The console never shows them back.</Feature>
          <Feature icon={Globe} title="Generic Webhook and Syslog / CEF">Anything not on the list connects through a signed webhook or a Syslog / CEF stream.</Feature>
        </Group>

        <Group id="identity" kicker="Identity" title="Sign in the way your company already does."
          lead="Invite-only provisioning, company single sign-on with your identity provider, and an authenticator on every path.">
          <Feature icon={KeyRound} title="Company SSO (OIDC)">Fourteen identity providers including Google, Microsoft Entra, Okta, Auth0 and Ping. Members are invited, never self-served.</Feature>
          <Feature icon={Sparkles} title="Email-domain auto-detect">Type a company email and WorkCoPilot routes straight to your single sign-on.</Feature>
          <Feature icon={Users} title="Social sign-in">Individuals continue with Google, Microsoft or Facebook, then set up their authenticator.</Feature>
        </Group>

        <Group id="compliance" kicker="Compliance evidence & reporting" title="Evidence your auditors can work with."
          lead="Reports that support your compliance program, mapped to the frameworks you answer to and sealed so they can be verified.">
          <Feature icon={Scale} title="Mapped to 18 frameworks">Per-task evidence reports map the controls exercised in a session to eighteen frameworks. Evidence that supports your program; not a certification.</Feature>
          <Feature icon={ShieldCheck} title="Authenticity seal">Every report carries a verifiable seal, so a recipient can confirm it is genuine and unaltered.</Feature>
          <Feature icon={FileText} title="Big-4-grade session reports">Cover, contents, charts, the confirmed steps and the outcome, with scrubbed milestone screenshots as evidence.</Feature>
        </Group>

        <Group id="exec" kicker="Executive & commercial" title="Run it like a company product."
          lead="An executive view of productivity, your brand on the product, and billing that matches how companies buy.">
          <Feature icon={BarChart3} title="Executive ROI dashboard">A productivity dashboard of tasks, time, and an illustrative view of time and cost saved. Export to PDF, image or CSV.</Feature>
          <Feature icon={Palette} title="White-label branding">Your company name and logo on the product your people use.</Feature>
          <Feature icon={Building2} title="Unlimited seats, one admin console">Unlimited seats and tasks, managed from one central admin console.</Feature>
          <Feature icon={Receipt} title="Per-company pricing and billing">Separate user and admin seat pools, a company minute pool, your pricing, and statements with downloadable invoices.</Feature>
        </Group>

        <Group id="platform" kicker="Platform" title="Desktop, web and mobile. Hand-holding, not automation."
          lead="Your people use it where they work. It guides their hands step by step; it never acts for them and never generates content for them.">
          <Feature icon={Monitor} title="Desktop overlay">A see-through overlay that stays on top of the app you are in, hidden from screen shares.</Feature>
          <Feature icon={Globe} title="Web">Nothing to install. Sign in, share a screen, and a floating window keeps the steps above your work.</Feature>
          <Feature icon={Smartphone} title="Mobile">Point your phone's camera at a screen, a device or paper and follow the steps.</Feature>
          <Feature icon={Bot} title="No content generation">When a task needs a document or image, it hands you a ready prompt for your own AI. It never produces the content itself.</Feature>
        </Group>

        <section className="wen-final">
          <h2>Give your people a hand that knows your company.</h2>
          <p>A named owner for your rollout, a DPA, and on-prem options on request.</p>
          <div className="wen-ctas center">
            <a className="wen-cta big" href="/workcopilot/contact">Get an enterprise quote <ArrowRight size={17} /></a>
            <a className="wen-cta alt" href="/workcopilot/dpa">Read the DPA <ArrowRight size={15} /></a>
          </div>
        </section>
      <ReleaseNote groups={['enterprise']} />
      </main>
      <SiteFooter />
    </div>
  )
}

const CSS = `
.wen{--bg:#f3f5fb;--panel:#ffffff;--panel-2:#f7f9fd;--line:#e6e8f1;--line-2:#d3d7e5;--tx:#161a2b;--mut:#5c6484;
  --em:#0e9f6e;--cyan:#0a84c2;--em-fill:rgba(14,159,110,.08);--em-fill-2:rgba(14,159,110,.14);--em-line:rgba(14,159,110,.30);
  --cyan-fill:rgba(10,132,194,.08);--cyan-line:rgba(10,132,194,.26);
  --amber:#b7791f;--amber-soft:rgba(183,121,31,.10);--amber-line:rgba(183,121,31,.34);
  --cta:#f26a43;--cta-2:#e35a31;--cta-ink:#ffffff;--cta-soft:rgba(242,106,67,.10);--cta-line:rgba(242,106,67,.30);--cta-text:#b63f1c;
  --card-shadow:0 1px 2px rgba(26,31,54,.05),0 10px 26px -16px rgba(26,31,54,.16);--card-shadow-hover:0 1px 2px rgba(26,31,54,.06),0 14px 32px -16px rgba(26,31,54,.22);
  --display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  position:relative;min-height:100vh;background:var(--bg);color:var(--tx);font-family:"Figtree",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
[data-theme='dark'] .wen{--bg:#0a0b12;--panel:#13141f;--panel-2:#181b27;--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.15);--tx:#eef0f6;--mut:#9aa0b4;
  --em:#8cf5c4;--cyan:#39d3ff;--em-fill:rgba(140,245,196,.10);--em-fill-2:rgba(140,245,196,.17);--em-line:rgba(140,245,196,.34);
  --cyan-fill:rgba(57,211,255,.10);--cyan-line:rgba(57,211,255,.30);
  --amber:#f5c86b;--amber-soft:rgba(245,200,107,.12);--amber-line:rgba(245,200,107,.36);
  --cta:#ffb561;--cta-2:#ff7a59;--cta-ink:#241206;--cta-soft:rgba(255,160,80,.10);--cta-line:rgba(255,160,80,.32);--cta-text:#ffb561;
  --card-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 26px -20px rgba(0,0,0,.8);--card-shadow-hover:0 1px 0 rgba(255,255,255,.04) inset,0 14px 30px -18px rgba(0,0,0,.9)}
.wen *{box-sizing:border-box}
.wen h1,.wen h2{margin:0;color:var(--tx);font-family:var(--display);letter-spacing:-.025em}
.wen a{color:inherit;text-decoration:none}
.wen code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.9em;background:#0a0d12;color:var(--em);border-radius:6px;padding:1px 7px;letter-spacing:.06em;font-weight:700}
.wen-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:radial-gradient(color-mix(in srgb,var(--cyan) 22%,transparent) 1px,transparent 1.2px);background-size:22px 22px;opacity:.32;mask-image:radial-gradient(60% 50% at 70% 10%,#000 20%,transparent 100%);-webkit-mask-image:radial-gradient(60% 50% at 70% 10%,#000 20%,transparent 100%)}
.wen-wrap{max-width:1160px;margin:0 auto;padding:0 24px;position:relative;z-index:2}
.wen-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);margin-bottom:12px}
.wen-eyebrow.warm{color:var(--cta-text)}
/* the brand highlight inside display headings: emerald -> cyan ink */
.wen-hl{background:linear-gradient(92deg,var(--em) 0%,var(--cyan) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}

/* hero */
.wen-hero{padding:56px 0 26px}
.wen-hero-in{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:40px;align-items:center;padding-top:34px;padding-bottom:34px;border-radius:28px;border:1px solid var(--line);
  background:
    radial-gradient(760px 320px at 100% 0%,var(--em-fill-2),transparent 62%),
    radial-gradient(620px 300px at 0% 100%,var(--cyan-fill),transparent 62%),
    linear-gradient(135deg,color-mix(in srgb,var(--panel) 96%,transparent),color-mix(in srgb,var(--panel) 84%,transparent));
  backdrop-filter:blur(18px) saturate(1.15);-webkit-backdrop-filter:blur(18px) saturate(1.15);box-shadow:var(--card-shadow);position:relative;overflow:hidden}
.wen-hero-in::before{content:'';position:absolute;left:38px;right:38px;top:0;height:3px;border-radius:2px;background:linear-gradient(90deg,var(--em),var(--cyan) 60%,var(--cta))}
.wen-hero-in>div{padding:10px 0 10px 16px}
.wen-hero h1{font-weight:800;font-size:clamp(34px,4.5vw,56px);line-height:1.02;text-wrap:balance;max-width:17ch}
.wen-sub{color:var(--mut);font-size:17px;line-height:1.55;max-width:56ch;margin:18px 0 22px;text-wrap:pretty}
.wen-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.wen-ctas.center{justify-content:center}
.wen-cta{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;background:linear-gradient(135deg,var(--cta),var(--cta-2));color:var(--cta-ink);border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 12px 30px -14px var(--cta-2);transition:transform .15s,box-shadow .15s,filter .15s}
.wen-cta:hover{transform:translateY(-2px);filter:brightness(1.04);box-shadow:0 16px 34px -14px var(--cta-2)}
.wen-cta.big{padding:16px 28px;font-size:16.5px}
.wen-cta.alt{background:var(--panel);color:var(--tx);border:1px solid var(--line-2);box-shadow:none}
.wen-cta.alt:hover{border-color:var(--cyan);color:var(--cyan)}
.wen-proof{list-style:none;margin:22px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.wen-proof li{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tx);font-weight:500}
.wen-proof svg{color:var(--em);flex:none}
.wen-art{display:block;width:100%;height:auto;max-width:540px;justify-self:end;margin-right:8px;animation:wen-rise .6s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 18px 30px rgba(26,31,54,.16))}
[data-theme='dark'] .wen-art{filter:drop-shadow(0 0 28px rgba(140,245,196,.16)) drop-shadow(0 18px 30px rgba(0,0,0,.55))}
@keyframes wen-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ===== THE KILLER FEATURE: it learns your enterprise ===== */
.wen-kill{position:relative;overflow:hidden;padding:40px 36px 30px;border-radius:28px;border:1px solid var(--em-line);
  background:
    radial-gradient(900px 360px at 0% 0%,var(--em-fill-2),transparent 60%),
    radial-gradient(700px 320px at 100% 100%,var(--cyan-fill),transparent 60%),
    var(--panel);
  box-shadow:0 1px 2px rgba(26,31,54,.05),0 30px 70px -40px rgba(14,159,110,.45)}
.wen-kill::before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,var(--em),var(--cyan) 55%,var(--cta))}
.wen-kill>*{position:relative;z-index:1}
.wen-kill-head{max-width:76ch;margin-bottom:26px}
.wen-kill h2{font-weight:800;font-size:clamp(30px,3.6vw,46px);line-height:1.05;text-wrap:balance}
.wen-kill .wen-lead{font-size:16.5px;max-width:70ch}

/* the learning loop: four numbered steps with a connecting rail */
.wen-loop{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;position:relative;counter-reset:loop}
.wen-loop::before{content:'';position:absolute;left:8%;right:8%;top:38px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--em),var(--cyan));opacity:.45;z-index:0}
.wen-loop-step{position:relative;z-index:1;display:flex;flex-direction:column;gap:9px;padding:18px 18px 18px;border-radius:18px;border:1px solid var(--line);background:var(--panel);box-shadow:var(--card-shadow);transition:transform .15s,box-shadow .18s,border-color .18s}
.wen-loop-step:hover{transform:translateY(-3px);box-shadow:var(--card-shadow-hover);border-color:var(--em-line)}
.wen-loop-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.wen-loop-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--em-fill-2),var(--cyan-fill));color:var(--em);border:1px solid var(--em-line)}
.wen-loop-step:nth-child(3) .wen-loop-ic{background:var(--cta-soft);color:var(--cta-text);border-color:var(--cta-line)}
.wen-loop-k{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--mut)}
.wen-loop-step b{font-family:var(--display);font-size:17px;font-weight:800;letter-spacing:-.015em;line-height:1.2}
.wen-loop-step p{margin:0;font-size:13.5px;line-height:1.55;color:var(--mut)}

/* before / after */
.wen-ba{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1.15fr);gap:14px;align-items:stretch;margin-top:26px}
.wen-ba-col{position:relative;display:flex;flex-direction:column;gap:10px;padding:20px 20px 18px;border-radius:18px;border:1px solid var(--line);background:var(--panel-2)}
.wen-ba-col.generic{opacity:.92}
.wen-ba-col.yours{background:var(--panel);border-color:var(--em-line);box-shadow:0 1px 2px rgba(26,31,54,.05),0 22px 48px -30px rgba(14,159,110,.55)}
.wen-ba-col.yours::before{content:'';position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:3px;background:linear-gradient(180deg,var(--em),var(--cyan))}
.wen-ba-tag{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;border-radius:999px}
.generic .wen-ba-tag{color:var(--mut);background:var(--line);}
.yours .wen-ba-tag{color:var(--em);background:var(--em-fill);border:1px solid var(--em-line)}
.wen-ba-q{margin:2px 0 0;font-family:var(--display);font-weight:700;font-size:15px;color:var(--tx);letter-spacing:-.01em}
.wen-ba-a{margin:0;font-size:14.5px;line-height:1.6;color:var(--tx)}
.generic .wen-ba-a{color:var(--mut)}
.wen-ba-a b{font-weight:700;color:var(--tx);background:var(--em-fill);border-radius:5px;padding:0 4px}
.wen-ba-foot{margin-top:auto;display:flex;gap:7px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--mut);padding-top:10px;border-top:1px dashed var(--line-2)}
.yours .wen-ba-foot{color:var(--tx)}
.wen-ba-foot svg{flex:none;color:var(--cta-text);margin-top:2px}
.wen-ba-arrow{display:grid;place-items:center;width:40px;height:40px;align-self:center;border-radius:50%;background:var(--panel);border:1px solid var(--line-2);color:var(--em);box-shadow:var(--card-shadow)}
.wen-ba-note{margin:10px 0 0;font-size:12px;color:var(--mut);text-align:right}

/* trust */
.wen-trust{margin-top:26px;padding:22px 22px 20px;border-radius:20px;border:1px solid var(--cyan-line);background:linear-gradient(135deg,var(--cyan-fill),transparent 70%),var(--panel)}
.wen-trust-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}
.wen-trust-ic{flex:none;width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:var(--panel);color:var(--cyan);border:1px solid var(--cyan-line);box-shadow:var(--card-shadow)}
.wen-trust-head b{display:block;font-family:var(--display);font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
.wen-trust-head p{margin:6px 0 0;font-size:14px;line-height:1.5;color:var(--mut);max-width:70ch}
.wen-trust-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.wen-trust-grid li{display:flex;gap:10px;align-items:flex-start;padding:14px;border-radius:14px;background:var(--panel);border:1px solid var(--line)}
.wen-tick{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--em-fill);color:var(--em);border:1px solid var(--em-line)}
.wen-trust-grid b{display:block;font-size:14px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.wen-trust-grid span:not(.wen-tick){display:block;font-size:12.5px;line-height:1.5;color:var(--mut);margin-top:3px}

/* what you can bring */
.wen-kinds{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:22px}
.wen-kinds-k{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-right:4px}

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
/* the PRIME card: full-width lead of its group, icon beside the copy, brand tint */
.wen-card.prime{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:16px;row-gap:6px;align-items:start;padding:22px 24px 21px;
  background:linear-gradient(135deg,var(--em-fill-2),var(--cyan-fill) 70%),var(--panel);border-color:var(--em-line);box-shadow:0 1px 2px rgba(26,31,54,.05),0 22px 48px -30px rgba(14,159,110,.55)}
.wen-card.prime::before{opacity:1}
.wen-card.prime .wen-ic{grid-row:1/span 2;width:44px;height:44px;border-radius:13px;background:var(--panel);box-shadow:var(--card-shadow)}
.wen-card.prime b{font-family:var(--display);font-size:19px;font-weight:800;letter-spacing:-.02em;line-height:1.2;text-wrap:balance}
.wen-card.prime p{font-size:14.5px;line-height:1.6;color:var(--tx);max-width:96ch;text-wrap:pretty}
.wen-card.prime code{white-space:nowrap}
.wen-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.wen-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;font-size:12.5px;font-weight:600;color:var(--tx);background:var(--em-fill);border:1px solid var(--em-line)}
.wen-chip.cyan{background:var(--cyan-fill);border-color:var(--cyan-line)}
.wen-chip svg{color:var(--cyan)}

/* final */
.wen-final{text-align:center;padding:40px 24px 10px}
.wen-final h2{font-weight:800;font-size:clamp(28px,4vw,42px);line-height:1.08;text-wrap:balance}
.wen-final p{color:var(--mut);font-size:16px;margin:12px 0 22px}

@media(max-width:980px){
  .wen-grid{grid-template-columns:1fr 1fr}.wen-hero-in{grid-template-columns:1fr;gap:18px}.wen-art{justify-self:center;margin:0;max-width:460px}.wen-hero h1{max-width:none}
  .wen-loop{grid-template-columns:1fr 1fr}.wen-loop::before{display:none}
  .wen-trust-grid{grid-template-columns:1fr 1fr}
  .wen-ba{grid-template-columns:1fr}.wen-ba-arrow{transform:rotate(90deg);justify-self:center}
}
@media(max-width:640px){
  .wen-hero{padding:34px 0 18px}.wen-hero-in{padding:22px 4px 22px;border-radius:20px}.wen-hero-in>div{padding:0 14px}.wen-grid{grid-template-columns:1fr}.wen-group{padding:22px 18px 22px;border-radius:18px}.wen-main{padding:6px 14px 56px;gap:14px}.wen-art{display:none}
  .wen-kill{padding:26px 18px 22px;border-radius:20px}.wen-loop{grid-template-columns:1fr}.wen-trust-grid{grid-template-columns:1fr}.wen-trust{padding:18px 16px 16px}.wen-ba-note{text-align:left}
}
@media(prefers-reduced-motion:reduce){.wen-art{animation:none}.wen-card,.wen-cta,.wen-loop-step{transition:none}}
`
