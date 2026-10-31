// Home BRAIN: the personal brain on a rounded sage band, copy on one side and
// the upload -> learn -> delete visual on the other, with the masked-sessions
// line and the link to the privacy page. Strings: indiv.home.brain.*.
import { ArrowRight } from 'lucide-react'
import BrainVisual from '../../visuals/BrainVisual.jsx'

export default function BrainBand({ t }) {
  return (
    <section className="ln-sec tight" aria-labelledby="lnhm-brain">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <div className="ln-band-tint sage lnhm-brain">
          <div className="ln-band">
            <div data-reveal>
              <div className="ln-eyebrow">{t('indiv.home.brain.eyebrow')}</div>
              <h2 id="lnhm-brain">{t.rich('indiv.home.brain.h2')}</h2>
              <p className="lnhm-brain-p">{t('indiv.home.brain.p')}</p>
              <p className="lnhm-brain-s">{t('indiv.home.brain.sessions')}</p>
              <a className="ln-btn link lnhm-brain-cta" href="/workcopilot/security">{t('indiv.home.brain.cta')} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
            </div>
            <div className="ln-band-visual"><BrainVisual /></div>
          </div>
        </div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-brain-p{font-size:18px;margin-top:18px;max-width:50ch}
.lnhm-brain-s{font-size:15px;margin-top:16px;max-width:50ch;padding-inline-start:14px;border-inline-start:3px solid var(--ln-violet)}
.lnhm-brain-cta{margin-top:26px}
`
