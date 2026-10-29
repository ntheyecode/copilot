// WorkCoPilot - Accessibility statement (public, plain-language).
// HONESTY CONTRACT (owner-enforced): states WCAG 2.1 AA as the TARGET we build
// toward and the measures actually in the product (focus rings, landmarks, one
// H1, reduced-motion support, AA contrast, keyboard operability). It does NOT
// claim a certification or a completed third-party audit. Layout from the
// shared LegalPage.
// i18n: every visible string comes from the `accessibilityPage` namespace
// (src/i18n/locales/en/accessibilityPage.js); the mailboxes, the date and the
// hrefs stay constants here, never translated.
import React from 'react'
import { Accessibility, Keyboard, Eye, MessageSquare, Lock, FileText, Gavel } from 'lucide-react'
import LegalPage, { Items, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'
import { useT } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-25'

// Icon + tone are design, so they stay here; the words are accessibilityPage.glance[i].
const GLANCE = [
  { icon: Eye, tone: 'ok' },
  { icon: Keyboard, tone: 'cyan' },
  { icon: MessageSquare, tone: 'amber' },
]

export default function WorkAccessibility() {
  const t = useT()
  const glance = t('accessibilityPage.glance').map((c, i) => ({ ...GLANCE[i], ...c }))
  const sections = [
    {
      id: 'commitment',
      content: (
        <p>{t('accessibilityPage.commitment.p1')}</p>
      ),
    },
    {
      id: 'standard',
      content: (
        <>
          <p>{t.rich('accessibilityPage.standard.p1')}</p>
        </>
      ),
    },
    {
      id: 'measures',
      content: (
        <Items items={t('accessibilityPage.measures.items')} />
      ),
    },
    {
      id: 'limitations',
      content: (
        <>
          <p>{t('accessibilityPage.limitations.p1')}</p>
          <Items items={t('accessibilityPage.limitations.items')} />
        </>
      ),
    },
    {
      id: 'feedback',
      content: (
        <>
          <p>{t('accessibilityPage.feedback.p1')}</p>
          <Items items={[
            [t('accessibilityPage.feedback.accessibility'), <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
            [t('accessibilityPage.feedback.support'), <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
            t('accessibilityPage.feedback.expect'),
          ]} />
        </>
      ),
    },
  ].map((s) => ({ ...s, title: t('accessibilityPage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={Accessibility}
      eyebrow={t('accessibilityPage.hero.eyebrow')}
      title={t('accessibilityPage.hero.title')}
      intro={t('accessibilityPage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('accessibilityPage.hero.tagline')}
      seo={{
        title: t('accessibilityPage.seo.title'),
        description: t('accessibilityPage.seo.description'),
        path: '/workcopilot/accessibility',
      }}
      glance={glance}
      sections={sections}
      links={[
        { label: t('accessibilityPage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('accessibilityPage.links.terms'), to: '/workcopilot/terms', icon: Gavel },
        { label: t('accessibilityPage.links.contact'), href: 'mailto:' + LEGAL_CONTACT, icon: FileText },
      ]}
    />
  )
}
