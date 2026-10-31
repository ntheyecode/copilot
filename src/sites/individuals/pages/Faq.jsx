// Individuals site: FAQ. Grouped questions as an accordion (collapse-to-row),
// a filter box, and FAQPage JSON-LD built from the SAME strings the reader
// sees. Anchors come from the English question text (stable across
// languages). Strings: indiv.faq.*.
import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, Search, Mail } from 'lucide-react'
import IndivShell from '../IndivShell.jsx'
import { START } from '../IndivHeader.jsx'
import useSeo, { useJsonLd } from '../../../useSeo.js'
import { useT } from '../../../i18n/index.jsx'
import en from '../../../i18n/locales/en/indivSite.js'
import { SUPPORT_CONTACT } from '../../../components/LegalPage.jsx'

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const EN_GROUPS = en.indiv.faq.groups
const ANCHORS = EN_GROUPS.map((g) => g.items.map((it) => slug(it.q)))

export default function Faq() {
  const t = useT()
  useSeo({ title: t('indiv.faq.seo.title'), description: t('indiv.faq.seo.description'), path: '/workcopilot/faq' })
  const groups = t('indiv.faq.groups') || []
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(() => (typeof window !== 'undefined' && window.location.hash ? window.location.hash.slice(1) : ''))
  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => groups.map((g, gi) => ({
    ...g, items: (g.items || []).map((it, i) => ({ ...it, id: (ANCHORS[gi] || [])[i] || `q-${gi}-${i}` })).filter((it) => !needle || `${it.q} ${it.a}`.toLowerCase().includes(needle)),
  })).filter((g) => g.items.length), [groups, needle])
  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) => (g.items || []).map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } }))),
  }), [groups]))
  const total = shown.reduce((n, g) => n + g.items.length, 0)
  return (
    <IndivShell current="faq" revealKey={needle}>
      <style>{CSS}</style>
      <section className="iv-wrap ivfq-hero" aria-labelledby="ivfq-h1">
        <div className="iv-eyebrow">{t('indiv.faq.hero.eyebrow')}</div>
        <h1 id="ivfq-h1">{t.rich('indiv.faq.hero.h1')}</h1>
        <p className="ivfq-lead">{t('indiv.faq.hero.p')}</p>
        <label className="ivfq-search">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('indiv.faq.searchPh')} aria-label={t('indiv.faq.searchPh')} />
        </label>
      </section>

      <section className="iv-wrap ivfq-body">
        {total === 0 && <p className="ivfq-none" role="status">{t('indiv.faq.noMatch')}</p>}
        {shown.map((g) => (
          <div className="ivfq-group" key={g.title}>
            <h2>{g.title}</h2>
            <div className="ivfq-list">
              {g.items.map((it) => {
                const isOpen = open === it.id
                return (
                  <div className={'ivfq-item' + (isOpen ? ' open' : '')} key={it.id} id={it.id}>
                    <h3>
                      <button type="button" aria-expanded={isOpen} aria-controls={`${it.id}-a`} onClick={() => setOpen(isOpen ? '' : it.id)}>
                        <span>{it.q}</span><ChevronDown size={18} aria-hidden className="ivfq-chev" />
                      </button>
                    </h3>
                    <div id={`${it.id}-a`} className="ivfq-a" hidden={!isOpen}><p>{it.a}</p></div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="iv-sec tight"><div className="iv-wrap"><div className="iv-final" data-reveal>
        <h2>{t.rich('indiv.faq.cta.h2')}</h2><p>{t('indiv.faq.cta.p')}</p>
        <div className="iv-ctas">
          <a className="iv-btn primary" href={'mailto:' + SUPPORT_CONTACT}><Mail size={15} aria-hidden /> {t('indiv.faq.cta.write')}</a>
          <a className="iv-btn ghost" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={15} aria-hidden className="iv-arrow" /></a>
        </div>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.ivfq-hero{padding-block:56px 28px;max-width:760px}
.ivfq-lead{font-size:17px;margin:14px 0 22px}
.ivfq-search{display:flex;align-items:center;gap:10px;height:50px;padding:0 16px;border-radius:14px;background:var(--iv-paper-2);border:1px solid var(--iv-line-2);color:var(--iv-ink-3);max-width:480px}
.ivfq-search:focus-within{border-color:var(--iv-mint)}
.ivfq-search input{flex:1 1 auto;min-width:0;border:0;background:transparent;font:inherit;font-size:15.5px;color:var(--iv-ink);outline:none}
.ivfq-body{padding-block:8px 48px;display:flex;flex-direction:column;gap:34px;max-width:820px}
.ivfq-none{font-size:15px;color:var(--iv-ink-2)}
.ivfq-group h2{font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--iv-mint-ink);margin-bottom:12px;font-weight:800}
.ivfq-list{display:flex;flex-direction:column;gap:8px}
.ivfq-item{background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:16px;overflow:hidden}
.ivfq-item.open{border-color:var(--iv-mint)}
.ivfq-item h3{margin:0;font-size:16px}
.ivfq-item h3 button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;text-align:start;padding:16px 18px;border:0;background:transparent;color:var(--iv-ink);font:inherit;font-weight:700;font-size:16px;cursor:pointer;line-height:1.35}
.ivfq-chev{flex:0 0 auto;color:var(--iv-ink-3);transition:transform .2s}
.ivfq-item.open .ivfq-chev{transform:rotate(180deg);color:var(--iv-mint-ink)}
.ivfq-a{padding:0 18px 18px}
.ivfq-a p{font-size:15.5px;color:var(--iv-ink-2);line-height:1.6}
@media (prefers-reduced-motion:reduce){.ivfq-chev{transition:none}}
@media (max-width:640px){.ivfq-hero{padding-block:40px 20px}}
`
