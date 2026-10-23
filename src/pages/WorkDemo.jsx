import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanEye, AlertTriangle, ArrowRight, Check, FileText, Sparkles, Compass, Wand2, Bug, Award } from 'lucide-react'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'
import CopyChip from '../components/CopyChip.jsx'
import LiveValidate from '../components/LiveValidate.jsx'   // "Validate it live" widget on the demo page too
import useSeo from '../useSeo.js'                          // per-route title / description / canonical (WEB-01)

// WorkCoPilot - scripted 60-second demo (admireveda.com/demo).
// Fully canned: no login, no AI, no network calls. It replays one real guided
// session the exact way the product does it, so a visitor sees what happens:
// the goal is typed, a plan appears, it watches the screen, a step is checked,
// a mistake is caught and corrected, and it ends with a write-up you keep.
// The visual language matches the marketing live demo (dark card, exact
// commands, DO THIS NOW, HOLD ON correction, step checklist, done).

const GOAL = 'Set up a private network (VPC) on AWS'

// One real walkthrough. A step is either a normal DO THIS NOW (step + how +
// optional exact command) or a HOLD ON correction (fix.say + fix.do).
// Each "how" sub-step is { do, tip }: the exact action, plus the precise where /
// label / value underneath it - so the demo shows the real DEPTH the product
// gives (not a one-line hint). A `key` word in a `do` is emphasised.
const STEPS = [
  {
    sees: 'You are in the VPC dashboard',
    step: 'Create the VPC',
    how: [
      { do: 'Click **Create VPC**', tip: 'Top-right of the VPC dashboard' },
      { do: 'Choose **VPC only** and name it', tip: 'e.g. prod-vpc, something meaningful' },
      { do: 'Set the IPv4 CIDR to **10.0.0.0/16**', tip: 'Leave IPv6 off unless you need it' },
      { do: 'Click **Create VPC** to finish', tip: 'It appears in the list within a second' },
    ],
    cmd: '$ aws ec2 create-vpc --cidr-block 10.0.0.0/16',
    done: 'the VPC is listed',
  },
  {
    sees: 'You typed CIDR 10.0.0.0/24',
    fix: {
      say: 'A /24 is only 256 addresses, too small to grow into later.',
      do: 'Change the CIDR to 10.0.0.0/16 before you create it.',
    },
    done: 'the range reads 10.0.0.0/16',
  },
  {
    sees: 'The VPC has no path to the internet',
    step: 'Attach an internet gateway',
    how: [
      { do: 'Open **Internet gateways** → **Create**', tip: 'Left nav, under Virtual private cloud' },
      { do: 'Name it, then click **Create**', tip: 'e.g. prod-igw' },
      { do: 'Select it → **Actions** → **Attach to VPC**', tip: 'It has to be Detached to attach' },
      { do: 'Pick your VPC and click **Attach**', tip: 'Status flips to Attached' },
    ],
    done: 'the gateway shows Attached',
  },
  {
    sees: 'Traffic still has nowhere to go',
    step: 'Route outbound traffic to the gateway',
    how: [
      { do: "Open your VPC's **route table**", tip: 'Route tables → the one tied to your VPC' },
      { do: 'Click **Edit routes** → **Add route**', tip: 'Opens the editable route list' },
      { do: 'Set the destination to **0.0.0.0/0**', tip: 'That means all outbound IPv4 traffic' },
      { do: 'Target your **internet gateway**, then **Save**', tip: 'Pick the igw-… you just attached' },
    ],
    cmd: '$ aws ec2 create-route --route-table-id rtb-0a1b --destination-cidr-block 0.0.0.0/0 --gateway-id igw-0c2d',
    done: '0.0.0.0/0 points at the igw',
  },
]

