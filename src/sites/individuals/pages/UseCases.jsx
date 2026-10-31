// LinkNotes: WHO IT IS FOR. Six groups (students and new grads, career
// switchers, freelancers and solo founders, professionals leveling up,
// creators, technicians and makers at a machine screen), each as one band: the
// copy on one side and a "guide card" on a lavender stage on the other,
// showing the goal, one step, what the guide catches, and when it is done.
// Strings: indiv.use.*.
import { ArrowRight, GraduationCap, Compass, Store, TrendingUp, Clapperboard, Wrench, Target, MousePointerClick, AlertTriangle, CheckCircle2 } from 'lucide-react'
import IndivShell from '../IndivShell.jsx'
import PageTitle from '../PageTitle.jsx'
import FinalBand from '../FinalBand.jsx'
import { START } from '../links.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const IDS = ['students', 'career-switchers', 'freelancers', 'professionals', 'creators', 'makers']
const ICONS = [GraduationCap, Compass, Store, TrendingUp, Clapperboard, Wrench]
const STAGES = ['', 'sage', 'peach', 'mint', 'sky', '']

export default function UseCases() {
  const t = useT()
  useSeo(indivSeo(t, 'use'))
  const cases = t('indiv.use.cases') || []
  const L = t('indiv.use.labels') || {}
  return (
    <IndivShell current="use">
      <style>{CSS}</style>
      <PageTitle t={t} page="use" id="lnuc-h1" eyebrow="indiv.use.hero.eyebrow" h1="indiv.use.hero.h1" p="indiv.use.hero.p">
        <nav className="lnuc-chips" aria-label={t('indiv.use.hero.chipsAria')}>
          {cases.map((c, i) => { const Ic = ICONS[i]; return <a key={IDS[i]} className="ln-pill white" href={'#' + IDS[i]}><Ic size={14} aria-hidden /> {c.tag}</a> })}
        </nav>
      </PageTitle>

      {cases.map((c, i) => { const Ic = ICONS[i]; return (
        <section key={IDS[i]} id={IDS[i]} className={'ln-sec' + (i % 2 ? ' tint' : '')} aria-labelledby={`lnuc-${IDS[i]}`}>
          <div className={'ln-wrap ln-band' + (i % 2 ? ' flip' : '')}>
            <div data-reveal>
              <div className="ln-eyebrow"><Ic size={15} aria-hidden /> {c.tag}</div>
              <h2 id={`lnuc-${IDS[i]}`}>{c.h2}</h2>
              <p className="lnuc-d">{c.d}</p>
              <a className="ln-btn link" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
            </div>
            <div className="ln-band-visual" data-reveal>
              <div className={'ln-stage lnuc-stage ' + STAGES[i]}>
                <div className="lnuc-card">
                  <div className="lnuc-goal"><Target size={15} aria-hidden /><div><span>{L.goal}</span><b>{c.goal}</b></div></div>
                  <div className="lnuc-step"><span className="lnuc-k"><MousePointerClick size={13} aria-hidden /> {L.step}</span><p>{c.step}</p></div>
                  <div className="lnuc-catch"><span className="lnuc-k warn"><AlertTriangle size={13} aria-hidden /> {L.catches}</span><p>{c.catches}</p></div>
                  <div className="lnuc-done"><CheckCircle2 size={15} aria-hidden /> <span><b>{L.done}</b> {c.done}</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) })}

      <FinalBand t={t} id="lnuc-final" h2="indiv.use.cta.h2" p="indiv.use.cta.p" primary="indiv.common.choosePlan" />
    </IndivShell>
  )
}

const CSS = `
.lnuc-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:26px}
.lnuc-chips .ln-pill{height:38px;padding:0 15px;color:var(--ln-ink)}
.lnuc-chips .ln-pill:hover{color:var(--ln-violet);box-shadow:var(--ln-shadow-2)}
.lnuc-d{font-size:17px;margin:16px 0 24px;max-width:50ch}
.lnuc-stage.sage{background:linear-gradient(180deg,var(--ln-sage),#e1e7d2)}
.lnuc-stage.peach{background:linear-gradient(180deg,var(--ln-peach),#f6dccd)}
.lnuc-stage.mint{background:linear-gradient(180deg,var(--ln-mint),#d3ecdd)}
.lnuc-stage.sky{background:linear-gradient(180deg,var(--ln-sky),#d9e4f6)}
.lnuc-card{background:#fff;border-radius:var(--ln-r);padding:22px;box-shadow:var(--ln-shadow-2);display:flex;flex-direction:column;gap:14px;max-width:520px;margin-inline:auto}
.lnuc-goal{display:flex;gap:10px;align-items:flex-start;padding-bottom:14px;border-bottom:1px dashed var(--ln-line-2)}
.lnuc-goal svg{color:var(--ln-violet);margin-top:3px;flex:0 0 auto}
.lnuc-goal span{display:block;font-size:12.5px;font-weight:600;color:var(--ln-ink-3)}
.lnuc-goal b{display:block;font-family:var(--ln-display);font-size:18px;color:var(--ln-ink);margin-top:3px;line-height:1.3;letter-spacing:-.01em}
.lnuc-k{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;background:var(--ln-violet-soft);color:var(--ln-violet-ink);font-size:12px;font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.lnuc-k.warn{background:var(--ln-amber-soft);color:var(--ln-amber-ink)}
.lnuc-step p,.lnuc-catch p{margin-top:8px;font-size:14.5px;color:var(--ln-ink);line-height:1.5}
.lnuc-done{display:flex;gap:8px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--ln-lime);font-size:14px;color:var(--ln-ink);line-height:1.45}
.lnuc-done svg{flex:0 0 auto;margin-top:2px}
@media (max-width:640px){.lnuc-chips{justify-content:flex-start}}
`
