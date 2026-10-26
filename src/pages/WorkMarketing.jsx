import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, TerminalSquare, Compass, ShieldCheck, Globe2, FileText,
  ArrowRight, Check, Camera, Sparkles, Layers, Monitor, Smartphone, AppWindow,
  Lock, Zap, Rocket, Gauge, Target, ScanEye, ListChecks, AlertTriangle, RotateCcw,
  Building2, Copy, Download,
  Server, Blocks, Bot, Megaphone, Calculator, Scale, Shapes, Trophy,
  Code2, Table, Palette, RefreshCw, X,
} from 'lucide-react'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'
import SiteHeader from '../components/SiteHeader.jsx'   // shared top nav (one link list, mobile disclosure menu) - same as every inner page
import SiteFooter from '../components/SiteFooter.jsx'   // shared footer across the whole site
import ReleaseNote from '../components/ReleaseNote.jsx'   // localized "new in this release" highlights (rel.*)
import CopyChip from '../components/CopyChip.jsx'
import WorkCard from '../components/WorkCard.jsx'   // the shared, site-wide premium card primitive
import LiveValidate from '../components/LiveValidate.jsx'   // the "Validate it live" widget (lead gate + live coverage check)
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import useSeo from '../useSeo.js'
import { useLocale, renderRich } from '../i18n/index.jsx'   // every visible string on this page comes from the locale catalog (home.*)
import en from '../i18n/locales/en.js'   // base catalog: the canonical plan-bullet count (see staticFeats)
// The field roster lives ONCE, on the /fields page; the teaser below imports
// its numbers so the headline count can never drift from the full list.
import { FIELD_FAMILIES, FIELD_TOTAL } from './WorkFields.jsx'

