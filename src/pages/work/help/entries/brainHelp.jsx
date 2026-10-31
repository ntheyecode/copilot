// Help for "Your brain" (/work/brain): a personal account teaches its own
// guide with documents; only the learnings are kept. Shown to personal
// accounts only (company members have the company brain). What it shows:
// ../helpSpecs.js BRAIN_SPEC.
import { Brain } from 'lucide-react'
import HelpEntryBody from '../HelpEntryBody.jsx'
import { BRAIN_SPEC } from '../helpSpecs.js'

export const BRAIN_HELP = {
  id: 'dash-brain', k: 'brain', icon: Brain, show: (v) => !v.company,
  body: (v, t) => <HelpEntryBody k="brain" spec={BRAIN_SPEC} v={v} t={t} />,
}
