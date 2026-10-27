import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, ArrowRight, MessageCircleQuestion, ListChecks, LifeBuoy } from 'lucide-react'
import RichText from '../../components/RichText.jsx'
import { ASK_OFFER, ASK_ASKING, ASK_ANSWERED, ASK_RESUMING, STUCK_DEFAULT_QUESTION } from './askFlow.js'

// The FOCUS SCREENS: exactly one of them owns the view while the step card is
// hidden (one screen at a time, hide and show with a fade):
//   offer     the proactive "Stuck? Any issues?" card: a gentle offer with a
//             short box, "Explain this step again" (no typing needed) and
//             "I am fine, keep going"
//   asking    a short, calm "working" moment
//   answered  the focused answer or clearer explanation, then ONE primary
//             action (Continue) that ropes the user back into guiding, plus a
//             follow-up. When the plan changed it says so and names the step.
// Shared by the console and the floater; styled by guideView.css.js (.gv-ask).
// Pure presentation: state lives in askFlow.js.
//
//   ask          the askFlow state
//   steps        the plan as it will be after Continue (names the resume step)
//   stepText     the current step's text (quoted on the offer card)
//   onAsk(q)     send a question (offer card submit / explain again)
//   onDismiss    "I am fine": back to the step, snoozed
//   onContinue   resume guiding
//   onFollowUp   focus the ask box for another question
//   renderAnswer optional (text) => node for a host with a richer renderer
export default function AskFocus({ ask, steps, stepText, onAsk, onDismiss, onContinue, onFollowUp, renderAnswer, busy = false }) {
  const continueRef = useRef(null)
  const boxRef = useRef(null)
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (ask.phase === ASK_ANSWERED) { try { continueRef.current && continueRef.current.focus({ preventScroll: true }) } catch { /* ignore */ } }
    if (ask.phase === ASK_OFFER) { setDraft(''); try { boxRef.current && boxRef.current.focus({ preventScroll: true }) } catch { /* ignore */ } }
  }, [ask.phase])

  if (ask.phase === ASK_OFFER) {
    const send = (q) => { if (onAsk) onAsk(String(q || '').trim() || STUCK_DEFAULT_QUESTION) }
    return (
      <div className="gv-ask">
        <section className="gv-ask-card gv-offer" aria-labelledby="gv-offer-h" role="dialog">
          <span className="gv-k" style={{ color: 'var(--gv-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><LifeBuoy size={12} aria-hidden="true" /> A quick check-in</span>
          <h2 id="gv-offer-h" className="gv-offer-h">Stuck? Any issues?</h2>
          <p className="gv-offer-p">This step has been open for a while{stepText ? <>: <b><RichText text={stepText} accent="var(--gv-accent)" chips={false} /></b></> : '.'} Tell me what is in the way, or I can explain it another way.</p>
          <form className="gv-offer-form" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
            <input ref={boxRef} className="gv-offer-input" type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="For example: the Verify button is grey" aria-label="What is in the way" disabled={busy} />
            <button type="submit" className="gv-btn primary" disabled={busy}><ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" /> {draft.trim() ? 'Send' : 'Explain this step again'}</button>
          </form>
          <div className="gv-ask-actions" style={{ marginTop: 10 }}>
            <button type="button" className="gv-btn ghost" onClick={onDismiss} disabled={busy}>I am fine, keep going</button>
          </div>
        </section>
      </div>
    )
  }
  if (ask.phase === ASK_ASKING) {
    return (
      <div className="gv-ask" aria-live="polite">
        <div className="gv-ask-working" role="status">
          <Loader2 size={20} className="gv-spin" style={{ color: 'var(--gv-accent)' }} aria-hidden="true" />
          <div className="gv-ask-working-t">{ask.kind === 'research' ? 'Looking this up' : ask.kind === 'analyze' ? 'Reading your screen' : ask.kind === 'stuck' ? 'Taking a closer look at this step' : 'Working on your question'}</div>
          {ask.question && ask.kind !== 'stuck' && <div className="gv-ask-working-q">{ask.question}</div>}
        </div>
      </div>
    )
  }
  if (ask.phase !== ASK_ANSWERED && ask.phase !== ASK_RESUMING) return null
  const list = Array.isArray(steps) ? steps : []
  const at = Number.isInteger(ask.resumeAt) ? ask.resumeAt : null
  const resumeStep = at != null && list[at] ? list[at] : null
  const label = ask.kind === 'research' ? 'What I found' : ask.kind === 'analyze' ? 'What I see' : ask.kind === 'stuck' ? (ask.planChanged ? 'A better way through' : 'This step, explained') : 'Answer'
  const showQ = ask.question && !(ask.kind === 'stuck' && ask.question === STUCK_DEFAULT_QUESTION)
  return (
    <div className="gv-ask">
      <section className="gv-ask-card" aria-labelledby="gv-ask-h">
        <span className="gv-k" style={{ color: 'var(--gv-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Sparkles size={12} aria-hidden="true" /> {label}</span>
        {showQ && <div className="gv-ask-q">You asked: <b>{ask.question}</b></div>}
        <h2 id="gv-ask-h" className="gv-ask-body" style={{ fontWeight: 500, margin: '12px 0 0' }}>
          {renderAnswer ? renderAnswer(ask.answer) : <RichText text={ask.answer} accent="var(--gv-accent)" links />}
        </h2>
        {ask.planChanged && (
          <div className="gv-ask-plan"><ListChecks size={15} aria-hidden="true" /><span><b>Your plan was updated.</b> Continue picks up at step {at != null ? at + 1 : ''}{resumeStep ? <>: <RichText text={resumeStep.text} accent="var(--gv-accent)" chips={false} /></> : '.'}</span></div>
        )}
        <div className="gv-ask-actions">
          <button ref={continueRef} type="button" className="gv-btn primary" onClick={onContinue} disabled={ask.phase === ASK_RESUMING}>
            <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" /> {ask.planChanged ? 'Continue with the updated plan' : ask.kind === 'stuck' ? 'Got it, back to the step' : 'Continue guiding'}
          </button>
          {onFollowUp && <button type="button" className="gv-btn ghost" onClick={onFollowUp}><MessageCircleQuestion size={15} aria-hidden="true" /> Ask a follow-up</button>}
          {!ask.planChanged && resumeStep && <span className="gv-ask-sub">Back to step {at + 1}.</span>}
        </div>
      </section>
    </div>
  )
}
