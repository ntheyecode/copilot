// WorkCoPilot - set / reset password. The emailed link lands here with a
// one-time token. Validates the token, lets the person choose a password, then
// sends them to sign in. Used for both "welcome, set your password" and
// "forgot password" (same token purpose). Strings: setPasswordPage namespace.
import React, { useEffect, useState } from 'react'
import { KeyRound, Check, Loader2, ArrowRight, AlertTriangle, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react'
import { api } from '../api.js'
import { AVMark } from '../components/AdmireVedaLogo.jsx'
import { useT } from '../i18n/index.jsx'

function getToken() {
  try { return new URLSearchParams(window.location.search).get('token') || '' } catch { return '' }
}

export default function WorkSetPassword() {
  const t = useT()
  const [token] = useState(getToken)
  const [state, setState] = useState({ loading: true, valid: false, username: '', error: '' })
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!token) { setState({ loading: false, valid: false, username: '', error: t('setPasswordPage.errors.missingToken') }); return }
    api.workPasswordToken(token)
      .then((r) => setState({ loading: false, valid: !!r.valid, username: r.username || '', error: '' }))
      .catch((e) => setState({ loading: false, valid: false, username: '', error: (e && e.message) || t('setPasswordPage.errors.invalid') }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy) return
    if (pw.length < 6) { setErr(t('setPasswordPage.errors.tooShort')); return }
    if (pw !== pw2) { setErr(t('setPasswordPage.errors.mismatch')); return }
    setBusy(true); setErr('')
    try { await api.workPasswordSet(token, pw); setDone(true) }
    catch (error) { setErr((error && error.message) || t('setPasswordPage.errors.setFailed')) }
    finally { setBusy(false) }
  }

  return (
    <div className="wsp-root">
      <style>{CSS}</style>
      <div className="wsp-card">
        <a className="wsp-brand" href="/"><AVMark size={20} id="avsp" /> Work<i>CoPilot</i> <span className="wsp-by">{t('setPasswordPage.byBrand')}</span></a>
        {state.loading ? (
          <div className="wsp-center"><Loader2 size={26} className="wsp-spin" /><p>{t('setPasswordPage.checking')}</p></div>
        ) : done ? (
          <div className="wsp-center">
            <div className="wsp-ok"><Check size={26} /></div>
            <h1>{t('setPasswordPage.done.title')}</h1>
            <p>{t('setPasswordPage.done.body')}</p>
            <a className="wsp-btn" href="/workcopilot">{t('setPasswordPage.done.signIn')} <ArrowRight size={15} /></a>
          </div>
        ) : !state.valid ? (
          <div className="wsp-center">
            <div className="wsp-bad"><AlertTriangle size={24} /></div>
            <h1>{t('setPasswordPage.expired.title')}</h1>
            <p>{state.error || t('setPasswordPage.errors.invalid')}</p>
            <a className="wsp-btn ghost" href="/workcopilot">{t('setPasswordPage.expired.goToSignIn')}</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="wsp-ic"><KeyRound size={22} /></div>
            <h1>{t('setPasswordPage.form.title')}</h1>
            <p>{state.username ? t.rich('setPasswordPage.form.forUser', { name: state.username }) : t('setPasswordPage.form.chooseBody')}</p>
            <div className="wsp-field">
              <label>{t('setPasswordPage.form.newLabel')}</label>
              <div className="wsp-pw">
                <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => { setErr(''); setPw(e.target.value) }} autoFocus placeholder={t('setPasswordPage.form.newPlaceholder')} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t('setPasswordPage.form.hide') : t('setPasswordPage.form.show')}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div className="wsp-field">
              <label>{t('setPasswordPage.form.confirmLabel')}</label>
              <input type={show ? 'text' : 'password'} value={pw2} onChange={(e) => { setErr(''); setPw2(e.target.value) }} placeholder={t('setPasswordPage.form.confirmPlaceholder')} />
            </div>
            {err && <div className="wsp-err">{err}</div>}
            <button className="wsp-btn" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="wsp-spin" /> : <Check size={16} />} {t('setPasswordPage.form.submit')}</button>
            <p className="wsp-secure"><Lock size={13} aria-hidden="true" /> {t('setPasswordPage.form.secure')}</p>
          </form>
        )}
        <div className="wsp-foot"><ShieldCheck size={13} aria-hidden="true" /> {t('setPasswordPage.foot')}</div>
      </div>
    </div>
  )
}