// AdmireVeda WorkCoPilot - marketing landing (admireveda.com).
// Motion-rich, benefits-first. Never names a model, never mentions limits.
// LOCALIZED: all copy is read through t() from src/i18n/locales/<code>.js;
// icons, routes, prices, commands and code stay here (never translated).
export default function WorkMarketing() {
  const nav = useNavigate()
  const { t, locale } = useLocale()
  useSeo({
    title: t('home.meta.title'),
    description: t('home.meta.description'),
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

  // Benefit pills: the icon order here pairs 1:1 with home.benefits.items in the
  // catalog (titles only are rendered; the long descriptions live on /how-it-works).
  const benefitIcons = [MonitorPlay, TerminalSquare, Compass, ShieldCheck, Zap, Monitor, Globe2, FileText, ScanEye, RefreshCw]
  const benefits = t('home.benefits.items').map((title, i) => ({ icon: benefitIcons[i] || Sparkles, t: title }))
  const steps = [
    { n: '01', viz: 'goal', t: 'Scope it together', d: 'Say what you want, answer a couple of quick questions, and it scopes the job before it plans, so the plan fits what you really need.' },
    { n: '02', viz: 'guide', t: 'Get guided live', d: 'It reads your screen, guides the exact next move, checks it worked, and corrects you the moment something looks wrong.' },
    { n: '03', viz: 'keep', t: 'Finish & keep it', d: 'Done right, with a documented write-up you can come back to.' },
  ]
  // Each use-case gets its OWN icon (no repeated glyph) and an accent tone. The
  // id/icon/tone rows pair 1:1 with home.fields.cards (title + blurb) in the catalog.
  const cardMeta = [
    { id: 'config', ic: Server, tone: 'cyan' },
    { id: 'build', ic: Blocks, tone: '' },
    { id: 'ai', ic: Bot, tone: 'violet' },
    { id: 'product', ic: Rocket, tone: 'amber' },
    { id: 'marketing', ic: Megaphone, tone: 'pink' },
    { id: 'office', ic: Calculator, tone: 'cyan' },
    { id: 'legal', ic: Scale, tone: '' },
    { id: 'general', ic: Shapes, tone: 'amber' },
  ]
  const cards = t('home.fields.cards').map((c, i) => ({ ...cardMeta[i], ...c }))
  const marquee = t('home.marquee')
  const pillars = [
    { icon: Lock, t: 'Safe and private', flagship: true, claim: 'Your data never leaves your device unprotected.', d: 'Read-only by design, with on-device redaction on by default, for everyone.', points: ['PII, PHI, secrets and IPs redacted on your device before anything is sent, shown as [REDACTED]. On by default.', 'Built-in SAST and a live dependency CVE check on any code before you run it', 'Never clicks, types or runs anything; never generates content - it hands you a prompt for your own AI', 'Hidden on screen-share, and every account protected by an authenticator (MFA)', 'A per-session audit log: what was sent, what was read from your screen, the code checks, what was filtered, every flag raised'] },
    { icon: Rocket, t: 'Powerful', claim: 'From a one-liner to a full enterprise build.', d: 'Whatever the task, it carries it end to end.', points: ['Simplest task to the most advanced', 'Any tool, any stack, any field', 'Nothing left half-done'] },
    { icon: Target, t: 'Accurate', claim: 'It only tells you what is really on your screen.', d: 'No guessing, no invented menus.', points: ['Never invents a button or setting', 'Catches a wrong value before you save', 'Says "I cannot see that" instead of guessing'] },
    { icon: Gauge, t: 'Fast', claim: 'The next step before you finish reading this.', d: 'It keeps pace with you, not the other way round.', points: ['Guidance in a blink', 'No waiting, no spinning', 'Moves the plan as you move'] },
    { icon: ScanEye, t: 'Multimodal', claim: 'Reads screens, cameras and documents.', d: 'It sees what you see, from any source.', points: ['Your screen, live', 'Your phone camera', 'Your own files for context'] },
    { icon: Sparkles, t: 'Intelligent', claim: 'Understands the goal, not just the words.', d: 'It reasons about what you are really doing.', points: ['Fits the real app - web, desktop, on-prem or custom', 'Corrects the step when a tool\'s UI has changed', 'Thinks deeper on hard steps, fixes the plan when reality differs'] },
    { icon: Layers, t: 'Learns how you work', claim: 'Teach it your skills. It gets more powerful for you.', d: 'Add your own playbooks and skills, from any AI, and guidance aligns with your tools, standards and terminology.', points: ['Paste a playbook, an SOP or a skill exported from any AI', 'It learns how YOU work and keeps getting better for you over time', 'Companies keep their skills private, with download and re-upload'] },
    { icon: Globe2, t: 'Deep research', claim: 'Always up to date, never stale.', d: 'It checks the latest before it guides.', points: ['The current way, not last year\'s', 'Real official links and steps', 'Matches how tools work today'] },
    { icon: Compass, t: 'All around your goal', claim: 'Every step points at what you want.', d: 'It never loses the thread.', points: ['The goal is always in view', 'No busywork, no detours', 'Knows the moment you are done'] },
    { icon: ListChecks, t: 'Recorded & hand-held', claim: 'Walked through, and written down.', d: 'Guided live, and kept for later.', points: ['Guided every single step', 'A picture-rich report to keep', 'Repeat or share it anytime'] },
  ]
  // Every plan number on the cards comes from the live server pricing
  // (/api/work/pricing -> store.getWorkPricing(): plans / tasks / dailyHours),
  // so a superadmin change in Admin > Pricing flows straight to the cards. The
  // public framing is MONTHLY: monthly tasks = daily cap x 30, monthly hours =
  // daily hours x 30 - computed here, never typed into copy, so the page can
  // never drift from what the product enforces. Tasks are stated plainly
  // (unused ones bank); hours are "up to" + asterisk (a day's hours expire).
  const DAYS_PER_MONTH = 30
  const dh = (price && price.dailyHours) || {}
  const dt = (price && price.tasks) || {}
  const perMonth = (n) => (n == null ? null : Math.round(Number(n) * DAYS_PER_MONTH * 100) / 100)
  // Plain numbers go into the strings (the unit words live in the catalog line
  // itself), so a locale without these keys yet gets one consistent English
  // fallback line, never "30 Aufgaben a month".
  // Locales not yet retranslated for the monthly framing still carry the legacy
  // hardcoded "1 guided task a day" as the FIRST lite bullet. The base (en)
  // catalog is the canonical bullet list; any extra leading items in another
  // locale are that legacy number line and are dropped, so no locale can show a
  // stale hardcoded cap - the data-driven tasksLine replaces it for everyone.
  const staticFeats = (id) => {
    const list = t(`home.pricing.feats.${id}`) || []
    const canon = ((en.home.pricing.feats || {})[id] || []).length
    return list.length > canon ? list.slice(list.length - canon) : list
  }
  const planLines = (id) => {
    const tasksDay = dt[id], hrsDay = dh[id]
    const lines = []
    if (tasksDay != null) lines.push(t('home.pricing.tasksMonthLine', { tasks: perMonth(tasksDay), dailyTasks: tasksDay }))
    if (hrsDay != null) lines.push(t('home.pricing.hoursMonthLine', { hours: perMonth(hrsDay), dailyHours: hrsDay }))
    return lines
  }
  // Plan names (Lite/Basic/Advanced/Premium) are product names: never translated.
  const tiers = price ? [
    { id: 'lite', name: 'Lite', price: price.plans.lite, hrs: dh.lite, tasks: dt.lite, feats: [...planLines('lite'), ...staticFeats('lite')], hour: price.hour.lite },
    { id: 'basic', name: 'Basic', price: price.plans.basic, hrs: dh.basic, tasks: dt.basic, feats: [...planLines('basic'), ...staticFeats('basic')], hour: price.hour.basic },
    { id: 'advanced', name: 'Advanced', price: price.plans.advanced, hrs: dh.advanced, tasks: dt.advanced, popular: true, feats: [...planLines('advanced'), ...staticFeats('advanced')], hour: price.hour.advanced },
    { id: 'premium', name: 'Premium', price: price.plans.premium, hrs: dh.premium, tasks: dt.premium, feats: [...planLines('premium'), ...staticFeats('premium')], hour: price.hour.premium },
  ] : []
  // Card headline: "{N} tasks a month · up to {H} hours a month*" from the same numbers.
  const monthlyLine = (tier) => {
    if (tier.tasks == null && tier.hrs == null) return ''
    return t('home.pricing.monthlyLine', { tasks: perMonth(tier.tasks ?? 0), hours: perMonth(tier.hrs ?? 0) })
  }

  return (
    <div className="wm" ref={rootRef}>
      <style>{CSS}</style>
      <div className="wm-grain" aria-hidden />
      <div className="wm-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /><span className="orb o3" /></div>

      {/* NAV - the shared SiteHeader, so the homepage and every inner page use
          ONE link list and the same mobile disclosure menu (fixes the missing
          burger below 900px). */}
      <SiteHeader />

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
            <div className="wm-badge" data-reveal><Sparkles size={13} /> {t('home.badge')}</div>
            <RotatingHero paused={heroHover || heroFocus} t={t} locale={locale} />
            <div className="wm-hero-cta" data-reveal>
              <button className="wm-cta" onClick={() => go('')}>{t('home.cta.start')} <ArrowRight size={16} className="wm-arrow" /></button>
              <button className="wm-cta alt" onClick={() => nav('/demo')}>{t('home.cta.demo')} <ArrowRight size={16} className="wm-arrow" /></button>
            </div>
            {/* "Any app" strip: a quiet caption + a calm row of neutral category
                glyphs, filling the space below the CTAs. Category glyphs ONLY -
                no brand marks (honest). Tokens adapt to light + dark. */}
            <div className="wm-anyapp" data-reveal>
              <p className="wm-anyapp-cap">{t('home.anyapp.cap')}</p>
              <div className="wm-anyapp-row">
                {[Globe2, TerminalSquare, Code2, Table, FileText, Palette].map((Ic, i) => {
                  const label = t('home.anyapp.tiles')[i]
                  return (
                    <span key={i} className="wm-anyapp-tile" title={label} aria-label={label}>
                      <Ic size={17} aria-hidden />
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
          <LiveDemo tilt={tilt} untilt={untilt} t={t} />
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
                <div className="wm-eyebrow"><Trophy size={14} /> {t('home.best.eyebrow')}</div>
                <h2 className="wm-best-h">{t.rich('home.best.h', null, { ai: (c) => <span className="wm-best-ai">{c}</span> })}</h2>
                <p className="wm-best-p">{t.rich('home.best.p')}</p>
                <WorkCard.Link as="a" href="/workcopilot/how-it-works#best-model">{t('home.best.link')} <ArrowRight size={14} className="wm-arrow" /></WorkCard.Link>
              </div>
              <div className="wm-best-receipt" aria-label={t('home.best.receiptAria')}>
                <div className="wm-best-row plan"><span className="k">{t('home.best.planK')}</span><span className="v">{t.rich('home.best.planV')}</span></div>
                <div className="wm-best-row guide"><span className="k">{t('home.best.guideK')}</span><span className="v">{t.rich('home.best.guideV')}</span></div>
                <div className="wm-best-row watch"><span className="k">{t('home.best.watchK')}</span><span className="v">{t.rich('home.best.watchV')} <span className="wm-best-dots" aria-hidden><i /><i /><i /></span></span></div>
                <div className="wm-best-row correct"><span className="k">{t('home.best.correctK')}</span><span className="v">{t.rich('home.best.correctV')}</span></div>
                <WorkCard.Proof><b className="dp-ok"><Check size={11} /> {t('home.best.proofOk')}</b> <span className="cb-dim">{t('home.best.proofDim')}</span></WorkCard.Proof>
              </div>
            </div>
          </WorkCard>
        </div>
      </section>

      {/* FOR COMPANIES & TEAMS - the ROI promise, up top.
          REDESIGN (owner, 2026-10-25): the old 4-stat row + 6-card grid read as a
          generic feature grid and mixed product mechanics ("read-only") into ROI
          "stats". Now: an editorial head (promise left, the money sentence right)
          and ONE focal "ledger": the same six budget lines a decision-maker pays
          for, each shown Before -> With WorkCoPilot. Qualitative outcomes only,
          no invented numbers (owner rule); "weeks -> days" is the one approved
          relative shape. The read-only property survives as the footnote. */}
      <section className="wm-sec wm-roi" id="roi">
        <div className="wm-wrap">
          <div className="wm-roi-head">
            <div>
              <div className="wm-eyebrow" data-reveal><Rocket size={14} /> {t('home.roi.eyebrow')}</div>
              <h2 className="wm-h2" data-reveal>{t('home.roi.h2')}</h2>
            </div>
            <p className="wm-roi-lead" data-reveal>{t.rich('home.roi.lead')}</p>
          </div>

          {/* The comparison: the same six budget lines, Before (muted, left) and
              With WorkCoPilot (bright, right), in the site's own before/after
              language (see the enterprise page's .wen-ba). Site fonts only. */}
          {(() => {
            const ROWS = t('home.roi.rows')   // [{ t, before, now(<em> rich) }]
            return (
              <div className="wm-roi-split" data-reveal aria-label={t('home.roi.splitAria')}>
                <div className="wm-roi-col before">
                  <div className="wm-roi-tag"><X size={13} strokeWidth={2.6} /> {t('home.roi.beforeTag')}</div>
                  <h3>{t('home.roi.beforeH')}</h3>
                  <ul>
                    {ROWS.map((r) => (
                      <li key={r.t}><span className="wm-roi-dot" aria-hidden="true" /><div><b>{r.t}</b><p>{r.before}</p></div></li>
                    ))}
                  </ul>
                </div>
                <div className="wm-roi-arrow" aria-hidden="true"><ArrowRight size={18} className="wm-arrow" /></div>
                <div className="wm-roi-col after">
                  <div className="wm-roi-tag ok"><Check size={13} strokeWidth={3} /> {t('home.roi.afterTag')}</div>
                  <h3>{t('home.roi.afterH')}</h3>
                  <ul>
                    {ROWS.map((r) => (
                      <li key={r.t}><span className="wm-roi-tick" aria-hidden="true"><Check size={13} strokeWidth={3} /></span><div><b>{r.t}</b><p>{renderRich(r.now)}</p></div></li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })()}

          <div className="wm-roi-foot" data-reveal>
            <p className="wm-roi-note"><Lock size={14} /> {t('home.roi.note')}</p>
            <div className="wm-roi-ctas">
              <a className="wm-cta" href="/workcopilot/contact">{t('home.roi.ctaTeam')} <ArrowRight size={16} className="wm-arrow" /></a>
              <a className="wm-cta ghost" href="#enterprise">{t('home.roi.ctaEnt')} <ArrowRight size={15} className="wm-arrow" /></a>
            </div>
          </div>
        </div>
      </section>

      {/* FIELDS WE COVER - a SHORT teaser only. The full 10-family grid lives on
          /workcopilot/fields (owner rule: extra content on separate pages,
          linked from the footer; keep the main page short). The numbers come
          from the roster exported by that page, so they can never drift. */}
      <section className="wm-sec wm-fields" id="fields">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Shapes size={14} /> {t('home.fields.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t.rich('home.fields.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.fields.sub', { total: FIELD_TOTAL, families: FIELD_FAMILIES.length })}</p>
          <div className="wm-fld-stats" data-reveal aria-label={t('home.fields.statsAria')}>
            <div className="wm-fld-stat"><b>{FIELD_TOTAL}</b><span>{t('home.fields.statFields')}</span></div>
            <div className="wm-fld-stat"><b>{FIELD_FAMILIES.length}</b><span>{t('home.fields.statFamilies')}</span></div>
            <div className="wm-fld-stat"><b>1</b><span>{t('home.fields.statOne')}</span></div>
          </div>
          <div className="wm-cards" data-reveal>
            {cards.map((c, i) => (
              <WorkCard key={c.id} theme="light" tone={c.tone || undefined} delay={i * 55}
                texPos={['0% 0%', '100% 0%', '50% 100%', '0% 100%', '100% 100%', '50% 0%', '0% 50%', '100% 50%'][i % 8]}
                onClick={() => nav(`/workcopilot/use-cases#${c.id}`)}>
                <WorkCard.Proof><span className="cb-dim">{c.d}</span></WorkCard.Proof>
                <WorkCard.Head icon={c.ic} title={c.k} />
                <WorkCard.Link>{t('common.seeInDetail')} <ArrowRight size={14} className="wm-arrow" /></WorkCard.Link>
              </WorkCard>
            ))}
          </div>
          <div className="wm-fld-more" data-reveal>
            <button className="wm-cta alt" onClick={() => nav('/workcopilot/use-cases')}>{t('home.fields.exploreAll')} <ArrowRight size={15} className="wm-arrow" /></button>
            <a className="wm-fld-browse" href="/workcopilot/fields">{t('home.fields.browseAll', { total: FIELD_TOTAL })} <ArrowRight size={13} className="wm-arrow" /></a>
          </div>
        </div>
      </section>

      {/* Security + Privacy teaser cards + the two showcase buttons. Placed right
          after the fields it protects: the work is written and handled the safe
          way across every one of those fields. Both cards link to the showcase. */}
      <div className="wm-wrap">
        <TrustDuo nav={nav} t={t} />
        <div className="wm-sec-paper" data-reveal>
          <a className="wm-cta" href="/workcopilot/security"><ScanEye size={16} /> {t('home.trust.ctaShow')}</a>
          <a className="wm-cta alt" href="/api/work/security-paper.pdf" target="_blank" rel="noopener"><FileText size={16} /> {t('home.trust.ctaPaper')}</a>
        </div>
      </div>


      {/* BENEFITS teaser - the full, visual breakdown lives on its own page. */}
      <section className="wm-sec">
        <div className="wm-wrap" data-reveal style={{ textAlign: 'center' }}>
          <h2 className="wm-h2">{t('home.benefits.h2')}</h2>
          <p className="wm-sub" style={{ margin: '12px auto 22px', maxWidth: 700 }}>{t('home.benefits.sub')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 26 }}>
            {benefits.map((b) => (
              <span key={b.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 999, padding: '7px 14px' }}><b.icon size={15} style={{ color: 'var(--em)' }} /> {b.t}</span>
            ))}
          </div>
          <button className="wm-cta" onClick={() => nav('/workcopilot/how-it-works')}>{t('home.benefits.cta')} <ArrowRight size={16} className="wm-arrow" /></button>
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

      {/* PRICING */}
      <section className="wm-sec wm-pricing" id="pricing">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Zap size={14} /> {t('home.pricing.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t('home.pricing.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.pricing.sub')}</p>
          <div className="wm-cyc" data-reveal role="tablist" aria-label={t('home.pricing.billingAria')}>
            <button role="tab" aria-selected={cycle === 'monthly'} className={`wm-cyc-b${cycle === 'monthly' ? ' on' : ''}`} onClick={() => setCycle('monthly')}>{t('home.pricing.monthly')}</button>
            <button role="tab" aria-selected={cycle === 'annual'} className={`wm-cyc-b${cycle === 'annual' ? ' on' : ''}`} onClick={() => setCycle('annual')}>{t('home.pricing.annual')} <span className="wm-cyc-save">{t('home.pricing.save')}</span></button>
          </div>
          <div className="wm-tiers">
            {tiers.map((tier) => (
              <div className={`wm-tier${tier.popular ? ' pop' : ''}`} data-reveal key={tier.id}>
                {tier.popular && <div className="wm-tier-tag">{t('home.pricing.mostPopular')}</div>}
                <div className="wm-tier-name">{tier.name}</div>
                <div className="wm-tier-price">{money(monthlyRate(tier.price))}<span>{t('common.perMonth')}</span></div>
                {cycle === 'annual'
                  ? <div className="wm-tier-cyc"><s>{money(tier.price)}{t('common.perMonth')}</s> {t('home.pricing.billedAnnually')} &middot; {money(annualTotal(tier.price))}{t('common.perYear')}</div>
                  : <div className="wm-tier-cyc dim">{t('home.pricing.billedMonthly')}</div>}
                <div className="wm-tier-hrs">{monthlyLine(tier)}</div>
                <div className="wm-tier-mins">{t('home.pricing.mins')}</div>
                <ul>{tier.feats.map((f) => <li key={f}><Check size={15} /> {f}</li>)}</ul>
                <button className={`wm-cta ${tier.popular ? '' : 'alt'}`} onClick={() => choosePlan(tier.id)}>{t('home.pricing.choose', { plan: tier.name })}</button>
                <div className="wm-tier-topup">{t('home.pricing.extraHour', { price: money(tier.hour) })}</div>
              </div>
            ))}
          </div>
          <div className="wm-trust" data-reveal>
            <span><Lock size={14} /> {t('home.pricing.trustStripe')}</span>
            <span><Check size={14} /> {t('home.pricing.trustCancel')}</span>
            <span><ShieldCheck size={14} /> {t('home.pricing.trustExpire')}</span>
          </div>
          {/* The asterisk note: how the daily allowance behind the monthly numbers
              works (hours expire at midnight, tasks bank). Muted and smaller. */}
          {price && <p className="wm-footnote" data-reveal>{t('home.pricing.footnote')}</p>}
          {price && <p className="wm-fineprint" data-reveal>{t('home.pricing.fineprint', { price: money(price.image.premium), min: price.imageMinBulk })}</p>}
          {/* The full entitlement matrix (every row, every plan, the fine print)
              lives on /workcopilot/pricing; the main page keeps only the cards. */}
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta alt" href="/workcopilot/pricing">{t('home.pricing.fullCompare')} <ArrowRight size={15} className="wm-arrow" /></a>
          </div>
        </div>
      </section>

      {/* ENTERPRISE - matches the site's section pattern: centered eyebrow + h2 +
          sub, then a card grid of the enterprise controls, a centered CTA (custom
          pricing is by quote), and a trust strip. Site light palette (green/blue
          emphasis, orange CTA). Routes to the contact form. */}
      <section className="wm-sec wm-ent-sec" id="enterprise">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Building2 size={14} /> {t('home.enterprise.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t('home.enterprise.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.enterprise.sub')}</p>
          <div className="wm-ent-grid" data-reveal>
            {/* Icon order pairs 1:1 with home.enterprise.cards in the catalog. */}
            {t('home.enterprise.cards').map((c, i) => {
              const Ic = [Layers, Gauge, ShieldCheck, ListChecks, Lock, Server][i] || Layers
              return (
                <div className="wm-ent-card" key={i}>
                  <span className="wm-ent-ic"><Ic size={18} /></span>
                  <b>{c.t}</b>
                  <i>{c.d}</i>
                </div>
              )
            })}
          </div>
          <div className="wm-ent-cta" data-reveal>
            <a className="wm-cta" href="/workcopilot/enterprise">{t('home.enterprise.ctaExplore')} <ArrowRight size={16} className="wm-arrow" /></a>
            <a className="wm-cta ghost" href="/workcopilot/contact">{t('home.enterprise.ctaQuote')} <ArrowRight size={15} className="wm-arrow" /></a>
          </div>
          <div className="wm-ent-strip" aria-label={t('home.enterprise.stripAria')}>
            {t('home.enterprise.chips').map((c) => (
              <span key={c} className="wm-ent-chip">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="wm-final">
        <div className="wm-wrap wm-final-in" data-reveal>
          <AVMark size={46} />
          <h2>{t('home.final.h2')}</h2>
          <p>{t('home.final.p')}</p>
          <button className="wm-cta big" onClick={() => go('')}>{t('common.getStarted')} <ArrowRight size={18} className="wm-arrow" /></button>
          <div className="wm-dl" data-reveal>
            <span className="wm-dl-lbl">{t('home.final.useYourWay')}</span>
            <div className="wm-dl-row">
              <a className="wm-dl-btn primary" href="/workcopilot" title={t('home.final.browser.title')}>
                <span className="wm-dl-rec">{t('home.final.browser.rec')}</span>
                <Globe2 size={22} />
                <span className="wm-dl-t"><b>{t('home.final.browser.b')}</b><i>{t('home.final.browser.i')}</i></span>
                <ArrowRight size={16} className="wm-arrow" />
              </a>
              <a className="wm-dl-btn" href="/api/work/desktop-setup.exe" aria-label={t('home.final.windows.aria')} title={t('home.final.windows.title')}>
                <Monitor size={22} />
                <span className="wm-dl-t"><b>{t('home.final.windows.b')}</b><i>{t('home.final.windows.i')}</i></span>
                <Download size={16} />
              </a>
              <div className="wm-dl-btn soon" aria-disabled="true">
                <Smartphone size={22} />
                <span className="wm-dl-t"><b>{t('home.final.android.b')}</b><i>{t('home.final.android.i')}</i></span>
                <span className="wm-dl-soon">{t('common.comingSoon')}</span>
              </div>
            </div>
            <span className="wm-dl-note">{t.rich('home.final.note1')}</span>
            <span className="wm-dl-note">{t.rich('home.final.note2', null, { a: (c) => <a href="/workcopilot/enterprise">{c}</a> })}</span>
          </div>
        </div>
      </section>

      <ReleaseNote groups={['global', 'privacy', 'billing', 'enterprise']} withHeader />

      <div className="wm-disclaimer-wrap">
        <div className="wm-wrap">
          <p className="wm-disclaimer"><ShieldCheck size={14} /> {t.rich('home.disclaimer')}</p>
        </div>
      </div>

      <SiteFooter />

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
// Code / commands / diffs are always LTR (dir="ltr" on the blocks), even when the
// page is Arabic: the labels translate, the code never does.
function DiffBlock({ file, oldLine, newLine, kind, t }) {
  // Security fixes read "VULNERABLE -> FIXED"; reliability / quality fixes (e.g. a
  // governor-limit bulkify or a scoped rule) read "BEFORE -> AFTER" so the label is
  // always accurate to the change.
  const quality = kind === 'quality'
  const badge = quality ? t('home.demo.beforeAfter') : t('home.demo.vulnFixed')
  const delTag = quality ? t('home.demo.tagBefore') : t('home.demo.tagVuln')
  const addTag = quality ? t('home.demo.tagAfter') : t('home.demo.tagFixed')
  return (
    <div className="wm-diff" dir="ltr">
      <div className="wm-diff-file"><FileText size={12} /> {file}<span className="wm-diff-badge">{badge}</span> <CopyChip text={newLine} /></div>
      <div className="wm-diff-line del"><span className="wm-diff-tag del">{delTag}</span><span className="m">-</span><code>{oldLine}</code></div>
      <div className="wm-diff-line add"><span className="wm-diff-tag add">{addTag}</span><span className="m">+</span><code>{newLine}</code></div>
    </div>
  )
}
// The terminal command, shown as the step's single stage visual (for cmd steps).
function TermBlock({ cmd, t }) {
  return (
    <div className="wm-demo-term" dir="ltr">
      <div className="wm-demo-th">{t('home.demo.terminal')} <CopyChip text={cmd} /></div>
      <code>{cmd}</code>
    </div>
  )
}
// A ready-to-run PROMPT handed off for the user's own AI (WorkCoPilot guides, it
// does not generate for you). Copyable - the "prompt download" action.
function PromptBlock({ text, t }) {
  return (
    <div className="wm-demo-term wm-demo-prompt" dir="ltr">
      <div className="wm-demo-th"><span className="wm-demo-promptlbl"><Sparkles size={11} /> {t('home.demo.promptLbl')}</span> <CopyChip text={text} /></div>
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
function TrustDuo({ nav, t }) {
  const sec = t('home.trust.sec'), priv = t('home.trust.priv')
  const cards = [
    {
      k: 'sec', eyebrow: sec.eyebrow, Mark: ShieldMark,
      title: sec.title,
      points: sec.points,
      proof: <>{sec.chips.map((c) => <span key={c} className="dp-chip">{c}</span>)}<span className="dp-arrow">&rarr;</span><b className="dp-ok"><Check size={11} /> {sec.checked}</b></>,
      link: sec.link,
    },
    {
      k: 'priv', eyebrow: priv.eyebrow, Mark: RedactLockMark,
      title: priv.title,
      points: priv.points,
      // Sample values + tokens are illustrative data, kept LTR and verbatim.
      proof: <span dir="ltr"><span className="dp-raw">jane@acme.com</span><span className="dp-arrow">&rarr;</span><b className="dp-tok">[[EMAIL_1]]</b><span className="dp-raw">sk-live-9f3c</span><span className="dp-arrow">&rarr;</span><b className="dp-tok">[[SECRET_1]]</b></span>,
      link: priv.link,
    },
  ]
  return (
    <div className="wm-duo">
      {cards.map((c, i) => (
        <WorkCard key={c.k} theme="light" tone={c.k === 'priv' ? 'cyan' : undefined} delay={i * 90} texPos={i === 0 ? '0% 0%' : '100% 100%'}>
          <WorkCard.Head align="start" icon={<c.Mark />} eyebrow={c.eyebrow} title={c.title} />
          <WorkCard.Points items={c.points} />
          <WorkCard.Proof>{c.proof}</WorkCard.Proof>
          <WorkCard.Link onClick={() => nav('/workcopilot/security')}>{c.link} <ArrowRight size={14} className="wm-arrow" /></WorkCard.Link>
        </WorkCard>
      ))}
    </div>
  )
}

// The CODE side of each demo scenario - commands, diffs and the ready-to-paste
// prompt. NEVER translated. Indexed [scenario][step] and merged with the prose
// side (home.demo.scenarios in the locale catalog: tag, app, goal, sees, say/do
// or step/how, click, done). Keep both lists the same shape.
/* Note for scripts/check-jsx-imports: the literal <API_KEY> below is a placeholder
   token inside prompt TEXT, not a JSX component (API_KEY is referenced here). */
const DEMO_CODE = [
  [{}, {}, {}],
  [
    { cmd: '$ pip install langchain langgraph chromadb' },
    { diff: { file: 'retriever.py:21', old: 'retriever = store.as_retriever()', new: 'retriever = store.as_retriever(search_kwargs={"k":4,"score_threshold":0.75})' } },
    {},
    { diff: { file: 'agent.py:40', old: 'system = BASE + user_input', new: 'messages = [system(BASE), user(user_input)]' } },
    { prompt: 'Scaffold a tool-calling RAG agent (LangGraph + Chroma). Retrieve top-4 chunks (score >= 0.75), keep user text in a USER turn, allowlist tool args, and use <API_KEY> placeholders - never real secrets.' },
  ],
  [{}, {}, {}, {}],
  [
    { diff: { file: 'Business Rule: Order sync', kind: 'quality', old: 'When: before | Table: Global | Condition: (none)', new: 'When: before | Table: sc_request | Condition: priority = 1' } },
    { diff: { file: 'ACL: sc_request.read', old: 'Requires role: (empty)', new: 'Requires role: catalog_viewer' } },
    {},
  ],
  [
    { diff: { file: 'AccountTrigger.apxt:12', kind: 'quality', old: 'for (Account a : Trigger.new) { Contact c = [SELECT Id FROM Contact WHERE AccountId = :a.Id]; }', new: 'Map<Id,Contact> byAcct = mapContacts(Trigger.new); for (Account a : Trigger.new) { Contact c = byAcct.get(a.Id); }' } },
    { diff: { file: 'AccountTrigger.apxt:20', old: '[SELECT Id, SSN__c FROM Contact WHERE AccountId IN :ids]', new: '[SELECT Id, SSN__c FROM Contact WHERE AccountId IN :ids WITH SECURITY_ENFORCED]' } },
    { diff: { file: 'PaymentService.cls:5', old: 'String key = "sk_live_9f3c2a...";', new: 'req.setEndpoint("callout:Payments/charge"); // Named Credential' } },
  ],
  [
    { diff: { file: 'role-policy.json', old: '"Action": "*",  "Resource": "*"', new: '"Action": ["s3:GetObject","s3:PutObject"], "Resource": "arn:aws:s3:::app-data/*"' } },
    {},
    {},
  ],
]

function LiveDemo({ tilt, untilt, t }) {
  // Each demo is a REAL sequence the copilot walks you through: it READS your
  // screen ("I can see"), tells you the exact next move, CATCHES mistakes and
  // CORRECTS them (code diffs and all). This is the hand-holding, not a step list.
  // Prose comes from the catalog (translated); code from DEMO_CODE (verbatim).
  const demos = t('home.demo.scenarios').map((sc, i) => ({
    ...sc,
    steps: sc.steps.map((st, j) => {
      const code = (DEMO_CODE[i] || [])[j] || {}
      const fix = st.say != null ? { say: st.say, do: st.do } : undefined
      return { ...st, ...code, fix }
    }),
  }))
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
    // d.goal is a dep on purpose: when the language switches (or a lazily loaded
    // dictionary arrives after first paint) the goal text changes, and the
    // typewriter must restart with the translated goal, not keep the old one.
  }, [di, d.goal])
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
      <div className="wm-demo-head"><span className="d r" /><span className="d y" /><span className="d g" /><b>WorkCoPilot</b><span className="wm-demo-live" title={t('home.demo.watchingTitle')}><i />{t('home.demo.watching')}</span><span className="wm-demo-tag">{d.tag}</span></div>
      <div className="wm-demo-goal"><span className="wm-demo-k">{t('home.demo.goal')}</span> {typed}<span className="wm-caret" /></div>
      <div className={`wm-demo-body${show ? ' in' : ''}`}>
        {reveal >= 1 && (
          <div className="wm-demo-sees wm-beat glow" key={'see' + safeSi}><span className="wm-demo-scan" aria-hidden /><span className="wm-demo-seek"><ScanEye size={12} /> {t('home.demo.iCanSee')}</span> {s.sees}</div>
        )}
        {reveal >= 2 && (
          <div className="wm-demo-stage wm-beat" key={'st' + safeSi}>
            {s.diff
              ? <DiffBlock file={s.diff.file} oldLine={s.diff.old} newLine={s.diff.new} kind={s.diff.kind} t={t} />
              : s.prompt
                ? <PromptBlock text={s.prompt} t={t} />
                : s.cmd
                  ? <TermBlock cmd={s.cmd} t={t} />
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
                <div className="wm-demo-fixhead"><AlertTriangle size={13} /> {t('home.demo.holdOn')} <span className="wm-demo-stepno">{t('home.demo.stepOf', { n: safeSi + 1, total: tot })}</span></div>
                <div className="wm-demo-fixsay">{s.fix.say}</div>
                {reveal >= 4 && <div className="wm-demo-fixdo wm-beat"><ArrowRight size={13} className="wm-arrow" /> {s.fix.do}</div>}
              </div>
            ) : (
              <>
                <div className="wm-demo-now wm-beat">
                  <div className="wm-demo-label">{t('home.demo.doThisNow')} <span className="wm-demo-stepno">{t('home.demo.stepOf', { n: safeSi + 1, total: tot })}</span></div>
                  <div key={safeSi} className="wm-demo-step">{s.step}</div>
                </div>
                {reveal >= 4 && (
                  <div className="wm-demo-how wm-beat" key={'h' + safeSi}>
                    <div className="wm-demo-howlabel">{t('home.demo.exactlyHow')}</div>
                    <ol>{(s.how || []).map((h, k) => <li key={k} className="wm-demo-fade" style={{ animationDelay: `${60 + k * 90}ms` }}>{h}</li>)}</ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {reveal >= 4 && <div className="wm-demo-done wm-beat" key={'dn' + safeSi}><Check size={13} /> {t('home.demo.doneWhen', { what: s.done })}</div>}
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
// The hero pairs (headline h + supporting line s) live in the locale catalog as
// home.hero: [{ h: 'Get <em>anything</em> done right...', s: '...' }]. The
// English set mirrors server/store.js HERO_DEFAULT: keep the two identical so
// the fallback paint and the API feed never disagree. heroPairFromText turns the
// <em>..</em> markup into the internal [[text, emFlag?], ...] segments.
function heroPairFromText({ h, s }) {
  const text = String(h || '')
  const segs = []
  const re = /<em>([\s\S]*?)<\/em>/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push([text.slice(last, m.index)])
    segs.push([m[1], 1])
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push([text.slice(last)])
  return { h: segs.length ? segs : [[text]], s: String(s || '') }
}

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
function RotatingHero({ paused, t, locale }) {
  // The rotating copy. The catalog's home.hero (in the visitor's language) is the
  // fallback and the first paint; if the superadmin-editable feed returns a
  // usable set, it swaps in. Only the SOURCE of the pairs is dynamic - the
  // motion, timing and layout are unchanged.
  const BUILT_IN = useMemo(() => (t('home.hero') || []).map(heroPairFromText), [t])
  const [pairs, setPairs] = useState(BUILT_IN)
  // Language switch: swap to that language's built-ins and restart the cycle.
  useEffect(() => { idxRef.current = 0; setPrev(null); setLive(false); setIdx(0); setPairs(BUILT_IN) }, [BUILT_IN])   // eslint-disable-line
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
  // shape, or empty set, keep the built-in pairs - the hero NEVER blanks.
  // ENGLISH ONLY for now: the feed is written in English, so applying it over a
  // translated set would flip the hero back to English. Server hook (documented
  // in the i18n report): GET /api/work/hero?locale=<code> returning pairs in
  // that language; until then, other locales keep their catalog built-ins.
  useEffect(() => {
    if (locale !== 'en') return undefined
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
  }, [locale])

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
/* RTL (Arabic). Flex/grid rows mirror on their own under <html dir="rtl">; the
   few physical-direction rules below are re-declared, arrow glyphs flip, and
   code / commands / diffs stay LTR (dir="ltr" on those blocks). */
[dir="rtl"] .wm-arrow{transform:scaleX(-1)}
[dir="rtl"] .wm-demo-stepno{float:left}
[dir="rtl"] .wm-demo-tag,[dir="rtl"] .wm-diff-badge{margin-left:0;margin-right:auto}
[dir="rtl"] .wm-demo-head b{margin-left:0;margin-right:6px}
[dir="rtl"] .wm-demo-live{margin-left:0;margin-right:10px}
[dir="rtl"] .wm-demo-k{margin-right:0;margin-left:8px}
[dir="rtl"] .wm-caret{margin-left:0;margin-right:3px}
[dir="rtl"] .wm-demo-how li{padding-left:0;padding-right:30px}
[dir="rtl"] .wm-demo-how li:before{left:auto;right:0}
[dir="rtl"] .wm-scr-bar span{margin-left:0;margin-right:8px}
[dir="rtl"] .wm-demo-term code,[dir="rtl"] .wm-diff,[dir="rtl"] .wm-demo-term{direction:ltr;text-align:left}
[dir="rtl"] .wm-roi-arrow svg{transform:scaleX(-1)}
[dir="rtl"] .wm-demo-sees{text-align:right}
/* NOTE: the tokens on this .wm root are the DARK base and are NOT what renders.
   The page is LIGHT by default: the ".wm:not([data-wm=dark])" block at the end
   of this sheet outranks this rule and re-declares every token light (owner,
   2026-10-24: "our site doesn't use darker versions by default"). The shared
   SiteHeader is always light; the shared SiteFooter is the only dark band. */
.wm{--ink:#070810;--panel:#12141d;--line:rgba(255,255,255,.09);--tx:#eef0f6;--mut:#9aa0b4;--em:#8cf5c4;--em2:#39d3ff;--warm:#ffb35c;--warm2:#ff7a59;--chip:rgba(255,255,255,.06);--mx:0;--my:0;
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
.wm-demo{margin-top:46px;background:linear-gradient(180deg,rgba(18,20,29,.96),rgba(10,11,18,.98));border:1px solid var(--line);border-radius:22px;padding:15px 16px;box-shadow:0 50px 100px -40px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .2s ease-out;height:560px;display:flex;flex-direction:column;width:100%;min-width:0;max-width:100%;overflow:hidden}
.wm-demo>*{min-width:0}
.wm-demo-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:2px 4px 14px}
.wm-demo-head b{font-family:"Bricolage Grotesque";margin-left:6px}
.wm-demo-head .d{width:9px;height:9px;border-radius:50%}
.d.r{background:#ff5f57}.d.y{background:#febc2e}.d.g{background:#28c840}
.wm-demo-tag{margin-left:auto;font-size:11px;color:var(--em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 10px}
.wm-demo-goal{font-size:14.5px;line-height:1.45;color:var(--tx);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:11px;padding:9px 12px;min-height:54px;overflow-wrap:anywhere}   /* two lines reserved: no height change between short and long goals */
.wm-demo-k{font-size:10px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-right:8px}
.wm-caret{display:inline-block;width:2px;height:15px;background:var(--em);margin-left:3px;vertical-align:-2px;animation:wmblink 1s step-end infinite}
@keyframes wmblink{50%{opacity:0}}
.wm-demo-body{margin-top:9px;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s;flex:1;display:flex;flex-direction:column}
.wm-demo-body.in{opacity:1;transform:none}
.wm-demo-now{border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.06);border-radius:13px;padding:11px 13px}
.wm-demo-label{font-size:10px;letter-spacing:.14em;color:var(--em);font-weight:700;margin-bottom:5px}
.wm-demo-step{font-weight:600;overflow-wrap:anywhere}
.wm-demo-term{margin-top:9px;border:1px solid #27324a;border-radius:11px;overflow:hidden}
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
.wm-demo-how{margin-top:9px;border:1px solid var(--line);border-radius:12px;padding:9px 11px;background:rgba(255,255,255,.02)}
.wm-demo-howlabel{font-size:10px;letter-spacing:.14em;color:var(--em2);font-weight:700;margin-bottom:6px}
.wm-demo-how ol{margin:0;padding:0;list-style:none;counter-reset:hw;display:flex;flex-direction:column;gap:6px}
.wm-demo-how li{counter-increment:hw;position:relative;padding-left:30px;font-size:13.5px;color:var(--tx);line-height:1.5;overflow-wrap:anywhere}
.wm-demo-how li:before{content:counter(hw);position:absolute;left:0;top:1px;width:21px;height:21px;border-radius:50%;background:linear-gradient(135deg,var(--em),var(--em2));color:#04231a;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px -2px rgba(10,157,102,.6)}
.wm-demo-done{display:flex;align-items:center;gap:7px;margin-top:auto;padding-top:12px;font-size:12px;color:var(--mut)}
.wm-demo-done svg{color:var(--em)}
.wm-demo-steps{display:flex;gap:5px;margin-bottom:8px}
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
.wm-demo-sees{position:relative;display:flex;align-items:center;gap:8px;margin-top:0;padding:8px 11px;border:1px solid rgba(57,211,255,.28);background:rgba(57,211,255,.06);border-radius:11px;font-size:12.5px;color:var(--tx);overflow:hidden;height:44px}
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
.wm-demo-stage{margin-top:12px;min-height:120px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;min-width:0}   /* min-height so long how-steps can wrap and grow instead of being clipped */
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
.wm-best-dots i{width:5px;height:5px;border-radius:50%;background:#0a84c2;opacity:.3;animation:wm-best-pulse 1.4s ease-in-out infinite}
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
/* ENTERPRISE - the flagship tier. A premium dark panel on the light page, with a
   warm orange glow, a hairline orange accent on the top edge, an elegant
   two-column benefit grid and a trust strip. LIGHT panel (dark ink on a warm
   off-white) to match the light page. Orange = the brand accent (--warm / --warm2). */
.wm-ent-sec{padding-top:0}
/* Card grid of enterprise controls - matches the site's card sections (white
   panel, light hairline, soft shadow, green/blue accent tile). The centered
   header uses the shared .wm-eyebrow/.wm-h2/.wm-sub like every other section. */
.wm-ent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:4px 0 0}
.wm-ent-card{background:var(--panel,#fff);border:1px solid var(--line);border-radius:16px;padding:20px 18px;text-align:left;
  box-shadow:0 1px 2px rgba(17,23,38,.04),0 16px 36px -28px rgba(17,23,38,.22);transition:transform .18s ease,border-color .2s ease,box-shadow .2s ease}
.wm-ent-card:hover{transform:translateY(-3px);border-color:rgba(10,134,207,.35);box-shadow:0 1px 2px rgba(17,23,38,.05),0 26px 52px -30px rgba(10,134,207,.34)}
.wm-ent-ic{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;color:#fff;background:linear-gradient(135deg,var(--em),var(--em2));box-shadow:0 8px 18px -10px rgba(10,134,207,.7);margin-bottom:13px}
.wm-ent-card b{display:block;color:var(--ink-brand,#062a22);font-size:15px;font-weight:700;letter-spacing:-.005em;line-height:1.3}
.wm-ent-card i{display:block;font-style:normal;color:var(--mut);font-size:13.5px;line-height:1.5;margin-top:5px}
.wm-ent-cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:34px}
.wm-ent-cta .wm-cta.ghost,.wm-roi-ctas .wm-cta.ghost{background:#fff;color:var(--ink-brand,#062a22);border:1px solid var(--line);box-shadow:0 1px 2px rgba(6,42,34,.05)}
.wm-ent-cta .wm-cta.ghost:hover,.wm-roi-ctas .wm-cta.ghost:hover{border-color:var(--em2);color:var(--em2);transform:translateY(-2px)}
.wm-ent-strip{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;margin-top:20px}
.wm-ent-chip{display:inline-flex;align-items:center;font-size:12px;font-weight:700;letter-spacing:.04em;color:#07784f;background:rgba(10,157,102,.08);border:1px solid rgba(10,157,102,.22);border-radius:999px;padding:6px 13px}
@media(max-width:980px){.wm-ent-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.wm-ent-grid{grid-template-columns:1fr}.wm-ent-cta{width:100%;flex-direction:column;align-items:stretch}.wm-ent-cta .wm-cta{width:100%;justify-content:center}}
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
/* The "*" allowance note under the plan cards: muted, one step smaller than the
   fineprint, same centering rule (.wm .wm-footnote beats .wm p{margin:0}). */
.wm .wm-footnote{text-align:center;color:var(--mut);font-size:12.5px;line-height:1.55;margin:28px auto 0;max-width:68ch;opacity:.9}
.wm .wm-footnote + .wm-fineprint{margin-top:14px}

/* "See the full ..." link row under the fields teaser and the pricing cards */
.wm-fld-more{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:28px}
.wm-fld-browse{display:inline-flex;align-items:center;gap:5px;font-size:13.5px;font-weight:600;color:var(--wm-mut,#5b6676);text-decoration:none}
.wm-fld-browse:hover{color:var(--wm-ink,#0c1222)}

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
/* HOW COMPANIES BENEFIT (ROI) */
/* Outcome chips: FOUR word-chips (not numerals), so the grid is 4-up (a 5-up
   grid left one empty column) and the heading is a chip scale, not a 36px
   stat numeral. Words never break mid-word ("In-\nhouse"): keep-all + no
   hyphens; they wrap only at a space. Cards share one balanced height and the
   same radius/shadow family as the feature cards below them. */
/* ROI band: editorial head (promise left, money sentence right) + ONE focal
   dark "ledger" (Before -> With WorkCoPilot). The ledger is deliberately dark on
   the light page, like the product screens: it is the one thing the eye lands on. */
.wm-roi-head{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:22px 56px;align-items:end;margin-bottom:30px}
.wm-roi .wm-h2{text-align:left;margin:0;max-width:14ch;font-size:clamp(34px,5.2vw,62px);line-height:1}
.wm-roi .wm-eyebrow{margin-bottom:16px}
.wm-roi-lead{margin:0 0 6px;color:var(--tx);font-size:17.5px;line-height:1.55;font-weight:450;text-wrap:pretty}
.wm-roi-lead b{color:var(--ink-brand,#062a22);font-weight:800}
/* Before / With WorkCoPilot: two light columns in the site's card language
   (white surface, brand hairline, emerald->cyan corner glow, soft shadow),
   the "before" column quieter, the "after" column lifted. Site fonts only:
   Bricolage for the headings and labels, Figtree for everything else. */
.wm-roi-split{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1.12fr);gap:18px;align-items:stretch}
.wm-roi-col{position:relative;overflow:hidden;isolation:isolate;border-radius:22px;padding:26px 28px 22px;border:1px solid var(--line);background:var(--panel)}
.wm-roi-col.before{background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.2)),var(--ink);border-color:rgba(17,23,38,.08)}
.wm-roi-col.after{box-shadow:0 1px 2px rgba(10,13,18,.04),0 28px 60px -28px rgba(14,159,110,.45)}
.wm-roi-col.after::before{content:'';position:absolute;inset:0 0 auto 0;height:2px;z-index:3;background:linear-gradient(90deg,#8cf5c4,#39d3ff 55%,transparent)}
.wm-roi-col.after::after{content:'';position:absolute;z-index:-1;pointer-events:none;width:260px;height:260px;right:-90px;top:-140px;border-radius:50%;filter:blur(30px);opacity:.9;
  background:radial-gradient(circle at 62% 60%,rgba(140,245,196,.55),transparent 68%),radial-gradient(circle at 42% 42%,rgba(57,211,255,.40),transparent 70%)}
.wm-roi-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:6px 11px;border-radius:999px;color:var(--mut);background:rgba(17,23,38,.06);margin-bottom:14px}
.wm-roi-tag.ok{color:#07784f;background:rgba(14,159,110,.1);border:1px solid rgba(14,159,110,.28)}
.wm-roi-col h3{margin:0 0 16px;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(20px,2vw,24px);letter-spacing:-.02em;line-height:1.15;color:var(--ink-brand,#062a22)}
.wm-roi-col.before h3{color:var(--tx)}
.wm-roi-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.wm-roi-col li{display:flex;gap:12px;align-items:flex-start;padding:13px 0;border-top:1px solid var(--line)}
.wm-roi-col li b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:15.5px;letter-spacing:-.01em;line-height:1.25;color:var(--tx);margin-bottom:3px}
.wm-roi-col li p{margin:0;font-size:14px;line-height:1.5;color:var(--mut)}
.wm-roi-col.after li p{color:var(--tx);font-size:14.5px}
.wm-roi-col.after li em{font-style:normal;font-weight:700;color:#07784f;text-decoration:underline;text-decoration-color:rgba(14,159,110,.45);text-decoration-thickness:2px;text-underline-offset:3px}
.wm-roi-dot{flex:none;width:22px;height:22px;border-radius:50%;margin-top:1px;border:1.5px dashed rgba(17,23,38,.28)}
.wm-roi-tick{flex:none;width:22px;height:22px;border-radius:50%;margin-top:1px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#10a271,#0a93c4);box-shadow:0 6px 14px -6px rgba(10,147,196,.6)}
.wm-roi-arrow{align-self:center;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--panel);border:1px solid var(--line);color:var(--em);box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -18px rgba(10,13,18,.3)}
.wm-roi-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 24px;margin-top:24px}
.wm-roi-note{display:inline-flex;align-items:center;gap:8px;margin:0;color:var(--mut);font-size:13.5px;line-height:1.4}
.wm-roi-note svg{color:var(--em);flex:none}
.wm-roi-ctas{display:flex;gap:12px;flex-wrap:wrap}
@media(max-width:900px){
  .wm-roi-head{grid-template-columns:1fr;gap:14px;align-items:start}.wm-roi .wm-h2{max-width:none}
  .wm-roi-split{grid-template-columns:1fr;gap:12px}.wm-roi-arrow{transform:rotate(90deg);justify-self:center}
  .wm-roi-foot{flex-direction:column;align-items:stretch}
}
@media(max-width:560px){.wm-roi-col{padding:20px 18px 14px;border-radius:18px}.wm-roi-ctas{flex-direction:column}.wm-roi-ctas .wm-cta{justify-content:center}}
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
.wm-fld-stat b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(28px,3.6vw,40px);letter-spacing:-.02em;background:linear-gradient(120deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.02;word-break:keep-all;overflow-wrap:normal;hyphens:none}
.wm-fld-stat span{display:block;margin-top:6px;color:var(--mut);font-size:13px;line-height:1.35}
/* (the family card grid + tag styles moved with the grid to WorkFields.jsx) */
@media(max-width:560px){.wm-fld-stats{gap:10px;margin-bottom:22px}.wm-fld-stat{padding:14px 8px;border-radius:13px}.wm-fld-stat span{font-size:12px}}
@media(max-width:900px){.wm-sec-grid{grid-template-columns:1fr}.wm-ent-feats{gap:14px 24px}}

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
.wm-dl-btn.primary{position:relative;border-color:rgba(10,157,102,.5);background:linear-gradient(160deg,rgba(10,157,102,.1),var(--panel) 62%)}
.wm-dl-btn.primary:hover{border-color:var(--em)}
.wm-dl-btn.primary svg{color:var(--em)}
.wm-dl-rec{position:absolute;top:-9px;left:16px;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#04231a;background:linear-gradient(135deg,var(--em),var(--em2));border-radius:999px;padding:2px 8px}
.wm-dl-soon{font-size:11px;font-weight:800;letter-spacing:.03em;color:var(--mut);background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}
.wm-dl-note{font-size:12.5px;color:var(--mut)}

/* DISCLAIMER + FOOT */
.wm-disclaimer-wrap{border-top:1px solid var(--line);background:rgba(255,255,255,.015);padding:20px 0}
.wm-disclaimer{display:flex;gap:9px;align-items:flex-start;color:var(--mut);font-size:13px;line-height:1.6;max-width:92ch;margin:0 auto}
.wm-disclaimer svg{color:var(--em);flex-shrink:0;margin-top:3px}.wm-disclaimer b{color:var(--tx)}

@media(max-width:900px){
 /* (min-width:0 on the columns is now global, see .wm-hero-grid>* above.) */
 .wm-hero-grid{grid-template-columns:1fr;gap:38px}
 .wm-demo{margin-top:0}
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
  --em:#0e9f6e; --em2:#0a84c2;
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
