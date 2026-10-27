import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ServerCog, Blocks, Sparkles, Rocket, Megaphone, Calculator, Scale, Compass,
  ArrowRight, Check, Play,
} from 'lucide-react'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import ReleaseNote from '../components/ReleaseNote.jsx'   // localized "new in this release" highlights (rel.*)
import LiveValidate from '../components/LiveValidate.jsx'   // "Validate it live" widget on the use-cases page too
import useSeo from '../useSeo.js'                          // per-route title / description / canonical (WEB-01)
import { useT } from '../i18n/index.jsx'                   // localized <title>/description (seo.* keys)
import { revealOnScroll } from '../reveal.js'              // the ONE scroll-reveal mechanism for the site

// AdmireVeda WorkCoPilot - use cases (/workcopilot/use-cases).
// Each use case leads with the RESULT (a short outcome headline + one benefit
// line), lists the real jobs it covers, and shows ONE light guided-session card
// as proof (goal + three steps + the one step happening now). No mechanism dump,
// no terminal/code box, no paragraph blurbs: scannable, benefit-forward, honest.
//
// Honesty: WorkCoPilot guides people to DO and FINISH work on screen. Jobs whose
// deliverable is analysing/reviewing a long document (contract review, audit,
// deep tax analysis) are NOT its strength and are not claimed here. The former
// "legal - review a contract clause by clause / red-line a vendor contract" case
// was document analysis for a document-heavy profession, so it was replaced with
// the doing part we really help with: completing compliance forms and filings.
// Claims are scoped ("many kinds of work"), never "any field / every profession".
//
// Accessibility (WEB-08): one <main>, a single H1 then one H2 per use case, the
// chip row is a labeled nav, decorative icons and mock-window dots are hidden,
// the mock progress bar defers to its "Step X of N" text, reveals respect
// prefers-reduced-motion, and the badge/accent greens meet AA contrast.
export default function WorkUseCases() {
  const nav = useNavigate()
  const rootRef = useRef(null)
  const t = useT()
  useSeo({
    title: t('seo.use-cases.title'),
    description: t('seo.use-cases.description'),
    path: '/workcopilot/use-cases',
  })
  // Scroll reveals: the shared site mechanism (src/reveal.js).
  useEffect(() => revealOnScroll(rootRef.current, (el) => el.classList.add('in')), [])
  const go = () => nav('/workcopilot')

  // Each case: a short category label (eyebrow + chip), a result-led outcome
  // headline, ONE benefit line, the real jobs it covers, and a light guided
  // card (goal + 3 steps + the one step now + how you know it worked).
  const cases = [
    {
      id: 'config', icon: ServerCog, tone: 'a', tag: 'Setup & configuration',
      outcome: 'Set it up right, locked down',
      benefit: 'Every setting named and checked live, so your infrastructure is actually secure, not just looks it.',
      can: ['Configure a firewall', 'Harden a Linux server', 'Set up IDS / IPS rules', 'Wire a CI/CD pipeline'],
      guide: {
        goal: 'Harden a production Linux server', active: 1,
        plan: ['Create a non-root sudo user', 'Lock down SSH and the firewall', 'Turn on auto security updates'],
        now: 'Default-deny the firewall, allow only ports 22 and 443, then confirm from a second session before you log out.',
        done: 'only 22 and 443 are open and a password login is refused',
      },
    },
    {
      id: 'build', icon: Blocks, tone: 'b', tag: 'Build & implement',
      outcome: 'Empty folder to running system',
      benefit: 'The exact commands and code, in order, with the mistakes that usually cost hours caught early.',
      can: ['Scaffold a new app or service', 'Connect two systems with an API', 'Build a data pipeline', 'Deploy to the cloud'],
      guide: {
        goal: 'Add Stripe payment webhooks', active: 1,
        plan: ['Add the raw-body webhook route', 'Verify every event, make it idempotent', 'Replay test events, then go live'],
        now: 'Verify the signature before trusting the event, and skip any event id you have already seen so retries never double-charge.',
        done: 'a replayed event is accepted once and ignored the second time',
      },
    },
    {
      id: 'ai', icon: Sparkles, tone: 'c', tag: 'AI & automation',
      outcome: 'Automations that actually run',
      benefit: 'Each node, setting and connection guided, so the agent or assistant works instead of silently stalling.',
      can: ['Build an n8n workflow', 'Stand up a RAG assistant', 'Automate a repeat task', 'Wire AI into your tools'],
      guide: {
        goal: 'Ship a RAG assistant that cites sources', active: 1,
        plan: ['Chunk, embed and index your docs', 'Retrieve before you generate', 'Test answers, then deploy'],
        now: 'Retrieve the top matching chunks, pass only those as context, and have it cite the source or say "I do not know".',
        done: 'answers quote the right document and refuse when the answer is not there',
      },
    },
    {
      id: 'product', icon: Rocket, tone: 'd', tag: 'Product & innovation',
      outcome: 'From idea to shipped',
      benefit: 'Guided through tools you have never opened, with everything pointed at the result you want.',
      can: ['Prototype a new feature', 'Spin up a landing page', 'Run a quick experiment', 'Ship a first version'],
      guide: {
        goal: 'Ship and track a landing page today', active: 1,
        plan: ['Build the page, write the copy', 'Connect your domain', 'Publish and prove tracking fires'],
        now: 'Add the analytics snippet, set a conversion on the signup button, then confirm a test signup lands in real time.',
        done: 'the live URL loads and a test signup shows up as a conversion',
      },
    },
    {
      id: 'marketing', icon: Megaphone, tone: 'e', tag: 'Marketing & growth',
      outcome: 'Launch, then read the numbers',
      benefit: 'Walked through the ad manager and analytics, with every number explained in plain words.',
      can: ['Launch an ad campaign', 'Set up conversion tracking', 'Read a traffic report', 'Plan a launch'],
      guide: {
        goal: 'Launch a Google Ads search campaign', active: 1,
        plan: ['Install the tag, import the conversion', 'Set budget, keywords, tracking', 'Submit for review, go live'],
        now: 'Use exact and phrase-match keywords, not broad, set a daily cap and a target cost per action, then add three ads.',
        done: 'the campaign reads Eligible and the conversion shows Recording',
      },
    },
    {
      id: 'office', icon: Calculator, tone: 'a', tag: 'Accounting & office',
      outcome: 'Books closed, filings done',
      benefit: 'Shown exactly what to enter, with whatever does not add up flagged on the spot.',
      can: ['Reconcile a bank statement', 'Build a financial report', 'Create and send invoices', 'Prepare a filing'],
      guide: {
        goal: 'Reconcile the month to the penny', active: 1,
        plan: ['Import the statement, lock the opening balance', 'Match everything, hunt the variance', 'Lock the period, export the report'],
        now: 'Auto-match deposits, clear each withdrawal, and when it will not tie out compare the uncleared dates and amounts.',
        done: 'the cleared balance equals the statement to the cent',
      },
    },
    {
      id: 'legal', icon: Scale, tone: 'b', tag: 'Compliance & filings',
      outcome: 'Compliance tasks, done clean',
      benefit: 'Forms, checklists and filings completed step by step, with a clean record of what was done.',
      can: ['Complete a compliance checklist', 'Fill a regulatory form', 'Submit a filing in the portal', 'Keep an audit trail'],
      guide: {
        goal: 'Submit a quarterly compliance filing', active: 1,
        plan: ['Open the portal, start the return', 'Fill each field, attach evidence', 'Validate and submit'],
        now: 'Fill each required field from your records and attach exactly the evidence the form asks for, nothing missing.',
        done: 'the portal accepts the filing and returns a confirmation number',
      },
    },
    {
      id: 'general', icon: Compass, tone: 'c', tag: 'Everyday tasks',
      outcome: 'Stuck on a screen? Get to done',
      benefit: 'A new tool, a form you cannot finish, an error you do not understand: point it at the screen and get walked through.',
      can: ['Learn a new tool fast', 'Fix a confusing error', 'Fill a tricky form', 'Get unstuck on a task'],
      guide: {
        goal: 'Decode and fix a cryptic error', active: 1,
        plan: ['Reproduce the error reliably', 'Find the real cause, not the symptom', 'Fix it, confirm it is gone'],
        now: 'Paste the whole error: it reads the full stack, names the real cause, and points to the file and line to change.',
        done: 'the task finishes with a clean log and no error',
      },
    },
  ]

  return (
    <div className="uc" ref={rootRef}>
      <style>{CSS}</style>
      <div className="uc-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /></div>

      <SiteHeader current="use" />

      <main id="main">
      <section className="uc-hero">
        <div className="uc-wrap">
          <div className="uc-badge" data-reveal>Use cases</div>
          <h1 data-reveal>Find the job that looks like yours.<br /><em>Then finish it, guided.</em></h1>
          <p data-reveal>Pick the work below that matches your day. WorkCoPilot guides each step on your screen, from the first click to done.</p>
          <nav className="uc-chips" data-reveal aria-label="Jump to a use case">
            {cases.map((c) => <a key={c.id} href={`#${c.id}`} className="uc-chip"><c.icon size={14} aria-hidden="true" /> {c.tag}</a>)}
          </nav>
        </div>
      </section>

      {cases.map((c, i) => (
        <section className={`uc-case${i % 2 ? ' alt' : ''}`} id={c.id} key={c.id} aria-labelledby={`${c.id}-h`}>
          <div className="uc-wrap uc-case-in">
            <div className="uc-case-copy" data-reveal>
              <span className={`uc-ic t-${c.tone}`} aria-hidden="true"><c.icon size={24} /></span>
              <span className="uc-eyebrow">{c.tag}</span>
              <h2 id={`${c.id}-h`}>{c.outcome}</h2>
              <p>{c.benefit}</p>
              <ul className="uc-can">{c.can.map((x) => <li key={x}><Check size={15} aria-hidden="true" /> {x}</li>)}</ul>
              <button className="uc-cta" onClick={go} aria-label={`Guide me on ${c.tag}`}>Guide me on this <ArrowRight size={15} aria-hidden="true" /></button>
            </div>
            <div className="uc-case-graphic" data-reveal>
              <MiniGuide g={c.guide} tag={c.tag} />
            </div>
          </div>
        </section>
      ))}

      <section className="uc-final" aria-labelledby="uc-final-h">
        <div className="uc-wrap" data-reveal>
          <AVMark size={44} />
          <h2 id="uc-final-h">Your task is next.</h2>
          <p>Bring anything on your screen. WorkCoPilot takes it from the first step to done.</p>
          <button className="uc-cta big" onClick={go}>Get started <ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </section>
      <ReleaseNote groups={['global']} />
      </main>

      <SiteFooter />
      <LiveValidate theme="light" source="use-cases" go={(plan) => nav(`/workcopilot${plan ? `?plan=${plan}` : ''}`)} />
    </div>
  )
}

