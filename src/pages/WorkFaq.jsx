// WorkCoPilot - FAQ (public, AEO-optimized). Moved off the short main page
// (owner rule: extra content lives on its own page, linked from the footer).
// Every answer opens with ONE direct sentence that stands alone, so an AI search
// engine or a snippet can quote it without the detail; the detail follows.
// The same data drives the visible Q&As AND the page-level FAQPage JSON-LD, so
// the structured data can never drift from what a reader sees.
// HONESTY CONTRACT (docs/business-rules.md): benefit and guarantee only. No AI
// vendor or model name, no AI cost or mechanics, never "certified" (only
// "compliance-ready"), no invented metrics, testimonials or customer counts.
// US spelling, no em-dashes. Prices and entitlements point at /pricing rather
// than restating the matrix.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleHelp, Search, Link2, ScanEye, Lock, RefreshCw, Mail, LifeBuoy } from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive (also loads the brand fonts)
import useSeo, { useJsonLd } from '../useSeo.js'   // per-route title/description/canonical (WEB-01) + safe JSON-LD
import { FIELD_TOTAL } from './WorkFields.jsx'      // the fields roster is the single source for the count (never drifts)

const SUPPORT = 'support@admireveda.com'           // product help, billing
const LEGAL = 'support@coesecurity.com'            // privacy, legal, security
const SALES = 'sales@admireveda.com'

