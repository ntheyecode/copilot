import { Check, CheckCircle2, ArrowRight } from 'lucide-react'
import RichText from '../../components/RichText.jsx'
import { StepLink, CmdBlock, CodeBlock } from '../../components/StepBlocks.jsx'
import DestructiveGate from './DestructiveGate.jsx'
import StepShot from './StepShot.jsx'
import { useT } from '../../i18n/index.jsx'

// THE STEP CARD: the current micro-step, front and center, in the same clean
// card style as the task-planning wizard. One thing to do (the live guidance,
// or the plan step before the first read), the quieter plan line when the two
// differ, the "done when" check beneath, the step's link / exact commands /
// code (copy-ready), then ONE primary action. Key control names and literal
// values in the text are bold + highlighted by RichText; values are one-tap
// copy chips. Shared by the console and the floating panel; styled by
// guideView.css.js (.gv-step). `extra` slots host-specific bits (the How?
// drill-down, the source chip) above the action row; a step from a company
// workflow also shows its screenshot (StepShot) under the done check; `notice` is the calm
// inline result strip (the optional verify verdict) directly above the
// actions, and `doneReady` softly rings the primary Mark done when that
// verdict says the step looks done (the shortcut is the button itself).
export default function StepCard({
  step, index, total, guidance, confirmN = 0, hint, onDone, doneLabel = 'Mark done', busy = false, extra, actions, notice, doneReady = false,
}) {
  const t = useT()
  if (!step) return null
  const g = String(guidance || '').trim()
  const txt = String(step.text || '').trim()
  const headline = g || txt
  const showPlanLine = !!(g && txt && g !== txt)
  const n = Number.isInteger(index) ? index + 1 : null
  return (
    <section className="gv-step" aria-labelledby={`gv-step-h-${n || 0}`}>
      <div className="gv-step-top">
        {n != null && <span className="gv-step-n"><ArrowRight size={11} strokeWidth={2.8} aria-hidden="true" /> Step {n}{total ? ` of ${total}` : ''}</span>}
        {confirmN > 0 && <span className="gv-confirm" role="status"><Check size={11} strokeWidth={3} aria-hidden="true" /> Step {confirmN} confirmed</span>}
        {hint}
      </div>
      <h2 id={`gv-step-h-${n || 0}`} className="gv-step-text" style={{ margin: 0 }}><RichText text={headline} accent="var(--gv-accent)" /></h2>
      {showPlanLine && <div className="gv-step-plan"><span className="gv-k">{t('stepCard.plan')}</span><span><RichText text={txt} accent="var(--gv-accent)" /></span></div>}
      {step.validate && (
        <div className="gv-step-when">
          <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden="true" />
          <span><b>{t('stepCard.doneWhen')}</b> <RichText text={step.validate} accent="var(--gv-accent)" /></span>
        </div>
      )}
      {step.shot && <StepShot key={`${n || 0}:${step.shot}`} id={`gv-shot-${n || 0}`} shot={step.shot} />}
      {step.url && <StepLink url={step.url} />}
      {((step.commands && step.commands.length > 0) || (step.code && step.code.content)) && (
        <DestructiveGate why={step.destructive ? step.destructiveWhy : null}>
          {step.commands && step.commands.length > 0 && <CmdBlock lines={step.commands} />}
          {step.code && step.code.content && <CodeBlock file={step.code.file} content={step.code.content} />}
        </DestructiveGate>
      )}
      {extra}
      {notice}
      <div className="gv-step-actions">
        {onDone && <button type="button" className={`gv-btn primary${doneReady ? ' is-ready' : ''}`} onClick={onDone} disabled={busy} title={t('stepCard.markDoneTip')}><Check size={16} strokeWidth={2.6} aria-hidden="true" /> {doneLabel}</button>}
        {actions}
      </div>
    </section>
  )
}
