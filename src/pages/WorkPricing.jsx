// WorkCoPilot - pricing page (audit WEB-05). Four plan cards (Lite / Basic /
// Advanced / Premium) plus a custom-priced Enterprise column, and ONE
// side-by-side comparison. Copy is cut to short phrases: tier name, price, a
// tight value line, a scannable benefit list, one Start CTA each.
//
// PRICE_ROWS is the ONE place the comparison matrix lives in the renderer
// (the main page links here instead of carrying a copy). Prices come from
// /api/work/pricing exactly as the main page's plan cards do, with the
// published list prices as the offline fallback so the page is never blank.
// Honesty rules: no model names, no AI cost, never "certified"; where an exact
// value is not published we say "Included" rather than invent a number, and
// the page says final entitlements are confirmed at checkout.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Lock, ShieldCheck, Zap, BadgeCheck, Building2 } from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import ReleaseNote from '../components/ReleaseNote.jsx'   // localized "new in this release" highlights (rel.*)
import useSeo from '../useSeo.js'
import { useT } from '../i18n/index.jsx'           // localized <title>/description (seo.* keys)

// Offline fallbacks (USD / month and per-tier values). These MATCH
// server/store.js WORK_PRICING_DEFAULT so the page is never blank and never
// shows a stale number; the live /api/work/pricing values override them.
const FALLBACK = {
  plans: { lite: 69, basic: 99, advanced: 299, premium: 399 },
  hour: { lite: 25, basic: 20, advanced: 15, premium: 10 },
  tasks: { lite: 1, basic: 2, advanced: 4, premium: 6 },
  dailyHours: { lite: 1, basic: 2, advanced: 4, premium: 6 },
}

// Static plan metadata; the numbers (price, hours, tasks, overage) are derived
// from the live API in the component so the page can never drift from what
// checkout charges. Column order is Lite, Basic, Advanced, Premium, Enterprise
// - the same order as every matrix row's 5 values. "highlight" is the one
// feature that best sells each tier, shown as the last benefit line.
const PLAN_META = [
  { id: 'lite', name: 'Lite', value: 'One task at a time, walked through step by step.', highlight: 'One task at a time' },
  { id: 'basic', name: 'Basic', value: 'A guide at your side a couple of hours a day.', highlight: 'Roadmaps and session write-ups' },
  { id: 'advanced', name: 'Advanced', popular: true, value: 'Half a day of guidance, grounded in your own documents.', highlight: 'Upload your own documents' },
  { id: 'premium', name: 'Premium', value: 'The most hours, generated visuals, first in the queue.', highlight: 'Generated visuals on demand' },
  { id: 'enterprise', name: 'Enterprise', custom: true, value: 'SSO, company policy, seat pools and a DPA.', highlight: 'Dedicated contact' },
]
// Matrix cells: true = included, false = not included, a string = the value shown.
// Five values per row, aligned to PLAN_META: [Lite, Basic, Advanced, Premium, Enterprise].
const ALL = [true, true, true, true, true]
const ENT = [false, false, false, false, true]

function Cell({ v }) {
  if (v === true) return <span className="wpr-yes" role="img" aria-label="Included"><Check size={15} aria-hidden /></span>
  if (v === false) return <span className="wpr-no" role="img" aria-label="Not included"><i aria-hidden /></span>
  return <span className="wpr-val">{v}</span>
}

