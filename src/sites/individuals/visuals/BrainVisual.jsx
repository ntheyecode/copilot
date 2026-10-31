// The personal-brain visual (the sage band on the home page): three stages in
// a row as white cards, upload -> learn -> delete, with the "what it learned"
// list under them and a "no download" seal on the last. Text is real text
// (indiv.home.brain.*); the shapes are decorative.
import { FileUp, Brain, Trash2, Ban, Check } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

const ICONS = [FileUp, Brain, Trash2]

export default function BrainVisual() {
  const t = useT()
  const steps = t('indiv.home.brain.steps') || []
  const learned = t('indiv.home.brain.learned') || []
  return (
    <div className="lnbv" role="group" aria-label={t('indiv.home.brain.eyebrow')}>
      <style>{CSS}</style>
      <ol className="lnbv-flow">
        {steps.map((s, i) => { const Ic = ICONS[i] || Check; return (
          <li key={s.t} className={'lnbv-node n' + i} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
            <span className="lnbv-ic"><Ic size={20} aria-hidden="true" /></span>
            <b>{s.t}</b>
            <span className="lnbv-d">{s.d}</span>
            {i === 2 && <span className="lnbv-seal" aria-hidden="true"><Ban size={12} /></span>}
          </li>
        ) })}
      </ol>
      <div className="lnbv-learned" data-reveal>
        <div className="lnbv-k">{t('indiv.home.brain.learnedLabel')}</div>
        <ul>{learned.map((l) => <li key={l}><span className="ln-tick soft"><Check size={12} aria-hidden="true" /></span>{l}</li>)}</ul>
      </div>
    </div>
  )
}

const CSS = `
.lnbv{display:flex;flex-direction:column;gap:16px;width:100%;max-width:560px;margin-inline:auto}
.lnbv-flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;position:relative}
.lnbv-flow::before{content:"";position:absolute;top:36px;inset-inline:16%;height:2px;background:repeating-linear-gradient(90deg,var(--ln-violet) 0 8px,transparent 8px 16px);opacity:.5}
.lnbv-node{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:18px 12px 16px;border-radius:16px;background:#fff;box-shadow:var(--ln-shadow);min-width:0}
.lnbv-node.n1{box-shadow:0 0 0 2px var(--ln-violet),var(--ln-shadow)}
.lnbv-ic{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;background:var(--ln-violet-soft);color:var(--ln-violet)}
.lnbv-node.n1 .lnbv-ic{background:var(--ln-violet);color:#fff}
.lnbv-node.n2 .lnbv-ic{background:var(--ln-lime);color:var(--ln-ink)}
.lnbv-node b{font-size:15.5px;color:var(--ln-ink);font-family:var(--ln-display)}
.lnbv-d{font-size:12.5px;line-height:1.4;color:var(--ln-ink-2)}
.lnbv-seal{position:absolute;top:-10px;inset-inline-end:-8px;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--ln-amber);color:var(--ln-ink);box-shadow:var(--ln-shadow)}
.lnbv-learned{border-radius:16px;background:#fff;color:var(--ln-ink);padding:18px 20px;box-shadow:var(--ln-shadow)}
.lnbv-k{font-size:13.5px;font-weight:600;color:var(--ln-violet);margin-bottom:10px}
.lnbv-learned ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.lnbv-learned li{display:flex;gap:9px;align-items:flex-start;font-size:14.5px;line-height:1.4;color:var(--ln-ink);font-weight:500}
.lnbv-learned .ln-tick{width:20px;height:20px}
@media (max-width:480px){.lnbv-flow{grid-template-columns:1fr;gap:10px}.lnbv-flow::before{display:none}.lnbv-node{flex-direction:row;text-align:start;align-items:flex-start}.lnbv-node>b{display:none}.lnbv-node .lnbv-d{font-size:13.5px;color:var(--ln-ink)}}
`
