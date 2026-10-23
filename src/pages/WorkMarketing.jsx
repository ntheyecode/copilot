import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, TerminalSquare, Compass, ShieldCheck, Globe2, FileText,
  ArrowRight, Check, Camera, Sparkles, Layers, Monitor, Smartphone, AppWindow,
  Lock, Zap, Rocket, Gauge, Target, ScanEye, ListChecks, AlertTriangle, RotateCcw,
  Building2, Copy, Download,
  Server, Blocks, Bot, Megaphone, Calculator, Scale, Shapes, Trophy,
  Code2, Table, Palette, RefreshCw,
} from 'lucide-react'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'
import CopyChip from '../components/CopyChip.jsx'
import WorkCard from '../components/WorkCard.jsx'   // the shared, site-wide premium card primitive
import LiveValidate from '../components/LiveValidate.jsx'   // the "Validate it live" widget (lead gate + live coverage check)
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import useSeo from '../useSeo.js'
// The field roster lives ONCE, on the /fields page; the teaser below imports
// its numbers so the headline count can never drift from the full list.
import { FIELD_FAMILIES, FIELD_TOTAL } from './WorkFields.jsx'

// AdmireVeda WorkCoPilot - marketing landing (admireveda.com).
// Motion-rich, benefits-first. Never names a model, never mentions limits.
export default function WorkMarketing() {
  const nav = useNavigate()
  useSeo({
    title: 'WorkCoPilot by AdmireVeda - Your expert, on every screen',
    description: 'WorkCoPilot plans your task with the strongest AI, then guides you step by step, watches your screen, and catches and corrects a wrong move as it happens - in any app, with the exact click, command or setting. Read-only, private by design, documented when you finish.',
    path: '/',
  })
  const [price, setPrice] = useState(null)
  const rootRef = useRef(null)
  useEffect(() => { fetch('/api/work/pricing').then((r) => r.json()).then(setPrice).catch(() => {}) }, [])

  // Fonts
  useEffect(() => {
    const id = 'wm-fonts'
    if (document.getElementById(id)) return
    const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
    document.head.appendChild(l)
  }, [])

  // Pointer parallax for the aurora + orbs (sets --mx/--my on the root).
  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5), y = (e.clientY / window.innerHeight - 0.5)
      el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Scroll reveals
  useEffect(() => {
    const els = rootRef.current ? rootRef.current.querySelectorAll('[data-reveal]') : []
    const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12 })
    els.forEach((el) => io.observe(el)); return () => io.disconnect()
  }, [price])

  // Hero headline rotation holds while the pointer or keyboard focus is in the hero.
  const [heroHover, setHeroHover] = useState(false)
  const [heroFocus, setHeroFocus] = useState(false)

  const [cycle, setCycle] = useState('monthly')   // 'monthly' | 'annual' (annual = 20% off)
  const go = (plan, cyc) => {
    const qs = []
    if (plan) qs.push(`plan=${plan}`)
    if (cyc && cyc !== 'monthly') qs.push(`cycle=${cyc}`)
    return nav(`/workcopilot${qs.length ? `?${qs.join('&')}` : ''}`)
  }
  const { user } = useAuth()
  // Choose a plan. Monthly: a signed-in visitor goes straight to Stripe Checkout;
  // a new visitor signs up with the plan carried along. Annual (20% off) is
  // carried to sign-up with the cycle so the correct annual price is applied
  // there - we never start a monthly checkout for an annual selection.
  const choosePlan = async (plan) => {
    // Annual checkout is only started when it is actually wired in Stripe
    // (price.annualReady). Otherwise an annual pick shows the 20%-off price and
    // is carried to sign-up, never charged the monthly amount by surprise.
    if (cycle === 'annual' && !(price && price.annualReady)) { go(plan, 'annual'); return }
    if (user) {
      try {
        const r = await api.workCheckout(plan, cycle)
        if (r && r.url) { window.location = r.url; return }
      } catch { /* billing not ready: fall through to the dashboard */ }
      nav('/work')
      return
    }
    go(plan, cycle)
  }
  const money = (n) => (n == null ? '-' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`)
  // Annual = 20% off the monthly rate, shown as a per-month figure billed yearly.
  const monthlyRate = (p) => (cycle === 'annual' ? Math.round(Number(p) * 0.8) : Number(p))
  const annualTotal = (p) => Math.round(Number(p) * 0.8) * 12
  const tilt = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; e.currentTarget.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-4px)` }
  const untilt = (e) => { e.currentTarget.style.transform = '' }

  const benefits = [
    { icon: MonitorPlay, viz: 'steps', t: 'Guided, step by step', d: 'It watches your screen and tells you the exact next move, one step at a time, and checks each one really worked before moving on.' },
    { icon: TerminalSquare, viz: 'command', t: 'The exact how, every time', d: 'Not vague advice. The precise click, command or setting to use, spelled out and copy-ready. Always the best proven way, no shortcuts.' },
    { icon: Compass, viz: 'zero', t: 'Starts from zero', d: 'Opens the right page, signs you in, and walks you to the exact spot. Nothing assumed, nothing skipped.' },
    { icon: ShieldCheck, viz: 'fix', t: 'Catches and corrects mistakes', d: 'Spots a wrong turn the moment it happens, tells you why, and shows the exact fix. When a tool\'s UI has changed, it finds the new control and corrects the step instead of pointing at a button that moved.' },
    { icon: Monitor, viz: 'command', t: 'Any app, not just the browser', d: 'Guides web apps, installed desktop apps, on-prem consoles at a local address, and your own custom tools - it reads whatever is on screen and fits the real environment.' },
    { icon: Globe2, viz: 'current', t: 'Grounded in the best, and in your world', d: 'It checks the current best practice and, on Advanced and Premium, grounds your steps in your own documents and diagrams - read on your computer, the file never leaving - flagging anything in them that is wrong.' },
    { icon: FileText, viz: 'record', t: 'A record you keep', d: 'Finish with a clean, picture-rich write-up of exactly what you did, ready to share or repeat.' },
    { icon: ScanEye, viz: 'record', t: 'Review and generate', d: 'Show it a diagram, an architecture or a design. It finds the real issues, then hands you a ready-to-use prompt to generate the corrected version in your own tools, with a document of the findings. Paste a long error or an API response and it analyzes it and adjusts the plan.' },
    // Benefit only (never the mechanism): the pill advertises cross-session learning + live research.
    { icon: RefreshCw, viz: 'current', t: 'Stays current, learns your tools', d: 'It learns the current way your tools work and carries it forward, and researches the latest live, so it is never stuck on stale AI knowledge.' },
  ]
  const steps = [
    { n: '01', viz: 'goal', t: 'Scope it together', d: 'Say what you want, answer a couple of quick questions, and it scopes the job before it plans, so the plan fits what you really need.' },
    { n: '02', viz: 'guide', t: 'Get guided live', d: 'It reads your screen, guides the exact next move, checks it worked, and corrects you the moment something looks wrong.' },
    { n: '03', viz: 'keep', t: 'Finish & keep it', d: 'Done right, with a documented write-up you can come back to.' },
  ]
  // Each use-case gets its OWN icon (no repeated glyph) and an accent tone.
  const cards = [
    { id: 'config', k: 'Technical Setup & Config', d: 'Firewalls, IDS/IPS, cloud, DevOps, infrastructure.', ic: Server, tone: 'cyan' },
    { id: 'build', k: 'Build & Implement', d: 'Pipelines, integrations, end-to-end builds.', ic: Blocks, tone: '' },
    { id: 'ai', k: 'AI & Automation', d: 'Agents, RAG, enterprise AI, automated workflows.', ic: Bot, tone: 'violet' },
    { id: 'product', k: 'Product & Innovation', d: 'Prototype, build and ship a brand new idea.', ic: Rocket, tone: 'amber' },
    { id: 'marketing', k: 'Marketing & Growth', d: 'Campaigns, analytics, launches, outreach.', ic: Megaphone, tone: 'pink' },
    { id: 'office', k: 'Accounting & Office', d: 'Reconciliations, reports, spreadsheets, filings.', ic: Calculator, tone: 'cyan' },
    { id: 'legal', k: 'Legal & Compliance', d: 'Reviews, forms, process, compliance checks.', ic: Scale, tone: '' },
    { id: 'general', k: 'Anything else', d: 'If it is on a screen, you are guided through it.', ic: Shapes, tone: 'amber' },
  ]
  const marquee = [
    'AWS', 'Invoices', 'Kubernetes', 'Payroll', 'RAG pipelines', 'Tax filing', 'Firewalls', 'Pitch decks',
    'Terraform', 'Grant applications', 'CI/CD', 'Budgets', 'Stripe', 'Procurement', 'Ansible', 'Onboarding',
    'Postgres', 'Insurance claims', 'n8n', 'Contracts', 'Grafana', 'Resumes', 'Docker', 'Expense reports',
    'SIEM', 'Fundraising', 'Salesforce', 'Email campaigns', 'Shopify', 'Board decks', 'Python & APIs', 'Inventory',
    'SSO / OAuth', 'Compliance', 'Nginx', 'Market research',
  ]
  const pillars = [
    { icon: Lock, t: 'Safe and private', flagship: true, claim: 'Your data never leaves your device unprotected.', d: 'Read-only by design, with on-device redaction for regulated teams.', points: ['PII, PHI, secrets and IPs stripped or tokenized on-device before anything is sent', 'Your documents and diagrams are read on your computer - the file never leaves', 'Never clicks, types or runs anything, and hidden on screen-share', 'A per-session audit log of exactly what was sent'] },
    { icon: Rocket, t: 'Powerful', claim: 'From a one-liner to a full enterprise build.', d: 'Whatever the task, it carries it end to end.', points: ['Simplest task to the most advanced', 'Any tool, any stack, any field', 'Nothing left half-done'] },
    { icon: Target, t: 'Accurate', claim: 'It only tells you what is really on your screen.', d: 'No guessing, no invented menus.', points: ['Never invents a button or setting', 'Catches a wrong value before you save', 'Says "I cannot see that" instead of guessing'] },
    { icon: Gauge, t: 'Fast', claim: 'The next step before you finish reading this.', d: 'It keeps pace with you, not the other way round.', points: ['Guidance in a blink', 'No waiting, no spinning', 'Moves the plan as you move'] },
    { icon: ScanEye, t: 'Multimodal', claim: 'Reads screens, cameras and documents.', d: 'It sees what you see, from any source.', points: ['Your screen, live', 'Your phone camera', 'Your own files for context'] },
    { icon: Sparkles, t: 'Intelligent', claim: 'Understands the goal, not just the words.', d: 'It reasons about what you are really doing.', points: ['Fits the real app - web, desktop, on-prem or custom', 'Corrects the step when a tool\'s UI has changed', 'Thinks deeper on hard steps, fixes the plan when reality differs'] },
    { icon: Globe2, t: 'Deep research', claim: 'Always up to date, never stale.', d: 'It checks the latest before it guides.', points: ['The current way, not last year\'s', 'Real official links and steps', 'Matches how tools work today'] },
    { icon: Compass, t: 'All around your goal', claim: 'Every step points at what you want.', d: 'It never loses the thread.', points: ['The goal is always in view', 'No busywork, no detours', 'Knows the moment you are done'] },
    { icon: ListChecks, t: 'Recorded & hand-held', claim: 'Walked through, and written down.', d: 'Guided live, and kept for later.', points: ['Guided every single step', 'A picture-rich report to keep', 'Repeat or share it anytime'] },
  ]
  const tiers = price ? [
    { id: 'basic', name: 'Basic', price: price.plans.basic, hrs: 2, tasks: (price.tasks || {}).basic, feats: ['2 hours of daily minutes - use anytime, billed per minute used', 'Step-by-step on any task', 'Exact commands, code & links', 'Roadmaps & diagrams', 'Floating guide + session write-up'], hour: price.hour.basic },
    { id: 'advanced', name: 'Advanced', price: price.plans.advanced, hrs: 4, tasks: (price.tasks || {}).advanced, popular: true, feats: ['4 hours of daily minutes - use anytime, billed per minute used', 'Everything in Basic', 'Upload your own documents', 'Visual examples where they help', 'Priority guidance'], hour: price.hour.advanced },
    { id: 'premium', name: 'Premium', price: price.plans.premium, hrs: 6, tasks: (price.tasks || {}).premium, feats: ['6 hours of daily minutes - use anytime, billed per minute used', 'Everything in Advanced', 'Generated visuals on demand', 'Highest-fidelity guidance', 'First in line, always'], hour: price.hour.premium },
  ] : []

  return (
    <div className="wm" ref={rootRef}>
      <style>{CSS}</style>
      <div className="wm-grain" aria-hidden />
      <div className="wm-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /><span className="orb o3" /></div>

      {/* NAV */}
      <header className="wm-nav">
        <div className="wm-wrap wm-nav-in">
          <a href="#top" aria-label="AdmireVeda"><AdmireVedaLogo size={26} /></a>
          <nav className="wm-links">
            <a href="/demo">Demo</a><a href="/workcopilot/use-cases">Use cases</a><a href="#security">Security</a><a href="#pricing">Pricing</a>
          </nav>
          <div className="wm-navcta">
            <button className="wm-ghost" onClick={() => go('')}>Sign in</button>
            <button className="wm-cta sm" onClick={() => go('')}>Get started <ArrowRight size={15} /></button>
          </div>
        </div>
      </header>

      {/* HERO. The headline rotates through the value propositions (one <h1>,
          content swapped). Hovering or focusing anywhere in the hero lockup holds
          the current line so a reader is never raced. */}
      <section className="wm-hero" id="top">
        <div
          className="wm-wrap wm-hero-grid"
          onPointerEnter={() => setHeroHover(true)} onPointerLeave={() => setHeroHover(false)}
          onFocus={() => setHeroFocus(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeroFocus(false) }}
        >
          <div className="wm-hero-copy">
            <div className="wm-badge" data-reveal><Sparkles size={13} /> Your expert, on every screen</div>
            <RotatingHero paused={heroHover || heroFocus} />
            <div className="wm-hero-cta" data-reveal>
              <button className="wm-cta" onClick={() => go('')}>Start guiding me <ArrowRight size={16} /></button>
              <button className="wm-cta alt" onClick={() => nav('/demo')}>See a 60-second demo <ArrowRight size={16} /></button>
            </div>
            {/* "Any app" strip: a quiet caption + a calm row of neutral category
                glyphs, filling the space below the CTAs. Category glyphs ONLY -
                no brand marks (honest). Tokens adapt to light + dark. */}
            <div className="wm-anyapp" data-reveal>
              <p className="wm-anyapp-cap">Guides you right inside any app you already use.</p>
              <div className="wm-anyapp-row">
                {[
                  { Ic: Globe2, t: 'Web browser' },
                  { Ic: TerminalSquare, t: 'Terminal' },
                  { Ic: Code2, t: 'Code editor' },
                  { Ic: Table, t: 'Spreadsheets' },
                  { Ic: FileText, t: 'Documents' },
                  { Ic: Palette, t: 'Design tools' },
                ].map(({ Ic, t }) => (
                  <span key={t} className="wm-anyapp-tile" title={t} aria-label={t}>
                    <Ic size={17} aria-hidden />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <LiveDemo tilt={tilt} untilt={untilt} />
        </div>

        {/* Security + Privacy teaser cards, spanning the banner under the hero grid.
            Compact, grounded claims only; both link to the showcase page. */}
        <div className="wm-wrap">
          <TrustDuo nav={nav} />
        </div>

        {/* marquee of fields */}
        <div className="wm-marquee" data-reveal>
          <div className="wm-marquee-row">
            {[...marquee, ...marquee].map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>
      </section>

      {/* THE STRONGEST AI AVAILABLE TO YOU PLANS IT - one compact band. Benefit
          + honesty guarantee only: the plan comes from the strongest AI on the
          key in use, the guidance keeps pace, and the app states what planned
          each task. The site claim is "available TO YOU", never a universal
          "#1", never a vendor/model name, never the routing behind it. */}
      <section className="wm-best" id="best-model">
        <div className="wm-wrap">
          <WorkCard theme="light" tone="violet" delay={0} texPos="100% 0%">
            <div className="wm-best-in">
              <div className="wm-best-copy">
                <div className="wm-eyebrow"><Trophy size={14} /> The strongest AI available to you</div>
                <h2 className="wm-best-h">Planned by the <span className="wm-best-ai">strongest AI</span> you can use. <em>Then guided, watched, and corrected - live on your screen.</em></h2>
                <p className="wm-best-p">When you start a task, the plan comes from the strongest AI your key can reach. Then it does what instructions can't: guides you step by step, <b>watches your screen as you go</b>, and <b>catches and corrects a wrong move</b> the moment it happens. A live loop, not a page of steps.</p>
                <WorkCard.Link as="a" href="/workcopilot/how-it-works#best-model">See what that means for you <ArrowRight size={14} /></WorkCard.Link>
              </div>
              <div className="wm-best-receipt" aria-label="How each task is planned, guided, watched and corrected">
                <div className="wm-best-row plan"><span className="k">plan</span><span className="v"><b>strongest AI</b> on your key</span></div>
                <div className="wm-best-row guide"><span className="k">guide</span><span className="v"><b>live</b>, step by step</span></div>
                <div className="wm-best-row watch"><span className="k">watch</span><span className="v">your <b>screen</b>, as you go <span className="wm-best-dots" aria-hidden><i /><i /><i /></span></span></div>
                <div className="wm-best-row correct"><span className="k">correct</span><span className="v">a wrong step, <b>caught and fixed</b></span></div>
                <WorkCard.Proof><b className="dp-ok"><Check size={11} /> Planned by the strongest AI for you</b> <span className="cb-dim">the best one available on the key in use</span></WorkCard.Proof>
              </div>
            </div>
          </WorkCard>
        </div>
      </section>

      {/* FOR COMPANIES & TEAMS - the killer, up top */}
      <section className="wm-sec wm-roi" id="roi">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Rocket size={14} /> For companies & teams</div>
          <h2 className="wm-h2" data-reveal>Do more, with the team you already have.</h2>
          <p className="wm-sub" data-reveal>Lean teams take on the toughest projects and ship like specialists. Faster, secure, documented, in-house.</p>
          <div className="wm-roi-stats" data-reveal>
            <CountStat value={70} prefix="+" suffix="%" label="faster to done" />
            <CountStat value={50} prefix="-" suffix="%" label="outsourcing spend" />
            <CountStat value={100} suffix="%" label="read-only, never acts" />
            <CountStat value={100} suffix="%" label="documented" />
            <div className="wm-roi-stat"><b>Weeks&nbsp;&rarr;&nbsp;days</b><span>to market</span></div>
          </div>
          <div className="wm-roi-grid">
            <WorkCard theme="light" delay={0} texPos="0% 0%">
              <WorkCard.Proof><span className="cb-chip">migrations</span><span className="cb-chip">hardening</span><span className="cb-chip">pentests</span><span className="cb-chip">builds</span></WorkCard.Proof>
              <WorkCard.Head icon={Layers} title="Toughest projects, in-house" />
              <WorkCard.Body>Your team delivers specialist work the first time. No new hires.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" tone="cyan" delay={70} texPos="100% 0%">
              <WorkCard.Proof><b>weeks</b> <span className="cb-arrow">&rarr;</span> <b>days</b> <span className="cb-dim">to market</span></WorkCard.Proof>
              <WorkCard.Head icon={Zap} title="Faster to market" />
              <WorkCard.Body>Pending work clears up to 70% faster. Ship weeks sooner.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" tone="amber" delay={140} texPos="50% 100%">
              <WorkCard.Proof><span className="cb-dim">any</span> <span className="cb-chip">framework</span><span className="cb-chip">platform</span><span className="cb-chip">tool</span></WorkCard.Proof>
              <WorkCard.Head icon={Rocket} title="Adopt new tech and tools" />
              <WorkCard.Body>Stand up any new framework, platform or tool correctly, the first time.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" delay={0} texPos="0% 100%">
              <WorkCard.Proof>least privilege <span className="cb-arrow">&middot;</span> no secrets <span className="cb-arrow">&middot;</span> validated <span className="cb-arrow">&middot;</span> <b>safe by default</b></WorkCard.Proof>
              <WorkCard.Head icon={ShieldCheck} title="Security-first in every answer" />
              <WorkCard.Body>Every step, command, snippet and fix is written the secure way: least privilege, no hardcoded secrets, validated input, current versions, and checked for the common risks before you run it. Like a security architect, secure developer and pentester on the keys.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" tone="cyan" delay={70} texPos="100% 100%">
              <WorkCard.Proof>every step <span className="cb-arrow">&rarr;</span> <b>write-up</b> + <b>audit log</b></WorkCard.Proof>
              <WorkCard.Head icon={FileText} title="Everything documented" />
              <WorkCard.Body>Every change, config and pentest ends with a write-up and an audit log.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" tone="violet" delay={140} texPos="50% 0%">
              <WorkCard.Proof><span className="cb-dim">contractors &middot; consultants &middot; partners</span> <span className="cb-arrow">&rarr;</span> <b>in-house</b></WorkCard.Proof>
              <WorkCard.Head icon={Gauge} title="Kill contractor & partner spend" />
              <WorkCard.Body>Contractors, consultants and implementation partners, brought in-house. Up to 50% less, quality kept.</WorkCard.Body>
            </WorkCard>
          </div>
        </div>
      </section>

      {/* FIELDS WE COVER - a SHORT teaser only. The full 10-family grid lives on
          /workcopilot/fields (owner rule: extra content on separate pages,
          linked from the footer; keep the main page short). The numbers come
          from the roster exported by that page, so they can never drift. */}
      <section className="wm-sec wm-fields" id="fields">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Shapes size={14} /> Every field &middot; one tool</div>
          <h2 className="wm-h2" data-reveal>Expert in your field, <em>whatever your field is.</em></h2>
          <p className="wm-sub" data-reveal>One tool your whole company can use. WorkCoPilot guides work across {FIELD_TOTAL} professional fields, and the steps read like an expert in that field wrote them.</p>
          <div className="wm-fld-stats" data-reveal aria-label="Coverage at a glance">
            <div className="wm-fld-stat"><b>{FIELD_TOTAL}</b><span>professional fields</span></div>
            <div className="wm-fld-stat"><b>{FIELD_FAMILIES.length}</b><span>families of work</span></div>
            <div className="wm-fld-stat"><b>1</b><span>tool for all of them</span></div>
          </div>
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta alt" href="/workcopilot/fields">See all {FIELD_TOTAL} fields and families <ArrowRight size={15} /></a>
          </div>
        </div>
      </section>

      {/* SECURITY / ENTERPRISE BAND */}
      <section className="wm-sec wm-security" id="security">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><ShieldCheck size={14} /> Enterprise-ready &middot; security-first</div>
          <h2 className="wm-h2" data-reveal>Private by design. Compliant by default.</h2>
          <p className="wm-sub" data-reveal>For security, healthcare, finance and government. Sensitive data is stripped or tokenized on your device, and every call follows a policy you arm and lock.</p>
          <div className="wm-sec-grid">
            <WorkCard theme="light" delay={0} texPos="0% 0%">
              <WorkCard.Proof><span className="cb-chip">PII</span><span className="cb-chip">PHI</span><span className="cb-chip">SECRET</span> <span className="cb-arrow">&rarr;</span> <b>[[token]]</b> <span className="cb-arrow">&rarr;</span> rebuilt here</WorkCard.Proof>
              <WorkCard.Head icon={Lock} title="Tokenized on your device" />
              <WorkCard.Body>Turn on tokenize and sensitive values never reach the AI. They are swapped for on-device tokens, then the full answer is rebuilt on your machine. Your documents, diagrams and screenshots are read on your computer, so the file itself never leaves.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" tone="cyan" delay={80} texPos="100% 50%">
              <WorkCard.Proof><span className="cb-chip">GDPR</span><span className="cb-chip">HIPAA</span><span className="cb-chip">PCI-DSS</span><span className="cb-chip">SOC 2</span><span className="cb-chip">ISO 27001</span><span className="cb-chip">FedRAMP</span><span className="cb-chip">NIST 800-53</span><span className="cb-chip">HITRUST</span><span className="cb-chip">CCPA</span></WorkCard.Proof>
              <WorkCard.Head icon={ShieldCheck} title="Compliant by policy" />
              <WorkCard.Body>Arm a policy per company for the frameworks you target, add any words that must never leave, then lock it. Controls and audit evidence to support your compliance - never a certification claim.</WorkCard.Body>
            </WorkCard>
            <WorkCard theme="light" tone="amber" delay={160} texPos="50% 100%">
              <WorkCard.Proof>watch <span className="cb-arrow">&middot;</span> guide <span className="cb-arrow">&middot;</span> <b>never act</b> <span className="cb-arrow">&middot;</span> <b>audit.log</b></WorkCard.Proof>
              <WorkCard.Head icon={ScanEye} title="Read-only and audited" />
              <WorkCard.Body>It watches and guides, never clicks or types, and hides on screen-share. A per-session log records exactly what was sent.</WorkCard.Body>
            </WorkCard>
          </div>
          <div className="wm-sec-paper" data-reveal>
            <a className="wm-cta" href="/workcopilot/security"><ScanEye size={16} /> See the data protection in action</a>
            <a className="wm-cta alt" href="/api/work/security-paper.pdf" target="_blank" rel="noopener"><FileText size={16} /> Read the Security &amp; Privacy paper (PDF)</a>
            <span>See real before and after - on screen and in text - then read what leaves your device and how a third party can verify every claim.</span>
          </div>
        </div>
      </section>

      {/* BENEFITS teaser - the full, visual breakdown lives on its own page. */}
      <section className="wm-sec">
        <div className="wm-wrap" data-reveal style={{ textAlign: 'center' }}>
          <h2 className="wm-h2">Like having the best person in the room, every time.</h2>
          <p className="wm-sub" style={{ margin: '12px auto 22px', maxWidth: 700 }}>Guided step by step, the exact how every time, catches and corrects mistakes, works in any app, and grounds every step in the best practice and in your own world.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 26 }}>
            {benefits.map((b) => (
              <span key={b.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 999, padding: '7px 14px' }}><b.icon size={15} style={{ color: 'var(--em)' }} /> {b.t}</span>
            ))}
          </div>
          <button className="wm-cta" onClick={() => nav('/workcopilot/how-it-works')}>See everything it does <ArrowRight size={16} /></button>
        </div>
      </section>

      {/* Sections below hidden per request (people / pillars / how / ways) - flip to true to restore */}
      {false && (<>
      {/* PEOPLE / OUTCOMES - real human moments */}
      <section className="wm-sec wm-people">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>For the moment it actually matters.</h2>
          <p className="wm-sub" data-reveal>Real tasks, real pressure, and a clear next move the whole way through.</p>
          <div className="wm-people-grid">
            <figure className="wm-photo" data-reveal>
              <img src="/ent-team.webp" alt="Two colleagues solving a hard problem together at a laptop in warm light" loading="lazy" width="1200" height="900" />
              <figcaption>
                <span className="wm-photo-tag">The toughest work, in-house</span>
                <span className="wm-photo-cap">A lean team ships specialist work, guided to the exact next step.</span>
              </figcaption>
            </figure>
            <figure className="wm-photo" data-reveal style={{ transitionDelay: '90ms' }}>
              <img src="/ent-focus.webp" alt="A professional finishing a complex task at a laptop with quiet confidence" loading="lazy" width="1200" height="900" />
              <figcaption>
                <span className="wm-photo-tag">Unstuck in seconds</span>
                <span className="wm-photo-cap">Lost halfway through. Get the precise next move and finish.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* PILLARS - why we lead (animated spotlight, not boxes) */}
      <section className="wm-sec wm-pillars">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>Built to be the best in the room.</h2>
          <p className="wm-sub" data-reveal>Powerful and precise, from your first click to done. This is what sets WorkCoPilot apart.</p>
          <div data-reveal><PillarSpotlight pillars={pillars} /></div>
        </div>
      </section>

      {/* HOW */}
      <section className="wm-sec wm-how" id="how">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>Three steps. Then you are moving.</h2>
          <div className="wm-flow">
            {steps.flatMap((s, i) => [
              <div className="wm-flow-node" data-reveal style={{ transitionDelay: `${i * 100}ms` }} key={s.n}>
                <div className="wm-flow-viz"><FViz k={s.viz} /></div>
                <div className="wm-flow-head"><span className="wm-flow-n">{s.n}</span><h3>{s.t}</h3></div>
                <p>{s.d}</p>
              </div>,
              i < steps.length - 1 ? <div className="wm-flow-arrow" key={`a${i}`} aria-hidden><ArrowRight size={22} /></div> : null,
            ])}
          </div>
        </div>
      </section>

      {/* WAYS */}
      <section className="wm-sec wm-ways" id="ways">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>Use it your way. Anywhere.</h2>
          <p className="wm-sub" data-reveal>Install the desktop or mobile app, or run it right in your browser when you cannot install a thing. <b style={{ color: 'var(--em)' }}>Every plan includes all three, on one subscription.</b></p>
          <div className="wm-ways-grid">
            <div className="wm-way" data-reveal onMouseMove={tilt} onMouseLeave={untilt}>
              <div className="wm-cardbox">stealth <span className="cb-arrow">&middot;</span> see-through <span className="cb-arrow">&middot;</span> <b>click-behind</b></div>
              <div className="wm-bhead"><span className="wm-bicon sm"><Monitor size={16} /></span><h3>Desktop app</h3></div>
              <p><b>Stealth on screen-share.</b> Invisible when you present or record. Full control of your work underneath.</p>
            </div>
            <div className="wm-way feat" data-reveal style={{ transitionDelay: '70ms' }} onMouseMove={tilt} onMouseLeave={untilt}>
              <span className="wm-feat-ribbon"><Zap size={12} /> No install</span>
              <div className="wm-cardbox"><b>no install</b> <span className="cb-arrow">&middot;</span> <span className="cb-dim">locked-down ready</span></div>
              <div className="wm-bhead"><span className="wm-bicon sm alt"><AppWindow size={16} /></span><h3>Browser overlay</h3></div>
              <p>Nothing to install. Works on locked-down machines, restricted laptops and virtual desktops.</p>
            </div>
            <div className="wm-way" data-reveal style={{ transitionDelay: '140ms' }} onMouseMove={tilt} onMouseLeave={untilt}>
              <div className="wm-cardbox">snap a photo <span className="cb-arrow">&middot;</span> <b>live watch</b></div>
              <div className="wm-bhead"><span className="wm-bicon sm"><Smartphone size={16} /></span><h3>Mobile app</h3></div>
              <p><b>Snap a photo or live-watch.</b> Point your phone camera at a screen or device and get guided on the go.</p>
            </div>
          </div>
        </div>
      </section>
      </>)}

      {/* USE CASES */}
      <section className="wm-sec" id="cards">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>One copilot for every kind of work.</h2>
          <p className="wm-sub" data-reveal>From an engineer to a CTO, a founder to a product lead, a marketer to a VP, an accountant to a finance head. Technical or not, pick a space and go.</p>
          <div className="wm-cards">
            {cards.map((c, i) => (
              <WorkCard key={c.k} theme="light" tone={c.tone || undefined} delay={i * 55}
                texPos={['0% 0%', '100% 0%', '50% 100%', '0% 100%', '100% 100%', '50% 0%', '0% 50%', '100% 50%'][i % 8]}
                onClick={() => nav(`/workcopilot/use-cases#${c.id}`)}>
                <WorkCard.Proof><span className="cb-dim">{c.d}</span></WorkCard.Proof>
                <WorkCard.Head icon={c.ic} title={c.k} />
                <WorkCard.Link>See in detail <ArrowRight size={14} /></WorkCard.Link>
              </WorkCard>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }} data-reveal>
            <button className="wm-cta alt" onClick={() => nav('/workcopilot/use-cases')}>Explore every use case in detail <ArrowRight size={15} /></button>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="wm-sec wm-pricing" id="pricing">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Zap size={14} /> Pricing</div>
          <h2 className="wm-h2" data-reveal>Simple plans. Real guided time.</h2>
          <p className="wm-sub" data-reveal>Hours of live guidance every day. Pause anytime, and come back right where you left off.</p>
          <div className="wm-cyc" data-reveal role="tablist" aria-label="Billing period">
            <button role="tab" aria-selected={cycle === 'monthly'} className={`wm-cyc-b${cycle === 'monthly' ? ' on' : ''}`} onClick={() => setCycle('monthly')}>Monthly</button>
            <button role="tab" aria-selected={cycle === 'annual'} className={`wm-cyc-b${cycle === 'annual' ? ' on' : ''}`} onClick={() => setCycle('annual')}>Annual <span className="wm-cyc-save">Save 20%</span></button>
          </div>
          <div className="wm-tiers">
            {tiers.map((t) => (
              <div className={`wm-tier${t.popular ? ' pop' : ''}`} data-reveal key={t.id}>
                {t.popular && <div className="wm-tier-tag">Most popular</div>}
                <div className="wm-tier-name">{t.name}</div>
                <div className="wm-tier-price">{money(monthlyRate(t.price))}<span>/mo</span></div>
                {cycle === 'annual'
                  ? <div className="wm-tier-cyc"><s>{money(t.price)}/mo</s> billed annually &middot; {money(annualTotal(t.price))}/yr</div>
                  : <div className="wm-tier-cyc dim">billed monthly</div>}
                <div className="wm-tier-hrs">{t.hrs} hours of daily minutes{t.tasks != null ? ` · up to ${t.tasks} tasks` : ''}</div>
                <div className="wm-tier-mins">Spend them anytime across the whole day. Billed per minute you actually use, never by the hour.</div>
                <ul>{t.feats.map((f) => <li key={f}><Check size={15} /> {f}</li>)}</ul>
                <button className={`wm-cta ${t.popular ? '' : 'alt'}`} onClick={() => choosePlan(t.id)}>Choose {t.name}</button>
                <div className="wm-tier-topup">Extra hour {money(t.hour)}</div>
              </div>
            ))}
            {/* Enterprise - a full pricing card, custom-priced, routes to sales. */}
            <div className="wm-tier wm-tier-ent" data-reveal key="enterprise">
              <div className="wm-tier-name">Enterprise</div>
              <div className="wm-tier-price wm-tier-custom">Custom</div>
              <div className="wm-tier-cyc dim">for regulated teams</div>
              <div className="wm-tier-hrs">Unlimited seats &middot; unlimited tasks</div>
              <ul>
                <li><Check size={15} /> Everything in Premium</li>
                <li><Check size={15} /> SSO / SAML &amp; team provisioning</li>
                <li><Check size={15} /> Per-company AI keys, or bring your own</li>
                <li><Check size={15} /> On-device PII / PHI redaction policy</li>
                <li><Check size={15} /> Audit log, DPA &amp; priority SLA</li>
                <li><Check size={15} /> Self-hosted / on-prem option</li>
              </ul>
              <a className="wm-cta alt" href="mailto:sales@admireveda.com?subject=WorkCoPilot%20Enterprise">Contact sales <ArrowRight size={15} /></a>
              <div className="wm-tier-topup">We reply within one business day</div>
            </div>
          </div>
          <div className="wm-trust" data-reveal>
            <span><Lock size={14} /> Secure checkout, powered by Stripe</span>
            <span><Check size={14} /> Cancel anytime, no contract</span>
            <span><ShieldCheck size={14} /> Purchased time never expires</span>
          </div>
          {price && <p className="wm-fineprint" data-reveal>Need more? Top up extra hours anytime. Premium adds generated visuals, and image packs start from {money(price.image.premium)} each (min {price.imageMinBulk}). Purchased time never expires.</p>}
          {/* The full entitlement matrix (every row, every plan, the fine print)
              lives on /workcopilot/pricing; the main page keeps only the cards. */}
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta alt" href="/workcopilot/pricing">See the full plan comparison <ArrowRight size={15} /></a>
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="wm-final">
        <div className="wm-wrap wm-final-in" data-reveal>
          <AVMark size={46} />
          <h2>Stop guessing. Start being guided.</h2>
          <p>Bring any task. WorkCoPilot takes it from the very first step to done.</p>
          <button className="wm-cta big" onClick={() => go('')}>Get started <ArrowRight size={18} /></button>
          <div className="wm-dl" data-reveal>
            <span className="wm-dl-lbl">Get the app</span>
            <div className="wm-dl-row">
              <a className="wm-dl-btn" href="/api/work/desktop-setup.exe" aria-label="Download the Windows desktop app">
                <Monitor size={22} />
                <span className="wm-dl-t"><b>Windows app</b><i>Desktop overlay</i></span>
                <Download size={16} />
              </a>
              <div className="wm-dl-btn soon" aria-disabled="true">
                <Smartphone size={22} />
                <span className="wm-dl-t"><b>Android app</b><i>Phone &amp; camera</i></span>
                <span className="wm-dl-soon">Coming soon</span>
              </div>
            </div>
            <span className="wm-dl-note">Windows: download and run it. Sign in once to activate.</span>
          </div>
        </div>
      </section>

      <div className="wm-disclaimer-wrap">
        <div className="wm-wrap">
          <p className="wm-disclaimer"><ShieldCheck size={14} /> <b>Responsible use.</b> WorkCoPilot supports lawful, legitimate work only. It will not help build weapons or means of mass harm, create malware or exploits, break into systems or accounts you do not own, or do anything illegal or harmful. Requests like these are declined.</p>
        </div>
      </div>

      <footer className="wm-foot">
        <div className="wm-wrap wm-foot-in">
          <AdmireVedaLogo size={24} idSuffix="f" />
          <span className="wm-foot-by">&copy; {new Date().getFullYear()} COE Security LLC &middot; WorkCoPilot by AdmireVeda, a product of COE Security LLC</span>
          <nav className="wm-foot-links">
            <a className="wm-link" href="/workcopilot/fields">Fields</a>
            <a className="wm-link" href="/workcopilot/pricing">Pricing</a>
            <a className="wm-link" href="/workcopilot/security">Security</a>
            <a className="wm-link" href="/workcopilot/benchmark">Accuracy</a>
            <a className="wm-link" href="/workcopilot/faq">FAQ</a>
            <a className="wm-link" href="/workcopilot/privacy">Privacy</a>
            <a className="wm-link" href="/workcopilot/disclaimer">Disclaimer</a>
            <a className="wm-link" href="/workcopilot/terms">Terms</a>
            <a className="wm-link" href="mailto:support@admireveda.com">Support</a>
            <button className="wm-link" onClick={() => go('')}>Sign in</button>
          </nav>
        </div>
      </footer>

      <LiveValidate go={go} theme="light" source="marketing" />
    </div>
  )
}


