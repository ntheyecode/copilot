// WorkCoPilot - full pricing page (audit WEB-05). A clear plan ENTITLEMENT
// MATRIX for Basic / Advanced / Premium (and the custom-priced Enterprise
// column), moved off the short main page per the owner rule: extra content
// lives on separate pages linked from the footer.
//
// PRICE_ROWS is the ONE place the entitlement matrix lives in the renderer
// (the main page used to carry a copy; it now links here instead). Prices come
// from /api/work/pricing exactly as the main page's plan cards do, with the
// published list prices as the offline fallback so the page is never blank.
// Honesty rules: no model names, no AI cost, never "certified"; where an exact
// value is not published we say "Included" rather than invent a number, and
// the page says final entitlements are confirmed at checkout.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck, Zap, BadgeCheck, Building2 } from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import useSeo from '../useSeo.js'

// Offline fallbacks (USD / month and per-tier values). These MATCH
// server/store.js WORK_PRICING_DEFAULT so the page is never blank and never
// shows a stale number; the live /api/work/pricing values override them.
const FALLBACK = {
  plans: { lite: 69, basic: 99, advanced: 299, premium: 399 },
  hour: { lite: 25, basic: 20, advanced: 15, premium: 10 },
  tasks: { lite: 1, basic: 2, advanced: 4, premium: 6 },
  dailyHours: { lite: 1, basic: 2, advanced: 4, premium: 6 },
}

