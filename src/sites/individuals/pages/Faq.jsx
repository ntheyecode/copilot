// LinkNotes: FAQ. Title band with the filter box; then two columns: the group
// list on the left (sticky, jumps to a group), the grouped questions as an
// accordion of white cards on the right (collapse-to-row); FAQPage JSON-LD is
// built from the SAME strings the reader sees. Anchors come from the English
// question text (stable across languages). Strings: indiv.faq.*.
import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import IndivShell from '../IndivShell.jsx'
import PageTitle from '../PageTitle.jsx'
import FinalBand from '../FinalBand.jsx'
import { START } from '../links.js'
import useSeo, { useJsonLd } from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'
import en from '../../../i18n/locales/en/indivSite.js'
import { SUPPORT_CONTACT } from '../../../components/LegalPage.jsx'

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const EN_GROUPS = en.indiv.faq.groups
const ANCHORS = EN_GROUPS.map((g) => g.items.map((it) => slug(it.q)))
const GROUP_IDS = EN_GROUPS.map((g) => 'g-' + slug(g.title))

export default function Faq() {
  const t = useT()
  useSeo(indivSeo(t, 'faq'))
  const groups = t('indiv.faq.groups') || []
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(() => (typeof window !== 'undefined' && window.location.hash ? window.location.hash.slice(1) : ''))
  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => groups.map((g, gi) => ({
    ...g, id: GROUP_IDS[gi] || `g-${gi}`, items: (g.items || []).map((it, i) => ({ ...it, id: (ANCHORS[gi] || [])[i] || `q-${gi}-${i}` })).filter((it) => !needle || `${it.q} ${it.a}`.toLowerCase().includes(needle)),
  })).filter((g) => g.items.length), [groups, needle])
  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) => (g.items || []).map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } }))),
  }), [groups]))
  const total = shown.reduce((n, g) => n + g.items.length, 0)
  return (
    <IndivShell current="faq" revealKey={needle}>
      <style>{CSS}</style>
      <PageTitle t={t} page="faq" id="lnfq-h1" eyebrow="indiv.faq.hero.eyebrow" h1="indiv.faq.hero.h1" p="indiv.faq.hero.p">
        <label className="lnfq-search">
          <Search size={17} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('indiv.faq.searchPh')} aria-label={t('indiv.faq.searchPh')} />
        </label>
      </PageTitle>

      <section className="ln-wrap lnfq-body">
        {total === 0 && <p className="lnfq-none" role="status">{t('indiv.faq.noMatch')}</p>}
        {total > 0 && (
          <nav className="lnfq-groups" aria-label={t('indiv.faq.hero.eyebrow')}>
            <ul>{shown.map((g) => <li key={g.id}><a href={'#' + g.id}>{g.title}</a></li>)}</ul>
          </nav>
        )}
        <div className="lnfq-main">
          {shown.map((g) => (
            <div className="lnfq-group" key={g.title} id={g.id}>
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
        </div>
      </section>

      <FinalBand t={t} id="lnfq-final" h2="indiv.faq.cta.h2" p="indiv.faq.cta.p" primary="indiv.faq.cta.write" primaryHref={'mailto:' + SUPPORT_CONTACT} secondary="indiv.common.choosePlan" secondaryHref={START} />
    </IndivShell>
  )
}

const CSS = `
.lnfq-search{display:flex;align-items:center;gap:10px;height:56px;padding:0 20px;border-radius:14px;background:#fff;color:var(--ln-ink-3);width:100%;max-width:520px;margin-top:26px;box-shadow:var(--ln-shadow-2)}
.lnfq-search:focus-within{box-shadow:0 0 0 2px var(--ln-violet),var(--ln-shadow-2)}
.lnfq-search input{flex:1 1 auto;min-width:0;border:0;background:transparent;font:inherit;font-size:16px;color:var(--ln-ink);outline:none}
.lnfq-body{padding-block:24px 72px;display:grid;grid-template-columns:minmax(0,280px) minmax(0,1fr);gap:48px;align-items:start}
.lnfq-none{font-size:15.5px;color:var(--ln-ink-2);grid-column:1 / -1}
.lnfq-groups{position:sticky;top:104px}
.lnfq-groups ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.lnfq-groups a{display:block;padding:11px 14px;border-radius:12px;font-size:15px;font-weight:600;color:var(--ln-ink-2);transition:background .15s,color .15s}
.lnfq-groups a:hover{background:var(--ln-violet-soft);color:var(--ln-violet-ink)}
.lnfq-main{display:flex;flex-direction:column;gap:40px;min-width:0}
.lnfq-group{scroll-margin-top:104px}
.lnfq-group h2{font-size:22px;margin-bottom:14px}
.lnfq-list{display:flex;flex-direction:column;gap:10px}
.lnfq-item{background:#fff;border:1px solid var(--ln-line);border-radius:16px;overflow:hidden;box-shadow:var(--ln-shadow);transition:box-shadow .2s}
.lnfq-item.open{border-color:transparent;box-shadow:var(--ln-shadow-2)}
.lnfq-item h3{margin:0;font-size:16.5px}
.lnfq-item h3 button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;text-align:start;padding:18px 20px;border:0;background:transparent;color:var(--ln-ink);font:inherit;font-family:var(--ln-display);font-weight:700;font-size:17px;cursor:pointer;line-height:1.35}
.lnfq-item.open h3 button{color:var(--ln-violet)}
.lnfq-chev{flex:0 0 auto;color:var(--ln-ink-3);transition:transform .2s}
.lnfq-item.open .lnfq-chev{transform:rotate(180deg);color:var(--ln-violet)}
.lnfq-a{padding:0 20px 20px}
.lnfq-a p{font-size:15.5px;color:var(--ln-ink-2);line-height:1.65}
@media (prefers-reduced-motion:reduce){.lnfq-chev,.lnfq-item,.lnfq-groups a{transition:none}}
@media (max-width:1040px){.lnfq-body{grid-template-columns:1fr;gap:24px}.lnfq-groups{position:static}.lnfq-groups ul{flex-direction:row;flex-wrap:wrap;gap:8px}.lnfq-groups a{padding:8px 14px;border-radius:999px;background:var(--ln-bg-2);font-size:14px;white-space:nowrap}}
`
