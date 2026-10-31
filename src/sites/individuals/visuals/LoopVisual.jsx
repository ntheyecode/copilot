// The "loop behind every task" visual on the how-it-works page: five numbered
// rows on a rail, in reading order, with the "repeats until done" line. Text
// is real text; the rail is decorative.
import { RotateCw } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function LoopVisual() {
  const t = useT()
  const rows = t('indiv.how.loop.rows') || []
  return (
    <div className="lnlp" aria-label={t('indiv.how.loop.aria')} role="group">
      <style>{CSS}</style>
      <ol className="lnlp-list">
        {rows.map((r, i) => (
          <li key={r.k} className="lnlp-row" data-reveal style={{ transitionDelay: `${Math.min(i * 40, 160)}ms` }}>
            <span className="ln-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="lnlp-k">{r.k}</span>
            <span className="lnlp-v">{r.v}</span>
          </li>
        ))}
      </ol>
      <div className="lnlp-again"><RotateCw size={14} aria-hidden="true" /> {t('indiv.how.loop.again')}</div>
    </div>
  )
}

const CSS = `
.lnlp{background:#fff;border:1px solid var(--ln-line);border-radius:var(--ln-r);padding:24px;box-shadow:var(--ln-shadow-2);max-width:560px;margin-inline:auto;width:100%}
.lnlp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;position:relative}
.lnlp-list::before{content:"";position:absolute;inset-inline-start:18px;top:20px;bottom:20px;width:2px;background:repeating-linear-gradient(180deg,var(--ln-violet) 0 6px,transparent 6px 12px);opacity:.4}
.lnlp-row{display:grid;grid-template-columns:38px auto minmax(0,1fr);gap:12px;align-items:center;position:relative}
.lnlp-k{display:inline-flex;align-items:center;height:32px;padding:0 13px;border-radius:999px;background:var(--ln-lime);color:var(--ln-ink);font-weight:700;font-size:13.5px;white-space:nowrap}
.lnlp-v{font-size:14.5px;color:var(--ln-ink-2);line-height:1.4;min-width:0}
.lnlp-again{margin-top:16px;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ln-violet);padding-inline-start:50px}
@media (max-width:480px){.lnlp-row{grid-template-columns:38px minmax(0,1fr)}.lnlp-v{grid-column:2}.lnlp{padding:18px}}
`
