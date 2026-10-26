// Superadmin HELP: the operator flow as a step strip, then one area per key
// screen (sign in, Overview, Companies, Users, Pricing, AI config) with short
// steps and the real screenshot. Content only. AI config is superadmin-only
// (model names and AI cost never show to a plain admin), so that area is
// rendered only for a superadmin. `onOpen(sectionId)` switches the console.
import React from 'react'
import { KeyRound, LayoutDashboard, Building2, Users, Tags, Cpu, Route } from 'lucide-react'
import { HELP_CSS, HelpFlow, HelpArea } from './_help.jsx'

export default function HelpSuper({ isSuperAdmin, onOpen }) {
  const flow = [
    { id: 'signin', label: 'Sign in' },
    { id: 'companies', label: 'Create a company' },
    { id: 'users', label: 'Set up its people' },
    { id: 'pricing', label: 'Set pricing' },
    ...(isSuperAdmin ? [{ id: 'ai', label: 'Configure AI' }] : []),
    { id: 'overview', label: 'Watch the overview' },
  ]
  return (
    <div className="wkh">
      <style>{HELP_CSS}</style>

      <div className="wka-panel">
        <div className="wkh-head"><h2><Route size={15} />The operator flow</h2></div>
        <p className="wkh-lead">From sign-in to a company that is live. Click a step to jump to it.</p>
        <div style={{ marginTop: 12 }}><HelpFlow steps={flow} /></div>
      </div>

      <HelpArea id="signin" icon={KeyRound} title="Sign in"
        lead="An AdmireVeda admin account opens this console."
        steps={[
          { t: 'Email & SSO tab', d: 'On the sign-in page, pick the Email & SSO tab.' },
          { t: 'Your admin account', d: 'Username and password, then the code if MFA is on.' },
          { t: 'Admin console', d: 'Open /work/admin. Company admins land in their own console.' },
        ]}
        shots={[{ src: '/help/user/sign-in.png', w: 1280, h: 820, alt: 'The WorkCoPilot sign-in page with the Social and Email & SSO tabs.', caption: 'Sign-in page. Admins use the Email & SSO tab.' }]} />

      <HelpArea id="overview" icon={LayoutDashboard} title="Overview" open={{ id: 'overview', label: 'Overview' }} onOpen={onOpen}
        lead="The product at a glance."
        steps={[
          { t: 'Users', d: 'Everyone on WorkCoPilot, split by tier.' },
          { t: 'Active now', d: 'Who is being guided in the last five minutes.' },
          { t: 'Sessions', d: 'Started today, and all time.' },
          { t: 'Platform AI', d: 'On or off. Off means users run their own keys.' },
        ]}
        shots={[{ src: '/help/super/overview.png', w: 1048, h: 420, alt: 'Admin Overview cards: users, active now, sessions today, total sessions, purchased hours and platform AI.', caption: 'Overview cards.' }]} />

      <HelpArea id="companies" icon={Building2} title="Companies" open={{ id: 'companies', label: 'Companies' }} onOpen={onOpen}
        lead="Every tenant, its admins, its people and its policy."
        steps={[
          { t: 'New company', d: 'Name, plan and licenses. Everything after is scoped to it.' },
          { t: 'Expand a row', d: 'Admins, users, SSO, AI source and redaction, all in one place.' },
          { t: 'Add its admin', d: 'The first company admin runs the rest from their own console.' },
        ]}
        shots={[{ src: '/help/super/companies.png', w: 1048, h: 295, alt: 'Companies: the list with the New company button and a company row showing users, admins, AI and redaction status.', caption: 'Companies, one row per tenant.' }]} />

      <HelpArea id="users" icon={Users} title="Users" open={{ id: 'users', label: 'Users' }} onOpen={onOpen}
        lead="Tiers, balances and granted hours for every user."
        steps={[
          { t: 'Search', d: 'By username.' },
          { t: 'Tier', d: 'Change it inline.' },
          { t: 'Company and role', d: 'Change moves a user into a company or sets their role.' },
          { t: 'Hours and access', d: 'Grant hours, or comp premium access for an individual.' },
        ]}
        shots={[{ src: '/help/super/users.png', w: 1048, h: 781, alt: 'Users table: tier selector, company and role with a Change button, free time left today, purchased balance and sessions.', caption: 'Users with inline tier and company controls.' }]} />

      <HelpArea id="pricing" icon={Tags} title="Pricing" open={{ id: 'pricing', label: 'Pricing' }} onOpen={onOpen}
        lead="What each tier costs and what it includes."
        steps={[
          { t: 'Edit', d: 'Opens every value for change.' },
          { t: 'Per tier', d: 'Monthly price, hours per day, tasks per day, re-plans, extra hour and image rates.' },
          { t: 'Save', d: 'Takes effect for new purchases right away.' },
        ]}
        shots={[{ src: '/help/super/pricing.png', w: 1048, h: 557, alt: 'Pricing: currency and the per-tier price, hours, tasks, re-plans, extra hour and image rates.', caption: 'Pricing record. Edit to change it.' }]} />

      {isSuperAdmin ? (
        <HelpArea id="ai" icon={Cpu} title="AI configuration" open={{ id: 'ai', label: 'AI config' }} onOpen={onOpen}
          lead="The platform AI that users run on when they have no key of their own."
          steps={[
            { t: 'Providers and keys', d: 'Add a provider key, test it, pick the chat and vision models.' },
            { t: 'Platform AI', d: 'Turn it on so users without a key are covered.' },
            { t: 'Web search', d: 'A search key for live web learning.' },
          ]}
          shots={[{ src: '/help/super/ai-keys.png', w: 1048, h: 929, alt: 'AI configuration: cost-effective models, AI providers and keys, and web search.', caption: 'AI providers, keys and models.' }]} />
      ) : null}
    </div>
  )
}
