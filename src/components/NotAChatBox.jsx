import React, { useEffect, useRef, useState } from 'react'
import { Check, Hand, Flag, ShieldCheck, Wand2 } from 'lucide-react'
import GuideConsole from './GuideConsole.jsx'
import WorkCard from './WorkCard.jsx'
import { useT } from '../i18n/index.jsx'
import { shouldRevealAtOnce } from '../reveal.js'

// NotAChatBox - the answer to "people think you are another ChatGPT".
// The same request, side by side: a chat box hands back a paragraph and leaves
// the person on their own; WorkCoPilot (the GuideConsole) walks the same task on
// the real screen, corrects the wrong turn, and confirms the finish. Under it,
// the three things a chat box does not do, as three cards: it corrects you, it
// hand-holds you, it sees it through. Copy is outcome-first and lives in the
// catalog (notChat.*); the scenario comes from guide.scenarios.<scenarioId>.
//
// `variant="full"` renders the comparison + the three cards; `variant="strip"`
// renders only the three cards (inner pages that already show a console).
// The chat pane plays once when it scrolls into view (type, think, answer),
// then stays. Reduced motion and crawlers get the finished state at once.

const STYLE_ID = 'notachatbox-css'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style')
    s.id = STYLE_ID; s.textContent = CSS
    document.head.appendChild(s)
  }
}

const ICONS = [Wand2, Hand, Flag]
const TONES = ['amber', undefined, 'cyan']

export function DifferenceStrip({ compact = false }) {
  ensureStyle()
  const t = useT()
  const three = t('notChat.three') || []
  return (
    <div className={`nc-three${compact ? ' nc-three-compact' : ''}`}>
      {three.map((x, i) => {
        const Ic = ICONS[i] || Check
        return (
          <WorkCard key={x.t} theme="light" tone={TONES[i]} delay={i * 70} texPos={`${i * 50}% 0%`}>
            <WorkCard.Head align="start" icon={<Ic size={18} />} title={x.t} />
            <WorkCard.Body>{x.d}</WorkCard.Body>
          </WorkCard>
        )
      })}
    </div>
  )
}

function ChatPane() {
  const t = useT()
  const ref = useRef(null)
  const [stage, setStage] = useState(() => (shouldRevealAtOnce() ? 3 : 0))   // 0 idle, 1 asked, 2 thinking, 3 answered
  // Armed ONCE on mount (empty deps): the earlier version re-ran this effect
  // on every stage change, so the cleanup that followed stage 0 -> 1 cleared
  // the timers for stages 2 and 3 and the chat box never "answered" (caught
  // in render verification 2026-10-27). The cleanup now runs only on unmount.
  useEffect(() => {
    if (shouldRevealAtOnce()) return undefined
    const el = ref.current
    if (!el) return undefined
    const timers = []
    const go = () => {
      timers.push(setTimeout(() => setStage(1), 300))
      timers.push(setTimeout(() => setStage(2), 1300))
      timers.push(setTimeout(() => setStage(3), 3000))
    }
    const io = new IntersectionObserver((ents) => { if (ents.some((e) => e.isIntersecting)) { io.disconnect(); go() } }, { threshold: 0.3 })
    io.observe(el)
    return () => { io.disconnect(); timers.forEach(clearTimeout) }
  }, [])
  return (
    <div className="nc-chat" ref={ref} aria-label={t('notChat.chatTitle')} role="group">
      <div className="nc-chat-head"><span className="nc-chat-dots" aria-hidden="true"><i /><i /><i /></span><b>{t('notChat.chatTitle')}</b></div>
      <div className="nc-chat-body">
        {stage >= 1 && <div className="nc-bub you"><span className="nc-who">{t('notChat.chatYou')}</span>{t('notChat.chatAsk')}</div>}
        {stage === 2 && <div className="nc-bub bot nc-think" aria-hidden="true"><i /><i /><i /></div>}
        {stage >= 3 && <div className="nc-bub bot">{t('notChat.chatAnswer')}</div>}
      </div>
      <div className={`nc-chat-tail${stage >= 3 ? ' in' : ''}`}>{t('notChat.chatTail')}</div>
    </div>
  )
}

