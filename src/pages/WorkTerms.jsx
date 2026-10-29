// WorkCoPilot - Terms of Service (public TEMPLATE, being finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// No governing-law state, no addresses, no invented specifics (placeholders are
// marked). No "certified" / "compliant". No AI model, provider, cost or build
// mechanism. Layout, tokens and classes come from the shared LegalPage component
// so this reads as one set with the Privacy and Disclaimer pages.
// i18n: every visible string comes from the `termsPage` namespace
// (src/i18n/locales/en/termsPage.js); the legal entity, the mailboxes, the date
// and the hrefs stay constants here and are interpolated, never translated.
import React from 'react'
import { Gavel, Compass, Hand, Scale, Lock, ShieldCheck, FileText } from 'lucide-react'
import LegalPage, { Items, legalTags, LEGAL_ENTITY, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'
import { useT } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-23'

// Icon + tone are design, so they stay here; the words are termsPage.glance[i].
const GLANCE = [
  { icon: Compass, tone: 'cyan' },
  { icon: Hand, tone: 'ok' },
  { icon: Scale, tone: 'amber' },
]

const link = (href) => (c) => <a href={href}>{c}</a>

export default function WorkTerms() {
  const t = useT()
  const vars = { entity: LEGAL_ENTITY, support: SUPPORT_CONTACT }
  const glance = t('termsPage.glance').map((c, i) => ({ ...GLANCE[i], ...c }))
  const sections = [
    {
      id: 'parties',
      content: (
        <>
          <p>{t('termsPage.parties.p1', vars)}</p>
          <p>{t('termsPage.parties.p2')}</p>
        </>
      ),
    },
    {
      id: 'service',
      content: (
        <>
          <p>{t('termsPage.service.p1')}</p>
          <Items items={t('termsPage.service.items')} />
          <p>{t.rich('termsPage.service.p2', null, legalTags({ privacy: link('/workcopilot/privacy'), dpa: link('/workcopilot/dpa'), disclaimer: link('/workcopilot/disclaimer') }))}</p>
        </>
      ),
    },
    {
      id: 'aup',
      content: (
        <>
          <p>{t.rich('termsPage.aup.p1', null, legalTags({ a: link('/workcopilot/acceptable-use') }))}</p>
          <p>{t('termsPage.aup.p2')}</p>
        </>
      ),
    },
    {
      id: 'accounts',
      content: (
        <>
          <Items items={t('termsPage.accounts.items')} />
        </>
      ),
    },
    {
      id: 'billing',
      content: (
        <>
          <p>{t.rich('termsPage.billing.p1', null, legalTags({ a: link('/workcopilot/refund') }))}</p>
          <p>{t('termsPage.billing.p2')}</p>
          <p>{t.rich('termsPage.billing.p3', vars, legalTags({ a: link('mailto:' + SUPPORT_CONTACT) }))}</p>
        </>
      ),
    },
    {
      id: 'ip',
      content: (
        <>
          <Items items={t('termsPage.ip.items')} vars={vars} />
          <p>{t('termsPage.ip.p1')}</p>
        </>
      ),
    },
    {
      id: 'improvement',
      content: (
        <>
          <p>{t('termsPage.improvement.p1')}</p>
          <Items items={t('termsPage.improvement.items')} />
        </>
      ),
    },
    {
      id: 'warranty',
      content: (
        <>
          <p>{t.rich('termsPage.warranty.p1', null, legalTags({ a: link('/workcopilot/disclaimer') }))}</p>
          <p>{t('termsPage.warranty.p2')}</p>
          <p>{t('termsPage.warranty.p3')}</p>
        </>
      ),
    },
    {
      id: 'liability',
      content: (
        <>
          <p>{t('termsPage.liability.p1')}</p>
          <p>{t.rich('termsPage.liability.p2', null, legalTags())}</p>
          <p>{t('termsPage.liability.p3')}</p>
        </>
      ),
    },
    {
      id: 'termination',
      content: (
        <>
          <Items items={t('termsPage.termination.items')} />
        </>
      ),
    },
    {
      id: 'law',
      content: (
        <>
          <p>{t.rich('termsPage.law.p1', null, legalTags())}</p>
        </>
      ),
    },
    {
      id: 'changes',
      content: (
        <p>{t('termsPage.changes.p1')}</p>
      ),
    },
    {
      id: 'contact',
      content: (
        <>
          <Items items={[
            [t('termsPage.contact.legal'), <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
            [t('termsPage.contact.support'), <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
          ]} />
          <div className="wlx-note"><ShieldCheck size={14} aria-hidden="true" /><span>{t.rich('termsPage.contact.note')}</span></div>
        </>
      ),
    },
  ].map((s) => ({ ...s, title: t('termsPage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={Gavel}
      eyebrow={t('termsPage.hero.eyebrow')}
      title={t('termsPage.hero.title')}
      intro={t('termsPage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('termsPage.hero.tagline')}
      seo={{
        title: t('termsPage.seo.title'),
        description: t('termsPage.seo.description'),
        path: '/workcopilot/terms',
      }}
      glance={glance}
      sections={sections}
      links={[
        { label: t('termsPage.links.aup'), to: '/workcopilot/acceptable-use', icon: FileText },
        { label: t('termsPage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('termsPage.links.refund'), to: '/workcopilot/refund', icon: FileText },
        { label: t('termsPage.links.dpa'), to: '/workcopilot/dpa', icon: ShieldCheck },
      ]}
    />
  )
}
