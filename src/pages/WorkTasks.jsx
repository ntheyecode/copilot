import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Play, Pause, Download, Loader2, AlertTriangle, CheckCircle2, ClipboardList, History } from 'lucide-react'
import { api, friendlyError } from '../api.js'
import DownloadMenu from '../components/DownloadMenu.jsx'
import { useAuth } from '../auth.jsx'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import WorkShell from '../workShell.jsx'

// ---------------------------------------------------------------------------
// Completed tasks (/work/tasks) + the shared white sub-page shell.
//
// The dashboard (/work) is the white minimal shell; these standalone pages
// use the SAME palette + type (page #f5f7fb, cards #fff, line #e7eaf2, ink
// #1b2033, muted #5c6484, green #0e9f6e; Figtree body, Bricolage Grotesque
// display). The shell, the sessions hook and the row helpers are defined ONCE
// here and imported by WorkLogs.jsx (single source of truth: one top bar, one
// token block, one "which label do we show for a session" rule).
//
// Data: api.workList() (GET /api/work/sessions) - the same call the dashboard
// makes. A session: { id, title, goal, status ('ended' = completed), steps[]
// ({ status: 'done' | ... }), currentStep, startedAt (ISO), endedAt (ISO|null),
// lastActivityAt (ms), paused }.
// ---------------------------------------------------------------------------

export const WS_FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap'

