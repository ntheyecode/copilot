// LinkNotes: PRIVACY AND SECURITY, for one person. Title band + the masking
// visual, six guarantees, how data is handled (leaves / kept / never kept),
// the personal brain on your terms, "you stay in control", and how to report
// an issue. Honest: what the product does today, no certification claims.
// Strings: indiv.security.*; the legal pages linked here are the shared ones.
import { ArrowRight, EyeOff, Hand, FileX2, KeyRound, ScrollText, Lock, Trash2, SlidersHorizontal, CreditCard, Eye, ShieldCheck, Brain } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import PageTitle from '../PageTitle.jsx'
import FinalBand from '../FinalBand.jsx'
import MaskVisual from '../visuals/MaskVisual.jsx'
import { START } from '../links.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'
import { SUPPORT_CONTACT } from '../../../components/LegalPage.jsx'

const G_ICONS = [EyeOff, Hand, FileX2, KeyRound, ScrollText, Lock]
const B_ICONS = [FileX2, Eye, ShieldCheck]
const C_ICONS = [Trash2, SlidersHorizontal, CreditCard]
const HAND_TINTS = ['t-sky', 't-sage', 't-mint']

export default function Security() {
  const t = useT()
  useSeo(indivSeo(t, 'security'))
  const groups = t('indiv.security.handling.groups') || []
  return (
    <IndivShell current="security">
      <style>{CSS}</style>
      <PageTitle t={t} page="security" id="lnse-h1" eyebrow="indiv.security.hero.eyebrow" h1="indiv.security.hero.h1" p="indiv.security.hero.p" visual={<MaskVisual />} />

      <section className="ln-sec" aria-label={t('indiv.security.guaranteesAria')}>
        <div className="ln-wrap">
          <div className="ln-grid c3">
            {(t('indiv.security.guarantees') || []).map((g, i) => { const Ic = G_ICONS[i] || ShieldCheck; return (
              <article className="ln-card hov" key={g.t} data-reveal style={{ transitionDelay: `${(i % 3) * 50}ms` }}><span className={'ln-ic ' + (i % 3 === 1 ? 'lime' : i % 3 === 2 ? 'ink' : '')}><Ic size={20} aria-hidden /></span><h3>{g.t}</h3><p>{g.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <section className="ln-sec tint" aria-labelledby="lnse-hand">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnse-hand" h2="indiv.security.handling.h2" p="indiv.security.handling.sub" center />
          <div className="ln-grid c3 lnse-hand">
            {groups.map((g, i) => (
              <div className={'ln-card ' + HAND_TINTS[i % HAND_TINTS.length]} key={g.title} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="ln-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{g.title}</h3>
                <ul>{(g.items || []).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ln-sec tight" aria-labelledby="lnse-brain">
        <div className="ln-wrap">
          <div className="ln-band-tint arcs">
            <div className="ln-head center" data-reveal><div className="ln-eyebrow"><Brain size={15} aria-hidden /> {t('indiv.common.new')}</div><h2 id="lnse-brain">{t.rich('indiv.security.brain.h2')}</h2></div>
            <div className="ln-grid c3">
              {(t('indiv.security.brain.points') || []).map((p, i) => { const Ic = B_ICONS[i] || ShieldCheck; return (
                <article className="ln-card lnse-band-card" key={p.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}><span className={'ln-ic ' + (i === 0 ? 'lime' : '')}><Ic size={20} aria-hidden /></span><h3>{p.t}</h3><p>{p.d}</p></article>
              ) })}
            </div>
          </div>
        </div>
      </section>

      <section className="ln-sec" aria-labelledby="lnse-ctrl">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnse-ctrl" h2="indiv.security.control.h2" center />
          <div className="ln-grid c3">
            {(t('indiv.security.control.points') || []).map((p, i) => { const Ic = C_ICONS[i] || ShieldCheck; return (
              <article className="ln-card hov" key={p.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}><span className="ln-ic amber"><Ic size={20} aria-hidden /></span><h3>{p.t}</h3><p>{p.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <FinalBand t={t} id="lnse-final" h2="indiv.security.contact.h2" p="indiv.security.contact.p" primary="indiv.security.contact.write" primaryHref={'mailto:' + SUPPORT_CONTACT} secondary="indiv.security.contact.legal" secondaryHref="/workcopilot/privacy">
        <p className="lnse-links"><a href="/workcopilot/terms">{t('indiv.security.contact.terms')}</a><a href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={13} aria-hidden className="ln-arrow" /></a></p>
      </FinalBand>
    </IndivShell>
  )
}

const CSS = `
.lnse-hand ul{margin:12px 0 0;padding-inline-start:18px;display:flex;flex-direction:column;gap:8px;color:var(--ln-ink-2);font-size:15px;line-height:1.5}
.lnse-hand .t-mint ul{color:var(--ln-ink)}
.lnse-band-card{border-color:transparent}
.lnse-links{margin-top:22px;display:flex;justify-content:center;gap:12px 24px;flex-wrap:wrap;font-size:15px}
.lnse-links a{font-weight:600;color:var(--ln-violet);display:inline-flex;align-items:center;gap:6px}
.lnse-links a:hover{text-decoration:underline}
`
