// Superadmin HELP: the operator flow as a step strip, then one area per key
// screen (sign in, Overview, Companies, Users, Pricing, AI config) with short
// steps and the real screenshot. Content only. AI config is superadmin-only
// (model names and AI cost never show to a plain admin), so that area is
// rendered only for a superadmin. `onOpen(sectionId)` switches the console.
import React from 'react'
import { KeyRound, LayoutDashboard, Building2, Users, Tags, Cpu, Route } from 'lucide-react'
import { HELP_CSS, HelpFlow, HelpArea } from './_help.jsx'
import { useT } from '../../../i18n/index.jsx'

export default function HelpSuper({ isSuperAdmin, onOpen }) {
  const t = useT()
  const flowIds = [
    'signin',
    'companies',
    'users',
    'pricing',
    ...(isSuperAdmin ? ['ai'] : []),
    'overview',
  ]
  const flow = flowIds.map((id) => ({ id, label: t(`helpSuper.flow.${id}`) }))
  return (
    <div className="wkh">
      <style>{HELP_CSS}</style>

      <div className="wka-panel">
        <div className="wkh-head"><h2><Route size={15} />{t('helpSuper.panel.title')}</h2></div>
        <p className="wkh-lead">{t('helpSuper.panel.lead')}</p>
        <div style={{ marginTop: 12 }}><HelpFlow steps={flow} /></div>
      </div>

      <HelpArea id="signin" icon={KeyRound} title={t('helpSuper.signin.title')}
        lead={t('helpSuper.signin.lead')}
        steps={[
          { t: t('helpSuper.signin.steps.emailSso.t'), d: t('helpSuper.signin.steps.emailSso.d') },
          { t: t('helpSuper.signin.steps.account.t'), d: t('helpSuper.signin.steps.account.d') },
          { t: t('helpSuper.signin.steps.console.t'), d: t('helpSuper.signin.steps.console.d') },
        ]}
        shots={[{ src: '/help/user/sign-in.png', w: 1280, h: 820, alt: t('helpSuper.signin.shot.alt'), caption: t('helpSuper.signin.shot.caption') }]} />

      <HelpArea id="overview" icon={LayoutDashboard} title={t('helpSuper.overview.title')} open={{ id: 'overview', label: t('helpSuper.overview.open') }} onOpen={onOpen}
        lead={t('helpSuper.overview.lead')}
        steps={[
          { t: t('helpSuper.overview.steps.users.t'), d: t('helpSuper.overview.steps.users.d') },
          { t: t('helpSuper.overview.steps.active.t'), d: t('helpSuper.overview.steps.active.d') },
          { t: t('helpSuper.overview.steps.sessions.t'), d: t('helpSuper.overview.steps.sessions.d') },
          { t: t('helpSuper.overview.steps.platformAi.t'), d: t('helpSuper.overview.steps.platformAi.d') },
        ]}
        shots={[{ src: '/help/super/overview.png', w: 1048, h: 420, alt: t('helpSuper.overview.shot.alt'), caption: t('helpSuper.overview.shot.caption') }]} />

      <HelpArea id="companies" icon={Building2} title={t('helpSuper.companies.title')} open={{ id: 'companies', label: t('helpSuper.companies.open') }} onOpen={onOpen}
        lead={t('helpSuper.companies.lead')}
        steps={[
          { t: t('helpSuper.companies.steps.new.t'), d: t('helpSuper.companies.steps.new.d') },
          { t: t('helpSuper.companies.steps.expand.t'), d: t('helpSuper.companies.steps.expand.d') },
          { t: t('helpSuper.companies.steps.admin.t'), d: t('helpSuper.companies.steps.admin.d') },
        ]}
        shots={[{ src: '/help/super/companies.png', w: 1048, h: 295, alt: t('helpSuper.companies.shot.alt'), caption: t('helpSuper.companies.shot.caption') }]} />

      <HelpArea id="users" icon={Users} title={t('helpSuper.users.title')} open={{ id: 'users', label: t('helpSuper.users.open') }} onOpen={onOpen}
        lead={t('helpSuper.users.lead')}
        steps={[
          { t: t('helpSuper.users.steps.search.t'), d: t('helpSuper.users.steps.search.d') },
          { t: t('helpSuper.users.steps.tier.t'), d: t('helpSuper.users.steps.tier.d') },
          { t: t('helpSuper.users.steps.companyRole.t'), d: t('helpSuper.users.steps.companyRole.d') },
          { t: t('helpSuper.users.steps.hours.t'), d: t('helpSuper.users.steps.hours.d') },
        ]}
        shots={[{ src: '/help/super/users.png', w: 1048, h: 781, alt: t('helpSuper.users.shot.alt'), caption: t('helpSuper.users.shot.caption') }]} />

      <HelpArea id="pricing" icon={Tags} title={t('helpSuper.pricing.title')} open={{ id: 'pricing', label: t('helpSuper.pricing.open') }} onOpen={onOpen}
        lead={t('helpSuper.pricing.lead')}
        steps={[
          { t: t('helpSuper.pricing.steps.edit.t'), d: t('helpSuper.pricing.steps.edit.d') },
          { t: t('helpSuper.pricing.steps.perTier.t'), d: t('helpSuper.pricing.steps.perTier.d') },
          { t: t('helpSuper.pricing.steps.save.t'), d: t('helpSuper.pricing.steps.save.d') },
        ]}
        shots={[{ src: '/help/super/pricing.png', w: 1048, h: 557, alt: t('helpSuper.pricing.shot.alt'), caption: t('helpSuper.pricing.shot.caption') }]} />

      {isSuperAdmin ? (
        <HelpArea id="ai" icon={Cpu} title={t('helpSuper.ai.title')} open={{ id: 'ai', label: t('helpSuper.ai.open') }} onOpen={onOpen}
          lead={t('helpSuper.ai.lead')}
          steps={[
            { t: t('helpSuper.ai.steps.providers.t'), d: t('helpSuper.ai.steps.providers.d') },
            { t: t('helpSuper.ai.steps.platformAi.t'), d: t('helpSuper.ai.steps.platformAi.d') },
            { t: t('helpSuper.ai.steps.webSearch.t'), d: t('helpSuper.ai.steps.webSearch.d') },
          ]}
          shots={[{ src: '/help/super/ai-keys.png', w: 1048, h: 929, alt: t('helpSuper.ai.shot.alt'), caption: t('helpSuper.ai.shot.caption') }]} />
      ) : null}
    </div>
  )
}
