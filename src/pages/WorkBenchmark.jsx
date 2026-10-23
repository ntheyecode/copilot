// Public accuracy-benchmark scoreboard. Honest by construction: reads the latest
// PUBLIC run summary from /api/work/benchmark (generic model labels, aggregates +
// 95% CI, held-out tasks excluded from the sample), and shows the methodology +
// a clear "first run pending" state until a run has been recorded. Never shows
// the internal detail (exact model / per-task). Spec: docs/accuracy-benchmark-spec.md
import React, { useEffect, useState } from 'react'
import { BarChart3, ShieldCheck, FlaskConical, ArrowLeft, Lock } from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'

const DOMAIN_LABEL = { dev: 'Dev / data', finance: 'Spreadsheet / finance', cross: 'Cross-profession', security: 'Security / code review' }
const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`
const fmtDate = (s) => { try { return new Date(s).toLocaleString() } catch { return '' } }

function ModelScore({ title, summary }) {
  if (!summary || !summary.overall) return null
  const o = summary.overall
  return (
    <div className="wbm-card">
      <div className="wbm-card-h">{title}</div>
      <div className="wbm-overall">
        <span className="wbm-big">{pct(o.rate)}</span>
        <span className="wbm-meta">{o.pass}/{o.n} correct &middot; 95% CI {pct(o.ci95[0])}&ndash;{pct(o.ci95[1])}{o.aiGradedCount ? ` · ${o.aiGradedCount} AI-graded` : ''}</span>
      </div>
      <table className="wbm-table">
        <thead><tr><th>Domain</th><th>Correct</th><th>Rate</th><th>95% CI</th></tr></thead>
        <tbody>
          {Object.entries(summary.domains || {}).map(([d, v]) => (
            <tr key={d}><td>{DOMAIN_LABEL[d] || d}</td><td>{v.pass}/{v.n}</td><td>{pct(v.rate)}</td><td>{pct(v.ci95[0])}&ndash;{pct(v.ci95[1])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function WorkBenchmark() {
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
      <header className="wbm-top">
        <a className="wbm-brand" href="/"><AdmireVedaLogo size={24} idSuffix="bm" /> <span>WorkCoPilot</span></a>
        <a className="wbm-back" href="/"><ArrowLeft size={14} /> Home</a>
      </header>

      <main className="wbm-main">
        <div className="wbm-eyebrow"><FlaskConical size={13} /> Accuracy benchmark</div>
        <h1>How accurate is WorkCoPilot?</h1>
        <p className="wbm-lead">We measure <b>result correctness</b>: given a task with a known-correct answer, does WorkCoPilot return the right one. We report the real number with its sample size and confidence interval, per domain, for a top-ranked model and a fast model separately. We do not publish rounded-up figures, and a held-out portion of the tasks is kept private so the numbers cannot be gamed.</p>

        {pending ? (
          <div className="wbm-pending">
            <BarChart3 size={18} />
            <div>
              <b>First public run pending.</b>
              <p>The benchmark harness, graders and task corpus are built and tested. Numbers appear here once a run has been recorded. Until then, the methodology below is the honest statement of how we will measure.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="wbm-grid">
              <ModelScore title="A top-ranked model" summary={data.models && data.models.strong && data.models.strong.summary} />
              <ModelScore title="A fast model" summary={data.models && data.models.fast && data.models.fast.summary} />
            </div>
            <p className="wbm-when">Last run {fmtDate(data.at)}.</p>
            {Array.isArray(data.sampleTasks) && data.sampleTasks.length ? (
              <div className="wbm-sample">
                <h2>Sample tasks</h2>
                <p className="wbm-dim">A public sample (held-out tasks are scored but never shown).</p>
                <ul>{data.sampleTasks.map((t, i) => <li key={i}><span className="wbm-tag">{DOMAIN_LABEL[t.domain] || t.domain}</span> {t.prompt}</li>)}</ul>
              </div>
            ) : null}
          </>
        )}

        <section className="wbm-method">
          <h2>How we measure</h2>
          <ul>
            <li><b>Result correctness.</b> The task is run through the same result pipeline the product uses; the returned answer is graded against a known-correct reference.</li>
            <li><b>Grading, most to least rigorous.</b> We run code, SQL and formulas against fixtures and compare the real output; use exact / numeric / structured matching where the answer is deterministic; and only where neither applies, a strong model judges against a reference. AI-judged results are labelled, and a random sample is re-checked by a person each run.</li>
            <li><b>Four domains.</b> Dev and data, spreadsheet and finance, a cross-profession mix, and security and code review.</li>
            <li><b>Honest reporting.</b> Per-domain and overall pass rates with sample sizes and 95% confidence intervals, refreshed each release. Public task set plus a private held-out portion, so the numbers resist overfitting.</li>
            <li><b>Model labels.</b> Results are reported for a top-ranked model and a fast model separately. We do not name the specific model here.</li>
          </ul>
          <div className="wbm-note"><ShieldCheck size={14} /> <span>We would rather publish a true, smaller number with its confidence interval than a round figure without one. Where a domain has few tasks, we say so.</span></div>
        </section>

        <div className="wbm-cta">
          <a className="wbm-link" href="/workcopilot/security"><Lock size={13} /> Security &amp; data handling</a>
          <a className="wbm-link" href="/workcopilot/how-it-works">How it works</a>
          <a className="wbm-link" href="/">Back to home</a>
        </div>
      </main>
    </div>
  )
}

const CSS = `
.wbm{--ink:#0e1320;--mut:#5b6472;--line:#e6e9ef;--em:#0a7fa8;--bg:#f7f9fc;min-height:100vh;background:var(--bg);color:var(--ink);font-family:"Figtree",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wbm-top{display:flex;align-items:center;justify-content:space-between;max-width:1000px;margin:0 auto;padding:18px 20px}
.wbm-brand{display:inline-flex;align-items:center;gap:9px;font-weight:700;color:var(--ink);text-decoration:none}
.wbm-back{display:inline-flex;align-items:center;gap:5px;color:var(--mut);text-decoration:none;font-size:14px}
.wbm-back:hover{color:var(--ink)}
.wbm-main{max-width:860px;margin:0 auto;padding:20px 20px 72px}
.wbm-eyebrow{display:inline-flex;align-items:center;gap:6px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--em);border:1px solid rgba(10,127,168,.25);background:rgba(10,127,168,.06);padding:4px 10px;border-radius:999px}
.wbm h1{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;line-height:1.1;margin:14px 0 0}
.wbm-lead{color:var(--mut);font-size:16px;line-height:1.6;max-width:70ch;margin:14px 0 24px}
.wbm-pending{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(26,31,54,.04),0 10px 26px -16px rgba(26,31,54,.15)}
.wbm-pending svg{color:var(--em);flex-shrink:0;margin-top:2px}
.wbm-pending p{color:var(--mut);font-size:14px;line-height:1.55;margin:4px 0 0}
.wbm-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px}
.wbm-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(26,31,54,.04),0 10px 26px -16px rgba(26,31,54,.15)}
.wbm-card-h{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
.wbm-overall{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:8px 0 14px}
.wbm-big{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:34px;letter-spacing:-.02em;color:var(--ink)}
.wbm-meta{font-size:12.5px;color:var(--mut)}
.wbm-table{width:100%;border-collapse:collapse;font-size:13px}
.wbm-table th{text-align:left;color:var(--mut);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line)}
.wbm-table td{padding:6px 8px;border-bottom:1px solid var(--line);color:var(--ink)}
.wbm-table tr:last-child td{border-bottom:none}
.wbm-when{color:var(--mut);font-size:12.5px;margin:6px 0 24px}
.wbm-sample{margin-bottom:24px}
.wbm-sample h2,.wbm-method h2{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:18px;margin:0 0 6px}
.wbm-dim{color:var(--mut);font-size:13px;margin:0 0 8px}
.wbm-sample ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wbm-sample li{font-size:13.5px;line-height:1.5;color:var(--ink)}
.wbm-tag{display:inline-block;font-size:11px;font-weight:700;color:var(--em);background:rgba(10,127,168,.08);border:1px solid rgba(10,127,168,.2);border-radius:6px;padding:1px 7px;margin-right:6px}
.wbm-method{margin-top:14px}
.wbm-method ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px}
.wbm-method li{font-size:14.5px;line-height:1.6;color:var(--ink)}
.wbm-note{display:flex;gap:9px;align-items:flex-start;margin-top:16px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.55;color:var(--mut)}
.wbm-note svg{color:var(--em);flex-shrink:0;margin-top:1px}
.wbm-cta{display:flex;gap:18px;flex-wrap:wrap;margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}
.wbm-link{display:inline-flex;align-items:center;gap:6px;color:var(--em);text-decoration:none;font-size:14px;font-weight:600}
.wbm-link:hover{text-decoration:underline}
@media(max-width:720px){.wbm-grid{grid-template-columns:1fr}}
`
