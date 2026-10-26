// ConsentBanner - GDPR/CCPA cookie & storage consent (world-class, dependency-free).
//
// Behavior: shows the summary bar until a decision is stored (consent.js), then
// hides. The footer "Cookie preferences" link (or any openPreferences() call)
// re-opens it straight into the Manage panel. Reject is exactly as easy as
// Accept - both are a single click of an equal-weight button.
//
// Categories: Necessary (locked on), Functional, Analytics/attribution. Saving
// persists the choice, mirrors a server-readable consent cookie, and gates the
// affref referral cookie (see consent.js + server/affiliate.js).
//
// DESIGN-TIME QUALITY GATE (owner rule): renders clean with NO overflow / clipping
// / wrapping pills at BOTH ~1280px and ~640px. Action buttons are white-space:nowrap
// + flex-shrink:0; the text column is the only thing that flexes; at narrow widths
// the bar stacks and the buttons go full-width. White-in-product aesthetic on the
// marketing palette (emerald/cyan, Figtree/Bricolage). RTL via the document dir.
import React, { useEffect, useRef, useState } from 'react'
import { useT, useLocale } from '../i18n/index.jsx'
import {
  hasDecision, readConsent, writeConsent, acceptAll, rejectNonEssential,
  CONSENT_OPEN_EVENT,
} from '../consent.js'

