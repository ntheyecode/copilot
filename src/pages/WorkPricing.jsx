// WorkCoPilot - pricing page, on the PLAN MODEL (owner, 2026-10-27).
//
// The plan contract is GET /api/work/pricing (server/store.js getWorkPricing):
//   hoursMonthly  guided hours INCLUDED per calendar month, per tier
//   hoursExpiry   forfeit | carryforward (+ carryCapHours) for unused hours
//   plans / hour  USD a month, USD per extra hour
// Everything numeric on this page is read from that API through the ONE view
// model in src/pricingModel.js (shared with the home page cards), so a
// superadmin change in Admin > Pricing lands here untouched. Nothing is typed
// into copy; the only constant is the labelled list-price fallback the page
// shows when the API cannot be reached, and it says so on screen.
//
// Public framing is MONTHLY HOURS, and hours are the HERO of every card: the
// HoursBadge (src/components/HoursBadge.jsx) shows the plan's monthly hours as
// a corporate seal whose thin ring arc fills with the plan's share of the
// largest plan, so a bigger plan reads as more at a glance (owner, 2026-10-27:
// "like BADGEs", professional, not decorative). There is no
// per-day task cap any more (server commit e8679cc), so nothing on this page
// mentions tasks; the retired credit model (banked credits, daily hours x 30)
// is gone on purpose too. Monthly / annual (20% off) is one toggle, the same
// math as the home teaser (pricingModel.annualMonthlyRate).
//
// Sections: hero -> billing toggle -> plan cards (+ Enterprise) -> value band
// (the two facts of the plan model beside a compact GuideConsole, so the page
// SHOWS what an hour of guided time is) -> the side-by-side matrix -> good to
// know -> CTA.
// Honesty rules: no model names, no AI cost, never "certified"; final
// entitlements are confirmed at checkout.
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Lock, ShieldCheck, Zap, BadgeCheck, Building2, RotateCcw, Clock3, CalendarCheck, ScanEye } from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import ReleaseNote from '../components/ReleaseNote.jsx'   // localized "new in this release" highlights (rel.*)
import GuideConsole from '../components/GuideConsole.jsx'   // the live guide console: what an hour of guided time looks like
import useSeo from '../useSeo.js'
import { useT } from '../i18n/index.jsx'
import HoursBadge, { HOURS_BADGE_CSS } from '../components/HoursBadge.jsx'
import { normalizePricing, planValueLines, planHoursShare, annualMonthlyRate, annualTotal, expiryFootnote, planRange, money, hours, PLAN_IDS, LIST_PRICE_FALLBACK } from '../pricingModel.js'
import { useEditionView } from '../edition/useCaps.js'

// Product names are never translated; the per-plan promise and highlight live
// in the catalog (pricing.plans.<id>). Column order is Lite, Basic, Advanced,
// Premium, Enterprise, the same order as every matrix row's 5 values.
const PLAN_NAME = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium', enterprise: 'Enterprise' }
// The Enterprise column shows only where company tenants exist (an
// individuals-only edition sells the four personal plans alone).
const ALL_COLS = [...PLAN_IDS, 'enterprise']
const POPULAR = 'advanced'
const ALL = [true, true, true, true, true]
const ENT = [false, false, false, false, true]

function Cell({ v, t }) {
  if (v === true) return <span className="wpr-yes" role="img" aria-label={t('pricing.matrix.included')}><Check size={15} aria-hidden /></span>
  if (v === false) return <span className="wpr-no" role="img" aria-label={t('pricing.matrix.notIncluded')}><i aria-hidden /></span>
  return <span className="wpr-val">{v}</span>
}