export const WS_CSS = `
.ws{
  --bg:#f5f7fb;--panel:#ffffff;
  --line:#e7eaf2;--line-2:#d5d9e6;--line-soft:#eef1f7;
  --tx:#1b2033;--tx-2:#2b3250;--mut:#5c6484;--faint:#8a90a6;
  --em:#0e9f6e;--em-deep:#0b7a53;--em-fill:#eafaf3;--em-line:#bde9d5;
  --em-2:#0a84c2;--info-fill:#e9f5fc;--info-line:rgba(10,134,194,.26);
  --warm:#c85a16;--warm-fill:rgba(200,90,22,.07);--warm-line:rgba(200,90,22,.28);
  --danger:#e23b4e;--chip:#f1f3fa;--chip-line:#e2e6f1;--field:#fcfdff;--track:#e7eaf2;
  --shadow:0 22px 48px -30px rgba(30,40,80,.30);--card-shadow:0 1px 2px rgba(20,24,44,.03);
  --r:12px;--r-sm:9px;
  --ws-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  min-height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);overflow-x:clip;
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
.ws *{box-sizing:border-box}
.ws h1,.ws h2,.ws h3{margin:0;color:var(--tx);font-family:var(--ws-display);letter-spacing:-.01em}
.ws p{margin:0}
.ws :focus-visible{outline:2px solid var(--em);outline-offset:2px;border-radius:10px}
.ws button{cursor:pointer}

/* ---- Top bar: back link + brand + sibling-page nav. Every control is nowrap
   + flex-shrink:0; only the spacer flexes, so nothing wraps or clips. ---- */
.ws-top{position:sticky;top:0;z-index:30;height:58px;display:flex;align-items:center;gap:10px;padding:0 24px;border-bottom:1px solid var(--line);background:var(--panel);min-width:0}
.ws-back{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;height:32px;padding:0 12px 0 9px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-size:13.5px;font-weight:500;line-height:1;text-decoration:none;transition:background .15s,border-color .15s,color .15s}
.ws-back:hover{border-color:var(--line-2);background:var(--line-soft);color:var(--tx)}
.ws-back svg{flex-shrink:0}
.ws-brand{display:inline-flex;align-items:center;gap:9px;flex-shrink:0;min-width:0;text-decoration:none;color:inherit;margin-left:4px}
.ws-brand .mark{display:inline-flex;line-height:0;flex:0 0 26px}
.ws-brand .bt{display:flex;flex-direction:column;line-height:1.12;white-space:nowrap}
.ws-brand .bt small{font-size:11px;font-weight:600;color:var(--mut);letter-spacing:.01em}
.ws-brand .bt b{font-family:var(--ws-display);font-weight:700;font-size:15px;color:var(--tx)}
.ws-top-sp{flex:1 1 8px;min-width:8px}
.ws-tabs{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;white-space:nowrap;padding:3px;border:1px solid var(--line);border-radius:999px;background:var(--panel)}
.ws-tab{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;height:26px;padding:0 11px;border-radius:999px;border:none;background:transparent;color:var(--mut);font:inherit;font-size:13px;font-weight:600;line-height:1;text-decoration:none;transition:background .15s,color .15s}
.ws-tab:hover{color:var(--tx);background:var(--line-soft)}
.ws-tab.on{background:var(--em-fill);color:var(--em-deep)}
.ws-tab svg{flex-shrink:0}

.ws-main{width:100%;max-width:900px;margin:0 auto;padding:30px 26px 56px;min-width:0;flex:1}
.ws-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}
.ws-head .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill);border:1px solid var(--em-line);color:var(--em);flex-shrink:0;margin-top:2px}
.ws-head h1{font-size:24px;font-weight:700;line-height:1.25}
.ws-head p{color:var(--mut);font-size:14px;margin-top:3px;line-height:1.5}
.ws-count{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;background:var(--chip);border:1px solid var(--chip-line);color:var(--mut);font-size:12px;font-weight:600;margin-left:10px;vertical-align:middle;white-space:nowrap}

/* ---- Rows: no box walls, one hairline between sessions. ---- */
.ws-list{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ws-row{display:flex;align-items:center;gap:14px;padding:14px 4px;min-width:0}
.ws-row + .ws-row{border-top:1px solid var(--line)}
.ws-row-ic{width:30px;height:30px;border-radius:8px;background:var(--info-fill);color:var(--em-2);display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px}
.ws-row-ic.done,.ws-row-ic.ended{background:var(--em-fill);color:var(--em)}
.ws-row-ic.paused{background:var(--chip);color:var(--mut)}
.ws-row-main{flex:1 1 240px;min-width:0}
.ws-row-t{font-weight:600;font-size:14.5px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx)}
.ws-row-m{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;font-size:13px;color:var(--mut);margin-top:3px;line-height:1.4}
.ws-row-m .sep{color:var(--line-2)}
.ws-row-m .done{color:var(--em);font-weight:600}
.ws-row-m .cur{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.ws-st{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;font-size:11.5px;font-weight:600;white-space:nowrap;border:1px solid var(--chip-line);background:var(--chip);color:var(--mut)}
.ws-st.ended{color:var(--em-deep);background:var(--em-fill);border-color:var(--em-line)}
.ws-st.active{color:var(--em-2);background:var(--info-fill);border-color:var(--info-line)}
.ws-bar{height:4px;width:140px;max-width:100%;background:var(--track);border-radius:3px;overflow:hidden;flex:0 0 auto}
.ws-bar i{display:block;height:100%;border-radius:3px;background:var(--em)}
.ws-row-acts{display:flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;margin-left:auto}
.ws-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-weight:500;font-size:13.5px;line-height:1;cursor:pointer;flex-shrink:0;white-space:nowrap;text-decoration:none;transition:background .15s,border-color .15s,color .15s}
.ws-btn:hover{border-color:var(--line-2);background:var(--line-soft);color:var(--tx)}
.ws-btn svg{flex-shrink:0}
.ws-btn.go{color:var(--em-deep);border-color:var(--em-line);background:var(--em-fill)}
.ws-btn.go:hover{background:#d9f3e7;border-color:var(--em)}
.ws-del{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:none;border:1px solid transparent;color:var(--mut);cursor:pointer;border-radius:999px;flex-shrink:0;transition:color .15s,background .15s,border-color .15s}
.ws-del:hover{color:var(--danger);border-color:var(--line);background:rgba(226,59,78,.08)}

/* ---- Empty / error / loading ---- */
.ws-empty{border:1px dashed var(--line-2);border-radius:var(--r);padding:20px 18px;display:flex;align-items:center;gap:14px;background:var(--panel)}
.ws-empty .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:var(--em-fill);border:1px solid var(--em-line);color:var(--em);flex-shrink:0}
.ws-empty b{display:block;color:var(--tx);font-size:14.5px;margin-bottom:2px}
.ws-empty p{color:var(--mut);font-size:13.5px;line-height:1.5}
.ws-link{color:var(--em-2);font-weight:600;text-decoration:underline;text-underline-offset:3px;background:none;border:none;padding:0;font:inherit;cursor:pointer}
.ws-skel{display:flex;align-items:center;gap:14px;padding:16px 4px;border-top:1px solid var(--line)}
.ws-skel i{display:block;height:12px;border-radius:6px;background:var(--track)}
.ws-skel .a{width:30px;height:30px;border-radius:8px;flex:0 0 30px}
.ws-skel .b{width:46%}
.ws-skel .c{width:22%;margin-left:auto}
@keyframes ws-pulse{50%{opacity:.55}}
.ws-skel i{animation:ws-pulse 1.4s ease-in-out infinite}
.ws-loading{display:grid;place-items:center;min-height:100vh;background:#f5f7fb}

/* ---- Delete confirmation (the dashboard's modal recipe) ---- */
.ws-modal-ov{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,24,.5);backdrop-filter:blur(3px)}
.ws-modal{width:min(440px,calc(100vw - 36px));background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow);color:var(--tx)}
.ws-modal h3{display:flex;align-items:center;gap:9px;font-family:var(--ws-display);font-weight:800;font-size:19px;margin:0 0 12px}
.ws-modal h3 svg{color:var(--danger);flex-shrink:0}
.ws-modal-sess{font-size:14px;font-weight:600;color:var(--tx);background:var(--chip);border:1px solid var(--chip-line);border-radius:10px;padding:9px 12px;margin-bottom:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ws-modal label{display:block;font-size:13px;font-weight:600;color:var(--tx-2);margin-bottom:7px}
.ws-modal label .req{color:var(--danger);font-weight:600;font-size:11.5px;margin-left:4px}
.ws-modal textarea{width:100%;resize:vertical;background:var(--field);border:1px solid var(--line);border-radius:11px;padding:11px;color:var(--tx);font:inherit;font-size:14px;line-height:1.45;outline:none;transition:border-color .15s,box-shadow .15s}
.ws-modal textarea::placeholder{color:var(--faint)}
.ws-modal textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.ws-modal-note{font-size:11.5px;color:var(--mut);margin-top:9px;line-height:1.5}
.ws-modal-err{display:flex;gap:9px;align-items:flex-start;margin-top:12px;padding:10px 12px;border-radius:11px;font-size:13px;line-height:1.45;border:1px solid var(--warm-line);background:var(--warm-fill);color:var(--tx)}
.ws-modal-err svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.ws-modal-btns{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;flex-wrap:wrap}
.ws-modal-btns .btn{white-space:nowrap}

@media(max-width:640px){
 .ws-top{padding:0 14px;gap:8px}
 .ws-back span{display:none}
 .ws-back{width:32px;padding:0;justify-content:center}
 .ws-main{padding:22px 16px 44px}
 .ws-head h1{font-size:21px}
 /* Actions drop under the text on a narrow screen (never wrap mid-button). */
 .ws-row{flex-wrap:wrap;gap:10px 14px}
 .ws-row-acts{flex-basis:100%;margin-left:0;padding-left:44px}
}
@media(max-width:480px){
 .ws-brand .bt{display:none}
 .ws-tab span{display:none}
 .ws-tab{padding:0 9px}
 .ws-row-acts{padding-left:0}
}
@media(prefers-reduced-motion:reduce){.ws *{animation-duration:.001ms!important;transition-duration:.001ms!important}}
`

