import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, LogOut, Loader2, ArrowRight, ExternalLink } from 'lucide-react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useT } from '../i18n/index.jsx'

// ---------------------------------------------------------------------------
// LegalConsentGate - the unskippable first-login / re-consent gate.
//
// The owner's requirement: ANY account created a way other than the clickwrap
// signup (social login, company SSO, admin-created) and ANY existing user after
// the agreements change MUST explicitly accept the current agreements before
// using WorkCoPilot. The signup checkbox covers the email signup path; this gate
// covers everyone else, in ONE place.
//
// It reads the signed-in user from the auth context. The server sets
// `user.legalRequired === true` whenever acceptance is needed (new account that
// never accepted, or a version bump). When that is true we render a full-screen
// blocking modal over the whole app: the app behind it cannot be reached, the
// modal cannot be dismissed (no Escape, no backdrop click, no close button),
// and the only ways out are to accept or to sign out.
//
// On accept we call POST /api/work/legal/accept, then refresh the auth user via
// the context so `legalRequired` flips to false and the gate opens. Nothing here
// weakens the server backstop (guidance actions are 403-blocked until accepted);
// this is the primary, human UX for it.
//
// Design: self-contained, uses the app's global design tokens (light + dark via
// data-theme), centered, scrolls internally when tall, links wrap cleanly. No
// em-dashes, no AI-tell words, "WorkCoPilot" as one word.
// ---------------------------------------------------------------------------

// Fallback used ONLY if the manifest fetch fails - the server manifest is the
// single source of truth. The five core agreements apply to everyone; the DPA
// (business:true) is added for company/business accounts. `title` is the English
// default; the gate DISPLAYS t('workShell.legal.docs.<key>', title), keyed by the
// manifest doc key, so the server list and this fallback both render translated.
export const LEGAL_FALLBACK_DOCS = [
  { key: 'terms', title: 'Terms of Service', path: '/workcopilot/terms' },
  { key: 'privacy', title: 'Privacy Policy', path: '/workcopilot/privacy' },
  { key: 'acceptable-use', title: 'Acceptable Use Policy', path: '/workcopilot/acceptable-use' },
  { key: 'cookie-policy', title: 'Cookie Policy', path: '/workcopilot/cookie-policy' },
  { key: 'disclaimer', title: 'Disclaimer', path: '/workcopilot/disclaimer' },
]

