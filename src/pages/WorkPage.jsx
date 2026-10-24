import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Check, X, Plus, LogOut, ChevronLeft, Trash2, Download, Monitor, Camera, Eye, HelpCircle, Square, Play, AlertTriangle, ClipboardCopy, Menu as MenuIcon, PictureInPicture2, Sun, Moon, ScanLine, Printer, Zap, ExternalLink, Globe, LayoutDashboard, BookOpen, ChevronRight, Sparkles, Rocket, Megaphone, Calculator, Scale, Compass, ServerCog, Blocks, Clock, Smartphone, AppWindow, ArrowRight, LifeBuoy, Users, FileText, CreditCard, ShieldCheck, RefreshCw, Paperclip, PenLine, Upload, FileSpreadsheet, Building2, Phone, MapPin, BarChart3 } from 'lucide-react'
import SupportTickets from '../components/SupportTickets.jsx'
import MfaGate from '../components/MfaGate.jsx'
import WorkTeam from './WorkTeam.jsx'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'
import WorkShell from '../workShell.jsx'
import { useTheme } from '../theme.jsx'
import { clean, isDlpActive } from '../scrub.js'
import { redactFrame, warmFrameScrub } from '../frame_scrub.js'

const linkHost = (u) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return 'link' } }

// Read a file the user attaches MID-TASK into a context payload for the engine.
// An image (screenshot or phone photo) is returned as a data URL, on-device
// redacted first when DLP is on (so sensitive pixels never leave). A text-readable
// file is returned as plain text. A binary doc (PDF/Word) the browser cannot read
// is flagged unsupported with a clear message - the desktop app extracts those,
// and on the web the user can paste the text instead. Never throws.
const CONTEXT_TEXT_RE = /\.(txt|md|markdown|csv|tsv|json|log|ya?ml|ini|conf|cfg|xml|html?|rtf)$/i
async function readContextFile(file) {
  if (!file) return {}
  const name = String(file.name || '')
  const isImg = String(file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(name)
  if (isImg) {
    try {
      const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('read failed')); fr.readAsDataURL(file) })
      const image = isDlpActive() ? await redactFrame(dataUrl).catch(() => dataUrl) : dataUrl
      return { image }
    } catch { return { error: 'That image could not be read. Try another.' } }
  }
  if (CONTEXT_TEXT_RE.test(name) || String(file.type || '').startsWith('text/')) {
    try { const text = await file.text(); return { docsText: String(text || '').slice(0, 8000) } }
    catch { return { error: 'That file could not be read.' } }
  }
  return { error: 'On the web you can attach an image or a text file, or paste the text. The desktop app also reads PDFs and Word files.' }
}

// ===========================================================================
// On-device data parsing for "Compute from a file". The WHOLE point is privacy:
// the attached CSV / Excel file is read ENTIRELY here in the browser. The raw
// rows never leave the machine - only a derived schema (column names + types)
// and the row count are ever sent, to plan a safe computation that is then run
// locally. Nothing here touches the network.
// ===========================================================================

// A small, robust CSV parser. Handles quoted fields, embedded commas, escaped
// quotes (""), and CRLF / LF line endings. Returns an array of string rows.
// Newlines inside a quoted field are preserved. No dependency.
function parseCsv(text) {
  const s = String(text == null ? '' : text)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === ',') { row.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }         // CR is dropped; LF ends the row
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += ch; i++
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

// Infer a column's type from its (non-empty) values. 'number' when every value
// is numeric once $ , % and spaces are stripped; 'date' when the values parse as
// dates and look date-shaped (so plain integers are not mistaken for dates);
// otherwise 'string'.
function looksNumeric(v) {
  const n = String(v).replace(/[$,%\s]/g, '')
  return n !== '' && /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(n)
}
function looksDate(v) {
  const s = String(v).trim()
  if (!s || looksNumeric(s)) return false
  if (!/[-/:]|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(s)) return false
  return !Number.isNaN(Date.parse(s))
}
function inferType(values) {
  const vals = values.map((v) => String(v == null ? '' : v).trim()).filter((v) => v !== '')
  if (!vals.length) return 'string'
  if (vals.every(looksNumeric)) return 'number'
  if (vals.every(looksDate)) return 'date'
  return 'string'
}

// Turn a matrix (array of string rows) into a table: unique column names, row
// objects keyed by column name, an inferred schema, and the row count. Blank rows
// are dropped. The first non-empty row is the header. Returns { name, rows,
// schema, rowCount } or { error }.
function matrixToTable(matrix, name) {
  const grid = (matrix || []).map((r) => (Array.isArray(r) ? r : [r]))
    .filter((r) => r.some((c) => String(c == null ? '' : c).trim() !== ''))
  if (!grid.length) return { error: 'That file has no data in it. Check it has a header row and at least one row of values.' }
  const rawHead = grid[0]
  const names = []
  const seen = Object.create(null)
  rawHead.forEach((h, i) => {
    let nm = String(h == null ? '' : h).trim() || `Column ${i + 1}`
    if (seen[nm] != null) { seen[nm] += 1; nm = `${nm} (${seen[nm]})` } else { seen[nm] = 0 }
    names.push(nm)
  })
  const dataRows = grid.slice(1)
  const rows = dataRows.map((r) => {
    const o = {}
    names.forEach((nm, i) => { o[nm] = r[i] == null ? '' : r[i] })
    return o
  })
  const schema = names.map((nm) => ({ name: nm, type: inferType(rows.map((r) => r[nm])) }))
  return { name: String(name || 'file'), rows, schema, rowCount: rows.length }
}

const XLSX_RE = /\.(xlsx|xlsm|xls)$/i
// Parse an attached file on the device. CSV / text is read directly; a spreadsheet
// lazily loads SheetJS from a pinned CDN (the same pattern the app already uses
// for tesseract.js) ONLY when a spreadsheet is picked, and reads its first sheet.
// Never throws; a failure comes back as { error } with a clear, actionable message.
async function parseDataFile(file) {
  if (!file) return { error: 'No file was selected.' }
  const name = String(file.name || '')
  const isXlsx = XLSX_RE.test(name) || /spreadsheetml|ms-excel/i.test(String(file.type || ''))
  if (isXlsx) {
    let XLSX
    try {
      XLSX = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')
    } catch {
      return { error: 'The spreadsheet reader could not load (you may be offline). Save the sheet as CSV and attach that instead.' }
    }
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const first = (wb.SheetNames || [])[0]
      const ws = first ? wb.Sheets[first] : null
      if (!ws) return { error: 'That workbook has no readable sheet. Save the first sheet as CSV and attach that.' }
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: false })
      return matrixToTable(aoa, name)
    } catch {
      return { error: 'That spreadsheet could not be read. Save the first sheet as CSV and attach that instead.' }
    }
  }
  try {
    const text = await file.text()
    return matrixToTable(parseCsv(text), name)
  } catch {
    return { error: 'That file could not be read. Attach a .csv, .xlsx or .xls file.' }
  }
}

import { api } from '../api.js'
import AnswerBody from '../components/AnswerBody.jsx'
import RichText from '../components/RichText.jsx'
import AliveBuddy, { readBuddyPref, resolveCharacter } from '../components/AliveBuddy.jsx'
import GuideFontControl, { useGuideFontScale } from '../components/GuideFontScale.jsx'
import { stepWindow, progressText, stepProgress, planMarker } from '../shared/step_window.js'
import BuddyPicker from '../components/BuddyPicker.jsx'
import ScrubRules from '../components/ScrubRules.jsx'
import ResultCard from '../components/ResultCard.jsx'
import ComposeCard from '../components/ComposeCard.jsx'
import ComputeCard from '../components/ComputeCard.jsx'
// The deterministic compute engine (pure, dependency-free) is the SINGLE source
// of truth, shared with the server. We import it; we never reimplement it. The
// spec is re-validated locally (defense in depth) and then run on the FULL local
// rows here on the device - the raw rows never go to the server.
import { runSpec, validateSpec } from '../../server/compute_spec.js'

// WorkCoPilot - a read-only, screen-aware guide. You give it a goal (type or
// paste), it reads your screen (or a phone camera) in DOWNSCALED frames, gives
// you an ordered checklist, then watches and advances each step when its
// validation condition is seen. It never acts for you. See docs/workcopilot-spec.md.

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }
const shell = { minHeight: '100vh', background: 'var(--bg)' }
const PRODUCT_KEY = 'meet-login-product'   // shared with the main login + MeetAiGene

// ---- frame pipeline (cost discipline) -------------------------------------
// Downscale any capture to <=1280px wide JPEG. This is THE cost lever: the model
// is billed per image token, which scales with resolution, so a 4K screen is
// shrunk before it ever leaves the machine.
const MAX_W = 1280
// The continuous watch loop runs many times an hour, and the image is the bulk of
// each call's cost, so its frames are smaller (still readable for UI state). The
// one-off plan / "what is this" reads keep the full 1280 for detail.
const WATCH_MAX_W = 1024
function frameFromVideo(video, maxW = MAX_W) {
  if (!video || !video.videoWidth) return null
  const scale = Math.min(1, maxW / video.videoWidth)
  const w = Math.round(video.videoWidth * scale)
  const h = Math.round(video.videoHeight * scale)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0, w, h)
  return c.toDataURL('image/jpeg', 0.6)
}
// A tiny grayscale signature for change detection, so an unchanged screen costs
// nothing (no frame is sent). Returns a Uint8 array of ~48x30 luma.
function signatureFromVideo(video) {
  if (!video || !video.videoWidth) return null
  const w = 48, h = 30
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const out = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) out[j] = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0
  return out
}
function changed(a, b, threshold = 6) {
  if (!a || !b || a.length !== b.length) return true
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return (sum / a.length) > threshold
}
// True on phones and tablets, where getDisplayMedia (screen share) is not
// available, so the camera "Photo" capture is the primary way to show
// WorkCoPilot a screen, a device or paper.
function isMobileUA() {
  try { return /Android|iPhone|iPad|iPod|Mobile/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '') } catch { return false }
}
// Build a downscaled JPEG frame from a chosen image file (the mobile Photo
// path). Same <=1280px, quality 0.6 budget as frameFromVideo, so a photo costs
// the same as a live frame. Dependency-free: decodes via an Image onto a canvas.
function frameFromImageFile(file, maxW = MAX_W) {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        try {
          const iw = img.naturalWidth || img.width || maxW
          const ih = img.naturalHeight || img.height || maxW
          const scale = Math.min(1, maxW / iw)
          const w = Math.round(iw * scale), h = Math.round(ih * scale)
          const c = document.createElement('canvas'); c.width = w; c.height = h
          c.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(c.toDataURL('image/jpeg', 0.6))
        } catch (e2) { reject(e2) } finally { try { URL.revokeObjectURL(url) } catch {} }
      }
      img.onerror = () => { try { URL.revokeObjectURL(url) } catch {}; reject(new Error('decode failed')) }
      img.src = url
    } catch (e) { reject(e) }
  })
}

// ---- unified login --------------------------------------------------------
function Auth({ onAuthed }) {
  const [product, setProduct] = useState('work')
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [mfa, setMfa] = useState(null)            // { mode, enroll?, username }
  const [mfaBusy, setMfaBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState(null)
  const pendingUser = useRef(null)                // user to onAuthed after backup codes saved
  const setProd = (p) => {
    setErr('')
    try { localStorage.setItem(PRODUCT_KEY, p) } catch {}
    if (p === 'work') { setProduct('work'); setMode('login'); return }
    // Every other product lives on the main sign-in screen's picker.
    window.location.assign('/login')
  }
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = mode === 'login' ? await api.workLogin(username, password) : await api.workSignup(username, password)
      if (r && r.mfaSetup) { setMfa({ mode: 'setup', enroll: r.enroll, username }); return }
      if (r && r.mfaRequired) { setMfa({ mode: 'verify', username }); return }
      onAuthed(r.user)
    } catch (e2) { setErr(e2.message || 'Sign-in failed') } finally { setBusy(false) }
  }
  // Authenticator gate: throws on a bad code so MfaGate shows it. Setup returns the
  // one-time backup codes (shown before entering the app); verify signs in.
  const handleMfaSubmit = async (code) => {
    setMfaBusy(true)
    try {
      if (mfa.mode === 'setup') {
        const r = await api.workLoginMfaSetup(code)
        pendingUser.current = r.user
        setBackupCodes(r.backupCodes || [])
      } else {
        const r = await api.workLoginMfa(code)
        onAuthed(r.user)
      }
    } catch (e2) {
      if (e2 && (e2.status === 440 || (e2.data && e2.data.restart))) { setMfa(null); setBackupCodes(null); setErr('Your sign-in session timed out. Please sign in again.') }
      throw e2
    } finally { setMfaBusy(false) }
  }
  const handleMfaDone = () => { if (pendingUser.current) onAuthed(pendingUser.current) }
  return (
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 16 }}>
      {mfa ? (
        <div style={{ ...card, width: 440, maxWidth: '100%', padding: 24 }}>
          <MfaGate mode={mfa.mode} enroll={mfa.enroll} username={mfa.username} backupCodes={backupCodes} busy={mfaBusy} onSubmit={handleMfaSubmit} onDone={handleMfaDone} />
        </div>
      ) : (
      <form onSubmit={submit} style={{ ...card, width: 380, maxWidth: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-600)' }}>WorkCoPilot</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -6 }}>Your read-only on-screen guide. Choose what to open and sign in.</div>
        <label className="label" style={{ fontSize: 12, color: 'var(--text-dim)' }}>Open</label>
        <select className="select" value={product} onChange={(e) => setProd(e.target.value)}>
          <option value="work">WorkCoPilot: on-screen guide</option>
          <option value="meet">MeetAiGene: meetings</option>
          <option value="app">AI Cloud: interview assistant</option>
          <option value="viva">VIVA: project defence</option>
        </select>
        <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{err}</div>}
        <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <Loader2 size={15} className="spin" /> : null} {mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setErr(''); setMode(mode === 'login' ? 'signup' : 'login') }}>
          {mode === 'login' ? 'New here? Create a WorkCoPilot account' : 'Have an account? Sign in'}
        </button>
      </form>
      )}
    </div>
  )
}

