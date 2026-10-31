// Help for the executive dashboard (/work/exec): its project and people
// drill-downs (executives and company admins, roleViewOf .showExec) and the
// Company Brain export with its passphrase (executives only). No AI model or
// cost is shown. What it shows: ../helpSpecs.js EXEC_SPEC.
import { BarChart3 } from 'lucide-react'
import HelpEntryBody from '../HelpEntryBody.jsx'
import { EXEC_SPEC } from '../helpSpecs.js'

export const EXEC_HELP = {
  id: 'dash-exec', k: 'exec', icon: BarChart3, show: (v) => v.showExec,
  body: (v, t) => <HelpEntryBody k="exec" spec={EXEC_SPEC} v={v} t={t} />,
}
