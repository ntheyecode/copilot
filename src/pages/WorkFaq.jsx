// WorkCoPilot - FAQ (public, AEO-optimized). Moved off the short main page
// (owner rule: extra content lives on its own page, linked from the footer).
// DESIGN LAW (owner, 2026-10-26): point straight, no "book" pages. Every answer
// is one or two sentences that stand alone (an AI search engine or a snippet
// can quote the first one), an optional one-line detail, and related links.
// Questions are grouped and rendered as an ACCORDION (collapse-to-row is the
// platform pattern): a visitor scans questions, opens the one they need.
// The same data drives the visible Q&As AND the page-level FAQPage JSON-LD, so
// the structured data can never drift from what a reader sees.
// HONESTY CONTRACT (docs/business-rules.md): benefit and guarantee only. No AI
// vendor or model name, no AI cost or mechanics, never "certified" (only
// "compliance-ready"), no invented metrics, testimonials or customer counts.
// WorkCoPilot helps people DO and FINISH work on screen, step by step; it is
// not a document-analysis or writing engine (code is the exception). "Many
// fields", never "every field". A task is a major task of many sub-steps; an
// extra hour adds one task. US spelling, no em-dashes. Prices point at /pricing.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, CircleHelp, Search, Link2, ScanEye, Lock, RefreshCw, Mail, LifeBuoy } from 'lucide-react'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive (also loads the brand fonts)
import useSeo, { useJsonLd } from '../useSeo.js'   // per-route title/description/canonical (WEB-01) + safe JSON-LD
import { useT } from '../i18n/index.jsx'           // every visible string reads from the catalog (faqPage.* + seo.faq.*)
import enFaq from '../i18n/locales/en/faqPage.js'  // the ENGLISH partial: anchors + question count derive from it (stable across translations)

const SUPPORT = 'support@admireveda.com'           // product help, billing
const LEGAL = 'support@coesecurity.com'            // privacy, legal, security
const SALES = 'sales@admireveda.com'
const CONTACT_VARS = { support: SUPPORT, legal: LEGAL, sales: SALES }   // {support} {legal} {sales} in the catalog strings

// The COPY (group title; per question q = the question as people ask it, a = the
// direct, quotable answer, d = an optional one-line detail, links = chip labels)
// lives in the catalog under faqPage.groups.<id> (src/i18n/locales/en/faqPage.js
// is the English source). Code keeps what must never translate: the group id
// (also its anchor), its number, and each question's related-page hrefs, in
// question order (links[i] = hrefs of question i). The chips are kept out of the
// structured-data text so the JSON-LD stays plain text.
const GROUPS = [
  { id: 'what', n: '01', links: [
    ['/workcopilot/how-it-works', '/demo'],
    [],
    ['/workcopilot/security'],
    ['/workcopilot/acceptable-use'],
  ] },
  { id: 'how', n: '02', links: [
    [],
    [],
    ['/workcopilot/pricing'],
    [],
  ] },
  { id: 'platforms', n: '03', links: [[], [], [], []] },
  { id: 'security', n: '04', links: [
    ['/workcopilot/security', '/workcopilot/privacy'],
    ['/workcopilot/security'],
    ['/workcopilot/enterprise', '/workcopilot/dpa'],
    [],
    [],
    ['/workcopilot/cookie-policy'],
  ] },
  { id: 'pricing', n: '05', links: [
    ['/workcopilot/pricing'],
    ['/workcopilot/pricing'],
    ['/workcopilot/pricing'],
    ['/workcopilot/refund'],
    [],
    ['/workcopilot/enterprise', `mailto:${SALES}?subject=WorkCoPilot%20Enterprise`],
  ] },
  { id: 'current', n: '06', links: [
    [],
    ['/workcopilot/privacy', '/workcopilot/dpa'],
    ['/workcopilot/how-it-works#best-model'],
  ] },
  { id: 'who', n: '07', links: [
    ['/workcopilot/fields', '/workcopilot/use-cases'],
    [],
    ['/workcopilot/enterprise'],
  ] },
  { id: 'compliance', n: '08', links: [
    ['/workcopilot/security'],
    ['/workcopilot/privacy'],
    [],
    ['/workcopilot/dpa', '/workcopilot/dpa#subprocessors'],
    [],
  ] },
  { id: 'start', n: '09', links: [
    ['/workcopilot', '/workcopilot/pricing'],
    ['/demo'],
    [`mailto:${SUPPORT}`],
  ] },
]