// Each item: q = the question as people ask it; a = the direct, quotable first
// sentence; d = the detail; links = related pages (rendered as chips, kept out
// of the structured-data text so the JSON-LD stays plain text).
const GROUPS = [
  {
    id: 'what', n: '01', title: 'What it is',
    items: [
      { q: 'What is WorkCoPilot?',
        a: 'WorkCoPilot is a screen-aware copilot that watches your screen, tells you the exact next step for any task in any app, catches a wrong move and corrects it, and keeps you on the next correct step, until the job is done.',
        d: 'It gives you the precise click, command, setting or code to use, checks that each step actually worked before moving on, and ends with a clean write-up of what you did. WorkCoPilot is made by AdmireVeda, a product of COE Security LLC.',
        links: [{ label: 'How it works', href: '/workcopilot/how-it-works' }, { label: 'See a 60-second demo', href: '/demo' }] },
      { q: 'Is WorkCoPilot a chatbot?',
        a: 'No. WorkCoPilot is live, step-by-step guidance tied to what is actually on your screen, not a chat window you paste questions into.',
        d: 'You say what you want to get done, it plans the work, then it guides you one step at a time and confirms each step on screen before it moves on. You can still ask it questions along the way, and paste in an error or a response for it to read.' },
      { q: 'Does WorkCoPilot do the work for me?',
        a: 'No. WorkCoPilot is read-only by design: it watches and guides, and never clicks, types or runs anything in your systems.',
        d: 'You make every change yourself, so you stay in control. That is what makes it safe to use on production consoles, finance systems and regulated environments.',
        links: [{ label: 'Security', href: '/workcopilot/security' }] },
      { q: 'How is WorkCoPilot different from asking a general AI assistant?',
        a: 'WorkCoPilot sees your real screen, gives the exact next move for the tool in front of you, catches mistakes as they happen, and stays current with how tools work today.',
        d: 'A general assistant answers from memory and cannot see where you are. WorkCoPilot reads what is on screen, fits the real environment, corrects a step when a tool has changed, and keeps a record of the session you can come back to.' },
    ],
  },
  {
    id: 'how', n: '02', title: 'How it works',
    items: [
      { q: 'How does WorkCoPilot guide me through a task?',
        a: 'You say what you want to get done, WorkCoPilot plans it, then it guides you one step at a time on your own screen and checks that each step worked before moving on.',
        d: 'Each step names the exact click, command or setting, with copy-ready text where that helps. If something goes wrong, it says why and shows the fix. When you finish, you get a write-up of exactly what you did.' },
      { q: 'What happens when I make a mistake?',
        a: 'WorkCoPilot spots a wrong turn the moment it happens, explains why it is wrong, and shows the exact fix.',
        d: 'If a value looks risky, such as an open network range, an over-broad permission or a hard-coded secret, it flags it before you save. If a tool has changed and a button has moved, it finds the new control and corrects the step.' },
      { q: 'Can I attach documents, screenshots or error messages in the middle of a task?',
        a: 'Yes. You can attach a screenshot, a photo, a document or pasted text mid-task, and WorkCoPilot reads it and adjusts the plan if the path has changed.',
        d: 'On the Advanced and Premium plans you can also upload your own reference documents and diagrams. They are read on your computer and used to ground your steps; on the desktop app the file itself never leaves your device.',
        links: [{ label: 'Compare plans', href: '/workcopilot/pricing' }] },
      { q: 'Do I get a record of what I did?',
        a: 'Yes. Every session ends with a clean write-up of exactly what you did, with redacted milestone screenshots, plus an audit log of what was sent.',
        d: 'Share it, repeat it, or keep it as your own reference document. Milestone screenshots are on by default, and you or your company admin can turn them off.' },
      { q: 'Can I run the guide on a second monitor?',
        a: 'Yes. A read-only, full-screen guide can run on a second monitor while you work on the first.',
        d: 'It shows your goal, the current step in large type and the road ahead, and follows your session as you go.' },
      { q: 'Does WorkCoPilot help with reviewing a design or architecture?',
        a: 'Yes. Show it a diagram, an architecture or a design and it finds the real issues, then hands you a ready-to-use prompt to generate the corrected version in your own tools, with a document of the findings.',
        d: 'Paste a long error or an API response and it analyzes it and adjusts the plan.' },
    ],
  },
  {
    id: 'platforms', n: '03', title: 'Platforms and install',
    items: [
      { q: 'Do I need to install anything?',
        a: 'No. WorkCoPilot runs in your browser and floats over your work, so it guides you even on locked-down machines, restricted laptops and virtual desktops.',
        d: 'A Windows desktop app is available to download, and an Android app is coming soon. Every plan includes browser, desktop and mobile on one subscription.' },
      { q: 'Which platforms does WorkCoPilot support?',
        a: 'WorkCoPilot works in any modern browser with nothing to install, as a Windows desktop app, and on mobile, with the Android app coming soon.',
        d: 'The desktop app adds a see-through overlay you can click behind, and it stays hidden from screen shares by default.' },
      { q: 'Does it only work on websites, or also desktop apps, terminals and on-prem consoles?',
        a: 'It works with anything that is on your screen: web apps, installed desktop apps, terminals, on-prem consoles at a local address, and your own custom tools.',
        d: 'It reads whatever is on screen and fits the real environment, rather than giving a generic tutorial that assumes a different setup.' },
      { q: 'Can I use WorkCoPilot from my phone?',
        a: 'The mobile app lets you point your phone camera at a screen or a device, snap a photo or live-watch, and get guided on the go; the Android app is coming soon.',
        d: 'Until then, the browser version works on any device with a modern browser.' },
    ],
  },
  {
    id: 'security', n: '04', title: 'Security and privacy',
    items: [
      { q: 'Is my data safe? What actually leaves my device?',
        a: 'When data protection is on, sensitive data such as personal data, health data, secrets, keys and card numbers is stripped or tokenized on your own device before anything is sent, and only what is needed to guide the current step leaves.',
        d: 'What leaves is a reduced-size screen frame with sensitive lines blacked out, and the governed text with sensitive values replaced by tokens. The real values stay on your device and the answer is rebuilt there. The Security page shows real before-and-after examples.',
        links: [{ label: 'See the data protection in action', href: '/workcopilot/security' }, { label: 'Privacy Policy', href: '/workcopilot/privacy' }] },
      { q: 'Can WorkCoPilot change anything in my systems?',
        a: 'No. WorkCoPilot never clicks, types or runs anything, so it cannot change a system of record on your behalf.',
        d: 'Every action is yours. It watches, guides and confirms, and a per-session audit log records exactly what was sent.' },
      { q: 'Can I control what counts as sensitive?',
        a: 'Yes. On top of the built-in detectors, you or your company admin can add your own words and patterns to redact, tokenize or block, and a company admin can lock that policy for every member.',
        d: 'Compliance presets for the frameworks you answer to are one click to arm, then lock.',
        links: [{ label: 'Security', href: '/workcopilot/security' }] },
      { q: 'Can I use my own AI key so my data stays inside my boundary?',
        a: 'Yes. A company, or an individual user, can run WorkCoPilot on their own AI key, which keeps the governed data inside their own provider relationship with nothing silently rerouted.',
        d: 'The key is encrypted at rest. For per-company keys and team provisioning, talk to us about Enterprise.',
        links: [{ label: 'Data Processing Addendum', href: '/workcopilot/dpa' }] },
      { q: 'Is the code and the commands it gives me safe to run?',
        a: 'Yes. Every command, snippet, script and fix is written the secure way and checked for common risks such as injection, hard-coded secrets, over-broad access and known-vulnerable libraries before it reaches you.',
        d: 'Think of it as a security architect, a secure developer and a tester reviewing every answer before you see it.' },
      { q: 'What stops someone from misusing or manipulating the assistant?',
        a: 'WorkCoPilot stays on task. If a request tries to make it break its own rules, reveal how it works, or reach data that is not yours, it declines and keeps guiding you through your own screen. Attempts like that are recorded for your administrator.',
        d: 'Whatever is on your screen or typed into a task is treated as information about the work, never as new instructions, so the task text cannot redirect the assistant.' },
      { q: 'Is WorkCoPilot visible when I share my screen or record?',
        a: 'No. The desktop app is hidden from screen shares by default, so it is invisible when you present or record.',
        d: 'You choose when to share and which display.' },
    ],
  },
  {
    id: 'pricing', n: '05', title: 'Pricing and billing',
    items: [
      { q: 'How much does WorkCoPilot cost?',
        a: 'WorkCoPilot has four self-service plans - Lite, Basic, Advanced and Premium - each with a set number of hours of live guidance every day, plus a custom-priced Enterprise plan.',
        d: 'The pricing page shows the current price for each plan side by side. Final prices and entitlements are confirmed at checkout, and taxes may apply by location.',
        links: [{ label: 'See the full plan comparison', href: '/workcopilot/pricing' }] },
      { q: 'What is included in every plan?',
        a: 'Every plan includes step-by-step guidance on any task, the exact commands, code and links, security on every plan, and browser, desktop and mobile on one subscription.',
        d: 'Lite is the entry plan for a single simple task at a time. Basic adds roadmaps, the floating guide and a session write-up; Advanced adds uploading your own documents and more daily hours and tasks; Premium adds generated visuals and diagrams, and priority in the guidance queue.',
        links: [{ label: 'Compare plans', href: '/workcopilot/pricing' }] },
      { q: 'What happens if I run out of hours for the day?',
        a: 'You can top up extra guided hours whenever you need, and purchased time never expires.',
        d: 'The per-hour top-up rate depends on your plan and is shown on the pricing page and confirmed at checkout. Your daily allowance resets each evening, US Eastern time. Pause anytime and come back right where you left off.',
        links: [{ label: 'See pricing', href: '/workcopilot/pricing' }] },
      { q: 'Can I cancel anytime? Is there a contract?',
        a: 'Yes. You cancel yourself from the billing portal at any time, with no contract and no call needed, and your plan stays active until the end of the period you have already paid for.',
        d: 'Cancelling does not delete your sessions on its own; you can delete them whenever you like.',
        links: [{ label: 'Refund and cancellation policy', href: '/workcopilot/refund' }] },
      { q: 'Is there annual billing?',
        a: 'Plans are billed monthly, and annual billing at a discount may be available at checkout.',
        d: 'Enterprise billing is set per agreement.' },
      { q: 'Is there a plan for teams and companies?',
        a: 'Lite, Basic, Advanced and Premium are single-user plans; for seat pools, SSO, a company-wide redaction policy, a DPA and a priority SLA, Enterprise is the plan.',
        d: `Write to ${SALES} and we reply within one business day.`,
        links: [{ label: 'Contact sales', href: `mailto:${SALES}?subject=WorkCoPilot%20Enterprise` }] },
      { q: 'How do I pay?',
        a: 'Checkout is handled by Stripe, and we never see or store your card number.',
        d: 'Your invoices are available from the billing portal in your account.' },
    ],
  },
  {
    id: 'current', n: '06', title: 'Staying current',
    items: [
      { q: 'Does WorkCoPilot get outdated like other AI tools?',
        a: 'No. WorkCoPilot learns the current way your tools work and reuses it next time, and it researches the latest live, so you are not limited to an AI\'s training cutoff.',
        d: 'Your team\'s learnings stay private to your company; solo users benefit from a shared, de-identified knowledge base. Either way, the guidance reflects how a tool works today, not how it worked when an AI was trained.' },
      { q: 'What happens when a tool changes its interface?',
        a: 'WorkCoPilot reads what is actually on your screen, so when a button has moved or a menu has been renamed it finds the new control and corrects the step instead of pointing at something that is no longer there.',
        d: 'What it learns is carried forward, so the next person on your team gets the current step from the start instead of hitting the same surprise.' },
      { q: 'Does it learn from my team\'s work?',
        a: 'Yes. For a company account, what WorkCoPilot learns about how your tools and tasks currently work is kept in a private knowledge base that only your company\'s members benefit from.',
        d: 'Learnings are generalized and de-identified: no personal data, secrets, screen images or document content is kept in them. The Privacy Policy and the Data Processing Addendum describe this as a data practice.',
        links: [{ label: 'Privacy Policy', href: '/workcopilot/privacy' }, { label: 'DPA', href: '/workcopilot/dpa' }] },
      { q: 'What does "learning" include, and what does it never include?',
        a: 'Learnings are generalized facts about how a tool or task currently works, such as where a setting now lives or which step a tool now requires; they never include personal data, secrets, screen images or the content of your documents.',
        d: 'For individual accounts, these de-identified learnings go into a platform knowledge base that makes WorkCoPilot more dependable for everyone. For company accounts, they stay within that company.' },
      { q: 'Does it check the latest official documentation?',
        a: 'Yes. With live web learning on, WorkCoPilot researches the latest official documentation and interfaces before it guides, so steps follow how a tool works today, not last year.',
        d: 'Companies can run live web learning on their own key, inside their own data boundary.' },
      { q: 'Which AI is behind WorkCoPilot?',
        a: 'WorkCoPilot plans each task with the strongest AI available on the key in use, never a retired one, and the live guidance keeps pace with your screen; we do not publish vendor or model names.',
        d: 'On your own or your company\'s key, every call stays on that key. If anything had to change mid-task to keep you going, the task log says so instead of claiming otherwise.',
        links: [{ label: 'How your plan is made', href: '/workcopilot/how-it-works#best-model' }] },
    ],
  },
  {
    id: 'who', n: '07', title: 'Who it is for',
    items: [
      { q: 'Who is WorkCoPilot for?',
        a: 'WorkCoPilot is for anyone who has to get real work done on a screen, technical or not: engineers, IT and security teams, founders, product and marketing leads, accountants, legal and compliance staff, and everyday users.',
        d: `It guides work across ${FIELD_TOTAL} professional fields, and the steps read as if an expert in that field wrote them.`,
        links: [{ label: `See all ${FIELD_TOTAL} fields`, href: '/workcopilot/fields' }, { label: 'Use cases', href: '/workcopilot/use-cases' }] },
      { q: 'Do I need to be technical to use it?',
        a: 'No. WorkCoPilot starts from zero: it opens the right page, walks you to the exact spot and spells out every click, so a non-technical person can finish a technical task.',
        d: 'Nothing is assumed and nothing is skipped. If you prefer, you can ask for fuller steps that also explain why, so you learn as you go.' },
      { q: 'How does WorkCoPilot help companies and teams?',
        a: 'Lean teams take on specialist work in-house, ship faster, keep every change documented, and reduce spend on contractors and implementation partners.',
        d: 'Company admins set and lock the data policy for every member, review their members\' sessions and audit logs, and the company\'s private knowledge base grows with every task the team completes.' },
      { q: 'What fields and kinds of work does it cover?',
        a: `WorkCoPilot covers ${FIELD_TOTAL} professional fields, from technical setup and configuration, building and implementation, and AI and automation, to product, marketing, accounting and office work, legal and compliance, and everyday tasks.`,
        d: 'If it is on a screen, you can be guided through it.',
        links: [{ label: 'Fields and families', href: '/workcopilot/fields' }] },
      { q: 'Is there anything WorkCoPilot will not help with?',
        a: 'Yes. WorkCoPilot supports lawful, legitimate work only and declines requests to build weapons or means of mass harm, create malware or exploits, break into systems or accounts you do not own, or do anything illegal or harmful.',
        d: 'The Acceptable Use Policy sets out the rules in full.',
        links: [{ label: 'Acceptable Use Policy', href: '/workcopilot/acceptable-use' }] },
    ],
  },
  {
    id: 'compliance', n: '08', title: 'Data and compliance',
    items: [
      { q: 'Is WorkCoPilot compliant with GDPR, HIPAA, SOC 2 and similar frameworks?',
        a: 'WorkCoPilot is compliance-ready: it gives you controls and audit evidence that support your own compliance work under the frameworks you choose, and we do not claim a certification.',
        d: 'Per-company presets for frameworks such as GDPR, HIPAA, PCI DSS, SOC 2 and ISO 27001 are one click to arm and lock. Your organization, with its own advisers, decides how the product fits its obligations.',
        links: [{ label: 'Compliance readiness', href: '/workcopilot/security' }] },
      { q: 'What do you store, and for how long?',
        a: 'We store a per-session report, an audit log and your session history, encrypted at rest, and keep them until you or your admin delete them or a configured retention window purges them.',
        d: 'Raw screen frames, uploaded source documents and real sensitive values are not stored. Generalized, de-identified learnings about how tools work are kept separately and contain no personal data, secrets or screens.',
        links: [{ label: 'Privacy Policy', href: '/workcopilot/privacy' }] },
      { q: 'Can I delete my data?',
        a: 'Yes. You can delete any session at any time, which removes its report, screenshots and audit log together, and we delete account data on request, subject to any legal duty to keep a record.',
        d: 'Company admins can delete their members\' sessions as well.' },
      { q: 'Is there a Data Processing Addendum?',
        a: 'Yes. A summary Data Processing Addendum is public, and a signed DPA for your organization is available on request.',
        d: `Write to ${LEGAL} with your company name and the contact who will sign.`,
        links: [{ label: 'Read the DPA', href: '/workcopilot/dpa' }] },
      { q: 'Who are your sub-processors?',
        a: 'Guidance is produced by a major AI provider under its own terms, payments are handled by Stripe, and the service runs on a cloud hosting provider; the current list with entity names is available on request.',
        d: 'Where a customer runs on its own AI key, that provider relationship is the customer\'s own and sits outside our list.',
        links: [{ label: 'Sub-processors', href: '/workcopilot/dpa#subprocessors' }] },
      { q: 'Can a company admin see what members did?',
        a: 'Yes. Company admins can review their own members\' session reports and audit logs, set and lock the data policy, and delete member sessions.',
        d: 'Members cannot change the policy an admin has locked.' },
    ],
  },
  {
    id: 'start', n: '09', title: 'Getting started and support',
    items: [
      { q: 'How do I get started?',
        a: 'Sign in at admireveda.com, pick a plan, say what you want to get done, and WorkCoPilot starts guiding you on your screen; nothing needs to be installed to begin.',
        d: 'Download the Windows desktop app whenever you want the see-through overlay that hides from screen shares.',
        links: [{ label: 'Get started', href: '/workcopilot' }] },
      { q: 'Is there a demo I can watch without signing up?',
        a: 'Yes. A 60-second scripted demo shows the guidance on a real-looking task, with no sign-in needed.',
        d: 'It is a scripted walk-through, so you can see the shape of the guidance before you start a live session.',
        links: [{ label: 'See the 60-second demo', href: '/demo' }] },
      { q: 'How do I get support?',
        a: `Email ${SUPPORT} for product help and billing; for privacy, legal or security questions write to ${LEGAL}.`,
        d: `For Enterprise, write to ${SALES} and we reply within one business day.`,
        links: [{ label: 'Email support', href: `mailto:${SUPPORT}` }] },
      { q: 'Who makes WorkCoPilot?',
        a: 'WorkCoPilot is made by AdmireVeda, a product of COE Security LLC.',
        d: 'COE Security LLC is the legal entity behind the service and the controller of account, sign-in and billing details, as the Privacy Policy describes.',
        links: [{ label: 'Terms of Service', href: '/workcopilot/terms' }] },
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

// FAQPage structured data, generated from the same data as the visible Q&As.
// Plain text only (the direct sentence + the detail), links left out.
const FAQ_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: NUMBERED.flatMap((g) => g.items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: `${it.a} ${it.d}`.trim() },
  }))),
}).replace(/</g, '\\u003c')

