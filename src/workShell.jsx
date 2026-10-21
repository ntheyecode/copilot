// WorkShell - the custom Fluent-style title bar for the WorkCoPilot DESKTOP app.
//
// The desktop window is frameless (workcopilot/main.js), so the web UI draws its
// own title bar - deliberately in the mature Microsoft style (Segoe UI Variable,
// Mica-like surface, caption buttons that hover grey / close hovers red). It is
// rendered on every page the desktop window loads (sign-in and the console), so
// the window is always movable and closeable.
//
// Design notes (Fluent 2 window chrome, not a second nav bar):
//   * One quiet 32px strip. The app's own navigation header sits directly below,
//     so this reads as OS chrome: flat surface, hairline bottom rule, caption
//     buttons at the Windows 11 metric (46 x 32), nothing boxed or bordered.
//   * Toggles are "subtle" Fluent buttons: transparent at rest, grey on hover,
//     and when ON they take the accent text colour, a faint accent tint and a
//     2px accent underline bar - the Fluent "selected" treatment. The screen-
//     share toggle uses the warning tokens (amber) when the window is visible
//     on a share, so it reads as a gentle caution rather than an alarm.
//   * Every toggle has a FIXED width, so a label swap (Hidden <-> On share,
//     See-through <-> "60%") or a state change never moves its neighbours and
//     the window controls stay pinned to the right edge.
//   * Below 640px (the ~460px guide overlay) labels drop away and the toggles
//     become evenly-sized 28px icon buttons; the underline bar shrinks with them.
//
// Two groups of controls:
//   * ALWAYS: window controls (minimize / maximize / close) + a drag region, so
//     a frameless window is never stranded without chrome.
//   * AFTER SIGN-IN (authed): the signature overlay toggles the product needs -
//     On top, Hide from screen share, See-through, Click-behind (guide mode) and
//     Buddy. These map 1:1 onto the shell IPC in preload.js.
//
// The bar lives OUTSIDE the app's themed container, so it cannot use the app's
// CSS variables - light/dark values are hardcoded and switched by the
// [data-theme='dark'] attribute on an ancestor.
//
// In a plain browser window.workDesktop is absent and this renders nothing, so
// the web console is unchanged outside the desktop app.
import React, { useEffect, useState, useCallback } from 'react'
import { Pin, Eye, EyeOff, Contrast, MousePointer2, PictureInPicture2 } from 'lucide-react'

const OPACITIES = [1, 0.85, 0.6, 0.4]   // mirrors the shell's own cycle
const BAR_H = 32

