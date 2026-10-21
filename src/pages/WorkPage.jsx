import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Check, X, Plus, LogOut, ChevronLeft, Trash2, Download, Monitor, Camera, Eye, HelpCircle, Square, Play, AlertTriangle, ClipboardCopy, Menu as MenuIcon, PictureInPicture2, Sun, Moon, ScanLine, Printer, Zap, ExternalLink, Globe, LayoutDashboard, BookOpen, ChevronRight, Sparkles, Rocket, Megaphone, Calculator, Scale, Compass, ServerCog, Blocks, Clock, Smartphone, AppWindow, ArrowRight, LifeBuoy, Users, FileText, CreditCard } from 'lucide-react'
import SupportTickets from '../components/SupportTickets.jsx'
import WorkTeam from './WorkTeam.jsx'
import AdmireVedaLogo, { AVMark } from '../components/AdmireVedaLogo.jsx'

const linkHost = (u) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return 'link' } }
import { api } from '../api.js'
import AnswerBody from '../components/AnswerBody.jsx'

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
      onAuthed(r.user)
    } catch (e2) { setErr(e2.message || 'Sign-in failed') } finally { setBusy(false) }
  }
  return (
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 16 }}>
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
      else if (r.ok && !r.hasVision) setErr('The key works, but it has no vision model, so WorkCoPilot cannot read a screen. Use a provider or model that can see images (Gemini, GPT-4o, Llama 4 Scout).')
      else setErr(r.error || 'Key test failed')
    } catch (e) { setErr(e.message || 'Failed') } finally { setBusy(false) }
  }
  if (!st) return null
  if (st.ready) return bare ? null : <div style={{ ...card, padding: 14, color: 'var(--brand-600)', fontWeight: 600 }}><Check size={15} style={{ verticalAlign: -2 }} /> AI is ready{st.platformAllowed ? '' : ` (${st.ownProvider})`}</div>
  if (st.platformAllowed) return <div style={{ ...card, padding: 14, color: 'var(--danger)' }}>The platform AI is not configured yet. Ask the administrator.</div>
  return (
    <div style={{ ...(bare ? {} : card), padding: bare ? 0 : 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <b>Add your AI key to start</b>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>WorkCoPilot reads your screen, so the key needs a vision model (Gemini, GPT-4o, or Llama 4 Scout all work).</div>
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
function tierRank(t) { return ({ basic: 0, advanced: 1, premium: 2 })[t] != null ? ({ basic: 0, advanced: 1, premium: 2 })[t] : 0 }
function ScopeWizard({ goal, tier, onCancel, onReady }) {
  const [phase, setPhase] = useState('loading')   // loading | ask | error
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [txt, setTxt] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    api.workScope(goal).then((r) => {
      if (!alive) return
      const qs = (r && r.questions) || []
      if (!qs.length) { onReady([]); return }
      setQuestions(qs); setPhase('ask')
    }).catch((e) => { if (alive) { setErr((e && e.message) || 'Could not scope this.'); setPhase('error') } })
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
              ) : (
                <div className="wd-wiz-choices">
                  {(cur.kind === 'yesno' ? ['Yes', 'No'] : cur.options).map((o) => (
                    <button key={o} className="wd-wiz-choice" onClick={() => advance(o)}>{o}</button>
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
  --orb-1:rgba(57,211,255,.40);--orb-2:rgba(140,245,196,.32);--orb-op:.3;
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
  --orb-1:rgba(11,143,214,.16);--orb-2:rgba(14,159,110,.14);--orb-op:.5}
.wd *{box-sizing:border-box}
.wd h1,.wd h2,.wd h3{margin:0;color:var(--tx)}
.wd p{margin:0}
.wd :focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:10px}
.wd button{cursor:pointer}
.wd-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wd-bg .orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:var(--orb-op)}
.wd-bg .o1{width:45vw;height:45vw;left:-14vw;top:-18vw;background:radial-gradient(circle,var(--orb-1),transparent 65%)}
.wd-bg .o2{width:40vw;height:40vw;right:-12vw;top:20vh;background:radial-gradient(circle,var(--orb-2),transparent 65%)}

.wd-top{position:sticky;top:0;z-index:30;backdrop-filter:blur(16px);background:var(--ink);background:color-mix(in srgb,var(--ink) 80%,transparent);border-bottom:1px solid var(--line)}
.wd-top-in{max-width:1080px;margin:0 auto;padding:0 20px;height:62px;display:flex;align-items:center;gap:16px}
.wd-tabs{display:flex;gap:6px;margin-left:8px}
.wd-tabs button{display:inline-flex;align-items:center;gap:7px;background:none;border:none;color:var(--mut);font:inherit;font-size:14.5px;font-weight:600;padding:8px 13px;border-radius:10px;cursor:pointer;transition:color .15s,background .15s}
.wd-tabs button:hover{color:var(--tx)}
.wd-tabs button.on{color:var(--tx);background:var(--chip)}
.wd-top-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.wd-mins{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--em);border:1px solid var(--em-line);background:var(--em-fill);border-radius:999px;padding:5px 11px;white-space:nowrap}
.wd-mins.low{color:var(--warm);border-color:var(--warm-line);background:var(--warm-fill)}
.wd-mins.skel{color:transparent;min-width:84px;height:28px;border-color:transparent}
.wd-addtime{display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid var(--line);color:var(--tx);font:inherit;font-size:13px;font-weight:600;border-radius:10px;padding:7px 11px;cursor:pointer;transition:border-color .15s,background .15s}
.wd-addtime:hover{border-color:var(--em-line);background:var(--em-fill)}
.wd-signout{display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid var(--line);color:var(--tx);font:inherit;font-size:13.5px;border-radius:10px;padding:7px 12px;cursor:pointer;transition:border-color .15s}
.wd-signout:hover{border-color:var(--line-2)}

.wd-main{position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:34px 20px 70px}
.wd-hello h1{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(25px,3.6vw,38px);letter-spacing:-.02em}
.wd-hello h1 span{color:var(--mut);font-weight:600}
.wd-plan{display:inline-flex;align-items:center;gap:8px;color:var(--mut);font-size:14px;margin-top:9px;text-transform:capitalize}
.wd-plan-dot{width:8px;height:8px;border-radius:50%;background:var(--em);box-shadow:0 0 10px var(--em)}
.wd-plan-skel{height:15px;width:260px;max-width:70%;border-radius:7px;margin-top:11px;background:var(--track)}

.wd-buy{margin-top:18px;display:flex;gap:13px;align-items:flex-start;border:1px solid var(--em-line);background:var(--em-fill);border-radius:16px;padding:16px 18px}
.wd-buy .ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-buy h3{font-family:"Bricolage Grotesque";font-weight:700;font-size:16px;margin-bottom:5px}
.wd-buy p{color:var(--mut);font-size:13.5px}
.wd-buy p b{color:var(--tx)}
.wd-buy .x{margin-left:auto;background:none;border:none;color:var(--mut);padding:4px;border-radius:8px;flex-shrink:0}
.wd-buy .x:hover{color:var(--tx)}

/* Plan chooser (free signup needs a plan to guide) */
.wd-sub{margin-top:18px;border:1px solid var(--line);background:linear-gradient(180deg,var(--panel-2),var(--panel));border-radius:18px;padding:18px 18px 16px;box-shadow:var(--shadow)}
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

.wd-setup{margin-top:20px;border:1px solid var(--warm-line);background:var(--warm-fill);border-radius:16px;padding:16px}
.wd-setup-note{color:var(--warm);font-size:13.5px;margin-bottom:10px;font-weight:600}

.wd-start{margin-top:22px;background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:var(--shadow)}
.wd-start label{display:block;font-size:12.5px;color:var(--mut);font-weight:600;letter-spacing:.02em;margin-bottom:8px}
.wd-start textarea{width:100%;resize:vertical;min-height:84px;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:14px;color:var(--tx);font:inherit;font-size:16px;outline:none;transition:border-color .15s,box-shadow .15s}
.wd-start textarea::placeholder{color:var(--mut)}
.wd-start textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wd-start-row{display:flex;align-items:center;gap:14px;margin-top:12px;flex-wrap:wrap}
.wd-hint{color:var(--mut);font-size:13px;flex:1;min-width:180px}
.wd-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--warm),var(--warm-2));color:var(--cta-ink);border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 12px 30px -14px var(--warm-2);transition:transform .15s,box-shadow .15s,filter .15s}
.wd-cta:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.04)}
.wd-cta:active:not(:disabled){transform:translateY(0)}
.wd-cta:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}

