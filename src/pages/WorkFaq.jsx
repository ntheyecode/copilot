// WorkCoPilot - FAQ (public, AEO-optimized). Moved off the short main page
// (owner rule: extra content lives on its own page, linked from the footer).
// DESIGN LAW (owner, 2026-10-26): point straight, no "book" pages. Every answer
// is one or two sentences that stand alone (an AI search engine or a snippet
// can quote the first one), an optional one-line detail, and related links.
// Questions are grouped and rendered as an ACCORDION (collapse-to-row is the
// platform pattern): a visitor scans questions, opens the one they need.
// The same data drives the visible Q&As AND the page-level FAQPage JSON-LD, so
// the structured data can never drift from what a reader sees.
// HONESTY CONTRACT (docs/business-rules.md): benefit and guarantee only. No AI
// vendor or model name, no AI cost or mechanics, never "certified" (only
// "compliance-ready"), no invented metrics, testimonials or customer counts.
// WorkCoPilot helps people DO and FINISH work on screen, step by step; it is
// not a document-analysis or writing engine (code is the exception). "Many
// fields", never "every field". A task is a major task of many sub-steps; an
// extra hour adds one task. US spelling, no em-dashes. Prices point at /pricing.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, CircleHelp, Search, Link2, ScanEye, Lock, RefreshCw, Mail, LifeBuoy } from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive (also loads the brand fonts)
import useSeo, { useJsonLd } from '../useSeo.js'   // per-route title/description/canonical (WEB-01) + safe JSON-LD
import { useT } from '../i18n/index.jsx'           // localized <title>/description (seo.* keys)

const SUPPORT = 'support@admireveda.com'           // product help, billing
const LEGAL = 'support@coesecurity.com'            // privacy, legal, security
const SALES = 'sales@admireveda.com'

