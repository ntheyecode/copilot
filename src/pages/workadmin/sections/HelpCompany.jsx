// Company-admin HELP: the main admin flow as a step strip, then one area per key
// screen (sign in, Overview, Team, Trainer grant, AI keys, Data governance incl.
// Security practice rules, Billing, Alerts, API & webhooks) with short steps and the real screenshot.
// Content only; it changes nothing in the console. `onOpen(sectionId)` switches
// the console to that section from the "Open" button on each area.
import React from 'react'
import { KeyRound, LayoutDashboard, Users, Cpu, ShieldCheck, Receipt, ShieldAlert, Route } from 'lucide-react'
import { HELP_CSS, HelpFlow, HelpArea } from './_help.jsx'
import { useT } from '../../../i18n/index.jsx'
// Newer areas (Trainer grant, API & webhooks) live in their own module and use
// annotated screenshots (numbered callouts over the real screen).
import { HelpTrainerArea, HelpDeveloperArea } from './HelpCompanyNewAreas.jsx'
import { ANNOTATED_SHOT_CSS } from '../../work/help/annotatedShot.css.js'

const FLOW_IDS = ['signin', 'overview', 'team', 'ai', 'governance', 'billing']

export default function HelpCompany({ onOpen }) {
  const t = useT()
  const FLOW = FLOW_IDS.map((id) => ({ id, label: t(`helpCompany.flow.${id}`) }))
  return (
    <div className="wkh">
      <style>{HELP_CSS}{ANNOTATED_SHOT_CSS}</style>

      <div className="wka-panel">
        <div className="wkh-head"><h2><Route size={15} />{t('helpCompany.panel.title')}</h2></div>
        <p className="wkh-lead">{t('helpCompany.panel.lead')}</p>
        <div style={{ marginTop: 12 }}><HelpFlow steps={FLOW} /></div>
      </div>

      <HelpArea id="signin" icon={KeyRound} title={t('helpCompany.signin.title')}
        lead={t('helpCompany.signin.lead')}
        steps={[
          { t: t('helpCompany.signin.steps.emailSso.t'), d: t('helpCompany.signin.steps.emailSso.d') },
          { t: t('helpCompany.signin.steps.account.t'), d: t('helpCompany.signin.steps.account.d') },
          { t: t('helpCompany.signin.steps.console.t'), d: t('helpCompany.signin.steps.console.d') },
        ]}
        shots={[{ src: '/help/user/sign-in.png', w: 1280, h: 820, alt: t('helpCompany.signin.shot.alt'), caption: t('helpCompany.signin.shot.caption') }]} />

      <HelpArea id="overview" icon={LayoutDashboard} title={t('helpCompany.overview.title')} open={{ id: 'overview', label: t('helpCompany.overview.open') }} onOpen={onOpen}
        lead={t('helpCompany.overview.lead')}
        steps={[
          { t: t('helpCompany.overview.steps.cards.t'), d: t('helpCompany.overview.steps.cards.d') },
          { t: t('helpCompany.overview.steps.authorize.t'), d: t('helpCompany.overview.steps.authorize.d') },
          { t: t('helpCompany.overview.steps.retention.t'), d: t('helpCompany.overview.steps.retention.d') },
          { t: t('helpCompany.overview.steps.backup.t'), d: t('helpCompany.overview.steps.backup.d') },
        ]}
        shots={[{ src: '/help/company/overview.png', w: 1048, h: 929, alt: t('helpCompany.overview.shot.alt'), caption: t('helpCompany.overview.shot.caption') }]} />

      <HelpArea id="team" icon={Users} title={t('helpCompany.team.title')} open={{ id: 'team', label: t('helpCompany.team.open') }} onOpen={onOpen}
        lead={t('helpCompany.team.lead')}
        steps={[
          { t: t('helpCompany.team.steps.add.t'), d: t('helpCompany.team.steps.add.d') },
          { t: t('helpCompany.team.steps.roleplan.t'), d: t('helpCompany.team.steps.roleplan.d') },
          { t: t('helpCompany.team.steps.minutes.t'), d: t('helpCompany.team.steps.minutes.d') },
          { t: t('helpCompany.team.steps.managed.t'), d: t('helpCompany.team.steps.managed.d') },
        ]}
        shots={[{ src: '/help/company/team.png', w: 1048, h: 468, alt: t('helpCompany.team.shot.alt'), caption: t('helpCompany.team.shot.caption') }]} />

      <HelpTrainerArea onOpen={onOpen} />

      <HelpArea id="ai" icon={Cpu} title={t('helpCompany.ai.title')} open={{ id: 'ai', label: t('helpCompany.ai.open') }} onOpen={onOpen}
        lead={t('helpCompany.ai.lead')}
        steps={[
          { t: t('helpCompany.ai.steps.current.t'), d: t('helpCompany.ai.steps.current.d') },
          { t: t('helpCompany.ai.steps.ownKeys.t'), d: t('helpCompany.ai.steps.ownKeys.d') },
          { t: t('helpCompany.ai.steps.webLearning.t'), d: t('helpCompany.ai.steps.webLearning.d') },
        ]}
        shots={[{ src: '/help/company/ai-keys.png', w: 1048, h: 717, alt: t('helpCompany.ai.shot.alt'), caption: t('helpCompany.ai.shot.caption') }]} />

      <HelpArea id="governance" icon={ShieldCheck} title={t('helpCompany.governance.title')} open={{ id: 'governance', label: t('helpCompany.governance.open') }} onOpen={onOpen}
        lead={t('helpCompany.governance.lead')}
        steps={[
          { t: t('helpCompany.governance.steps.edit.t'), d: t('helpCompany.governance.steps.edit.d') },
          { t: t('helpCompany.governance.steps.categories.t'), d: t('helpCompany.governance.steps.categories.d') },
          { t: t('helpCompany.governance.steps.rules.t'), d: t('helpCompany.governance.steps.rules.d') },
          { t: t('helpCompany.governance.steps.arm.t'), d: t('helpCompany.governance.steps.arm.d') },
        ]}
        shots={[
          { src: '/help/company/governance.png', w: 1048, h: 682, alt: t('helpCompany.governance.shots.saved.alt'), caption: t('helpCompany.governance.shots.saved.caption') },
          { src: '/help/company/governance-edit.png', w: 1048, h: 929, alt: t('helpCompany.governance.shots.edit.alt'), caption: t('helpCompany.governance.shots.edit.caption') },
          { src: '/help/company/security-rules.png', w: 992, h: 653, alt: t('helpCompany.governance.shots.rules.alt'), caption: t('helpCompany.governance.shots.rules.caption') },
          { src: '/help/company/governance-save.png', w: 992, h: 227, alt: t('helpCompany.governance.shots.save.alt'), caption: t('helpCompany.governance.shots.save.caption') },
        ]} />

      <HelpArea id="billing" icon={Receipt} title={t('helpCompany.billing.title')} open={{ id: 'billing', label: t('helpCompany.billing.open') }} onOpen={onOpen}
        lead={t('helpCompany.billing.lead')}
        steps={[
          { t: t('helpCompany.billing.steps.plan.t'), d: t('helpCompany.billing.steps.plan.d') },
          { t: t('helpCompany.billing.steps.extras.t'), d: t('helpCompany.billing.steps.extras.d') },
          { t: t('helpCompany.billing.steps.change.t'), d: t('helpCompany.billing.steps.change.d') },
        ]}
        shots={[{ src: '/help/company/billing.png', w: 1048, h: 468, alt: t('helpCompany.billing.shot.alt'), caption: t('helpCompany.billing.shot.caption') }]} />

      <HelpArea id="alerts" icon={ShieldAlert} title={t('helpCompany.alerts.title')} open={{ id: 'alerts', label: t('helpCompany.alerts.open') }} onOpen={onOpen}
        lead={t('helpCompany.alerts.lead')}
        steps={[
          { t: t('helpCompany.alerts.steps.see.t'), d: t('helpCompany.alerts.steps.see.d') },
          { t: t('helpCompany.alerts.steps.relay.t'), d: t('helpCompany.alerts.steps.relay.d') },
        ]}
        shots={[{ src: '/help/company/alerts.png', w: 1048, h: 322, alt: t('helpCompany.alerts.shot.alt'), caption: t('helpCompany.alerts.shot.caption') }]} />

      <HelpDeveloperArea onOpen={onOpen} />
    </div>
  )
}
