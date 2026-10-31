// ---------------------------------------------------------------------------
// WorkCoPilot desktop shell
//
// Two always-on-top windows that load the WorkCoPilot web console (served from
// the hosted origin, so they share one cookie session):
//
//   1. MAIN console window (/work) - the full guide. ALWAYS ON TOP so the
//      guidance floats over whatever app you are using, with an OPACITY toggle
//      (Ctrl+Shift+Alt+O) and INTERACT-BEHIND / click-through (Ctrl+Shift+Alt+W) so your
//      clicks pass straight through to the app you are actually working in.
//      Answers getDisplayMedia with the chosen monitor. On a single-screen PC
//      it uses that one screen with no prompt (unchanged). On a multi-monitor
//      PC the user picks which monitor WorkCoPilot watches; the choice is
//      remembered across captures and restarts and re-pickable anytime via
//      Ctrl+Shift+Alt+M or window.workDesktop.pickMonitor(). setContentProtection(true)
//      keeps the overlay (and the picker) OUT of that capture (no feedback loop,
//      private on a share).
//
//   2. BUDDY window (/work/buddy) - a small, movable, always-on-top card that
//      appears when the main window is minimized or hidden. The guidance engine
//      runs in the MAIN renderer and posts results to the server; the buddy is a
//      thin read-only view that polls the server and shows the current step, the
//      exact next move, progress and remaining time, with Open / Hide / Pause.
//      backgroundThrottling is disabled on BOTH windows so the main renderer's
//      capture + analysis loop keeps running at full speed while minimized.
//
// This shell is READ-ONLY: it never drives the machine, it only shows what to
// do next. Signed with the COE Security cert + DigiCert timestamp (package.json).
// ---------------------------------------------------------------------------
const { app, BrowserWindow, session, globalShortcut, desktopCapturer, shell, ipcMain, screen, dialog, systemPreferences } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const SERVER_URL = (process.env.WORK_SERVER || 'https://admireveda.com').replace(/\/+$/, '')
const PARTITION = 'persist:workcopilot'   // its own cookie jar, separate from the other apps
let SERVER_ORIGIN = ''
try { SERVER_ORIGIN = new URL(SERVER_URL).origin } catch { SERVER_ORIGIN = SERVER_URL }

// Every frameless window spreads this. Electron 43+ rounds frameless windows by
// default; ours draw their own shape (the buddy is transparent), so they keep
// square corners as they had before.
const FRAMELESS = { frame: false, roundedCorners: false }

// Guide redesign (owner): roughly double the comfortable default so the
// step card reads at quality; clampBounds still fits it to a small screen.
const BUDDY_W = 480
// The buddy is a free-floating desktop mascot (no box): a cloud/speech bubble
// stacked ABOVE the animated character. The window anchors to its BOTTOM-LEFT and
// grows UPWARD (setBuddyHeight), so the mascot stays pinned to the bottom while the
// cloud expands up to fit a long instruction. The starting height holds the mascot
// + a compact cloud + the hover control strip; it grows taller for longer guidance.
const BUDDY_H = 300          // compact starting height (mascot + small cloud + control strip)
const BUDDY_H_MIN = 260      // never shorter than the compact mascot + cloud
const BUDDY_H_MAX = 720      // grows this tall to show a long instruction above the mascot, then scrolls
let buddyH = BUDDY_H         // current allowed height (the page asks us to grow to fit)

let win = null          // main console window
let buddy = null        // small movable buddy window
let guideWindow = null   // full-screen guidance on the OTHER monitor (/work/guide)
let quitting = false
let closingMain = false // main window is in its 'close' -> 'closed' transition (never summon the buddy then)
let clickThrough = false
const OPACITIES = [1, 0.85, 0.6, 0.4]
let opacityIdx = 0

// A BrowserWindow is only safe to call while it exists AND has not been
// destroyed; between close() and the 'closed' event the variable is still set
// but every method throws. Every window call below goes through this guard.
function alive(w) { return !!(w && !w.isDestroyed()) }

// --- window modes ----------------------------------------------------------
// WorkCoPilot is a different animal from a plain overlay. It lives in two modes:
//   PLAN  - home / wizard / plan review / documents: a large, movable, resizable
//           window (expandable to full screen), NOT always-on-top, in the
//           taskbar, fully opaque. Room to think and to read your own documents.
//   GUIDE - once a plan starts: a compact floating overlay, always-on-top by
//           default, with see-through (opacity) and click-behind so it rides on
//           top of the app you are actually working in.
// The renderer tells the shell which mode it is in (Home vs an open session) via
// window.workDesktop.setMode(); on-top, hide-from-share, opacity and click-behind
// are ALSO user-toggleable from the custom Fluent title bar at any time.
let mode = 'plan'            // 'plan' | 'guide'
let onTop = false            // user/mode-controlled always-on-top for the main window
let contentProtected = true  // hidden from screen share by default; user-toggleable
let planBounds = null        // remembered plan-mode geometry
let guideBounds = null       // remembered guide-mode geometry
// Guide-mode default geometry (owner: the old 460 x 820 floater was too small
// for quality; this is roughly double the area). clampBounds keeps it inside
// a small work area, so a 768px laptop still gets a reachable window.
const GUIDE_W = 760
const GUIDE_H = 960
// GUIDE-MODE "MAXIMIZE" = CENTERED, not full-bleed: a large reading window
// centered on the work area (never stretched edge to edge, never stuck in a
// corner). Toggled by the title-bar maximize button and by an OS maximize
// (double-click / Win+Up), both of which land in applyGuideMax below.
let guideMax = false
let guideRestore = null       // the compact bounds to return to when un-maximized

