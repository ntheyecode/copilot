// WorkCoPilot - Data Processing Addendum, summary form (public TEMPLATE, being
// finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// States guarantees, not mechanisms: no AI provider or model name, no cost, no
// redaction internals, no internal module names. No "certified" / "compliant".
// Unknown specifics (transfer mechanism, notification window) are marked
// placeholders, never invented. Layout comes from the shared LegalPage component.
import React from 'react'
import { FileSignature, Users, Database, KeyRound, ShieldCheck, Lock, Gavel, Mail } from 'lucide-react'
import LegalPage, { Items, Placeholder, LEGAL_ENTITY, LEGAL_CONTACT } from '../components/LegalPage.jsx'

const LAST_UPDATED = '2026-10-23'

const GLANCE = [
  { icon: Users, tone: 'cyan', eyebrow: 'Roles', title: 'You control, we process', body: `For the content of your sessions, you are the controller and ${LEGAL_ENTITY} is the processor, acting on your instructions.` },
  { icon: KeyRound, tone: 'ok', eyebrow: 'Data boundary', title: 'Your own AI key stays with you', body: 'A company or user can run WorkCoPilot on their own AI key, which keeps the governed data inside their own provider boundary.' },
  { icon: Database, tone: 'amber', eyebrow: 'Retention', title: 'You set how long it is kept', body: 'Retention is configurable by the platform administrator or your company, and sessions can be deleted at any time.' },
]