const CSS = `
/* ---------- surface ---------- */
.wshell{position:fixed;top:0;left:0;right:0;height:${BAR_H}px;z-index:2147483000;
  box-sizing:border-box;display:flex;align-items:stretch;
  font-family:"Segoe UI Variable Text","Segoe UI Variable","Segoe UI",system-ui,-apple-system,sans-serif;
  font-size:12px;line-height:1;color:#424242;
  background:#f0f2f5;
  --wshell-cap-bg:#f0f2f5;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(0,0,0,.09);
  -webkit-app-region:drag;user-select:none;-webkit-font-smoothing:antialiased}
.wshell *{box-sizing:border-box}
[data-theme='dark'] .wshell{color:#d6d6d6;background:#1f1f1f;--wshell-cap-bg:#1f1f1f;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.045),inset 0 -1px 0 rgba(0,0,0,.55)}

/* ---------- brand ---------- */
.wshell-brand{display:flex;align-items:center;gap:8px;padding:0 10px 0 12px;min-width:0}
.wshell-dot{width:12px;height:12px;border-radius:3.5px;flex-shrink:0;
  background:linear-gradient(140deg,#13b27a 0%,#0a8fd6 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 .5px rgba(0,0,0,.06)}
.wshell-name{font-weight:600;font-size:12px;letter-spacing:-.005em;white-space:nowrap;color:#1b1b1b;
  overflow:hidden;text-overflow:ellipsis;min-width:0}
[data-theme='dark'] .wshell-name{color:#f3f3f3}
.wshell-mode{display:inline-flex;align-items:center;gap:5px;height:18px;padding:0 7px 0 6px;margin-left:2px;border-radius:9px;
  font-size:10.5px;font-weight:600;letter-spacing:.01em;white-space:nowrap;flex-shrink:0;
  color:#0e6b45;background:rgba(14,159,110,.11)}
.wshell-mode::before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.9}
.wshell-mode.guide{color:#0f5fa8;background:rgba(15,108,189,.11)}
[data-theme='dark'] .wshell-mode{color:#6ee7b7;background:rgba(110,231,183,.13)}
[data-theme='dark'] .wshell-mode.guide{color:#7cc0ff;background:rgba(98,171,245,.15)}

.wshell-spacer{flex:1 1 auto;min-width:6px}

/* ---------- overlay toggles (Fluent subtle buttons) ---------- */
.wshell-tools{display:flex;align-items:center;gap:2px;padding:0 6px 0 4px;-webkit-app-region:no-drag}
.wshell-tool{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  height:24px;padding:0 8px;margin:0;border:0;border-radius:4px;
  background:transparent;color:#424242;cursor:pointer;
  font:inherit;font-size:12px;font-weight:400;letter-spacing:0;white-space:nowrap;
  transition:background-color .1s ease,color .1s ease;outline:none}
[data-theme='dark'] .wshell-tool{color:#d6d6d6}
.wshell-tool svg{flex-shrink:0;width:14px;height:14px;opacity:.86}
.wshell-tlabel{flex:1 1 auto;text-align:left;white-space:nowrap}
/* fixed widths - a label swap (Hidden/On share, See-through/NN%) never shifts a neighbour */
.wshell-tool.w-top{width:76px}
.wshell-tool.w-share{width:88px}
.wshell-tool.w-see{width:108px}
.wshell-tool.w-behind{width:108px}
.wshell-tool.w-buddy{width:74px}
.wshell-tool:hover{background:rgba(0,0,0,.055);color:#1b1b1b}
.wshell-tool:active{background:rgba(0,0,0,.09)}
[data-theme='dark'] .wshell-tool:hover{background:rgba(255,255,255,.08);color:#fff}
[data-theme='dark'] .wshell-tool:active{background:rgba(255,255,255,.12)}
.wshell-tool:focus-visible{box-shadow:0 0 0 2px #f0f2f5,0 0 0 3.5px #0f6cbd}
[data-theme='dark'] .wshell-tool:focus-visible{box-shadow:0 0 0 2px #1f1f1f,0 0 0 3.5px #62abf5}
.wshell-tool:disabled{color:#9a9a9a;cursor:default}
.wshell-tool:disabled svg{opacity:.55}
.wshell-tool:disabled:hover,.wshell-tool:disabled:active{background:transparent;color:#9a9a9a}
[data-theme='dark'] .wshell-tool:disabled,[data-theme='dark'] .wshell-tool:disabled:hover{color:#6e6e6e}
/* Fluent "selected": accent text + faint tint + 2px underline bar */
.wshell-tool::after{content:"";position:absolute;left:8px;right:8px;bottom:1px;height:2px;border-radius:1px;
  background:currentColor;opacity:0;transform:scaleX(.4);transform-origin:center;
  transition:opacity .12s ease,transform .16s cubic-bezier(.2,.8,.2,1)}
.wshell-tool.on{color:#0f6cbd;font-weight:600;background:rgba(15,108,189,.08)}
.wshell-tool.on svg{opacity:1}
.wshell-tool.on::after{opacity:1;transform:scaleX(1)}
.wshell-tool.on:hover{background:rgba(15,108,189,.13);color:#0c5aa0}
.wshell-tool.on:active{background:rgba(15,108,189,.18)}
[data-theme='dark'] .wshell-tool.on{color:#62abf5;background:rgba(98,171,245,.13)}
[data-theme='dark'] .wshell-tool.on:hover{background:rgba(98,171,245,.19);color:#8cc2ff}
[data-theme='dark'] .wshell-tool.on:active{background:rgba(98,171,245,.24)}
/* warn = visible on a screen share: gentle amber caution */
.wshell-tool.warn.on{color:#8a5500;background:rgba(240,160,0,.13)}
.wshell-tool.warn.on:hover{background:rgba(240,160,0,.20);color:#744700}
.wshell-tool.warn.on:active{background:rgba(240,160,0,.26)}
[data-theme='dark'] .wshell-tool.warn.on{color:#f4c46a;background:rgba(244,196,106,.14)}
[data-theme='dark'] .wshell-tool.warn.on:hover{background:rgba(244,196,106,.21);color:#ffd68a}
[data-theme='dark'] .wshell-tool.warn.on:active{background:rgba(244,196,106,.27)}

.wshell-div{width:1px;height:16px;margin:0 2px 0 6px;flex-shrink:0;background:rgba(0,0,0,.12)}
[data-theme='dark'] .wshell-div{background:rgba(255,255,255,.12)}

/* ---------- window controls (Windows 11 caption metric) ---------- */
.wshell-caps{display:flex;align-items:stretch;flex-shrink:0;-webkit-app-region:no-drag}
.wshell-cap{width:46px;display:inline-flex;align-items:center;justify-content:center;margin:0;padding:0;border:0;
  background:transparent;color:#1b1b1b;cursor:default;outline:none;
  transition:background-color .1s ease,color .1s ease}
[data-theme='dark'] .wshell-cap{color:#f3f3f3}
.wshell-cap svg{display:block}
.wshell-cap:hover{background:rgba(0,0,0,.065);--wshell-cap-bg:#e0e2e5}
.wshell-cap:active{background:rgba(0,0,0,.11);--wshell-cap-bg:#d5d7da}
[data-theme='dark'] .wshell-cap:hover{background:rgba(255,255,255,.085);--wshell-cap-bg:#323232}
[data-theme='dark'] .wshell-cap:active{background:rgba(255,255,255,.055);--wshell-cap-bg:#2b2b2b}
.wshell-cap.close:hover{background:#c42b1c;color:#fff}
.wshell-cap.close:active{background:#b3271a;color:rgba(255,255,255,.75)}
.wshell-cap:focus-visible{box-shadow:inset 0 0 0 2px #0f6cbd}
[data-theme='dark'] .wshell-cap:focus-visible{box-shadow:inset 0 0 0 2px #62abf5}

/* ---------- compact (guide overlay, ~460px) ---------- */
@media (max-width:640px){
  .wshell-brand{gap:7px;padding:0 6px 0 10px}
  .wshell-mode{padding:0 6px 0 5px;font-size:10px}
  .wshell-tlabel{display:none}
  .wshell-tools{gap:2px;padding:0 4px 0 2px}
  .wshell-tool,.wshell-tool.w-top,.wshell-tool.w-share,.wshell-tool.w-see,.wshell-tool.w-behind,.wshell-tool.w-buddy{
    width:26px;height:24px;padding:0;gap:0}
  .wshell-tool svg{width:15px;height:15px}
  .wshell-tool::after{left:7px;right:7px}
  .wshell-div{margin:0 1px 0 4px}
  .wshell-cap{width:40px}
}
`