.wd-catwrap{margin-top:28px}
.wd-catlabel{font-size:12.5px;color:var(--mut);font-weight:600;letter-spacing:.02em;margin-bottom:12px}
.wd-cats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.wd-cat{text-align:left;background:linear-gradient(180deg,var(--card-a),var(--card-b));border:1px solid var(--line);border-radius:15px;padding:16px;cursor:pointer;font:inherit;color:var(--tx);display:flex;flex-direction:column;gap:6px;transition:transform .15s,border-color .2s,box-shadow .2s}
.wd-cat:hover:not(:disabled){transform:translateY(-3px);border-color:var(--em-line);box-shadow:var(--shadow-sm)}
.wd-cat:disabled{opacity:.5;cursor:default}
.wd-cat-ic{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:11px;background:var(--em-fill-2);color:var(--em);margin-bottom:4px}
.wd-cat.t-c .wd-cat-ic{color:var(--warm);background:var(--warm-fill)}
.wd-cat.t-d .wd-cat-ic{color:var(--violet);background:color-mix(in srgb,var(--violet) 15%,transparent)}
.wd-cat.t-e .wd-cat-ic{color:var(--rose);background:color-mix(in srgb,var(--rose) 15%,transparent)}
.wd-cat-label{font-family:"Bricolage Grotesque";font-weight:700;font-size:15px}
.wd-cat-sample{color:var(--mut);font-size:12.5px;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}

