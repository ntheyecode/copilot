// The hero visual: a person's spreadsheet with the LinkNotes card beside it,
// one step, the exact value to type, one check, one caught wrong turn. Pure
// HTML/CSS (no image), so it renders in every language and the text is real
// text for screen readers. Motion: a staggered settle on load and a soft pulse
// on the "reading" dot, both off under prefers-reduced-motion.
// The formula is a format sample (what a spreadsheet shows), not language.
import { Check, ArrowRight, Eye, AlertTriangle } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { LinkNotesMark } from '../../../components/brand/LinkNotesLogo.jsx'

const FORMULA = '=SUM(C2:C40)'
const COLS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function HeroScreen() {
  const t = useT()
  return (
    <div className="lnhs" role="img" aria-label={t('indiv.home.visual.aria')}>
      <style>{CSS}</style>
      <div className="lnhs-win" aria-hidden="true">
        <div className="lnhs-bar"><i /><i /><i /><span>{t('indiv.home.visual.window')}</span></div>
        <div className="lnhs-sheet">
          <div className="lnhs-cols"><b /><b>{COLS[0]}</b><b>{COLS[1]}</b><b>{COLS[2]}</b><b>{COLS[3]}</b><b>{COLS[4]}</b><b className="hi">{COLS[5]}</b></div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => (
            <div className="lnhs-row" key={r}>
              <b>{r}</b>
              <span className="w70" /><span className="w40" /><span className="w55 num" /><span className="w30" /><span className="w50" />
              <span className={r === 2 ? 'cell on' : ''}>{r === 2 && <em dir="ltr">{FORMULA}</em>}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lnhs-watch"><span className="ln-pill violet"><span className="dot" aria-hidden="true" /> <Eye size={13} aria-hidden="true" /> {t('indiv.home.visual.watching')}</span></div>
      <div className="lnhs-caught"><AlertTriangle size={14} aria-hidden="true" /> {t('indiv.home.visual.caught')}</div>
      <div className="lnhs-card">
        <div className="lnhs-top"><LinkNotesMark size={20} id="lnhs" /><span className="lnhs-task">{t('indiv.home.visual.task')}</span></div>
        <div className="lnhs-step-label">{t('indiv.home.visual.stepLabel')}</div>
        <p className="lnhs-step">{t('indiv.home.visual.step')}</p>
        <div className="lnhs-type"><span>{t('indiv.home.visual.typeLabel')}</span><code dir="ltr">{FORMULA}</code></div>
        <div className="lnhs-check"><span className="ln-tick"><Check size={13} aria-hidden="true" /></span> {t('indiv.home.visual.checked')}</div>
        <div className="lnhs-next">{t('indiv.home.visual.next')} <ArrowRight size={14} aria-hidden="true" className="ln-arrow" /></div>
      </div>
    </div>
  )
}

const CSS = `
.lnhs{position:relative;width:100%;max-width:580px;margin-inline:auto;aspect-ratio:1.12;min-height:320px}
.lnhs-win{position:absolute;inset:18px 16% 16% 0;background:#fff;border:1.5px solid var(--ln-ink);border-radius:16px;box-shadow:8px 8px 0 var(--ln-violet-soft);overflow:hidden;animation:lnhs-in .5s ease both}
.lnhs-bar{display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-bottom:1.5px solid var(--ln-line);background:var(--ln-bg-2)}
.lnhs-bar i{width:9px;height:9px;border-radius:50%;background:var(--ln-line-2)}
.lnhs-bar span{margin-inline-start:8px;font-size:12px;font-weight:600;color:var(--ln-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lnhs-sheet{padding:0;font-family:var(--ln-mono);font-size:10.5px;color:var(--ln-ink-3)}
.lnhs-cols,.lnhs-row{display:grid;grid-template-columns:26px repeat(6,minmax(0,1fr));align-items:center;height:30px;border-bottom:1px solid var(--ln-line)}
.lnhs-cols{background:var(--ln-bg-2);height:26px}
.lnhs-cols b,.lnhs-row>b{display:flex;align-items:center;justify-content:center;font-weight:600;height:100%;border-inline-end:1px solid var(--ln-line)}
.lnhs-cols b.hi{background:var(--ln-lime-soft);color:var(--ln-ink)}
.lnhs-row>span{height:100%;border-inline-end:1px solid var(--ln-line);display:flex;align-items:center;padding:0 6px;min-width:0}
.lnhs-row>span::before{content:"";display:block;height:7px;border-radius:4px;background:var(--ln-line);width:var(--w,50%)}
.lnhs-row>span.w70{--w:70%}.lnhs-row>span.w40{--w:40%}.lnhs-row>span.w55{--w:55%}.lnhs-row>span.w30{--w:30%}.lnhs-row>span.w50{--w:50%}
.lnhs-row>span.num::before{background:var(--ln-line-2)}
.lnhs-row>span:last-child::before{display:none}
.lnhs-row>span.cell.on{outline:2px solid var(--ln-violet);outline-offset:-2px;background:var(--ln-lime-soft);overflow:hidden}
.lnhs-row>span.cell.on em{font-style:normal;color:var(--ln-ink);font-weight:700;white-space:nowrap;font-size:10px}
.lnhs-watch{position:absolute;top:-2px;inset-inline-start:14px;animation:lnhs-in .5s .2s ease both}
.lnhs-caught{position:absolute;bottom:9%;inset-inline-start:0;display:inline-flex;align-items:center;gap:8px;max-width:38%;padding:9px 12px;border-radius:12px;background:var(--ln-amber-soft);border:1.5px solid var(--ln-ink);color:var(--ln-amber-ink);font-size:12.5px;font-weight:700;line-height:1.3;box-shadow:4px 4px 0 var(--ln-amber);animation:lnhs-in .5s .55s ease both}
.lnhs-caught svg{flex:0 0 auto}
.lnhs-card{position:absolute;inset-inline-end:0;bottom:0;width:min(60%,300px);background:#fff;border:1.5px solid var(--ln-ink);border-radius:18px;padding:16px;box-shadow:6px 6px 0 var(--ln-lime);animation:lnhs-in .5s .35s ease both}
.lnhs-top{display:flex;align-items:center;gap:8px;min-width:0}
.lnhs-task{font-size:12px;color:var(--ln-ink-3);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lnhs-step-label{margin-top:10px;display:inline-flex;height:22px;align-items:center;padding:0 9px;border-radius:999px;background:var(--ln-violet-soft);color:var(--ln-violet-ink);font-family:var(--ln-mono);font-size:11px;font-weight:700;letter-spacing:.04em}
.lnhs-step{margin-top:8px;font-size:13.5px;line-height:1.45;color:var(--ln-ink)}
.lnhs-type{margin-top:10px;display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:10px;background:var(--ln-ink);color:#fff}
.lnhs-type span{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ln-lime)}
.lnhs-type code{font-family:var(--ln-mono);font-size:13px;font-weight:700}
.lnhs-check{margin-top:10px;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--ln-ink)}
.lnhs-check .ln-tick{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;background:var(--ln-lime);border:1.5px solid var(--ln-ink);flex:0 0 auto}
.lnhs-next{margin-top:12px;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px;border-radius:999px;background:var(--ln-violet);border:1.5px solid var(--ln-ink);color:#fff;font-size:13px;font-weight:800;white-space:nowrap}
@keyframes lnhs-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.lnhs-win,.lnhs-watch,.lnhs-card,.lnhs-caught{animation:none}}
@media (max-width:640px){.lnhs{aspect-ratio:1;min-height:300px}.lnhs-card{width:min(66%,280px);padding:14px}.lnhs-caught{max-width:58%;bottom:auto;top:52px}.lnhs-win{inset:18px 10% 20% 0}}
`
