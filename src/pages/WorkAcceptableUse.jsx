// WorkCoPilot - Acceptable Use Policy (public TEMPLATE, being finalized with counsel).
// HONESTY CONTRACT (owner-enforced): template only, flagged as such on the page.
// No invented specifics, no "certified" / "compliant", no AI model, provider, cost
// or build mechanism. Layout comes from the shared LegalPage component.
import React from 'react'
import { Ban, UserCheck, Hand, AlertTriangle, ShieldCheck, Gavel, Lock, FileText } from 'lucide-react'
import LegalPage, { Items, LEGAL_CONTACT, SUPPORT_CONTACT } from '../components/LegalPage.jsx'

const LAST_UPDATED = '2026-10-23'

const GLANCE = [
  { icon: UserCheck, tone: 'ok', eyebrow: 'Authorized', title: 'Only on what you may use', body: 'Use WorkCoPilot only on systems, accounts and data you are authorized to use, and keep your organization\'s approval in place.' },
  { icon: Hand, tone: 'cyan', eyebrow: 'Responsible', title: 'You answer for what you share', body: 'You are responsible for the authorization to use the screens and data you put in front of WorkCoPilot.' },
  { icon: Ban, tone: 'amber', eyebrow: 'Prohibited', title: 'No unlawful or harmful work', body: 'Do not use it to break the law, to harm others, or to get around controls you are not allowed to get around.' },
]

const SECTIONS = [
  {
    id: 'purpose',
    title: 'Purpose of this policy',
    content: (
      <>
        <p>This policy explains what you may and may not do with WorkCoPilot. It is part of the <a href="/workcopilot/terms">Terms of Service</a>. WorkCoPilot guides you through work on your own screen, so the most important rule is simple: use it lawfully, and only where you are authorized.</p>
      </>
    ),
  },
  {
    id: 'authorized',
    title: 'Lawful and authorized use only',
    content: (
      <>
        <Items items={[
          ['Lawful', 'Use WorkCoPilot only for lawful purposes and in line with the laws and regulations that apply to you and your organization.'],
          ['Authorized', 'Use it only on systems, applications, accounts and data that you, or your organization, are authorized to access and to use with a tool like this.'],
          ['Your employer\'s rules', 'Follow your employer\'s and your customers\' policies, and the terms of the tools you are working in. If a policy forbids using an assistant on a system, do not use it there.'],
          ['Organization authorization', 'For company accounts, a company administrator confirms in the product that the organization authorizes WorkCoPilot use on its systems. We record who confirmed it and when, as evidence. That confirmation does not replace the responsibility of each user described below.'],
        ]} />
      </>
    ),
  },
  {
    id: 'responsibility',
    title: 'You are responsible for authorization',
    content: (
      <>
        <p>You are responsible for making sure you are permitted to share what is on your screen, and what you type or attach, with the service. Browser or device access to a system does not by itself mean you are authorized to use that system with an assistant.</p>
        <Items items={[
          ['Systems you share', 'Before sharing a screen, confirm you have the right to use that system and to show its content to the service.'],
          ['Other people\'s data', 'Do not submit data about other people, or data belonging to a third party, unless you are authorized to process it. The Privacy Policy describes the data categories WorkCoPilot is designed for.'],
          ['Your members', 'Company administrators are responsible for the people they add, and for the data policy they set and lock for their members.'],
          ['Choosing when to share', 'You choose when to share your screen and which display. Do not share a display that holds material you are not authorized to process.'],
        ]} />
      </>
    ),
  },
  {
    id: 'prohibited',
    title: 'Prohibited uses',
    content: (
      <>
        <p>You must not use WorkCoPilot to:</p>
        <Items items={[
          ['Break the law', 'Do anything unlawful, or help someone else do so.'],
          ['Access without permission', 'Gain, or try to gain, access to a system, account or data that you are not authorized to access, or work around a security control you are not permitted to work around.'],
          ['Cause harm', 'Create or spread malware, run attacks or intrusions, commit fraud, harass, defraud or deceive others, or carry out other harmful or abusive work.'],
          ['Process what you may not', 'Submit data that you are not authorized to process, or that the law or a contract forbids you from sharing.'],
          ['Misuse the service', 'Probe, overload or disrupt the service; attempt to bypass limits, plan allowances or protections; share your sign-in with others; or resell the service.'],
          ['Misrepresent', 'Present guidance as professional advice from us, or misstate who you are or what you are authorized to do.'],
          ['Copy or reverse engineer', 'Copy the service, extract its internals, or build a competing service from it, except where the law does not allow us to restrict that.'],
        ]} />
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security testing and sensitive work',
    content: (
      <>
        <p>If your work involves security testing, regulated data, safety-critical systems or similar sensitive activity, you must have written authorization from the owner of the systems involved and you must stay within its scope. WorkCoPilot guides you on your screen. It does not act for you, and it does not make an unauthorized action authorized.</p>
        <p>Where a suggested step could delete, overwrite, pay, send or otherwise be hard to undo, WorkCoPilot flags it so you can confirm it deliberately. The decision, and the responsibility for it, stay with you.</p>
      </>
    ),
  },
  {
    id: 'enforcement',
    title: 'Enforcement',
    content: (
      <>
        <p>If use breaks this policy, puts the service or other customers at risk, or is required by law, we may warn, limit, suspend or end access. Where it is reasonable to do so, we will tell you first and say why. We may also preserve and share information where the law requires it.</p>
        <p>Company administrators can review their own members&rsquo; sessions and reports, and can end a member&rsquo;s access, as described in the Privacy Policy.</p>
      </>
    ),
  },
  {
    id: 'report',
    title: 'Reporting a concern',
    content: (
      <>
        <p>If you think the service is being misused, or you found a security problem, write to <a href={'mailto:' + LEGAL_CONTACT}>{LEGAL_CONTACT}</a>. For product help, write to <a href={'mailto:' + SUPPORT_CONTACT}>{SUPPORT_CONTACT}</a>.</p>
        <div className="wlx-note"><AlertTriangle size={14} /><span><b>Honest framing.</b> This page is a template. It states the rules we intend to apply and is not a substitute for your own legal review.</span></div>
      </>
    ),
  },
]

export default function WorkAcceptableUse() {
  return (
    <LegalPage
      icon={ShieldCheck}
      eyebrow="Acceptable Use Policy"
      title="Using WorkCoPilot the right way"
      intro="WorkCoPilot guides you on your own screen. This policy says where it may be used, what you are responsible for, and what is off limits."
      lastUpdated={LAST_UPDATED}
      tagline="Plain-language policy, template draft"
      glance={GLANCE}
      sections={SECTIONS}
      links={[
        { label: 'Terms of Service', to: '/workcopilot/terms', icon: Gavel },
        { label: 'Privacy Policy', to: '/workcopilot/privacy', icon: Lock },
        { label: 'Disclaimer', to: '/workcopilot/disclaimer', icon: FileText },
      ]}
    />
  )
}
