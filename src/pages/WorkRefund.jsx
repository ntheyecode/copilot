// WorkCoPilot - Refund & Cancellation (public TEMPLATE, being finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// The refund window and any specific amounts are marked placeholders, not invented.
// No AI model, provider, cost or build mechanism. Layout comes from LegalPage.
// i18n: every visible string comes from the `refundPage` namespace
// (src/i18n/locales/en/refundPage.js); the mailboxes, the date and the hrefs
// stay constants here, never translated.
import React from 'react'
import { Receipt, CreditCard, RefreshCcw, Hand, Gavel, Lock, FileText } from 'lucide-react'
import LegalPage, { Items, legalTags, SUPPORT_CONTACT, LEGAL_CONTACT } from '../components/LegalPage.jsx'
import { useT } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-23'

// Icon + tone are design, so they stay here; the words are refundPage.glance[i].
const GLANCE = [
  { icon: Receipt, tone: 'cyan' },
  { icon: Hand, tone: 'ok' },
  { icon: CreditCard, tone: 'amber' },
]

const link = (href) => (c) => <a href={href}>{c}</a>

export default function WorkRefund() {
  const t = useT()
  const glance = t('refundPage.glance').map((c, i) => ({ ...GLANCE[i], ...c }))
  const sections = [
    {
      id: 'terms',
      content: (
        <>
          <p>{t('refundPage.terms.p1')}</p>
          <p>{t.rich('refundPage.terms.p2', null, legalTags({ a: link('/workcopilot/terms') }))}</p>
        </>
      ),
    },
    {
      id: 'billing',
      content: (
        <>
          <Items items={t('refundPage.billing.items')} />
        </>
      ),
    },
    {
      id: 'cancel',
      content: (
        <>
          <Items items={t('refundPage.cancel.items')} />
        </>
      ),
    },
    {
      id: 'refunds',
      content: (
        <>
          <Items items={t('refundPage.refunds.items')} />
        </>
      ),
    },
    {
      id: 'contact',
      content: (
        <>
          <Items items={[
            [t('refundPage.contact.billing'), <a key="b" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
            [t('refundPage.contact.legal'), <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
          ]} />
          <div className="wlx-note"><RefreshCcw size={14} aria-hidden="true" /><span>{t.rich('refundPage.contact.note')}</span></div>
        </>
      ),
    },
  ].map((s) => ({ ...s, title: t('refundPage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={Receipt}
      eyebrow={t('refundPage.hero.eyebrow')}
      title={t('refundPage.hero.title')}
      intro={t('refundPage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('refundPage.hero.tagline')}
      seo={{
        title: t('refundPage.seo.title'),
        description: t('refundPage.seo.description'),
        path: '/workcopilot/refund',
      }}
      contact={SUPPORT_CONTACT}
      glance={glance}
      sections={sections}
      links={[
        { label: t('refundPage.links.terms'), to: '/workcopilot/terms', icon: Gavel },
        { label: t('refundPage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('refundPage.links.aup'), to: '/workcopilot/acceptable-use', icon: FileText },
      ]}
    />
  )
}