// A light proof card: what a guided session looks like, not a mechanism dump.
// Goal (what you want), a short three-step plan with the done step ticked and
// the next step waiting, and the ONE step happening now expanded with a single
// plain how-line plus how you know it worked. No terminal, no nested how-list.
function MiniGuide({ g, tag }) {
  const plan = g.plan
  const active = Math.min(Math.max(g.active || 0, 0), plan.length - 1)
  const total = plan.length
  return (
    <div className="uc-mini" role="group" aria-label={`Example guided session: ${g.goal}`}>
      <div className="uc-mini-head">
        <span className="d r" aria-hidden="true" /><span className="d y" aria-hidden="true" /><span className="d g" aria-hidden="true" />
        <b>WorkCoPilot</b>
        <span className="uc-mini-live"><i aria-hidden="true" /> watching</span>
        <span className="uc-mini-tag">{tag.split(' ')[0]}</span>
      </div>
      <div className="uc-mini-goal"><span>YOU WANT</span> {g.goal}</div>
      <div className="uc-mini-prog">
        <span className="uc-mini-pc">Step {active + 1} of {total}</span>
        <div className="uc-mini-bar" aria-hidden="true"><i style={{ width: `${Math.round(((active + 1) / total) * 100)}%` }} /></div>
      </div>
      <ol className="uc-plan">
        {plan.map((title, i) => {
          if (i < active) return (
            <li className="done" key={i}><span className="pn ok" aria-hidden="true"><Check size={12} aria-hidden="true" /></span><span className="uc-sr">Done: </span><span className="pt">{title}</span></li>
          )
          if (i > active) return (
            <li className="next" key={i}><span className="pn play" aria-hidden="true"><Play size={9} aria-hidden="true" /></span><span className="uc-sr">Next: </span><span className="pt">{title}</span></li>
          )
          return (
            <li className="active" key={i} aria-current="step">
              <span className="pn cur" aria-hidden="true">{i + 1}</span>
              <div className="pbody">
                <div className="uc-mini-label">DOING NOW</div>
                <div className="uc-mini-step">{title}</div>
                <div className="uc-mini-now">{g.now}</div>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="uc-mini-done"><Check size={13} aria-hidden="true" /> done when {g.done}</div>
    </div>
  )
}

const CSS = `
/* Light theme - matches the rest of the site. The WorkCoPilot "screen" mockup
   (.uc-mini) re-scopes dark vars below so it stays a dark device screenshot. */
[data-theme='dark'] .uc{--ink:#0a0b12;--panel:#13141f;--line:rgba(255,255,255,.09);--tx:#eef0f6;--mut:#9aa0b4;--em:#8cf5c4;--em-txt:#8cf5c4;--em2:#39d3ff;--warm:#ffb561;--warm2:#ff7a59;--ink-brand:#eef0f6}
.uc{--ink:#f3f5fb;--panel:#ffffff;--line:#e6e8f1;--tx:#161a2b;--mut:#5c6484;--em:#0e9f6e;--em-txt:#0b8259;--em2:#0a84c2;--warm:#ff9a4d;--warm2:#f26a43;--ink-brand:#062a22;
  position:relative;min-height:100vh;color:var(--tx);font-family:"Figtree",system-ui,sans-serif;font-size:17px;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1000px 520px at 85% -8%,rgba(10,134,207,.14),transparent 60%),radial-gradient(820px 480px at -6% 4%,rgba(10,157,102,.12),transparent 58%),var(--ink)}
.uc *{box-sizing:border-box}.uc a{color:inherit;text-decoration:none}
.uc h1,.uc h2{color:var(--tx);margin:0}.uc p{margin:0}
.uc em{font-style:normal;background:linear-gradient(120deg,var(--em),var(--em2));-webkit-background-clip:text;background-clip:text;color:transparent}
.uc-wrap{max-width:1140px;margin:0 auto;padding:0 24px;position:relative;z-index:3}
.uc-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(90px);opacity:.26}
.o1{width:46vw;height:46vw;left:-12vw;top:-16vw;background:radial-gradient(circle,rgba(57,211,255,.5),transparent 65%)}
.o2{width:42vw;height:42vw;right:-12vw;top:30vh;background:radial-gradient(circle,rgba(140,245,196,.42),transparent 65%)}
.uc [data-reveal]{opacity:0;transform:translateY(14px);transition:opacity .3s cubic-bezier(.2,.7,.2,1),transform .3s cubic-bezier(.2,.7,.2,1)}
.uc [data-reveal].in{opacity:1;transform:none}
/* a11y: visually hidden text; visible focus ring (never outline:none); honor reduced motion */
.uc-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.uc a:focus-visible,.uc button:focus-visible{outline:2px solid var(--em2);outline-offset:3px;border-radius:8px}
@media(prefers-reduced-motion:reduce){
  .uc [data-reveal]{opacity:1;transform:none;transition:none}
  .uc .uc-mini-live i{animation:none}
  .uc .uc-cta{transition:none}
}

.uc-cta{background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 12px 34px -12px rgba(255,122,89,.6);transition:transform .15s}
.uc-cta:hover{transform:translateY(-2px)}.uc-cta.big{padding:16px 28px;font-size:17px}

.uc-hero{padding:72px 0 30px;text-align:center}
.uc-badge{display:inline-block;font-size:13px;font-weight:600;color:var(--em-txt);border:1px solid rgba(140,245,196,.3);background:rgba(140,245,196,.07);padding:6px 14px;border-radius:999px;margin-bottom:22px}
.uc-hero h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(34px,5.4vw,60px);line-height:1.04;letter-spacing:-.03em;margin:0 0 20px}
.uc-hero p{color:var(--mut);font-size:19px;max-width:58ch;margin:0 auto 26px}
.uc-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:820px;margin:0 auto}
.uc-chip{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;color:var(--mut);border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:8px 14px;white-space:nowrap;box-shadow:0 1px 2px rgba(17,23,38,.04);transition:color .2s,border-color .2s}
.uc-chip:hover{color:var(--tx);border-color:rgba(140,245,196,.4)}
.uc-chip svg{color:var(--em);flex-shrink:0}

.uc-case{padding:56px 0;border-top:1px solid var(--line)}
.uc-case-in{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.uc-case.alt .uc-case-copy{order:2}
.uc-case-copy{min-width:0}
.uc-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,rgba(140,245,196,.2),rgba(57,211,255,.12));color:var(--em);margin-bottom:16px;box-shadow:0 0 28px -8px rgba(140,245,196,.55)}
.uc-ic.t-c{color:var(--warm);background:linear-gradient(135deg,rgba(255,179,92,.2),rgba(255,122,89,.12))}
.uc-ic.t-d{color:#8a5bff;background:linear-gradient(135deg,rgba(185,140,255,.22),rgba(57,211,255,.12))}
.uc-ic.t-e{color:#e0557c;background:linear-gradient(135deg,rgba(255,122,156,.22),rgba(255,179,92,.12))}
.uc-eyebrow{display:block;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--em-txt);margin-bottom:8px}
.uc-case h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(25px,3.2vw,36px);line-height:1.08;letter-spacing:-.02em;margin:0 0 12px}
.uc-case-copy p{color:var(--mut);font-size:16.5px;line-height:1.55;margin:0 0 20px;max-width:46ch}
.uc-can{list-style:none;padding:0;margin:0 0 24px;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}
.uc-can li{display:flex;gap:8px;align-items:flex-start;color:var(--tx);font-size:14.5px;line-height:1.4}
.uc-can li svg{color:var(--em);flex-shrink:0;margin-top:3px}

/* light guided-session proof card */
.uc-mini{--tx:#eef1f8;--mut:#9aa6ba;--line:rgba(255,255,255,.12);--em:#8cf5c4;--em2:#5bd0ff;color:var(--tx);background:linear-gradient(180deg,#12141d,#0b0f1c);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:18px;box-shadow:0 44px 90px -42px rgba(10,20,45,.5),inset 0 1px 0 rgba(255,255,255,.05)}
.uc-mini-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:2px 2px 13px}
.uc-mini-head b{font-family:"Bricolage Grotesque";margin-left:6px}
.uc-mini-head .d{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.d.r{background:#ff5f57}.d.y{background:#febc2e}.d.g{background:#28c840}
.uc-mini-tag{margin-left:auto;font-size:11px;color:var(--em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 10px;white-space:nowrap;flex-shrink:0}
.uc-mini-goal{font-size:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:11px;padding:10px 12px;line-height:1.45}
.uc-mini-goal span{font-size:10px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-right:8px}
.uc-mini-live{display:inline-flex;align-items:center;gap:6px;margin-left:10px;font-size:11px;color:#6ee7b7;white-space:nowrap}
.uc-mini-live i{width:7px;height:7px;border-radius:50%;background:#34d399;flex-shrink:0;animation:uc-pulse 1.6s infinite}
@keyframes uc-pulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 6px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
.uc-mini-prog{display:flex;align-items:center;gap:12px;margin:13px 2px 12px}
.uc-mini-pc{font-size:11px;font-weight:800;letter-spacing:.05em;color:var(--mut);white-space:nowrap}
.uc-mini-bar{flex:1;height:5px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.uc-mini-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--em),var(--em2));transition:width .5s ease}
.uc-plan{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.uc-plan>li{display:flex;gap:11px;align-items:flex-start}
.uc-plan .pn{flex:0 0 22px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;margin-top:1px}
.uc-plan .pn.ok{background:rgba(52,211,153,.18);color:#34d399}
.uc-plan .pn.play{background:rgba(255,255,255,.05);color:var(--mut);border:1px solid var(--line)}
.uc-plan .pn.cur{background:linear-gradient(135deg,var(--em),var(--em2));color:#042}
.uc-plan .pt{font-size:13.5px;line-height:1.5;padding-top:2px;min-width:0}
.uc-plan li.done .pt{color:var(--mut)}
.uc-plan li.next .pt{color:var(--mut);opacity:.82}
.uc-plan li.active{align-items:stretch}
.uc-plan li.active .pbody{flex:1;min-width:0;border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.07);border-radius:12px;padding:12px}
.uc-mini-label{font-size:10px;letter-spacing:.14em;color:var(--em);font-weight:700;margin-bottom:4px}
.uc-mini-step{font-weight:600;line-height:1.4}
.uc-mini-now{margin-top:6px;font-size:13px;color:var(--mut);line-height:1.5}
.uc-mini-done{display:flex;align-items:flex-start;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px;color:var(--mut);line-height:1.45}.uc-mini-done svg{color:var(--em);flex-shrink:0;margin-top:1px}

.uc-final{padding:90px 0;text-align:center;border-top:1px solid var(--line);background:radial-gradient(60% 130% at 50% 0%,rgba(140,245,196,.08),transparent)}
.uc-final h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(30px,5vw,48px);letter-spacing:-.02em;margin:16px 0 12px}
.uc-final p{color:var(--mut);font-size:18px;max-width:52ch;margin:0 auto 26px}

@media(max-width:860px){
 .uc-case-in{grid-template-columns:1fr;gap:26px}
 .uc-case.alt .uc-case-copy{order:0}
 .uc-can{grid-template-columns:1fr 1fr}
 /* DESIGN-06: comfortable tap targets for the jump-to-use-case chips on touch */
 .uc-chip{padding:10px 14px}
}
@media(max-width:560px){
 .uc-hero{padding:54px 0 24px}
 .uc-can{grid-template-columns:1fr}
}
`