// ---- Helpers shared by both pages --------------------------------------------
// The dashboard hides the auto-generated "Session <date>" title in favor of the
// goal; the same rule applies here so a task reads the same everywhere.
export function sessionLabel(s) {
  if (!s) return 'Untitled session'
  return (s.title && !/^Session \d/.test(s.title)) ? s.title : (s.goal || s.title || 'Untitled session')
}
export function stepStats(s) {
  const steps = Array.isArray(s && s.steps) ? s.steps : []
  const done = steps.filter((x) => x && x.status === 'done').length
  const total = steps.length
  return { done, total, pct: total > 0 ? Math.round(done / total * 100) : 0 }
}
// Accepts an ISO string (startedAt / endedAt) or a ms number (lastActivityAt).
export function fmtDate(v, withTime) {
  if (v == null || v === '') return ''
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v))
  if (Number.isNaN(d.getTime())) return ''
  try {
    return withTime
      ? d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return d.toDateString() }
}
// Open a session in the dashboard console. WorkPage reads sessionStorage
// 'wc_open' on mount (src/pages/WorkPage.jsx, openId state) and goes straight
// to that session's console instead of the home view.
export function useOpenSession() {
  const navigate = useNavigate()
  return useCallback((id) => {
    try { sessionStorage.setItem('wc_open', String(id)) } catch { /* ignore */ }
    navigate('/work')
  }, [navigate])
}
// The user's sessions - the same list the dashboard loads (api.workList).
// err is separate from "empty" so a connection hiccup never reads as "no tasks".
export function useSessions() {
  const [sessions, setSessions] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  const reload = useCallback(() => {
    setErr(false)
    return api.workList()
      .then((r) => { setSessions(Array.isArray(r && r.sessions) ? r.sessions : []); setErr(false) })
      .catch(() => setErr(true))
      .finally(() => setLoaded(true))
  }, [])
  useEffect(() => { reload() }, [reload])
  return { sessions, loaded, err, reload }
}

