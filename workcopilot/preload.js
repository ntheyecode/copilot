// WorkCoPilot preload bridge (contextIsolated, no Node in the renderer).
// Exposes a tiny, audited surface so the web console knows it runs inside the
// desktop shell and can drive the overlay controls (opacity, interact-behind).
// In a plain browser this flag is absent and the console shows the browser
// capture path instead.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('workDesktop', {
  isDesktop: true,
  // The shell answers getDisplayMedia with the primary screen and no picker.
  canCaptureScreen: true,
  // Overlay controls the console UI can call.
  setClickThrough: (on) => ipcRenderer.invoke('work:set-clickthrough', !!on),
  setOpacity: (v) => ipcRenderer.invoke('work:set-opacity', v),
  hide: () => ipcRenderer.invoke('work:hide'),
  // Buddy overlay controls (used by the /work/buddy page; harmless no-ops of the
  // channel from anywhere else).
  hideBuddy: () => ipcRenderer.invoke('work:buddy-hide'),
  openMain: () => ipcRenderer.invoke('work:open-main'),
  // Multi-monitor: ask the shell to (re-)choose which monitor to watch. A future
  // "Choose monitor" button in the console calls window.workDesktop.pickMonitor().
  // On a single-screen PC this is a no-op; on a multi-monitor PC it clears the
  // remembered choice and opens the picker.
  pickMonitor: () => ipcRenderer.invoke('work:pick-monitor'),
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
