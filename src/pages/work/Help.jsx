// How-to / help page (/work/help). The visuals (HelpFlow, HelpGuideShot,
// HelpRedactShot) and HelpDocs are moved verbatim from WorkPage.jsx. Rendered
// inside the shared WorkAppLayout shell; "Start a task" navigates to the wizard.
// i18n: every visible string, alt, aria-label and SVG label reads from the
// `helpPage` namespace (src/i18n/locales/en/helpPage.js); the per-dashboard
// how-tos read `dashboardsHelp.*`. Lists are keyed arrays rendered through
// renderRich so inline <b> stays markup (never HTML). Commands, code, image
// paths and the [REDACTED] token are not copy and stay literal.
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ShieldCheck, Printer, Sparkles, Zap, AppWindow } from 'lucide-react'
import { useWorkApp } from './WorkAppContext.jsx'
import { useT, renderRich } from '../../i18n/index.jsx'
// Role-aware help for every dashboard (own module; the entries + their
// screenshots live in help/DashboardsHelp.jsx, gated by the viewer's role).
import DashboardsHelp, { dashboardHelpFor, dashboardHelpLabel } from './help/DashboardsHelp.jsx'

function HelpFlow() {
  const t = useT()
  return (
    <figure className="wd-hf-fig">
      <img className="wd-hf-img" src="/help-how-it-works.webp" width="1720" height="960" loading="lazy" alt={t('helpPage.flowAlt')} />
    </figure>
  )
}
// A minimal mockup of the guiding card: the current step + the exact code to use.
function HelpGuideShot() {
  const t = useT()
  return (
    <figure className="wd-fig">
      <svg className="wd-shot" viewBox="0 0 440 226" role="img" aria-label={t('helpPage.guideShot.aria')} xmlns="http://www.w3.org/2000/svg" fontFamily="'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif">
        <rect x="1" y="1" width="438" height="224" rx="16" fill="#ffffff" stroke="#e7eaf2" />
        <rect x="18" y="17" width="104" height="22" rx="11" fill="#eafaf3" stroke="#bde9d5" />
        <circle cx="31" cy="28" r="3.2" fill="#0e9f6e" />
        <text x="41" y="32" fontSize="10" fontWeight="700" fill="#0b7a53">{t('helpPage.guideShot.nowDoThis')}</text>
        <text x="134" y="32" fontSize="11" fill="#8a90a6">{t('helpPage.guideShot.stepOf')}</text>
        <text x="18" y="60" fontSize="13.5" fontWeight="700" fill="#1b2033">{t('helpPage.guideShot.stepTitle')}</text>
        <rect x="18" y="74" width="404" height="92" rx="10" fill="#0c1222" />
        <circle cx="34" cy="90" r="3.4" fill="#ff5f57" /><circle cx="46" cy="90" r="3.4" fill="#febc2e" /><circle cx="58" cy="90" r="3.4" fill="#28c840" />
        <text x="372" y="94" fontSize="9.5" fill="#6b7280" fontFamily="Consolas,monospace">{t('helpPage.guideShot.terminal')}</text>
        <text x="30" y="120" fontSize="11.5" fill="#86efac" fontFamily="Consolas,monospace">$ sfdx force:apex:class:create -n Sample</text>
        <text x="30" y="140" fontSize="11.5" fill="#d6e9d6" fontFamily="Consolas,monospace">public class Sample {'{ /* ... */ }'}</text>
        <rect x="18" y="182" width="108" height="30" rx="9" fill="#0e9f6e" />
        <path d="M34 197 l4 4 l8 -8" stroke="#ffffff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="52" y="201" fontSize="12" fontWeight="700" fill="#ffffff">{t('helpPage.guideShot.markDone')}</text>
        <rect x="134" y="182" width="92" height="30" rx="9" fill="#f1f3fa" stroke="#e2e6f1" />
        <text x="151" y="201" fontSize="12" fill="#5c6484">{t('helpPage.guideShot.hideHow')}</text>
      </svg>
      <figcaption className="wd-figcap">{t('helpPage.guideShot.caption')}</figcaption>
    </figure>
  )
}
// A minimal mockup of on-device redaction: sensitive values become [REDACTED].
function HelpRedactShot() {
  const t = useT()
  return (
    <figure className="wd-fig">
      <svg className="wd-shot" viewBox="0 0 440 200" role="img" aria-label={t('helpPage.redactShot.aria')} xmlns="http://www.w3.org/2000/svg" fontFamily="'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif">
        <rect x="1" y="1" width="438" height="198" rx="14" fill="#ffffff" stroke="#e7eaf2" />
        <path d="M1 15 a14 14 0 0 1 14 -14 h410 a14 14 0 0 1 14 14 v16 h-438 z" fill="#f6f8fd" />
        <circle cx="20" cy="16" r="4" fill="#e2e6f1" /><circle cx="34" cy="16" r="4" fill="#e2e6f1" /><circle cx="48" cy="16" r="4" fill="#e2e6f1" />
        <rect x="70" y="9" width="300" height="14" rx="7" fill="#eef1f7" />
        <text x="22" y="58" fontSize="12.5" fill="#1b2033">{t('helpPage.redactShot.account')}</text>
        <text x="22" y="84" fontSize="12.5" fill="#5c6484">{t('helpPage.redactShot.email')}</text>
        <rect x="66" y="72" width="118" height="17" rx="4" fill="#fdeadb" stroke="#f1c7a3" />
        <text x="74" y="85" fontSize="10" fontWeight="700" fill="#c85a16" fontFamily="Consolas,monospace">[REDACTED]</text>
        <text x="22" y="110" fontSize="12.5" fill="#5c6484">{t('helpPage.redactShot.apiKey')}</text>
        <rect x="76" y="98" width="118" height="17" rx="4" fill="#fdeadb" stroke="#f1c7a3" />
        <text x="84" y="111" fontSize="10" fontWeight="700" fill="#c85a16" fontFamily="Consolas,monospace">[REDACTED]</text>
        <rect x="18" y="150" width="404" height="34" rx="9" fill="#eafaf3" stroke="#bde9d5" />
        <path d="M37 158 l7 -3 l7 3 v7 c0 5 -3.5 8.5 -7 10.5 c-3.5 -2 -7 -5.5 -7 -10.5 z" fill="#0e9f6e" />
        <text x="58" y="171" fontSize="11.5" fill="#0b7a53">{t('helpPage.redactShot.note')}</text>
      </svg>
      <figcaption className="wd-figcap">{t('helpPage.redactShot.caption')}</figcaption>
    </figure>
  )
}
// Section anchors in reading order; the nav label of each is helpPage.nav.<id>.
const HELP_SECTION_IDS = ['flow', 'start', 'how', 'styles', 'ask', 'deep', 'float', 'where', 'time', 'record', 'safe', 'faq']
const DESKTOP_SECTION_IDS = ['desktop', 'desktopsec', 'desktopfaq']
// The four "on screen" steps: copy under helpPage.flow.steps.<k>, image here.
const FLOW_STEPS = [
  { k: 'start', src: '/help/user/start-task.png', w: 912, h: 584 },
  { k: 'follow', src: '/help/user/do-this-now.png', w: 670, h: 613 },
  { k: 'tools', src: '/help/user/tools-menu.png', w: 344, h: 761, cls: 'tall' },
  { k: 'answer', src: '/help/user/answer.png', w: 684, h: 968, cls: 'mid' },
]
// A keyed list: the array under `k` translates as a unit; inline <b> stays markup.
function RichList({ t, k, ordered = false, className }) {
  const items = t(k)
  const rows = (Array.isArray(items) ? items : []).map((s, i) => <li key={i}>{renderRich(s)}</li>)
  return ordered ? <ol className={className}>{rows}</ol> : <ul className={className}>{rows}</ul>
}
// A keyed FAQ: an array of { q, a } under `k`.
function Faq({ t, k }) {
  const items = t(k)
  return (Array.isArray(items) ? items : []).map((f, i) => <div key={i} className="wd-faq"><b>{f.q}</b><p>{renderRich(f.a)}</p></div>)
}
function HelpDocs({ onStart, roleView }) {
  const t = useT()
  const desktop = typeof window !== 'undefined' ? !!window.workDesktop : false
  // In the desktop app, lead with desktop-specific guidance + its own security
  // and safety FAQ, then the shared how-to. The per-dashboard how-tos (role
  // gated) sit right after the main flow, before the deeper guide.
  const nav = (id) => ({ id, label: t('helpPage.nav.' + id) })
  const dash = dashboardHelpFor(roleView).map((s) => ({ id: s.id, label: dashboardHelpLabel(t, s) }))
  const base = [nav(HELP_SECTION_IDS[0]), ...dash, ...HELP_SECTION_IDS.slice(1).map(nav)]
  const sections = desktop ? [...DESKTOP_SECTION_IDS.map(nav), ...base] : base
  const [active, setActive] = useState(sections[0].id)
  const navRef = useRef(null)
  const jump = (id) => { setActive(id); const el = document.getElementById('help-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  // Narrow layout: the section list is one horizontally scrollable chip row, so
  // keep the active chip in view as the reader scrolls (horizontal scroll only;
  // never scrollIntoView, which would also yank the page vertically).
  useEffect(() => {
    const nav = navRef.current
    if (!nav || nav.scrollWidth <= nav.clientWidth) return
    const btn = nav.querySelector('button.on')
    if (!btn) return
    const left = btn.offsetLeft, right = left + btn.offsetWidth
    if (left < nav.scrollLeft) nav.scrollTo({ left: Math.max(0, left - 12), behavior: 'smooth' })
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: right - nav.clientWidth + 12, behavior: 'smooth' })
  }, [active])
  // "More to the right" affordance for the chip row: data-more drives a CSS
  // edge fade, so a chip cut by the row's edge reads as scrollable, not clipped.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    const update = () => { nav.dataset.more = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2 ? '1' : '0' }
    update()
    nav.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { nav.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
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
  }, [sections.length])   // eslint-disable-line
  return (
    <div className="wd-help">
      <aside className="wd-help-nav" ref={navRef} aria-label={t('helpPage.nav.aria')}>
        <div className="wd-help-navlabel">{t('helpPage.nav.label')}</div>
        {sections.map((s) => <button key={s.id} className={active === s.id ? 'on' : ''} aria-current={active === s.id ? 'true' : undefined} onClick={() => jump(s.id)}>{s.label}</button>)}
        {(!roleView || roleView.canStart) && <button className="wd-help-start" onClick={onStart}><Play size={13} /> {t('helpPage.startTask')}</button>}
      </aside>
      <div className="wd-help-body">
        <h1>{desktop ? t('helpPage.titleDesktop') : t('helpPage.title')}</h1>
        <p className="wd-help-lead">{t('helpPage.lead')}</p>
        <HelpFlow />

        {/* The main flow on real screens: start a task, the guiding console,
            Tools, the Answer card. Static screenshots under /help/user/. */}
        <section id="help-flow"><h2>{t('helpPage.flow.h2')}</h2>
          <p>{t('helpPage.flow.lead')}</p>
          <ol className="wd-hflow">
            {FLOW_STEPS.map((s) => (
              <li key={s.k}><b>{t('helpPage.flow.steps.' + s.k + '.t')}</b><span>{t.rich('helpPage.flow.steps.' + s.k + '.d')}</span>
                <img className={s.cls} src={s.src} width={s.w} height={s.h} loading="lazy" decoding="async" alt={t('helpPage.flow.steps.' + s.k + '.alt')} /></li>
            ))}
          </ol>
        </section>

        {/* Every dashboard, with how-tos and screenshots; only the surfaces this role can open. */}
        <DashboardsHelp roleView={roleView} />

        {desktop && (<>
          <section id="help-desktop"><h2>{t('helpPage.desktop.h2')}</h2>
            <p>{t.rich('helpPage.desktop.lead')}</p>
            <h3 className="sub">{t('helpPage.desktop.modesH')}</h3>
            <RichList t={t} k="helpPage.desktop.modes" />
            <h3 className="sub">{t('helpPage.desktop.titleBarH')}</h3>
            <RichList t={t} k="helpPage.desktop.titleBar" />
            <h3 className="sub">{t('helpPage.desktop.shortcutsH')}</h3>
            <RichList t={t} k="helpPage.desktop.shortcuts" />
            <h3 className="sub">{t('helpPage.desktop.docsH')}</h3>
            <p>{t.rich('helpPage.desktop.docs')}</p>
          </section>

          <section id="help-desktopsec"><h2>{t('helpPage.desktopsec.h2')}</h2>
            <RichList t={t} k="helpPage.desktopsec.items" />
            <p className="wd-tip"><ShieldCheck size={14} /> {t('helpPage.desktopsec.tip')}</p>
          </section>

          <section id="help-desktopfaq"><h2>{t('helpPage.desktopfaq.h2')}</h2>
            <Faq t={t} k="helpPage.desktopfaq.items" />
          </section>
        </>)}

        <section id="help-start"><h2>{t('helpPage.start.h2')}</h2>
          <RichList t={t} k="helpPage.start.steps" ordered className="wd-steps" />
          <p className="wd-tip"><Sparkles size={14} /> {t('helpPage.start.tip')}</p>
        </section>

        <section id="help-how"><h2>{t('helpPage.how.h2')}</h2>
          <p>{t('helpPage.how.lead')}</p>
          <HelpGuideShot />
          <h3 className="sub">{t('helpPage.how.seeH')}</h3>
          <RichList t={t} k="helpPage.how.see" />
          <h3 className="sub">{t('helpPage.how.keepH')}</h3>
          <p>{t.rich('helpPage.how.keep')}</p>
        </section>

        <section id="help-styles"><h2>{t('helpPage.styles.h2')}</h2>
          <p>{t.rich('helpPage.styles.lead')}</p>
          <RichList t={t} k="helpPage.styles.items" />
        </section>

        <section id="help-ask"><h2>{t('helpPage.ask.h2')}</h2>
          <p>{t('helpPage.ask.lead')}</p>
          <RichList t={t} k="helpPage.ask.items" />
        </section>

        <section id="help-deep"><h2>{t('helpPage.deep.h2')}</h2>
          <p>{t.rich('helpPage.deep.body')}</p>
          <p className="wd-tip"><Zap size={14} /> {t('helpPage.deep.tip')}</p>
        </section>

        <section id="help-float"><h2>{t('helpPage.float.h2')}</h2>
          <p>{t.rich('helpPage.float.p1')}</p>
          <p>{t('helpPage.float.p2')}</p>
          <p className="wd-tip"><AppWindow size={14} /> {t('helpPage.float.tip')}</p>
        </section>

        <section id="help-where"><h2>{t('helpPage.where.h2')}</h2>
          <p>{t('helpPage.where.lead')}</p>
          <RichList t={t} k="helpPage.where.items" />
        </section>

        <section id="help-time"><h2>{t('helpPage.time.h2')}</h2>
          <p>{t.rich('helpPage.time.lead')}</p>
          <RichList t={t} k="helpPage.time.items" />
        </section>

        <section id="help-record"><h2>{t('helpPage.record.h2')}</h2>
          <p>{t.rich('helpPage.record.body')}</p>
          <HelpRedactShot />
          <p className="wd-tip"><Printer size={14} /> {t('helpPage.record.tip')}</p>
        </section>

        <section id="help-safe"><h2>{t('helpPage.safe.h2')}</h2>
          <p>{t('helpPage.safe.p1')}</p>
          <p>{t('helpPage.safe.p2')}</p>
        </section>

        <section id="help-faq"><h2>{t('helpPage.faq.h2')}</h2>
          <Faq t={t} k="helpPage.faq.items" />
        </section>

        {(!roleView || roleView.canStart) && <div className="wd-help-cta"><button className="wd-cta" onClick={onStart}><Play size={16} /> {t('helpPage.startTask')}</button></div>}
      </div>
    </div>
  )
}


// Route entry: renders the how-to guide inside the app shell. The old tab called
// HelpDocs with onStart={() => setTab('dashboard')}; the start affordance now
// routes to the dedicated Start-a-task page.
export default function Help() {
  const navigate = useNavigate()
  const { roleView } = useWorkApp()
  return <HelpDocs roleView={roleView} onStart={() => navigate('/work/start')} />
}