export default function ConsentBanner() {
  const t = useT()
  const { dir } = useLocale()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('bar')        // 'bar' | 'manage'
  const [functional, setFunctional] = useState(true)
  const [analytics, setAnalytics] = useState(false)
  const firstBtn = useRef(null)

  // First visit (no stored decision) shows the bar; a stored decision hides it.
  useEffect(() => { if (!hasDecision()) setOpen(true) }, [])

  // The footer link / openPreferences() re-opens straight into Manage, seeded
  // with the current choice.
  useEffect(() => {
    const onOpen = () => {
      const c = readConsent()
      setFunctional(c ? c.functional : true)
      setAnalytics(c ? c.analytics : false)
      setMode('manage'); setOpen(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  // Esc closes the manage panel (only when a decision already exists, so a
  // first-time visitor cannot dismiss without choosing).
  useEffect(() => {
    if (!open || mode !== 'manage') return undefined
    const onKey = (e) => { if (e.key === 'Escape' && hasDecision()) setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, mode])

  if (!open) return null

  const doAcceptAll = () => { acceptAll(); setOpen(false) }
  const doRejectAll = () => { rejectNonEssential(); setOpen(false) }
  const doSave = () => { writeConsent({ functional, analytics }); setOpen(false) }

  const Toggle = ({ on, set, label, locked }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={locked}
      className={`cb-toggle${on ? ' on' : ''}${locked ? ' locked' : ''}`}
      onClick={() => !locked && set(!on)}
    >
      <span className="cb-knob" aria-hidden="true" />
      <span className="cb-state">{locked ? t('consent.alwaysOn') : on ? t('consent.on') : t('consent.off')}</span>
    </button>
  )

  return (
    <div className="cb-root" dir={dir}>
      <style>{CSS}</style>
      {mode === 'bar' ? (
        <section className="cb-bar" role="region" aria-label={t('consent.aria')}>
          <div className="cb-copy">
            <div className="cb-title">{t('consent.title')}</div>
            <p className="cb-body">{t('consent.body')}</p>
          </div>
          <div className="cb-actions">
            <button type="button" className="cb-btn ghost" onClick={() => setMode('manage')}>{t('consent.manage')}</button>
            <button type="button" className="cb-btn alt" onClick={doRejectAll}>{t('consent.rejectAll')}</button>
            <button type="button" className="cb-btn primary" ref={firstBtn} onClick={doAcceptAll}>{t('consent.acceptAll')}</button>
          </div>
        </section>
      ) : (
        <div className="cb-scrim" role="dialog" aria-modal="true" aria-label={t('consent.aria')}>
          <section className="cb-panel">
            <header className="cb-phead">
              <div className="cb-title">{t('consent.manageTitle')}</div>
              {hasDecision() && (
                <button type="button" className="cb-x" aria-label={t('consent.close')} onClick={() => setOpen(false)}>&times;</button>
              )}
            </header>
            <p className="cb-body">{t('consent.manageBody')}</p>

            <ul className="cb-cats">
              <li className="cb-cat">
                <div className="cb-cat-txt">
                  <div className="cb-cat-t">{t('consent.necessaryT')}</div>
                  <div className="cb-cat-d">{t('consent.necessaryD')}</div>
                </div>
                <Toggle on locked label={t('consent.necessaryT')} set={() => {}} />
              </li>
              <li className="cb-cat">
                <div className="cb-cat-txt">
                  <div className="cb-cat-t">{t('consent.functionalT')}</div>
                  <div className="cb-cat-d">{t('consent.functionalD')}</div>
                </div>
                <Toggle on={functional} set={setFunctional} label={t('consent.functionalT')} />
              </li>
              <li className="cb-cat">
                <div className="cb-cat-txt">
                  <div className="cb-cat-t">{t('consent.analyticsT')}</div>
                  <div className="cb-cat-d">{t('consent.analyticsD')}</div>
                </div>
                <Toggle on={analytics} set={setAnalytics} label={t('consent.analyticsT')} />
              </li>
            </ul>

            <p className="cb-learn">
              {t.rich('consent.learn', null, {
                a: (c) => <a href="/workcopilot/cookie-policy">{c}</a>,
                p: (c) => <a href="/workcopilot/privacy">{c}</a>,
              })}
            </p>

            <div className="cb-actions cb-pactions">
              <button type="button" className="cb-btn alt" onClick={doRejectAll}>{t('consent.rejectAll')}</button>
              <button type="button" className="cb-btn alt" onClick={doAcceptAll}>{t('consent.acceptAll')}</button>
              <button type="button" className="cb-btn primary" onClick={doSave}>{t('consent.save')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

const CSS = `
.cb-root{--cb-ink:#161a2b;--cb-mut:#5c6484;--cb-line:#e6e8f1;--cb-panel:#ffffff;--cb-em:#0e9f6e;--cb-em2:#0a84c2;--cb-scrim:rgba(10,13,22,.42);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
[data-theme='dark'] .cb-root{--cb-ink:#eef0f6;--cb-mut:#a3a9bd;--cb-line:rgba(255,255,255,.12);--cb-panel:#151826;--cb-em:#8cf5c4;--cb-em2:#39d3ff;--cb-scrim:rgba(0,0,0,.6)}
.cb-root *{box-sizing:border-box}
/* ---- summary bar: fixed bottom, flex row that stacks at narrow ---- */
.cb-bar{position:fixed;inset-inline:16px;bottom:16px;z-index:2147483000;max-width:1120px;margin:0 auto;
  background:var(--cb-panel);color:var(--cb-ink);border:1px solid var(--cb-line);border-radius:16px;
  box-shadow:0 20px 48px -18px rgba(10,13,22,.45),0 2px 6px rgba(10,13,22,.08);
  padding:16px 18px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.cb-bar::before{content:"";position:absolute;inset-inline:0;top:0;height:3px;border-radius:16px 16px 0 0;background:linear-gradient(90deg,var(--cb-em),var(--cb-em2))}
.cb-copy{flex:1 1 320px;min-width:0}
.cb-title{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:15px;letter-spacing:-.01em;margin:0 0 3px;color:var(--cb-ink)}
.cb-body{margin:0;font-size:13px;line-height:1.5;color:var(--cb-mut);text-align:start;overflow-wrap:anywhere}
.cb-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
.cb-btn{white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border-radius:10px;
  font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:transform .12s,filter .12s,background .12s,border-color .12s}
.cb-btn:focus-visible{outline:2px solid var(--cb-em2);outline-offset:2px}
.cb-btn.primary{background:linear-gradient(135deg,var(--cb-em),var(--cb-em2));color:#fff;box-shadow:0 10px 22px -14px var(--cb-em2)}
.cb-btn.primary:hover{transform:translateY(-1px);filter:brightness(1.04)}
.cb-btn.alt{background:var(--cb-panel);color:var(--cb-ink);border-color:var(--cb-line)}
.cb-btn.alt:hover{border-color:var(--cb-em2);color:var(--cb-em2)}
.cb-btn.ghost{background:transparent;color:var(--cb-mut);padding:0 10px}
.cb-btn.ghost:hover{color:var(--cb-ink);text-decoration:underline}
/* ---- manage panel: centered modal ---- */
.cb-scrim{position:fixed;inset:0;z-index:2147483000;background:var(--cb-scrim);display:flex;align-items:center;justify-content:center;padding:16px}
.cb-panel{width:100%;max-width:560px;max-height:calc(100vh - 32px);overflow:auto;background:var(--cb-panel);color:var(--cb-ink);
  border:1px solid var(--cb-line);border-radius:18px;box-shadow:0 30px 70px -20px rgba(10,13,22,.6);padding:22px}
.cb-phead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}
.cb-x{flex-shrink:0;width:34px;height:34px;border-radius:9px;border:1px solid var(--cb-line);background:transparent;color:var(--cb-mut);font-size:22px;line-height:1;cursor:pointer}
.cb-x:hover{color:var(--cb-ink);border-color:var(--cb-em2)}
.cb-x:focus-visible{outline:2px solid var(--cb-em2);outline-offset:2px}
.cb-cats{list-style:none;margin:16px 0 4px;padding:0;display:flex;flex-direction:column;gap:10px}
.cb-cat{display:flex;align-items:flex-start;gap:14px;padding:14px;border:1px solid var(--cb-line);border-radius:12px;background:transparent}
.cb-cat-txt{flex:1 1 auto;min-width:0}
.cb-cat-t{font-weight:700;font-size:14px;color:var(--cb-ink);margin-bottom:2px}
.cb-cat-d{font-size:12.5px;line-height:1.5;color:var(--cb-mut);overflow-wrap:anywhere}
/* toggle: label + pill; never wraps, never clips */
.cb-toggle{flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px 0 4px;
  border-radius:999px;border:1px solid var(--cb-line);background:#eef1f6;color:var(--cb-mut);font:inherit;font-size:11px;font-weight:800;
  letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
[data-theme='dark'] .cb-toggle{background:rgba(255,255,255,.06)}
.cb-toggle .cb-knob{width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(10,13,22,.3);transition:transform .15s}
.cb-toggle.on{background:linear-gradient(135deg,var(--cb-em),var(--cb-em2));border-color:transparent;color:#fff}
.cb-toggle.on .cb-knob{transform:translateX(2px)}
.cb-toggle.locked{opacity:.85;cursor:not-allowed}
.cb-toggle:focus-visible{outline:2px solid var(--cb-em2);outline-offset:2px}
.cb-state{min-width:3.2em;text-align:center}
.cb-learn{font-size:12.5px;line-height:1.5;color:var(--cb-mut);margin:14px 0 0;text-align:start;overflow-wrap:anywhere}
.cb-learn a{color:var(--cb-em);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.cb-pactions{margin-top:18px;justify-content:flex-end}
/* ---- narrow (~640px and below): stack, full-width buttons, no overflow ---- */
@media(max-width:640px){
  .cb-bar{inset-inline:8px;bottom:8px;padding:14px;gap:12px}
  .cb-actions{width:100%;justify-content:stretch;flex-wrap:nowrap}
  .cb-bar .cb-actions .cb-btn{flex:1 1 0;min-width:0;padding:0 8px}
  .cb-bar .cb-actions .cb-btn.ghost{flex:0 0 auto}
  .cb-pactions{flex-wrap:nowrap}
  .cb-pactions .cb-btn{flex:1 1 0}
}
@media(max-width:380px){
  .cb-actions{flex-wrap:wrap}
  .cb-bar .cb-actions .cb-btn,.cb-pactions .cb-btn{flex:1 1 100%}
}
@media(prefers-reduced-motion:reduce){.cb-btn,.cb-toggle,.cb-knob{transition:none}}
`
