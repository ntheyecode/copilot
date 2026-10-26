// WorkFullGuide - a clean, detailed, FULL-SCREEN guidance view for a second
// monitor. You work on one screen; this fills the other with calm, large, highly
// readable guidance: the current step front and centre, the full roadmap beside
// it, what the watcher can see, any warning, and the time left. It is READ-ONLY
// (you ask and drive from the main console / floater); this screen just shows you
// exactly where you are and what to do next, big enough to read from across a desk.
//
// It is the SAME page for web and desktop:
//   - Desktop opens it full-screen on the monitor you are NOT working on.
//   - Web opens it as a large window you drag to the other monitor; a Full screen
//     button (Fullscreen API) makes it edge to edge.
//
// Served from the same origin + session as the console (cookie auth), it polls the
// active session read-only and degrades calmly when there is nothing to show.
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Clock, Eye, AlertTriangle, Check, Loader2, Maximize, Minimize, Pause, Sun, Moon, ExternalLink, Coins } from 'lucide-react'
import RichText from '../components/RichText.jsx'
import AliveBuddy, { readBuddyPref, resolveCharacter } from '../components/AliveBuddy.jsx'
import GuideFontControl, { useGuideFontScale } from '../components/GuideFontScale.jsx'
import { stepWindow, progressText, planMarker } from '../shared/step_window.js'

const POLL_MS = 2500
const POLL_PAUSED_MS = 6000

function fmtTime(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
async function getJSON(url) {
  const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

// A copyable command/code block in the same dark MS-docs code-box style as the
// console (CmdBlock / CodeBlock): a clear label, a Copy button, monospace body
// in a dark box with internal horizontal scroll. `fs` scales the code with the
// rest of the guidance text so the reader's size choice applies here too.
function Mono({ lines, label, theme, fs = 1 }) {
  const c = theme
  const [copied, setCopied] = useState(false)
  const text = Array.isArray(lines) ? lines.join('\n') : String(lines || '')
  if (!text.trim()) return null
  const copy = () => { try { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* ignore */ } }
  return (
    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${c.codeBorder}`, background: c.codeBg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 11px', borderBottom: `1px solid ${c.codeBorder}`, fontSize: 11.5, fontWeight: 600, color: c.codeMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || 'Run this'}</span>
        <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${c.codeBorder}`, color: copied ? c.accent : c.codeMuted, borderRadius: 6, padding: '2px 9px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          {copied ? <><Check size={12} /> Copied</> : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '11px 13px', fontSize: Math.round(13 * fs * 10) / 10, lineHeight: 1.55, color: c.codeText, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', overflowX: 'auto', whiteSpace: 'pre' }}>{text}</pre>
    </div>
  )
}

// A quiet, on-brand affordance for the banked task-credit economy. Only INDIVIDUAL
// users have credits (corporate accounts are unlimited, so nothing shows). When
// the reader has at least one hour's worth banked, this chip lets them spend
// `creditsPerHour` (2) credits for one bonus guidance hour - handy when they are
// running low mid-task. Honest: the bonus hour is good for today only. It matches
// the guide theme (panel fill, hairline border, emerald accent for the action)
// and shrinks to fit so it never clips or forces horizontal overflow.
function CreditChip({ credits, onTrade, trading, theme: c }) {
  if (!credits || credits.unlimited) return null
  const cost = Number(credits.creditsPerHour) || 2
  const n = Number(credits.taskCredits)
  if (!Number.isFinite(n) || n < cost) return null
  return (
    <button
      type="button"
      onClick={onTrade}
      disabled={trading}
      title={`Trade ${cost} of your ${n} task credits for 1 bonus hour of guidance. The bonus hour is good for today only (expires at end of day).`}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
        maxWidth: '100%', padding: '4px 11px', borderRadius: 999,
        background: c.panel, border: `1px solid ${c.border}`, color: c.muted,
        cursor: trading ? 'default' : 'pointer', opacity: trading ? 0.65 : 1,
        fontFamily: 'inherit', lineHeight: 1.15, textAlign: 'left',
        transition: 'border-color .15s, background .15s',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {trading ? <Loader2 size={13} style={{ animation: 'wb-spin 1s linear infinite', flexShrink: 0 }} /> : <Coins size={13} style={{ color: c.accent, flexShrink: 0 }} />}
        <span style={{ color: c.text }}>{n} credit{n === 1 ? '' : 's'}</span>
        <span style={{ color: c.faint }}>·</span>
        <span style={{ color: c.accent, fontWeight: 700 }}>{trading ? 'Adding 1 hour…' : 'Add 1 hour'}</span>
      </span>
      <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.01em', color: c.faint, whiteSpace: 'nowrap' }}>
        {cost} credits · bonus hour, ends today
      </span>
    </button>
  )
}