export function SkeletonRows({ n = 3 }) {
  return (
    <div aria-hidden>
      {Array.from({ length: n }, (_, i) => <div key={i} className="ws-skel"><i className="a" /><i className="b" /><i className="c" /></div>)}
    </div>
  )
}
export function LoadError({ onRetry }) {
  return (
    <div className="ws-empty" role="alert">
      <span className="ic"><AlertTriangle size={20} /></span>
      <div>
        <b>Could not load your sessions</b>
        <p>This looks like a connection hiccup, not an empty list. <button type="button" className="ws-link" onClick={onRetry}>Try again</button></p>
      </div>
    </div>
  )
}

// ---- Shell: fonts, auth gate, top bar, main column ---------------------------
// `active` is 'tasks' | 'logs' (which sibling tab is highlighted). Not signed
// in -> the WorkCoPilot sign-in, exactly like /work does.
export function WorkSubShell({ active, title, children }) {
  const { user, ready } = useAuth()
  useEffect(() => {
    const id = 'wd-fonts'   // same id as the dashboard: one stylesheet, never two
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = WS_FONTS
      document.head.appendChild(l)
    }
  }, [])
  useEffect(() => {
    const prev = document.title
    if (title) document.title = `${title} - WorkCoPilot`
    return () => { document.title = prev }
  }, [title])
  useEffect(() => { if (ready && !user) window.location.href = '/workcopilot' }, [ready, user])
  // Desktop app: frameless window, so the custom title bar wraps every branch.
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  const frame = (content) => desktop ? <><WorkShell authed={!!user} /><div style={{ paddingTop: 40 }}>{content}</div></> : content
  if (!ready || !user) return frame(<div className="ws-loading"><Loader2 size={26} className="spin" style={{ color: '#0e9f6e' }} /></div>)
  return frame(
    <div className="ws">
      <style>{WS_CSS}</style>
      <header className="ws-top">
        <Link to="/work" className="ws-back" title="Back to dashboard" aria-label="Back to dashboard"><ArrowLeft size={15} /><span>Dashboard</span></Link>
        <Link to="/work" className="ws-brand" title="WorkCoPilot by AdmireVeda">
          <span className="mark"><AVMark size={26} id="avsub" glow={false} /></span>
          <span className="bt"><small>AdmireVeda</small><b>WorkCoPilot</b></span>
        </Link>
        <span className="ws-top-sp" />
        <nav className="ws-tabs" aria-label="Your sessions">
          <Link to="/work/tasks" className={`ws-tab${active === 'tasks' ? ' on' : ''}`} aria-current={active === 'tasks' ? 'page' : undefined} title="My tasks (active)"><ClipboardList size={14} /><span>My tasks</span></Link>
          <Link to="/work/completed" className={`ws-tab${active === 'completed' ? ' on' : ''}`} aria-current={active === 'completed' ? 'page' : undefined} title="Completed tasks"><CheckCircle2 size={14} /><span>Completed tasks</span></Link>
          <Link to="/work/logs" className={`ws-tab${active === 'logs' ? ' on' : ''}`} aria-current={active === 'logs' ? 'page' : undefined} title="Session logs"><History size={14} /><span>Session logs</span></Link>
        </nav>
      </header>
      <main className="ws-main">{children}</main>
    </div>
  )
}

