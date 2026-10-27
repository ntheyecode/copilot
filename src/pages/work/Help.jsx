// How-to / help page (/work/help). The visuals (HelpFlow, HelpGuideShot,
// HelpRedactShot) and HelpDocs are moved verbatim from WorkPage.jsx. Rendered
// inside the shared WorkAppLayout shell; "Start a task" navigates to the wizard.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ShieldCheck, Printer, Sparkles, Zap, AppWindow } from 'lucide-react'

function HelpFlow() {
  return (
    <figure className="wd-hf-fig">
      <img className="wd-hf-img" src="/help-how-it-works.webp" width="1720" height="960" loading="lazy"
        alt="How WorkCoPilot works, in four steps: 1) Tell it your goal. 2) Follow the exact next move it shows on your screen - the click, the command or the code. 3) It catches and corrects a wrong move. 4) Keep going until done, with an audit trail and a clean report." />
    </figure>
  )
}
// A minimal mockup of the guiding card: the current step + the exact code to use.
function HelpGuideShot() {
  return (
    <figure className="wd-fig">
      <svg className="wd-shot" viewBox="0 0 440 226" role="img" aria-label="The guiding card shows the current step with the exact command or code to use, and a Mark done button." xmlns="http://www.w3.org/2000/svg" fontFamily="'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif">
        <rect x="1" y="1" width="438" height="224" rx="16" fill="#ffffff" stroke="#e7eaf2" />
        <rect x="18" y="17" width="104" height="22" rx="11" fill="#eafaf3" stroke="#bde9d5" />
        <circle cx="31" cy="28" r="3.2" fill="#0e9f6e" />
        <text x="41" y="32" fontSize="10" fontWeight="700" fill="#0b7a53">NOW, DO THIS</text>
        <text x="134" y="32" fontSize="11" fill="#8a90a6">Step 2 of 9</text>
        <text x="18" y="60" fontSize="13.5" fontWeight="700" fill="#1b2033">Create the Apex class in the Developer Console</text>
        <rect x="18" y="74" width="404" height="92" rx="10" fill="#0c1222" />
        <circle cx="34" cy="90" r="3.4" fill="#ff5f57" /><circle cx="46" cy="90" r="3.4" fill="#febc2e" /><circle cx="58" cy="90" r="3.4" fill="#28c840" />
        <text x="372" y="94" fontSize="9.5" fill="#6b7280" fontFamily="Consolas,monospace">TERMINAL</text>
        <text x="30" y="120" fontSize="11.5" fill="#86efac" fontFamily="Consolas,monospace">$ sfdx force:apex:class:create -n Sample</text>
        <text x="30" y="140" fontSize="11.5" fill="#d6e9d6" fontFamily="Consolas,monospace">public class Sample {'{ /* ... */ }'}</text>
        <rect x="18" y="182" width="108" height="30" rx="9" fill="#0e9f6e" />
        <path d="M34 197 l4 4 l8 -8" stroke="#ffffff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="52" y="201" fontSize="12" fontWeight="700" fill="#ffffff">Mark done</text>
        <rect x="134" y="182" width="92" height="30" rx="9" fill="#f1f3fa" stroke="#e2e6f1" />
        <text x="151" y="201" fontSize="12" fill="#5c6484">Hide how</text>
      </svg>
      <figcaption className="wd-figcap">The guiding card: one step at a time, with the exact command or code and a Mark done button.</figcaption>
    </figure>
  )
}
// A minimal mockup of on-device redaction: sensitive values become [REDACTED].
function HelpRedactShot() {
  return (
    <figure className="wd-fig">
      <svg className="wd-shot" viewBox="0 0 440 200" role="img" aria-label="Sensitive on-screen values are replaced with REDACTED on your device before anything is sent." xmlns="http://www.w3.org/2000/svg" fontFamily="'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif">
        <rect x="1" y="1" width="438" height="198" rx="14" fill="#ffffff" stroke="#e7eaf2" />
        <path d="M1 15 a14 14 0 0 1 14 -14 h410 a14 14 0 0 1 14 14 v16 h-438 z" fill="#f6f8fd" />
        <circle cx="20" cy="16" r="4" fill="#e2e6f1" /><circle cx="34" cy="16" r="4" fill="#e2e6f1" /><circle cx="48" cy="16" r="4" fill="#e2e6f1" />
        <rect x="70" y="9" width="300" height="14" rx="7" fill="#eef1f7" />
        <text x="22" y="58" fontSize="12.5" fill="#1b2033">Account: Acme Corp</text>
        <text x="22" y="84" fontSize="12.5" fill="#5c6484">Email</text>
        <rect x="66" y="72" width="118" height="17" rx="4" fill="#fdeadb" stroke="#f1c7a3" />
        <text x="74" y="85" fontSize="10" fontWeight="700" fill="#c85a16" fontFamily="Consolas,monospace">[REDACTED]</text>
        <text x="22" y="110" fontSize="12.5" fill="#5c6484">API key</text>
        <rect x="76" y="98" width="118" height="17" rx="4" fill="#fdeadb" stroke="#f1c7a3" />
        <text x="84" y="111" fontSize="10" fontWeight="700" fill="#c85a16" fontFamily="Consolas,monospace">[REDACTED]</text>
        <rect x="18" y="150" width="404" height="34" rx="9" fill="#eafaf3" stroke="#bde9d5" />
        <path d="M37 158 l7 -3 l7 3 v7 c0 5 -3.5 8.5 -7 10.5 c-3.5 -2 -7 -5.5 -7 -10.5 z" fill="#0e9f6e" />
        <text x="58" y="171" fontSize="11.5" fill="#0b7a53">Redacted on your device - only the scrubbed text is ever sent.</text>
      </svg>
      <figcaption className="wd-figcap">Governance on: sensitive values are stripped on your device before anything leaves it.</figcaption>
    </figure>
  )
}
const HELP_SECTIONS = [
  { id: 'flow', t: 'On screen' },
  { id: 'start', t: 'Getting started' },
  { id: 'how', t: 'How guidance works' },
  { id: 'styles', t: 'Guide styles' },
  { id: 'ask', t: 'Ask, Analyze & Research' },
  { id: 'deep', t: 'Deep pass' },
  { id: 'float', t: 'The floating overlay' },
  { id: 'where', t: 'Desktop, mobile & browser' },
  { id: 'time', t: 'Your time & pausing' },
  { id: 'record', t: 'Keeping a record' },
  { id: 'safe', t: 'Safety & acceptable use' },
  { id: 'faq', t: 'FAQ' },
]
function HelpDocs({ onStart }) {
  const desktop = typeof window !== 'undefined' ? !!window.workDesktop : false
  // In the desktop app, lead with desktop-specific guidance + its own security
  // and safety FAQ, then the shared how-to.
  const sections = desktop
    ? [{ id: 'desktop', t: 'The desktop app' }, { id: 'desktopsec', t: 'Security & safety (desktop)' }, { id: 'desktopfaq', t: 'Desktop FAQ' }, ...HELP_SECTIONS]
    : HELP_SECTIONS
  const [active, setActive] = useState(sections[0].id)
  const jump = (id) => { setActive(id); const el = document.getElementById('help-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = sections.map((s) => document.getElementById('help-' + s.id)).filter(Boolean)
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id.replace('help-', ''))
    }, { rootMargin: '-82px 0px -62% 0px', threshold: 0 })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])   // eslint-disable-line
  return (
    <div className="wd-help">
      <aside className="wd-help-nav">
        <div className="wd-help-navlabel">How-to guide</div>
        {sections.map((s) => <button key={s.id} className={active === s.id ? 'on' : ''} aria-current={active === s.id ? 'true' : undefined} onClick={() => jump(s.id)}>{s.t}</button>)}
        <button className="wd-help-start" onClick={onStart}><Play size={13} /> Start a task</button>
      </aside>
      <div className="wd-help-body">
        <h1>{desktop ? 'How to use the WorkCoPilot desktop app' : 'How to use WorkCoPilot'}</h1>
        <p className="wd-help-lead">An expert that watches your screen, tells you the exact next move one step at a time, catches a wrong move and corrects it, and keeps you on the next correct step until the job is done. Here is everything it does and how to get the most from it.</p>
        <HelpFlow />

        {/* The main flow on real screens: start a task, the guiding console,
            Tools, the Answer card. Static screenshots under /help/user/. */}
        <section id="help-flow"><h2>On screen: the main flow</h2>
          <p>Four screens, from your goal to the answer. Everything else in this guide builds on them.</p>
          <ol className="wd-hflow">
            <li><b>Start a task</b><span>Name the plan, write the goal in your own words, press <b>Start guiding me</b>.</span>
              <img src="/help/user/start-task.png" width="912" height="584" loading="lazy" decoding="async" alt="The Start a task box on the Dashboard: a plan name, the goal, and the Start guiding me button." /></li>
            <li><b>Follow Now, do this</b><span>One step at a time, with the exact command and a Copy button. The plan sits on the left; finished steps tick off as it sees them done.</span>
              <img src="/help/user/do-this-now.png" width="670" height="613" loading="lazy" decoding="async" alt="The Now, do this card in the guiding console: the current step, the terminal command with Copy, and how to do it." /></li>
            <li><b>Open Tools</b><span>Make something (Answer, Write, Compute), read the screen, Deep pass, re-plan, the full guide, text size and theme.</span>
              <img className="tall" src="/help/user/tools-menu.png" width="344" height="761" loading="lazy" decoding="async" alt="The Tools menu: Answer, Write, Compute, Read my screen, Deep pass, View full plan, Re-plan, Full guide, text size, accent color and dark mode." /></li>
            <li><b>Get the answer</b><span>Tools, then <b>Answer</b>, then <b>Get the result</b>. The card gives the result, its confidence, how it got it, how to verify it, and any company policy flags.</span>
              <img className="mid" src="/help/user/answer.png" width="684" height="968" loading="lazy" decoding="async" alt="The Answer card: the result, a confidence meter, how I got it, verify by, the security check and company policy flags." /></li>
          </ol>
        </section>

        {desktop && (<>
          <section id="help-desktop"><h2>The desktop app</h2>
            <p>The desktop app is a quiet overlay that floats over whatever you are working in. It runs <b>read-only</b> - it shows the next move, it never clicks, types or runs anything for you.</p>
            <h3 className="sub">Two modes</h3>
            <ul>
              <li><b>Planning</b> - a normal, resizable window (expand it to full screen) for setting your goal, answering the quick scoping questions and adding documents. It does not sit on top of other windows here.</li>
              <li><b>Guiding</b> - once a plan starts it becomes a compact overlay that floats on top of your work, with see-through and click-behind so you can work underneath it.</li>
              <li><b>Buddy</b> - minimize and it shrinks to a small card that keeps the current step in view. Bring it back any time.</li>
            </ul>
            <h3 className="sub">The title bar (after you sign in)</h3>
            <ul>
              <li><b>On top</b> - keep the window above everything else.</li>
              <li><b>Hidden / On share</b> - hide the window from screen shares and recordings (on by default), or reveal it when you want to show it.</li>
              <li><b>See-through</b> - cycle the window's transparency so the work behind shows through.</li>
              <li><b>Click-behind</b> (while guiding) - let your clicks pass straight to the app underneath. The title bar itself still takes clicks, so you can always turn it off again there (or with Ctrl+Shift+Alt+W).</li>
              <li><b>Buddy</b> - shrink to the buddy card.</li>
            </ul>
            <h3 className="sub">Keyboard shortcuts</h3>
            <ul>
              <li><b>Ctrl+Shift+Alt+H</b> hide / show &middot; <b>Ctrl+Shift+Alt+S</b> hide-from-share &middot; <b>Ctrl+Shift+Alt+T</b> on top</li>
              <li><b>Ctrl+Shift+Alt+O</b> see-through &middot; <b>Ctrl+Shift+Alt+W</b> click-behind &middot; <b>Ctrl+Shift+Alt+B</b> buddy &middot; <b>Ctrl+Shift+Alt+M</b> choose monitor</li>
            </ul>
            <h3 className="sub">Your own documents &amp; diagrams</h3>
            <p>On the goal card, use <b>Add documents</b> to ground the plan in your own material - PDFs, Word, text, and <b>diagrams or screenshots</b> (read on your device). The file stays on your machine; only the extracted, governed text is used to plan.</p>
          </section>

          <section id="help-desktopsec"><h2>Security &amp; safety (desktop)</h2>
            <ul>
              <li><b>Read-only by design.</b> It never clicks, types, runs commands or changes anything. You stay in control of every action.</li>
              <li><b>Hidden from screen shares.</b> The overlay is content-protected by default, so it stays out of Zoom / Teams / Meet shares and recordings. Toggle it with <b>On share</b> or Ctrl+Shift+Alt+S when you want it visible.</li>
              <li><b>Your documents stay on your computer.</b> Files you add are read on your device. The raw file is never uploaded, and the text is not stored on our servers - it is used only to plan that session.</li>
              <li><b>Least data leaves.</b> To guide you, downscaled screen frames and the governed text go to the AI service (ours, or your company's own key). When governance is on, sensitive values are stripped or tokenized <b>before</b> anything is sent, and rebuilt on your device.</li>
              <li><b>Signed &amp; updated safely.</b> The app is code-signed (COE Security) and updates are delivered over HTTPS.</li>
            </ul>
            <p className="wd-tip"><ShieldCheck size={14} /> These are controls and audit evidence that support your compliance (GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, CCPA). They do not, by themselves, make you certified.</p>
          </section>

          <section id="help-desktopfaq"><h2>Desktop FAQ</h2>
            <div className="wd-faq"><b>Can people on a call see the overlay?</b><p>No, not while it is hidden (the default). It is excluded from screen capture and recording. Press Ctrl+Shift+Alt+S or the On share button if you deliberately want to show it.</p></div>
            <div className="wd-faq"><b>Does my diagram or document get uploaded?</b><p>No. On the desktop app the file is read on your computer. Only the governed text is sent to plan, and it is not stored on our servers.</p></div>
            <div className="wd-faq"><b>Will it do things on my machine?</b><p>Never. It is read-only. It reads the screen and tells you the next step; you perform every action yourself.</p></div>
            <div className="wd-faq"><b>How do I keep it out of the way?</b><p>Use See-through and Click-behind while guiding, minimize to the Buddy card, or Ctrl+Shift+Alt+H to hide it entirely. It keeps working while minimized.</p></div>
            <div className="wd-faq"><b>I turned on Click-behind and now I cannot click WorkCoPilot.</b><p>That is Click-behind doing its job: your clicks go to the app underneath. Move the mouse over the WorkCoPilot title bar, which always takes clicks, and press Click-behind there, or press Ctrl+Shift+Alt+W.</p></div>
            <div className="wd-faq"><b>It says it cannot reach WorkCoPilot.</b><p>The app needs a connection to the WorkCoPilot server. Check your internet, VPN or proxy. The window retries on its own and opens the console as soon as the server answers; Retry now and Close are always there.</p></div>
            <div className="wd-faq"><b>Does it update itself?</b><p>Yes. It checks for a signed update over HTTPS on launch and installs it on the next restart.</p></div>
          </section>
        </>)}

        <section id="help-start"><h2>Getting started</h2>
          <ol className="wd-steps">
            <li>On the <b>Dashboard</b>, type what you want to get done in <b>Your goal</b>, or pick a space to start from. You can paste a whole ticket, a requirement, or an error message.</li>
            <li>Press <b>Start guiding me</b>. WorkCoPilot reads the goal, plans the task, and asks to read your screen.</li>
            <li>Allow screen sharing. Choose <b>your whole screen</b> so it can guide you through other apps, not just this tab.</li>
            <li>Follow the <b>DO THIS NOW</b> step. As your screen changes, the next step appears on its own.</li>
          </ol>
          <p className="wd-tip"><Sparkles size={14} /> First time only: set up your AI in the box on the Dashboard. It is what reads your screen. After that, it just works.</p>
        </section>

        <section id="help-how"><h2>How guidance works</h2>
          <p>WorkCoPilot reads your screen and tells you the exact next move. It does not click or type for you, so you stay in control the whole time. It starts from the very beginning, opening the right page and signing in, and assumes nothing.</p>
          <HelpGuideShot />
          <h3 className="sub">What you see</h3>
          <ul>
            <li><b>DO THIS NOW</b> shows the current step, rewritten for exactly what is on your screen right now.</li>
            <li>Exact <b>commands, code and links</b> come copy-ready, each with a Copy button that works on the page and in the floating window.</li>
            <li>The <b>checklist</b> shows the whole plan. Finished steps tick off by themselves as it sees them done.</li>
          </ul>
          <h3 className="sub">How it keeps up</h3>
          <p>It watches in downscaled frames and only looks closely when the screen actually changes, so an idle screen uses almost nothing. When it sees you take a wrong turn, it says so and corrects the step. You can press <b>Re-plan</b> at any time to rebuild the steps from what is on screen now.</p>
        </section>

        <section id="help-styles"><h2>Guide styles</h2>
          <p>Pick the depth that fits you from the <b>Guide style</b> menu. You can switch styles mid-task.</p>
          <ul>
            <li><b>Step by step</b> - one action at a time with the exact command, each confirmed before the next.</li>
            <li><b>Very beginner</b> - everything spelled out, every click and keystroke, with jargon explained in plain words.</li>
            <li><b>Architect level</b> - design, trade-offs and best practices, written for someone experienced who wants the why.</li>
            <li><b>Problem solving</b> - debug together: read the error, test one idea at a time, and narrow down the cause.</li>
          </ul>
        </section>

        <section id="help-ask"><h2>Ask, Analyze and Research</h2>
          <p>Three things you can do at any point in a task, without losing your place:</p>
          <ul>
            <li><b>Ask</b> - type a question about what is on screen and get a direct answer, grounded in what it can see.</li>
            <li><b>Analyze</b> (called <b>Photo</b> on mobile) - takes one screenshot now and reads it against your goal. Add a focus note to point it at the part you care about.</li>
            <li><b>Research</b> - looks up the latest on the web, then answers. It runs only when you tap it, so nothing happens behind your back.</li>
          </ul>
        </section>

        <section id="help-deep"><h2>Deep pass</h2>
          <p>Hit a hard spot? Tap <b>Deep pass</b>. It runs that one screenshot with more reasoning, folds the result back into your steps, then carries on at normal speed. It is a one-time boost, not a mode you have to turn off. WorkCoPilot also does this on its own when a step gets tricky, so you rarely need to ask.</p>
          <p className="wd-tip"><Zap size={14} /> Reach for Deep pass when a step is ambiguous, an error is unfamiliar, or the screen does not match what you expected.</p>
        </section>

        <section id="help-float"><h2>The floating overlay</h2>
          <p>Tap <b>Float on top</b> to pop the guide into a small always-on-top window, so you never switch tabs while you work. Move and resize it freely. Use the sun and moon to switch light or dark, and the percentage control to dim it so it stays out of the way.</p>
          <p>On Chrome, Edge, Brave and Opera the float sits on top of every app. On Firefox and Safari it opens as a separate pop-out window instead, which you can still move anywhere.</p>
          <p className="wd-tip"><AppWindow size={14} /> Keep the WorkCoPilot tab open while you use the float. It can sit in the background, that is fine.</p>
        </section>

        <section id="help-where"><h2>Desktop, mobile and browser</h2>
          <p>Every way to run WorkCoPilot is included in one subscription. Use whichever fits the moment.</p>
          <ul>
            <li><b>Browser</b> - nothing to install, works even on locked-down machines. Share your whole screen to be guided through any app. You are using this one now.</li>
            <li><b>Desktop app</b> - a true overlay with see-through and click-behind, and it hides itself from screen shares, so people on a call do not see it.</li>
            <li><b>Mobile app</b> - point your phone camera at a screen, a device or paper, and get guided. Tap <b>Photo</b> to ask about what the camera sees, or let it watch live.</li>
          </ul>
        </section>

        <section id="help-time"><h2>Your time and pausing</h2>
          <p>Your plan gives you hours of live guidance each day, counted only while it is actively guiding, never while idle. The <b>min left</b> badge at the top shows how much time remains today, and it turns amber to warn you before you run low.</p>
          <ul>
            <li>Tap <b>Pause</b> to freeze the clock and your session while you step away or do other work, then <b>Resume</b> when you are back.</li>
            <li>Daily minutes reset at <b>11:59 PM ET</b>.</li>
            <li>Purchased top-up time never expires and is used only after your daily minutes are gone.</li>
            <li>Need more now? Use <b>Add time</b> at the top of the Dashboard.</li>
          </ul>
        </section>

        <section id="help-record"><h2>Keeping a record</h2>
          <p>Every session can be saved as a clean record: the task, what was achieved, every confirmed step with its exact commands and code, any warnings, and your questions and answers. Use <b>Download</b> to choose the format - a <b>PDF report</b>, a plain-<b>text report</b>, or the full <b>audit log</b> - or <b>Print</b> for a paper copy. Commands and code appear only for steps you actually completed, and the report includes up to five <b>scrubbed milestone screenshots</b> as evidence.</p>
          <HelpRedactShot />
          <p className="wd-tip"><Printer size={14} /> The report is handy as a runbook for next time, or to hand to a teammate who needs to do the same task. Every screenshot is redacted on your device before capture - only the scrubbed image is ever stored.</p>
        </section>

        <section id="help-safe"><h2>Safety and acceptable use</h2>
          <p>WorkCoPilot supports lawful, legitimate work only. It will not help build weapons or means of mass harm, create malware or exploits, break into systems or accounts you do not own, or do anything illegal. Those requests are declined when you set the goal.</p>
          <p>It reads your screen to guide you and never acts for you. It does not click, type, or submit anything on your behalf, so you decide every action.</p>
        </section>

        <section id="help-faq"><h2>FAQ</h2>
          <div className="wd-faq"><b>Do I need to install anything?</b><p>No. It runs in your browser. Install the desktop or mobile app only if you want the extra overlay or camera features.</p></div>
          <div className="wd-faq"><b>Will people on a call see the overlay?</b><p>If you share your whole screen in the browser, yes. The desktop app hides itself from screen shares.</p></div>
          <div className="wd-faq"><b>Does it work for non-technical work?</b><p>Yes. Finance, marketing, legal, office, product, anything that happens on a screen.</p></div>
          <div className="wd-faq"><b>What if the steps are wrong for my screen?</b><p>It re-reads your screen and corrects as you go. Press <b>Read my screen</b> anytime to take a fresh screenshot, verify the current step and move on, or <b>Re-plan</b> to rebuild the steps.</p></div>
          <div className="wd-faq"><b>Does it type or click for me?</b><p>No. It only reads and guides. You stay in control of every action.</p></div>
          <div className="wd-faq"><b>What does it do with my screen?</b><p>Frames are downscaled and read only to guide the task. An unchanged screen is not sent at all.</p></div>
        </section>

        <div className="wd-help-cta"><button className="wd-cta" onClick={onStart}><Play size={16} /> Start a task</button></div>
      </div>
    </div>
  )
}


// Route entry: renders the how-to guide inside the app shell. The old tab called
// HelpDocs with onStart={() => setTab('dashboard')}; the start affordance now
// routes to the dedicated Start-a-task page.
export default function Help() {
  const navigate = useNavigate()
  return <HelpDocs onStart={() => navigate('/work/start')} />
}
