// WorkCoPilot - Refund & Cancellation (public TEMPLATE, being finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// The refund window and any specific amounts are marked placeholders, not invented.
// No AI model, provider, cost or build mechanism. Layout comes from LegalPage.
import React from 'react'
import { Receipt, CreditCard, RefreshCcw, Hand, Gavel, Lock, FileText } from 'lucide-react'
import LegalPage, { Items, Placeholder, SUPPORT_CONTACT, LEGAL_CONTACT } from '../components/LegalPage.jsx'

const LAST_UPDATED = '2026-10-23'

const GLANCE = [
  { icon: Receipt, tone: 'cyan', eyebrow: 'Before you pay', title: 'Terms shown up front', body: 'The plan, price, billing period and allowance are shown before payment, so you know what you are agreeing to.' },
  { icon: Hand, tone: 'ok', eyebrow: 'Cancel yourself', title: 'Self-service in the billing portal', body: 'Cancel any time from the billing portal, with no need to contact anyone.' },
  { icon: CreditCard, tone: 'amber', eyebrow: 'Billing', title: 'Payments run through Stripe', body: 'Stripe handles payments and invoices. For billing questions, write to our product support team.' },
]

const SECTIONS = [
  {
    id: 'terms',
    title: 'Subscription terms shown before payment',
    content: (
      <>
        <p>Before you pay, checkout shows the plan you chose, the price, whether it bills monthly or annually, and the usage allowance that comes with it. Review those details before you confirm. Taxes are added where required and are shown at checkout.</p>
        <p>Subscriptions renew automatically at the end of each billing period until you cancel. These terms apply together with the <a href="/workcopilot/terms">Terms of Service</a>.</p>
      </>
    ),
  },
  {
    id: 'billing',
    title: 'How billing works',
    content: (
      <>
        <Items items={[
          ['Payment provider', 'Payments are processed by Stripe. Card and payment details are entered with and held by Stripe, not by us.'],
          ['Invoices', 'Your invoices are available from your account and the billing portal.'],
          ['Plan changes', 'You can move between plans. Changes to price or allowance take effect as shown to you when you make the change.'],
          ['Failed payments', 'If a payment fails, we may limit paid features until it is resolved. Update your payment method in the billing portal.'],
          ['Company accounts', 'Where an organization has its own agreement or pricing, that agreement controls how it is billed.'],
        ]} />
      </>
    ),
  },
  {
    id: 'cancel',
    title: 'Cancelling your subscription',
    content: (
      <>
        <Items items={[
          ['Self-service', 'Open the billing portal from your account and cancel your subscription yourself, at any time.'],
          ['When it ends', 'After you cancel, your plan stays active until the end of the period you have already paid for. It then stops renewing.'],
          ['Your data', 'Cancelling does not delete your sessions on its own. You can delete them at any time, and the retention settings for your account still apply. See the Privacy Policy and the Data Processing Addendum.'],
        ]} />
      </>
    ),
  },
  {
    id: 'refunds',
    title: 'Refund policy',
    content: (
      <>
        <Items items={[
          ['Request window', <>Ask for a refund within <Placeholder>refund window, to be confirmed with counsel</Placeholder> of a charge by writing to the billing address below.</>],
          ['What we consider', 'We look at each request in good faith, including duplicate or mistaken charges, a plan that did not work as described, and how much of the period was used.'],
          ['Usage already consumed', 'Guided minutes already used in a period are generally not refundable.'],
          ['Annual plans', <>Annual plans are handled under the same window. Any partial-term treatment is <Placeholder>to be confirmed with counsel</Placeholder>.</>],
          ['How it is paid', 'Approved refunds go back to the original payment method through Stripe. Timing depends on your bank or card issuer.'],
          ['Your rights', 'Nothing here limits rights you have under the law that applies to you.'],
        ]} />
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <>
        <Items items={[
          ['Billing and refunds', <a key="b" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
          ['Legal and privacy questions', <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
        ]} />
        <div className="wlx-note"><RefreshCcw size={14} aria-hidden="true" /><span><b>Honest framing.</b> This page is a template. Specific windows and amounts are marked and will be confirmed before this policy takes effect.</span></div>
      </>
    ),
  },
]

export default function WorkRefund() {
  return (
    <LegalPage
      icon={Receipt}
      eyebrow="Refund and Cancellation"
      title="Billing, cancelling and refunds"
      intro="How subscriptions are billed, how you cancel on your own, and how refund requests are handled."
      lastUpdated={LAST_UPDATED}
      tagline="Plain-language policy, template draft"
      seo={{
        title: 'Refund and Cancellation Policy - WorkCoPilot by AdmireVeda',
        description: 'How WorkCoPilot subscriptions are billed through Stripe, how you cancel yourself from the billing portal, when a plan ends, and how refund requests are handled.',
        path: '/workcopilot/refund',
      }}
      contact={SUPPORT_CONTACT}
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Terms of Service', to: '/workcopilot/terms', icon: Gavel },
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Acceptable Use', to: '/workcopilot/acceptable-use', icon: FileText },
      ]}
    />
  )
}