// Stable anchors from the ENGLISH question text (lowercase, words joined by
// hyphens), so a deep link someone shared keeps working in every language.
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
// The static skeleton: per question its index (the catalog key), its anchor id,
// whether it has a detail line, and its hrefs. Global question numbers (Q01..)
// are assigned once over the FULL list so a filter never renumbers an anchor
// someone has already shared.
const NUMBERED = GROUPS.map((g) => {
  const items = (enFaq.faqPage.groups[g.id] || {}).items || []
  return { ...g, items: items.map((it, i) => ({ i, id: slug(it.q), hasD: !!it.d, hasLinks: Array.isArray(it.links) && it.links.length > 0, hrefs: g.links[i] || [] })) }
})
let _n = 0
for (const g of NUMBERED) for (const it of g.items) it.num = String(++_n).padStart(2, '0')
const TOTAL = _n
const ALL_IDS = NUMBERED.flatMap((g) => g.items.map((it) => it.id))

// Resolve the skeleton against the active locale: titles, questions, answers,
// details and chip labels, with the contact addresses filled in. The same data
// drives the visible Q&As AND the FAQPage JSON-LD, so they can never drift.
function localize(t) {
  return NUMBERED.map((g) => ({
    ...g,
    title: t(`faqPage.groups.${g.id}.title`),
    items: g.items.map((it) => {
      // d and links are optional per question: only read the keys the English
      // source defines (hasD / hasLinks), so no "missing key" noise in dev.
      const base = `faqPage.groups.${g.id}.items.${it.i}`
      const labels = it.hasLinks ? t(`${base}.links`) : []
      return {
        ...it,
        q: t(`${base}.q`, CONTACT_VARS),
        a: t(`${base}.a`, CONTACT_VARS),
        d: it.hasD ? t(`${base}.d`, CONTACT_VARS) : undefined,
        links: Array.isArray(labels) ? labels.map((label, j) => ({ label, href: it.hrefs[j] })) : [],
      }
    }),
  }))
}

// FAQPage structured data from the localized Q&As. Plain text only (the direct
// answer + the detail), links left out.
function faqJsonLd(groups) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) => g.items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: `${it.a} ${it.d || ''}`.trim() },
    }))),
  }).replace(/</g, '\\u003c')
}

// The three glance cards: icon + tone here, copy in faqPage.glance (same order).
const GLANCE_META = [
  { icon: ScanEye, tone: 'ok' },
  { icon: Lock, tone: 'cyan' },
  { icon: RefreshCw, tone: 'violet' },
]

