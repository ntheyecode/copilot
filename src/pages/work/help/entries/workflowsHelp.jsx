// Help for Company workflows: every company member finds a published workflow
// on the dashboard and runs it, guided step by step, with the trainer's
// screenshot of what each screen should look like.
// What it shows: ../helpSpecs.js WORKFLOWS_SPEC.
import { BookOpenCheck } from 'lucide-react'
import HelpEntryBody from '../HelpEntryBody.jsx'
import { WORKFLOWS_SPEC } from '../helpSpecs.js'

export const WORKFLOWS_HELP = {
  id: 'dash-workflows', k: 'workflows', icon: BookOpenCheck, show: (v) => v.company,
  body: (v, t) => <HelpEntryBody k="workflows" spec={WORKFLOWS_SPEC} v={v} t={t} />,
}
