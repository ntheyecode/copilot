// Company-admin HELP: the main admin flow as a step strip, then one area per key
// screen (sign in, Overview, Team, AI keys, Data governance incl. Security
// practice rules, Billing, Alerts) with short steps and the real screenshot.
// Content only; it changes nothing in the console. `onOpen(sectionId)` switches
// the console to that section from the "Open" button on each area.
import React from 'react'
import { KeyRound, LayoutDashboard, Users, Cpu, ShieldCheck, Receipt, ShieldAlert, Route } from 'lucide-react'
import { HELP_CSS, HelpFlow, HelpArea } from './_help.jsx'

const FLOW = [
  { id: 'signin', label: 'Sign in' },
  { id: 'overview', label: 'Confirm authorization' },
  { id: 'team', label: 'Add your people' },
  { id: 'ai', label: 'Choose your AI' },
  { id: 'governance', label: 'Set governance' },
  { id: 'billing', label: 'Check billing' },
]

export default function HelpCompany({ onOpen }) {
  return (
    <div className="wkh">
      <style>{HELP_CSS}</style>

      <div className="wka-panel">
        <div className="wkh-head"><h2><Route size={15} />The admin flow</h2></div>
        <p className="wkh-lead">Six steps from first sign-in to a company that is set up. Click a step to jump to it.</p>
        <div style={{ marginTop: 12 }}><HelpFlow steps={FLOW} /></div>
      </div>

      <HelpArea id="signin" icon={KeyRound} title="Sign in"
        lead="Your company admin account opens this console. Members land in the guide instead."
        steps={[
          { t: 'Email & SSO tab', d: 'On the sign-in page, pick the Email & SSO tab.' },
          { t: 'Your admin account', d: 'Username and password, then the code if MFA is on.' },
          { t: 'Company console', d: 'You arrive here. Members see their own dashboard.' },
        ]}
        shots={[{ src: '/help/user/sign-in.png', w: 1280, h: 820, alt: 'The WorkCoPilot sign-in page with the Social and Email & SSO tabs.', caption: 'Sign-in page. Admins use the Email & SSO tab.' }]} />

      <HelpArea id="overview" icon={LayoutDashboard} title="Overview" open={{ id: 'overview', label: 'Overview' }} onOpen={onOpen}
        lead="Your company at a glance, and the two things to do once."
        steps={[
          { t: 'Read the cards', d: 'Licenses, admin seats, the minute pool and guided sessions.' },
          { t: 'Confirm authorization', d: 'One click. It records who affirmed and when.' },
          { t: 'Set data retention', d: 'Edit, choose the days, Save retention. 0 keeps everything.' },
          { t: 'Back up the knowledge base', d: 'Download a JSON snapshot any time. Restore it later.' },
        ]}
        shots={[{ src: '/help/company/overview.png', w: 1048, h: 929, alt: 'Company admin Overview: license cards, the authorization confirmation, data retention and the knowledge base.', caption: 'Overview with the authorization card, retention and knowledge base.' }]} />

      <HelpArea id="team" icon={Users} title="Team" open={{ id: 'team', label: 'Team' }} onOpen={onOpen}
        lead="Add people, set their role and plan, and give them minutes."
        steps={[
          { t: 'Add person', d: 'By work email (SSO) or username and password. They get a set-password link.' },
          { t: 'Role and plan', d: 'Member, Executive or Company admin. Change either inline, any time.' },
          { t: 'Give minutes', d: 'The clock icon moves minutes from the company pool to one person.' },
          { t: 'Managed roster', d: 'When WorkCoPilot manages your licenses, adding or removing people goes through Support.' },
        ]}
        shots={[{ src: '/help/company/team.png', w: 1048, h: 468, alt: 'Team: the People table with role and plan selectors, usage today, extra minutes and 2FA status.', caption: 'People, with role and plan editable in place.' }]} />

      <HelpArea id="ai" icon={Cpu} title="AI keys" open={{ id: 'ai', label: 'AI keys' }} onOpen={onOpen}
        lead="Run on the platform AI, or on your own provider account."
        steps={[
          { t: 'Current AI', d: 'Platform AI by default. Nothing to set up.' },
          { t: 'Use your own keys', d: 'Pick the provider, paste the API key, Use my keys. Usage bills to your account.' },
          { t: 'Live web learning', d: 'Optional Tavily key so web research runs on your own key.' },
        ]}
        shots={[{ src: '/help/company/ai-keys.png', w: 1048, h: 717, alt: 'AI keys: the Current AI card, the Use your own keys form and the Live web learning key.', caption: 'Current AI, your own keys, and the web learning key.' }]} />

      <HelpArea id="governance" icon={ShieldCheck} title="Data governance" open={{ id: 'governance', label: 'Data governance' }} onOpen={onOpen}
        lead="What may leave a device, and the security practices every plan must follow."
        steps={[
          { t: 'Edit', d: 'Opens the saved policy. Pick frameworks to seed defaults.' },
          { t: 'Categories and words', d: 'Per category: send, mask, withhold or tokenize. Add words that never leave.' },
          { t: 'Security practice rules', d: 'Paste or upload your written policy, Extract rules, review each one. Add rules by hand too.' },
          { t: 'Arm and save', d: 'Tick Armed, Save policy. Rules apply on every call and cite your policy by name.' },
        ]}
        shots={[
          { src: '/help/company/governance.png', w: 1048, h: 682, alt: 'The saved data governance policy record with its status, mode, frameworks, rule counts and version.', caption: '1. The saved policy. Edit to change it.' },
          { src: '/help/company/governance-edit.png', w: 1048, h: 929, alt: 'The policy in Edit mode: compliance frameworks and what leaves the device by category.', caption: '2. Frameworks and per-category actions.' },
          { src: '/help/company/security-rules.png', w: 992, h: 653, alt: 'Security practice rules: paste a policy, Extract rules, and the extracted forbid and require rules with their citations.', caption: '3. Security practice rules, each citing your policy.' },
          { src: '/help/company/governance-save.png', w: 992, h: 227, alt: 'Mode and status: the handling mode, the Armed checkbox and Save policy.', caption: '4. Mode, Armed, Save policy.' },
        ]} />

      <HelpArea id="billing" icon={Receipt} title="Billing" open={{ id: 'billing', label: 'Billing' }} onOpen={onOpen}
        lead="Your statement, line by line."
        steps={[
          { t: 'Plan charges', d: 'Computed from the licenses you hold.' },
          { t: 'Extras', d: 'Items the WorkCoPilot team recorded on your account.' },
          { t: 'Change anything', d: 'Open a Support ticket to add licenses or change plans.' },
        ]}
        shots={[{ src: '/help/company/billing.png', w: 1048, h: 468, alt: 'Billing: the statement for the company with its charge lines.', caption: 'The statement.' }]} />

      <HelpArea id="alerts" icon={ShieldAlert} title="Security alerts" open={{ id: 'alerts', label: 'Alerts' }} onOpen={onOpen}
        lead="When sensitive data is redacted on a device, you hear about it. Never the values."
        steps={[
          { t: 'What you see', d: 'Who, where, and what kind of data was redacted.' },
          { t: 'Relay it', d: 'SOC / SIEM sends the same metadata to your own tools.' },
        ]}
        shots={[{ src: '/help/company/alerts.png', w: 1048, h: 322, alt: 'Security alerts list for the company.', caption: 'Alerts, newest first.' }]} />
    </div>
  )
}