// Accessibility (WEB-08): one <main>, a single H1, an H2 per group, an H3 per
// question wrapping a real <button aria-expanded aria-controls>, a labeled
// search field with a live result count, visible focus rings, and decorative
// icons hidden from assistive tech. Rows are collapsed by default (platform
// pattern); a search or a deep link opens the matching rows.
export default function WorkFaq() {
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const t = useT()
  useSeo({
    title: t('seo.faq.title'),
    description: t('seo.faq.description'),
    path: '/workcopilot/faq',
  })
  // The localized Q&As (per active language) and the FAQPage structured data
  // built from the SAME data, injected safely (textContent, no HTML sink).
  const all = useMemo(() => localize(t), [t])
  const faqLd = useMemo(() => faqJsonLd(all), [all])
  useJsonLd(faqLd)
  const glance = t('faqPage.glance')
  // Deep links like /workcopilot/faq#how-much-does-it-cost: open that row, then
  // scroll once mounted (the browser's own hash jump fires before React renders).
  useEffect(() => {
    const id = (window.location.hash || '').slice(1)
    if (!id) return
    if (ALL_IDS.includes(id)) setOpen((s) => new Set(s).add(id))
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])

  const toggle = useCallback((id) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  }), [])
  const allOpen = open.size >= TOTAL
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(ALL_IDS))

  const needle = query.trim().toLowerCase()
  const groups = useMemo(() => {
    if (!needle) return all
    const hit = (it) => `${it.q} ${it.a} ${it.d || ''}`.toLowerCase().includes(needle)
    return all.map((g) => ({ ...g, items: g.items.filter(hit) })).filter((g) => g.items.length)
  }, [all, needle])
  const shown = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="wfq">
      <style>{CSS}</style>
      <SiteHeader current="faq" />

      <main id="main">
        <section className="wfq-hero">
          <div className="wfq-eyebrow"><CircleHelp size={14} aria-hidden="true" /> {t('faqPage.eyebrow')}</div>
          <h1>{t('faqPage.h1')}</h1>
          <p>{t('faqPage.lead')}</p>
          <form className="wfq-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="wfq-q" className="wfq-sr">{t('faqPage.searchLabel')}</label>
            <Search size={16} aria-hidden="true" />
            <input id="wfq-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('faqPage.searchPlaceholder')} autoComplete="off" />
            <output className="wfq-count" htmlFor="wfq-q" aria-live="polite">{shown} / {TOTAL}</output>
          </form>
        </section>

        <section className="wfq-block" aria-labelledby="wfq-glance-h">
          <h2 id="wfq-glance-h" className="wfq-sr">{t('faqPage.glanceH2')}</h2>
          <div className="wfq-glance">
            {GLANCE_META.map((m, i) => {
              const Ic = m.icon
              const g = (Array.isArray(glance) && glance[i]) || {}
              return (
                <WorkCard key={i} theme="light" tone={m.tone} delay={i * 70} texPos={['0% 0%', '50% 50%', '100% 100%'][i]} className="wfq-gcard">
                  <WorkCard.Head icon={Ic} eyebrow={g.eyebrow} title={g.title} />
                  <WorkCard.Body>{g.body}</WorkCard.Body>
                </WorkCard>
              )
            })}
          </div>
        </section>

        <section className="wfq-block wfq-doc">
          <nav className="wfq-rail" aria-labelledby="wfq-rail-h">
            <div className="wfq-railt" id="wfq-rail-h">{t('faqPage.sections')}</div>
            <ol>
              {all.map((g) => {
                const live = groups.find((x) => x.id === g.id)
                const count = live ? live.items.length : 0
                return (
                  <li key={g.id} className={count ? '' : 'off'}>
                    <a href={'#' + g.id} aria-disabled={count ? undefined : 'true'}>
                      <span className="wfq-n" aria-hidden="true">{g.n}</span>
                      <span className="wfq-railname">{g.title}</span>
                      <span className="wfq-railc" aria-label={t('faqPage.answersCount', { n: count })}>{count}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
            <button type="button" className="wfq-all" onClick={toggleAll} aria-pressed={allOpen}>{allOpen ? t('faqPage.collapseAll') : t('faqPage.expandAll')}</button>
          </nav>

          <div className="wfq-art">
            {groups.length === 0 && (
              <div className="wfq-empty" role="status">
                <p>{t.rich('faqPage.emptyNoMatch', { query })}</p>
                <p>{t.rich('faqPage.emptyTry', null, { a: (c) => <a href={'mailto:' + SUPPORT + '?subject=WorkCoPilot%20question'}>{c}</a> })}</p>
              </div>
            )}
            {groups.map((g) => (
              <section className="wfq-grp" id={g.id} key={g.id} aria-labelledby={g.id + '-h'}>
                <h2 id={g.id + '-h'}><span className="wfq-n" aria-hidden="true">{g.n}</span>{g.title}</h2>
                {g.items.map((it) => {
                  // A search opens every matching row so the hit is visible at once.
                  const isOpen = !!needle || open.has(it.id)
                  const panelId = it.id + '-a'
                  return (
                    <article className={'wfq-qa' + (isOpen ? ' on' : '')} id={it.id} key={it.id}>
                      <div className="wfq-qhead">
                        <div className="wfq-qnum" aria-hidden="true">{t('faqPage.qNum', { num: it.num })}</div>
                        <h3>
                          <button type="button" className="wfq-qbtn" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(it.id)}>
                            <span className="wfq-qtext">{it.q}</span>
                            <ChevronDown size={18} aria-hidden="true" className="wfq-chev" />
                          </button>
                        </h3>
                        <a className="wfq-anchor" href={'#' + it.id} aria-label={t('faqPage.linkToQuestion', { q: it.q })}><Link2 size={13} aria-hidden="true" /></a>
                      </div>
                      <div className="wfq-qbody" id={panelId} hidden={!isOpen}>
                        <p className="wfq-lead">{it.a}</p>
                        {it.d ? <p className="wfq-more">{it.d}</p> : null}
                        {it.links && it.links.length ? (
                          <div className="wfq-links">
                            {it.links.map((l) => (
                              <a key={l.href + l.label} href={l.href} className="wfq-chip">{l.label} <ArrowRight size={12} aria-hidden="true" /></a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </section>
            ))}
          </div>
        </section>

        <section className="wfq-cta" aria-label={t('faqPage.ctaAria')}>
          <div className="wfq-cta-in">
            <div className="wfq-cta-copy">
              <div className="wfq-eyebrow"><LifeBuoy size={14} aria-hidden="true" /> {t('faqPage.ctaEyebrow')}</div>
              <h2>{t('faqPage.ctaH2')}</h2>
              <p>{t('faqPage.ctaP', CONTACT_VARS)}</p>
            </div>
            <div className="wfq-cta-btns">
              <button className="wfq-btn" onClick={() => nav('/workcopilot')}>{t('faqPage.getStarted')} <ArrowRight size={15} aria-hidden="true" /></button>
              <a className="wfq-btn alt" href="/demo">{t('faqPage.demoBtn')}</a>
              <a className="wfq-btn alt" href={'mailto:' + SUPPORT + '?subject=WorkCoPilot%20question'}><Mail size={15} aria-hidden="true" /> {t('faqPage.emailSupport')}</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

// Same tokens, header, hero and button vocabulary as the How It Works page
// (.wcap-*), plus a "ledger" document layout: a sticky section rail with counts,
// and each Q&A as a collapsed row (mono number, question button, link icon) that
// opens to the direct answer marked by a brand rule. Collapses to one column
// (rail becomes wrapping chips) under 900px. Design-time quality gate: every
// control that must not wrap or clip is nowrap + flex-shrink:0; the question
// text is the only thing that gives.
const CSS = `
[data-theme='dark'] .wfq{--ink:#eef0f6;--mut:#9aa0b4;--dim:#6c7780;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.15);--panel:#13141f;--panel2:#181b27;--bg:#0a0b12;--em:#8cf5c4;--cy:#39d3ff}
.wfq{--ink:#161a2b;--mut:#5c6484;--dim:#8b93a1;--line:#e6e8f1;--line-strong:#d3d7e5;--panel:#ffffff;--panel2:#f6f8fd;--bg:#f3f5fb;--em:#0e9f6e;--cy:#0a84c2;--vi:#6d4bd8;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    var(--bg)}
.wfq *{box-sizing:border-box}
.wfq::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wfq>*{position:relative;z-index:1}
/* a11y: visually hidden text; visible focus ring (never outline:none) */
.wfq-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.wfq a:focus-visible,.wfq button:focus-visible,.wfq input:focus-visible{outline:2px solid var(--cy);outline-offset:3px;border-radius:8px}
/* hero */
.wfq-hero{max-width:1160px;margin:0 auto;padding:30px 24px 8px;text-align:center}
.wfq-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0f7f58;background:#e3fbf0;border:1px solid rgba(15,127,88,.22);border-radius:999px;padding:5px 13px;white-space:nowrap}
.wfq-hero h1{font-size:40px;line-height:1.08;letter-spacing:-.02em;margin:16px 0 12px;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:620px;line-height:1.55}
/* search: a single quiet field with a mono "shown / total" readout */
.wfq-search{display:flex;align-items:center;gap:10px;max-width:620px;margin:22px auto 0;background:var(--panel);border:1px solid var(--line-strong);border-radius:14px;padding:6px 8px 6px 14px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.18);text-align:left}
.wfq-search>svg{color:var(--dim);flex:0 0 auto}
.wfq-search input{flex:1;min-width:0;border:0;background:none;font:inherit;font-size:15px;color:var(--ink);padding:8px 0}
.wfq-search input::placeholder{color:var(--dim)}
.wfq-search input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.wfq-count{flex:0 0 auto;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:500;letter-spacing:.06em;color:var(--mut);background:#f4f8f7;border:1px solid var(--line);border-radius:9px;padding:6px 9px;white-space:nowrap}
@media(max-width:620px){.wfq-hero h1{font-size:28px}.wfq-search input{font-size:14px}}
/* glance */
.wfq-block{max-width:1160px;margin:0 auto;padding:26px 24px}
.wfq-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
.wfq-gcard{min-width:0}
.wfq-gcard .wc-title{font-size:18px}
/* document: sticky rail + ledger */
/* The rail column sizes to its LONGEST link (fit-content, capped at 340px) so a
   section title plus its count badge never wraps onto a second line at desktop
   widths; only a title longer than the cap would wrap, and nothing clips. */
.wfq-doc{display:grid;grid-template-columns:fit-content(400px) minmax(0,1fr);gap:36px;align-items:start;padding-top:6px}
.wfq-rail{position:sticky;top:18px;min-width:0}
.wfq-railt{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0 0 10px}
.wfq-rail ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.wfq-rail a{display:flex;align-items:baseline;gap:9px;padding:7px 10px;border:1px solid transparent;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}
.wfq-rail a:hover{background:var(--panel);border-color:var(--line)}
.wfq-railname{flex:1 1 auto;min-width:0}
.wfq-railc{flex:0 0 auto;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:10.5px;font-weight:500;color:var(--dim);background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:1px 6px}
.wfq-rail li.off a{opacity:.45}
.wfq-all{margin:12px 0 0 10px;background:none;border:1px solid var(--line-strong);border-radius:999px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--mut);cursor:pointer;white-space:nowrap}
.wfq-all:hover{color:var(--ink);background:var(--panel)}
.wfq-n{font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11px;font-weight:500;letter-spacing:.1em;color:var(--dim);flex:0 0 auto}
.wfq-art{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:6px 30px 18px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wfq-grp{padding:22px 0 8px;border-top:1px solid var(--line);scroll-margin-top:18px}
.wfq-grp:first-child{border-top:0}
.wfq-grp h2{display:flex;align-items:baseline;gap:12px;font-size:20px;margin:0 0 4px;letter-spacing:-.01em;color:var(--ink);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-grp h2 .wfq-n{font-size:12px;color:#0f7f58}
/* one Q&A row: mono number, question button (the only flexible part), link icon */
.wfq-qa{border-top:1px dashed rgba(10,13,18,.12);scroll-margin-top:18px}
.wfq-grp h2+.wfq-qa{border-top:0}
.wfq-qhead{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wfq-qnum{flex:0 0 40px;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:500;letter-spacing:.08em;color:var(--dim);padding-top:17px;white-space:nowrap;transition:color .3s}
.wfq-qa:hover .wfq-qnum,.wfq-qa.on .wfq-qnum,.wfq-qa:target .wfq-qnum{color:#0f7f58}
.wfq-qa:target{background:linear-gradient(90deg,rgba(140,245,196,.18),transparent 60%);margin:0 -14px;padding-left:14px;padding-right:14px;border-radius:12px}
.wfq-qa h3{flex:1 1 auto;min-width:0;margin:0;font-size:16px;line-height:1.35;letter-spacing:-.01em;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-qbtn{display:flex;align-items:flex-start;gap:10px;width:100%;min-width:0;background:none;border:0;padding:13px 0;margin:0;font:inherit;color:var(--ink);text-align:left;cursor:pointer}
.wfq-qtext{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.wfq-chev{flex:0 0 auto;margin-top:1px;color:var(--dim);transition:transform .22s,color .22s}
.wfq-qbtn:hover .wfq-chev{color:var(--ink)}
.wfq-qbtn[aria-expanded="true"] .wfq-chev{transform:rotate(180deg);color:#0f7f58}
.wfq-anchor{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-top:13px;border-radius:6px;color:var(--dim);opacity:0;transition:opacity .2s,color .2s}
.wfq-qa:hover .wfq-anchor,.wfq-anchor:focus-visible{opacity:1}
.wfq-anchor:hover{color:var(--cy)}
/* the opened answer: brand rule on the left, detail a shade lighter */
.wfq-qbody{min-width:0;padding:0 34px 16px 52px}
.wfq-lead{position:relative;margin:0 0 8px;padding-left:14px;font-size:15px;line-height:1.6;color:#1e2733;font-weight:500;overflow-wrap:anywhere}
.wfq-lead::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:3px;border-radius:3px;background:linear-gradient(180deg,#0e9f6e,#0a84c2)}
.wfq-more{margin:0;padding-left:14px;font-size:14px;line-height:1.6;color:var(--mut);overflow-wrap:anywhere}
.wfq-links{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0 14px}
.wfq-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:#0a7fa8;background:#f4f8f7;border:1px solid var(--line);border-radius:999px;padding:5px 11px;text-decoration:none;white-space:nowrap;transition:border-color .2s,background .2s}
.wfq-chip:hover{background:var(--panel);border-color:rgba(10,147,196,.4)}
.wfq-chip>svg{transition:transform .25s}
.wfq-chip:hover>svg{transform:translateX(2px)}
.wfq-empty{padding:34px 10px;text-align:center;color:var(--mut);font-size:15px;line-height:1.6}
.wfq-empty b{color:var(--ink)}
.wfq-empty a{color:#0a7fa8;font-weight:600}
/* closing band */
.wfq-cta{max-width:1160px;margin:0 auto;padding:14px 24px 56px}
.wfq-cta-in{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px 28px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -22px rgba(10,13,18,.16)}
.wfq-cta-copy{min-width:0;flex:1 1 320px}
.wfq-cta-copy h2{font-size:24px;margin:12px 0 6px;letter-spacing:-.015em;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:600}
.wfq-cta-copy p{margin:0;color:var(--mut);font-size:14.5px;line-height:1.55;overflow-wrap:anywhere}
.wfq-cta-btns{display:flex;gap:10px;flex-wrap:wrap}
.wfq-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 18px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap;box-shadow:0 10px 24px -12px rgba(10,147,196,.6)}
.wfq-btn.alt{background:var(--panel);color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
@media(max-width:900px){
  .wfq-doc{grid-template-columns:1fr;gap:18px}
  .wfq-rail{position:static}
  .wfq-rail ol{flex-direction:row;flex-wrap:wrap;gap:6px}
  .wfq-rail a{background:var(--panel);border-color:var(--line);padding:6px 10px;font-size:12.5px;border-radius:999px;white-space:nowrap}
  .wfq-railc{display:none}
  .wfq-all{margin:10px 0 0}
}
@media(max-width:760px){
  .wfq-glance{grid-template-columns:1fr}
  .wfq-art{padding:4px 16px 12px;border-radius:14px}
  .wfq-qnum{flex-basis:34px}
  .wfq-qbody{padding:0 0 14px 46px}
  .wfq-anchor{opacity:1}
  .wfq-cta-in{padding:20px 18px}
}
@media(max-width:480px){
  .wfq-qnum{display:none}
  .wfq-qbody{padding-left:0}
}
@media(prefers-reduced-motion:reduce){.wfq-qnum,.wfq-anchor,.wfq-chip,.wfq-chip>svg,.wfq-chev{transition:none}}
`
