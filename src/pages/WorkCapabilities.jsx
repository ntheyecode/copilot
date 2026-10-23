// WorkCoPilot - "Like having the best person in the room" moved to its own page,
// linked from the short main page. Each of the eight cards has its OWN clean,
// representative header visual (inline SVG, crisp at any size) that reflects a
// gold-standard way of working, not a repeated mock. LIGHT theme, Option C cards
// (via the shared WorkCard primitive), to match the rest of the site.
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonitorPlay, TerminalSquare, Compass, ShieldCheck, AppWindow, Globe2, FileText, ScanEye, ArrowLeft, ArrowRight, Trophy, Check } from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'
import WorkCard from '../components/WorkCard.jsx'   // shared, site-wide premium card primitive

// Light viz palette - inks read cleanly on the white Frame surface.
const EM = '#10a271', EMf = 'rgba(16,162,113,.12)', CY = '#0a93c4', CYf = 'rgba(10,147,196,.12)',
  AM = '#c9821a', RD = '#d83a30', RDf = 'rgba(216,58,48,.09)', MUT = '#6b7680',
  LINE = 'rgba(10,13,18,.14)', SURF = '#ffffff', PANEL = '#f4f8f7', PANEL2 = '#eef3f1', TXT = '#3d4650'

// Each visual shares one frame so the row reads as a set; the content is unique.
function Frame({ children, h = 92 }) {
  return (
    <svg viewBox={`0 0 280 ${h}`} width="100%" style={{ display: 'block', borderRadius: 12, border: `1px solid ${LINE}` }} role="img">
      <rect x="0" y="0" width="280" height={h} rx="12" fill={SURF} />
      {children}
    </svg>
  )
}
const VIZ = {
  // 1. Guided, step by step - a stepper: done, current (glow), pending.
  steps: (
    <Frame>
      <line x1="64" y1="46" x2="140" y2="46" stroke={EM} strokeWidth="2" />
      <line x1="140" y1="46" x2="216" y2="46" stroke="rgba(10,13,18,.16)" strokeWidth="2" />
      <circle cx="64" cy="46" r="11" fill={EMf} stroke={EM} strokeWidth="2" />
      <path d="M59 46l4 4 7-8" stroke={EM} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="140" cy="46" r="13" fill={EMf} stroke={EM} strokeWidth="2.4" />
      <circle cx="140" cy="46" r="5" fill={EM} />
      <circle cx="216" cy="46" r="10" fill="none" stroke="rgba(10,13,18,.28)" strokeWidth="2" />
      <text x="140" y="80" textAnchor="middle" fill={MUT} fontSize="11" fontFamily="system-ui">step 2 of 4</text>
    </Frame>
  ),
  // 2. The exact how - a terminal with a copy tick.
  command: (
    <Frame>
      <rect x="20" y="20" width="240" height="52" rx="9" fill={PANEL2} stroke={LINE} />
      <circle cx="33" cy="33" r="3" fill="#e5574f" /><circle cx="44" cy="33" r="3" fill={AM} /><circle cx="55" cy="33" r="3" fill={EM} />
      <text x="20" y="58" fill={TXT} fontSize="13" fontFamily="ui-monospace,Consolas,monospace"><tspan x="30" fill={EM}>$</tspan><tspan dx="6" fill={TXT}>aws ec2 create-vpc</tspan></text>
      <rect x="196" y="44" width="56" height="18" rx="9" fill={EMf} />
      <path d="M205 53l3 3 5-6" stroke={EM} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="217" y="57" fill={EM} fontSize="10.5" fontFamily="system-ui">Copied</text>
    </Frame>
  ),
  // 3. Starts from zero - open, sign in, done.
  zero: (
    <Frame>
      {[['Open', 24], ['Sign in', 110]].map(([t, x]) => (
        <g key={t}><rect x={x} y="34" width={t === 'Open' ? 62 : 70} height="26" rx="8" fill={PANEL} stroke={LINE} /><text x={x + (t === 'Open' ? 31 : 35)} y="51" textAnchor="middle" fill={TXT} fontSize="12" fontFamily="system-ui">{t}</text></g>
      ))}
      <path d="M90 47h12M188 47h10" stroke={MUT} strokeWidth="2" strokeLinecap="round" /><path d="M100 43l4 4-4 4M196 43l4 4-4 4" stroke={MUT} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="208" y="34" width="60" height="26" rx="8" fill={EMf} stroke={EM} />
      <path d="M217 47l4 4 7-8" stroke={EM} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><text x="244" y="51" textAnchor="middle" fill={EM} fontSize="12" fontFamily="system-ui">Done</text>
    </Frame>
  ),
  // 4. Catches and corrects - a risky value becomes least privilege.
  fix: (
    <Frame>
      <rect x="18" y="34" width="96" height="26" rx="7" fill={RDf} stroke="rgba(216,58,48,.4)" />
      <text x="66" y="51" textAnchor="middle" fill={RD} fontSize="12.5" fontFamily="ui-monospace,monospace" style={{ textDecoration: 'line-through' }}>0.0.0.0/0</text>
      <path d="M122 47h18" stroke={MUT} strokeWidth="2" strokeLinecap="round" /><path d="M136 43l5 4-5 4" stroke={MUT} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="34" width="112" height="26" rx="7" fill={EMf} stroke={EM} />
      <path d="M160 47l4 4 6-7" stroke={EM} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><text x="178" y="51" fill={EM} fontSize="12.5" fontFamily="ui-monospace,monospace">10.0.0.0/16</text>
    </Frame>
  ),
  // 5. Any app - browser, desktop window, terminal tiles.
  apps: (
    <Frame>
      {[[24, CY, 'web'], [108, EM, 'app'], [192, AM, 'cli']].map(([x, col, kind]) => (
        <g key={kind}>
          <rect x={x} y="24" width="64" height="44" rx="8" fill={PANEL} stroke={LINE} />
          <rect x={x} y="24" width="64" height="13" rx="8" fill="rgba(10,13,18,.05)" />
          {kind === 'web' && <rect x={x + 8} y="27.5" width="40" height="6" rx="3" fill={col} opacity=".7" />}
          {kind === 'web' && <><rect x={x + 10} y="45" width="44" height="4" rx="2" fill="rgba(10,13,18,.16)" /><rect x={x + 10} y="54" width="30" height="4" rx="2" fill="rgba(10,13,18,.1)" /></>}
          {kind === 'app' && <><circle cx={x + 30} cy="42" r="3" fill={col} /><rect x={x + 10} y="54" width="44" height="4" rx="2" fill="rgba(10,13,18,.14)" /><rect x={x + 10} y="48" width="28" height="4" rx="2" fill="rgba(10,13,18,.14)" /></>}
          {kind === 'cli' && <text x={x + 9} y="52" fill={col} fontSize="11" fontFamily="ui-monospace,monospace">{'>_'}</text>}
        </g>
      ))}
      <text x="140" y="84" textAnchor="middle" fill={MUT} fontSize="10.5" fontFamily="system-ui">web  ·  desktop  ·  terminal</text>
    </Frame>
  ),
  // 6. Grounded - your document is read on-device and checked against best practice.
  grounded: (
    <Frame>
      <rect x="28" y="20" width="60" height="56" rx="6" fill={PANEL} stroke={LINE} />
      {[30, 40, 50, 60].map((y) => <rect key={y} x="36" y={y} width={y === 60 ? 28 : 44} height="4" rx="2" fill="rgba(10,13,18,.16)" />)}
      <line x1="28" y1="48" x2="88" y2="48" stroke={CY} strokeWidth="2" opacity=".85" />
      <text x="58" y="88" textAnchor="middle" fill={MUT} fontSize="10" fontFamily="system-ui">read on-device</text>
      <path d="M118 48h20" stroke={MUT} strokeWidth="2" strokeLinecap="round" /><path d="M134 44l5 4-5 4" stroke={MUT} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="30" width="112" height="36" rx="9" fill={EMf} stroke={EM} />
      <circle cx="170" cy="48" r="10" fill="rgba(16,162,113,.16)" /><path d="M165 48l4 4 6-8" stroke={EM} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="186" y="52" fill={EM} fontSize="11.5" fontFamily="system-ui">Best practice</text>
    </Frame>
  ),
  // 7. A record you keep - a clean report PDF.
  record: (
    <Frame>
      <rect x="92" y="18" width="96" height="60" rx="7" fill={PANEL} stroke={LINE} />
      {[[30, 60], [40, 78], [50, 46], [60, 70]].map(([y, w]) => <rect key={y} x="104" y={y} width={w} height="5" rx="2.5" fill="rgba(10,13,18,.16)" />)}
      <rect x="150" y="26" width="30" height="16" rx="4" fill={RDf} /><text x="165" y="38" textAnchor="middle" fill={RD} fontSize="9.5" fontWeight="700" fontFamily="system-ui">PDF</text>
      <circle cx="188" cy="74" r="12" fill={SURF} stroke={EM} strokeWidth="2" /><path d="M183 74l3 3 6-7" stroke={EM} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),
  // 8. Review and generate - a diagram is scanned, an issue found, a fix generated.
  review: (
    <Frame>
      <line x1="60" y1="36" x2="60" y2="60" stroke={LINE} strokeWidth="2" /><line x1="60" y1="36" x2="108" y2="36" stroke={LINE} strokeWidth="2" />
      <rect x="36" y="24" width="48" height="24" rx="6" fill={PANEL} stroke={LINE} />
      <rect x="92" y="24" width="48" height="24" rx="6" fill={RDf} stroke="rgba(216,58,48,.5)" />
      <rect x="36" y="52" width="48" height="24" rx="6" fill={PANEL} stroke={LINE} />
      <circle cx="116" cy="36" r="15" fill="none" stroke={AM} strokeWidth="2" /><line x1="127" y1="47" x2="134" y2="54" stroke={AM} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M168 50h20" stroke={MUT} strokeWidth="2" strokeLinecap="round" /><path d="M184 46l5 4-5 4" stroke={MUT} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="198" y="34" width="64" height="32" rx="8" fill={CYf} stroke={CY} />
      <path d="M222 42l-4 8h6l-4 8" stroke={CY} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><text x="236" y="54" fill={CY} fontSize="11" fontFamily="system-ui">fix</text>
    </Frame>
  ),
  // 9. The strongest AI available to you plans; live guidance keeps pace - two
  // lanes, framed as the BENEFIT (what you get), never as the routing behind it.
  // The PLAN lane: your plan, from the strongest AI on your key. The GUIDE lane:
  // a run of quick, confirmed steps. A quiet "planned by" readout at the foot.
  best: (
    <Frame h={120}>
      {/* PLAN lane */}
      <text x="20" y="34" fill={MUT} fontSize="9.5" fontFamily="ui-monospace,monospace" letterSpacing="1.5">PLAN</text>
      <rect x="62" y="20" width="118" height="22" rx="11" fill="rgba(109,75,216,.10)" stroke="rgba(109,75,216,.55)" />
      <path d="M75 24.5h8v4.5a4 4 0 0 1-8 0zM79 33v3M76 36.5h6" stroke="#6d4bd8" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="87" y="35" fill="#6d4bd8" fontSize="10.5" fontWeight="600" fontFamily="system-ui">strongest AI for you</text>
      <rect x="190" y="22" width="48" height="18" rx="9" fill={PANEL} stroke={LINE} />
      <text x="214" y="34.5" textAnchor="middle" fill={TXT} fontSize="9.5" fontFamily="ui-monospace,monospace">best</text>
      {/* GUIDE lane */}
      <text x="20" y="72" fill={MUT} fontSize="9.5" fontFamily="ui-monospace,monospace" letterSpacing="1.5">GUIDE</text>
      <line x1="62" y1="68" x2="238" y2="68" stroke="rgba(10,147,196,.28)" strokeWidth="2" />
      {[72, 98, 124, 150, 176, 202].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="68" r={i === 5 ? 6 : 5} fill={i === 5 ? CY : CYf} stroke={CY} strokeWidth="1.6" />
          {i < 5 && <path d={`M${x - 2.4} 68l1.8 1.8 3-3.4`} stroke={CY} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ))}
      <rect x="216" y="59" width="46" height="18" rx="9" fill={PANEL} stroke={LINE} />
      <text x="239" y="71.5" textAnchor="middle" fill={CY} fontSize="9.5" fontFamily="ui-monospace,monospace">live</text>
      {/* readout */}
      <line x1="20" y1="90" x2="260" y2="90" stroke={LINE} />
      <circle cx="28" cy="104" r="6" fill={EMf} stroke={EM} strokeWidth="1.6" /><path d="M25.3 104l1.8 1.8 3.2-3.6" stroke={EM} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="40" y="107.5" fill={TXT} fontSize="10.5" fontFamily="ui-monospace,monospace">Planned by <tspan fill={EM} fontWeight="600">the strongest AI for you</tspan></text>
    </Frame>
  ),
}