function applyOnTop() {
  if (alive(win)) win.setAlwaysOnTop(onTop, onTop ? 'screen-saver' : 'normal')
}
// Keep a window rectangle fully inside the work area of the display it is on
// (or the nearest one). Two real failures this prevents: the 820px guide
// overlay on a 768px laptop screen, whose Ask box and bottom controls were
// pushed below the taskbar with no way to reach them; and remembered geometry
// from a monitor that has since been unplugged, which would restore the window
// off-screen. The minimums mirror the BrowserWindow minWidth/minHeight, but a
// screen smaller than those wins, so the window is always reachable.
function clampBounds(b, minW = 380, minH = 480) {
  try {
    const d = screen.getDisplayMatching(b) || screen.getPrimaryDisplay()
    const a = d.workArea
    const width = Math.min(Math.max(Math.round(b.width) || minW, minW), a.width)
    const height = Math.min(Math.max(Math.round(b.height) || minH, minH), a.height)
    const x = Math.min(Math.max(Math.round(b.x), a.x), a.x + a.width - width)
    const y = Math.min(Math.max(Math.round(b.y), a.y), a.y + a.height - height)
    return { x, y, width, height }
  } catch { return b }
}
// Broadcast the live overlay state to the renderer(s) so the title bar always
// reflects reality (hotkeys, mode switches and OS maximize all flow back here).
function isMaxed() {
  return !!(win && !win.isDestroyed() && (win.isMaximized() || (mode === 'guide' && guideMax)))
}
function sendState() {
  const st = {
    mode, onTop, contentProtected, clickThrough,
    opacity: OPACITIES[opacityIdx],
    maximized: isMaxed(),
    fullscreen: !!(win && !win.isDestroyed() && win.isFullScreen()),
  }
  for (const w of [win, buddy]) {
    try { if (w && !w.isDestroyed()) w.webContents.send('work:state', st) } catch { /* ignore */ }
  }
}
function cornerBounds(w, h) {
  try {
    const a = screen.getPrimaryDisplay().workArea
    return { x: a.x + a.width - w - 24, y: a.y + 56, width: w, height: h }
  } catch { return { x: 120, y: 80, width: w, height: h } }
}
// The centered guide-max rectangle: a comfortable reading width, nearly the
// full work-area height, centered on the display the window is on.
function centeredGuideBounds() {
  try {
    const d = (alive(win) && screen.getDisplayMatching(win.getBounds())) || screen.getPrimaryDisplay()
    const a = d.workArea
    const w = Math.min(1100, a.width - 80)
    const h = Math.min(1200, a.height - 48)
    return { x: a.x + Math.round((a.width - w) / 2), y: a.y + Math.round((a.height - h) / 2), width: w, height: h }
  } catch { return { x: 160, y: 40, width: 1000, height: 900 } }
}
// Toggle (or set) the centered guide-max state. Remembers the compact bounds
// so un-maximizing returns exactly where the floater was.
function applyGuideMax(next) {
  if (!alive(win) || mode !== 'guide') return false
  const want = typeof next === 'boolean' ? next : !guideMax
  if (want === guideMax) return guideMax
  if (want) {
    guideRestore = win.getBounds()
    win.setBounds(clampBounds(centeredGuideBounds()))
  } else {
    win.setBounds(clampBounds(guideRestore || cornerBounds(GUIDE_W, GUIDE_H)))
  }
  guideMax = want
  sendState()
  return guideMax
}
function centeredPlanBounds() {
  try {
    const a = screen.getPrimaryDisplay().workArea
    const w = Math.min(1040, a.width - 80)
    const h = Math.min(760, a.height - 80)
    return { x: a.x + Math.round((a.width - w) / 2), y: a.y + Math.round((a.height - h) / 2), width: w, height: h }
  } catch { return { x: 120, y: 80, width: 1040, height: 760 } }
}
// Switch window mode. Remembers the geometry of the mode we leave (unless it was
// maximized) so returning to it feels like coming back to where you were.
function applyMode(next) {
  if (!win || win.isDestroyed()) return mode
  if (next !== 'plan' && next !== 'guide') return mode
  if (next === mode) { sendState(); return mode }
  if (win.isFullScreen()) { try { win.setFullScreen(false) } catch { /* ignore */ } }   // a mode switch leaves full screen
  if (!win.isMaximized()) {
    if (mode === 'plan') planBounds = win.getBounds()
    else guideBounds = guideMax ? (guideRestore || win.getBounds()) : win.getBounds()
  }
  guideMax = false; guideRestore = null
  mode = next
  if (mode === 'guide') {
    if (win.isMaximized()) win.unmaximize()
    onTop = true; applyOnTop()
    win.setBounds(clampBounds(guideBounds || cornerBounds(GUIDE_W, GUIDE_H)))
    // opacity + click-behind stay as the user left them: guide mode is where they matter
  } else {
    onTop = false; applyOnTop()
    setClickThrough(false)              // you cannot plan through a click-through window
    opacityIdx = 0; win.setOpacity(1)   // planning is always fully opaque
    win.setBounds(clampBounds(planBounds || centeredPlanBounds()))
  }
  sendState()
  return mode
}

// --- buddy position persistence -------------------------------------------
// Remember where the user dragged the buddy, across launches. Stored in a tiny
// JSON in userData so it survives reinstalls of the app bundle itself.
function buddyStatePath() {
  try { return path.join(app.getPath('userData'), 'buddy-state.json') } catch { return null }
}
function loadBuddyPos() {
  try {
    const p = buddyStatePath()
    if (!p || !fs.existsSync(p)) return null
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) return { x: Math.round(raw.x), y: Math.round(raw.y) }
  } catch { /* ignore - fall back to default corner */ }
  return null
}
function saveBuddyPos() {
  try {
    const p = buddyStatePath()
    if (!p || !buddy || buddy.isDestroyed()) return
    const [x, y] = buddy.getPosition()
    fs.writeFileSync(p, JSON.stringify({ x, y }))
  } catch { /* best effort */ }
}
// Clamp a saved position back onto a currently-connected display, so a buddy
// that was last parked on a now-unplugged monitor still shows up on screen.
function clampToDisplays(x, y) {
  try {
    const displays = screen.getAllDisplays()
    const fits = displays.some((d) => {
      const a = d.workArea
      return x >= a.x - BUDDY_W + 40 && x <= a.x + a.width - 40 && y >= a.y - 20 && y <= a.y + a.height - 40
    })
    if (fits) return { x, y }
  } catch { /* fall through to default corner */ }
  return null
}
// Grow/shrink the buddy card to fit its content. Called by the /work/buddy page
// after it measures its own instruction text. The card is anchored to its
// BOTTOM-LEFT, so it grows UPWARD (the controls stay put under the user's cursor)
// and we keep the top edge on-screen. This is the only sanctioned height change;
// the user can never drag-resize (resizable:false), so the drift bug cannot recur.
function setBuddyHeight(h) {
  try {
    if (!alive(buddy)) return
    const nh = Math.max(BUDDY_H_MIN, Math.min(BUDDY_H_MAX, Math.round(Number(h) || BUDDY_H)))
    if (nh === buddyH) return
    const b = buddy.getBounds()
    const bottom = b.y + b.height
    let ny = bottom - nh
    try {
      const area = screen.getDisplayMatching(b).workArea
      if (ny < area.y + 4) ny = area.y + 4                 // never push the top off-screen
    } catch { /* keep computed ny */ }
    buddyH = nh
    buddy.setBounds({ x: b.x, y: ny, width: BUDDY_W, height: nh })
    saveBuddyPos()
  } catch { /* ignore */ }
}
function defaultBuddyPos() {
  try {
    const a = screen.getPrimaryDisplay().workArea
    return { x: a.x + a.width - BUDDY_W - 24, y: a.y + a.height - BUDDY_H - 24 }
  } catch {
    return { x: 100, y: 100 }
  }
}

// --- multi-monitor selection ----------------------------------------------
// On a multi-monitor PC the primary display is often NOT the one the user is
// actually working on, so blindly capturing sources[0] can watch the wrong
// screen. We let the user pick which monitor WorkCoPilot watches, remember that
// choice across captures and restarts, and reuse it silently while it is still
// valid. A single-screen PC keeps the old zero-prompt behavior exactly.
//
// Why a custom picker (not useSystemPicker:true): we need to REMEMBER the pick
// and reuse it without prompting, restrict the choice to whole screens (never
// windows), and content-protect the chooser itself. The OS picker cannot persist
// a choice and tends to reappear on every capture, so a small in-shell chooser
// is the cleaner fit and gives us full control. No new files: its HTML is built
// inline and loaded as a data: URL.
const PICK_THUMB = { width: 320, height: 180 }   // picker thumbnail size (also reused for the capture lookup)

