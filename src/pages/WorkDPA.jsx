// WorkCoPilot - Data Processing Addendum, summary form (public TEMPLATE, being
// finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// States guarantees, not mechanisms: no AI provider or model name, no cost, no
// redaction internals, no internal module names. No "certified" / "compliant".
// Unknown specifics (transfer mechanism, notification window) are marked
// placeholders, never invented. Layout comes from the shared LegalPage component.
import React from 'react'
import { FileSignature, Users, Database, KeyRound, ShieldCheck, Lock, Gavel, Mail } from 'lucide-react'
import LegalPage, { Items, Placeholder, DataTable, LEGAL_ENTITY, LEGAL_CONTACT } from '../components/LegalPage.jsx'

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
          ['Generalized learnings', 'To keep guidance current, generalized, de-identified learnings about how a tool or task currently works (for example, that a setting has moved to a new menu) may be retained. They contain no personal data, secrets, screen images or document content. For a company, they are held in that company\'s own knowledge base and used only for that company\'s members; for individual users, they are held in the platform knowledge base to improve the service.'],
          ['Data subjects', 'The customer\'s employees, contractors and other authorized users, and any individuals whose data appears on screens the customer chooses to share, within the limits of the Acceptable Use Policy.'],
          ['Purpose', 'To provide, secure and support the guided-work service for the customer, and to apply the customer\'s plan and settings.'],
        ]} />
        <div className="wlx-note"><ShieldCheck size={14} aria-hidden="true" /><span>Customers should not submit data they are not authorized to process. The Privacy Policy lists the data categories the service is designed for.</span></div>
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
    // DAT-03: the public data lifecycle, one row per data type. Every cell states
    // what the product does today (on-device redaction before send, configurable
    // retention, deletion of a session removes its report, screenshots and audit
    // log together, keys encrypted at rest). Nothing here is a guarantee of
    // compliance, and nothing names the AI provider, model or mechanism.
    id: 'lifecycle',
    title: 'Data lifecycle',
    content: (
      <>
        <p>This table follows each kind of data from the moment it appears to the moment it is gone: where it is held, how long it stays, and what removes it.</p>
        <DataTable
          caption="Data lifecycle by data type: where it is stored, how long it is kept, and how it is deleted"
          columns={['Data type', 'Where it is stored', 'Retention', 'Deletion']}
          rows={[
            [
              'Screen frames',
              'Read on the user’s device. Any line holding a sensitive value is blacked out on the device, then a reduced-size frame is sent to guide the current step. Raw frames are not kept as stored source material.',
              'Not retained. A frame is used for the step it belongs to and then discarded. Redacted milestone screenshots, if enabled, live inside the session report and follow its retention.',
              'Nothing to delete for raw frames. Milestone screenshots are removed with the session report.',
            ],
            [
              'Prompts and typed or pasted text',
              'Sensitive values are replaced by tokens on the device before anything is sent. The real values stay on the device, and the answer is rebuilt there. The governed text is recorded in the session’s audit log as what was transmitted.',
              'Kept with the session: until the user or an administrator deletes it, or until the configured automatic retention window purges it.',
              'Removed when the session is deleted.',
            ],
            [
              'Session report',
              'Stored by the service, one per session. Report artifacts, including redacted milestone screenshots, are encrypted at rest with AES-256-GCM.',
              'Configurable. By default a session stays until the user or an administrator deletes it; an automatic window can purge sessions older than a chosen number of days.',
              'Deleting a session removes the report, its milestone screenshots and its audit log together, in one action.',
            ],
            [
              'Keys and secrets',
              'AI keys a customer brings and the service’s own stored keys and secrets are encrypted at rest with AES-256-GCM. Secrets detected in screens or text are stripped on the device and are never sent or stored by us.',
              'A configured key is kept for as long as it is in use.',
              'Removed when the customer removes or replaces the key, or when the account is deleted.',
            ],
            [
              'Audit log',
              'Stored with its session. It records what was transmitted during the session, so the user and, for company accounts, their administrators can see exactly what left the device.',
              'Same as the session it belongs to: until deleted, or until the configured automatic window purges the session.',
              'Removed with the session. Deleting a session removes its audit log along with the report and screenshots.',
            ],
            [
              'Generalized learnings',
              'Company accounts: in that company\'s own knowledge base, used only for its members. Individual accounts: in the platform knowledge base. They hold generalized, de-identified facts about how tools and tasks currently work, and no personal data, secrets, screen images or document content.',
              'Kept while they remain useful to guidance, and replaced as tools change. They are not session content, so deleting a session does not affect them.',
              'A company\'s knowledge base is removed with the company account. To have it cleared earlier, write to the contact below.',
            ],
            [
              'Account and billing details',
              'Account details are held by the service. Payment details are entered with and held by Stripe, not by us.',
              'For the life of the account, and afterwards only as long as a legal duty to keep a record requires.',
              'Deleted on request after the account ends, subject to that legal duty.',
            ],
          ]}
        />
        <div className="wlx-note"><Database size={14} aria-hidden="true" /><span><b>What this is.</b> A description of how the product handles data today. Where something is under the customer&rsquo;s control, such as the retention window or milestone screenshots, the customer&rsquo;s own settings decide.</span></div>
      </>
    ),
  },
  {
    // DAT-05: public sub-processor categories. The AI provider is described by
    // category only (business rule: never name the provider or model); Stripe is
    // named as the payment processor, as elsewhere on the site.
    id: 'subprocessors',
    title: 'Sub-processors',
    content: (
      <>
        <p>The customer gives general authorization for the sub-processors needed to provide the service. Today these are:</p>
        <Items items={[
          ['AI processing', 'Guidance is produced by a major AI provider under that provider\'s own terms. Only governed content, with sensitive values already stripped or tokenized on the device, reaches it. Where the customer runs on its own key, that provider relationship is the customer\'s and sits outside this list.'],
          ['Payments', 'Stripe processes payments and holds payment details. We do not receive card numbers.'],
          ['Hosting', 'The cloud hosting provider that runs the service and stores session records on our behalf.'],
        ]} />
        <p>The current list, with the entity names and the role each one plays, is available on request. We give customers notice of material changes to it, so they can raise a reasonable objection, and we stay responsible for our sub-processors&rsquo; handling of customer data.</p>
        <div className="wlx-note"><Mail size={14} aria-hidden="true" /><span><b>Ask for the list.</b> To receive the current sub-processor list, or a signed Data Processing Addendum for your organization, write to <a href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>.</span></div>
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
          ['On demand', 'A user or a company administrator can delete sessions at any time. Deleting a session removes the session record, its milestone screenshots and its audit log together.'],
          ['Not kept', 'Uploaded source documents and raw screen frames are not kept as stored source material.'],
          ['Learnings', 'Generalized, de-identified learnings about how tools work are not session content and are not removed by deleting a session. A company\'s knowledge base is removed with the company account, or earlier on request.'],
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
        <div className="wlx-note"><Mail size={14} aria-hidden="true" /><span><b>Honest framing.</b> This page is a summary template. The signed addendum, once available, is the binding document.</span></div>
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
      seo={{
        title: 'Data Processing Addendum - WorkCoPilot by AdmireVeda',
        description: 'WorkCoPilot DPA summary: controller and processor roles, data categories, the full data lifecycle by data type, safeguards, sub-processors, retention and deletion, and how to request a signed DPA.',
        path: '/workcopilot/dpa',
      }}
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
