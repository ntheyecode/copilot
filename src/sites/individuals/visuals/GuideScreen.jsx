// The hero visual: a person's app window with the guide card beside it, one
// step, one check, "Next step". Pure HTML/CSS (no image), so it renders in
// every language and theme and the text is real text for screen readers. The
// only motion is a soft pulse on the "watching" dot and a staggered settle on
// load, both off under prefers-reduced-motion.
import { Check, ArrowRight, Eye } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function GuideScreen() {
  const t = useT()
  return (
    <div className="ivgs" role="img" aria-label={t('indiv.home.visual.aria')}>
      <style>{CSS}</style>
      <div className="ivgs-win" aria-hidden="true">
        <div className="ivgs-bar"><i /><i /><i /><span>{t('indiv.home.visual.window')}</span></div>
        <div className="ivgs-body">
          <div className="ivgs-side"><b /><b /><b className="on" /><b /><b /></div>
          <div className="ivgs-pane">
            <div className="ivgs-row w60" /><div className="ivgs-row w40" />
            <div className="ivgs-tiles"><div className="ivgs-tile hi" /><div className="ivgs-tile" /><div className="ivgs-tile" /></div>
            <div className="ivgs-row w80" /><div className="ivgs-row w50" />
          </div>
        </div>
      </div>
      <div className="ivgs-watch"><span className="iv-pill mint"><span className="dot" aria-hidden="true" /> <Eye size={13} aria-hidden="true" /> {t('indiv.home.visual.watching')}</span></div>
      <div className="ivgs-card">
        <div className="ivgs-task">{t('indiv.home.visual.task')}</div>
        <div className="ivgs-step-label">{t('indiv.home.visual.stepLabel')}</div>
        <p className="ivgs-step">{t('indiv.home.visual.step')}</p>
        <div className="ivgs-check"><Check size={14} aria-hidden="true" /> {t('indiv.home.visual.checked')}</div>
        <div className="ivgs-next">{t('indiv.home.visual.next')} <ArrowRight size={14} aria-hidden="true" className="iv-arrow" /></div>
      </div>
    </div>
  )
}

const CSS = `
.ivgs{position:relative;width:100%;max-width:560px;margin-inline:auto;aspect-ratio:1.18;min-height:300px}
.ivgs-win{position:absolute;inset:0 12% 14% 0;background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:18px;box-shadow:var(--iv-shadow);overflow:hidden;animation:ivgs-in .6s ease both}
.ivgs-bar{display:flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-bottom:1px solid var(--iv-line);background:var(--iv-paper-3)}
.ivgs-bar i{width:9px;height:9px;border-radius:50%;background:var(--iv-line-2)}
.ivgs-bar span{margin-inline-start:8px;font-size:12px;font-weight:600;color:var(--iv-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivgs-body{display:grid;grid-template-columns:56px 1fr;height:calc(100% - 36px)}
.ivgs-side{border-inline-end:1px solid var(--iv-line);padding:14px 12px;display:flex;flex-direction:column;gap:12px}
.ivgs-side b{display:block;height:10px;border-radius:5px;background:var(--iv-line)}
.ivgs-side b.on{background:var(--iv-mint)}
.ivgs-pane{padding:18px}
.ivgs-row{height:10px;border-radius:5px;background:var(--iv-line);margin-bottom:10px}
.ivgs-row.w60{width:60%}.ivgs-row.w40{width:40%}.ivgs-row.w80{width:80%}.ivgs-row.w50{width:50%}
.ivgs-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 18px}
.ivgs-tile{height:64px;border-radius:10px;background:var(--iv-paper-3);border:1px solid var(--iv-line)}
.ivgs-tile.hi{border:2px solid var(--iv-mint);box-shadow:0 0 0 6px var(--iv-mint-wash)}
.ivgs-watch{position:absolute;top:-14px;inset-inline-end:6%;animation:ivgs-in .6s .25s ease both}
.ivgs-card{position:absolute;inset-inline-end:0;bottom:0;width:min(62%,300px);background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:18px;padding:16px;box-shadow:0 28px 60px -26px rgba(23,32,46,.5);animation:ivgs-in .6s .4s ease both}
.ivgs-task{font-size:12px;color:var(--iv-ink-3);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivgs-step-label{margin-top:8px;display:inline-flex;height:22px;align-items:center;padding:0 9px;border-radius:999px;background:var(--iv-mint-soft);color:var(--iv-mint-ink);font-size:11.5px;font-weight:800;letter-spacing:.04em}
.ivgs-step{margin-top:8px;font-size:14px;line-height:1.45;color:var(--iv-ink)}
.ivgs-check{margin-top:10px;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--iv-mint-ink)}
.ivgs-next{margin-top:12px;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px;border-radius:10px;background:linear-gradient(135deg,var(--iv-coral),var(--iv-coral-2));color:var(--iv-coral-ink);font-size:13px;font-weight:800;white-space:nowrap}
@keyframes ivgs-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ivgs-win,.ivgs-watch,.ivgs-card{animation:none}}
@media (max-width:640px){.ivgs{aspect-ratio:1.05;min-height:280px}.ivgs-card{width:min(72%,280px);padding:14px}.ivgs-body{grid-template-columns:44px 1fr}}
`
