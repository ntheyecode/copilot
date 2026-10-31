// StepTaste - the taste of the depth, inside the live validator's console.
//
// Two parts, both pure presentation of the plan LiveValidate already derived
// (planShape / simEvents are the ONE source; nothing is derived again here):
//   StepCards    - the previewed steps as cards: what to do, the link / click
//                  path / command, and the "Exactly how" sub-steps. The first
//                  HOW_OPEN_COUNT cards show their sub-steps in view, no click
//                  needed; a later card keeps them behind one obvious control.
//                  The live-session preview's states (watched, corrected, seen
//                  done) paint on the same cards.
//   LockedTeaser - the remaining steps, by the titles the server sent, each
//                  row opening to what a live session gives for that step: the
//                  exact clicks, a check on screen, a correction on a wrong
//                  turn. Honest by construction: the three lines are generic
//                  labels, never a sub-step the server did not send.
// Every expand / collapse is a real <button> with aria-expanded + aria-controls
// (keyboard reachable, announced); the panel stays in the DOM, hidden.
import { useId, useState } from 'react'
import { Check, Eye, TerminalSquare, ChevronDown, Lock, ListChecks, Undo2, MousePointerClick, ScanEye, BadgeCheck } from 'lucide-react'
import { StepLink, CmdBlock } from '../StepBlocks.jsx'
import Rich from './rich.jsx'
import { stepMedia, howOpenByDefault } from './plan_model.js'

// The "Exactly how" sub-steps of one previewed step.
function HowSteps({ t, how, index }) {
  const [open, setOpen] = useState(howOpenByDefault(index))
  const id = useId()
  return (
    <div className={`lv-how${open ? ' open' : ''}`}>
      <button type="button" className="lv-how-t" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <ChevronDown size={14} className="lv-how-chev" aria-hidden />
        <span className="lv-how-k">{t('widgets.validate.exactlyHow')}</span>
        <span className="lv-how-c">{t.n('widgets.validate.howCount', how.length)}</span>
        <span className="lv-how-a">{open ? t('widgets.validate.howHide') : t('widgets.validate.howShow')}</span>
      </button>
      <ol id={id} hidden={!open}>{how.map((h, k) => <li key={k}><Rich text={h} /></li>)}</ol>
    </div>
  )
}

export function StepCards({ t, preview, total, sim }) {
  const shown = preview.length
  return (
    <ol className="lv-steps">
      {preview.map((p, i) => {
        const m = stepMedia(p)
        const isCur = sim.cur === i, isOk = i < sim.done, isDrift = sim.drift === i
        return (
          <li key={i} className={`lv-step${isCur ? ' cur' : ''}${isOk ? ' ok' : ''}${isDrift && !sim.fixed ? ' drift' : ''}`} style={{ '--i': i }}>
            <div className="lv-step-l">
              {isOk
                ? <span className="ok"><Check size={11} /> {t('widgets.validate.sim.stepDone')}</span>
                : isCur
                  ? <span className="watch"><Eye size={11} /> {t('widgets.validate.sim.watching')}</span>
                  : <span><TerminalSquare size={11} /> {t('widgets.validate.doThisNow')}</span>}
              <span className="lv-step-n">{t('widgets.validate.stepOf', { n: i + 1, total: total || shown })}</span>
            </div>
            <div className="lv-step-do"><Rich text={p.do} /></div>
            {m.href && <StepLink url={m.href} />}
            {m.path && <StepLink url={m.path} />}
            {m.cmd && <CmdBlock lines={m.cmd.split('\n')} />}
            {p.how && p.how.length > 0 && <HowSteps t={t} how={p.how} index={i} />}
            {/* the guide's correction, in its own words, tied to this step */}
            {isDrift && (
              <div className="lv-bubble">
                <span className="av" aria-hidden><Undo2 size={12} /></span>
                <span className="who">{t('widgets.validate.sim.guide')}</span>
                <Rich text={p.drift || t('widgets.validate.sim.driftFallback', { step: p.do })} />
                {sim.fixed && <span className="fix"><Check size={12} /> {t('widgets.validate.sim.backOnTrack')}</span>}
              </div>
            )}
            {isCur && !isDrift && <div className="lv-step-st watch"><i aria-hidden /><span>{t('widgets.validate.sim.watchingLine')}</span></div>}
            {isOk && (
              <div className="lv-step-st"><Check size={13} /><span><b>{t('widgets.validate.sim.seenDone')}</b>{p.done && <span className="m"> &middot; <Rich text={p.done} /></span>}</span></div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// One remaining step: its server title, and on demand what a live session
// gives for it. The first row opens by itself so the taste is in view.
function LockedRow({ t, title, n, ticked, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <li className={`${ticked ? 'tick' : ''}${open ? ' open' : ''}`}>
      <div className="lv-lrow">
        <span className="n">{ticked ? <Check size={11} /> : n}</span>
        <div className="t"><Rich text={title} /></div>
        <button type="button" className="lv-lrow-b" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? t('widgets.validate.lockedHide') : t('widgets.validate.lockedShow')}
          <ChevronDown size={13} aria-hidden />
        </button>
      </div>
      <ul id={id} className="lv-lgive" hidden={!open}>
        <li><MousePointerClick size={13} /><span>{t('widgets.validate.lockedGive1')}</span></li>
        <li><ScanEye size={13} /><span>{t('widgets.validate.lockedGive2')}</span></li>
        <li><Undo2 size={13} /><span>{t('widgets.validate.lockedGive3')}</span></li>
      </ul>
    </li>
  )
}

export function LockedTeaser({ t, roadmap, shown, remaining, sim, delayMs }) {
  return (
    <div className="lv-locked" style={{ '--d': `${delayMs}ms` }}>
      <div className="lv-locked-h">
        <ListChecks size={14} /><span>{t.n('widgets.validate.lockedMore', remaining)}</span>
        <span className="lv-lock"><Lock size={10} /> {t('widgets.validate.lockedTag')}</span>
      </div>
      <ol>
        {roadmap.slice(shown).map((title, i) => (
          <LockedRow key={i} t={t} title={title} n={shown + i + 1} ticked={i < sim.ticks} defaultOpen={i === 0} />
        ))}
      </ol>
      <p className="lv-locked-n"><BadgeCheck size={13} /><span>{t('widgets.validate.lockedNote')}</span></p>
    </div>
  )
}