// The chosen monitor is keyed primarily by display_id (stable across the
// source-id churn that desktopCapturer shows between sessions), with the raw
// source id and the label kept as fallbacks. Stored in userData so it survives
// a reinstall of the app bundle.
function monitorChoicePath() {
  try { return path.join(app.getPath('userData'), 'monitor-choice.json') } catch { return null }
}
function loadMonitorChoice() {
  try {
    const p = monitorChoicePath()
    if (!p || !fs.existsSync(p)) return null
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (raw && (raw.displayId || raw.sourceId)) return raw
  } catch { /* ignore - treat as no remembered choice and re-prompt */ }
  return null
}
function saveMonitorChoice(source) {
  try {
    const p = monitorChoicePath()
    if (!p || !source) return
    fs.writeFileSync(p, JSON.stringify({
      displayId: source.display_id || '',
      sourceId: source.id || '',
      label: source.name || '',
      savedAt: Date.now(),
    }))
  } catch { /* best effort - if this fails we simply re-prompt next capture */ }
}
function clearMonitorChoice() {
  try { const p = monitorChoicePath(); if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch { /* best effort */ }
}
// Find the live source that matches a remembered choice, or null if the saved
// monitor is no longer connected (unplugged), in which case we re-prompt.
function matchSavedSource(sources, saved) {
  if (!saved) return null
  if (saved.displayId) {
    const m = sources.find((s) => s.display_id && String(s.display_id) === String(saved.displayId))
    if (m) return m
  }
  if (saved.sourceId) {
    const m = sources.find((s) => s.id === saved.sourceId)
    if (m) return m
  }
  return null
}
// The primary screen, used as the graceful fallback when the user dismisses the
// picker without choosing: the product keeps working rather than capturing
// nothing, and we do NOT persist a dismissed pick so we prompt again next time.
function primaryScreenSource(sources) {
  try {
    const primaryId = String(screen.getPrimaryDisplay().id)
    const m = sources.find((s) => String(s.display_id) === primaryId)
    if (m) return m
  } catch { /* fall through to the first source */ }
  return sources[0] || null
}

// --- the picker window ------------------------------------------------------
let pickerWin = null          // the chooser BrowserWindow, when open
let pickerPending = []         // resolve callbacks waiting on a choice (shared if several captures race)
let pickerSources = []         // the sources currently shown in the picker

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function displayMetaFor(source) {
  try {
    const d = screen.getAllDisplays().find((dd) => String(dd.id) === String(source.display_id))
    if (!d) return { primary: false, res: '' }
    const primaryId = String(screen.getPrimaryDisplay().id)
    return { primary: String(d.id) === primaryId, res: `${d.size.width} x ${d.size.height}` }
  } catch { return { primary: false, res: '' } }
}
// Build the chooser page. Thumbnails are embedded as data URLs so the whole
// picker is self-contained. The only script talks to the audited preload bridge
// (window.workDesktop); there is no Node and no remote code.
function buildPickerHtml(sources) {
  const tiles = sources.map((s, i) => {
    let thumb = ''
    try { thumb = s.thumbnail ? s.thumbnail.toDataURL() : '' } catch { thumb = '' }
    const meta = displayMetaFor(s)
    const label = escapeHtml(s.name || `Screen ${i + 1}`)
    const badge = meta.primary ? '<span class="badge">Primary</span>' : ''
    const res = meta.res ? `<span class="res">${escapeHtml(meta.res)}</span>` : ''
    return `<div class="tile" role="button" tabindex="0" data-id="${escapeHtml(s.id)}">
      <div class="shot">${thumb ? `<img src="${thumb}" alt="">` : ''}</div>
      <div class="meta"><span class="label">${label}</span>${badge}${res}</div>
    </div>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8">
  <style>
    :root { color-scheme: dark; }
    html,body { margin:0; height:100%; background:#0b0b0f; color:#e8e8ee;
      font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif; -webkit-user-select:none; user-select:none; cursor:default; }
    .wrap { padding:20px 22px; height:100%; box-sizing:border-box; display:flex; flex-direction:column; }
    h1 { font-size:16px; margin:0 0 4px; font-weight:600; }
    p.sub { margin:0 0 16px; color:#9a9aa6; font-size:12.5px; }
    .grid { flex:1; display:flex; flex-wrap:wrap; gap:14px; align-content:flex-start; overflow:auto; }
    .tile { width:320px; border:1px solid #26262f; border-radius:10px; overflow:hidden; background:#14141b;
      cursor:pointer; transition:border-color .12s, transform .12s; }
    .tile:hover, .tile:focus { border-color:#6d6df0; transform:translateY(-2px); outline:none; }
    .shot { width:320px; height:180px; background:#000; display:flex; align-items:center; justify-content:center; }
    .shot img { width:100%; height:100%; object-fit:contain; }
    .meta { display:flex; align-items:center; gap:8px; padding:10px 12px; }
    .label { font-weight:600; }
    .badge { font-size:11px; color:#0b0b0f; background:#6d6df0; border-radius:999px; padding:1px 8px; font-weight:600; }
    .res { margin-left:auto; color:#8a8a96; font-size:12px; }
    .foot { display:flex; align-items:center; justify-content:space-between; margin-top:16px; }
    .hint { color:#8a8a96; font-size:12px; }
    button#cancel { background:transparent; color:#b8b8c4; border:1px solid #33333d; border-radius:8px;
      padding:7px 14px; font-size:13px; cursor:pointer; }
    button#cancel:hover { border-color:#6d6df0; color:#fff; }
  </style></head><body>
    <div class="wrap">
      <h1>Choose the monitor WorkCoPilot watches</h1>
      <p class="sub">More than one display was detected. Click the screen you want WorkCoPilot to read. You can change it anytime with Ctrl+Shift+Alt+M.</p>
      <div class="grid">${tiles}</div>
      <div class="foot">
        <span class="hint">Press Esc to use the primary screen for now.</span>
        <button id="cancel" type="button">Use primary screen</button>
      </div>
    </div>
    <script>
      (function(){
        function choose(id){ try { window.workDesktop && window.workDesktop.chooseMonitor(id) } catch(e){} }
        function cancel(){ try { window.workDesktop && window.workDesktop.cancelMonitor() } catch(e){} }
        var tiles = document.querySelectorAll('.tile')
        for (var i=0;i<tiles.length;i++){
          (function(t){
            t.addEventListener('click', function(){ choose(t.getAttribute('data-id')) })
            t.addEventListener('keydown', function(e){ if (e.key==='Enter'||e.key===' '){ e.preventDefault(); choose(t.getAttribute('data-id')) } })
          })(tiles[i])
        }
        var c = document.getElementById('cancel')
        if (c) c.addEventListener('click', cancel)
        document.addEventListener('keydown', function(e){ if (e.key==='Escape') cancel() })
        var first = document.querySelector('.tile'); if (first) first.focus()
      })()
    </script>
  </body></html>`
}

// Open the chooser (or focus it if it is already open) and resolve with the
// chosen source once the user picks. Several racing capture requests share one
// picker and all resolve with the same choice.
function promptForMonitor(sources) {
  return new Promise((resolve) => {
    pickerPending.push(resolve)
    if (pickerWin && !pickerWin.isDestroyed()) { pickerWin.focus(); return }
    pickerSources = sources
    const ses = session.fromPartition(PARTITION)
    pickerWin = new BrowserWindow({
      width: 760,
      height: 560,
      resizable: false,
      ...FRAMELESS,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#0b0b0f',
      title: 'Choose monitor',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        session: ses,
      },
    })
    pickerWin.setAlwaysOnTop(true, 'screen-saver')
    // Keep the chooser itself out of any capture / screen share, like the other
    // windows, so it never leaks into a recording.
    pickerWin.setContentProtection(true)
    pickerWin.once('ready-to-show', () => { try { pickerWin.center(); pickerWin.show(); pickerWin.focus() } catch { /* ignore */ } })
    pickerWin.on('closed', onPickerClosed)
    pickerWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildPickerHtml(sources)))
  })
}
// If the window is dismissed with choices still pending (user closed it without
// picking), fall back to the primary screen for those captures and do NOT persist.
function onPickerClosed() {
  pickerWin = null
  if (!pickerPending.length) { pickerSources = []; return }
  const fallback = primaryScreenSource(pickerSources)
  const pending = pickerPending
  pickerPending = []
  pickerSources = []
  for (const r of pending) { try { r(fallback) } catch { /* ignore */ } }
}
// Resolve all pending capture requests with the given source and close the picker.
function resolvePicker(source) {
  const pending = pickerPending
  pickerPending = []            // cleared first so the 'closed' handler below is a no-op
  pickerSources = []
  const w = pickerWin
  pickerWin = null
  if (w && !w.isDestroyed()) { try { w.close() } catch { /* ignore */ } }
  for (const r of pending) { try { r(source) } catch { /* ignore */ } }
}

