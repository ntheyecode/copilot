import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass, ShieldCheck, Globe2, FileText,
  ArrowRight, Check, Sparkles, Layers, Monitor, Smartphone, AppWindow,
  Lock, Zap, Rocket, Target, ScanEye, ListChecks, AlertTriangle,
  Building2, Download,
  Server, Blocks, Bot, Megaphone, Calculator, Scale, Shapes, Trophy, X, MessageSquareOff,
  FileCheck2, ScrollText, Fingerprint, ClipboardCheck,
  UserCog, Copy, BrainCircuit, Lightbulb,
  MonitorSmartphone, Languages, Palette,
} from 'lucide-react'
// Counts shown on the page come from the registries that ship, never typed:
// the compliance framework set (server/compliance_frameworks.js is pure data,
// imported into the client like work-scrub.js and compute_spec.js already are)
// and the locale registry (the language chips are its own endonyms).
import { COMPLIANCE_FRAMEWORKS } from '../../server/compliance_frameworks.js'
import { LOCALES } from '../i18n/locales.js'
import { BrandMark as AVMark } from '../components/brand/BrandLogo.jsx'   // the edition's brand mark
import SiteHeader from '../components/SiteHeader.jsx'   // shared top nav (one link list, mobile disclosure menu) - same as every inner page
import { revealOnScroll } from '../reveal.js'            // the ONE scroll-reveal mechanism for the site (timing + crawler/print safety)
import SiteFooter from '../components/SiteFooter.jsx'   // shared footer across the whole site
import CopyChip from '../components/CopyChip.jsx'
import WorkCard from '../components/WorkCard.jsx'   // the shared, site-wide premium card primitive
import LiveValidate from '../components/LiveValidate.jsx'   // the "Validate it live" widget (lead gate + live coverage check)
import NotAChatBox from '../components/NotAChatBox.jsx'     // "not another chat box": chat answer vs the guide console, + the three differences
import FieldVignettes from '../components/FieldVignettes.jsx'   // real-screen field photographs, deep-linking to the use-cases showcase
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import OrgPlans from '../components/OrgPlans.jsx'   // organizations-only plans, where personal plans are not sold
import { useEditionView } from '../edition/useCaps.js'
import { CONTACT_PATH } from '../edition/surfaces.js'
import useSeo from '../useSeo.js'
import { useLocale, renderRich, interpolate } from '../i18n/index.jsx'   // every visible string on this page comes from the locale catalog (home.*)
// The plan contract (/api/work/pricing) is read through ONE view model shared
// with the pricing page, so the two can never say different numbers.
import { normalizePricing, planValueLines, planHoursShare, annualMonthlyRate, annualTotal, expiryFootnote, money, hours, PLAN_IDS } from '../pricingModel.js'
import HoursBadge, { HOURS_BADGE_CSS } from '../components/HoursBadge.jsx'
// The field roster lives ONCE, on the /fields page; the teaser below imports
// its numbers so the headline count can never drift from the full list.
import { FIELD_FAMILIES, FIELD_TOTAL } from './WorkFields.jsx'

