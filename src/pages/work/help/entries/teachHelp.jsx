// Help for the Teach studio (/work/teach): trainers and company admins
// (roleViewOf .showTeach). The wizard, recording (live demo with narration, call
// audio with consent, importing a recorded video), the step review with the
// suggestions read from each screenshot, and publish / revise / retire.
// What it shows: ../helpSpecs.js TEACH_SPEC.
import { GraduationCap } from 'lucide-react'
import HelpEntryBody from '../HelpEntryBody.jsx'
import { TEACH_SPEC } from '../helpSpecs.js'

export const TEACH_HELP = {
  id: 'dash-teach', k: 'teach', icon: GraduationCap, show: (v) => v.showTeach,
  body: (v, t) => <HelpEntryBody k="teach" spec={TEACH_SPEC} v={v} t={t} />,
}
