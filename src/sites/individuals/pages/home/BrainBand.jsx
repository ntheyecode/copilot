// Home BRAIN: the dark band for the personal brain, copy on one side and the
// upload -> learn -> delete visual on the other, with the masked-sessions line
// and the link to the privacy page. Strings: indiv.home.brain.*.
import { ArrowRight } from 'lucide-react'
import BrainVisual from '../../visuals/BrainVisual.jsx'

export default function BrainBand({ t }) {
  return (
    <section className="ln-sec dark" aria-labelledby="lnhm-brain">
      <style>{CSS}</style>
      <div className="ln-wrap ln-band lnhm-brain">
        <div data-reveal>
          <div className="ln-eyebrow">{t('indiv.home.brain.eyebrow')}</div>
          <h2 id="lnhm-brain">{t.rich('indiv.home.brain.h2')}</h2>
          <p className="lnhm-brain-p">{t('indiv.home.brain.p')}</p>
          <p className="lnhm-brain-s">{t('indiv.home.brain.sessions')}</p>
          <a className="ln-btn ghost sm lnhm-brain-cta" href="/workcopilot/security">{t('indiv.home.brain.cta')} <ArrowRight size={14} aria-hidden className="ln-arrow" /></a>
        </div>
        <div className="ln-band-visual"><BrainVisual /></div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-brain-p{font-size:18px;margin-top:18px;max-width:50ch}
.lnhm-brain-s{font-size:14.5px;margin-top:16px;max-width:50ch;padding-inline-start:14px;border-inline-start:3px solid var(--ln-lime)}
.lnhm-brain-cta{margin-top:26px;background:transparent;border-color:rgba(255,255,255,.35);color:#fff}
.lnhm-brain-cta:hover{border-color:#fff}
`
