// WorkShell - the custom Fluent-style title bar for the WorkCoPilot DESKTOP app.
//
// The desktop window is frameless (workcopilot/main.js), so the web UI draws its
// own title bar - deliberately in the mature Microsoft style (Segoe UI Variable,
// Mica-like surface, caption buttons that hover grey / close hovers red). It is
// rendered on every page the desktop window loads (sign-in and the console), so
// the window is always movable and closeable.
//
// Two groups of controls:
//   * ALWAYS: window controls (minimize / maximize / close) + a drag region, so
//     a frameless window is never stranded without chrome.
//   * AFTER SIGN-IN (authed): the signature overlay toggles the product needs -
//     On top, Hide from screen share, See-through, Click-behind (guide mode) and
//     Buddy. These map 1:1 onto the shell IPC in preload.js.
//
// In a plain browser window.workDesktop is absent and this renders nothing, so
// the web console is unchanged outside the desktop app.
import React, { useEffect, useState, useCallback } from 'react'
import { Pin, Eye, EyeOff, Contrast, MousePointer2, PictureInPicture2 } from 'lucide-react'

const OPACITIES = [1, 0.85, 0.6, 0.4]   // mirrors the shell's own cycle
const BAR_H = 40

const CSS = `
.wshell{position:fixed;top:0;left:0;right:0;height:${BAR_H}px;z-index:2147483000;
  display:flex;align-items:stretch;
  font-family:"Segoe UI Variable Display","Segoe UI Variable","Segoe UI",system-ui,sans-serif;
  font-size:12.5px;color:#1b1b1b;background:#f3f3f3;
  border-bottom:1px solid rgba(0,0,0,.10);
  -webkit-app-region:drag;user-select:none}
[data-theme='dark'] .wshell{color:#eaeaec;background:#202020;border-bottom:1px solid rgba(255,255,255,.08)}
.wshell-brand{display:flex;align-items:center;gap:9px;padding:0 10px 0 14px;min-width:0}
.wshell-dot{width:16px;height:16px;border-radius:5px;flex-shrink:0;
  background:linear-gradient(135deg,#0a9d66,#0b8fd6);box-shadow:0 1px 3px rgba(11,143,214,.45)}
.wshell-name{font-weight:600;letter-spacing:.1px;white-space:nowrap}
.wshell-mode{margin-left:4px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;
  background:rgba(14,159,110,.14);color:#0a7d52;border:1px solid rgba(14,159,110,.28)}
.wshell-mode.guide{background:rgba(11,143,214,.14);color:#0a6fa8;border-color:rgba(11,143,214,.30)}
[data-theme='dark'] .wshell-mode{background:rgba(110,231,183,.14);color:#6ee7b7;border-color:rgba(110,231,183,.26)}
[data-theme='dark'] .wshell-mode.guide{background:rgba(56,189,248,.16);color:#7dd3fc;border-color:rgba(56,189,248,.28)}
.wshell-spacer{flex:1 1 auto;min-width:8px}
.wshell-tools{display:flex;align-items:center;gap:2px;padding:0 6px;-webkit-app-region:no-drag}
.wshell-tool{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:7px;
  border:1px solid transparent;background:transparent;color:inherit;cursor:pointer;font:inherit;font-weight:500;
  transition:background .12s,border-color .12s,color .12s}
.wshell-tool:hover{background:rgba(0,0,0,.06)}
[data-theme='dark'] .wshell-tool:hover{background:rgba(255,255,255,.08)}
.wshell-tool.on{background:rgba(11,143,214,.14);border-color:rgba(11,143,214,.34);color:#0a6fa8}
[data-theme='dark'] .wshell-tool.on{background:rgba(56,189,248,.18);border-color:rgba(56,189,248,.34);color:#7dd3fc}
.wshell-tool.warn.on{background:rgba(200,90,22,.16);border-color:rgba(200,90,22,.36);color:#b4530f}
[data-theme='dark'] .wshell-tool.warn.on{background:rgba(255,160,80,.18);border-color:rgba(255,160,80,.34);color:#ffb561}
.wshell-tlabel{white-space:nowrap}
.wshell-div{width:1px;align-self:center;height:20px;margin:0 6px;background:rgba(0,0,0,.12)}
[data-theme='dark'] .wshell-div{background:rgba(255,255,255,.12)}
.wshell-caps{display:flex;align-items:stretch;-webkit-app-region:no-drag}
.wshell-cap{width:46px;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;
  color:inherit;cursor:pointer;transition:background .12s,color .12s}
.wshell-cap:hover{background:rgba(0,0,0,.08)}
[data-theme='dark'] .wshell-cap:hover{background:rgba(255,255,255,.09)}
.wshell-cap.close:hover{background:#c42b1c;color:#fff}
.wshell-cap svg{display:block}
@media (max-width:620px){.wshell-tlabel{display:none}.wshell-tool{padding:0 8px}}
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

  return (
    <div className="wshell">
      <div className="wshell-brand">
        <span className="wshell-dot" aria-hidden="true" />
        <span className="wshell-name">WorkCoPilot</span>
        {authed && <span className={`wshell-mode${guiding ? ' guide' : ''}`}>{guiding ? 'Guiding' : 'Planning'}</span>}
      </div>
      <div className="wshell-spacer" />

      {authed && (
        <div className="wshell-tools">
          <button type="button" className={`wshell-tool${st.onTop ? ' on' : ''}`} onClick={toggleTop}
            title="Keep WorkCoPilot above other windows (Ctrl+Alt+T)">
            <Pin size={14} /><span className="wshell-tlabel">On top</span>
          </button>
          <button type="button" className={`wshell-tool warn${!st.contentProtected ? ' on' : ''}`} onClick={toggleShare}
            title={st.contentProtected ? 'Hidden from screen shares - click to show it on a share (Ctrl+Alt+S)' : 'Visible on screen shares - click to hide it again (Ctrl+Alt+S)'}>
            {st.contentProtected ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="wshell-tlabel">{st.contentProtected ? 'Hidden' : 'On share'}</span>
          </button>
          <button type="button" className={`wshell-tool${st.opacity < 1 ? ' on' : ''}`} onClick={cycleSee}
            title="See-through: let the work behind show through (Ctrl+Alt+O)">
            <Contrast size={14} /><span className="wshell-tlabel">{st.opacity < 1 ? `${Math.round(st.opacity * 100)}%` : 'See-through'}</span>
          </button>
          {guiding && (
            <button type="button" className={`wshell-tool${st.clickThrough ? ' on' : ''}`} onClick={toggleBehind}
              title="Click-behind: let your clicks pass to the app underneath (Ctrl+Alt+W)">
              <MousePointer2 size={14} /><span className="wshell-tlabel">Click-behind</span>
            </button>
          )}
          <button type="button" className="wshell-tool" onClick={toBuddy}
            title="Shrink to the buddy card (Ctrl+Alt+B)">
            <PictureInPicture2 size={14} /><span className="wshell-tlabel">Buddy</span>
          </button>
          <span className="wshell-div" />
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
