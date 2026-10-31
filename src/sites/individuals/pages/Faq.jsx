// LinkNotes: FAQ. Grouped questions as an accordion (collapse-to-row), a
// filter box, and FAQPage JSON-LD built from the SAME strings the reader
// sees. Anchors come from the English question text (stable across
// languages). Strings: indiv.faq.*.
import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, Search, Mail } from 'lucide-react'
import IndivShell from '../IndivShell.jsx'
import { START } from '../links.js'
import useSeo, { useJsonLd } from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'
import en from '../../../i18n/locales/en/indivSite.js'
import { SUPPORT_CONTACT } from '../../../components/LegalPage.jsx'

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const EN_GROUPS = en.indiv.faq.groups
const ANCHORS = EN_GROUPS.map((g) => g.items.map((it) => slug(it.q)))

export default function Faq() {
  const t = useT()
  useSeo(indivSeo(t, 'faq'))
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
      <section className="ln-sec grid lnfq-hero" aria-labelledby="lnfq-h1">
        <div className="ln-wrap lnfq-hero-in">
          <div className="ln-eyebrow">{t('indiv.faq.hero.eyebrow')}</div>
          <h1 id="lnfq-h1">{t.rich('indiv.faq.hero.h1')}</h1>
          <p className="lnfq-lead">{t('indiv.faq.hero.p')}</p>
          <label className="lnfq-search">
            <Search size={16} aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('indiv.faq.searchPh')} aria-label={t('indiv.faq.searchPh')} />
          </label>
        </div>
      </section>

      <section className="ln-wrap lnfq-body">
        {total === 0 && <p className="lnfq-none" role="status">{t('indiv.faq.noMatch')}</p>}
        {shown.map((g) => (
          <div className="lnfq-group" key={g.title}>
            <h2>{g.title}</h2>
            <div className="lnfq-list">
              {g.items.map((it) => {
                const isOpen = open === it.id
                return (
                  <div className={'lnfq-item' + (isOpen ? ' open' : '')} key={it.id} id={it.id}>
                    <h3>
                      <button type="button" aria-expanded={isOpen} aria-controls={`${it.id}-a`} onClick={() => setOpen(isOpen ? '' : it.id)}>
                        <span>{it.q}</span><ChevronDown size={18} aria-hidden className="lnfq-chev" />
                      </button>
                    </h3>
                    <div id={`${it.id}-a`} className="lnfq-a" hidden={!isOpen}><p>{it.a}</p></div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="ln-sec tight" aria-labelledby="lnfq-final"><div className="ln-wrap"><div className="ln-final" data-reveal>
        <h2 id="lnfq-final">{t.rich('indiv.faq.cta.h2')}</h2><p>{t('indiv.faq.cta.p')}</p>
        <div className="ln-ctas">
          <a className="ln-btn primary" href={'mailto:' + SUPPORT_CONTACT}><Mail size={15} aria-hidden /> {t('indiv.faq.cta.write')}</a>
          <a className="ln-btn ghost" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
        </div>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.lnfq-hero{padding-block:56px 36px}
.lnfq-hero-in{max-width:800px;margin-inline:0}
.lnfq-lead{font-size:17.5px;margin:16px 0 24px}
.lnfq-search{display:flex;align-items:center;gap:10px;height:52px;padding:0 18px;border-radius:999px;background:#fff;border:1.5px solid var(--ln-ink);color:var(--ln-ink-3);max-width:480px;box-shadow:4px 4px 0 var(--ln-lime)}
.lnfq-search:focus-within{box-shadow:4px 4px 0 var(--ln-violet)}
.lnfq-search input{flex:1 1 auto;min-width:0;border:0;background:transparent;font:inherit;font-size:15.5px;color:var(--ln-ink);outline:none}
.lnfq-body{padding-block:24px 56px;display:flex;flex-direction:column;gap:36px;max-width:860px;margin-inline:0}
.lnfq-none{font-size:15px;color:var(--ln-ink-2)}
.lnfq-group h2{font-family:var(--ln-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ln-violet-ink);margin-bottom:12px;font-weight:700}
.lnfq-list{display:flex;flex-direction:column;gap:8px}
.lnfq-item{background:#fff;border:1.5px solid var(--ln-line-2);border-radius:16px;overflow:hidden}
.lnfq-item.open{border-color:var(--ln-ink);box-shadow:5px 5px 0 var(--ln-violet-soft)}
.lnfq-item h3{margin:0;font-size:16px}
.lnfq-item h3 button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;text-align:start;padding:16px 18px;border:0;background:transparent;color:var(--ln-ink);font:inherit;font-weight:700;font-size:16px;cursor:pointer;line-height:1.35}
.lnfq-chev{flex:0 0 auto;color:var(--ln-ink-3);transition:transform .2s}
.lnfq-item.open .lnfq-chev{transform:rotate(180deg);color:var(--ln-violet)}
.lnfq-a{padding:0 18px 18px}
.lnfq-a p{font-size:15.5px;color:var(--ln-ink-2);line-height:1.6}
@media (prefers-reduced-motion:reduce){.lnfq-chev{transition:none}}
@media (max-width:640px){.lnfq-hero{padding-block:36px 24px}}
`
