// WorkCoPilot - Cookie Policy (public, plain-language disclosure).
// HONESTY CONTRACT (owner-enforced): lists only the cookies/storage the product
// actually sets (audited). The ONLY cookies are the strictly-necessary sign-in
// cookie and a consent-gated referral cookie; everything else is first-party
// browser storage. No third-party advertising or cross-site tracking exists, so
// none is claimed. Layout from the shared LegalPage.
// i18n: every visible string comes from the `cookiePolicyPage` namespace
// (src/i18n/locales/en/cookiePolicyPage.js); cookie / storage key NAMES, the
// mailboxes, the date and the hrefs stay constants here, never translated.
import React from 'react'
import { Cookie, ShieldCheck, Sliders, Database, Gavel, Lock, FileText } from 'lucide-react'
import LegalPage, { Items, DataTable, legalTags, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'
import { openPreferences } from '../consent.js'
import { useT } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-25'

// Icon + tone are design, so they stay here; the words are cookiePolicyPage.glance[i].
const GLANCE = [
  { icon: ShieldCheck, tone: 'ok' },
  { icon: Sliders, tone: 'cyan' },
  { icon: Database, tone: 'amber' },
]

// The cookie / storage key NAMES, by table row (order matches table.rows). They
// are code identifiers, so they live here and are never translated; a null row
// uses the keyed English label from the dictionary instead.
const ROW_IDS = ['workcopilot.sid', 'wc_consent', 'affref', 'wc_consent_v1', 'wc_locale', 'theme', null, null, 'wc_pending_ref']

const link = (href) => (c) => <a href={href}>{c}</a>

export default function WorkCookiePolicy() {
  const t = useT()
  const glance = t('cookiePolicyPage.glance').map((c, i) => ({ ...GLANCE[i], ...c }))
  const rows = t('cookiePolicyPage.table.rows').map((r, i) => [ROW_IDS[i] != null ? ROW_IDS[i] : r.name, r.kind, r.category, r.purpose, r.lifetime])
  const sections = [
    {
      id: 'about',
      content: (
        <>
          <p>{t('cookiePolicyPage.about.p1')}</p>
          <p>{t.rich('cookiePolicyPage.about.p2')}</p>
        </>
      ),
    },
    {
      id: 'what',
      content: (
        <>
          <p>{t('cookiePolicyPage.what.p1')}</p>
          <DataTable caption={t('cookiePolicyPage.table.caption')} columns={t('cookiePolicyPage.table.columns')} rows={rows} />
        </>
      ),
    },
    {
      id: 'categories',
      content: (
        <Items items={t('cookiePolicyPage.categories.items')} />
      ),
    },
    {
      id: 'manage',
      content: (
        <>
          <Items items={t('cookiePolicyPage.manage.items')} />
          <p><button type="button" className="wlx-btn" onClick={openPreferences}>{t('cookiePolicyPage.manage.button')}</button></p>
        </>
      ),
    },
    {
      id: 'consent',
      content: (
        <p>{t.rich('cookiePolicyPage.consent.p1', null, legalTags({ a: link('/workcopilot/privacy') }))}</p>
      ),
    },
    {
      id: 'changes',
      content: (
        <p>{t('cookiePolicyPage.changes.p1')}</p>
      ),
    },
    {
      id: 'contact',
      content: (
        <Items items={[
          [t('cookiePolicyPage.contact.legal'), <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
          [t('cookiePolicyPage.contact.support'), <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
        ]} />
      ),
    },
  ].map((s) => ({ ...s, title: t('cookiePolicyPage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={Cookie}
      eyebrow={t('cookiePolicyPage.hero.eyebrow')}
      title={t('cookiePolicyPage.hero.title')}
      intro={t('cookiePolicyPage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('cookiePolicyPage.hero.tagline')}
      seo={{
        title: t('cookiePolicyPage.seo.title'),
        description: t('cookiePolicyPage.seo.description'),
        path: '/workcopilot/cookie-policy',
      }}
      glance={glance}
      sections={sections}
      links={[
        { label: t('cookiePolicyPage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('cookiePolicyPage.links.subprocessors'), to: '/workcopilot/subprocessors', icon: Database },
        { label: t('cookiePolicyPage.links.terms'), to: '/workcopilot/terms', icon: Gavel },
        { label: t('cookiePolicyPage.links.dpa'), to: '/workcopilot/dpa', icon: FileText },
      ]}
    />
  )
}
