// ---------------------------------------------------------------------------
// WorkCoPilot desktop shell
//
// Two always-on-top windows that load the WorkCoPilot web console (served from
// the hosted origin, so they share one cookie session):
//
//   1. MAIN console window (/work) - the full guide. ALWAYS ON TOP so the
//      guidance floats over whatever app you are using, with an OPACITY toggle
//      (Ctrl+Alt+O) and INTERACT-BEHIND / click-through (Ctrl+Alt+W) so your
//      clicks pass straight through to the app you are actually working in.
//      Answers getDisplayMedia with the chosen monitor. On a single-screen PC
//      it uses that one screen with no prompt (unchanged). On a multi-monitor
//      PC the user picks which monitor WorkCoPilot watches; the choice is
//      remembered across captures and restarts and re-pickable anytime via
//      Ctrl+Alt+M or window.workDesktop.pickMonitor(). setContentProtection(true)
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
const { app, BrowserWindow, session, globalShortcut, desktopCapturer, shell, ipcMain, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const SERVER_URL = (process.env.WORK_SERVER || 'https://admireveda.com').replace(/\/+$/, '')
const PARTITION = 'persist:workcopilot'   // its own cookie jar, separate from the other apps

const BUDDY_W = 340
const BUDDY_H = 180

let win = null          // main console window
let buddy = null        // small movable buddy window
let quitting = false
let clickThrough = false
const OPACITIES = [1, 0.85, 0.6, 0.4]
let opacityIdx = 0

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
      <p class="sub">More than one display was detected. Click the screen you want WorkCoPilot to read. You can change it anytime with Ctrl+Alt+M.</p>
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
      frame: false,
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
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: PICK_THUMB })
  if (!sources.length) return null
  if (sources.length === 1) return sources[0]
  const match = matchSavedSource(sources, loadMonitorChoice())
  if (match) return match
  return await promptForMonitor(sources)
}

// Clear the remembered choice and re-prompt now (Ctrl+Alt+M or pickMonitor()).
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

function createWindow() {
  const ses = session.fromPartition(PARTITION)
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

  win = new BrowserWindow({
    width: 460,
    height: 820,
    minWidth: 360,
    minHeight: 420,
    title: 'WorkCoPilot',
    alwaysOnTop: true,
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

  win.setAlwaysOnTop(true, 'screen-saver')
  // Keep the overlay out of its OWN screen capture (no feedback loop) and private
  // during screen shares.
  win.setContentProtection(true)

  win.loadURL(`${SERVER_URL}/work`)

  // External links open in the real browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  // When the main window leaves the foreground, surface the buddy so the guidance
  // stays visible; when it comes back, tuck the buddy away. The guidance engine
  // keeps running the whole time (backgroundThrottling is off).
  win.on('minimize', showBuddy)
  win.on('hide', showBuddy)
  win.on('show', hideBuddy)
  win.on('restore', hideBuddy)
  win.on('focus', hideBuddy)

  win.on('closed', () => { win = null })
}

// --- buddy window ----------------------------------------------------------
function createBuddy() {
  if (buddy && !buddy.isDestroyed()) return buddy
  const ses = session.fromPartition(PARTITION)   // SAME cookie jar/session as main

  const saved = loadBuddyPos()
  const pos = (saved && clampToDisplays(saved.x, saved.y)) || defaultBuddyPos()

  buddy = new BrowserWindow({
    width: BUDDY_W,
    height: BUDDY_H,
    x: pos.x,
    y: pos.y,
    show: false,
    frame: false,
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

  buddy.loadURL(`${SERVER_URL}/work/buddy`)

  buddy.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  // Persist the last dragged position (the buddy header is a CSS drag region).
  buddy.on('moved', saveBuddyPos)
  buddy.on('closed', () => { buddy = null })
  return buddy
}

function showBuddy() {
  if (quitting || !win || win.isDestroyed()) return
  const b = createBuddy()
  if (!b.isVisible()) b.showInactive()   // never steal focus from the app being worked in
  b.setAlwaysOnTop(true, 'screen-saver')
}
function hideBuddy() {
  if (buddy && !buddy.isDestroyed() && buddy.isVisible()) buddy.hide()
}
function toggleBuddy() {
  if (buddy && !buddy.isDestroyed() && buddy.isVisible()) hideBuddy()
  else showBuddy()
}

function toggleHideShow() {
  if (!win) { createWindow(); return }
  if (win.isVisible()) win.hide()        // fires 'hide' -> showBuddy
  else { win.show(); win.focus() }       // fires 'show'/'focus' -> hideBuddy
}
function setClickThrough(on) {
  clickThrough = !!on
  if (win) win.setIgnoreMouseEvents(clickThrough, { forward: true })
  if (win) win.webContents.send('work:clickthrough', clickThrough)
}
function cycleOpacity() {
  opacityIdx = (opacityIdx + 1) % OPACITIES.length
  if (win) win.setOpacity(OPACITIES[opacityIdx])
  if (win) win.webContents.send('work:opacity', OPACITIES[opacityIdx])
}

// Renderer-driven controls (the console's own buttons), so the user does not
// have to memorize hotkeys.
ipcMain.handle('work:set-clickthrough', (_e, on) => { setClickThrough(on); return clickThrough })
ipcMain.handle('work:set-opacity', (_e, v) => { const n = Math.max(0.2, Math.min(1, Number(v) || 1)); if (win) win.setOpacity(n); return n })
// The console's Hide button: hide the main window AND bring up the buddy so the
// guidance keeps showing. (win.hide() also fires 'hide' -> showBuddy; calling it
// here too keeps the behaviour correct even if the event is ever suppressed.)
ipcMain.handle('work:hide', () => { if (win) win.hide(); showBuddy() })
// Buddy-driven controls.
ipcMain.handle('work:buddy-hide', () => { hideBuddy() })          // hide just the buddy
ipcMain.handle('work:open-main', () => {                          // reopen the full console
  if (!win || win.isDestroyed()) { createWindow(); return }
  if (win.isMinimized()) win.restore()
  win.show(); win.focus()                                         // fires 'show'/'focus' -> hideBuddy
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

// Single instance - a second launch just reveals the existing window.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus() } })

  app.whenReady().then(() => {
    createWindow()
    globalShortcut.register('CommandOrControl+H', toggleHideShow)
    globalShortcut.register('CommandOrControl+Alt+H', toggleHideShow)
    // Interact-behind: toggle click-through so clicks pass to the app you are
    // working in. Global so it works even when click-through is already on (the
    // overlay cannot receive the click to turn itself back off otherwise).
    globalShortcut.register('CommandOrControl+Alt+W', () => setClickThrough(!clickThrough))
    globalShortcut.register('CommandOrControl+Alt+O', cycleOpacity)
    // Manual buddy toggle, independent of the main window's state.
    globalShortcut.register('CommandOrControl+Alt+B', toggleBuddy)
    // Switch monitors anytime: clear the remembered choice and re-prompt. On a
    // single-screen PC this is a harmless no-op (nothing to choose).
    globalShortcut.register('CommandOrControl+Alt+M', requestMonitorPick)

    app.on('activate', () => { if (!win) createWindow() })
  })

  app.on('before-quit', () => { quitting = true })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('will-quit', () => { globalShortcut.unregisterAll() })
}