// Static plan metadata; the numbers (price, daily hours, tasks, overage) are
// derived from the live API in the component so the page can never drift from
// what checkout charges. Column order is Lite, Basic, Advanced, Premium,
// Enterprise - the same order as every matrix row's 5 values.
const PLAN_META = [
  { id: 'lite', name: 'Lite', blurb: 'The entry plan: one simple task at a time, walked through step by step.' },
  { id: 'basic', name: 'Basic', blurb: 'For one person who wants an expert at their side a couple of hours a day.' },
  { id: 'advanced', name: 'Advanced', popular: true, blurb: 'Half a working day of guidance, grounded in your own documents.' },
  { id: 'premium', name: 'Premium', blurb: 'The deepest plan: most hours, generated visuals, first in line.' },
  { id: 'enterprise', name: 'Enterprise', custom: true, blurb: 'Regulated teams, SSO, company policy, seat pools and a DPA.' },
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
  useSeo({
    title: 'Pricing - WorkCoPilot by AdmireVeda',
    description: 'WorkCoPilot plans compared side by side: Lite, Basic, Advanced and Premium with monthly guided tasks and live guidance hours, document upload, generated visuals, security on every plan, overage and cancellation terms. Enterprise is custom.',
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
  // a superadmin cap change follows here automatically. Tasks are stated
  // plainly (unused ones bank); hours are always "up to" + asterisk because a
  // day's hours expire at midnight and do not roll over.
  const DAYS_PER_MONTH = 30
  const perMonth = (n) => Math.round(Number(n) * DAYS_PER_MONTH * 100) / 100
  const tasksMonth = (id) => perMonth(tasksDay(id))
  const hrsMonth = (id) => perMonth(dailyHrs(id))
  const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`
  const hrLabel = (id) => plural(dailyHrs(id), 'hour')
  // Start = the product's sign-in page with the plan carried along (the same
  // query the main page's plan cards use), so the pick survives sign-up.
  const start = (id) => nav(`/workcopilot?plan=${id}`)

  const PLANS = PLAN_META
  // The entitlement matrix, built with the derived numbers so the capacity and
  // overage rows always agree with the plan cards above (no "$10/hour" drift).
  // Roadmaps are Basic and up; diagrams/generated visuals are Premium; document
  // upload is Advanced and up; Lite is the single-task entry plan.
  const PRICE_ROWS = [
    { g: 'Capacity' },
    { k: 'Guided tasks a month', v: [`${tasksMonth('lite')}`, `${tasksMonth('basic')}`, `${tasksMonth('advanced')}`, `${tasksMonth('premium')}`, 'Unlimited'] },
    { k: 'Live guidance a month*', v: [`Up to ${plural(hrsMonth('lite'), 'hour')}`, `Up to ${plural(hrsMonth('basic'), 'hour')}`, `Up to ${plural(hrsMonth('advanced'), 'hour')}`, `Up to ${plural(hrsMonth('premium'), 'hour')}`, 'Custom'] },
    { k: 'Daily rate (tasks / hours)', v: [`${tasksDay('lite')} / ${hrLabel('lite')}`, `${tasksDay('basic')} / ${hrLabel('basic')}`, `${tasksDay('advanced')} / ${hrLabel('advanced')}`, `${tasksDay('premium')} / ${hrLabel('premium')}`, 'Custom'] },
    { k: 'Seats', v: ['1 user', '1 user', '1 user', '1 user', 'Seat pools, your size'] },
    { k: 'Priority in the guidance queue', v: ['Standard', 'Standard', 'Priority', 'Highest', 'Highest'] },
    { g: 'Guidance' },
    { k: 'Step-by-step guidance on any task', v: ALL },
    { k: 'Exact commands, code and links', v: ALL },
    { k: 'Roadmaps', v: [false, true, true, true, true] },
    { k: 'Floating guide + session write-up', v: [false, true, true, true, true] },
    { k: 'Task history you can return to', v: ['Included', 'Included', 'Included', 'Included', 'Included'] },
    { k: 'Desktop, browser and mobile on one subscription', v: ALL },
    { k: 'Upload your own reference documents', v: [false, false, true, true, true] },
    { k: 'Visual examples where they help', v: [false, false, true, true, true] },
    { k: 'Generated visuals and diagrams on demand', v: [false, false, false, true, true] },
    { g: 'Security, on every plan' },
    { k: 'Security-first checked answers', v: ALL },
    { k: 'On-device redaction before anything is sent, when data protection is on', v: ALL },
    { k: 'Read-only by design (never clicks, types or runs)', v: ALL },
    { k: 'Keys and report artifacts encrypted at rest', v: ALL },
    { g: 'Billing' },
    { k: 'Billing cadence', v: ['Monthly', 'Monthly', 'Monthly', 'Monthly', 'Custom'] },
    { k: 'Extra guided time', v: [`${money(hourPrice('lite'))} / hour, never expires`, `${money(hourPrice('basic'))} / hour, never expires`, `${money(hourPrice('advanced'))} / hour, never expires`, `${money(hourPrice('premium'))} / hour, never expires`, 'Custom'] },
    { k: 'Annual billing', v: ['Where available', 'Where available', 'Where available', 'Where available', 'Custom'] },
    { k: 'Cancellation', v: ['Self-service, anytime', 'Self-service, anytime', 'Self-service, anytime', 'Self-service, anytime', 'Per agreement'] },
    { k: 'Support', v: ['Email support', 'Email support', 'Email support', 'Email support', 'Dedicated contact'] },
    { g: 'Enterprise controls' },
    { k: 'Company-wide PII / PHI redaction policy, set by your admin', v: ENT },
    { k: 'SSO (OIDC) and team provisioning', v: ENT },
    { k: 'Per-company AI keys, or bring your own', v: ENT },
    { k: 'Audit log, DPA and a dedicated contact', v: ENT },
    { k: 'On-prem deployment, on request', v: ENT },
  ]

  return (
    <div className="wpr">
      <style>{CSS}</style>
      <SiteHeader current="pricing" />

      <section className="wpr-hero">
        <div className="wpr-eyebrow"><Zap size={14} aria-hidden /> Pricing</div>
        <h1>Simple plans. <em>Real guided time.</em></h1>
        <p>Guided tasks and hours of live, step-by-step guidance every month. Plans differ in capacity and a few power features. Security and privacy are built into every plan, never sold as an upgrade.</p>
      </section>

      {/* Plan tickets: oversized price, the three facts that differ, one Start CTA each. */}
      <section className="wpr-plans" aria-label="Plans">
        {PLANS.map((p) => (
          <article key={p.id} className={`wpr-plan${p.popular ? ' pop' : ''}${p.custom ? ' ent' : ''}`}>
            {p.popular && <div className="wpr-tag">Most popular</div>}
            <h2 className="wpr-plan-name">{p.custom && <Building2 size={16} aria-hidden />} {p.name}</h2>
            {p.custom
              ? <div className="wpr-price wpr-custom">Custom</div>
              : <div className="wpr-price">{money(planPrice(p.id))}<span>/mo</span></div>}
            <div className="wpr-cyc">{p.custom ? 'for regulated teams' : 'billed monthly'}</div>
            <p className="wpr-blurb">{p.blurb}</p>
            <div className="wpr-facts">
              {p.custom ? (
                <><span>Unlimited seats</span><span>Unlimited tasks</span><span>Dedicated contact</span></>
              ) : (
                <><span><b>{tasksMonth(p.id)}</b> task{tasksMonth(p.id) === 1 ? '' : 's'} a month</span><span>up to <b>{hrsMonth(p.id)}</b> hr{hrsMonth(p.id) === 1 ? '' : 's'} a month*</span><span>+1h <b>{money(hourPrice(p.id))}</b></span></>
              )}
            </div>
            {!p.custom && (
              <ul className="wpr-plan-lines">
                <li><b>{plural(tasksMonth(p.id), 'guided task')}</b> a month ({tasksDay(p.id)} a day - unused ones bank as credits)</li>
                <li><b>Up to {plural(hrsMonth(p.id), 'hour')}</b> of guidance a month ({hrLabel(p.id)} a day, resets at midnight)*</li>
                <li>Spend your hours anytime across the day, in as little as a minute at a time. Billed per minute you actually use, never by the hour.</li>
              </ul>
            )}
            {p.custom
              ? <a className="wpr-btn alt" href="/workcopilot/contact">Contact sales <ArrowRight size={15} aria-hidden /></a>
              : <button className={`wpr-btn${p.popular ? '' : ' alt'}`} onClick={() => start(p.id)} aria-label={`Start ${p.name}`}>Start {p.name} <ArrowRight size={15} aria-hidden /></button>}
          </article>
        ))}
      </section>

      {/* THE MATRIX. Desktop and tablet: a table that scrolls inside its own
          card when the viewport is narrower than it (the page never scrolls
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
                : <button className={`wpr-btn${p.popular ? '' : ' alt'}`} onClick={() => start(p.id)} aria-label={`Start ${p.name}`}>Start {p.name} <ArrowRight size={15} aria-hidden /></button>}
            </article>
          ))}
        </div>

        <div className="wpr-trust">
          <span><Lock size={14} aria-hidden /> Secure checkout, powered by Stripe</span>
          <span><Check size={14} aria-hidden /> Cancel anytime, no contract</span>
          <span><ShieldCheck size={14} aria-hidden /> Purchased time never expires</span>
        </div>
        {/* The one "*" note for every monthly number above: how the daily allowance
            behind it works (hours expire at midnight, tasks bank). Plan-independent
            on purpose - each card already shows its own daily rate. */}
        <p className="wpr-footnote">*Each day you get your plan's guided tasks and hours of guidance. Daily hours reset at midnight (US Eastern) - they don't roll over. Unused tasks bank as credits you keep, or trade 2 tasks for 1 extra hour (expires that day). Billed per minute you actually use.</p>
      </section>

      {/* Plain-language notes: the terms behind the matrix, honestly stated. */}
      <section className="wpr-notes" aria-labelledby="wpr-notes-h">
        <h2 id="wpr-notes-h" className="wpr-h2">The fine print, in plain words.</h2>
        <div className="wpr-notes-grid">
          <div className="wpr-note">
            <h3>Daily minutes, not hourly blocks</h3>
            <p>Your plan's monthly hours arrive as a <b>daily allowance of minutes</b> you can spend anytime across the whole day - a few minutes here, a few there. We count only the minutes you are actually being guided, billed per minute used, never rounded up to the hour. Pause anytime and come back right where you left off. Daily hours reset at midnight, US Eastern time, and do not roll over; unused tasks bank as credits you keep.</p>
          </div>
          <div className="wpr-note">
            <h3>Extra time</h3>
            <p>Need more on a busy day? Top up extra guided hours anytime - the per-hour rate depends on your plan (shown in the table above and confirmed at checkout). Purchased time never expires.{price && price.image && price.image.premium != null ? ` Premium adds generated visuals, and image packs start from ${money(price.image.premium)} each${price.imageMinBulk ? ` (min ${price.imageMinBulk})` : ''}.` : ''}</p>
          </div>
          <div className="wpr-note">
            <h3>Billing and cancellation</h3>
            <p>Plans are billed monthly. Annual billing, at a discount, may be available at checkout. Cancel yourself anytime from your account, no contract and no call needed.</p>
          </div>
          <div className="wpr-note">
            <h3>Teams and companies</h3>
            <p>Lite, Basic, Advanced and Premium are single-user plans. For seat pools, SSO, a company-wide redaction policy, a DPA and a dedicated contact, talk to us about Enterprise.</p>
          </div>
        </div>
        <p className="wpr-fine"><BadgeCheck size={14} aria-hidden /> Final entitlements and prices are confirmed at checkout. Taxes may apply by location.</p>
      </section>

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
[data-theme='dark'] .wpr{--ink:#eef0f6;--mut:#9aa0b4;--dim:#6c7780;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.15);--panel:#13141f;--panel2:#181b27;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff}
.wpr{--ink:#161a2b;--mut:#5c6484;--dim:#8b93a1;--line:#e6e8f1;--line-strong:#d3d7e5;--panel:#ffffff;--panel2:#f6f8fd;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--emf:rgba(16,162,113,.08);
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
.wpr-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:640px;line-height:1.55}
.wpr-h2{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600;font-size:clamp(24px,3vw,32px);letter-spacing:-.02em;line-height:1.1;margin:0 0 18px;text-align:center;color:var(--ink)}

/* plan tickets */
.wpr-plans{max-width:1160px;margin:0 auto;padding:26px 24px 10px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;align-items:stretch}
.wpr-plan{position:relative;display:flex;flex-direction:column;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px 22px 22px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 20px 44px -30px rgba(10,13,18,.25);min-width:0}
.wpr-plan::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;border-radius:20px 20px 0 0;background:linear-gradient(90deg,var(--em),var(--cy));opacity:.55}
.wpr-plan.pop{border-color:rgba(16,162,113,.45);background:linear-gradient(180deg,rgba(16,162,113,.07),#fff 38%)}
.wpr-plan.pop::before{opacity:1}
.wpr-plan.ent{background:linear-gradient(180deg,rgba(10,147,196,.06),#fff 40%)}
.wpr-tag{display:inline-flex;align-self:flex-start;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,var(--em),var(--cy));border-radius:999px;padding:3px 9px;white-space:nowrap}
.wpr-tag.inline{display:block;width:fit-content;margin:0 auto 6px}
.wpr-plan-name{display:inline-flex;align-items:center;gap:6px;font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:20px;margin:0;color:var(--ink)}
.wpr-plan-name svg{color:var(--cy)}
.wpr-price{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:clamp(34px,3.4vw,46px);letter-spacing:-.03em;line-height:1;color:var(--ink)}
.wpr-price span{font-family:"Figtree",sans-serif;font-weight:500;font-size:15px;letter-spacing:0;color:var(--dim);margin-left:3px}
.wpr-custom{font-size:clamp(28px,2.8vw,36px);background:linear-gradient(120deg,var(--em),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent}
.wpr-cyc{color:var(--dim);font-size:13px;margin-top:-2px}
.wpr-blurb{color:var(--mut);font-size:14px;line-height:1.5;min-height:3em}
.wpr-facts{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
.wpr-facts span{font-size:12.5px;color:var(--mut);background:#f4f8f7;border:1px solid var(--line);border-radius:999px;padding:4px 10px;white-space:nowrap}
.wpr-facts b{color:var(--ink);font-weight:700}
.wpr-plan-lines{list-style:none;margin:0 0 12px;padding:9px 11px;display:flex;flex-direction:column;gap:6px;background:#f4f8f7;border:1px solid var(--line);border-radius:10px;color:var(--mut);font-size:12.5px;line-height:1.5;overflow-wrap:anywhere}
.wpr-plan-lines b{color:var(--em);font-weight:700}
.wpr-footnote{text-align:center;color:var(--dim);font-size:12.5px;line-height:1.55;max-width:68ch;margin:18px auto 0}
.wpr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 20px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(10,147,196,.6);margin-top:auto}
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
.wpr-tcard.pop{border-color:rgba(16,162,113,.45);background:linear-gradient(180deg,rgba(16,162,113,.07),#fff 30%)}
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
.wpr-note{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 20px 22px;box-shadow:0 1px 2px rgba(10,13,18,.04)}
.wpr-note h3{font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:17px;margin:0 0 8px;color:var(--ink)}
.wpr-note p{color:var(--mut);font-size:14px;line-height:1.55}
.wpr-fine{display:flex;align-items:center;justify-content:center;gap:7px;text-align:center;color:var(--dim);font-size:13.5px;margin-top:20px}
.wpr-fine svg{color:var(--cy);flex-shrink:0}
.wpr-cta{max-width:1160px;margin:0 auto;padding:26px 24px 40px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wpr-cta .wpr-btn{margin-top:0}

@media(max-width:1080px){.wpr-plans{grid-template-columns:repeat(2,minmax(0,1fr))}.wpr-notes-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:768px){.wpr-card{display:none}.wpr-stack{display:grid;grid-template-columns:1fr;gap:14px}}
@media(max-width:560px){.wpr-plans{grid-template-columns:1fr}.wpr-notes-grid{grid-template-columns:1fr}.wpr-hero h1{font-size:30px}}
`