// Manifest doc key ('acceptable-use') -> i18n leaf ('acceptableUse').
const docTitleKey = (key) => 'workShell.legal.docs.' + String(key || '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

export default function LegalConsentGate({ children }) {
  const t = useT()
  const { user, refresh, logout } = useAuth()
  const gated = !!(user && user.legalRequired)

  const [docs, setDocs] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const dialogRef = useRef(null)
  const checkRef = useRef(null)

  // A business/company account also sees the DPA; a personal account does not.
  const isBusiness = !!(user && (user.companyId || user.companyRole))

  // Load the manifest while the gate is up (server is the source of truth).
  useEffect(() => {
    if (!gated) return undefined
    let dead = false
    api.legalManifest()
      .then((r) => { if (!dead) setDocs((r && Array.isArray(r.docs) && r.docs) || LEGAL_FALLBACK_DOCS) })
      .catch(() => { if (!dead) setDocs(LEGAL_FALLBACK_DOCS) })
    return () => { dead = true }
  }, [gated])

  // Lock background scroll and move focus into the dialog while it is open.
  useEffect(() => {
    if (!gated) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tm = setTimeout(() => { try { (checkRef.current || dialogRef.current)?.focus() } catch { /* ignore */ } }, 30)
    return () => { document.body.style.overflow = prev; clearTimeout(tm) }
  }, [gated])

  if (!gated) return children

  const shown = (docs || LEGAL_FALLBACK_DOCS).filter((d) => !d.business || isBusiness)

  // Trap Tab within the dialog; swallow Escape so the gate cannot be dismissed.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return }
    if (e.key !== 'Tab') return
    const root = dialogRef.current
    if (!root) return
    const f = root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  const accept = async () => {
    if (!accepted || busy) return
    setBusy(true); setErr('')
    try {
      await api.legalAccept()
      await refresh()   // re-reads /api/work/me; legalRequired flips to false and the gate opens
      // If, for any reason, the refreshed user is still gated, keep the modal up
      // with an honest message rather than silently passing through.
    } catch (e2) {
      setErr((e2 && e2.message) || t('workShell.legal.errGeneric'))
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => { try { await logout() } catch { /* ignore */ } }

  return (
    <>
      {children}
      <div className="lcg-overlay" role="presentation">
        <style>{CSS}</style>
        <div
          className="lcg-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lcg-title"
          aria-describedby="lcg-desc"
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="lcg-ic" aria-hidden="true"><ShieldCheck size={22} /></div>
          <h2 id="lcg-title" className="lcg-title">{t('workShell.legal.title')}</h2>
          <p id="lcg-desc" className="lcg-desc">
            {t('workShell.legal.body')}
          </p>

          <ul className="lcg-docs" aria-label={t('workShell.legal.listAria')}>
            {shown.map((d) => (
              <li key={d.key}>
                <a href={d.path} target="_blank" rel="noopener noreferrer">
                  <span>{t(docTitleKey(d.key), d.title)}</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>

          <label className="lcg-accept" htmlFor="lcg-accept-cb">
            <input
              id="lcg-accept-cb"
              type="checkbox"
              ref={checkRef}
              checked={accepted}
              onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked && err) setErr('') }}
              aria-required="true"
            />
            <span>{t('workShell.legal.agree')}</span>
          </label>

          {err && <div className="lcg-err" role="alert">{err}</div>}

          <button type="button" className="lcg-cta" onClick={accept} disabled={!accepted || busy} aria-busy={busy}>
            {busy ? <Loader2 size={16} className="lcg-spin" aria-hidden="true" /> : null}
            {t('workShell.legal.cta')}
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          <button type="button" className="lcg-signout" onClick={signOut} disabled={busy}>
            <LogOut size={14} aria-hidden="true" /> {t('workShell.legal.signOut')}
          </button>
        </div>
      </div>
    </>
  )
}

const CSS = `
.lcg-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;
  background:rgba(10,12,24,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);overflow:auto}
.lcg-modal{box-sizing:border-box;width:100%;max-width:460px;max-height:calc(100vh - 40px);overflow:auto;
  background:var(--surface,#fff);color:var(--text,#1b2033);border:1px solid var(--border,#e7e9f2);
  border-radius:var(--r-lg,16px);box-shadow:0 30px 80px -24px rgba(10,12,24,.6);
  padding:26px 26px 20px;font-family:var(--font-sans,'Inter',system-ui,sans-serif);text-align:center;outline:none}
.lcg-ic{width:46px;height:46px;margin:0 auto 14px;display:grid;place-items:center;border-radius:var(--r-full,999px);
  background:var(--brand-soft,rgba(82,163,49,.12));color:var(--brand-500,#52a331)}
.lcg-title{margin:0 0 6px;font-size:21px;line-height:1.25;font-weight:800;color:var(--text,#1b2033)}
.lcg-desc{margin:0 0 16px;font-size:14px;line-height:1.5;color:var(--text-muted,#6b7191)}
.lcg-docs{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:8px;text-align:start}
.lcg-docs li{margin:0}
.lcg-docs a{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;box-sizing:border-box;
  padding:10px 13px;border-radius:var(--r-md,12px);border:1px solid var(--border,#e7e9f2);background:var(--surface-2,#f8f9fd);
  color:var(--text,#1b2033);font-size:14px;font-weight:600;text-decoration:none;transition:border-color .15s,background .15s}
.lcg-docs a span{min-width:0;overflow-wrap:anywhere}
.lcg-docs a svg{flex:none;color:var(--text-faint,#9aa0bd)}
.lcg-docs a:hover{border-color:var(--brand-500,#52a331);background:var(--brand-soft,rgba(82,163,49,.1))}
.lcg-accept{display:flex;gap:10px;align-items:flex-start;text-align:start;margin:0 0 14px;padding:12px 13px;
  border-radius:var(--r-md,12px);background:var(--surface-2,#f8f9fd);border:1px solid var(--border,#e7e9f2);
  font-size:13.5px;line-height:1.5;color:var(--text,#1b2033);cursor:pointer}
.lcg-accept input[type=checkbox]{flex:none;appearance:auto;-webkit-appearance:checkbox;width:18px;height:18px;min-width:18px;
  margin:1px 0 0;accent-color:var(--brand-500,#52a331);cursor:pointer}
.lcg-accept input[type=checkbox]:focus-visible{outline:2px solid var(--brand-500,#52a331);outline-offset:2px}
.lcg-err{margin:0 0 12px;font-size:13px;line-height:1.4;color:var(--danger,#f0384b);text-align:start}
.lcg-cta{width:100%;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  height:46px;padding:0 16px;border:none;border-radius:var(--r-md,12px);cursor:pointer;
  background:linear-gradient(135deg,var(--brand-500,#52a331),var(--brand-600,#468a29));color:#fff;
  font:inherit;font-weight:700;font-size:15px;box-shadow:0 14px 30px -14px var(--brand-600,#468a29);
  transition:transform .15s,filter .15s,box-shadow .15s}
.lcg-cta:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.05)}
.lcg-cta:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
.lcg-signout{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin:12px auto 0;padding:6px 10px;
  background:none;border:none;color:var(--text-muted,#6b7191);font:inherit;font-size:13px;font-weight:600;cursor:pointer;
  text-decoration:underline;text-underline-offset:3px;border-radius:8px}
.lcg-signout:hover:not(:disabled){color:var(--text,#1b2033)}
.lcg-signout:disabled{opacity:.6;cursor:default}
.lcg-modal a:focus-visible,.lcg-modal button:focus-visible{outline:2px solid var(--brand-500,#52a331);outline-offset:2px;border-radius:8px}
.lcg-spin{animation:lcg-spin 1s linear infinite}
@keyframes lcg-spin{to{transform:rotate(360deg)}}
@media (max-width:640px){
  .lcg-overlay{padding:12px}
  .lcg-modal{padding:20px 16px 16px;max-height:calc(100vh - 24px)}
  .lcg-title{font-size:19px}
}
`
