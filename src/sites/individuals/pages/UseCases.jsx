// LinkNotes: WHO IT IS FOR. Six groups (students and new grads, career
// switchers, freelancers and solo founders, professionals leveling up,
// creators, technicians and makers at a machine screen), each as one band: the
// copy on one side and a "guide card" on the other showing the goal, one step,
// what the guide catches, and when it is done. Strings: indiv.use.*.
import { ArrowRight, GraduationCap, Compass, Store, TrendingUp, Clapperboard, Wrench, Target, MousePointerClick, AlertTriangle, CheckCircle2 } from 'lucide-react'
import IndivShell from '../IndivShell.jsx'
import FinalBand from '../FinalBand.jsx'
import { START } from '../links.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const IDS = ['students', 'career-switchers', 'freelancers', 'professionals', 'creators', 'makers']
const ICONS = [GraduationCap, Compass, Store, TrendingUp, Clapperboard, Wrench]

export default function UseCases() {
  const t = useT()
  useSeo(indivSeo(t, 'use'))
  const cases = t('indiv.use.cases') || []
  const L = t('indiv.use.labels') || {}
  return (
    <IndivShell current="use">
      <style>{CSS}</style>
      <section className="ln-sec grid lnuc-hero" aria-labelledby="lnuc-h1">
        <div className="ln-wrap lnuc-hero-in">
          <div className="ln-eyebrow">{t('indiv.use.hero.eyebrow')}</div>
          <h1 id="lnuc-h1">{t.rich('indiv.use.hero.h1')}</h1>
          <p className="lnuc-lead">{t('indiv.use.hero.p')}</p>
          <nav className="lnuc-chips" aria-label={t('indiv.use.hero.chipsAria')}>
            {cases.map((c, i) => { const Ic = ICONS[i]; return <a key={IDS[i]} className="ln-pill" href={'#' + IDS[i]}><Ic size={14} aria-hidden /> {c.tag}</a> })}
          </nav>
        </div>
      </section>

      {cases.map((c, i) => { const Ic = ICONS[i]; return (
        <section key={IDS[i]} id={IDS[i]} className={'ln-sec' + (i % 2 ? ' tint' : '')} aria-labelledby={`lnuc-${IDS[i]}`}>
          <div className={'ln-wrap ln-band' + (i % 2 ? ' flip' : '')}>
            <div data-reveal>
              <div className="ln-eyebrow"><Ic size={14} aria-hidden /> {c.tag}</div>
              <h2 id={`lnuc-${IDS[i]}`}>{c.h2}</h2>
              <p className="lnuc-d">{c.d}</p>
              <a className="ln-btn ghost sm" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={14} aria-hidden className="ln-arrow" /></a>
            </div>
            <div className="ln-band-visual" data-reveal>
              <div className="lnuc-card">
                <div className="lnuc-goal"><Target size={15} aria-hidden /><div><span>{L.goal}</span><b>{c.goal}</b></div></div>
                <div className="lnuc-step"><span className="lnuc-k"><MousePointerClick size={13} aria-hidden /> {L.step}</span><p>{c.step}</p></div>
                <div className="lnuc-catch"><span className="lnuc-k warn"><AlertTriangle size={13} aria-hidden /> {L.catches}</span><p>{c.catches}</p></div>
                <div className="lnuc-done"><CheckCircle2 size={15} aria-hidden /> <span><b>{L.done}</b> {c.done}</span></div>
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
.lnuc-hero{padding-block:56px 48px}
.lnuc-hero-in{max-width:860px;margin-inline:0}
.lnuc-lead{font-size:18px;margin:18px 0 24px;max-width:56ch}
.lnuc-chips{display:flex;flex-wrap:wrap;gap:8px}
.lnuc-chips .ln-pill{height:36px;padding:0 14px;background:#fff}
.lnuc-chips .ln-pill:hover{border-color:var(--ln-ink);background:var(--ln-lime)}
.lnuc-d{font-size:16.5px;margin:16px 0 24px;max-width:50ch}
.lnuc-card{background:#fff;border:1.5px solid var(--ln-ink);border-radius:var(--ln-r);padding:20px;box-shadow:8px 8px 0 var(--ln-violet-soft);display:flex;flex-direction:column;gap:14px;max-width:520px;margin-inline:auto}
.lnuc-goal{display:flex;gap:10px;align-items:flex-start;padding-bottom:14px;border-bottom:1.5px dashed var(--ln-line-2)}
.lnuc-goal svg{color:var(--ln-violet);margin-top:3px;flex:0 0 auto}
.lnuc-goal span{display:block;font-family:var(--ln-mono);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ln-ink-3)}
.lnuc-goal b{display:block;font-family:var(--ln-display);font-size:17px;color:var(--ln-ink);margin-top:3px;line-height:1.3;letter-spacing:-.015em}
.lnuc-k{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;background:var(--ln-violet-soft);color:var(--ln-violet-ink);font-family:var(--ln-mono);font-size:11px;font-weight:700;letter-spacing:.04em;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.lnuc-k.warn{background:var(--ln-amber-soft);color:var(--ln-amber-ink)}
.lnuc-step p,.lnuc-catch p{margin-top:8px;font-size:14.5px;color:var(--ln-ink);line-height:1.5}
.lnuc-done{display:flex;gap:8px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--ln-lime);border:1.5px solid var(--ln-ink);font-size:14px;color:var(--ln-ink);line-height:1.45}
.lnuc-done svg{flex:0 0 auto;margin-top:2px}
@media (max-width:640px){.lnuc-hero{padding-block:36px 32px}}
`
