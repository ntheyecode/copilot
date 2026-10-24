// WorkCoPilot - Terms of Service (public TEMPLATE, being finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// No governing-law state, no addresses, no invented specifics (placeholders are
// marked). No "certified" / "compliant". No AI model, provider, cost or build
// mechanism. Layout, tokens and classes come from the shared LegalPage component
// so this reads as one set with the Privacy and Disclaimer pages.
import React from 'react'
import { Gavel, Compass, Hand, Scale, Lock, ShieldCheck, FileText } from 'lucide-react'
import LegalPage, { Items, Placeholder, LEGAL_ENTITY, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'

const LAST_UPDATED = '2026-10-23'

const GLANCE = [
  { icon: Compass, tone: 'cyan', eyebrow: 'The service', title: 'A read-only guide on your screen', body: 'WorkCoPilot gives practical, step-by-step guidance. It never clicks, types or runs anything for you.' },
  { icon: Hand, tone: 'ok', eyebrow: 'Your side', title: 'Authorized, lawful use only', body: 'You are responsible for having the right to use the systems and data you share, and for following the Acceptable Use Policy.' },
  { icon: Scale, tone: 'amber', eyebrow: 'Limits', title: 'Guidance, not professional advice', body: 'Verify what matters before you rely on it. Liability is limited as set out below.' },
]

const SECTIONS = [
  {
    id: 'parties',
    title: 'Parties and acceptance',
    content: (
      <>
        <p>These terms are an agreement between you (or the organization you represent) and {LEGAL_ENTITY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). WorkCoPilot is offered by AdmireVeda, a product of {LEGAL_ENTITY}, which is the legal entity behind the service.</p>
        <p>By creating an account or using WorkCoPilot, you accept these terms. If you use it on behalf of a company, you confirm you are allowed to bind that company. If you do not agree, do not use the service.</p>
      </>
    ),
  },
  {
    id: 'service',
    title: 'The service',
    content: (
      <>
        <p>WorkCoPilot is a screen-aware guide for work. It helps you see what to do next on your own screen. It is available as a web app, a desktop app and a mobile app, and its features depend on your plan.</p>
        <Items items={[
          ['Read-only', 'WorkCoPilot never clicks, types, submits or changes anything in your systems. Every action is yours.'],
          ['Protection before sending', 'Sensitive values are stripped or tokenized on your own device before anything is sent. The Privacy Policy describes what is collected and what is kept.'],
          ['Changes to the service', 'We may improve, change or retire features. Where a change materially reduces a paid plan, we will tell you in advance.'],
        ]} />
        <p>See the <a href="/workcopilot/privacy">Privacy Policy</a>, the <a href="/workcopilot/dpa">Data Processing Addendum</a> and the <a href="/workcopilot/disclaimer">Disclaimer</a>, which form part of how the service works with your data.</p>
      </>
    ),
  },
  {
    id: 'aup',
    title: 'Acceptable use',
    content: (
      <>
        <p>You must use WorkCoPilot lawfully and only on systems and data you are authorized to use. The <a href="/workcopilot/acceptable-use">Acceptable Use Policy</a> sets out what is allowed and what is not, and it is part of these terms.</p>
        <p>We may suspend or limit access if use breaks that policy, puts the service or other customers at risk, or is required by law.</p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts',
    content: (
      <>
        <Items items={[
          ['Accurate details', 'Give accurate account details and keep them current.'],
          ['Keep sign-in safe', 'You are responsible for your sign-in details and for what is done under your account. Tell us promptly at the support address below if you suspect misuse.'],
          ['Company accounts', 'Where an administrator creates or manages accounts for a company, that company is responsible for its members, for the roster, and for the data policy it sets.'],
          ['Single sign-on', 'Where your company uses enterprise single sign-on, access follows your company\'s identity provider and its rules.'],
        ]} />
      </>
    ),
  },
  {
    id: 'billing',
    title: 'Subscriptions and billing',
    content: (
      <>
        <p>Paid plans are subscriptions. The plan, price, billing period and allowance are shown before you pay. Payments are handled by our billing provider, Stripe. Cancellation and refunds are covered in the <a href="/workcopilot/refund">Refund and Cancellation</a> page, which is part of these terms.</p>
        <p>Taxes may apply and are shown at checkout where required. If a payment fails, we may limit access to paid features until it is resolved.</p>
        <p>Billing questions: <a href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a></p>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Ownership and your content',
    content: (
      <>
        <Items items={[
          ['Our service', `WorkCoPilot, including its software, design, documentation and brand, belongs to ${LEGAL_ENTITY} and its licensors. You get a limited, non-exclusive, non-transferable right to use it during your subscription, under these terms.`],
          ['Your content', 'You keep your rights in what you share with the service, such as screen content, typed text and attached documents, and in the session reports produced for you.'],
          ['What we may do with it', 'We use your content only to provide the service to you and to keep it secure and working, as described in the Privacy Policy and the Data Processing Addendum.'],
          ['Your own AI key', 'Where you or your company run WorkCoPilot on your own AI key, that data stays inside your own provider relationship and is subject to that provider\'s terms.'],
          ['Feedback', 'If you send us ideas or suggestions, we may use them to improve the service without obligation to you.'],
        ]} />
        <p>You must not copy, resell, reverse engineer or build a competing service from WorkCoPilot, except to the extent the law does not allow us to restrict that.</p>
      </>
    ),
  },
  {
    id: 'improvement',
    title: 'Improving the service with skills and content you add',
    content: (
      <>
        <p>You can add skills - playbooks, SOPs and instructions, including ones exported from other AI tools - so that WorkCoPilot&rsquo;s guidance aligns with how you work. This section explains how that content may be used, and it is shown to you when you create an individual account.</p>
        <Items items={[
          ['Individual accounts', 'To improve WorkCoPilot, skills and content you add may be used in de-identified form to enhance the service for everyone. Personal data is stripped on your device before anything is sent, and de-identified content is never attributed to you.'],
          ['Company accounts are exempt', 'Skills and knowledge added under a company account stay private to that company. They guide only that company\'s members and are never used to train or improve the platform for anyone else. Company administrators can download, re-upload or clear them at any time.'],
          ['Your control', 'You can remove a skill you added at any time from your dashboard. Removal stops its use from that point; de-identified improvements already derived from it cannot be traced back to you or reversed.'],
          ['Not training on your work', 'This covers only the skills and content you deliberately add. Your screens, typed tasks, questions and session reports are used only to provide the service to you, as described in the Privacy Policy.'],
        ]} />
      </>
    ),
  },
  {
    id: 'warranty',
    title: 'Guidance, warranties and disclaimers',
    content: (
      <>
        <p>WorkCoPilot gives practical guidance. It is not legal, financial, medical, tax, accounting, engineering or other professional advice, and using it does not create a professional relationship with us. Guidance is best-effort and can be wrong or out of date. Verify anything that matters before you rely on it. The <a href="/workcopilot/disclaimer">Disclaimer</a> explains this in plain language.</p>
        <p>To the extent the law allows, the service is provided as is and as available, and we make no warranty, express or implied, including about accuracy, completeness, fitness for a particular purpose, or uninterrupted or error-free operation.</p>
        <p>WorkCoPilot provides controls and evidence that support your own compliance work. It does not make you compliant, and we do not claim it is certified against any framework.</p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    content: (
      <>
        <p>To the extent the law allows, we are not liable for indirect, incidental, special, consequential or punitive loss, or for lost data, revenue, profit or goodwill, arising from your use of the service or from actions you take or do not take based on its guidance.</p>
        <p>To the extent the law allows, our total liability for all claims relating to the service is limited to the amount you paid us for it in the <Placeholder>12 months, to be confirmed by counsel</Placeholder> before the event giving rise to the claim.</p>
        <p>Nothing in these terms limits liability that cannot be limited by law, or rights you have that cannot be waived.</p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <>
        <Items items={[
          ['By you', 'You can stop using WorkCoPilot or cancel your subscription at any time. Cancellation follows the Refund and Cancellation page.'],
          ['By us', 'We may suspend or end access for a material breach of these terms or the Acceptable Use Policy, for non-payment, or where required by law. Where it is reasonable to do so, we will give notice first.'],
          ['What happens next', 'Your data is handled as set out in the Privacy Policy and the Data Processing Addendum, including deletion on request and under the retention settings for your account.'],
          ['What survives', 'Sections that by their nature should continue, such as ownership, disclaimers, limitation of liability and governing law, continue after termination.'],
        ]} />
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    content: (
      <>
        <p>These terms are governed by the laws of <Placeholder>governing-law state, to be confirmed with counsel</Placeholder>, without regard to its conflict-of-laws rules. Disputes will be brought in the courts of <Placeholder>venue, to be confirmed with counsel</Placeholder>, unless the law that applies to you requires otherwise.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    content: (
      <p>When these terms change, the &ldquo;Last updated&rdquo; date at the top changes with them. Where a change matters to your rights or obligations, we will say what changed in plain language and, for paid customers, give notice before it takes effect. Continuing to use the service after that means you accept the updated terms.</p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <>
        <Items items={[
          ['Legal, privacy and security', <a key="l" href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>],
          ['Product support and billing', <a key="s" href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>],
        ]} />
        <div className="wlx-note"><ShieldCheck size={14} aria-hidden="true" /><span><b>Honest framing.</b> This page is a template. It describes the intended terms and is not a substitute for your own legal review.</span></div>
      </>
    ),
  },
]

export default function WorkTerms() {
  return (
    <LegalPage
      icon={Gavel}
      eyebrow="Terms of Service"
      title="The terms for using WorkCoPilot"
      intro="These terms set out how you may use WorkCoPilot, what you can expect from us, and where responsibility sits. They are written to be read, and they point to the policies that go with them."
      lastUpdated={LAST_UPDATED}
      tagline="Plain-language terms, template draft"
      seo={{
        title: 'Terms of Service - WorkCoPilot by AdmireVeda',
        description: 'The plain-language terms for using WorkCoPilot: the read-only service, acceptable use, accounts, subscriptions and billing, ownership, warranties, liability and termination.',
        path: '/workcopilot/terms',
      }}
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Acceptable Use', to: '/workcopilot/acceptable-use', icon: FileText },
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Refund and Cancellation', to: '/workcopilot/refund', icon: FileText },
        { label: 'Data Processing Addendum', to: '/workcopilot/dpa', icon: ShieldCheck },
      ]}
    />
  )
}
