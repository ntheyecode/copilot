// Help for Workflow issues (/work/workflow-issues): trainers, PMs, Sr PMs, GRC,
// company admins and executives receive them (roleViewOf .showIncidents); only
// trainers, PMs, Sr PMs and company admins act on them (.canManageIncidents).
// What it shows, per role: ../helpSpecs.js ISSUES_SPEC.
import { Signpost } from 'lucide-react'
import HelpEntryBody from '../HelpEntryBody.jsx'
import { ISSUES_SPEC } from '../helpSpecs.js'

export const ISSUES_HELP = {
  id: 'dash-issues', k: 'issues', icon: Signpost, show: (v) => v.showIncidents,
  body: (v, t) => <HelpEntryBody k="issues" spec={ISSUES_SPEC} v={v} t={t} />,
}