const SECTIONS = [
  {
    id: 'scope',
    title: 'Scope and how to read this',
    content: (
      <>
        <p>This is a summary-form Data Processing Addendum for WorkCoPilot. It describes how we handle personal data on behalf of customers who use the service. It is meant to be read alongside the <a href="/workcopilot/terms">Terms of Service</a> and the <a href="/workcopilot/privacy">Privacy Policy</a>. A signed version for your organization is available on request (see the last section).</p>
      </>
    ),
  },
  {
    id: 'roles',
    title: 'Controller and processor roles',
    content: (
      <>
        <Items items={[
          ['Customer as controller', 'For the content of guided sessions (screen content, typed text, attached documents and the reports produced from them), the customer decides the purposes and means of processing and is the controller.'],
          ['COE Security LLC as processor', `${LEGAL_ENTITY} processes that content only to provide the service, on the customer's documented instructions, which are the Terms, this addendum, and the settings the customer and its administrators choose.`],
          ['Our own role', 'For account, sign-in and billing details that we need to run the relationship with you, we act as an independent controller, as described in the Privacy Policy.'],        ]} />
      </>
    ),
  },
  {
    id: 'data',
    title: 'Categories of data and purpose',
    content: (
      <>
        <Items items={[
          ['Account data', 'Names or email addresses and role details of the customer\'s users and administrators.'],
          ['Session content', 'What is on a user\'s screen and what they type or paste during a guided session, and text from attached documents. Sensitive values are stripped or tokenized on the user\'s device before anything is sent.'],
          ['Session records', 'Per-session reports and audit logs, and the user\'s session history.'],
          ['Usage data', 'Guided minutes and session counts, so a plan\'s allowance can be applied.'],
          ['Data subjects', 'The customer\'s employees, contractors and other authorized users, and any individuals whose data appears on screens the customer chooses to share, within the limits of the Acceptable Use Policy.'],
          ['Purpose', 'To provide, secure and support the guided-work service for the customer, and to apply the customer\'s plan and settings.'],
        ]} />
        <div className="wlx-note"><ShieldCheck size={14} /><span>Customers should not submit data they are not authorized to process. The Privacy Policy lists the data categories the service is designed for.</span></div>
      </>
    ),
  },
  {
    id: 'boundary',
    title: 'The data boundary and your own AI key',
    content: (
      <>
        <p>By default, guidance is produced by an AI provider using the platform&rsquo;s own arrangements. A company, or an individual user, can instead run WorkCoPilot on their own AI key. In that case the governed data is processed inside the customer&rsquo;s own provider relationship, is subject to that provider&rsquo;s terms, and is not silently rerouted elsewhere.</p>
        <p>The customer remains responsible for the terms and settings of any provider key it brings.</p>
      </>
    ),
  },
  {
    id: 'safeguards',
    title: 'Safeguards and security measures',
    content: (
      <>
        <Items items={[
          ['Protection before sending', 'Sensitive values such as personal data, health data, secrets and keys are stripped or tokenized on the user\'s device before anything is sent, and customers can add their own words and patterns. This is a safeguard that reduces what leaves the device; it does not replace the customer\'s own authorization and data-minimization duties.'],
          ['Read-only', 'The service never clicks, types or runs anything in the customer\'s systems.'],
          ['Encryption at rest', 'Stored keys, secrets and report artifacts are encrypted at rest with AES-256-GCM.'],
          ['Encryption in transit', 'Traffic between devices and the service is protected with TLS.'],
          ['Access controls', 'Role-based access. Company administrators set and lock the data policy for their members and review their own members\' sessions.'],
          ['Audit log', 'Each session has an audit log of what was transmitted, available to the user and, for company accounts, to their administrators.'],
          ['Evidence, not certification', 'These controls give customers evidence that supports their own compliance work. They do not make a customer compliant, and we do not claim a certification here.'],
        ]} />
      </>
    ),
  },
  {
    id: 'subprocessors',
    title: 'Sub-processors',
    content: (
      <>
        <p>The customer gives general authorization for the sub-processors needed to provide the service. Today these are:</p>
        <Items items={[
          ['AI processing', 'Guidance is produced by a major AI provider under that provider\'s own terms. Where the customer runs on its own key, that provider relationship is the customer\'s.'],
          ['Billing', 'Stripe handles payments and payment details.'],
          ['Infrastructure', 'Providers that host the service on our behalf.'],
        ]} />
        <p>We will keep a current list available on request and give customers notice of material changes to it, so they can raise a reasonable objection. We stay responsible for our sub-processors&rsquo; handling of customer data.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Retention and deletion',
    content: (
      <>
        <Items items={[
          ['Configurable', 'Retention is set by the platform administrator and, for company accounts, by the company. An automatic window can purge sessions older than a chosen number of days.'],
          ['On demand', 'A user or a company administrator can delete sessions at any time. Deleting a session removes it.'],
          ['Not kept', 'Uploaded source documents and raw screen frames are not kept as stored source material.'],
          ['On termination', 'On request after the agreement ends, we delete or return customer content, subject to any legal duty to keep a record.'],
        ]} />
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Assistance, incidents and audits',
    content: (
      <>
        <Items items={[
          ['Data subject requests', 'We will help the customer respond to access, correction, deletion and export requests, and will pass on a request we receive about customer content.'],
          ['Incident notice', <>We will tell the customer without undue delay after confirming a personal data incident affecting its content, within <Placeholder>notification window, to be confirmed with counsel</Placeholder>.</>],
          ['Evidence and audits', 'We will provide reasonable information about our controls so the customer can check this addendum is followed, using documentation and per-session audit logs first.'],
          ['Instructions', 'We will tell the customer if we believe an instruction would break the law that applies to us.'],
        ]} />
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    content: (
      <p>Where customer personal data is transferred across borders, the transfer mechanism will be <Placeholder>transfer mechanism and processing locations, to be confirmed with counsel</Placeholder>. We will not invent or imply a mechanism that has not been put in place.</p>
    ),
  },
  {
    id: 'request',
    title: 'Request a signed DPA',
    content: (
      <>
        <p>To receive a signed Data Processing Addendum for your organization, or to ask a security, privacy or legal question, write to <a href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>. Please include your company name, the contact who will sign, and any specific terms your legal team needs us to review.</p>
        <div className="wlx-note"><Mail size={14} /><span><b>Honest framing.</b> This page is a summary template. The signed addendum, once available, is the binding document.</span></div>
      </>
    ),
  },
]

export default function WorkDPA() {
  return (
    <LegalPage
      icon={FileSignature}
      eyebrow="Data Processing Addendum"
      title="How WorkCoPilot processes data for you"
      intro="A summary of who decides what, what data is involved, the safeguards in place, and how to get a signed addendum for your organization."
      lastUpdated={LAST_UPDATED}
      tagline="Summary form, template draft"
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Terms of Service', to: '/workcopilot/terms', icon: Gavel },
        { label: 'Security', to: '/workcopilot/security', icon: ShieldCheck },
      ]}
    />
  )
}
