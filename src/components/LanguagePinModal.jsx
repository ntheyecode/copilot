// LanguagePinModal - first-login language attestation for a PAID user.
//
// Owner: "language is the key thing when communicating to users." On first login a
// paid user (active / trialing / comp) who has not yet pinned a language sees this
// once. It pre-selects the language we DETECTED, lets them pick any supported one
// (each shown in its OWN name, from the LOCALES registry), and explains that the
// choice sets BOTH the app language and the language of the emails we send. On
// confirm it POSTs /api/work/profile/language, applies the locale immediately, and
// records it as the highest-precedence signal (setPinnedUserLocale). It re-shows on
// every load until the language is pinned - there is no dismiss, this is a required
// attestation.
//
// It ALSO applies an already-pinned language on load (the always-mounted effect),
// so a returning signed-in user always sees their pinned language even before any
// other detection signal would resolve.
//
// Self-contained + on-brand (white in-product surface, brand green #0e9f6e /
// #0b8259, cyan #0a84c2, orange CTA #f26a43, Figtree). Design-time quality gate:
// renders clean at wide (~1280px) and narrow (~640px) - the language grid collapses
// to one column, long language names ellipsis instead of overflowing, the code
// chip never wraps, and the dialog scrolls internally rather than the page. Mirrors
// under <html dir="rtl"> via the locale's own dir.
import React, { useEffect, useRef, useState } from 'react'
import { Globe, Check, Loader2 } from 'lucide-react'
import { useLocale, setPinnedUserLocale } from '../i18n/index.jsx'

const IS_APP = typeof window !== 'undefined' && !!window.refigold
const PAID_STATUSES = new Set(['active', 'trialing', 'comp'])

