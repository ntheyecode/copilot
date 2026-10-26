// WorkCoPilot - Subprocessors (public list, plain-language disclosure).
// HONESTY CONTRACT (owner-enforced): names only what is actually true. Stripe is
// named because the code uses it. Providers we do not publicly disclose by name
// (AI model provider, hosting, email) are shown as roles with a clearly-marked
// placeholder rather than an invented vendor. No data-center cities or dates are
// invented. Legal copy stays English. Layout from the shared LegalPage.
import React from 'react'
import { Network, CreditCard, Cpu, KeyRound, Lock, FileText, Gavel } from 'lucide-react'
import LegalPage, { Items, Placeholder, DataTable, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'

const LAST_UPDATED = '2026-10-25'

const GLANCE = [
  { icon: Cpu, tone: 'ok', eyebrow: 'On your device first', title: 'Subprocessors see governed data only', body: 'Sensitive values are redacted or tokenized on your device before anything is sent, so a subprocessor never receives real secrets or PII.' },
  { icon: CreditCard, tone: 'cyan', eyebrow: 'Payments', title: 'Stripe handles billing', body: 'Card and payment details are entered with and held by Stripe. We receive only what is needed to run your subscription.' },
  { icon: KeyRound, tone: 'amber', eyebrow: 'Your option', title: 'Bring your own AI keys', body: 'You or your company can run WorkCoPilot on your own AI keys, so governed data stays inside your own provider boundary.' },
]

const COLS = ['Role', 'Provider', 'Purpose', 'Data involved']
const ROWS = [
  ['Payments', 'Stripe', 'Subscription billing, invoices and affiliate payouts.', 'Billing contact and plan status. Card and payment details are held by Stripe, not by us.'],
  ['AI guidance', <Placeholder key="ai">AI model provider - configurable, or your own key</Placeholder>, 'Turns the governed text of a step into guidance.', 'Governed (redacted or tokenized) text and reduced-size screen frames. Never real secrets, PII or your source files.'],
  ['Cloud hosting', <Placeholder key="host">cloud hosting and infrastructure provider</Placeholder>, 'Runs the service and stores your session records, encrypted at rest.', 'Account details and per-session reports, audit logs and history (encrypted at rest).'],
  ['Email delivery', <Placeholder key="mail">transactional email provider</Placeholder>, 'Sends account, security and billing emails.', 'Your email address and the content of the message.'],
  ['Company sign-on', 'Your chosen identity provider', 'Authenticates company members through enterprise single sign-on.', 'Authentication only. Chosen and controlled by your company, not selected by us.'],
]

const SECTIONS = [
  {
    id: 'about',
    title: 'About this list',
    content: (
      <>
        <p>A subprocessor is a third party that processes data on our behalf to provide WorkCoPilot. This page lists the roles those subprocessors play and the data each one is involved with, so you can see who is in the chain before you rely on the product.</p>
        <p>It complements the <a href="/workcopilot/dpa">Data Processing Addendum</a> and the <a href="/workcopilot/privacy">Privacy Policy</a>. Where we do not publicly name a specific vendor, the role is listed with a clearly-marked placeholder rather than an invented name; your DPA names the specific vendors where that applies to your account.</p>
      </>
    ),
  },
  {
    id: 'list',
    title: 'Current subprocessors',
    content: (
      <>
        <DataTable caption="Subprocessors and the role each plays" columns={COLS} rows={ROWS} />
        <div className="wlx-note"><Cpu size={14} aria-hidden="true" /><span>Because sensitive values are redacted or tokenized on your device before anything leaves, subprocessors that handle guidance receive governed text only, never the real values.</span></div>
      </>
    ),
  },
  {
    id: 'keys',
    title: 'Running on your own keys',
    content: (
      <p>You or your company can run WorkCoPilot on your own AI keys. In that mode the governed data for guidance stays inside your own provider boundary, and the AI-provider role above is filled by your own account rather than ours. Company deployments can also be run on-prem on request.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes and notification',
    content: (
      <>
        <Items items={[
          ['Updates', 'When we add, remove or replace a subprocessor, we update this page and the "Last updated" date above.'],
          ['Advance notice', <>Where a signed agreement provides for it, enterprise customers can ask to be notified of new subprocessors in advance so they can object. The specific notice period for your account is set in your agreement <Placeholder>to be confirmed with counsel</Placeholder>.</>],
          ['Objections', 'If you have a signed agreement and object to a new subprocessor on reasonable data-protection grounds, contact us using the address below and we will work with you in good faith.'],
        ]} />
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <Items items={[
        ['Privacy, legal and subprocessor questions', <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
        ['Product support', <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
      ]} />
    ),
  },
]

export default function WorkSubprocessors() {
  return (
    <LegalPage
      icon={Network}
      eyebrow="Subprocessors"
      title="Who processes data for WorkCoPilot"
      intro="The third parties that help provide WorkCoPilot, the role each plays, and the data each is involved with."
      lastUpdated={LAST_UPDATED}
      tagline="Plain-language disclosure, read alongside the DPA"
      seo={{
        title: 'Subprocessors - WorkCoPilot by AdmireVeda',
        description: 'The subprocessors that help provide WorkCoPilot and the role each plays: Stripe for payments, an AI model provider for guidance (or your own keys), cloud hosting, email delivery, and your own identity provider for company sign-on. Subprocessors see governed data only.',
        path: '/workcopilot/subprocessors',
      }}
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Data Processing Addendum', to: '/workcopilot/dpa', icon: FileText },
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Terms of Service', to: '/workcopilot/terms', icon: Gavel },
      ]}
    />
  )
}
