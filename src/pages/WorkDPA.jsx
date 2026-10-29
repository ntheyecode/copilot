// WorkCoPilot - Data Processing Addendum, summary form (public TEMPLATE, being
// finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// States guarantees, not mechanisms: no AI provider or model name, no cost, no
// redaction internals, no internal module names. No "certified" / "compliant".
// Unknown specifics (transfer mechanism, notification window) are marked
// placeholders, never invented. Layout comes from the shared LegalPage component.
// i18n: every visible string comes from the `dpaPage` namespace
// (src/i18n/locales/en/dpaPage.js); the legal entity, the mailbox, the date and
// the hrefs stay constants here and are interpolated, never translated.
import React from 'react'
import { FileSignature, Users, Database, KeyRound, ShieldCheck, Lock, Gavel, Mail } from 'lucide-react'
import LegalPage, { Items, DataTable, legalTags, LEGAL_ENTITY, LEGAL_CONTACT } from '../components/LegalPage.jsx'
import { useT, interpolate } from '../i18n/index.jsx'

const LAST_UPDATED = '2026-10-23'

// Icon + tone are design, so they stay here; the words are dpaPage.glance[i].
const GLANCE = [
  { icon: Users, tone: 'cyan' },
  { icon: KeyRound, tone: 'ok' },
  { icon: Database, tone: 'amber' },
]

const link = (href) => (c) => <a href={href}>{c}</a>

export default function WorkDPA() {
  const t = useT()
  const vars = { entity: LEGAL_ENTITY, contact: LEGAL_CONTACT }
  const mailto = legalTags({ a: link('mailto:' + LEGAL_CONTACT) })
  const glance = t('dpaPage.glance').map((c, i) => ({ ...GLANCE[i], ...c, body: interpolate(c.body, vars) }))
  const sections = [
    {
      id: 'scope',
      content: (
        <>
          <p>{t.rich('dpaPage.scope.p1', null, legalTags({ terms: link('/workcopilot/terms'), privacy: link('/workcopilot/privacy') }))}</p>
        </>
      ),
    },
    {
      id: 'roles',
      content: (
        <>
          <Items items={t('dpaPage.roles.items')} vars={vars} />
        </>
      ),
    },
    {
      id: 'data',
      content: (
        <>
          <Items items={t('dpaPage.data.items')} />
          <div className="wlx-note"><ShieldCheck size={14} aria-hidden="true" /><span>{t('dpaPage.data.note')}</span></div>
        </>
      ),
    },
    {
      id: 'boundary',
      content: (
        <>
          <p>{t('dpaPage.boundary.p1')}</p>
          <p>{t('dpaPage.boundary.p2')}</p>
        </>
      ),
    },
    {
      id: 'safeguards',
      content: (
        <>
          <Items items={t('dpaPage.safeguards.items')} />
        </>
      ),
    },
    {
      // DAT-03: the public data lifecycle, one row per data type. Every cell states
      // what the product does today (on-device redaction before send, configurable
      // retention, deletion of a session removes its report, screenshots and audit
      // log together, keys encrypted at rest). Nothing here is a guarantee of
      // compliance, and nothing names the AI provider, model or mechanism.
      id: 'lifecycle',
      content: (
        <>
          <p>{t('dpaPage.lifecycle.p1')}</p>
          <DataTable
            caption={t('dpaPage.lifecycle.caption')}
            columns={t('dpaPage.lifecycle.columns')}
            rows={t('dpaPage.lifecycle.rows')}
          />
          <div className="wlx-note"><Database size={14} aria-hidden="true" /><span>{t.rich('dpaPage.lifecycle.note')}</span></div>
        </>
      ),
    },
    {
      // DAT-05: public sub-processor categories. The AI provider is described by
      // category only (business rule: never name the provider or model); Stripe is
      // named as the payment processor, as elsewhere on the site.
      id: 'subprocessors',
      content: (
        <>
          <p>{t('dpaPage.subprocessors.p1')}</p>
          <Items items={t('dpaPage.subprocessors.items')} />
          <p>{t('dpaPage.subprocessors.p2')}</p>
          <div className="wlx-note"><Mail size={14} aria-hidden="true" /><span>{t.rich('dpaPage.subprocessors.note', vars, mailto)}</span></div>
        </>
      ),
    },
    {
      id: 'retention',
      content: (
        <>
          <Items items={t('dpaPage.retention.items')} />
        </>
      ),
    },
    {
      id: 'rights',
      content: (
        <>
          <Items items={t('dpaPage.rights.items')} />
        </>
      ),
    },
    {
      id: 'transfers',
      content: (
        <p>{t.rich('dpaPage.transfers.p1', null, legalTags())}</p>
      ),
    },
    {
      id: 'request',
      content: (
        <>
          <p>{t.rich('dpaPage.request.p1', vars, mailto)}</p>
          <div className="wlx-note"><Mail size={14} aria-hidden="true" /><span>{t.rich('dpaPage.request.note')}</span></div>
        </>
      ),
    },
  ].map((s) => ({ ...s, title: t('dpaPage.sections.' + s.id) }))

  return (
    <LegalPage
      icon={FileSignature}
      eyebrow={t('dpaPage.hero.eyebrow')}
      title={t('dpaPage.hero.title')}
      intro={t('dpaPage.hero.intro')}
      lastUpdated={LAST_UPDATED}
      tagline={t('dpaPage.hero.tagline')}
      seo={{
        title: t('dpaPage.seo.title'),
        description: t('dpaPage.seo.description'),
        path: '/workcopilot/dpa',
      }}
      glance={glance}
      sections={sections}
      links={[
        { label: t('dpaPage.links.privacy'), to: '/workcopilot/privacy', icon: Lock },
        { label: t('dpaPage.links.terms'), to: '/workcopilot/terms', icon: Gavel },
        { label: t('dpaPage.links.security'), to: '/workcopilot/security', icon: ShieldCheck },
      ]}
    />
  )
}
