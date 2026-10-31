// The "loop behind every task" visual on the how-it-works page: five labelled
// pills on a ring, in reading order, with the "repeats until done" line. Text
// is real text; the ring is decorative.
import { RotateCw } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function LoopVisual() {
  const t = useT()
  const rows = t('indiv.how.loop.rows') || []
  return (
    <div className="ivlp" aria-label={t('indiv.how.loop.aria')} role="group">
      <style>{CSS}</style>
      <ol className="ivlp-list">
        {rows.map((r, i) => (
          <li key={r.k} className="ivlp-row" data-reveal style={{ transitionDelay: `${Math.min(i * 40, 160)}ms` }}>
            <span className="ivlp-n" aria-hidden="true">{i + 1}</span>
            <span className="ivlp-k">{r.k}</span>
            <span className="ivlp-v">{r.v}</span>
          </li>
        ))}
      </ol>
      <div className="ivlp-again"><RotateCw size={14} aria-hidden="true" /> {t('indiv.how.loop.again')}</div>
    </div>
  )
}

const CSS = `
.ivlp{background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:var(--iv-r);padding:22px;box-shadow:var(--iv-shadow);max-width:560px;margin-inline:auto;width:100%}
.ivlp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;position:relative}
.ivlp-list::before{content:"";position:absolute;inset-inline-start:17px;top:18px;bottom:18px;width:2px;background:linear-gradient(180deg,var(--iv-mint),var(--iv-sky));opacity:.5}
.ivlp-row{display:grid;grid-template-columns:36px auto minmax(0,1fr);gap:12px;align-items:center;position:relative}
.ivlp-n{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--iv-paper-2);border:2px solid var(--iv-mint);color:var(--iv-mint-ink);font-weight:800;font-size:14px;font-family:var(--iv-display)}
.ivlp-k{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:999px;background:var(--iv-mint-soft);color:var(--iv-mint-ink);font-weight:800;font-size:13px;white-space:nowrap}
.ivlp-v{font-size:14.5px;color:var(--iv-ink-2);line-height:1.4;min-width:0}
.ivlp-again{margin-top:16px;display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--iv-ink-2);padding-inline-start:48px}
@media (max-width:480px){.ivlp-row{grid-template-columns:36px minmax(0,1fr)}.ivlp-v{grid-column:2}.ivlp{padding:18px}}
`
