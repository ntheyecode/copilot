import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ServerCog, Blocks, Sparkles, Rocket, Megaphone, Calculator, Scale, Compass,
  ArrowRight, Check, ChevronLeft,
} from 'lucide-react'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'
import LiveValidate from '../components/LiveValidate.jsx'   // "Validate it live" widget on the use-cases page too

// AdmireVeda WorkCoPilot - detailed use cases (/workcopilot/use-cases).
// Every use case explained, each with a worked mini-guide graphic.
export default function WorkUseCases() {
  const nav = useNavigate()
  const rootRef = useRef(null)
  useEffect(() => {
    const id = 'wm-fonts'
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
      document.head.appendChild(l)
    }
  }, [])
  useEffect(() => {
    const els = rootRef.current ? rootRef.current.querySelectorAll('[data-reveal]') : []
    const io = new IntersectionObserver((e) => e.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target) } }), { threshold: 0.12 })
    els.forEach((el) => io.observe(el)); return () => io.disconnect()
  }, [])
  const go = () => nav('/workcopilot')

  const cases = [
    {
      id: 'config', icon: ServerCog, tone: 'a', tag: 'Technical setup & config',
      blurb: 'Stand up and lock down infrastructure the right way, step by step. Firewalls, IDS/IPS, cloud networking, servers and DevOps: WorkCoPilot walks you through the console or the terminal, names the exact setting, and checks each change is live before moving on.',
      can: ['Configure a firewall or security group', 'Harden a Linux server', 'Set up IDS / IPS rules', 'Wire up a CI/CD pipeline'],
      guide: { goal: 'Harden a public production Linux server', step: 'Kill password SSH, least-privilege the firewall, auto-ban attackers', how: ['Set PermitRootLogin no and PasswordAuthentication no in /etc/ssh/sshd_config', 'Default-deny the firewall, then allow only 22 and 443', 'Install fail2ban so repeated SSH failures get banned automatically', 'Reload sshd and confirm from a second session before you log out of the first'], cmd: '$ sudo ufw default deny incoming && sudo ufw allow 22,443/tcp && sudo ufw enable', done: 'ss -tlnp shows only 22 and 443, and a password login is refused' },
    },
    {
      id: 'build', icon: Blocks, tone: 'b', tag: 'Build & implement',
      blurb: 'Take an idea from an empty folder to a running system. Pipelines, integrations, data flows and end-to-end builds: it gives you the exact commands and code, in order, and catches the mistakes that usually cost hours.',
      can: ['Scaffold a new app or service', 'Connect two systems with an API', 'Build a data pipeline', 'Deploy to the cloud'],
      guide: { goal: 'Add bullet-proof Stripe webhooks', step: 'Verify every event and make the handler idempotent', how: ['Create a raw-body POST /webhooks/stripe (no JSON parser on that one route)', 'Verify the signature with stripe.webhooks.constructEvent before trusting anything', 'Record each event id and skip it if you have seen it, so retries never double-charge', 'Return 200 within two seconds, then process the event in a background job'], cmd: '$ stripe trigger checkout.session.completed', done: 'a replayed event is accepted once and ignored the second time' },
    },
    {
      id: 'ai', icon: Sparkles, tone: 'c', tag: 'AI & automation',
      blurb: 'Build agents, RAG assistants and automations without getting lost. n8n flows, vector search and enterprise AI: it guides each node, each setting and each connection, so the automation actually runs.',
      can: ['Build an n8n workflow', 'Stand up a RAG assistant', 'Automate a repetitive task', 'Wire an AI into your tools'],
      guide: { goal: 'Ship a RAG assistant that cites its sources', step: 'Wire retrieval before generation, and make it refuse when unsure', how: ['Split your docs into ~500-token chunks with slight overlap, keeping each source id', 'Embed every chunk and upsert it into the vector store', 'On a question, retrieve the top matches, rerank them, and pass only those as context', 'Make the prompt cite the chunk it used and answer "I do not know" when nothing matches'], cmd: null, done: 'answers quote the right document and refuse when the answer is not in the corpus' },
    },
    {
      id: 'product', icon: Rocket, tone: 'd', tag: 'Product & innovation',
      blurb: 'Turn a brand new idea into something real. Prototype, validate and ship: it guides tools you have never opened before and keeps everything pointed at the outcome you want.',
      can: ['Prototype a new feature', 'Spin up a landing page', 'Run a quick experiment', 'Ship a first version'],
      guide: { goal: 'Ship and instrument a landing page today', step: 'Publish on your domain and prove the tracking fires', how: ['Build the page, then connect your domain with the exact DNS records it shows', 'Add the analytics snippet just before the closing head tag', 'Set a conversion event on the signup button, not just a page view', 'Open the live URL and confirm a test signup lands in real-time analytics'], cmd: null, done: 'the live URL loads and a test signup appears as a conversion' },
    },
    {
      id: 'marketing', icon: Megaphone, tone: 'e', tag: 'Marketing & growth',
      blurb: 'Launch campaigns, read the numbers and grow, without second-guessing every button. It walks you through the ad manager and the analytics, and tells you what each number means.',
      can: ['Launch an ad campaign', 'Set up conversion tracking', 'Read a traffic report', 'Plan a product launch'],
      guide: { goal: 'Launch a Google Ads search campaign that converts', step: 'Set budget, keywords and conversion tracking together', how: ['Install the Google tag and import the conversion from GA4 first', 'Create a Search campaign with exact and phrase-match keywords, not broad', 'Set a daily cap, the right locations, and a target CPA', 'Add three responsive search ads, then submit for review'], cmd: null, done: 'the campaign reads Eligible and the conversion shows Recording' },
    },
    {
      id: 'office', icon: Calculator, tone: 'a', tag: 'Accounting & office',
      blurb: 'Close the books, build the report, file the thing: guided click by click. Reconciliations, spreadsheets, invoices and filings: it shows exactly what to enter and flags what does not add up.',
      can: ['Reconcile a bank statement', 'Build a financial report', 'Create and send invoices', 'Prepare a filing'],
      guide: { goal: 'Reconcile the month to the penny', step: 'Match everything, then hunt the variance', how: ['Import the bank CSV and lock the opening balance', 'Auto-match the deposits, then clear each withdrawal one by one', 'When it does not tie out, filter to uncleared and compare dates and amounts', 'Post the bank fees and interest the statement shows but your books do not'], cmd: null, done: 'the cleared balance equals the statement to the cent' },
    },
    {
      id: 'legal', icon: Scale, tone: 'b', tag: 'Legal & compliance',
      blurb: 'Move through reviews, forms and checks with a steady hand. It guides the process, points to what to look for, and keeps a clean record of what was done.',
      can: ['Review a contract clause by clause', 'Complete a compliance checklist', 'Fill a regulatory form', 'Prepare an audit trail'],
      guide: { goal: 'Red-line a vendor contract', step: 'Check the clauses that actually carry risk', how: ['Open the contract next to your playbook or standard positions', 'Check the liability cap, indemnity, term and auto-renewal', 'Check data processing, breach-notice windows and sub-processors', 'Flag every deviation with a suggested red-line for counsel to approve'], cmd: null, done: 'every high-risk clause is checked, flagged or accepted' },
    },
    {
      id: 'general', icon: Compass, tone: 'c', tag: 'Everyday & anything else',
      blurb: 'Anything else on a screen. A new tool you have never opened, a form you are stuck on, an error you do not understand: point WorkCoPilot at it and get walked through to done.',
      can: ['Learn a new tool fast', 'Fix a confusing error', 'Fill a tricky form', 'Get unstuck on anything'],
      guide: { goal: 'Decode and fix a cryptic error', step: 'Find the real cause, not the symptom, then fix it', how: ['Paste the whole error, it reads the full stack, not just the last line', 'It names the real cause and which file and line to change', 'Apply the exact config or code fix it shows, in the right place', 'Re-run and confirm the error is gone, not just moved somewhere else'], cmd: null, done: 'the task finishes with a clean log and no error' },
    },
  ]

  return (
    <div className="uc" ref={rootRef}>
      <style>{CSS}</style>
      <div className="uc-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /></div>

      <header className="uc-nav">
        <div className="uc-wrap uc-nav-in">
          <a href="/" aria-label="AdmireVeda"><AdmireVedaLogo size={25} /></a>
          <div className="uc-navcta">
            <a className="uc-back" href="/"><ChevronLeft size={16} /> Home</a>
            <button className="uc-cta sm" onClick={go}>Get started <ArrowRight size={15} /></button>
          </div>
        </div>
      </header>

      <section className="uc-hero">
        <div className="uc-wrap">
          <div className="uc-badge" data-reveal>Use cases</div>
          <h1 data-reveal>Every kind of work.<br /><em>Guided in detail.</em></h1>
          <p data-reveal>Not just a to-do list. For each task, WorkCoPilot shows the exact step, exactly how to do it, and how to know it worked. Here is what that looks like, across the work people actually do.</p>
          <div className="uc-chips" data-reveal>
            {cases.map((c) => <a key={c.id} href={`#${c.id}`} className="uc-chip"><c.icon size={14} /> {c.tag}</a>)}
          </div>
        </div>
      </section>

      {cases.map((c, i) => (
        <section className={`uc-case${i % 2 ? ' alt' : ''}`} id={c.id} key={c.id}>
          <div className="uc-wrap uc-case-in">
            <div className="uc-case-copy" data-reveal>
              <span className={`uc-ic t-${c.tone}`}><c.icon size={24} /></span>
              <h2>{c.tag}</h2>
              <p>{c.blurb}</p>
              <ul className="uc-can">{c.can.map((x) => <li key={x}><Check size={15} /> {x}</li>)}</ul>
              <button className="uc-cta" onClick={go}>Guide me on this <ArrowRight size={15} /></button>
            </div>
            <div className="uc-case-graphic" data-reveal>
              <MiniGuide g={c.guide} tag={c.tag} />
            </div>
          </div>
        </section>
      ))}

      <section className="uc-final">
        <div className="uc-wrap" data-reveal>
          <AVMark size={44} />
          <h2>Your task is next.</h2>
          <p>Bring anything. WorkCoPilot takes it from the first step to done.</p>
          <button className="uc-cta big" onClick={go}>Get started <ArrowRight size={18} /></button>
        </div>
      </section>

      <footer className="uc-foot">
        <div className="uc-wrap uc-foot-in">
          <AdmireVedaLogo size={22} idSuffix="ucf" />
          <span>&copy; {new Date().getFullYear()} AdmireVeda &middot; WorkCoPilot is a product of AdmireVeda</span>
        </div>
      </footer>
      <LiveValidate theme="light" source="use-cases" go={(plan) => nav(`/workcopilot${plan ? `?plan=${plan}` : ''}`)} />
    </div>
  )
}

