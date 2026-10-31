// Individuals site: PRIVACY AND SECURITY, for one person. Hero + the masking
// visual, six guarantees, how data is handled (leaves / kept / never kept),
// "you stay in control", and how to report an issue. Honest: what the product
// does today, no certification claims. Strings: indiv.security.*; the legal
// pages linked here are the shared ones.
import { ArrowRight, EyeOff, Hand, ShieldCheck, KeyRound, ScrollText, Lock, Trash2, SlidersHorizontal, CreditCard, Mail } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import MaskVisual from '../visuals/MaskVisual.jsx'
import { START } from '../IndivHeader.jsx'
import useSeo from '../../../useSeo.js'
import { useT } from '../../../i18n/index.jsx'
import { SUPPORT_CONTACT } from '../../../components/LegalPage.jsx'

const G_ICONS = [EyeOff, Hand, ShieldCheck, KeyRound, ScrollText, Lock]
const C_ICONS = [Trash2, SlidersHorizontal, CreditCard]

export default function Security() {
  const t = useT()
  useSeo({ title: t('indiv.security.seo.title'), description: t('indiv.security.seo.description'), path: '/workcopilot/security' })
  const groups = t('indiv.security.handling.groups') || []
  return (
    <IndivShell current="security">
      <style>{CSS}</style>
      <section className="iv-wrap iv-band ivse-hero" aria-labelledby="ivse-h1">
        <div>
          <div className="iv-eyebrow">{t('indiv.security.hero.eyebrow')}</div>
          <h1 id="ivse-h1">{t.rich('indiv.security.hero.h1')}</h1>
          <p className="ivse-lead">{t('indiv.security.hero.p')}</p>
        </div>
        <div className="iv-band-visual"><MaskVisual /></div>
      </section>

      <section className="iv-sec alt" aria-label={t('indiv.security.guaranteesAria')}>
        <div className="iv-wrap">
          <div className="iv-grid c3">
            {(t('indiv.security.guarantees') || []).map((g, i) => { const Ic = G_ICONS[i] || ShieldCheck; return (
              <article className="iv-card flat" key={g.t} data-reveal><span className="iv-ic"><Ic size={20} aria-hidden /></span><h3>{g.t}</h3><p>{g.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <section className="iv-sec" aria-labelledby="ivse-hand">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivse-hand" h2="indiv.security.handling.h2" p="indiv.security.handling.sub" />
          <div className="iv-grid c3 ivse-hand">
            {groups.map((g, i) => (
              <div className={'iv-card' + (i === 2 ? ' never' : '')} key={g.title} data-reveal>
                <h3>{g.title}</h3>
                <ul>{(g.items || []).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="iv-sec alt" aria-labelledby="ivse-ctrl">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivse-ctrl" h2="indiv.security.control.h2" />
          <div className="iv-grid c3">
            {(t('indiv.security.control.points') || []).map((p, i) => { const Ic = C_ICONS[i] || ShieldCheck; return (
              <article className="iv-card flat" key={p.t} data-reveal><span className="iv-ic sun"><Ic size={20} aria-hidden /></span><h3>{p.t}</h3><p>{p.d}</p></article>
            ) })}
          </div>
        </div>
      </section>

      <section className="iv-sec tight"><div className="iv-wrap"><div className="iv-final" data-reveal>
        <h2>{t.rich('indiv.security.contact.h2')}</h2><p>{t('indiv.security.contact.p')}</p>
        <div className="iv-ctas">
          <a className="iv-btn primary" href={'mailto:' + SUPPORT_CONTACT}><Mail size={15} aria-hidden /> {t('indiv.security.contact.write')}</a>
          <a className="iv-btn ghost" href="/workcopilot/privacy">{t('indiv.security.contact.legal')}</a>
          <a className="iv-btn ghost" href="/workcopilot/terms">{t('indiv.security.contact.terms')}</a>
        </div>
        <p className="ivse-start"><a href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={13} aria-hidden className="iv-arrow" /></a></p>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.ivse-hero{padding-block:56px 64px}
.ivse-lead{font-size:17.5px;margin-top:16px;max-width:50ch}
.ivse-hand ul{margin:12px 0 0;padding-inline-start:18px;display:flex;flex-direction:column;gap:8px;color:var(--iv-ink-2);font-size:15px;line-height:1.5}
.ivse-hand .never{border-color:var(--iv-mint);background:linear-gradient(180deg,var(--iv-mint-soft),var(--iv-paper-2) 60%)}
.ivse-hand h3{margin-top:0}
.ivse-start{margin-top:18px}
.ivse-start a{font-weight:700;color:#8cf5c4;display:inline-flex;align-items:center;gap:6px}
@media (max-width:980px){.ivse-hero{padding-block:40px 48px}}
`