export default function WorkPricing() {
  const nav = useNavigate()
  const t = useT()
  // Arriving from the live check (?plan=<id>&from=validate): the plan it
  // recommended is ribboned "Recommended for your task", lifted, scrolled into
  // view, and its Start button pulses, so the visitor lands on their next click.
  const [sp] = useSearchParams()
  const recId = (sp.get('plan') || '').toLowerCase()
  const rec = PLAN_META.some((p) => p.id === recId && !p.custom) ? recId : ''
  useEffect(() => {
    if (!rec) return undefined
    // Two attempts: the first right after paint, a second once the live prices
    // have landed and the cards have their final height (on a phone the first
    // smooth scroll can be cut short by that reflow). Skipped if already in view.
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
  useSeo({
    title: t('seo.pricing.title'),
    description: t('seo.pricing.description'),
    path: '/workcopilot/pricing',
  })
  const [price, setPrice] = useState(null)
  useEffect(() => { fetch('/api/work/pricing').then((r) => r.json()).then(setPrice).catch(() => {}) }, [])

  const money = (n) => (n == null ? '-' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`)
  // Every per-tier number reads the live API first, then the server-matching
  // fallback. Final prices and entitlements are confirmed at checkout.
  const live = (group, id) => (price && price[group] && price[group][id] != null ? price[group][id] : FALLBACK[group][id])
  const planPrice = (id) => live('plans', id)
  const hourPrice = (id) => live('hour', id)
  const dailyHrs = (id) => live('dailyHours', id)
  const tasksDay = (id) => live('tasks', id)
  // Public framing is MONTHLY: monthly tasks = daily cap x 30, monthly hours =
  // daily hours x 30 - computed from the live config, never typed into copy, so
  // a superadmin cap change follows here automatically.
  const DAYS_PER_MONTH = 30
  const perMonth = (n) => Math.round(Number(n) * DAYS_PER_MONTH * 100) / 100
  const tasksMonth = (id) => perMonth(tasksDay(id))
  const hrsMonth = (id) => perMonth(dailyHrs(id))
  const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`
  // Start = the product's sign-in page with the plan carried along (the same
  // query the main page's plan cards use), so the pick survives sign-up.
  const start = (id) => nav(`/workcopilot/signup?plan=${id}`)   // subscribe onboarding: account -> verify -> pay

  const PLANS = PLAN_META
  // The comparison matrix, built with the derived numbers so capacity and
  // overage rows always agree with the plan cards above. Trimmed to the rows
  // a buyer actually compares on: capacity, what the guidance does, the few
  // power features that differ, security (same for all), and Enterprise.
  // Domain fact kept true: buying an extra hour grants ONE extra task (rate
  // per tier, superadmin-configurable); a task is a MAJOR task of many steps.
  const PRICE_ROWS = [
    { g: 'Capacity' },
    { k: 'Major tasks a month', v: [`${tasksMonth('lite')}`, `${tasksMonth('basic')}`, `${tasksMonth('advanced')}`, `${tasksMonth('premium')}`, 'Unlimited'] },
    { k: 'Live guidance a month*', v: [`Up to ${plural(hrsMonth('lite'), 'hour')}`, `Up to ${plural(hrsMonth('basic'), 'hour')}`, `Up to ${plural(hrsMonth('advanced'), 'hour')}`, `Up to ${plural(hrsMonth('premium'), 'hour')}`, 'Custom'] },
    { k: 'Extra hour adds 1 task', v: [`${money(hourPrice('lite'))}/hr`, `${money(hourPrice('basic'))}/hr`, `${money(hourPrice('advanced'))}/hr`, `${money(hourPrice('premium'))}/hr`, 'Custom'] },
    { k: 'Seats', v: ['1 user', '1 user', '1 user', '1 user', 'Seat pools, your size'] },
    { k: 'Queue priority', v: ['Standard', 'Standard', 'Priority', 'Highest', 'Highest'] },
    { g: 'What the guidance does' },
    { k: 'Step-by-step, start to finish', v: ALL },
    { k: 'Exact commands, code and links', v: ALL },
    { k: 'Works on desktop, browser and mobile', v: ALL },
    { k: 'Roadmaps', v: [false, true, true, true, true] },
    { k: 'Upload your own reference documents', v: [false, false, true, true, true] },
    { k: 'Generated visuals and diagrams', v: [false, false, false, true, true] },
    { g: 'Security, on every plan' },
    { k: 'On-device redaction, read-only, encrypted at rest', v: ALL },
    { k: 'Security-first checked answers', v: ALL },
    { g: 'Enterprise' },
    { k: 'SSO (OIDC) and team provisioning', v: ENT },
    { k: 'Company redaction policy, audit log and DPA', v: ENT },
    { k: 'Per-company AI keys, or bring your own', v: ENT },
    { k: 'On-prem deployment, on request', v: ENT },
    { k: 'Dedicated contact', v: ENT },
  ]

  return (
    <div className="wpr">
      <style>{CSS}</style>
      <SiteHeader current="pricing" />

      <section className="wpr-hero">
        <div className="wpr-eyebrow"><Zap size={14} aria-hidden /> Pricing</div>
        <h1>Simple plans. <em>Real guided time.</em></h1>
        <p>Guided major tasks and hours of live, on-screen guidance every month. Security and privacy come with every plan, never as an upsell.</p>
      </section>

      {/* Plan cards: name, price, one value line, a short benefit list, one CTA. */}
      <section className="wpr-plans" aria-label="Plans">
        {PLANS.map((p) => (
          <article key={p.id} id={`wpr-plan-${p.id}`} className={`wpr-plan${p.popular ? ' pop' : ''}${p.custom ? ' ent' : ''}${p.id === rec ? ' rec' : ''}`}>
            {p.id === rec
              ? <div className="wpr-tag rec"><Zap size={11} aria-hidden /> {t('home.pricing.recommended')}</div>
              : p.popular && <div className="wpr-tag">Most popular</div>}
            <h2 className="wpr-plan-name">{p.custom && <Building2 size={16} aria-hidden />} {p.name}</h2>
            {p.custom
              ? <div className="wpr-price wpr-custom">Custom</div>
              : <div className="wpr-price">{money(planPrice(p.id))}<span>/mo</span></div>}
            <div className="wpr-cyc">{p.custom ? 'for regulated teams' : 'billed monthly'}</div>
            <p className="wpr-value">{p.value}</p>
            <ul className="wpr-plan-lines">
              {p.custom ? (
                <>
                  <li><Check size={15} aria-hidden /><span>Seat pools, your size</span></li>
                  <li><Check size={15} aria-hidden /><span>Unlimited major tasks</span></li>
                  <li><Check size={15} aria-hidden /><span>SSO, company policy and a DPA</span></li>
                  <li><Check size={15} aria-hidden /><span>{p.highlight}</span></li>
                </>
              ) : (
                <>
                  <li><Check size={15} aria-hidden /><span><b>{plural(tasksMonth(p.id), 'major task')}</b> a month</span></li>
                  <li><Check size={15} aria-hidden /><span>Up to <b>{plural(hrsMonth(p.id), 'hour')}</b> of guidance*</span></li>
                  <li><Check size={15} aria-hidden /><span>Extra hour adds 1 task, <b>{money(hourPrice(p.id))}/hr</b></span></li>
                  <li><Check size={15} aria-hidden /><span>{p.highlight}</span></li>
                </>
              )}
            </ul>
            {p.custom
              ? <a className="wpr-btn alt" href="/workcopilot/contact">Contact sales <ArrowRight size={15} aria-hidden /></a>
              : <button className={`wpr-btn${p.popular || p.id === rec ? '' : ' alt'}${p.id === rec ? ' rec' : ''}`} onClick={() => start(p.id)} aria-label={`Start ${p.name}`}>Start {p.name} <ArrowRight size={15} aria-hidden /></button>}
          </article>
        ))}
      </section>

      {/* One clarification next to the task counts: a "task" is substantial. */}
      <p className="wpr-tasknote">A task is a <b>major task</b>: one goal, guided end to end through every sub-step it takes.</p>

      {/* THE MATRIX. Wide and tablet: a table that scrolls inside its own card
          when the viewport is narrower than it (the page never scrolls
          sideways). Phones: one card per plan with the same facts. */}
      <section className="wpr-matrix" aria-labelledby="wpr-matrix-h">
        <h2 id="wpr-matrix-h" className="wpr-h2">Every plan, side by side.</h2>
        <div className="wpr-card">
          <div className="wpr-scroll">
            <table className="wpr-tbl">
              <thead>
                <tr>
                  <th scope="col" className="wpr-feat">What you get</th>
                  {PLANS.map((p) => (
                    <th scope="col" key={p.id} className={p.popular ? 'pop' : ''}>
                      {p.popular && <span className="wpr-tag inline">Most popular</span>}
                      {p.name}
                      <span className="wpr-th-price">{p.custom ? 'Custom' : `${money(planPrice(p.id))}/mo`}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICE_ROWS.map((r, i) => (r.g
                  ? <tr className="wpr-group" key={`g${i}`}><td colSpan={PLANS.length + 1}>{r.g}</td></tr>
                  : (
                    <tr key={r.k}>
                      <th scope="row" className="wpr-feat">{r.k}</th>
                      {r.v.map((v, j) => <td key={PLANS[j].id} className={PLANS[j].popular ? 'pop' : ''}><Cell v={v} /></td>)}
                    </tr>
                  )))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="wpr-feat" />
                  {PLANS.map((p) => (
                    <td key={p.id} className={p.popular ? 'pop' : ''}>
                      {p.custom
                        ? <a className="wpr-btn sm alt" href="/workcopilot/contact">Contact sales</a>
                        : <button className={`wpr-btn sm${p.popular ? '' : ' alt'}`} onClick={() => start(p.id)} aria-label={`Start ${p.name}`}>Start</button>}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="wpr-stack">
          {PLANS.map((p, j) => (
            <article className={`wpr-tcard${p.popular ? ' pop' : ''}`} key={p.id}>
              <div className="wpr-tname">
                <span>{p.name} <small>{p.custom ? 'Custom' : `${money(planPrice(p.id))}/mo`}</small></span>
                {p.popular && <span className="wpr-tag inline">Most popular</span>}
              </div>
              <ul>
                {PRICE_ROWS.map((r, i) => (r.g
                  ? <li className="wpr-tgroup" key={`g${i}`}>{r.g}</li>
                  : <li key={r.k} className={r.v[j] === false ? 'off' : ''}><Cell v={r.v[j]} /><span>{r.k}</span></li>))}
              </ul>
              {p.custom
                ? <a className="wpr-btn alt" href="/workcopilot/contact">Contact sales <ArrowRight size={15} aria-hidden /></a>
                : <button className={`wpr-btn${p.popular || p.id === rec ? '' : ' alt'}${p.id === rec ? ' rec' : ''}`} onClick={() => start(p.id)} aria-label={`Start ${p.name}`}>Start {p.name} <ArrowRight size={15} aria-hidden /></button>}
            </article>
          ))}
        </div>

        <div className="wpr-trust">
          <span><Lock size={14} aria-hidden /> Secure checkout, powered by Stripe</span>
          <span><Check size={14} aria-hidden /> Cancel anytime, no contract</span>
          <span><ShieldCheck size={14} aria-hidden /> Purchased time never expires</span>
        </div>
        <p className="wpr-footnote">*Daily hours reset at midnight (US Eastern) and do not roll over. Unused tasks bank as credits you keep. Billed per minute you actually use.</p>
      </section>

      {/* Good to know: four short points, one sentence each. */}
      <section className="wpr-notes" aria-labelledby="wpr-notes-h">
        <h2 id="wpr-notes-h" className="wpr-h2">Good to know.</h2>
        <div className="wpr-notes-grid">
          <div className="wpr-note">
            <h3>Minutes, not blocks</h3>
            <p>Spend your hours a few minutes at a time across the day, billed per minute you use, never rounded to the hour.</p>
          </div>
          <div className="wpr-note">
            <h3>Extra time</h3>
            <p>Busy day? Top up an hour and get one more task. Purchased time never expires.</p>
          </div>
          <div className="wpr-note">
            <h3>Billing</h3>
            <p>Billed monthly, annual at a discount where available. Cancel yourself anytime, no contract.</p>
          </div>
          <div className="wpr-note">
            <h3>Teams</h3>
            <p>Lite to Premium are single-user. For seat pools, SSO and a DPA, talk to us about Enterprise.</p>
          </div>
        </div>
        <p className="wpr-fine"><BadgeCheck size={14} aria-hidden /> Final entitlements and prices are confirmed at checkout. Taxes may apply by location.</p>
      </section>

      <ReleaseNote groups={['billing']} />

      <section className="wpr-cta">
        <button className="wpr-btn" onClick={() => nav('/workcopilot')}>Get started <ArrowRight size={15} aria-hidden /></button>
        <a className="wpr-btn alt" href="/workcopilot/refund">Refund policy</a>
        <a className="wpr-btn alt" href="/demo">See a 60-second demo</a>
      </section>

      <SiteFooter />
    </div>
  )
}

// Same light inner-page shell as /how-it-works, /fields and /security.
const CSS = `
[data-theme='dark'] .wpr{--ink:#eef0f6;--mut:#9aa0b4;--dim:#6c7780;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.15);--panel:#13141f;--panel2:#181b27;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff;--emf:rgba(140,245,196,.08);--chip:rgba(255,255,255,.04)}
.wpr{--ink:#161a2b;--mut:#5c6484;--dim:#8b93a1;--line:#e6e8f1;--line-strong:#d3d7e5;--panel:#ffffff;--panel2:#f6f8fd;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--emf:rgba(16,162,113,.08);--chip:#f4f8f7;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    var(--bg)}
.wpr *{box-sizing:border-box}
.wpr a{color:inherit;text-decoration:none}
.wpr p{margin:0}
.wpr::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wpr>*{position:relative;z-index:1}
.wpr :focus-visible{outline:2px solid var(--cy);outline-offset:3px;border-radius:8px}
.wpr-hero{max-width:1160px;margin:0 auto;padding:30px 24px 10px;text-align:center}
.wpr-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em);margin-bottom:14px}
.wpr-hero h1{font-size:clamp(30px,4.4vw,46px);line-height:1.06;letter-spacing:-.022em;margin:0 0 14px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wpr-hero h1 em{font-style:normal;background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wpr-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:600px;line-height:1.55}
.wpr-h2{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;font-size:clamp(24px,3vw,32px);letter-spacing:-.02em;line-height:1.1;margin:0 0 18px;text-align:center;color:var(--ink)}

/* plan cards */
.wpr-plans{max-width:1160px;margin:0 auto;padding:26px 24px 10px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;align-items:stretch}
.wpr-plan{position:relative;display:flex;flex-direction:column;gap:7px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px 20px 22px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 20px 44px -30px rgba(10,13,18,.25);min-width:0}
.wpr-plan::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;border-radius:20px 20px 0 0;background:linear-gradient(90deg,var(--em),var(--cy));opacity:.55}
.wpr-plan.pop{border-color:rgba(16,162,113,.45);background:linear-gradient(180deg,rgba(16,162,113,.07),var(--panel) 38%);box-shadow:0 1px 2px rgba(10,13,18,.04),0 24px 50px -28px rgba(16,162,113,.4)}
.wpr-plan.pop::before{opacity:1}
.wpr-plan.ent{background:linear-gradient(180deg,rgba(10,147,196,.06),var(--panel) 40%)}
.wpr-tag{display:inline-flex;align-self:flex-start;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,var(--em),var(--cy));border-radius:999px;padding:3px 9px;white-space:nowrap}
/* Recommended by the live check: a warm ring + lift, the warm ribbon, a pulsing Start. */
.wpr-plan.rec{border-color:rgba(242,106,67,.55);box-shadow:0 0 0 3px rgba(255,154,77,.22),0 28px 56px -28px rgba(242,106,67,.45);transform:translateY(-4px)}
.wpr-tag.rec{align-items:center;gap:5px;color:#1a0e08;background:linear-gradient(135deg,#ffb35c,#ff7a59)}
.wpr-btn.rec{background:linear-gradient(135deg,#ffb35c,#ff7a59);color:#1a0e08;box-shadow:0 12px 28px -12px rgba(242,106,67,.7);animation:wpr-rec-pulse 1.8s ease-in-out .6s 3}
@keyframes wpr-rec-pulse{0%,100%{box-shadow:0 12px 28px -12px rgba(242,106,67,.7)}50%{box-shadow:0 0 0 6px rgba(255,154,77,.28),0 12px 28px -12px rgba(242,106,67,.7)}}
@media(prefers-reduced-motion:reduce){.wpr-btn.rec{animation:none}.wpr-plan.rec{transform:none}}
.wpr-tag.inline{display:block;width:fit-content;margin:0 auto 6px}
.wpr-plan-name{display:inline-flex;align-items:center;gap:6px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:20px;margin:0;color:var(--ink)}
.wpr-plan-name svg{color:var(--cy);flex-shrink:0}
.wpr-price{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:clamp(32px,3.2vw,44px);letter-spacing:-.03em;line-height:1;color:var(--ink);white-space:nowrap}
.wpr-price span{font-family:"Figtree",sans-serif;font-weight:500;font-size:15px;letter-spacing:0;color:var(--dim);margin-left:3px}
.wpr-custom{font-size:clamp(28px,2.8vw,36px);background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wpr-cyc{color:var(--dim);font-size:13px;margin-top:-2px}
.wpr-value{color:var(--mut);font-size:13.5px;line-height:1.5;min-height:2.9em;margin:2px 0 2px}
.wpr-plan-lines{list-style:none;margin:4px 0 16px;padding:0;display:flex;flex-direction:column;gap:9px}
.wpr-plan-lines li{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--mut);line-height:1.4}
.wpr-plan-lines li svg{color:var(--em);flex-shrink:0;margin-top:2px}
.wpr-plan-lines b{color:var(--ink);font-weight:700}
.wpr-footnote{text-align:center;color:var(--dim);font-size:12.5px;line-height:1.55;max-width:64ch;margin:18px auto 0}
.wpr-tasknote{text-align:center;color:var(--mut);font-size:14px;line-height:1.55;max-width:66ch;margin:16px auto 0;padding:0 24px}
.wpr-tasknote b{color:var(--ink);font-weight:700}
.wpr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(10,147,196,.6);margin-top:auto;white-space:nowrap}
.wpr-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
.wpr-btn.sm{padding:8px 14px;font-size:13px;border-radius:9px;margin-top:0}
.wpr-btn:hover{filter:brightness(1.03)}

/* matrix */
.wpr-matrix{max-width:1160px;margin:0 auto;padding:40px 24px 10px}
.wpr-card{border:1px solid var(--line);border-radius:22px;background:var(--panel);overflow:hidden;box-shadow:0 1px 2px rgba(10,13,18,.04),0 20px 44px -30px rgba(10,13,18,.25)}
.wpr-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
.wpr-tbl{width:100%;min-width:900px;border-collapse:separate;border-spacing:0;font-size:14.5px}
.wpr-tbl th,.wpr-tbl td{padding:13px 16px;text-align:center;border-top:1px solid var(--line);vertical-align:middle}
.wpr-tbl thead th{border-top:none;padding:18px 16px 14px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:17px;color:var(--ink);background:var(--emf)}
.wpr-tbl thead th.pop{color:var(--em)}
.wpr-th-price{display:block;font-family:"Figtree",sans-serif;font-weight:600;font-size:12.5px;color:var(--dim);margin-top:2px}
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
.wpr-tname{display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:20px}
.wpr-tname small{font-family:"Figtree",sans-serif;font-weight:600;font-size:13px;color:var(--dim);margin-left:6px}
.wpr-tcard ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.wpr-tcard li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--ink);line-height:1.45}
.wpr-tcard li.off{color:var(--dim)}
.wpr-tcard li .wpr-yes,.wpr-tcard li .wpr-no{width:22px;height:22px;flex-shrink:0}
.wpr-tcard li .wpr-val{flex-shrink:0;font-size:13px;color:var(--em);padding-top:1px;white-space:normal}
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
.wpr-fine{display:flex;align-items:center;justify-content:center;gap:7px;text-align:center;color:var(--dim);font-size:13.5px;margin-top:20px}
.wpr-fine svg{color:var(--cy);flex-shrink:0}
.wpr-cta{max-width:1160px;margin:0 auto;padding:26px 24px 40px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wpr-cta .wpr-btn{margin-top:0}

@media(max-width:1080px){.wpr-plans{grid-template-columns:repeat(2,minmax(0,1fr))}.wpr-notes-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:768px){.wpr-card{display:none}.wpr-stack{display:grid;grid-template-columns:1fr;gap:14px}}
@media(max-width:560px){.wpr-plans{grid-template-columns:1fr}.wpr-notes-grid{grid-template-columns:1fr}.wpr-hero h1{font-size:30px}}
`