const CSS = `
/* Brand tokens (emerald / cyan, orange CTA, Bricolage + Figtree), light by
   default with a dark override, matching the sign-in page it hands off to. */
.wsp-root{--bg:#f3f5fb;--panel:#ffffff;--field:#fbfcff;--line:#e6e8f1;--line2:#d3d7e5;--tx:#161a2b;--mut:#5c6484;--em:var(--accent,#0e9f6e);--cy:#0a84c2;--em-fill:var(--accent-soft,rgba(14,159,110,.10));--em-line:var(--accent-line,rgba(14,159,110,.30));--cta:#f26a43;--cta2:#e35a31;--cta-ink:#ffffff;--err:#b42318;--err-fill:rgba(180,35,24,.08);--err-line:rgba(180,35,24,.28);
  min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(900px 420px at 80% -10%, var(--em-fill) 0%, transparent 60%), var(--bg);
  font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--tx);-webkit-font-smoothing:antialiased}
[data-theme='dark'] .wsp-root{--bg:#0a0b12;--panel:#13141f;--field:#0b0c13;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.15);--tx:#eef0f6;--mut:#9aa0b4;--em:var(--accent,#8cf5c4);--cy:#39d3ff;--em-fill:var(--accent-soft,rgba(140,245,196,.10));--em-line:var(--accent-line,rgba(140,245,196,.34));--cta:#ffb561;--cta2:#ff7a59;--cta-ink:#241206;--err:#ff8b81;--err-fill:rgba(255,139,129,.10);--err-line:rgba(255,139,129,.30)}
.wsp-card{width:100%;max-width:430px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:30px 30px 22px;box-shadow:0 1px 2px rgba(26,31,54,.05),0 24px 60px -34px rgba(12,18,34,.34);text-align:center;position:relative;overflow:hidden}
.wsp-card::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--em),var(--cy))}
.wsp-brand{display:inline-flex;align-items:center;gap:8px;font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:800;font-size:17px;letter-spacing:-.02em;color:var(--tx);text-decoration:none;margin-bottom:18px}
.wsp-brand i{font-style:normal;color:var(--em)}
.wsp-by{font-family:"Figtree",sans-serif;font-weight:400;font-size:12px;color:var(--mut);letter-spacing:0}
.wsp-ic,.wsp-ok,.wsp-bad{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;margin:4px auto 14px}
.wsp-ic,.wsp-ok{background:var(--em-fill);border:1px solid var(--em-line);color:var(--em)}
.wsp-bad{background:var(--err-fill);border:1px solid var(--err-line);color:var(--err)}
.wsp-card h1{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-size:23px;letter-spacing:-.02em;margin:0 0 6px}
.wsp-card p{color:var(--mut);font-size:14.5px;line-height:1.5;margin:0 0 18px}
.wsp-field{text-align:left;margin-bottom:14px}
.wsp-field label{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--mut)}
.wsp-field input{width:100%;box-sizing:border-box;border:1px solid var(--line2);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;background:var(--field);color:var(--tx);outline:none;transition:border-color .15s,box-shadow .15s}
.wsp-field input:focus{border-color:var(--em);box-shadow:0 0 0 3px var(--em-fill)}
.wsp-pw{position:relative;display:flex}
.wsp-pw input{padding-right:42px}
.wsp-pw button{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--mut);cursor:pointer;padding:6px}
.wsp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;background:linear-gradient(135deg,var(--cta),var(--cta2));color:var(--cta-ink);border:none;border-radius:12px;padding:13px 20px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 10px 26px -12px var(--cta2)}
.wsp-btn:disabled{opacity:.7}
.wsp-btn.ghost{background:var(--panel);color:var(--tx);border:1px solid var(--line2);box-shadow:none}
.wsp-err{background:var(--err-fill);border:1px solid var(--err-line);color:var(--err);border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:14px;text-align:left}
.wsp-center p{margin-bottom:16px}
.wsp-secure{display:flex;align-items:flex-start;gap:7px;margin:14px 2px 0;font-size:12px;line-height:1.45;color:var(--mut);text-align:left}
.wsp-secure svg{flex:none;margin-top:2px;color:var(--em)}
.wsp-foot{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:20px;padding-top:15px;border-top:1px solid var(--line);font-size:11.5px;letter-spacing:.01em;color:var(--mut)}
.wsp-foot svg{flex:none;color:var(--em)}
.wsp-spin{animation:wsp-sp .8s linear infinite}@keyframes wsp-sp{to{transform:rotate(360deg)}}
`