export default function NotAChatBox({ scenarioId = 'finance', variant = 'full' }) {
  ensureStyle()
  const t = useT()
  const scenario = t(`guide.scenarios.${scenarioId}`)
  if (variant === 'strip') return <DifferenceStrip />
  return (
    <div className="nc">
      <div className="nc-duel">
        <div className="nc-col">
          <ChatPane />
        </div>
        <div className="nc-vs" aria-hidden="true"><span>{t('notChat.vs')}</span></div>
        <div className="nc-col">
          {scenario && typeof scenario === 'object' ? <GuideConsole scenario={scenario} /> : null}
          <p className="nc-guide-tail"><ShieldCheck size={13} aria-hidden="true" /> {t('notChat.guideTail')}</p>
        </div>
      </div>
      <DifferenceStrip />
      <p className="nc-ro"><Hand size={14} aria-hidden="true" /> {t('notChat.readOnly')}</p>
    </div>
  )
}

const CSS = `
.nc{display:flex;flex-direction:column;gap:22px;min-width:0}
.nc-duel{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1.15fr);gap:14px 18px;align-items:start}
.nc-col{min-width:0;display:flex;flex-direction:column;gap:10px}
.nc-vs{align-self:center;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#fff;border:1px solid #e2e7f0;box-shadow:0 1px 2px rgba(10,13,18,.04),0 14px 30px -18px rgba(10,13,18,.3);font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:12px;letter-spacing:.06em;color:#3f4a5c}
/* the chat box: a plain, light chat window on purpose (it is what people
   expect from "another ChatGPT"), kept quiet next to the console */
.nc-chat{display:flex;flex-direction:column;background:#fff;border:1px solid #e2e7f0;border-radius:20px;padding:14px 15px 12px;min-height:420px;box-shadow:0 1px 2px rgba(10,13,18,.04),0 18px 40px -26px rgba(10,13,18,.2);color:#0c1222;font-family:"Figtree",system-ui,sans-serif}
.nc-chat-head{display:flex;align-items:center;gap:9px;font-size:13px;padding:0 2px 10px;border-bottom:1px solid #e2e7f0;color:#3f4a5c}
.nc-chat-head b{font-family:"Bricolage Grotesque","Figtree",sans-serif;color:#0c1222}
.nc-chat-dots{display:inline-flex;gap:5px}.nc-chat-dots i{width:8px;height:8px;border-radius:50%;background:#d6d9e8}
.nc-chat-body{flex:1;display:flex;flex-direction:column;gap:10px;padding:14px 0 8px}
.nc-bub{max-width:88%;border-radius:14px;padding:10px 13px;font-size:13.5px;line-height:1.5;animation:nc-in .35s ease-out both;overflow-wrap:anywhere}
.nc-bub.you{align-self:flex-end;background:#eef0f8;color:#0c1222;border-bottom-right-radius:5px}
.nc-bub.bot{align-self:flex-start;background:#f6f8fd;border:1px solid #e2e7f0;color:#3f4a5c;border-bottom-left-radius:5px}
.nc-who{display:block;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#6b7191;margin-bottom:3px}
.nc-think{display:inline-flex;gap:5px;padding:12px 14px}
.nc-think i{width:7px;height:7px;border-radius:50%;background:#9aa0bd;animation:nc-dot 1s ease-in-out infinite}
.nc-think i:nth-child(2){animation-delay:.15s}.nc-think i:nth-child(3){animation-delay:.3s}
@keyframes nc-dot{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
@keyframes nc-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.nc-chat-tail{margin-top:auto;padding-top:10px;border-top:1px dashed #d6d9e8;font-size:13px;font-weight:700;color:#b63f1c;opacity:0;transition:opacity .4s}
.nc-chat-tail.in{opacity:1}
.nc-guide-tail{display:flex;align-items:flex-start;gap:7px;margin:0;font-size:13px;font-weight:600;color:#07784f;line-height:1.4}
.nc-guide-tail svg{flex:none;margin-top:2px}
.nc-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.nc-three .wc-card{min-width:0}
.nc-ro{display:flex;align-items:center;justify-content:center;gap:8px;margin:0;font-size:13.5px;color:#3f4a5c;text-align:center}
.nc-ro svg{color:#0e9f6e;flex:none}
[data-theme='dark'] .nc-vs{background:#13141f;border-color:rgba(255,255,255,.12);color:#9aa0b4}
[data-theme='dark'] .nc-ro{color:#9aa0b4}
@media(max-width:900px){
  .nc-duel{grid-template-columns:1fr;gap:12px}
  .nc-vs{justify-self:center}
  .nc-chat{min-height:0}
  .nc-three{grid-template-columns:1fr;gap:12px}
}
@media(prefers-reduced-motion:reduce){.nc-bub,.nc-think i{animation:none}.nc-chat-tail{transition:none}}
`