// ---- Task lists: My tasks (active) + Completed tasks (ended) -------------------
// One shared list, two modes. "My tasks" is what's in progress or paused (open to
// resume at the exact step); "Completed tasks" is finished work, each with its
// downloadable report. A paused task never blocks starting a new one, so several
// active tasks can live here at once.
function SessionList({ mode }) {
  const isDone = mode === 'completed'
  const { sessions, loaded, err, reload } = useSessions()
  const open = useOpenSession()
  const [dlErr, setDlErr] = useState('')
  const list = useMemo(() => sessions
    .filter((s) => s && (isDone ? s.status === 'ended' : s.status !== 'ended'))
    .sort((a, b) => String((isDone ? b.endedAt : (b.lastActivityAt || b.startedAt)) || b.startedAt || '')
      .localeCompare(String((isDone ? a.endedAt : (a.lastActivityAt || a.startedAt)) || a.startedAt || ''))), [sessions, isDone])
  const title = isDone ? 'Completed tasks' : 'My tasks'
  return (
    <WorkSubShell active={isDone ? 'completed' : 'tasks'} title={title}>
      <div className="ws-head">
        <span className="ic">{isDone ? <CheckCircle2 size={18} /> : <ClipboardList size={18} />}</span>
        <div>
          <h1>{title}{loaded && !err && list.length > 0 && <span className="ws-count">{list.length}</span>}</h1>
          <p>{isDone
            ? 'Every task you finished, with its report. Open one to review the steps, or download it as a PDF, text report or audit log.'
            : 'Tasks you have in progress or paused. Open one to pick up at the exact step you left off - pausing one lets you start another.'}</p>
        </div>
      </div>
      {dlErr && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', padding: '10px 13px', borderRadius: 10, background: 'var(--warning-soft, #fff7e0)', border: '1px solid var(--warning, #d98a00)', color: 'var(--text, #1a1a2e)', fontSize: 13.5 }}><AlertTriangle size={15} /> {dlErr}</div>}
      {!loaded ? (
        <SkeletonRows />
      ) : err ? (
        <LoadError onRetry={reload} />
      ) : list.length === 0 ? (
        <div className="ws-empty">
          <span className="ic"><ClipboardList size={20} /></span>
          <div>
            {isDone
              ? <><b>No completed tasks yet</b><p>When you finish a task it lands here with its report. <Link to="/work" className="ws-link">Start a task</Link>.</p></>
              : <><b>No active tasks</b><p>A task you start and pause shows here so you can resume it. <Link to="/work" className="ws-link">Start a task</Link>, or see your <Link to="/work/completed" className="ws-link">completed tasks</Link>.</p></>}
          </div>
        </div>
      ) : (
        <div className="ws-list" role="list" aria-label={title}>
          {list.map((s) => {
            const st = stepStats(s)
            const status = statusOf(s)
            const when = fmtDate(isDone ? (s.endedAt || s.startedAt) : (s.lastActivityAt || s.startedAt))
            return (
              <div key={s.id} className="ws-row" role="listitem">
                <span className={`ws-row-ic ${status.key}`} aria-hidden><status.Icon size={15} /></span>
                <div className="ws-row-main">
                  <div className="ws-row-t" title={sessionLabel(s)}>{sessionLabel(s)}</div>
                  <div className="ws-row-m">
                    <span className={`ws-st ${status.key}`}>{status.label}</span>
                    {when && <><span className="sep" aria-hidden>&middot;</span><span>{when}</span></>}
                    <span className="sep" aria-hidden>&middot;</span>
                    <span><span className="done">{st.done}/{st.total}</span> steps{isDone ? ' done' : ''}</span>
                  </div>
                </div>
                <div className="ws-row-acts">
                  <button type="button" className="ws-btn go" onClick={() => open(s.id)}>{!isDone && status.key === 'paused' ? 'Resume' : 'Open'} <ArrowRight size={14} /></button>
                  {isDone && <DownloadMenu sessionId={s.id} className="ws-btn" label="Download" onError={setDlErr} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WorkSubShell>
  )
}
export default function WorkTasks() { return <SessionList mode="active" /> }
export function CompletedTasks() { return <SessionList mode="completed" /> }

// Exported for WorkLogs (status chip + icon share one rule with this page).
export function statusOf(s) {
  if (!s) return { key: 'active', label: 'In progress', Icon: Play }
  if (s.status === 'ended') return { key: 'ended', label: 'Completed', Icon: Check }
  if (s.paused) return { key: 'paused', label: 'Paused', Icon: Pause }
  return { key: 'active', label: 'In progress', Icon: Play }
}
