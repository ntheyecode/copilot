// WorkCoPilot - public Contact Us page. Captures name/email/subject/message,
// POSTs to /api/work/contact (which emails the business + a thank-you to the
// submitter). Clean, branded, honest - no claims, just a way to reach us.
// i18n: every visible string comes from the `contactPage` namespace
// (src/i18n/locales/en/contactPage.js); <title>/description keep seo.contact.*.
import React, { useState } from 'react'
import { Mail, Send, Check, Loader2, Building2 } from 'lucide-react'
import { api } from '../api.js'
import { takeContactPrefill } from '../shared/contact_prefill.js'   // the live widget's hand-off (corporate "talk to sales")
import SiteHeader from '../components/SiteHeader.jsx'   // shared top nav (one link list, mobile disclosure menu)
import SiteFooter from '../components/SiteFooter.jsx'
import useSeo from '../useSeo.js'                        // per-route title / description / canonical (WEB-01)
import { useT } from '../i18n/index.jsx'                 // localized <title>/description (seo.* keys) + page copy (contactPage.*)

export default function WorkContact() {
  const t = useT()
  useSeo({
    title: t('seo.contact.title'),
    description: t('seo.contact.description'),
    path: '/workcopilot/contact',
  })
  // Arriving from the live widget ("talk to sales"): the form opens filled in.
  const [form, setForm] = useState(() => ({ name: '', email: '', subject: '', message: '', ...(takeContactPrefill() || {}) }))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => { setErr(''); setForm((f) => ({ ...f, [k]: v })) }

  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy) return
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) { setErr(t('contactPage.errors.required')); return }
    setBusy(true); setErr('')
    try { await api.workContact(form); setDone(true) }
    catch (error) { setErr((error && error.message) || t('contactPage.errors.sendFailed')) }
    finally { setBusy(false) }
  }

  return (
    <div className="wct-root">
      <style>{CSS}</style>
      <SiteHeader />

      <main className="wct-main" id="main">
        <div className="wct-head">
          <div className="wct-eyebrow"><Mail size={14} /> {t('contactPage.eyebrow')}</div>
          <h1>{t('contactPage.h1')}</h1>
          <p>{t('contactPage.lead')}</p>
        </div>

        {done ? (
          <div className="wct-card wct-ok">
            <div className="wct-ok-ic"><Check size={26} /></div>
            <h2>{t('contactPage.done.thanks', { name: form.name.split(' ')[0] || t('contactPage.done.thereFallback') })}</h2>
            <p>{t.rich('contactPage.done.body', { email: form.email })}</p>
            <a className="wct-btn ghost" href="/">{t('contactPage.done.backHome')}</a>
          </div>
        ) : (
          <form className="wct-card" onSubmit={submit}>
            <div className="wct-grid">
              <div className="wct-field"><label htmlFor="wct-name">{t('contactPage.form.nameLabel')}</label><input id="wct-name" name="name" autoComplete="name" value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} placeholder={t('contactPage.form.namePlaceholder')} /></div>
              <div className="wct-field"><label htmlFor="wct-email">{t('contactPage.form.emailLabel')}</label><input id="wct-email" name="email" type="email" autoComplete="email" value={form.email} maxLength={160} onChange={(e) => set('email', e.target.value)} placeholder={t('contactPage.form.emailPlaceholder')} /></div>
            </div>
            <div className="wct-field"><label htmlFor="wct-subject">{t('contactPage.form.subjectLabel')} <span className="opt">{t('contactPage.form.optional')}</span></label><input id="wct-subject" name="subject" value={form.subject} maxLength={200} onChange={(e) => set('subject', e.target.value)} placeholder={t('contactPage.form.subjectPlaceholder')} /></div>
            <div className="wct-field"><label htmlFor="wct-message">{t('contactPage.form.messageLabel')}</label><textarea id="wct-message" name="message" rows={6} value={form.message} maxLength={4000} onChange={(e) => set('message', e.target.value)} placeholder={t('contactPage.form.messagePlaceholder')} /></div>
            {err && <div className="wct-err">{err}</div>}
            <button className="wct-btn" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="wct-spin" /> : <Send size={16} />} {t('contactPage.form.send')}</button>
            <p className="wct-note"><Building2 size={13} /> {t('contactPage.form.note')}</p>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

const CSS = `
[data-theme='dark'] .wct-root{--g:#8cf5c4;--g2:#39d3ff;--ink:#eef0f6;--mut:#9aa0b4;--line:rgba(255,255,255,.09);--panel:#13141f;--bg:#0a0b12}
.wct-root{--g:#0e9f6e;--g2:#0a84c2;--ink:#161a2b;--mut:#5c6484;--line:#e6e8f1;--panel:#ffffff;--bg:#f3f5fb;min-height:100vh;background:
  radial-gradient(1200px 500px at 80% -10%, #eafaf1 0%, transparent 60%), var(--bg);color:var(--ink);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column}
.wct-top{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;max-width:980px;margin:0 auto;width:100%;box-sizing:border-box}
.wct-brand{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:18px;color:var(--ink);text-decoration:none}
.wct-mark{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,var(--g),var(--g2));box-shadow:0 2px 8px rgba(10,157,102,.35)}
.wct-back{display:inline-flex;align-items:center;gap:6px;color:var(--mut);text-decoration:none;font-size:14px;font-weight:600}
.wct-back:hover{color:var(--ink)}
.wct-main{max-width:640px;margin:0 auto;padding:16px 20px 40px;width:100%;box-sizing:border-box}
.wct-head{text-align:center;margin:18px 0 22px}
.wct-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--g);background:#eafaf1;border:1px solid #bfe9d2;border-radius:999px;padding:5px 13px}
.wct-head h1{font-size:34px;line-height:1.1;margin:14px 0 8px;letter-spacing:-.02em}
.wct-head p{color:var(--mut);font-size:15.5px;line-height:1.55;max-width:48ch;margin:0 auto}
.wct-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 12px 40px -24px rgba(12,18,34,.25)}
.wct-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.wct-field{margin-bottom:14px;display:flex;flex-direction:column}
.wct-field label{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px}
.wct-field .opt{color:var(--mut);font-weight:400}
.wct-field input,.wct-field textarea{border:1px solid var(--line);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;color:var(--ink);background:#fcfdfe;outline:none;resize:vertical}
.wct-field input:focus,.wct-field textarea:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(10,157,102,.14)}
.wct-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ff9a4d,#f26a43);color:#1a0e08;border:none;border-radius:12px;padding:13px 20px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 10px 26px -12px rgba(242,106,67,.6)}
.wct-btn:disabled{opacity:.7;cursor:default}
.wct-btn.ghost{background:var(--panel);color:var(--g2);border:1px solid var(--line);box-shadow:none;margin-top:8px;text-decoration:none}
.wct-note{display:flex;align-items:center;gap:7px;color:var(--mut);font-size:12.5px;margin:14px 0 0}
.wct-err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:10px;padding:10px 13px;font-size:13.5px;margin-bottom:14px}
.wct-ok{text-align:center}
.wct-ok-ic{width:58px;height:58px;border-radius:50%;background:#eafaf1;border:1px solid #bfe9d2;color:var(--g);display:grid;place-items:center;margin:4px auto 14px}
.wct-ok h2{font-size:23px;margin:0 0 8px}
.wct-ok p{color:var(--mut);font-size:15px;line-height:1.55;max-width:44ch;margin:0 auto 16px}
.wct-spin{animation:wct-sp .8s linear infinite}@keyframes wct-sp{to{transform:rotate(360deg)}}
@media(max-width:560px){.wct-grid{grid-template-columns:1fr}.wct-head h1{font-size:28px}}
`