const CARDS = [
  { viz: 'steps', icon: MonitorPlay, t: 'Guided, step by step', d: 'It watches your screen and tells you the exact next move, one step at a time, and checks each one really worked before moving on.' },
  { viz: 'command', icon: TerminalSquare, t: 'The exact how, every time', d: 'Not vague advice. The precise click, command or setting to use, spelled out and copy-ready. Always the best proven way, no shortcuts.' },
  { viz: 'zero', icon: Compass, t: 'Starts from zero', d: 'Opens the right page, signs you in, and walks you to the exact spot. Nothing assumed, nothing skipped.' },
  { viz: 'fix', icon: ShieldCheck, t: 'Catches and corrects mistakes', d: 'Spots a wrong turn the moment it happens, tells you why, and shows the exact fix. When a tool\'s UI has changed, it finds the new control and corrects the step instead of pointing at a button that moved.' },
  { viz: 'apps', icon: AppWindow, t: 'Any app, not just the browser', d: 'Guides web apps, installed desktop apps, on-prem consoles at a local address, and your own custom tools. It reads whatever is on screen and fits the real environment.' },
  { viz: 'grounded', icon: Globe2, t: 'Grounded in the best, and in your world', d: 'It checks the current best practice and, on Advanced and Premium, grounds your steps in your own documents and diagrams, read on your computer, the file never leaving, flagging anything in them that is wrong.' },
  { viz: 'record', icon: FileText, t: 'A record you keep', d: 'Finish with a clean, picture-rich write-up of exactly what you did, ready to share or repeat.' },
  { viz: 'review', icon: ScanEye, t: 'Review and generate', d: 'Show it a diagram, an architecture or a design. It finds the real issues, then hands you a ready-to-use prompt to generate the corrected version in your own tools, with a document of the findings.' },
]