// Each item: q = the question as people ask it; a = the direct, quotable
// answer (one or two sentences); d = an optional one-line detail; links =
// related pages (rendered as chips, kept out of the structured-data text so the
// JSON-LD stays plain text).
const GROUPS = [
  {
    id: 'what', n: '01', title: 'What it is',
    items: [
      { q: 'What is WorkCoPilot?',
        a: 'WorkCoPilot watches your screen and tells you the exact next click, command, setting or code for the task in front of you, catches a wrong move, and keeps you on the correct step until the job is done.',
        d: 'Made by AdmireVeda, a product of COE Security LLC.',
        links: [{ label: 'How it works', href: '/workcopilot/how-it-works' }, { label: '60-second demo', href: '/demo' }] },
      { q: 'How is it different from a chatbot or a general AI assistant?',
        a: 'A chatbot answers from memory and cannot see where you are. WorkCoPilot reads your real screen, gives the next move for the tool you are actually in, confirms each step worked, and corrects you when a tool has changed.',
        d: 'You can still ask it questions along the way.' },
      { q: 'Does it do the work for me, or change anything in my systems?',
        a: 'No. WorkCoPilot is read-only by design: it watches and guides, and never clicks, types or runs anything. You make every change yourself.',
        d: 'That is what makes it safe on production consoles, finance systems and regulated environments.',
        links: [{ label: 'Security', href: '/workcopilot/security' }] },
      { q: 'What is it not built for?',
        a: 'Reading or writing long documents for you, or deep analysis. WorkCoPilot is built for doing: filing, configuring, fixing, setting up, building, step by step on screen. Code is the exception; it writes and corrects code as part of the task.',
        d: 'It also supports lawful work only and declines anything illegal or harmful.',
        links: [{ label: 'Acceptable Use Policy', href: '/workcopilot/acceptable-use' }] },
    ],
  },
  {
    id: 'how', n: '02', title: 'How it works',
    items: [
      { q: 'How does a task go?',
        a: 'Say what you want to get done. WorkCoPilot plans it, then guides you one step at a time on your own screen, with copy-ready text where that helps, and checks each step worked before moving on.',
        d: 'You finish with a write-up of exactly what you did.' },
      { q: 'What happens when I make a mistake?',
        a: 'It spots the wrong turn the moment it happens, says why, and shows the fix. Risky values such as an open network range, an over-broad permission or a hard-coded secret are flagged before you save.' },
      { q: 'Can I paste an error or attach a screenshot or document mid-task?',
        a: 'Yes. Paste an error, a response, a screenshot or a document and the next steps adjust to it.',
        d: 'Advanced and Premium can also upload reference documents to ground the steps; on the desktop app the file never leaves your device.',
        links: [{ label: 'Compare plans', href: '/workcopilot/pricing' }] },
      { q: 'Do I get a record of what I did?',
        a: 'Yes. Every session ends with a clean write-up of what you did, redacted milestone screenshots, and an audit log of what was sent. Share it, repeat it, or keep it.',
        d: 'Milestone screenshots can be turned off by you or your company admin.' },
    ],
  },
  {
    id: 'platforms', n: '03', title: 'Platforms and install',
    items: [
      { q: 'Do I need to install anything?',
        a: 'No. WorkCoPilot runs in your browser and floats over your work, so it guides you even on locked-down machines and virtual desktops.',
        d: 'A Windows desktop app adds a see-through overlay, hides from screen shares by default, and can run a full-screen guide on a second monitor. Browser, desktop and mobile come on one subscription.' },
      { q: 'Does it work with desktop apps, terminals and on-prem consoles, not just websites?',
        a: 'Yes. If it is on your screen, it can guide you through it: web apps, installed desktop apps, terminals, on-prem consoles at a local address, and your own custom tools.' },
      { q: 'Can I use it from my phone?',
        a: 'The browser version works on any device today. The Android app, which lets you point your camera at a screen or a device and get guided on the go, is coming soon.' },
      { q: 'Which languages does it support?',
        a: 'Sixteen languages, chosen automatically for your region. Switch anytime; your choice is remembered.' },
    ],
  },
  {
    id: 'security', n: '04', title: 'Security and privacy',
    items: [
      { q: 'What actually leaves my device?',
        a: 'With data protection on, personal data, health data, secrets, keys and card numbers are stripped or tokenized on your own device before anything is sent. Only what is needed to guide the current step leaves.',
        d: 'What leaves is a reduced screen frame with sensitive lines blacked out, and text with sensitive values replaced by tokens. The real values stay with you.',
        links: [{ label: 'See the protection in action', href: '/workcopilot/security' }, { label: 'Privacy Policy', href: '/workcopilot/privacy' }] },
      { q: 'Can I control what counts as sensitive?',
        a: 'Yes. Add your own words and patterns to redact, tokenize or block on top of the built-in detectors. A company admin can lock the policy for every member, and compliance presets are one click to arm.',
        links: [{ label: 'Security', href: '/workcopilot/security' }] },
      { q: 'Can I use my own AI key so data stays inside my boundary?',
        a: 'Yes. Run WorkCoPilot on your own or your company\'s AI key and every call stays on that key, inside your own provider relationship, with nothing silently rerouted.',
        d: 'Keys are encrypted at rest. For per-company keys and team provisioning, ask about Enterprise.',
        links: [{ label: 'Enterprise', href: '/workcopilot/enterprise' }, { label: 'DPA', href: '/workcopilot/dpa' }] },
      { q: 'Are the commands and code it gives me safe to run?',
        a: 'Yes. Every command, snippet and fix is written the secure way and checked for injection, hard-coded secrets, over-broad access and known-vulnerable libraries before it reaches you.' },
      { q: 'Can someone manipulate it through my screen or a task?',
        a: 'No. Whatever is on your screen or typed into a task is treated as information about the work, never as instructions. Attempts to make it break its rules or reach data that is not yours are declined and recorded for your administrator.' },
      { q: 'Do you use cookies?',
        a: 'One strictly necessary sign-in cookie. Non-essential storage stays off until you allow it, and rejecting is as easy as accepting. Change your choice anytime from the footer.',
        links: [{ label: 'Cookie Policy', href: '/workcopilot/cookie-policy' }] },
    ],
  },
  {
    id: 'pricing', n: '05', title: 'Pricing and billing',
    items: [
      { q: 'How much does it cost?',
        a: 'Four self-service plans, Lite, Basic, Advanced and Premium, each with guided major tasks and hours of live guidance, plus a custom-priced Enterprise plan. Current prices are side by side on the pricing page.',
        d: 'Billed monthly; annual billing at a discount may be offered at checkout. Checkout is by Stripe, and we never see your card number.',
        links: [{ label: 'See pricing', href: '/workcopilot/pricing' }] },
      { q: 'What counts as a task?',
        a: 'A task is a major task: one goal, guided end to end through every sub-step it takes. Security and privacy come with every plan, never as an upsell.',
        d: 'Basic adds roadmaps, the floating guide and the session write-up; Advanced adds document uploads and more hours; Premium adds generated visuals and priority in the guidance queue.',
        links: [{ label: 'Compare plans', href: '/workcopilot/pricing' }] },
      { q: 'What if I run out of hours?',
        a: 'Top up an extra hour whenever you need it. An extra hour adds one more task, and purchased time never expires.',
        d: 'Your daily hours reset each evening, US Eastern time. Pause anytime and come back where you left off.',
        links: [{ label: 'Top-up rates', href: '/workcopilot/pricing' }] },
      { q: 'Can I cancel anytime?',
        a: 'Yes. Cancel yourself from the billing portal, no contract and no call. Your plan stays active until the end of the period you paid for, and your sessions stay until you delete them.',
        links: [{ label: 'Refund and cancellation policy', href: '/workcopilot/refund' }] },
      { q: 'Can I upgrade or downgrade?',
        a: 'Yes, anytime. An upgrade applies right away with prorated credit; a downgrade takes effect at your next renewal. Invoices are in your dashboard.' },
      { q: 'Is there a plan for teams and companies?',
        a: 'Yes. Enterprise adds seat pools, SSO, a company-wide locked data policy, a finance dashboard for billing, a signed DPA and a priority SLA.',
        d: `Write to ${SALES} and we reply within one business day.`,
        links: [{ label: 'Enterprise', href: '/workcopilot/enterprise' }, { label: 'Contact sales', href: `mailto:${SALES}?subject=WorkCoPilot%20Enterprise` }] },
    ],
  },
  {
    id: 'current', n: '06', title: 'Staying current',
    items: [
      { q: 'Does it get outdated like other AI tools?',
        a: 'No. WorkCoPilot reads what is on your screen today, researches the latest official documentation live, and learns the current way your tools work for next time. When a button moves or a menu is renamed, it finds the new control instead of pointing at something that is gone.' },
      { q: 'Does it learn from my team\'s work, and what does it never keep?',
        a: 'For a company account, what it learns about how your tools currently work stays in a private knowledge base only your members benefit from. Learnings are generalized and de-identified: never personal data, secrets, screen images or document content.',
        d: 'Individual accounts contribute de-identified learnings to a shared platform knowledge base.',
        links: [{ label: 'Privacy Policy', href: '/workcopilot/privacy' }, { label: 'DPA', href: '/workcopilot/dpa' }] },
      { q: 'Which AI is behind it?',
        a: 'Each task is planned with the strongest AI available on the key in use, never a retired one. We do not publish vendor or model names, and if anything had to change mid-task to keep you going, the task log says so.',
        links: [{ label: 'How your plan is made', href: '/workcopilot/how-it-works#best-model' }] },
    ],
  },
  {
    id: 'who', n: '07', title: 'Who it is for',
    items: [
      { q: 'Who is WorkCoPilot for?',
        a: 'Anyone who has to get real work done on a screen: engineers, IT and security teams, admins, founders, operations, finance and compliance staff, and everyday users. It is strongest on operational, technical, administrative and hands-on work, and on code.',
        d: 'It guides work across many professional fields, and the steps read as if an expert in that field wrote them.',
        links: [{ label: 'Fields', href: '/workcopilot/fields' }, { label: 'Use cases', href: '/workcopilot/use-cases' }] },
      { q: 'Do I need to be technical?',
        a: 'No. It starts from zero: opens the right page, walks you to the exact spot and spells out every click, so a non-technical person can finish a technical task.',
        d: 'Ask for fuller steps that also explain why, and you learn as you go.' },
      { q: 'What does it do for a company?',
        a: 'Lean teams take on specialist work in-house, finish faster, keep every change documented, and spend less on contractors and implementation partners.',
        d: 'Admins set and lock the data policy, review member sessions and audit logs, and the company knowledge base grows with every task completed.',
        links: [{ label: 'Enterprise', href: '/workcopilot/enterprise' }] },
    ],
  },
  {
    id: 'compliance', n: '08', title: 'Data and compliance',
    items: [
      { q: 'Is it compliant with GDPR, HIPAA, SOC 2 and similar frameworks?',
        a: 'WorkCoPilot is compliance-ready: it gives you the controls and audit evidence that support your own compliance work, with one-click presets for GDPR, HIPAA, PCI DSS, SOC 2 and ISO 27001. We do not claim a certification.',
        links: [{ label: 'Compliance readiness', href: '/workcopilot/security' }] },
      { q: 'What do you store, and for how long?',
        a: 'A per-session report, an audit log and your session history, encrypted at rest, until you or your admin delete them or a retention window purges them. Raw screen frames, uploaded source documents and real sensitive values are not stored.',
        links: [{ label: 'Privacy Policy', href: '/workcopilot/privacy' }] },
      { q: 'Can I delete my data?',
        a: 'Yes. Delete any session anytime, which removes its report, screenshots and audit log together. Account data is deleted on request, subject to any legal duty to keep a record.' },
      { q: 'Is there a DPA, and who are your sub-processors?',
        a: 'A summary DPA is public and a signed DPA is available on request. Guidance is produced by a major AI provider, payments by Stripe, hosting by a cloud provider; the current list with entity names is available on request.',
        d: `Write to ${LEGAL} with your company name and the contact who will sign.`,
        links: [{ label: 'Read the DPA', href: '/workcopilot/dpa' }, { label: 'Sub-processors', href: '/workcopilot/dpa#subprocessors' }] },
      { q: 'Can a company admin see what members did?',
        a: 'Yes. Admins can review their own members\' session reports and audit logs, set and lock the data policy, and delete member sessions. Members cannot change a locked policy.' },
    ],
  },
  {
    id: 'start', n: '09', title: 'Getting started and support',
    items: [
      { q: 'How do I get started?',
        a: 'Sign in at admireveda.com, pick a plan, say what you want to get done, and it starts guiding you on your screen. Nothing to install.',
        links: [{ label: 'Get started', href: '/workcopilot' }, { label: 'See pricing', href: '/workcopilot/pricing' }] },
      { q: 'Is there a demo I can watch without signing up?',
        a: 'Yes. A 60-second scripted demo shows the guidance on a real-looking task, no sign-in needed.',
        links: [{ label: 'See the 60-second demo', href: '/demo' }] },
      { q: 'How do I get support?',
        a: `Email ${SUPPORT} for product help and billing, ${LEGAL} for privacy, legal or security, and ${SALES} for Enterprise. We reply within one business day.`,
        links: [{ label: 'Email support', href: `mailto:${SUPPORT}` }] },
    ],
  },
]

