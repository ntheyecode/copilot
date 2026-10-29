// WorkCoPilot - Acceptable Use Policy (public TEMPLATE, being finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// No invented specifics, no "certified" / "compliant", no AI model, provider, cost
// or build mechanism. Layout comes from the shared LegalPage component.
// i18n: every visible string comes from the `acceptableUsePage` namespace
// (src/i18n/locales/en/acceptableUsePage.js); the mailboxes, the date and the
// hrefs stay constants here and are interpolated, never translated.
import React from 'react'
import { Ban, UserCheck, Hand, AlertTriangle, ShieldCheck, Gavel, Lock, FileText } from 'lucide-react'
import LegalPage, { Items, legalTags, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'
import { useT } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-23'

// Icon + tone are design, so they stay here; the words are acceptableUsePage.glance[i].
const GLANCE = [
  { icon: UserCheck, tone: 'ok' },
  { icon: Hand, tone: 'cyan' },
  { icon: Ban, tone: 'amber' },
]

const link = (href) => (c) => <a href={href}>{c}</a>

export default function WorkAcceptableUse() {
  const t = useT()
  const vars = { contact: LEGAL_CONTACT, support: SUPPORT_CONTACT }
  const glance = t('acceptableUsePage.glance').map((c, i) => ({ ...GLANCE[i], ...c }))
  const sections = [
    {
      id: 'purpose',
      content: (
        <>
          <p>{t.rich('acceptableUsePage.purpose.p1', null, legalTags({ a: link('/workcopilot/terms') }))}</p>
        </>
      ),
    },
    {
      id: 'authorized',
      content: (
        <>
          <Items items={t('acceptableUsePage.authorized.items')} />
        </>
      ),
    },
    {
      id: 'responsibility',
      content: (
        <>
          <p>{t('acceptableUsePage.responsibility.p1')}</p>
          <Items items={t('acceptableUsePage.responsibility.items')} />
        </>
      ),
    },
    {
      id: 'prohibited',
      content: (
        <>
          <p>{t('acceptableUsePage.prohibited.p1')}</p>
          <Items items={t('acceptableUsePage.prohibited.items')} />
        </>
      ),
    },
    {
      id: 'security',
      content: (
        <>
          <p>{t('acceptableUsePage.security.p1')}</p>
          <p>{t('acceptableUsePage.security.p2')}</p>
        </>
      ),
    },
    {
      id: 'enforcement',
      content: (
        <>
          <p>{t('acceptableUsePage.enforcement.p1')}</p>
          <p>{t('acceptableUsePage.enforcement.p2')}</p>
        </>
      ),
    },
    {
      id: 'report',
      content: (
        <>
          <p>{t.rich('acceptableUsePage.report.p1', vars, legalTags({ contact: link('mailto:' + LEGAL_CONTACT), support: link('mailto:' + SUPPORT_CONTACT) }))}</p>
          <div className="wlx-note"><AlertTriangle size={14} aria-hidden="true" /><span>{t.rich('acceptableUsePage.report.note')}</span></div>
        </>
      ),
    },
  ].map((s) => ({ ...s, title: t('acceptableUsePage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={ShieldCheck}
      eyebrow={t('acceptableUsePage.hero.eyebrow')}
      title={t('acceptableUsePage.hero.title')}
      intro={t('acceptableUsePage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('acceptableUsePage.hero.tagline')}
      seo={{
        title: t('acceptableUsePage.seo.title'),
        description: t('acceptableUsePage.seo.description'),
        path: '/workcopilot/acceptable-use',
      }}
      glance={glance}
      sections={sections}
      links={[
        { label: t('acceptableUsePage.links.terms'), to: '/workcopilot/terms', icon: Gavel },
        { label: t('acceptableUsePage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('acceptableUsePage.links.disclaimer'), to: '/workcopilot/disclaimer', icon: FileText },
      ]}
    />
  )
}
