import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, TerminalSquare, Compass, ShieldCheck, Globe2, FileText,
  ArrowRight, Check, Camera, Sparkles, Layers, Monitor, Smartphone, AppWindow,
  Lock, Zap, Rocket, Gauge, Target, ScanEye, ListChecks, AlertTriangle,
} from 'lucide-react'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'
import { cleanAlways } from '../scrub.js'   // strip PII/PHI before the scenario leaves the browser (public form: always on)

// AdmireVeda WorkCoPilot - marketing landing (admireveda.com).
// Motion-rich, benefits-first. Never names a model, never mentions limits.
export default function WorkMarketing() {
  const nav = useNavigate()
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

  const go = (plan) => nav(`/workcopilot${plan ? `?plan=${plan}` : ''}`)
  const money = (n) => (n == null ? '-' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`)
  const tilt = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; e.currentTarget.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-4px)` }
  const untilt = (e) => { e.currentTarget.style.transform = '' }

  const benefits = [
    { icon: MonitorPlay, viz: 'steps', t: 'Guided, step by step', d: 'It watches your screen and tells you the exact next move, one step at a time, and checks each one really worked before moving on.' },
    { icon: TerminalSquare, viz: 'command', t: 'The exact how, every time', d: 'Not vague advice. The precise click, command or setting to use, spelled out and copy-ready. Always the best proven way, no shortcuts.' },
    { icon: Compass, viz: 'zero', t: 'Starts from zero', d: 'Opens the right page, signs you in, and walks you to the exact spot. Nothing assumed, nothing skipped.' },
    { icon: ShieldCheck, viz: 'fix', t: 'Catches and corrects mistakes', d: 'Spots a wrong turn the moment it happens, tells you why, and shows the exact fix before it costs you.' },
    { icon: Globe2, viz: 'current', t: 'Grounded in the best, and in your world', d: 'It checks the current best practice, and on Advanced and Premium grounds your steps in your own documents, flagging anything in them that is wrong.' },
    { icon: FileText, viz: 'record', t: 'A record you keep', d: 'Finish with a clean, picture-rich write-up of exactly what you did, ready to share or repeat.' },
  ]
  const steps = [
    { n: '01', viz: 'goal', t: 'Say the goal', d: 'Type or paste what you want to get done. Anything, any field.' },
    { n: '02', viz: 'guide', t: 'Get guided live', d: 'It reads your screen, guides the exact next move, checks it worked, and corrects you the moment something looks wrong.' },
    { n: '03', viz: 'keep', t: 'Finish & keep it', d: 'Done right, with a documented write-up you can come back to.' },
  ]
  const cards = [
    { id: 'config', k: 'Technical Setup & Config', d: 'Firewalls, IDS/IPS, cloud, DevOps, infrastructure.', tone: 'a' },
    { id: 'build', k: 'Build & Implement', d: 'Pipelines, integrations, end-to-end builds.', tone: 'b' },
    { id: 'ai', k: 'AI & Automation', d: 'Agents, RAG, enterprise AI, automated workflows.', tone: 'c' },
    { id: 'product', k: 'Product & Innovation', d: 'Prototype, build and ship a brand new idea.', tone: 'd' },
    { id: 'marketing', k: 'Marketing & Growth', d: 'Campaigns, analytics, launches, outreach.', tone: 'e' },
    { id: 'office', k: 'Accounting & Office', d: 'Reconciliations, reports, spreadsheets, filings.', tone: 'a' },
    { id: 'legal', k: 'Legal & Compliance', d: 'Reviews, forms, process, compliance checks.', tone: 'b' },
    { id: 'general', k: 'Anything else', d: 'If it is on a screen, you are guided through it.', tone: 'c' },
  ]
  const marquee = [
    'AWS', 'Invoices', 'Kubernetes', 'Payroll', 'RAG pipelines', 'Tax filing', 'Firewalls', 'Pitch decks',
    'Terraform', 'Grant applications', 'CI/CD', 'Budgets', 'Stripe', 'Procurement', 'Ansible', 'Onboarding',
    'Postgres', 'Insurance claims', 'n8n', 'Contracts', 'Grafana', 'Resumes', 'Docker', 'Expense reports',
    'SIEM', 'Fundraising', 'Salesforce', 'Email campaigns', 'Shopify', 'Board decks', 'Python & APIs', 'Inventory',
    'SSO / OAuth', 'Compliance', 'Nginx', 'Market research',
  ]
  const pillars = [
    { icon: Lock, t: 'Safe and private', flagship: true, claim: 'Your data never leaves your device unprotected.', d: 'Read-only by design, with on-device redaction for regulated teams.', points: ['PII, PHI, secrets and IPs stripped on-device before anything is sent', 'Never clicks, types or runs anything, and hidden on screen-share', 'A per-session audit log of exactly what was sent'] },
    { icon: Rocket, t: 'Powerful', claim: 'From a one-liner to a full enterprise build.', d: 'Whatever the task, it carries it end to end.', points: ['Simplest task to the most advanced', 'Any tool, any stack, any field', 'Nothing left half-done'] },
    { icon: Target, t: 'Accurate', claim: 'It only tells you what is really on your screen.', d: 'No guessing, no invented menus.', points: ['Never invents a button or setting', 'Catches a wrong value before you save', 'Says "I cannot see that" instead of guessing'] },
    { icon: Gauge, t: 'Fast', claim: 'The next step before you finish reading this.', d: 'It keeps pace with you, not the other way round.', points: ['Guidance in a blink', 'No waiting, no spinning', 'Moves the plan as you move'] },
    { icon: ScanEye, t: 'Multimodal', claim: 'Reads screens, cameras and documents.', d: 'It sees what you see, from any source.', points: ['Your screen, live', 'Your phone camera', 'Your own files for context'] },
    { icon: Sparkles, t: 'Intelligent', claim: 'Understands the goal, not just the words.', d: 'It reasons about what you are really doing.', points: ['Adapts as the screen changes', 'Thinks deeper on hard steps', 'Fixes the plan when reality differs'] },
    { icon: Globe2, t: 'Deep research', claim: 'Always up to date, never stale.', d: 'It checks the latest before it guides.', points: ['The current way, not last year\'s', 'Real official links and steps', 'Matches how tools work today'] },
    { icon: Compass, t: 'All around your goal', claim: 'Every step points at what you want.', d: 'It never loses the thread.', points: ['The goal is always in view', 'No busywork, no detours', 'Knows the moment you are done'] },
    { icon: ListChecks, t: 'Recorded & hand-held', claim: 'Walked through, and written down.', d: 'Guided live, and kept for later.', points: ['Guided every single step', 'A picture-rich report to keep', 'Repeat or share it anytime'] },
  ]
  const tiers = price ? [
    { id: 'basic', name: 'Basic', price: price.plans.basic, hrs: 2, feats: ['2 hours a day of live guidance', 'Step-by-step on any task', 'Exact commands, code & links', 'Roadmaps & diagrams', 'Floating guide + session write-up'], hour: price.hour.basic },
    { id: 'advanced', name: 'Advanced', price: price.plans.advanced, hrs: 4, popular: true, feats: ['4 hours a day of live guidance', 'Everything in Basic', 'Upload your own documents', 'Visual examples where they help', 'Priority guidance'], hour: price.hour.advanced },
    { id: 'premium', name: 'Premium', price: price.plans.premium, hrs: 6, feats: ['6 hours a day of live guidance', 'Everything in Advanced', 'Generated visuals on demand', 'Highest-fidelity guidance', 'First in line, always'], hour: price.hour.premium },
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
            <a href="#how">How it works</a><a href="#ways">Anywhere</a><a href="/workcopilot/use-cases">Use cases</a><a href="#pricing">Pricing</a>
          </nav>
          <div className="wm-navcta">
            <button className="wm-ghost" onClick={() => go('')}>Sign in</button>
            <button className="wm-cta sm" onClick={() => go('')}>Get started <ArrowRight size={15} /></button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="wm-hero" id="top">
        <div className="wm-wrap wm-hero-grid">
          <div className="wm-hero-copy">
            <div className="wm-badge" data-reveal><Sparkles size={13} /> Your expert, on every screen</div>
            <h1 data-reveal>Get <em>anything</em><br />done right,<br />the first time.</h1>
            <p className="wm-lead" data-reveal>
              It watches your screen and tells you the exact next move, step by step, until the job is done. Any task, any field.
            </p>
            <div className="wm-hero-cta" data-reveal>
              <button className="wm-cta" onClick={() => go('')}>Start guiding me <ArrowRight size={16} /></button>
              <a className="wm-link" href="#how">See how it works</a>
            </div>
          </div>
          <LiveDemo tilt={tilt} untilt={untilt} />
        </div>

        {/* marquee of fields */}
        <div className="wm-marquee" data-reveal>
          <div className="wm-marquee-row">
            {[...marquee, ...marquee].map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>
      </section>

      {/* SECURITY / ENTERPRISE BAND */}
      <section className="wm-sec wm-security" id="security">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><ShieldCheck size={14} /> Enterprise-ready &middot; security-first</div>
          <h2 className="wm-h2" data-reveal>Your data never leaves your device unprotected.</h2>
          <p className="wm-sub" data-reveal>Built for security, healthcare, finance and government teams. Turn on a redaction policy and sensitive data is stripped before anything is sent.</p>
          <div className="wm-sec-grid">
            <div className="wm-sec-card" data-reveal><span className="wm-sec-ic"><Lock size={18} /></span><h3>Stripped on-device</h3><p>With a redaction policy on, PII, PHI, secrets, passwords, IP addresses and private hosts are removed on your machine before anything reaches our server or the AI.</p></div>
            <div className="wm-sec-card" data-reveal><span className="wm-sec-ic"><ScanEye size={18} /></span><h3>Read-only by design</h3><p>It watches and guides. It never clicks, types or runs anything for you, and it hides itself from screen shares. You stay in control.</p></div>
            <div className="wm-sec-card" data-reveal><span className="wm-sec-ic"><FileText size={18} /></span><h3>Audited &amp; yours</h3><p>A downloadable per-session log shows exactly what was sent and when. Bring your own AI keys or a self-hosted model. Works on locked-down machines.</p></div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="wm-sec">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>Like having the best person in the room, every time.</h2>
          <div className="wm-benefits">
            {benefits.map((b, i) => (
              <div className="wm-bcard" data-reveal style={{ transitionDelay: `${i * 55}ms` }} key={b.t} onMouseMove={tilt} onMouseLeave={untilt}>
                <BViz k={b.viz} />
                <div className="wm-bhead"><span className="wm-bicon sm"><b.icon size={16} /></span><h3>{b.t}</h3></div>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PEOPLE / OUTCOMES - real human moments */}
      <section className="wm-sec wm-people">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>For the moment it actually matters.</h2>
          <p className="wm-sub" data-reveal>Real tasks, real pressure, and a clear next move the whole way through.</p>
          <div className="wm-people-grid">
            <figure className="wm-photo" data-reveal>
              <video src="/people-focus.mp4" poster="/people-focus.jpg" autoPlay muted loop playsInline aria-label="A person working at a laptop in warm light, finishing a task with a quiet smile" />
              <figcaption>
                <span className="wm-photo-tag">Set up the cloud, step by step</span>
                <span className="wm-photo-cap">First time in a new console. It opens the right page, names the exact setting, and flags a wrong turn before it costs you.</span>
              </figcaption>
            </figure>
            <figure className="wm-photo" data-reveal style={{ transitionDelay: '90ms' }}>
              <img src="/people-done.jpg" alt="A person smiling at a laptop in warm light while finishing their work" loading="lazy" width="1400" height="939" />
              <figcaption>
                <span className="wm-photo-tag">Unstuck in seconds</span>
                <span className="wm-photo-cap">Halfway through and lost. Snap a photo of the screen, get the precise next move, and finish while it still matters.</span>
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
              <span className="wm-bicon"><Monitor size={20} /></span><h3>Desktop app</h3>
              <p><b>Stealth on screen-share.</b> Invisible when you present or record. See-through and click-behind give you full control of your work underneath.</p>
            </div>
            <div className="wm-way feat" data-reveal style={{ transitionDelay: '70ms' }} onMouseMove={tilt} onMouseLeave={untilt}>
              <span className="wm-feat-ribbon"><Zap size={12} /> No install</span>
              <span className="wm-bicon alt"><AppWindow size={20} /></span><h3>Browser overlay</h3>
              <p>Nothing to install. Works on locked-down machines, restricted laptops and virtual desktops where you cannot add software.</p>
            </div>
            <div className="wm-way" data-reveal style={{ transitionDelay: '140ms' }} onMouseMove={tilt} onMouseLeave={untilt}>
              <span className="wm-bicon"><Smartphone size={20} /></span><h3>Mobile app</h3>
              <p><b>Snap a photo or live-watch.</b> Point your phone camera at a screen or a device, ask about what it sees, and get guided on the go.</p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="wm-sec" id="cards">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>One copilot for every kind of work.</h2>
          <p className="wm-sub" data-reveal>From an engineer to a CTO, a founder to a product lead, a marketer to a VP, an accountant to a finance head. Technical or not, pick a space and go.</p>
          <div className="wm-cards">
            {cards.map((c, i) => (
              <div className={`wm-ucard t-${c.tone}`} data-reveal style={{ transitionDelay: `${i * 45}ms`, cursor: 'pointer' }} key={c.k} onMouseMove={tilt} onMouseLeave={untilt} onClick={() => nav(`/workcopilot/use-cases#${c.id}`)}>
                <Layers size={18} /><h3>{c.k}</h3><p>{c.d}</p>
                <span className="wm-ucard-go">See in detail <ArrowRight size={14} /></span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }} data-reveal>
            <button className="wm-cta alt" onClick={() => nav('/workcopilot/use-cases')}>Explore every use case in detail <ArrowRight size={15} /></button>
          </div>
        </div>
      </section>

      {/* HOW COMPANIES BENEFIT - ROI */}
      <section className="wm-sec wm-roi" id="roi">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Rocket size={14} /> For companies &amp; teams</div>
          <h2 className="wm-h2" data-reveal>More gets done. With the team you already have.</h2>
          <p className="wm-sub" data-reveal>WorkCoPilot turns anyone into an expert on the task in front of them, applies the secure, proven way, and documents every step. Lean teams take on the <b>toughest projects</b>, cloud migrations, security hardening, pentests, full builds, and ship like specialists.</p>

          <div className="wm-roi-stats" data-reveal>
            <CountStat value={70} prefix="+" suffix="%" label="faster through stuck & pending work" />
            <CountStat value={50} prefix="-" suffix="%" label="outsourcing spend, quality kept" />
            <CountStat value={100} suffix="%" label="documented, every change & config" />
            <div className="wm-roi-stat"><b>Days&nbsp;&rarr;&nbsp;hrs</b><span>on work nobody had time for</span></div>
          </div>

          <div className="wm-roi-grid">
            <div className="wm-roi-card" data-reveal><span className="wm-roi-ic"><Layers size={18} /></span><h3>Take on the toughest projects</h3><p>No new hires, no long ramp. Your existing team or a lean consultant is guided to deliver specialist, complex work, infrastructure, cloud, security, builds, the first time, correctly, in-house.</p></div>
            <div className="wm-roi-card" data-reveal><span className="wm-roi-ic"><Zap size={18} /></span><h3>Clear the backlog</h3><p>The tasks that pile up because &ldquo;no one has time&rdquo; or &ldquo;only one person knows how&rdquo; finally get done, step by step, with each step verified, up to 70% faster.</p></div>
            <div className="wm-roi-card" data-reveal><span className="wm-roi-ic"><ShieldCheck size={18} /></span><h3>Secure &amp; best-practice by default</h3><p>It applies the current, proven way, hardened cloud setups, reviewed code, real pentest steps, correct configurations, and catches mistakes before they cost you. No shortcuts, no guesswork.</p></div>
            <div className="wm-roi-card" data-reveal><span className="wm-roi-ic"><FileText size={18} /></span><h3>Everything documented</h3><p>Every implementation, code change, configuration, pentest and cloud setup ends with a clean, shareable write-up, and a per-session audit log. Audit-ready, knowledge that stays in the company.</p></div>
            <div className="wm-roi-card" data-reveal><span className="wm-roi-ic"><Gauge size={18} /></span><h3>Cut outsourcing, keep control</h3><p>Bring work back in-house. Reduce external spend by up to half while raising consistency, and keep the context, data and institutional knowledge on your side.</p></div>
            <div className="wm-roi-card" data-reveal><span className="wm-roi-ic"><Lock size={18} /></span><h3>Safe for regulated work</h3><p>On-device redaction of PII, PHI, secrets and IPs plus read-only guidance means even sensitive, compliance-bound work can be done in-house, safely.</p></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="wm-sec wm-pricing" id="pricing">
        <div className="wm-wrap">
          <h2 className="wm-h2" data-reveal>Simple plans. Real guided time.</h2>
          <p className="wm-sub" data-reveal>Hours of live guidance every day. Pause anytime, and come back right where you left off.</p>
          <div className="wm-tiers">
            {tiers.map((t) => (
              <div className={`wm-tier${t.popular ? ' pop' : ''}`} data-reveal key={t.id}>
                {t.popular && <div className="wm-tier-tag">Most popular</div>}
                <div className="wm-tier-name">{t.name}</div>
                <div className="wm-tier-price">{money(t.price)}<span>/mo</span></div>
                <div className="wm-tier-hrs">{t.hrs} hours a day</div>
                <ul>{t.feats.map((f) => <li key={f}><Check size={15} /> {f}</li>)}</ul>
                <button className={`wm-cta ${t.popular ? '' : 'alt'}`} onClick={() => go(t.id)}>Choose {t.name}</button>
                <div className="wm-tier-topup">Extra hour {money(t.hour)}</div>
              </div>
            ))}
          </div>
          {/* Enterprise - a strong colored anchor, no public price */}
          <div className="wm-ent" data-reveal>
            <div className="wm-ent-l">
              <div className="wm-ent-eyebrow"><ShieldCheck size={14} /> Enterprise</div>
              <h3>Built for regulated teams.</h3>
              <p>On-device PII/PHI redaction policies, your own AI keys or a self-hosted model, SSO, and a signed DPA. For security, healthcare, finance and government teams.</p>
            </div>
            <div className="wm-ent-r">
              <ul>
                <li><Check size={15} /> Everything in Premium</li>
                <li><Check size={15} /> SSO / SAML & team provisioning</li>
                <li><Check size={15} /> Bring your own AI keys or self-hosted model</li>
                <li><Check size={15} /> On-device PII / PHI / secret redaction policy controls</li>
                <li><Check size={15} /> Custom data-retention, on-prem option</li>
                <li><Check size={15} /> DPA, security review & priority SLA</li>
              </ul>
              <a className="wm-cta" href="mailto:sales@admireveda.com?subject=WorkCoPilot%20Enterprise">Contact sales <ArrowRight size={16} /></a>
            </div>
          </div>
          {price && <p className="wm-fineprint" data-reveal>Need more? Top up extra hours anytime. Premium adds generated visuals, and image packs start from {money(price.image.premium)} each (min {price.imageMinBulk}). Purchased time never expires.</p>}
        </div>
      </section>

      {/* FINAL */}
      <section className="wm-final">
        <div className="wm-wrap wm-final-in" data-reveal>
          <AVMark size={46} />
          <h2>Stop guessing. Start being guided.</h2>
          <p>Bring any task. WorkCoPilot takes it from the very first step to done.</p>
          <button className="wm-cta big" onClick={() => go('')}>Get started <ArrowRight size={18} /></button>
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
          <span className="wm-foot-by">&copy; {new Date().getFullYear()} AdmireVeda &middot; WorkCoPilot is a product of AdmireVeda</span>
          <button className="wm-link" onClick={() => go('')}>Sign in</button>
        </div>
      </footer>

      <CoverageChat go={go} />
    </div>
  )
}

// Floating "is my scenario covered?" assistant. Scoped by design: it only tells
// a visitor whether WorkCoPilot can guide their task, how it is covered, and
// which plan fits. The server (POST /api/work/coverage) enforces the guardrail -
// anything that is not a coverage question comes back as "offtopic".
function CoverageChat({ go }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const [fire, setFire] = useState(false)
  const taRef = useRef(null)
  useEffect(() => { if (open && taRef.current) taRef.current.focus() }, [open])

  const ask = async () => {
    const question = q.trim()
    if (!question || busy) return
    setBusy(true); setErr(''); setRes(null); setFire(false)
    try {
      const r = await fetch('/api/work/coverage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanAlways(question) }),   // scrub PII/PHI before it leaves the browser
      })
      const data = await r.json()
      if (!r.ok) { setErr(data.error || 'Please try again.'); }
      else {
        setRes(data); setQ('')
        if (data.verdict === 'covered') { setFire(true); setTimeout(() => setFire(false), 1800) }  // celebrate a yes
      }
    } catch { setErr('Could not reach the assistant. Please try again.') }
    finally { setBusy(false) }
  }
  const onKey = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask() } }
  const verdictMeta = {
    covered: { label: 'Covered', cls: 'ok' },
    partial: { label: 'Partly covered', cls: 'mid' },
    no: { label: 'Not a fit', cls: 'no' },
    offtopic: { label: 'Ask about a task', cls: 'off' },
  }

  return (
    <>
      {!open && (
        <button className="wm-cov-launch" onClick={() => setOpen(true)} aria-label="Check if your scenario is covered">
          <Sparkles size={16} /> Is your scenario covered?
        </button>
      )}
      {open && (
        <div className="wm-cov" role="dialog" aria-label="Coverage assistant">
          {fire && (
            <div className="wm-fw" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`wm-fw-burst b${i}`}>{Array.from({ length: 12 }).map((__, j) => <i key={j} style={{ '--a': `${j * 30}deg` }} />)}</span>)}
            </div>
          )}
          <div className="wm-cov-head">
            <div className="wm-cov-head-t"><ScanEye size={16} /> Is it covered?</div>
            <button className="wm-cov-x" onClick={() => setOpen(false)} aria-label="Close">&times;</button>
          </div>
          <div className="wm-cov-body">
            <p className="wm-cov-intro">Describe your task or scenario and I will tell you whether WorkCoPilot can guide you through it, how, and which plan fits.</p>
            {res && (
              <div className="wm-cov-ans">
                {res.verdict && verdictMeta[res.verdict] && (
                  <span className={`wm-cov-chip ${verdictMeta[res.verdict].cls}`}>{verdictMeta[res.verdict].label}</span>
                )}
                <p className="wm-cov-text">{res.answer}</p>
                {res.plan && <div className="wm-cov-plan">Best fit: <b>{res.plan}</b>{res.product && res.product !== 'WorkCoPilot' ? ` (see ${res.product})` : ''}</div>}
                {res.verdict !== 'offtopic' && (
                  <button className="wm-cta sm" onClick={() => go(res.plan ? res.plan.toLowerCase() : '')}>Get started <ArrowRight size={14} /></button>
                )}
              </div>
            )}
            {err && <p className="wm-cov-err">{err}</p>}
          </div>
          <div className="wm-cov-input">
            <textarea ref={taRef} rows={2} value={q} maxLength={1200} placeholder="e.g. Set up a VPC on AWS and lock it down, or reconcile last month's books in Excel"
              onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
            <button className="wm-cov-send" onClick={ask} disabled={busy || !q.trim()}>
              {busy ? '...' : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
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
      <div className="wm-diff-file"><FileText size={12} /> {file}</div>
      <div className="wm-diff-line del"><span>-</span><code>{oldLine}</code></div>
      <div className="wm-diff-line add"><span>+</span><code>{newLine}</code></div>
    </div>
  )
}
// The terminal command, shown as the step's single stage visual (for cmd steps).
function TermBlock({ cmd }) {
  return (
    <div className="wm-demo-term">
      <div className="wm-demo-th">TERMINAL <span>Copy</span></div>
      <code>{cmd}</code>
    </div>
  )
}
function LiveDemo({ tilt, untilt }) {
  // Each demo is a REAL sequence the copilot walks you through: it READS your
  // screen ("I can see"), tells you the exact next move, CATCHES mistakes and
  // CORRECTS them (code diffs and all). This is the hand-holding, not a step list.
  const demos = [
    {
      tag: 'Agentic GenAI', app: 'Agent build', goal: 'Build a tool-calling RAG agent',
      steps: [
        { sees: 'An empty agent project is open', step: 'Create the vector store and embed your docs', how: ['Pick a vector store (pgvector or Chroma)', 'Chunk your docs to ~800 tokens with overlap', 'Embed the chunks and upsert them'], cmd: '$ pip install langchain langgraph chromadb', click: 'Create collection', done: 'the collection holds your vectors' },
        { sees: 'Retrieval returns whole documents', fix: { say: 'Returning full docs blows the context window and buries the answer', do: 'Return the top matching chunks with a score threshold, not whole files' }, diff: { file: 'retriever.py:21', old: 'retriever = store.as_retriever()', new: 'retriever = store.as_retriever(search_kwargs={"k":4,"score_threshold":0.75})' }, click: 'Set top-k', done: 'retrieval returns focused chunks' },
        { sees: 'Tools are defined but the agent free-forms answers', step: 'Wire the tool-calling loop', how: ['Bind the tools to the model', 'Add the reason, call-tool, observe loop', 'Stop when the model returns a final answer'], click: 'Bind tools', done: 'the agent actually calls your tools' },
        { sees: 'User text is concatenated into the system prompt', fix: { say: 'That is a prompt-injection hole: a user can override your instructions', do: 'Keep user input in a user turn, never in the system prompt, and allowlist tool arguments' }, diff: { file: 'agent.py:40', old: 'system = BASE + user_input', new: 'messages = [system(BASE), user(user_input)]' }, click: 'Separate roles', done: 'user text cannot hijack the system prompt' },
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
      tag: 'Automation', app: 'n8n', goal: 'Build a business phone line with an AI receptionist in n8n',
      steps: [
        { sees: 'You are on the n8n sign-in page', step: 'Sign in to n8n', how: ['Open app.n8n.cloud', 'Type your email and password', 'Click Sign in'], click: 'Sign in', done: 'the Workflows list opens' },
        { sees: 'An empty workflow canvas is open', step: 'Add the incoming-call webhook', how: ['Click "+ Add first step" on the canvas', 'Search Webhook and add it', 'Copy the Production URL it shows'], click: '+ Add Webhook', done: 'a Webhook node appears' },
        { sees: 'The webhook method is set to GET', fix: { say: 'Phone providers POST the call, so GET would drop every call', do: 'Open the node and switch HTTP Method to POST' }, click: 'Method: POST', done: 'the method now reads POST' },
        { sees: 'The webhook is live with a URL', step: 'Point your phone number at it', how: ['Open Twilio, open your number', 'Under "A call comes in" choose Webhook', 'Paste the URL, click Save'], click: 'Save', done: 'a test call reaches n8n' },
        { sees: 'The transcript node returned text', step: 'Answer in the AI voice', how: ['Add an OpenAI "Message a model" node', 'Paste your receptionist instructions', 'Reply through Twilio Say'], click: 'Message a model', done: 'the caller hears the AI answer' },
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
      tag: 'Infra as code', app: 'Chef cookbook', goal: 'Harden the nginx Chef cookbook',
      steps: [
        { sees: 'recipes/default.rb pins an old nginx', fix: { say: 'That nginx version has a known CVE', do: 'Bump the package version in the recipe' }, diff: { file: 'recipes/default.rb', old: "package 'nginx' do version '1.18.0'", new: "package 'nginx' do version '1.26.2'" }, click: 'Edit recipe', done: 'the version is current' },
        { sees: 'The service is declared but never enabled', step: 'Enable nginx on boot', how: ['Open the service resource', 'Add :enable to the action list'], diff: { file: 'recipes/default.rb', old: "service 'nginx' do action :start", new: "service 'nginx' do action [:enable, :start]" }, click: 'Add :enable', done: 'nginx starts on boot' },
        { sees: 'A template ships world-readable', fix: { say: 'mode 0644 lets any user read the DB password', do: 'Tighten the file mode and set the owner' }, diff: { file: 'templates/db.conf.erb', old: "mode '0644'", new: "mode '0640', owner 'root', group 'app'" }, click: 'Fix mode', done: 'the file is locked down' },
      ],
    },
    {
      tag: 'Cloud', app: 'AWS Console', goal: 'Set up a private network (VPC) on AWS',
      steps: [
        { sees: 'You are in the VPC dashboard', step: 'Create the VPC', how: ['In the VPC console, click Create VPC', 'Choose "VPC only" and give it a name', 'Set IPv4 CIDR to 10.0.0.0/16, click Create VPC'], click: 'Create VPC', cmd: '$ aws ec2 create-vpc --cidr-block 10.0.0.0/16', done: 'the VPC is listed' },
        { sees: 'You typed CIDR 10.0.0.0/24', fix: { say: 'A /24 is only 256 addresses, too small to grow into', do: 'Change the CIDR to 10.0.0.0/16' }, click: 'CIDR /16', done: 'the range is 10.0.0.0/16' },
        { sees: 'The VPC has no path to the internet', step: 'Attach an internet gateway', how: ['Open Internet gateways, click Create, name it', 'Select it, open Actions, Attach to VPC', 'Pick your VPC, click Attach'], click: 'Attach to VPC', done: 'the gateway shows Attached' },
      ],
    },
    {
      tag: 'DevOps', app: 'Terminal', goal: 'Ship my app to Kubernetes',
      steps: [
        { sees: 'Your kubectl context is pointed at prod', fix: { say: 'That is PRODUCTION, a wrong apply here is costly', do: 'Switch to the staging context first' }, click: 'use staging', cmd: '$ kubectl config use-context staging', done: 'the context shows staging' },
        { sees: 'deploy.yaml is ready', step: 'Apply the deployment', how: ['Apply the manifest', 'Watch the pods start'], click: 'apply', cmd: '$ kubectl apply -f deploy.yaml', done: 'pods are being created' },
        { sees: 'A pod is stuck in ImagePullBackOff', fix: { say: 'That image tag does not exist in the registry', do: 'Fix the tag to :1.4.2 and re-apply' }, click: 'fix tag', done: 'the pod is Running' },
      ],
    },
  ]
  const [di, setDi] = useState(() => Math.floor(Math.random() * demos.length))  // a different scenario each load
  const [si, setSi] = useState(0)
  const [typed, setTyped] = useState('')
  const [show, setShow] = useState(false)
  const d = demos[di]
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
    const dwell = (cur.fix || cur.diff) ? 6500 : 5000
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
        <div className="wm-demo-sees" key={'see' + safeSi}><span className="wm-demo-scan" aria-hidden /><span className="wm-demo-seek"><ScanEye size={12} /> I can see</span> {s.sees}</div>
        <div className="wm-demo-stage" key={'st' + safeSi}>
          {s.diff
            ? <DiffBlock file={s.diff.file} oldLine={s.diff.old} newLine={s.diff.new} />
            : s.cmd
              ? <TermBlock cmd={s.cmd} />
              : <DemoScreen app={d.app} target={s.click} fix={isFix} />}
        </div>
        <div className="wm-demo-steps" aria-hidden>
          {d.steps.map((_, k) => <i key={k} className={k < safeSi ? 'done' : k === safeSi ? 'now' : ''} />)}
        </div>
        <div className="wm-demo-guide">
          {isFix ? (
            <div className="wm-demo-fix" key={'fx' + safeSi}>
              <div className="wm-demo-fixhead"><AlertTriangle size={13} /> HOLD ON <span className="wm-demo-stepno">Step {safeSi + 1} of {tot}</span></div>
              <div className="wm-demo-fixsay">{s.fix.say}</div>
              <div className="wm-demo-fixdo"><ArrowRight size={13} /> {s.fix.do}</div>
            </div>
          ) : (
            <>
              <div className="wm-demo-now">
                <div className="wm-demo-label">DO THIS NOW <span className="wm-demo-stepno">Step {safeSi + 1} of {tot}</span></div>
                <div key={safeSi} className="wm-demo-step wm-demo-fade">{s.step}</div>
              </div>
              <div className="wm-demo-how" key={'h' + safeSi}>
                <div className="wm-demo-howlabel">EXACTLY HOW</div>
                <ol>{s.how.map((h, k) => <li key={k} className="wm-demo-fade" style={{ animationDelay: `${80 + k * 90}ms` }}>{h}</li>)}</ol>
              </div>
            </>
          )}
        </div>
        <div className="wm-demo-done" key={'dn' + safeSi}><Check size={13} /> done when {s.done}</div>
      </div>
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
.wm-cta{background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s,box-shadow .15s}
.wm-cta:hover{transform:translateY(-2px);box-shadow:0 18px 44px -14px rgba(255,122,89,.75)}
.wm-cta.sm{padding:9px 15px;font-size:14px;border-radius:11px}
.wm-cta.big{padding:17px 30px;font-size:17px}
.wm-cta.alt{background:rgba(255,255,255,.04);color:var(--tx);border:1px solid rgba(255,255,255,.18);box-shadow:none}
.wm-cta.alt:hover{border-color:var(--em);color:var(--em)}
.wm-link{background:none;border:none;color:var(--mut);font:inherit;font-size:15px;cursor:pointer;text-decoration:underline;text-underline-offset:4px}
.wm-link:hover{color:var(--tx)}

.wm [data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)}
.wm [data-reveal].in{opacity:1;transform:none}

/* HERO */
.wm-hero{padding:78px 0 0;position:relative}
.wm-hero-vid{position:absolute;inset:-70px 0 auto 0;width:100%;height:640px;object-fit:cover;opacity:.5;z-index:0;pointer-events:none;-webkit-mask-image:linear-gradient(180deg,#000 42%,transparent);mask-image:linear-gradient(180deg,#000 42%,transparent)}
@media(prefers-reduced-motion:reduce){.wm-hero-vid{display:none}}
.wm-hero-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:50px;align-items:center}
.wm-badge{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--em);border:1px solid rgba(140,245,196,.3);background:rgba(140,245,196,.07);padding:6px 13px;border-radius:999px;margin-bottom:24px}
.wm-hero h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(42px,6.2vw,74px);line-height:.98;letter-spacing:-.035em;margin:0 0 24px}
.wm-lead{font-size:19px;color:var(--mut);max-width:40ch;margin:0 0 22px}
.wm-killer{display:flex;align-items:center;gap:12px;background:linear-gradient(100deg,rgba(57,211,255,.1),rgba(140,245,196,.06));border:1px solid rgba(57,211,255,.32);border-radius:14px;padding:13px 15px;margin-bottom:26px;max-width:470px;font-size:14.5px;color:var(--tx);transition:transform .15s,border-color .2s}
.wm-killer:hover{transform:translateY(-2px);border-color:var(--em2)}
.wm-killer b{color:var(--em2)}
.wm-killer-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:rgba(57,211,255,.15);color:var(--em2);flex-shrink:0}
.wm-killer svg:last-child{margin-left:auto;color:var(--mut);flex-shrink:0}
.wm-hero-cta{display:flex;align-items:center;gap:22px}
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
.wm-demo{background:linear-gradient(180deg,rgba(18,20,29,.96),rgba(10,11,18,.98));border:1px solid var(--line);border-radius:22px;padding:17px;box-shadow:0 50px 100px -40px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .2s ease-out;min-height:600px;display:flex;flex-direction:column}
.wm-demo-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:2px 4px 14px}
.wm-demo-head b{font-family:"Bricolage Grotesque";margin-left:6px}
.wm-demo-head .d{width:9px;height:9px;border-radius:50%}
.d.r{background:#ff5f57}.d.y{background:#febc2e}.d.g{background:#28c840}
.wm-demo-tag{margin-left:auto;font-size:11px;color:var(--em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 10px}
.wm-demo-goal{font-size:15px;color:var(--tx);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:11px;padding:11px 13px;min-height:60px}
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
.wm-demo-term code{display:block;background:#0c1222;color:#d6e9d6;font-family:"JetBrains Mono",monospace;font-size:12.5px;padding:10px;overflow-x:auto;white-space:nowrap}
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
.wm-demo-steps{display:flex;gap:5px;margin-bottom:11px}
.wm-demo-steps i{height:3px;flex:1;border-radius:2px;background:rgba(255,255,255,.1);transition:background .3s}
.wm-demo-steps i.done{background:var(--em)}
.wm-demo-steps i.now{background:linear-gradient(90deg,var(--em),var(--em2))}
.wm-demo-fade{animation:wm-demo-fade .32s ease-out both}
@keyframes wm-demo-fade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
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
.wm-diff-line{display:flex;gap:9px;padding:6px 11px;font-size:11.5px;line-height:1.5;white-space:nowrap;overflow-x:auto}
.wm-diff-line span{flex:0 0 auto;font-weight:700;opacity:.85}
.wm-diff-line.del{background:rgba(255,99,99,.09);color:#ffb3b3}.wm-diff-line.del span{color:#ff6b6b}
.wm-diff-line.add{background:rgba(140,245,196,.09);color:#bdf5d8}.wm-diff-line.add span{color:var(--em)}
.wm-demo-fix{margin-top:12px;border:1px solid rgba(255,140,90,.4);background:rgba(255,140,90,.08);border-radius:13px;padding:12px 13px;animation:wm-demo-fade .3s ease-out both}
.wm-demo-fixhead{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.12em;color:#ffb35c;font-weight:800}
.wm-demo-fixhead svg{color:#ffb35c}
.wm-demo-fixhead .wm-demo-stepno{color:var(--mut)}
.wm-demo-fixsay{margin-top:7px;font-size:13.5px;color:var(--tx);font-weight:600;line-height:1.4}
.wm-demo-fixdo{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:13px;color:var(--em);font-weight:600}
.wm-demo-fixdo svg{color:var(--em);flex:0 0 auto}
.wm-demo-stage{margin-top:12px;height:120px;display:flex;flex-direction:column;justify-content:center}
.wm-demo-stage > *{margin-top:0}
.wm-demo-guide{margin-top:12px;height:214px;overflow:hidden}
.wm-demo-guide > :first-child{margin-top:0}

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

/* SECTIONS */
.wm-sec{padding:84px 0}
.wm-h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(28px,4.2vw,44px);letter-spacing:-.025em;line-height:1.06;max-width:20ch;margin:0 0 14px}
.wm-sub{color:var(--mut);font-size:18px;max-width:58ch;margin:0 0 42px}

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

.wm-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
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
.wm-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
.wm-tier{border:1px solid var(--line);border-radius:22px;padding:28px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.008));position:relative}
.wm-tier.pop{border-color:rgba(140,245,196,.5);background:linear-gradient(180deg,rgba(140,245,196,.1),rgba(255,255,255,.01));box-shadow:0 40px 80px -40px rgba(140,245,196,.55);transform:translateY(-10px)}
.wm-tier-tag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--em),var(--em2));color:#042;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px}
.wm-tier-name{font-family:"Bricolage Grotesque";font-weight:800;font-size:21px}
.wm-tier-price{font-family:"Bricolage Grotesque";font-weight:800;font-size:48px;letter-spacing:-.03em;margin:4px 0 0}
.wm-tier-price span{font-size:17px;color:var(--mut);font-weight:400}
.wm-tier-hrs{color:var(--em);font-size:14px;margin-bottom:20px}
.wm-tier ul{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:11px}
.wm-tier li{display:flex;gap:9px;align-items:flex-start;color:var(--tx);font-size:14.5px}
.wm-tier li svg{color:var(--em);flex-shrink:0;margin-top:3px}
.wm-tier .wm-cta{width:100%;justify-content:center}
.wm-tier-topup{text-align:center;color:var(--mut);font-size:12.5px;margin-top:12px}
.wm-fineprint{text-align:center;color:var(--mut);font-size:14px;margin:32px auto 0;max-width:62ch}

/* colored eyebrow kicker (kills grey, ties sections to brand) */
.wm-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wm-eyebrow svg{color:var(--em)}
/* SECURITY / ENTERPRISE BAND */
.wm-sec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:10px}
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
.wm-roi-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:6px 0 30px}
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
@media(max-width:900px){.wm-sec-grid{grid-template-columns:1fr}.wm-ent{grid-template-columns:1fr;gap:20px}.wm-ent-r ul{grid-template-columns:1fr}}