// Decide which screen to capture: single screen -> use it (no prompt); multi
// screen with a still-valid remembered choice -> use it; otherwise -> prompt.
async function resolveScreenSource() {
  // macOS: without the Screen Recording permission desktopCapturer still
  // "succeeds" but every frame is black, so the guide would silently read
  // nothing. Refuse here instead, so the renderer shows its allow-access
  // message, and open the right System Settings pane for the user.
  if (process.platform === 'darwin') {
    try {
      const st = systemPreferences.getMediaAccessStatus('screen')
      if (st !== 'granted') {
        try { shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture') } catch { /* ignore */ }
        return null
      }
    } catch { /* older Electron / unknown status: fall through and try */ }
  }
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: PICK_THUMB })
  if (!sources.length) return null
  if (sources.length === 1) return sources[0]
  const match = matchSavedSource(sources, loadMonitorChoice())
  if (match) return match
  return await promptForMonitor(sources)
}

// Clear the remembered choice and re-prompt now (Ctrl+Shift+Alt+M or pickMonitor()).
// On a single-screen PC there is nothing to choose, so we just remember that one
// screen. We notify the renderer afterwards so a live capture can be restarted on
// the new monitor: the main process cannot swap an already-running MediaStream
// track, only the renderer can re-call getDisplayMedia.
async function requestMonitorPick() {
  try {
    clearMonitorChoice()
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: PICK_THUMB })
    if (!sources.length) return
    if (sources.length === 1) { saveMonitorChoice(sources[0]); notifyMonitorChanged(sources[0]); return }
    const chosen = await promptForMonitor(sources)   // the chosen/cancel handlers persist (or not)
    notifyMonitorChanged(chosen)
  } catch { /* best effort - never crash the shell over a re-pick */ }
}
function notifyMonitorChanged(source) {
  const payload = source ? { displayId: source.display_id || '', label: source.name || '' } : null
  try { if (win && !win.isDestroyed()) win.webContents.send('work:monitor-changed', payload) } catch { /* ignore */ }
  try { if (buddy && !buddy.isDestroyed()) buddy.webContents.send('work:monitor-changed', payload) } catch { /* ignore */ }
}

// --- session (one-time) -----------------------------------------------------
// Permission + capture handlers and the download hook are installed ONCE on the
// partition. createWindow() can run more than once in a process (macOS
// re-activate, a relaunch after the window was closed), and re-installing the
// download listener each time would fire it N times per download.
let sessionReady = false
function setupSession() {
  const ses = session.fromPartition(PARTITION)
  if (sessionReady) return ses
  sessionReady = true
  // Grant camera + display-capture for the hosted origin (getUserMedia /
  // getDisplayMedia are refused silently otherwise). WorkCoPilot can read the
  // screen (desktop) or a camera.
  ses.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === 'media' || permission === 'display-capture')
  })
  // Answer getDisplayMedia ourselves. On a single-screen PC this uses that
  // screen with no prompt (unchanged behavior). On a multi-monitor PC it uses
  // the monitor the user chose (remembered across captures and restarts), or
  // opens the picker when there is no valid remembered choice. No audio: this is
  // a screen-only product. See resolveScreenSource in the multi-monitor section.
  ses.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const source = await resolveScreenSource()
      if (!source) return callback({})
      callback({ video: source, audio: false })
    } catch { callback({}) }
  }, { useSystemPicker: false })
  // Downloads (report PDF, audit log, deliverables): Electron shows its save
  // dialog by default; once saved, reveal the file so the user can find it.
  ses.on('will-download', (_e, item) => {
    try {
      item.once('done', (_ev, state) => {
        if (state === 'completed') { try { shell.showItemInFolder(item.getSavePath()) } catch { /* ignore */ } }
      })
    } catch { /* ignore */ }
  })
  return ses
}

// --- window.open routing ------------------------------------------------------
// The console opens its PDF report, print view, deliverables PDF and audit log
// with window.open / <a download>. Those routes need the signed-in cookie
// session, which lives ONLY in this app's partition: handing them to the
// system browser (the old behavior for every http(s) URL) opened a signed-out
// browser tab that answered 401. Same-origin URLs therefore stay inside the
// app: '?dl=1' and .log URLs become a normal download (save dialog), anything
// else opens in a framed child window that shares the session (the built-in
// PDF viewer handles the print view). Foreign http(s) links still go to the
// real browser; mailto/tel go to the OS; everything else is denied.
function isSameOrigin(url) {
  try { return new URL(url).origin === SERVER_ORIGIN } catch { return false }
}
function isDownloadUrl(url) {
  try {
    const u = new URL(url)
    return u.searchParams.get('dl') === '1' || /\.(log|csv|txt|md|zip)$/i.test(u.pathname)
  } catch { return false }
}
function handleWindowOpen({ url }) {
  if (/^(mailto|tel):/i.test(url)) { try { shell.openExternal(url) } catch { /* ignore */ } return { action: 'deny' } }
  if (!/^https?:\/\//i.test(url)) return { action: 'deny' }
  if (isSameOrigin(url)) {
    if (isDownloadUrl(url)) {
      try { session.fromPartition(PARTITION).downloadURL(url) } catch { try { shell.openExternal(url) } catch { /* ignore */ } }
      return { action: 'deny' }
    }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 960, height: 820, frame: true, autoHideMenuBar: true, alwaysOnTop: false,
        backgroundColor: '#ffffff', title: 'WorkCoPilot',
      },
    }
  }
  try { shell.openExternal(url) } catch { /* ignore */ }
  return { action: 'deny' }
}