// Stable anchors from the question text (lowercase, words joined by hyphens).
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
// Global question numbers (Q01..), assigned once over the FULL list so a filter
// never renumbers an anchor someone has already shared.
const NUMBERED = GROUPS.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, id: slug(it.q) })) }))
let _n = 0
for (const g of NUMBERED) for (const it of g.items) it.num = String(++_n).padStart(2, '0')
const TOTAL = _n
const ALL_IDS = NUMBERED.flatMap((g) => g.items.map((it) => it.id))

// FAQPage structured data, generated from the same data as the visible Q&As.
// Plain text only (the direct answer + the detail), links left out.
const FAQ_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: NUMBERED.flatMap((g) => g.items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: `${it.a} ${it.d || ''}`.trim() },
  }))),
}).replace(/</g, '\\u003c')

const GLANCE = [
  { icon: ScanEye, tone: 'ok', eyebrow: 'Read-only', title: 'It guides. You stay in control.', body: 'Exact next step on your own screen. It never clicks, types or runs anything.' },
  { icon: Lock, tone: 'cyan', eyebrow: 'Private by design', title: 'Sensitive data never leaves in clear', body: 'Personal data, secrets and keys are stripped or tokenized on your device before anything is sent.' },
  { icon: RefreshCw, tone: 'violet', eyebrow: 'Stays current', title: 'Learns your tools as they change', body: 'Reads the screen you have today and researches the latest docs, not a stale training cutoff.' },
]

