// Company-admin HELP areas for the newer console features, kept out of
// HelpCompany.jsx (thin wiring there): giving a member or project manager the
// Trainer grant (Team), and "API & webhooks" (keys with scopes, the show-once
// secret, rotate / revoke, webhooks and their deliveries). Each area is the
// shared HelpArea (heading, short numbered how-to, Open button) with annotated
// screenshots (numbered callouts over the real screen, AnnotatedShot.jsx).
// Which shots and callouts: helpSpecs.js COMPANY_HELP_SHOTS.
// Copy: helpCompany.trainer.* and helpCompany.developer.*.
import { GraduationCap, Code2 } from 'lucide-react'
import { HelpArea } from './_help.jsx'
import AnnotatedShot from '../../work/help/AnnotatedShot.jsx'
import { COMPANY_HELP_SHOTS, visibleShots, shotMarks } from '../../work/help/helpSpecs.js'
import { useT } from '../../../i18n/index.jsx'

// The area's annotated shots; copy under helpCompany.<area>.shots.<id>. Every
// viewer here is a company admin, so the role view is that of an admin.
const ADMIN_VIEW = { company: true, isCompanyAdmin: true }
function Shots({ t, area }) {
  const base = `helpCompany.${area}.shots`
  return (
    <div className="wkh-shots">
      {visibleShots(COMPANY_HELP_SHOTS[area], ADMIN_VIEW).map((s) => (
        <AnnotatedShot key={s.id} name={s.name} alt={t(`${base}.${s.id}.alt`)} caption={t(`${base}.${s.id}.caption`)}
          marks={shotMarks(s, ADMIN_VIEW, t, base)} />
      ))}
    </div>
  )
}

const steps = (t, area, ids) => ids.map((id) => ({ t: t(`helpCompany.${area}.steps.${id}.t`), d: t(`helpCompany.${area}.steps.${id}.d`) }))

export function HelpTrainerArea({ onOpen }) {
  const t = useT()
  return (
    <HelpArea id="trainer" icon={GraduationCap} title={t('helpCompany.trainer.title')} open={{ id: 'team', label: t('helpCompany.team.open') }} onOpen={onOpen}
      lead={t('helpCompany.trainer.lead')} steps={steps(t, 'trainer', ['open', 'tick', 'studio'])}>
      <Shots t={t} area="trainer" />
    </HelpArea>
  )
}

export function HelpDeveloperArea({ onOpen }) {
  const t = useT()
  return (
    <HelpArea id="developer" icon={Code2} title={t('helpCompany.developer.title')} open={{ id: 'developer', label: t('helpCompany.developer.open') }} onOpen={onOpen}
      lead={t('helpCompany.developer.lead')} steps={steps(t, 'developer', ['create', 'store', 'rotate', 'hooks'])}>
      <Shots t={t} area="developer" />
    </HelpArea>
  )
}
