// The desktop overlay (workcopilot/main.js) driven by Playwright's Electron
// support, pointed at the E2E server (WORK_SERVER) with its OWN user-data
// folder, so a run never touches a real WorkCoPilot install on this PC (its
// cookies, remembered monitor or buddy position).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { _electron as electron } from '@playwright/test'
import { REPO } from '../support/server.mjs'

const APP_DIR = path.join(REPO, 'workcopilot')
const ELECTRON = path.join(APP_DIR, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron')

export function newUserDataDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'wc-e2e-desktop-')) }

// E2E_DESKTOP_PACKAGED=<a win-unpacked folder> runs the suite against the
// PACKAGED app (obfuscated main/preload, no source maps: what customers get)
// instead of the source, so code protection is proven not to break a flow.
const PACKAGED = process.env.E2E_DESKTOP_PACKAGED ? path.join(process.env.E2E_DESKTOP_PACKAGED, 'WorkCoPilot.exe') : null

export async function launchDesktop({ serverURL, userDataDir }) {
  if (PACKAGED && !fs.existsSync(PACKAGED)) throw new Error(`E2E_DESKTOP_PACKAGED points at no packaged app (expected ${PACKAGED})`)
  if (!PACKAGED && !fs.existsSync(ELECTRON)) throw new Error(`Electron is not installed for the desktop app. Run: npm ci --prefix workcopilot (expected ${ELECTRON})`)
  const app = await electron.launch({
    executablePath: PACKAGED || ELECTRON,
    args: PACKAGED ? [`--user-data-dir=${userDataDir}`] : [APP_DIR, `--user-data-dir=${userDataDir}`],
    cwd: PACKAGED ? path.dirname(PACKAGED) : APP_DIR,
    env: { ...process.env, WORK_SERVER: serverURL, ELECTRON_ENABLE_LOGGING: '1' },
    timeout: 60_000,
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  // Electron windows have no baseURL: let the shared page objects keep using
  // relative paths ('/work/start') by resolving them against the server here.
  const goto = page.goto.bind(page)
  page.goto = (url, opts) => goto(/^https?:/.test(url) ? url : serverURL + url, opts)
  return { app, page }
}

// The main console window's state, read from Electron itself (not from the page).
export function mainWindowState(app) {
  return app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((x) => !x.isDestroyed() && /\/work|\/workcopilot/.test(x.webContents.getURL())) || BrowserWindow.getAllWindows()[0]
    const h = w.getNativeWindowHandle()
    return {
      url: w.webContents.getURL(),
      onTop: w.isAlwaysOnTop(),
      opacity: w.getOpacity(),
      visible: w.isVisible(),
      hwnd: h.length >= 8 ? h.readBigUInt64LE(0).toString() : String(h.readUInt32LE(0)),
    }
  })
}

// Win32 truth for a window handle: the extended style (WS_EX_TRANSPARENT is what
// makes a window click-through) and the display affinity (what screen capture
// may see). Read with P/Invoke through Windows PowerShell; no extra packages.
export function win32Probe(hwnd) {
  if (process.platform !== 'win32') return null
  const ps = `
Add-Type -Namespace E2E -Name W -MemberDefinition @'
[DllImport("user32.dll")] public static extern System.IntPtr GetWindowLongPtrW(System.IntPtr h, int i);
[DllImport("user32.dll")] public static extern bool GetWindowDisplayAffinity(System.IntPtr h, out uint a);
'@
$h = [System.IntPtr]::new([long]${hwnd})
$ex = [E2E.W]::GetWindowLongPtrW($h, -20).ToInt64()
$a = 0; $ok = [E2E.W]::GetWindowDisplayAffinity($h, [ref]$a)
"$ex $a $ok"`
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 30_000 }).trim().split(/\s+/)
  const exStyle = Number(out[0])
  return {
    exStyle,
    transparent: (exStyle & 0x20) !== 0,      // WS_EX_TRANSPARENT: clicks fall through
    layered: (exStyle & 0x80000) !== 0,       // WS_EX_LAYERED: needed for opacity
    topmost: (exStyle & 0x8) !== 0,           // WS_EX_TOPMOST
    affinity: Number(out[1]),                 // 0 none, 1 WDA_MONITOR, 0x11 WDA_EXCLUDEFROMCAPTURE
  }
}