.wd-sessions{margin-top:36px}
.wd-sec-head{display:flex;align-items:baseline;gap:10px;margin-bottom:14px}
.wd-sessions h2,.wd-apps h2{font-family:"Bricolage Grotesque";font-weight:800;font-size:22px;letter-spacing:-.01em}
.wd-sec-count{font-size:13px;color:var(--mut);font-weight:600}
.wd-sess-list{display:flex;flex-direction:column;gap:10px}
.wd-sess{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;transition:border-color .2s}
.wd-sess:hover{border-color:var(--line-2)}
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
.wd-empty{border:1px dashed var(--line-2);border-radius:14px;padding:26px 20px;display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,var(--card-a),transparent)}
.wd-empty .ic{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
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
 .wd-apps-grid{grid-template-columns:1fr}
 .wd-help{grid-template-columns:1fr}
 .wd-help-nav{position:static;flex-direction:row;flex-wrap:wrap;gap:6px;margin-bottom:10px}
 .wd-help-nav .wd-help-navlabel{width:100%}
 .wd-help-nav button.on{box-shadow:inset 0 -2px 0 var(--em)}
}
@media(max-width:620px){
 .wd-main{padding:26px 16px 64px}
 .wd-top-in{padding:0 16px;gap:10px}
 .wd-tabs{margin-left:2px}
 .wd-tabs button{padding:8px 10px}
 .wd-tabs button span{display:none}
 .wd-cats{grid-template-columns:1fr}
 .wd-cta{width:100%}
}
@media(max-width:420px){
 .wd-addtime span,.wd-signout span{display:none}
 .wd-top-right{gap:8px}
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
.wd-wiz-q{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:21px;line-height:1.3;color:var(--tx);margin-bottom:18px}
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

function Home({ user, onOpen, onSignOut }) {
  const [tab, setTab] = useState('dashboard')
  const [ready, setReady] = useState(false)
  const [scoping, setScoping] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessLoaded, setSessLoaded] = useState(false)
  const [appStatus, setAppStatus] = useState(null)
  const [usage, setUsage] = useState(null)
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [showBuy, setShowBuy] = useState(false)
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
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap'
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
  const create = async (g) => {
    if (!ready) return
    setBusy(true)
    try { const r = await api.workCreate({ goal: (typeof g === 'string' ? g : goal).trim() || null }); onOpen(r.session.id) }
    catch (e) {
      setBusy(false)
      if (e && e.status === 402) setNeedsSub(true)   // no plan: surface the chooser
    }
  }
  // The plan phase is a short scoping wizard (forced). "Start guiding me" opens
  // it; the answers are stored on the session and folded into the plan.
  const tier = (usage && usage.tier) || 'basic'
  const beginScope = () => { if (!ready || busy || !goal.trim()) return; setScoping(true) }
  const runWithScope = async (answers) => {
    setScoping(false); setBusy(true)
    try { const r = await api.workCreate({ goal: goal.trim(), scope: answers || [] }); onOpen(r.session.id) }
    catch (e) { setBusy(false); if (e && e.status === 402) setNeedsSub(true) }
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
  const del = async (id) => { try { await api.workDelete(id); load() } catch {} }
  const pickCat = (c) => { setGoal(c.sample); setTab('dashboard'); setTimeout(() => goalRef.current && goalRef.current.focus(), 60) }
  const minsLeft = usage ? Math.ceil((usage.remainingSeconds || 0) / 60) : null
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')
  const planName = cap((user && user.subscription && user.subscription.plan) || (usage && usage.tier) || '') || 'Active'
  const low = !!usage && (usage.exhausted || (usage.remainingSeconds != null && usage.remainingSeconds <= 900))

  return (
    <div className="wd">
      <style>{WD_CSS}</style>
      <div className="wd-bg" aria-hidden><span className="orb o1" /><span className="orb o2" /></div>

      <header className="wd-top">
        <div className="wd-top-in">
          <AdmireVedaLogo size={24} idSuffix="wd" />
          <nav className="wd-tabs" aria-label="Sections">
            <button className={tab === 'dashboard' ? 'on' : ''} aria-current={tab === 'dashboard' ? 'page' : undefined} onClick={() => setTab('dashboard')}><LayoutDashboard size={16} /> <span>Dashboard</span></button>
            <button className={tab === 'help' ? 'on' : ''} aria-current={tab === 'help' ? 'page' : undefined} onClick={() => setTab('help')}><BookOpen size={16} /> <span>How-to</span></button>
            <button className={tab === 'support' ? 'on' : ''} aria-current={tab === 'support' ? 'page' : undefined} onClick={() => setTab('support')}><LifeBuoy size={16} /> <span>Support</span></button>
            {user.companyRole === 'company_admin' && (
              <button className={tab === 'team' ? 'on' : ''} aria-current={tab === 'team' ? 'page' : undefined} onClick={() => setTab('team')}><Users size={16} /> <span>Team</span></button>
            )}
          </nav>
          <div className="wd-top-right">
            {usage == null
              ? <span className="wd-mins skel" aria-hidden />
              : minsLeft != null && <span className={`wd-mins${low ? ' low' : ''}`} title={`${usage.tier} plan`}>{low ? <AlertTriangle size={13} /> : <Clock size={13} />} {minsLeft} min left</span>}
            <button className="wd-addtime" onClick={() => setShowBuy((v) => !v)} aria-expanded={showBuy}><Zap size={14} /> <span>Add time</span></button>
            <button className="wd-signout" onClick={onSignOut}><LogOut size={15} /> <span>Sign out</span></button>
          </div>
        </div>
      </header>

      <main className="wd-main">
        {tab === 'dashboard' ? (
          <>
            <div className="wd-hello">
              <h1>Hi {user.displayName || user.username}. <span>What are we getting done?</span></h1>
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

            {isAdmin && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '0 0 18px', padding: '11px 14px', borderRadius: 12, background: 'rgba(10,134,207,.08)', border: '1px solid rgba(10,134,207,.28)', fontSize: 13.5 }}>
                <LayoutDashboard size={16} style={{ color: '#0a86cf', flexShrink: 0 }} />
                <span>You have administrator access, so live guidance is unlocked for you. <a href="/work/admin" style={{ color: '#0a86cf', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Open the admin console</a></span>
              </div>
            )}

            {needsSub && (
              <div className="wd-sub" role="note">
                <div className="wd-sub-head">
                  <span className="ic"><Rocket size={18} /></span>
                  <div>
                    <h3>Choose a plan to start</h3>
                    <p>Your account is ready. Pick a plan to unlock live guidance. You can change or cancel anytime, and your daily guided hours reset at 11:59 PM ET.</p>
                  </div>
                </div>
                <div className="wd-sub-plans">
                  {PLAN_META.map((p) => (
                    <button key={p.id} className={`wd-sub-plan${p.id === 'advanced' ? ' pop' : ''}`} disabled={!!subBusy} onClick={() => startCheckout(p.id)}>
                      {p.id === 'advanced' && <span className="tag">Most popular</span>}
                      <span className="nm">{p.name}</span>
                      <span className="pr">{pricing ? money(pricing.plans[p.id]) : ''}<i>/mo</i></span>
                      <span className="hr">{p.hrs} hours a day</span>
                      <span className="go">{subBusy === p.id ? <Loader2 size={15} className="spin" /> : <>Choose {p.name} <ArrowRight size={14} /></>}</span>
                    </button>
                  ))}
                </div>
                {subErr && <div className="wd-sub-err"><AlertTriangle size={14} /> {subErr}</div>}
                <div className="wd-sub-note">On a team plan? If your company covers WorkCoPilot, ask your administrator to add you and guidance unlocks automatically.</div>
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13.5 }}>
                  Not ready to subscribe? <a href="/demo" style={{ color: '#0a86cf', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>See exactly how it works in the demo</a>
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

            {!ready && <div className="wd-setup"><div className="wd-setup-note">Set up your AI once to begin. It is used to read your screen and guide you.</div><AiSetup onReady={setReady} /></div>}

            <div className="wd-start">
              <label htmlFor="wd-goal">Your goal</label>
              <textarea id="wd-goal" ref={goalRef} rows={3} placeholder="What do you want to get done? Type or paste the task, the ticket, or the requirement. Anything, any field." value={goal} onChange={(e) => setGoal(e.target.value)} />
              <div className="wd-start-row">
                <span className="wd-hint">{ready ? 'WorkCoPilot plans it, then guides you step by step.' : 'Set up your AI above to begin.'}</span>
                <button className="wd-cta" disabled={!ready || busy || !goal.trim()} onClick={beginScope}>{busy ? <Loader2 size={15} className="spin" /> : <Play size={16} />} Start guiding me</button>
              </div>
            </div>

            <div className="wd-catwrap">
              <div className="wd-catlabel">Or start from a space</div>
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
              <div className="wd-sec-head">
                <h2>Pick up where you left off</h2>
                {sessLoaded && sessions.length > 0 && <span className="wd-sec-count">{sessions.length} saved</span>}
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
                          <div className="wd-sess-title">{s.goal || s.title}</div>
                          <div className="wd-sess-meta">{s.status === 'ended' ? 'Completed' : (cur ? `You were at: ${cur.text}` : 'Not started yet')} &middot; <span className="wd-sess-done">{done}/{tot}</span> steps{tot > 0 ? <> &middot; {pct}%</> : null}</div>
                          {tot > 0 && <div className="wd-sess-bar"><i style={{ width: `${pct}%` }} /></div>}
                        </div>
                        <button className="wd-resume" onClick={() => onOpen(s.id)}><span>{s.status === 'ended' ? 'Open' : 'Resume'}</span> <ArrowRight size={14} /></button>
                        <button className="wd-del" title="Delete session" aria-label="Delete session" onClick={() => del(s.id)}><Trash2 size={15} /></button>
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

            <div className="wd-apps">
              <div className="wd-sec-head"><h2>Use it your way</h2><span className="wd-sec-count">One subscription, all three</span></div>
              <div className="wd-apps-grid">
                <div className="wd-app">
                  <span className="wd-app-ic"><Monitor size={20} /></span>
                  <h3>Desktop app</h3><p>A quiet overlay on top of your work, with see-through and click-behind, hidden from screen shares.</p>
                  <a className={`wd-app-btn${appStatus?.desktop?.available ? '' : ' off'}`} href={appStatus?.desktop?.available ? '/api/work/app/desktop' : undefined} aria-disabled={appStatus?.desktop?.available ? undefined : 'true'}><Download size={14} /> {appStatus?.desktop?.available ? 'Download' : 'Soon'}</a>
                </div>
                <div className="wd-app feat">
                  <span className="wd-app-ribbon">No install</span>
                  <span className="wd-app-ic alt"><AppWindow size={20} /></span>
                  <h3>Browser overlay</h3><p>Nothing to install. Works on locked-down machines, right here in your browser. Share your whole screen to be guided through any app.</p>
                  <span className="wd-app-here"><Check size={13} /> You are using it now</span>
                </div>
                <div className="wd-app">
                  <span className="wd-app-ic"><Smartphone size={20} /></span>
                  <h3>Mobile app</h3><p>Point your phone camera at a screen, a device or paper, and get guided. Snap a photo or let it watch live.</p>
                  <a className={`wd-app-btn${appStatus?.android?.available ? '' : ' off'}`} href={appStatus?.android?.available ? '/api/work/app/android' : undefined} aria-disabled={appStatus?.android?.available ? undefined : 'true'}><Download size={14} /> {appStatus?.android?.available ? 'Download' : 'Soon'}</a>
                </div>
              </div>
            </div>
          </>
        ) : tab === 'support' ? (
          <div style={{ padding: '26px 20px', maxWidth: 1080, margin: '0 auto' }}><SupportTickets mode="user" /></div>
        ) : tab === 'team' && user.companyRole === 'company_admin' ? (
          <div style={{ padding: '26px 20px', maxWidth: 1080, margin: '0 auto' }}><WorkTeam /></div>
        ) : (
          <HelpDocs onStart={() => setTab('dashboard')} />
        )}
      </main>
      {scoping && <ScopeWizard goal={goal} tier={tier} onCancel={cancelScope} onReady={runWithScope} />}
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
  const [active, setActive] = useState('start')
  const jump = (id) => { setActive(id); const el = document.getElementById('help-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = HELP_SECTIONS.map((s) => document.getElementById('help-' + s.id)).filter(Boolean)
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id.replace('help-', ''))
    }, { rootMargin: '-82px 0px -62% 0px', threshold: 0 })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
  return (
    <div className="wd-help">
      <aside className="wd-help-nav">
        <div className="wd-help-navlabel">How-to guide</div>
        {HELP_SECTIONS.map((s) => <button key={s.id} className={active === s.id ? 'on' : ''} aria-current={active === s.id ? 'true' : undefined} onClick={() => jump(s.id)}>{s.t}</button>)}
        <button className="wd-help-start" onClick={onStart}><Play size={13} /> Start a task</button>
      </aside>
      <div className="wd-help-body">
        <h1>How to use WorkCoPilot</h1>
        <p className="wd-help-lead">An expert that watches your screen and tells you the exact next move, one step at a time, until the job is done. Here is everything it does and how to get the most from it.</p>

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
          <p>It watches in low-cost downscaled frames and only looks closely when the screen actually changes, so an idle screen costs you nothing. When it sees you take a wrong turn, it says so and corrects the step. You can press <b>Re-plan</b> at any time to rebuild the steps from what is on screen now.</p>
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
          <div className="wd-faq"><b>What if the steps are wrong for my screen?</b><p>It re-reads your screen and corrects as you go. You can also press Re-plan at any time to rebuild the steps.</p></div>
          <div className="wd-faq"><b>Does it type or click for me?</b><p>No. It only reads and guides. You stay in control of every action.</p></div>
          <div className="wd-faq"><b>What does it do with my screen?</b><p>Frames are downscaled and read only to guide the task. An unchanged screen is not sent at all.</p></div>
        </section>

        <div className="wd-help-cta"><button className="wd-cta" onClick={onStart}><Play size={16} /> Start a task</button></div>
      </div>
    </div>
  )
}

// ---- Console: the live step-then-watch copilot ----------------------------
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace'

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
      <pre style={{ margin: 0, padding: '10px 11px', background: '#0c1222', color: '#d6e9d6', fontSize: 12.5, lineHeight: 1.6, fontFamily: MONO, overflowX: 'auto', whiteSpace: 'pre' }}>
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
      <pre style={{ margin: 0, padding: '10px 11px', background: '#15151f', color: '#e6e6f2', fontSize: 12.5, lineHeight: 1.55, fontFamily: MONO, overflowX: 'auto', whiteSpace: 'pre' }}>{content}</pre>
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
  const wrap = { marginTop: 10, marginLeft: 2, paddingLeft: 12, borderLeft: '2px solid var(--brand-500)', display: 'flex', flexDirection: 'column', gap: 8 }
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
              {ss.url && <a className="btn btn-outline btn-sm" href={ss.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, textDecoration: 'none', display: 'inline-flex', gap: 5, alignItems: 'center' }}><ExternalLink size={13} /> Open {linkHost(ss.url)}</a>}
              {ss.commands && ss.commands.length > 0 && <CmdBlock lines={ss.commands} />}
              {ss.code && ss.code.content && <CodeBlock file={ss.code.file} content={ss.code.content} />}
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
            <label className="wc-dl-auto"><input type="checkbox" checked={autoOn} onChange={(e) => setAutoOn(e.target.checked)} /> Auto-capture — snap each page as I settle on it</label>
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
            <div className="wc-dl-prompt"><div className="ph"><b>Prompt 1 — current design, problems marked</b><button className="btn btn-ghost btn-sm" onClick={() => copy('p1', d.promptIssues)}>{copied === 'p1' ? 'Copied' : 'Copy'}</button></div><pre>{d.promptIssues}</pre></div>
            <div className="wc-dl-prompt"><div className="ph"><b>Prompt 2 — recommended corrected design</b><button className="btn btn-ghost btn-sm" onClick={() => copy('p2', d.promptTarget)}>{copied === 'p2' ? 'Copied' : 'Copy'}</button></div><pre>{d.promptTarget}</pre></div>
            <div className="wc-dl-actions">
              <button className="btn btn-outline" onClick={() => setResult(null)}>Capture more</button>
              <button className="btn btn-outline" onClick={download}><Download size={15} /> Markdown</button>
              <button className="btn btn-primary" onClick={() => window.open(api.workDeliverablesPdfUrl(sessionId, true), '_blank')}><Download size={15} /> Download PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Console({ sessionId, onBack }) {
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
  const noteStrong = (r) => { if (r && r.escalated) { setStrongUsed(true); setTimeout(() => setStrongUsed(false), 5000) } }

  // Usage metering (Phase 1): remaining minutes, daily cap, pause.
  const [usage, setUsage] = useState(null)
  const [paused, setPaused] = useState(false)
  const [dismissedLow, setDismissedLow] = useState(false)
  const applyUsage = (u) => { setUsage(u); if (u && u.remainingSeconds > 900) setDismissedLow(false) }   // re-arm the warning after buying more
  const refreshUsage = useCallback(async () => { try { applyUsage(await api.workUsage()) } catch {} }, [])
  useEffect(() => { refreshUsage() }, [refreshUsage])
  const outOfMinutes = () => { if (usage && usage.exhausted) { setErr('Out of minutes for today. Buy more time, or it resets at 11:59 PM ET.'); return true } return false }

  // Guide style (mode): stepwise | beginner | architect | debug. The list comes
  // from the server so there is one source of truth.
  const [mode, setMode] = useState('stepwise')
  const [modes, setModes] = useState([])
  useEffect(() => { api.workModes().then((r) => setModes(r.modes || [])).catch(() => {}) }, [])
  const changeMode = async (m) => { setMode(m); try { await api.workSetMode(sessionId, m) } catch {} }

  const [clickThrough, setClickThrough] = useState(false)
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null

  // Float overlay for WEB users (no install): the browser-native Document
  // Picture-in-Picture window floats the steps on top of whatever app the
  // user is working in, so they never tab back and forth to this console.
  const [pipWin, setPipWin] = useState(null)
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
  const FLOAT_CSS = 'body{margin:0;font-family:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}*{box-sizing:border-box}button{font:inherit;cursor:pointer}button:disabled{opacity:.55;cursor:default}input{font:inherit}input::placeholder{opacity:.6}@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-thumb{background:#8884;border-radius:6px}'
  const openFloat = async () => {
    try {
      let w
      if (pipSupported) {
        w = await window.documentPictureInPicture.requestWindow({ width: 410, height: 580 })
      } else {
        w = window.open('', 'workcopilot_float', 'width=410,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes')
        if (!w) { setErr('Your browser blocked the floating window. Allow pop-ups for this site, or use Chrome, Edge, Brave or Opera for a true always-on-top overlay.'); return }
        try { w.document.title = 'WorkCoPilot' } catch {}
        try { if (!w.document.body) w.document.write('<!doctype html><body></body>') } catch {}
      }
      const st = w.document.createElement('style')
      st.textContent = FLOAT_CSS
      w.document.head.appendChild(st)
      w.addEventListener('pagehide', () => setPipWin(null))
      w.addEventListener('beforeunload', () => setPipWin(null))
      setPipWin(w)
    } catch (e) { setErr('Could not open the floating window: ' + (e.message || e)) }
  }
  const closeFloat = () => { try { pipWin && pipWin.close() } catch {} ; setPipWin(null) }
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
  const photoInputRef = useRef(null)    // hidden camera file input for the mobile Photo path
  const photoFrameRef = useRef(null)    // mirror of photoFrame for synchronous reads in grabFrame

  const refresh = useCallback(async () => {
    try { const r = await api.workGet(sessionId); setSess(r.session); if (r.session && r.session.goal != null) setGoal(r.session.goal || ''); if (r.session && r.session.guidance) setGuidance(r.session.guidance); if (r.session && r.session.mode) setMode(r.session.mode); if (r.session) setPaused(!!r.session.paused) } catch {}
  }, [sessionId])
  useEffect(() => { refresh() }, [refresh])

  const stopCapture = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (streamRef.current) { try { streamRef.current.getTracks().forEach((t) => t.stop()) } catch {} ; streamRef.current = null }
    setWatching(false); setCapturing(false)
  }, [])
  useEffect(() => () => stopCapture(), [stopCapture])   // cleanup on unmount

  const startCapture = async () => {
    setErr('')
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
  // Ctrl+Alt+M in the shell), restart screen capture so the new monitor is read
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

  const plan = async () => {
    if (outOfMinutes()) return
    setBusy(true); setErr('')
    try {
      let frame = null
      if (!capturing && !photoFrameRef.current) { const okCap = await startCapture(); if (!okCap) { setBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
      frame = grabFrame()
      const r = await api.workPlan(sessionId, { goal: goal.trim(), frame, mode })
      noteStrong(r); setSess(r.session); setGuidance(''); setHowTo({})
      if (r.refusal) { setErr(r.refusal); return }   // declined at goal entry (not supported)
      // Start the continuous guide right away - the user should never have to
      // find and press a button to make it watch and update the instructions.
      if (r.session && Array.isArray(r.session.steps) && r.session.steps.length && (!r.session.status || r.session.status !== 'ended')) {
        setTimeout(() => { startWatching() }, 150)
      }
    } catch (e) { setErr(e.message || 'Could not build the plan') } finally { setBusy(false) }
  }

  // The watch loop: every few seconds, grab a frame; only SEND it when the
  // screen changed (or a 20s heartbeat), so an idle screen costs nothing.
  const tick = useCallback(async () => {
    if (busyTickRef.current || !videoRef.current) return
    const sig = signatureFromVideo(videoRef.current)
    const now = Date.now()
    const isChange = changed(sigRef.current, sig)
    const heartbeat = now - lastSentRef.current > 20000
    if (!isChange && !heartbeat) return
    sigRef.current = sig
    const frame = grabFrame(); if (!frame) return
    busyTickRef.current = true
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
    if (!capturing) { const ok = await startCapture(); if (!ok) return; await new Promise((r) => setTimeout(r, 400)) }
    setWatching(true); sigRef.current = null; lastSentRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(tick, 4000)
    tick()
  }
  const pauseWatching = () => { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

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
  const togglePause = async () => {
    const np = !paused
    setPaused(np)
    if (np) pauseWatching()
    try { await api.workPause(sessionId, np) } catch {}
  }

  const ask = async (qText) => {
    // Called both from onClick (passes an event) and from the Float panel
    // (passes a string). Only treat a string argument as the question text.
    const q = (typeof qText === 'string' ? qText : question).trim()
    if (!q) return
    if (outOfMinutes()) return
    setBusy(true); setErr(''); setAnswer('')
    try {
      if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
      const frame = grabFrame()
      const r = await api.workAsk(sessionId, { question: q, frame })
      noteStrong(r); setAnswer(r.answer || ''); if (typeof qText !== 'string') setQuestion('')
    } catch (e) { setErr(e.message || 'Could not answer') } finally { setBusy(false) }
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
      const frame = grabFrame()
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
          if (w.flag) setFlags((fl) => [{ t: Date.now(), text: w.flag }, ...fl].slice(0, 6))
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

  const setStep = async (i, st) => { try { const r = await api.workStep(sessionId, i, st); setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s) } catch {} }

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
      try { frame = grabFrame() } catch { frame = null }
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

  const steps = (sess && sess.steps) || []
  const done = steps.length > 0 && steps.every((x) => x.status === 'done')

  return (
    <div className="wc" style={{ ...shell, padding: '16px 16px 60px' }}>
      <style>{CONSOLE_CSS}</style>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, rowGap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { stopCapture(); onBack() }}><ChevronLeft size={15} /> Back</button>
          <div style={{ flex: 1 }} />
          {usage && <span style={{ fontSize: 12, fontWeight: 600, color: usage.exhausted ? 'var(--danger)' : 'var(--text-dim)' }} title={`${usage.tier} plan, resets ${usage.resetLabel}`}>{Math.ceil((usage.remainingSeconds || 0) / 60)} min left</span>}
          {usage && usage.exhausted && <button className="btn btn-primary btn-sm" disabled title="Buying time arrives in the billing phase">Buy time</button>}
          {sess && <button className={`btn btn-sm ${paused ? 'btn-primary' : 'btn-ghost'}`} onClick={togglePause} title={paused ? 'Resume: your minutes count again once you watch' : 'Pause: freeze your minutes while you do other work'}>{paused ? 'Resume' : 'Pause'}</button>}
          {desktop && (
            <>
              <button className="btn btn-ghost btn-sm" title="Cycle overlay transparency" onClick={() => { try { desktop.setOpacity(0.6) } catch {} }}>See-through</button>
              <button className={`btn btn-sm ${clickThrough ? 'btn-primary' : 'btn-ghost'}`} title="Let clicks pass through to the app behind (Ctrl+Alt+W)" onClick={() => { const n = !clickThrough; setClickThrough(n); try { desktop.setClickThrough(n) } catch {} }}>Interact behind: {clickThrough ? 'on' : 'off'}</button>
            </>
          )}
          {floatCapable && (pipWin
            ? <button className="btn btn-primary btn-sm" title="Close the floating window" onClick={closeFloat}><PictureInPicture2 size={14} /> {pipSupported ? 'Unfloat' : 'Close pop-out'}</button>
            : <button className="btn btn-outline btn-sm" title={pipSupported ? 'Float the steps on top of your work (Chrome, Edge, Brave, Opera)' : 'Pop the steps out into a separate window (Firefox, Safari)'} onClick={openFloat}><PictureInPicture2 size={14} /> {pipSupported ? 'Float on top' : 'Pop out'}</button>)}
          {sess && <button className="btn btn-ghost btn-sm" title="Deep pass: run this one screenshot on the stronger model and weave the result back into your steps, then carry on with the fast model." onClick={() => analyze(question, true)} disabled={busy}><Zap size={14} /> Deep pass</button>}
          {sess && <button className="btn btn-ghost btn-sm" title="Review what is on screen (a diagram, an architecture, a config) and get two generation prompts plus a document" onClick={() => setDeliverOpen(true)}><FileText size={14} /> Review &amp; prompts</button>}
          {strongUsed && <span style={{ fontSize: 11, color: 'var(--brand-600)' }} title="A stronger model was just used on this frame"><Zap size={11} style={{ verticalAlign: -2 }} /> stronger model</span>}
          {sess && <button className="btn btn-ghost btn-sm" title="Generate and download a PDF report of this session" onClick={() => window.open(api.workReportUrl(sessionId, true), '_blank')}><Download size={14} /> Report</button>}
          {sess && <button className="btn btn-ghost btn-sm" title="Open a printable report" onClick={() => window.open(api.workReportUrl(sessionId, false), '_blank')}><Printer size={14} /> Print</button>}
          {sess && <a className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }} href={api.workAuditUrl(sessionId)} download title="Download this session's audit log: exactly what was sent, line by line"><FileText size={14} /> Download audit log</a>}
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}><Eye size={12} style={{ verticalAlign: -2 }} /> {frames} frames sent</span>
          {sess && sess.status !== 'ended' && <button className="btn btn-outline btn-sm" onClick={finalize} disabled={busy}>End and summarize</button>}
        </div>
        {deliverOpen && <DeliverablesPanel sessionId={sessionId} grabFrame={grabFrame} videoRef={videoRef} onClose={() => setDeliverOpen(false)} />}

        {usage && usage.exhausted && (
          <div style={{ background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} /> <span style={{ flex: 1 }}>You are out of minutes for today. Buy more time, or it resets at 11:59 PM ET.</span>
          </div>
        )}
        {usage && !usage.exhausted && usage.remainingSeconds <= 900 && !dismissedLow && (
          <div style={{ background: 'var(--warn-bg, #fff6e6)', color: 'var(--warn-text, #8a5a00)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} /> <span style={{ flex: 1 }}>About {Math.ceil(usage.remainingSeconds / 60)} minutes left today. You can pause anytime, or top up to keep going.</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setDismissedLow(true)}>Dismiss</button>
          </div>
        )}

        <div style={{ ...card, padding: 14 }}>
          <label className="label" style={{ fontSize: 12, color: 'var(--text-dim)' }}>Your goal (type or paste)</label>
          <textarea className="input" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: '100%', resize: 'vertical', marginTop: 4 }} placeholder="Build an AWS VPC with two public and two private subnets and a NAT gateway." />
          <div className="wc-caprow" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            {!isMobile && <>
              <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Read from</label>
              <select className="select" value={source} onChange={(e) => { if (!capturing) setSource(e.target.value) }} disabled={capturing} style={{ width: 'auto' }}>
                <option value="screen">My screen</option>
                <option value="camera">Phone / camera</option>
              </select>
            </>}
            {desktop && source === 'screen' && <button className="btn btn-outline btn-sm" onClick={() => { try { desktop.pickMonitor && desktop.pickMonitor() } catch {} }} title="Choose which monitor WorkCoPilot watches (for a multi-monitor setup)">Choose monitor</button>}
            {isMobile && <button className="btn btn-outline btn-sm wc-grow" onClick={takePhoto} disabled={busy} title="Snap a photo of a screen, a device or paper with your camera, then Plan, Ask or Analyze reads it"><Camera size={14} /> {photoFrame ? 'Retake photo' : 'Photo'}</button>}
            <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Guide style</label>
            <select className="select" value={mode} onChange={(e) => changeMode(e.target.value)} style={{ width: 'auto' }}
              title={(modes.find((m) => m.id === mode) || {}).hint || ''}>
              {(modes.length ? modes : [{ id: 'stepwise', label: 'Step by step' }]).map((m) => (
                <option key={m.id} value={m.id} title={m.hint || ''}>{m.label}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={plan} disabled={busy || !goal.trim()}>{busy ? <Loader2 size={14} className="spin" /> : null} {steps.length ? 'Re-plan' : 'Plan the steps'}</button>
            {steps.length > 0 && (watching
              ? <button className="btn btn-danger btn-sm" onClick={pauseWatching}><Square size={14} /> Pause watching</button>
              : <button className="btn btn-outline btn-sm" onClick={startWatching} disabled={done}><Play size={14} /> {done ? 'All done' : 'Watch me'}</button>)}
          </div>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{err}</div>}
          {source === 'screen' && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>Frames are downscaled to 1280px and sent only when the screen changes, so watching costs a few cents an hour. Share your <b>whole screen</b> (not just a tab) to be guided through an IDE, a terminal or any other desktop app; the Float window stays on top of them.</div>}
          {source === 'camera' && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{isMobile ? 'Tap Photo to snap the screen, device or paper you need help with, then Plan, Ask or Analyze reads that shot. Or tap Watch me to let the camera watch live.' : 'Point the back camera at the screen, device or paper you need help with. It reads a downscaled frame only when the view changes, so it costs a few cents an hour.'}</div>}
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoPicked} style={{ display: 'none' }} />
          {photoFrame && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <img src={photoFrame} alt="Captured photo" style={{ width: 92, height: 69, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1, minWidth: 0 }}>Photo ready. Plan, Ask and Analyze use this shot. Retake to update it.</div>
              <button className="btn btn-ghost btn-sm" onClick={clearPhoto} title="Remove this photo"><X size={14} /> Clear</button>
            </div>
          )}
        </div>

        {/* Always mounted so the capture ref exists; shown as a live viewfinder
            only for the phone/camera source so you can aim it. The screen source
            is your own screen, so it stays hidden. */}
        <video ref={videoRef} muted playsInline
          style={source === 'camera' && capturing
            ? { display: 'block', width: '100%', maxWidth: 360, margin: '12px auto 0', borderRadius: 12, background: '#000', aspectRatio: '4 / 3', objectFit: 'cover' }
            : { display: 'none' }} />
        {source === 'camera' && capturing && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Live camera. Aim it at what you need help with.</div>}

        {watching && <div style={{ fontSize: 12, color: 'var(--brand-600)', margin: '10px 2px', display: 'flex', alignItems: 'center', gap: 6 }}><span className="spin" style={{ display: 'inline-flex' }}><Loader2 size={13} /></span> Reading {source === 'screen' ? 'your screen' : 'the camera'} and updating as you go. {observation}</div>}

        {guidance && sess && sess.status !== 'ended' && !done && (
          <div style={{ ...card, padding: 14, marginTop: 10, borderColor: 'var(--brand-500)', background: 'var(--brand-50, var(--surface))' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, letterSpacing: 0.3 }}>DO THIS NOW {watching ? '' : '(press Watch me to keep it live)'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--brand-700, var(--brand-600))' }}>{guidance}</div>
            <HowButton open={!!(howTo.guidance && howTo.guidance.open)} loading={!!(howTo.guidance && howTo.guidance.loading)} onClick={() => drillHow('guidance', guidance)} />
            <HowDetail entry={howTo.guidance} onRetry={() => drillHow('guidance', guidance)} />
          </div>
        )}

        {steps.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((s, i) => {
              const isDone = s.status === 'done', isNow = s.status === 'current'
              const isPending = !isDone && !isNow
              // Show the whole roadmap, but grey out steps not reached yet and
              // keep their exact commands/code hidden until the step is active -
              // so the focus stays on the one step to do now.
              const reveal = isNow || isDone
              return (
                <div key={i} style={{ ...card, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', borderColor: isNow ? 'var(--brand-500)' : 'var(--border)', background: isNow ? 'var(--brand-50, var(--surface))' : 'var(--surface)', opacity: isPending ? 0.45 : 1 }}>
                  <button className="icon-btn" title={isDone ? 'Mark not done' : 'Mark done'} onClick={() => setStep(i, isDone ? 'current' : 'done')} style={{ color: isDone ? 'var(--success)' : 'var(--text-dim)', marginTop: 1 }}>
                    {isDone ? <Check size={17} /> : <Square size={16} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isNow ? 'var(--brand-600)' : 'inherit', fontWeight: isNow ? 600 : 400, textDecoration: isDone ? 'line-through' : 'none' }}>{s.text}</div>
                    {reveal && s.url && <a className="btn btn-outline btn-sm" href={s.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, textDecoration: 'none', display: 'inline-flex', gap: 5, alignItems: 'center' }}><ExternalLink size={13} /> Open {linkHost(s.url)}</a>}
                    {reveal && s.commands && s.commands.length > 0 && <CmdBlock lines={s.commands} />}
                    {reveal && s.code && s.code.content && <CodeBlock file={s.code.file} content={s.code.content} />}
                    {isNow && s.validate && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}><Eye size={11} style={{ verticalAlign: -1 }} /> done when: {s.validate}</div>}
                    <HowButton open={!!(howTo['step-' + i] && howTo['step-' + i].open)} loading={!!(howTo['step-' + i] && howTo['step-' + i].loading)} onClick={() => drillHow('step-' + i, s.text, i)} />
                    <HowDetail entry={howTo['step-' + i]} onRetry={() => drillHow('step-' + i, s.text, i)} />
                  </div>
                </div>
              )
            })}
            {done && sess && sess.status !== 'ended' && <div style={{ color: 'var(--success)', fontWeight: 600, padding: '4px 2px' }}><Check size={16} style={{ verticalAlign: -3 }} /> Every step is confirmed on screen. End and summarize when you are ready.</div>}
          </div>
        )}

        {flags.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {flags.map((f) => (
              <div key={f.t} style={{ background: 'var(--warn-bg, #fff6e6)', color: 'var(--warn-text, #8a5a00)', borderRadius: 10, padding: '8px 10px', fontSize: 13, display: 'flex', gap: 8 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{f.text}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...card, padding: 14, marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}><HelpCircle size={15} style={{ verticalAlign: -2 }} /> {source === 'camera' ? 'Take a photo and ask' : 'Ask or analyze this screen'}</div>
          <div className="wc-askrow" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder={source === 'camera' ? 'Type your question about what the camera sees (optional)' : 'Ask a question, or type what to analyze (leave blank for a full read)'} value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
            <button className="btn btn-outline" onClick={ask} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : null} Ask</button>
            <button className="btn btn-outline" onClick={() => analyze(question)} disabled={busy} title={source === 'camera' ? 'Take a photo now and answer your question about it, in the context of your goal' : 'Take a screenshot now and analyze it. Type what to analyze above, or leave blank for a full read.'}>{source === 'camera' ? <><Camera size={14} /> Photo</> : <><ScanLine size={14} /> Analyze</>}</button>
            <button className="btn btn-outline" onClick={() => doResearch(question)} disabled={busy} title="Look up the latest on the web, then answer (only runs when you tap it)."><Globe size={14} /> Research</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{source === 'camera' ? 'Photo snaps what the camera sees now and answers your question about it, tied to your goal and steps.' : 'Analyze screenshots the screen now and reads it; add a prompt above to focus it (for example "check this IAM policy for risky permissions").'} It uses the whole session: your goal, the plan and recent notes.</div>
          {answer && <div style={{ marginTop: 10, fontSize: 14 }}><AnswerBody text={answer} /></div>}
        </div>

        {sess && sess.status === 'ended' && sess.summary && (
          <div style={{ ...card, padding: 14, marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Session summary</div>
            <AnswerBody text={sess.summary} />
          </div>
        )}
      </div>

      {pipWin && createPortal(
        <FloatPanel
          steps={steps} watching={watching} observation={observation} guidance={guidance}
          flags={flags} answer={answer} busy={busy} err={err}
          done={done} floatQ={floatQ} setFloatQ={setFloatQ}
          theme={floatTheme} onToggleTheme={() => setFloatTheme((t) => t === 'light' ? 'dark' : 'light')}
          usage={usage} paused={paused} onPause={togglePause}
          onDeep={() => analyze(floatQ.trim(), true)}
          onResearch={() => doResearch(floatQ.trim())}
          onAsk={(q) => { ask(q); setFloatQ('') }}
          onAnalyze={analyze}
          onStep={setStep}
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
function FloatPanel({ steps, watching, observation, guidance, flags, answer, busy, err, done, floatQ, setFloatQ, theme = 'dark', onToggleTheme, usage, paused, onPause, onDeep, onResearch, onAsk, onAnalyze, onStep, onWatch, onClose }) {
  const current = steps.find((s) => s.status === 'current')
  // Dim the panel to cut glare over your work. The browser will not let a web
  // Picture-in-Picture window be see-through to the app behind it, so this
  // fades the panel itself; for true see-through + click-behind use the app.
  const DIM_LEVELS = [1, 0.85, 0.65, 0.45]
  const [dim, setDim] = useState(1)
  const cycleDim = () => setDim((d) => DIM_LEVELS[(DIM_LEVELS.indexOf(d) + 1) % DIM_LEVELS.length] || 1)

  const light = theme === 'light'
  const c = light
    ? { panel: '#ffffff', border: '#e6e8f1', text: '#1b1b26', dim: '#6b6b7b', accent: '#5b4bff', accentSoft: 'rgba(91,75,255,0.08)', good: '#16a34a', inputBg: '#f3f4f9', flagBg: '#fff4e0', flagText: '#8a5a00', chip: '#eef0f7' }
    : { panel: '#171722', border: '#2a2a3c', text: '#e8e8f2', dim: '#9696ad', accent: '#8b7cff', accentSoft: 'rgba(124,108,255,0.14)', good: '#35d07f', inputBg: '#0e0e18', flagBg: '#3a2e12', flagText: '#ffd27a', chip: '#20202e' }

  const wrap = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100vh', opacity: dim, color: c.text }
  const box = { background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: 11 }
  const iconBtn = { background: 'transparent', color: c.dim, border: 'none', borderRadius: 7, padding: 5, display: 'inline-flex', alignItems: 'center' }
  const ghost = { background: c.chip, color: c.text, border: `1px solid ${c.border}`, borderRadius: 9, padding: '6px 10px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5 }
  const primary = { background: c.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.accent, display: 'inline-block', boxShadow: `0 0 8px ${c.accent}` }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <strong style={{ fontSize: 13, letterSpacing: 0.2 }}>WorkCoPilot</strong>
          {usage && <span style={{ fontSize: 11, color: usage.exhausted ? '#ff6b6b' : c.dim }}>{Math.ceil((usage.remainingSeconds || 0) / 60)}m left</span>}
        </div>
        <button style={{ ...iconBtn, color: paused ? c.accent : c.dim }} onClick={onPause} title={paused ? 'Resume' : 'Pause (freeze minutes)'}>{paused ? <Play size={15} /> : <Square size={15} />}</button>
        <button style={iconBtn} onClick={onDeep} disabled={busy} title="Deep pass: run this one frame on the stronger model and weave it back into the steps, then continue on the fast model."><Zap size={15} /></button>
        <button style={iconBtn} onClick={onToggleTheme} title={light ? 'Switch to dark' : 'Switch to light'}>{light ? <Moon size={15} /> : <Sun size={15} />}</button>
        <button style={{ ...iconBtn, fontSize: 11, color: c.dim }} onClick={cycleDim} title="Dim the panel to cut glare (for true see-through, use the desktop app)">{Math.round(dim * 100)}%</button>
        <button style={iconBtn} onClick={onClose} title="Close overlay"><X size={16} /></button>
      </div>

      <button style={{ ...ghost, justifyContent: 'center', ...(watching ? { color: c.accent, borderColor: c.accent } : {}) }} onClick={onWatch}>{watching ? <><Square size={13} /> Pause watching</> : <><Play size={13} /> Watch me</>}</button>

      {watching && (
        <div style={{ fontSize: 12, color: c.accent, display: 'flex', gap: 5, alignItems: 'center' }}><Loader2 size={12} className="spin" /> Reading your screen. {observation}</div>
      )}

      {current ? (
        <div style={{ ...box, borderColor: c.accent, background: c.accentSoft }}>
          <div style={{ fontSize: 10.5, color: c.accent, marginBottom: 4, letterSpacing: 0.6, fontWeight: 700 }}>DO THIS NOW</div>
          <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.45 }}>{guidance || current.text}</div>
          {guidance && <div style={{ fontSize: 11.5, color: c.dim, marginTop: 5 }}>Step: {current.text}</div>}
          {!guidance && current.validate && <div style={{ fontSize: 11.5, color: c.dim, marginTop: 5 }}>Done when: {current.validate}</div>}
          {current.url && <a href={current.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 12.5, color: c.accent, textDecoration: 'none', border: `1px solid ${c.accent}`, borderRadius: 8, padding: '5px 9px' }}><ExternalLink size={13} /> Open {linkHost(current.url)}</a>}
          {current.commands && current.commands.length > 0 && <CmdBlock lines={current.commands} />}
          {current.code && current.code.content && <CodeBlock file={current.code.file} content={current.code.content} />}
          <button style={{ ...primary, marginTop: 10 }} onClick={() => onStep(steps.indexOf(current), 'done')}><Check size={14} /> Mark done</button>
        </div>
      ) : done ? (
        <div style={{ ...box, borderColor: c.good, color: c.good, display: 'flex', gap: 7, alignItems: 'center', fontWeight: 600 }}><Check size={16} /> All steps confirmed on screen.</div>
      ) : steps.length === 0 ? (
        <div style={{ ...box, color: c.dim, fontSize: 13 }}>Plan your steps in the main window, then they appear here.</div>
      ) : null}

      {steps.length > 0 && (
        <div style={{ ...box, maxHeight: 155, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {steps.map((s, i) => {
            const isDone = s.status === 'done', isNow = s.status === 'current'
            const isPending = !isDone && !isNow
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, opacity: isPending ? 0.5 : 1 }}>
                <button style={{ background: 'none', border: 'none', color: isDone ? c.good : c.dim, padding: 0, lineHeight: 1, marginTop: 1, cursor: 'pointer' }} onClick={() => onStep(i, isDone ? 'current' : 'done')} title={isDone ? 'Mark not done' : 'Mark done'}>{isDone ? <Check size={15} /> : <Square size={14} />}</button>
                <span style={{ color: isNow ? c.accent : c.text, fontWeight: isNow ? 600 : 400, textDecoration: isDone ? 'line-through' : 'none' }}>{s.text}</span>
              </div>
            )
          })}
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ background: c.flagBg, color: c.flagText, borderRadius: 10, padding: '8px 10px', fontSize: 12.5, display: 'flex', gap: 7 }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{flags[0].text}</span></div>
      )}

      <div style={box}>
        <div style={{ fontSize: 11.5, color: c.dim, marginBottom: 6, letterSpacing: 0.3 }}>ASK OR ANALYZE THIS SCREEN</div>
        <input
          style={{ width: '100%', background: c.inputBg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 9, padding: '8px 10px', outline: 'none' }}
          placeholder="Ask, or type what to analyze" value={floatQ}
          onChange={(e) => setFloatQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && floatQ.trim()) onAsk(floatQ.trim()) }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button style={{ ...primary, flex: 1, justifyContent: 'center' }} disabled={busy || !floatQ.trim()} onClick={() => floatQ.trim() && onAsk(floatQ.trim())}>{busy ? <Loader2 size={13} className="spin" /> : 'Ask'}</button>
          <button style={{ ...ghost, flex: 1, justifyContent: 'center' }} disabled={busy} onClick={() => onAnalyze(floatQ.trim())} title="Screenshot now and analyze. Type a focus above, or leave blank for a full read."><ScanLine size={13} /> Analyze</button>
          <button style={{ ...ghost, flex: 1, justifyContent: 'center' }} disabled={busy} onClick={onResearch} title="Look up the latest on the web, then answer (only when you tap it)."><Globe size={13} /> Research</button>
        </div>
        {answer && <div style={{ marginTop: 9, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{answer}</div>}
        {err && <div style={{ marginTop: 8, fontSize: 12, color: '#ff6b6b' }}>{err}</div>}
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
export default function WorkPage() {
  const [sess, setSess] = useState(undefined)   // undefined=loading; {signedIn, access, user}
  const [openId, setOpenId] = useState(null)
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
  if (sess === undefined) return <div style={{ ...shell, display: 'grid', placeItems: 'center' }}><Loader2 className="spin" /></div>
  if (!sess.signedIn) { window.location.href = '/workcopilot'; return null }
  if (!sess.access) return <NoAccess onSignOut={signOut} />
  const user = sess.user
  if (openId) return <><AppUpdateBanner /><Console sessionId={openId} onBack={() => setOpenId(null)} /></>
  return <><AppUpdateBanner /><Home user={user} onOpen={setOpenId} onSignOut={signOut} /></>
}