// Animated live-guide demo: cycles through tasks across fields, typing the goal,
// then showing the DEPTH - the exact how-to sub-steps, the command, and the
// "done when" check for the current step.
// A small stylized "screen" showing what the copilot is looking at, with the
// exact element to act on highlighted and a cursor on it. Amber when it is a fix.
function DemoScreen({ app, target, fix }) {
  return (
    <div className={`wm-scr${fix ? ' fix' : ''}`}>
      <div className="wm-scr-bar"><i /><i /><i /><span>{app}</span></div>
      <div className="wm-scr-body">
        <span className="wm-scr-row" /><span className="wm-scr-row w70" /><span className="wm-scr-row w45" />
        <span className="wm-scr-target">{target}<span className="wm-scr-ring" /></span>
        <span className="wm-scr-cursor" aria-hidden />
      </div>
    </div>
  )
}
// A red old-line / green new-line diff, the way the copilot shows a fix in code.
function DiffBlock({ file, oldLine, newLine }) {
  return (
    <div className="wm-diff">
      <div className="wm-diff-file"><FileText size={12} /> {file}<span className="wm-diff-badge">VULNERABLE &rarr; FIXED</span></div>
      <div className="wm-diff-line del"><span className="wm-diff-tag del">vuln</span><span className="m">-</span><code>{oldLine}</code></div>
      <div className="wm-diff-line add"><span className="wm-diff-tag add">fixed</span><span className="m">+</span><code>{newLine}</code></div>
    </div>
  )
}
// The terminal command, shown as the step's single stage visual (for cmd steps).
function TermBlock({ cmd }) {
  return (
    <div className="wm-demo-term">
      <div className="wm-demo-th">TERMINAL <CopyChip text={cmd} /></div>
      <code>{cmd}</code>
    </div>
  )
}
// A ready-to-run PROMPT handed off for the user's own AI (WorkCoPilot guides, it
// does not generate for you). Copyable - the "prompt download" action.
function PromptBlock({ text }) {
  return (
    <div className="wm-demo-term wm-demo-prompt">
      <div className="wm-demo-th"><span className="wm-demo-promptlbl"><Sparkles size={11} /> PROMPT FOR YOUR AI</span> <CopyChip text={text} /></div>
      <code>{text}</code>
    </div>
  )
}
// Hand-drawn marks for the two trust cards. Distinct on purpose: a shield with a
// check for Security, a padlock over a redaction bar for Privacy.
function ShieldMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2.6 4.6 5.4v6.1c0 4.5 3.1 8 7.4 9.9 4.3-1.9 7.4-5.4 7.4-9.9V5.4L12 2.6Z" />
      <path d="M8.7 12.1l2.2 2.2 4.5-4.6" />
    </svg>
  )
}
function RedactLockMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
      <path d="M8.2 15.5h7.6" strokeWidth="2.6" />
    </svg>
  )
}
// Two compact teaser cards under the hero: our strongest security and privacy
// facts, each one true of the product today. Both route to the showcase page.
function TrustDuo({ nav }) {
  const cards = [
    {
      k: 'sec', eyebrow: 'Security', Mark: ShieldMark,
      title: 'Written the secure way. Checked before you see it.',
      points: [
        'Every command, snippet and script is written the secure way, then self-checked for injection, hard-coded secrets and least privilege before it reaches you.',
        'Read-only. It watches and guides, never clicks, types or runs a thing. You keep full control.',
        'Grounded in the proven methodology of your field, not improvised.',
        'Stays current. It learns the current way your tools work and carries that forward, and checks the latest live, so advice is never stuck on stale AI knowledge.',
      ],
      proof: <><span className="dp-chip">injection</span><span className="dp-chip">secrets</span><span className="dp-chip">least-priv</span><span className="dp-arrow">&rarr;</span><b className="dp-ok"><Check size={11} /> checked</b></>,
      link: 'See security in action',
    },
    {
      k: 'priv', eyebrow: 'Privacy', Mark: RedactLockMark,
      title: 'Scrubbed on your device, before anything leaves.',
      points: [
        'Text and screen are checked locally. PII, PHI and secrets are masked first, on your machine.',
        'Tokenize swaps sensitive values for placeholders and restores them on your device. Private by design.',
        'You decide what gets scrubbed: industry-standard detectors plus your own rules, set by you, your company admin or the platform.',
        'Your boundary holds. On your own AI key, calls stay on that key. Nothing is silently rerouted.',
      ],
      proof: <><span className="dp-raw">jane@acme.com</span><span className="dp-arrow">&rarr;</span><b className="dp-tok">[[EMAIL_1]]</b><span className="dp-raw">sk-live-9f3c</span><span className="dp-arrow">&rarr;</span><b className="dp-tok">[[SECRET_1]]</b></>,
      link: 'See privacy in action',
    },
  ]
  return (
    <div className="wm-duo">
      {cards.map((c, i) => (
        <WorkCard key={c.k} theme="light" tone={c.k === 'priv' ? 'cyan' : undefined} delay={i * 90} texPos={i === 0 ? '0% 0%' : '100% 100%'}>
          <WorkCard.Head align="start" icon={<c.Mark />} eyebrow={c.eyebrow} title={c.title} />
          <WorkCard.Points items={c.points} />
          <WorkCard.Proof>{c.proof}</WorkCard.Proof>
          <WorkCard.Link onClick={() => nav('/workcopilot/security')}>{c.link} <ArrowRight size={14} /></WorkCard.Link>
        </WorkCard>
      ))}
    </div>
  )
}