export default function WorkCapabilities() {
  const nav = useNavigate()
  // Deep links like /workcopilot/how-it-works#best-model (from the main page's
  // band): the browser's own hash jump fires before React has rendered the
  // target, so scroll to it once the page is mounted.
  useEffect(() => {
    const id = (window.location.hash || '').slice(1)
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])
  return (
    <div className="wcap">
      <style>{CSS}</style>
      <header className="wcap-top">
        <a href="/workcopilot" aria-label="AdmireVeda"><AdmireVedaLogo size={24} /></a>
        <button className="wcap-back" onClick={() => nav('/workcopilot')}><ArrowLeft size={15} /> WorkCoPilot</button>
      </header>
      <section className="wcap-hero">
        <h1>Like having the best person<br />in the room, every time.</h1>
        <p>Everything WorkCoPilot does for you, and the gold-standard way it does each one.</p>
      </section>
      <section className="wcap-grid">
        {CARDS.map((b, i) => {
          const tones = ['', 'cyan', '', 'amber', 'cyan', '', 'cyan', 'violet']
          const pos = ['0% 0%', '100% 0%', '50% 50%', '0% 100%', '100% 100%', '50% 0%', '0% 50%', '100% 50%']
          return (
            <WorkCard key={b.t} theme="light" tone={tones[i % 8] || undefined} delay={(i % 4) * 70} texPos={pos[i % 8]}>
              <WorkCard.Media>{VIZ[b.viz]}</WorkCard.Media>
              <WorkCard.Head icon={b.icon} title={b.t} />
              <WorkCard.Body>{b.d}</WorkCard.Body>
            </WorkCard>
          )
        })}
      </section>

      {/* THE STRONGEST AI AVAILABLE TO YOU PLANS IT - the fuller explanation, as
          one full-width Option C card (linked from the main page's band). Framed
          as the benefit and the honesty guarantee only: the plan comes from the
          strongest AI your key can reach, the guidance keeps pace, and the log
          states what planned each task. Never a universal "#1" claim, never an
          endorsement claim, never a vendor or model name, never the routing. */}
      <section className="wcap-feature" id="best-model">
        <WorkCard theme="light" tone="violet" delay={0} texPos="100% 0%">
          <div className="wcap-feat-in">
            <div className="wcap-feat-media">
              <WorkCard.Media>{VIZ.best}</WorkCard.Media>
              <WorkCard.Proof>
                <span className="wc-chip">goal</span><span className="wc-arrow">&rarr;</span>
                <span className="wc-chip">plan</span><b>strongest AI for you</b><span className="wc-arrow">&rarr;</span>
                <span className="wc-chip">guide</span><b>live, step by step</b><span className="wc-arrow">&rarr;</span>
                <b className="wc-ok"><Check size={11} /> Planned by the strongest AI for you</b>
              </WorkCard.Proof>
            </div>
            <div className="wcap-feat-copy">
              <WorkCard.Head align="start" icon={Trophy} eyebrow="The strongest AI available to you" title="Your plan comes from the strongest AI available to you." />
              <WorkCard.Body>When you set a goal, WorkCoPilot plans it with the strongest AI your key can reach. Then the live guidance keeps pace with your screen, step by step, so the plan is sharp and the guidance never lags behind what you are doing.</WorkCard.Body>
              <WorkCard.Points items={[
                'Chosen, not guessed. The plan always comes from the strongest option actually available to you at that moment, never from one that has been retired.',
                'Your data boundary holds. On your own or your company\'s key, every call stays on that key. Nothing is silently rerouted.',
                'Honest by design. The log for every task states what planned it. If anything had to change mid-task to keep you going, the log says so instead of claiming otherwise.',
              ]} />
            </div>
          </div>
        </WorkCard>
      </section>

      <section className="wcap-cta">
        <button className="wcap-btn" onClick={() => nav('/workcopilot')}>Back to WorkCoPilot <ArrowRight size={15} /></button>
        <a className="wcap-btn alt" href="/demo">See a 60-second demo</a>
      </section>
    </div>
  )
}