const GLANCE = [
  { icon: ScanEye, tone: 'ok', eyebrow: 'Read-only', title: 'It guides. You stay in control.', body: 'WorkCoPilot watches your screen and tells you the exact next step. It never clicks, types or runs anything in your systems.' },
  { icon: Lock, tone: 'cyan', eyebrow: 'Private by design', title: 'Sensitive data never leaves in clear', body: 'When data protection is on, personal data, health data, secrets and keys are stripped or tokenized on your own device before anything is sent.' },
  { icon: RefreshCw, tone: 'violet', eyebrow: 'Stays current', title: 'Learns your tools, beats stale AI knowledge', body: 'It learns the current way your tools work and carries it forward, and researches the latest live, so it is not stuck on an AI\'s training cutoff.' },
]

// Accessibility (WEB-08): one <main>, a single H1, an H2 per group, an H3 per
// question, a labeled search field with a live result count, visible focus
// rings, and decorative icons hidden from assistive tech.
export default function WorkFaq() {
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  useSeo({
    title: 'FAQ - WorkCoPilot by AdmireVeda',
    description: 'Straight answers about WorkCoPilot: what it is, how the step-by-step guidance works, platforms and install, what leaves your device, pricing and billing, how it stays current by learning your tools, who it is for, data and compliance, and getting started.',
    path: '/workcopilot/faq',
  })
  useJsonLd(FAQ_LD)   // FAQPage structured data, injected safely (textContent, no HTML sink)
  // Deep links like /workcopilot/faq#how-much-does-workcopilot-cost: the browser's
  // own hash jump fires before React has rendered the target, so scroll once mounted.
  useEffect(() => {
    const id = (window.location.hash || '').slice(1)
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])

  const needle = query.trim().toLowerCase()
  const groups = useMemo(() => {
    if (!needle) return NUMBERED
    const hit = (it) => `${it.q} ${it.a} ${it.d}`.toLowerCase().includes(needle)
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
          <p>Everything people ask about WorkCoPilot, in plain words: what it is, how it guides you, what leaves your device, what it costs, and how it stays current when your tools change.</p>
          <form className="wfq-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="wfq-q" className="wfq-sr">Search the questions</label>
            <Search size={16} aria-hidden="true" />
            <input id="wfq-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the questions, for example: install, price, HIPAA, outdated" autoComplete="off" />
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
          </nav>

          <div className="wfq-art">
            {groups.length === 0 && (
              <div className="wfq-empty" role="status">
                <p>No answer matches <b>{query}</b> yet.</p>
                <p>Try a shorter word, or <a href={'mailto:' + SUPPORT + '?subject=WorkCoPilot%20question'}>ask us directly</a> and we will answer.</p>
              </div>
            )}
            {groups.map((g) => (
              <section className="wfq-grp" id={g.id} key={g.id} aria-labelledby={g.id + '-h'}>
                <h2 id={g.id + '-h'}><span className="wfq-n" aria-hidden="true">{g.n}</span>{g.title}</h2>
                {g.items.map((it) => (
                  <article className="wfq-qa" id={it.id} key={it.id}>
                    <div className="wfq-qnum" aria-hidden="true">Q{it.num}</div>
                    <div className="wfq-qbody">
                      <h3>
                        {it.q}
                        <a className="wfq-anchor" href={'#' + it.id} aria-label={`Link to this question: ${it.q}`}><Link2 size={13} aria-hidden="true" /></a>
                      </h3>
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
                ))}
              </section>
            ))}
          </div>
        </section>

        <section className="wfq-cta" aria-label="Still have a question">
          <div className="wfq-cta-in">
            <div className="wfq-cta-copy">
              <div className="wfq-eyebrow"><LifeBuoy size={14} aria-hidden="true" /> Still have a question?</div>
              <h2>Ask us, or see it for yourself.</h2>
              <p>Product help and billing go to {SUPPORT}. Privacy, legal and security questions go to {LEGAL}.</p>
            </div>
            <div className="wfq-cta-btns">
              <a className="wfq-btn" href={'mailto:' + SUPPORT + '?subject=WorkCoPilot%20question'}><Mail size={15} aria-hidden="true" /> Email support</a>
              <a className="wfq-btn alt" href="/demo">See the 60-second demo</a>
              <button className="wfq-btn alt" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// Same tokens, header, hero and button vocabulary as the How It Works page
// (.wcap-*), plus a "ledger" document layout: a sticky section rail with counts,
// and each Q&A set in a two-column row with its mono question number in the
// gutter and the direct answer marked by a brand rule. Collapses to one column
// (rail becomes wrapping chips) under 900px.
const CSS = `
.wfq{--ink:#0a0d12;--mut:#3d4650;--dim:#6b7680;--line:rgba(10,13,18,.1);--line-strong:rgba(10,13,18,.14);--em:#10a271;--cy:#0a93c4;--vi:#6d4bd8;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    #edf1ef}
.wfq *{box-sizing:border-box}
.wfq::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wfq>*{position:relative;z-index:1}
/* a11y: visually hidden text; visible focus ring (never outline:none) */
.wfq-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wfq a:focus-visible,.wfq button:focus-visible,.wfq input:focus-visible{outline:2px solid var(--cy);outline-offset:3px;border-radius:8px}
.wfq-top{display:flex;align-items:center;justify-content:space-between;max-width:1160px;margin:0 auto;padding:18px 24px}
.wfq-back{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line-strong);border-radius:10px;padding:8px 13px;font:inherit;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;box-shadow:0 1px 2px rgba(10,13,18,.05)}
/* hero */
.wfq-hero{max-width:1160px;margin:0 auto;padding:30px 24px 8px;text-align:center}
.wfq-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0f7f58;background:#e3fbf0;border:1px solid rgba(15,127,88,.22);border-radius:999px;padding:5px 13px}
.wfq-hero h1{font-size:40px;line-height:1.08;letter-spacing:-.02em;margin:16px 0 12px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:620px;line-height:1.55}
/* search: a single quiet field with a mono "shown / total" readout */
.wfq-search{display:flex;align-items:center;gap:10px;max-width:620px;margin:22px auto 0;background:#fff;border:1px solid var(--line-strong);border-radius:14px;padding:6px 8px 6px 14px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.18);text-align:left}
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
.wfq-doc{display:grid;grid-template-columns:240px minmax(0,1fr);gap:36px;align-items:start;padding-top:6px}
.wfq-rail{position:sticky;top:18px;min-width:0}
.wfq-railt{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0 0 10px}
.wfq-rail ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wfq-rail a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border:1px solid transparent;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wfq-rail a:hover{background:#fff;border-color:var(--line)}
.wfq-railname{flex:1;min-width:0}
.wfq-railc{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:10.5px;font-weight:500;color:var(--dim);background:#fff;border:1px solid var(--line);border-radius:7px;padding:1px 6px}
.wfq-rail li.off a{opacity:.45}
.wfq-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--dim);flex:0 0 auto}
.wfq-art{min-width:0;background:#fff;border:1px solid var(--line);border-radius:18px;padding:6px 30px 18px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wfq-grp{padding:26px 0 10px;border-top:1px solid var(--line);scroll-margin-top:18px}
.wfq-grp:first-child{border-top:0}
.wfq-grp h2{display:flex;align-items:baseline;gap:12px;font-size:22px;margin:0 0 6px;letter-spacing:-.01em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-grp h2 .wfq-n{font-size:12px;color:#0f7f58}
/* one Q&A row: mono number in the gutter, question + direct answer + detail */
.wfq-qa{display:grid;grid-template-columns:52px minmax(0,1fr);gap:4px 14px;padding:18px 0 20px;border-top:1px dashed rgba(10,13,18,.12);scroll-margin-top:18px}
.wfq-grp h2+.wfq-qa{border-top:0;padding-top:12px}
.wfq-qnum{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:500;letter-spacing:.08em;color:var(--dim);padding-top:5px;transition:color .3s}
.wfq-qa:hover .wfq-qnum,.wfq-qa:target .wfq-qnum{color:#0f7f58}
.wfq-qa:target{background:linear-gradient(90deg,rgba(140,245,196,.18),transparent 60%);margin:0 -14px;padding-left:14px;padding-right:14px;border-radius:12px}
.wfq-qbody{min-width:0}
.wfq-qa h3{display:flex;align-items:flex-start;gap:8px;font-size:17px;line-height:1.35;margin:0 0 10px;letter-spacing:-.01em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;overflow-wrap:anywhere}
.wfq-anchor{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-top:1px;border-radius:6px;color:var(--dim);opacity:0;transition:opacity .2s,color .2s}
.wfq-qa:hover .wfq-anchor,.wfq-anchor:focus-visible{opacity:1}
.wfq-anchor:hover{color:var(--cy)}
/* the direct, quotable answer: brand rule on the left, a shade darker than the detail */
.wfq-lead{position:relative;margin:0 0 8px;padding-left:14px;font-size:15.5px;line-height:1.6;color:#1e2733;font-weight:500;overflow-wrap:anywhere}
.wfq-lead::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:3px;border-radius:3px;background:linear-gradient(180deg,#10a271,#0a93c4)}
.wfq-more{margin:0;padding-left:14px;font-size:14.5px;line-height:1.65;color:var(--mut);overflow-wrap:anywhere}
.wfq-links{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0 14px}
.wfq-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:#0a7fa8;background:#f4f8f7;border:1px solid var(--line);border-radius:999px;padding:5px 11px;text-decoration:none;transition:border-color .2s,background .2s}
.wfq-chip:hover{background:#fff;border-color:rgba(10,147,196,.4)}
.wfq-chip>svg{transition:transform .25s}
.wfq-chip:hover>svg{transform:translateX(2px)}
.wfq-empty{padding:34px 10px;text-align:center;color:var(--mut);font-size:15px;line-height:1.6}
.wfq-empty b{color:var(--ink)}
.wfq-empty a{color:#0a7fa8;font-weight:600}
/* closing band */
.wfq-cta{max-width:1160px;margin:0 auto;padding:14px 24px 56px}
.wfq-cta-in{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wfq-cta-copy{min-width:0;flex:1 1 320px}
.wfq-cta-copy h2{font-size:24px;margin:12px 0 6px;letter-spacing:-.015em;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-cta-copy p{margin:0;color:var(--mut);font-size:14.5px;line-height:1.55;overflow-wrap:anywhere}
.wfq-cta-btns{display:flex;gap:10px;flex-wrap:wrap}
.wfq-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(10,147,196,.6)}
.wfq-btn.alt{background:#fff;color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
@media(max-width:900px){
  .wfq-doc{grid-template-columns:1fr;gap:18px}
  .wfq-rail{position:static}
  .wfq-rail ol{flex-direction:row;flex-wrap:wrap;gap:6px}
  .wfq-rail a{background:#fff;border-color:var(--line);padding:6px 10px;font-size:12.5px;border-radius:999px}
  .wfq-railc{display:none}
}
@media(max-width:760px){
  .wfq-glance{grid-template-columns:1fr}
  .wfq-art{padding:4px 18px 12px;border-radius:14px}
  .wfq-qa{grid-template-columns:1fr;gap:2px}
  .wfq-qnum{padding-top:0}
  .wfq-anchor{opacity:1}
  .wfq-cta-in{padding:20px 18px}
}
@media(prefers-reduced-motion:reduce){.wfq-qnum,.wfq-anchor,.wfq-chip,.wfq-chip>svg{transition:none}}
`
