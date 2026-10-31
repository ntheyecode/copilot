// Individuals site: WHO IT IS FOR. Five groups (freelancers, students, job
// seekers, solo businesses, career switchers), each as one band: the copy on
// one side and a "guide card" on the other showing the goal, one step, what
// the guide catches, and when it is done. Strings: indiv.use.*.
import { ArrowRight, Briefcase, GraduationCap, Search, Store, Compass, Target, MousePointerClick, ShieldAlert, CheckCircle2 } from 'lucide-react'
import IndivShell from '../IndivShell.jsx'
import { START } from '../IndivHeader.jsx'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const IDS = ['freelancers', 'students', 'job-seekers', 'solo-businesses', 'career-switchers']
const ICONS = [Briefcase, GraduationCap, Search, Store, Compass]

export default function UseCases() {
  const t = useT()
  useSeo(indivSeo(t, 'use'))
  const cases = t('indiv.use.cases') || []
  const L = t('indiv.use.labels') || {}
  return (
    <IndivShell current="use">
      <style>{CSS}</style>
      <section className="iv-wrap ivuc-hero" aria-labelledby="ivuc-h1">
        <div className="iv-eyebrow">{t('indiv.use.hero.eyebrow')}</div>
        <h1 id="ivuc-h1">{t.rich('indiv.use.hero.h1')}</h1>
        <p className="ivuc-lead">{t('indiv.use.hero.p')}</p>
        <nav className="ivuc-chips" aria-label={t('indiv.use.hero.chipsAria')}>
          {cases.map((c, i) => { const Ic = ICONS[i]; return <a key={IDS[i]} className="iv-pill" href={'#' + IDS[i]}><Ic size={14} aria-hidden /> {c.tag}</a> })}
        </nav>
      </section>

      {cases.map((c, i) => { const Ic = ICONS[i]; return (
        <section key={IDS[i]} id={IDS[i]} className={'iv-sec' + (i % 2 ? ' alt' : '')} aria-labelledby={`ivuc-${IDS[i]}`}>
          <div className={'iv-wrap iv-band' + (i % 2 ? ' flip' : '')}>
            <div data-reveal>
              <div className="iv-eyebrow"><Ic size={14} aria-hidden /> {c.tag}</div>
              <h2 id={`ivuc-${IDS[i]}`}>{c.h2}</h2>
              <p className="ivuc-d">{c.d}</p>
              <a className="iv-btn ghost sm" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={14} aria-hidden className="iv-arrow" /></a>
            </div>
            <div className="iv-band-visual" data-reveal>
              <div className="ivuc-card">
                <div className="ivuc-goal"><Target size={15} aria-hidden /><div><span>{L.goal}</span><b>{c.goal}</b></div></div>
                <div className="ivuc-step"><span className="ivuc-k"><MousePointerClick size={13} aria-hidden /> {L.step}</span><p>{c.step}</p></div>
                <div className="ivuc-catch"><span className="ivuc-k warn"><ShieldAlert size={13} aria-hidden /> {L.catches}</span><p>{c.catches}</p></div>
                <div className="ivuc-done"><CheckCircle2 size={15} aria-hidden /> <span><b>{L.done}</b> {c.done}</span></div>
              </div>
            </div>
          </div>
        </section>
      ) })}

      <section className="iv-sec tight"><div className="iv-wrap"><div className="iv-final" data-reveal>
        <h2>{t.rich('indiv.use.cta.h2')}</h2><p>{t('indiv.use.cta.p')}</p>
        <div className="iv-ctas"><a className="iv-btn primary" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={16} aria-hidden className="iv-arrow" /></a></div>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.ivuc-hero{padding-block:56px 40px;max-width:820px}
.ivuc-lead{font-size:17.5px;margin:16px 0 22px;max-width:56ch}
.ivuc-chips{display:flex;flex-wrap:wrap;gap:8px}
.ivuc-chips .iv-pill{height:34px;padding:0 14px}
.ivuc-chips .iv-pill:hover{border-color:var(--iv-mint);color:var(--iv-mint-ink)}
.ivuc-d{font-size:16.5px;margin:14px 0 22px;max-width:50ch}
.ivuc-card{background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:var(--iv-r);padding:20px;box-shadow:var(--iv-shadow);display:flex;flex-direction:column;gap:14px;max-width:520px;margin-inline:auto}
.ivuc-goal{display:flex;gap:10px;align-items:flex-start;padding-bottom:14px;border-bottom:1px dashed var(--iv-line-2)}
.ivuc-goal svg{color:var(--iv-ink-3);margin-top:3px;flex:0 0 auto}
.ivuc-goal span{display:block;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--iv-ink-3)}
.ivuc-goal b{display:block;font-family:var(--iv-display);font-size:17px;color:var(--iv-ink);margin-top:2px;line-height:1.3}
.ivuc-k{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:var(--iv-mint-soft);color:var(--iv-mint-ink);font-size:11.5px;font-weight:800;letter-spacing:.04em;white-space:nowrap}
.ivuc-k.warn{background:var(--iv-sun);color:#8a4b12}
[data-theme='dark'] .ivuc-k.warn{color:var(--iv-coral)}
.ivuc-step p,.ivuc-catch p{margin-top:8px;font-size:14.5px;color:var(--iv-ink);line-height:1.5}
.ivuc-done{display:flex;gap:8px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--iv-mint-soft);font-size:14px;color:var(--iv-ink);line-height:1.45}
.ivuc-done svg{color:var(--iv-mint-ink);flex:0 0 auto;margin-top:2px}
@media (max-width:640px){.ivuc-hero{padding-block:40px 28px}}
`
