// Public accuracy-benchmark scoreboard. Honest by construction: reads the latest
// PUBLIC run summary from /api/work/benchmark (generic model labels, aggregates +
// 95% CI, held-out tasks excluded from the sample), and shows the methodology +
// a clear "first run pending" state until a run has been recorded. Never shows
// the internal detail (exact model / per-task). Spec: docs/accuracy-benchmark-spec.md
import React, { useEffect, useState } from 'react'
import { BarChart3, ShieldCheck, FlaskConical, Lock, ArrowRight, Check, ListChecks } from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import useSeo from '../useSeo.js'   // per-route title / description / canonical (WEB-01)
import { useT } from '../i18n/index.jsx'   // localized <title>/description (seo.* keys) + benchmark.* strings
import { shouldRevealAtOnce } from '../reveal.js'   // reduced motion / crawler: no count-up, final value at once

const DOMAIN_LABEL = { dev: 'Dev / data', finance: 'Spreadsheet / finance', cross: 'Cross-profession', security: 'Security / code review' }
const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`
const ci = (a) => `${pct(a[0])} to ${pct(a[1])}`   // CI range, no dash
const fmtDate = (s) => { try { return new Date(s).toLocaleString() } catch { return '' } }

// The headline pass rate counts up from 0 to its real value once (about a
// second, eased), so the number reads as measured, not pasted. The value shown
// is always the API's own; reduced motion shows it at once.
function CountUp({ value, format }) {
  const [v, setV] = useState(() => (shouldRevealAtOnce() ? value : 0))
  useEffect(() => {
    if (shouldRevealAtOnce()) { setV(value); return undefined }
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1100)
      const e = 1 - Math.pow(1 - k, 3)
      setV(value * e)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(v)}</>
}

// How a task is scored: the four stages, as a numbered rail. Copy from the
// catalog (benchmark.flow). Each step rises in on its own beat.
function ScoreFlow({ t }) {
  const flow = t('benchmark.flow') || []
  return (
    <section className="wbm-flow" aria-labelledby="wbm-flow-h">
      <div className="wbm-eyebrow"><ListChecks size={13} aria-hidden="true" /> {t('benchmark.scoreEyebrow')}</div>
      <h2 id="wbm-flow-h" className="wbm-sr">{t('benchmark.scoreEyebrow')}</h2>
      <ol className="wbm-steps">
        {flow.map((s, i) => (
          <li key={i} style={{ '--i': i }}><span className="wbm-step-n" aria-hidden="true">{i + 1}</span><b>{s.t}</b><span>{s.d}</span></li>
        ))}
      </ol>
    </section>
  )
}

// Why the interval matters: two bars with their whiskers, one from a thin
// sample (wide), one from a solid sample (narrow). The drawing carries NO
// numbers on purpose (the page never invents a figure); the legend is HTML so
// it wraps in any language instead of crossing the drawing.
function CiFigure({ t }) {
  return (
    <div className="wbm-ci">
      <div className="wbm-ci-copy"><b>{t('benchmark.ciTitle')}</b><p>{t('benchmark.ciP')}</p></div>
      <div className="wbm-ci-fig">
        <svg viewBox="0 0 320 96" role="img" aria-label={t('benchmark.ciAria')} className="wbm-ci-svg">
          <line x1="16" y1="80" x2="304" y2="80" stroke="currentColor" strokeOpacity=".2" />
          <rect className="wbm-ci-bar a" x="40" y="34" width="150" height="16" rx="8" />
          <line className="wbm-ci-wh a" x1="104" y1="42" x2="276" y2="42" strokeWidth="2" strokeLinecap="round" />
          <line className="wbm-ci-wh a" x1="104" y1="35" x2="104" y2="49" strokeWidth="2" strokeLinecap="round" />
          <line className="wbm-ci-wh a" x1="276" y1="35" x2="276" y2="49" strokeWidth="2" strokeLinecap="round" />
          <rect className="wbm-ci-bar b" x="40" y="58" width="150" height="16" rx="8" />
          <line className="wbm-ci-wh b" x1="172" y1="66" x2="208" y2="66" strokeWidth="2" strokeLinecap="round" />
          <line className="wbm-ci-wh b" x1="172" y1="59" x2="172" y2="73" strokeWidth="2" strokeLinecap="round" />
          <line className="wbm-ci-wh b" x1="208" y1="59" x2="208" y2="73" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <ul className="wbm-ci-leg">
          <li><i className="bar" /> {t('benchmark.ciRate')}</li>
          <li><i className="wh" /> {t('benchmark.ciBand')}</li>
          <li><i className="a" /> {t('benchmark.ciThin')}</li>
          <li><i className="b" /> {t('benchmark.ciSolid')}</li>
        </ul>
      </div>
    </div>
  )
}

// One tier scorecard: the pass rate reads at a glance (big number + a bar the
// width of the rate), then the honest per-domain breakdown. The table is built
// to FIT its card at every width: the domain name wraps, the three number
// columns stay on one line and right-align, so the card never grows a scrollbar.
function ModelScore({ title, summary }) {
  if (!summary || !summary.overall) return null
  const o = summary.overall
  const rate = Math.max(0, Math.min(1, Number(o.rate) || 0))
  return (
    <section className="wbm-card" aria-label={title}>
      <h3 className="wbm-card-h">{title}</h3>
      <div className="wbm-big"><CountUp value={rate} format={pct} /></div>
      <div className="wbm-bar" aria-hidden="true"><span style={{ width: `${rate * 100}%` }} /></div>
      <p className="wbm-meta">{o.pass}/{o.n} correct &middot; 95% CI {ci(o.ci95)}{o.aiGradedCount ? ` · ${o.aiGradedCount} AI-graded` : ''}</p>
      <table className="wbm-table">
        <caption className="wbm-sr">{title}: result correctness by domain</caption>
        <thead><tr><th scope="col">Domain</th><th scope="col" className="wbm-num">Correct</th><th scope="col" className="wbm-num">Rate</th><th scope="col" className="wbm-num">95% CI</th></tr></thead>
        <tbody>
          {Object.entries(summary.domains || {}).map(([d, v]) => (
            <tr key={d}>
              <th scope="row">{DOMAIN_LABEL[d] || d}</th>
              <td className="wbm-num">{v.pass}/{v.n}</td>
              <td className="wbm-num">{pct(v.rate)}</td>
              <td className="wbm-num">{ci(v.ci95)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// Accessibility (WEB-08): <main>, a hidden H2 over the tier scorecards (their
// titles are H3s), table captions, column/row header scopes, a status role on
// the pending notice, hidden decorative icons, visible focus rings, and a link
// blue that meets AA on the page tint.
export default function WorkBenchmark() {
  const t = useT()
  useSeo({
    title: t('seo.benchmark.title'),
    description: t('seo.benchmark.description'),
    path: '/workcopilot/benchmark',
  })
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let alive = true
    fetch('/api/work/benchmark').then((r) => r.json()).then((d) => { if (alive) setData(d) }).catch(() => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [])

  const pending = !data || data.pending || err
  return (
    <div className="wbm">
      <style>{CSS}</style>
      <SiteHeader />

      <main className="wbm-main" id="main">
        <div className="wbm-eyebrow"><FlaskConical size={13} aria-hidden="true" /> Accuracy benchmark</div>
        <h1>How accurate is WorkCoPilot?</h1>
        <p className="wbm-lead">One measure: given a task with a known-correct answer, does WorkCoPilot return it. Real pass rates, with sample size and 95% confidence interval. Nothing rounded up.</p>

        <ul className="wbm-chips" aria-label="How these numbers stay honest">
          <li><Check size={14} aria-hidden="true" /> Graded mechanically where possible</li>
          <li><Check size={14} aria-hidden="true" /> A held-out set kept private</li>
          <li><Check size={14} aria-hidden="true" /> Per tier, never a model name</li>
        </ul>

        {pending ? (
          <div className="wbm-pending" role="status">
            <BarChart3 size={18} aria-hidden="true" />
            <div>
              <b>First public run pending.</b>
              <p>The benchmark is built and tested. Numbers land here once a public run is recorded.</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="wbm-sr">Results by AI tier</h2>
            <div className="wbm-grid">
              <ModelScore title="Higher-capability tier" summary={data.models && data.models.strong && data.models.strong.summary} />
              <ModelScore title="Speed-optimized tier" summary={data.models && data.models.fast && data.models.fast.summary} />
            </div>
            <p className="wbm-when">Last run {fmtDate(data.at)}.</p>
            {Array.isArray(data.sampleTasks) && data.sampleTasks.length ? (
              <div className="wbm-sample">
                <h2>Sample tasks</h2>
                <p className="wbm-dim">A public sample. Held-out tasks are scored but never shown.</p>
                <ul>{data.sampleTasks.map((t, i) => <li key={i}><span className="wbm-tag">{DOMAIN_LABEL[t.domain] || t.domain}</span> {t.prompt}</li>)}</ul>
              </div>
            ) : null}
          </>
        )}

        <ScoreFlow t={t} />

        <section className="wbm-method">
          <h2>How we measure</h2>
          <div className="wbm-mgrid">
            <div className="wbm-m"><b>Result correctness</b><span>Each task runs through the product, then is graded against a known-correct reference.</span></div>
            <div className="wbm-m"><b>Verified first</b><span>Mechanical checks where an answer allows it. An AI judge only otherwise, flagged, with a human spot-check each run.</span></div>
            <div className="wbm-m"><b>Four domains</b><span>Dev and data, spreadsheet and finance, a cross-profession mix, security and code review.</span></div>
            <div className="wbm-m"><b>Honest numbers</b><span>Pass rates with sample sizes and 95% CIs. A private held-out set resists overfitting.</span></div>
          </div>
          <CiFigure t={t} />
          <div className="wbm-note"><ShieldCheck size={14} aria-hidden="true" /> <span>We would rather publish a true, smaller number with its confidence interval than a round one without. Thin domains are labeled.</span></div>
        </section>

        <section className="wbm-cta">
          <div>
            <h2>See what it does, then what it costs</h2>
            <p>WorkCoPilot guides people through real work to a finished result.</p>
          </div>
          <div className="wbm-ctabtns">
            <a className="wbm-btn" href="/workcopilot/pricing">See pricing <ArrowRight size={16} aria-hidden="true" /></a>
            <a className="wbm-btn alt" href="/workcopilot/how-it-works">How it works</a>
          </div>
        </section>

        <nav className="wbm-links" aria-label="Related pages">
          <a className="wbm-link" href="/workcopilot/security"><Lock size={13} aria-hidden="true" /> Security &amp; data handling</a>
          <a className="wbm-link" href="/">Back to home</a>
        </nav>
      </main>
      <SiteFooter />
    </div>
  )
}

const CSS = `
[data-theme='dark'] .wbm{--ink:#eef0f6;--mut:#9aa0b4;--line:rgba(255,255,255,.09);--panel:#13141f;--em:#39d3ff;--bg:#0a0b12}
.wbm{--ink:#161a2b;--mut:#5c6484;--line:#e6e8f1;--panel:#ffffff;--em:#0a84c2;--bg:#f3f5fb;min-height:100vh;background:var(--bg);color:var(--ink);font-family:"Figtree",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
/* a11y: visually hidden text; visible focus ring (never outline:none) */
.wbm-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wbm a:focus-visible,.wbm button:focus-visible{outline:2px solid var(--em);outline-offset:3px;border-radius:6px}
.wbm-main{max-width:900px;margin:0 auto;padding:20px 20px 72px}
.wbm-eyebrow{display:inline-flex;align-items:center;gap:6px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--em);border:1px solid rgba(10,127,168,.25);background:rgba(10,127,168,.06);padding:4px 10px;border-radius:999px}
.wbm h1{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;line-height:1.1;margin:14px 0 0}
.wbm-lead{color:var(--mut);font-size:16px;line-height:1.55;max-width:64ch;margin:12px 0 0}
.wbm-chips{list-style:none;display:flex;flex-wrap:wrap;gap:8px 10px;padding:0;margin:16px 0 24px}
.wbm-chips li{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
.wbm-chips svg{color:var(--em);flex-shrink:0}
.wbm-pending{display:flex;gap:12px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(26,31,54,.04),0 10px 26px -16px rgba(26,31,54,.15)}
.wbm-pending svg{color:var(--em);flex-shrink:0;margin-top:2px}
.wbm-pending b{font-size:15px}
.wbm-pending p{color:var(--mut);font-size:14px;line-height:1.55;margin:4px 0 0}
.wbm-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px}
.wbm-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 1px 2px rgba(26,31,54,.04),0 10px 26px -16px rgba(26,31,54,.15);min-width:0}
.wbm-card-h{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);margin:0 0 6px;font-family:inherit}
.wbm-big{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:40px;line-height:1;letter-spacing:-.02em;color:var(--ink)}
.wbm-bar{height:7px;border-radius:999px;background:rgba(10,127,168,.12);overflow:hidden;margin:10px 0 8px}
[data-theme='dark'] .wbm-bar{background:rgba(57,211,255,.14)}
.wbm-bar span{display:block;height:100%;border-radius:999px;background:var(--em)}
.wbm-meta{font-size:12.5px;color:var(--mut);margin:0 0 14px}
.wbm-table{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed}
.wbm-table th,.wbm-table td{padding:6px 4px;border-bottom:1px solid var(--line);vertical-align:top}
.wbm-table thead th{text-align:left;color:var(--mut);font-weight:600}
.wbm-table .wbm-num{text-align:right;white-space:nowrap;color:var(--ink);font-variant-numeric:tabular-nums}
.wbm-table thead th.wbm-num{color:var(--mut)}
.wbm-table tbody th{text-align:left;color:var(--ink);font-weight:600;line-height:1.3;padding-right:8px}
.wbm-table tr:last-child td,.wbm-table tbody tr:last-child th{border-bottom:none}
.wbm-when{color:var(--mut);font-size:12.5px;margin:6px 0 24px}
.wbm-sample{margin-bottom:24px}
.wbm-sample h2,.wbm-method h2,.wbm-cta h2{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;margin:0}
.wbm-sample h2,.wbm-method h2{font-size:18px;margin-bottom:6px}
.wbm-dim{color:var(--mut);font-size:13px;margin:0 0 8px}
.wbm-sample ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wbm-sample li{font-size:13.5px;line-height:1.5;color:var(--ink)}
.wbm-tag{display:inline-block;font-size:11px;font-weight:700;color:var(--em);background:rgba(10,127,168,.08);border:1px solid rgba(10,127,168,.2);border-radius:6px;padding:1px 7px;margin-right:6px}
/* how a task is scored: a four-step rail, each step rising in on its own beat */
.wbm-flow{margin-top:22px}
.wbm-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;counter-reset:s}
.wbm-steps li{position:relative;display:flex;flex-direction:column;gap:5px;min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 14px 13px;box-shadow:0 1px 2px rgba(26,31,54,.04);animation:wbm-rise .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 120ms)}
.wbm-steps li::after{content:'';position:absolute;right:-7px;top:50%;width:12px;height:2px;background:var(--line);transform:translateY(-50%)}
.wbm-steps li:last-child::after{display:none}
.wbm-step-n{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;color:#fff;background:linear-gradient(135deg,#10a271,#0a93c4)}
.wbm-steps b{font-size:13.5px;color:var(--ink);line-height:1.3}
.wbm-steps li>span:not(.wbm-step-n){font-size:12.5px;line-height:1.45;color:var(--mut)}
@keyframes wbm-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
/* why the interval matters: copy + the numberless drawing + an HTML legend */
.wbm-ci{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:14px;align-items:center;margin-top:12px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.wbm-ci-copy b{display:block;font-size:14px;color:var(--ink);margin-bottom:3px}
.wbm-ci-copy p{margin:0;font-size:13px;line-height:1.5;color:var(--mut)}
.wbm-ci-fig{min-width:0}
.wbm-ci-svg{display:block;width:100%;height:auto;color:var(--ink)}
.wbm-ci-bar{fill:rgba(10,127,168,.16)}
.wbm-ci-bar.b{fill:rgba(16,162,113,.18)}
.wbm-ci-wh{stroke:#0a84c2;stroke-dasharray:200;stroke-dashoffset:200;animation:wbm-draw 1s ease-out .3s forwards}
.wbm-ci-wh.b{stroke:#0e9f6e;animation-delay:.6s}
@keyframes wbm-draw{to{stroke-dashoffset:0}}
.wbm-ci-leg{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;color:var(--mut)}
.wbm-ci-leg li{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.wbm-ci-leg i{display:inline-block;width:14px;height:8px;border-radius:4px;background:rgba(10,127,168,.16)}
.wbm-ci-leg i.wh{height:2px;border-radius:1px;background:#0a84c2}
.wbm-ci-leg i.a{background:#0a84c2;height:2px;border-radius:1px}
.wbm-ci-leg i.b{background:#0e9f6e;height:2px;border-radius:1px}
@media(max-width:720px){.wbm-steps{grid-template-columns:1fr 1fr}.wbm-steps li::after{display:none}.wbm-ci{grid-template-columns:1fr}}
@media(max-width:420px){.wbm-steps{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.wbm-steps li{animation:none}.wbm-ci-wh{animation:none;stroke-dashoffset:0}}
.wbm-method{margin-top:14px}
.wbm-mgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.wbm-m{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 15px}
.wbm-m b{display:block;font-size:14px;color:var(--ink);margin-bottom:3px}
.wbm-m span{display:block;font-size:13px;line-height:1.5;color:var(--mut)}
.wbm-note{display:flex;gap:9px;align-items:flex-start;margin-top:14px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.55;color:var(--mut)}
.wbm-note svg{color:var(--em);flex-shrink:0;margin-top:1px}
.wbm-cta{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-top:26px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 22px;box-shadow:0 10px 26px -16px rgba(26,31,54,.18)}
.wbm-cta h2{font-size:19px;letter-spacing:-.01em}
.wbm-cta p{color:var(--mut);font-size:13.5px;margin:4px 0 0}
.wbm-ctabtns{display:flex;gap:10px;flex-wrap:wrap}
.wbm-btn{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;padding:10px 16px;background:var(--em);color:#fff;border:1px solid var(--em)}
.wbm-btn:hover{filter:brightness(1.05)}
.wbm-btn.alt{background:transparent;color:var(--em)}
.wbm-btn.alt:hover{background:rgba(10,127,168,.06)}
.wbm-links{display:flex;gap:18px;flex-wrap:wrap;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.wbm-link{display:inline-flex;align-items:center;gap:6px;color:var(--em);text-decoration:none;font-size:14px;font-weight:600}
.wbm-link:hover{text-decoration:underline}
@media(max-width:720px){
  .wbm-grid{grid-template-columns:1fr}
  .wbm-mgrid{grid-template-columns:1fr}
  .wbm-cta{flex-direction:column;align-items:flex-start}
  .wbm-ctabtns{width:100%}
  .wbm-btn{flex:1;justify-content:center;min-height:44px}
  /* DESIGN-06: comfortable one-handed tap targets for the footer links */
  .wbm-links{gap:4px 18px}
  .wbm-link{min-height:40px}
}
`