// --- offline / unreachable-server page -------------------------------------
// The window is frameless and ALL of its chrome is drawn by the web page. When
// the hosted console cannot load (no internet, DNS, server down, captive
// portal) Electron left a black rectangle with no title bar, no retry and no
// close button: the only way out was Alt+F4. This inline page (data: URL, same
// preload bridge, no remote code) gives the user a draggable bar, what went
// wrong, a Retry and a Close, and it retries by itself as soon as the server
// answers again (a no-cors reachability probe every 8 seconds).
let lastTargetUrl = `${SERVER_URL}/work`
function buildOfflineHtml(detail, target) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>WorkCoPilot</title>
  <style>
    :root { color-scheme: dark; }
    html,body { margin:0; height:100%; background:#0b0b0f; color:#e8e8ee;
      font:14px/1.5 "Segoe UI Variable Text","Segoe UI",-apple-system,Roboto,sans-serif; -webkit-user-select:none; user-select:none; }
    .bar { height:32px; display:flex; align-items:center; padding:0 12px; gap:8px; background:#1f1f1f; -webkit-app-region:drag; font-size:12px; color:#d6d6d6; }
    .bar .dot { width:12px; height:12px; border-radius:3.5px; background:linear-gradient(140deg,#13b27a,#0a8fd6); }
    .bar b { font-weight:600; }
    .bar .sp { flex:1; }
    .bar button { -webkit-app-region:no-drag; width:46px; height:32px; border:0; background:transparent; color:#f3f3f3; cursor:default; font-size:14px; }
    .bar button:hover { background:#c42b1c; }
    .wrap { height:calc(100% - 32px); display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box; }
    .card { max-width:440px; width:100%; background:#14141b; border:1px solid #26262f; border-radius:14px; padding:22px 24px; }
    h1 { font-size:17px; margin:0 0 6px; font-weight:600; }
    p { margin:0 0 10px; color:#b8b8c4; }
    code { color:#9a9aa6; font-size:12px; word-break:break-all; }
    .row { display:flex; gap:10px; margin-top:16px; align-items:center; }
    .btn { border:1px solid #33333d; background:transparent; color:#e8e8ee; border-radius:8px; padding:8px 14px; font:inherit; font-size:13px; cursor:pointer; }
    .btn.primary { background:#0f6cbd; border-color:#0f6cbd; color:#fff; font-weight:600; }
    .btn:hover { filter:brightness(1.1); }
    .st { margin-left:auto; font-size:12px; color:#8a8a96; }
  </style></head><body>
    <div class="bar"><span class="dot"></span><b>WorkCoPilot</b><span class="sp"></span><button id="x" title="Close" aria-label="Close">&#x2715;</button></div>
    <div class="wrap"><div class="card">
      <h1>Cannot reach WorkCoPilot right now</h1>
      <p>Check your internet connection, VPN or proxy. This window retries by itself and opens the console the moment the server answers.</p>
      <p><code>${escapeHtml(detail || '')}</code></p>
      <div class="row">
        <button class="btn primary" id="retry">Retry now</button>
        <button class="btn" id="close">Close WorkCoPilot</button>
        <span class="st" id="st">Retrying automatically</span>
      </div>
    </div></div>
    <script>
      (function(){
        var target = ${JSON.stringify(target)};
        var st = document.getElementById('st');
        function retry(){ try { window.workDesktop && window.workDesktop.retryLoad && window.workDesktop.retryLoad() } catch(e){} }
        function close(){ try { window.workDesktop && window.workDesktop.winClose && window.workDesktop.winClose() } catch(e){} }
        document.getElementById('retry').addEventListener('click', retry)
        document.getElementById('close').addEventListener('click', close)
        document.getElementById('x').addEventListener('click', close)
        var n = 0
        setInterval(function(){
          n++; if (st) st.textContent = 'Retrying automatically (' + n + ')'
          // A no-cors probe resolves whenever the server is reachable at all
          // (any status), and rejects only on a network failure.
          fetch(target, { mode: 'no-cors', cache: 'no-store' }).then(retry).catch(function(){})
        }, 8000)
      })()
    </script>
  </body></html>`
}
function showOfflinePage(detail, target) {
  if (!alive(win)) return
  try { win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildOfflineHtml(detail, target))) } catch { /* ignore */ }
}
function retryLoad() {
  if (!alive(win)) return
  try { win.loadURL(lastTargetUrl) } catch { /* ignore */ }
}

function createWindow() {
  const ses = setupSession()
  closingMain = false

  win = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 380,
    minHeight: 480,
    title: 'WorkCoPilot',
    ...FRAMELESS,          // custom Fluent title bar lives in the web UI (WorkShell)
    center: true,
    alwaysOnTop: false,    // plan mode is the default; applyMode() controls on-top
    backgroundColor: '#0b0b0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep the capture + analysis loop running at full speed even when the
      // window is minimized or hidden behind the buddy. This is the key to
      // "function continues when minimized": a throttled renderer would stall
      // the watch loop the moment the window left the foreground.
      backgroundThrottling: false,
      session: ses,
    },
  })

  applyOnTop()
  // Hidden from the product's own capture and from screen shares by default
  // (privacy). The user can toggle this from the title bar or with Ctrl+Shift+Alt+S.
  win.setContentProtection(contentProtected)

  lastTargetUrl = `${SERVER_URL}/work`
  win.loadURL(lastTargetUrl)

  // Same-origin report/print/download URLs stay in the app (they need the
  // session cookie); foreign links open in the real browser. See handleWindowOpen.
  win.webContents.setWindowOpenHandler(handleWindowOpen)

  // Main-frame load failure (offline, DNS, server down): show the inline
  // offline page instead of a dead black rectangle. -3 (ERR_ABORTED) is a
  // navigation the page itself replaced and is not a failure.
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return
    if (url && /^https?:\/\//i.test(url) && isSameOrigin(url)) lastTargetUrl = url
    showOfflinePage(`${desc || 'load failed'} (${code}) ${url || ''}`.trim(), lastTargetUrl)
  })
  // Renderer crash or OOM: reload the console rather than leaving a blank window.
  win.webContents.on('render-process-gone', (_e, details) => {
    if (quitting || !alive(win)) return
    if (details && details.reason === 'clean-exit') return
    setTimeout(() => { try { if (alive(win)) win.loadURL(lastTargetUrl) } catch { /* ignore */ } }, 500)
  })

  // When the main window leaves the foreground, surface the buddy so the guidance
  // stays visible; when it comes back, tuck the buddy away. The guidance engine
  // keeps running the whole time (backgroundThrottling is off).
  win.on('minimize', showBuddy)
  win.on('hide', showBuddy)
  win.on('show', hideBuddy)
  win.on('restore', hideBuddy)
  win.on('focus', hideBuddy)
  // Reflect OS-driven maximize/restore back to the title bar's maximize button.
  // In GUIDE mode an OS maximize (double-click the bar, Win+Up) must not
  // stretch the floater edge to edge: it is undone and becomes the centered
  // guide-max instead.
  win.on('maximize', () => {
    if (mode === 'guide') { try { win.unmaximize() } catch { /* ignore */ } applyGuideMax(true); return }
    sendState()
  })
  win.on('unmaximize', () => sendState())
  win.on('enter-full-screen', () => sendState())        // reflect OS-driven full screen (F11) back to the UI toggle
  win.on('leave-full-screen', () => sendState())

  // Closing the main window closes the product. Before this, the (hidden) buddy
  // and the monitor picker were separate BrowserWindows that outlived the main
  // window, so 'window-all-closed' never fired: the process lingered with no
  // visible window and no taskbar entry, global hotkeys still grabbed, and a
  // relaunch did nothing because the single-instance lock was held by the
  // zombie and 'second-instance' only revealed a window that no longer existed.
  win.on('close', () => { closingMain = true })
  win.on('closed', () => {
    win = null
    if (quitting) return
    try { if (alive(buddy)) buddy.destroy() } catch { /* ignore */ }
    buddy = null
    try { if (alive(pickerWin)) pickerWin.destroy() } catch { /* ignore */ }
    pickerWin = null
    if (process.platform !== 'darwin') app.quit()   // macOS keeps the app alive; 'activate' recreates the window
  })
}

// --- full-screen guidance window (second monitor) --------------------------
// Pick the display the user is NOT working on: the one the main window is not on.
// With a single monitor, fall back to that one (still useful - the user alt-tabs).
function guideDisplay() {
  try {
    const all = screen.getAllDisplays()
    if (all.length < 2) return screen.getPrimaryDisplay()
    const here = alive(win) ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay()
    return all.find((d) => String(d.id) !== String(here.id)) || all[0]
  } catch { return screen.getPrimaryDisplay() }
}
// Open (or focus) a clean, full-screen guidance window on the other monitor. It
// loads the same /work/guide page the web uses, in the same cookie session, and is
// content-protected like the rest of WorkCoPilot. Read-only: the user still drives
// from the main console. Returns true so the renderer knows the desktop took it.
function openGuideWindow() {
  if (alive(guideWindow)) { try { guideWindow.show(); guideWindow.focus() } catch { /* ignore */ } ; return true }
  const disp = guideDisplay()
  const b = disp.bounds
  guideWindow = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    fullscreen: true,
    backgroundColor: '#0a0d12',
    title: 'WorkCoPilot guidance',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      session: session.fromPartition(PARTITION),
    },
  })
  // Keep WorkCoPilot out of its own screen capture, like the other windows.
  try { guideWindow.setContentProtection(true) } catch { /* best effort */ }
  guideWindow.loadURL(`${SERVER_URL}/work/guide`)
  guideWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })
  guideWindow.on('closed', () => { guideWindow = null })
  return true
}

// --- buddy window ----------------------------------------------------------
function createBuddy() {
  if (buddy && !buddy.isDestroyed()) return buddy
  const ses = session.fromPartition(PARTITION)   // SAME cookie jar/session as main

  const saved = loadBuddyPos()
  const pos = (saved && clampToDisplays(saved.x, saved.y)) || defaultBuddyPos()

  // Fixed size, non-resizable, with hard min/max equal to that size. The buddy is
  // a frameless transparent window that is shown inactive (never focused): on
  // Windows exactly that combination, when resizable, latched the native edge-
  // resize while the user dragged it and the card grew/drifted while held. The
  // size clamps plus the 'resize' re-settle below make a regression impossible
  // even if 'resizable' is ever flipped again.
  buddyH = BUDDY_H   // every fresh buddy starts compact
  buddy = new BrowserWindow({
    width: BUDDY_W,
    height: BUDDY_H,
    // Width stays hard-locked. Height has a range so the page can grow the card
    // (programmatically, never by user edge-drag) to show a long instruction in
    // full instead of clipping it. resizable:false still blocks the drag-latch
    // that caused the old drift bug; the 'resize' re-settle below pins height to
    // whatever the page last asked for.
    minWidth: BUDDY_W, maxWidth: BUDDY_W,
    minHeight: BUDDY_H_MIN, maxHeight: BUDDY_H_MAX,
    x: pos.x,
    y: pos.y,
    show: false,
    ...FRAMELESS,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'WorkCoPilot Buddy',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),   // same bridge as the console
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      session: ses,
    },
  })

  buddy.setAlwaysOnTop(true, 'screen-saver')
  // The buddy is itself an overlay showing the guidance, so keep it out of the
  // product's own screen capture and private on a share, exactly like the main
  // window.
  buddy.setContentProtection(true)

  // Desktop-pet click-through: the buddy window is a transparent canvas that
  // holds only a floating mascot + a cloud bubble + a hover control strip. By
  // DEFAULT the whole window ignores the mouse and FORWARDS it to the app behind,
  // so clicks in the empty transparent area land on the user's real work. The
  // /work/buddy page flips this off (via work:buddy-interactive) on mouseenter of
  // any interactive element (mascot / cloud / controls) so those capture clicks +
  // the drag-to-move region works, and back on when the cursor returns to the
  // empty area. forward:true keeps mouse-MOVE events flowing to the renderer even
  // while ignoring clicks, which is what lets the page detect those enter/leaves.
  try { buddy.setIgnoreMouseEvents(true, { forward: true }) } catch { /* ignore */ }
  // setBounds (grow-to-fit) and show do not reset ignore state, so re-assert it
  // once the page has loaded as a belt-and-braces default.
  try { buddy.webContents.once('did-finish-load', () => { try { if (alive(buddy)) buddy.setIgnoreMouseEvents(true, { forward: true }) } catch { /* ignore */ } }) } catch { /* ignore */ }

  buddy.loadURL(`${SERVER_URL}/work/buddy`)

  buddy.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  // Persist the last dragged position (the buddy header is a CSS drag region).
  buddy.on('moved', saveBuddyPos)
  // Re-settle: if anything ever changes the buddy's size (an OS quirk, a DPI
  // change mid-drag, a future 'resizable' regression) snap it straight back.
  buddy.on('resize', () => {
    try {
      if (!alive(buddy)) return
      const [w, h] = buddy.getSize()
      if (w !== BUDDY_W || h !== buddyH) buddy.setSize(BUDDY_W, buddyH, false)
    } catch { /* ignore */ }
  })
  buddy.on('closed', () => { buddy = null })
  return buddy
}

// The user can KILL the buddy (fully close it for this session); it then does not
// re-appear until the console is reopened or the app is relaunched (resets below).
let buddyKilled = false
function showBuddy() {
  if (quitting || closingMain || !alive(win) || buddyKilled) return
  const b = createBuddy()
  if (!b.isVisible()) b.showInactive()   // never steal focus from the app being worked in
  b.setAlwaysOnTop(true, 'screen-saver')
  try { b.webContents.send('work:buddy-shown') } catch { /* ignore */ }   // page restores from hidden
}
function hideBuddy() {
  if (buddy && !buddy.isDestroyed() && buddy.isVisible()) buddy.hide()
}
function toggleBuddy() {
  if (buddy && !buddy.isDestroyed() && buddy.isVisible()) hideBuddy()
  else showBuddy()
}

function toggleHideShow() {
  if (!alive(win)) { createWindow(); return }
  if (win.isVisible()) win.hide()        // fires 'hide' -> showBuddy
  else { win.show(); win.focus() }       // fires 'show'/'focus' -> hideBuddy
}
let hoverInteractive = false   // cursor is over the title bar while click-through is on (see setHoverInteractive)
const TITLE_BAR_H = 34         // the web title bar is 32px; a little slack for the hairline
function cursorOverTitleBar() {
  try {
    if (!alive(win)) return false
    const p = screen.getCursorScreenPoint()
    const b = win.getBounds()
    return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + TITLE_BAR_H
  } catch { return false }
}
function setClickThrough(on) {
  clickThrough = !!on
  // Turning click-behind ON from the title bar leaves the cursor on that bar; it
  // must stay clickable right away (not only after the cursor leaves and comes
  // back), otherwise the very next click on the bar falls through to the app.
  hoverInteractive = clickThrough && cursorOverTitleBar()
  if (alive(win)) win.setIgnoreMouseEvents(clickThrough && !hoverInteractive, { forward: true })
  if (alive(win)) win.webContents.send('work:clickthrough', clickThrough)
  sendState()
}
// Click-behind escape hatch. With click-through on, the window ignores every
// click, including the title-bar button that turns click-through off, so a user
// who did not know the Ctrl+Shift+Alt+W hotkey was stuck with an overlay they could
// not operate. Because mouse moves are still forwarded (forward: true), the
// renderer can tell us when the cursor is over the title bar; while it is, the
// window accepts clicks again, and it goes back to click-through when the
// cursor leaves. The user-visible mode (clickThrough) is unchanged by this.
function setHoverInteractive(on) {
  hoverInteractive = !!on
  if (!alive(win)) return
  if (!clickThrough) return               // nothing to do: the window is already interactive
  win.setIgnoreMouseEvents(!hoverInteractive, { forward: true })
}
function cycleOpacity() {
  opacityIdx = (opacityIdx + 1) % OPACITIES.length
  if (alive(win)) win.setOpacity(OPACITIES[opacityIdx])
  if (alive(win)) win.webContents.send('work:opacity', OPACITIES[opacityIdx])
  sendState()
}
function setContentProtection(on) {
  contentProtected = !!on
  try { if (alive(win)) win.setContentProtection(contentProtected) } catch { /* ignore */ }
  try { if (alive(buddy)) buddy.setContentProtection(contentProtected) } catch { /* ignore */ }
  sendState()
}

// Renderer-driven controls (the console's own buttons), so the user does not
// have to memorize hotkeys.
ipcMain.handle('work:set-clickthrough', (_e, on) => { setClickThrough(on); return clickThrough })
ipcMain.handle('work:hover-interactive', (_e, on) => { setHoverInteractive(on); return hoverInteractive })
ipcMain.handle('work:set-opacity', (_e, v) => { const n = Math.max(0.2, Math.min(1, Number(v) || 1)); if (alive(win)) win.setOpacity(n); return n })
// The offline page's Retry (and its automatic reachability probe) reload the console.
ipcMain.handle('work:retry-load', () => { retryLoad() })
// The console's Hide button: hide the main window AND bring up the buddy so the
// guidance keeps showing. (win.hide() also fires 'hide' -> showBuddy; calling it
// here too keeps the behaviour correct even if the event is ever suppressed.)
ipcMain.handle('work:hide', () => { if (alive(win)) win.hide(); showBuddy() })
// Buddy-driven controls.
// Hide the buddy AND pause guidance + save progress (owner: hidden = nothing is
// shown, and we stop watching + persist). The MAIN renderer does the pause/save
// when it receives work:pause-save, since the watch loop lives there.
ipcMain.handle('work:buddy-hide', () => { hideBuddy(); try { if (alive(win)) win.webContents.send('work:pause-save') } catch { /* ignore */ } })
// Fully close the buddy for this session (it will not re-appear until the console
// is reopened or the app is relaunched); also pause + save, like Hide.
ipcMain.handle('work:buddy-kill', () => { buddyKilled = true; try { if (alive(buddy) && !buddy.isDestroyed()) buddy.close() } catch { /* ignore */ } try { if (alive(win)) win.webContents.send('work:pause-save') } catch { /* ignore */ } })
ipcMain.on('work:buddy-height', (_e, h) => { setBuddyHeight(h) }) // page asks the card to fit its text
// Per-region click-through for the desktop-pet buddy. The page calls this with
// `on=true` when the cursor enters the mascot / cloud / controls (the window must
// capture clicks + allow the drag region), and `on=false` when the cursor returns
// to the empty transparent area (clicks pass THROUGH to the app behind). forward
// stays true so the renderer keeps receiving the mouse-move enter/leave events
// that drive this toggle.
ipcMain.handle('work:buddy-interactive', (_e, on) => {
  try { if (alive(buddy) && !buddy.isDestroyed()) buddy.setIgnoreMouseEvents(!on, { forward: true }) } catch { /* ignore */ }
  return !!on
})
ipcMain.handle('work:open-guide', () => openGuideWindow())        // full-screen guidance on the other monitor
ipcMain.handle('work:open-main', () => {                          // reopen the full console
  buddyKilled = false                                             // reopening the console un-kills the buddy
  if (!alive(win)) { createWindow(); return }
  if (win.isMinimized()) win.restore()
  win.show(); win.focus()                                         // fires 'show'/'focus' -> hideBuddy
})

// --- custom title bar (frameless) + window modes ---------------------------
// The web console draws its own Fluent-style title bar (WorkShell) because the
// window is frameless. These give that bar the window controls and the overlay
// toggles it shows after sign-in.
ipcMain.handle('work:win-minimize', () => { if (win && !win.isDestroyed()) win.minimize() })  // 'minimize' -> showBuddy
ipcMain.handle('work:win-maximize', () => {
  if (!win || win.isDestroyed()) return false
  if (mode === 'guide') return applyGuideMax()          // centered, never full-bleed
  if (win.isMaximized()) win.unmaximize(); else win.maximize()
  sendState()
  return win.isMaximized()
})
ipcMain.handle('work:win-close', () => { if (win && !win.isDestroyed()) win.close() })
// Owner 2026-10-27: the maximize button stays CENTERED (above); this is the
// separate TRUE full-screen toggle (edge to edge), useful on a second monitor.
// Full screen and the centered guide-max are mutually exclusive.
ipcMain.handle('work:win-fullscreen', () => {
  if (!win || win.isDestroyed()) return false
  const want = !win.isFullScreen()
  if (want && mode === 'guide' && guideMax) { guideMax = false }   // leave centered-max for full screen
  try { win.setFullScreen(want) } catch { /* ignore */ }
  sendState()
  return win.isFullScreen()
})
ipcMain.handle('work:set-mode', (_e, m) => applyMode(m))
ipcMain.handle('work:set-always-on-top', (_e, on) => { onTop = !!on; applyOnTop(); sendState(); return onTop })
ipcMain.handle('work:set-content-protection', (_e, on) => { setContentProtection(on); return contentProtected })
ipcMain.handle('work:get-state', () => ({
  mode, onTop, contentProtected, clickThrough,
  opacity: OPACITIES[opacityIdx],
  maximized: isMaxed(),
  fullscreen: !!(win && !win.isDestroyed() && win.isFullScreen()),
}))

// --- on-device reference documents -----------------------------------------
// The whole point of the desktop app: the raw file NEVER leaves the machine.
// The user picks documents from disk, the shell reads + extracts the text
// locally (here, in the main process), and returns only the text to the
// renderer. The renderer then governs it (strip / tokenize sensitive values on
// the device) and injects the result into the plan request for that call only -
// nothing is uploaded and nothing is stored on the server. pdf-parse / mammoth
// are required lazily so a build without them still handles text / markdown.
const DOC_TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|log|ya?ml|xml|html?|js|ts|jsx|tsx|py|java|c|cpp|h|hpp|cs|go|rb|rs|php|sh|sql|ini|conf|env|toml)$/i
const DOC_IMG_EXT = /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i

// On-device OCR (tesseract.js) so diagrams, screenshots and scanned pages read
// as TEXT on this machine - no pixels leave. The language data is bundled in
// ./ocr-lang so OCR works fully offline. One lazily-created worker is reused.
// Robustness: the worker is created behind ONE shared promise (two images in
// the same pick never start two engines), every OCR call has a hard timeout
// (a wedged worker thread used to leave the pick-doc IPC pending forever, so
// the "Add documents" button spun with no way out), and a failed or timed-out
// worker is terminated and forgotten so the next attempt starts clean.
let ocrWorkerPromise = null
const OCR_TIMEOUT_MS = 120000
function withTimeout(p, ms, message) {
  let t
  const timer = new Promise((_, reject) => { t = setTimeout(() => reject(new Error(message)), ms) })
  return Promise.race([p, timer]).finally(() => clearTimeout(t))
}
// Optional native-ish modules are required lazily; a build without one must
// produce a sentence the user can act on, not "Cannot find module".
function requireOptional(name, friendly) {
  try { return require(name) } catch { throw new Error(friendly) }
}
function getOcrWorker() {
  if (ocrWorkerPromise) return ocrWorkerPromise
  ocrWorkerPromise = (async () => {
    const { createWorker } = requireOptional('tesseract.js', 'On-device OCR is not available in this build. Export the text and add it as a .txt, or show the page on screen.')
    let cachePath
    try { cachePath = path.join(app.getPath('userData'), 'ocr-cache') } catch { cachePath = path.join(__dirname, 'ocr-lang') }
    try { fs.mkdirSync(cachePath, { recursive: true }) } catch { /* cache is an optimization only */ }
    return createWorker('eng', 1, {
      langPath: path.join(__dirname, 'ocr-lang'),   // bundled eng.traineddata (offline)
      cachePath,
      gzip: false,
    })
  })()
  const p = ocrWorkerPromise
  p.catch(() => { if (ocrWorkerPromise === p) ocrWorkerPromise = null })   // forget only our own failed start
  return p
}
async function resetOcrWorker() {
  const p = ocrWorkerPromise
  ocrWorkerPromise = null
  try { const w = await p; if (w && w.terminate) await w.terminate() } catch { /* ignore */ }
}
async function ocrImage(buf) {
  const w = await withTimeout(getOcrWorker(), OCR_TIMEOUT_MS, 'The OCR engine took too long to start. Try again, or add the text as a .txt file.')
  try {
    const { data } = await withTimeout(w.recognize(buf), OCR_TIMEOUT_MS, 'Reading this image took too long. Try a smaller or clearer image.')
    return { text: ((data && data.text) || '').trim(), confidence: Math.round((data && data.confidence) || 0) }
  } catch (e) {
    resetOcrWorker()   // never reuse a worker that failed or hung
    throw e
  }
}

// Returns { text, method:'text'|'ocr', confidence? }. Text files read directly;
// PDFs via their text layer (a scanned PDF with no text layer is reported so the
// user can export a page as an image); Word via mammoth; images via on-device OCR.
async function extractDocLocally(filePath) {
  const buf = fs.readFileSync(filePath)
  const lower = String(filePath).toLowerCase()
  if (DOC_TEXT_EXT.test(lower)) return { text: buf.toString('utf8'), method: 'text' }
  if (DOC_IMG_EXT.test(lower)) {
    const o = await ocrImage(buf)
    if (!o.text) throw new Error('No readable text found in the image')
    return { text: o.text, method: 'ocr', confidence: o.confidence }
  }
  if (lower.endsWith('.pdf')) {
    const { PDFParse } = requireOptional('pdf-parse', 'PDF reading is not available in this build. Export the page as a PNG and add that, or show it on screen.')
    const parser = new PDFParse({ data: buf })
    let t = ''
    try { const r = await parser.getText(); t = ((r && r.text) || '').trim() } finally { if (parser.destroy) await parser.destroy() }
    if (t.length < 20) throw new Error('This PDF has no text layer (looks scanned). Export the page as a PNG and add that, or show it on screen.')
    return { text: t, method: 'text' }
  }
  if (lower.endsWith('.docx')) {
    const mammoth = requireOptional('mammoth', 'Word reading is not available in this build. Save the document as .txt or PDF and add that.')
    const r = await mammoth.extractRawText({ buffer: buf })
    return { text: ((r && r.value) || '').trim(), method: 'text' }
  }
  throw new Error('Unsupported file type')
}
// The picker opens where the user last picked from. Electron 43+ defaults an
// open dialog to Downloads; before, Windows remembered the last folder itself.
function pickDirPath() {
  try { return path.join(app.getPath('userData'), 'pick-doc-dir.json') } catch { return null }
}
function loadPickDir() {
  try {
    const p = pickDirPath()
    const dir = p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).dir : ''
    return dir && fs.existsSync(dir) ? dir : undefined
  } catch { return undefined }
}
function savePickDir(filePath) {
  try { const p = pickDirPath(); if (p && filePath) fs.writeFileSync(p, JSON.stringify({ dir: path.dirname(filePath) })) } catch { /* best effort */ }
}
ipcMain.handle('work:pick-doc', async () => {
  try {
    const r = await dialog.showOpenDialog(win && !win.isDestroyed() ? win : undefined, {
      defaultPath: loadPickDir(),
      title: 'Add reference documents or diagrams - they stay on this computer',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents & diagrams', extensions: ['pdf', 'docx', 'txt', 'md', 'markdown', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff'] }],
    })
    if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: true, docs: [] }
    savePickDir(r.filePaths[0])
    const out = []
    for (const fp of r.filePaths.slice(0, 8)) {
      const name = path.basename(fp)
      try {
        const stat = fs.statSync(fp)
        if (stat.size > 10 * 1024 * 1024) { out.push({ name, error: 'Too large (10 MB max)' }); continue }
        const res = await extractDocLocally(fp)
        const text = ((res && res.text) || '').trim()
        if (!text) { out.push({ name, error: 'No readable text (image-only or protected?)' }); continue }
        out.push({ name, chars: text.length, text, method: res.method, confidence: res.confidence })
      } catch (e) { out.push({ name, error: (e && e.message) || 'Could not read this file' }) }
    }
    return { ok: true, docs: out }
  } catch (e) { return { ok: false, error: (e && e.message) || 'Could not open the file picker' } }
})

// --- multi-monitor IPC -----------------------------------------------------
// The console's (future) "Choose monitor" button calls window.workDesktop
// .pickMonitor(); this clears the remembered choice and re-prompts.
ipcMain.handle('work:pick-monitor', () => { requestMonitorPick() })
// Called only by the shell's own picker page when a tile is clicked: persist the
// chosen monitor and resolve every pending capture with it.
ipcMain.handle('work:monitor-chosen', (_e, sourceId) => {
  const chosen = (pickerSources || []).find((s) => s.id === sourceId) || null
  if (chosen) saveMonitorChoice(chosen)
  resolvePicker(chosen || primaryScreenSource(pickerSources))
})
// Picker dismissed (Esc or the "Use primary screen" button): use the primary
// screen for this capture and do NOT persist, so we prompt again next time.
ipcMain.handle('work:monitor-cancel', () => { resolvePicker(primaryScreenSource(pickerSources)) })

// List the monitors so the renderer (the plan wizard) can ask which to watch
// BEFORE guiding starts, instead of prompting at capture time.
ipcMain.handle('work:list-monitors', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
    if (!sources || sources.length <= 1) return []   // nothing to choose on a single screen
    const saved = loadMonitorChoice()
    const match = matchSavedSource(sources, saved)
    return sources.map((s, i) => {
      const meta = displayMetaFor(s)
      return {
        id: s.id,
        label: s.name || `Screen ${i + 1}`,
        primary: meta.primary,
        res: meta.res || '',
        current: match ? (match.id === s.id) : meta.primary,
      }
    })
  } catch { return [] }
})
// Persist the monitor the wizard chose and tell the renderer so any live capture
// restarts on it.
ipcMain.handle('work:choose-monitor-id', async (_e, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
    const chosen = (sources || []).find((s) => s.id === sourceId)
    if (!chosen) return { ok: false }
    saveMonitorChoice(chosen)
    notifyMonitorChanged(chosen)
    return { ok: true }
  } catch { return { ok: false } }
})

// Single instance - a second launch just reveals the existing window.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!alive(win)) { createWindow(); return }   // never a silent no-op: a relaunch always yields a window
    if (win.isMinimized()) win.restore()
    win.show(); win.focus()
  })

  // Auto-update from the WorkCoPilot feed (electron-updater, generic provider).
  // Packaged builds only; silent on any failure so an update problem never
  // affects the overlay. Checks on launch and every 6 hours for long sessions.
  function setupAutoUpdate() {
    let au
    try { au = require('electron-updater').autoUpdater } catch { return }
    au.autoDownload = true
    au.autoInstallOnAppQuit = true
    au.on('error', () => { /* never surface an updater error to the user */ })
    const check = () => { try { au.checkForUpdatesAndNotify() } catch { /* ignore */ } }
    check()
    setInterval(check, 6 * 60 * 60 * 1000)
  }

  app.whenReady().then(() => {
    createWindow()
    if (app.isPackaged) setupAutoUpdate()
    // Hide / show is Ctrl+Shift+Alt+H only. The bare Ctrl+H used to be grabbed
    // system-wide as well, which took Find-and-Replace (Word, Excel, VS Code),
    // History (Chrome, Edge) and Hide (Photoshop and others) away from the very
    // app the user is being guided through, for as long as WorkCoPilot ran.
    globalShortcut.register('CommandOrControl+Shift+Alt+H', toggleHideShow)
    // Interact-behind: toggle click-through so clicks pass to the app you are
    // working in. Global so it works even when click-through is already on (the
    // overlay cannot receive the click to turn itself back off otherwise).
    globalShortcut.register('CommandOrControl+Shift+Alt+W', () => setClickThrough(!clickThrough))
    globalShortcut.register('CommandOrControl+Shift+Alt+O', cycleOpacity)
    // Toggle hidden-from-screen-share on demand (e.g. to deliberately show the
    // overlay on a share, then hide it again).
    globalShortcut.register('CommandOrControl+Shift+Alt+S', () => setContentProtection(!contentProtected))
    // Toggle always-on-top on demand, independent of the current mode.
    globalShortcut.register('CommandOrControl+Shift+Alt+T', () => { onTop = !onTop; applyOnTop(); sendState() })
    // Manual buddy toggle, independent of the main window's state.
    globalShortcut.register('CommandOrControl+Shift+Alt+B', toggleBuddy)
    // Switch monitors anytime: clear the remembered choice and re-prompt. On a
    // single-screen PC this is a harmless no-op (nothing to choose).
    globalShortcut.register('CommandOrControl+Shift+Alt+M', requestMonitorPick)

    app.on('activate', () => { if (!alive(win)) createWindow() })
  })

  app.on('before-quit', () => { quitting = true })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('will-quit', () => { globalShortcut.unregisterAll() })
}