function LiveDemo({ tilt, untilt }) {
  // Each demo is a REAL sequence the copilot walks you through: it READS your
  // screen ("I can see"), tells you the exact next move, CATCHES mistakes and
  // CORRECTS them (code diffs and all). This is the hand-holding, not a step list.
  const demos = [
    {
      tag: 'Private by design', app: 'Billing console', goal: 'Set up a billing integration without leaking customer data',
      steps: [
        { sees: 'The screen shows a customer email, a card number and a live API key', fix: { say: 'Those are PII, a card and a secret - they must never reach an AI', do: 'They are blacked out in the screenshot and swapped for placeholders in text, on your device, before anything is sent' }, click: 'Protect on-device', done: 'only [EMAIL], [CARD] and [API_KEY] leave your device' },
        { sees: 'You paste an error that still contains sk-live-... and an internal IP', fix: { say: 'A pasted log carries the secret and your private host', do: 'They are tokenized too, and the real values stay on your machine' }, click: 'Tokenize', done: 'the AI sees [[SECRET_1]] and [[IP_2]], never the real values' },
        { sees: 'The answer comes back referencing the placeholders', step: 'Rebuild the answer locally', how: ['The real values are restored on your device', 'You get the full, usable answer', 'Nothing sensitive was ever transmitted'], click: 'Rebuild', done: 'you get the real answer; the AI never did' },
      ],
    },
    {
      tag: 'Agentic GenAI', app: 'Agent build', goal: 'Build a tool-calling RAG agent',
      steps: [
        { sees: 'An empty agent project is open', step: 'Create the vector store and embed your docs', how: ['Pick a vector store (pgvector or Chroma)', 'Chunk your docs to ~800 tokens with overlap', 'Embed the chunks and upsert them'], cmd: '$ pip install langchain langgraph chromadb', click: 'Create collection', done: 'the collection holds your vectors' },
        { sees: 'Retrieval returns whole documents', fix: { say: 'Returning full docs blows the context window and buries the answer', do: 'Return the top matching chunks with a score threshold, not whole files' }, diff: { file: 'retriever.py:21', old: 'retriever = store.as_retriever()', new: 'retriever = store.as_retriever(search_kwargs={"k":4,"score_threshold":0.75})' }, click: 'Set top-k', done: 'retrieval returns focused chunks' },
        { sees: 'Tools are defined but the agent free-forms answers', step: 'Wire the tool-calling loop', how: ['Bind the tools to the model', 'Add the reason, call-tool, observe loop', 'Stop when the model returns a final answer'], click: 'Bind tools', done: 'the agent actually calls your tools' },
        { sees: 'User text is concatenated into the system prompt', fix: { say: 'That is a prompt-injection hole: a user can override your instructions', do: 'Keep user input in a user turn, never in the system prompt, and allowlist tool arguments' }, diff: { file: 'agent.py:40', old: 'system = BASE + user_input', new: 'messages = [system(BASE), user(user_input)]' }, click: 'Separate roles', done: 'user text cannot hijack the system prompt' },
        { sees: 'You want a starter you can paste into your own AI', step: 'Copy a ready-to-run prompt, tuned to your stack', how: ['Scoped to your vector store and model', 'Security and privacy baked in - placeholders, never real secrets', 'Paste it into your AI and attach your docs'], prompt: 'Scaffold a tool-calling RAG agent (LangGraph + Chroma). Retrieve top-4 chunks (score >= 0.75), keep user text in a USER turn, allowlist tool args, and use <API_KEY> placeholders - never real secrets.', click: 'Copy prompt', done: 'you have a prompt ready to paste into your AI' },
      ],
    },
    {
      tag: 'API pentest', app: 'Burp Suite', goal: 'Pentest your orders API with Burp Suite',
      steps: [
        { sees: 'Burp is open on the Proxy tab', step: 'Route your app through Burp', how: ['Open Proxy, then Proxy settings', 'Point your browser proxy at 127.0.0.1:8080', "Install Burp's CA cert so HTTPS is trusted"], click: 'Proxy settings', done: 'requests show up in HTTP history' },
        { sees: 'A GET /api/orders/1024 is captured', step: 'Send it to Repeater', how: ['Right-click the request in HTTP history', 'Choose "Send to Repeater"', 'Open the Repeater tab'], click: 'Send to Repeater', done: 'the request is loaded in Repeater' },
        { sees: 'The order id is in the path and you own 1024', fix: { say: "Swapping the id to another user's order tests for IDOR, broken object-level auth", do: 'In Repeater change 1024 to 1025 and Send; a 200 with someone else\'s order is a real finding' }, click: 'Send', done: 'you get a 403 (safe) or a logged finding' },
        { sees: 'An error response leaks a full stack trace', fix: { say: 'The stack trace hands an attacker your framework, versions and file paths', do: 'Record it as an info-leak finding and recommend generic error responses' }, click: 'Log finding', done: 'the finding is documented' },
      ],
    },
    {
      tag: 'Incident response', app: 'Grafana + kubectl', goal: 'Find why p99 latency spiked and stop the bleeding',
      steps: [
        { sees: 'p99 jumped from 120ms to 2.4s at 14:03', fix: { say: 'A latency cliff at a sharp timestamp is a deploy or a dependency, not organic load', do: 'Overlay the deploy markers and the DB dashboard on 14:03' }, click: 'Overlay deploys', done: 'the spike lines up with a rollout' },
        { sees: 'The new pod runs an N+1 query per request', fix: { say: 'Each request now fans out to hundreds of DB calls - that is your latency', do: 'Roll the deploy back now, then fix the query - stop the bleeding first' }, click: 'Roll back', cmd: '$ kubectl rollout undo deploy/orders', done: 'p99 falls back under 200ms' },
        { sees: 'The root cause is a missing eager-load', step: 'Fix the N+1 at the source, not the symptom', how: ['Eager-load the association so it is one query, not N', 'Add the missing index on the foreign key', 'Add a p99 alert so this pages before customers feel it'], click: 'Open PR', done: 'the fix is in review with an alert attached' },
      ],
    },
    {
      tag: 'Code review', app: 'Pull request', goal: 'Review this pull request before it ships',
      steps: [
        { sees: 'A new query builds SQL with string concatenation', fix: { say: 'User input goes straight into SQL. That is an injection hole', do: 'Switch to a parameterized query' }, diff: { file: 'users.js:88', old: 'db.query("SELECT * FROM u WHERE id=" + req.params.id)', new: 'db.query("SELECT * FROM u WHERE id=$1", [req.params.id])' }, click: 'Request changes', done: 'the query is parameterized' },
        { sees: 'The login compares the password with ==', fix: { say: 'That is a plain-text compare, and == is loose equality', do: 'Hash and compare with bcrypt' }, diff: { file: 'auth.js:42', old: 'if (user.password == input) grant()', new: 'if (bcrypt.compareSync(input, user.hash)) grant()' }, click: 'Comment', done: 'the check uses bcrypt' },
        { sees: 'A live API key is hard-coded in config', fix: { say: 'A secret in source leaks to every clone and the git history', do: 'Move it to an environment variable' }, diff: { file: 'config.js:7', old: 'const KEY = "sk_live_9f3c2a..."', new: 'const KEY = process.env.STRIPE_KEY' }, click: 'Flag secret', done: 'no secret left in the code' },
      ],
    },
    {
      tag: 'Cloud security', app: 'AWS IAM', goal: 'Replace a wildcard IAM policy with least privilege',
      steps: [
        { sees: 'The role grants Action "*" on Resource "*"', fix: { say: 'That is full admin - one leaked key owns the whole account', do: 'Scope it to exactly the actions this app makes, on its own resources' }, diff: { file: 'role-policy.json', old: '"Action": "*",  "Resource": "*"', new: '"Action": ["s3:GetObject","s3:PutObject"], "Resource": "arn:aws:s3:::app-data/*"' }, click: 'Edit policy', done: 'the policy is scoped to one bucket' },
        { sees: 'CloudTrail shows the role also calls SQS', step: 'Add only what it really uses', how: ['Open CloudTrail, filter events by this role', 'List the distinct API calls it actually makes', 'Grant exactly those - nothing speculative'], click: 'Add sqs:SendMessage', done: 'every real call is allowed, nothing more' },
        { sees: 'Access Analyzer flags the bucket as public', fix: { say: 'The bucket policy still allows a wildcard principal, so anyone can read it', do: 'Remove Principal "*" so only this role can reach the data' }, click: 'Fix bucket policy', done: 'Access Analyzer goes green' },
      ],
    },
  ]
  const [di, setDi] = useState(() => Math.floor(Math.random() * demos.length))  // a different scenario each load
  const [si, setSi] = useState(0)
  const [typed, setTyped] = useState('')
  const [show, setShow] = useState(false)
  const [reveal, setReveal] = useState(0)   // staged reveal: 1=see, 2=stage, 3=act, 4=details
  const d = demos[di]
  // Reveal the card in beats, not all at once: after the goal, "I can see" glows
  // in, then the screen/terminal, then the action (Do this / Hold on), then the
  // detail. Re-runs on every step so each move reads like a live hand-hold.
  useEffect(() => {
    if (!show) { setReveal(0); return }
    setReveal(0)
    const GAP = 720
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setReveal(n), GAP * n))
    return () => timers.forEach(clearTimeout)
  }, [show, si, di])
  // Type the goal when the scenario changes, then reveal the walkthrough.
  useEffect(() => {
    let t1, t2, cancelled = false
    setShow(false); setTyped(''); setSi(0)
    let n = 0
    const type = () => {
      if (cancelled) return
      n++; setTyped(d.goal.slice(0, n))
      if (n < d.goal.length) t1 = setTimeout(type, 24)
      else t2 = setTimeout(() => !cancelled && setShow(true), 300)
    }
    t1 = setTimeout(type, 280)
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2) }
  }, [di])
  // Walk the steps; after the last, move on. A correction or a diff lingers a
  // touch longer so it reads.
  useEffect(() => {
    if (!show) return
    const cur = d.steps[si] || d.steps[0]
    const last = si >= d.steps.length - 1
    const dwell = (cur.fix || cur.diff) ? 8600 : 7600   // staged reveal (~3s) + read time (+1s per step)
    const t = setTimeout(() => {
      if (last) setDi((x) => (x + 1) % demos.length)
      else setSi((x) => x + 1)
    }, dwell)
    return () => clearTimeout(t)
  }, [show, si, di])
  const tot = d.steps.length
  const safeSi = si < tot ? si : 0           // guard: never index past the current scenario (fixes the white page)
  const s = d.steps[safeSi]
  const isFix = !!s.fix
  return (
    <div className="wm-demo" data-reveal onMouseMove={tilt} onMouseLeave={untilt}>
      <div className="wm-demo-head"><span className="d r" /><span className="d y" /><span className="d g" /><b>WorkCoPilot</b><span className="wm-demo-live" title="reading your screen"><i />watching</span><span className="wm-demo-tag">{d.tag}</span></div>
      <div className="wm-demo-goal"><span className="wm-demo-k">GOAL</span> {typed}<span className="wm-caret" /></div>
      <div className={`wm-demo-body${show ? ' in' : ''}`}>
        {reveal >= 1 && (
          <div className="wm-demo-sees wm-beat glow" key={'see' + safeSi}><span className="wm-demo-scan" aria-hidden /><span className="wm-demo-seek"><ScanEye size={12} /> I can see</span> {s.sees}</div>
        )}
        {reveal >= 2 && (
          <div className="wm-demo-stage wm-beat" key={'st' + safeSi}>
            {s.diff
              ? <DiffBlock file={s.diff.file} oldLine={s.diff.old} newLine={s.diff.new} />
              : s.prompt
                ? <PromptBlock text={s.prompt} />
                : s.cmd
                  ? <TermBlock cmd={s.cmd} />
                  : <DemoScreen app={d.app} target={s.click} fix={isFix} />}
          </div>
        )}
        {reveal >= 2 && (
          <div className="wm-demo-steps wm-beat" aria-hidden>
            {d.steps.map((_, k) => <i key={k} className={k < safeSi ? 'done' : k === safeSi ? 'now' : ''} />)}
          </div>
        )}
        {reveal >= 3 && (
          <div className="wm-demo-guide">
            {isFix ? (
              <div className={`wm-demo-fix wm-beat${reveal >= 3 ? ' pop' : ''}`} key={'fx' + safeSi}>
                <div className="wm-demo-fixhead"><AlertTriangle size={13} /> HOLD ON <span className="wm-demo-stepno">Step {safeSi + 1} of {tot}</span></div>
                <div className="wm-demo-fixsay">{s.fix.say}</div>
                {reveal >= 4 && <div className="wm-demo-fixdo wm-beat"><ArrowRight size={13} /> {s.fix.do}</div>}
              </div>
            ) : (
              <>
                <div className="wm-demo-now wm-beat">
                  <div className="wm-demo-label">DO THIS NOW <span className="wm-demo-stepno">Step {safeSi + 1} of {tot}</span></div>
                  <div key={safeSi} className="wm-demo-step">{s.step}</div>
                </div>
                {reveal >= 4 && (
                  <div className="wm-demo-how wm-beat" key={'h' + safeSi}>
                    <div className="wm-demo-howlabel">EXACTLY HOW</div>
                    <ol>{s.how.map((h, k) => <li key={k} className="wm-demo-fade" style={{ animationDelay: `${60 + k * 90}ms` }}>{h}</li>)}</ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {reveal >= 4 && <div className="wm-demo-done wm-beat" key={'dn' + safeSi}><Check size={13} /> done when {s.done}</div>}
      </div>
      <button type="button" className="wm-demo-try" onClick={() => { try { window.dispatchEvent(new Event('wc:open-validate')) } catch { /* noop */ } }}>
        <Sparkles size={14} /> <span>Is it right for <b>your</b> work? Test your scenario live</span> <ArrowRight size={14} />
      </button>
    </div>
  )
}

// The core strengths as a big-type spotlight: a list that auto-rotates and
// reacts to hover, with each pillar blown up on a stage. Not a box grid.
function PillarSpotlight({ pillars }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setActive((a) => (a + 1) % pillars.length), 3000)
    return () => clearInterval(t)
  }, [paused, pillars.length])
  const A = pillars[active]
  return (
    <div className="wm-spot" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="wm-spot-list">
        {pillars.map((p, i) => (
          <button key={p.t} className={`wm-spot-item${i === active ? ' on' : ''}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}>
            <span className="wm-spot-ix">{String(i + 1).padStart(2, '0')}</span>
            <span className="wm-spot-word">{p.t}</span>
            <span className="wm-spot-desc">{p.d}</span>
            {i === active && <span className={`wm-spot-prog${paused ? ' paused' : ''}`} aria-hidden><i /></span>}
          </button>
        ))}
      </div>
      <div className="wm-spot-stage">
        <div key={active} className="wm-spot-card">
          <div className="wm-spot-no">{String(active + 1).padStart(2, '0')} / {String(pillars.length).padStart(2, '0')}</div>
          <div className="wm-spot-viz"><PViz t={A.t} /></div>
          <div className="wm-spot-lower">
            <span className="wm-spot-bigic"><A.icon size={28} /></span>
            <h3>{A.t}</h3>
            <div className="wm-spot-claim">{A.claim}</div>
            <ul className="wm-spot-points">{A.points.map((p) => <li key={p}><Check size={15} /> {p}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mini graphics for the how-it-works flow (say goal -> guided -> keep).
function FViz({ k }) {
  if (k === 'goal') return (
    <div className="fv fv-goal"><span className="fv-k">GOAL</span><span className="fv-type">Set up an AWS VPC</span><span className="fv-caret" /></div>)
  if (k === 'guide') return (
    <div className="fv fv-guide"><div className="fv-now"><span className="fv-lbl">DO THIS NOW</span><span className="fv-step">Create the VPC</span></div><div className="fv-dots"><i className="done" /><i className="now" /><i /><i /></div></div>)
  if (k === 'keep') return (
    <div className="fv fv-keep"><div className="fv-doc"><span className="l w70" /><span className="l w90" /><span className="l w50" /><span className="fv-check"><Check size={14} /></span><b>PDF</b></div></div>)
  return null
}

// A relevant graphic for each core-strength, shown big on the spotlight stage.
function PViz({ t }) {
  if (t === 'Powerful') return (
    <div className="pv pv-bars"><i style={{ height: '28%' }} /><i style={{ height: '52%' }} /><i style={{ height: '76%' }} /><i style={{ height: '100%' }} /><span className="pv-cap">simple → enterprise</span></div>)
  if (t === 'Accurate') return (
    <div className="pv pv-acc"><div className="pv-win"><span className="pv-bar" /><span className="pv-bar w60" /><span className="pv-btn">Create VPC<span className="pv-ring2" /></span></div><span className="pv-cap">exactly here</span></div>)
  if (t === 'Fast') return (
    <div className="pv pv-fast"><div className="pv-track"><i /></div><span className="pv-ms">0.3s</span></div>)
  if (t === 'Multimodal') return (
    <div className="pv pv-multi"><span className="pv-src"><Monitor size={18} /></span><span className="pv-src"><Camera size={18} /></span><span className="pv-src"><FileText size={18} /></span><span className="pv-join">→</span><span className="pv-hub"><Sparkles size={20} /></span></div>)
  if (t === 'Intelligent') return (
    <div className="pv pv-brain"><span className="pv-n a" /><span className="pv-ln l1" /><span className="pv-ln l2" /><span className="pv-n b" /><span className="pv-n c" /></div>)
  if (t === 'Deep research') return (
    <div className="pv pv-res"><div className="pv-search"><Globe2 size={13} /> latest way to do it</div><div className="pv-rchips"><span><Check size={10} /> 2026 docs</span><span>official</span></div></div>)
  if (t === 'All around your goal') return (
    <div className="pv pv-goal"><span className="pv-ring g3" /><span className="pv-ring g2" /><span className="pv-ring g1" /><Target size={24} /></div>)
  if (t === 'Recorded & hand-held') return (
    <div className="pv pv-doc2"><div className="pv-page"><span className="w70" /><span className="w90" /><span className="w50" /><span className="w80" /><b>PDF</b></div></div>)
  if (t === 'Safe and private') return (
    <div className="pv pv-safe">
      <div className="pv-shield"><Lock size={22} /></div>
      <div className="pv-redact">
        <span className="chip">[PII]</span><span className="chip">[PHI]</span><span className="chip">[SSN]</span>
        <span className="chip">[CARD]</span><span className="chip">[IP]</span><span className="chip">[SECRET]</span>
      </div>
      <span className="pv-cap">stripped on-device, before anything is sent</span>
    </div>)
  return null
}

// Animated count-up stat: ticks from 0 to the target the first time it scrolls
// into view (eased), for a dynamic "numbers that move" feel.
function CountStat({ value, prefix = '', suffix = '', label, dur = 1300 }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current; if (!el) return
    let done = false
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting && !done) {
          done = true; io.disconnect()
          const t0 = performance.now()
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / dur)
            const eased = 1 - Math.pow(1 - p, 3)
            setN(Math.round(eased * value))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      })
    }, { threshold: 0.45 })
    io.observe(el); return () => io.disconnect()
  }, [value, dur])
  return <div className="wm-roi-stat" ref={ref}><b>{prefix}{n}{suffix}</b><span>{label}</span></div>
}

// Small purpose-built graphics for the benefit cards - show, do not tell.
function BViz({ k }) {
  if (k === 'steps') return (
    <div className="bv bv-steps"><span className="bvs done" /><span className="bvl" /><span className="bvs now" /><span className="bvl dim" /><span className="bvs" /><span className="bv-cap">step 2 of 4</span></div>)
  if (k === 'command') return (
    <div className="bv bv-cmd"><code><b>$</b> aws ec2 create-vpc</code><span className="bv-tick"><Check size={11} /> Copied</span></div>)
  if (k === 'zero') return (
    <div className="bv bv-flow"><span>Open</span><i>→</i><span>Sign in</span><i>→</i><span className="on">Done</span></div>)
  if (k === 'fix') return (
    <div className="bv bv-fix"><span className="bad">0.0.0.0/0</span><i>→</i><span className="good"><Check size={11} /> 10.0.0.0/16</span></div>)
  if (k === 'current') return (
    <div className="bv bv-cur"><span className="bv-live"><span className="bv-pulse" /> LATEST</span><span className="bv-cur-t">checked just now</span></div>)
  if (k === 'record') return (
    <div className="bv bv-doc"><span className="bv-dl w60" /><span className="bv-dl w90" /><span className="bv-dl w45" /><span className="bv-pdf">PDF</span></div>)
  return null
}

// ---------------------------------------------------------------------------
// Rotating hero headline. ONE <h1> whose content is swapped (never several
// h1s), cycling the vetted value propositions every 5s. Each line is a list of
// [text, emphasised] segments; the emphasised run takes the brand gradient.
// Wording is approved copy: refine the gradient word here, never add claims.
// ---------------------------------------------------------------------------
// (FIELD_FAMILIES / FIELD_TOTAL moved to ./WorkFields.jsx - imported above.)

const HERO_DWELL_MS = 12000
// Each entry pairs a headline (h) with its own supporting line (s); they change
// together. The compliance line is deliberately general: the hero never names a
// fixed short list of frameworks.
const HERO_PAIRS = [
  { h: [['Get '], ['anything', 1], [' done right, the first time.']],
    s: 'It watches your screen and tells you the exact next move, step by step, until the job is done. Any task, any field.' },
  { h: [['The '], ['sharpest person', 1], [' in the room, on every screen.']],
    s: 'A genius pair sits beside you in any app, reads what is on your screen, and tells you the exact next move.' },
  { h: [['Always on.', 1], [' The expert you need, the moment you need one.']],
    s: 'No scheduling, no waiting. Bring any task, any field, and get expert guidance right now, step by step.' },
  // Mirrors server/store.js HERO_DEFAULT: keep the two lists identical so the
  // fallback paint and the API feed never disagree.
  { h: [['Code that is '], ['safe to run', 1], [', checked before you see it.']],
    s: 'Every command, script and fix is written the secure way, then scanned for injection, exposed secrets, over-broad access and known-vulnerable libraries, so what you get is ready to go.' },
  { h: [['Private by design', 1], [', redacted on your device.']],
    s: 'Sensitive data is stripped or tokenized on your machine before anything is sent. Your files and secrets never leave.' },
  { h: [['The '], ['strongest AI', 1], [' plans it. Guided and corrected, live.']],
    s: 'Your plan comes from the strongest AI your key can reach. Then it guides you step by step, watches your screen, and catches and corrects a wrong move in real time.' },
  { h: [['Do more with the '], ['team you already have', 1], ['.']],
    s: 'Lean teams take on specialist work and ship like experts, without new hires or outsourcing.' },
  { h: [['Compliance-ready', 1], [' for the frameworks you answer to.']],
    s: 'Arm a policy for the frameworks you report to, lock it, and get controls and audit evidence to support your compliance.' },
  { h: [['The AI is '], ['on us', 1], [', always included.']],
    s: 'You are never billed for how much AI a task takes. It is part of your plan, so bring every task, big or small, and focus on the work, not the cost.' },
  { h: [['Quality over quantity', 1], [', on every step.']],
    s: 'You get the one correct next move, done the proven way for your field and checked before you see it, not a pile of options to sort through. Do it once, and do it right.' },
]

// Split a line into words (on plain spaces only, so the NBSP in "SOC 2" holds)
// where each word is a list of {t, em} parts. A word that straddles a segment
// boundary, like "design," (gradient word + plain comma), stays ONE word so the
// comma can never wrap onto its own line.
function heroWords(line) {
  const words = []; let word = []
  const endWord = () => { if (word.length) { words.push(word); word = [] } }
  for (const [text, em] of line) {
    let buf = ''
    const endPart = () => { if (buf) { word.push({ t: buf, em: !!em }); buf = '' } }
    for (const ch of text) { if (ch === ' ') { endPart(); endWord() } else buf += ch }
    endPart()
  }
  endWord()
  return words
}

// Convert a superadmin-editable pair { h, s, em } (from GET /api/work/hero) into
// the internal render format { h: [[text, emFlag?], ...], s }. `em` is a plain
// substring of `h` to paint with the brand gradient: the first case-insensitive
// match is split out as the gradient run; if em is empty/null or not found, the
// whole headline renders plain. Nothing about motion or layout changes - this
// only decides WHICH words carry the gradient.
function heroPairFromApi({ h, s, em }) {
  const text = String(h)
  const needle = em == null ? '' : String(em)
  if (!needle) return { h: [[text]], s: String(s) }
  const at = text.toLowerCase().indexOf(needle.toLowerCase())
  if (at < 0) return { h: [[text]], s: String(s) }
  const segs = []
  const before = text.slice(0, at)
  const mid = text.slice(at, at + needle.length)
  const after = text.slice(at + needle.length)
  if (before) segs.push([before])
  segs.push([mid, 1])
  if (after) segs.push([after])
  return { h: segs, s: String(s) }
}

function HeroWords({ line }) {
  return heroWords(line).map((parts, i) => (
    <span key={i}>
      {i > 0 ? ' ' : null}
      <span className="w" style={{ '--i': i }}>
        {parts.map((p, j) => (p.em ? <em key={j}>{p.t}</em> : p.t))}
      </span>
    </span>
  ))
}

// The headline is TOP-anchored so it always hugs the eyebrow, for ANY copy and
// any number of pairs (the pairs may become superadmin-editable, so nothing here
// may assume a fixed line count or that the lines wrap to equal heights). Each
// block (the h1 AND the lead) is given an explicit height equal to the CURRENT
// line's natural height, measured off-screen before paint and re-measured by a
// ResizeObserver whenever the width changes. That height is TRANSITIONED only
// during a swap, so when a taller or shorter line appears the subtext and CTAs
// glide into place (a small, smooth settle) instead of a dead gap or a jump;
// resizes snap instantly. The live element holds only the current line (plus,
// for ~0.6s, the outgoing one marked aria-hidden while it fades). One clock
// drives both, so headline and subtext always match.
function RotatingHero({ paused }) {
  // The rotating copy. Built-in HERO_PAIRS is the fallback and the first paint;
  // if the superadmin-editable feed returns a usable set, it swaps in. Only the
  // SOURCE of the pairs is dynamic - the motion, timing and layout are unchanged.
  const [pairs, setPairs] = useState(HERO_PAIRS)
  const [idx, setIdx] = useState(0)
  const [prev, setPrev] = useState(null)   // outgoing pair while it dissolves
  const [live, setLive] = useState(false)  // false until the first swap: no entrance on page load
  const [hH, setHH] = useState(null)        // height of the TALLEST headline across all pairs (px)
  const [lH, setLH] = useState(null)        // height of the TALLEST subtext across all pairs (px)
  const idxRef = useRef(0)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const pairsRef = useRef(pairs)             // the live pairs the timer cycles
  pairsRef.current = pairs
  const hMeas = useRef(null)                 // off-screen measurer: ONE child per pair's headline
  const lMeas = useRef(null)                 // off-screen measurer: ONE child per pair's subtext
  const cur = pairs[idx] || pairs[0]         // guard: a shorter fetched set can outrun idx
  const out = prev != null ? pairs[prev] : null

  // Fetch the superadmin-editable hero copy once. On any failure, timeout, bad
  // shape, or empty set, keep the built-in HERO_PAIRS - the hero NEVER blanks.
  useEffect(() => {
    let alive = true
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = setTimeout(() => { try { if (ctrl) ctrl.abort() } catch { /* ignore */ } }, 4000)
    fetch('/api/work/hero', ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || !Array.isArray(data.pairs) || data.pairs.length === 0) return
        const mapped = data.pairs
          .filter((p) => p && typeof p.h === 'string' && p.h.trim() && typeof p.s === 'string' && p.s.trim())
          .map(heroPairFromApi)
        if (!mapped.length) return   // nothing usable: stay on the built-ins
        idxRef.current = 0
        setPrev(null); setLive(false); setIdx(0); setPairs(mapped)
      })
      .catch(() => { /* network/abort/parse: keep built-ins */ })
      .finally(() => clearTimeout(timer))
    return () => { alive = false; clearTimeout(timer); try { if (ctrl) ctrl.abort() } catch { /* ignore */ } }
  }, [])

  // LAYOUT STABILITY (CLS): reserve each stage at the height of the TALLEST line
  // in the whole set, measured before paint, so the h1 box never changes size as
  // the pairs rotate and the subtext, CTAs and the "any app" row stay put. (The
  // previous version sized each stage to the CURRENT line and animated the
  // change, which still moved everything under the headline on every rotation.)
  // The measurers hold one hidden child per pair, so the max is exact for the
  // real copy (built-in or fetched) at the real width. Re-measured on any width
  // change (ResizeObserver) and once the display font has loaded.
  useLayoutEffect(() => {
    const tallest = (el) => {
      if (!el) return null
      let m = 0
      for (const c of el.children) m = Math.max(m, c.offsetHeight)
      return m || null
    }
    const measure = () => {
      const h = tallest(hMeas.current); if (h != null) setHH(h)
      const l = tallest(lMeas.current); if (l != null) setLH(l)
    }
    measure()
    let ro = null
    try {
      // The measurer stacks its children, so its own height changes whenever a
      // width change re-wraps any line - one observer per stage covers it.
      ro = new ResizeObserver(measure)
      if (hMeas.current) ro.observe(hMeas.current)
      if (lMeas.current) ro.observe(lMeas.current)
    } catch { ro = null }
    // The display font (Bricolage Grotesque) loads async; a first measure with
    // fallback metrics can under-measure a long line. Re-measure once fonts are
    // ready so the reserved height matches the real wrapped height.
    let cancelled = false
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!cancelled) measure() }) } catch { /* ignore */ }
    return () => { cancelled = true; if (ro) ro.disconnect() }
  }, [pairs])

  useEffect(() => {
    let reduce = false
    try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { reduce = false }
    if (reduce) return undefined   // reduced motion: pair 1, static, no timer at all
    let fade = null
    const tick = () => {
      // Hold while hovered/focused or while the tab is in the background, so a
      // reader is never raced and a returning visitor never sees a mid-swap jump.
      if (pausedRef.current || document.hidden) return
      const from = idxRef.current, to = (from + 1) % pairsRef.current.length
      idxRef.current = to
      setPrev(from); setIdx(to); setLive(true)
      if (fade) clearTimeout(fade)
      fade = setTimeout(() => setPrev(null), 700)
    }
    const iv = setInterval(tick, HERO_DWELL_MS)
    return () => { clearInterval(iv); if (fade) clearTimeout(fade) }
  }, [])

  const inCls = live ? 'wm-h1-in' : 'wm-h1-line'
  // className stays STATIC so the scroll-reveal's `in` class (added to the DOM by
  // the IntersectionObserver, then unobserved) is never clobbered by a re-render.
  // Only the reserved height is driven inline, and it is the same for every pair.
  return (
    <>
      <div className="wm-h1-stage" data-reveal style={hH != null ? { minHeight: `${hH}px` } : undefined}>
        <div className="wm-h1-meas" aria-hidden="true" ref={hMeas}>
          {pairs.map((p, i) => <div key={i}><HeroWords line={p.h} /></div>)}
        </div>
        <h1>
          {out != null && (
            <span key={`out${prev}`} className="wm-h1-out" aria-hidden="true"><HeroWords line={out.h} /></span>
          )}
          <span key={`in${idx}`} className={inCls}><HeroWords line={cur.h} /></span>
        </h1>
      </div>
      {/* The paired subtext: same clock, same tallest-line reservation, a softer
          whole-line rise that lands just after the headline's words settle. */}
      <div className="wm-lead-stage" data-reveal style={lH != null ? { minHeight: `${lH}px` } : undefined}>
        <div className="wm-lead-meas" aria-hidden="true" ref={lMeas}>
          {pairs.map((p, i) => <div key={i}>{p.s}</div>)}
        </div>
        <p className="wm-lead">
          {out != null && (
            <span key={`out${prev}`} className="wm-h1-out" aria-hidden="true">{out.s}</span>
          )}
          <span key={`in${idx}`} className={inCls}>{cur.s}</span>
        </p>
      </div>
    </>
  )
}

// (The compare-plans entitlement matrix moved to ./WorkPricing.jsx, which is
// now its single home; the pricing section above links there.)

const CSS = `
.wm{--ink:#070810;--panel:#12141d;--line:rgba(255,255,255,.09);--tx:#eef0f6;--mut:#9aa0b4;--em:#8cf5c4;--em2:#39d3ff;--warm:#ffb35c;--warm2:#ff7a59;--mx:0;--my:0;
  position:relative;min-height:100vh;background:var(--ink);color:var(--tx);font-family:"Figtree",system-ui,sans-serif;font-size:17px;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.wm *{box-sizing:border-box}
.wm a{color:inherit;text-decoration:none}
.wm h1,.wm h2,.wm h3,.wm h4{color:var(--tx);margin:0}
.wm p{margin:0}
.wm em{font-style:normal;background:linear-gradient(120deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent}
.wm-wrap{max-width:1160px;margin:0 auto;padding:0 24px;position:relative;z-index:3}
.wm-grain{position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.045;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.wm-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(90px);opacity:.42;transition:transform .3s ease-out}
.o1{width:48vw;height:48vw;left:-12vw;top:-16vw;background:radial-gradient(circle,rgba(57,211,255,.55),transparent 65%);transform:translate(calc(var(--mx)*40px),calc(var(--my)*40px))}
.o2{width:42vw;height:42vw;right:-10vw;top:-8vw;background:radial-gradient(circle,rgba(140,245,196,.5),transparent 65%);transform:translate(calc(var(--mx)*-50px),calc(var(--my)*30px))}
.o3{width:40vw;height:40vw;left:30vw;top:38vh;background:radial-gradient(circle,rgba(255,122,89,.28),transparent 65%);transform:translate(calc(var(--mx)*30px),calc(var(--my)*-40px))}
.wm section,.wm header,.wm footer{position:relative;z-index:2}

/* NAV */
.wm-nav{position:sticky;top:0;z-index:40;backdrop-filter:blur(16px);background:rgba(7,8,16,.62);border-bottom:1px solid var(--line)}
.wm-nav-in{display:flex;align-items:center;gap:22px;height:70px}
.wm-links{display:flex;gap:26px;margin-left:auto;color:var(--mut);font-size:15px}
.wm-links a{position:relative}
.wm-links a:hover{color:var(--tx)}
.wm-navcta{display:flex;gap:10px;align-items:center;margin-left:24px}
.wm-ghost{background:transparent;border:1px solid var(--line);color:var(--tx);border-radius:11px;padding:9px 15px;font:inherit;font-size:14px;cursor:pointer}
.wm-ghost:hover{border-color:rgba(255,255,255,.3)}
.wm-cta{background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s,box-shadow .15s}
.wm-cta:hover{transform:translateY(-2px);box-shadow:0 18px 44px -14px rgba(255,122,89,.75)}
.wm-cta.sm{padding:9px 15px;font-size:14px;border-radius:11px}
.wm-cta.big{padding:17px 30px;font-size:17px}
.wm-cta.alt{background:rgba(255,255,255,.04);color:var(--tx);border:1px solid rgba(255,255,255,.18);box-shadow:none}
.wm-cta.alt:hover{border-color:var(--em);color:var(--em)}
.wm-link{background:none;border:none;color:var(--mut);font:inherit;font-size:15px;cursor:pointer;text-decoration:underline;text-underline-offset:4px}
.wm-link:hover{color:var(--tx)}

.wm [data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)}
.wm [data-reveal].in{opacity:1;transform:none}
/* The two rotating hero stages are reserved at the height of their TALLEST line
   (set inline, same value for every pair), so a rotation never changes the box
   and nothing under the headline moves. The reveal transition is re-declared
   here (opacity + transform only; no height animation, there is no height change
   to animate) and className stays static so the reveal "in" class is never
   overwritten by a re-render. */
.wm .wm-h1-stage[data-reveal],.wm .wm-lead-stage[data-reveal]{transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)}

/* HERO */
.wm-hero{padding:78px 0 0;position:relative}
.wm-hero-vid{position:absolute;inset:-70px 0 auto 0;width:100%;height:640px;object-fit:cover;opacity:.5;z-index:0;pointer-events:none;-webkit-mask-image:linear-gradient(180deg,#000 42%,transparent);mask-image:linear-gradient(180deg,#000 42%,transparent)}
@media(prefers-reduced-motion:reduce){.wm-hero-vid{display:none}}
/* align-items:start (not center): the left copy column animates its own height
   as the hero rotates; a shared centered row would make the demo box re-center
   (grow/shrink) every cycle. Top-anchoring pins the fixed-height demo box so it
   never reacts to the text animation, and keeps it the tallest column so the row
   height - and everything below the hero - stays put. */
.wm-hero-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:50px;align-items:start}
/* min-width:0 on BOTH columns at every width (not only on phones): a grid item's
   default min-width:auto lets a long nowrap code line inside the demo widen the
   .92fr track, which read as the dark box "growing to the left" on one
   scenario. With this, the tracks are fixed by the fr split and the demo's
   content wraps or scrolls INSIDE the box. */
.wm-hero-grid>*{min-width:0}
.wm-badge{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--em);border:1px solid rgba(140,245,196,.3);background:rgba(140,245,196,.07);padding:6px 13px;border-radius:999px;margin-bottom:24px}
/* Rotating headline. Typography lives on the stage so the h1 AND the off-screen
   measurer wrap identically. The stage is TOP-anchored (the h1 always hugs the
   eyebrow) and reserved at the height of the TALLEST headline in the set
   (measured in JS from one hidden copy per pair), so a shorter line leaves the
   box exactly where it was and the lead + CTAs never move between rotations. */
.wm-h1-stage{position:relative;margin:0 0 24px;font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(38px,5.6vw,66px);line-height:1.02;letter-spacing:-.035em;text-wrap:balance;overflow-wrap:anywhere}
.wm-h1-meas{position:absolute;top:0;left:0;width:100%;visibility:hidden;pointer-events:none;user-select:none}
.wm-h1-meas .w{display:inline-block}   /* same word boxes as the live h1, so the wrap matches */
.wm-hero h1{font:inherit;letter-spacing:inherit;margin:0;display:grid}
.wm-hero h1>span{grid-area:1/1;display:block}
.wm-hero h1 .w{display:inline-block}
/* Incoming line: each word rises out of a soft blur, staggered left to right.
   Outgoing line: lifts, blurs and dissolves underneath it. */
.wm-hero h1 .wm-h1-in{opacity:0;animation:wmHeroIn .72s cubic-bezier(.22,.7,.25,1) forwards}
.wm-hero h1 .wm-h1-out{pointer-events:none;animation:wmLineOut .6s cubic-bezier(.4,0,.6,1) forwards}
.wm-hero h1 .wm-h1-out .w,.wm-hero h1 .wm-h1-in .w{opacity:1}
@keyframes wmHeroIn{from{opacity:0;transform:translateY(.26em);filter:blur(5px)}60%{filter:blur(0)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes wmLineOut{to{opacity:0;transform:translateY(-.2em);filter:blur(6px)}}
@media(prefers-reduced-motion:reduce){
 .wm-hero h1 .wm-h1-in{opacity:1;animation:none}
 .wm-hero h1 .wm-h1-out{display:none}
}
/* Paired subtext: same tallest-line reservation as the headline. Top-anchored,
   so it sits directly under the headline, and the CTAs below it never move.
   Width and size live on the stage so the <p> and the measurer wrap identically. */
.wm-lead-stage{position:relative;font-size:19px;max-width:40ch;margin:0 0 22px}
.wm-lead-meas{position:absolute;top:0;left:0;width:100%;visibility:hidden;pointer-events:none;user-select:none}
.wm-lead{font-size:inherit;color:var(--mut);margin:0;display:grid}
.wm-lead>span{grid-area:1/1;display:block}
.wm-lead .wm-h1-in{opacity:0;animation:wmLeadIn .62s cubic-bezier(.22,.7,.25,1) .08s forwards}
.wm-lead .wm-h1-out{pointer-events:none;animation:wmLineOut .42s cubic-bezier(.5,0,.75,.4) forwards}
@keyframes wmLeadIn{from{opacity:0;transform:translateY(.5em);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
@media(prefers-reduced-motion:reduce){
 .wm-lead .wm-h1-in{opacity:1;animation:none}
 .wm-lead .wm-h1-out{display:none}
}
.wm-killer{display:flex;align-items:center;gap:12px;background:linear-gradient(100deg,rgba(57,211,255,.1),rgba(140,245,196,.06));border:1px solid rgba(57,211,255,.32);border-radius:14px;padding:13px 15px;margin-bottom:26px;max-width:470px;font-size:14.5px;color:var(--tx);transition:transform .15s,border-color .2s}
.wm-killer:hover{transform:translateY(-2px);border-color:var(--em2)}
.wm-killer b{color:var(--em2)}
.wm-killer-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:rgba(57,211,255,.15);color:var(--em2);flex-shrink:0}
.wm-killer svg:last-child{margin-left:auto;color:var(--mut);flex-shrink:0}
/* Hero controls: the two CTAs in one aligned row. */
.wm-hero-cta{display:flex;align-items:center;flex-wrap:wrap;gap:12px}
/* "Any app" strip - fills the space under the CTAs. Quiet caption + a calm row
   of neutral category-glyph tiles (no brand marks). Reuses the shared tokens so
   it reads right in both light and dark. */
.wm-anyapp{margin-top:30px;max-width:470px}
.wm-anyapp-cap{font-size:13px;color:var(--mut);margin:0 0 12px}
.wm-anyapp-row{display:flex;flex-wrap:wrap;gap:10px}
.wm-anyapp-tile{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;color:var(--mut);background:var(--panel);border:1px solid var(--line);box-shadow:0 1px 2px rgba(0,0,0,.04);transition:transform .15s ease,border-color .2s ease,color .2s ease}
.wm-anyapp-tile:hover{transform:translateY(-2px);border-color:var(--em);color:var(--em)}
@media(prefers-reduced-motion:reduce){.wm-anyapp-tile{transition:border-color .2s ease,color .2s ease}.wm-anyapp-tile:hover{transform:none}}
@media(max-width:560px){.wm-anyapp{margin-top:24px}.wm-anyapp-row{gap:8px}.wm-anyapp-tile{width:40px;height:40px;border-radius:11px}}
.wm-modes{display:flex;align-items:center;gap:18px;margin-bottom:10px;flex-wrap:wrap}
.wm-mode{display:flex;align-items:center;gap:10px;color:var(--tx)}
.wm-mode svg{color:var(--em);flex-shrink:0}
.wm-mode div{display:flex;flex-direction:column;line-height:1.25}
.wm-mode b{font-size:14.5px}
.wm-mode span{font-size:11.5px;color:var(--mut)}
.wm-mode-div{width:1px;height:30px;background:var(--line)}
.wm-ways3-note{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut);margin-bottom:26px}
.wm-ways3-note svg{color:var(--em)}

/* DEMO */
/* LAYOUT STABILITY: the box fills its grid track and can never be widened by
   its content (width:100% + min-width:0 + overflow:hidden), and every inner
   region has a fixed height (goal, sees, stage, guide), so the box keeps one
   width and one height across every scenario and every step. */
.wm-demo{background:linear-gradient(180deg,rgba(18,20,29,.96),rgba(10,11,18,.98));border:1px solid var(--line);border-radius:22px;padding:17px;box-shadow:0 50px 100px -40px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .2s ease-out;min-height:600px;display:flex;flex-direction:column;width:100%;min-width:0;max-width:100%;overflow:hidden}
.wm-demo>*{min-width:0}
.wm-demo-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:2px 4px 14px}
.wm-demo-head b{font-family:"Bricolage Grotesque";margin-left:6px}
.wm-demo-head .d{width:9px;height:9px;border-radius:50%}
.d.r{background:#ff5f57}.d.y{background:#febc2e}.d.g{background:#28c840}
.wm-demo-tag{margin-left:auto;font-size:11px;color:var(--em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 10px}
.wm-demo-goal{font-size:15px;line-height:1.5;color:var(--tx);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:11px;padding:11px 13px;min-height:68px;overflow-wrap:anywhere}   /* two lines reserved: no height change between short and long goals */
.wm-demo-k{font-size:10px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-right:8px}
.wm-caret{display:inline-block;width:2px;height:15px;background:var(--em);margin-left:3px;vertical-align:-2px;animation:wmblink 1s step-end infinite}
@keyframes wmblink{50%{opacity:0}}
.wm-demo-body{margin-top:12px;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s;flex:1;display:flex;flex-direction:column}
.wm-demo-body.in{opacity:1;transform:none}
.wm-demo-now{border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.06);border-radius:13px;padding:13px}
.wm-demo-label{font-size:10px;letter-spacing:.14em;color:var(--em);font-weight:700;margin-bottom:5px}
.wm-demo-step{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wm-demo-term{margin-top:12px;border:1px solid #27324a;border-radius:11px;overflow:hidden}
.wm-demo-th{display:flex;justify-content:space-between;background:#0c1222;color:#8ea3c0;font-size:10px;letter-spacing:.1em;padding:7px 10px}
.wm-demo-th span{color:#cdd6e5}
.wm-demo-prompt{border:1px solid rgba(255,154,77,.4)}
.wm-demo-prompt .wm-demo-th{background:linear-gradient(90deg,rgba(255,154,77,.16),rgba(242,106,67,.06))}
.wm-demo-promptlbl{display:inline-flex;align-items:center;gap:5px;color:#ffb35c !important;font-weight:800}
.wm-demo-promptlbl svg{color:#ff9a4d}
.wm-demo-term code{display:block;background:#0c1222;color:#d6e9d6;font-family:"JetBrains Mono",monospace;font-size:12.5px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}   /* long commands wrap INSIDE the box, never widen it */
.wm-demo-list{list-style:none;padding:12px 4px 2px;margin:0;display:flex;flex-direction:column;gap:8px;font-size:14px}
.wm-demo-list li{color:var(--mut);padding-left:24px;position:relative}
.wm-demo-list li:before{content:"○";position:absolute;left:4px;color:var(--mut)}
.wm-demo-list li.done{color:#7fb;text-decoration:line-through;opacity:.7}.wm-demo-list li.done:before{content:"✓";color:var(--em)}
.wm-demo-list li.now{color:var(--tx);font-weight:600}.wm-demo-list li.now:before{content:"▸";color:var(--em2)}
.wm-demo-stepno{float:right;font-size:10px;letter-spacing:.06em;color:var(--mut);font-weight:600}
.wm-demo-how{margin-top:12px;border:1px solid var(--line);border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.02)}
.wm-demo-howlabel{font-size:10px;letter-spacing:.14em;color:var(--em2);font-weight:700;margin-bottom:8px}
.wm-demo-how ol{margin:0;padding:0;list-style:none;counter-reset:hw;display:flex;flex-direction:column;gap:8px}
.wm-demo-how li{counter-increment:hw;position:relative;padding-left:26px;font-size:13.5px;color:var(--tx);line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wm-demo-how li:before{content:counter(hw);position:absolute;left:0;top:0;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,rgba(140,245,196,.25),rgba(57,211,255,.18));color:var(--em);font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.wm-demo-done{display:flex;align-items:center;gap:7px;margin-top:auto;padding-top:12px;font-size:12px;color:var(--mut)}
.wm-demo-done svg{color:var(--em)}
.wm-demo-try{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,154,77,.4);background:linear-gradient(135deg,rgba(255,154,77,.14),rgba(242,106,67,.08));color:#ffd9bf;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:transform .15s,border-color .15s}
.wm-demo-try:hover{transform:translateY(-1px);border-color:rgba(255,154,77,.7)}
.wm-demo-try b{color:#ffb35c}
.wm-demo-try svg{color:#ff9a4d;flex-shrink:0}
.wm-demo-steps{display:flex;gap:5px;margin-bottom:11px}
.wm-demo-steps i{height:3px;flex:1;border-radius:2px;background:rgba(255,255,255,.1);transition:background .3s}
.wm-demo-steps i.done{background:var(--em)}
.wm-demo-steps i.now{background:linear-gradient(90deg,var(--em),var(--em2))}
.wm-demo-fade{animation:wm-demo-fade .32s ease-out both}
@keyframes wm-demo-fade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
/* Staged reveal: each beat rises in on its own, so the card is read like a live
   hand-hold, not dumped at once. "I can see" glows as it perceives; "Hold on"
   flashes amber as it catches the risk - then both settle. */
.wm-beat{animation:wm-beat-in .42s cubic-bezier(.2,.8,.2,1) both}
@keyframes wm-beat-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.wm-beat.glow{animation:wm-beat-in .42s cubic-bezier(.2,.8,.2,1) both,wm-beat-glow 1.5s ease-out .18s both}
@keyframes wm-beat-glow{0%{box-shadow:0 0 0 0 rgba(57,211,255,0)}26%{box-shadow:0 0 0 4px rgba(57,211,255,.22),0 12px 30px -12px rgba(57,211,255,.55)}100%{box-shadow:0 0 0 0 rgba(57,211,255,0)}}
.wm-beat.pop{animation:wm-beat-in .42s cubic-bezier(.2,.8,.2,1) both,wm-beat-pop 1.6s ease-out .18s both}
@keyframes wm-beat-pop{0%{box-shadow:0 0 0 0 rgba(255,154,77,0)}26%{box-shadow:0 0 0 4px rgba(255,154,77,.24),0 12px 30px -12px rgba(255,154,77,.55)}100%{box-shadow:0 0 0 0 rgba(255,154,77,0)}}
@media(prefers-reduced-motion:reduce){.wm-beat,.wm-beat.glow,.wm-beat.pop{animation:none}}
.wm-demo-live{display:inline-flex;align-items:center;gap:5px;margin-left:10px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--em)}
.wm-demo-live i{width:7px;height:7px;border-radius:50%;background:var(--em);box-shadow:0 0 8px var(--em);animation:wm-demo-pulse 1.4s ease-in-out infinite}
@keyframes wm-demo-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.wm-demo-sees{position:relative;display:flex;align-items:center;gap:8px;margin-top:12px;padding:9px 11px;border:1px solid rgba(57,211,255,.28);background:rgba(57,211,255,.06);border-radius:11px;font-size:12.5px;color:var(--tx);overflow:hidden;height:52px}
.wm-demo-seek{display:inline-flex;align-items:center;gap:4px;font-size:9.5px;letter-spacing:.12em;font-weight:700;color:var(--em2);text-transform:uppercase;flex:0 0 auto}
.wm-demo-seek svg{color:var(--em2)}
.wm-demo-scan{position:absolute;top:0;bottom:0;left:0;width:38%;background:linear-gradient(90deg,transparent,rgba(57,211,255,.16),transparent);animation:wm-demo-scanx 1.9s linear infinite}
@keyframes wm-demo-scanx{from{transform:translateX(-120%)}to{transform:translateX(330%)}}
.wm-scr{margin-top:10px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0a0f18;animation:wm-demo-fade .3s ease-out both}
.wm-scr-bar{display:flex;align-items:center;gap:5px;padding:7px 10px;background:#0c1220;border-bottom:1px solid rgba(255,255,255,.05)}
.wm-scr-bar i{width:7px;height:7px;border-radius:50%;background:#2a3550}
.wm-scr-bar span{margin-left:8px;font-size:10.5px;color:#8ea3c0}
.wm-scr-body{position:relative;height:84px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.wm-scr-row{height:7px;width:100%;border-radius:4px;background:rgba(255,255,255,.06)}
.wm-scr-row.w70{width:70%}.wm-scr-row.w45{width:45%}
.wm-scr-target{position:absolute;right:16px;top:24px;display:inline-flex;align-items:center;padding:6px 12px;border-radius:9px;font-size:12px;font-weight:700;color:#06201a;background:linear-gradient(135deg,var(--em),var(--em2))}
.wm-scr-ring{position:absolute;inset:-5px;border-radius:12px;border:2px solid var(--em);animation:wm-demo-ring 1.5s ease-out infinite}
@keyframes wm-demo-ring{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.4);opacity:0}}
.wm-scr-cursor{position:absolute;right:34px;top:50px;width:0;height:0;border-left:7px solid #fff;border-top:5px solid transparent;border-bottom:9px solid transparent;transform:rotate(-40deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));animation:wm-demo-tap 1.5s ease-in-out infinite}
@keyframes wm-demo-tap{0%,100%{transform:rotate(-40deg) translate(0,0)}50%{transform:rotate(-40deg) translate(-3px,-3px)}}
.wm-scr.fix .wm-scr-target{color:#2a0f06;background:linear-gradient(135deg,#ffb35c,#ff7a59)}
.wm-scr.fix .wm-scr-ring{border-color:#ff9a4d}
.wm-diff{margin-top:10px;border:1px solid #27324a;border-radius:11px;overflow:hidden;background:#0a0f18;font-family:"JetBrains Mono",ui-monospace,monospace;animation:wm-demo-fade .3s ease-out both}
.wm-diff-file{display:flex;align-items:center;gap:6px;padding:7px 11px;background:#0c1220;color:#8ea3c0;font-size:10.5px;letter-spacing:.04em;border-bottom:1px solid rgba(255,255,255,.05)}
.wm-diff-file svg{color:#8ea3c0}
/* Diff lines WRAP inside the fixed-width box (pre-wrap + anywhere + break-word on
   the code), so a long line like a retriever call with search_kwargs can never
   widen the demo or push it left; the +/- marker keeps its own column. */
.wm-diff-line{display:flex;gap:9px;padding:6px 11px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}
.wm-diff-line span{flex:0 0 auto;font-weight:700;opacity:.85}
.wm-diff-line code{flex:1 1 auto;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font:inherit}
.wm-diff-line.del{background:rgba(255,99,99,.09);color:#ffb3b3}.wm-diff-line.del span{color:#ff6b6b}
.wm-diff-line.add{background:rgba(140,245,196,.09);color:#bdf5d8}.wm-diff-line.add span{color:var(--em)}
.wm-diff-badge{margin-left:auto;font-size:8.5px;font-weight:800;letter-spacing:.07em;color:#ffb35c;border:1px solid rgba(255,179,92,.45);border-radius:999px;padding:2px 7px}
.wm-diff-tag{font-size:7.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:4px;padding:2px 5px;opacity:1}
.wm-diff-line.del .wm-diff-tag{background:rgba(255,99,99,.2);color:#ff8a8a}
.wm-diff-line.add .wm-diff-tag{background:rgba(140,245,196,.2);color:#8cf5c4}
.wm-demo-fix{margin-top:12px;border:1px solid rgba(255,140,90,.4);background:rgba(255,140,90,.08);border-radius:13px;padding:12px 13px;animation:wm-demo-fade .3s ease-out both}
.wm-demo-fixhead{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.12em;color:#ffb35c;font-weight:800}
.wm-demo-fixhead svg{color:#ffb35c}
.wm-demo-fixhead .wm-demo-stepno{color:var(--mut)}
.wm-demo-fixsay{margin-top:7px;font-size:13.5px;color:var(--tx);font-weight:600;line-height:1.4}
.wm-demo-fixdo{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:13px;color:var(--em);font-weight:600}
.wm-demo-fixdo svg{color:var(--em);flex:0 0 auto}
.wm-demo-stage{margin-top:12px;height:120px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;min-width:0}   /* fixed: a wrapped diff or command stays inside this box */
.wm-demo-stage > *{margin-top:0;min-width:0;max-width:100%}
.wm-demo-guide{margin-top:12px;height:214px;overflow:hidden}
.wm-demo-guide > :first-child{margin-top:0}

/* SECURITY + PRIVACY DUO (under the hero grid) */
.wm-duo{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:44px}
.wm-duo-card{position:relative;display:flex;flex-direction:column;gap:14px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));border:1px solid var(--line);border-radius:20px;padding:22px 24px 20px;overflow:hidden;transition:transform .18s ease-out,border-color .2s,box-shadow .2s}
.wm-duo-card:before{content:"";position:absolute;inset:0 0 auto 0;height:3px}
.wm-duo-card.sec:before{background:linear-gradient(90deg,var(--em),transparent 80%)}
.wm-duo-card.priv:before{background:linear-gradient(90deg,var(--em2),transparent 80%)}
.wm-duo-card:after{content:"";position:absolute;width:260px;height:260px;right:-120px;top:-140px;border-radius:50%;pointer-events:none;opacity:.55}
.wm-duo-card.sec:after{background:radial-gradient(circle,rgba(140,245,196,.16),transparent 68%)}
.wm-duo-card.priv:after{background:radial-gradient(circle,rgba(57,211,255,.16),transparent 68%)}
.wm-duo-card:hover{transform:translateY(-3px)}
.wm-duo-card.sec:hover{border-color:rgba(140,245,196,.45)}
.wm-duo-card.priv:hover{border-color:rgba(57,211,255,.45)}
.wm-duo-top{display:flex;align-items:flex-start;gap:14px;position:relative;z-index:1}
.wm-duo-ic{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:46px;height:46px;border-radius:14px;color:var(--em);background:linear-gradient(135deg,rgba(140,245,196,.22),rgba(57,211,255,.12));box-shadow:0 0 26px -8px rgba(140,245,196,.55)}
.wm-duo-card.priv .wm-duo-ic{color:var(--em2);background:linear-gradient(135deg,rgba(57,211,255,.22),rgba(140,245,196,.1));box-shadow:0 0 26px -8px rgba(57,211,255,.55)}
.wm-duo-head{display:flex;flex-direction:column;gap:3px;min-width:0}
.wm-duo-eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--em)}
.wm-duo-card.priv .wm-duo-eyebrow{color:var(--em2)}
.wm-duo-card h3{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(18px,1.7vw,21px);letter-spacing:-.015em;line-height:1.18;margin:0}
.wm-duo-points{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;position:relative;z-index:1}
.wm-duo-points li{display:flex;gap:9px;align-items:flex-start;font-size:14px;line-height:1.5;color:var(--tx)}
.wm-duo-points li svg{flex:0 0 auto;margin-top:4px;color:var(--em)}
.wm-duo-card.priv .wm-duo-points li svg{color:var(--em2)}
/* mono "proof strip": a tiny live look at the mechanism, stays dark like every product screen */
.wm-duo-proof{display:flex;align-items:center;flex-wrap:wrap;gap:7px;min-height:44px;border-radius:12px;background:#141924;border:1px solid rgba(255,255,255,.08);padding:9px 13px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px;color:#aeb9cc;line-height:1.3;position:relative;z-index:1}
.wm-duo-proof .dp-chip,.wm-duo-proof .dp-tok,.wm-duo-proof .dp-raw,.wm-duo-proof .dp-ok{animation:wm-demo-fade .45s ease-out both}
.wm-duo-proof > :nth-child(2){animation-delay:.08s}.wm-duo-proof > :nth-child(3){animation-delay:.16s}.wm-duo-proof > :nth-child(4){animation-delay:.24s}.wm-duo-proof > :nth-child(5){animation-delay:.32s}.wm-duo-proof > :nth-child(6){animation-delay:.4s}
.wm-duo-proof .dp-chip{font-weight:700;color:#8cf5c4;border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.1);border-radius:6px;padding:2px 8px;font-size:10.5px}
.wm-duo-proof .dp-arrow{color:#5bd0ff;font-weight:700}
.wm-duo-proof .dp-ok{display:inline-flex;align-items:center;gap:4px;color:#06201a;background:linear-gradient(135deg,#8cf5c4,#5bd0ff);border-radius:6px;padding:2px 8px;font-size:10.5px;font-weight:800}
.wm-duo-proof .dp-raw{color:#ff9a9a;text-decoration:line-through;text-decoration-color:rgba(255,120,120,.7)}
.wm-duo-proof .dp-tok{color:#5bd0ff;font-weight:700}
.wm-duo-link{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;background:none;border:none;padding:0;font:inherit;font-size:13.5px;font-weight:700;color:var(--em);cursor:pointer;position:relative;z-index:1;transition:gap .15s}
.wm-duo-card.priv .wm-duo-link{color:var(--em2)}
.wm-duo-link:hover{gap:10px;text-decoration:underline;text-underline-offset:4px}
@media(max-width:900px){.wm-duo{grid-template-columns:1fr;gap:14px;margin-top:34px}}
@media(max-width:560px){.wm-duo-card{padding:18px 18px 16px}.wm-duo-card h3{font-size:18px}.wm-duo-points li{font-size:13.5px}}

/* MARQUEE */
.wm-marquee{margin-top:60px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.wm-marquee-row{display:flex;gap:40px;width:max-content;animation:wmscroll 40s linear infinite;color:var(--mut);font-size:14px;font-weight:500;white-space:nowrap}
.wm-marquee-row span{opacity:.75}
@keyframes wmscroll{to{transform:translateX(-50%)}}

/* BAND */
.wm-band{padding:30px 0}
.wm-band-in{display:flex;align-items:center;gap:26px;background:linear-gradient(110deg,rgba(57,211,255,.1),rgba(140,245,196,.05));border:1px solid rgba(57,211,255,.28);border-radius:24px;padding:30px 34px}
.wm-band-ic{display:inline-flex;align-items:center;justify-content:center;width:58px;height:58px;border-radius:16px;background:rgba(57,211,255,.16);color:var(--em2);flex-shrink:0}
.wm-band-copy{flex:1}
.wm-band-copy h2{font-family:"Bricolage Grotesque";font-size:clamp(22px,3vw,30px);letter-spacing:-.02em}
.wm-band-copy h2 span{color:var(--em2)}
.wm-band-copy p{color:var(--mut);font-size:15.5px;margin-top:8px;max-width:72ch}

/* BEST MODEL PLANS band - an Option C card (violet tone = intelligence) holding a
   two-column "mechanism" layout: the claim on the left, a quiet mono plan/watch
   receipt on the right. Light only, like every WorkCard. */
.wm-best{padding:38px 0 0}
.wm-best-in{display:grid;grid-template-columns:1.12fr .88fr;gap:32px;align-items:center}
.wm-best-copy{display:flex;flex-direction:column;gap:12px;min-width:0}
.wm-best-copy .wm-eyebrow{margin-bottom:0;color:var(--wc-ink)}
.wm-best-copy .wm-eyebrow svg{color:var(--wc-ink)}
.wm-best-copy .wm-best-h{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(24px,3vw,34px);letter-spacing:-.025em;line-height:1.08;margin:0;max-width:22ch;color:var(--ink-brand,#062a22)}   /* two classes: outranks .wm h2 */
.wm-best-p{color:var(--wc-mut);font-size:15.5px;line-height:1.6;max-width:62ch;margin:0}
.wm-best-h .wm-best-ai{color:#6d4bd8;background:linear-gradient(transparent 60%, rgba(109,75,216,.18) 0);padding:0 .06em;border-radius:2px}
.wm-best-copy .wc-link{margin-top:6px;color:var(--wc-ink)}   /* beats .wm a{color:inherit} */
.wm-best-receipt{display:flex;flex-direction:column;gap:8px;min-width:0}
.wm-best-row{display:grid;grid-template-columns:58px minmax(0,1fr);align-items:center;gap:12px;background:#fff;border:1px solid var(--wc-line);border-radius:12px;padding:12px 14px;
  font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;color:var(--wc-mut);line-height:1.4;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.wm-best-row .k{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--wc-ink)}
.wm-best-row.watch .k{color:#0a7fa8}
.wm-best-row .v b{color:var(--wc-tx);font-weight:600}
.wm-best-row.plan{border-color:rgba(109,75,216,.28)}
.wm-best-row.watch{border-color:rgba(10,147,196,.28)}
/* the "watch" lane breathes: three dots pulse in sequence (CSS only) */
.wm-best-dots{display:inline-flex;gap:3px;margin-left:6px;vertical-align:middle}
.wm-best-dots i{width:5px;height:5px;border-radius:50%;background:#0a93c4;opacity:.3;animation:wm-best-pulse 1.4s ease-in-out infinite}
.wm-best-dots i:nth-child(2){animation-delay:.2s}.wm-best-dots i:nth-child(3){animation-delay:.4s}
@keyframes wm-best-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}
@media(max-width:900px){.wm-best{padding-top:30px}.wm-best-in{grid-template-columns:1fr;gap:20px}}
@media(prefers-reduced-motion:reduce){.wm-best-dots i{animation:none;opacity:.7}}

/* SECTIONS */
.wm-sec{padding:58px 0}
/* Alignment rule: everything from the top of the page through the best-model
   band stays LEFT (hero h1/.wm-lead, .wm-best-h/.wm-best-p). Every section
   below the band centers its header stack - eyebrow, h2, sub - the way the
   final CTA already does. .wm-h2/.wm-sub only appear below the band, so the
   centering lives here at class level; card interiors are untouched (they do
   not inherit from these rules). The scoped .wm-sec .wm-eyebrow rule leaves
   the band's own eyebrow left-aligned. */
.wm-h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(28px,4.2vw,44px);letter-spacing:-.025em;line-height:1.06;max-width:20ch;margin:0 auto 14px;text-align:center}
.wm-sub{color:var(--mut);font-size:18px;max-width:58ch;margin:0 auto 42px;text-align:center}
/* The page resets .wm h2 / .wm p to margin:0 at specificity (0,1,1), which
   outranks the single-class rules above, so the auto side margins that center
   the capped-width block need the .wm scope to win. Only the horizontal
   margins are set here; the vertical rhythm stays exactly as it renders. */
.wm .wm-h2,.wm .wm-sub{margin-left:auto;margin-right:auto}
/* Same specificity clash for the shared WorkCard title: the .wm h3 reset
   (0,1,1) outranks .wc-title (0,1,0), so in the opt-in dark theme every card
   title went light-on-white. Cards are always a white surface, so the title
   must always take the card's own ink, whatever the page theme. */
.wm .wc-title{color:var(--wc-title)}
.wm-sec .wm-eyebrow{display:flex;width:fit-content;max-width:100%;margin-left:auto;margin-right:auto;text-align:center}

/* PILLARS - spotlight */
.wm-pillars{border-top:1px solid var(--line);background:linear-gradient(180deg,rgba(140,245,196,.025),transparent)}
.wm-spot{display:grid;grid-template-columns:.92fr 1.08fr;gap:34px;align-items:stretch}
.wm-spot-list{display:flex;flex-direction:column}
.wm-spot-item{position:relative;display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:14px;background:none;border:none;border-top:1px solid var(--line);padding:16px 2px;cursor:pointer;text-align:left;font:inherit;color:var(--mut);transition:color .2s,padding .25s}
.wm-spot-item:last-child{border-bottom:1px solid var(--line)}
.wm-spot-item.on{color:var(--tx);padding-left:12px}
.wm-spot-ix{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--mut);transition:color .2s}
.wm-spot-item.on .wm-spot-ix{color:var(--em)}
.wm-spot-word{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(22px,2.4vw,30px);letter-spacing:-.02em;line-height:1.1;transition:transform .25s}
.wm-spot-item.on .wm-spot-word{background:linear-gradient(120deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent}
.wm-spot-desc{display:none}
.wm-spot-prog{grid-column:2;display:block;height:2px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:10px;overflow:hidden}
.wm-spot-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--em),var(--em2));animation:wmprog 3s linear forwards}
.wm-spot-prog.paused i{animation-play-state:paused}
@keyframes wmprog{to{width:100%}}
.wm-spot-stage{position:relative;border:1px solid var(--line);border-radius:24px;overflow:hidden;background:linear-gradient(150deg,rgba(57,211,255,.08),rgba(140,245,196,.04) 45%,transparent);min-height:340px;display:flex}
.wm-spot-card{position:relative;padding:28px 34px;display:flex;flex-direction:column;justify-content:space-between;width:100%;min-height:360px;animation:wmspot .5s cubic-bezier(.2,.7,.2,1)}
.wm-spot-viz{flex:1;display:flex;align-items:center;justify-content:center;padding:14px 0 18px;min-height:150px}
@keyframes wmspot{from{opacity:0;transform:translateY(16px)}}
.wm-spot-ghost{position:absolute;top:-30px;right:-30px;color:var(--em);opacity:.07;pointer-events:none}
.wm-spot-no{font-family:"JetBrains Mono",monospace;font-size:13px;color:var(--em2)}
.wm-spot-bigic{display:inline-flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,rgba(140,245,196,.22),rgba(57,211,255,.14));color:var(--em);box-shadow:0 0 30px -8px rgba(140,245,196,.6);margin-bottom:14px}
/* per-pillar stage graphics */
.pv{position:relative;width:100%;display:flex;align-items:center;justify-content:center;gap:10px}
.pv-bars{align-items:flex-end;height:120px;gap:12px}
.pv-bars i{width:30px;border-radius:7px 7px 0 0;background:linear-gradient(180deg,var(--em),rgba(57,211,255,.5))}
.pv-bars .pv-cap{position:absolute;bottom:-22px;font-size:11px;color:var(--mut)}
.pv-acc{flex-direction:column;gap:12px}
.pv-win{width:200px;background:#0c0e16;border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.pv-bar{height:7px;width:100%;background:#2b3345;border-radius:4px}.pv-bar.w60{width:60%}
.pv-btn{position:relative;margin-top:4px;font-size:12px;color:#042;font-weight:700;background:linear-gradient(135deg,var(--em),var(--em2));border-radius:7px;padding:6px 12px}
.pv-ring2{position:absolute;inset:-7px;border:2px solid var(--em2);border-radius:11px;animation:pvpulse 1.6s infinite}
@keyframes pvpulse{0%{box-shadow:0 0 0 0 rgba(57,211,255,.5)}70%{box-shadow:0 0 0 8px rgba(57,211,255,0)}100%{box-shadow:0 0 0 0 rgba(57,211,255,0)}}
.pv-acc .pv-cap{font-size:11px;color:var(--em2)}
.pv-fast{flex-direction:column;gap:12px;width:220px}
.pv-track{width:100%;height:12px;border-radius:7px;background:#2b3345;overflow:hidden}
.pv-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--em),var(--em2));animation:pvfill 1.4s cubic-bezier(.2,.9,.2,1) infinite}
@keyframes pvfill{0%{width:0}60%{width:100%}100%{width:100%}}
.pv-ms{font-family:"JetBrains Mono",monospace;font-size:20px;color:var(--em)}
.pv-multi .pv-src{width:42px;height:42px;border-radius:11px;background:#12141d;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--mut)}
.pv-multi .pv-join{color:var(--mut);font-size:18px}
.pv-multi .pv-hub{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(140,245,196,.25),rgba(57,211,255,.15));color:var(--em);display:flex;align-items:center;justify-content:center;box-shadow:0 0 26px -6px rgba(140,245,196,.6)}
.pv-brain{height:120px}
.pv-brain .pv-n{position:absolute;width:16px;height:16px;border-radius:50%;background:var(--em);box-shadow:0 0 14px var(--em)}
.pv-brain .pv-n.a{left:20%;top:50%}.pv-brain .pv-n.b{right:22%;top:26%;background:var(--em2);box-shadow:0 0 14px var(--em2)}.pv-brain .pv-n.c{right:22%;bottom:26%;background:var(--em2);box-shadow:0 0 14px var(--em2)}
.pv-brain .pv-ln{position:absolute;height:2px;background:linear-gradient(90deg,var(--em),var(--em2));transform-origin:left}
.pv-brain .pv-ln.l1{left:calc(20% + 8px);top:48%;width:46%;transform:rotate(-20deg)}
.pv-brain .pv-ln.l2{left:calc(20% + 8px);top:52%;width:46%;transform:rotate(20deg)}
.pv-res{flex-direction:column;gap:10px;width:230px}
.pv-search{display:flex;align-items:center;gap:7px;background:#0c0e16;border:1px solid var(--line);border-radius:9px;padding:9px 12px;font-size:13px;color:var(--tx)}
.pv-search svg{color:var(--em2)}
.pv-rchips{display:flex;gap:8px}
.pv-rchips span{font-size:11px;color:var(--em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:3px 9px;display:inline-flex;align-items:center;gap:4px}
.pv-goal{height:130px;color:var(--em)}
.pv-goal .pv-ring{position:absolute;border-radius:50%;border:2px solid rgba(140,245,196,.35)}
.pv-goal .pv-ring.g1{width:60px;height:60px}.pv-goal .pv-ring.g2{width:100px;height:100px;opacity:.6}.pv-goal .pv-ring.g3{width:140px;height:140px;opacity:.3}
.pv-doc2 .pv-page{width:150px;background:#0c0e16;border:1px solid var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:9px;position:relative}
.pv-doc2 .pv-page span{height:6px;border-radius:3px;background:#2b3345}
.pv-doc2 .pv-page .w90{width:90%}.pv-doc2 .pv-page .w70{width:70%}.pv-doc2 .pv-page .w50{width:50%}.pv-doc2 .pv-page .w80{width:80%}
.pv-doc2 .pv-page b{position:absolute;right:-8px;bottom:-8px;font-size:10px;color:var(--em);background:#12141d;border:1px solid rgba(140,245,196,.35);border-radius:6px;padding:3px 8px}
/* Safe & private flagship viz: on-device redaction */
.pv-safe{flex-direction:column;gap:16px}
.pv-safe .pv-shield{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(140,245,196,.24),rgba(57,211,255,.15));color:var(--em);box-shadow:0 0 34px -6px rgba(140,245,196,.6)}
.pv-safe .pv-redact{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:240px}
.pv-safe .chip{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;font-weight:700;color:var(--em);border:1px solid rgba(140,245,196,.4);background:rgba(140,245,196,.1);border-radius:7px;padding:4px 10px;animation:wm-demo-fade .4s ease-out both}
.pv-safe .chip:nth-child(2){animation-delay:.06s}.pv-safe .chip:nth-child(3){animation-delay:.12s}.pv-safe .chip:nth-child(4){animation-delay:.18s}.pv-safe .chip:nth-child(5){animation-delay:.24s}.pv-safe .chip:nth-child(6){animation-delay:.3s}
.pv-safe .pv-cap{font-size:11px;color:var(--em2);text-align:center}
.wm-spot-card h3{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(30px,4vw,44px);letter-spacing:-.02em;margin:0 0 10px}
.wm-spot-card p{color:var(--mut);font-size:18px;max-width:40ch;margin:0}

/* 8 cards in two even rows of four - a clean 4x2 block, no half-empty row. */
.wm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
@media(max-width:1080px){.wm-benefits{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.wm-benefits{grid-template-columns:1fr}}
.wm-bcard{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.012));border:1px solid var(--line);border-radius:18px;padding:26px;transition:transform .15s ease-out,border-color .2s;transform-style:preserve-3d;position:relative;overflow:hidden}
.wm-bcard:hover{border-color:rgba(140,245,196,.4)}
.wm-bcard:after{content:"";position:absolute;inset:0;border-radius:18px;padding:1px;background:linear-gradient(130deg,rgba(140,245,196,.5),transparent 40%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .25s}
.wm-bcard:hover:after{opacity:1}
.wm-bicon{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,rgba(140,245,196,.18),rgba(57,211,255,.12));color:var(--em);margin-bottom:16px;box-shadow:0 0 22px -6px rgba(140,245,196,.5)}
.wm-bicon.alt{background:linear-gradient(135deg,rgba(57,211,255,.2),rgba(140,245,196,.1));color:var(--em2)}
.wm-bhead{display:flex;align-items:center;gap:10px;margin:16px 0 8px}
.wm-bicon.sm{width:30px;height:30px;border-radius:9px;margin:0;box-shadow:none}
.wm-bcard h3{font-family:"Bricolage Grotesque";font-size:18px;margin:0}
.wm-bcard p{color:var(--mut);font-size:15px;margin:0}
/* mini graphics */
.bv{height:58px;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;position:relative;overflow:hidden}
.bv-steps .bvs{width:11px;height:11px;border-radius:50%;background:#2b3345;flex-shrink:0}
.bv-steps .bvs.done{background:var(--em)}
.bv-steps .bvs.now{background:var(--em2);box-shadow:0 0 0 4px rgba(57,211,255,.18)}
.bv-steps .bvl{width:34px;height:2px;background:var(--em);opacity:.6}
.bv-steps .bvl.dim{background:#2b3345;opacity:1}
.bv-steps .bv-cap{position:absolute;right:10px;font-size:10px;color:var(--mut)}
.bv-cmd{justify-content:space-between;font-family:"JetBrains Mono",monospace}
.bv-cmd code{color:#d6e9d6;font-size:12.5px}.bv-cmd code b{color:#5c7}
.bv-tick{display:inline-flex;align-items:center;gap:4px;font-family:"Figtree";font-size:11px;color:var(--em)}
.bv-flow span{font-size:12.5px;color:var(--mut);border:1px solid var(--line);border-radius:7px;padding:4px 9px}
.bv-flow span.on{color:#042;background:linear-gradient(135deg,var(--em),var(--em2));border:none;font-weight:700}
.bv-flow i{color:var(--mut);font-style:normal}
.bv-fix span{font-family:"JetBrains Mono",monospace;font-size:12px;padding:4px 8px;border-radius:7px}
.bv-fix .bad{color:#ff8a8a;background:rgba(255,80,80,.1);text-decoration:line-through}
.bv-fix .good{color:var(--em);background:rgba(140,245,196,.1);display:inline-flex;align-items:center;gap:4px}
.bv-fix i{color:var(--mut);font-style:normal}
.bv-cur{gap:10px}
.bv-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--em)}
.bv-pulse{width:8px;height:8px;border-radius:50%;background:var(--em);box-shadow:0 0 0 0 rgba(140,245,196,.6);animation:bvpulse 1.6s infinite}
@keyframes bvpulse{70%{box-shadow:0 0 0 8px rgba(140,245,196,0)}100%{box-shadow:0 0 0 0 rgba(140,245,196,0)}}
.bv-cur-t{font-size:12px;color:var(--mut)}
.bv-doc{justify-content:flex-start;flex-direction:column;align-items:flex-start;gap:5px;padding:10px 12px}
.bv-doc .bv-dl{height:5px;border-radius:3px;background:#2b3345}
.bv-dl.w90{width:90%}.bv-dl.w60{width:60%}.bv-dl.w45{width:45%}
.bv-doc .bv-pdf{position:absolute;right:10px;bottom:10px;font-size:10px;font-weight:700;color:var(--em);border:1px solid rgba(140,245,196,.35);border-radius:6px;padding:2px 7px}
/* spotlight claim + points */
.wm-spot-claim{font-family:"Bricolage Grotesque";font-weight:700;font-size:clamp(17px,2vw,22px);letter-spacing:-.01em;color:var(--em);margin:4px 0 14px;max-width:26ch}
.wm-spot-points{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px}
.wm-spot-points li{display:flex;gap:9px;align-items:flex-start;color:var(--tx);font-size:15px}
.wm-spot-points li svg{color:var(--em);flex-shrink:0;margin-top:3px}

/* HOW */
.wm-how{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(57,211,255,.03),transparent)}
.wm-flow{display:flex;align-items:stretch;justify-content:space-between}
.wm-flow-node{flex:1;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01));border:1px solid var(--line);border-radius:18px;padding:22px}
.wm-flow-viz{height:92px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.25);margin-bottom:16px;padding:0 12px}
.wm-flow-head{display:flex;align-items:baseline;gap:10px;margin-bottom:5px}
.wm-flow-n{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;background:linear-gradient(135deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent}
.wm-flow-node h3{font-family:"Bricolage Grotesque";font-size:19px}
.wm-flow-node p{color:var(--mut);font-size:14.5px;margin-top:4px}
.wm-flow-arrow{display:flex;align-items:center;color:var(--em);padding:0 12px;flex-shrink:0}
.fv{width:100%;display:flex;align-items:center;justify-content:center;gap:8px}
.fv-goal{background:#0b0c12;border:1px solid var(--line);border-radius:9px;padding:10px 12px;justify-content:flex-start}
.fv-goal .fv-k{font-size:9px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-right:8px}
.fv-goal .fv-type{color:var(--tx);font-size:13px}
.fv-caret{width:2px;height:14px;background:var(--em);margin-left:1px;animation:wmblink 1s step-end infinite}
.fv-guide{flex-direction:column;gap:9px}
.fv-now{width:100%;border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.06);border-radius:9px;padding:8px 10px}
.fv-lbl{display:block;font-size:8.5px;letter-spacing:.14em;color:var(--em);font-weight:700;margin-bottom:2px}
.fv-step{font-size:12.5px;font-weight:600;color:var(--tx)}
.fv-dots{display:flex;gap:7px}
.fv-dots i{width:9px;height:9px;border-radius:50%;background:#2b3345}
.fv-dots i.done{background:var(--em)}.fv-dots i.now{background:var(--em2);box-shadow:0 0 0 3px rgba(57,211,255,.2)}
.fv-doc{position:relative;width:120px;background:#0b0c12;border:1px solid var(--line);border-radius:9px;padding:12px;display:flex;flex-direction:column;gap:7px}
.fv-doc .l{height:5px;border-radius:3px;background:#2b3345}
.fv-doc .l.w90{width:90%}.fv-doc .l.w70{width:70%}.fv-doc .l.w50{width:50%}
.fv-check{position:absolute;right:-7px;top:-7px;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--em),var(--em2));color:#042;display:flex;align-items:center;justify-content:center}
.fv-doc b{position:absolute;right:-8px;bottom:-8px;font-size:9px;color:var(--em);background:#12141d;border:1px solid rgba(140,245,196,.35);border-radius:5px;padding:2px 6px}

/* WAYS */
.wm-ways-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.wm-way{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.012));border:1px solid var(--line);border-radius:18px;padding:26px;transition:transform .15s ease-out,border-color .2s;overflow:hidden}
.wm-way.feat{border-color:rgba(57,211,255,.45);background:linear-gradient(180deg,rgba(57,211,255,.08),rgba(255,255,255,.01));box-shadow:0 30px 70px -40px rgba(57,211,255,.5)}
.wm-feat-ribbon{position:absolute;top:14px;right:14px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#042;background:linear-gradient(135deg,var(--em),var(--em2));border-radius:999px;padding:4px 10px}
.wm-way h3{font-family:"Bricolage Grotesque";font-size:20px;margin:0 0 8px}
.wm-way p{color:var(--mut);font-size:15px;margin:0}

/* CARDS */
.wm-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.wm-ucard{border:1px solid var(--line);border-radius:18px;padding:22px;background:var(--panel);position:relative;overflow:hidden;transition:transform .15s ease-out}
.wm-ucard:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;opacity:.95}
.wm-ucard.t-a:before{background:linear-gradient(90deg,var(--em2),transparent)}
.wm-ucard.t-b:before{background:linear-gradient(90deg,var(--em),transparent)}
.wm-ucard.t-c:before{background:linear-gradient(90deg,var(--warm),transparent)}
.wm-ucard.t-d:before{background:linear-gradient(90deg,#b98cff,transparent)}
.wm-ucard.t-e:before{background:linear-gradient(90deg,#ff7a9c,transparent)}
.wm-ucard svg{color:var(--mut);margin-bottom:14px}
.wm-ucard h3{font-family:"Bricolage Grotesque";font-size:17px;margin:0 0 6px}
.wm-ucard p{color:var(--mut);font-size:14px;margin:0 0 16px}
.wm-ucard-go{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--em)}

/* PEOPLE / OUTCOMES */
.wm-people-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px}
.wm-photo{position:relative;margin:0;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:var(--panel);box-shadow:0 40px 80px -46px rgba(0,0,0,.8);aspect-ratio:4/3}
.wm-photo img,.wm-photo video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.03) contrast(1.02);transition:transform .6s ease-out}
.wm-photo:hover img,.wm-photo:hover video{transform:scale(1.04)}
.wm-photo figcaption{position:absolute;inset:auto 0 0 0;padding:26px 24px 22px;display:flex;flex-direction:column;gap:7px;background:linear-gradient(0deg,rgba(7,8,16,.94) 6%,rgba(7,8,16,.6) 52%,transparent)}
.wm-photo-tag{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:20px;letter-spacing:-.01em;color:#fff}
.wm-photo-cap{font-size:14.5px;color:#d6dae8;line-height:1.5;max-width:48ch}

/* PRICING */
.wm-pricing{border-top:1px solid var(--line)}
/* Monthly / Annual toggle */
.wm-cyc{display:flex;width:fit-content;max-width:100%;gap:4px;margin:4px auto 26px;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--panel)}
.wm-cyc-b{display:inline-flex;align-items:center;gap:8px;border:none;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:14px;padding:9px 18px;border-radius:999px;cursor:pointer;transition:color .15s,background .15s}
.wm-cyc-b.on{color:var(--tx);background:linear-gradient(135deg,rgba(140,245,196,.16),rgba(57,211,255,.14))}
.wm-cyc-save{font-size:11px;font-weight:800;letter-spacing:.02em;color:#06603f;background:rgba(10,157,102,.16);border-radius:999px;padding:2px 8px}
/* 3 plans + Enterprise = a 4-up pricing row */
.wm-tiers{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:stretch}
@media(max-width:1080px){.wm-tiers{grid-template-columns:repeat(2,1fr)}}
.wm-tier-cyc{font-size:12.5px;color:var(--mut);margin-top:4px;min-height:1.2em}
.wm-tier-cyc.dim{opacity:.75}
.wm-tier-cyc s{color:var(--mut);opacity:.8;margin-right:5px}
.wm-tier-custom{font-size:34px}
.wm-tier-ent{border-color:rgba(57,211,255,.35);background:linear-gradient(180deg,rgba(57,211,255,.08),rgba(255,255,255,.008))}
.wm-tier-ent .wm-tier-hrs{color:var(--em2)}
.wm-tier{border:1px solid var(--line);border-radius:22px;padding:28px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.008));position:relative;display:flex;flex-direction:column}
.wm-tier.pop{border-color:rgba(140,245,196,.5);background:linear-gradient(180deg,rgba(140,245,196,.1),rgba(255,255,255,.01));box-shadow:0 40px 80px -40px rgba(140,245,196,.55)}
.wm-tier-tag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--em),var(--em2));color:#042;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px}
.wm-tier-name{font-family:"Bricolage Grotesque";font-weight:800;font-size:21px}
.wm-tier-price{font-family:"Bricolage Grotesque";font-weight:800;font-size:48px;letter-spacing:-.03em;margin:4px 0 0}
.wm-tier-price span{font-size:17px;color:var(--mut);font-weight:400}
.wm-tier-hrs{color:var(--em);font-size:14px;margin-bottom:8px}
.wm-tier-mins{color:var(--mut);font-size:12px;line-height:1.5;margin-bottom:20px}
.wm-tier ul{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:11px;flex:1 0 auto}
.wm-tier li{display:flex;gap:9px;align-items:flex-start;color:var(--tx);font-size:14.5px}
.wm-tier li svg{color:var(--em);flex-shrink:0;margin-top:3px}
.wm-tier .wm-cta{width:100%;justify-content:center}
.wm-tier-topup{text-align:center;color:var(--mut);font-size:12.5px;margin-top:12px}
.wm-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:14px 28px;margin-top:26px}
.wm-trust span{display:inline-flex;align-items:center;gap:8px;color:var(--mut);font-size:13.5px;font-weight:500}
.wm-trust span svg{color:var(--em);flex-shrink:0}
/* .wm .wm-fineprint (0,2,0) so the auto side-margins win over .wm p{margin:0}
   (0,1,1) and the block actually centers, not just its text. */
.wm .wm-fineprint{text-align:center;color:var(--mut);font-size:14px;margin:32px auto 0;max-width:62ch}

/* "See the full ..." link row under the fields teaser and the pricing cards */
.wm-fld-more{display:flex;justify-content:center;margin-top:26px}

/* uniform dark "message box" on top of every icon card */
.wm-cardbox{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;min-height:58px;border-radius:12px;background:#141924;border:1px solid rgba(255,255,255,.08);margin-bottom:16px;padding:10px 14px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;color:#aeb9cc;text-align:center;line-height:1.4}
.wm-cardbox b{color:#8cf5c4;font-weight:700}
.wm-cardbox .cb-chip{font-weight:700;color:#8cf5c4;border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.1);border-radius:6px;padding:3px 8px;font-size:10.5px}
.wm-cardbox .cb-arrow{color:#5bd0ff;font-weight:700}
.wm-cardbox .cb-dim{color:#8894a8}
/* colored eyebrow kicker (kills grey, ties sections to brand) */
.wm-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wm-eyebrow svg{color:var(--em)}
/* SECURITY / ENTERPRISE BAND */
.wm-sec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:10px}
.wm-sec-paper{display:flex;flex-direction:column;align-items:center;gap:9px;margin-top:28px;text-align:center}
.wm-sec-paper span{color:var(--mut);font-size:14px;max-width:54ch}
.wm-sec-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px}
.wm-sec-ic{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,rgba(10,157,102,.16),rgba(10,134,207,.12));color:var(--em);margin-bottom:14px}
.wm-sec-card h3{font-family:"Bricolage Grotesque";font-size:18px;margin:0 0 8px}
.wm-sec-card p{color:var(--mut);font-size:14.5px;margin:0;line-height:1.55}
/* ENTERPRISE pricing anchor (premium dark block) */
.wm-ent{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:center;background:linear-gradient(135deg,#0f1626,#0b1f1a);border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:34px 38px;box-shadow:0 44px 86px -42px rgba(17,23,38,.5)}
.wm-ent-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8cf5c4;margin-bottom:10px}
.wm-ent h3{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(24px,3vw,32px);color:#fff;margin:0 0 10px;letter-spacing:-.02em}
.wm-ent-l p{color:#aeb9cc;font-size:15.5px;margin:0;max-width:46ch;line-height:1.6}
.wm-ent-r ul{list-style:none;padding:0;margin:0 0 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wm-ent-r li{display:flex;gap:8px;align-items:flex-start;color:#e7ecf5;font-size:14px}
.wm-ent-r li svg{color:#8cf5c4;flex-shrink:0;margin-top:2px}
/* HOW COMPANIES BENEFIT (ROI) */
.wm-roi-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin:6px 0 30px}
.wm-roi-stat{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px 20px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 16px 36px -26px rgba(17,23,38,.2)}
.wm-roi-stat b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(26px,3.2vw,36px);letter-spacing:-.02em;background:linear-gradient(120deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.02}
.wm-roi-stat span{display:block;margin-top:8px;color:var(--mut);font-size:13px;line-height:1.4}
.wm-roi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.wm-roi-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 18px 42px -26px rgba(17,23,38,.22);transition:border-color .2s,transform .15s}
.wm-roi-card:hover{border-color:rgba(10,157,102,.4);transform:translateY(-2px)}
.wm-roi-ic{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,rgba(10,157,102,.16),rgba(10,134,207,.12));color:var(--em);margin-bottom:14px}
.wm-roi-card h3{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin:0 0 8px}
.wm-roi-card p{color:var(--mut);font-size:14.5px;margin:0;line-height:1.55}
@media(max-width:900px){.wm-roi-stats{grid-template-columns:1fr 1fr}.wm-roi-grid{grid-template-columns:1fr}}
/* FIELDS WE COVER - 56 fields in 10 family cards. A compact 3-up stat row,
   then a dense 4-column grid where the two biggest families span two columns
   so the roster reads as one considered composition, not ten equal boxes.
   Cards are the shared WorkCard shell; the field pills use its --wc-* ink so
   they sit correctly on the white surface in both page themes. */
.wm-fields{border-top:1px solid var(--line)}
/* .wm-sub carries NO bottom margin (the page's .wm p reset wins), so the stat
   row owns the gap below the subhead, like .wm-roi-stats does in the ROI band. */
.wm-fld-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;max-width:640px;margin:26px auto 30px}
.wm-fld-stat{text-align:center;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 12px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 16px 36px -26px rgba(17,23,38,.2)}
.wm-fld-stat b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(28px,3.6vw,40px);letter-spacing:-.02em;background:linear-gradient(120deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.02}
.wm-fld-stat span{display:block;margin-top:6px;color:var(--mut);font-size:13px;line-height:1.35}
/* (the family card grid + tag styles moved with the grid to WorkFields.jsx) */
@media(max-width:560px){.wm-fld-stats{gap:10px;margin-bottom:22px}.wm-fld-stat{padding:14px 8px;border-radius:13px}.wm-fld-stat span{font-size:12px}}
@media(max-width:900px){.wm-sec-grid{grid-template-columns:1fr}.wm-ent{grid-template-columns:1fr;gap:20px}.wm-ent-r ul{grid-template-columns:1fr}}

/* FINAL */
.wm-final{padding:70px 0;text-align:center;border-top:1px solid var(--line);background:radial-gradient(60% 130% at 50% 0%,rgba(140,245,196,.09),transparent)}
.wm-final-in h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(32px,5vw,52px);letter-spacing:-.025em;margin:16px 0 14px}
.wm-final-in p{color:var(--mut);font-size:19px;margin:0 0 28px}
/* two-app download strip: shows visitors there is a Windows desktop app and an
   Android app. Routes to get-started (sign in to download). */
.wm-dl{margin-top:34px;display:flex;flex-direction:column;align-items:center;gap:12px}
.wm-dl-lbl{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.wm-dl-row{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.wm-dl-btn{display:inline-flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 18px;cursor:pointer;color:var(--tx);font:inherit;box-shadow:0 1px 2px rgba(17,23,38,.04),0 16px 36px -28px rgba(17,23,38,.3);transition:transform .15s,border-color .2s}
.wm-dl-btn:hover{transform:translateY(-2px);border-color:var(--em2)}
.wm-dl-btn > svg:first-child{color:var(--em2)}
.wm-dl-t{display:flex;flex-direction:column;align-items:flex-start;line-height:1.2}
.wm-dl-t b{font-size:15px;font-weight:700}
.wm-dl-t i{font-style:normal;font-size:12px;color:var(--mut)}
.wm-dl-btn > svg:last-child{color:var(--mut)}
.wm-dl-btn.soon{cursor:default;opacity:.72}
.wm-dl-btn.soon:hover{transform:none;border-color:var(--line)}
.wm-dl-soon{font-size:11px;font-weight:800;letter-spacing:.03em;color:var(--mut);background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}
.wm-dl-note{font-size:12.5px;color:var(--mut)}

/* DISCLAIMER + FOOT */
.wm-disclaimer-wrap{border-top:1px solid var(--line);background:rgba(255,255,255,.015);padding:20px 0}
.wm-disclaimer{display:flex;gap:9px;align-items:flex-start;color:var(--mut);font-size:13px;line-height:1.6;max-width:92ch;margin:0 auto}
.wm-disclaimer svg{color:var(--em);flex-shrink:0;margin-top:3px}.wm-disclaimer b{color:var(--tx)}
.wm-foot{border-top:1px solid var(--line);padding:26px 0}
.wm-foot-in{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.wm-foot-by{color:var(--mut);flex:1;font-size:13px}
.wm-foot-links{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.wm-foot-links .wm-link{font-size:13px}

@media(max-width:900px){
 /* (min-width:0 on the columns is now global, see .wm-hero-grid>* above.) */
 .wm-hero-grid{grid-template-columns:1fr;gap:38px}
 .wm-steps,.wm-ways-grid,.wm-tiers,.wm-people-grid{grid-template-columns:1fr}
 .wm-cards{grid-template-columns:1fr 1fr}
 .wm-flow{flex-direction:column}
 .wm-flow-arrow{transform:rotate(90deg);padding:12px 0;align-self:center}
 .wm-spot{grid-template-columns:1fr;gap:0}
 .wm-spot-stage{display:none}
 .wm-spot-item.on{padding-left:2px}
 .wm-spot-desc{display:block;grid-column:2;color:var(--mut);font-size:14.5px;margin-top:6px;line-height:1.5}
 .wm-spot-prog{display:none}
 .wm-links{display:none}
 .wm-tier.pop{transform:none}
 .wm-band-in{flex-direction:column;text-align:center;align-items:flex-start}
}
@media(max-width:560px){
 .wm-cards{grid-template-columns:1fr}
 .wm-nav-in{gap:10px}
 .wm-navcta{margin-left:auto}
 .wm-navcta .wm-ghost{display:none}
 .wm-navcta .wm-cta.sm{padding:9px 14px;font-size:13.5px}
 .wm-modes{flex-direction:column;align-items:flex-start;gap:13px}
 .wm-mode-div{display:none}
 .wm-sec{padding:42px 0}
 .wm-hero{padding:48px 0 0}
 .wm-lead-stage{font-size:17px}
 .wm-demo{transform:none}
}
@media(max-width:768px){
 /* Short and powerful on phones: hero, companies ROI, what it does, how it
    works, pricing and the final CTA. The heavier bands are hidden so the
    page stays tight on a small screen. */
 .wm-people,.wm-pillars,.wm-ways,#cards{display:none}
 .wm-hero-cta{flex-direction:column;align-items:stretch;gap:12px}
 .wm-hero-cta .wm-cta{width:100%;justify-content:center;padding:15px 18px;font-size:16px}
 .wm-sec{padding:36px 0}
}

/* ============================================================
   LIGHT THEME - the default. The original rules above remain the
   DARK theme, preserved and re-enabled by setting data-wm="dark"
   on the .wm root. Code/terminal/diff/screen mockups deliberately
   stay dark (they read as device screenshots on a light page).
   ============================================================ */
.wm:not([data-wm="dark"]){
  --ink:#f4f7fb; --panel:#ffffff; --line:#e2e7f0;
  --tx:#0c1222; --mut:#3f4a5c; --ink-brand:#062a22;
  --em:#0a9d66; --em2:#0a86cf;
  --warm:#ff9a4d; --warm2:#f26a43;
  background:
    radial-gradient(1000px 520px at 85% -8%, rgba(10,134,207,.16), transparent 60%),
    radial-gradient(820px 480px at -6% 4%, rgba(10,157,102,.14), transparent 58%),
    var(--ink);
}
.wm:not([data-wm="dark"]) .wm-grain{opacity:.03}
.wm:not([data-wm="dark"]) .orb{opacity:.30;filter:blur(68px)}
.wm:not([data-wm="dark"]) .o3{opacity:.18}
/* deep brand-green ink for display headings (ties to brand, not flat black) */
.wm:not([data-wm="dark"]) .wm-hero h1,
.wm:not([data-wm="dark"]) .wm-h2,
.wm:not([data-wm="dark"]) .wm-final-in h2,
.wm:not([data-wm="dark"]) .wm-band-copy h2{color:var(--ink-brand)}
/* lead/intro copy off the muted grey so the page is not grey-dominant */
.wm:not([data-wm="dark"]) .wm-lead{color:var(--tx);font-weight:450}
.wm:not([data-wm="dark"]) .wm-badge{color:#07784f;background:rgba(10,157,102,.1);border-color:rgba(10,157,102,.28)}

/* The product "screen" cards stay DARK on the light page - the contrast gives
   the page depth. Re-scope dark vars + set color so inner text/hairlines/accents
   render light-on-dark exactly as designed (the global light vars would otherwise
   make them dark-on-dark). */
.wm:not([data-wm="dark"]) .wm-demo,
.wm:not([data-wm="dark"]) .bv,
.wm:not([data-wm="dark"]) .wm-flow-viz,
.wm:not([data-wm="dark"]) .wm-spot-stage,
.wm:not([data-wm="dark"]) .wm-photo figcaption{
  --tx:#eef1f8; --mut:#9aa6ba; --line:rgba(255,255,255,.12);
  --panel:#141924; --em:#8cf5c4; --em2:#5bd0ff;
  color:var(--tx);
}
.wm:not([data-wm="dark"]) .wm-demo-step,
.wm:not([data-wm="dark"]) .wm-demo-now,
.wm:not([data-wm="dark"]) .wm-spot-card h3,
.wm:not([data-wm="dark"]) .wm-spot-card p,
.wm:not([data-wm="dark"]) .wm-spot-points li{color:var(--tx)}

/* nav */
.wm:not([data-wm="dark"]) .wm-nav{background:rgba(255,255,255,.82);box-shadow:0 1px 0 rgba(17,23,38,.05),0 12px 34px -26px rgba(17,23,38,.35)}
.wm:not([data-wm="dark"]) .wm-ghost{background:#fff}
.wm:not([data-wm="dark"]) .wm-ghost:hover{border-color:rgba(17,23,38,.28)}
.wm:not([data-wm="dark"]) .wm-cta.alt{background:#fff;border:1px solid var(--line);color:var(--tx)}

/* elevated white cards - real depth so the page never looks flat */
.wm:not([data-wm="dark"]) .wm-bcard,
.wm:not([data-wm="dark"]) .wm-way,
.wm:not([data-wm="dark"]) .wm-flow-node,
.wm:not([data-wm="dark"]) .wm-tier,
.wm:not([data-wm="dark"]) .wm-ucard{
  background:#fff;
  box-shadow:0 1px 2px rgba(17,23,38,.04), 0 18px 42px -26px rgba(17,23,38,.22);
}
.wm:not([data-wm="dark"]) .wm-bcard:hover,
.wm:not([data-wm="dark"]) .wm-way:hover,
.wm:not([data-wm="dark"]) .wm-ucard:hover{box-shadow:0 1px 2px rgba(17,23,38,.05), 0 28px 56px -26px rgba(17,23,38,.3)}
.wm:not([data-wm="dark"]) .wm-way.feat{background:linear-gradient(180deg,rgba(10,134,207,.07),#fff);border-color:rgba(10,134,207,.38)}
/* security + privacy duo: white, elevated, brand-tinted glow */
.wm:not([data-wm="dark"]) .wm-duo-card{background:#fff;box-shadow:0 1px 2px rgba(17,23,38,.04),0 18px 42px -26px rgba(17,23,38,.22)}
.wm:not([data-wm="dark"]) .wm-duo-card:hover{box-shadow:0 1px 2px rgba(17,23,38,.05),0 28px 56px -26px rgba(17,23,38,.3)}
.wm:not([data-wm="dark"]) .wm-duo-card.sec:hover{border-color:rgba(10,157,102,.45)}
.wm:not([data-wm="dark"]) .wm-duo-card.priv:hover{border-color:rgba(10,134,207,.45)}
.wm:not([data-wm="dark"]) .wm-duo-card.sec:after{background:radial-gradient(circle,rgba(10,157,102,.12),transparent 68%)}
.wm:not([data-wm="dark"]) .wm-duo-card.priv:after{background:radial-gradient(circle,rgba(10,134,207,.12),transparent 68%)}
.wm:not([data-wm="dark"]) .wm-duo-ic{background:linear-gradient(135deg,rgba(10,157,102,.16),rgba(10,134,207,.1));box-shadow:none}
.wm:not([data-wm="dark"]) .wm-duo-card.priv .wm-duo-ic{background:linear-gradient(135deg,rgba(10,134,207,.16),rgba(10,157,102,.08));box-shadow:none}
.wm:not([data-wm="dark"]) .wm-duo-card h3{color:var(--ink-brand)}
.wm:not([data-wm="dark"]) .wm-tier.pop{background:linear-gradient(180deg,rgba(10,157,102,.09),#fff);border-color:rgba(10,157,102,.45);box-shadow:0 32px 66px -30px rgba(10,157,102,.42)}

/* spotlight stage = premium dark card (matches the demo), with real elevation */
.wm:not([data-wm="dark"]) .wm-spot-stage{
  background:linear-gradient(165deg,#1a2030,#0f131d);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 40px 82px -40px rgba(17,23,38,.5);
}
.wm:not([data-wm="dark"]) .wm-spot-prog{background:rgba(17,23,38,.10)}
/* mini "screen" thumbnails -> solid dark so their content reads crisp (not faint on grey) */
.wm:not([data-wm="dark"]) .bv,
.wm:not([data-wm="dark"]) .wm-flow-viz{background:#141924;border-color:rgba(255,255,255,.08)}

/* subtle section atmosphere so bands read on the light page */
.wm:not([data-wm="dark"]) .wm-pillars{background:linear-gradient(180deg,rgba(10,157,102,.045),transparent)}
.wm:not([data-wm="dark"]) .wm-how{background:linear-gradient(180deg,rgba(10,134,207,.05),transparent)}
.wm:not([data-wm="dark"]) .wm-fields{background:linear-gradient(180deg,rgba(10,157,102,.045),transparent 55%)}
.wm:not([data-wm="dark"]) .wm-final{background:radial-gradient(60% 130% at 50% 0%,rgba(10,157,102,.1),transparent)}
.wm:not([data-wm="dark"]) .wm-band-in{background:linear-gradient(110deg,rgba(10,134,207,.08),rgba(10,157,102,.05));border-color:rgba(10,134,207,.22)}

.wm:not([data-wm="dark"]) .wm-disclaimer-wrap{background:#e9edf4}
.wm:not([data-wm="dark"]) .wm-photo{box-shadow:0 30px 64px -40px rgba(17,23,38,.5)}

`