// ---- AI readiness (own key when platform AI is not allowed) ---------------
function AiSetup({ onReady, bare }) {
  const [st, setSt] = useState(null)
  const [providers, setProviders] = useState([])
  const [providerId, setProviderId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { api.workAi().then((r) => { setSt(r.status); setProviders(r.providers || []); if (r.status.ownProvider) setProviderId(r.status.ownProvider); onReady && onReady(r.status.ready) }).catch(() => {}) }, []) // eslint-disable-line
  const save = async () => {
    setBusy(true); setErr(''); setMsg('')
    try {
      await api.workAiKey({ providerId, apiKey }); setApiKey('')
      const r = await api.workAiTest(); setSt(r.status); onReady && onReady(r.status.ready)
      if (r.ok && r.hasVision) setMsg('Ready. This key can read a screen.')
      else if (r.ok && !r.hasVision) setErr('The key works, but it cannot read images, so WorkCoPilot cannot read a screen. Use a key that supports reading images.')
      else setErr(r.error || 'Key test failed')
    } catch (e) { setErr(e.message || 'Failed') } finally { setBusy(false) }
  }
  if (!st) return null
  if (st.ready) return bare ? null : <div style={{ ...card, padding: 14, color: 'var(--brand-600)', fontWeight: 600 }}><Check size={15} style={{ verticalAlign: -2 }} /> AI is ready</div>
  if (st.platformAllowed) return <div style={{ ...card, padding: 14, color: 'var(--danger)' }}>The platform AI is not configured yet. Ask the administrator.</div>
  return (
    <div style={{ ...(bare ? {} : card), padding: bare ? 0 : 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <b>Add your AI key to start</b>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>WorkCoPilot reads your screen, so the key needs to support reading images. We check that automatically when you save it.</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="select" value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="">Provider…</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        <input className="input" style={{ flex: 1, minWidth: 160 }} type="password" placeholder="API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <button className="btn btn-primary" disabled={busy || !providerId || !apiKey} onClick={save}>{busy ? <Loader2 size={14} className="spin" /> : null} Save and test</button>
      </div>
      {msg && <div style={{ color: 'var(--brand-600)', fontSize: 13 }}>{msg}</div>}
      {err && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
    </div>
  )
}

// ---- Scope wizard: a short, adaptive requirement intake before planning -----
// Our platform model asks a few goal-specific questions (like a consultant
// scoping a job), then the answers are stored on the session and folded into
// the plan. Tier-gated steps show an upgrade nudge but never block.
function tierRank(t) { const m = { lite: 0, basic: 1, advanced: 2, premium: 3 }; return m[t] != null ? m[t] : 1 }
function ScopeWizard({ goal, tier, onCancel, onReady }) {
  const [phase, setPhase] = useState('loading')   // loading | ask | error
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [txt, setTxt] = useState('')
  const [err, setErr] = useState('')
  // Always ask WHERE the work happens (so the plan targets the right surface, not
  // a browser by default) and HOW to phrase it. Both fold into the plan + live
  // guidance. The environment answer is first because it shapes every step.
  const ENV_Q = { id: 'environment', text: 'Where does this work happen?', help: 'Where will you actually be doing this? If you are not sure, pick "Not sure / mixed" and I will work it out from your screen.', kind: 'options', options: ['A website / web app', 'A desktop or installed app', 'Install & configure software', 'An on-prem product at a local address', 'Not sure / mixed'] }
  const STYLE_Q = { id: 'phrasing', text: 'How should I phrase each step?', help: 'Just how the steps read. You can change this any time.', kind: 'options', options: ['Plain and simple', 'Short bullets only', 'Detailed, with context', 'Expert, no hand-holding'] }
  // Plain-language hint under each option so a non-technical person can choose
  // confidently. Keyed by the exact option text.
  const OPTION_HINTS = {
    'A website / web app': 'Something you use in a browser tab (Gmail, the AWS console, Salesforce, a bank site).',
    'A desktop or installed app': 'A program installed on your computer (Excel, Photoshop, QuickBooks, an IDE).',
    'Install & configure software': 'You need to download, install or set something up first.',
    'An on-prem product at a local address': 'A tool you open at an internal address like 192.168.x.x or an intranet link, not the public internet.',
    'Not sure / mixed': 'Not sure, or it spans a few of these. I will adapt once I can see your screen.',
    'Plain and simple': 'Everyday words, no jargon. Best if this area is new to you.',
    'Short bullets only': 'Quick, terse steps with little explanation.',
    'Detailed, with context': 'Fuller steps that also say why, so you learn as you go.',
    'Expert, no hand-holding': 'Assumes you know the tools; high-level and concise.',
  }
  useEffect(() => {
    let alive = true
    ;(async () => {
      // Desktop app with more than one monitor: ask which screen to watch here,
      // in the wizard, instead of prompting at capture time. Single-screen or web
      // returns nothing, so the step is skipped.
      let monQ = null
      try {
        const desk = typeof window !== 'undefined' ? window.workDesktop : null
        if (desk && desk.getMonitors) {
          const mons = await desk.getMonitors()
          if (Array.isArray(mons) && mons.length > 1) monQ = { id: 'monitor', text: 'Which screen should I watch?', kind: 'monitor', monitors: mons }
        }
      } catch { /* ignore - fall back to the capture-time picker */ }
      try {
        const r = await api.workScope(goal)
        if (!alive) return
        const qs = (r && r.questions) || []
        setQuestions([ENV_Q, ...(monQ ? [monQ] : []), STYLE_Q, ...qs]); setPhase('ask')
      } catch (e) { if (alive) { setErr((e && e.message) || 'Could not scope this.'); setPhase('error') } }
    })()
    return () => { alive = false }
  }, [])   // eslint-disable-line
  const cur = questions[idx]
  const advance = (a) => {
    const rec = (a != null && String(a).trim()) ? [...answers, { id: cur.id, q: cur.text, a: String(a).trim() }] : answers
    setAnswers(rec); setTxt('')
    if (idx + 1 >= questions.length) onReady(rec)
    else setIdx(idx + 1)
  }
  const back = () => { if (idx > 0) { setIdx(idx - 1); setTxt('') } }

  return (
    <div className="wd-wiz" onClick={() => onCancel()}>
      <div className="wd-wiz-card" onClick={(e) => e.stopPropagation()}>
        {phase === 'loading' && <div className="wd-wiz-load"><Loader2 size={18} className="spin" /> Understanding what you need…</div>}
        {phase === 'error' && (
          <div>
            <div style={{ color: 'var(--danger)', marginBottom: 14 }}>{err}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => onCancel()}>Back</button>
              <button className="btn btn-primary" onClick={() => onReady([])}>Plan anyway</button>
            </div>
          </div>
        )}
        {phase === 'ask' && cur && (() => {
          const gated = cur.tierGate && tierRank(tier) < tierRank(cur.tierGate)
          const last = idx + 1 >= questions.length
          return (
            <>
              <div className="wd-wiz-top">
                <span className="wd-wiz-eyebrow"><Sparkles size={13} /> Scoping your plan</span>
                <button className="wd-wiz-x" onClick={() => onCancel()} aria-label="Cancel">&times;</button>
              </div>
              <div className="wd-wiz-prog">{questions.map((_, i) => <span key={i} className={i <= idx ? 'on' : ''} />)}</div>
              <div className="wd-wiz-q">{cur.text}</div>
              {cur.help && <div className="wd-wiz-help"><HelpCircle size={13} /> {cur.help}</div>}
              {gated && (
                <div className="wd-wiz-gate">
                  <span><Zap size={13} /> Grounding on your own documents is on Advanced & Premium. Answer anyway, I plan with what your plan allows.</span>
                  <button className="btn btn-sm btn-primary" onClick={() => onCancel('upgrade')}>Upgrade</button>
                </div>
              )}
              {cur.kind === 'text' ? (
                <div className="wd-wiz-text">
                  <textarea rows={2} autoFocus placeholder={cur.placeholder || 'Type your answer'} value={txt} onChange={(e) => setTxt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); advance(txt) } }} />
                  <button className="btn btn-primary" onClick={() => advance(txt)}>{last ? 'Build my plan' : 'Next'} <ArrowRight size={15} /></button>
                </div>
              ) : cur.kind === 'monitor' ? (
                <div className="wd-wiz-choices">
                  {cur.monitors.map((m) => (
                    <button key={m.id} className="wd-wiz-choice" onClick={() => { try { window.workDesktop && window.workDesktop.chooseMonitorId && window.workDesktop.chooseMonitorId(m.id) } catch { /* ignore */ } advance(m.label + (m.primary ? ' (primary)' : '')) }}>
                      <Monitor size={15} style={{ verticalAlign: -3, marginRight: 7 }} />{m.label}{m.res ? ` · ${m.res}` : ''}{m.primary ? ' · primary' : ''}{m.current ? ' · current' : ''}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="wd-wiz-choices">
                  {(cur.kind === 'yesno' ? ['Yes', 'No'] : cur.options).map((o) => (
                    <button key={o} className={`wd-wiz-choice${OPTION_HINTS[o] ? ' has-hint' : ''}`} onClick={() => advance(o)}>
                      <span className="wd-wiz-choice-l">{o}</span>
                      {OPTION_HINTS[o] && <span className="wd-wiz-choice-h">{OPTION_HINTS[o]}</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="wd-wiz-foot">
                {idx > 0 && <button className="wd-wiz-link" onClick={back}><ChevronLeft size={14} /> Back</button>}
                <button className="wd-wiz-link" onClick={() => advance(null)}>Skip</button>
                <button className="wd-wiz-link strong" onClick={() => onReady(answers)}>I'm ready, build my plan <ArrowRight size={13} /></button>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}

// ---- Home hero illustration -----------------------------------------------
// Hand-drawn inline SVG (no network, no licensing): a guided workspace - a
// window with steps being ticked off, the current step lit, and the buddy
// pointing at it along a dotted path. Every color is a theme token or
// currentColor so it reads the same in dark and light.
function WdHeroArt() {
  return (
    <svg className="wd-hero-art" viewBox="0 0 340 220" fill="none" aria-hidden="true" focusable="false">
      {/* soft ground */}
      <ellipse cx="178" cy="124" rx="150" ry="92" fill="var(--em-fill)" />
      <ellipse cx="226" cy="94" rx="92" ry="66" fill="color-mix(in srgb,var(--em-2) 9%,transparent)" />
      {/* the window */}
      <rect x="54" y="30" width="208" height="150" rx="14" fill="var(--panel)" stroke="var(--line-2)" />
      <path d="M54 58h208" stroke="var(--line)" />
      <circle cx="70" cy="44" r="3.2" fill="var(--line-2)" />
      <circle cx="81" cy="44" r="3.2" fill="var(--line-2)" />
      <circle cx="92" cy="44" r="3.2" fill="var(--line-2)" />
      <rect x="196" y="39" width="52" height="10" rx="5" fill="var(--chip)" stroke="var(--line)" />
      {/* step 1 - done */}
      <circle cx="84" cy="82" r="9" fill="var(--em)" />
      <path d="M79.5 82.2l3 3 6-6.4" stroke="var(--on-em)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="104" y="77" width="94" height="9" rx="4.5" fill="var(--line-2)" />
      {/* step 2 - done */}
      <circle cx="84" cy="110" r="9" fill="var(--em)" />
      <path d="M79.5 110.2l3 3 6-6.4" stroke="var(--on-em)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="104" y="105" width="72" height="9" rx="4.5" fill="var(--line-2)" />
      {/* step 3 - the one being guided now */}
      <rect x="66" y="126" width="184" height="26" rx="9" fill="var(--em-fill)" stroke="var(--em-line)" />
      <circle cx="84" cy="139" r="9" fill="var(--panel)" stroke="var(--em)" strokeWidth="2" />
      <circle cx="84" cy="139" r="3.4" fill="var(--em)" />
      <rect x="104" y="134.5" width="110" height="9" rx="4.5" fill="var(--tx)" opacity=".42" />
      <rect x="222" y="134.5" width="18" height="9" rx="4.5" fill="var(--em)" opacity=".8" />
      {/* step 4 - next, still quiet */}
      <circle cx="84" cy="166" r="9" stroke="var(--line-2)" strokeDasharray="3 3" />
      <rect x="104" y="161" width="84" height="9" rx="4.5" fill="var(--line)" />
      {/* dotted guide path from the buddy to the current step */}
      <path d="M276 176c-6-18-20-30-36-33" stroke="var(--em-2)" strokeWidth="1.6" strokeDasharray="3.5 4.5" strokeLinecap="round" />
      <circle cx="240" cy="143" r="3" fill="var(--em-2)" />
      {/* the buddy */}
      <circle cx="286" cy="190" r="22" fill="var(--panel)" stroke="var(--em-line)" strokeWidth="1.5" />
      <circle cx="286" cy="190" r="16" fill="var(--em-fill-2)" />
      <circle cx="280" cy="187" r="2.4" fill="var(--em)" />
      <circle cx="292" cy="187" r="2.4" fill="var(--em)" />
      <path d="M280.5 195c2.8 2.6 8.2 2.6 11 0" stroke="var(--em)" strokeWidth="1.8" strokeLinecap="round" />
      {/* sparkles */}
      <path d="M44 100l2.2 5.8 5.8 2.2-5.8 2.2L44 116l-2.2-5.8L36 108l5.8-2.2z" fill="var(--em-2)" opacity=".55" />
      <path d="M290 36l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="var(--warm)" opacity=".55" />
      <circle cx="310" cy="128" r="2.5" fill="var(--em)" opacity=".5" />
      <circle cx="36" cy="162" r="2" fill="var(--em-2)" opacity=".5" />
    </svg>
  )
}

// ---- Home: start a session, resume saved ones, get the apps ---------------
const WD_CSS = `
.wd{
  /* dark is the default palette; light overrides below follow the app theme */
  --ink:#0a0b12;--ink-soft:#0d0e18;
  --panel:#13141f;--panel-2:#181b27;--panel-3:#1e2131;
  --line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.15);
  --tx:#eef0f6;--tx-2:#d3d8e6;--mut:#9aa0b4;--mut-2:#b6bccf;
  --em:#6ee7b7;--em-2:#38bdf8;--on-em:#052a1d;
  --warm:#ffb561;--warm-2:#ff7a59;--cta-ink:#241206;
  --violet:#b98cff;--rose:#ff7a9c;
  --em-fill:rgba(110,231,183,.10);--em-fill-2:rgba(110,231,183,.17);--em-line:rgba(110,231,183,.34);
  --warm-fill:rgba(255,160,80,.08);--warm-line:rgba(255,160,80,.32);
  --card-a:rgba(255,255,255,.045);--card-b:rgba(255,255,255,.012);
  --chip:rgba(255,255,255,.05);--chip-line:rgba(255,255,255,.12);
  --field:#0b0c13;--track:rgba(255,255,255,.08);
  --shadow:0 30px 70px -46px rgba(0,0,0,.85);--shadow-sm:0 2px 10px rgba(0,0,0,.35);
  --focus:#8cf5c4;--danger:#ff6b6b;
  --orb-1:rgba(57,211,255,.40);--orb-2:rgba(140,245,196,.32);--orb-op:.22;
  /* dashboard cards: flat panel, 1px line, soft lift (the admin-console calm) */
  --card-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 26px -20px rgba(0,0,0,.8);
  --card-shadow-hover:0 1px 0 rgba(255,255,255,.04) inset,0 14px 30px -18px rgba(0,0,0,.9);
  --info:#7cc6ff;--info-fill:rgba(56,189,248,.10);--info-line:rgba(56,189,248,.30);
  position:relative;min-height:100vh;background:var(--ink);color:var(--tx);
  font-family:"Figtree",system-ui,sans-serif;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
[data-theme='light'] .wd{
  --ink:#f3f5fb;--ink-soft:#ffffff;
  --panel:#ffffff;--panel-2:#ffffff;--panel-3:#f6f8fd;
  --line:#e6e8f1;--line-2:#d3d7e5;
  --tx:#161a2b;--tx-2:#2b3250;--mut:#5c6484;--mut-2:#434a68;
  --em:#0e9f6e;--em-2:#0b8fd6;--on-em:#ffffff;
  --warm:#c85a16;--warm-2:#e4612f;--cta-ink:#ffffff;
  --violet:#7a4ddb;--rose:#d23e6b;
  --em-fill:rgba(14,159,110,.08);--em-fill-2:rgba(14,159,110,.14);--em-line:rgba(14,159,110,.30);
  --warm-fill:rgba(200,90,22,.07);--warm-line:rgba(200,90,22,.28);
  --card-a:#ffffff;--card-b:#fbfcff;
  --chip:#f1f3fa;--chip-line:#e2e6f1;
  --field:#fbfcff;--track:rgba(20,30,70,.10);
  --shadow:0 22px 48px -30px rgba(30,40,80,.30);--shadow-sm:0 2px 12px rgba(30,40,80,.08);
  --focus:#0e9f6e;--danger:#e23b4e;
  --orb-1:rgba(11,143,214,.16);--orb-2:rgba(14,159,110,.14);--orb-op:.22;
  --card-shadow:0 1px 2px rgba(26,31,54,.05),0 8px 22px -14px rgba(26,31,54,.14);
  --card-shadow-hover:0 1px 2px rgba(26,31,54,.06),0 12px 28px -14px rgba(26,31,54,.20);
  --info:#0a6fb3;--info-fill:rgba(10,134,207,.07);--info-line:rgba(10,134,207,.26)}
.wd *{box-sizing:border-box}
.wd h1,.wd h2,.wd h3{margin:0;color:var(--tx)}
.wd p{margin:0}
.wd :focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:10px}
.wd button{cursor:pointer}
.wd-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wd-bg .orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:var(--orb-op)}
.wd-bg .o1{width:45vw;height:45vw;left:-14vw;top:-18vw;background:radial-gradient(circle,var(--orb-1),transparent 65%)}
.wd-bg .o2{width:40vw;height:40vw;right:-12vw;top:20vh;background:radial-gradient(circle,var(--orb-2),transparent 65%)}

/* ---- Top bar ------------------------------------------------------------
   One row, always. Every control is flex-shrink:0 + nowrap so labels can
   never break onto a second line; the only thing allowed to give is the tab
   strip (min-width:0, hidden horizontal scroll) as a last-resort valve.
   Width steps: <=1040 Add time / Sign out go icon-only, <=940 tabs go
   icon-only, <=620 the wordmark drops to the mark alone. */
.wd-top{position:sticky;top:0;z-index:30;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);background:var(--ink);background:color-mix(in srgb,var(--ink) 82%,transparent);border-bottom:1px solid var(--line)}
.wd-top-in{max-width:1080px;margin:0 auto;padding:0 20px;height:60px;display:flex;align-items:center;gap:14px;min-width:0}
.wd-brand{display:inline-flex;align-items:center;flex-shrink:0;white-space:nowrap;line-height:1}
/* The shared logo paints its wordmark with fixed inline colors tuned for a
   light page; this page has a real dark theme, so re-key them to the tokens. */
.wd-brand > span > span > span:first-child{color:var(--tx)!important}
.wd-brand > span > span > span:first-child > span{color:var(--em)!important}
.wd-brand > span > span > span:last-child:not(:first-child){color:var(--em)!important;border-color:var(--em-line)!important;background:var(--em-fill)!important}
.wd-tabs{display:flex;align-items:center;gap:2px;margin-left:2px;min-width:0;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.wd-tabs::-webkit-scrollbar{display:none}
.wd-tabs button{position:relative;display:inline-flex;align-items:center;gap:7px;flex-shrink:0;white-space:nowrap;background:none;border:none;color:var(--mut);font:inherit;font-size:14px;font-weight:600;line-height:1;height:36px;padding:0 12px;border-radius:10px;cursor:pointer;transition:color .15s,background .15s}
.wd-tabs button svg{flex-shrink:0}
.wd-tabs button:hover{color:var(--tx);background:var(--chip)}
.wd-tabs button.on{color:var(--tx);background:var(--chip);box-shadow:inset 0 0 0 1px var(--chip-line)}
.wd-tabs button.on svg{color:var(--em)}
.wd-top-right{margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap}
.wd-top-sep{width:1px;height:22px;background:var(--line-2);flex-shrink:0;margin:0 2px}
/* Shared chrome for the right-cluster controls: one height, one radius. */
.wd-theme,.wd-getapp,.wd-addtime,.wd-signout{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;white-space:nowrap;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--card-a);color:var(--tx);font:inherit;font-size:13px;font-weight:600;line-height:1;text-decoration:none;cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wd-theme,.wd-getapp{width:36px;padding:0;color:var(--mut)}
.wd-theme:hover{color:var(--tx);border-color:var(--line-2)}
.wd-getapp{color:var(--em-2);border-color:color-mix(in srgb,var(--em-2) 32%,transparent)}
.wd-getapp:hover{border-color:var(--em-2);background:color-mix(in srgb,var(--em-2) 10%,transparent)}
/* Icon-only link: the label stays in the DOM for screen readers and the
   title tooltip carries it for everyone else. */
.wd-getapp span{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.wd-getapp{position:relative}
.wd-mins{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;height:30px;font-size:12.5px;font-weight:600;color:var(--em);border:1px solid var(--em-line);background:var(--em-fill);border-radius:999px;padding:0 11px;white-space:nowrap;line-height:1}
.wd-upgrade{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;height:30px;font-size:12.5px;font-weight:700;color:#1a0e08;background:linear-gradient(135deg,#ff9a4d,#f26a43);border:none;border-radius:999px;padding:0 13px;white-space:nowrap;line-height:1;text-decoration:none;box-shadow:0 6px 16px -8px rgba(242,106,67,.6)}
.wd-upgrade:hover{filter:brightness(1.04)}
.wd-buyhrs{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;height:30px;font-size:12.5px;font-weight:600;color:var(--mut);background:transparent;border:1px solid var(--line-2);border-radius:999px;padding:0 11px;white-space:nowrap;line-height:1;cursor:pointer}
.wd-buyhrs:hover{color:var(--tx);border-color:var(--em-line)}
.wd-mins svg{flex-shrink:0}
.wd-mins.low{color:var(--warm);border-color:var(--warm-line);background:var(--warm-fill)}
.wd-mins.skel{color:transparent;min-width:96px;border-color:transparent;background:var(--track)}
.wd-addtime{padding:0 12px}
.wd-addtime:hover{color:var(--em);border-color:var(--em-line);background:var(--em-fill)}
.wd-signout{padding:0 12px;border-color:transparent;background:transparent;color:var(--mut);font-weight:500}
.wd-signout:hover{color:var(--tx);background:var(--chip);border-color:var(--line)}

.wd-main{position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:34px 20px 72px}

/* ---- Company co-branding strip (white-label) ---------------------------
   Sits above the greeting for company users only. Reads as
   "{Company}, powered by WorkCoPilot": the company owns the left (logo tile,
   name, contact line), a hairline rule separates it from the WorkCoPilot
   mark on the right. One flat panel, 1px line, same card recipe as the rest
   of the home view; no gradients, no second accent. */
.wd-cobrand{display:flex;align-items:center;gap:16px;min-width:0;margin-bottom:22px;padding:12px 16px 12px 14px;background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--card-shadow);animation:wd-rise .5s cubic-bezier(.2,.8,.2,1) both}
.wd-cobrand-logo{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;height:44px;min-width:44px;max-width:168px;padding:0 6px;border-radius:11px;background:var(--card-a);border:1px solid var(--line);overflow:hidden}
.wd-cobrand-logo img{display:block;max-height:36px;max-width:156px;width:auto;height:auto;object-fit:contain}
.wd-cobrand-logo.mono{color:var(--em);background:var(--em-fill);border-color:var(--em-line)}
.wd-cobrand-logo.mono b{font-family:"Bricolage Grotesque";font-weight:800;font-size:17px;letter-spacing:-.02em;line-height:1}
.wd-cobrand-id{min-width:0;flex:1 1 220px}
.wd-cobrand-eyebrow{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);line-height:1.2;margin-bottom:3px}
.wd-cobrand-name{display:block;font-family:"Bricolage Grotesque";font-weight:800;font-size:18px;letter-spacing:-.018em;line-height:1.2;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-cobrand-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-top:4px;font-size:12.5px;color:var(--mut);line-height:1.4;min-width:0}
.wd-cobrand-meta > span{display:inline-flex;align-items:center;gap:5px;min-width:0;max-width:100%}
.wd-cobrand-meta svg{flex-shrink:0;opacity:.8}
.wd-cobrand-meta a{color:var(--mut);text-decoration:none;border-bottom:1px solid var(--line-2);transition:color .15s,border-color .15s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-cobrand-meta a:hover{color:var(--em-2);border-color:var(--em-2)}
.wd-cobrand-meta .txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-cobrand-sep{width:1px;align-self:stretch;background:var(--line);flex-shrink:0;margin:2px 0}
.wd-cobrand-by{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;line-height:1}
.wd-cobrand-by small{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--mut)}
.wd-cobrand-by b{font-family:"Bricolage Grotesque";font-weight:800;font-size:14px;letter-spacing:-.015em;color:var(--tx)}
.wd-cobrand-by b i{font-style:normal;color:var(--em)}
.wd-cobrand-exec{display:inline-flex;align-items:center;gap:7px;flex-shrink:0;white-space:nowrap;height:36px;padding:0 13px;border-radius:10px;border:1px solid var(--em-line);background:var(--em-fill);color:var(--em);font:inherit;font-size:13px;font-weight:700;line-height:1;text-decoration:none;transition:background .15s,border-color .15s,transform .15s}
.wd-cobrand-exec:hover{background:var(--em-fill-2);border-color:var(--em);transform:translateY(-1px)}
.wd-cobrand-exec svg{flex-shrink:0}
@media(max-width:760px){
 .wd-cobrand{flex-wrap:wrap;gap:12px 14px;padding:12px 14px}
 .wd-cobrand-sep{display:none}
 .wd-cobrand-by{order:3;flex:1 1 auto}
 .wd-cobrand-exec{order:4;margin-left:auto}
}
@media(max-width:480px){
 .wd-cobrand-id{flex:1 1 calc(100% - 60px)}
 .wd-cobrand-name{white-space:normal}
 .wd-cobrand-exec{flex:1 1 100%;justify-content:center;margin-left:0}
}

/* ---- Home hero: greeting on the left, the illustration on the right ---- */
.wd-hero{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:center;gap:28px;margin-bottom:22px}
.wd-hello h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(27px,3.6vw,40px);line-height:1.12;letter-spacing:-.024em}
.wd-hello h1 span{display:block;color:var(--mut);font-weight:600;font-size:.62em;letter-spacing:-.012em;margin-top:8px;line-height:1.3}
.wd-plan{display:inline-flex;align-items:center;gap:8px;color:var(--mut);font-size:13.5px;font-weight:500;margin-top:14px;border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 12px 6px 10px;box-shadow:var(--card-shadow)}
.wd-plan-dot{width:8px;height:8px;border-radius:50%;background:var(--em);box-shadow:0 0 0 3px var(--em-fill-2);flex-shrink:0}
.wd-plan-skel{height:15px;width:260px;max-width:70%;border-radius:7px;margin-top:11px;background:var(--track)}
.wd-hero-art{display:block;width:100%;height:auto;max-height:210px;justify-self:end;animation:wd-rise .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes wd-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ---- Cards: one quiet recipe for every block on the home view ----------
   White (or panel) face, 1px line, soft lift, an icon tile + title + muted
   caption in the head. Matches the admin console so the two feel like one
   product. */
.wd-card{background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--card-shadow)}
.wd-card-head{display:flex;align-items:flex-start;gap:12px}
.wd-card-t{display:block;font-size:14.5px;font-weight:700;color:var(--tx);line-height:1.3}
.wd-card-c{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;line-height:1.45}
.wd-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--em-fill);color:var(--em);flex-shrink:0;border:1px solid var(--em-line)}
.wd-ic.alt{color:var(--em-2);background:color-mix(in srgb,var(--em-2) 10%,transparent);border-color:color-mix(in srgb,var(--em-2) 28%,transparent)}
.wd-ic.warm{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-link{color:var(--em-2);font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--em-2) 40%,transparent)}
.wd-link:hover{text-decoration-color:var(--em-2)}

/* Buddy + Data protection sit as a tidy pair above the plan form */
.wd-pair{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:14px}
.wd-buddy{display:flex;align-items:center;gap:14px;padding:14px 16px;min-width:0;flex-wrap:wrap}
.wd-buddy .wd-card-body{min-width:0;flex:1 1 240px}
.wd-buddy .wd-card-end{margin-left:auto;flex-shrink:0}
.wd-dp{overflow:hidden;align-self:start}
.wd-dp-btn{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:transparent;border:none;cursor:pointer;color:var(--tx);text-align:left;font:inherit;transition:background .15s}
.wd-dp-btn:hover{background:var(--panel-3)}
.wd-dp-btn .wd-card-body{min-width:0;flex:1}
.wd-dp-btn .wd-card-c{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-dp-chev{margin-left:auto;color:var(--mut);flex-shrink:0;transition:transform .18s}
.wd-dp-chev.open{transform:rotate(90deg)}
.wd-dp-body{padding:0 16px 16px;border-top:1px solid var(--line);padding-top:14px;font-size:13.5px;color:var(--mut);line-height:1.55}

/* Notes: info (admin access) and warning (gate message) */
.wd-note{display:flex;gap:11px;align-items:flex-start;margin:0 0 14px;padding:12px 15px;border-radius:12px;font-size:13.5px;line-height:1.5;border:1px solid var(--info-line);background:var(--info-fill);color:var(--tx)}
.wd-note svg{flex-shrink:0;margin-top:2px;color:var(--info)}
.wd-note a{color:var(--info);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.wd-note.warn{border-color:var(--warm-line);background:var(--warm-fill)}
.wd-note.warn svg{color:var(--warm)}

.wd-buy{margin-top:14px;display:flex;gap:13px;align-items:flex-start;border:1px solid var(--em-line);background:var(--panel);border-radius:16px;padding:16px 18px;box-shadow:var(--card-shadow)}
.wd-buy .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-buy h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:16px;margin-bottom:5px}
.wd-buy p{color:var(--mut);font-size:13.5px}
.wd-buy p b{color:var(--tx)}
.wd-buy .x{margin-left:auto;background:none;border:none;color:var(--mut);padding:4px;border-radius:8px;flex-shrink:0}
.wd-buy .x:hover{color:var(--tx)}

/* Plan chooser (free signup needs a plan to guide) */
.wd-sub{margin-top:14px;border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:18px 18px 16px;box-shadow:var(--card-shadow)}
.wd-sub-head{display:flex;gap:13px;align-items:flex-start}
.wd-sub-head .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-sub-head h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:17px;margin-bottom:5px}
.wd-sub-head p{color:var(--mut);font-size:13.5px;max-width:62ch}
.wd-sub-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.wd-sub-plan{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:14px 14px 13px;cursor:pointer;transition:transform .15s,border-color .15s}
.wd-sub-plan:hover{transform:translateY(-2px);border-color:var(--em)}
.wd-sub-plan:disabled{opacity:.7;cursor:default;transform:none}
.wd-sub-plan.pop{border-color:var(--em)}
.wd-sub-plan .tag{position:absolute;top:-9px;right:12px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--em);color:#06281c;padding:3px 8px;border-radius:999px}
.wd-sub-plan .nm{font-family:"Bricolage Grotesque";font-weight:700;font-size:15px}
.wd-sub-plan .pr{font-family:"Bricolage Grotesque";font-weight:800;font-size:24px;line-height:1}
.wd-sub-plan .pr i{font-style:normal;font-size:12px;font-weight:600;color:var(--mut);margin-left:2px}
.wd-sub-plan .hr{font-size:12.5px;color:var(--mut)}
.wd-sub-plan .go{margin-top:8px;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--em)}
.wd-sub-err{margin-top:12px;display:flex;align-items:center;gap:7px;color:var(--warm);font-size:13px}
.wd-sub-note{margin-top:12px;color:var(--mut);font-size:12.5px}
@media(max-width:720px){.wd-sub-plans{grid-template-columns:1fr}}

/* Billing panel (manage subscription + invoices) */
.wd-bill{margin-top:18px;border:1px solid var(--line);background:linear-gradient(180deg,var(--panel-2),var(--panel));border-radius:18px;padding:18px;box-shadow:var(--shadow)}
.wd-bill-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.wd-bill-head .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-bill-head h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:16px;margin-bottom:4px}
.wd-bill-head p{color:var(--mut);font-size:13.5px}
.wd-bill-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;border-radius:999px;padding:3px 9px;border:1px solid var(--line-2);color:var(--mut);text-transform:capitalize;margin-top:6px}
.wd-bill-status.good{color:var(--em);border-color:var(--em-line);background:var(--em-fill)}
.wd-bill-status.warn{color:var(--warm);border-color:var(--warm-line);background:var(--warm-fill)}
.wd-manage{margin-left:auto;display:inline-flex;align-items:center;gap:7px;background:var(--em);color:var(--on-em);border:none;font:inherit;font-size:13.5px;font-weight:700;border-radius:11px;padding:9px 14px;cursor:pointer;flex-shrink:0;transition:filter .15s}
.wd-manage:hover{filter:brightness(1.05)}
.wd-manage:disabled{opacity:.6;cursor:default}
.wd-inv{margin-top:16px;display:flex;flex-direction:column;gap:2px}
.wd-inv-row{display:flex;align-items:center;gap:12px;padding:11px 2px;border-top:1px solid var(--line);font-size:13.5px}
.wd-inv-row .amt{font-weight:700;color:var(--tx);min-width:92px}
.wd-inv-row .dt{color:var(--mut);flex:1}
.wd-inv-row .st{font-size:12px;font-weight:600;text-transform:capitalize;color:var(--mut);border:1px solid var(--line-2);border-radius:999px;padding:2px 8px}
.wd-inv-row .st.paid{color:var(--em);border-color:var(--em-line)}
.wd-inv-links{display:inline-flex;gap:10px}
.wd-inv-links a{display:inline-flex;align-items:center;gap:4px;color:var(--em-2);font-weight:600;text-decoration:none}
.wd-inv-links a:hover{text-decoration:underline}
.wd-bill-empty{margin-top:14px;color:var(--mut);font-size:13px}
.wd-bill-err{margin-top:12px;display:flex;align-items:center;gap:7px;color:var(--warm);font-size:13px}

.wd-setup{margin-top:14px;border:1px solid var(--warm-line);background:var(--panel);border-radius:16px;padding:16px;box-shadow:var(--card-shadow)}
.wd-setup-note{display:flex;align-items:center;gap:9px;color:var(--warm);font-size:13.5px;margin-bottom:12px;font-weight:600}

/* Section head: icon tile + title + caption, shared by the plan form, the
   spaces grid and the sessions list. */
.wd-sec{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px}
.wd-sec h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:19px;letter-spacing:-.012em;line-height:1.25;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.wd-sec p{color:var(--mut);font-size:13px;margin-top:3px;line-height:1.45}
.wd-sec .wd-ic{margin-top:1px}

.wd-start{margin-top:14px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 22px 20px;box-shadow:var(--card-shadow)}
.wd-start .wd-sec{margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.wd-start label{display:block;font-size:12.5px;color:var(--mut-2);font-weight:600;letter-spacing:.02em;margin-bottom:7px}
.wd-start label .req{color:var(--warm)}
.wd-taskcap{font-size:12px;color:var(--mut);margin-top:8px}
.wd-start textarea{width:100%;resize:vertical;min-height:88px;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:13px 14px;color:var(--tx);font:inherit;font-size:15.5px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wd-start textarea::placeholder{color:var(--mut)}
.wd-start textarea:hover{border-color:var(--line-2)}
.wd-start textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill);background:var(--panel)}
.wd-nameinput{width:100%;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:11px 14px;color:var(--tx);font:inherit;font-size:15px;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wd-nameinput::placeholder{color:var(--mut)}
.wd-nameinput:hover{border-color:var(--line-2)}
.wd-nameinput:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill);background:var(--panel)}
.wd-modal-ov{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,24,.5);backdrop-filter:blur(3px)}
.wd-modal{width:min(440px,calc(100vw - 36px));background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow)}
.wd-modal h3{display:flex;align-items:center;gap:9px;font-family:"Bricolage Grotesque";font-weight:800;font-size:19px;margin:0 0 12px}
.wd-modal h3 svg{color:var(--danger)}
.wd-modal-sess{font-size:14px;font-weight:600;color:var(--tx);background:var(--chip);border:1px solid var(--chip-line);border-radius:10px;padding:9px 12px;margin-bottom:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-modal label{display:block;font-size:13px;font-weight:600;color:var(--tx-2);margin-bottom:7px}
.wd-modal label .req{color:var(--danger);font-weight:600;font-size:11.5px;margin-left:4px}
.wd-modal textarea{width:100%;resize:vertical;background:var(--field);border:1px solid var(--line);border-radius:11px;padding:11px;color:var(--tx);font:inherit;font-size:14px;outline:none}
.wd-modal textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wd-modal-note{font-size:11.5px;color:var(--mut);margin-top:9px;line-height:1.5}
.wd-modal-btns{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.wd-start-row{display:flex;align-items:center;gap:14px;margin-top:14px;flex-wrap:wrap}
.wd-hint{color:var(--mut);font-size:13px;flex:1;min-width:180px}
.wd-docs{margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}
.wd-docs.locked{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.wd-docs-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.wd-docs-lead{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:var(--tx-2)}
.wd-docs-lead svg{color:var(--em-2)}
.wd-docs-sub{color:var(--mut);font-weight:500;font-size:12px}
.wd-docs-gate{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--warm);background:var(--warm-fill);border:1px solid var(--warm-line);border-radius:999px;padding:3px 10px}
.wd-docs-add{margin-left:auto;display:inline-flex;align-items:center;gap:6px;background:var(--chip);color:var(--tx);border:1px solid var(--chip-line);border-radius:10px;padding:7px 12px;font:inherit;font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.wd-docs-add:hover:not(:disabled){border-color:var(--em-line);background:var(--em-fill);color:var(--em)}
.wd-docs-add:disabled{opacity:.6;cursor:default}
.wd-docs-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
.wd-docs-chip{display:inline-flex;align-items:center;gap:6px;max-width:260px;background:var(--em-fill);border:1px solid var(--em-line);border-radius:9px;padding:5px 7px 5px 10px;font-size:12.5px;color:var(--tx)}
.wd-docs-chip svg{color:var(--em);flex-shrink:0}
.wd-docs-chip .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-docs-ocr{font-size:9.5px;font-weight:800;letter-spacing:.04em;color:var(--em-2);background:var(--em-fill-2);border:1px solid var(--em-line);border-radius:5px;padding:1px 5px;flex-shrink:0}
.wd-docs-ocr.low{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-docs-chip button{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;border:none;background:transparent;color:var(--mut);cursor:pointer;flex-shrink:0}
.wd-docs-chip button:hover{background:var(--line-2);color:var(--tx)}
.wd-docs-err{margin-top:9px;display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--danger)}
.wd-docs-note{margin-top:9px;font-size:11.5px;color:var(--mut);line-height:1.5}
.wd-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;background:linear-gradient(135deg,var(--warm),var(--warm-2));color:var(--cta-ink);border:none;border-radius:12px;padding:13px 22px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 12px 30px -14px var(--warm-2);transition:transform .15s,box-shadow .15s,filter .15s}
.wd-cta:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.04);box-shadow:0 16px 34px -14px var(--warm-2)}
.wd-cta:active:not(:disabled){transform:translateY(0)}
.wd-cta:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}

.wd-catwrap{margin-top:30px}
.wd-cats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
/* Each space is a quiet white card with a faint tone-colored wash in the
   top-right corner - the "light picture" the owner asked for, kept airy. */
.wd-cat{position:relative;overflow:hidden;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 16px 15px;cursor:pointer;font:inherit;color:var(--tx);display:flex;flex-direction:column;gap:5px;box-shadow:var(--card-shadow);--tone:var(--em);transition:transform .15s,border-color .2s,box-shadow .2s}
.wd-cat::before{content:"";position:absolute;right:-28px;top:-28px;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--tone) 16%,transparent),transparent 70%);pointer-events:none;transition:transform .25s}
.wd-cat:hover:not(:disabled){transform:translateY(-2px);border-color:color-mix(in srgb,var(--tone) 40%,var(--line));box-shadow:var(--card-shadow-hover)}
.wd-cat:hover:not(:disabled)::before{transform:scale(1.25)}
.wd-cat:hover:not(:disabled) .wd-cat-ic{transform:scale(1.05)}
.wd-cat:disabled{opacity:.5;cursor:default}
.wd-cat-ic{position:relative;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:color-mix(in srgb,var(--tone) 12%,transparent);border:1px solid color-mix(in srgb,var(--tone) 26%,transparent);color:var(--tone);margin-bottom:6px;transition:transform .2s}
.wd-cat.t-b{--tone:var(--em-2)}
.wd-cat.t-c{--tone:var(--warm)}
.wd-cat.t-d{--tone:var(--violet)}
.wd-cat.t-e{--tone:var(--rose)}
.wd-cat-label{position:relative;font-family:"Bricolage Grotesque";font-weight:700;font-size:15px}
.wd-cat-sample{position:relative;color:var(--mut);font-size:12.5px;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}

.wd-sessions{margin-top:34px}
.wd-apps h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.01em}
.wd-sec-count{font-size:12px;color:var(--mut);font-weight:600;border:1px solid var(--line);background:var(--chip);border-radius:999px;padding:2px 9px;line-height:1.5}
.wd-sess-list{display:flex;flex-direction:column;gap:10px}
.wd-sess{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;box-shadow:var(--card-shadow);transition:border-color .2s,box-shadow .2s}
.wd-sess:hover{border-color:var(--line-2);box-shadow:var(--card-shadow-hover)}
.wd-sess-main{flex:1;min-width:0}
.wd-sess-title{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sess-meta{font-size:12.5px;color:var(--mut);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-sess-done{color:var(--em);font-weight:600}
.wd-sess-bar{height:5px;background:var(--track);border-radius:3px;margin-top:9px;overflow:hidden;max-width:380px}
.wd-sess-bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--em),var(--em-2));transition:width .4s var(--ease,ease)}
.wd-resume{display:inline-flex;align-items:center;gap:6px;background:var(--em-fill-2);color:var(--em);border:1px solid var(--em-line);border-radius:10px;padding:9px 14px;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer;flex-shrink:0;transition:background .15s,transform .15s}
.wd-resume:hover{background:var(--em-fill);transform:translateX(1px)}
.wd-del{background:none;border:none;color:var(--mut);cursor:pointer;padding:7px;border-radius:9px;flex-shrink:0;transition:color .15s,background .15s}
.wd-del:hover{color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,transparent)}
.wd-empty{border:1px dashed var(--line-2);border-radius:14px;padding:24px 20px;display:flex;align-items:center;gap:14px;background:var(--panel)}
.wd-empty .ic{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;background:var(--em-fill);border:1px solid var(--em-line);color:var(--em);flex-shrink:0}
.wd-empty b{display:block;color:var(--tx);font-size:15px;margin-bottom:3px}
.wd-empty p{color:var(--mut);font-size:13.5px}
.wd-skel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}
.wd-skel i{display:block;height:12px;border-radius:6px;background:var(--track);background-size:200% 100%;animation:wd-sh 1.3s linear infinite}
.wd-skel i.w1{width:52%}.wd-skel i.w2{width:34%}.wd-skel i.w3{width:80%;height:5px}
@keyframes wd-sh{0%{background-position:200% 0}100%{background-position:-200% 0}}

.wd-apps{margin-top:40px}
.wd-apps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.wd-app{position:relative;display:flex;flex-direction:column;background:linear-gradient(180deg,var(--card-a),var(--card-b));border:1px solid var(--line);border-radius:16px;padding:20px;overflow:hidden}
.wd-app.feat{border-color:var(--em-line);background:linear-gradient(180deg,var(--em-fill),var(--card-b))}
.wd-app-ribbon{position:absolute;top:12px;right:12px;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:var(--on-em);background:linear-gradient(135deg,var(--em),var(--em-2));border-radius:999px;padding:3px 9px}
.wd-app-ic{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:var(--em-fill-2);color:var(--em);margin-bottom:14px}
.wd-app-ic.alt{color:var(--em-2);background:color-mix(in srgb,var(--em-2) 15%,transparent)}
.wd-app h3{font-family:"Bricolage Grotesque";font-size:17px;margin-bottom:6px}
.wd-app p{color:var(--mut);font-size:13.5px;margin-bottom:16px;flex:1}
.wd-app-btn{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;background:var(--chip);border:1px solid var(--line);color:var(--tx);border-radius:10px;padding:8px 13px;font-size:13.5px;font-weight:600;text-decoration:none;transition:border-color .15s,background .15s}
.wd-app-btn:hover{border-color:var(--em-line);background:var(--em-fill)}
.wd-app-btn.off{opacity:.55;pointer-events:none}
.wd-app-here{display:inline-flex;align-items:center;gap:6px;color:var(--em);font-size:13px;font-weight:600}

/* HELP */
.wd-help{display:grid;grid-template-columns:234px 1fr;gap:34px;align-items:start}
.wd-help-nav{position:sticky;top:84px;display:flex;flex-direction:column;gap:2px}
.wd-help-navlabel{font-size:11px;letter-spacing:.14em;color:var(--mut);font-weight:700;margin-bottom:8px;text-transform:uppercase}
.wd-help-nav button{text-align:left;background:none;border:none;color:var(--mut);font:inherit;font-size:14px;padding:8px 11px;border-radius:9px;cursor:pointer;transition:color .15s,background .15s}
.wd-help-nav button:hover{color:var(--tx);background:var(--chip)}
.wd-help-nav button.on{color:var(--tx);background:var(--em-fill);box-shadow:inset 2px 0 0 var(--em)}
.wd-help-start{margin-top:14px;display:inline-flex!important;align-items:center;gap:7px;color:var(--em)!important;border:1px solid var(--em-line)!important;justify-content:center;font-weight:600}
.wd-help-start:hover{background:var(--em-fill)!important}
.wd-help-body{min-width:0}
.wd-help-body h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(28px,4vw,38px);letter-spacing:-.02em}
.wd-help-lead{color:var(--mut);font-size:18px;margin:10px 0 10px}
.wd-help-body section{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px 26px;margin-bottom:16px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 34px -26px rgba(17,23,38,.18);scroll-margin-top:84px}
.wd-help-body h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.01em;margin-bottom:14px;display:flex;align-items:center;gap:11px}
.wd-help-body h2:before{content:"";width:4px;height:22px;border-radius:3px;background:var(--em);flex-shrink:0}
.wd-help-body h3.sub{font-size:15px;font-weight:700;color:var(--tx);margin:16px 0 6px}
.wd-help-body p{color:var(--mut);margin-bottom:10px}
.wd-help-body b{color:var(--tx)}
.wd-help-body ul,.wd-help-body ol{color:var(--mut);margin:0 0 10px;padding-left:22px;display:flex;flex-direction:column;gap:7px}
.wd-help-body li{line-height:1.6}
.wd-tip{display:flex;gap:9px;align-items:flex-start;background:var(--em-fill);border:1px solid var(--em-line);border-radius:12px;padding:12px 14px;color:var(--tx)!important;font-size:14px;margin-top:6px}
.wd-tip svg{color:var(--em);flex-shrink:0;margin-top:3px}
.wd-steps{list-style:none;padding:0!important;counter-reset:wd-step;display:flex;flex-direction:column;gap:14px!important}
.wd-steps li{position:relative;padding-left:42px;line-height:1.62;min-height:28px;display:block}
.wd-steps li:before{counter-increment:wd-step;content:counter(wd-step);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--em-fill-2);color:var(--em);border:1px solid var(--em-line);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.wd-faq{border-top:1px solid var(--line);padding:16px 0}
.wd-faq:first-of-type{border-top:none}
.wd-faq b{display:block;color:var(--tx);margin-bottom:5px;font-size:15px}
.wd-faq p{margin:0}
.wd-help-cta{padding:30px 0 0}

@media(max-width:900px){
 .wd-cats{grid-template-columns:1fr 1fr}
 .wd-hero{grid-template-columns:minmax(0,1fr) 240px;gap:18px}
 .wd-apps-grid{grid-template-columns:1fr}
 .wd-help{grid-template-columns:1fr}
 .wd-help-nav{position:static;flex-direction:row;flex-wrap:wrap;gap:6px;margin-bottom:10px}
 .wd-help-nav .wd-help-navlabel{width:100%}
 .wd-help-nav button.on{box-shadow:inset 0 -2px 0 var(--em)}
}
/* Top bar collapse, widest first. Labels never wrap; they drop to icons. */
@media(max-width:1040px){
 .wd-addtime,.wd-signout{width:36px;padding:0}
 .wd-addtime span,.wd-signout span{display:none}
 .wd-signout{border-color:var(--line);background:var(--card-a);color:var(--mut)}
}
@media(max-width:940px){
 .wd-tabs button{padding:0 10px;width:36px;justify-content:center}
 .wd-tabs button span{display:none}
}
@media(max-width:620px){
 .wd-main{padding:26px 16px 64px}
 .wd-top-in{padding:0 16px;gap:10px;height:56px}
 .wd-brand > span > span{display:none}
 .wd-tabs{margin-left:0}
 .wd-top-right{gap:6px}
 .wd-top-sep{display:none}
 .wd-mins{padding:0 9px;font-size:12px}
 .wd-cats{grid-template-columns:1fr}
 .wd-cta{width:100%}
 .wd-hero{grid-template-columns:1fr;gap:14px;margin-bottom:18px}
 .wd-hero-art{max-width:240px;max-height:150px;justify-self:center}
 .wd-start{padding:18px 16px}
 .wd-buddy .wd-card-end{margin-left:0;width:100%}
}
@media(max-width:420px){
 .wd-top-in{padding:0 12px;gap:8px}
 .wd-top-right{gap:5px}
 .wd-theme,.wd-getapp,.wd-addtime,.wd-signout,.wd-tabs button{width:34px;height:34px}
 .wd-mins{height:28px;padding:0 8px}
 .wd-mins .wd-mins-l{display:none}
 .wd-resume span{display:none}
}
@media(prefers-reduced-motion:reduce){
 .wd *{animation-duration:.001ms!important;transition-duration:.001ms!important}
}
/* Scope wizard */
.wd-wiz{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,7,14,.55);backdrop-filter:blur(4px);animation:wd-wiz-fade .18s ease}
@keyframes wd-wiz-fade{from{opacity:0}to{opacity:1}}
.wd-wiz-card{width:min(560px,calc(100vw - 32px));max-height:min(80vh,680px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:26px 28px;box-shadow:var(--shadow);animation:wd-wiz-pop .22s cubic-bezier(.2,.8,.2,1)}
@keyframes wd-wiz-pop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.wd-wiz-load{display:flex;align-items:center;gap:10px;color:var(--mut);font-size:15px;font-weight:500;padding:14px 0}
.wd-wiz-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.wd-wiz-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2)}
.wd-wiz-x{background:none;border:none;color:var(--mut);font-size:24px;line-height:1;cursor:pointer;padding:0 4px}
.wd-wiz-x:hover{color:var(--tx)}
.wd-wiz-prog{display:flex;gap:6px;margin-bottom:20px}
.wd-wiz-prog span{height:5px;flex:1;border-radius:999px;background:var(--track);transition:background .25s}
.wd-wiz-prog span.on{background:linear-gradient(90deg,var(--em),var(--em-2))}
.wd-wiz-q{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:21px;line-height:1.3;color:var(--tx);margin-bottom:8px}
.wd-wiz-help{display:flex;align-items:flex-start;gap:7px;font-size:13px;line-height:1.5;color:var(--mut);margin-bottom:16px}
.wd-wiz-help svg{flex-shrink:0;margin-top:2px;color:var(--em-2)}
.wd-wiz-choice.has-hint{display:flex;flex-direction:column;gap:3px}
.wd-wiz-choice-l{font-weight:600}
.wd-wiz-choice-h{font-size:12.5px;font-weight:400;line-height:1.45;color:var(--mut)}
.wd-wiz-gate{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;background:var(--warm-fill);border:1px solid var(--warm-line);border-radius:12px;padding:10px 13px;margin-bottom:16px;font-size:12.5px;color:var(--warm)}
.wd-wiz-gate span{display:inline-flex;align-items:center;gap:7px}
.wd-wiz-choices{display:flex;flex-direction:column;gap:10px}
.wd-wiz-choice{text-align:left;background:var(--card-a);border:1px solid var(--line-2);border-radius:13px;padding:14px 16px;color:var(--tx);font:inherit;font-size:15px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s}
.wd-wiz-choice:hover{border-color:var(--em-2);background:var(--em-fill)}
.wd-wiz-text{display:flex;flex-direction:column;gap:12px}
.wd-wiz-text textarea{resize:none;background:var(--field);border:1px solid var(--line-2);border-radius:13px;padding:13px 15px;color:var(--tx);font:inherit;font-size:15px;line-height:1.5;outline:none}
.wd-wiz-text textarea:focus{border-color:var(--em-2)}
.wd-wiz-text .btn{align-self:flex-end}
.wd-wiz-foot{display:flex;align-items:center;gap:18px;margin-top:22px;padding-top:16px;border-top:1px solid var(--line)}
.wd-wiz-link{background:none;border:none;color:var(--mut);font:inherit;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:0}
.wd-wiz-link:hover{color:var(--tx)}
.wd-wiz-link.strong{margin-left:auto;color:var(--em-2);font-weight:600}
`

const WD_CATS = [
  { id: 'config', tone: 'a', label: 'Technical setup', icon: ServerCog, sample: 'Configure my firewall to allow only SSH and HTTPS' },
  { id: 'build', tone: 'b', label: 'Build & implement', icon: Blocks, sample: 'Connect Stripe to my app with a webhook' },
  { id: 'ai', tone: 'c', label: 'AI & automation', icon: Sparkles, sample: 'Build a business phone AI in n8n' },
  { id: 'product', tone: 'd', label: 'Product & innovation', icon: Rocket, sample: 'Ship a landing page for my new idea today' },
  { id: 'marketing', tone: 'e', label: 'Marketing & growth', icon: Megaphone, sample: 'Launch a Google Ads campaign for my product' },
  { id: 'office', tone: 'a', label: 'Accounting & office', icon: Calculator, sample: 'Reconcile my bank statement for last month' },
  { id: 'legal', tone: 'b', label: 'Legal & compliance', icon: Scale, sample: 'Review this vendor contract clause by clause' },
  { id: 'general', tone: 'c', label: 'Anything else', icon: Compass, sample: 'Help me get unstuck on what is on my screen' },
]

// Reference documents on the goal card. Two paths:
//  - DESKTOP (window.workDesktop): the shell picks + extracts the file locally,
//    the raw file never leaves; we govern the text on-device (clean) and hand it
//    up so it is injected into the plan for this session only, never stored.
//  - WEB: the file is uploaded to the server, extracted + stored there, and the
//    plan reads it. Advanced & Premium only; Basic sees an upgrade hint.
function DocsAttach({ tier, onDesktopDocs }) {
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  const allowed = tier === 'advanced' || tier === 'premium'
  const [docs, setDocs] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (desktop || !allowed) return
    let on = true
    api.workDocsList().then((r) => { if (on) setDocs((r && r.docs) || []) }).catch(() => {})
    return () => { on = false }
  }, [desktop, allowed])

  const pushDesktop = (list) => { const l = list.slice(0, 8); setDocs(l); if (onDesktopDocs) onDesktopDocs(l) }

  const addDesktop = async () => {
    setErr(''); setBusy(true)
    try {
      const r = await desktop.pickDocs()
      if (!r || !r.ok) { setErr((r && r.error) || 'Could not open documents'); return }
      const good = (r.docs || []).filter((d) => d.text)
      const bad = (r.docs || []).filter((d) => d.error)
      if (bad.length) setErr(bad.map((b) => `${b.name}: ${b.error}`).join(' · '))
      const next = [...docs]
      for (const d of good) next.push({ name: d.name, chars: d.chars, text: clean(d.text), method: d.method, confidence: d.confidence })   // govern on-device
      pushDesktop(next)
    } catch (e) { setErr((e && e.message) || 'Could not read the documents') } finally { setBusy(false) }
  }
  const addWeb = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length) return
    setErr(''); setBusy(true)
    try {
      for (const f of files.slice(0, 8)) {
        if (f.size > 10 * 1024 * 1024) { setErr(`${f.name}: too large (10 MB max)`); continue }
        try {
          const dataBase64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => rej(new Error('read failed')); rd.readAsDataURL(f) })
          const r = await api.workDocAdd({ name: f.name, mime: f.type, dataBase64 })
          if (r && r.doc) setDocs((d) => [...d, r.doc])
        } catch (e2) { setErr(`${f.name}: ${(e2 && e2.message) || 'upload failed'}`) }
      }
    } finally { setBusy(false) }
  }
  const remove = async (doc, i) => {
    if (desktop) { pushDesktop(docs.filter((_, k) => k !== i)); return }
    try { await api.workDocDelete(doc.id) } catch { /* ignore */ }
    setDocs((d) => d.filter((x) => x.id !== doc.id))
  }

  if (!allowed) {
    return (
      <div className="wd-docs locked">
        <span className="wd-docs-lead"><FileText size={14} /> Ground the plan in your own documents</span>
        <span className="wd-docs-gate"><Zap size={12} /> Advanced &amp; Premium</span>
      </div>
    )
  }
  return (
    <div className="wd-docs">
      <div className="wd-docs-row">
        <span className="wd-docs-lead"><FileText size={14} /> Reference documents <span className="wd-docs-sub">{desktop ? 'stay on this computer' : 'ground your plan'}</span></span>
        {desktop
          ? <button type="button" className="wd-docs-add" onClick={addDesktop} disabled={busy}>{busy ? <Loader2 size={13} className="spin" /> : <Plus size={14} />} Add documents</button>
          : <button type="button" className="wd-docs-add" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy}>{busy ? <Loader2 size={13} className="spin" /> : <Plus size={14} />} Add documents</button>}
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown" multiple style={{ display: 'none' }} onChange={addWeb} />
      </div>
      {docs.length > 0 && (
        <div className="wd-docs-list">
          {docs.map((d, i) => (
            <span key={d.id || i} className="wd-docs-chip" title={d.chars ? `${d.chars} characters` : ''}><FileText size={12} /> <span className="nm">{d.name}</span>{d.method === 'ocr' && <span className={`wd-docs-ocr${d.confidence != null && d.confidence < 70 ? ' low' : ''}`}>OCR{d.confidence != null ? ` ${d.confidence}%` : ''}</span>} <button type="button" onClick={() => remove(d, i)} aria-label={`Remove ${d.name}`}><X size={12} /></button></span>
          ))}
        </div>
      )}
      {err && <div className="wd-docs-err"><AlertTriangle size={12} /> {err}</div>}
      <div className="wd-docs-note">{desktop
        ? 'Text, PDFs, Word, and diagrams/screenshots (read on your device) all stay on your computer. Only governed text is used to plan this session, and it is not stored on our servers.'
        : 'Text is extracted on our server, scrubbed, and used to ground your plan.'}</div>
    </div>
  )
}

function Home({ user, onOpen, onSignOut }) {
  const { theme, toggle: toggleTheme } = useTheme()
  // Team is a company-admin surface: show it only for a company admin who is
  // actually attached to a company (role alone is not enough).
  const isCompanyAdmin = user.companyRole === 'company_admin' && !!user.companyId
  // Executive dashboard (/work/exec) is for a company executive or company
  // admin only; mirrors the server's requireExecutive gate. Solo users and
  // plain members never see the link.
  const isExecutive = !!user.companyId && ['executive', 'company_admin'].includes(user.companyRole)
  // White-label co-branding: the signed-in user's company (logo + contact
  // info) shown beside the WorkCoPilot identity. null = solo user, nothing
  // company-branded renders.
  const [company, setCompany] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [planTitle, setPlanTitle] = useState('')    // name the user gives the plan/session, carried everywhere
  const [deskDocs, setDeskDocs] = useState([])   // desktop on-device governed docs (ephemeral, client-only)
  const [delTarget, setDelTarget] = useState(null)  // session pending delete (reason modal)
  const [delReason, setDelReason] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)   // {ready, platformAllowed, platformReady, ...} for the provisioning message
  const [scoping, setScoping] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessLoaded, setSessLoaded] = useState(false)
  const [appStatus, setAppStatus] = useState(null)
  const [usage, setUsage] = useState(null)
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [showBuy, setShowBuy] = useState(false)
  const [scrubOpen, setScrubOpen] = useState(false)   // "Data protection" card open state
  // The on-screen buddy the user picks here is the same one the floater and the
  // full-screen guide show (shared localStorage key, read by all three).
  const [buddyPref, setBuddyPref] = useState(() => readBuddyPref())
  const buddyChar = useMemo(() => resolveCharacter(buddyPref), [buddyPref])
  // Billing: a free-signup account can see the dashboard but needs a plan to
  // guide. Show the chooser up front when the account is not covered, and also
  // when a gated action comes back 402 needsSubscription.
  // Who is covered (so the plan chooser never shows to someone who does not
  // need it): superadmins/admins bypass billing, company members are covered by
  // their company, and a personal plan (active/trialing/comp) covers the user.
  const isAdmin = !!(user && (user.role === 'superadmin' || user.role === 'admin'))
  const isCompanyMember = !!(user && user.companyId)
  const covered = isAdmin || isCompanyMember || !!(user && user.canUseService)
  const [billingOn, setBillingOn] = useState(false)
  // Show the plan chooser ONLY to a genuine free user, and only once billing is
  // actually configured. Admins/members/subscribers never see it. A 402 from a
  // gated action also flips this on as a server-authoritative fallback.
  const [needsSub, setNeedsSub] = useState(false)
  // A blocking message for a gated action that is NOT a personal-plan case: a
  // company member with no license/seat, or the company's own AI keys not set.
  // These people must never be shown the personal Stripe plan chooser.
  const [gateMsg, setGateMsg] = useState('')
  const [pricing, setPricing] = useState(null)
  const [subBusy, setSubBusy] = useState('')     // the plan whose checkout is starting
  const [subErr, setSubErr] = useState('')
  // Billing panel: the account's invoices + a Customer Portal link to manage or
  // cancel. Only a personal (non company) account that has a plan sees it.
  const [invoices, setInvoices] = useState(null) // null = not loaded; [] = none
  const [portalBusy, setPortalBusy] = useState(false)
  const [billErr, setBillErr] = useState('')
  const goalRef = useRef(null)

  useEffect(() => {
    const id = 'wd-fonts'
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
      document.head.appendChild(l)
    }
  }, [])
  // A personal account that has (or had) a plan sees the billing panel. Company
  // members are covered by their company, so they have no personal billing here.
  const hasPlan = !!(user && !user.companyId && user.subscription && ['active', 'trialing', 'past_due', 'canceled'].includes(user.subscription.status))
  const load = useCallback(() => {
    api.workList().then((r) => setSessions(r.sessions || [])).catch(() => {}).finally(() => setSessLoaded(true))
    api.workAppStatus().then(setAppStatus).catch(() => {})
    api.workUsage().then(setUsage).catch(() => {})
    fetch('/api/work/pricing').then((r) => r.json()).then(setPricing).catch(() => {})
    // Is billing actually live? Only then does a free user see the plan chooser.
    api.workSubscription().then((r) => {
      const on = !!(r && r.configured)
      setBillingOn(on)
      const adm = !!(user && (user.role === 'superadmin' || user.role === 'admin'))
      const cov = adm || !!(user && (user.companyId || user.canUseService))
      setNeedsSub(!cov && on)
    }).catch(() => {})
    if (user && !user.companyId) api.workInvoices().then((r) => setInvoices(r.invoices || [])).catch(() => setInvoices([]))
  }, [user])
  // Open the Stripe Customer Portal (update card, cancel, download invoices).
  const openPortal = async () => {
    setBillErr(''); setPortalBusy(true)
    try {
      const r = await api.workBillingPortal()
      if (r && r.url) { window.location = r.url; return }
      setBillErr('Could not open billing. Please try again.')
    } catch (e) {
      setBillErr(e && e.message ? e.message : 'Billing is not available right now.')
    } finally { setPortalBusy(false) }
  }
  useEffect(() => { load() }, [load])
  // AI readiness is PROVISIONED (platform key by the superadmin, or a company key
  // by the admin), not self-served by regular users. We just read the status to
  // know whether this account can work, and to show the right provisioning note.
  useEffect(() => {
    let alive = true
    api.workAi().then((r) => { if (!alive) return; setAiStatus(r.status || null); setReady(!!(r.status && r.status.ready)) }).catch(() => {})
    return () => { alive = false }
  }, [])
  // Company branding is fetched once per signed-in company user; a failed or
  // empty fetch simply leaves the strip hidden (the dashboard never depends on it).
  useEffect(() => {
    if (!user || !user.companyId) { setCompany(null); return }
    let alive = true
    api.workMyCompany().then((c) => { if (alive) setCompany(c && c.name ? c : null) }).catch(() => { if (alive) setCompany(null) })
    return () => { alive = false }
  }, [user])
  // A gated action failed. A company MEMBER must never see the personal plan
  // chooser: a 402 for them means no license/seat (ask the admin), not "buy a
  // personal plan". For everyone else a 402 is the plan chooser. Any other error
  // (for example a 503 when the company's own AI keys are not set) is surfaced
  // with its real message instead of silently failing.
  const handleGate = (e) => {
    const status = e && e.status
    const d = (e && e.data) || {}
    // Daily task gate (not a subscription issue): show the real reason, don't
    // push the plan chooser. "Finish current task" and "daily task limit" differ.
    if (d.mustCompleteCurrent) {
      setGateMsg('Finish your current task before starting a new one. Open it from your tasks, wrap it up, then start the next.')
      return
    }
    if (d.taskLimit) {
      setGateMsg(e.message || `You have used all your tasks for today. They reset at ${d.resetLabel || '11:59 PM ET'}.`)
      return
    }
    if (status === 402) {
      if (isCompanyMember) setGateMsg('Your company has not assigned you a WorkCoPilot license yet, or all licenses are in use. Ask your company administrator to add you.')
      else setNeedsSub(true)
    } else if (e && e.message) {
      setGateMsg(e.message)
    }
  }
  const create = async (g) => {
    if (!ready) return
    setBusy(true); setGateMsg('')
    try { const r = await api.workCreate({ goal: (typeof g === 'string' ? g : goal).trim() || null }); onOpen(r.session.id, r.guard) }
    catch (e) {
      setBusy(false)
      handleGate(e)
    }
  }
  // The plan phase is a short scoping wizard (forced). "Start guiding me" opens
  // it; the answers are stored on the session and folded into the plan.
  const tier = (usage && usage.tier) || 'basic'
  const beginScope = () => { if (!ready || busy || !goal.trim() || !planTitle.trim()) return; setScoping(true) }
  const runWithScope = async (answers) => {
    setScoping(false); setBusy(true); setGateMsg('')
    try {
      const r = await api.workCreate({ title: planTitle.trim() || undefined, goal: goal.trim(), scope: answers || [] })
      // Desktop on-device docs: stash the governed text for THIS session so the
      // console can inject it into the plan. Client-only (sessionStorage), never
      // uploaded or persisted on the server.
      if (window.workDesktop && deskDocs.length) {
        try { sessionStorage.setItem('wd_docs_' + r.session.id, deskDocs.map((d) => `# ${d.name}\n${d.text}`).join('\n\n').slice(0, 8000)) } catch { /* ignore */ }
      }
      onOpen(r.session.id, r.guard)
    } catch (e) { setBusy(false); handleGate(e) }
  }
  const cancelScope = (reason) => { setScoping(false); if (reason === 'upgrade') setNeedsSub(true) }
  // Start Stripe Checkout for a plan. On success we are redirected to Stripe; a
  // missing/incomplete billing config returns a clear message instead.
  const startCheckout = async (plan) => {
    setSubErr(''); setSubBusy(plan)
    try {
      const r = await api.workCheckout(plan)
      if (r && r.url) { window.location = r.url; return }
      setSubErr('Could not start checkout. Please try again.')
    } catch (e) {
      setSubErr(e && e.message ? e.message : 'Billing is not available right now.')
    } finally { setSubBusy('') }
  }
  const money = (n) => (n == null ? '' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`)
  // Stripe reports invoice amounts in the currency's minor unit (cents).
  const invMoney = (cents, cur) => {
    const v = (Number(cents) || 0) / 100
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(v) }
    catch { return `$${v.toFixed(2)}` }
  }
  const invDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '' } }
  const showBilling = hasPlan || (Array.isArray(invoices) && invoices.length > 0)
  const subStatus = (user && user.subscription && user.subscription.status) || 'none'
  const statusCls = subStatus === 'active' || subStatus === 'trialing' ? 'good' : (subStatus === 'past_due' ? 'warn' : '')
  const PLAN_META = [
    { id: 'basic', name: 'Basic', hrs: 2 },
    { id: 'advanced', name: 'Advanced', hrs: 4 },
    { id: 'premium', name: 'Premium', hrs: 6 },
  ]
  // Deletion is accountable: capture a reason before removing. The server logs
  // who / what / when / why to the company admin's user activity log.
  const confirmDelete = async () => {
    if (!delTarget || !delReason.trim()) return
    setDelBusy(true)
    try { await api.workDelete(delTarget.id, delReason.trim()); setDelTarget(null); setDelReason(''); load() }
    catch { /* keep modal open on error */ } finally { setDelBusy(false) }
  }
  const pickCat = (c) => { setGoal(c.sample); setTab('dashboard'); setTimeout(() => goalRef.current && goalRef.current.focus(), 60) }
  // Buy extra hours (or image credits) - priced per your plan in Admin > Pricing,
  // one-time via Stripe. Redirects to secure checkout.
  const [buying, setBuying] = useState(false)
  const buyCredits = async (kind) => {
    if (buying) return
    const label = kind === 'hours' ? 'extra hours' : 'image credits'
    const q = window.prompt(`How many ${label} would you like to buy?`, kind === 'hours' ? '1' : '10')
    if (!q) return
    setBuying(true)
    try { const r = await api.workBuyCredits(kind, Number(q) || 0); if (r && r.url) window.location.assign(r.url); else setErr('Could not start checkout.') }
    catch (e) { setErr((e && e.message) || 'Could not start checkout.') } finally { setBuying(false) }
  }
  const minsLeft = usage ? Math.ceil((usage.remainingSeconds || 0) / 60) : null
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')
  const planName = cap((user && user.subscription && user.subscription.plan) || (usage && usage.tier) || '') || 'Active'
  const low = !!usage && (usage.exhausted || (usage.remainingSeconds != null && usage.remainingSeconds <= 900))

  return (
    <div className="wd">
      <style>{WD_CSS}</style>
      <div className="wd-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /></div>

      {/* In the desktop app the 32px title bar is position:fixed above this
          sticky header; without this offset the header slid under it on scroll
          and the Dashboard / How-to / Support tabs were half hidden. */}
      <header className="wd-top" style={(typeof window !== 'undefined' && window.workDesktop) ? { top: 32 } : undefined}>
        <div className="wd-top-in">
          <span className="wd-brand"><AdmireVedaLogo size={24} idSuffix="wd" /></span>
          <nav className="wd-tabs" aria-label="Sections">
            <button className={tab === 'dashboard' ? 'on' : ''} aria-current={tab === 'dashboard' ? 'page' : undefined} onClick={() => setTab('dashboard')}><LayoutDashboard size={16} /> <span>Dashboard</span></button>
            <button className={tab === 'help' ? 'on' : ''} aria-current={tab === 'help' ? 'page' : undefined} onClick={() => setTab('help')}><BookOpen size={16} /> <span>How-to</span></button>
            <button className={tab === 'support' ? 'on' : ''} aria-current={tab === 'support' ? 'page' : undefined} onClick={() => setTab('support')}><LifeBuoy size={16} /> <span>Support</span></button>
            {isCompanyAdmin && (
              <button className={tab === 'team' ? 'on' : ''} aria-current={tab === 'team' ? 'page' : undefined} onClick={() => setTab('team')}><Users size={16} /> <span>Team</span></button>
            )}
          </nav>
          <div className="wd-top-right">
            {usage == null
              ? <span className="wd-mins skel" aria-hidden />
              : minsLeft != null && <span className={`wd-mins${low ? ' low' : ''}`} title={`${usage.tier} plan`}>{low ? <AlertTriangle size={13} /> : <Clock size={13} />} {minsLeft} min<span className="wd-mins-l"> left</span></span>}
            {user && !user.companyId && usage != null && (
              <button className="wd-buyhrs" onClick={() => buyCredits('hours')} disabled={buying} title="Buy extra hours (one-time)"><Plus size={13} /> <span className="wd-mins-l">Buy </span>hours</button>
            )}
            {user && user.canUpgrade && (
              <a className="wd-upgrade" href="/workcopilot/pricing" title={`Upgrade${user.nextTier ? ' to ' + user.nextTier.charAt(0).toUpperCase() + user.nextTier.slice(1) : ''} for more hours, tasks${user.caps && !user.caps.roadmaps ? ', roadmaps' : ''} and more`}><Sparkles size={14} /> <span>Upgrade</span></a>
            )}
            <span className="wd-top-sep" aria-hidden />
            <button className="wd-theme" onClick={toggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label="Toggle light or dark mode">{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
            {!(typeof window !== 'undefined' && window.workDesktop) && (
              <a className="wd-getapp" href="/api/work/desktop-setup.exe" title="Download the Windows app" aria-label="Download the Windows app"><Monitor size={16} /> <span>Windows app</span></a>
            )}
            <button className="wd-addtime" onClick={() => setShowBuy((v) => !v)} aria-expanded={showBuy} title="Add time"><Zap size={15} /> <span>Add time</span></button>
            <button className="wd-signout" onClick={onSignOut} title="Sign out"><LogOut size={15} /> <span>Sign out</span></button>
          </div>
        </div>
      </header>

      <main className="wd-main">
        {tab === 'dashboard' ? (
          <>
            {company && (() => {
              // Normalize the website for the href; the user-facing label is the
              // bare host. The logo is a data:/https: URL from our own server and
              // is only ever rendered as an <img src>, never as markup.
              const site = company.website ? (/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`) : ''
              const place = [company.city, company.state].filter(Boolean).join(', ') || company.address || ''
              const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
              return (
                <section className="wd-cobrand" aria-label={`${company.name}, powered by WorkCoPilot`}>
                  {company.logo
                    ? <span className="wd-cobrand-logo"><img src={company.logo} alt={`${company.name} logo`} /></span>
                    : <span className="wd-cobrand-logo mono" aria-hidden>{initials ? <b>{initials}</b> : <Building2 size={20} />}</span>}
                  <div className="wd-cobrand-id">
                    <span className="wd-cobrand-eyebrow">Your workspace</span>
                    <span className="wd-cobrand-name" title={company.name}>{company.name}</span>
                    {(site || company.phone || place) && (
                      <div className="wd-cobrand-meta">
                        {site && <span><Globe size={12} /> <a href={site} target="_blank" rel="noopener noreferrer">{linkHost(site)}</a></span>}
                        {company.phone && <span><Phone size={12} /> <a href={`tel:${String(company.phone).replace(/[^+\d]/g, '')}`}>{company.phone}</a></span>}
                        {place && <span><MapPin size={12} /> <span className="txt">{place}</span></span>}
                      </div>
                    )}
                  </div>
                  <span className="wd-cobrand-sep" aria-hidden />
                  <span className="wd-cobrand-by"><small>powered by</small> <AVMark size={20} id="avcb" glow={false} /> <b>Work<i>CoPilot</i></b></span>
                  {isExecutive && (
                    <a className="wd-cobrand-exec" href="/work/exec"><BarChart3 size={15} /> Executive dashboard <ArrowRight size={14} /></a>
                  )}
                </section>
              )
            })()}

            <section className="wd-hero">
            <div className="wd-hello">
              <h1>Hello {user.displayName || user.username},<span>What are you accomplishing today?</span></h1>
              {usage
                ? <div className="wd-plan"><span className="wd-plan-dot" /> {
                    isAdmin
                      ? 'Administrator access · guidance unlocked'
                      : isCompanyMember
                        ? `${user.companyName || 'Your company'} team · ${minsLeft} min of guidance left today`
                        : covered
                          ? `${planName} plan · ${minsLeft} min of guidance left today`
                          : needsSub
                            ? 'Free account · choose a plan to start guiding'
                            : `Free access · ${minsLeft} min of guidance left today`
                  }</div>
                : <div className="wd-plan-skel wd-skel" style={{ padding: 0, border: 'none', background: 'var(--track)' }} aria-hidden />}
            </div>
            <WdHeroArt />
            </section>

            <div className="wd-pair">
              <div className="wd-card wd-buddy">
                <AliveBuddy character={buddyChar} state="answering" size={36} interactive />
                <div className="wd-card-body">
                  <div className="wd-card-t">Your buddy</div>
                  <div className="wd-card-c">Shows the next step on your screen.</div>
                </div>
                <div className="wd-card-end">
                  <BuddyPicker pref={buddyPref} size={26} onPick={setBuddyPref} />
                </div>
              </div>

              {/* Data protection: individual users customize their own scrub rules;
                  company members are governed by their admin; admins manage it in
                  their console. Built-in protections always apply for everyone. */}
              <div className="wd-card wd-dp">
                <button type="button" className="wd-dp-btn" onClick={() => setScrubOpen((v) => !v)} aria-expanded={scrubOpen}>
                  <span className="wd-ic"><ShieldCheck size={16} /></span>
                  <span className="wd-card-body">
                    <span className="wd-card-t">Data protection</span>
                    <span className="wd-card-c">{user.companyId ? (isCompanyAdmin ? 'Managed in your admin console' : 'Managed by your company') : 'Customize what gets scrubbed before sending'}</span>
                  </span>
                  <ChevronRight size={16} className={`wd-dp-chev${scrubOpen ? ' open' : ''}`} />
                </button>
                {scrubOpen && (
                  <div className="wd-dp-body">
                    {!user.companyId
                      ? <ScrubRules />
                      : isCompanyAdmin
                        ? <div>Your company's data protection rules live in the <a href="/work/company" className="wd-link">company console</a> under Data governance. The built-in protections always apply.</div>
                        : <div>Your company manages data protection rules for everyone on the team. The built-in protections - emails, keys, card numbers, SSNs, IP addresses and more - always apply on your device before anything is sent.</div>}
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="wd-note">
                <LayoutDashboard size={16} />
                <span>You have administrator access, so live guidance is unlocked for you. <a href="/work/admin">Open the admin console</a></span>
              </div>
            )}

            {gateMsg && (
              <div className="wd-note warn" role="alert">
                <AlertTriangle size={16} />
                <span>{gateMsg}</span>
              </div>
            )}

            {needsSub && (
              <div className="wd-sub" role="note">
                <div className="wd-sub-head">
                  <span className="ic"><Rocket size={18} /></span>
                  <div>
                    <h3>Choose a plan to start</h3>
                    <p>Your account is ready. Pick a plan to unlock live guidance. Your plan's hours are daily minutes you can spend anytime across the day - billed per minute you actually use, never by the hour. Change or cancel anytime; the daily allowance resets at 11:59 PM ET.</p>
                  </div>
                </div>
                <div className="wd-sub-plans">
                  {PLAN_META.map((p) => (
                    <button key={p.id} className={`wd-sub-plan${p.id === 'advanced' ? ' pop' : ''}`} disabled={!!subBusy} onClick={() => startCheckout(p.id)}>
                      {p.id === 'advanced' && <span className="tag">Most popular</span>}
                      <span className="nm">{p.name}</span>
                      <span className="pr">{pricing ? money(pricing.plans[p.id]) : ''}<i>/mo</i></span>
                      <span className="hr">{p.hrs} hours of daily minutes</span>
                      <span className="go">{subBusy === p.id ? <Loader2 size={15} className="spin" /> : <>Choose {p.name} <ArrowRight size={14} /></>}</span>
                    </button>
                  ))}
                </div>
                {subErr && <div className="wd-sub-err"><AlertTriangle size={14} /> {subErr}</div>}
                <div className="wd-sub-note">On a team plan? If your company covers WorkCoPilot, ask your administrator to add you and guidance unlocks automatically.</div>
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13.5 }}>
                  Not ready to subscribe? <a href="/demo" className="wd-link">See exactly how it works in the demo</a>
                </div>
              </div>
            )}

            {!needsSub && (<>
            {(showBuy || low) && (
              <div className="wd-buy" role="note">
                <span className="ic"><Zap size={18} /></span>
                <div>
                  <h3>{usage && usage.exhausted ? 'You are out of time for today' : 'Add more guidance time'}</h3>
                  <p>Your daily minutes reset at <b>11:59 PM ET</b>. Purchased top-up time never expires and stacks on top of your plan. To add time to your account now, ask your administrator. We count time only while WorkCoPilot is actively guiding you, so pausing keeps it in reserve.</p>
                </div>
                <button className="x" title="Dismiss" aria-label="Dismiss" onClick={() => setShowBuy(false)}><X size={16} /></button>
              </div>
            )}

            {/* AI is PROVISIONED by admins, never self-served on the user dashboard:
                the superadmin sets the platform key; a company admin sets the
                company key when AdmireVeda requires it. A regular user whose AI is
                not ready sees a provisioning note, not a key form. */}
            {!ready && aiStatus && (
              <div className="wd-setup">
                <div className="wd-setup-note">
                  <span className="wd-ic warm"><Sparkles size={15} /></span>
                  {isAdmin
                    ? <>Set the platform AI key in the <a href="/work/admin" className="wd-link">admin console</a> to turn WorkCoPilot on for everyone.</>
                    : isCompanyAdmin
                      ? <>Finish AI setup for your company in the <a href="/work/company" className="wd-link">company console</a> under AI keys. Until then, your team is on hold.</>
                      : user.companyId
                        ? <>Your workspace is being set up. Your administrator needs to finish AI setup before you can start - please check back shortly.</>
                        : <>WorkCoPilot is being provisioned for your account. Please check back shortly, or contact support if this persists.</>}
                </div>
              </div>
            )}

            <div className="wd-start">
              <div className="wd-sec">
                <span className="wd-ic"><PenLine size={16} /></span>
                <div>
                  <h2>Start a plan</h2>
                  <p>Describe what you want to get done in your own words. WorkCoPilot turns it into steps, guides you through each one on your screen, catches a wrong move and corrects it, and moves you on to the next correct step.</p>
                </div>
              </div>
              <label htmlFor="wd-name">Name this plan <span className="req">*</span></label>
              <input id="wd-name" className="wd-nameinput" placeholder="e.g. API pentest - transactional broker" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} maxLength={80} />
              <label htmlFor="wd-goal" style={{ marginTop: 12, display: 'block' }}>Your goal <span className="req">*</span></label>
              <textarea id="wd-goal" ref={goalRef} rows={3} placeholder="What do you want to get done? Type or paste the task, the ticket, or the requirement. Anything, any field." value={goal} onChange={(e) => setGoal(e.target.value)} />
              <div className="wd-start-row">
                <span className="wd-hint">{ready ? 'WorkCoPilot plans it, then guides you step by step.' : 'Available once your administrator has finished AI setup.'}</span>
                <button className="wd-cta" disabled={!ready || busy || !goal.trim() || !planTitle.trim()} onClick={beginScope} title={!planTitle.trim() ? 'Name this plan first' : (!goal.trim() ? 'Enter your goal' : '')}>{busy ? <Loader2 size={15} className="spin" /> : <Play size={16} />} Start guiding me</button>
              </div>
              {usage && usage.tasks && !usage.tasks.unlimited && (
                <div className="wd-taskcap">
                  {usage.tasks.activeTaskId
                    ? 'Finish your current task before starting a new one.'
                    : `${usage.tasks.remaining} of ${usage.tasks.cap} task${usage.tasks.cap === 1 ? '' : 's'} left today. Resets ${usage.tasks.resetLabel || '11:59 PM ET'}.`}
                </div>
              )}
              <DocsAttach tier={tier} onDesktopDocs={setDeskDocs} />
            </div>

            <div className="wd-catwrap">
              <div className="wd-sec">
                <span className="wd-ic alt"><AppWindow size={16} /></span>
                <div>
                  <h2>Or start from a space</h2>
                  <p>Pick a starting point. It fills in a sample goal you can edit before you begin.</p>
                </div>
              </div>
              <div className="wd-cats">
                {WD_CATS.map((c) => (
                  <button key={c.id} className={`wd-cat t-${c.tone}`} onClick={() => pickCat(c)} disabled={!ready} title={ready ? c.sample : 'Set up your AI above to begin'}>
                    <span className="wd-cat-ic"><c.icon size={19} /></span>
                    <span className="wd-cat-label">{c.label}</span>
                    <span className="wd-cat-sample">{c.sample}</span>
                  </button>
                ))}
              </div>
            </div>
            </>)}

            <div className="wd-sessions">
              <div className="wd-sec">
                <span className="wd-ic"><Clock size={16} /></span>
                <div>
                  <h2>Pick up where you left off {sessLoaded && sessions.length > 0 && <span className="wd-sec-count">{sessions.length} saved</span>}</h2>
                  <p>Every plan is saved. Pause anytime and come back to the exact step you were on.</p>
                </div>
              </div>
              {!sessLoaded ? (
                <div className="wd-sess-list">
                  {[0, 1].map((i) => (
                    <div key={i} className="wd-skel"><i className="w1" /><i className="w2" /><i className="w3" /></div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="wd-empty">
                  <span className="ic"><Compass size={20} /></span>
                  <div>
                    <b>No sessions yet</b>
                    <p>Start a task above and it is saved here. You can pause anytime and come back to the exact step you were on.</p>
                  </div>
                </div>
              ) : (
                <div className="wd-sess-list">
                  {sessions.map((s) => {
                    const done = (s.steps || []).filter((x) => x.status === 'done').length
                    const tot = (s.steps || []).length
                    const cur = (s.steps || [])[s.currentStep]
                    const pct = tot > 0 ? Math.round(done / tot * 100) : 0
                    return (
                      <div key={s.id} className="wd-sess">
                        <div className="wd-sess-main">
                          <div className="wd-sess-title">{(s.title && !/^Session \d/.test(s.title)) ? s.title : (s.goal || s.title)}</div>
                          <div className="wd-sess-meta">{s.status === 'ended' ? 'Completed' : (cur ? `You were at: ${cur.text}` : 'Not started yet')} &middot; <span className="wd-sess-done">{done}/{tot}</span> steps{tot > 0 ? <> &middot; {pct}%</> : null}</div>
                          {tot > 0 && <div className="wd-sess-bar"><i style={{ width: `${pct}%` }} /></div>}
                        </div>
                        <button className="wd-resume" onClick={() => onOpen(s.id)}><span>{s.status === 'ended' ? 'Open' : 'Resume'}</span> <ArrowRight size={14} /></button>
                        <button className="wd-del" title="Delete session" aria-label="Delete session" onClick={() => { setDelTarget(s); setDelReason('') }}><Trash2 size={15} /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {showBilling && (
              <div className="wd-bill" role="region" aria-label="Billing">
                <div className="wd-bill-head">
                  <span className="ic"><CreditCard size={18} /></span>
                  <div>
                    <h3>Billing</h3>
                    <p>Update your card, change plan, download invoices or cancel anytime through the secure Stripe portal.</p>
                    <span className={`wd-bill-status ${statusCls}`}>
                      <span className="wd-plan-dot" style={{ width: 7, height: 7 }} /> {subStatus === 'none' ? 'No active plan' : subStatus}
                    </span>
                  </div>
                  <button className="wd-manage" onClick={openPortal} disabled={portalBusy}>
                    {portalBusy ? <Loader2 size={15} className="spin" /> : <ExternalLink size={15} />} Manage billing
                  </button>
                </div>
                {billErr && <div className="wd-bill-err"><AlertTriangle size={14} /> {billErr}</div>}
                {invoices == null ? (
                  <div className="wd-bill-empty">Loading invoices...</div>
                ) : invoices.length === 0 ? (
                  <div className="wd-bill-empty">No invoices yet. They appear here after your first payment.</div>
                ) : (
                  <div className="wd-inv">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="wd-inv-row">
                        <span className="amt">{invMoney(inv.amount, inv.currency)}</span>
                        <span className="dt">{invDate(inv.created)}{inv.number ? ` · ${inv.number}` : ''}</span>
                        <span className={`st${inv.status === 'paid' ? ' paid' : ''}`}>{inv.status || 'open'}</span>
                        <span className="wd-inv-links">
                          {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> View</a>}
                          {inv.invoicePdf && <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer"><FileText size={13} /> PDF</a>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </>
        ) : tab === 'support' ? (
          <div style={{ padding: '26px 20px', maxWidth: 1080, margin: '0 auto' }}><SupportTickets mode="user" /></div>
        ) : tab === 'team' && isCompanyAdmin ? (
          <div style={{ padding: '26px 20px', maxWidth: 1080, margin: '0 auto' }}><WorkTeam /></div>
        ) : (
          <HelpDocs onStart={() => setTab('dashboard')} />
        )}
      </main>
      {scoping && <ScopeWizard goal={goal} tier={tier} onCancel={cancelScope} onReady={runWithScope} />}
      {delTarget && (
        <div className="wd-modal-ov" onClick={() => !delBusy && setDelTarget(null)}>
          <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
            <h3><Trash2 size={17} /> Delete this session?</h3>
            <div className="wd-modal-sess">{(delTarget.title && !/^Session \d/.test(delTarget.title)) ? delTarget.title : (delTarget.goal || 'Untitled session')}</div>
            <label htmlFor="wd-delreason">Why are you deleting it? <span className="req">required</span></label>
            <textarea id="wd-delreason" rows={3} value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder="e.g. duplicate, created by mistake, task no longer needed" autoFocus />
            <div className="wd-modal-note">This is recorded in your company's user activity log: who deleted it, when, the reason, and what the session was about.</div>
            <div className="wd-modal-btns">
              <button className="btn btn-ghost" onClick={() => setDelTarget(null)} disabled={delBusy}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={delBusy || !delReason.trim()}>{delBusy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Delete session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Detailed how-to / help. A sticky section nav on the left, rich content right.
// The nav highlights the section in view (scroll-synced) and on click.
const HELP_SECTIONS = [
  { id: 'start', t: 'Getting started' },
  { id: 'how', t: 'How guidance works' },
  { id: 'styles', t: 'Guide styles' },
  { id: 'ask', t: 'Ask, Analyze & Research' },
  { id: 'deep', t: 'Deep pass' },
  { id: 'float', t: 'The floating overlay' },
  { id: 'where', t: 'Desktop, mobile & browser' },
  { id: 'time', t: 'Your time & pausing' },
  { id: 'record', t: 'Keeping a record' },
  { id: 'safe', t: 'Safety & acceptable use' },
  { id: 'faq', t: 'FAQ' },
]
function HelpDocs({ onStart }) {
  const desktop = typeof window !== 'undefined' ? !!window.workDesktop : false
  // In the desktop app, lead with desktop-specific guidance + its own security
  // and safety FAQ, then the shared how-to.
  const sections = desktop
    ? [{ id: 'desktop', t: 'The desktop app' }, { id: 'desktopsec', t: 'Security & safety (desktop)' }, { id: 'desktopfaq', t: 'Desktop FAQ' }, ...HELP_SECTIONS]
    : HELP_SECTIONS
  const [active, setActive] = useState(sections[0].id)
  const jump = (id) => { setActive(id); const el = document.getElementById('help-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
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
  }, [])   // eslint-disable-line
  return (
    <div className="wd-help">
      <aside className="wd-help-nav">
        <div className="wd-help-navlabel">How-to guide</div>
        {sections.map((s) => <button key={s.id} className={active === s.id ? 'on' : ''} aria-current={active === s.id ? 'true' : undefined} onClick={() => jump(s.id)}>{s.t}</button>)}
        <button className="wd-help-start" onClick={onStart}><Play size={13} /> Start a task</button>
      </aside>
      <div className="wd-help-body">
        <h1>{desktop ? 'How to use the WorkCoPilot desktop app' : 'How to use WorkCoPilot'}</h1>
        <p className="wd-help-lead">An expert that watches your screen, tells you the exact next move one step at a time, catches a wrong move and corrects it, and keeps you on the next correct step until the job is done. Here is everything it does and how to get the most from it.</p>

        {desktop && (<>
          <section id="help-desktop"><h2>The desktop app</h2>
            <p>The desktop app is a quiet overlay that floats over whatever you are working in. It runs <b>read-only</b> - it shows the next move, it never clicks, types or runs anything for you.</p>
            <h3 className="sub">Two modes</h3>
            <ul>
              <li><b>Planning</b> - a normal, resizable window (expand it to full screen) for setting your goal, answering the quick scoping questions and adding documents. It does not sit on top of other windows here.</li>
              <li><b>Guiding</b> - once a plan starts it becomes a compact overlay that floats on top of your work, with see-through and click-behind so you can work underneath it.</li>
              <li><b>Buddy</b> - minimize and it shrinks to a small card that keeps the current step in view. Bring it back any time.</li>
            </ul>
            <h3 className="sub">The title bar (after you sign in)</h3>
            <ul>
              <li><b>On top</b> - keep the window above everything else.</li>
              <li><b>Hidden / On share</b> - hide the window from screen shares and recordings (on by default), or reveal it when you want to show it.</li>
              <li><b>See-through</b> - cycle the window's transparency so the work behind shows through.</li>
              <li><b>Click-behind</b> (while guiding) - let your clicks pass straight to the app underneath. The title bar itself still takes clicks, so you can always turn it off again there (or with Ctrl+Shift+Alt+W).</li>
              <li><b>Buddy</b> - shrink to the buddy card.</li>
            </ul>
            <h3 className="sub">Keyboard shortcuts</h3>
            <ul>
              <li><b>Ctrl+Shift+Alt+H</b> hide / show &middot; <b>Ctrl+Shift+Alt+S</b> hide-from-share &middot; <b>Ctrl+Shift+Alt+T</b> on top</li>
              <li><b>Ctrl+Shift+Alt+O</b> see-through &middot; <b>Ctrl+Shift+Alt+W</b> click-behind &middot; <b>Ctrl+Shift+Alt+B</b> buddy &middot; <b>Ctrl+Shift+Alt+M</b> choose monitor</li>
            </ul>
            <h3 className="sub">Your own documents &amp; diagrams</h3>
            <p>On the goal card, use <b>Add documents</b> to ground the plan in your own material - PDFs, Word, text, and <b>diagrams or screenshots</b> (read on your device). The file stays on your machine; only the extracted, governed text is used to plan.</p>
          </section>

          <section id="help-desktopsec"><h2>Security &amp; safety (desktop)</h2>
            <ul>
              <li><b>Read-only by design.</b> It never clicks, types, runs commands or changes anything. You stay in control of every action.</li>
              <li><b>Hidden from screen shares.</b> The overlay is content-protected by default, so it stays out of Zoom / Teams / Meet shares and recordings. Toggle it with <b>On share</b> or Ctrl+Shift+Alt+S when you want it visible.</li>
              <li><b>Your documents stay on your computer.</b> Files you add are read on your device. The raw file is never uploaded, and the text is not stored on our servers - it is used only to plan that session.</li>
              <li><b>Least data leaves.</b> To guide you, downscaled screen frames and the governed text go to the AI service (ours, or your company's own key). When governance is on, sensitive values are stripped or tokenized <b>before</b> anything is sent, and rebuilt on your device.</li>
              <li><b>Signed &amp; updated safely.</b> The app is code-signed (COE Security) and updates are delivered over HTTPS.</li>
            </ul>
            <p className="wd-tip"><ShieldCheck size={14} /> These are controls and audit evidence that support your compliance (GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, CCPA). They do not, by themselves, make you certified.</p>
          </section>

          <section id="help-desktopfaq"><h2>Desktop FAQ</h2>
            <div className="wd-faq"><b>Can people on a call see the overlay?</b><p>No, not while it is hidden (the default). It is excluded from screen capture and recording. Press Ctrl+Shift+Alt+S or the On share button if you deliberately want to show it.</p></div>
            <div className="wd-faq"><b>Does my diagram or document get uploaded?</b><p>No. On the desktop app the file is read on your computer. Only the governed text is sent to plan, and it is not stored on our servers.</p></div>
            <div className="wd-faq"><b>Will it do things on my machine?</b><p>Never. It is read-only. It reads the screen and tells you the next step; you perform every action yourself.</p></div>
            <div className="wd-faq"><b>How do I keep it out of the way?</b><p>Use See-through and Click-behind while guiding, minimize to the Buddy card, or Ctrl+Shift+Alt+H to hide it entirely. It keeps working while minimized.</p></div>
            <div className="wd-faq"><b>I turned on Click-behind and now I cannot click WorkCoPilot.</b><p>That is Click-behind doing its job: your clicks go to the app underneath. Move the mouse over the WorkCoPilot title bar, which always takes clicks, and press Click-behind there, or press Ctrl+Shift+Alt+W.</p></div>
            <div className="wd-faq"><b>It says it cannot reach WorkCoPilot.</b><p>The app needs a connection to the WorkCoPilot server. Check your internet, VPN or proxy. The window retries on its own and opens the console as soon as the server answers; Retry now and Close are always there.</p></div>
            <div className="wd-faq"><b>Does it update itself?</b><p>Yes. It checks for a signed update over HTTPS on launch and installs it on the next restart.</p></div>
          </section>
        </>)}

        <section id="help-start"><h2>Getting started</h2>
          <ol className="wd-steps">
            <li>On the <b>Dashboard</b>, type what you want to get done in <b>Your goal</b>, or pick a space to start from. You can paste a whole ticket, a requirement, or an error message.</li>
            <li>Press <b>Start guiding me</b>. WorkCoPilot reads the goal, plans the task, and asks to read your screen.</li>
            <li>Allow screen sharing. Choose <b>your whole screen</b> so it can guide you through other apps, not just this tab.</li>
            <li>Follow the <b>DO THIS NOW</b> step. As your screen changes, the next step appears on its own.</li>
          </ol>
          <p className="wd-tip"><Sparkles size={14} /> First time only: set up your AI in the box on the Dashboard. It is what reads your screen. After that, it just works.</p>
        </section>

        <section id="help-how"><h2>How guidance works</h2>
          <p>WorkCoPilot reads your screen and tells you the exact next move. It does not click or type for you, so you stay in control the whole time. It starts from the very beginning, opening the right page and signing in, and assumes nothing.</p>
          <h3 className="sub">What you see</h3>
          <ul>
            <li><b>DO THIS NOW</b> shows the current step, rewritten for exactly what is on your screen right now.</li>
            <li>Exact <b>commands, code and links</b> come copy-ready, each with a Copy button that works on the page and in the floating window.</li>
            <li>The <b>checklist</b> shows the whole plan. Finished steps tick off by themselves as it sees them done.</li>
          </ul>
          <h3 className="sub">How it keeps up</h3>
          <p>It watches in downscaled frames and only looks closely when the screen actually changes, so an idle screen uses almost nothing. When it sees you take a wrong turn, it says so and corrects the step. You can press <b>Re-plan</b> at any time to rebuild the steps from what is on screen now.</p>
        </section>

        <section id="help-styles"><h2>Guide styles</h2>
          <p>Pick the depth that fits you from the <b>Guide style</b> menu. You can switch styles mid-task.</p>
          <ul>
            <li><b>Step by step</b> - one action at a time with the exact command, each confirmed before the next.</li>
            <li><b>Very beginner</b> - everything spelled out, every click and keystroke, with jargon explained in plain words.</li>
            <li><b>Architect level</b> - design, trade-offs and best practices, written for someone experienced who wants the why.</li>
            <li><b>Problem solving</b> - debug together: read the error, test one idea at a time, and narrow down the cause.</li>
          </ul>
        </section>

        <section id="help-ask"><h2>Ask, Analyze and Research</h2>
          <p>Three things you can do at any point in a task, without losing your place:</p>
          <ul>
            <li><b>Ask</b> - type a question about what is on screen and get a direct answer, grounded in what it can see.</li>
            <li><b>Analyze</b> (called <b>Photo</b> on mobile) - takes one screenshot now and reads it against your goal. Add a focus note to point it at the part you care about.</li>
            <li><b>Research</b> - looks up the latest on the web, then answers. It runs only when you tap it, so nothing happens behind your back.</li>
          </ul>
        </section>

        <section id="help-deep"><h2>Deep pass</h2>
          <p>Hit a hard spot? Tap <b>Deep pass</b>. It runs that one screenshot with more reasoning, folds the result back into your steps, then carries on at normal speed. It is a one-time boost, not a mode you have to turn off. WorkCoPilot also does this on its own when a step gets tricky, so you rarely need to ask.</p>
          <p className="wd-tip"><Zap size={14} /> Reach for Deep pass when a step is ambiguous, an error is unfamiliar, or the screen does not match what you expected.</p>
        </section>

        <section id="help-float"><h2>The floating overlay</h2>
          <p>Tap <b>Float on top</b> to pop the guide into a small always-on-top window, so you never switch tabs while you work. Move and resize it freely. Use the sun and moon to switch light or dark, and the percentage control to dim it so it stays out of the way.</p>
          <p>On Chrome, Edge, Brave and Opera the float sits on top of every app. On Firefox and Safari it opens as a separate pop-out window instead, which you can still move anywhere.</p>
          <p className="wd-tip"><AppWindow size={14} /> Keep the WorkCoPilot tab open while you use the float. It can sit in the background, that is fine.</p>
        </section>

        <section id="help-where"><h2>Desktop, mobile and browser</h2>
          <p>Every way to run WorkCoPilot is included in one subscription. Use whichever fits the moment.</p>
          <ul>
            <li><b>Browser</b> - nothing to install, works even on locked-down machines. Share your whole screen to be guided through any app. You are using this one now.</li>
            <li><b>Desktop app</b> - a true overlay with see-through and click-behind, and it hides itself from screen shares, so people on a call do not see it.</li>
            <li><b>Mobile app</b> - point your phone camera at a screen, a device or paper, and get guided. Tap <b>Photo</b> to ask about what the camera sees, or let it watch live.</li>
          </ul>
        </section>

        <section id="help-time"><h2>Your time and pausing</h2>
          <p>Your plan gives you hours of live guidance each day, counted only while it is actively guiding, never while idle. The <b>min left</b> badge at the top shows how much time remains today, and it turns amber to warn you before you run low.</p>
          <ul>
            <li>Tap <b>Pause</b> to freeze the clock and your session while you step away or do other work, then <b>Resume</b> when you are back.</li>
            <li>Daily minutes reset at <b>11:59 PM ET</b>.</li>
            <li>Purchased top-up time never expires and is used only after your daily minutes are gone.</li>
            <li>Need more now? Use <b>Add time</b> at the top of the Dashboard.</li>
          </ul>
        </section>

        <section id="help-record"><h2>Keeping a record</h2>
          <p>Every session can be saved as a clean <b>PDF report</b>: the task, what was achieved, every step with the exact commands and code, any warnings, and your questions and answers. Use <b>Report</b> to download it, or <b>Print</b> for a paper copy or a PDF from your print dialog.</p>
          <p className="wd-tip"><Printer size={14} /> The report is handy as a runbook for next time, or to hand to a teammate who needs to do the same task.</p>
        </section>

        <section id="help-safe"><h2>Safety and acceptable use</h2>
          <p>WorkCoPilot supports lawful, legitimate work only. It will not help build weapons or means of mass harm, create malware or exploits, break into systems or accounts you do not own, or do anything illegal. Those requests are declined when you set the goal.</p>
          <p>It reads your screen to guide you and never acts for you. It does not click, type, or submit anything on your behalf, so you decide every action.</p>
        </section>

        <section id="help-faq"><h2>FAQ</h2>
          <div className="wd-faq"><b>Do I need to install anything?</b><p>No. It runs in your browser. Install the desktop or mobile app only if you want the extra overlay or camera features.</p></div>
          <div className="wd-faq"><b>Will people on a call see the overlay?</b><p>If you share your whole screen in the browser, yes. The desktop app hides itself from screen shares.</p></div>
          <div className="wd-faq"><b>Does it work for non-technical work?</b><p>Yes. Finance, marketing, legal, office, product, anything that happens on a screen.</p></div>
          <div className="wd-faq"><b>What if the steps are wrong for my screen?</b><p>It re-reads your screen and corrects as you go. Press <b>Read my screen</b> anytime to take a fresh screenshot, verify the current step and move on, or <b>Re-plan</b> to rebuild the steps.</p></div>
          <div className="wd-faq"><b>Does it type or click for me?</b><p>No. It only reads and guides. You stay in control of every action.</p></div>
          <div className="wd-faq"><b>What does it do with my screen?</b><p>Frames are downscaled and read only to guide the task. An unchanged screen is not sent at all.</p></div>
        </section>

        <div className="wd-help-cta"><button className="wd-cta" onClick={onStart}><Play size={16} /> Start a task</button></div>
      </div>
    </div>
  )
}

// ---- Console: the live step-then-watch copilot ----------------------------
const MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace'

// Responsive layer for the (otherwise inline-styled) Console. Scoped to the
// .wc wrapper so it never touches the rest of the app. On a phone it enlarges
// tap targets to ~40px, bumps field text to 16px (stops iOS zoom-on-focus),
// and lets the ask / capture rows grow to full width. Desktop is untouched.
const CONSOLE_CSS = `
.wc{overflow-x:hidden}
.wc *{box-sizing:border-box}
.wc pre{max-width:100%}
@media(max-width:640px){
  .wc .btn{min-height:44px;height:auto;padding-top:9px;padding-bottom:9px}
  .wc .btn-sm{min-height:40px;height:auto;padding-top:7px;padding-bottom:7px}
  .wc .icon-btn{min-width:40px;min-height:40px}
  .wc .input,.wc .select,.wc .textarea{font-size:16px}
  .wc textarea.input{min-height:76px;height:auto}
  .wc-askrow .input{flex:1 1 100%}
  .wc-askrow .btn{flex:1 1 auto;justify-content:center}
  .wc-caprow .wc-grow{flex:1 1 100%;justify-content:center}
  .wc .wc-tbtn,.wc .wc-chip-btn{min-height:38px}
  .wc .wc-ib{min-width:36px;min-height:36px}
  .wc-ask .wc-ask-row .wc-tbtn{flex:1 1 auto;justify-content:center}
}
/* Deliverables panel (review -> prompts + document) */
.wc-dl{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,7,14,.6);backdrop-filter:blur(4px)}
.wc-dl-card{width:min(680px,calc(100vw - 28px));max-height:min(86vh,760px);display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.wc-dl-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line)}
.wc-dl-head b{display:inline-flex;align-items:center;gap:8px;font-size:16px}
.wc-dl-head svg{color:var(--em-2)}
.wc-dl-x{background:none;border:none;color:var(--mut);font-size:24px;line-height:1;cursor:pointer;padding:0 4px}
.wc-dl-body{padding:18px 20px;overflow:auto}
.wc-dl-lead{color:var(--mut);font-size:14px;line-height:1.6;margin:0 0 14px}
.wc-dl-thumbs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.wc-dl-thumb{position:relative;width:92px;height:62px;border-radius:9px;overflow:hidden;border:1px solid var(--line-2)}
.wc-dl-thumb img{width:100%;height:100%;object-fit:cover}
.wc-dl-thumb span{position:absolute;left:4px;bottom:3px;font-size:10px;font-weight:700;color:#fff;background:rgba(0,0,0,.6);border-radius:4px;padding:0 5px}
.wc-dl-thumb button{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:13px;line-height:1;cursor:pointer}
.wc-dl-empty{color:var(--mut);font-size:13px;padding:14px 0}
.wc-dl-err{color:var(--danger);font-size:13px;margin-bottom:10px}
.wc-dl-auto{display:inline-flex;align-items:center;gap:9px;font-size:13.5px;color:var(--tx);cursor:pointer;margin-bottom:12px;font-weight:500}
.wc-dl-auto input{width:16px;height:16px;accent-color:var(--em-2);cursor:pointer}
.wc-dl-watch{display:flex;align-items:center;gap:9px;background:var(--em-fill);border:1px solid var(--em-line);border-radius:10px;padding:9px 12px;font-size:12.5px;color:var(--tx-2);margin-bottom:12px}
.wc-dl-watch .dot{width:9px;height:9px;border-radius:50%;background:var(--em-2);box-shadow:0 0 0 0 var(--em-2);animation:wc-dl-pulse 1.4s infinite}
@keyframes wc-dl-pulse{0%{box-shadow:0 0 0 0 rgba(56,189,248,.5)}70%{box-shadow:0 0 0 7px rgba(56,189,248,0)}100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}}
.wc-dl-note{background:var(--warm-fill);border:1px solid var(--warm-line);color:var(--warm);border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}
.wc-dl-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.wc-dl-summary{font-size:14.5px;line-height:1.6;color:var(--tx);margin:0 0 16px}
.wc-dl-sec{margin-bottom:16px}
.wc-dl-sec h4{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:0 0 10px}
.wc-dl-issue{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--line)}
.wc-dl-issue .sev{flex-shrink:0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:3px 8px;border-radius:999px}
.wc-dl-issue .sev.critical{color:#fff;background:#c0392b}.wc-dl-issue .sev.high{color:#fff;background:#e0742b}
.wc-dl-issue .sev.medium{color:#7a5300;background:rgba(255,179,92,.3)}.wc-dl-issue .sev.low{color:var(--mut);background:var(--chip)}
.wc-dl-issue b{font-size:14px}
.wc-dl-issue .ctrl{display:inline-block;margin-left:7px;font-size:11px;font-weight:600;color:var(--em-2)}
.wc-dl-issue .fix{color:var(--mut);font-size:13px;margin-top:3px;line-height:1.5}
.wc-dl-prompt{margin:14px 0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.wc-dl-prompt .ph{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--panel-2);border-bottom:1px solid var(--line);font-size:13px}
.wc-dl-prompt pre{margin:0;padding:12px;white-space:pre-wrap;word-break:break-word;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;line-height:1.55;color:var(--tx-2);max-height:220px;overflow:auto}
@media(max-width:640px){.wc-dl-card{width:calc(100vw - 20px);max-height:92vh}.wc-dl-actions .btn{flex:1 1 auto;justify-content:center}}

/* ===================================================================
   Guiding panel design system (Fluent / Wiz-grade). Green is the brand
   token (--brand-500); here it is used ONLY as accent (chips, left
   accent bars, soft fills, dots), never as body-text colour. Action
   text is high-contrast --text; pending recedes; done is quietly struck.
   --text-dim / --brand-50 are aliased to real tokens so they resolve
   correctly in BOTH light and dark (they are otherwise undefined).
   =================================================================== */
/* ONE accent for the whole console: emerald, the same family the rest of the
   site uses (hero, live, done). The old blue retune competed with the green and
   read as a second app; a single accent keeps every primary action coherent.
   Typography matches the site too: Bricolage Grotesque display, Figtree body,
   JetBrains Mono code, so the console stops inheriting the desktop Segoe UI. */
.wc{--text-dim:var(--text-muted);
  --wc-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  --wc-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --wc-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-family:var(--wc-body);
  --brand-500:#0e9f6e;--brand-600:#0b8259;--brand-700:#086647;--brand-soft:rgba(14,159,110,.12);--brand-50:rgba(14,159,110,.12);
  /* Semantic guiding palette (color-coded by meaning): EMERALD = the current
     step / live action (the brightest thing), CYAN = calm context the watcher
     can see (observation), amber = warnings (--warning, already defined). Light
     values here; the dark overrides follow. Derived from the brand set
     emerald #8cf5c4 / cyan #39d3ff for dark; darkened for contrast on white. */
  --em:#0e9f6e;--em-2:#0a84c2;--on-em:#ffffff;
  --em-soft:rgba(14,159,110,.10);--em-ring:rgba(14,159,110,.32);--em-glow:rgba(14,159,110,.16);
  --obs:#0a84c2;--obs-soft:rgba(10,132,194,.09);--obs-ring:rgba(10,132,194,.30);
  /* MS-docs blue, for the inline "Open ..." hyperlinks (distinct from the green
     accent so a link reads as a link). --wc-fs is the reader text-size multiplier
     (set inline on .wc); guidance font-sizes below are calc(px * var(--wc-fs)). */
  --wc-link:#0067c0;--wc-fs:1;
  font-feature-settings:"tnum" 1,"cv11" 1}
[data-theme='dark'] .wc{--brand-500:#34d8a0;--brand-600:#12b981;--brand-700:#0e9f6e;--brand-soft:rgba(52,216,160,.16);--brand-50:rgba(52,216,160,.16);
  --em:#8cf5c4;--em-2:#39d3ff;--on-em:#052a1d;
  --em-soft:rgba(140,245,196,.14);--em-ring:rgba(140,245,196,.34);--em-glow:rgba(140,245,196,.20);
  --obs:#39d3ff;--obs-soft:rgba(57,211,255,.12);--obs-ring:rgba(57,211,255,.34);--wc-link:#6cb6ff}
.wc .fill{flex:1 1 auto;min-width:0}

/* Header toolbar: one quiet row under a hairline. Float on top is the primary
   action of this screen on the web, so it is the one filled button up here. */
.wc-top{display:flex;align-items:center;gap:6px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);min-width:0}
.wc-top-title{flex:1 1 auto;min-width:40px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650;font-size:13.5px;color:var(--text);letter-spacing:-.01em;padding:0 2px}
.wc-ib{width:34px;height:34px;flex:0 0 auto;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-muted);display:grid;place-items:center;cursor:pointer;transition:background .16s,color .16s,border-color .16s}
.wc-ib:hover{background:var(--surface-2);color:var(--text);border-color:var(--border)}
.wc-ib:disabled{opacity:.5;cursor:default}
.wc-ib.on{background:var(--brand-soft);color:var(--brand-600);border-color:transparent}
.wc-min{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;font-size:11.5px;font-weight:650;color:var(--text-muted);background:var(--surface-2);border:1px solid var(--border);border-radius:999px;padding:0 10px;height:28px;white-space:nowrap;font-variant-numeric:tabular-nums}
.wc-min .wc-dot{width:6px;height:6px;border-radius:50%;background:var(--brand-500)}
.wc-min.low{color:var(--danger);background:var(--danger-soft);border-color:transparent}
.wc-min.low .wc-dot{background:var(--danger)}
/* Compact toolbar button: the header + guide-bar control family */
.wc-tbtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px;border-radius:10px;font-size:12.5px;font-weight:600;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;white-space:nowrap;line-height:1;box-shadow:var(--shadow-sm);transition:background .16s,border-color .16s,color .16s,transform .1s,box-shadow .16s}
.wc-tbtn:hover:not(:disabled){border-color:var(--border-strong);background:var(--surface-2)}
.wc-tbtn:active:not(:disabled){transform:translateY(1px)}
.wc-tbtn:disabled{opacity:.55;cursor:default}
.wc-tbtn svg{color:var(--text-muted);flex-shrink:0}
.wc-tbtn.primary{background:linear-gradient(180deg,var(--brand-500),var(--brand-600));border-color:transparent;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.14)}
.wc-tbtn.primary:hover:not(:disabled){background:var(--brand-600);filter:brightness(1.04)}
.wc-tbtn.primary svg{color:#fff}
.wc-tbtn.ghost{background:transparent;border-color:transparent;color:var(--text-muted);box-shadow:none}
.wc-tbtn.ghost:hover:not(:disabled){background:var(--surface-2);color:var(--text)}
.wc-tbtn.on{background:var(--brand-soft);border-color:transparent;color:var(--brand-600);box-shadow:none}
.wc-tbtn.on svg{color:var(--brand-600)}
.wc-tbtn.on:hover:not(:disabled){background:var(--brand-soft);border-color:var(--brand-500)}
.wc-tbtn.live{background:var(--danger-soft);border-color:transparent;color:var(--danger)}
.wc-tbtn.live svg{color:var(--danger)}
.wc-tbtn.quiet{color:var(--text-muted)}
.wc-tbtn.quiet:hover:not(:disabled){color:var(--danger);border-color:var(--danger)}
.wc-strong{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:650;color:var(--brand-600);background:var(--brand-soft);padding:0 9px;height:26px;border-radius:999px}

/* Live status row: a single card that holds the watch state (or the action
   that starts it), the minutes, and the three live actions. */
.wc-guidebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;padding:9px 10px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-sm)}
.wc-guidebar .wc-sp{flex:1 1 auto;min-width:4px}
.wc-guidebar .wc-tbtn:not(.primary){box-shadow:none;background:var(--surface-2)}
.wc-guidebar .wc-tbtn:not(.primary):hover:not(:disabled){background:var(--surface-3)}
.wc-guidebar .wc-tbtn.ghost{background:transparent}
.wc-watch{height:34px;padding:0 15px;font-size:13px;font-weight:650}
/* First-run hint: share your screen, then float the steps above your work. */
.wc-tip{position:relative;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px 10px 15px;margin-bottom:12px;border-radius:12px;background:var(--brand-soft);color:var(--text);font-size:13px;line-height:1.45;overflow:hidden}
.wc-tip::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--brand-500)}
.wc-tip>svg{color:var(--brand-600);flex-shrink:0}
.wc-tip b{font-weight:650}
.wc-tip .wc-tbtn{margin-left:auto;box-shadow:none}
@media(max-width:640px){.wc-tip .wc-tbtn{margin-left:0;flex:1 1 100%;justify-content:center}}

/* PLAN-HEAVY MODE (watch-light, forced by us for Premium): a calm informational
   strip + an on-demand "Check my progress" action. There is no toggle. One
   emerald accent, same tokens, works light + dark. */
.wc-live-pill.lite{color:var(--brand-600);background:var(--brand-soft)}
.wc-live-pill.lite svg{color:var(--brand-600);flex-shrink:0}
.wc-wl{display:flex;align-items:center;gap:10px 12px;flex-wrap:wrap;margin:10px 0 0;padding:11px 14px;background:var(--em-soft);border:1px solid var(--em-ring);border-radius:14px}
.wc-wl .wc-sp{flex:1 1 auto;min-width:4px}
.wc-wl-ic{color:var(--brand-600);flex-shrink:0}
.wc-wl-sub{flex:1 1 220px;min-width:0;font-size:12.5px;color:var(--text-muted);line-height:1.45}
.wc-wl-check{flex:0 0 auto;box-shadow:none}
@media(max-width:640px){.wc-wl-check{flex:1 1 100%;justify-content:center}}

/* Completed-task bar */
.wc-donebar{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:14px 16px 14px 20px;margin-bottom:12px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);overflow:hidden}
.wc-donebar::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--success)}
.wc-donebar-lead{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:650;color:var(--text);min-width:0}
.wc-donebar-lead svg{color:var(--success);flex-shrink:0}
.wc-donebar-lead .wc-done-ic{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);flex-shrink:0}
.wc-donebar-lead small{display:block;font-size:12px;font-weight:500;color:var(--text-muted);margin-top:1px}
.wc-donebar-actions{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto}
.wc-chip-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .16s,border-color .16s}
.wc-chip-btn:hover{border-color:var(--border-strong);background:var(--surface-3)}
.wc-chip-btn svg{color:var(--text-muted);flex-shrink:0}
@media(max-width:640px){.wc-donebar-actions{margin-left:0;width:100%}.wc-donebar-actions .wc-chip-btn{flex:1 1 calc(50% - 4px);justify-content:center}}

/* Banners */
.wc-banner{position:relative;display:flex;align-items:center;gap:10px;border-radius:12px;padding:11px 14px;margin-bottom:12px;font-size:13.5px;line-height:1.45;overflow:hidden}
.wc-banner svg{flex-shrink:0}
.wc-banner .fill{flex:1}
.wc-banner.danger{background:var(--danger);color:#fff}
.wc-banner.warn{background:var(--warning-soft);color:var(--text);padding-left:17px}
.wc-banner.warn::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--warning)}
.wc-banner.warn svg{color:var(--warning)}

/* OBSERVATION = calm context the watcher can see: a cyan-tinted chip. */
.wc-live{display:flex;align-items:flex-start;gap:9px;margin:10px 0;padding:9px 13px;font-size:calc(12.5px*var(--wc-fs,1));color:var(--text-muted);line-height:1.5;background:var(--obs-soft);border:1px solid var(--obs-ring);border-radius:11px}
.wc-live>svg{color:var(--obs);flex-shrink:0;margin-top:1px}
.wc-live .pulse,.wc-live-pill .pulse{width:8px;height:8px;flex-shrink:0;border-radius:50%;background:var(--em);--pr:var(--em-ring);box-shadow:0 0 0 0 var(--pr);animation:wc-pulse 1.6s infinite;margin-top:4px}
.wc-live-pill .pulse{margin-top:0}
.wc-live .pulse{background:var(--obs);--pr:var(--obs-ring)}
@keyframes wc-pulse{0%{box-shadow:0 0 0 0 var(--pr)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
.wc-live-pill{display:inline-flex;align-items:center;gap:7px;height:34px;font-size:12.5px;font-weight:650;color:var(--em);background:var(--em-soft);padding:0 13px;border-radius:999px;white-space:nowrap}
.wc-live-pill.paused{color:var(--text-dim);background:var(--surface-2)}
.wc-live-pill.paused svg{color:var(--warning)}
.wc-live-pill.out{color:var(--danger);background:var(--danger-soft)}
.wc-live-min{opacity:.85;font-weight:600}
.wc-plan-title{font-family:var(--wc-display);font-size:18px;font-weight:700;color:var(--text);margin:14px 2px 0;line-height:1.3;letter-spacing:-.015em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.wc-plan-kicker{display:flex;align-items:center;gap:8px;margin:16px 2px 0;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint)}
.wc-plan-kicker+.wc-plan-title{margin-top:4px}
.wd-modal-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,24,.5);backdrop-filter:blur(3px)}
.wd-modal{width:min(420px,calc(100vw - 36px));background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;box-shadow:0 30px 70px -30px rgba(0,0,0,.5)}
.wd-modal h3{display:flex;align-items:center;gap:9px;font-weight:700;font-size:18px;margin:0 0 6px}
.wd-modal-btns{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}

/* DO THIS NOW hero: the single strongest focus on the screen */
/* CURRENT STEP = the brightest element: emerald accent, an emerald->cyan left
   bar, and a gentle pulsing glow (disabled under prefers-reduced-motion). */
.wc-hero{position:relative;margin-top:14px;padding:20px 22px 16px 26px;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-md),0 0 0 1px var(--em-ring) inset;overflow:hidden;animation:wc-now-glow 2.8s ease-in-out infinite}
.wc-hero::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;z-index:2;background:linear-gradient(180deg,var(--em),var(--em-2))}
.wc-hero::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(640px 180px at 0% 0%,var(--em-glow),transparent 72%)}
.wc-hero>*{position:relative;z-index:1}
@keyframes wc-now-glow{0%,100%{box-shadow:var(--shadow-md),0 0 0 1px var(--em-ring) inset,0 14px 38px -20px var(--em-glow)}50%{box-shadow:var(--shadow-md),0 0 0 1px var(--em-ring) inset,0 16px 52px -14px var(--em-glow)}}
.wc-hero-eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.wc-hero-chip{display:inline-flex;align-items:center;gap:6px;height:24px;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--on-em);background:linear-gradient(135deg,var(--em),var(--em-2));padding:0 10px;border-radius:999px}
.wc-hero-hint{font-size:12px;color:var(--text-muted)}
.wc-hero-hint-btn{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;font-weight:650;color:var(--brand-600);background:transparent;border:none;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;transition:text-decoration-color .15s}
.wc-hero-hint-btn:hover{text-decoration-color:currentColor}
.wc-hero-text{font-family:var(--wc-body);font-size:calc(15px*var(--wc-fs,1));line-height:1.45;font-weight:650;color:var(--text);letter-spacing:-.005em;text-wrap:pretty}
@media(max-width:640px){.wc-hero{padding:16px 16px 13px 20px;border-radius:16px}.wc-hero-text{font-size:calc(14.5px*var(--wc-fs,1))}}

/* Step navigator with a progress track */
.wc-nav{display:flex;align-items:center;gap:12px;padding:2px 2px 6px}
.wc-nav-btn{display:inline-flex;align-items:center;gap:4px;height:32px;padding:0 11px;border-radius:9px;border:1px solid transparent;background:transparent;color:var(--text-muted);font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .16s,color .16s,border-color .16s}
.wc-nav-btn:hover:not(:disabled){background:var(--surface);border-color:var(--border);color:var(--text)}
.wc-nav-btn:disabled{opacity:.4;cursor:default}
.wc-nav-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;align-items:center}
.wc-nav-count{font-size:10.5px;font-weight:700;letter-spacing:.08em;color:var(--text-muted);text-transform:uppercase;white-space:nowrap;font-variant-numeric:tabular-nums}
.wc-nav-track{width:100%;height:4px;border-radius:999px;background:var(--surface-3);overflow:hidden}
.wc-nav-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--em),var(--em-2));transition:width .35s var(--ease,cubic-bezier(.4,0,.2,1))}

/* Step cards: current leads, pending recedes, done is struck. When the task is
   over (.wc-steps.ro) the same cards become a calm, read-only record. */
.wc-steps{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.wc-step{position:relative;display:flex;gap:12px;align-items:flex-start;padding:12px 14px 12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;transition:border-color .16s,background .16s,box-shadow .16s,opacity .16s}
.wc-step.now{border-color:transparent;box-shadow:var(--shadow-md)}
.wc-step.now::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:14px 0 0 14px;background:linear-gradient(180deg,var(--em),var(--em-2))}
.wc-step.pending{opacity:.6;box-shadow:none}
.wc-step.done{background:var(--surface-2);border-color:transparent}
.wc-step.skipped{background:transparent;border-style:dashed}
.wc-step-check{flex-shrink:0;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;border:1.5px solid var(--border-strong);background:transparent;color:var(--text-faint);cursor:pointer;margin-top:1px;padding:0;font:inherit;transition:border-color .16s,background .16s,color .16s}
.wc-step-check:hover{border-color:var(--em);color:var(--em)}
.wc-step-num{font-size:11.5px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.wc-step.now .wc-step-check{border-color:var(--em);background:var(--em-soft);color:var(--em)}
.wc-step.done .wc-step-check{border-color:transparent;background:var(--success-soft);color:var(--success)}
.wc-steps.ro .wc-step-check{cursor:default}
.wc-steps.ro .wc-step-check:hover{border-color:var(--border-strong);color:var(--text-faint)}
.wc-steps.ro .wc-step.done .wc-step-check:hover{border-color:transparent;color:var(--success)}
.wc-step-body{flex:1;min-width:0}
.wc-step-title{font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5;color:var(--text-muted);font-weight:500}
.wc-step.now .wc-step-title{color:var(--text);font-weight:650;font-size:calc(14px*var(--wc-fs,1))}
.wc-step.done .wc-step-title{text-decoration:line-through;text-decoration-color:var(--text-faint);color:var(--text-faint);font-weight:500}
.wc-steps.ro .wc-step.done .wc-step-title{text-decoration:none;color:var(--text-muted)}
.wc-step-when{display:inline-flex;align-items:center;gap:5px;font-size:calc(11px*var(--wc-fs,1));color:var(--text-muted);margin-top:8px;background:var(--surface-2);border:1px solid var(--border);padding:3px 9px;min-height:24px;border-radius:7px}
.wc-step-doneat{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--success);margin-top:6px;font-weight:600}
.wc-step-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-faint);margin-top:6px;font-weight:600}
.wc-record-head{display:flex;align-items:center;gap:7px;padding:0 2px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);font-variant-numeric:tabular-nums}
.wc-record-head svg{color:var(--success)}
.wc-done-toggle{display:flex;align-items:center;gap:7px;width:100%;background:transparent;border:1px dashed var(--border-strong);border-radius:11px;padding:9px 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--text-dim);cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wc-done-toggle:hover{color:var(--text);background:var(--surface);border-style:solid}
.wc-done-toggle .wc-dt-ok{color:var(--success)}

/* All-done confirmation + flags */
.wc-alldone{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--success-soft);border-radius:13px;color:var(--success);font-weight:650;font-size:13.5px;line-height:1.45}
.wc-alldone svg{flex-shrink:0}
.wc-flag{position:relative;display:flex;gap:10px;align-items:flex-start;padding:10px 13px 10px 16px;background:var(--warning-soft);border-radius:12px;font-size:calc(13px*var(--wc-fs,1));line-height:1.5;color:var(--text);overflow:hidden;animation:wc-line-in .3s cubic-bezier(.2,.8,.2,1) both}
.wc-flag::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--warning)}
.wc-flag svg{color:var(--warning);flex-shrink:0;margin-top:2px}
.wc-flag-k{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--warning);margin-right:6px}
.wc-flags{display:flex;flex-direction:column;gap:8px;margin:12px 0 0}
/* Blue MS-docs inline hyperlink for "Open ..." actions (a link, not a button).
   Underlines on hover/focus; scales with the reader text size. */
.wc-open{display:inline-flex;align-items:center;gap:5px;margin-top:8px;color:var(--wc-link);font-size:calc(13px*var(--wc-fs,1));font-weight:600;text-decoration:none;text-decoration-color:transparent;text-underline-offset:3px;border-radius:4px;overflow-wrap:anywhere;transition:text-decoration-color .15s}
.wc-open:hover,.wc-open:focus-visible{text-decoration:underline;text-decoration-color:currentColor}
.wc-open svg{flex-shrink:0}
/* Reader text-size bar: a quiet right-aligned A- / A / A+ control that sits atop
   the guidance so the reader can set a comfortable size (MS-Learn style). */
.wc-readbar{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:14px 0 2px}
.wc-readbar .wc-readbar-k{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--text-dim)}
.wc-loading{display:flex;flex-direction:column;align-items:center;gap:20px;padding:44px 20px 40px}
.wc-loading-orb{position:relative;width:48px;height:48px}
.wc-loading-orb span{position:absolute;top:50%;left:50%;border-radius:50%;border:2px solid transparent;border-top-color:var(--brand-600);transform:translate(-50%,-50%);animation:wc-orb 1.1s linear infinite}
.wc-loading-orb span:nth-child(1){width:48px;height:48px}
.wc-loading-orb span:nth-child(2){width:34px;height:34px;opacity:.55;animation-duration:1.5s;animation-direction:reverse}
.wc-loading-orb span:nth-child(3){width:20px;height:20px;opacity:.3;animation-duration:.85s}
@keyframes wc-orb{to{transform:translate(-50%,-50%) rotate(360deg)}}
.wc-loading-phases{display:flex;flex-direction:column;gap:10px;width:100%;max-width:290px}
.wc-loading-line{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:var(--text);animation:wc-line-in .45s cubic-bezier(.2,.8,.2,1) both}
.wc-loading-line svg{flex-shrink:0}
.wc-loading-line.past{color:var(--text-dim);font-weight:400}
.wc-loading-line.past svg{color:var(--success)}
.wc-loading-line.on svg{color:var(--brand-600)}
@keyframes wc-line-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}

/* Ask / analyse bar + answer */
.wc-ask{margin-top:16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);padding:8px 8px 8px 10px;transition:border-color .16s,box-shadow .16s}
.wc-ask:focus-within{border-color:var(--brand-500);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-ask .wc-ask-row{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap}
.wc-ask-ta{flex:1;min-width:140px;resize:vertical;min-height:40px;max-height:220px;line-height:1.5;font-family:inherit;font-size:14px}
.wc-ask textarea.input{background:transparent;border-color:transparent;box-shadow:none;padding:9px 6px;height:auto}
.wc-ask textarea.input:focus{background:transparent;border-color:transparent;box-shadow:none}
.wc-ask input.input{flex:1;min-width:170px;height:38px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border)}
.wc-ask input.input:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-ask .wc-ib{width:36px;height:36px}
.wc-ask .wc-tbtn{height:36px}
.wc-ask-answer{margin:8px 2px 2px;padding:12px 4px 4px;border-top:1px solid var(--border);font-size:14px;line-height:1.6}
.wc-ask-k{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-600)}

/* Pre-plan starter + session summary */
.wc-pre{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-md);padding:22px 22px 18px;overflow:hidden}
.wc-pre::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(640px 200px at 100% 0%,var(--brand-soft),transparent 70%)}
.wc-pre>*{position:relative;z-index:1}
.wc-pre-title{font-family:var(--wc-display);font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;letter-spacing:-.02em}
.wc-pre-sub{font-size:13px;color:var(--text-muted);margin-bottom:14px;line-height:1.5}
.wc-pre textarea.input{border-radius:12px;padding:12px 13px;font-size:15px;line-height:1.5;min-height:92px}
.wc-pre-help{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;color:var(--text-muted);margin-top:14px;line-height:1.5}
.wc-pre-help svg{color:var(--brand-600);flex-shrink:0;margin-top:2px}
.wc-pre-help b{color:var(--text);font-weight:650}
@media(max-width:640px){.wc-pre{padding:18px 16px 16px;border-radius:16px}.wc-pre-title{font-size:18px}}
.wc-sum{background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);padding:18px 20px;margin-top:16px;line-height:1.6}
.wc-sum-title{display:inline-flex;align-items:center;gap:8px;font-family:var(--wc-display);font-weight:700;font-size:15px;letter-spacing:-.01em;margin-bottom:10px;color:var(--text)}
.wc-sum-title svg{color:var(--brand-600)}

/* MAKE: ONE calm surface that consolidates the three "produce something" actions
   (Answer / Write / Compute) behind a quiet tab row. Only the chosen panel opens,
   so a single primary action shows at a time instead of three stacked bars with
   three subtitles. No outer box: a top hairline and spacing group it, keeping the
   focus on the goal + current step above. Produced artifacts (ResultCard /
   ComposeCard / ComputeCard) stack below and stay visible after the panel closes. */
.wc .wc-sp{flex:1 1 auto;min-width:4px}
.wc-make{margin-top:20px;padding-top:16px;border-top:1px solid var(--border)}
.wc-make-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.wc-make-kicker{font-family:var(--wc-display);font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--text-muted);white-space:nowrap}
.wc-make-tabs{display:inline-flex;gap:3px;background:var(--surface-2);border-radius:12px;padding:3px}
.wc-make-tab{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border:none;background:transparent;color:var(--text-muted);font:inherit;font-size:13px;font-weight:600;border-radius:9px;cursor:pointer;white-space:nowrap;transition:background .16s,color .16s,box-shadow .16s}
.wc-make-tab svg{color:currentColor;opacity:.85;flex-shrink:0}
.wc-make-tab:hover{color:var(--text)}
.wc-make-tab.on{background:var(--surface);color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.09),inset 0 0 0 1px var(--border)}
.wc-make-tab.on svg{opacity:1;color:var(--brand-600)}
.wc-make-lead{flex:1 1 auto;min-width:0;font-size:12.5px;color:var(--text-muted);line-height:1.4}
.wc-make-panel{margin-top:14px;display:flex;flex-direction:column;gap:12px;animation:wc-make-in .2s ease both}
@keyframes wc-make-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.wc-make-ctl{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.wc-made{margin-top:12px;display:flex;flex-direction:column;gap:10px}
@media(max-width:640px){
  .wc-make-tabs{flex:1 1 100%}
  .wc-make-tab{flex:1 1 auto;justify-content:center}
  .wc-make-lead{flex:1 1 100%;order:3}
  .wc-make-ctl .wc-tbtn{flex:1 1 auto;justify-content:center}
  .wc-make-ctl .wc-compose-fmt{flex:1 1 100%}
  .wc-make-ctl .wc-compose-fmt select{flex:1 1 auto}
}
@media(prefers-reduced-motion:reduce){.wc-make-panel{animation:none}}

/* ANSWER panel field styles (inside the Make surface): the Steps/Result/Both
   scope segmented control, its lead line, and the optional paste-data field.
   The returned ResultCard is a light Option-C card (see ResultCard.jsx). */
.wc-result-lead{font-size:12.5px;color:var(--text-muted);line-height:1.4;min-width:0}
.wc-seg{display:inline-flex;flex:0 0 auto;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:2px;gap:2px}
.wc-seg button{border:none;background:transparent;color:var(--text-muted);font:inherit;font-size:12.5px;font-weight:600;height:28px;padding:0 11px;border-radius:8px;cursor:pointer;line-height:1;transition:background .15s,color .15s,box-shadow .15s}
.wc-seg button:hover{color:var(--text)}
.wc-seg button.on{color:var(--text);background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.1),inset 0 0 0 1px var(--border)}
.wc-result-paste{width:100%;resize:vertical;min-height:62px;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:10px 12px;color:var(--text);font:inherit;font-size:13.5px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wc-result-paste::placeholder{color:var(--text-faint)}
.wc-result-paste:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-result-err{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--danger);line-height:1.45}
.wc-result-err svg{flex-shrink:0}
.wc-result-load{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text-muted)}
@media(max-width:640px){.wc-result-lead{flex:1 1 100%;order:3}}

/* WRITE panel field styles (inside the Make surface): the "what to write" field,
   the format selector, and the optional paste-source field. The returned
   ComposeCard is a light Option-C card (see ComposeCard.jsx). */
.wc-compose-label{display:block;font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:.01em}
.wc-compose-want,.wc-compose-src{width:100%;resize:vertical;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:10px 12px;color:var(--text);font:inherit;font-size:14px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wc-compose-want{min-height:58px}
.wc-compose-src{min-height:62px}
.wc-compose-want::placeholder,.wc-compose-src::placeholder{color:var(--text-faint)}
.wc-compose-want:focus,.wc-compose-src:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-compose-fmt{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;font-size:12px;font-weight:600;color:var(--text-muted)}
.wc-compose-fmt select{height:34px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:12.5px;font-weight:600;padding:0 30px 0 11px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color .15s,box-shadow .15s,background-color .15s}
.wc-compose-fmt select:focus{border-color:var(--brand-500);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-compose-err{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--danger);line-height:1.45}
.wc-compose-err svg{flex-shrink:0}
.wc-compose-load{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text-muted)}

/* COMPUTE panel field styles (inside the Make surface): the privacy line, the
   file drop / parsed preview (name, row count, typed-column chips), the "what to
   compute" field and status lines. The returned ComputeCard is a light Option-C
   card. Palette emerald #8cf5c4 / cyan #39d3ff / amber #f5c86b / ink #0a0d12. */
.wc-compute-privacy{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;line-height:1.5;font-weight:600;color:var(--brand-600);background:var(--em-soft);border:1px solid var(--em-ring);border-radius:12px;padding:10px 12px}
.wc-compute-privacy svg{flex-shrink:0;margin-top:1px;color:var(--brand-600)}
.wc-compute-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;min-height:104px;padding:16px;border-radius:13px;border:1.5px dashed var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;font:inherit;text-align:center;transition:border-color .16s,background .16s,color .16s}
.wc-compute-drop svg{color:var(--brand-600);margin-bottom:2px}
.wc-compute-drop:hover{border-color:var(--brand-500);background:var(--em-soft);color:var(--text)}
.wc-compute-drop-t{font-size:13.5px;font-weight:600;color:var(--text)}
.wc-compute-drop-s{font-size:12px;color:var(--text-faint)}
.wc-compute-file{border:1px solid var(--border);border-radius:13px;background:var(--surface-2);padding:11px 12px;display:flex;flex-direction:column;gap:10px}
.wc-compute-file-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wc-compute-file-name{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-compute-file-name svg{flex-shrink:0;color:var(--brand-600)}
.wc-compute-file-meta{font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.wc-compute-change{margin-left:auto;flex:0 0 auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--brand-600);font:inherit;font-size:12px;font-weight:600;padding:5px 10px;cursor:pointer;transition:border-color .15s,background .15s}
.wc-compute-change:hover{border-color:var(--brand-500);background:var(--em-soft)}
.wc-compute-chips{display:flex;flex-wrap:wrap;gap:7px}
.wc-compute-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:4px 10px;font-size:12px;line-height:1.3}
.wc-compute-chip b{font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-compute-chip i{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 6px;border-radius:999px}
.wc-compute-chip.t-number i{color:#0a7fa8;background:rgba(57,211,255,.16)}
.wc-compute-chip.t-date i{color:#8f5a07;background:rgba(245,200,107,.22)}
.wc-compute-chip.t-string i{color:#3d4650;background:rgba(10,13,18,.07)}
.wc-compute-label{display:block;font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:.01em}
.wc-compute-want{width:100%;resize:vertical;min-height:58px;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:10px 12px;color:var(--text);font:inherit;font-size:14px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wc-compute-want::placeholder{color:var(--text-faint)}
.wc-compute-want:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-compute-err{display:flex;align-items:flex-start;gap:7px;font-size:13px;color:var(--danger);line-height:1.45}
.wc-compute-err svg{flex-shrink:0;margin-top:1px}
.wc-compute-need{display:flex;align-items:flex-start;gap:9px;font-size:13px;line-height:1.5;color:var(--text);background:rgba(245,200,107,.14);border:1px solid rgba(245,200,107,.42);border-radius:11px;padding:10px 12px}
.wc-compute-need svg{flex-shrink:0;margin-top:1px;color:#8f5a07}
.wc-compute-need b{color:#8f5a07}
.wc-compute-load{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text-muted)}
@media(prefers-reduced-motion:reduce){.wc-compute-drop{transition:none}}

@media(prefers-reduced-motion:reduce){.wc-hero{animation:none}.wc-live .pulse,.wc-live-pill .pulse{animation:none}}

/* Rolling-window progress line + quiet "View full plan" link (live guiding). */
.wc-plan-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px 2px}
.wc-plan-prog{font-size:11.5px;font-weight:600;color:var(--text-dim);font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-plan-link{flex:0 0 auto;background:transparent;border:none;padding:2px 0;font:inherit;font-size:12px;font-weight:600;color:var(--wc-link);cursor:pointer;text-underline-offset:3px}
.wc-plan-link:hover{text-decoration:underline}
/* Read-only full-plan overlay: every step with a done/current/upcoming marker. */
.wc-plan-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,7,14,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.wc-plan-card{width:min(600px,100%);max-height:86vh;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:0 24px 60px -24px rgba(0,0,0,.7);overflow:hidden}
.wc-plan-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
.wc-plan-title{font-size:15px;font-weight:700;font-family:var(--wc-display);color:var(--text)}
.wc-plan-goal{padding:12px 16px 0}
.wc-plan-goal-k{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--obs)}
.wc-plan-goal-t{margin-top:3px;font-size:13.5px;line-height:1.5;color:var(--text)}
.wc-plan-count{padding:8px 16px 4px;font-size:12px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums}
.wc-plan-list{padding:4px 12px 14px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
.wc-plan-row{display:flex;gap:11px;align-items:flex-start;padding:8px 10px;border-radius:10px}
.wc-plan-row.now{background:var(--em-soft)}
.wc-plan-row.done{opacity:.6}
.wc-plan-badge{flex:0 0 auto;width:23px;height:23px;border-radius:7px;display:grid;place-items:center;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-muted);border:1.5px solid var(--border)}
.wc-plan-row.now .wc-plan-badge{color:var(--on-em);background:var(--em);border-color:var(--em)}
.wc-plan-row.done .wc-plan-badge{color:var(--success);border-color:transparent;background:var(--success-soft)}
.wc-plan-txt{flex:1;min-width:0;font-size:13px;line-height:1.45;color:var(--text-muted);overflow-wrap:anywhere}
.wc-plan-row.now .wc-plan-txt{color:var(--text);font-weight:600}
.wc-plan-row.done .wc-plan-txt{text-decoration:line-through;color:var(--text-faint)}
.wc-plan-tag{flex:0 0 auto;align-self:center;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--em)}
`

// Copy text reliably across the main page AND the floating PiP / pop-out window.
// The async clipboard API needs its OWN window focused, so use the clipboard of
// the window that owns the clicked button (that one is focused), and fall back
// to a hidden textarea + execCommand in that same document.
function fallbackCopy(text, doc) {
  try {
    const ta = doc.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    doc.body.appendChild(ta); ta.focus(); ta.select()
    const ok = doc.execCommand && doc.execCommand('copy')
    doc.body.removeChild(ta)
    return !!ok
  } catch { return false }
}
function copyFromEvent(text, e) {
  const node = e && e.currentTarget
  const doc = (node && node.ownerDocument) || document
  const win = doc.defaultView || window
  try {
    if (win.navigator && win.navigator.clipboard && win.isSecureContext !== false) {
      const p = win.navigator.clipboard.writeText(text)
      if (p && p.catch) p.catch(() => fallbackCopy(text, doc))
      return true
    }
  } catch { /* fall through to execCommand */ }
  return fallbackCopy(text, doc)
}
// Copy-to-clipboard pill used by the command/code blocks. A real tap target
// (good on mobile) that confirms with a Copied state.
function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button title="Copy to clipboard" onClick={(e) => { if (copyFromEvent(text, e)) { setDone(true); setTimeout(() => setDone(false), 1400) } }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: done ? 'rgba(74,208,122,0.16)' : 'rgba(255,255,255,0.08)', color: done ? '#7ee7a6' : '#cdd6e5', border: `1px solid ${done ? '#3a7a55' : 'rgba(255,255,255,0.14)'}`, borderRadius: 7, padding: '4px 9px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
      {done ? <Check size={13} /> : <ClipboardCopy size={13} />} {done ? 'Copied' : 'Copy'}
    </button>
  )
}
const dot = (bg) => ({ width: 9, height: 9, borderRadius: '50%', background: bg, display: 'inline-block' })
// The EXACT terminal commands for a step, copy-paste ready - styled as a terminal.
function CmdBlock({ lines }) {
  const text = (lines || []).join('\n')
  return (
    <div style={{ marginTop: 9, borderRadius: 10, overflow: 'hidden', border: '1px solid #27324a', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0c1222', padding: '6px 9px' }}>
        <span style={{ display: 'inline-flex', gap: 5 }}><span style={dot('#ff5f57')} /><span style={dot('#febc2e')} /><span style={dot('#28c840')} /></span>
        <span style={{ fontSize: 10.5, color: '#8ea3c0', flex: 1, letterSpacing: 0.6, fontWeight: 600 }}>TERMINAL</span>
        <CopyButton text={text} />
      </div>
      <pre style={{ margin: 0, padding: '10px 11px', background: '#0c1222', color: '#d6e9d6', fontSize: 'calc(12.5px * var(--wc-fs, 1))', lineHeight: 1.6, fontFamily: MONO, overflowX: 'auto', whiteSpace: 'pre' }}>
        {(lines || []).map((l, i) => <div key={i}><span style={{ color: '#58c974' }}>$ </span>{l}</div>)}
      </pre>
    </div>
  )
}
// The EXACT file content for a step, copy-paste ready, labelled with its path.
function CodeBlock({ file, content }) {
  const ext = (file && file.includes('.')) ? file.split('.').pop() : ''
  return (
    <div style={{ marginTop: 9, borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a3c', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#15151f', padding: '6px 9px' }}>
        <span style={dot('#8b7cff')} />
        <span style={{ fontSize: 11.5, color: '#c7cbd8', flex: 1, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file || 'code'}</span>
        {ext && <span style={{ fontSize: 9.5, color: '#9a9ab0', background: 'rgba(255,255,255,0.09)', borderRadius: 5, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{ext}</span>}
        <CopyButton text={content} />
      </div>
      <pre style={{ margin: 0, padding: '10px 11px', background: '#15151f', color: '#e6e6f2', fontSize: 'calc(12.5px * var(--wc-fs, 1))', lineHeight: 1.55, fontFamily: MONO, overflowX: 'auto', whiteSpace: 'pre' }}>{content}</pre>
    </div>
  )
}
// Gate a destructive step's command/code behind a deliberate acknowledge, so the
// person reads the impact before they can copy or run it (risk: acting without
// understanding impact). A no-op wrapper when `why` is falsy.
function DestructiveGate({ why, children }) {
  const [shown, setShown] = useState(false)
  if (!why) return <>{children}</>
  return (
    <div style={{ marginTop: 9, border: '1px solid rgba(255,159,67,0.5)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,159,67,0.12)', padding: '9px 11px', fontSize: 12.5, color: '#ffb35c', lineHeight: 1.5 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span><b>Destructive step.</b> This {why}. Read it carefully before you run it.</span>
      </div>
      {shown
        ? <div style={{ padding: '0 9px 9px' }}>{children}</div>
        : <div style={{ padding: '10px 11px' }}>
            <button className="btn btn-sm" onClick={() => setShown(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#ffb35c', background: 'rgba(255,159,67,0.14)', border: '1px solid rgba(255,159,67,0.5)' }}>
              <AlertTriangle size={13} /> I understand, show the command
            </button>
          </div>}
    </div>
  )
}

// A small "How?" control shown next to a step or the live guidance. Tapping it
// asks the server to break that one action into detailed sub-steps. It shows a
// spinner while it loads and flips to "Hide how" once the detail is open.
function HowButton({ open, loading, onClick }) {
  return (
    <button className="btn btn-ghost btn-sm" onClick={onClick} disabled={loading}
      title="Break this one action into detailed, copy-ready steps"
      style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
      {loading ? <Loader2 size={13} className="spin" /> : <HelpCircle size={13} />}
      {open ? 'Hide how' : 'How?'}
      {!loading && <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
    </button>
  )
}
// The expanded drill-down for one action: the detailed sub-steps rendered the
// same way the plan steps are (commands via CmdBlock, code via CodeBlock, link),
// visually nested under the parent with an indent and a left accent border so it
// reads as the detail of that one step. Also carries the loading, declined and
// could-not-load states so a How? expansion never silently fails or crashes.
function HowDetail({ entry, onRetry }) {
  if (!entry || !entry.open) return null
  const wrap = { marginTop: 10, marginLeft: 2, paddingLeft: 12, borderLeft: '2px solid var(--brand-500)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'calc(13.5px * var(--wc-fs, 1))', lineHeight: 1.5 }
  if (entry.loading) {
    return <div style={{ ...wrap, flexDirection: 'row', alignItems: 'center', gap: 7, color: 'var(--text-dim)', fontSize: 13 }}><Loader2 size={14} className="spin" /> Working out the detailed steps...</div>
  }
  if (entry.error) {
    return <div style={{ ...wrap, flexDirection: 'row', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-dim)' }}><span>Could not load the detailed steps, try again.</span><button className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button></div>
  }
  if (entry.refusal) {
    return <div style={{ ...wrap, color: 'var(--text-dim)', fontSize: 13 }}>{entry.refusal}</div>
  }
  const sub = entry.steps || []
  if (!sub.length) return <div style={{ ...wrap, color: 'var(--text-dim)', fontSize: 13 }}>No extra detail was needed for this one.</div>
  return (
    <div style={wrap}>
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', letterSpacing: 0.3, fontWeight: 600 }}>HOW TO DO THIS</div>
      {sub.map((ss, j) => (
        <div key={j} style={{ ...card, padding: '9px 11px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-50, var(--surface))', border: '1px solid var(--brand-500)', color: 'var(--brand-600)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{j + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{ss.text}</div>
              {ss.url && <div><a className="wc-open" href={ss.url} target="_blank" rel="noopener noreferrer">Open {linkHost(ss.url)}<ExternalLink size={13} /></a></div>}
              {((ss.commands && ss.commands.length > 0) || (ss.code && ss.code.content)) && (
                <DestructiveGate why={ss.destructive ? ss.destructiveWhy : null}>
                  {ss.commands && ss.commands.length > 0 && <CmdBlock lines={ss.commands} />}
                  {ss.code && ss.code.content && <CodeBlock file={ss.code.file} content={ss.code.content} />}
                </DestructiveGate>
              )}
              {ss.validate && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}><Eye size={11} style={{ verticalAlign: -1 }} /> done when: {ss.validate}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Deliverables: capture page(s) -> review + two generation prompts + doc --
// Self-contained: it only uses the passed grabFrame and the sessionId, so it
// cannot destabilize the Console. For review/design tasks (architecture,
// diagrams, configs) the person snaps each page, then Finish builds the review
// and the prompts they take to their own LLM / diagram tool.
function DeliverablesPanel({ sessionId, grabFrame, videoRef, onClose }) {
  const [frames, setFrames] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')
  const [autoOn, setAutoOn] = useState(false)
  const autoRef = useRef({ prev: null, stable: 0, captured: null })
  // Auto-capture on settle: watch the shared screen and, when it stops changing
  // for ~1.2s on a NEW page, snap it. No click interception - pure change
  // detection (reuses signatureFromVideo/changed). Manual Snap still works.
  useEffect(() => {
    if (!autoOn || result) return
    autoRef.current.prev = null; autoRef.current.stable = 0
    const SETTLE = 3
    const h = setInterval(() => {
      const v = videoRef && videoRef.current
      const sig = v ? signatureFromVideo(v) : null
      if (!sig) return
      const st = autoRef.current
      if (st.prev && changed(st.prev, sig, 6)) { st.stable = 0; st.prev = sig; return }
      st.prev = sig; st.stable++
      if (st.stable === SETTLE && (!st.captured || changed(st.captured, sig, 10))) {
        const f = frameFromVideo(v)
        if (f) { setFrames((xs) => (xs.length >= 8 ? xs : [...xs, f])); st.captured = sig }
      }
    }, 400)
    return () => clearInterval(h)
  }, [autoOn, result])   // eslint-disable-line
  const snap = () => {
    setErr('')
    try { const f = grabFrame && grabFrame(); if (f) setFrames((xs) => [...xs, f].slice(0, 8)); else setErr('Put the page on screen first, and start sharing your screen.') }
    catch { setErr('Could not capture the screen.') }
  }
  const build = async () => {
    setBusy(true); setErr('')
    try { const r = await api.workDeliverables(sessionId, frames); if (r && r.deliverables) setResult(r); else setErr('No result came back. Try again.') }
    catch (e) { setErr((e && e.message) || 'Could not build this. Try again.') }
    finally { setBusy(false) }
  }
  const copy = async (which, text) => { try { await navigator.clipboard.writeText(text || ''); setCopied(which); setTimeout(() => setCopied(''), 1500) } catch { /* clipboard blocked */ } }
  const download = () => {
    try {
      const blob = new Blob([(result && result.documentMd) || ''], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'workcopilot-review.md'
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch { /* ignore */ }
  }
  const d = result && result.deliverables
  const Issue = ({ a }) => (
    <div className="wc-dl-issue"><span className={'sev ' + String(a.severity || '').toLowerCase()}>{a.severity}</span>
      <div><b>{a.issue}</b>{a.control ? <span className="ctrl">{a.control}</span> : null}<div className="fix">{a.fix}</div></div></div>
  )
  return (
    <div className="wc-dl" onClick={onClose}>
      <div className="wc-dl-card" onClick={(e) => e.stopPropagation()}>
        <div className="wc-dl-head"><b><Sparkles size={15} /> Review &amp; generation prompts</b><button className="wc-dl-x" onClick={onClose} aria-label="Close">&times;</button></div>
        {!d ? (
          <div className="wc-dl-body">
            <p className="wc-dl-lead">Put each page you want reviewed on screen and tap <b>Snap</b>. Add as many as you need, then <b>Finish</b>. I will find the issues and build you two prompts to generate the corrected design in your own tools.</p>
            <label className="wc-dl-auto"><input type="checkbox" checked={autoOn} onChange={(e) => setAutoOn(e.target.checked)} /> Auto-capture: snap each page as I settle on it</label>
            {autoOn && <div className="wc-dl-watch"><span className="dot" /> Watching the shared screen. Open each page and hold still a moment; I capture it, then you move to the next.</div>}
            <div className="wc-dl-thumbs">
              {frames.map((f, i) => <div key={i} className="wc-dl-thumb"><img src={f} alt={'page ' + (i + 1)} /><span>{i + 1}</span><button onClick={() => setFrames(frames.filter((_, j) => j !== i))} aria-label="Remove">&times;</button></div>)}
              {!frames.length && <div className="wc-dl-empty">No pages captured yet</div>}
            </div>
            {err && <div className="wc-dl-err">{err}</div>}
            <div className="wc-dl-actions">
              <button className="btn btn-outline" onClick={snap} disabled={busy}><Camera size={15} /> Snap{frames.length ? ' (' + frames.length + ')' : ''}</button>
              <button className="btn btn-primary" onClick={build} disabled={busy || !frames.length}>{busy ? <Loader2 size={15} className="spin" /> : null} Finish &amp; build</button>
            </div>
          </div>
        ) : (
          <div className="wc-dl-body">
            {d.needMore && <div className="wc-dl-note">{d.needMore}</div>}
            {d.summary && <p className="wc-dl-summary">{d.summary}</p>}
            {d.architecture && d.architecture.length > 0 && <div className="wc-dl-sec"><h4>Architecture issues</h4>{d.architecture.map((a, i) => <Issue key={i} a={a} />)}</div>}
            {d.security && d.security.length > 0 && <div className="wc-dl-sec"><h4>Security issues</h4>{d.security.map((a, i) => <Issue key={i} a={a} />)}</div>}
            <div className="wc-dl-prompt"><div className="ph"><b>Prompt 1: current design, problems marked</b><button className="btn btn-ghost btn-sm" onClick={() => copy('p1', d.promptIssues)}>{copied === 'p1' ? 'Copied' : 'Copy'}</button></div><pre>{d.promptIssues}</pre></div>
            <div className="wc-dl-prompt"><div className="ph"><b>Prompt 2: recommended corrected design</b><button className="btn btn-ghost btn-sm" onClick={() => copy('p2', d.promptTarget)}>{copied === 'p2' ? 'Copied' : 'Copy'}</button></div><pre>{d.promptTarget}</pre></div>
            <div className="wc-dl-actions">
              <button className="btn btn-outline" onClick={() => setResult(null)}>Capture more</button>
              <button className="btn btn-primary" onClick={() => window.open(api.workDeliverablesPdfUrl(sessionId, true), '_blank')}><Download size={15} /> Download review PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// The planning animation: phases reveal one by one while the plan is being
// built, then the Console swaps to the step view the moment steps arrive.
function PlanningLoader() {
  const PHASES = ['Understanding your goal', 'Thinking', 'Preparing the plan', 'Thinking deep', 'Working with multimodal vision', 'Writing your steps']
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n < PHASES.length - 1 ? n + 1 : n)), 1600)
    return () => clearInterval(id)
  }, [])   // eslint-disable-line
  return (
    <div className="wc-loading">
      <div className="wc-loading-orb"><span /><span /><span /></div>
      <div className="wc-loading-phases">
        {PHASES.slice(0, i + 1).map((p, k) => (
          <div key={k} className={`wc-loading-line${k === i ? ' on' : ' past'}`}>
            {k < i ? <Check size={14} /> : <Loader2 size={14} className="spin" />}<span>{p}…</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Console({ sessionId, watchLight = false, onBack, onGuard }) {
  const [sess, setSess] = useState(null)
  const [goal, setGoal] = useState('')
  const [source, setSource] = useState(() => isMobileUA() ? 'camera' : 'screen')     // 'screen' | 'camera' (phones default to camera: no screen share on mobile)
  const [capturing, setCapturing] = useState(false)
  const [watching, setWatching] = useState(false)
  const [status, setStatus] = useState('')
  const [observation, setObservation] = useState('')
  const [guidance, setGuidance] = useState('')      // live, screen-specific instruction for the current step
  const [flags, setFlags] = useState([])
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [err, setErr] = useState('')
  const [frames, setFrames] = useState(0)            // how many frames actually sent (cost visibility)
  const [photoFrame, setPhotoFrame] = useState(null) // last one-shot camera Photo (mobile capture), a downscaled dataURL

  // "Deep pass" is a ONE-SHOT: run the current screenshot on the stronger model
  // once, weave the result back into the steps/guidance, then continue on the
  // fast model. It is never a persistent mode. The server also auto-escalates on
  // its own when the fast model fails or returns a weak result.
  const [strongUsed, setStrongUsed] = useState(false)   // a recent call used the stronger model (auto or a Deep pass)
  const [deliverOpen, setDeliverOpen] = useState(false) // the review -> prompts panel
  // "Result" feature: WorkCoPilot can RETURN the actual answer (a number, table,
  // draft, query or analysis), not only guide the next step. Scope only changes
  // whether the Result affordance is emphasized - the guiding flow always stays.
  const [scope, setScope] = useState('both')            // 'steps' | 'result' | 'both'
  const [pasteOpen, setPasteOpen] = useState(false)     // the small "paste data" field
  const [pasteData, setPasteData] = useState('')        // wired to docsText
  const [resultOut, setResultOut] = useState(null)      // the returned result object
  const [resultSec, setResultSec] = useState(null)      // security check (code results only)
  const [resultBusy, setResultBusy] = useState(false)
  const [resultErr, setResultErr] = useState('')
  // "Compose" feature: WorkCoPilot can WRITE a full document (a letter, report,
  // resume section, clause, red-line notes, outline, table or code) ready to copy
  // or download. It sits beside the Result control and never acts for the user.
  const [composeOpen, setComposeOpen] = useState(false) // the small "write it for me" panel
  const [composeWant, setComposeWant] = useState('')    // what to write -> want
  const [composeFormat, setComposeFormat] = useState('') // '' = Auto (let it choose) | email|document|outline|bullets|table|code|notes
  const [composeSrcOpen, setComposeSrcOpen] = useState(false) // the optional "paste source" field
  const [composeSrc, setComposeSrc] = useState('')      // wired to docsText
  const [composeOut, setComposeOut] = useState(null)    // the returned compose object
  const [composeSec, setComposeSec] = useState(null)    // security check (code compositions only)
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeErr, setComposeErr] = useState('')
  // "Compute from a file" feature: privacy-first, on-device data compute. The
  // attached CSV / Excel file is parsed ENTIRELY in the browser; only a schema
  // (column names + types) + the row count are sent to plan a safe computation,
  // which is re-validated and then run LOCALLY on the full rows. The raw rows
  // live only in computeRowsRef and NEVER enter any network call.
  const [computeOpen, setComputeOpen] = useState(false)   // the "compute from a file" panel
  const [computeFile, setComputeFile] = useState(null)    // parsed preview: { name, rowCount, schema }
  const [computeWant, setComputeWant] = useState('')      // what to compute -> want
  const [computeParsing, setComputeParsing] = useState(false) // reading the file on device
  const [computeBusy, setComputeBusy] = useState(false)   // planning call in flight
  const [computeErr, setComputeErr] = useState('')
  const [computeNeed, setComputeNeed] = useState('')      // engine said what is missing
  const [computeOut, setComputeOut] = useState(null)      // { result, explanation, caveat, spec }
  const computeRowsRef = useRef(null)                     // the FULL parsed rows, on device only
  const computeFileRef = useRef(null)                     // hidden file input
  const [endState, setEndState] = useState(null)        // null | 'finishing' | 'done' (End flow)
  const [replanOpen, setReplanOpen] = useState(false)   // Re-plan modal
  const [replanReason, setReplanReason] = useState('')
  const [replanScope, setReplanScope] = useState('here')  // 'here' (keep progress) | 'start'
  const [replanInfo, setReplanInfo] = useState(null)      // { unlimited, cap, used, remaining } per-task re-plan budget
  const [planOpen, setPlanOpen] = useState(false)       // read-only "full plan" overlay (all steps)
  // "Make" is the single consolidated surface for the three produce actions. One
  // of 'answer' | 'write' | 'compute' is open at a time (null = nothing open), so
  // only one primary action ever shows. Choosing a tab opens its panel and keeps
  // the older per-panel disclosure booleans (composeOpen / computeOpen) truthful.
  const [maker, setMaker] = useState(null)
  const pickMaker = (m) => {
    setMaker((cur) => {
      const next = cur === m ? null : m
      setComposeOpen(next === 'write'); setComputeOpen(next === 'compute')
      return next
    })
  }
  const noteStrong = (r) => { if (r && r.escalated) { setStrongUsed(true); setTimeout(() => setStrongUsed(false), 5000) } }

  // Usage metering (Phase 1): remaining minutes, daily cap, pause.
  const [usage, setUsage] = useState(null)
  const [paused, setPaused] = useState(false)
  const [dismissedLow, setDismissedLow] = useState(false)
  const applyUsage = (u) => { setUsage(u); if (u && u.remainingSeconds > 900) setDismissedLow(false) }   // re-arm the warning after buying more
  const refreshUsage = useCallback(async () => { try { applyUsage(await api.workUsage()) } catch {} }, [])
  useEffect(() => { refreshUsage() }, [refreshUsage])
  const outOfMinutes = () => { if (usage && usage.exhausted) { setErr('Out of minutes for today. Buy more time, or it resets at 11:59 PM ET.'); return true } return false }

  // Plan-heavy, watch-light: FORCED by us for Premium users (both company and
  // regular), never chosen here. The flag rides on the user profile loaded from
  // /api/work/me and arrives as the `watchLight` prop. When true, the session
  // does NOT run the continuous watch loop - the user follows a richer,
  // self-contained plan (made plan-heavy server-side) and taps Check my progress
  // for an on-demand read. There is no toggle and no upsell.

  // Guide style (mode): stepwise | beginner | architect | debug. The list comes
  // from the server so there is one source of truth.
  const [mode, setMode] = useState('stepwise')
  const [modes, setModes] = useState([])
  useEffect(() => { api.workModes().then((r) => setModes(r.modes || [])).catch(() => {}) }, [])
  // Bring the console into the site's type system even when it is opened directly
  // (no dashboard mount first): Bricolage Grotesque display, Figtree body,
  // JetBrains Mono code, matching the marketing + float surfaces.
  useEffect(() => {
    const id = 'wc-fonts'
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
      document.head.appendChild(l)
    }
  }, [])
  const changeMode = async (m) => { setMode(m); try { await api.workSetMode(sessionId, m) } catch {} }

  // Light/dark for the guiding panel (same global theme as the dashboard).
  const { theme: appTheme, toggle: toggleAppTheme } = useTheme()

  // Launch straight into guidance: once the session + goal are loaded and there
  // is no plan yet, plan automatically so the user lands on the step card, not a
  // second setup form. A resumed session already has steps, so we skip it.
  const autoPlannedRef = useRef(false)
  useEffect(() => {
    if (autoPlannedRef.current || !sess) return
    if (((sess.steps || []).length) > 0) { autoPlannedRef.current = true; return }
    if (!(goal && goal.trim())) return
    autoPlannedRef.current = true
    plan()   // defined below; the effect body runs after render
  }, [sess, goal])   // eslint-disable-line

  const [clickThrough, setClickThrough] = useState(false)
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  const contextFileRef = useRef(null)   // hidden file input for mid-task attachments

  // Float overlay for WEB users (no install): the browser-native Document
  // Picture-in-Picture window floats the steps on top of whatever app the
  // user is working in, so they never tab back and forth to this console.
  const [pipWin, setPipWin] = useState(null)
  const [pipKind, setPipKind] = useState('pip')   // 'pip' (always-on-top Document PiP) | 'popout' (separate window) for the open float
  const [floatQ, setFloatQ] = useState('')
  const prefersDark = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  const [floatTheme, setFloatTheme] = useState(prefersDark ? 'dark' : 'light')
  // Chromium (Chrome/Edge/Brave/Opera) has Document Picture-in-Picture -> a true
  // always-on-top overlay. Firefox/Safari do not, so fall back to a pop-out
  // window (a separate, movable window, just not always-on-top). Hidden on
  // mobile (the app is full screen; a pop-up there makes no sense).
  const isMobile = isMobileUA()
  const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window
  const floatCapable = !desktop && !isMobile && typeof window !== 'undefined' && typeof window.open === 'function'
  // Microsoft-Learn / Docs reading treatment, same as the console + full guide:
  // a compact 13.5px base that scales off --fp-fs (the reader's A- / A / A+
  // choice, shared via the wc-guide-fontscale key). --wc-fs mirrors it so the
  // shared CmdBlock / CodeBlock dark code boxes scale inside the float too.
  // .fp-link is the blue inline "Open ..." hyperlink (not a button).
  const FLOAT_CSS = ':root{--fp-fs:1;--wc-fs:1}body{margin:0;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI","Inter",system-ui,Roboto,sans-serif;font-size:calc(13.5px*var(--fp-fs,1));line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}*{box-sizing:border-box}button{font:inherit;cursor:pointer}.fp-link{text-decoration:none;text-decoration-color:transparent;text-underline-offset:3px;border-radius:4px;transition:text-decoration-color .15s}.fp-link:hover,.fp-link:focus-visible{text-decoration:underline;text-decoration-color:currentColor}.fp-clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}button:disabled{opacity:.5;cursor:default}input{font:inherit}input::placeholder{opacity:.6}input:focus{outline:none}button:not(:disabled):hover{filter:brightness(1.06)}button:not(:disabled):active{transform:translateY(.5px)}.fp-btn{transition:filter .15s,background .15s,border-color .15s,color .15s,box-shadow .15s,transform .08s}@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}@keyframes fp-pulse{0%{box-shadow:0 0 0 0 rgba(140,245,196,.5)}70%{box-shadow:0 0 0 6px rgba(140,245,196,0)}100%{box-shadow:0 0 0 0 rgba(140,245,196,0)}}.fp-pulse{animation:fp-pulse 1.6s infinite}@keyframes fp-rise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}.fp-rise{animation:fp-rise .22s cubic-bezier(.4,0,.2,1)}@keyframes fp-now{0%,100%{box-shadow:0 0 0 1px var(--gr) inset,0 10px 30px -16px var(--gg)}50%{box-shadow:0 0 0 1px var(--gr) inset,0 12px 44px -10px var(--gg)}}.fp-now{animation:fp-now 2.8s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.fp-now{animation:none}.fp-pulse{animation:none}.spin{animation:none}}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#8883;border-radius:8px;border:2px solid transparent;background-clip:padding-box}::-webkit-scrollbar-thumb:hover{background:#8886;background-clip:padding-box}'
  // Open the float with a graceful fallback chain, so the core web experience
  // never silently dies on one API:
  //   1. Document Picture-in-Picture (true always-on-top) when the browser has it;
  //   2. if that is refused (permissions policy, enterprise setting, no user
  //      activation, an older Chromium build that exposes the API but rejects),
  //      a separate pop-out window, which still keeps the steps out of the tab;
  //   3. if the pop-up itself is blocked, an actionable message. The steps are
  //      still fully usable in this tab in every case.
  const openFloat = async () => {
    setErr('')
    let w = null
    let kind = 'pip'
    // Open as a tall, narrow side strip: ~18% of the screen width (clamped to a
    // readable 320-460px) and nearly full height, so it guides alongside the
    // real work instead of covering it. The user can resize it afterward.
    const scr = (typeof window !== 'undefined' && window.screen) || {}
    const availW = scr.availWidth || window.innerWidth || 1280
    const availH = scr.availHeight || window.innerHeight || 800
    const floatW = Math.min(460, Math.max(320, Math.round(availW * 0.18)))
    const floatH = Math.round(availH * 0.92)
    if (pipSupported) {
      try { w = await window.documentPictureInPicture.requestWindow({ width: floatW, height: floatH }) }
      catch { w = null }
    }
    if (!w) {
      kind = 'popout'
      try { w = window.open('', 'workcopilot_float', `width=${floatW},height=${floatH},left=${Math.max(0, availW - floatW - 24)},top=8,menubar=no,toolbar=no,location=no,status=no,resizable=yes`) } catch { w = null }
      if (!w) {
        setErr(pipSupported
          ? 'The floating window was refused by your browser settings, and the pop-out was blocked too. Allow pop-ups for this site, or keep following the steps right here.'
          : 'Your browser blocked the floating window. Allow pop-ups for this site, or use Chrome, Edge, Brave or Opera for a true always-on-top overlay. The steps keep working right here.')
        return
      }
      try { w.document.title = 'WorkCoPilot' } catch {}
      // Ensure the Picture-in-Picture window has a <body> without document.write
      // (no injection sink; the title is set above). Build it with the DOM API.
      try { if (!w.document.body && w.document.documentElement) w.document.documentElement.appendChild(w.document.createElement('body')) } catch {}
    }
    try {
      // The PiP window is a separate document and inherits none of the app's
      // web fonts, so pull Figtree (body) + Bricolage Grotesque (display) into
      // its head. If the network blocks it, the inline stack falls back to a
      // clean system font, so text is always legible.
      const head = w.document.head || w.document.documentElement
      const pc1 = w.document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com'
      const pc2 = w.document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = 'anonymous'
      const fl = w.document.createElement('link'); fl.rel = 'stylesheet'
      fl.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap'
      head.appendChild(pc1); head.appendChild(pc2); head.appendChild(fl)
    } catch { /* fonts are optional; the inline stack still reads well */ }
    try {
      const st = w.document.createElement('style')
      st.textContent = FLOAT_CSS
      ;(w.document.head || w.document.documentElement).appendChild(st)
    } catch { /* the panel is inline-styled; only the keyframes are lost */ }
    // Only the window that is still current may clear the state, so a late
    // 'pagehide' from an older float can never orphan a newer one.
    const drop = () => setPipWin((cur) => (cur === w ? null : cur))
    try { w.addEventListener('pagehide', drop); w.addEventListener('beforeunload', drop) } catch {}
    setPipKind(kind)
    setPipWin(w)
  }
  const closeFloat = () => { try { pipWin && pipWin.close() } catch {} ; setPipWin(null) }

  // Full-screen guidance on a SECOND monitor: a clean, detailed, read-only view at
  // /work/guide. On the desktop app the shell opens it full-screen on the monitor
  // you are NOT working on. On the web it opens a large window - placed on another
  // screen automatically when the browser's Window Management API allows, otherwise
  // a big window you drag over and set full screen from inside it.
  const [guideWin, setGuideWin] = useState(null)
  const openFullGuide = async () => {
    setErr('')
    if (desktop && typeof desktop.openFullGuide === 'function') { try { await desktop.openFullGuide(); return } catch { /* fall back to a web window */ } }
    // Focus an already-open guide window instead of stacking another.
    if (guideWin && !guideWin.closed) { try { guideWin.focus(); return } catch { /* reopen */ } }
    let target = null
    try {
      if (window.getScreenDetails) { const sd = await window.getScreenDetails(); const screens = sd.screens || []; target = screens.find((s) => !s.isPrimary) || null }
    } catch { /* permission denied or unsupported - fall back to a draggable window */ }
    const sc = (typeof window !== 'undefined' && window.screen) || {}
    const feats = target
      ? `left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      : `width=${Math.round(sc.availWidth || 1280)},height=${Math.round(sc.availHeight || 800)},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    let w = null
    try { w = window.open('/work/guide', 'workcopilot_fullguide', feats) } catch { w = null }
    if (!w) { setErr('Your browser blocked the guidance window. Allow pop-ups for this site, then open it again.'); return }
    try { w.focus() } catch {}
    if (target) { try { w.addEventListener('load', () => { try { w.document.documentElement.requestFullscreen({ screen: target }) } catch { /* the page has its own Full screen button */ } }) } catch {} }
    setGuideWin(w)
  }
  useEffect(() => () => { try { guideWin && !guideWin.closed && guideWin.close() } catch {} }, [guideWin])   // close the guide if the console unmounts
  const floatIsPip = pipKind === 'pip'
  useEffect(() => () => { try { pipWin && pipWin.close() } catch {} }, [pipWin])   // close the float if the console unmounts
  // Paint the PiP window body to match the chosen theme (the panel content is
  // inline-styled; the body behind it needs setting on the separate document).
  useEffect(() => {
    if (!pipWin) return
    try { pipWin.document.body.style.background = floatTheme === 'light' ? '#f4f6fb' : '#0b0b12'; pipWin.document.body.style.color = floatTheme === 'light' ? '#1a1a22' : '#e8e8f2' } catch {}
  }, [pipWin, floatTheme])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const sigRef = useRef(null)
  const timerRef = useRef(null)
  const lastSentRef = useRef(0)
  const busyTickRef = useRef(false)
  const pendingRef = useRef(false)     // a change is waiting for the screen to settle before we read it
  const lastChangeRef = useRef(0)      // when the screen last changed (for the settle delay)
  const photoInputRef = useRef(null)    // hidden camera file input for the mobile Photo path
  const photoFrameRef = useRef(null)    // mirror of photoFrame for synchronous reads in grabFrame

  // Session load state. Before this, a session that could not be loaded (deleted
  // on another device, server restarted with fresh data, a stale id remembered in
  // sessionStorage after a reload) left the Console with sess === null forever:
  // no Back button (it only shows when paused or ended), no Pause, and a goal
  // form whose Plan button could not work. The only exit was closing the app.
  // Now: a loading state while we fetch, and on failure a clear message with
  // Try again and Back to plans.
  const [loadErr, setLoadErr] = useState('')
  const refresh = useCallback(async () => {
    try {
      const r = await api.workGet(sessionId)
      setSess(r.session); setLoadErr('')
      if (r.replan) setReplanInfo(r.replan)   // per-task re-plan budget left
      if (r.session && r.session.goal != null) setGoal(r.session.goal || '')
      if (r.session && r.session.guidance) setGuidance(r.session.guidance)
      if (r.session && r.session.mode) setMode(r.session.mode)
      if (r.session) setPaused(!!r.session.paused)
    } catch (e) {
      setLoadErr(e && e.status === 404
        ? 'This session no longer exists. It may have been deleted, or finished on another device.'
        : ((e && e.message) || 'Could not load this session. Check your connection and try again.'))
    }
  }, [sessionId])
  useEffect(() => { refresh() }, [refresh])
  // A UI-side guard for the two calls that drive a full-screen "working" state
  // (planning, finishing). The server keeps working if it is slow; the UI just
  // stops waiting after a generous bound, says so, and re-reads the session so
  // whatever did land is picked up. Without this a dropped connection could
  // leave the planning animation or the "Wrapping up" dialog spinning forever.
  const WAIT_MS = 240000
  const waitFor = (p, message) => {
    let t
    const timer = new Promise((_, reject) => { t = setTimeout(() => { const e = new Error(message); e.timedOut = true; reject(e) }, WAIT_MS) })
    return Promise.race([p, timer]).finally(() => clearTimeout(t))
  }

  const stopCapture = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (streamRef.current) { try { streamRef.current.getTracks().forEach((t) => t.stop()) } catch {} ; streamRef.current = null }
    setWatching(false); setCapturing(false)
  }, [])
  useEffect(() => () => stopCapture(), [stopCapture])   // cleanup on unmount

  const startCapture = async () => {
    setErr('')
    // When data protection is on, warm the on-device OCR engine now so the first
    // frame can be redacted without a cold-load delay.
    if (isDlpActive()) warmFrameScrub()
    try {
      const stream = source === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 }, audio: false })
        : await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      // The user stopping the share from the browser chrome ends capture cleanly.
      stream.getVideoTracks().forEach((t) => { t.onended = () => stopCapture() })
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}) }
      photoFrameRef.current = null; setPhotoFrame(null)   // a live stream supersedes a one-shot photo
      setCapturing(true)
      return true
    } catch (e) { setErr(e.message || 'Could not start capture. Allow screen or camera access.'); return false }
  }

  // Desktop multi-monitor: when the watched monitor is switched (the picker or
  // Ctrl+Shift+Alt+M in the shell), restart screen capture so the new monitor is read
  // right away instead of only on the next capture. The ref always holds the
  // current closure, so the one-time subscription sees the latest state.
  const restartScreenRef = useRef(() => {})
  restartScreenRef.current = () => {
    if (capturing && source === 'screen') { stopCapture(); setTimeout(() => { startCapture() }, 150) }
  }
  useEffect(() => {
    if (!desktop || typeof desktop.onMonitorChanged !== 'function') return
    try { desktop.onMonitorChanged(() => { try { restartScreenRef.current() } catch {} }) } catch {}
  }, [desktop])

  // Prefer a one-shot Photo (mobile) when one is loaded and no live stream is
  // running; otherwise read the live video (screen or camera). Desktop never
  // loads a photo frame, so its behavior is unchanged.
  const grabFrame = () => (photoFrameRef.current && !capturing) ? photoFrameRef.current : frameFromVideo(videoRef.current)
  // Smaller frame for the high-frequency watch loop (cost lever); photo path keeps its own.
  const grabWatchFrame = () => (photoFrameRef.current && !capturing) ? photoFrameRef.current : frameFromVideo(videoRef.current, WATCH_MAX_W)
  // Redact the outbound screen frame ON-DEVICE when data protection is on, so the
  // image is scrubbed of sensitive text (via on-device OCR) BEFORE it is sent,
  // the same switch that governs text. A no-op when protection is off.
  const prepFrame = async (f) => (f && isDlpActive()) ? await redactFrame(f) : f

  // Mobile capture = "Photo": open the device camera through a file input (the
  // dependency-free path that works where getDisplayMedia does not), downscale
  // the chosen image to the same budget as a live frame, and feed it into the
  // same plan / ask / analyze flow through grabFrame.
  const takePhoto = () => { setErr(''); try { if (photoInputRef.current) { photoInputRef.current.value = ''; photoInputRef.current.click() } } catch {} }
  const onPhotoPicked = async (e) => {
    const file = e && e.target && e.target.files && e.target.files[0]
    if (!file) return
    stopCapture()   // a snapshot and a live stream are mutually exclusive; the photo wins
    try { const f = await frameFromImageFile(file); photoFrameRef.current = f; setPhotoFrame(f) }
    catch { setErr('Could not read that photo. Try again.') }
  }
  const clearPhoto = () => { photoFrameRef.current = null; setPhotoFrame(null) }

  const plan = async (opts) => {
    // opts: { reason, keepProgress } from the Re-plan modal. onClick passes an
    // event, so only read opts when it is a plain options object.
    const o = (opts && typeof opts === 'object' && !opts.nativeEvent && !opts.target) ? opts : {}
    if (outOfMinutes()) return
    setBusy(true); setErr('')
    try {
      let frame = null
      if (!capturing && !photoFrameRef.current) { const okCap = await startCapture(); if (!okCap) { setBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
      frame = await prepFrame(grabFrame())
      // Desktop on-device docs: governed text held client-side for this session,
      // injected into the plan for this call only (never stored on the server).
      let docsText = ''
      try { if (window.workDesktop) docsText = sessionStorage.getItem('wd_docs_' + sessionId) || '' } catch { /* ignore */ }
      const r = await waitFor(
        api.workPlan(sessionId, { goal: goal.trim(), frame, mode, ...(docsText ? { docsText } : {}), ...(o.reason ? { reason: o.reason } : {}), ...(o.keepProgress ? { keepProgress: true } : {}) }),
        'Planning is taking longer than expected. Press Plan the steps to try again.')
      noteStrong(r); setSess(r.session); setGuidance(''); setHowTo({})
      if (r.replan) setReplanInfo(r.replan)   // per-task re-plan budget left
      // Input guardrail: a MEDIUM attempt is allowed through with a warning. Inform, never block.
      if (r.guard && !r.guard.blocked && r.guard.warning && onGuard) onGuard(r.guard)
      if (r.refusal) { setErr(r.refusal); return }   // declined at goal entry (not supported)
      // Start the continuous guide right away - the user should never have to
      // find and press a button to make it watch and update the instructions.
      if (r.session && Array.isArray(r.session.steps) && r.session.steps.length && (!r.session.status || r.session.status !== 'ended')) {
        setTimeout(() => { startWatching() }, 150)
      }
    } catch (e) {
      setErr(e.message || 'Could not build the plan')
      if (e && e.timedOut) refresh()   // pick up a plan that landed after we stopped waiting
    } finally { setBusy(false) }
  }

  // The watch loop: SMART sending to keep cost (and quality) right. We do NOT read
  // the screen mid-action. A change ARMS a pending read; we send ONE frame only
  // once the screen has SETTLED (a tick with no further change), so a burst of
  // changes while someone is working collapses into a single read at the landed
  // state - fewer calls AND a cleaner read. A long run of continuous change
  // force-sends so we never go blind, and a slow heartbeat catches the rare subtle
  // change the coarse signature missed. An idle screen costs nothing.
  const tick = useCallback(async () => {
    if (busyTickRef.current || !videoRef.current) return
    const sig = signatureFromVideo(videoRef.current)
    const now = Date.now()
    const isChange = changed(sigRef.current, sig)
    sigRef.current = sig
    if (isChange) {
      pendingRef.current = true
      lastChangeRef.current = now
      // still moving and not overdue -> wait for it to settle before reading
      if (now - lastSentRef.current < 15000) return
      // overdue (>15s of continuous change) -> fall through and read now
    } else {
      const settled = pendingRef.current && (now - lastChangeRef.current >= 1500)
      const heartbeat = now - lastSentRef.current > 60000
      if (!settled && !heartbeat) return
    }
    pendingRef.current = false
    let frame = grabWatchFrame(); if (!frame) return
    frame = await prepFrame(frame)
    busyTickRef.current = true
    // Jitter: smear concurrent users' sends across a ~600ms window so many
    // sessions do not hit the AI provider at the same instant (throttle smoothing).
    try { await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 600))) } catch { /* ignore */ }
    try {
      const r = await api.workWatch(sessionId, { frame })
      noteStrong(r)
      lastSentRef.current = Date.now(); setFrames((n) => n + 1)
      setStatus(r.status); setObservation(r.observation || '')
      if (r.guidance != null) setGuidance(r.guidance || '')
      if (r.flag) setFlags((f) => [{ t: Date.now(), text: r.flag }, ...f].slice(0, 6))
      if (r.steps) setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s)
      if (r.done) { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    } catch (e) {
      // A vision/runtime error should stop the loop and say why, not spin silently.
      setErr(e.message || 'Watch failed'); setWatching(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    } finally { busyTickRef.current = false }
  }, [sessionId])

  const startWatching = async () => {
    if (outOfMinutes()) return
    // Plan-heavy, watch-light (forced for Premium): never run the continuous 4s
    // loop. Clear any loop that was running, leave watching off, and let the user
    // drive on-demand reads with Check my progress (refreshScreen). Screen capture
    // is started on demand by refreshScreen itself, so nothing is forced here.
    if (watchLight) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } setWatching(false); return }
    if (!capturing) { const ok = await startCapture(); if (!ok) return; await new Promise((r) => setTimeout(r, 400)) }
    setWatching(true); sigRef.current = null; lastSentRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(tick, 4000)
    tick()
  }
  const pauseWatching = () => { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  // Refresh screen: force an immediate re-read of the current screen (bypasses the
  // change-detector) and update the guidance, steps and flags now.
  const refreshScreen = async () => {
    if (outOfMinutes()) return
    if (!capturing) { const ok = await startCapture(); if (!ok) return; await new Promise((r) => setTimeout(r, 400)) }
    let frame = grabFrame(); if (!frame) return
    frame = await prepFrame(frame)
    setBusy(true); setErr('')
    try {
      const r = await api.workWatch(sessionId, { frame })
      if (r.guidance != null) setGuidance(r.guidance || '')
      if (r.steps) setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s)
      if (r.observation) setObservation(r.observation)
      setFlags(r.flag ? [{ t: Date.now(), text: r.flag }] : [])
    } catch (e) { setErr(e.message || 'Could not refresh the screen') } finally { setBusy(false) }
  }
  // Re-plan with a reason, keeping progress (continue from here) or from scratch.
  const confirmReplan = async () => {
    const keep = replanScope === 'here'
    const reason = replanReason.trim()
    setReplanOpen(false)
    await plan({ reason, keepProgress: keep })
    setReplanReason('')
  }

  // Heartbeat: while actively guiding (watching or a call in flight) and not
  // paused, accrue ~15s of real used time. Stops counting when idle or paused.
  const activeRef = useRef(false)
  useEffect(() => { activeRef.current = (watching || busy) && !paused && !(usage && usage.exhausted) }, [watching, busy, paused, usage])
  useEffect(() => {
    const hb = setInterval(async () => {
      if (!activeRef.current) return
      try {
        const r = await api.workHeartbeat(sessionId, 15)
        setUsage((u) => u ? { ...u, remainingSeconds: r.remainingSeconds, freeLeft: r.freeLeft, exhausted: r.exhausted } : u)
        if (r.remainingSeconds > 900) setDismissedLow(false)
        if (r.exhausted) { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
      } catch {}
    }, 15000)
    return () => clearInterval(hb)
  }, [sessionId])

  // Pause freezes the meter and the watch loop; it holds until the user resumes.
  // One control for the whole session: Pause stops watching AND freezes the
  // meter; Resume starts watching again and the meter counts. There is no
  // separate "Watch me" - guiding watches by default.
  const togglePause = async () => {
    const np = !paused
    setPaused(np)
    try { await api.workPause(sessionId, np) } catch { /* ignore */ }
    if (np) pauseWatching()
    else startWatching()
  }
  // Guiding watches by default - no "Watch me" button. Start watching once when a
  // planned, unpaused, active session is open and nothing is watching yet. (A
  // fresh plan already started watching; a paused session waits for Resume.)
  // Derived here (before the effects that use them) so `done` is initialised
  // before the auto-watch effect reads it - declaring it later put it in the
  // temporal dead zone and crashed the whole plan/Console view (blank page).
  const steps = (sess && sess.steps) || []
  const done = steps.length > 0 && steps.every((x) => x.status === 'done')
  // A finished task is a record, not a live screen: every live control (watch
  // state, Refresh / Deep pass / Re-plan, Prev / Next, checkboxes, Ask) is
  // hidden and the steps render read-only. Deliverable actions stay.
  const ended = !!(sess && sess.status === 'ended')
  const doneCount = steps.filter((x) => x.status === 'done').length
  const autoWatchRef = useRef(false)
  useEffect(() => {
    if (autoWatchRef.current || !sess) return
    if (((sess.steps || []).length) === 0) return
    // watchLight is forced-off from the continuous loop: never auto-start watching.
    if (paused || watching || done || busy || sess.status === 'ended' || watchLight) return
    autoWatchRef.current = true
    startWatching()
  }, [sess, paused, watching, done, busy, watchLight])   // eslint-disable-line
  // Leaving work mode for the plan/Home screen freezes the session as a PAUSED
  // plan: the meter stops and it shows in "Pick up where you left off" with a
  // Resume button. Same behaviour on web and in the desktop app (the desktop
  // also snaps the window back to the large plan-mode layout). Reopening it
  // loads paused state, so the user resumes exactly where they left off.
  const leaveToPlan = async () => {
    stopCapture()
    try { if (sess && sess.status !== 'ended' && !paused) await api.workPause(sessionId, true) } catch { /* still leave */ }
    onBack()
  }

  const ask = async (qText) => {
    // Called both from onClick (passes an event) and from the Float panel
    // (passes a string). Only treat a string argument as the question text.
    const q = (typeof qText === 'string' ? qText : question).trim()
    if (!q) return
    if (outOfMinutes()) return
    setBusy(true); setErr(''); setAnswer('')
    try {
      // Include the screen only if we are already capturing - so pasting a big API
      // response or a long error and hitting Ask does NOT trigger a screen-share
      // prompt. The pasted text is analysed with the goal + plan context.
      const frame = await prepFrame(capturing ? grabFrame() : (photoFrameRef.current || null))
      const r = await api.workAsk(sessionId, { question: q, frame })
      noteStrong(r); setAnswer(r.answer || ''); if (typeof qText !== 'string') setQuestion('')
    } catch (e) { setErr(e.message || 'Could not answer') } finally { setBusy(false) }
  }

  // Add context MID-TASK: a typed note, a text document, and/or an uploaded image
  // (screenshot or phone photo). The engine reads it and AUTO-REPLANS the remaining
  // steps only if the new context changes the path - finished steps are preserved
  // and the user resumes at the next step. The uploaded image is already on-device
  // redacted (readContextFile) when DLP is on; the live screen is added too if we
  // are already capturing, so a "this is where I'm stuck" photo lands with context.
  const addContext = async ({ note = '', image = null, docsText = '' } = {}) => {
    const hasText = !!(String(note).trim() || String(docsText).trim())
    if (!hasText && !image) return
    if (outOfMinutes()) return
    setBusy(true); setErr(''); setAnswer('')
    try {
      const frame = await prepFrame(capturing ? grabFrame() : (photoFrameRef.current || null))
      const r = await api.workAddContext(sessionId, { note, docsText, image, frame })
      noteStrong(r)
      setAnswer(r.answer || '')
      if (r.steps) setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s)
      setQuestion('')
    } catch (e) { setErr(e.message || 'Could not add that') } finally { setBusy(false) }
  }
  // Attach handler shared by the console + float: read the file, then send it with
  // whatever note is typed. Surfaces an inline error for an unreadable/unsupported
  // file instead of failing silently.
  const attachContext = async (file, note = '') => {
    if (!file) return
    const out = await readContextFile(file)
    if (out.error) { setErr(out.error); return }
    await addContext({ note, image: out.image || null, docsText: out.docsText || '' })
  }

  // On-demand screenshot analysis: grab this exact frame and analyze it. A focus
  // prompt (what to analyze) steers it; empty gives a full read of the screen.
  // focus = optional question. forceDeep = one-shot: run THIS screenshot on the
  // stronger model and weave it back into the plan, then continue on the fast one.
  const analyze = async (focus, forceDeep) => {
    const f = (typeof focus === 'string' ? focus : '').trim()
    const deep = !!forceDeep
    if (outOfMinutes()) return
    setBusy(true); setErr(''); setAnswer('')
    try {
      if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
      const frame = await prepFrame(grabFrame())
      const r = await api.workAsk(sessionId, { question: f, frame, deep })
      noteStrong(r); setAnswer(r.answer || '')
      // The screenshot review should also help the plan: run one navigator pass
      // on the SAME frame so the steps and the live guidance reflect what was
      // just seen (advance, correct, or flag), without losing the goal.
      if (sess && Array.isArray(sess.steps) && sess.steps.length) {
        try {
          const w = await api.workWatch(sessionId, { frame, deep })
          if (w.guidance != null) setGuidance(w.guidance || '')
          if (w.steps) setSess((s) => s ? { ...s, steps: w.steps, currentStep: w.index } : s)
          if (w.observation) setObservation(w.observation)
          // Flags reflect the CURRENT screen only: replace each watch tick so a
          // warning clears the moment you move past it (no stale, sticky errors).
          setFlags(w.flag ? [{ t: Date.now(), text: w.flag }] : [])
        } catch { /* the answer already showed; a nav refresh failure is non-fatal */ }
      }
    } catch (e) { setErr(e.message || 'Could not analyze the screen') } finally { setBusy(false) }
  }

  // Research = user-triggered web lookup, then a current answer. Only runs when
  // the user taps Research, so there is no continuous web use.
  const doResearch = async (qArg) => {
    const q = (typeof qArg === 'string' ? qArg : question).trim()
    if (outOfMinutes()) return
    setBusy(true); setErr(''); setAnswer('')
    try { const r = await api.workResearch(sessionId, q); setAnswer(r.answer || '') }
    catch (e) { setErr(e.message || 'Could not research') } finally { setBusy(false) }
  }

  // Get the RESULT: hand back the actual answer for the goal, not the next step.
  // It computes from the goal plus any text pasted into the "paste data" field
  // (docsText). forceScreen attaches the current screen frame (starting capture
  // if needed); otherwise a frame is included only when we are already sharing,
  // so pasting data and pressing Get the result never triggers a share prompt.
  // The honesty contract (confidence / basis / verifyBy / caveat / need) rides
  // on the returned result and is surfaced by ResultCard.
  const getResult = async (forceScreen) => {
    if (outOfMinutes()) return
    setResultBusy(true); setResultErr(''); setResultOut(null); setResultSec(null)
    try {
      let frame = null
      if (forceScreen) {
        if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setResultBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
        frame = await prepFrame(grabFrame())
      } else if (capturing || photoFrameRef.current) {
        frame = await prepFrame(grabFrame())
      }
      const body = {}
      if (frame) body.frame = frame
      if (pasteData.trim()) body.docsText = pasteData
      const r = await waitFor(api.workResult(sessionId, body), 'Getting the result is taking longer than expected. Try again.')
      noteStrong(r)
      if (r && r.result) { setResultOut(r.result); setResultSec(r.security || null) }
      else setResultErr('No result came back. Try again.')
    } catch (e) {
      setResultErr((e && e.message) || 'Could not get the result')
      if (e && e.timedOut) refresh()
    } finally { setResultBusy(false) }
  }

  // COMPOSE: write the actual document for the goal. It writes from `want` (what
  // to write) plus any pasted source (docsText) and, optionally, the screen. Same
  // frame / redaction / timeout guards as getResult: forceScreen attaches the
  // current screen (starting capture if needed); otherwise a frame rides along
  // only when we are already sharing, so pasting text and pressing Compose never
  // triggers a share prompt. The result (title / body / basis / caveat) is
  // surfaced by ComposeCard. Nothing is auto-filled; it is read-only.
  const compose = async (forceScreen) => {
    const want = composeWant.trim()
    if (!want) { setComposeErr('Tell me what to write first.'); return }
    if (outOfMinutes()) return
    setComposeBusy(true); setComposeErr(''); setComposeOut(null); setComposeSec(null)
    try {
      let frame = null
      if (forceScreen) {
        if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setComposeBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
        frame = await prepFrame(grabFrame())
      } else if (capturing || photoFrameRef.current) {
        frame = await prepFrame(grabFrame())
      }
      const body = { want }
      if (composeFormat) body.format = composeFormat
      if (composeSrc.trim()) body.docsText = composeSrc
      if (frame) body.frame = frame
      const r = await waitFor(api.workCompose(sessionId, body), 'Writing this is taking longer than expected. Try again.')
      noteStrong(r)
      if (r && r.compose) { setComposeOut(r.compose); setComposeSec(r.security || null) }
      else setComposeErr('Nothing came back. Try again.')
    } catch (e) {
      setComposeErr((e && e.message) || 'Could not write this')
      if (e && e.timedOut) refresh()
    } finally { setComposeBusy(false) }
  }

  // COMPUTE FROM A FILE - on-device parse. The file is read ENTIRELY in the
  // browser; the full rows are kept in computeRowsRef (never state that could
  // serialize out, never a network call). Only the derived preview (name, row
  // count, column schema) goes into React state for display.
  const onComputeFile = async (file) => {
    if (!file) return
    setComputeErr(''); setComputeNeed(''); setComputeOut(null); setComputeFile(null)
    computeRowsRef.current = null
    setComputeParsing(true)
    try {
      const res = await parseDataFile(file)
      if (res.error) { setComputeErr(res.error); return }
      if (!res.rowCount || !res.schema.length) {
        setComputeErr('That file has no rows to compute on. Check it has a header row and at least one row of values.')
        return
      }
      computeRowsRef.current = res.rows
      setComputeFile({ name: res.name, rowCount: res.rowCount, schema: res.schema })
    } catch {
      setComputeErr('That file could not be read. Attach a .csv, .xlsx or .xls file.')
    } finally { setComputeParsing(false) }
  }

  // COMPUTE - the privacy boundary lives here. We send ONLY { want, schema,
  // rowCount } to plan a bounded, safe computation spec (never the rows, never
  // any cell value). We re-validate that spec locally (defense in depth) and
  // then run it on the FULL local rows with runSpec, on the device. Same minutes
  // / timeout guard as getResult for the one network call; the parse + run are
  // local and need no gate.
  const compute = async () => {
    const rows = computeRowsRef.current
    const file = computeFile
    if (!file || !rows) { setComputeErr('Attach a CSV or Excel file first.'); return }
    const want = computeWant.trim()
    if (!want) { setComputeErr('Tell me what to compute first.'); return }
    if (outOfMinutes()) return
    setComputeBusy(true); setComputeErr(''); setComputeNeed(''); setComputeOut(null)
    try {
      // ONLY the schema + row count leave the device. The rows stay here.
      const r = await waitFor(
        api.workCompute(sessionId, { want, schema: file.schema, rowCount: file.rowCount }),
        'Planning the computation is taking longer than expected. Try again.',
      )
      noteStrong(r)
      if (!r || r.ok === false || (r && r.need && String(r.need).trim())) {
        setComputeNeed((r && (String(r.need || '').trim() || String(r.caveat || '').trim())) || 'The file does not have the columns this needs. Pick a file that has them, or ask for something the columns cover.')
        return
      }
      const spec = r.spec
      const v = validateSpec(spec, file.schema)   // re-check locally before running
      if (!v.ok) {
        setComputeErr('The returned plan did not pass the local safety check (' + (v.errors[0] || 'invalid plan') + '). Try rewording what to compute.')
        return
      }
      const out = runSpec(spec, rows)   // LOCAL, full rows, on device
      setComputeOut({ result: out, explanation: r.explanation || '', caveat: r.caveat || '', spec })
    } catch (e) {
      setComputeErr((e && e.message) || 'Could not compute this')
      if (e && e.timedOut) refresh()
    } finally { setComputeBusy(false) }
  }

  const clearCompute = () => {
    computeRowsRef.current = null
    setComputeFile(null); setComputeOut(null); setComputeErr(''); setComputeNeed('')
  }

  const setStep = async (i, st) => { try { const r = await api.workStep(sessionId, i, st); setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s) } catch {} }
  // Prev / Next navigation of the current step (moves the pointer, does not mark
  // done). Shared by the main card header and the floating overlay.
  const navStep = async (dir) => {
    if (!steps.length) return
    const curIdx = steps.findIndex((s) => s.status === 'current')
    const base = curIdx >= 0 ? curIdx : Math.min(sess?.currentStep || 0, steps.length - 1)
    const target = base + dir
    if (target < 0 || target >= steps.length) return
    try { const r = await api.workCurrentStep(sessionId, target); setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s) } catch {}
  }

  // "How?" drill-down: expand one action (a plan step or the live guidance) into
  // a detailed sub-step checklist, guided the same way. State is keyed so each
  // drill-down keeps its own fetched sub-steps (no refetch on re-collapse) and
  // its own loading / declined / error state. Keys: 'step-<i>' for a plan step,
  // 'guidance' for the live guidance card. Cleared only on an explicit re-plan.
  const [howTo, setHowTo] = useState({})   // key -> { open, loading, steps, refusal, error }
  const drillHow = async (key, action, stepIndex) => {
    const act = (action || '').trim()
    if (!act) return
    const existing = howTo[key]
    // Already have usable content: this is just a collapse / re-expand, no refetch.
    if (existing && !existing.loading && !existing.error && (existing.steps || existing.refusal)) {
      setHowTo((h) => ({ ...h, [key]: { ...existing, open: !existing.open } }))
      return
    }
    if (existing && existing.loading) return
    setHowTo((h) => ({ ...h, [key]: { open: true, loading: true } }))
    try {
      let frame = null
      try { frame = await prepFrame(grabFrame()) } catch { frame = null }
      const body = { action: act }
      if (stepIndex != null) body.stepIndex = stepIndex
      if (frame) body.frame = frame
      const r = await api.workHowTo(sessionId, body)
      noteStrong(r)
      if (r && r.refusal) setHowTo((h) => ({ ...h, [key]: { open: true, loading: false, refusal: r.refusal } }))
      else setHowTo((h) => ({ ...h, [key]: { open: true, loading: false, steps: (r && r.steps) || [] } }))
    } catch {
      // Never crash the Console on a drill-down failure; show an inline retry.
      setHowTo((h) => ({ ...h, [key]: { open: true, loading: false, error: true } }))
    }
  }

  const finalize = async () => {
    setBusy(true)
    try { const r = await api.workFinalize(sessionId); setSess((s) => s ? { ...s, status: 'ended', summary: r.summary } : s); stopCapture() }
    catch (e) { setErr(e.message || 'Could not finalize') } finally { setBusy(false) }
  }
  // End flow: show a finishing animation, run finalize, then a completion message
  // with a clear "Back to plan" navigation.
  const endSession = async () => {
    setEndState('finishing')
    try {
      const r = await waitFor(api.workFinalize(sessionId), 'Finishing is taking longer than expected. Your session is saved; press End again in a moment.')
      setSess((s) => s ? { ...s, status: 'ended', summary: r.summary } : s); stopCapture(); setEndState('done')
    } catch (e) {
      setErr(e.message || 'Could not finalize'); setEndState(null)
      if (e && e.timedOut) refresh()
    }
  }

  // Reader-controlled guidance text size, shared with the full-screen guide via
  // one localStorage key. Applied as the `--wc-fs` multiplier on the console
  // root so the guidance text, step headings and code boxes scale together.
  const { scale: fsScale, dec: fsDec, inc: fsInc, reset: fsReset, atMin: fsAtMin, atMax: fsAtMax } = useGuideFontScale()
  // The same scale in the browser float. The PiP / pop-out is a SEPARATE
  // document, so the shared value is pushed onto its root as --fp-fs; FLOAT_CSS
  // and the FloatPanel sizes multiply by it. --wc-fs mirrors it so the shared
  // CmdBlock / CodeBlock dark code boxes scale inside the float too. One key
  // (wc-guide-fontscale), so the float, console and full guide always agree.
  useEffect(() => {
    if (!pipWin) return
    try {
      const root = pipWin.document.documentElement
      root.style.setProperty('--fp-fs', String(fsScale))
      root.style.setProperty('--wc-fs', String(fsScale))
    } catch { /* FloatPanel also sets the vars inline on its root, so it still scales */ }
  }, [pipWin, fsScale])

  return (
    <div className="wc" style={{ ...shell, padding: '16px 16px 60px', '--wc-fs': fsScale }}>
      <style>{CONSOLE_CSS}</style>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Compact single-row toolbar, holds cleanly at 460px: icon Back +
            theme, a truncating plan name, then the minutes pill and the
            session controls. Nothing wraps accidentally. */}
        <div className="wc-top">
          {/* Back appears once you Pause (a deliberate, paused exit), on a finished task,
              and whenever there is no loaded session yet (loading or failed), so the
              console can never trap the user. */}
          {(paused || ended || !sess) && <button className="wc-ib" onClick={leaveToPlan} title={ended ? 'Back to your plans' : (!sess ? 'Back to your plans' : 'Back to planning. Your paused session waits under Pick up where you left off.')} aria-label="Back to plan"><ChevronLeft size={17} /></button>}
          <button className="wc-ib" onClick={toggleAppTheme} title={appTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label="Toggle light or dark mode">{appTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
          <span style={{ flex: 1 }} />
          {sess && !ended && <button className="wc-tbtn" onClick={togglePause} title={paused ? 'Resume everything - watching and your minutes' : 'Pause everything - stop watching and freeze your minutes'}>{paused ? <><Play size={14} /> Resume</> : <><Square size={13} /> Pause</>}</button>}
          {/* Float on top is the core web feature: a labeled, filled button, not a bare icon. */}
          {floatCapable && sess && !ended && (pipWin
            ? <button className="wc-tbtn on" title={floatIsPip ? 'Bring the steps back into this window' : 'Close the pop-out window'} aria-label="Unfloat" onClick={closeFloat}><PictureInPicture2 size={15} /> {floatIsPip ? 'Unfloat' : 'Close pop-out'}</button>
            : <button className="wc-tbtn primary" title={pipSupported ? 'Float the steps in a small always-on-top window so you can work underneath' : 'Pop the steps out into their own window'} aria-label="Float on top" onClick={openFloat}><PictureInPicture2 size={15} /> {pipSupported ? 'Float on top' : 'Pop out'}</button>)}
          {/* Full guiding window: clean, detailed, full-screen guidance for a second
              monitor. On the desktop app it opens on the monitor you are not using. */}
          {sess && !ended && !isMobile && <button className="wc-tbtn" onClick={openFullGuide} title="Open clean, full-screen guidance on your other monitor - work on one screen, follow along on the other" aria-label="Open the full guiding window"><Monitor size={15} /> Full guide</button>}
          {sess && !ended && <button className="wc-tbtn quiet" onClick={endSession} disabled={busy} title="End the session and build a summary">End</button>}
        </div>
        {/* End flow: a finishing animation, a completion message, then back to plan. */}
        {replanOpen && (
          <div className="wd-modal-ov" onClick={() => setReplanOpen(false)}>
            <div className="wd-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px,calc(100vw - 36px))' }}>
              <h3 style={{ color: 'var(--text)' }}><RefreshCw size={17} /> Re-plan</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>Re-plan adapts the steps to new information. Your <b style={{ color: 'var(--text)' }}>original request stays exactly as you asked it</b> &mdash; if the goal itself has changed, start a new task.</p>
              {replanInfo && !replanInfo.unlimited && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: replanInfo.remaining <= 0 ? 'var(--danger, #c0392b)' : (replanInfo.remaining <= 2 ? 'var(--warn, #b8860b)' : 'var(--text-dim)'), margin: '0 0 10px' }}>
                  {replanInfo.remaining <= 0
                    ? `No re-plans left for this task (used all ${replanInfo.cap}). Start a new task to plan afresh.`
                    : `${replanInfo.remaining} of ${replanInfo.cap} re-plans left for this task.`}
                </div>
              )}
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', margin: '2px 0 7px' }}>What's new? <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(what changed, what to add or fix &mdash; not a new goal)</span></label>
              <textarea rows={3} autoFocus value={replanReason} onChange={(e) => setReplanReason(e.target.value)} placeholder="e.g. the UI changed, add a firewall rule step, skip the VPN part" style={{ width: '100%', resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, color: 'var(--text)', font: 'inherit', fontSize: 14, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => setReplanScope('here')} style={{ flex: 1, textAlign: 'left', padding: '11px 13px', borderRadius: 11, cursor: 'pointer', background: replanScope === 'here' ? 'var(--brand-soft)' : 'var(--surface-2)', border: `1px solid ${replanScope === 'here' ? 'var(--brand-600)' : 'var(--border)'}`, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Continue from here</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Keep what's done, re-plan the rest</div>
                </button>
                <button type="button" onClick={() => setReplanScope('start')} style={{ flex: 1, textAlign: 'left', padding: '11px 13px', borderRadius: 11, cursor: 'pointer', background: replanScope === 'start' ? 'var(--brand-soft)' : 'var(--surface-2)', border: `1px solid ${replanScope === 'start' ? 'var(--brand-600)' : 'var(--border)'}`, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>From the start</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Rebuild the whole plan</div>
                </button>
              </div>
              <div className="wd-modal-btns">
                <button className="btn btn-ghost" onClick={() => setReplanOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmReplan} disabled={busy || !!(replanInfo && !replanInfo.unlimited && replanInfo.remaining <= 0)}><RefreshCw size={15} /> Re-plan</button>
              </div>
            </div>
          </div>
        )}
        {endState && (
          <div className="wd-modal-ov" onClick={() => endState === 'done' && setEndState(null)}>
            <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
              {endState === 'finishing' ? (
                <>
                  <h3 style={{ color: 'var(--text)' }}><Loader2 size={17} className="spin" /> Wrapping up…</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '2px 0 0' }}>Finishing the current step and writing your summary. One moment.</p>
                </>
              ) : (
                <>
                  <h3 style={{ color: 'var(--text)' }}><Check size={18} style={{ color: 'var(--success)' }} /> Session complete</h3>
                  {sess && sess.summary
                    ? <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.55, margin: '2px 0 0', maxHeight: 180, overflow: 'auto' }}>{(() => { const t = String(sess.summary).replace(/\s+/g, ' ').trim(); return t.length > 360 ? t.slice(0, 360) + '…' : t })()}</p>
                    : <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '2px 0 0' }}>Your session is saved.</p>}
                  <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: '10px 0 0' }}>The full report, prompts and audit log are under <b>Pick up where you left off</b>.</p>
                  <div className="wd-modal-btns">
                    <button className="btn btn-ghost" onClick={() => setEndState(null)}>Stay here</button>
                    <button className="btn btn-primary" onClick={() => { setEndState(null); onBack() }}><Check size={15} /> OK, back to plan</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {deliverOpen && <DeliverablesPanel sessionId={sessionId} grabFrame={grabFrame} videoRef={videoRef} onClose={() => setDeliverOpen(false)} />}

        {/* Completed task: the export + deliverable actions the user asked to keep off the live screen. */}
        {ended && (
          <div className="wc-donebar">
            <span className="wc-donebar-lead"><span className="wc-done-ic"><Check size={15} strokeWidth={2.5} /></span><span>Completed<small>{steps.length ? `${doneCount} of ${steps.length} steps done. ` : ''}Download what you need.</small></span></span>
            <div className="wc-donebar-actions">
              <button className="wc-chip-btn" onClick={() => setDeliverOpen(true)}><FileText size={14} /> Review &amp; prompts</button>
              <button className="wc-chip-btn" onClick={() => window.open(api.workReportUrl(sessionId, true), '_blank')}><Download size={14} /> Report (PDF)</button>
              <button className="wc-chip-btn" onClick={() => window.open(api.workReportUrl(sessionId, false), '_blank')}><Printer size={14} /> Print</button>
              <a className="wc-chip-btn" href={api.workAuditUrl(sessionId)} download><FileText size={14} /> Audit log</a>
            </div>
          </div>
        )}

        {usage && usage.exhausted && (
          <div className="wc-banner danger">
            <AlertTriangle size={16} /> <span className="fill">You are out of minutes for today. Buy more time, or it resets at 11:59 PM ET.</span>
          </div>
        )}
        {usage && !usage.exhausted && usage.remainingSeconds <= 900 && !dismissedLow && (
          <div className="wc-banner warn">
            <AlertTriangle size={16} /> <span className="fill">About {Math.ceil(usage.remainingSeconds / 60)} minutes left today. You can pause anytime, or top up to keep going.</span>
            <button className="wc-tbtn ghost" onClick={() => setDismissedLow(true)}>Dismiss</button>
          </div>
        )}

        {!sess && loadErr ? (
          // The session could not be loaded: say why and offer the two real exits.
          <div className="wc-pre" role="alert">
            <div className="wc-pre-title">Could not open this session</div>
            <div className="wc-pre-sub">{loadErr}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button className="wc-tbtn primary" onClick={() => { setLoadErr(''); refresh() }}><RefreshCw size={14} /> Try again</button>
              <button className="wc-tbtn" onClick={leaveToPlan}><ChevronLeft size={14} /> Back to plans</button>
            </div>
          </div>
        ) : !sess ? (
          // Loading the session: never show an editable goal form for a session we
          // have not read yet (its Plan button could not work, and it looked like a
          // dead end). Back is in the toolbar above the whole time.
          <div className="wc-loading" aria-busy="true">
            <div className="wc-loading-orb"><span /><span /><span /></div>
            <div className="wc-loading-line on"><Loader2 size={14} className="spin" /><span>Opening your session…</span></div>
          </div>
        ) : steps.length === 0 ? (
          busy ? (
            // Planning: the thinking animation reveals phases, then the view swaps
            // to the step card the moment the plan is ready.
            <PlanningLoader />
          ) : (
            // Not planning yet (first frame) or screen-share was declined: the
            // goal starter + Plan button as a clean fallback.
            <div className="wc-pre">
              <div className="wc-pre-title">What do you want to get done?</div>
              <div className="wc-pre-sub">Type or paste your goal. It becomes a clear checklist that follows your screen step by step.</div>
              <textarea className="input" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: '100%', resize: 'vertical' }} placeholder="Build an AWS VPC with two public and two private subnets and a NAT gateway." />
              <div className="wc-caprow" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
                {isMobile && <button className="wc-tbtn wc-grow" onClick={takePhoto} disabled={busy} title="Snap a photo of a screen, a device or paper"><Camera size={14} /> {photoFrame ? 'Retake photo' : 'Photo'}</button>}
                <button className="wc-tbtn primary wc-watch" onClick={plan} disabled={busy || !goal.trim()}><Play size={14} /> Plan the steps</button>
              </div>
              {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{err}</div>}
              <div className="wc-pre-help">
                {isMobile ? <Camera size={14} /> : <Monitor size={14} />}
                <span>{isMobile
                  ? 'Tap Photo to snap the screen, device or paper, then Plan reads it.'
                  : <>Share your <b>whole screen</b> (not just a tab) so it can guide you through any app.{floatCapable ? <> Then use <b>Float on top</b> to keep the steps above your work.</> : null}</>}</span>
              </div>
            </div>
          )
        ) : !ended ? (
          // Post-plan, live: one status card. The step hero below is the main view.
          <>
            <div className="wc-guidebar">
              {/* Watch state. There is no perpetual spinner: when nothing is being
                  watched the resting state is the action that starts it. */}
              {paused
                ? <span className="wc-live-pill paused" title="Paused. Resume to keep watching."><Square size={12} /> Paused</span>
                : watchLight
                  ? <span className="wc-live-pill lite" title="Plan-heavy mode. Your steps are richer and self-contained. Use Check my progress for an on-demand read."><Compass size={12} /> Plan-heavy mode</span>
                  : watching
                    ? <span className={`wc-live-pill${usage && usage.exhausted ? ' out' : ''}`} title={source === 'screen' ? 'Reading your shared screen' : 'Reading the camera'}><span className="pulse" /> Watching live</span>
                    : <button className="wc-tbtn primary wc-watch" onClick={startWatching} disabled={busy} title={source === 'screen' ? 'Share your whole screen so the steps update as you work' : 'Start the camera so the steps update as you work'}><Eye size={15} /> {source === 'screen' ? 'Watch my screen' : 'Watch the camera'}</button>}
              {usage && <span className={`wc-min${usage.exhausted ? ' low' : ''}`} title={`${usage.tier} plan, resets ${usage.resetLabel}`}><span className="wc-dot" /> {Math.ceil((usage.remainingSeconds || 0) / 60)}m left</span>}
              {strongUsed && <span className="wc-strong"><Zap size={11} /> deeper read</span>}
              <span className="wc-sp" />
              {/* In Plan-heavy mode the prominent Check my progress button below is the
                  on-demand read, so this duplicate Refresh is hidden to stay uncluttered. */}
              {!watchLight && <button className="wc-tbtn" onClick={refreshScreen} disabled={busy || paused} title="Take a screenshot of your screen right now, verify this step, and move you on"><ScanLine size={14} /> Read my screen</button>}
              <button className="wc-tbtn" onClick={() => analyze(question, true)} disabled={busy} title="Deep pass: take a closer look at the current screen and weave it into your steps"><Zap size={14} /> Deep pass</button>
              {isMobile && <button className="wc-tbtn" onClick={takePhoto} disabled={busy}><Camera size={14} /> {photoFrame ? 'Retake' : 'Photo'}</button>}
              <button className="wc-tbtn ghost" onClick={() => { setReplanReason(''); setReplanScope('here'); setReplanOpen(true) }} disabled={busy} title="Re-plan: give a reason and keep or reset your progress">{busy ? <Loader2 size={14} className="spin" /> : null} Re-plan</button>
              {err && <div style={{ color: 'var(--danger)', fontSize: 13, width: '100%', lineHeight: 1.45 }}>{err}</div>}
              {photoFrame && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <img src={photoFrame} alt="Captured photo" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <button className="wc-tbtn ghost" onClick={clearPhoto} title="Remove this photo"><X size={14} /> Clear photo</button>
                </div>
              )}
            </div>
            {/* PLAN-HEAVY MODE (watch-light, set by us for Premium): a calm,
                informational strip - no toggle. It explains that the plan is
                richer and not watched continuously, and carries the prominent
                on-demand check wired to the existing refreshScreen. */}
            {watchLight && (
              <div className="wc-wl">
                <Compass size={16} className="wc-wl-ic" />
                <span className="wc-wl-sub">Your plan is richer and self-contained, and WorkCoPilot is not watching the whole time. Check your progress whenever you want a fresh read.</span>
                <span className="wc-sp" />
                <button type="button" className="wc-tbtn primary wc-wl-check" onClick={refreshScreen} disabled={busy || paused} title="Read the screen once, right now, and update your steps"><ScanLine size={15} /> Check my progress</button>
              </div>
            )}
            {/* The screen-share + float story for a first-time web user. Goes away once floating. */}
            {!watchLight && floatCapable && !pipWin && (
              <div className="wc-tip">
                <PictureInPicture2 size={15} />
                <span className="fill">{watching ? <>Keep these steps above your work: <b>{pipSupported ? 'Float on top' : 'Pop out'}</b> opens them in a small window that stays {pipSupported ? 'on top' : 'open'} while you work underneath.</> : <>Share your <b>whole screen</b>, then <b>{pipSupported ? 'Float on top' : 'Pop out'}</b> to keep the steps above your work.</>}</span>
                <button className="wc-tbtn" onClick={openFloat} title={pipSupported ? 'Float the steps in a small always-on-top window' : 'Pop the steps out into their own window'}><PictureInPicture2 size={14} /> {pipSupported ? 'Float on top' : 'Pop out'}</button>
              </div>
            )}
          </>
        ) : null}
        {/* Plan title lives with the guiding content (not in the header menu). */}
        {ended && err && <div style={{ color: 'var(--danger)', fontSize: 13, lineHeight: 1.45, margin: '0 2px 10px' }}>{err}</div>}
        {sess && steps.length > 0 && (sess.title || sess.goal) && (
          <>
            <div className="wc-plan-kicker">{ended ? <><Check size={11} /> Finished task</> : 'Your plan'}</div>
            <div className="wc-plan-title" title={sess.title || sess.goal || ''}>{(sess.title && !/^Session \d/.test(sess.title)) ? sess.title : (sess.goal || '')}</div>
          </>
        )}
        {/* Reader text-size control, sitting atop the guidance it scales. Shown
            once there is a guiding surface (a loaded session with steps). */}
        {sess && steps.length > 0 && (
          <div className="wc-readbar">
            <span className="wc-readbar-k">Text size</span>
            <GuideFontControl scale={fsScale} dec={fsDec} inc={fsInc} reset={fsReset} atMin={fsAtMin} atMax={fsAtMax}
              theme={{ border: 'var(--border)', text: 'var(--text)', muted: 'var(--text-muted)', panel: 'var(--surface)', accent: 'var(--em)' }} />
          </div>
        )}
        {/* hidden camera-photo picker, always mounted */}
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoPicked} style={{ display: 'none' }} />

        {/* Always mounted so the capture ref exists; shown as a live viewfinder
            only for the phone/camera source so you can aim it. The screen source
            is your own screen, so it stays hidden. */}
        <video ref={videoRef} muted playsInline
          style={source === 'camera' && capturing
            ? { display: 'block', width: '100%', maxWidth: 360, margin: '12px auto 0', borderRadius: 12, background: '#000', aspectRatio: '4 / 3', objectFit: 'cover' }
            : { display: 'none' }} />
        {source === 'camera' && capturing && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Live camera. Aim it at what you need help with.</div>}

        {/* Flags/warnings sit at the TOP of the guiding content so you see them
            immediately. They clear automatically as soon as you move past them. */}
        {flags.length > 0 && !ended && (
          <div className="wc-flags">
            {flags.map((f) => (
              <div key={f.t} className="wc-flag">
                <AlertTriangle size={15} /> <span><span className="wc-flag-k">Careful</span>{f.text}</span>
              </div>
            ))}
          </div>
        )}

        {watching && !ended && <div className="wc-live"><Eye size={13} strokeWidth={2.4} /><span><span className="pulse" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />Reading {source === 'screen' ? 'your screen' : 'the camera'} and updating as you go. <RichText text={observation} /></span></div>}

        {guidance && !ended && !done && (
          <div className="wc-hero">
            <div className="wc-hero-eyebrow">
              <span className="wc-hero-chip"><Eye size={11} strokeWidth={2.5} /> Now, do this</span>
              {paused
                ? <span className="wc-hero-hint">Paused. Resume to keep this live.</span>
                : watchLight
                  ? <span className="wc-hero-hint">Plan-heavy mode. Tap Check my progress when you want a fresh read.</span>
                  : !watching && <button type="button" className="wc-hero-hint-btn" onClick={startWatching} disabled={busy}>{source === 'screen' ? 'Watch my screen' : 'Watch the camera'} to keep this live <ArrowRight size={11} /></button>}
            </div>
            <div className="wc-hero-text"><RichText text={guidance} /></div>
            <HowButton open={!!(howTo.guidance && howTo.guidance.open)} loading={!!(howTo.guidance && howTo.guidance.loading)} onClick={() => drillHow('guidance', guidance)} />
            <HowDetail entry={howTo.guidance} onRetry={() => drillHow('guidance', guidance)} />
          </div>
        )}

        {steps.length > 0 && (
          <div className={`wc-steps${ended ? ' ro' : ''}`}>
            {ended && <div className="wc-record-head"><Check size={13} strokeWidth={2.5} /> What was done. {doneCount} of {steps.length} steps</div>}
            {steps.length > 1 && !ended && (() => {
              const ci = steps.findIndex((s) => s.status === 'current')
              const no = ci >= 0 ? ci : Math.min(sess?.currentStep || 0, steps.length - 1)
              return (
                <div className="wc-nav">
                  <button className="wc-nav-btn" disabled={no <= 0} onClick={() => navStep(-1)} title="Go to the previous step"><ChevronLeft size={15} /> Prev</button>
                  <div className="wc-nav-mid">
                    <span className="wc-nav-count">Step {no + 1} of {steps.length}</span>
                    <div className="wc-nav-track"><div className="wc-nav-fill" style={{ width: `${((no + 1) / steps.length) * 100}%` }} /></div>
                  </div>
                  <button className="wc-nav-btn" disabled={no >= steps.length - 1 || (steps[no] && steps[no].status !== 'done')} onClick={() => navStep(1)} title={steps[no] && steps[no].status !== 'done' ? 'Finish this step first - it advances on its own when done' : 'Go to the next step'}>Next <ChevronRight size={15} /></button>
                </div>
              )
            })()}
            {/* Rolling-window progress line + full-plan access (live only). The
                window below shows the current step + the next few; this line
                tells you where you are in the whole plan and opens all of it. */}
            {!ended && (() => {
              const prog = progressText(steps)
              const { hasMore } = stepProgress(steps)
              if (!prog) return null
              return (
                <div className="wc-plan-bar">
                  <span className="wc-plan-prog">{prog}</span>
                  {hasMore && <button type="button" className="wc-plan-link" onClick={() => setPlanOpen(true)}>View full plan</button>}
                </div>
              )
            })()}
            {/* While LIVE: only the rolling window (current + next 4, done hidden)
                so focus stays on the step to do now. When ENDED: the full record
                of the plan, every step, unchanged. */}
            {(ended ? steps.map((s, i) => ({ step: s, index: i })) : stepWindow(steps)).map(({ step: s, index: i }, pos) => {
              const isDone = s.status === 'done'
              // Live: the window always leads with the current step. Ended record: status-based.
              const isNow = ended ? s.status === 'current' : pos === 0
              // In the live window done steps never appear; the current step is
              // fully expanded (commands/code/link/done-when) and the next few
              // stay compact. A finished task shows everything as the record.
              const reveal = isNow || isDone || ended
              const tone = ended ? (isDone ? 'done' : 'skipped') : (isNow ? 'now' : isDone ? 'done' : 'pending')
              return (
                <div key={i} className={`wc-step ${tone}`}>
                  {ended
                    ? <span className="wc-step-check" aria-hidden="true">{isDone ? <Check size={16} strokeWidth={2.5} /> : <span className="wc-step-num">{i + 1}</span>}</span>
                    : <button className="wc-step-check" title={isDone ? 'Mark not done' : 'Mark done'} aria-label={isDone ? 'Mark not done' : 'Mark done'} onClick={() => setStep(i, isDone ? 'current' : 'done')}>
                        {isDone ? <Check size={16} strokeWidth={2.5} /> : <span className="wc-step-num">{i + 1}</span>}
                      </button>}
                  <div className="wc-step-body">
                    <div className="wc-step-title"><RichText text={s.text} /></div>
                    {reveal && s.url && <div><a className="wc-open" href={s.url} target="_blank" rel="noopener noreferrer">Open {linkHost(s.url)}<ExternalLink size={13} /></a></div>}
                    {reveal && ((s.commands && s.commands.length > 0) || (s.code && s.code.content)) && (
                      <DestructiveGate why={s.destructive ? s.destructiveWhy : null}>
                        {s.commands && s.commands.length > 0 && <CmdBlock lines={s.commands} />}
                        {s.code && s.code.content && <CodeBlock file={s.code.file} content={s.code.content} />}
                      </DestructiveGate>
                    )}
                    {isNow && !ended && s.validate && <div className="wc-step-when"><Eye size={11} /> done when: <RichText text={s.validate} /></div>}
                    {isDone && s.doneAt && <div className="wc-step-doneat"><Check size={11} /> Done {(() => { try { return new Date(s.doneAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return '' } })()}</div>}
                    {ended && !isDone && <div className="wc-step-tag">Not reached</div>}
                    {!ended && <HowButton open={!!(howTo['step-' + i] && howTo['step-' + i].open)} loading={!!(howTo['step-' + i] && howTo['step-' + i].loading)} onClick={() => drillHow('step-' + i, s.text, i)} />}
                    {!ended && <HowDetail entry={howTo['step-' + i]} onRetry={() => drillHow('step-' + i, s.text, i)} />}
                  </div>
                </div>
              )
            })}
            {done && !ended && <div className="wc-alldone"><Check size={16} strokeWidth={2.5} /> Every step is confirmed on screen. End and summarize when you are ready.</div>}
          </div>
        )}

        {/* Read-only FULL PLAN: every step in order with a done / current /
            upcoming marker and the goal at the top. This is the whole plan the
            window summarizes; it is NOT the session report. */}
        {planOpen && steps.length > 0 && (
          <div className="wc-plan-ov" onClick={() => setPlanOpen(false)} role="dialog" aria-modal="true" aria-label="Full plan">
            <div className="wc-plan-card" onClick={(e) => e.stopPropagation()}>
              <div className="wc-plan-head">
                <span className="wc-plan-title">Full plan</span>
                <button className="wc-ib" onClick={() => setPlanOpen(false)} title="Close" aria-label="Close full plan"><X size={16} /></button>
              </div>
              {sess?.goal && <div className="wc-plan-goal"><span className="wc-plan-goal-k">Your goal</span><div className="wc-plan-goal-t">{sess.goal}</div></div>}
              <div className="wc-plan-count">{progressText(steps) || `${doneCount} of ${steps.length} done`}</div>
              <div className="wc-plan-list">
                {steps.map((s, i) => {
                  const mk = planMarker(s, i, steps)
                  return (
                    <div key={i} className={`wc-plan-row ${mk}`}>
                      <span className="wc-plan-badge">{mk === 'done' ? <Check size={13} strokeWidth={2.5} /> : i + 1}</span>
                      <span className="wc-plan-txt"><RichText text={s.text} /></span>
                      {mk === 'current' && <span className="wc-plan-tag">Now</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAKE: one calm surface for the three "produce something" actions.
            A quiet tab row (Answer / Write / Compute) opens exactly one panel on
            demand, so there is a single primary action instead of three stacked
            bars. Every handler is unchanged: Answer -> getResult + ResultCard
            (with the Steps/Result/Both scope), Write -> compose + ComposeCard,
            Compute -> on-device parse + compute + ComputeCard. Produced artifacts
            stack below and stay visible after the panel is closed. */}
        {!ended && (
          <section className="wc-make" aria-label="Make something from this task">
            <div className="wc-make-head">
              <span className="wc-make-kicker">Make something</span>
              <div className="wc-make-tabs" role="tablist" aria-label="What to make">
                <button type="button" role="tab" aria-selected={maker === 'answer'} className={`wc-make-tab${maker === 'answer' ? ' on' : ''}`} onClick={() => pickMaker('answer')}><Sparkles size={15} /> Answer</button>
                <button type="button" role="tab" aria-selected={maker === 'write'} className={`wc-make-tab${maker === 'write' ? ' on' : ''}`} onClick={() => pickMaker('write')}><PenLine size={15} /> Write</button>
                <button type="button" role="tab" aria-selected={maker === 'compute'} className={`wc-make-tab${maker === 'compute' ? ' on' : ''}`} onClick={() => pickMaker('compute')}><Calculator size={15} /> Compute</button>
              </div>
              {!maker && <span className="wc-make-lead">Get the actual answer, draft a document, or crunch a file. Your plan stays in view.</span>}
            </div>

            {/* ANSWER: hand back the real answer, not just the next step. The
                Steps/Result/Both scope only changes emphasis; the guiding flow stays. */}
            {maker === 'answer' && (
              <div className="wc-make-panel" role="tabpanel">
                <div className="wc-make-ctl">
                  <div className="wc-seg" role="tablist" aria-label="What do you want">
                    {[['steps', 'Steps'], ['result', 'Result'], ['both', 'Both']].map(([v, label]) => (
                      <button key={v} type="button" role="tab" aria-selected={scope === v} className={scope === v ? 'on' : ''} onClick={() => setScope(v)}>{label}</button>
                    ))}
                  </div>
                  <span className="wc-result-lead">{scope === 'steps' ? 'Guide me step by step' : 'Get the actual answer, with how I got it'}</span>
                  <span className="wc-sp" />
                  <button className={`wc-ib${pasteOpen ? ' on' : ''}`} onClick={() => setPasteOpen((v) => !v)} disabled={resultBusy} title="Paste data to compute from: a table, numbers, a log, any text" aria-label="Paste data"><ClipboardCopy size={16} /></button>
                  <button className="wc-ib" onClick={() => getResult(true)} disabled={resultBusy} title={source === 'camera' ? 'Snap a photo and compute the result from it' : 'Read the screen and compute the result from it'} aria-label="Compute from the screen">{source === 'camera' ? <Camera size={16} /> : <ScanLine size={16} />}</button>
                  <button className="wc-tbtn primary" onClick={() => getResult(false)} disabled={resultBusy} title="Compute the result for your goal, using any pasted data and the screen if you are sharing it">{resultBusy ? <Loader2 size={14} className="spin" /> : <Sparkles size={15} />} Get the result</button>
                </div>
                {pasteOpen && (
                  <textarea className="wc-result-paste" rows={3} value={pasteData} onChange={(e) => setPasteData(e.target.value)} placeholder="Paste the data to work from here: a table, numbers, a log, a config, or any text. Leave empty to compute from your goal and screen." />
                )}
                {resultErr && <div className="wc-result-err"><AlertTriangle size={14} /> {resultErr}</div>}
                {resultBusy && !resultOut && (
                  <div className="wc-result-load"><Loader2 size={15} className="spin" /> Working out the result{pasteData.trim() ? ' from your data' : ''}…</div>
                )}
              </div>
            )}

            {/* WRITE: draft the full document (letter, report, clause, outline,
                table or code), ready to copy. Nothing is auto-filled. */}
            {maker === 'write' && (
              <div className="wc-make-panel" role="tabpanel">
                <label className="wc-compose-label" htmlFor="wc-compose-want">What do you need? (I give you code, or a ready-to-use prompt for your own AI)</label>
                <textarea id="wc-compose-want" className="wc-compose-want" rows={2} value={composeWant} onChange={(e) => setComposeWant(e.target.value)}
                  placeholder="For example: a SQL query for last month's refunds, or a prompt to draft a vendor follow-up email in your own AI (attach your old thread to it)."
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); compose(false) } }} />
                <div className="wc-make-ctl">
                  <label className="wc-compose-fmt">
                    <span>Format</span>
                    <select value={composeFormat} onChange={(e) => setComposeFormat(e.target.value)}>
                      <option value="">Auto</option>
                      <option value="prompt">Prompt for your AI</option>
                      <option value="code">Code</option>
                      <option value="table">Table</option>
                      <option value="bullets">Bullets</option>
                      <option value="outline">Outline</option>
                    </select>
                  </label>
                  <button type="button" className={`wc-ib${composeSrcOpen ? ' on' : ''}`} onClick={() => setComposeSrcOpen((v) => !v)} disabled={composeBusy} title="Paste source text to write from: an email, a table, numbers, a log, any text" aria-label="Paste source text"><ClipboardCopy size={16} /></button>
                  <button type="button" className="wc-ib" onClick={() => compose(true)} disabled={composeBusy} title={source === 'camera' ? 'Snap a photo and write from what it shows' : 'Read the screen and write from what it shows'} aria-label="Write from the screen">{source === 'camera' ? <Camera size={16} /> : <ScanLine size={16} />}</button>
                  <span className="wc-sp" />
                  <button type="button" className="wc-tbtn primary" onClick={() => compose(false)} disabled={composeBusy} title="Write the document for your goal, using any pasted source and the screen if you are sharing it">{composeBusy ? <Loader2 size={14} className="spin" /> : <PenLine size={15} />} Compose</button>
                </div>
                {composeSrcOpen && (
                  <textarea className="wc-compose-src" rows={3} value={composeSrc} onChange={(e) => setComposeSrc(e.target.value)} placeholder="Paste the source to write from here: an email thread, a table, notes, a clause, or any text. Leave empty to write from your goal and screen." />
                )}
                {composeErr && <div className="wc-compose-err"><AlertTriangle size={14} /> {composeErr}</div>}
                {composeBusy && !composeOut && (
                  <div className="wc-compose-load"><Loader2 size={15} className="spin" /> Writing{composeSrc.trim() ? ' from your source' : ''}…</div>
                )}
              </div>
            )}

            {/* COMPUTE FROM A FILE: privacy-first, on-device data compute. The CSV /
                Excel file is parsed ENTIRELY in the browser; only the column names +
                types + row count are sent to plan a safe computation, re-checked and
                run locally on the full rows. The raw rows never leave the machine. */}
            {maker === 'compute' && (
              <div className="wc-make-panel" role="tabpanel">
                {/* The privacy promise, stated plainly and kept literally true in
                    the code: only { want, schema, rowCount } is ever sent. */}
                <div className="wc-compute-privacy">
                  <ShieldCheck size={15} />
                  <span>Your file is read on your device. Only the column names and types are sent, your data never leaves your machine.</span>
                </div>

                <input ref={computeFileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onComputeFile(f); e.target.value = '' }} />

                {!computeFile && !computeParsing && (
                  <button type="button" className="wc-compute-drop" onClick={() => computeFileRef.current && computeFileRef.current.click()}>
                    <Upload size={20} />
                    <span className="wc-compute-drop-t">Choose a CSV or Excel file</span>
                    <span className="wc-compute-drop-s">.csv, .xlsx or .xls, read right here on your device</span>
                  </button>
                )}

                {computeParsing && (
                  <div className="wc-compute-load"><Loader2 size={15} className="spin" /> Reading your file on this device…</div>
                )}

                {computeFile && (
                  <>
                    <div className="wc-compute-file">
                      <div className="wc-compute-file-head">
                        <span className="wc-compute-file-name"><FileSpreadsheet size={15} /> {computeFile.name}</span>
                        <span className="wc-compute-file-meta">{computeFile.rowCount.toLocaleString()} {computeFile.rowCount === 1 ? 'row' : 'rows'} · {computeFile.schema.length} {computeFile.schema.length === 1 ? 'column' : 'columns'}</span>
                        <button type="button" className="wc-compute-change" onClick={() => computeFileRef.current && computeFileRef.current.click()} title="Choose a different file">Change</button>
                      </div>
                      <div className="wc-compute-chips">
                        {computeFile.schema.map((col, i) => (
                          <span key={i} className={`wc-compute-chip t-${col.type}`}><b>{col.name}</b><i>{col.type}</i></span>
                        ))}
                      </div>
                    </div>

                    <label className="wc-compute-label" htmlFor="wc-compute-want">What should I compute?</label>
                    <textarea id="wc-compute-want" className="wc-compute-want" rows={2} value={computeWant} onChange={(e) => setComputeWant(e.target.value)}
                      placeholder="For example: total revenue by region, the average order value, how many orders over $500, or the top 10 customers by spend."
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); compute() } }} />
                    <div className="wc-make-ctl">
                      <span className="wc-sp" />
                      <button type="button" className="wc-tbtn primary" onClick={compute} disabled={computeBusy}>{computeBusy ? <Loader2 size={14} className="spin" /> : <Calculator size={15} />} Compute</button>
                    </div>
                  </>
                )}

                {computeErr && <div className="wc-compute-err"><AlertTriangle size={14} /> {computeErr}</div>}
                {computeNeed && (
                  <div className="wc-compute-need"><AlertTriangle size={15} /><span><b>I need:</b> {computeNeed}</span></div>
                )}
                {computeBusy && !computeOut && (
                  <div className="wc-compute-load"><Loader2 size={15} className="spin" /> Planning the computation. Only the column names and types are sent…</div>
                )}
              </div>
            )}

            {/* Produced artifacts stay visible once made, even after the panel closes. */}
            {resultOut && (
              <div className="wc-made">
                <ResultCard result={resultOut} security={resultSec} />
                <button className="wc-tbtn ghost" onClick={() => { setResultOut(null); setResultSec(null) }} title="Clear this result"><X size={14} /> Clear result</button>
              </div>
            )}
            {composeOut && (
              <div className="wc-made">
                <ComposeCard compose={composeOut} security={composeSec} />
                <button type="button" className="wc-tbtn ghost" onClick={() => { setComposeOut(null); setComposeSec(null) }} title="Clear this document"><X size={14} /> Clear document</button>
              </div>
            )}
            {computeOut && (
              <div className="wc-made">
                <ComputeCard result={computeOut.result} explanation={computeOut.explanation} caveat={computeOut.caveat} spec={computeOut.spec} fileName={computeFile && computeFile.name} />
                <button type="button" className="wc-tbtn ghost" onClick={clearCompute} title="Clear this result and file"><X size={14} /> Clear result</button>
              </div>
            )}
          </section>
        )}

        {/* In-the-moment ask: a single clean prompt. It uses the whole session
            (goal + plan + what is on screen) to answer and keep you moving. */}
        {!ended && (
          <div className="wc-ask">
            <div className="wc-ask-row wc-askrow">
              <input ref={contextFileRef} type="file" accept="image/*,.txt,.md,.markdown,.csv,.tsv,.json,.log,.yml,.yaml,.xml,.html,.htm" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) attachContext(f, question); e.target.value = '' }} />
              <textarea className="input wc-ask-ta" rows={1} placeholder={source === 'camera' ? 'Ask about what the camera sees' : 'Ask anything, paste an error, or attach a screenshot or document for the next move'} value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }} onPaste={(e) => { const items = e.clipboardData && e.clipboardData.items; if (!items) return; for (const it of items) { if (it.type && it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { e.preventDefault(); attachContext(f, question); return } } } }} />
              <button className="wc-ib" onClick={() => contextFileRef.current && contextFileRef.current.click()} disabled={busy} title="Attach a screenshot, photo, or document. It is considered and your steps update if needed." aria-label="Attach a screenshot or document"><Paperclip size={16} /></button>
              <button className="wc-ib" onClick={() => analyze(question)} disabled={busy} title={source === 'camera' ? 'Snap a photo and read it now' : 'Read the screen right now'} aria-label="Read the screen now">{source === 'camera' ? <Camera size={16} /> : <ScanLine size={16} />}</button>
              <button className="wc-ib" onClick={() => doResearch(question)} disabled={busy} title="Look up the latest on the web, then answer" aria-label="Research on the web"><Globe size={16} /></button>
              <button className="wc-tbtn primary" onClick={ask} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={16} />} Ask</button>
            </div>
            {answer && <div className="wc-ask-answer"><div className="wc-ask-k"><Sparkles size={11} /> Answer</div><AnswerBody text={answer} /></div>}
          </div>
        )}

        {ended && sess.summary && (
          <div className="wc-sum">
            <div className="wc-sum-title"><FileText size={15} /> Session summary</div>
            <AnswerBody text={sess.summary} />
          </div>
        )}
      </div>

      {pipWin && createPortal(
        <FloatPanel
          steps={steps} watching={watching} observation={observation} guidance={guidance}
          flags={flags} answer={answer} busy={busy} err={err}
          done={done} floatQ={floatQ} setFloatQ={setFloatQ} goal={goal}
          fontScale={{ scale: fsScale, dec: fsDec, inc: fsInc, reset: fsReset, atMin: fsAtMin, atMax: fsAtMax }}
          theme={floatTheme} onToggleTheme={() => setFloatTheme((t) => t === 'light' ? 'dark' : 'light')}
          usage={usage} paused={paused} onPause={togglePause}
          onDeep={() => analyze(floatQ.trim(), true)}
          onResearch={() => doResearch(floatQ.trim())}
          onAsk={(q) => { ask(q); setFloatQ('') }}
          onAnalyze={analyze}
          onAddContext={async (file) => { await attachContext(file, floatQ.trim()); setFloatQ('') }}
          onStep={setStep}
          onNav={navStep}
          onWatch={watching ? pauseWatching : startWatching}
          onClose={closeFloat}
        />, pipWin.document.body)}
    </div>
  )
}

// The floating overlay shown in the Document Picture-in-Picture window. It
// mirrors the console's live state (steps, the current step, what the watcher
// sees, flags, the latest answer) and lets the user ask and tick steps off
// without leaving the app they are working in. Styles are inline because the
// PiP window is a separate document with none of the app's CSS.
function FloatPanel({ steps, watching, observation, guidance, flags, answer, busy, err, done, floatQ, setFloatQ, goal, fontScale, theme = 'dark', onToggleTheme, usage, paused, onPause, onDeep, onResearch, onAsk, onAnalyze, onAddContext, onStep, onNav, onWatch, onClose }) {
  const floatFileRef = useRef(null)   // hidden file input for mid-task attachments in the float
  const current = steps.find((s) => s.status === 'current')
  // Dim the panel to cut glare over your work. The browser will not let a web
  // Picture-in-Picture window be see-through to the app behind it, so this
  // fades the panel itself; for true see-through + click-behind use the app.
  const DIM_LEVELS = [1, 0.85, 0.65, 0.45]
  const [dim, setDim] = useState(1)
  const cycleDim = () => setDim((d) => DIM_LEVELS[(DIM_LEVELS.indexOf(d) + 1) % DIM_LEVELS.length] || 1)
  // The full roadmap is tucked away by default so the current step and the
  // latest answer own the panel. A compact chip expands it on demand.
  const [stepsOpen, setStepsOpen] = useState(false)

  const light = theme === 'light'
  // Color-coded by meaning (one source of truth with the console + full guide):
  //   accent (EMERALD) = the current step / the one live action - the brightest
  //   thing on the panel and the primary button; cyan = calm context the watcher
  //   can see (observation); warn (AMBER) = a warning that must interrupt; good =
  //   the done check. Brand emerald #8cf5c4 / cyan #39d3ff / amber #f5c86b for
  //   dark; darkened equivalents for contrast on the white light panel.
  //   Everything here is inline because the PiP document carries none of the
  //   app's CSS.
  const c = light
    ? { canvas: '#f3f5f9', panel: '#ffffff', panel2: '#f5f7fb', border: '#e2e6ed', borderStrong: '#c6cdd8', text: '#171a21', muted: '#58606e', faint: '#8b93a1',
        accent: '#0e9f6e', accentHi: '#12b47e', onAccent: '#ffffff', accentSoft: 'rgba(14,159,110,.10)', accentRing: 'rgba(14,159,110,.30)', accentGlow: 'rgba(14,159,110,.20)',
        cyan: '#0a84c2', cyanSoft: 'rgba(10,132,194,.10)', cyanRing: 'rgba(10,132,194,.28)',
        good: '#107c41', goodSoft: 'rgba(16,124,65,.12)', warn: '#b86e00', warnSoft: 'rgba(245,200,107,.16)', warnRing: 'rgba(184,110,0,.30)', danger: '#c42b1c',
        link: '#0067c0',
        inputBg: '#ffffff', track: '#e6eaf0', shadow: '0 1px 2px rgba(16,24,40,.05), 0 8px 24px -14px rgba(16,24,40,.25)', heroShadow: '0 2px 4px rgba(14,159,110,.06), 0 14px 32px -16px rgba(14,159,110,.32)' }
    : { canvas: '#0a0d12', panel: '#141a24', panel2: '#1b2130', border: '#28303f', borderStrong: '#3b4455', text: '#eef3f6', muted: '#9aa6ad', faint: '#6c7780',
        accent: '#8cf5c4', accentHi: '#8cf5c4', onAccent: '#052a1d', accentSoft: 'rgba(140,245,196,.14)', accentRing: 'rgba(140,245,196,.34)', accentGlow: 'rgba(140,245,196,.22)',
        cyan: '#39d3ff', cyanSoft: 'rgba(57,211,255,.13)', cyanRing: 'rgba(57,211,255,.32)',
        good: '#54b97b', goodSoft: 'rgba(84,185,123,.16)', warn: '#f5c86b', warnSoft: 'rgba(245,200,107,.14)', warnRing: 'rgba(245,200,107,.34)', danger: '#ff7a6b',
        link: '#6cb6ff',
        inputBg: '#0a0d12', track: '#28303f', shadow: '0 1px 2px rgba(0,0,0,.3), 0 10px 28px -14px rgba(0,0,0,.7)', heroShadow: '0 2px 4px rgba(0,0,0,.3), 0 16px 36px -16px rgba(140,245,196,.3)' }

  // Figtree for body (loaded into the PiP document head when the float opens),
  // Bricolage Grotesque for display headings - the same pairing as the app.
  // Both degrade to a clean system stack if the webfont is blocked.
  const FONT = '"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI","Inter",system-ui,sans-serif'
  const DISPLAY = '"Bricolage Grotesque",' + FONT
  // Microsoft-Learn / Docs reading scale. fs(px) multiplies a GUIDANCE text size
  // by --fp-fs (the reader's A- / A / A+ choice, shared with the console + full
  // guide through the one wc-guide-fontscale key). Chrome (header, buttons,
  // eyebrows, badges) stays a stable size so the panel never blows up. The vars
  // are set here inline AND on the PiP document root by the console, so the
  // body default and every sized element agree.
  const fsScale = (fontScale && Number.isFinite(fontScale.scale)) ? fontScale.scale : 1
  const fs = (px) => `calc(${px}px * var(--fp-fs, 1))`
  const wrap = { '--fp-fs': fsScale, '--wc-fs': fsScale, padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: '100vh', overflowX: 'hidden', opacity: dim, color: c.text, background: c.canvas, fontFamily: FONT, fontSize: fs(13.5), lineHeight: 1.5, fontFeatureSettings: '"tnum" 1, "cv11" 1', WebkitFontSmoothing: 'antialiased' }
  const card = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: 12, boxShadow: c.shadow }
  // Blue inline hyperlink for "Open <host>" (MS-docs style), NOT a button.
  const link = { display: 'inline-flex', alignItems: 'center', gap: 5, color: c.link, fontSize: fs(13), fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere' }
  // One small-button family: icon (header), ghost (secondary), primary (the one action).
  const iconBtn = { background: 'transparent', color: c.muted, border: '1px solid transparent', borderRadius: 8, width: 28, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s, color .15s' }
  const ghost = { background: c.panel2, color: c.text, border: `1px solid ${c.border}`, borderRadius: 9, height: 32, padding: '0 11px', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'background .15s, border-color .15s, color .15s' }
  const primary = { background: `linear-gradient(135deg, ${c.accentHi}, ${c.accent})`, color: c.onAccent, border: '1px solid transparent', borderRadius: 9, height: 32, padding: '0 13px', fontSize: 12.5, fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxShadow: `0 1px 2px rgba(0,0,0,.12), 0 0 0 1px ${c.accentRing} inset` }
  const navBtn = { background: 'transparent', color: c.muted, border: '1px solid transparent', borderRadius: 8, height: 28, padding: '0 8px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }
  const eyebrow = { fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }
  // The current-step / answer left bar reads emerald -> cyan (the color-coded
  // "now" accent). Flags override this to amber below.
  const accentBar = { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${c.accent}, ${c.cyan})` }

  const minsLeft = usage ? Math.ceil((usage.remainingSeconds || 0) / 60) : 0
  const status = paused
    ? { label: 'Paused', color: c.warn, soft: c.warnSoft }
    : watching
      ? { label: 'Live', color: c.accent, soft: c.accentSoft }
      : { label: 'Not watching', color: c.muted, soft: c.panel2 }
  const doneN = steps.filter((s) => s.status === 'done').length

  return (
    <div style={wrap}>
      {/* Header: brand, live/paused state, minutes, icon controls, under a hairline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0, paddingBottom: 10, borderBottom: `1px solid ${c.border}` }}>
        <span style={{ width: 25, height: 25, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${c.accentHi}, ${c.accent})`, boxShadow: `0 0 0 1px ${c.accentRing} inset, 0 2px 6px -2px ${c.accentRing}` }}>
          <Eye size={13} color="#fff" strokeWidth={2.4} />
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 6 }}>
          <strong style={{ fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 700, letterSpacing: '-.015em', whiteSpace: 'nowrap' }}>WorkCoPilot</strong>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: status.color, background: status.soft, borderRadius: 999, padding: '0 8px', whiteSpace: 'nowrap' }}>
            <span className={watching && !paused ? 'fp-pulse' : undefined} style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
            {status.label}
          </span>
          {usage && <span style={{ fontSize: 11, fontWeight: 600, color: usage.exhausted ? c.danger : c.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>{minsLeft}m left</span>}
        </div>
        <button className="fp-btn" style={{ ...iconBtn, color: paused ? c.accent : c.muted, background: paused ? c.accentSoft : 'transparent' }} onClick={onPause} title={paused ? 'Resume' : 'Pause (freeze minutes)'}>{paused ? <Play size={15} /> : <Square size={14} />}</button>
        <button className="fp-btn" style={iconBtn} onClick={onDeep} disabled={busy} title="Deep pass: take a closer look at this one frame and weave it back into the steps, then carry on at normal speed."><Zap size={15} /></button>
        <button className="fp-btn" style={iconBtn} onClick={onToggleTheme} title={light ? 'Switch to dark' : 'Switch to light'}>{light ? <Moon size={15} /> : <Sun size={15} />}</button>
        <button className="fp-btn" style={{ ...iconBtn, width: 'auto', padding: '0 7px', gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: '.02em', fontVariantNumeric: 'tabular-nums', color: dim < 1 ? c.accent : c.muted, background: dim < 1 ? c.accentSoft : 'transparent' }} onClick={cycleDim} title="Dim the panel to cut glare (for true see-through, use the desktop app)">{Math.round(dim * 100)}%</button>
        <button className="fp-btn" style={iconBtn} onClick={onClose} title="Close the floating window"><X size={16} /></button>
      </div>

      {/* Watch toggle: the one control that makes the panel live */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="fp-btn" style={watching
          ? { ...ghost, justifyContent: 'center', height: 40, fontSize: 13, color: c.accent, borderColor: c.accentRing, background: c.accentSoft }
          : { ...primary, justifyContent: 'center', height: 40, fontSize: 13.5 }} onClick={onWatch}>{watching ? <><Square size={13} /> Pause watching</> : <><Eye size={15} /> Watch my screen</>}</button>
        {!watching && !paused && <div style={{ fontSize: fs(12), color: c.faint, textAlign: 'center', lineHeight: 1.45, padding: '0 6px' }}>Share your whole screen so the steps update as you work.</div>}
      </div>

      {/* OBSERVATION: calm cyan-tinted context chip - what the watcher can see */}
      {watching && (
        <div style={{ fontSize: fs(12.5), color: c.muted, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', lineHeight: 1.45, background: c.cyanSoft, border: `1px solid ${c.cyanRing}`, borderRadius: 10 }}><Eye size={13} strokeWidth={2.4} style={{ color: c.cyan, flexShrink: 0, marginTop: 2 }} /> <span style={{ overflowWrap: 'anywhere' }}>Reading your screen. <RichText text={observation} accent={c.cyan} /></span></div>
      )}

      {/* Flags first: anything to be careful about sits above the action */}
      {flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {flags.map((f, i) => (
            <div key={i} style={{ position: 'relative', display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 10px 8px 13px', background: c.warnSoft, borderRadius: 10, fontSize: fs(13), lineHeight: 1.5, color: c.text, overflow: 'hidden' }}>
              <span style={{ ...accentBar, width: 3, background: c.warn }} />
              <AlertTriangle size={14} style={{ color: c.warn, flexShrink: 0, marginTop: 2 }} />
              <span style={{ overflowWrap: 'anywhere' }}><RichText text={f.text} accent={c.warn} /></span>
            </div>
          ))}
        </div>
      )}

      {/* Read bar: the goal (what all this is for) on the left, the shared
          A- / A / A+ text-size control on the right. The control writes the one
          wc-guide-fontscale key, so the console and full guide follow along. */}
      {steps.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '0 2px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {goal && goal.trim() && (
              <>
                <span style={{ ...eyebrow, fontSize: 9.5, color: c.cyan }}>Goal</span>
                <div className="fp-clamp" title={goal} style={{ fontSize: fs(12.5), lineHeight: 1.45, color: c.muted, overflowWrap: 'anywhere', marginTop: 1 }}>{goal}</div>
              </>
            )}
          </div>
          {fontScale && (
            <GuideFontControl scale={fontScale.scale} dec={fontScale.dec} inc={fontScale.inc} reset={fontScale.reset} atMin={fontScale.atMin} atMax={fontScale.atMax}
              theme={{ border: c.border, text: c.text, muted: c.muted, panel: c.panel, accent: c.accent }} />
          )}
        </div>
      )}

      {/* Growing region: the current step and the latest answer own this space.
          The full step list is tucked into a compact chip so nothing is cramped. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {current ? (
          <>
            {/* CURRENT STEP = the brightest element: emerald accent, emerald->cyan
                left bar, a soft pulsing glow (reduced-motion safe via FLOAT_CSS),
                a "NOW · STEP X OF Y" eyebrow. Then the docs hierarchy, compact:
                step (semibold, the thing to do) -> how (the live guidance) ->
                done-when -> Open link (blue inline) -> dark code box with Copy. */}
            <div className="fp-now" style={{ ...card, position: 'relative', overflow: 'hidden', padding: '12px 13px 12px 16px', borderColor: c.accentRing, boxShadow: c.heroShadow, '--gr': c.accentRing, '--gg': c.accentGlow }}>
              <span style={accentBar} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                <span style={{ ...eyebrow, display: 'inline-flex', alignItems: 'center', gap: 5, color: c.onAccent, background: `linear-gradient(135deg, ${c.accentHi}, ${c.accent})`, padding: '3px 9px', borderRadius: 999 }}><Eye size={10} strokeWidth={2.6} /> Now · step {steps.indexOf(current) + 1} of {steps.length}</span>
                {paused
                  ? <span style={{ fontSize: 11, color: c.faint }}>Paused. Resume to keep this live.</span>
                  : !watching && <span style={{ fontSize: 11, color: c.faint }}>Watch my screen to keep this live</span>}
              </div>
              <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: fs(15), lineHeight: 1.4, color: c.text, overflowWrap: 'anywhere', textWrap: 'pretty' }}><RichText text={current.text} accent={c.accent} /></div>
              {guidance && guidance.trim() && guidance.trim() !== String(current.text || '').trim() && (
                <div style={{ fontSize: fs(13.5), color: c.text, marginTop: 7, lineHeight: 1.55, overflowWrap: 'anywhere' }}><RichText text={guidance} accent={c.accent} /></div>
              )}
              {current.validate && <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, fontSize: fs(12), color: c.muted, marginTop: 8, lineHeight: 1.45, background: c.panel2, border: `1px solid ${c.border}`, padding: '3px 9px', borderRadius: 7, maxWidth: '100%' }}><Eye size={11} style={{ flexShrink: 0, marginTop: 3 }} /> <span style={{ overflowWrap: 'anywhere' }}>Done when: <RichText text={current.validate} accent={c.accent} /></span></div>}
              {current.url && <div><a href={current.url} target="_blank" rel="noopener noreferrer" className="fp-link" style={{ ...link, marginTop: 8 }}>Open {linkHost(current.url)} <ExternalLink size={12} style={{ flexShrink: 0 }} /></a></div>}
              {((current.commands && current.commands.length > 0) || (current.code && current.code.content)) && (
                <DestructiveGate why={current.destructive ? current.destructiveWhy : null}>
                  {current.commands && current.commands.length > 0 && <CmdBlock lines={current.commands} />}
                  {current.code && current.code.content && <CodeBlock file={current.code.file} content={current.code.content} />}
                </DestructiveGate>
              )}
              <button className="fp-btn" style={{ ...primary, marginTop: 11, width: '100%', justifyContent: 'center', height: 34, fontSize: 13 }} onClick={() => onStep(steps.indexOf(current), 'done')}><Check size={15} strokeWidth={2.5} /> Mark done</button>
            </div>

            {/* Prev - Step N of M - Next, with a progress track */}
            {steps.length > 1 && onNav && (() => {
              const no = steps.indexOf(current)
              const locked = steps[no] && steps[no].status !== 'done'
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
                  <button className="fp-btn" style={navBtn} disabled={no <= 0} onClick={() => onNav(-1)} title="Go to the previous step"><ChevronLeft size={15} /> Prev</button>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
                    <span style={{ ...eyebrow, fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: c.muted, whiteSpace: 'nowrap' }}>Step {no + 1} of {steps.length}</span>
                    <div style={{ width: '100%', height: 4, borderRadius: 999, background: c.track, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${((no + 1) / steps.length) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, ${c.accent}, ${c.cyan})`, transition: 'width .35s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                  </div>
                  <button className="fp-btn" style={navBtn} disabled={no >= steps.length - 1 || locked} onClick={() => onNav(1)} title={locked ? 'Finish this step first. It advances on its own when done.' : 'Go to the next step'}>Next <ChevronRight size={15} /></button>
                </div>
              )
            })()}

            {/* NEXT UP: the rest of the rolling window - the next up to 4 upcoming
                steps (done hidden). With the NOW card above, that is the window of
                5. A quiet progress line shows where you are in the whole plan, so
                it is clear there is more beyond what is shown. */}
            {(() => {
              const upcoming = stepWindow(steps).slice(1) // drop the current step (shown above)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 2px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ ...eyebrow, fontSize: 9.5, letterSpacing: '.1em', color: c.faint }}>{upcoming.length ? 'Next up' : 'Progress'}</span>
                    <span style={{ fontSize: fs(10.5), color: c.faint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{progressText(steps)}</span>
                  </div>
                  {upcoming.map(({ step: s, index: n }) => (
                    <div key={n} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 10px', borderRadius: 10, background: c.panel2, border: `1px solid ${c.border}`, opacity: 0.72 }}>
                      <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: c.faint, border: `1px solid ${c.border}`, marginTop: 1 }}>{n + 1}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: fs(12.5), lineHeight: 1.4, color: c.muted, overflowWrap: 'anywhere' }}><RichText text={s.text} accent={c.accent} /></span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </>
        ) : done ? (
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '11px 13px', background: c.goodSoft, borderRadius: 11, color: c.good, fontWeight: 650, fontSize: fs(13.5) }}><Check size={17} strokeWidth={2.5} /> All steps confirmed on screen.</div>
        ) : steps.length === 0 ? (
          <div style={{ ...card, color: c.muted, fontSize: fs(13), textAlign: 'center', padding: '18px 14px', borderStyle: 'dashed', boxShadow: 'none', lineHeight: 1.5 }}>Plan your steps in the main window, then they appear here.</div>
        ) : null}

        {/* VIEW FULL PLAN: the complete plan, tucked into a compact chip so it
            never eats the panel. Tap to reveal every step with its done /
            current marker; each row jumps or marks done. This is the full plan
            the window above summarizes. */}
        {steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: stepsOpen ? 7 : 0 }}>
            <button className="fp-btn" onClick={() => setStepsOpen((o) => !o)}
              style={{ ...ghost, width: '100%', justifyContent: 'space-between', height: 36, background: stepsOpen ? c.panel2 : 'transparent', borderColor: stepsOpen ? c.border : 'transparent', color: c.muted }}
              title={stepsOpen ? 'Hide the full plan' : 'View the full plan'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <MenuIcon size={14} style={{ color: c.faint, flexShrink: 0 }} />
                <span style={{ ...eyebrow, fontSize: 10.5, letterSpacing: '.08em', color: c.faint }}>View full plan</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: c.text, fontVariantNumeric: 'tabular-nums' }}>{doneN} of {steps.length} done</span>
              </span>
              <ChevronRight size={16} style={{ color: c.faint, flexShrink: 0, transition: 'transform .18s cubic-bezier(.4,0,.2,1)', transform: stepsOpen ? 'rotate(90deg)' : 'none' }} />
            </button>
            {stepsOpen && (
              <div className="fp-rise" style={{ maxHeight: 248, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
                {steps.map((s, i) => {
                  const isDone = s.status === 'done', isNow = s.status === 'current'
                  const isPending = !isDone && !isNow
                  return (
                    <div key={i} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px 9px 13px', borderRadius: 11, overflow: 'hidden',
                      background: isDone ? c.panel2 : c.panel, border: `1px solid ${isNow ? 'transparent' : c.border}`, boxShadow: isNow ? c.shadow : 'none', opacity: isPending ? 0.62 : 1, transition: 'opacity .16s, box-shadow .16s' }}>
                      {isNow && <span style={{ ...accentBar, width: 3 }} />}
                      <button className="fp-btn" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', padding: 0, marginTop: 1,
                        border: `1.5px solid ${isDone ? 'transparent' : isNow ? c.accent : c.borderStrong}`, background: isDone ? c.goodSoft : 'transparent', color: isDone ? c.good : isNow ? c.accent : c.faint }}
                        onClick={() => onStep(i, isDone ? 'current' : 'done')} title={isDone ? 'Mark not done' : 'Mark done'}>{isDone ? <Check size={14} strokeWidth={2.5} /> : <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>}</button>
                      {isNow
                        ? <span style={{ flex: 1, minWidth: 0, fontSize: fs(13), lineHeight: 1.45, color: c.text, fontWeight: 650, overflowWrap: 'anywhere' }}><RichText text={s.text} accent={c.accent} /></span>
                        : <button onClick={() => onStep(i, 'current')} title="Jump to this step" style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, fontFamily: FONT, fontSize: fs(13), lineHeight: 1.45, color: isDone ? c.faint : c.muted, fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none', overflowWrap: 'anywhere' }}><RichText text={s.text} accent={c.accent} /></button>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* The latest answer is the highlighted focus. It fills the free space,
            updates in place, and scrolls when long. Empty = a calm hint. */}
        <div style={{ flex: 1, minHeight: 108, display: 'flex', flexDirection: 'column' }}>
          {answer ? (
            <div key={answer} className="fp-rise" style={{ ...card, position: 'relative', overflow: 'hidden', padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderColor: c.accentRing, boxShadow: c.heroShadow }}>
              <span style={accentBar} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px 9px 17px', borderBottom: `1px solid ${c.border}`, background: c.accentSoft }}>
                <Sparkles size={13} style={{ color: c.accent, flexShrink: 0 }} />
                <span style={{ ...eyebrow, color: c.accent, fontSize: 10.5 }}>Answer</span>
                {busy && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: c.muted }}><Loader2 size={12} className="spin" /> Updating</span>}
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 13px 12px 16px', fontSize: fs(13.5), lineHeight: 1.55, color: c.text, overflowWrap: 'anywhere' }}><RichText text={answer} accent={c.accent} /></div>
            </div>
          ) : busy ? (
            <div style={{ ...card, flex: 1, minHeight: 108, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: c.muted, boxShadow: 'none' }}>
              <Loader2 size={18} className="spin" style={{ color: c.accent }} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Working on it...</span>
            </div>
          ) : (
            <div style={{ ...card, flex: 1, minHeight: 108, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', color: c.faint, borderStyle: 'dashed', boxShadow: 'none', padding: '18px 20px' }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: c.accentSoft, color: c.accent }}><Sparkles size={18} /></span>
              <span style={{ fontSize: fs(12.5), lineHeight: 1.5, maxWidth: 260, color: c.muted }}>Ask a question or analyze your screen. The answer shows up right here.</span>
            </div>
          )}
        </div>
      </div>

      {/* Ask row, anchored at the bottom */}
      <div style={{ ...card, padding: 11 }}>
        {onAddContext && <input ref={floatFileRef} type="file" accept="image/*,.txt,.md,.markdown,.csv,.tsv,.json,.log,.yml,.yaml,.xml,.html,.htm" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onAddContext(f); e.target.value = '' }} />}
        <input
          style={{ width: '100%', height: 40, background: c.inputBg, color: c.text, border: `1px solid ${c.borderStrong}`, borderRadius: 11, padding: '0 13px', outline: 'none', fontSize: 13.5, fontFamily: FONT, boxShadow: light ? '0 1px 2px rgba(16,24,40,.04) inset' : 'none' }}
          placeholder="Ask, say what to analyze, or attach a screenshot or document" value={floatQ}
          onChange={(e) => setFloatQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && floatQ.trim()) onAsk(floatQ.trim()) }}
          onPaste={(e) => { if (!onAddContext) return; const items = e.clipboardData && e.clipboardData.items; if (!items) return; for (const it of items) { if (it.type && it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { e.preventDefault(); onAddContext(f); return } } } }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
          <button className="fp-btn" style={{ ...primary, flex: 1.25, minWidth: 0, padding: '0 10px', justifyContent: 'center' }} disabled={busy || !floatQ.trim()} onClick={() => floatQ.trim() && onAsk(floatQ.trim())}>{busy ? <Loader2 size={13} className="spin" /> : <><ArrowRight size={14} style={{ flexShrink: 0 }} /> Ask</>}</button>
          {onAddContext && <button className="fp-btn" style={{ ...ghost, flex: '0 0 auto', minWidth: 0, padding: '0 10px', justifyContent: 'center' }} disabled={busy} onClick={() => floatFileRef.current && floatFileRef.current.click()} title="Attach a screenshot, photo, or document. It is considered and your steps update if needed." aria-label="Attach a screenshot or document"><Paperclip size={14} style={{ flexShrink: 0 }} /></button>}
          <button className="fp-btn" style={{ ...ghost, flex: 1, minWidth: 0, padding: '0 9px', justifyContent: 'center' }} disabled={busy} onClick={() => onAnalyze(floatQ.trim())} title="Screenshot now and analyze. Type a focus above, or leave blank for a full read."><ScanLine size={14} style={{ flexShrink: 0 }} /> Analyze</button>
          <button className="fp-btn" style={{ ...ghost, flex: 1, minWidth: 0, padding: '0 9px', justifyContent: 'center' }} disabled={busy} onClick={onResearch} title="Look up the latest on the web, then answer (only when you tap it)."><Globe size={14} style={{ flexShrink: 0 }} /> Research</button>
        </div>
        {err && <div style={{ marginTop: 9, display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: c.danger, lineHeight: 1.45 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> <span style={{ overflowWrap: 'anywhere' }}>{err}</span></div>}
      </div>
    </div>
  )
}

// ---- Android self-update banner -------------------------------------------
// The installed app tags its user-agent "WorkCoPilotApp/<versionCode>". We read
// that, compare it to the public /work-updates/android.json manifest, and when a
// newer versionCode is published offer an Update. Tapping it navigates to the
// signed APK on the feed, which the native DownloadListener fetches + installs.
// On the plain web (no app UA) this renders nothing.
function AppUpdateBanner() {
  const [upd, setUpd] = useState(null)
  useEffect(() => {
    const m = (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '').match(/WorkCoPilotApp\/(\d+)/)
    if (!m) return
    const installed = Number(m[1])
    fetch('/work-updates/android.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && Number(j.versionCode) > installed) setUpd(j) })
      .catch(() => {})
  }, [])
  if (!upd) return null
  return (
    <div style={{ background: 'var(--brand-600)', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
      <Download size={16} />
      <div style={{ flex: 1 }}>A new version of WorkCoPilot{upd.versionName ? ` (${upd.versionName})` : ''} is ready.</div>
      <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--brand-700, #1a1a2e)' }} onClick={() => { window.location.href = '/work-updates/WorkCoPilot.apk' }}>Update</button>
    </div>
  )
}

// ---- top-level product page ----------------------------------------------
// No separate login any more: WorkCoPilot runs on the one unified account, with
// the 'work' product entitlement. Sign in on the main login; this page just
// gates on the session + entitlement the server reports.
function NoAccess({ onSignOut }) {
  return (
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ ...card, maxWidth: 420, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-600)', marginBottom: 8 }}>WorkCoPilot</div>
        <div style={{ color: 'var(--text-dim)' }}>Your account does not have WorkCoPilot access. Ask your administrator to enable it.</div>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={onSignOut}><LogOut size={15} /> Sign out</button>
      </div>
    </div>
  )
}
// Non-blocking cautionary notice for the AI input guardrail (warn-and-proceed).
// Lives at the WorkPage level so it survives the Home -> Console switch after a
// session is created. Auto-dismisses after ~8s; the user can also close it.
function GuardNotice({ note, onClose }) {
  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(onClose, 8000)
    return () => clearTimeout(t)
  }, [note, onClose])
  if (!note) return null
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: 'min(560px, calc(100vw - 24px))', display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--warning-soft, #fff7e0)', color: 'var(--text, #1a1a2e)', borderLeft: '3px solid var(--warning, #d98a00)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, lineHeight: 1.45, boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--warning, #d98a00)' }} />
      <span style={{ flex: 1 }}>{note.warning}</span>
      <button type="button" aria-label="Dismiss notice" onClick={onClose} style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={15} /></button>
    </div>
  )
}
export default function WorkPage() {
  const [sess, setSess] = useState(undefined)   // undefined=loading; {signedIn, access, user}
  const [guardNote, setGuardNote] = useState(null)   // { warning, severity, category } from a create/plan response
  const showGuard = useCallback((g) => { if (g && !g.blocked && g.warning) setGuardNote({ warning: String(g.warning), severity: g.severity, category: g.category }) }, [])
  const clearGuard = useCallback(() => setGuardNote(null), [])
  const openSession = useCallback((id, g) => { setOpenId(id); showGuard(g) }, [showGuard])
  // Remember the open guiding session so a reload (Ctrl+R in the desktop app)
  // returns you to it instead of the plan screen.
  const [openId, setOpenId] = useState(() => { try { return sessionStorage.getItem('wc_open') || null } catch { return null } })
  useEffect(() => { try { if (openId) sessionStorage.setItem('wc_open', openId); else sessionStorage.removeItem('wc_open') } catch { /* ignore */ } }, [openId])
  const loadMe = useCallback(() => api.workMe().then(setSess).catch(() => setSess({ signedIn: false, access: false, user: null })), [])
  useEffect(() => { loadMe() }, [loadMe])
  // Coming back from Stripe Checkout (success_url = /work?checkout=success):
  // re-hydrate so the new plan shows, then drop the query so a refresh is clean.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('checkout') === 'success') {
        loadMe()
        sp.delete('checkout')
        const q = sp.toString()
        window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''))
      }
    } catch { /* ignore */ }
  }, [loadMe])
  // Sign-out and the not-signed-in bounce both stay on the WorkCoPilot sign-in
  // (/workcopilot), never the shared multi-product login.
  const signOut = async () => { try { await api.logout() } catch {} ; window.location.href = '/workcopilot' }
  // Desktop app only: drive the window mode. Home/planning is a large windowed
  // "plan" mode; an open guiding session is the compact floating "guide" mode.
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  useEffect(() => {
    if (!desktop || !sess || !sess.signedIn || !sess.access) return
    try { desktop.setMode(openId ? 'guide' : 'plan') } catch { /* ignore */ }
  }, [desktop, openId, sess])
  // In the desktop app the window is frameless, so every branch is wrapped with
  // the custom title bar (and offset by its height) - the window is always
  // movable/closeable, even on the loading and no-access screens.
  const authed = !!(sess && sess.signedIn && sess.access)
  const frame = (content) => desktop
    ? <><WorkShell authed={authed} /><div style={{ paddingTop: 40 }}>{content}</div></>
    : content

  if (sess === undefined) return frame(<div style={{ ...shell, display: 'grid', placeItems: 'center' }}><Loader2 className="spin" /></div>)
  if (!sess.signedIn) { window.location.href = '/workcopilot'; return null }
  if (!sess.access) return frame(<NoAccess onSignOut={signOut} />)
  const user = sess.user
  if (openId) return frame(<><AppUpdateBanner /><GuardNotice note={guardNote} onClose={clearGuard} /><Console sessionId={openId} watchLight={!!((user && user.watchLight) || (sess && sess.watchLight))} onBack={() => { setOpenId(null); clearGuard() }} onGuard={showGuard} /></>)
  return frame(<><AppUpdateBanner /><GuardNotice note={guardNote} onClose={clearGuard} /><Home user={user} onOpen={openSession} onSignOut={signOut} /></>)
}