export default function LanguagePinModal({ user, onPinned }) {
  const { locale, setLocale, t, locales, dir } = useLocale()
  const [selected, setSelected] = useState(locale)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const appliedRef = useRef(null)

  // Apply an ALREADY-pinned language on load (runs for every mounted state, pinned
  // or not), so a returning user is in their language. Guarded so it applies once
  // per distinct code and never fights a manual switch.
  useEffect(() => {
    const code = user && user.languagePinned ? user.language : null
    if (!code || appliedRef.current === code) return
    appliedRef.current = code
    setPinnedUserLocale(code)
    if (code !== locale) setLocale(code)
  }, [user, locale, setLocale])

  // Keep the pre-selection on the detected language until the user picks.
  useEffect(() => { setSelected(locale) }, [locale])

  const paid = !!(user && user.subscription && PAID_STATUSES.has(user.subscription.status))
  const show = paid && !(user && user.languagePinned)
  if (!show) return null

  const confirm = async () => {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (IS_APP) headers['X-Refigold-App'] = '1'
      const res = await fetch('/api/work/profile/language', {
        method: 'POST', credentials: 'include', headers, body: JSON.stringify({ language: selected }),
      })
      if (!res.ok) throw new Error('save-failed')
      // Apply immediately: the pinned signal (so detection honors it everywhere) and
      // the live locale (so the UI switches now), then refresh the signed-in user so
      // languagePinned flips true and this modal stops showing.
      setPinnedUserLocale(selected)
      setLocale(selected)
      if (onPinned) onPinned()
    } catch {
      setErr(t('languagePin.error'))
      setBusy(false)
    }
  }

  return (
    <div className="lpm-ov" role="presentation" dir={dir}>
      <style>{CSS}</style>
      <div className="lpm" role="dialog" aria-modal="true" aria-labelledby="lpm-title">
        <div className="lpm-head">
          <span className="lpm-badge"><Globe size={18} aria-hidden="true" /></span>
          <div className="lpm-head-tx">
            <h2 id="lpm-title" className="lpm-title">{t('languagePin.title')}</h2>
            <p className="lpm-intro">{t('languagePin.intro')}</p>
          </div>
        </div>
        <p className="lpm-note">{t('languagePin.note')}</p>
        <ul className="lpm-list" role="listbox" aria-label={t('languagePin.title')}>
          {locales.map((l) => {
            const on = l.code === selected
            return (
              <li
                key={l.code} role="option" aria-selected={on} lang={l.tag} dir={l.dir}
                className={`lpm-opt${on ? ' on' : ''}`} onClick={() => setSelected(l.code)}
              >
                <span className="lpm-opt-name">{l.name}</span>
                <span className="lpm-opt-code">{l.code.toUpperCase()}</span>
                {on && <Check size={15} aria-hidden="true" className="lpm-tick" />}
              </li>
            )
          })}
        </ul>
        {err && <div className="lpm-err" role="alert">{err}</div>}
        <div className="lpm-foot">
          <button type="button" className="lpm-cta" onClick={confirm} disabled={busy}>
            {busy ? <Loader2 size={16} className="lpm-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            <span>{busy ? t('languagePin.saving') : t('languagePin.confirm')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.lpm-ov{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;padding:20px;
  background:rgba(8,14,24,.5);backdrop-filter:blur(4px);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.lpm-ov *{box-sizing:border-box}
.lpm{--lpm-tx:#161a2b;--lpm-mut:#5c6484;--lpm-line:#e6e8f1;--lpm-panel:#ffffff;--lpm-em:#0e9f6e;--lpm-em-txt:#0b8259;--lpm-cyan:#0a84c2;--lpm-cta:#f26a43;--lpm-hover:rgba(17,23,38,.05);--lpm-em-fill:rgba(14,159,110,.09);
  width:min(480px,calc(100vw - 32px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;
  background:var(--lpm-panel);border:1px solid var(--lpm-line);border-radius:18px;padding:22px;color:var(--lpm-tx);
  box-shadow:0 1px 0 rgba(17,23,38,.05),0 34px 80px -34px rgba(17,23,38,.55);animation:lpm-in .18s cubic-bezier(.2,.8,.2,1) both}
@keyframes lpm-in{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}
.lpm-head{display:flex;align-items:flex-start;gap:12px}
.lpm-badge{flex:none;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;
  background:var(--lpm-em-fill);color:var(--lpm-em-txt)}
.lpm-head-tx{min-width:0}
.lpm-title{margin:2px 0 0;font-size:19px;font-weight:800;line-height:1.25;letter-spacing:-.01em}
.lpm-intro{margin:6px 0 0;font-size:13.5px;line-height:1.5;color:var(--lpm-mut)}
.lpm-note{margin:14px 0 0;font-size:12.5px;line-height:1.5;color:var(--lpm-mut)}
.lpm-list{list-style:none;margin:14px 0 0;padding:0;overflow:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;
  display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:min(46vh,320px)}
.lpm-opt{display:flex;align-items:center;gap:8px;padding:10px 11px;border:1px solid var(--lpm-line);border-radius:11px;
  cursor:pointer;color:var(--lpm-tx);font-size:14px;font-weight:500;line-height:1.2;background:#fff;transition:background .12s,border-color .12s}
.lpm-opt:hover{background:var(--lpm-hover)}
.lpm-opt.on{background:var(--lpm-em-fill);border-color:transparent;color:var(--lpm-em-txt);font-weight:700}
.lpm-opt-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lpm-opt-code{flex:none;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--lpm-mut);opacity:.85;white-space:nowrap}
.lpm-opt.on .lpm-opt-code{color:inherit}
.lpm-tick{flex:none;color:var(--lpm-em)}
.lpm-err{margin:12px 0 0;font-size:12.5px;line-height:1.45;color:#b4231f}
.lpm-foot{margin-top:18px;display:flex;justify-content:flex-end}
.lpm-cta{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 20px;border:none;border-radius:11px;
  background:var(--lpm-cta);color:#fff;font:inherit;font-size:14.5px;font-weight:700;line-height:1;cursor:pointer;white-space:nowrap;
  box-shadow:0 1px 2px rgba(0,0,0,.14);transition:filter .15s}
.lpm-cta:hover:not(:disabled){filter:brightness(1.05)}
.lpm-cta:disabled{opacity:.7;cursor:default}
.lpm-cta:focus-visible{outline:2px solid var(--lpm-em);outline-offset:2px}
.lpm-opt:focus-visible{outline:2px solid var(--lpm-em);outline-offset:2px}
.lpm-spin{animation:lpm-rot 1s linear infinite}
@keyframes lpm-rot{to{transform:rotate(360deg)}}
@media(max-width:640px){
  .lpm{padding:18px}
  .lpm-list{grid-template-columns:1fr;max-height:48vh}
  .lpm-foot{justify-content:stretch}
  .lpm-cta{width:100%;justify-content:center}
}
@media(prefers-reduced-motion:reduce){.lpm{animation:none}.lpm-spin{animation:none}}
`
