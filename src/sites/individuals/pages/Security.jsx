// LinkNotes: PRIVACY AND SECURITY, for one person. Hero + the masking
// visual, six guarantees, how data is handled (leaves / kept / never kept),
// the personal brain on your terms, "you stay in control", and how to report
// an issue. Honest: what the product does today, no certification claims.
// Strings: indiv.security.*; the legal pages linked here are the shared ones.
import { ArrowRight, EyeOff, Hand, FileX2, KeyRound, ScrollText, Lock, Trash2, SlidersHorizontal, CreditCard, Mail, Eye, ShieldCheck, Brain } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import MaskVisual from '../visuals/MaskVisual.jsx'
import { START } from '../links.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'
import { SUPPORT_CONTACT } from '../../../components/LegalPage.jsx'

const G_ICONS = [EyeOff, Hand, FileX2, KeyRound, ScrollText, Lock]
const B_ICONS = [FileX2, Eye, ShieldCheck]
const C_ICONS = [Trash2, SlidersHorizontal, CreditCard]

export default function Security() {
  const t = useT()
  useSeo(indivSeo(t, 'security'))
  const groups = t('indiv.security.handling.groups') || []
  return (
    <IndivShell current="security">
      <style>{CSS}</style>
      <section className="ln-sec grid lnse-hero" aria-labelledby="lnse-h1">
        <div className="ln-wrap ln-band">
          <div>
            <div className="ln-eyebrow">{t('indiv.security.hero.eyebrow')}</div>
            <h1 id="lnse-h1">{t.rich('indiv.security.hero.h1')}</h1>
            <p className="lnse-lead">{t('indiv.security.hero.p')}</p>
          </div>
          <div className="ln-band-visual"><MaskVisual /></div>
        </div>
      </section>

      <section className="ln-sec tint" aria-label={t('indiv.security.guaranteesAria')}>
        <div className="ln-wrap">
          <div className="ln-grid c3">
            {(t('indiv.security.guarantees') || []).map((g, i) => { const Ic = G_ICONS[i] || ShieldCheck; return (
              <article className="ln-card" key={g.t} data-reveal style={{ transitionDelay: `${(i % 3) * 50}ms` }}><span className={'ln-ic ' + (i % 3 === 1 ? 'lime' : i % 3 === 2 ? 'ink' : '')}><Ic size={20} aria-hidden /></span><h3>{g.t}</h3><p>{g.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <section className="ln-sec" aria-labelledby="lnse-hand">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnse-hand" h2="indiv.security.handling.h2" p="indiv.security.handling.sub" />
          <div className="ln-grid c3 lnse-hand">
            {groups.map((g, i) => (
              <div className={'ln-card' + (i === 2 ? ' pop never' : '')} key={g.title} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="ln-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{g.title}</h3>
                <ul>{(g.items || []).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ln-sec dark" aria-labelledby="lnse-brain">
        <div className="ln-wrap">
          <div className="ln-head" data-reveal><div className="ln-eyebrow"><Brain size={14} aria-hidden /> {t('indiv.common.new')}</div><h2 id="lnse-brain">{t.rich('indiv.security.brain.h2')}</h2></div>
          <div className="ln-grid c3">
            {(t('indiv.security.brain.points') || []).map((p, i) => { const Ic = B_ICONS[i] || ShieldCheck; return (
              <article className="ln-card lnse-dark-card" key={p.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}><span className={'ln-ic ' + (i === 0 ? 'lime' : '')}><Ic size={20} aria-hidden /></span><h3>{p.t}</h3><p>{p.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <section className="ln-sec tint" aria-labelledby="lnse-ctrl">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnse-ctrl" h2="indiv.security.control.h2" />
          <div className="ln-grid c3">
            {(t('indiv.security.control.points') || []).map((p, i) => { const Ic = C_ICONS[i] || ShieldCheck; return (
              <article className="ln-card" key={p.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}><span className="ln-ic amber"><Ic size={20} aria-hidden /></span><h3>{p.t}</h3><p>{p.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <section className="ln-sec tight" aria-labelledby="lnse-final"><div className="ln-wrap"><div className="ln-final" data-reveal>
        <h2 id="lnse-final">{t.rich('indiv.security.contact.h2')}</h2><p>{t('indiv.security.contact.p')}</p>
        <div className="ln-ctas">
          <a className="ln-btn primary" href={'mailto:' + SUPPORT_CONTACT}><Mail size={15} aria-hidden /> {t('indiv.security.contact.write')}</a>
          <a className="ln-btn ghost" href="/workcopilot/privacy">{t('indiv.security.contact.legal')}</a>
          <a className="ln-btn ghost" href="/workcopilot/terms">{t('indiv.security.contact.terms')}</a>
        </div>
        <p className="lnse-start"><a href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={13} aria-hidden className="ln-arrow" /></a></p>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.lnse-hero{padding-block:56px 72px}
.lnse-lead{font-size:18px;margin-top:18px;max-width:50ch}
.lnse-hand ul{margin:12px 0 0;padding-inline-start:18px;display:flex;flex-direction:column;gap:8px;color:var(--ln-ink-2);font-size:15px;line-height:1.5}
.lnse-hand .never{background:var(--ln-lime-soft)}
.lnse-hand .never ul{color:var(--ln-ink)}
.lnse-dark-card{background:var(--ln-dark-2);border-color:rgba(255,255,255,.16)}
.lnse-dark-card h3{color:#fff}
.lnse-dark-card p{color:var(--ln-on-dark-2)}
.lnse-dark-card .ln-ic{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.25)}
.lnse-dark-card .ln-ic.lime{background:var(--ln-lime);color:var(--ln-ink);border-color:var(--ln-ink)}
.lnse-start{margin-top:18px}
.lnse-start a{font-weight:700;color:var(--ln-lime);display:inline-flex;align-items:center;gap:6px}
@media (max-width:1040px){.lnse-hero{padding-block:40px 52px}}
`