// Emphasise **bold** spans inside a "do" (the exact button, menu or value).
function demoRich(text) {
  const s = String(text || '')
  const out = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0, m, k = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    out.push(<b key={k++}>{m[1]}</b>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

// The write-up it hands you at the end (the record you keep).
const WRITEUP = [
  'Created a VPC with a /16 range (10.0.0.0/16) so it has room to grow.',
  'Caught a too-small /24 CIDR before it was created and corrected it.',
  'Attached an internet gateway and confirmed it shows Attached.',
  'Added a 0.0.0.0/0 route to the gateway so traffic can get out.',
]

// Accessibility (WEB-08): one <main>, a single H1, a labeled site nav with
// aria-current on this page, the auto-playing player is a labeled region that
// is NOT a live region (it changes every few seconds; announcing each change
// would drown a screen-reader user), decorative dots and icons are hidden,
// motion honors prefers-reduced-motion, and the faint step counter / terminal
// header inks were raised to AA contrast.
export default function WorkDemo() {
  const nav = useNavigate()
  useSeo({
    title: '60-Second Demo - WorkCoPilot by AdmireVeda',
    description: 'Watch WorkCoPilot guide one real task start to finish: it reads the screen, gives the exact next step and command, checks it worked, catches a mistake before it costs you, and hands you the write-up.',
    path: '/demo',
  })

  // Load the same fonts the marketing page uses, so the demo matches it.
  useEffect(() => {
    const id = 'wkd-fonts'
    if (document.getElementById(id)) return
    const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
    document.head.appendChild(l)
  }, [])

  const start = () => nav('/workcopilot')

  return (
    <div className="wkd">
      <style>{CSS}</style>
      <div className="wkd-bg" aria-hidden><span className="orb a" /><span className="orb b" /></div>

      <header className="wkd-nav">
        <div className="wkd-wrap wkd-nav-in">
          <a href="/" aria-label="AdmireVeda"><AdmireVedaLogo size={26} /></a>
          <nav className="wkd-links" aria-label="Site">
            <a href="/#how">How it works</a>
            <a href="/demo" className="on" aria-current="page">Demo</a>
            <a href="/workcopilot/use-cases">Use cases</a>
            <a href="/#pricing">Pricing</a>
          </nav>
          <button className="wkd-cta sm" onClick={start}>Start free <ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      </header>

      <main id="main">
      <section className="wkd-hero">
        <div className="wkd-wrap wkd-hero-in">
          <div className="wkd-badge"><Sparkles size={13} aria-hidden="true" /> A real session, start to finish</div>
          <h1>Watch it guide one task, step by step.</h1>
          <p className="wkd-lead">
            No sign-up, nothing to install. This plays out exactly the way the product works:
            it reads the screen, tells you the next move, checks it worked, and catches a mistake
            before it costs you.
          </p>
          <DemoPlayer />
          <div className="wkd-herocta">
            <button className="wkd-cta big" onClick={start}>Start free <ArrowRight size={17} aria-hidden="true" /></button>
            <span className="wkd-note">Takes about a minute to watch. Free to try.</span>
          </div>
        </div>
      </section>

      <section className="wkd-loop" aria-labelledby="wkd-loop-h">
        <div className="wkd-wrap wkd-loop-in">
          <div className="wkd-badge"><Sparkles size={13} aria-hidden="true" /> A live co-pilot, not a how-to page</div>
          <h2 id="wkd-loop-h">It does not just tell you. It walks every step with you.</h2>
          <p className="wkd-loop-lead">What you just watched is the real loop. On your own screen, in your own app, WorkCoPilot stays with you from the first step to done.</p>

          <div className="wkd-loop-grid">
            <div className="wkd-cap watch">
              <span className="ic" aria-hidden="true"><ScanEye size={20} /></span>
              <b>Watches</b>
              <p>Sees exactly what is on your screen and keeps pace with you, not a generic script.</p>
            </div>
            <div className="wkd-cap guide">
              <span className="ic" aria-hidden="true"><Compass size={20} /></span>
              <b>Navigates</b>
              <p>Points you to the precise click, command or value, one step at a time, in your real app.</p>
            </div>
            <div className="wkd-cap correct">
              <span className="ic" aria-hidden="true"><Wand2 size={20} /></span>
              <b>Corrects</b>
              <p>Catches a wrong move the moment it happens and puts you back on track before it costs you.</p>
            </div>
            <div className="wkd-cap fix">
              <span className="ic" aria-hidden="true"><Bug size={20} /></span>
              <b>Fixes</b>
              <p>Debugs the error in front of you and gets you unstuck, then carries on to done.</p>
            </div>
          </div>

          <div className="wkd-quality">
            <span className="ic" aria-hidden="true"><Award size={20} /></span>
            <div>
              <b>Quality over quantity, done right the first time.</b>
              <p>Only what is really on your screen - no guessing, no invented steps, no filler. Every step is grounded in the current best practice for your tool and checked before you act.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wkd-final" aria-labelledby="wkd-final-h">
        <div className="wkd-wrap wkd-final-in">
          <AVMark size={44} id="avd" />
          <h2 id="wkd-final-h">That is every task, not just this one.</h2>
          <p>Bring your own work. WorkCoPilot takes it from the first step to done, and hands you the write-up.</p>
          <button className="wkd-cta big" onClick={start}>Start free <ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </section>
      </main>

      <footer className="wkd-foot">
        <div className="wkd-wrap wkd-foot-in">
          <AdmireVedaLogo size={22} idSuffix="df" />
          <span>&copy; {new Date().getFullYear()} AdmireVeda &middot; WorkCoPilot is a product of AdmireVeda</span>
          <a href="/workcopilot">Sign in</a>
        </div>
      </footer>
      <LiveValidate theme="light" source="demo" go={(plan) => nav(`/workcopilot${plan ? `?plan=${plan}` : ''}`)} />
    </div>
  )
}

// The scripted player. A small state machine walks a fixed timeline with
// setTimeout. Stages:
//   'type'  - type the goal character by character
//   'plan'  - read the screen, reveal the plan
//   'step'  - walk STEPS one at a time (si), catching/correcting a mistake
//   'done'  - the write-up you keep
function DemoPlayer() {
  const [stage, setStage] = useState('type')
  const [typed, setTyped] = useState('')
  const [si, setSi] = useState(0)        // current step index
  const [planShown, setPlanShown] = useState(0)  // how many plan lines are in
  const [fw, setFw] = useState(0)        // fireworks round (1..3) when the goal is completed
  const timers = useRef([])

  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t }

  const run = () => {
    clearAll()
    setStage('type'); setTyped(''); setSi(0); setPlanShown(0)
    // 1) type the goal
    let n = 0
    const type = () => {
      n++; setTyped(GOAL.slice(0, n))
      if (n < GOAL.length) later(type, 34)
      else later(() => { setStage('plan') }, 600)
    }
    later(type, 500)
  }

  // Kick off on mount and clean timers on unmount.
  useEffect(() => { run(); return clearAll }, [])

  // Reveal the plan one line at a time, then start walking the steps.
  useEffect(() => {
    if (stage !== 'plan') return
    setPlanShown(0)
    let k = 0
    const reveal = () => {
      k++; setPlanShown(k)
      if (k < STEPS.length) later(reveal, 420)
      else later(() => { setSi(0); setStage('step') }, 900)
    }
    later(reveal, 500)
  }, [stage])

  // Walk the steps. A correction lingers a touch longer so it reads.
  useEffect(() => {
    if (stage !== 'step') return
    const cur = STEPS[si]
    const dwell = cur && cur.fix ? 7200 : 6200   // +1s per step before advancing
    later(() => {
      if (si >= STEPS.length - 1) setStage('done')
      else setSi((x) => x + 1)
    }, dwell)
  }, [stage, si])

  // Celebrate the completed goal with fireworks - THREE bursts. Each round
  // re-keys the overlay so the one-shot burst animation replays.
  useEffect(() => {
    if (stage !== 'done') { setFw(0); return }
    setFw(1)
    let n = 1
    const id = setInterval(() => { n += 1; if (n > 3) { clearInterval(id); return } setFw(n) }, 1150)
    return () => clearInterval(id)
  }, [stage])

  const s = STEPS[si] || STEPS[0]
  const isFix = !!s.fix
  const tot = STEPS.length

  return (
    <div className="wkd-stage-wrap">
      <div className="wkd-demo" role="region" aria-label="Scripted demo of one guided session. It plays automatically and can be replayed at the end." aria-live="off">
        <div className="wkd-demo-head">
          <span className="dot r" aria-hidden="true" /><span className="dot y" aria-hidden="true" /><span className="dot g" aria-hidden="true" />
          <b>WorkCoPilot</b>
          {stage !== 'done' && <span className="wkd-live" title="reading your screen"><i aria-hidden="true" /> watching</span>}
          <span className="wkd-tag">Cloud</span>
        </div>

        <div className="wkd-demo-goal"><span className="k">GOAL</span> {typed}{stage === 'type' && <span className="caret" />}</div>

        {/* The stage area fills the card and centers its screen, so the fixed
            height never leaves an empty gap below short stages (the write-up). */}
        <div className="wkd-stagearea">
        {stage === 'plan' && (
          <div className="wkd-plan">
            <div className="wkd-plan-head"><ScanEye size={13} aria-hidden="true" /> Reading your screen, here is the plan</div>
            <ol>
              {STEPS.map((st, i) => (
                <li key={i} className={i < planShown ? 'in' : ''}>{st.step || st.done}</li>
              ))}
            </ol>
          </div>
        )}

        {stage === 'step' && (
          <div className="wkd-demo-body">
            <div className="wkd-sees" key={'see' + si}><span className="seek"><ScanEye size={12} aria-hidden="true" /> I can see</span> {s.sees}</div>

            {s.cmd && !isFix && (
              <div className="wkd-term" key={'tm' + si}>
                <div className="wkd-term-h">TERMINAL <CopyChip text={s.cmd} /></div>
                <code>{s.cmd}</code>
              </div>
            )}

            <div className="wkd-steps" aria-hidden>
              {STEPS.map((_, k) => <i key={k} className={k < si ? 'done' : k === si ? 'now' : ''} />)}
            </div>

            <div className="wkd-guide">
              {isFix ? (
                <div className="wkd-fix" key={'fx' + si}>
                  <div className="wkd-fix-h"><AlertTriangle size={13} aria-hidden="true" /> HOLD ON <span className="no">Step {si + 1} of {tot}</span></div>
                  <div className="wkd-fix-say">{s.fix.say}</div>
                  <div className="wkd-fix-do"><ArrowRight size={13} aria-hidden="true" /> {s.fix.do}</div>
                </div>
              ) : (
                <>
                  <div className="wkd-now">
                    <div className="wkd-now-lbl">DO THIS NOW <span className="no">Step {si + 1} of {tot}</span></div>
                    <div className="wkd-now-step" key={'ns' + si}>{s.step}</div>
                  </div>
                  <div className="wkd-how" key={'hw' + si}>
                    <div className="wkd-how-lbl">EXACTLY HOW <span className="wkd-how-cnt">{s.how.length} steps</span></div>
                    <ol className="wkd-how-list">
                      {s.how.map((h, k) => (
                        <li key={k} style={{ animationDelay: `${90 + k * 85}ms` }}>
                          <span className="wkd-how-n">{k + 1}</span>
                          <div className="wkd-how-c">
                            <div className="do">{demoRich(h.do)}</div>
                            {h.tip && <div className="tip">{h.tip}</div>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              )}
            </div>

            <div className="wkd-done-when" key={'dw' + si}><Check size={13} aria-hidden="true" /> done when {s.done}</div>
          </div>
        )}

        {stage === 'done' && (
          <div className="wkd-wrapup">
            <div className="wkd-wrapup-h"><FileText size={15} aria-hidden="true" /> Session write-up</div>
            <div className="wkd-wrapup-sub">A clean record of exactly what you did, ready to keep, share or repeat.</div>
            <ul>
              {WRITEUP.map((w, i) => (
                <li key={i} style={{ animationDelay: `${120 + i * 140}ms` }}><Check size={14} aria-hidden="true" /> {w}</li>
              ))}
            </ul>
            <div className="wkd-wrapup-foot">
              <span className="wkd-badge-done"><Check size={13} aria-hidden="true" /> Task complete</span>
              <button className="wkd-replay" onClick={run} aria-label="Replay the demo">Replay</button>
            </div>
          </div>
        )}
        </div>

        {stage === 'done' && fw > 0 && (
          <div className="wkd-fw" key={fw} aria-hidden>
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className={`wkd-fw-burst b${i}`}>
                {Array.from({ length: 12 }).map((__, j) => <i key={j} style={{ '--a': j * 30 }} />)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const CSS = `
.wkd{--bg:#0b1020;--panel:#fff;--tx:#141726;--mut:#5b6478;--line:#e4e7f0;--em:#0a86cf;--g:#0a9d66;
  min-height:100vh;background:#f7f9fd;color:var(--tx);font-family:Figtree,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;position:relative;overflow-x:hidden}
@media (prefers-color-scheme:dark){.wkd{--panel:#121725;--tx:#eef1f8;--mut:#9aa4bd;--line:#242b3d;background:#0b1020}}
.wkd-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wkd-bg .orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5}
.wkd-bg .orb.a{width:520px;height:520px;background:radial-gradient(circle,rgba(10,157,102,.55),transparent 70%);top:-160px;left:-120px}
.wkd-bg .orb.b{width:560px;height:560px;background:radial-gradient(circle,rgba(10,134,207,.5),transparent 70%);top:140px;right:-160px}
.wkd-wrap{max-width:1040px;margin:0 auto;padding:0 20px;position:relative;z-index:1}

.wkd-nav{position:sticky;top:0;z-index:30;backdrop-filter:blur(10px);background:color-mix(in srgb,#f7f9fd 78%,transparent);border-bottom:1px solid var(--line)}
@media (prefers-color-scheme:dark){.wkd-nav{background:color-mix(in srgb,#0b1020 78%,transparent)}}
.wkd-nav-in{display:flex;align-items:center;gap:18px;height:64px}
.wkd-links{display:flex;gap:20px;margin-left:8px;flex:1}
.wkd-links a{color:var(--mut);text-decoration:none;font-weight:600;font-size:14.5px}
.wkd-links a:hover,.wkd-links a.on{color:var(--tx)}
.wkd-cta{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--g),var(--em));color:#fff;border:none;border-radius:12px;padding:12px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 8px 22px rgba(10,134,207,.28);transition:transform .15s,box-shadow .15s}
.wkd-cta:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(10,134,207,.36)}
.wkd-cta.sm{padding:9px 15px;font-size:14px}
.wkd-cta.big{padding:15px 26px;font-size:16px}

.wkd-hero{padding:46px 0 20px;text-align:center}
.wkd-hero-in{display:flex;flex-direction:column;align-items:center}
.wkd-badge{display:inline-flex;align-items:center;gap:7px;background:color-mix(in srgb,var(--em) 12%,transparent);color:var(--em);border:1px solid color-mix(in srgb,var(--em) 28%,transparent);border-radius:999px;padding:6px 14px;font-weight:700;font-size:13px}
.wkd-hero h1{font-family:'Bricolage Grotesque',Figtree,sans-serif;font-weight:800;font-size:clamp(30px,5vw,48px);line-height:1.05;letter-spacing:-.02em;margin:18px 0 0}
.wkd-lead{color:var(--mut);font-size:clamp(15px,2vw,18px);line-height:1.55;max-width:60ch;margin:14px auto 30px}
.wkd-herocta{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:26px}
.wkd-note{color:var(--mut);font-size:13px}

.wkd-stage-wrap{width:100%;max-width:640px}
/* Fixed height = the tallest stage, so the card never expands then shrinks as
   stages change (measured max 594px; 612 gives headroom). overflow:hidden keeps
   any stray pixel and the fireworks inside the rounded card. */
.wkd-demo{background:linear-gradient(180deg,#0f1424,#0b0f1c);border:1px solid rgba(255,255,255,.08);border-radius:18px;box-shadow:0 30px 70px rgba(5,10,30,.5);padding:16px;text-align:left;color:#e8ecf7;height:612px;position:relative;overflow:hidden;display:flex;flex-direction:column}
/* Each screen fills the card and sits centered, so the fixed height never leaves
   a dead gap below a short stage (the write-up) - it reads as composed, not
   cut off. Reveal animations are opacity/transform only, so centring never
   jitters. */
.wkd-stagearea{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center}
.wkd-demo-head{display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.07)}
.wkd-demo-head .dot{width:11px;height:11px;border-radius:50%}
.wkd-demo-head .dot.r{background:#ff5f57}.wkd-demo-head .dot.y{background:#febc2e}.wkd-demo-head .dot.g{background:#28c840}
.wkd-demo-head b{margin-left:8px;font-size:14px;color:#fff}
.wkd-live{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:12px;color:#6ee7b7;font-weight:600}
.wkd-live i{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:wkd-pulse 1.6s infinite}
@keyframes wkd-pulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.6)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
.wkd-tag{font-size:11px;font-weight:700;color:#9fb0d6;background:rgba(159,176,214,.14);padding:3px 9px;border-radius:999px}
.wkd-live + .wkd-tag{margin-left:8px}

.wkd-demo-goal{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:15px;color:#fff;margin:14px 2px 6px;font-weight:600}
.wkd-demo-goal .k{font-size:10px;font-weight:800;letter-spacing:.08em;color:#0b0f1c;background:#6ee7b7;padding:3px 7px;border-radius:5px}
.caret{display:inline-block;width:2px;height:18px;background:#6ee7b7;animation:wkd-blink 1s steps(1) infinite;vertical-align:-3px}
@keyframes wkd-blink{50%{opacity:0}}

.wkd-plan{margin-top:12px;animation:wkd-fade .4s ease both}
.wkd-plan-head{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#9fb0d6;margin-bottom:10px}
.wkd-plan ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px}
.wkd-plan li{color:#cdd6ec;font-size:14px;line-height:1.4;opacity:0;transform:translateY(4px);transition:opacity .4s,transform .4s}
.wkd-plan li.in{opacity:1;transform:none}

.wkd-demo-body{margin-top:12px}
.wkd-sees{position:relative;font-size:13.5px;color:#cdd6ec;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;animation:wkd-fade .4s ease both}
.wkd-sees .seek{display:inline-flex;align-items:center;gap:5px;font-weight:700;color:#7dd3fc;margin-right:6px}
.wkd-term{margin-top:12px;background:#05070f;border:1px solid rgba(255,255,255,.1);border-radius:10px;overflow:hidden;animation:wkd-fade .4s ease both}
.wkd-term-h{display:flex;justify-content:space-between;font-size:10px;font-weight:700;letter-spacing:.1em;color:#8c97b5;padding:7px 11px;border-bottom:1px solid rgba(255,255,255,.07)}
.wkd-term-h span{color:#7dd3fc;cursor:default}
.wkd-term code{display:block;padding:11px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;color:#9be7a0;white-space:pre-wrap;word-break:break-all}

.wkd-steps{display:flex;gap:6px;margin:14px 0}
.wkd-steps i{flex:1;height:4px;border-radius:999px;background:rgba(255,255,255,.12)}
.wkd-steps i.done{background:#34d399}
.wkd-steps i.now{background:#7dd3fc}

.wkd-guide{margin-top:4px}
.wkd-now-lbl,.wkd-how-lbl{font-size:10px;font-weight:800;letter-spacing:.1em;color:#7dd3fc}
.wkd-now-step{font-size:17px;font-weight:700;color:#fff;margin-top:5px;animation:wkd-fade .4s ease both}
.wkd-now-lbl .no,.wkd-fix-h .no{float:right;color:#8c97b5;font-weight:700;letter-spacing:0}
.wkd-how{margin-top:14px}
.wkd-how-cnt{float:right;font-size:9.5px;font-weight:800;letter-spacing:.06em;color:#93a0c0;background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.22);border-radius:999px;padding:2px 8px}
.wkd-how-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
.wkd-how-list li{display:flex;gap:11px;align-items:flex-start;position:relative;opacity:0;animation:wkd-slide .42s cubic-bezier(.2,.8,.2,1) forwards}
.wkd-how-list li:not(:last-child):before{content:'';position:absolute;left:11px;top:24px;bottom:-9px;width:2px;background:linear-gradient(180deg,rgba(125,211,252,.35),rgba(125,211,252,.05))}
.wkd-how-n{flex:0 0 22px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#06283b;background:linear-gradient(135deg,#7dd3fc,#5eead4);z-index:1}
.wkd-how-c{flex:1;min-width:0;padding-top:1px}
.wkd-how-c .do{color:#eaf0fb;font-size:13.5px;line-height:1.45;font-weight:500}
.wkd-how-c .do b{color:#fff;font-weight:800;background:linear-gradient(transparent 60%,rgba(125,211,252,.28) 0);padding:0 2px;border-radius:2px}
.wkd-how-c .tip{color:#8f9cbd;font-size:12px;line-height:1.4;margin-top:2px}
.wkd-fix{background:linear-gradient(180deg,rgba(254,188,46,.1),transparent);border:1px solid rgba(254,188,46,.4);border-radius:12px;padding:12px 14px;animation:wkd-fade .4s ease both}
.wkd-fix-h{font-size:11px;font-weight:800;letter-spacing:.08em;color:#fbbf24;display:flex;align-items:center;gap:6px}
.wkd-fix-say{color:#fde8b0;font-size:14px;line-height:1.45;margin-top:8px}
.wkd-fix-do{display:flex;align-items:flex-start;gap:7px;color:#fff;font-size:14px;font-weight:600;margin-top:9px}
.wkd-done-when{display:inline-flex;align-items:center;gap:7px;margin-top:14px;font-size:12.5px;color:#6ee7b7;font-weight:600}

.wkd-wrapup{margin-top:12px;animation:wkd-fade .5s ease both}
.wkd-wrapup-h{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:800;color:#fff}
.wkd-wrapup-sub{color:#9fb0d6;font-size:13px;margin:5px 0 14px}
.wkd-wrapup ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.wkd-wrapup li{display:flex;align-items:flex-start;gap:9px;color:#dbe3f5;font-size:14px;line-height:1.45;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;opacity:0;animation:wkd-slide .5s ease forwards}
.wkd-wrapup li svg{color:#34d399;flex:none;margin-top:2px}
.wkd-wrapup-foot{display:flex;align-items:center;justify-content:space-between;margin-top:16px}
.wkd-badge-done{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#0b0f1c;background:#6ee7b7;padding:6px 13px;border-radius:999px}
.wkd-replay{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#dbe3f5;border-radius:10px;padding:8px 16px;font:inherit;font-weight:600;font-size:13px;cursor:pointer}
.wkd-replay:hover{background:rgba(255,255,255,.14)}

@keyframes wkd-fade{from{opacity:0}to{opacity:1}}
@keyframes wkd-slide{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
/* a11y: visible focus ring (never outline:none); honor reduced motion (the
   scripted timeline still advances, only the decorative motion is stilled) */
.wkd a:focus-visible,.wkd button:focus-visible{outline:2px solid var(--em);outline-offset:3px;border-radius:8px}
.wkd .wkd-demo a:focus-visible,.wkd .wkd-demo button:focus-visible{outline-color:#7dd3fc}
@media(prefers-reduced-motion:reduce){
  .wkd .wkd-live i,.wkd .caret{animation:none}
  .wkd .wkd-plan li,.wkd .wkd-how-list li,.wkd .wkd-wrapup li{opacity:1;transform:none;transition:none;animation:none}
  .wkd .wkd-plan,.wkd .wkd-sees,.wkd .wkd-term,.wkd .wkd-now-step,.wkd .wkd-fix,.wkd .wkd-wrapup{animation:none}
  .wkd .wkd-fw{display:none}
  .wkd .wkd-cta{transition:none}
}

/* live co-pilot loop: watch -> navigate -> correct -> fix, plus the quality promise */
.wkd-loop{padding:24px 0 8px;text-align:center}
.wkd-loop-in{display:flex;flex-direction:column;align-items:center}
.wkd-loop h2{font-family:'Bricolage Grotesque',Figtree,sans-serif;font-weight:800;font-size:clamp(23px,3.6vw,32px);letter-spacing:-.02em;margin:16px 0 0}
.wkd-loop-lead{color:var(--mut);font-size:clamp(15px,2vw,17px);line-height:1.55;max-width:56ch;margin:12px auto 26px}
.wkd-loop-grid{width:100%;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;text-align:left}
.wkd-cap{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 16px;box-shadow:0 14px 40px rgba(10,30,70,.06);display:flex;flex-direction:column;gap:6px}
.wkd-cap .ic{width:40px;height:40px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;color:#fff;margin-bottom:4px}
.wkd-cap b{font-family:'Bricolage Grotesque',Figtree,sans-serif;font-size:18px;font-weight:800;letter-spacing:-.01em}
.wkd-cap p{margin:0;color:var(--mut);font-size:13.5px;line-height:1.5}
.wkd-cap.watch .ic{background:linear-gradient(135deg,#39d3ff,#0a86cf)}
.wkd-cap.guide .ic{background:linear-gradient(135deg,#34e0a1,#0a9d66)}
.wkd-cap.correct .ic{background:linear-gradient(135deg,#b98cff,#7a4bd8)}
.wkd-cap.fix .ic{background:linear-gradient(135deg,#ffb35c,#f26a43)}
.wkd-quality{width:100%;margin-top:16px;display:flex;align-items:flex-start;gap:14px;text-align:left;background:color-mix(in srgb,var(--g) 8%,var(--panel));border:1px solid color-mix(in srgb,var(--g) 30%,var(--line));border-radius:16px;padding:18px 20px}
.wkd-quality .ic{flex:0 0 40px;width:40px;height:40px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;color:#2a1a04;background:linear-gradient(135deg,#ffcf5c,#e08a2a)}
.wkd-quality b{font-family:'Bricolage Grotesque',Figtree,sans-serif;font-size:17px;font-weight:800;display:block}
.wkd-quality p{margin:6px 0 0;color:var(--mut);font-size:14px;line-height:1.55}
@media (max-width:760px){.wkd-loop-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:440px){.wkd-loop-grid{grid-template-columns:1fr}}

.wkd-final{padding:40px 0 60px;text-align:center}
.wkd-final-in{display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:40px 24px;box-shadow:0 20px 50px rgba(10,30,70,.07)}
.wkd-final h2{font-family:'Bricolage Grotesque',Figtree,sans-serif;font-weight:800;font-size:clamp(24px,4vw,34px);margin:10px 0 0;letter-spacing:-.02em}
.wkd-final p{color:var(--mut);font-size:16px;margin:0 0 8px;max-width:52ch}

.wkd-foot{border-top:1px solid var(--line);padding:22px 0}
.wkd-foot-in{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.wkd-foot-in span{color:var(--mut);font-size:13px;flex:1;min-width:200px}
.wkd-foot-in a{color:var(--mut);text-decoration:none;font-weight:600;font-size:14px}
.wkd-foot-in a:hover{color:var(--tx)}

/* fireworks on completion (3 bursts) - matches the marketing celebration */
.wkd-fw{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;border-radius:18px}
.wkd-fw-burst{position:absolute;width:0;height:0}
.wkd-fw-burst.b0{left:24%;top:30%}.wkd-fw-burst.b1{left:70%;top:26%}.wkd-fw-burst.b2{left:48%;top:48%}.wkd-fw-burst.b3{left:30%;top:64%}.wkd-fw-burst.b4{left:76%;top:58%}.wkd-fw-burst.b5{left:58%;top:22%}.wkd-fw-burst.b6{left:18%;top:46%}
.wkd-fw-burst i{position:absolute;left:0;top:0;width:6px;height:6px;border-radius:50%;background:hsl(calc(var(--a) + 150),92%,58%);box-shadow:0 0 7px currentColor;animation:wkd-fw-pop 1.15s cubic-bezier(.15,.7,.3,1) forwards}
.wkd-fw-burst.b1 i{animation-delay:.1s}.wkd-fw-burst.b2 i{animation-delay:.2s}.wkd-fw-burst.b3 i{animation-delay:.32s}.wkd-fw-burst.b4 i{animation-delay:.16s}.wkd-fw-burst.b5 i{animation-delay:.28s}.wkd-fw-burst.b6 i{animation-delay:.38s}
@keyframes wkd-fw-pop{0%{transform:rotate(calc(var(--a) * 1deg)) translateX(2px) scale(1);opacity:1}100%{transform:rotate(calc(var(--a) * 1deg)) translateX(70px) scale(.25);opacity:0}}
@media (max-width:560px){
  /* DESIGN-06: links hide on phones - push the CTA back to the right edge so the
     header stays balanced, and let the demo card grow to fit instead of clipping */
  .wkd-links{display:none}
  .wkd-cta.sm{margin-left:auto}
  .wkd-demo{height:auto;min-height:0;overflow:visible}
}
`
