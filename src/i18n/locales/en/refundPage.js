// English strings for the public Refund and Cancellation page (src/pages/WorkRefund.jsx).
// Keyed under the `refundPage` namespace; the i18n loader deep-merges every
// en/*.js partial into the English base, so this file owns its namespace.
// LEGAL COPY: extracted verbatim from the page (honesty contract, owner-enforced).
// Never reworded here; a change of substance is a change to the policy itself.
// Inline tags render via t.rich() / Items with the page's own hrefs: <a> is a
// link; <ph> is a clearly-marked fill-in-later placeholder (never an invented
// window or amount); <b> renders bold. Lists (items[], glance[]) translate as units.
export default {
  refundPage: {
    seo: {
      title: 'Refund and Cancellation Policy - WorkCoPilot by AdmireVeda',
      description: 'How WorkCoPilot subscriptions are billed through Stripe, how you cancel yourself from the billing portal, when a plan ends, and how refund requests are handled.',
    },
    hero: {
      eyebrow: 'Refund and Cancellation',
      title: 'Billing, cancelling and refunds',
      intro: 'How subscriptions are billed, how you cancel on your own, and how refund requests are handled.',
      tagline: 'Plain-language policy, template draft',
    },
    // Order matches the icon/tone list in the page (Receipt, Hand, CreditCard).
    glance: [
      { eyebrow: 'Before you pay', title: 'Terms shown up front', body: 'The plan, price, billing period and allowance are shown before payment, so you know what you are agreeing to.' },
      { eyebrow: 'Cancel yourself', title: 'Self-service in the billing portal', body: 'Cancel any time from the billing portal, with no need to contact anyone.' },
      { eyebrow: 'Billing', title: 'Payments run through Stripe', body: 'Stripe handles payments and invoices. For billing questions, write to our product support team.' },
    ],
    sections: {
      terms: 'Subscription terms shown before payment',
      billing: 'How billing works',
      cancel: 'Cancelling your subscription',
      refunds: 'Refund policy',
      contact: 'Contact',
    },
    terms: {
      p1: 'Before you pay, checkout shows the plan you chose, the price, whether it bills monthly or annually, and the usage allowance that comes with it. Review those details before you confirm. Taxes are added where required and are shown at checkout.',
      p2: 'Subscriptions renew automatically at the end of each billing period until you cancel. These terms apply together with the <a>Terms of Service</a>.',
    },
    billing: {
      items: [
        { name: 'Payment provider', how: 'Payments are processed by Stripe. Card and payment details are entered with and held by Stripe, not by us.' },
        { name: 'Invoices', how: 'Your invoices are available from your account and the billing portal.' },
        { name: 'Plan changes', how: 'You can move between plans. Changes to price or allowance take effect as shown to you when you make the change.' },
        { name: 'Failed payments', how: 'If a payment fails, we may limit paid features until it is resolved. Update your payment method in the billing portal.' },
        { name: 'Company accounts', how: 'Where an organization has its own agreement or pricing, that agreement controls how it is billed.' },
      ],
    },
    cancel: {
      items: [
        { name: 'Self-service', how: 'Open the billing portal from your account and cancel your subscription yourself, at any time.' },
        { name: 'When it ends', how: 'After you cancel, your plan stays active until the end of the period you have already paid for. It then stops renewing.' },
        { name: 'Your data', how: 'Cancelling does not delete your sessions on its own. You can delete them at any time, and the retention settings for your account still apply. See the Privacy Policy and the Data Processing Addendum.' },
      ],
    },
    refunds: {
      items: [
        { name: 'Request window', how: 'Ask for a refund within <ph>refund window, to be confirmed with counsel</ph> of a charge by writing to the billing address below.' },
        { name: 'What we consider', how: 'We look at each request in good faith, including duplicate or mistaken charges, a plan that did not work as described, and how much of the period was used.' },
        { name: 'Usage already consumed', how: 'Guided minutes already used in a period are generally not refundable.' },
        { name: 'Annual plans', how: 'Annual plans are handled under the same window. Any partial-term treatment is <ph>to be confirmed with counsel</ph>.' },
        { name: 'How it is paid', how: 'Approved refunds go back to the original payment method through Stripe. Timing depends on your bank or card issuer.' },
        { name: 'Your rights', how: 'Nothing here limits rights you have under the law that applies to you.' },
      ],
    },
    contact: {
      billing: 'Billing and refunds',
      legal: 'Legal and privacy questions',
      note: '<b>Honest framing.</b> This page is a template. Specific windows and amounts are marked and will be confirmed before this policy takes effect.',
    },
    links: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      aup: 'Acceptable Use',
    },
  },
}