// AdmireVeda WorkCoPilot - marketing landing (admireveda.com).
// Motion-rich, benefits-first. Never names a model, never mentions limits.
// LOCALIZED: all copy is read through t() from src/i18n/locales/<code>.js;
// icons, routes, prices, commands and code stay here (never translated).
//
// PAGE MAP (owner sales reality check, 2026-10-26: "this page is like a book,
// shorten and make your point straight"): every section earns its place once,
// in order, and every block leads with the payoff, one line each.
//   HERO       one promise + one short line + CTAs + three trust cues + live demo
//   HOW        four benefit tiles (say the goal -> next move -> caught -> documented)
//   NOT A CHAT the duel (chat pane vs guide console) + three difference cards
//   FIELDS     one strip of eight field chips
//   PROOF      security + privacy, one card each
//   PROVE      proof + compliance: four facts beside ONE dark audit-log card
//              (report, audit log, authenticity seal, per-task compliance)
//   ENTERPRISE one section: the before/after ledger, then the four "how a
//              company runs" cards (roles + flows, team templates, company
//              brain + knowledge spaces, recommended practices) + control chips
//   EVERYWHERE platforms (desktop + MSI, Android, web, on-device OCR),
//              languages (from the locale registry), personalization
//   PRICING    the plan cards
//   FINAL CTA
// 2026-10-28: PROVE, the enterprise "runs" cards and EVERYWHERE were added so
// the page reflects what ships (docs/product/PRODUCT-DOCUMENTATION.md is the
// catalog of record); the pricing lines moved to documents-on-every-plan and
// open-task slots.
// Removed in this pass: the "best model" band with its mono plan/guide/watch/
// correct receipt (mechanism, not benefit; its promise is now the HOW eyebrow),
// the "any app" glyph strip (now one trust cue), the hidden people / pillars /
// three-step / ways sections and their graphics (dead code), and every
// multi-sentence paragraph in the catalog (src/i18n/locales/en.js, home.*).
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

  // Fonts are self-hosted and loaded globally in src/main.jsx.

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

  // Scroll reveals: the shared site mechanism (src/reveal.js) - reveal as soon
  // as an element enters the viewport, short fade, never opacity 0 for a
  // crawler, reduced motion or print.
  useEffect(() => revealOnScroll(rootRef.current, (el) => el.classList.add('in')), [price])

  // Hero headline rotation holds while the pointer or keyboard focus is in the hero.
  const [heroHover, setHeroHover] = useState(false)
  const [heroFocus, setHeroFocus] = useState(false)

  const [cycle, setCycle] = useState('monthly')   // 'monthly' | 'annual' (annual = 20% off)
  // Subscribe onboarding (/workcopilot/signup): the plan + cycle ride along in the
  // URL; a signed-in visitor lands on its pay step (which also knows when the
  // account already has an active plan and never charges twice).
  // Organizations-only edition (no personal sign-up): every "start" leads to
  // the sales conversation instead of the personal sign-up.
  const ed = useEditionView()
  const go = (plan, cyc, signedIn) => {
    if (!ed.soloSignup) return nav(CONTACT_PATH)
    const qs = []
    if (plan) qs.push(`plan=${plan}`)
    if (cyc && cyc !== 'monthly') qs.push(`cycle=${cyc}`)
    return nav(`/workcopilot/signup${signedIn ? '/pay' : ''}${qs.length ? `?${qs.join('&')}` : ''}`)
  }
  const { user } = useAuth()
  // Choose a plan. Annual (20% off) is carried with the cycle so the correct
  // annual price is applied at checkout; we never start a monthly checkout for
  // an annual selection (the pay step falls back visibly when annual is not wired).
  const choosePlan = (plan) => go(plan, cycle, !!user)
  // Annual = 20% off the monthly rate, shown as a per-month figure billed yearly;
  // ONE definition shared with /workcopilot/pricing (pricingModel). money and
  // annualTotal are imported from there, not redefined here.
  const monthlyRate = (p) => (cycle === 'annual' ? annualMonthlyRate(p) : Number(p))
  const tilt = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; e.currentTarget.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-4px)` }
  const untilt = (e) => { e.currentTarget.style.transform = '' }

  // HOW tiles: icon + tone per step; the title and the one-line payoff come
  // from home.how.steps in the catalog (same order).
  const howMeta = [
    { ic: Target, tone: '' },
    { ic: Compass, tone: 'cyan' },
    { ic: AlertTriangle, tone: 'amber' },
    { ic: ListChecks, tone: 'violet' },
  ]
  const howSteps = t('home.how.steps').map((s, i) => ({ ...howMeta[i], ...s }))
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
    { id: 'general', ic: Layers, tone: 'amber' },
  ]
  const cards = t('home.fields.cards').map((c, i) => ({ ...cardMeta[i], ...c }))
  const marquee = t('home.marquee')
  // The three trust cues under the hero CTAs (icon here, text in home.cues).
  const cueIcons = [AppWindow, Lock, Zap]
  // PROVE: the four proof facts (icon here, copy in home.prove.points, same
  // order). The framework count is the canonical registry's length.
  const FRAMEWORK_COUNT = COMPLIANCE_FRAMEWORKS.length
  const proveIcons = [ScrollText, ClipboardCheck, Fingerprint, FileCheck2]
  const provePoints = t('home.prove.points').map((p, i) => ({ ...p, ic: proveIcons[i] || Check, d: interpolate(p.d, { n: FRAMEWORK_COUNT }) }))
  // ENTERPRISE "how a company runs" cards: icon + tone here, copy in
  // home.roi.run.cards (same order).
  const runMeta = [
    { ic: UserCog, tone: '' },
    { ic: Copy, tone: 'cyan' },
    { ic: BrainCircuit, tone: 'violet' },
    { ic: Lightbulb, tone: 'amber' },
  ]
  const runCards = t('home.roi.run.cards').map((c, i) => ({ ...runMeta[i], ...c }))
  // EVERYWHERE cards. The language card's chips are the registry endonyms of
  // every translated (non-English) locale, each tagged with its own language so
  // the browser picks the right script font; {n} is that count.
  const LANGS = LOCALES.filter((l) => !l.code.startsWith('en'))
  const everyMeta = [
    { ic: MonitorSmartphone, tone: 'cyan' },
    { ic: Languages, tone: '' },
    { ic: Palette, tone: 'amber' },
  ]
  const everyCards = t('home.everywhere.cards').map((c, i) => ({
    ...everyMeta[i], ...c,
    d: interpolate(c.d, { n: LANGS.length }),
    chips: i === 1 ? LANGS.map((l) => ({ k: l.code, label: l.name, lang: l.tag, dir: l.dir })) : (c.chips || []).map((ch) => ({ k: ch, label: ch })),
  }))
  // Every plan number on the cards comes from the live server pricing
  // (/api/work/pricing -> store.getWorkPricing()): plans, hour, hoursMonthly
  // (guided hours included per calendar month) and hoursExpiry (forfeit |
  // carryforward); there is no per-day task cap. It is read through the ONE view
  // model in src/pricingModel.js, shared with /workcopilot/pricing, so a
  // superadmin change in Admin > Pricing flows to both pages identically and
  // no number is ever typed into copy. A field the API does not carry is simply
  // not shown: nothing is invented.
  const model = useMemo(() => normalizePricing(price), [price])
  const staticFeats = (id) => t(`home.pricing.feats.${id}`) || []
  const PLAN_NAME = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }   // product names: never translated
  const tiers = model ? PLAN_IDS.map((id) => ({
    id, name: PLAN_NAME[id], price: model.plans[id], popular: id === 'advanced',
    hrs: model.hoursMonthly[id], share: planHoursShare(model, id),
    // The hours line is the card's hero (HoursBadge below), so it is not
    // repeated as a bullet; the expiry line and the static features remain.
    feats: [...planValueLines(model, id, t, { heroHours: true }), ...staticFeats(id)], hour: model.hour[id],
  })) : []

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
            {/* Trust cues: the three facts a buyer checks first, one short line
                each, under the CTAs (replaces the former "any app" glyph strip). */}
            <ul className="wm-cues" data-reveal aria-label={t('home.cuesAria')}>
              {t('home.cues').map((c, i) => {
                const Ic = cueIcons[i] || Check
                return <li key={c}><Ic size={14} aria-hidden="true" /> {c}</li>
              })}
            </ul>
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

      {/* HOW - the core value in one glance: four benefit tiles in the order a
          task happens. The eyebrow carries the "planned by the strongest AI
          available to you" promise (a benefit; never a vendor or model name,
          never the routing behind it). Keeps the #how and #best-model anchors. */}
      <section className="wm-sec wm-how" id="how">
        <span id="best-model" aria-hidden="true" />
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Trophy size={14} /> {t('home.how.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t.rich('home.how.h2')}</h2>
          <div className="wm-how-grid">
            {howSteps.map((s, i) => (
              <WorkCard key={s.t} theme="light" tone={s.tone || undefined} delay={i * 80} texPos={`${(i * 33) % 100}% ${i % 2 ? '100%' : '0%'}`}>
                <span className="wm-how-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <WorkCard.Head align="start" icon={<s.ic size={18} />} title={s.t} />
                <WorkCard.Body>{s.d}</WorkCard.Body>
              </WorkCard>
            ))}
          </div>
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta alt" href="/workcopilot/how-it-works">{t('home.how.link')} <ArrowRight size={15} className="wm-arrow" /></a>
          </div>
        </div>
      </section>

      {/* NOT ANOTHER CHAT BOX (owner, 2026-10-27: "people think you are another
          ChatGPT"). The same request side by side: a chat box hands back a
          paragraph and leaves you on your own; the guide console walks the task
          on the real screen, catches the wrong turn and confirms the finish.
          Then the three things a chat box never does, as three cards.
          PLACEMENT RULE: this section sits BELOW "How it works", never directly
          under the hero. Its comparison frame carries a dark console, and the
          hero already ends on one; stacked, the two read as "two black boxes
          one after the other" (owner, 2026-10-27). The four light How cards
          are the required separator, so the console here reads as a callback
          to the hero, not a repeat. Keep that order when adding sections. */}
      <section className="wm-sec wm-notchat" id="not-a-chat-box">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><MessageSquareOff size={14} /> {t('notChat.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t.rich('notChat.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('notChat.sub')}</p>
          <div data-reveal><NotAChatBox scenarioId="finance" /></div>
        </div>
      </section>

      {/* FIELDS - breadth in one compact strip: headline, one line, eight
          field chips (each deep-links to its use case) and the two roster links.
          The full 10-family grid lives on /workcopilot/fields; the numbers come
          from the roster exported by that page, so they can never drift. */}
      <section className="wm-sec wm-fields" id="fields">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Shapes size={14} /> {t('home.fields.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t.rich('home.fields.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.fields.sub', { total: FIELD_TOTAL, families: FIELD_FAMILIES.length })}</p>
          <div className="wm-fld-chips" data-reveal aria-label={t('home.fields.statsAria')}>
            {cards.map((c) => (
              <button key={c.id} type="button" className={`wm-fld-chip${c.tone ? ` t-${c.tone}` : ''}`} onClick={() => nav(`/workcopilot/use-cases#${c.id}`)}>
                <span className="wm-fld-chip-ic"><c.ic size={16} /></span>
                <span className="wm-fld-chip-t"><b>{c.k}</b><i>{c.d}</i></span>
                <ArrowRight size={14} className="wm-arrow wm-fld-chip-go" aria-hidden="true" />
              </button>
            ))}
          </div>
          {/* Four real-screen vignettes (finance, healthcare, logistics,
              engineering): each opens that field's guided session in the
              use-cases showcase. Lazy, sized, below the fold. */}
          <div className="wm-fv" data-reveal>
            <FieldVignettes ids={['finance', 'healthcare', 'logistics', 'engineering']} />
          </div>
          <div className="wm-fld-more" data-reveal>
            <button className="wm-cta alt" onClick={() => nav('/workcopilot/use-cases')}>{t('home.fields.exploreAll')} <ArrowRight size={15} className="wm-arrow" /></button>
            <a className="wm-fld-browse" href="/workcopilot/fields">{t('home.fields.browseAll', { total: FIELD_TOTAL })} <ArrowRight size={13} className="wm-arrow" /></a>
          </div>
        </div>
      </section>

      {/* PROOF - security + privacy, the two facts a buyer checks before trusting
          a tool on real work. Each card shows a real sample (checked chips, a
          redaction token swap) and both route to the showcase page. */}
      <section className="wm-sec wm-proof" id="proof">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><ShieldCheck size={14} /> {t('home.trust.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t('home.trust.h2')}</h2>
          <TrustDuo nav={nav} t={t} />
          <div className="wm-sec-paper" data-reveal>
            <a className="wm-cta" href="/workcopilot/security"><ScanEye size={16} /> {t('home.trust.ctaShow')}</a>
            <a className="wm-cta alt" href="/api/work/security-paper.pdf" target="_blank" rel="noopener"><FileText size={16} /> {t('home.trust.ctaPaper')}</a>
          </div>
        </div>
      </section>

      {/* PROVE - proof and compliance: what a task leaves behind. Four facts
          (task report, audit log, authenticity seal, per-task compliance) in
          light tiles beside ONE dark product card, an illustrative audit log
          ending in the seal and the framework chips. The dark card on the light
          page is the site's depth-contrast signature; it follows the light
          PROOF duo, never the hero (the "two black boxes" rule above). The
          framework count and names come from the canonical registry. One
          orange CTA, to the compliance roll-call on the security page. */}
      <section className="wm-sec wm-prove" id="proof-of-work">
        <span id="compliance" aria-hidden="true" />
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><FileCheck2 size={14} /> {t('home.prove.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t.rich('home.prove.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.prove.sub')}</p>
          <div className="wm-prove-grid">
            <ul className="wm-prove-points" data-reveal>
              {provePoints.map((p) => (
                <li key={p.t}>
                  <span className="wm-prove-ic" aria-hidden="true"><p.ic size={18} /></span>
                  <div><b>{p.t}</b><p>{p.d}</p></div>
                </li>
              ))}
            </ul>
            <AuditLogCard t={t} />
          </div>
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta" href="/workcopilot/security#compliance">{t('home.prove.cta')} <ArrowRight size={16} className="wm-arrow" /></a>
          </div>
        </div>
      </section>

      {/* ENTERPRISE - the ONE companies-and-teams section (owner, 2026-10-26:
          the page had two). The money argument is the focal ledger: the budget
          lines a decision-maker pays for plus the people lines (workload, stress,
          keeping good people), Before -> With WorkCoPilot.
          Qualitative outcomes only, no invented numbers; "weeks -> days" is the
          one approved relative shape. The enterprise controls are a chip row
          under the ledger (the full feature list is the enterprise page), and
          the two CTAs go to contact and to that page. The section keeps BOTH
          anchors (#enterprise on the section, #roi inside) so no old link dies. */}
      {ed.companies && (
      <section className="wm-sec wm-roi" id="enterprise">
        <span id="roi" aria-hidden="true" />
        <div className="wm-wrap">
          <div className="wm-roi-head">
            <div>
              <div className="wm-eyebrow" data-reveal><Building2 size={14} /> {t('home.roi.eyebrow')}</div>
              <h2 className="wm-h2" data-reveal>{t('home.roi.h2')}</h2>
            </div>
            <p className="wm-roi-lead" data-reveal>{t.rich('home.roi.lead')}</p>
          </div>

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

          {/* How a company runs: roles + work flows, team templates, the company
              brain with knowledge spaces, recommended practices. Four shared
              WorkCards; the chips are each card's proof strip. Copy in
              home.roi.run (same order as runMeta). */}
          <div className="wm-run">
            <div className="wm-run-head" data-reveal>
              <h3>{t('home.roi.run.h3')}</h3>
              <p>{t('home.roi.run.sub')}</p>
            </div>
            <div className="wm-run-grid">
              {runCards.map((c, i) => (
                <WorkCard key={c.t} theme="light" tone={c.tone || undefined} delay={i * 80} texPos={`${(i * 41) % 100}% ${i % 2 ? '0%' : '100%'}`}>
                  <WorkCard.Head align="start" icon={<c.ic size={18} />} title={c.t} />
                  <WorkCard.Body>{c.d}</WorkCard.Body>
                  <WorkCard.Proof>{c.chips.map((ch) => <span key={ch} className="dp-chip">{ch}</span>)}</WorkCard.Proof>
                </WorkCard>
              ))}
            </div>
          </div>

          {/* Enterprise controls, as chips: the assurance line under the money line. */}
          <div className="wm-roi-controls" data-reveal aria-label={t('home.enterprise.stripAria')}>
            <span className="wm-roi-controls-lbl"><ShieldCheck size={14} /> {t('home.roi.controlsLbl')}</span>
            <div className="wm-ent-strip">
              {t('home.enterprise.chips').map((c) => (
                <span key={c} className="wm-ent-chip">{c}</span>
              ))}
            </div>
          </div>

          <div className="wm-roi-foot" data-reveal>
            <p className="wm-roi-note"><Lock size={14} /> {t('home.roi.note')}</p>
            <div className="wm-roi-ctas">
              <a className="wm-cta" href="/workcopilot/contact">{t('home.roi.ctaTeam')} <ArrowRight size={16} className="wm-arrow" /></a>
              <a className="wm-cta ghost" href="/workcopilot/enterprise">{t('home.roi.ctaEnt')} <ArrowRight size={15} className="wm-arrow" /></a>
            </div>
          </div>
        </div>
      </section>

      )}

      {/* EVERYWHERE - platforms, languages, personalization: three shared
          WorkCards. The language chips are the locale registry's endonyms
          (each tagged lang= so the browser picks the right script font) and
          the count in the copy is that registry's length; the platform and
          theme chips are catalog copy. No CTA of its own: the download strip in
          the final section is the action for this content. */}
      <section className="wm-sec wm-every" id="everywhere">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><MonitorSmartphone size={14} /> {t('home.everywhere.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t.rich('home.everywhere.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.everywhere.sub')}</p>
          <div className="wm-every-grid">
            {everyCards.map((c, i) => (
              <WorkCard key={c.t} theme="light" tone={c.tone || undefined} delay={i * 80} texPos={`${(i * 37) % 100}% ${i % 2 ? '100%' : '0%'}`}>
                <WorkCard.Head align="start" icon={<c.ic size={18} />} title={c.t} />
                <WorkCard.Body>{c.d}</WorkCard.Body>
                <WorkCard.Proof>{c.chips.map((ch) => <span key={ch.k} className="dp-chip" lang={ch.lang} dir={ch.dir}>{ch.label}</span>)}</WorkCard.Proof>
              </WorkCard>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING. Where personal plans are not sold (organizations only), the
          section shows the organization plans instead (same anchor). */}
      {!ed.individualPlans ? (
      <section className="wm-sec wm-pricing" id="pricing">
        <div className="wm-wrap">
          <div className="wm-eyebrow" data-reveal><Zap size={14} /> {t('home.pricing.eyebrow')}</div>
          <h2 className="wm-h2" data-reveal>{t('home.pricing.h2')}</h2>
          <p className="wm-sub" data-reveal>{t('home.pricing.sub')}</p>
          <OrgPlans compact />
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta alt" href="/workcopilot/pricing">{t('home.pricing.fullCompare')} <ArrowRight size={15} className="wm-arrow" /></a>
          </div>
        </div>
      </section>
      ) : (
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
                {/* HOURS are the hero: the badge's ring arc fills with this plan's
                    share of the largest plan's monthly hours (same model, same numbers). */}
                <HoursBadge size="sm" hours={tier.hrs == null ? null : hours(tier.hrs)} share={tier.share} unit={t('pricing.badgeUnit')} sub={t('pricing.badgeSub')} loadingLabel={t('pricing.loading')} />
                <div className="wm-tier-price">{money(monthlyRate(tier.price))}<span>{t('common.perMonth')}</span></div>
                {cycle === 'annual'
                  ? <div className="wm-tier-cyc"><s>{money(tier.price)}{t('common.perMonth')}</s> {t('home.pricing.billedAnnually')} &middot; {money(annualTotal(tier.price))}{t('common.perYear')}</div>
                  : <div className="wm-tier-cyc dim">{t('home.pricing.billedMonthly')}</div>}
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
          {/* The one note under the cards: what happens to unused hours, worded
              for the expiry mode the API reports (carry forward, with or without
              a cap, or a monthly reset). Muted and smaller. */}
          {model && <p className="wm-footnote" data-reveal>{expiryFootnote(model, t)}</p>}
          {model && model.image.premium != null && model.imageMinBulk != null && <p className="wm-fineprint" data-reveal>{t('home.pricing.fineprint', { price: money(model.image.premium), min: model.imageMinBulk })}</p>}
          {/* The full entitlement matrix (every row, every plan, the fine print)
              lives on /workcopilot/pricing; the main page keeps only the cards. */}
          <div className="wm-fld-more" data-reveal>
            <a className="wm-cta alt" href="/workcopilot/pricing">{t('home.pricing.fullCompare')} <ArrowRight size={15} className="wm-arrow" /></a>
          </div>
        </div>
      </section>
      )}

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
            <span className="wm-dl-note">{t.rich('home.final.note2', null, { a: (c) => <a href="/workcopilot/enterprise">{c}</a> })}</span>
          </div>
        </div>
      </section>

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
// The PROVE section's dark product card: an illustrative audit log for one
// task (six lines, mono), the sealed-report line, and the framework chips. Line
// copy is translated (home.prove.log); the clock times, the hash fragment and
// the framework names are data and stay LTR. The framework names and count are
// the canonical registry (server/compliance_frameworks.js), so this card can
// never advertise a framework the compliance report does not map.
const LOG_FRAMEWORKS_SHOWN = 6
function AuditLogCard({ t }) {
  const log = t('home.prove.log')
  const names = COMPLIANCE_FRAMEWORKS.map((f) => f.name)
  return (
    <div className="wm-log" data-reveal>
      <div className="wm-log-head"><span className="d r" /><span className="d y" /><span className="d g" /><b>{log.title}</b><span className="wm-log-task">{log.task}</span></div>
      <ol className="wm-log-lines" aria-label={log.title}>
        {log.lines.map((l, i) => (
          <li key={i} className={`s-${l.s}`}>
            <span className="wm-log-at" dir="ltr">{l.at}</span>
            <span className="wm-log-k">{l.k}</span>
            <span className="wm-log-m">
              {l.s === 'ok' && <Check size={11} strokeWidth={3} aria-hidden="true" />}
              {l.s === 'warn' && <AlertTriangle size={11} aria-hidden="true" />}
              {l.m}
            </span>
          </li>
        ))}
      </ol>
      <div className="wm-log-seal"><Fingerprint size={14} aria-hidden="true" /> <b>{log.sealed}</b> <code dir="ltr">sha256:9f3c2a...b71e</code></div>
      <div className="wm-log-fw">
        <span className="wm-log-fwlbl">{t('home.prove.frameworksLbl', { n: names.length })}</span>
        {names.slice(0, LOG_FRAMEWORKS_SHOWN).map((n) => <span key={n} className="wm-log-chip" dir="ltr">{n}</span>)}
        {names.length > LOG_FRAMEWORKS_SHOWN && <span className="wm-log-chip more">{t('home.prove.more', { n: names.length - LOG_FRAMEWORKS_SHOWN })}</span>}
      </div>
    </div>
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
      {/* QA L11: while the goal is still being typed the card is not an empty
          dark box. It shows the screen it is watching (the stylized app window
          with a scan sweep), so the WATCHING pill has something to watch from
          the first frame. Purely visual, no copy to translate. */}
      {!show && (
        <div className="wm-demo-idle" aria-hidden="true">
          <div className="wm-demo-sees"><span className="wm-demo-scan" /><span className="wm-demo-seek"><ScanEye size={12} /> {t('home.demo.iCanSee')}</span><span className="wm-demo-idle-line" /></div>
          <div className="wm-scr wm-scr-idle"><div className="wm-scr-bar"><i /><i /><i /><span>{d.app}</span></div><div className="wm-scr-body"><span className="wm-scr-row" /><span className="wm-scr-row w70" /><span className="wm-scr-row w45" /></div></div>
        </div>
      )}
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
        // Only a superadmin OVERRIDE replaces the catalog copy. The server also
        // ships its own built-in default set (custom:false); applying that
        // would let stale server defaults overwrite the vetted catalog hero.
        if (!data.custom) return
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

.wm-cta{background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s,box-shadow .15s}
.wm-cta:hover{transform:translateY(-2px);box-shadow:0 18px 44px -14px rgba(255,122,89,.75)}
.wm-cta.sm{padding:9px 15px;font-size:14px;border-radius:11px}
.wm-cta.big{padding:17px 30px;font-size:17px}
.wm-cta.alt{background:rgba(255,255,255,.04);color:var(--tx);border:1px solid rgba(255,255,255,.18);box-shadow:none}
.wm-cta.alt:hover{border-color:var(--em);color:var(--em)}
/* Reveal fade: .3s (src/reveal.js REVEAL_MS). It used to be .75s on a 12%
   threshold, which left whole screens blank on a phone while scrolling. */
.wm [data-reveal]{opacity:0;transform:translateY(14px);transition:opacity .3s cubic-bezier(.2,.7,.2,1),transform .3s cubic-bezier(.2,.7,.2,1)}
.wm [data-reveal].in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.wm [data-reveal]{opacity:1;transform:none;transition:none}}
/* The two rotating hero stages are reserved at the height of their TALLEST line
   (set inline, same value for every pair), so a rotation never changes the box
   and nothing under the headline moves. The reveal transition is re-declared
   here (opacity + transform only; no height animation, there is no height change
   to animate) and className stays static so the reveal "in" class is never
   overwritten by a re-render. */
.wm .wm-h1-stage[data-reveal],.wm .wm-lead-stage[data-reveal]{transition:opacity .3s cubic-bezier(.2,.7,.2,1),transform .3s cubic-bezier(.2,.7,.2,1)}

/* HERO */
.wm-hero{padding:78px 0 0;position:relative}
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
/* Hero controls: the two CTAs in one aligned row. */
.wm-hero-cta{display:flex;align-items:center;flex-wrap:wrap;gap:12px}
/* Trust cues under the CTAs: three short facts, stacked (one per line, so
   they can never wrap into each other at any width). */
.wm-cues{list-style:none;margin:26px 0 0;padding:0;display:flex;flex-direction:column;gap:9px;font-size:14px;color:var(--tx);max-width:520px}
.wm-cues li{display:flex;align-items:flex-start;gap:8px;line-height:1.4}
.wm-cues li svg{color:var(--em);flex:none;margin-top:3px}
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
/* Idle state while the goal types (L11): the watched screen, so the box is never
   empty. It is swapped for the walkthrough body the moment the goal is in. */
.wm-demo-idle{margin-top:9px;display:flex;flex-direction:column;animation:wm-demo-fade .3s ease-out both}
.wm-demo-idle-line{display:inline-block;flex:1 1 auto;height:8px;max-width:46%;border-radius:4px;background:rgba(255,255,255,.08)}
.wm-scr-idle .wm-scr-body{height:132px;justify-content:flex-start}
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
@media(max-width:900px){.wm-duo{grid-template-columns:1fr;gap:14px;margin-top:34px}}

/* MARQUEE */
.wm-marquee{margin-top:60px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.wm-marquee-row{display:flex;gap:40px;width:max-content;animation:wmscroll 40s linear infinite;color:var(--mut);font-size:14px;font-weight:500;white-space:nowrap}
.wm-marquee-row span{opacity:.75}
@keyframes wmscroll{to{transform:translateX(-50%)}}

/* HOW - four benefit tiles in task order (shared WorkCard shell). 4-up, 2-up
   under 900px, 1-up under 560px; min-width:0 so a long title wraps inside. */
.wm-how{border-top:1px solid var(--line)}
.wm-how-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:30px}
.wm-how-grid .wc-card{min-width:0}
.wm-how-n{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;font-weight:600;letter-spacing:.1em;color:var(--wc-ink,#0a7fa8)}
@media(max-width:900px){.wm-how-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wm-how-grid{grid-template-columns:1fr;gap:12px}}

/* SECTIONS */
.wm-sec{padding:58px 0}
/* Alignment rule: everything from the top of the page through the best-model
   hero stays LEFT (hero h1/.wm-lead). Every section
   below the band centers its header stack - eyebrow, h2, sub - the way the
   final CTA already does. .wm-h2/.wm-sub only appear below the band, so the
   centering lives here at class level; card interiors are untouched (they do
   not inherit from these rules). The scoped .wm-sec .wm-eyebrow rule leaves
   the band's own eyebrow left-aligned. */
.wm-h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(28px,4.2vw,44px);letter-spacing:-.025em;line-height:1.06;max-width:20ch;margin:0 auto 14px;text-align:center;text-wrap:balance}
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
/* Enterprise control chips (inside the single enterprise section, see
   .wm-roi-controls). Chips never wrap mid-label: nowrap + the row wraps. */
.wm-roi-ctas .wm-cta.ghost{background:#fff;color:var(--ink-brand,#062a22);border:1px solid var(--line);box-shadow:0 1px 2px rgba(6,42,34,.05)}
.wm-roi-ctas .wm-cta.ghost:hover{border-color:var(--em2);color:var(--em2);transform:translateY(-2px)}
.wm-ent-strip{display:flex;flex-wrap:wrap;gap:9px}
.wm-ent-chip{display:inline-flex;align-items:center;white-space:nowrap;font-size:12px;font-weight:700;letter-spacing:.04em;color:#07784f;background:rgba(10,157,102,.08);border:1px solid rgba(10,157,102,.22);border-radius:999px;padding:6px 13px}
.wm-tier{border:1px solid var(--line);border-radius:22px;padding:28px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.008));position:relative;display:flex;flex-direction:column}
.wm-tier.pop{border-color:rgba(140,245,196,.5);background:linear-gradient(180deg,rgba(140,245,196,.1),rgba(255,255,255,.01));box-shadow:0 40px 80px -40px rgba(140,245,196,.55)}
.wm-tier-tag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--em),var(--em2));color:#042;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px}
.wm-tier-name{font-family:"Bricolage Grotesque";font-weight:800;font-size:21px}
.wm-tier-price{font-family:"Bricolage Grotesque";font-weight:800;font-size:48px;letter-spacing:-.03em;margin:4px 0 0}
.wm-tier-price span{font-size:17px;color:var(--mut);font-weight:400}
.wm-tier-mins{color:var(--mut);font-size:12px;line-height:1.5;margin:6px 0 20px}
/* the hours hero on the teaser cards: page tokens -> badge tokens */
.wm .hbg{--hbg-a:var(--em);--hbg-b:var(--em2);--hbg-ink:var(--tx);--hbg-mut:var(--mut);--hbg-track:var(--line);--hbg-disc:var(--panel);margin:12px auto 6px}
.wm:not([data-wm="dark"]) .hbg{--hbg-track:#dde3ee}
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

/* colored eyebrow kicker (kills grey, ties sections to brand) */
.wm-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wm-eyebrow svg{color:var(--em)}
/* SECURITY / ENTERPRISE BAND */
.wm-sec-paper{display:flex;flex-direction:column;align-items:center;gap:9px;margin-top:28px;text-align:center}
.wm-sec-paper span{color:var(--mut);font-size:14px;max-width:54ch}
/* ROI band: editorial head (promise left, money sentence right) + ONE focal
   dark "ledger" (Before -> With WorkCoPilot). The ledger is deliberately dark on
   the light page, like the product screens: it is the one thing the eye lands on. */
.wm-roi-head{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:22px 56px;align-items:end;margin-bottom:30px}
.wm-roi .wm-h2{text-align:left;margin:0;max-width:14ch;font-size:clamp(34px,5.2vw,62px);line-height:1}
/* The head is left-aligned (editorial), so the eyebrow sits flush with the h2
   rather than centering like the other sections' eyebrows. */
.wm-roi .wm-eyebrow{margin-bottom:16px;margin-left:0;margin-right:0}
.wm-roi-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-top:24px;padding-top:20px;border-top:1px solid var(--line)}
.wm-roi-controls-lbl{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;flex-shrink:0;font-size:12.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-brand,#062a22)}
.wm-roi-controls-lbl svg{color:var(--em);flex:none}
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
/* FIELDS - one compact strip: eight field chips in a 4-up grid (2-up under
   900px, 1-up under 560px). Each chip is a real button that deep-links to its
   use case: icon tile, bold title, one-line blurb, arrow. Titles never wrap
   mid-word; the blurb wraps. .wm-sub carries NO bottom margin (the page's
   .wm p reset wins), so the grid owns the gap below the subhead. */
.wm-fields{border-top:1px solid var(--line)}
.wm-fld-chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:26px 0 0}
.wm-fld-chip{display:flex;align-items:center;gap:11px;min-width:0;text-align:left;font:inherit;color:var(--tx);cursor:pointer;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 13px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 30px -24px rgba(17,23,38,.2);transition:transform .15s ease,border-color .2s ease,box-shadow .2s ease}
.wm-fld-chip:hover{transform:translateY(-2px);border-color:var(--em);box-shadow:0 1px 2px rgba(17,23,38,.05),0 22px 44px -26px rgba(17,23,38,.3)}
.wm-fld-chip-ic{display:inline-flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;border-radius:10px;color:var(--em);background:rgba(14,159,110,.1)}
.wm-fld-chip.t-cyan .wm-fld-chip-ic{color:var(--em2);background:rgba(10,132,194,.1)}
.wm-fld-chip.t-violet .wm-fld-chip-ic{color:#6d4bd8;background:rgba(109,75,216,.1)}
.wm-fld-chip.t-amber .wm-fld-chip-ic{color:#b45f12;background:rgba(255,154,77,.14)}
.wm-fld-chip.t-pink .wm-fld-chip-ic{color:#b8286b;background:rgba(232,72,138,.1)}
.wm-fld-chip-t{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto}
.wm-fld-chip-t b{font-size:14px;font-weight:700;letter-spacing:-.005em;line-height:1.25;color:var(--ink-brand,#062a22);overflow-wrap:anywhere}
.wm-fld-chip-t i{font-style:normal;font-size:12.5px;line-height:1.35;color:var(--mut)}
.wm-fld-chip-go{flex:none;color:var(--mut);transition:transform .15s ease,color .2s ease}
.wm-fld-chip:hover .wm-fld-chip-go{color:var(--em);transform:translateX(3px)}
@media(max-width:900px){.wm-fld-chips{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wm-fld-chips{grid-template-columns:1fr;gap:10px}}
/* NOT ANOTHER CHAT BOX - the duel (chat pane vs guide console) and the three
   difference cards come from src/components/NotAChatBox.jsx. The h2 is longer
   than the other section heads, so its cap is wider. Page order: this section
   renders AFTER .wm-how (see the JSX placement rule), so the duel's dark half
   never sits directly under the hero console. */
.wm-notchat{border-top:1px solid var(--line)}
.wm-notchat .wm-h2{max-width:28ch}
.wm-notchat .wm-sub{margin-bottom:30px}
.wm:not([data-wm="dark"]) .wm-notchat{background:linear-gradient(180deg,rgba(255,154,77,.06),transparent 60%)}
/* FIELD VIGNETTES - the four real-screen pictures under the field chips. */
.wm-fv{margin-top:22px}
/* PROVE - proof and compliance: four light fact tiles (2x2) beside ONE dark
   product card, the audit log. 7/5 split, stacked under 900px, tiles 1-up
   under 560px. The dark card paints the design system's product-* tokens
   (product-surface #0b1424, product-ink #e6edf7, product-muted #9aa6b8,
   product-accent #8cf5c4, product-accent-2 #39d3ff, product-redact #ffd27a)
   as its own variables, so it stays dark in BOTH page themes on purpose: that
   contrast is the signature. Titles fall back to --tx where the light-only
   --ink-brand is not defined (the opt-in dark theme), so nothing goes
   dark-on-dark. */
.wm-prove{border-top:1px solid var(--line)}
.wm-prove-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:28px;align-items:center;margin-top:30px}
.wm-prove-grid>*{min-width:0}
.wm-prove-points{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.wm-prove-points li{display:flex;gap:12px;align-items:flex-start;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 16px 15px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 30px -24px rgba(17,23,38,.2)}
.wm-prove-points li>div{min-width:0}
.wm-prove-ic{display:inline-flex;align-items:center;justify-content:center;flex:none;width:38px;height:38px;border-radius:11px;color:#fff;background:linear-gradient(135deg,#10a271,#0a93c4);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 18px -8px rgba(10,147,196,.6)}
.wm-prove-points li b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:16px;letter-spacing:-.01em;line-height:1.25;color:var(--ink-brand,var(--tx));margin-bottom:4px}
.wm-prove-points li p{margin:0;font-size:13.5px;line-height:1.5;color:var(--mut)}
.wm-log{--pl-s:#0b1424;--pl-s2:#131f33;--pl-line:#24324a;--pl-ink:#e6edf7;--pl-mut:#9aa6b8;--pl-acc:#8cf5c4;--pl-acc2:#39d3ff;--pl-redact:#ffd27a;
  background:var(--pl-s);color:var(--pl-ink);border:1px solid var(--pl-line);border-radius:20px;padding:14px 16px 16px;min-width:0;max-width:100%;overflow:hidden;
  box-shadow:0 24px 64px rgba(6,42,34,.22),0 4px 12px rgba(12,18,34,.12)}
.wm-log>*{min-width:0}
.wm-log-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:2px 2px 12px;border-bottom:1px solid var(--pl-line)}
.wm-log-head .d{width:9px;height:9px;border-radius:50%;flex:none}
.wm-log-head b{font-family:"Bricolage Grotesque",sans-serif;margin-left:6px;white-space:nowrap}
.wm-log-task{margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:var(--pl-mut)}
.wm-log-lines{list-style:none;margin:0;padding:12px 0 0;display:flex;flex-direction:column;gap:7px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;line-height:1.5}
.wm-log-lines li{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:0 12px;align-items:baseline;min-width:0}
.wm-log-at{color:var(--pl-mut);font-size:11px;white-space:nowrap}
.wm-log-k{color:var(--pl-acc2);white-space:nowrap}
.wm-log-m{display:inline-flex;align-items:center;flex-wrap:wrap;gap:5px;min-width:0;overflow-wrap:anywhere;color:var(--pl-ink)}
.wm-log-m svg{flex:none}
.wm-log-lines li.s-ok .wm-log-m{color:var(--pl-acc)}
.wm-log-lines li.s-warn .wm-log-m{color:var(--pl-redact)}
.wm-log-lines li.s-seal .wm-log-m{color:var(--pl-acc2)}
.wm-log-seal{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px;padding:9px 11px;border-radius:11px;border:1px solid rgba(140,245,196,.3);background:rgba(140,245,196,.07);font-size:12px}
.wm-log-seal svg{color:var(--pl-acc);flex:none}
.wm-log-seal b{font-weight:700;color:var(--pl-ink)}
.wm-log-seal code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;color:var(--pl-mut);overflow-wrap:anywhere}
.wm-log-fw{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}
.wm-log-fwlbl{flex:0 0 100%;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--pl-mut);margin-bottom:2px}
.wm-log-chip{display:inline-flex;align-items:center;white-space:nowrap;font-size:11px;font-weight:600;color:var(--pl-ink);border:1px solid var(--pl-line);background:var(--pl-s2);border-radius:999px;padding:4px 10px}
.wm-log-chip.more{color:var(--pl-acc);border-color:rgba(140,245,196,.35)}
.wm:not([data-wm="dark"]) .wm-prove{background:linear-gradient(180deg,rgba(10,157,102,.04),transparent 55%)}
@media(max-width:900px){.wm-prove-grid{grid-template-columns:1fr;gap:18px}}
@media(max-width:560px){.wm-prove-points{grid-template-columns:1fr;gap:10px}.wm-log{border-radius:16px;padding:12px 12px 14px}}
/* ENTERPRISE - "how a company runs": four shared WorkCards under the ledger
   (roles + flows, team templates, company brain, recommended practices).
   4-up, 2-up under 1080px, 1-up under 560px; min-width:0 so a long title
   wraps inside its card and the proof chips wrap as a row. */
.wm-run{margin-top:34px;padding-top:28px;border-top:1px solid var(--line)}
.wm-run-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 24px;margin-bottom:18px}
.wm-run-head h3{margin:0;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(22px,2.6vw,30px);letter-spacing:-.02em;line-height:1.1;color:var(--ink-brand,var(--tx))}
.wm-run-head p{margin:0;color:var(--mut);font-size:15px;line-height:1.5;max-width:52ch}
.wm-run-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.wm-run-grid .wc-card{min-width:0}
@media(max-width:1080px){.wm-run-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wm-run-grid{grid-template-columns:1fr;gap:12px}}
/* EVERYWHERE - platforms, languages, personalization: three shared WorkCards,
   1-up under 900px. The language chips (registry endonyms, several scripts)
   live in the proof strip, which wraps as a row; each chip is nowrap. */
.wm-every{border-top:1px solid var(--line)}
.wm-every-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:30px}
.wm-every-grid .wc-card{min-width:0}
.wm:not([data-wm="dark"]) .wm-every{background:linear-gradient(180deg,rgba(10,134,207,.045),transparent 55%)}
@media(max-width:900px){.wm-every-grid{grid-template-columns:1fr;gap:12px}}
/* PROOF - the security/privacy duo sits under its own heading now; the duo's
   default top gap (44px, for the old headless placement) tightens to match. */
.wm-proof .wm-duo{margin-top:30px}
@media(max-width:900px){.wm-proof .wm-duo{margin-top:24px}}

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
 .wm-tiers{grid-template-columns:1fr}
 .wm-tier.pop{transform:none}
}
@media(max-width:560px){
 .wm-sec{padding:42px 0}
 .wm-hero{padding:48px 0 0}
 .wm-lead-stage{font-size:17px}
 .wm-demo{transform:none}
}
@media(max-width:768px){
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
.wm:not([data-wm="dark"]) .wm-final-in h2{color:var(--ink-brand)}
/* lead/intro copy off the muted grey so the page is not grey-dominant */
.wm:not([data-wm="dark"]) .wm-lead{color:var(--tx);font-weight:450}
.wm:not([data-wm="dark"]) .wm-badge{color:#07784f;background:rgba(10,157,102,.1);border-color:rgba(10,157,102,.28)}

/* The product "screen" cards stay DARK on the light page - the contrast gives
   the page depth. Re-scope dark vars + set color so inner text/hairlines/accents
   render light-on-dark exactly as designed (the global light vars would otherwise
   make them dark-on-dark). */
.wm:not([data-wm="dark"]) .wm-demo{
  --tx:#eef1f8; --mut:#9aa6ba; --line:rgba(255,255,255,.12);
  --panel:#141924; --em:#8cf5c4; --em2:#5bd0ff;
  color:var(--tx);
}
.wm:not([data-wm="dark"]) .wm-demo-step,
.wm:not([data-wm="dark"]) .wm-demo-now{color:var(--tx)}

.wm:not([data-wm="dark"]) .wm-cta.alt{background:#fff;border:1px solid var(--line);color:var(--tx)}

/* elevated white plan cards - real depth so the page never looks flat */
.wm:not([data-wm="dark"]) .wm-tier{
  background:#fff;
  box-shadow:0 1px 2px rgba(17,23,38,.04), 0 18px 42px -26px rgba(17,23,38,.22);
}
.wm:not([data-wm="dark"]) .wm-tier.pop{background:linear-gradient(180deg,rgba(10,157,102,.09),#fff);border-color:rgba(10,157,102,.45);box-shadow:0 32px 66px -30px rgba(10,157,102,.42)}

/* subtle section atmosphere so bands read on the light page */
.wm:not([data-wm="dark"]) .wm-how{background:linear-gradient(180deg,rgba(10,134,207,.05),transparent)}
.wm:not([data-wm="dark"]) .wm-fields{background:linear-gradient(180deg,rgba(10,157,102,.045),transparent 55%)}
.wm:not([data-wm="dark"]) .wm-final{background:radial-gradient(60% 130% at 50% 0%,rgba(10,157,102,.1),transparent)}

.wm:not([data-wm="dark"]) .wm-disclaimer-wrap{background:#e9edf4}

` + HOURS_BADGE_CSS
