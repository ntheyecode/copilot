// The privacy visual: the same four fields twice, "on your screen" and "what
// leaves your device", where the sensitive rows become black bars. Labels are
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
    <div className={'ivmk-panel' + (masked ? ' after' : '')}>
      <div className="ivmk-title">{masked && <ShieldCheck size={14} aria-hidden="true" />} {title}</div>
      <dl>
        {fields.map((f, i) => (
          <div key={f} className="ivmk-row">
            <dt>{f}</dt>
            <dd>{masked && SENSITIVE[i] ? <span className="ivmk-bar" aria-label={t('indiv.security.visual.masked')} /> : <span dir="ltr">{SAMPLES[i]}</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
  return (
    <div className={'ivmk' + (compact ? ' compact' : '')} role="img" aria-label={t('indiv.security.visual.aria')}>
      <style>{CSS}</style>
      <Panel title={t('indiv.security.visual.before')} masked={false} />
      <div className="ivmk-arrow" aria-hidden="true"><span /></div>
      <Panel title={t('indiv.security.visual.after')} masked />
    </div>
  )
}

const CSS = `
.ivmk{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:stretch;width:100%;max-width:620px;margin-inline:auto}
.ivmk-panel{background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:16px;padding:16px;box-shadow:var(--iv-shadow);min-width:0}
.ivmk-panel.after{border-color:var(--iv-mint);background:linear-gradient(180deg,var(--iv-mint-soft),var(--iv-paper-2) 40%)}
.ivmk-title{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--iv-ink-3);margin-bottom:12px}
.ivmk-panel.after .ivmk-title{color:var(--iv-mint-ink)}
.ivmk dl{margin:0;display:flex;flex-direction:column;gap:10px}
.ivmk-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:8px;align-items:center;font-size:13px}
.ivmk-row dt{color:var(--iv-ink-2);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivmk-row dd{margin:0;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;color:var(--iv-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivmk-bar{display:block;height:14px;border-radius:4px;background:var(--iv-ink);width:88%}
[data-theme='dark'] .ivmk-bar{background:#000}
.ivmk-arrow{display:flex;align-items:center;justify-content:center;width:34px}
.ivmk-arrow span{width:26px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--iv-ink-3),var(--iv-mint));position:relative}
.ivmk-arrow span::after{content:"";position:absolute;inset-inline-end:-2px;top:-5px;width:12px;height:12px;border-inline-end:3px solid var(--iv-mint);border-top:3px solid var(--iv-mint);transform:rotate(45deg)}
[dir="rtl"] .ivmk-arrow span::after{transform:rotate(-135deg)}
@media (max-width:640px){.ivmk{grid-template-columns:1fr;gap:10px}.ivmk-arrow{width:auto;height:28px}.ivmk-arrow span{transform:rotate(90deg)}[dir="rtl"] .ivmk-arrow span{transform:rotate(90deg)}[dir="rtl"] .ivmk-arrow span::after{transform:rotate(45deg)}}
`
