// Company-admin HELP area for the Company Brain: adding documents in the
// console (the promise, drop or choose, the per-file result, the curated
// list). The shared HelpArea (heading, short numbered how-to, Open button)
// with one annotated screenshot (numbered callouts over the real screen,
// AnnotatedShot.jsx). Which shot and callouts: helpSpecs.js
// COMPANY_HELP_SHOTS.brain. Copy: helpCompany.brain.*.
import { Brain } from 'lucide-react'
import { HelpArea } from './_help.jsx'
import AnnotatedShot from '../../work/help/AnnotatedShot.jsx'
import { COMPANY_HELP_SHOTS, visibleShots, shotMarks } from '../../work/help/helpSpecs.js'
import { useT } from '../../../i18n/index.jsx'

const ADMIN_VIEW = { company: true, isCompanyAdmin: true }
const STEP_IDS = ['open', 'add', 'read', 'curate']

export function HelpCompanyBrainArea({ onOpen }) {
  const t = useT()
  const base = 'helpCompany.brain.shots'
  return (
    <HelpArea id="brain" icon={Brain} title={t('helpCompany.brain.title')} open={{ id: 'brain', label: t('helpCompany.brain.open') }} onOpen={onOpen}
      lead={t('helpCompany.brain.lead')} steps={STEP_IDS.map((id) => ({ t: t(`helpCompany.brain.steps.${id}.t`), d: t(`helpCompany.brain.steps.${id}.d`) }))}>
      <div className="wkh-shots">
        {visibleShots(COMPANY_HELP_SHOTS.brain, ADMIN_VIEW).map((s) => (
          <AnnotatedShot key={s.id} name={s.name} alt={t(`${base}.${s.id}.alt`)} caption={t(`${base}.${s.id}.caption`)} marks={shotMarks(s, ADMIN_VIEW, t, base)} />
        ))}
      </div>
    </HelpArea>
  )
}