/* FINAL */
.wm-final{padding:96px 0;text-align:center;border-top:1px solid var(--line);background:radial-gradient(60% 130% at 50% 0%,rgba(140,245,196,.09),transparent)}
.wm-final-in h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(32px,5vw,52px);letter-spacing:-.025em;margin:16px 0 14px}
.wm-final-in p{color:var(--mut);font-size:19px;margin:0 0 28px}

/* DISCLAIMER + FOOT */
.wm-disclaimer-wrap{border-top:1px solid var(--line);background:rgba(255,255,255,.015);padding:20px 0}
.wm-disclaimer{display:flex;gap:9px;align-items:flex-start;color:var(--mut);font-size:13px;line-height:1.6;max-width:92ch;margin:0 auto}
.wm-disclaimer svg{color:var(--em);flex-shrink:0;margin-top:3px}.wm-disclaimer b{color:var(--tx)}
.wm-foot{border-top:1px solid var(--line);padding:26px 0}
.wm-foot-in{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.wm-foot-by{color:var(--mut);flex:1;font-size:13px}

@media(max-width:900px){
 .wm-hero-grid{grid-template-columns:1fr;gap:38px}
 .wm-benefits,.wm-steps,.wm-ways-grid,.wm-tiers,.wm-people-grid{grid-template-columns:1fr}
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
 .wm-navcta .wm-ghost{display:none}
 .wm-modes{flex-direction:column;align-items:flex-start;gap:13px}
 .wm-mode-div{display:none}
 .wm-sec{padding:56px 0}
 .wm-hero{padding:48px 0 0}
 .wm-lead{font-size:17px}
 .wm-demo{transform:none}
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
.wm:not([data-wm="dark"]) .wm-final{background:radial-gradient(60% 130% at 50% 0%,rgba(10,157,102,.1),transparent)}
.wm:not([data-wm="dark"]) .wm-band-in{background:linear-gradient(110deg,rgba(10,134,207,.08),rgba(10,157,102,.05));border-color:rgba(10,134,207,.22)}

.wm:not([data-wm="dark"]) .wm-disclaimer-wrap{background:#e9edf4}
.wm:not([data-wm="dark"]) .wm-photo{box-shadow:0 30px 64px -40px rgba(17,23,38,.5)}

/* COVERAGE CHAT (floating, theme-aware via the vars) */
.wm-cov-launch{position:fixed;right:20px;bottom:20px;z-index:60;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:999px;padding:12px 18px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 16px 40px -12px rgba(255,122,89,.6);transition:transform .15s}
.wm-cov-launch:hover{transform:translateY(-2px)}
.wm-cov{position:fixed;right:20px;bottom:20px;z-index:61;width:min(380px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 40px));display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.45)}
.wm-cov-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid var(--line)}
.wm-cov-head-t{display:inline-flex;align-items:center;gap:8px;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:15px;color:var(--tx)}
.wm-cov-head-t svg{color:var(--em2)}
.wm-cov-x{background:none;border:none;color:var(--mut);font-size:22px;line-height:1;cursor:pointer;padding:0 4px}
.wm-cov-x:hover{color:var(--tx)}
.wm-cov-body{flex:1;overflow-y:auto;padding:15px}
.wm-cov-intro{color:var(--mut);font-size:13.5px;line-height:1.55;margin:0}
.wm-cov-ans{margin-top:14px;border:1px solid var(--line);border-radius:13px;padding:13px;background:linear-gradient(180deg,rgba(140,245,196,.06),transparent)}
.wm-cov-chip{display:inline-flex;align-items:center;font-size:11px;font-weight:700;letter-spacing:.04em;padding:3px 10px;border-radius:999px;margin-bottom:9px}
.wm-cov-chip.ok{color:#06603f;background:rgba(10,157,102,.16)}
.wm-cov-chip.mid{color:#8a5a00;background:rgba(255,179,92,.2)}
.wm-cov-chip.no{color:#9a2b2b;background:rgba(255,99,99,.16)}
.wm-cov-chip.off{color:var(--mut);background:rgba(120,130,150,.14)}
.wm-cov-text{color:var(--tx);font-size:14px;line-height:1.55;margin:0}
.wm-cov-plan{margin-top:10px;font-size:13px;color:var(--mut)}.wm-cov-plan b{color:var(--em2)}
.wm-cov-ans .wm-cta{margin-top:12px}
.wm-cov-err{margin-top:12px;color:#c0392b;font-size:13px}
.wm-cov-input{display:flex;gap:8px;align-items:flex-end;padding:12px 15px;border-top:1px solid var(--line)}
.wm-cov-input textarea{flex:1;resize:none;background:var(--ink);border:1px solid var(--line);border-radius:11px;padding:9px 11px;color:var(--tx);font:inherit;font-size:13.5px;line-height:1.45;outline:none}
.wm-cov-input textarea:focus{border-color:var(--em2)}
.wm-cov-send{flex:0 0 auto;width:40px;height:40px;border-radius:11px;border:none;background:linear-gradient(135deg,var(--em),var(--em2));color:#042;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.wm-cov-send:disabled{opacity:.5;cursor:default}
@media(max-width:560px){.wm-cov-launch{right:12px;bottom:12px}.wm-cov{right:8px;bottom:8px}}
/* celebratory fireworks when the answer is "Covered" */
.wm-fw{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;border-radius:18px}
.wm-fw-burst{position:absolute;width:0;height:0}
.wm-fw-burst.b0{left:22%;top:34%}.wm-fw-burst.b1{left:70%;top:26%}.wm-fw-burst.b2{left:46%;top:46%}.wm-fw-burst.b3{left:30%;top:62%}.wm-fw-burst.b4{left:78%;top:56%}.wm-fw-burst.b5{left:56%;top:22%}.wm-fw-burst.b6{left:16%;top:50%}
.wm-fw-burst i{position:absolute;left:0;top:0;width:6px;height:6px;border-radius:50%;background:hsl(calc(var(--a) + 150),92%,56%);box-shadow:0 0 6px currentColor;animation:wm-fw-pop 1.25s cubic-bezier(.15,.7,.3,1) forwards}
.wm-fw-burst.b1 i{animation-delay:.12s}.wm-fw-burst.b2 i{animation-delay:.22s}.wm-fw-burst.b3 i{animation-delay:.34s}.wm-fw-burst.b4 i{animation-delay:.18s}.wm-fw-burst.b5 i{animation-delay:.3s}.wm-fw-burst.b6 i{animation-delay:.4s}
@keyframes wm-fw-pop{0%{transform:rotate(var(--a)) translateX(2px) scale(1);opacity:1}100%{transform:rotate(var(--a)) translateX(58px) scale(.25);opacity:0}}
`