// Accessibility (WEB-08): one <main>, a single H1, an H2 per group, an H3 per
// question wrapping a real <button aria-expanded aria-controls>, a labeled
// search field with a live result count, visible focus rings, and decorative
// icons hidden from assistive tech. Rows are collapsed by default (platform
// pattern); a search or a deep link opens the matching rows.
export default function WorkFaq() {
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const t = useT()
  useSeo({
    title: t('seo.faq.title'),
    description: t('seo.faq.description'),
    path: '/workcopilot/faq',
  })
  useJsonLd(FAQ_LD)   // FAQPage structured data, injected safely (textContent, no HTML sink)
  // Deep links like /workcopilot/faq#how-much-does-it-cost: open that row, then
  // scroll once mounted (the browser's own hash jump fires before React renders).
  useEffect(() => {
    const id = (window.location.hash || '').slice(1)
    if (!id) return
    if (ALL_IDS.includes(id)) setOpen((s) => new Set(s).add(id))
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])

  const toggle = useCallback((id) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  }), [])
  const allOpen = open.size >= TOTAL
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(ALL_IDS))

  const needle = query.trim().toLowerCase()
  const groups = useMemo(() => {
    if (!needle) return NUMBERED
    const hit = (it) => `${it.q} ${it.a} ${it.d || ''}`.toLowerCase().includes(needle)
    return NUMBERED.map((g) => ({ ...g, items: g.items.filter(hit) })).filter((g) => g.items.length)
  }, [needle])
  const shown = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="wfq">
      <style>{CSS}</style>
      <SiteHeader current="faq" />

      <main id="main">
        <section className="wfq-hero">
          <div className="wfq-eyebrow"><CircleHelp size={14} aria-hidden="true" /> FAQ &middot; WorkCoPilot</div>
          <h1>Straight answers, before you start.</h1>
          <p>What it is, what leaves your device, what it costs. Pick a question, get the point.</p>
          <form className="wfq-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="wfq-q" className="wfq-sr">Search the questions</label>
            <Search size={16} aria-hidden="true" />
            <input id="wfq-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search: install, price, HIPAA, own key" autoComplete="off" />
            <output className="wfq-count" htmlFor="wfq-q" aria-live="polite">{shown} / {TOTAL}</output>
          </form>
        </section>

        <section className="wfq-block" aria-labelledby="wfq-glance-h">
          <h2 id="wfq-glance-h" className="wfq-sr">The three things to know</h2>
          <div className="wfq-glance">
            {GLANCE.map((g, i) => {
              const Ic = g.icon
              return (
                <WorkCard key={g.eyebrow} theme="light" tone={g.tone} delay={i * 70} texPos={['0% 0%', '50% 50%', '100% 100%'][i]} className="wfq-gcard">
                  <WorkCard.Head icon={Ic} eyebrow={g.eyebrow} title={g.title} />
                  <WorkCard.Body>{g.body}</WorkCard.Body>
                </WorkCard>
              )
            })}
          </div>
        </section>

        <section className="wfq-block wfq-doc">
          <nav className="wfq-rail" aria-labelledby="wfq-rail-h">
            <div className="wfq-railt" id="wfq-rail-h">Sections</div>
            <ol>
              {NUMBERED.map((g) => {
                const live = groups.find((x) => x.id === g.id)
                const count = live ? live.items.length : 0
                return (
                  <li key={g.id} className={count ? '' : 'off'}>
                    <a href={'#' + g.id} aria-disabled={count ? undefined : 'true'}>
                      <span className="wfq-n" aria-hidden="true">{g.n}</span>
                      <span className="wfq-railname">{g.title}</span>
                      <span className="wfq-railc" aria-label={`${count} answers`}>{count}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
            <button type="button" className="wfq-all" onClick={toggleAll} aria-pressed={allOpen}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
          </nav>

          <div className="wfq-art">
            {groups.length === 0 && (
              <div className="wfq-empty" role="status">
                <p>No answer matches <b>{query}</b> yet.</p>
                <p>Try a shorter word, or <a href={'mailto:' + SUPPORT + '?subject=WorkCoPilot%20question'}>ask us directly</a>.</p>
              </div>
            )}
            {groups.map((g) => (
              <section className="wfq-grp" id={g.id} key={g.id} aria-labelledby={g.id + '-h'}>
                <h2 id={g.id + '-h'}><span className="wfq-n" aria-hidden="true">{g.n}</span>{g.title}</h2>
                {g.items.map((it) => {
                  // A search opens every matching row so the hit is visible at once.
                  const isOpen = !!needle || open.has(it.id)
                  const panelId = it.id + '-a'
                  return (
                    <article className={'wfq-qa' + (isOpen ? ' on' : '')} id={it.id} key={it.id}>
                      <div className="wfq-qhead">
                        <div className="wfq-qnum" aria-hidden="true">Q{it.num}</div>
                        <h3>
                          <button type="button" className="wfq-qbtn" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(it.id)}>
                            <span className="wfq-qtext">{it.q}</span>
                            <ChevronDown size={18} aria-hidden="true" className="wfq-chev" />
                          </button>
                        </h3>
                        <a className="wfq-anchor" href={'#' + it.id} aria-label={`Link to this question: ${it.q}`}><Link2 size={13} aria-hidden="true" /></a>
                      </div>
                      <div className="wfq-qbody" id={panelId} hidden={!isOpen}>
                        <p className="wfq-lead">{it.a}</p>
                        {it.d ? <p className="wfq-more">{it.d}</p> : null}
                        {it.links && it.links.length ? (
                          <div className="wfq-links">
                            {it.links.map((l) => (
                              <a key={l.href + l.label} href={l.href} className="wfq-chip">{l.label} <ArrowRight size={12} aria-hidden="true" /></a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </section>
            ))}
          </div>
        </section>

        <section className="wfq-cta" aria-label="Still have a question">
          <div className="wfq-cta-in">
            <div className="wfq-cta-copy">
              <div className="wfq-eyebrow"><LifeBuoy size={14} aria-hidden="true" /> Still have a question?</div>
              <h2>Ask us, or start and see for yourself.</h2>
              <p>Product and billing: {SUPPORT}. Privacy, legal, security: {LEGAL}.</p>
            </div>
            <div className="wfq-cta-btns">
              <button className="wfq-btn" onClick={() => nav('/workcopilot')}>Get started <ArrowRight size={15} aria-hidden="true" /></button>
              <a className="wfq-btn alt" href="/demo">60-second demo</a>
              <a className="wfq-btn alt" href={'mailto:' + SUPPORT + '?subject=WorkCoPilot%20question'}><Mail size={15} aria-hidden="true" /> Email support</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

// Same tokens, header, hero and button vocabulary as the How It Works page
// (.wcap-*), plus a "ledger" document layout: a sticky section rail with counts,
// and each Q&A as a collapsed row (mono number, question button, link icon) that
// opens to the direct answer marked by a brand rule. Collapses to one column
// (rail becomes wrapping chips) under 900px. Design-time quality gate: every
// control that must not wrap or clip is nowrap + flex-shrink:0; the question
// text is the only thing that gives.
const CSS = `
[data-theme='dark'] .wfq{--ink:#eef0f6;--mut:#9aa0b4;--dim:#6c7780;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.15);--panel:#13141f;--panel2:#181b27;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff}
.wfq{--ink:#161a2b;--mut:#5c6484;--dim:#8b93a1;--line:#e6e8f1;--line-strong:#d3d7e5;--panel:#ffffff;--panel2:#f6f8fd;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--vi:#6d4bd8;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    var(--bg)}
.wfq *{box-sizing:border-box}
.wfq::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wfq>*{position:relative;z-index:1}
/* a11y: visually hidden text; visible focus ring (never outline:none) */
.wfq-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wfq a:focus-visible,.wfq button:focus-visible,.wfq input:focus-visible{outline:2px solid var(--cy);outline-offset:3px;border-radius:8px}
/* hero */
.wfq-hero{max-width:1160px;margin:0 auto;padding:30px 24px 8px;text-align:center}
.wfq-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0f7f58;background:#e3fbf0;border:1px solid rgba(15,127,88,.22);border-radius:999px;padding:5px 13px;white-space:nowrap}
.wfq-hero h1{font-size:40px;line-height:1.08;letter-spacing:-.02em;margin:16px 0 12px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:620px;line-height:1.55}
/* search: a single quiet field with a mono "shown / total" readout */
.wfq-search{display:flex;align-items:center;gap:10px;max-width:620px;margin:22px auto 0;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;padding:6px 8px 6px 14px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.18);text-align:left}
.wfq-search>svg{color:var(--dim);flex:0 0 auto}
.wfq-search input{flex:1;min-width:0;border:0;background:none;font:inherit;font-size:15px;color:var(--ink);padding:8px 0}
.wfq-search input::placeholder{color:var(--dim)}
.wfq-search input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.wfq-count{flex:0 0 auto;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:500;letter-spacing:.06em;color:var(--mut);background:#f4f8f7;border:1px solid var(--line);border-radius:9px;padding:6px 9px;white-space:nowrap}
@media(max-width:620px){.wfq-hero h1{font-size:28px}.wfq-search input{font-size:14px}}
/* glance */
.wfq-block{max-width:1160px;margin:0 auto;padding:26px 24px}
.wfq-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.wfq-gcard{min-width:0}
.wfq-gcard .wc-title{font-size:18px}
/* document: sticky rail + ledger */
/* The rail column sizes to its LONGEST link (fit-content, capped at 340px) so a
   section title plus its count badge never wraps onto a second line at desktop
   widths; only a title longer than the cap would wrap, and nothing clips. */
.wfq-doc{display:grid;grid-template-columns:fit-content(400px) minmax(0,1fr);gap:36px;align-items:start;padding-top:6px}
.wfq-rail{position:sticky;top:18px;min-width:0}
.wfq-railt{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0 0 10px}
.wfq-rail ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wfq-rail a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border:1px solid transparent;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wfq-rail a:hover{background:var(--panel);border-color:var(--line)}
.wfq-railname{flex:1 1 auto;min-width:0}
.wfq-railc{flex:0 0 auto;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:10.5px;font-weight:500;color:var(--dim);background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:1px 6px}
.wfq-rail li.off a{opacity:.45}
.wfq-all{margin:12px 0 0 10px;background:none;border:1px solid var(--line-strong);border-radius:999px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--mut);cursor:pointer;white-space:nowrap}
.wfq-all:hover{color:var(--ink);background:var(--panel)}
.wfq-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--dim);flex:0 0 auto}
.wfq-art{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:6px 30px 18px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wfq-grp{padding:22px 0 8px;border-top:1px solid var(--line);scroll-margin-top:18px}
.wfq-grp:first-child{border-top:0}
.wfq-grp h2{display:flex;align-items:baseline;gap:12px;font-size:20px;margin:0 0 4px;letter-spacing:-.01em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-grp h2 .wfq-n{font-size:12px;color:#0f7f58}
/* one Q&A row: mono number, question button (the only flexible part), link icon */
.wfq-qa{border-top:1px dashed rgba(10,13,18,.12);scroll-margin-top:18px}
.wfq-grp h2+.wfq-qa{border-top:0}
.wfq-qhead{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wfq-qnum{flex:0 0 40px;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:500;letter-spacing:.08em;color:var(--dim);padding-top:17px;white-space:nowrap;transition:color .3s}
.wfq-qa:hover .wfq-qnum,.wfq-qa.on .wfq-qnum,.wfq-qa:target .wfq-qnum{color:#0f7f58}
.wfq-qa:target{background:linear-gradient(90deg,rgba(140,245,196,.18),transparent 60%);margin:0 -14px;padding-left:14px;padding-right:14px;border-radius:12px}
.wfq-qa h3{flex:1 1 auto;min-width:0;margin:0;font-size:16px;line-height:1.35;letter-spacing:-.01em;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-qbtn{display:flex;align-items:flex-start;gap:10px;width:100%;min-width:0;background:none;border:0;padding:13px 0;margin:0;font:inherit;color:var(--ink);text-align:left;cursor:pointer}
.wfq-qtext{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.wfq-chev{flex:0 0 auto;margin-top:1px;color:var(--dim);transition:transform .22s,color .22s}
.wfq-qbtn:hover .wfq-chev{color:var(--ink)}
.wfq-qbtn[aria-expanded="true"] .wfq-chev{transform:rotate(180deg);color:#0f7f58}
.wfq-anchor{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-top:13px;border-radius:6px;color:var(--dim);opacity:0;transition:opacity .2s,color .2s}
.wfq-qa:hover .wfq-anchor,.wfq-anchor:focus-visible{opacity:1}
.wfq-anchor:hover{color:var(--cy)}
/* the opened answer: brand rule on the left, detail a shade lighter */
.wfq-qbody{min-width:0;padding:0 34px 16px 52px}
.wfq-lead{position:relative;margin:0 0 8px;padding-left:14px;font-size:15px;line-height:1.6;color:#1e2733;font-weight:500;overflow-wrap:anywhere}
.wfq-lead::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:3px;border-radius:3px;background:linear-gradient(180deg,#0e9f6e,#0a84c2)}
.wfq-more{margin:0;padding-left:14px;font-size:14px;line-height:1.6;color:var(--mut);overflow-wrap:anywhere}
.wfq-links{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0 14px}
.wfq-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:#0a7fa8;background:#f4f8f7;border:1px solid var(--line);border-radius:999px;padding:5px 11px;text-decoration:none;white-space:nowrap;transition:border-color .2s,background .2s}
.wfq-chip:hover{background:var(--panel);border-color:rgba(10,147,196,.4)}
.wfq-chip>svg{transition:transform .25s}
.wfq-chip:hover>svg{transform:translateX(2px)}
.wfq-empty{padding:34px 10px;text-align:center;color:var(--mut);font-size:15px;line-height:1.6}
.wfq-empty b{color:var(--ink)}
.wfq-empty a{color:#0a7fa8;font-weight:600}
/* closing band */
.wfq-cta{max-width:1160px;margin:0 auto;padding:14px 24px 56px}
.wfq-cta-in{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wfq-cta-copy{min-width:0;flex:1 1 320px}
.wfq-cta-copy h2{font-size:24px;margin:12px 0 6px;letter-spacing:-.015em;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-cta-copy p{margin:0;color:var(--mut);font-size:14.5px;line-height:1.55;overflow-wrap:anywhere}
.wfq-cta-btns{display:flex;gap:10px;flex-wrap:wrap}
.wfq-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap;box-shadow:0 10px 24px -12px rgba(10,147,196,.6)}
.wfq-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
@media(max-width:900px){
  .wfq-doc{grid-template-columns:1fr;gap:18px}
  .wfq-rail{position:static}
  .wfq-rail ol{flex-direction:row;flex-wrap:wrap;gap:6px}
  .wfq-rail a{background:var(--panel);border-color:var(--line);padding:6px 10px;font-size:12.5px;border-radius:999px;white-space:nowrap}
  .wfq-railc{display:none}
  .wfq-all{margin:10px 0 0}
}
@media(max-width:760px){
  .wfq-glance{grid-template-columns:1fr}
  .wfq-art{padding:4px 16px 12px;border-radius:14px}
  .wfq-qnum{flex-basis:34px}
  .wfq-qbody{padding:0 0 14px 46px}
  .wfq-anchor{opacity:1}
  .wfq-cta-in{padding:20px 18px}
}
@media(max-width:480px){
  .wfq-qnum{display:none}
  .wfq-qbody{padding-left:0}
}
@media(prefers-reduced-motion:reduce){.wfq-qnum,.wfq-anchor,.wfq-chip,.wfq-chip>svg,.wfq-chev{transition:none}}
`
