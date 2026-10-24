// WorkCoPilot preload bridge (contextIsolated, no Node in the renderer).
// Exposes a tiny, audited surface so the web console knows it runs inside the
// desktop shell and can drive the overlay controls (opacity, interact-behind).
// In a plain browser this flag is absent and the console shows the browser
// capture path instead.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('workDesktop', {
  isDesktop: true,
  // The shell answers getDisplayMedia itself (single screen: no prompt; several
  // screens: the remembered or picked monitor).
  canCaptureScreen: true,
  // Overlay controls the console UI can call.
  setClickThrough: (on) => ipcRenderer.invoke('work:set-clickthrough', !!on),
  // While click-through is on, the title bar tells the shell when the cursor is
  // over it so its buttons stay clickable (the escape hatch out of click-behind).
  setHoverInteractive: (on) => ipcRenderer.invoke('work:hover-interactive', !!on),
  // Used by the shell's own offline page: reload the hosted console.
  retryLoad: () => ipcRenderer.invoke('work:retry-load'),
  setOpacity: (v) => ipcRenderer.invoke('work:set-opacity', v),
  hide: () => ipcRenderer.invoke('work:hide'),
  // Window modes: 'plan' (large, windowed, not-on-top) vs 'guide' (compact,
  // floating overlay). The console calls this as it moves between Home/planning
  // and an open guiding session.
  setMode: (m) => ipcRenderer.invoke('work:set-mode', m),
  // Overlay toggles surfaced on the custom title bar after sign-in.
  setAlwaysOnTop: (on) => ipcRenderer.invoke('work:set-always-on-top', !!on),
  setContentProtection: (on) => ipcRenderer.invoke('work:set-content-protection', !!on),
  // Frameless window controls (the title bar draws its own min / max / close).
  winMinimize: () => ipcRenderer.invoke('work:win-minimize'),
  winMaximize: () => ipcRenderer.invoke('work:win-maximize'),
  winClose: () => ipcRenderer.invoke('work:win-close'),
  // Current overlay state, and a subscription for live updates (hotkeys, OS
  // maximize, mode switches all push a fresh state).
  getState: () => ipcRenderer.invoke('work:get-state'),
  onState: (cb) => ipcRenderer.on('work:state', (_e, s) => cb(s)),
  // On-device reference documents: opens a local file picker, extracts the text
  // on this machine, and returns { ok, docs:[{name,chars,text}|{name,error}] }.
  // The raw file never leaves the computer; the renderer governs the text and
  // injects it into the plan request for that call only.
  pickDocs: () => ipcRenderer.invoke('work:pick-doc'),
  // Buddy overlay controls (used by the /work/buddy page; harmless no-ops of the
  // channel from anywhere else).
  hideBuddy: () => ipcRenderer.invoke('work:buddy-hide'),
  killBuddy: () => ipcRenderer.invoke('work:buddy-kill'),
  onBuddyShown: (cb) => { try { ipcRenderer.on('work:buddy-shown', () => { try { cb() } catch { /* ignore */ } }) } catch { /* ignore */ } },
  onPauseSave: (cb) => { try { ipcRenderer.on('work:pause-save', () => { try { cb() } catch { /* ignore */ } }) } catch { /* ignore */ } },
  openMain: () => ipcRenderer.invoke('work:open-main'),
  // The buddy page measures its instruction text and asks the window to grow to
  // fit, so a long step is shown in full instead of being clipped. Fire-and-forget.
  setBuddyHeight: (h) => ipcRenderer.send('work:buddy-height', Math.round(Number(h) || 0)),
  // Open clean, full-screen guidance (/work/guide) on the monitor the user is NOT
  // working on. No-op friendly: returns a flag the console can use to fall back.
  openFullGuide: () => ipcRenderer.invoke('work:open-guide'),
  // Multi-monitor: ask the shell to (re-)choose which monitor to watch. A future
  // "Choose monitor" button in the console calls window.workDesktop.pickMonitor().
  // On a single-screen PC this is a no-op; on a multi-monitor PC it clears the
  // remembered choice and opens the picker.
  pickMonitor: () => ipcRenderer.invoke('work:pick-monitor'),
  // Wizard monitor selection: list screens (empty on a single-screen PC) and
  // persist the chosen one before guiding starts.
  getMonitors: () => ipcRenderer.invoke('work:list-monitors'),
  chooseMonitorId: (id) => ipcRenderer.invoke('work:choose-monitor-id', id),
  // Used only by the shell's own monitor-picker page; harmless no-ops elsewhere.
  chooseMonitor: (id) => ipcRenderer.invoke('work:monitor-chosen', id),
  cancelMonitor: () => ipcRenderer.invoke('work:monitor-cancel'),
  // Subscribe to hotkey-driven changes so the UI can reflect them.
  onClickThrough: (cb) => ipcRenderer.on('work:clickthrough', (_e, v) => cb(v)),
  onOpacity: (cb) => ipcRenderer.on('work:opacity', (_e, v) => cb(v)),
  // Fires after the watched monitor changes, so the console can restart its
  // capture on the new screen (the shell cannot swap a running MediaStream track).
  onMonitorChanged: (cb) => ipcRenderer.on('work:monitor-changed', (_e, v) => cb(v)),
})
