// The privacy visual: the same four fields twice, "on your screen" and "what
// leaves your device", where the sensitive rows become ink bars. Labels are
// language (indiv.security.visual.*); the sample values are fixture examples
// of a FORMAT (a card, a key, a phone) and are not translated.
import { ShieldCheck } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

const SAMPLES = ['4242 4242 4242 4242', 'sk_live_51Hq9', '+1 415 555 0133', 'Premium']
const SENSITIVE = [true, true, true, false]

export default function MaskVisual({ compact = false }) {
  const t = useT()
  const fields = t('indiv.security.visual.fields') || []
  const Panel = ({ title, masked }) => (
    <div className={'lnmk-panel' + (masked ? ' after' : '')}>
      <div className="lnmk-title">{masked && <ShieldCheck size={14} aria-hidden="true" />} {title}</div>
      <dl>
        {fields.map((f, i) => (
          <div key={f} className="lnmk-row">
            <dt>{f}</dt>
            <dd>{masked && SENSITIVE[i] ? <span className="lnmk-bar" aria-label={t('indiv.security.visual.masked')} /> : <span dir="ltr">{SAMPLES[i]}</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
  return (
    <div className={'lnmk' + (compact ? ' compact' : '')} role="img" aria-label={t('indiv.security.visual.aria')}>
      <style>{CSS}</style>
      <Panel title={t('indiv.security.visual.before')} masked={false} />
      <div className="lnmk-arrow" aria-hidden="true"><span /></div>
      <Panel title={t('indiv.security.visual.after')} masked />
    </div>
  )
}

const CSS = `
.lnmk{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:stretch;width:100%;max-width:620px;margin-inline:auto}
.lnmk-panel{background:#fff;border:1.5px solid var(--ln-line-2);border-radius:16px;padding:16px;min-width:0}
.lnmk-panel.after{border-color:var(--ln-ink);box-shadow:6px 6px 0 var(--ln-lime)}
.lnmk-title{display:flex;align-items:center;gap:6px;font-family:var(--ln-mono);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ln-ink-3);margin-bottom:12px}
.lnmk-panel.after .lnmk-title{color:var(--ln-violet-ink)}
.lnmk dl{margin:0;display:flex;flex-direction:column;gap:10px}
.lnmk-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:8px;align-items:center;font-size:13px}
.lnmk-row dt{color:var(--ln-ink-2);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lnmk-row dd{margin:0;font-family:var(--ln-mono);font-size:12.5px;color:var(--ln-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lnmk-bar{display:block;height:14px;border-radius:4px;background:var(--ln-ink);width:88%}
.lnmk-arrow{display:flex;align-items:center;justify-content:center;width:34px}
.lnmk-arrow span{width:26px;height:3px;border-radius:3px;background:var(--ln-violet);position:relative}
.lnmk-arrow span::after{content:"";position:absolute;inset-inline-end:-2px;top:-5px;width:12px;height:12px;border-inline-end:3px solid var(--ln-violet);border-top:3px solid var(--ln-violet);transform:rotate(45deg)}
[dir="rtl"] .lnmk-arrow span::after{transform:rotate(-135deg)}
@media (max-width:640px){.lnmk{grid-template-columns:1fr;gap:10px}.lnmk-arrow{width:auto;height:28px}.lnmk-arrow span{transform:rotate(90deg)}[dir="rtl"] .lnmk-arrow span{transform:rotate(90deg)}[dir="rtl"] .lnmk-arrow span::after{transform:rotate(45deg)}}
`