const CSS = `
.wcap{--ink:#0a0d12;--mut:#3d4650;--dim:#6b7680;--line:rgba(10,13,18,.1);--line-strong:rgba(10,13,18,.14);--em:#10a271;--cy:#0a93c4;
  color:var(--ink);min-height:100vh;position:relative;overflow-x:hidden;
  font-family:"Instrument Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140,245,196,.22), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(57,211,255,.14), transparent 60%),
    #edf1ef}
.wcap *{box-sizing:border-box}
/* faint dot grid so the white cards read against the page */
.wcap::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:radial-gradient(rgba(10,13,18,.06) 1px,transparent 1px);background-size:22px 22px;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3));mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.3))}
.wcap>*{position:relative;z-index:1}
.wcap-top{display:flex;align-items:center;justify-content:space-between;max-width:1160px;margin:0 auto;padding:18px 24px}
.wcap-back{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line-strong);border-radius:10px;padding:8px 13px;font:inherit;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;box-shadow:0 1px 2px rgba(10,13,18,.05)}
.wcap-hero{max-width:1160px;margin:0 auto;padding:30px 24px 10px;text-align:center}
.wcap-hero h1{font-size:40px;line-height:1.08;letter-spacing:-.02em;margin:0 0 12px;color:var(--ink);font-family:"Bricolage Grotesque","Instrument Sans",sans-serif;font-weight:600}
.wcap-hero p{color:var(--mut);font-size:17px;margin:0 auto;max-width:560px;line-height:1.55}
@media(max-width:620px){.wcap-hero h1{font-size:28px}.wcap-hero br{display:none}}
.wcap-grid{max-width:1160px;margin:0 auto;padding:26px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
@media(max-width:1080px){.wcap-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.wcap-grid{grid-template-columns:1fr}}
/* full-width feature card: visual + proof strip on the left, the claim and its
   three grounded points on the right. Stacks under 900px. */
.wcap-feature{max-width:1160px;margin:0 auto;padding:4px 24px 26px;scroll-margin-top:24px}
.wcap-feat-in{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:28px;align-items:center}
.wcap-feat-media{display:flex;flex-direction:column;gap:12px;min-width:0}
.wcap-feat-copy{display:flex;flex-direction:column;gap:14px;min-width:0}
.wcap-feat-copy .wc-title{font-size:clamp(22px,2.4vw,30px)}
@media(max-width:900px){.wcap-feat-in{grid-template-columns:1fr;gap:18px}.wcap-feat-media{order:2}}
.wcap-cta{max-width:1160px;margin:0 auto;padding:10px 24px 56px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.wcap-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#8cf5c4,#39d3ff);color:#06120d;border:0;border-radius:11px;padding:12px 20px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 24px -12px rgba(10,147,196,.6)}
.wcap-btn.alt{background:#fff;color:var(--ink);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(10,13,18,.05)}
`