export default function WorkFullGuide() {
  const [session, setSession] = useState(null)
  const [usage, setUsage] = useState(null)
  const [credits, setCredits] = useState(null)
  const [trading, setTrading] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ok | empty | signin | error
  const [fs, setFs] = useState(false)
  const [planOpen, setPlanOpen] = useState(false) // read-only "full plan" overlay
  const prefersDark = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  const [dark, setDark] = useState(prefersDark)
  // One clean column on a narrow window; the roomy two-column layout on a real
  // second monitor. Tracks live so a resized web window re-flows.
  const [wide, setWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true)
  const idRef = useRef(null)
  const timerRef = useRef(null)
  const aliveRef = useRef(true)

  const inDesktop = typeof window !== 'undefined' && !!window.workDesktop
  const paused = !!(session && session.paused)

  // The chosen buddy, resolved from the saved preference. It stays in sync with
  // the buddy window / console via the 'storage' event (same-origin, other
  // windows), so changing the buddy there updates this screen too.
  const [charPref, setCharPref] = useState(() => readBuddyPref())
  useEffect(() => {
    const onStorage = (e) => { if (!e || e.key === 'wc.buddy.character') setCharPref(readBuddyPref()) }
    try { window.addEventListener('storage', onStorage) } catch { /* ignore */ }
    return () => { try { window.removeEventListener('storage', onStorage) } catch { /* ignore */ } }
  }, [])
  const character = useMemo(() => resolveCharacter(charPref), [charPref])

  // Reader-controlled text size, shared with the console via one localStorage
  // key (wc-guide-fontscale). Compact default; A- / A / A+ step it.
  const { scale, dec, inc, reset, atMin, atMax } = useGuideFontScale()

  const tick = useCallback(async () => {
    try {
      let id = idRef.current
      if (!id) {
        const a = await getJSON('/api/work/active')
        const s = a && a.session
        if (s && s.id) { id = s.id; idRef.current = id; if (aliveRef.current) setSession(s) }
      }
      if (id) {
        let s = null
        try { const r = await getJSON(`/api/work/sessions/${encodeURIComponent(id)}`); s = r && r.session } catch { /* gone */ }
        if (!s || s.status !== 'active') { idRef.current = null; s = null }
        if (aliveRef.current) setSession(s)
      }
      try { const u = await getJSON('/api/work/usage'); if (aliveRef.current) setUsage(u) } catch { /* keep last */ }
      try { const cr = await getJSON('/api/work/credits'); if (aliveRef.current) setCredits(cr) } catch { /* keep last */ }
      if (aliveRef.current) setStatus(idRef.current ? 'ok' : 'empty')
    } catch (e) {
      const signedOut = /HTTP 401/.test((e && e.message) || '')
      if (signedOut) idRef.current = null
      if (aliveRef.current) setStatus((s) => (signedOut ? 'signin' : (s === 'loading' ? 'error' : s)))
    }
  }, [])

  // Spend creditsPerHour (2) banked task credits for one bonus guidance hour
  // (today only), then refresh the balance + usage so the time-left and the chip
  // both reflect the trade immediately. Guarded so a double-tap can't double-spend.
  const tradeCredit = useCallback(async () => {
    if (trading) return
    setTrading(true)
    try {
      const r = await fetch('/api/work/credits/trade', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ hours: 1 }),
      })
      if (r.ok) { try { const cr = await r.json(); if (aliveRef.current && cr && typeof cr === 'object') setCredits((p) => ({ ...(p || {}), ...cr })) } catch { /* ignore */ } }
      try { const cr = await getJSON('/api/work/credits'); if (aliveRef.current) setCredits(cr) } catch { /* keep */ }
      try { const u = await getJSON('/api/work/usage'); if (aliveRef.current) setUsage(u) } catch { /* keep */ }
    } catch { /* leave balance as-is; next poll reconciles */ }
    finally { if (aliveRef.current) setTrading(false) }
  }, [trading])

  useEffect(() => {
    aliveRef.current = true
    let stopped = false
    const loop = async () => { if (stopped) return; await tick(); if (stopped) return; timerRef.current = setTimeout(loop, (session && session.paused) ? POLL_PAUSED_MS : POLL_MS) }
    loop()
    return () => { stopped = true; aliveRef.current = false; if (timerRef.current) clearTimeout(timerRef.current) }
  }, [tick, paused])

  // Fullscreen (web). In the desktop app the shell already opens this full-screen
  // on the other monitor, so the control is hidden there.
  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])
  const toggleFs = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch { /* user can use F11 */ }
  }
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const steps = (session && Array.isArray(session.steps)) ? session.steps : []
  const total = steps.length
  const curIdx = session ? (Number.isFinite(session.currentStep) ? session.currentStep : 0) : 0
  const allDone = total > 0 && curIdx >= total
  const cur = (!allDone && steps[curIdx]) || null
  const doneN = steps.filter((s) => s.status === 'done').length
  const pct = total > 0 ? Math.round((Math.min(curIdx, total) / total) * 100) : 0
  // Rolling 5-step window (current + next 4; done hidden) + the quiet progress
  // line, both from the shared single source so all three surfaces agree.
  const win = stepWindow(steps)
  const progress = progressText(steps)
  const remaining = usage ? usage.remainingSeconds : null
  const exhausted = !!(usage && usage.exhausted)
  const guidance = (session && session.guidance) || ''
  const observation = (session && session.observation) || ''
  const flag = (session && session.flag) || ''

  // Buddy mood, mirroring the floater's mapping.
  const aliveState = status === 'loading' ? 'thinking'
    : status === 'error' ? 'alert'
    : (status === 'empty' || status === 'signin') ? 'idle'
    : paused ? 'idle'
    : allDone ? 'done'
    : flag ? 'alert'
    : (guidance || cur) ? 'answering'
    : 'thinking'

  const c = dark ? THEME.dark : THEME.light
  const S = styles(c, wide, scale)

  const calm = status === 'loading' ? { t: 'Connecting', d: 'Waking up and finding your task.' }
    : status === 'error' ? { t: 'Cannot reach the server', d: 'Retrying. Your session is safe.' }
    : status === 'signin' ? { t: 'Sign in to WorkCoPilot', d: 'Sign in on the main window and your task appears here.' }
    : { t: 'No active task yet', d: 'Open WorkCoPilot and start a task. This screen then guides you, step by step.' }

  return (
    <div style={S.root}>
      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={S.dot(paused ? c.warn : (status === 'ok' ? c.accent : c.muted))} />
          <span style={S.brand}>WorkCoPilot</span>
          {wide && <span style={S.subtle}>Full-screen guidance</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: wide ? 14 : 9, flex: '0 1 auto', flexWrap: wide ? 'nowrap' : 'wrap', justifyContent: 'flex-end', minWidth: 0 }}>
          {status === 'ok' && (
            <span style={S.pill}>
              {paused ? <><Pause size={13} /> Paused</> : <><span style={{ ...S.live }} /> Live</>}
            </span>
          )}
          <span style={S.time}><Clock size={14} /> {remaining == null ? '--' : (exhausted ? 'No time left' : `${fmtTime(remaining)} left`)}</span>
          <CreditChip credits={credits} onTrade={tradeCredit} trading={trading} theme={c} />
          <GuideFontControl scale={scale} dec={dec} inc={inc} reset={reset} atMin={atMin} atMax={atMax}
            theme={{ border: c.border, text: c.text, muted: c.muted, panel: c.panel, accent: c.accent }} />
          <button style={S.iconBtn} onClick={() => setDark((d) => !d)} title="Light or dark" aria-label="Toggle light or dark">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          {!inDesktop && <button style={S.iconBtn} onClick={toggleFs} title={fs ? 'Exit full screen' : 'Full screen'} aria-label="Toggle full screen">{fs ? <Minimize size={16} /> : <Maximize size={16} />}</button>}
        </div>
      </div>

      {status === 'ok' && session ? (
        <div style={S.body}>
          <div style={S.main}>
            {session.goal && <div style={S.goal}><span style={S.goalK}>Your goal</span><div style={S.goalText}>{session.goal}</div></div>}

            <div style={S.nowRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
            {allDone ? (
              <div style={S.nowCard}>
                <span style={S.nowBar} />
                <div style={{ ...S.nowK, color: c.accent }}><Check size={14} strokeWidth={2.5} /> All steps done</div>
                <div style={S.nowText}>Every step is confirmed. Head back to the main window to finish up and get your summary.</div>
              </div>
            ) : (
              <div className={paused ? undefined : 'wfg-now'} style={{ ...S.nowCard, '--gr': c.accentRing, '--gg': c.accentGlow }}>
                <span style={S.nowBar} />
                <div style={S.nowK}>
                  {status === 'ok' && <Loader2 size={13} style={{ ...S.spin, opacity: paused ? 0.3 : 0.85 }} />}
                  Now · step {Math.min(curIdx + 1, total)} of {total}
                </div>
                <div style={S.nowText}><RichText text={(cur && (cur.text || cur.title)) || guidance || 'Reading your screen for the next move'} accent={c.accent} /></div>
                {guidance && cur && guidance !== cur.text && (
                  <div style={S.guide}><RichText text={guidance} accent={c.accent} /></div>
                )}
                {cur && cur.url && <div style={{ marginTop: 10 }}><a className="wfg-link" href={cur.url} target="_blank" rel="noopener noreferrer" style={S.link}>{(() => { try { return 'Open ' + new URL(cur.url).host.replace(/^www\./, '') } catch { return 'Open link' } })()}<ExternalLink size={13} style={{ flexShrink: 0 }} /></a></div>}
                {cur && Array.isArray(cur.commands) && cur.commands.length > 0 && <Mono lines={cur.commands} label="Run this" theme={c} fs={scale} />}
                {cur && cur.code && cur.code.content && <Mono lines={cur.code.content} label={cur.code.file || 'Code'} theme={c} fs={scale} />}
                {cur && cur.validate && <div style={S.when}><Eye size={14} /> done when: <RichText text={cur.validate} accent={c.accent} /></div>}
              </div>
            )}
            </div>
            {wide && (
              <div style={S.buddyCol}>
                <AliveBuddy character={character} state={aliveState} size={132} interactive />
              </div>
            )}
            </div>

            {flag && <div style={S.flag}><AlertTriangle size={16} style={{ color: c.warn, flexShrink: 0, marginTop: 2 }} /> <span><RichText text={flag} accent={c.warn} /></span></div>}
            {observation && !allDone && <div style={S.obs}><Eye size={14} style={{ color: c.cyan, flexShrink: 0, marginTop: 2 }} /> <span><RichText text={observation} accent={c.cyan} /></span></div>}
          </div>

          <aside style={S.rail}>
            <div style={S.railHead}>
              <span style={S.railTitle}>Roadmap</span>
              <span style={S.railCount}>{progress || `${doneN} of ${total} done`}</span>
            </div>
            <div style={S.track}><span style={{ ...S.fill, width: `${pct}%` }} /></div>
            {/* Only the rolling window of up to 5 steps (current + next 4), with
                done steps hidden. The fully-expanded current step lives in the
                main column (nowCard); here it is the highlighted compact row. */}
            <div style={S.stepList}>
              {win.map(({ step: s, index: i }, pos) => {
                const isNow = pos === 0 // the window always leads with the current step
                return (
                  <div key={i} style={S.stepRow(isNow, false)}>
                    <span style={S.stepBadge(isNow, false)}>{i + 1}</span>
                    <span style={S.stepText(isNow, false)}><RichText text={s.text} accent={c.accent} /></span>
                  </div>
                )
              })}
            </div>
            {total > win.length && (
              <button className="wfg-link" style={S.planBtn} onClick={() => setPlanOpen(true)}>View full plan</button>
            )}
          </aside>
        </div>
      ) : (
        <div style={S.calmWrap}>
          <div style={S.calmCard}>
            {status === 'loading' && <Loader2 size={20} style={{ ...S.spin, marginBottom: 10 }} />}
            <div style={S.calmT}>{calm.t}</div>
            <div style={S.calmD}>{calm.d}</div>
          </div>
        </div>
      )}

      {/* Read-only FULL PLAN: every step in order with a done / current /
          upcoming marker and the goal at the top. This is NOT the session
          report; it just shows the whole plan the window summarizes. */}
      {planOpen && session && (
        <div style={S.planOv} onClick={() => setPlanOpen(false)} role="dialog" aria-modal="true" aria-label="Full plan">
          <div style={S.planCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.planHead}>
              <span style={S.planTitle}>Full plan</span>
              <button style={S.iconBtn} onClick={() => setPlanOpen(false)} title="Close" aria-label="Close full plan"><Minimize size={16} /></button>
            </div>
            {session.goal && <div style={S.planGoal}><span style={S.goalK}>Your goal</span><div style={S.goalText}>{session.goal}</div></div>}
            <div style={S.planCount}>{progress || `${doneN} of ${total} done`}</div>
            <div style={S.planList}>
              {steps.map((s, i) => {
                const mk = planMarker(s, i, steps)
                const isDone = mk === 'done', isNow = mk === 'current'
                return (
                  <div key={i} style={S.stepRow(isNow, isDone)}>
                    <span style={S.stepBadge(isNow, isDone)}>{isDone ? <Check size={14} strokeWidth={2.5} /> : i + 1}</span>
                    <span style={S.stepText(isNow, isDone)}><RichText text={s.text} accent={c.accent} /></span>
                    {isNow && <span style={S.planTag(c.accent)}>Now</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Color-coded by meaning, one source of truth with the console + floater:
// accent EMERALD = the current step / live action (the brightest thing),
// cyan = calm context (goal + observation), warn AMBER = a warning that
// interrupts. accentRing/accentGlow drive the current-step glow; cyanSoft is
// the observation chip fill. Light values are darkened for contrast on white.
// codeBg/codeText/codeBorder/codeMuted describe the dark code box (dark in BOTH
// themes, matching the console's CmdBlock/CodeBlock). `link` is the MS-docs blue
// used for the inline "Open ..." hyperlinks.
const THEME = {
  dark: { bg: '#0a0d12', panel: '#11161d', panel2: '#0e131a', codeBg: '#0b0f15', codeText: '#e6edf3', codeBorder: 'rgba(255,255,255,0.1)', codeMuted: '#8ea3c0', link: '#6cb6ff', text: '#eef3f6', muted: '#9aa6ad', faint: '#6c7780', border: 'rgba(255,255,255,0.09)', accent: 'var(--accent, #8cf5c4)', accentSoft: 'var(--accent-soft, rgba(140,245,196,0.12))', accentRing: 'var(--accent-line, rgba(140,245,196,0.34))', accentGlow: 'var(--accent-shadow, rgba(140,245,196,0.22))', cyan: '#39d3ff', cyanSoft: 'rgba(57,211,255,0.12)', cyanRing: 'rgba(57,211,255,0.32)', warn: '#f5c86b', warnSoft: 'rgba(245,200,107,0.13)', warnRing: 'rgba(245,200,107,0.34)', danger: '#f6a3a3', dangerSoft: 'rgba(246,163,163,0.1)' },
  light: { bg: '#f5f7f9', panel: '#ffffff', panel2: '#f6f8fa', codeBg: '#0f141a', codeText: '#e6edf3', codeBorder: 'rgba(255,255,255,0.1)', codeMuted: '#9aa6b8', link: '#0067c0', text: '#121821', muted: '#5a6672', faint: '#8a95a0', border: 'rgba(16,24,40,0.1)', accent: 'var(--accent, #0e9f6e)', accentSoft: 'var(--accent-soft, rgba(14,159,110,0.1))', accentRing: 'var(--accent-line, rgba(14,159,110,0.3))', accentGlow: 'var(--accent-shadow, rgba(14,159,110,0.18))', cyan: '#0a84c2', cyanSoft: 'rgba(10,132,194,0.09)', cyanRing: 'rgba(10,132,194,0.28)', warn: '#b7791f', warnSoft: 'rgba(183,121,31,0.12)', warnRing: 'rgba(183,121,31,0.3)', danger: '#b91c1c', dangerSoft: 'rgba(185,28,28,0.07)' },
}

// Microsoft-Learn / Docs reading style: compact, scannable body (~13-14px), a
// semibold step heading (~15-16px, NOT a 24-28px banner), tight vertical rhythm,
// blue inline links, and dark code boxes. `fs` is the reader's size multiplier
// (default 1); z() scales the guidance text/headings/code proportionally while
// the chrome (topbar, labels, badges) stays a stable size.
function styles(c, wide = true, fs = 1) {
  const z = (n) => Math.round(n * fs * 10) / 10
  return {
    root: { minHeight: '100vh', background: c.bg, color: c.text, fontFamily: '"Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' },
    topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, rowGap: 8, padding: wide ? '12px 24px' : '10px 14px', borderBottom: `1px solid ${c.border}`, background: c.panel2, flexWrap: wide ? 'nowrap' : 'wrap' },
    dot: (col) => ({ width: 9, height: 9, borderRadius: '50%', background: col, boxShadow: `0 0 10px ${col}`, flex: '0 0 auto' }),
    brand: { fontFamily: '"Bricolage Grotesque", "Figtree", sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' },
    subtle: { fontSize: 12.5, color: c.faint, marginLeft: 4 },
    pill: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.muted, padding: '3px 10px', borderRadius: 999, border: `1px solid ${c.border}`, background: c.panel },
    live: { width: 7, height: 7, borderRadius: '50%', background: c.accent, boxShadow: `0 0 8px ${c.accent}` },
    time: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
    iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 30, borderRadius: 8, background: c.panel, color: c.muted, border: `1px solid ${c.border}`, cursor: 'pointer' },
    body: { flex: 1, display: 'grid', gridTemplateColumns: wide ? 'minmax(0, 1.7fr) minmax(280px, 0.85fr)' : '1fr', gap: wide ? 22 : 14, padding: wide ? '22px 28px' : '14px 16px', alignItems: 'start' },
    main: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 },
    goal: { padding: '11px 15px', borderRadius: 11, background: c.panel2, border: `1px solid ${c.border}` },
    goalK: { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: c.cyan },
    goalText: { marginTop: 3, fontSize: z(14), lineHeight: 1.5, color: c.text },
    nowRow: { display: 'flex', alignItems: 'flex-start', gap: 18 },
    buddyCol: { flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, alignSelf: 'center' },
    // CURRENT STEP = the brightest element: emerald ring + an emerald->cyan left
    // bar + a soft glow (the .wfg-now class, reduced-motion safe). Compact padding
    // and a docs-scale semibold heading, not a banner.
    nowCard: { position: 'relative', overflow: 'hidden', padding: '15px 18px 16px 20px', borderRadius: 14, background: c.panel, border: `1px solid ${c.accentRing}`, boxShadow: `0 6px 22px rgba(0,0,0,0.16), 0 0 0 1px ${c.accentRing} inset` },
    nowBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${c.accent}, ${c.cyan})` },
    nowK: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: c.accent },
    nowText: { marginTop: 7, fontSize: z(wide ? 16 : 15), lineHeight: 1.4, fontWeight: 600, color: c.text, fontFamily: '"Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', letterSpacing: 0 },
    guide: { marginTop: 9, fontSize: z(13.5), lineHeight: 1.55, color: c.muted },
    // Blue MS-docs inline hyperlink: not a button. Underlines on hover/focus.
    link: { display: 'inline-flex', alignItems: 'center', gap: 5, color: c.link, fontSize: z(13.5), fontWeight: 600, textDecoration: 'none', borderRadius: 4, overflowWrap: 'anywhere' },
    when: { marginTop: 11, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: z(12.5), color: c.muted },
    // WARNING = amber, and it interrupts: a left amber bar + amber fill.
    flag: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 15px', borderRadius: 11, background: c.warnSoft, border: `1px solid ${c.warnRing}`, borderLeft: `4px solid ${c.warn}`, color: c.text, fontSize: z(13.5), lineHeight: 1.5 },
    // OBSERVATION = calm cyan-tinted context chip.
    obs: { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: z(12.5), color: c.muted, lineHeight: 1.55, padding: '10px 14px', background: c.cyanSoft, border: `1px solid ${c.cyanRing}`, borderRadius: 11 },
    rail: { minWidth: 0, position: wide ? 'sticky' : 'static', top: 22, padding: '14px 15px 16px', borderRadius: 14, background: c.panel2, border: `1px solid ${c.border}` },
    railHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
    railTitle: { fontSize: z(13.5), fontWeight: 700, color: c.text },
    railCount: { fontSize: 12, fontWeight: 600, color: c.muted, fontVariantNumeric: 'tabular-nums' },
    track: { height: 5, borderRadius: 4, background: c.border, overflow: 'hidden', marginBottom: 12 },
    fill: { display: 'block', height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${c.accent}, ${c.cyan})`, transition: 'width 0.4s ease' },
    stepList: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: wide ? 'calc(100vh - 200px)' : 'none', overflowY: wide ? 'auto' : 'visible', paddingRight: 2 },
    stepRow: (now, done) => ({ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 10px', borderRadius: 9, background: now ? c.accentSoft : 'transparent', border: `1px solid ${now ? c.border : 'transparent'}`, opacity: done ? 0.6 : 1 }),
    stepBadge: (now, done) => ({ flex: '0 0 auto', width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: done ? c.accent : now ? c.bg : c.muted, background: now ? c.accent : 'transparent', border: `1.5px solid ${done ? 'transparent' : now ? c.accent : c.border}` }),
    stepText: (now, done) => ({ flex: 1, minWidth: 0, fontSize: z(13), lineHeight: 1.45, color: now ? c.text : c.muted, fontWeight: now ? 600 : 500, textDecoration: done ? 'line-through' : 'none', overflowWrap: 'anywhere' }),
    // Quiet "View full plan" link under the windowed rail.
    planBtn: { marginTop: 10, background: 'transparent', border: 'none', padding: '2px 0', color: c.link, fontSize: z(12.5), fontWeight: 600, cursor: 'pointer', textDecorationColor: 'transparent', textUnderlineOffset: 3 },
    // Read-only full-plan overlay.
    planOv: { position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(5,7,14,0.55)', backdropFilter: 'blur(4px)' },
    planCard: { width: 'min(620px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)', overflow: 'hidden' },
    planHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${c.border}` },
    planTitle: { fontSize: 15, fontWeight: 700, fontFamily: '"Bricolage Grotesque", "Figtree", sans-serif', color: c.text },
    planGoal: { padding: '12px 16px 0' },
    planCount: { padding: '8px 16px 4px', fontSize: 12, fontWeight: 600, color: c.muted, fontVariantNumeric: 'tabular-nums' },
    planList: { padding: '4px 12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
    planTag: (col) => ({ flex: '0 0 auto', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: col, alignSelf: 'center' }),
    calmWrap: { flex: 1, display: 'grid', placeItems: 'center', padding: 40 },
    calmCard: { textAlign: 'center', maxWidth: 460 },
    calmT: { fontSize: 20, fontWeight: 700, fontFamily: '"Bricolage Grotesque", "Figtree", sans-serif', color: c.text },
    calmD: { marginTop: 8, fontSize: 14, lineHeight: 1.55, color: c.muted },
    spin: { animation: 'wb-spin 1s linear infinite' },
  }
}

if (typeof document !== 'undefined' && !document.getElementById('wfg-kf')) {
  const el = document.createElement('style'); el.id = 'wfg-kf'
  el.textContent = '@keyframes wb-spin{to{transform:rotate(360deg)}}'
    + '@keyframes wfg-now-glow{0%,100%{box-shadow:0 6px 22px rgba(0,0,0,.16),0 0 0 1px var(--gr) inset,0 10px 30px -18px var(--gg)}50%{box-shadow:0 6px 22px rgba(0,0,0,.16),0 0 0 1px var(--gr) inset,0 12px 40px -12px var(--gg)}}'
    + '.wfg-now{animation:wfg-now-glow 2.8s ease-in-out infinite}'
    + '.wfg-link{text-decoration-color:transparent;text-underline-offset:3px;transition:text-decoration-color .15s}'
    + '.wfg-link:hover,.wfg-link:focus-visible{text-decoration:underline;text-decoration-color:currentColor}'
    + '@media(prefers-reduced-motion:reduce){.wfg-now{animation:none}}'
  document.head.appendChild(el)
}