// A worked example graphic: the real shape of a guided step.
function MiniGuide({ g, tag }) {
  return (
    <div className="uc-mini">
      <div className="uc-mini-head"><span className="d r" /><span className="d y" /><span className="d g" /><b>WorkCoPilot</b><span className="uc-mini-tag">{tag.split(' ')[0]}</span></div>
      <div className="uc-mini-goal"><span>GOAL</span> {g.goal}</div>
      <div className="uc-mini-now">
        <div className="uc-mini-label">DO THIS NOW</div>
        <div className="uc-mini-step">{g.step}</div>
      </div>
      <div className="uc-mini-how">
        <div className="uc-mini-hl">EXACTLY HOW</div>
        <ol>{g.how.map((h, k) => <li key={k}>{h}</li>)}</ol>
      </div>
      {g.cmd && <div className="uc-mini-term"><div className="uc-mini-th">TERMINAL <span>Copy</span></div><code>{g.cmd}</code></div>}
      <div className="uc-mini-done"><Check size={13} /> done when {g.done}</div>
    </div>
  )
}

const CSS = `
/* Light theme - matches the rest of the site. The WorkCoPilot "screen" mockup
   (.uc-mini) re-scopes dark vars below so it stays a dark device screenshot. */
.uc{--ink:#f4f7fb;--panel:#ffffff;--line:#e2e7f0;--tx:#0c1222;--mut:#3f4a5c;--em:#0a9d66;--em2:#0a86cf;--warm:#ff9a4d;--warm2:#f26a43;--ink-brand:#062a22;
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
.uc [data-reveal]{opacity:0;transform:translateY(22px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.uc [data-reveal].in{opacity:1;transform:none}

.uc-nav{position:sticky;top:0;z-index:40;backdrop-filter:blur(16px);background:rgba(255,255,255,.72);border-bottom:1px solid var(--line)}
.uc-nav-in{display:flex;align-items:center;gap:16px;height:68px}
.uc-navcta{margin-left:auto;display:flex;align-items:center;gap:16px}
.uc-back{display:inline-flex;align-items:center;gap:5px;color:var(--mut);font-size:15px}.uc-back:hover{color:var(--tx)}
.uc-cta{background:linear-gradient(135deg,var(--warm),var(--warm2));color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 12px 34px -12px rgba(255,122,89,.6);transition:transform .15s}
.uc-cta:hover{transform:translateY(-2px)}.uc-cta.sm{padding:9px 15px;font-size:14px}.uc-cta.big{padding:16px 28px;font-size:17px}

.uc-hero{padding:72px 0 30px;text-align:center}
.uc-badge{display:inline-block;font-size:13px;color:var(--em);border:1px solid rgba(140,245,196,.3);background:rgba(140,245,196,.07);padding:6px 14px;border-radius:999px;margin-bottom:22px}
.uc-hero h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(38px,6vw,64px);line-height:1.02;letter-spacing:-.03em;margin:0 0 20px}
.uc-hero p{color:var(--mut);font-size:19px;max-width:62ch;margin:0 auto 26px}
.uc-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:760px;margin:0 auto}
.uc-chip{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;color:var(--mut);border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:8px 14px;box-shadow:0 1px 2px rgba(17,23,38,.04);transition:color .2s,border-color .2s}
.uc-chip:hover{color:var(--tx);border-color:rgba(140,245,196,.4)}
.uc-chip svg{color:var(--em)}

.uc-case{padding:60px 0;border-top:1px solid var(--line)}
.uc-case-in{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.uc-case.alt .uc-case-copy{order:2}
.uc-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,rgba(140,245,196,.2),rgba(57,211,255,.12));color:var(--em);margin-bottom:18px;box-shadow:0 0 28px -8px rgba(140,245,196,.55)}
.uc-ic.t-c{color:var(--warm);background:linear-gradient(135deg,rgba(255,179,92,.2),rgba(255,122,89,.12))}
.uc-ic.t-d{color:#b98cff;background:linear-gradient(135deg,rgba(185,140,255,.22),rgba(57,211,255,.12))}
.uc-ic.t-e{color:#ff7a9c;background:linear-gradient(135deg,rgba(255,122,156,.22),rgba(255,179,92,.12))}
.uc-case h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(26px,3.4vw,38px);letter-spacing:-.02em;margin:0 0 14px}
.uc-case-copy p{color:var(--mut);font-size:17px;margin:0 0 20px;max-width:46ch}
.uc-can{list-style:none;padding:0;margin:0 0 24px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.uc-can li{display:flex;gap:8px;align-items:flex-start;color:var(--tx);font-size:14.5px}
.uc-can li svg{color:var(--em);flex-shrink:0;margin-top:3px}

/* mini guide graphic */
.uc-mini{--tx:#eef1f8;--mut:#9aa6ba;--line:rgba(255,255,255,.12);--em:#8cf5c4;--em2:#5bd0ff;color:var(--tx);background:linear-gradient(180deg,#12141d,#0b0f1c);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:16px;box-shadow:0 44px 90px -42px rgba(10,20,45,.5),inset 0 1px 0 rgba(255,255,255,.05)}
.uc-mini-head{display:flex;align-items:center;gap:7px;font-size:13px;padding:2px 4px 12px}
.uc-mini-head b{font-family:"Bricolage Grotesque";margin-left:6px}
.uc-mini-head .d{width:9px;height:9px;border-radius:50%}
.d.r{background:#ff5f57}.d.y{background:#febc2e}.d.g{background:#28c840}
.uc-mini-tag{margin-left:auto;font-size:11px;color:var(--em);border:1px solid rgba(140,245,196,.3);border-radius:999px;padding:2px 10px}
.uc-mini-goal{font-size:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:11px;padding:10px 12px}
.uc-mini-goal span{font-size:10px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-right:8px}
.uc-mini-now{margin-top:10px;border:1px solid rgba(140,245,196,.35);background:rgba(140,245,196,.06);border-radius:12px;padding:12px}
.uc-mini-label{font-size:10px;letter-spacing:.14em;color:var(--em);font-weight:700;margin-bottom:4px}
.uc-mini-step{font-weight:600}
.uc-mini-how{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:11px 13px;background:rgba(255,255,255,.02)}
.uc-mini-hl{font-size:10px;letter-spacing:.14em;color:var(--em2);font-weight:700;margin-bottom:8px}
.uc-mini-how ol{margin:0;padding:0;list-style:none;counter-reset:h;display:flex;flex-direction:column;gap:8px}
.uc-mini-how li{counter-increment:h;position:relative;padding-left:26px;font-size:13.5px;color:var(--tx);line-height:1.5}
.uc-mini-how li:before{content:counter(h);position:absolute;left:0;top:0;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,rgba(140,245,196,.25),rgba(57,211,255,.18));color:var(--em);font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.uc-mini-term{margin-top:10px;border:1px solid #27324a;border-radius:11px;overflow:hidden}
.uc-mini-th{display:flex;justify-content:space-between;background:#0c1222;color:#8ea3c0;font-size:10px;letter-spacing:.1em;padding:7px 10px}.uc-mini-th span{color:#cdd6e5}
.uc-mini-term code{display:block;background:#0c1222;color:#d6e9d6;font-family:"JetBrains Mono",monospace;font-size:12px;padding:10px;overflow-x:auto;white-space:nowrap}
.uc-mini-done{display:flex;align-items:center;gap:7px;margin-top:11px;font-size:12px;color:var(--mut)}.uc-mini-done svg{color:var(--em)}

.uc-final{padding:90px 0;text-align:center;border-top:1px solid var(--line);background:radial-gradient(60% 130% at 50% 0%,rgba(140,245,196,.08),transparent)}
.uc-final h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(30px,5vw,48px);letter-spacing:-.02em;margin:16px 0 12px}
.uc-final p{color:var(--mut);font-size:18px;margin:0 0 26px}
.uc-foot{border-top:1px solid var(--line);padding:26px 0}
.uc-foot-in{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.uc-foot-in span{color:var(--mut);flex:1;font-size:13px}

@media(max-width:860px){
 .uc-case-in{grid-template-columns:1fr;gap:28px}
 .uc-case.alt .uc-case-copy{order:0}
 .uc-can{grid-template-columns:1fr}
}
`