function injectOnce() {
  if (typeof document === 'undefined') return
  if (document.getElementById('wshell-css')) return
  const el = document.createElement('style')
  el.id = 'wshell-css'
  el.textContent = CSS
  document.head.appendChild(el)
}

// Windows-style caption glyphs as inline SVG (exact, icon-library-independent).
function CapMin() { return <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="5" width="9" height="1" fill="currentColor" /></svg> }
function CapMax() { return <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1.5" y="1.5" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" /></svg> }
function CapRestore() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <rect x="3" y="1.5" width="6.5" height="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="3" width="6.5" height="6.5" fill="var(--wshell-cap-bg,transparent)" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
function CapClose() { return <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1.5 1.5 L9.5 9.5 M9.5 1.5 L1.5 9.5" stroke="currentColor" strokeWidth="1.1" /></svg> }

export default function WorkShell({ authed = false }) {
  const desk = typeof window !== 'undefined' ? window.workDesktop : null
  const [st, setSt] = useState({ mode: 'plan', onTop: false, contentProtected: true, clickThrough: false, opacity: 1, maximized: false })

  useEffect(() => {
    if (!desk) return
    injectOnce()
    let alive = true
    try { Promise.resolve(desk.getState && desk.getState()).then((s) => { if (alive && s) setSt((p) => ({ ...p, ...s })) }).catch(() => {}) } catch { /* ignore */ }
    try { desk.onState && desk.onState((s) => { if (s) setSt((p) => ({ ...p, ...s })) }) } catch { /* ignore */ }
    return () => { alive = false }
  }, [desk])

  const call = useCallback((fn, ...a) => { try { const r = desk && desk[fn] && desk[fn](...a); if (r && r.then) r.then((v) => { if (v && typeof v === 'object') setSt((p) => ({ ...p, ...v })) }).catch(() => {}) } catch { /* ignore */ } }, [desk])

  if (!desk) return null

  const toggleTop = () => { call('setAlwaysOnTop', !st.onTop); setSt((p) => ({ ...p, onTop: !p.onTop })) }
  const toggleShare = () => { call('setContentProtection', !st.contentProtected); setSt((p) => ({ ...p, contentProtected: !p.contentProtected })) }
  const cycleSee = () => { const i = OPACITIES.indexOf(st.opacity); const next = OPACITIES[(i < 0 ? 0 : i + 1) % OPACITIES.length]; call('setOpacity', next); setSt((p) => ({ ...p, opacity: next })) }
  const toggleBehind = () => { call('setClickThrough', !st.clickThrough); setSt((p) => ({ ...p, clickThrough: !p.clickThrough })) }
  const toBuddy = () => { call('hide') }

  const guiding = st.mode === 'guide'
  const seeThrough = st.opacity < 1

  return (
    <div className="wshell" role="banner">
      <div className="wshell-brand">
        <span className="wshell-dot" aria-hidden="true" />
        <span className="wshell-name">WorkCoPilot</span>
        {authed && <span className={`wshell-mode${guiding ? ' guide' : ''}`}>{guiding ? 'Guiding' : 'Planning'}</span>}
      </div>
      <div className="wshell-spacer" />

      {authed && (
        <div className="wshell-tools" role="toolbar" aria-label="Overlay controls">
          <button type="button" className={`wshell-tool w-top${st.onTop ? ' on' : ''}`} onClick={toggleTop} aria-pressed={st.onTop}
            title="Keep WorkCoPilot above other windows (Ctrl+Alt+T)">
            <Pin size={14} /><span className="wshell-tlabel">On top</span>
          </button>
          <button type="button" className={`wshell-tool warn w-share${!st.contentProtected ? ' on' : ''}`} onClick={toggleShare} aria-pressed={!st.contentProtected}
            title={st.contentProtected ? 'Hidden from screen shares - click to show it on a share (Ctrl+Alt+S)' : 'Visible on screen shares - click to hide it again (Ctrl+Alt+S)'}>
            {st.contentProtected ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="wshell-tlabel">{st.contentProtected ? 'Hidden' : 'On share'}</span>
          </button>
          <button type="button" className={`wshell-tool w-see${seeThrough ? ' on' : ''}`} onClick={cycleSee} aria-pressed={seeThrough}
            title="See-through: let the work behind show through (Ctrl+Alt+O)">
            <Contrast size={14} /><span className="wshell-tlabel">{seeThrough ? `${Math.round(st.opacity * 100)}%` : 'See-through'}</span>
          </button>
          <button type="button" className={`wshell-tool w-behind${st.clickThrough ? ' on' : ''}`} onClick={toggleBehind} disabled={!guiding} aria-pressed={st.clickThrough}
            title={guiding ? 'Click-behind: let your clicks pass to the app underneath (Ctrl+Alt+W)' : 'Click-behind is available while guiding'}>
            <MousePointer2 size={14} /><span className="wshell-tlabel">Click-behind</span>
          </button>
          <button type="button" className="wshell-tool w-buddy" onClick={toBuddy}
            title="Shrink to the buddy card (Ctrl+Alt+B)">
            <PictureInPicture2 size={14} /><span className="wshell-tlabel">Buddy</span>
          </button>
          <span className="wshell-div" aria-hidden="true" />
        </div>
      )}

      <div className="wshell-caps">
        <button type="button" className="wshell-cap" onClick={() => call('winMinimize')} aria-label="Minimize"><CapMin /></button>
        <button type="button" className="wshell-cap" onClick={() => call('winMaximize')} aria-label={st.maximized ? 'Restore' : 'Maximize'}>{st.maximized ? <CapRestore /> : <CapMax />}</button>
        <button type="button" className="wshell-cap close" onClick={() => call('winClose')} aria-label="Close"><CapClose /></button>
      </div>
    </div>
  )
}
