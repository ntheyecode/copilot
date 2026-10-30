// Source attribution indicator: a small, tasteful chip shown when the guide
// grounded this step or answer in the user's/organization's OWN material (an
// uploaded reference document, the Company Brain, or a skill/playbook). The guide
// fills the `source` field (named once, server-side, as work.WORK_SOURCE_FIELD =
// 'source') with a short human label like "Your document: Runbook v3" or
// "Company Brain: Onboarding SOP"; we read that same property here. Honest and
// defensive: renders NOTHING when there is no source (general knowledge, or an
// older session without the field), so it never claims grounding falsely.
//
// A step from a company workflow (Wave 3 part B) carries the workflow as its
// source ("Title (v3)"); when it matches the session's own workflowRef the chip
// says so plainly ("Company workflow") instead of "Grounded in your documents".
// Styled by the console CSS in Guiding.jsx (.wc-source).
import { BookOpen, GraduationCap } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { isWorkflowSource } from './workflows/runWorkflowModel.js'

export default function SourceChip({ source, workflowRef = null }) {
  const t = useT()
  const label = String(source || '').trim()
  if (!label) return null
  const workflow = isWorkflowSource(label, workflowRef)
  return (
    <div className="wc-source" title={workflow ? t('guideConsole.source.workflowTip', { label }) : t('guideConsole.source.tip', { label })}>
      {workflow ? <GraduationCap size={11} strokeWidth={2.5} aria-hidden="true" /> : <BookOpen size={11} strokeWidth={2.5} aria-hidden="true" />}
      <span className="wc-source-k">{workflow ? t('guideConsole.source.workflow') : t('guideConsole.source.label')}</span>
      <span className="wc-source-src">{label}</span>
    </div>
  )
}