// The two facts of the plan model, each with the live range across plans.
function ValueBand({ model, t }) {
  const h = planRange(model, 'hoursMonthly')
  const carry = model.expiry.mode === 'carryforward'
  const scenario = t('guide.scenarios.finance')
  const tiles = [
    h && { ic: Clock3, big: t('pricing.rangeVal', { lo: hours(h.lo), hi: hours(h.hi) }), k: t('pricing.statHours'), sub: t('pricing.statHoursSub') },
    h && { ic: CalendarCheck, big: carry ? t('pricing.statCarry') : t('pricing.statReset'), k: t('pricing.statUnused'), sub: carry ? t('pricing.statCarrySub') : t('pricing.statResetSub'), small: true },
  ].filter(Boolean)
  return (
    <section className="wpr-value" aria-labelledby="wpr-value-h">
      <div className="wpr-value-grid">
        <div className="wpr-value-copy">
          <div className="wpr-eyebrow"><BadgeCheck size={14} aria-hidden /> {t('pricing.valueEyebrow')}</div>
          <h2 id="wpr-value-h" className="wpr-h2 start">{t.rich('pricing.valueH2')}</h2>
          <p className="wpr-value-sub">{t('pricing.valueSub')}</p>
          <div className="wpr-stats">
            {tiles.map((x) => (
              <div className="wpr-stat" key={x.k}>
                <x.ic size={18} aria-hidden />
                <b className={x.small ? 'sm' : ''}>{x.big}</b>
                <span>{x.k}</span>
                <small>{x.sub}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="wpr-value-console">
          <div className="wpr-console-eyebrow"><ScanEye size={14} aria-hidden /> {t('pricing.valueConsoleEyebrow')}</div>
          {scenario && typeof scenario === 'object' && <GuideConsole scenario={scenario} compact />}
          <p className="wpr-console-p">{t('pricing.valueConsoleP')}</p>
        </div>
      </div>
    </section>
  )
}

export default function WorkPricing() {
  const ed = useEditionView()
  // Organizations only (admireveda.com): no published prices (owner,
  // 2026-10-31). The next step is always the sales conversation.
  if (!ed.individualPlans) return <Navigate to="/workcopilot/contact" replace />
  return <PersonalPricing companies={ed.companies} />
}

function PersonalPricing({ companies }) {
  const COLS = companies ? ALL_COLS : PLAN_IDS
  const nav = useNavigate()
  const t = useT()
  // Arriving from the live check (?plan=<id>&from=validate): the plan it
  // recommended is ribboned "Recommended for your task", lifted, scrolled into
  // view, and its Start button pulses, so the visitor lands on their next click.
  const [sp] = useSearchParams()
  const recId = (sp.get('plan') || '').toLowerCase()
  const rec = PLAN_IDS.includes(recId) ? recId : ''
  useEffect(() => {
    if (!rec) return undefined
    const go = () => {
      try {
        const el = document.getElementById(`wpr-plan-${rec}`)
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top >= 0 && r.bottom <= window.innerHeight) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch { /* ignore */ }
    }
    const t1 = setTimeout(go, 350)
    const t2 = setTimeout(go, 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [rec])
  useSeo({ title: t('seo.pricing.title'), description: t('seo.pricing.description'), path: '/workcopilot/pricing' })

  // Live prices: loading -> live | fallback (labelled on screen, with Retry).
  const [price, setPrice] = useState(null)
  const [state, setState] = useState('loading')   // loading | live | fallback
  const load = () => {
    setState('loading')
    fetch('/api/work/pricing')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((j) => { setPrice(j); setState('live') })
      .catch(() => { setPrice(LIST_PRICE_FALLBACK); setState('fallback') })
  }
  useEffect(load, [])
  const model = useMemo(() => normalizePricing(price), [price])
  const loading = state === 'loading'

  // Monthly / annual (20% off): the same toggle and math as the home teaser.
  // An annual pick is carried to sign-up as ?cycle=annual so checkout applies
  // the yearly price; it is never charged the monthly amount by surprise.
  const [cycle, setCycle] = useState('monthly')
  const annual = cycle === 'annual'
  const rate = (p) => (annual ? annualMonthlyRate(p) : p)
  const start = (id) => nav(`/workcopilot/signup?plan=${id}${annual ? '&cycle=annual' : ''}`)
  const planMeta = (id) => t(`pricing.plans.${id}`) || {}
  const priceOf = (id) => (loading || !model ? null : model.plans[id])
  const hourOf = (id) => (loading || !model ? null : model.hour[id])
  const PriceTag = ({ id }) => (id === 'enterprise'
    ? <div className="wpr-price wpr-custom">{t('pricing.custom')}</div>
    : <div className={`wpr-price${loading ? ' wpr-skel' : ''}`} aria-busy={loading || undefined}>{loading ? <span className="wpr-skel-bar" aria-label={t('pricing.loading')} /> : money(rate(priceOf(id)))}<span>{t('pricing.perMonth')}</span></div>)
  // Under the price: "billed monthly" or, on annual, the struck monthly rate
  // and the yearly total.
  const CycleLine = ({ id }) => (id === 'enterprise'
    ? <div className="wpr-cyc">{t('pricing.forTeams')}</div>
    : annual && !loading && priceOf(id) != null
      ? <div className="wpr-cyc"><s>{money(priceOf(id))}{t('pricing.perMonth')}</s> {t('home.pricing.billedAnnually')} &middot; {money(annualTotal(priceOf(id)))}{t('common.perYear')}</div>
      : <div className="wpr-cyc">{t('pricing.billedMonthly')}</div>)
  // The hours hero of a card: the badge's ring arc fills with the plan's share
  // of the largest plan's monthly hours (planHoursShare), the number is the
  // plan's own.
  const Badge = ({ id }) => (id === 'enterprise'
    ? <HoursBadge custom customLabel={t('pricing.badgeCustom')} customSub={t('pricing.badgeCustomSub')} />
    : <HoursBadge hours={loading || !model || model.hoursMonthly[id] == null ? null : hours(model.hoursMonthly[id])} share={loading ? null : planHoursShare(model, id)} unit={t('pricing.badgeUnit')} sub={t('pricing.badgeSub')} loadingLabel={t('pricing.loading')} />)

  // The comparison rows, every number from the model. Enterprise capacity is
  // custom (seat pools, its own ceiling), so those cells read Unlimited/Custom.
  const m = model
  const mx = (k) => t(`pricing.matrix.${k}`)
  const val = (fn) => PLAN_IDS.map((id) => (m ? fn(id) : '')).concat([''])
  const ALL_ROWS = [
    { g: mx('groups.capacity') },
    { k: t('pricing.rowHours'), v: val((id) => (m.hoursMonthly[id] == null ? '' : t('pricing.hoursVal', { hours: hours(m.hoursMonthly[id]) }))).map((x, i) => (i === 4 ? t('pricing.custom') : x)) },
    { k: t('pricing.rowCarry'), v: val(() => (m.expiry.mode === 'carryforward' ? (m.expiry.carryCapHours ? t('pricing.carryCapVal', { cap: hours(m.expiry.carryCapHours) }) : t('pricing.carryVal')) : t('pricing.resetVal'))).map((x, i) => (i === 4 ? t('pricing.custom') : x)) },
    { k: t('pricing.rowExtra'), v: val((id) => (m.hour[id] == null ? '' : `${money(m.hour[id])}/hr`)).map((x, i) => (i === 4 ? t('pricing.custom') : x)) },
    { k: mx('seats'), v: [mx('seatOne'), mx('seatOne'), mx('seatOne'), mx('seatOne'), mx('seatPools')], companyOnly: true },
    { k: mx('queue'), v: [mx('queueStd'), mx('queueStd'), mx('queuePri'), mx('queueTop'), mx('queueTop')] },
    { g: mx('groups.guidance') },
    ...(mx('guidanceRows') || []).map((k) => ({ k, v: ALL })),
    { k: mx('roadmaps'), v: [false, true, true, true, true] },
    { k: mx('upload'), v: [true, true, true, true, true] },
    { k: mx('visuals'), v: [false, false, false, true, true] },
    // Projects (a large goal run as a planned map of guided tasks) is a Premium
    // capability; company teams have it through Enterprise.
    { k: mx('projects'), v: [false, false, false, true, true] },
    { g: mx('groups.security') },
    ...(mx('securityRows') || []).map((k) => ({ k, v: ALL })),
    { g: mx('groups.enterprise'), companyOnly: true },
    ...(mx('enterpriseRows') || []).map((k) => ({ k, v: ENT, companyOnly: true })),
  ]
  // Where there are no company tenants: no Enterprise column, no seat-pool or
  // enterprise rows (every row keeps exactly one value per shown column).
  const ROWS = companies ? ALL_ROWS : ALL_ROWS.filter((r) => !r.companyOnly).map((r) => (r.v ? { ...r, v: r.v.slice(0, COLS.length) } : r))
  const StartBtn = ({ id, small }) => (id === 'enterprise'
    ? <a className={`wpr-btn alt${small ? ' sm' : ''}`} href="/workcopilot/contact">{t('pricing.contact')}{!small && <ArrowRight size={15} aria-hidden />}</a>
    : <button className={`wpr-btn${small ? ' sm' : ''}${id === POPULAR || id === rec ? '' : ' alt'}${id === rec ? ' rec' : ''}`} onClick={() => start(id)} aria-label={t('pricing.start', { plan: PLAN_NAME[id] })}>{small ? t('pricing.startShort') : t('pricing.start', { plan: PLAN_NAME[id] })}{!small && <ArrowRight size={15} aria-hidden />}</button>)

  return (
    <div className="wpr">
      <style>{CSS}</style>
      <SiteHeader current="pricing" />

      <section className="wpr-hero">
        <div className="wpr-eyebrow"><Zap size={14} aria-hidden /> {t('pricing.eyebrow')}</div>
        <h1>{t.rich('pricing.h1')}</h1>
        <p>{t('pricing.sub')}</p>
      </section>

      {/* Live-price status: only when the API could not be reached (labelled,
          with Retry). While loading, the prices are skeleton bars. */}
      {state === 'fallback' && (
        <div className="wpr-status" role="status">
          <span>{t('pricing.listPrices')}</span>
          <button type="button" className="wpr-retry" onClick={load}><RotateCcw size={13} aria-hidden /> {t('pricing.retry')}</button>
        </div>
      )}

      {/* Monthly / annual toggle (the same keys and math as the home teaser). */}
      <div className="wpr-cycle" role="tablist" aria-label={t('home.pricing.billingAria')}>
        <button type="button" role="tab" aria-selected={!annual} className={`wpr-cycle-b${!annual ? ' on' : ''}`} onClick={() => setCycle('monthly')}>{t('home.pricing.monthly')}</button>
        <button type="button" role="tab" aria-selected={annual} className={`wpr-cycle-b${annual ? ' on' : ''}`} onClick={() => setCycle('annual')}>{t('home.pricing.annual')} <span className="wpr-cycle-save">{t('home.pricing.save')}</span></button>
      </div>

      {/* Plan cards: name, the HOURS badge (hero), price, one promise, the live
          value lines, one CTA. */}
      <section className="wpr-plans" aria-label={t('pricing.plansAria')}>
        {COLS.map((id) => {
          const ent = id === 'enterprise'
          const meta = planMeta(id)
          const lines = ent ? (t('pricing.entLines') || []) : (model && !loading ? planValueLines(model, id, t, { heroHours: true }) : [])
          return (
            <article key={id} id={`wpr-plan-${id}`} className={`wpr-plan${id === POPULAR ? ' pop' : ''}${ent ? ' ent' : ''}${id === rec ? ' rec' : ''}`}>
              {id === rec
                ? <div className="wpr-tag rec"><Zap size={11} aria-hidden /> {t('home.pricing.recommended')}</div>
                : id === POPULAR && <div className="wpr-tag">{t('pricing.mostPopular')}</div>}
              <h2 className="wpr-plan-name">{ent && <Building2 size={16} aria-hidden />} {PLAN_NAME[id]}</h2>
              <Badge id={id} />
              <PriceTag id={id} />
              <CycleLine id={id} />
              <p className="wpr-value-line">{meta.value}</p>
              <ul className="wpr-plan-lines" aria-busy={!ent && loading ? true : undefined}>
                {!ent && loading && [0, 1].map((k) => <li key={k} className="wpr-skel-li"><span className="wpr-skel-bar" /></li>)}
                {lines.map((l) => <li key={l}><Check size={15} aria-hidden /><span>{l}</span></li>)}
                {!ent && !loading && hourOf(id) != null && <li><Check size={15} aria-hidden /><span>{t('pricing.extraHour', { price: `${money(hourOf(id))}/hr` })}</span></li>}
                {meta.highlight && <li className="hl"><Check size={15} aria-hidden /><span>{meta.highlight}</span></li>}
              </ul>
              <StartBtn id={id} />
            </article>
          )
        })}
      </section>

      {/* The plan model, shown: two facts with the live ranges, beside the
          console playing what one hour of guided time is. */}
      {model && !loading && <ValueBand model={model} t={t} />}

      {/* THE MATRIX. Wide and tablet: a table that scrolls inside its own card
          (the page never scrolls sideways). Phones: one card per plan. */}
      <section className="wpr-matrix" aria-labelledby="wpr-matrix-h">
        <h2 id="wpr-matrix-h" className="wpr-h2">{t('pricing.matrix.h2')}</h2>
        <div className="wpr-card">
          <div className="wpr-scroll">
            <table className="wpr-tbl">
              <thead>
                <tr>
                  <th scope="col" className="wpr-feat">{t('pricing.matrix.colFeature')}</th>
                  {COLS.map((id) => (
                    <th scope="col" key={id} className={id === POPULAR ? 'pop' : ''}>
                      {id === POPULAR && <span className="wpr-tag inline">{t('pricing.mostPopular')}</span>}
                      {PLAN_NAME[id]}
                      <span className="wpr-th-price">{id === 'enterprise' ? t('pricing.custom') : loading ? '' : `${money(rate(priceOf(id)))}${t('pricing.perMonth')}`}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (r.g
                  ? <tr className="wpr-group" key={`g${i}`}><td colSpan={COLS.length + 1}>{r.g}</td></tr>
                  : (
                    <tr key={r.k}>
                      <th scope="row" className="wpr-feat">{r.k}</th>
                      {r.v.map((v, j) => <td key={COLS[j]} className={COLS[j] === POPULAR ? 'pop' : ''}><Cell v={v} t={t} /></td>)}
                    </tr>
                  )))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="wpr-feat" />
                  {COLS.map((id) => <td key={id} className={id === POPULAR ? 'pop' : ''}><StartBtn id={id} small /></td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="wpr-stack">
          {COLS.map((id, j) => (
            <article className={`wpr-tcard${id === POPULAR ? ' pop' : ''}`} key={id}>
              <div className="wpr-tname">
                <span>{PLAN_NAME[id]} <small>{id === 'enterprise' ? t('pricing.custom') : loading ? '' : `${money(rate(priceOf(id)))}${t('pricing.perMonth')}`}</small></span>
                {id === POPULAR && <span className="wpr-tag inline">{t('pricing.mostPopular')}</span>}
              </div>
              <ul>
                {ROWS.map((r, i) => (r.g
                  ? <li className="wpr-tgroup" key={`g${i}`}>{r.g}</li>
                  : <li key={r.k} className={r.v[j] === false ? 'off' : ''}><Cell v={r.v[j]} t={t} /><span>{r.k}</span></li>))}
              </ul>
              <StartBtn id={id} />
            </article>
          ))}
        </div>

        <div className="wpr-trust">
          <span><Lock size={14} aria-hidden /> {t('home.pricing.trustStripe')}</span>
          <span><Check size={14} aria-hidden /> {t('home.pricing.trustCancel')}</span>
          <span><ShieldCheck size={14} aria-hidden /> {t('home.pricing.trustExpire')}</span>
        </div>
        {model && !loading && <p className="wpr-footnote">{expiryFootnote(model, t)}</p>}
      </section>

      <section className="wpr-notes" aria-labelledby="wpr-notes-h">
        <h2 id="wpr-notes-h" className="wpr-h2">{t('pricing.notes.h2')}</h2>
        <div className="wpr-notes-grid">
          {(t('pricing.notes.items') || []).map((n) => (
            <div className="wpr-note" key={n.t}><h3>{n.t}</h3><p>{n.d}</p></div>
          ))}
        </div>
        <p className="wpr-fine"><BadgeCheck size={14} aria-hidden /> {t('pricing.fine')}</p>
      </section>

      <ReleaseNote groups={['billing']} />

      <section className="wpr-cta">
        <button className="wpr-btn" onClick={() => nav('/workcopilot')}>{t('common.getStarted')} <ArrowRight size={15} aria-hidden /></button>
        <a className="wpr-btn alt" href="/workcopilot/refund">{t('pricing.ctaRefund')}</a>
        <a className="wpr-btn alt" href="/demo">{t('pricing.ctaDemo')}</a>
      </section>

      <SiteFooter />
    </div>
  )
}

// Same light inner-page shell as /how-it-works, /fields and /security.
const CSS = `
[data-theme='dark'] .wpr{--ink:#eef0f6;--mut:#9aa0b4;--dim:#6c7780;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.15);--panel:#13141f;--panel2:#181b27;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff;--emf:rgba(140,245,196,.08);--chip:rgba(255,255,255,.04)}
.wpr{--ink:#161a2b;--mut:#5c6484;--dim:#8b93a1;--line:#e6e8f1;--line-strong:#d3d7e5;--panel:#ffffff;--panel2:#f6f8fd;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--emf:rgba(16,162,113,.08);--chip:#f4f8f7;--cta:#f26a43;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    var(--bg)}
.wpr *{box-sizing:border-box}
.wpr-orgplans{position:relative;padding:8px 0 40px}
/* min-width:0 only on the page's own grid children (never on a wildcard: the
   shared header lives inside .wpr and its nowrap nav links must keep their
   intrinsic width so the measured fold can trigger) */
.wpr-plan,.wpr-plan *,.wpr-value-copy,.wpr-value-console,.wpr-stat,.wpr-tcard,.wpr-note{min-width:0}
.wpr a{color:inherit;text-decoration:none}
.wpr p{margin:0}
.wpr::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wpr>*{position:relative;z-index:1}
.wpr :focus-visible{outline:2px solid var(--cy);outline-offset:3px;border-radius:8px}
.wpr-hero{max-width:1160px;margin:0 auto;padding:30px 24px 10px;text-align:center}
.wpr-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wpr-hero h1{font-size:clamp(30px,4.4vw,46px);line-height:1.06;letter-spacing:-.022em;margin:0 0 14px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;text-wrap:balance}
.wpr-hero h1 em,.wpr-h2 em{font-style:normal;background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wpr-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:620px;line-height:1.55}
.wpr-h2{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;font-size:clamp(24px,3vw,32px);letter-spacing:-.02em;line-height:1.1;margin:0 0 18px;text-align:center;color:var(--ink);text-wrap:balance}
.wpr-h2.start{text-align:start;margin-bottom:12px}

/* live-price status (fallback only) */
.wpr-status{max-width:1160px;margin:14px auto 0;padding:0 24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 16px;font-size:13.5px;color:#7a3e10}
.wpr-status>span{background:#fff4e5;border:1px solid #ffd9a8;border-radius:999px;padding:6px 13px}
.wpr-retry{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13px;font-weight:700;color:var(--ink);background:var(--panel);border:1px solid var(--line-strong);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap}

/* plan cards */
.wpr-plans{max-width:1160px;margin:0 auto;padding:30px 24px 10px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;align-items:stretch}
.wpr-plan{position:relative;display:flex;flex-direction:column;gap:7px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px 20px 22px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 20px 44px -30px rgba(10,13,18,.25);min-width:0}
.wpr-plan::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;border-radius:20px 20px 0 0;background:linear-gradient(90deg,var(--em),var(--cy));opacity:.55}
.wpr-plan.pop{border-color:rgba(16,162,113,.45);background:linear-gradient(180deg,rgba(16,162,113,.07),var(--panel) 38%);box-shadow:0 1px 2px rgba(10,13,18,.04),0 24px 50px -28px rgba(16,162,113,.4)}
.wpr-plan.pop::before{opacity:1}
.wpr-plan.ent{background:linear-gradient(180deg,rgba(10,147,196,.06),var(--panel) 40%)}
/* On a plan card the pill floats over the top edge (as on the home teaser), so
   the five hours badges sit on one line whether or not a card carries a pill. */
.wpr-plan>.wpr-tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);z-index:2;max-width:calc(100% - 32px)}
.wpr-tag{display:inline-flex;align-self:flex-start;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,var(--em),var(--cy));border-radius:999px;padding:3px 9px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.wpr-plan.rec{border-color:rgba(242,106,67,.55);box-shadow:0 0 0 3px rgba(255,154,77,.22),0 28px 56px -28px rgba(242,106,67,.45);transform:translateY(-4px)}
.wpr-tag.rec{align-items:center;gap:5px;color:#1a0e08;background:linear-gradient(135deg,#ffb35c,#ff7a59)}
.wpr-btn.rec{background:linear-gradient(135deg,#ffb35c,#ff7a59);color:#1a0e08;box-shadow:0 12px 28px -12px rgba(242,106,67,.7);animation:wpr-rec-pulse 1.8s ease-in-out .6s 3}
@keyframes wpr-rec-pulse{0%,100%{box-shadow:0 12px 28px -12px rgba(242,106,67,.7)}50%{box-shadow:0 0 0 6px rgba(255,154,77,.28),0 12px 28px -12px rgba(242,106,67,.7)}}
.wpr-tag.inline{display:block;width:fit-content;margin:0 auto 6px}
.wpr-plan-name{display:inline-flex;align-items:center;gap:6px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:20px;margin:0;color:var(--ink)}
.wpr-plan-name svg{color:var(--cy);flex-shrink:0}
.wpr-price{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:clamp(32px,3.2vw,44px);letter-spacing:-.03em;line-height:1;color:var(--ink);white-space:nowrap;min-height:1em;display:flex;align-items:baseline}
.wpr-price span{font-family:"Figtree",sans-serif;font-weight:500;font-size:15px;letter-spacing:0;color:var(--dim);margin-left:3px}
.wpr-custom{font-size:clamp(28px,2.8vw,36px);background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wpr-skel-bar{display:inline-block;width:3.2em;height:.8em;border-radius:6px;background:linear-gradient(90deg,var(--line),var(--panel2),var(--line));background-size:200% 100%;animation:wpr-shimmer 1.2s linear infinite;vertical-align:middle}
.wpr-skel-li .wpr-skel-bar{width:70%;height:12px}
@keyframes wpr-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.wpr-cyc{color:var(--dim);font-size:13px;margin-top:-2px;min-height:1.3em}
.wpr-cyc s{opacity:.8;margin-right:3px}
/* monthly / annual toggle (same look as the home teaser) */
.wpr-cycle{display:flex;width:fit-content;max-width:100%;gap:4px;margin:18px auto 0;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--panel);position:relative;z-index:1}
.wpr-cycle-b{display:inline-flex;align-items:center;gap:8px;border:none;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:14px;padding:9px 18px;border-radius:999px;cursor:pointer;white-space:nowrap;transition:color .15s,background .15s}
.wpr-cycle-b.on{color:var(--ink);background:linear-gradient(135deg,rgba(16,162,113,.14),rgba(10,132,194,.12))}
.wpr-cycle-save{font-size:11px;font-weight:800;letter-spacing:.02em;color:#06603f;background:rgba(10,157,102,.16);border-radius:999px;padding:2px 8px;white-space:nowrap}
/* the hours hero: page tokens -> badge tokens */
.wpr .hbg{--hbg-a:var(--em);--hbg-b:var(--cy);--hbg-ink:var(--ink);--hbg-mut:var(--mut);--hbg-track:var(--line-strong);--hbg-disc:var(--panel);margin:6px auto 10px}
[data-theme='dark'] .wpr .hbg{--hbg-track:rgba(255,255,255,.14)}
.wpr-value-line{color:var(--mut);font-size:13.5px;line-height:1.5;min-height:2.9em;margin:2px 0 2px}
.wpr-plan-lines{list-style:none;margin:4px 0 16px;padding:0;display:flex;flex-direction:column;gap:9px;min-height:6.4em}
.wpr-plan-lines li{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--mut);line-height:1.4}
.wpr-plan-lines li svg{color:var(--em);flex-shrink:0;margin-top:2px}
.wpr-plan-lines li.hl span{color:var(--ink);font-weight:700}
.wpr-footnote{text-align:center;color:var(--dim);font-size:12.5px;line-height:1.55;max-width:64ch;margin:18px auto 0}
.wpr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--cta);color:#fff;border:0;border-radius:11px;padding:12px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(242,106,67,.7);margin-top:auto;white-space:nowrap;transition:transform .15s,filter .15s}
.wpr-btn:hover{filter:brightness(1.05);transform:translateY(-1px)}
.wpr-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
.wpr-btn.sm{padding:8px 14px;font-size:13px;border-radius:9px;margin-top:0}

/* value band: the three plan facts beside the console */
.wpr-value{max-width:1160px;margin:0 auto;padding:44px 24px 6px}
.wpr-value-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:28px 40px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:30px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 24px 56px -34px rgba(10,13,18,.3);position:relative;overflow:hidden}
.wpr-value-grid::before{content:"";position:absolute;inset:auto -10% -40% auto;width:60%;height:120%;background:radial-gradient(closest-side,rgba(57,211,255,.16),transparent 70%);pointer-events:none}
.wpr-value-copy,.wpr-value-console{position:relative;min-width:0}
.wpr-value-sub{color:var(--mut);font-size:15.5px;line-height:1.55;max-width:52ch;margin-bottom:20px}
.wpr-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wpr-stat{display:flex;flex-direction:column;gap:3px;padding:14px 14px 12px;border-radius:16px;background:var(--panel2);border:1px solid var(--line);min-width:0}
.wpr-stat svg{color:var(--em);margin-bottom:4px}
.wpr-stat b{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:clamp(20px,2vw,26px);letter-spacing:-.02em;line-height:1.05;color:var(--ink);white-space:nowrap}
.wpr-stat b.sm{font-size:clamp(16px,1.5vw,19px);white-space:normal}
.wpr-stat span{font-size:12.5px;font-weight:700;color:var(--em);letter-spacing:.02em}
.wpr-stat small{font-size:12px;color:var(--mut);line-height:1.4}
.wpr-console-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--cy);margin-bottom:10px}
.wpr-console-p{margin-top:12px;font-size:13.5px;color:var(--mut);line-height:1.5}

/* matrix */
.wpr-matrix{max-width:1160px;margin:0 auto;padding:40px 24px 10px}
.wpr-card{border:1px solid var(--line);border-radius:22px;background:var(--panel);overflow:hidden;box-shadow:0 1px 2px rgba(10,13,18,.04),0 20px 44px -30px rgba(10,13,18,.25)}
.wpr-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
.wpr-tbl{width:100%;min-width:900px;border-collapse:separate;border-spacing:0;font-size:14.5px}
.wpr-tbl th,.wpr-tbl td{padding:13px 16px;text-align:center;border-top:1px solid var(--line);vertical-align:middle}
.wpr-tbl thead th{border-top:none;padding:18px 16px 14px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:17px;color:var(--ink);background:var(--emf)}
.wpr-tbl thead th.pop{color:var(--em)}
.wpr-th-price{display:block;font-family:"Figtree",sans-serif;font-weight:600;font-size:12.5px;color:var(--dim);margin-top:2px;min-height:1.2em}
.wpr-tbl .wpr-feat{text-align:left;font-weight:500;color:var(--ink);width:32%;min-width:230px;position:sticky;left:0;z-index:1;background:var(--panel)}
.wpr-tbl thead .wpr-feat{font-family:"Figtree",sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);background:var(--panel)}
.wpr-tbl td.pop{background:rgba(16,162,113,.04)}
.wpr-group td{text-align:left;padding:18px 16px 8px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--em)}
.wpr-tbl tfoot td{padding:16px}
.wpr-yes{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;color:var(--em);background:rgba(16,162,113,.12)}
.wpr-no{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px}
.wpr-no i{display:block;width:12px;height:2px;border-radius:2px;background:var(--line-strong)}
.wpr-val{font-weight:700;color:var(--ink);white-space:nowrap;font-size:13.5px}
.wpr-stack{display:none}
.wpr-tcard{display:flex;flex-direction:column;gap:12px;border:1px solid var(--line);border-radius:18px;padding:20px;background:var(--panel);min-width:0}
.wpr-tcard.pop{border-color:rgba(16,162,113,.45);background:linear-gradient(180deg,rgba(16,162,113,.07),var(--panel) 30%)}
.wpr-tname{display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:20px;flex-wrap:wrap}
.wpr-tname small{font-family:"Figtree",sans-serif;font-weight:600;font-size:13px;color:var(--dim);margin-left:6px}
.wpr-tcard ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.wpr-tcard li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--ink);line-height:1.45}
.wpr-tcard li.off{color:var(--dim)}
.wpr-tcard li .wpr-yes,.wpr-tcard li .wpr-no{width:22px;height:22px;flex-shrink:0}
.wpr-tcard li .wpr-val{flex-shrink:0;font-size:13px;color:var(--em);padding-top:1px;white-space:normal;max-width:45%}
.wpr-tcard li.wpr-tgroup{display:block;font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-top:8px;padding-top:12px;border-top:1px solid var(--line)}
.wpr-tcard li.wpr-tgroup:first-child{margin-top:0;padding-top:0;border-top:none}
.wpr-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 28px;margin-top:22px}
.wpr-trust span{display:inline-flex;align-items:center;gap:8px;color:var(--mut);font-size:13.5px;font-weight:500}
.wpr-trust span svg{color:var(--em);flex-shrink:0}

/* notes */
.wpr-notes{max-width:1160px;margin:0 auto;padding:40px 24px 10px}
.wpr-notes-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.wpr-note{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(10,13,18,.04)}
.wpr-note h3{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;font-size:16px;margin:0 0 7px;color:var(--ink)}
.wpr-note p{color:var(--mut);font-size:13.5px;line-height:1.5}
.wpr-fine{display:flex;align-items:flex-start;justify-content:center;gap:7px;text-align:center;color:var(--dim);font-size:13.5px;margin-top:20px;line-height:1.45}
.wpr-fine svg{color:var(--cy);flex-shrink:0;margin-top:2px}
.wpr-cta{max-width:1160px;margin:0 auto;padding:26px 24px 40px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wpr-cta .wpr-btn{margin-top:0}

@media(max-width:1080px){.wpr-plans{grid-template-columns:repeat(2,minmax(0,1fr))}.wpr-notes-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wpr-value-grid{grid-template-columns:1fr;padding:24px}}
@media(max-width:768px){.wpr-card{display:none}.wpr-stack{display:grid;grid-template-columns:1fr;gap:14px}}
@media(max-width:560px){
  .wpr-plans{grid-template-columns:1fr;padding:20px 16px 8px}
  .wpr-notes-grid{grid-template-columns:1fr}
  .wpr-hero{padding:24px 16px 6px}.wpr-hero h1{font-size:30px}
  .wpr-value,.wpr-matrix,.wpr-notes,.wpr-cta,.wpr-status{padding-left:16px;padding-right:16px}
  .wpr-cycle{margin-top:14px}
  .wpr-value-grid{padding:18px 16px;border-radius:20px}
  .wpr-plan-lines{min-height:0}
}
@media(max-width:400px){.wpr-stats{grid-template-columns:1fr}.wpr-cta .wpr-btn{width:100%}.wpr-cycle-b{padding:8px 12px;font-size:13px}}
@media(prefers-reduced-motion:reduce){.wpr-btn.rec{animation:none}.wpr-plan.rec{transform:none}.wpr-skel-bar{animation:none}.wpr-btn{transition:none}.wpr-btn:hover{transform:none}}
` + HOURS_BADGE_CSS
