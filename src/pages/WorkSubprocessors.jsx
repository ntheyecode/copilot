// WorkCoPilot - Subprocessors (public list, plain-language disclosure).
// HONESTY CONTRACT (owner-enforced): names only what is actually true. Stripe is
// named because the code uses it. Providers we do not publicly disclose by name
// (AI model provider, hosting, email) are shown as roles with a clearly-marked
// placeholder rather than an invented vendor. No data-center cities or dates are
// invented. Layout from the shared LegalPage.
// i18n: every visible string comes from the `subprocessorsPage` namespace
// (src/i18n/locales/en/subprocessorsPage.js); the mailboxes, the date, the hrefs
// and the Stripe brand cell stay constants here, never translated.
import React from 'react'
import { Network, CreditCard, Cpu, KeyRound, Lock, FileText, Gavel } from 'lucide-react'
import LegalPage, { Items, Placeholder, DataTable, legalTags, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'
import { useT } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-25'

// Icon + tone are design, so they stay here; the words are subprocessorsPage.glance[i].
const GLANCE = [
  { icon: Cpu, tone: 'ok' },
  { icon: CreditCard, tone: 'cyan' },
  { icon: KeyRound, tone: 'amber' },
]

// Per-row design meta for the table, by index (order matches table.rows): a brand
// name supplied here (never translated), or `ph` where the vendor is not publicly
// named and the keyed role text renders as a Placeholder chip.
const ROW_META = [
  { provider: 'Stripe' },
  { ph: true },
  { ph: true },
  { ph: true },
  {},
]

const link = (href) => (c) => <a href={href}>{c}</a>

export default function WorkSubprocessors() {
  const t = useT()
  const glance = t('subprocessorsPage.glance').map((c, i) => ({ ...GLANCE[i], ...c }))
  const rows = t('subprocessorsPage.table.rows').map((r, i) => {
    const m = ROW_META[i] || {}
    const provider = m.provider != null ? m.provider : (m.ph ? <Placeholder>{r.provider}</Placeholder> : r.provider)
    return [r.role, provider, r.purpose, r.data]
  })
  const sections = [
    {
      id: 'about',
      content: (
        <>
          <p>{t('subprocessorsPage.about.p1')}</p>
          <p>{t.rich('subprocessorsPage.about.p2', null, legalTags({ dpa: link('/workcopilot/dpa'), privacy: link('/workcopilot/privacy') }))}</p>
        </>
      ),
    },
    {
      id: 'list',
      content: (
        <>
          <DataTable caption={t('subprocessorsPage.table.caption')} columns={t('subprocessorsPage.table.columns')} rows={rows} />
          <div className="wlx-note"><Cpu size={14} aria-hidden="true" /><span>{t('subprocessorsPage.list.note')}</span></div>
        </>
      ),
    },
    {
      id: 'keys',
      content: (
        <p>{t('subprocessorsPage.keys.p1')}</p>
      ),
    },
    {
      id: 'changes',
      content: (
        <>
          <Items items={t('subprocessorsPage.changes.items')} />
        </>
      ),
    },
    {
      id: 'contact',
      content: (
        <Items items={[
          [t('subprocessorsPage.contact.legal'), <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
          [t('subprocessorsPage.contact.support'), <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
        ]} />
      ),
    },
  ].map((s) => ({ ...s, title: t('subprocessorsPage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={Network}
      eyebrow={t('subprocessorsPage.hero.eyebrow')}
      title={t('subprocessorsPage.hero.title')}
      intro={t('subprocessorsPage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('subprocessorsPage.hero.tagline')}
      seo={{
        title: t('subprocessorsPage.seo.title'),
        description: t('subprocessorsPage.seo.description'),
        path: '/workcopilot/subprocessors',
      }}
      glance={glance}
      sections={sections}
      links={[
        { label: t('subprocessorsPage.links.dpa'), to: '/workcopilot/dpa', icon: FileText },
        { label: t('subprocessorsPage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('subprocessorsPage.links.terms'), to: '/workcopilot/terms', icon: Gavel },
      ]}
    />
  )
}
