// Company Brain SECURITY + DATA EXPORT (company admin).
//
// 1. Private encryption (customer-held key): the brain's data key is wrapped
//    under a passphrase only the company holds. Enabling returns a 24-word
//    recovery phrase ONCE (never stored server-side), which this screen shows in
//    a grid, lets the admin copy, and then re-asks for a few random words before
//    it lets them continue - like a crypto wallet, there is no backdoor. After
//    that: status (encrypted / locked / unlocked), unlock (passphrase OR recovery
//    phrase), lock now, rotate passphrase, and the idle unlock window.
// 2. Encrypted data export: named privacy contacts (who may receive the export
//    password / retrieve sensitive data), setting the export password (emailed
//    to those contacts, or shown once on screen when email is off), and the
//    download of the password-encrypted .wcpx archive (AES-256-GCM). When the
//    brain is locked under the customer-held key the server skips it and says so
//    in a response header, which is surfaced here rather than dropped.
//
// Honest copy throughout: "encrypted at rest under a key only you hold",
// AES-256-GCM, no "zero-knowledge" claims. Sensitive edits (privacy contacts)
// are reason-gated through the shared ReasonModal and audited server-side.
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Lock, Unlock, KeyRound, ShieldCheck, ShieldAlert, AlertTriangle, Copy, Check, Download, Mail,
  Plus, Trash2, RefreshCw, Eye, EyeOff, Fingerprint, FileArchive, Users, Info, X, ArrowRight, Clock,
} from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, Spinning, ReasonModal } from './_shared.jsx'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
// Passphrase strength: a plain, deterministic hint (length + character variety),
// not a promise. Mirrors the server's floor (8 chars) and nudges toward 14+.
export function passStrength(p) {
  const s = String(p || '')
  if (!s) return { score: 0, label: '', pct: 0 }
  let score = 0
  if (s.length >= 8) score++
  if (s.length >= 12) score++
  if (s.length >= 16) score++
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length
  if (classes >= 2) score++
  if (classes >= 3) score++
  if (/(.)\1{2,}/.test(s) || /^(password|passphrase|12345678|qwerty)/i.test(s)) score = Math.min(score, 1)
  const n = Math.min(4, Math.max(0, score - 1))
  const label = s.length < 8 ? 'tooShort' : ['weak', 'fair', 'good', 'strong', 'veryStrong'][n]
  return { score: n, label, pct: s.length < 8 ? 12 : [28, 48, 70, 88, 100][n] }
}

// passStrength() returns its label as the i18n leaf (brainSecurity.strength.<label>);
// the logic below compares that id, and the text is looked up only at display time.

function StrengthBar({ value }) {
  const t = useT()
  const st = passStrength(value)
  if (!value) return null
  const tone = st.label === 'tooShort' || st.score === 0 ? 'var(--wka-red)' : st.score === 1 ? 'var(--wka-amber)' : 'var(--wka-emerald)'
  return (
    <div className="wcb-strength" aria-live="polite">
      <div className="track"><div className="fill" style={{ width: `${st.pct}%`, background: tone }} /></div>
      <span style={{ color: tone }}>{t(`brainSecurity.strength.${st.label}`)}</span>
    </div>
  )
}

function PassInput({ value, onChange, placeholder, autoFocus, autoComplete = 'new-password', id }) {
  const t = useT()
  const [show, setShow] = useState(false)
  return (
    <div className="wcb-pass">
      <input id={id} className="wka-input" type={show ? 'text' : 'password'} value={value} autoFocus={autoFocus} autoComplete={autoComplete}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? t('brainSecurity.pass.hide') : t('brainSecurity.pass.show')} title={show ? t('brainSecurity.pass.hide') : t('brainSecurity.pass.show')}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ }
  }, [])
  return [copied, copy]
}

const splitWords = (phrase) => String(phrase || '').trim().split(/\s+/).filter(Boolean)

// Pick `n` distinct random word positions (0-based) for the saved-it check.
function pickIndices(total, n) {
  const out = new Set()
  const want = Math.min(n, total)
  while (out.size < want) out.add(Math.floor(Math.random() * total))
  return [...out].sort((a, b) => a - b)
}

const fmtWhen = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }

// ---------------------------------------------------------------------------
// Enable wizard: passphrase -> recovery phrase -> saved-it check
// ---------------------------------------------------------------------------
function EnableWizard({ onDone, onCancel }) {
  const t = useT()
  const [step, setStep] = useState(1)                 // 1 passphrase, 2 phrase, 3 verify
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)          // { recoveryPhrase, dekId }
  const [copied, copy] = useCopy()
  const [checks, setChecks] = useState([])            // indices to re-ask
  const [answers, setAnswers] = useState({})
  const [verifyErr, setVerifyErr] = useState(null)

  const words = useMemo(() => splitWords(result && result.recoveryPhrase), [result])
  const st = passStrength(pass)
  const canEnable = pass.length >= 8 && pass === pass2 && ack && !busy

  const enable = async () => {
    if (!canEnable) return
    setBusy(true); setErr(null)
    try {
      const r = await api.workBrainEnablePrivate(pass)
      setResult(r); setPass(''); setPass2(''); setStep(2)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const toVerify = () => { setChecks(pickIndices(words.length, 3)); setAnswers({}); setVerifyErr(null); setStep(3) }
  const verify = () => {
    const bad = checks.filter((i) => String(answers[i] || '').trim().toLowerCase() !== words[i].toLowerCase())
    if (bad.length) { setVerifyErr(t.n('brainSecurity.wizard.mismatch', bad.length, { list: bad.map((i) => i + 1).join(', #') })); return }
    setResult(null)   // drop the phrase from memory; it is never shown again
    onDone()
  }

  return (
    <div className="wka-panel wcb-wizard">
      <div className="wcb-steps" aria-label={t('brainSecurity.wizard.progress')}>
        {[t('brainSecurity.wizard.step1'), t('brainSecurity.wizard.step2'), t('brainSecurity.wizard.step3')].map((label, i) => (
          <span key={label} className={`wcb-step${step === i + 1 ? ' on' : step > i + 1 ? ' done' : ''}`}>
            <i>{step > i + 1 ? <Check size={11} /> : i + 1}</i>{label}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <>
          <h2><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('brainSecurity.wizard.chooseTitle')}</h2>
          <p className="desc">{t('brainSecurity.wizard.chooseDesc')}</p>
          <div className="wka-formgrid" style={{ maxWidth: 640 }}>
            <div className="wka-field">
              <label htmlFor="wcb-pass">{t('brainSecurity.common.passphrase')}</label>
              <PassInput id="wcb-pass" value={pass} onChange={setPass} placeholder={t('brainSecurity.wizard.passPlaceholder')} autoFocus />
              <StrengthBar value={pass} />
              {!pass ? <span className="hint">{t('brainSecurity.wizard.passTip')}</span> : null}
            </div>
            <div className="wka-field">
              <label htmlFor="wcb-pass2">{t('brainSecurity.wizard.repeatPassphrase')}</label>
              <PassInput id="wcb-pass2" value={pass2} onChange={setPass2} placeholder={t('brainSecurity.common.typeItAgain')} />
              {pass2 && pass2 !== pass ? <span className="hint" style={{ color: 'var(--wka-red)' }}>{t('brainSecurity.common.passphrasesNoMatch')}</span> : pass2 && pass2 === pass ? <span className="hint" style={{ color: 'var(--wka-emerald)' }}>{t('brainSecurity.wizard.matches')}</span> : null}
            </div>
          </div>
          <label className="wcb-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>{t.rich('brainSecurity.wizard.ack')}</span>
          </label>
          {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
          <div className="wcb-actions">
            <button type="button" className="wka-btn ghost" onClick={onCancel} disabled={busy}><X size={14} /> {t('brainSecurity.common.cancel')}</button>
            <button type="button" className="wka-btn primary" onClick={enable} disabled={!canEnable} title={!ack ? t('brainSecurity.wizard.tickAck') : st.label === 'tooShort' ? t('brainSecurity.common.atLeast8') : ''}>
              {busy ? <Spinning /> : <Lock size={14} />} {t('brainSecurity.wizard.enable')}
            </button>
          </div>
        </>
      ) : null}

      {step === 2 && result ? (
        <>
          <h2><Fingerprint size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('brainSecurity.wizard.phraseTitle')}</h2>
          <p className="desc">{t('brainSecurity.wizard.phraseDesc', { n: words.length })}</p>
          <div className="wcb-words" role="list" aria-label={t('brainSecurity.wizard.phraseAria')}>
            {words.map((w, i) => (
              <span key={i} className="wcb-word" role="listitem"><i>{i + 1}</i>{w}</span>
            ))}
          </div>
          <div className="wcb-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="wka-btn sm" onClick={() => copy(words.join(' '))}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('brainSecurity.common.copied') : t('brainSecurity.wizard.copyPhrase')}</button>
            <button type="button" className="wka-btn primary" onClick={toVerify}><Check size={14} /> {t('brainSecurity.wizard.savedIt')}</button>
          </div>
          <div className="wka-note" style={{ marginTop: 14, marginBottom: 0, color: 'var(--wka-amber)' }}><AlertTriangle size={14} /> {t('brainSecurity.wizard.phraseWarn')}</div>
        </>
      ) : null}

      {step === 3 && result ? (
        <>
          <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('brainSecurity.wizard.confirmTitle')}</h2>
          <p className="desc">{t('brainSecurity.wizard.confirmDesc')}</p>
          <div className="wcb-verify">
            {checks.map((i) => (
              <div key={i} className="wka-field">
                <label htmlFor={`wcb-w${i}`}>{t('brainSecurity.wizard.wordN', { n: i + 1 })}</label>
                <input id={`wcb-w${i}`} className="wka-input" value={answers[i] || ''} autoComplete="off" spellCheck={false} autoFocus={i === checks[0]}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') verify() }} />
              </div>
            ))}
          </div>
          {verifyErr ? <div className="wka-error" style={{ marginTop: 10 }}><span className="msg"><AlertTriangle size={16} /> {verifyErr}</span></div> : null}
          <div className="wcb-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="wka-btn ghost" onClick={() => { setStep(2); setVerifyErr(null) }}>{t('brainSecurity.wizard.showAgain')}</button>
            <button type="button" className="wka-btn primary" onClick={verify} disabled={checks.some((i) => !String(answers[i] || '').trim())}><ArrowRight size={14} /> {t('brainSecurity.wizard.confirmContinue')}</button>
          </div>
        </>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custody status + unlock / lock / rotate
// ---------------------------------------------------------------------------
function CustodyPanel({ sec, onChanged }) {
  const t = useT()
  const [mode, setMode] = useState('passphrase')      // unlock with: passphrase | recovery
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')
  const [rotating, setRotating] = useState(false)
  const [rMode, setRMode] = useState('passphrase')
  const [rCurrent, setRCurrent] = useState('')
  const [rNew, setRNew] = useState('')
  const [rNew2, setRNew2] = useState('')
  const [rBusy, setRBusy] = useState(false)
  const [rErr, setRErr] = useState(null)

  const flash = (m) => { setOk(m); setTimeout(() => setOk(''), 3200) }

  const unlock = async (e) => {
    if (e) e.preventDefault()
    if (busy || !secret.trim()) return
    setBusy(true); setErr(null)
    try {
      await api.workBrainUnlock(mode === 'recovery' ? { recoveryPhrase: secret.trim() } : { passphrase: secret })
      setSecret(''); flash(t('brainSecurity.custody.unlockedFlash', { n: sec.unlockWindowMinutes || 30 })); onChanged()
    } catch (er) { setErr(er) } finally { setBusy(false) }
  }
  const lock = async () => {
    if (busy) return
    setBusy(true); setErr(null)
    try { await api.workBrainLock(); flash(t('brainSecurity.custody.lockedFlash')); onChanged() }
    catch (er) { setErr(er) } finally { setBusy(false) }
  }
  const rotate = async () => {
    if (rBusy) return
    if (rNew.length < 8) { setRErr(new Error(t('brainSecurity.custody.errNewTooShort'))); return }
    if (rNew !== rNew2) { setRErr(new Error(t('brainSecurity.custody.errNewNoMatch'))); return }
    if (!rCurrent.trim()) { setRErr(new Error(rMode === 'recovery' ? t('brainSecurity.custody.errEnterRecovery') : t('brainSecurity.custody.errEnterCurrent'))); return }
    setRBusy(true); setRErr(null)
    try {
      await api.workBrainRotatePassphrase({ ...(rMode === 'recovery' ? { recoveryPhrase: rCurrent.trim() } : { currentPassphrase: rCurrent }), newPassphrase: rNew })
      setRotating(false); setRCurrent(''); setRNew(''); setRNew2('')
      flash(t('brainSecurity.custody.rotatedFlash')); onChanged()
    } catch (er) { setRErr(er) } finally { setRBusy(false) }
  }

  const locked = !!sec.locked
  return (
    <div className="wka-panel">
      <div className="wcb-head">
        <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-emerald)' }} />{t('brainSecurity.custody.title')}</h2>
        <div className="wcb-status">
          <span className="wka-badge active"><Lock size={11} /> {t('brainSecurity.custody.badgeEncrypted')}</span>
          {locked
            ? <span className="wka-badge paused"><Lock size={11} /> {t('brainSecurity.custody.badgeLocked')}</span>
            : <span className="wka-badge active"><Unlock size={11} /> {t('brainSecurity.custody.badgeUnlocked')}</span>}
          <span className="wka-badge" title={t('brainSecurity.custody.idleWindowTitle')}><Clock size={11} /> {t('brainSecurity.custody.idleWindow', { n: sec.unlockWindowMinutes || 30 })}</span>
        </div>
      </div>
      <p className="desc">{t.rich('brainSecurity.custody.desc', { id: sec.dekId ? String(sec.dekId).slice(0, 12) : '', n: sec.unlockWindowMinutes || 30 }, { keyid: (c) => (sec.dekId ? c : null), code: (c) => <code className="wka-mono">{c}</code> })}</p>

      {ok ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div> : null}
      {err ? <div style={{ marginBottom: 12 }}><ErrorBox error={err} /></div> : null}

      {locked ? (
        <form onSubmit={unlock} className="wcb-unlock">
          <div className="wcb-seg" role="tablist" aria-label={t('brainSecurity.custody.unlockWith')}>
            <button type="button" role="tab" aria-selected={mode === 'passphrase'} className={mode === 'passphrase' ? 'on' : ''} onClick={() => { setMode('passphrase'); setSecret('') }}><KeyRound size={13} /> {t('brainSecurity.common.passphrase')}</button>
            <button type="button" role="tab" aria-selected={mode === 'recovery'} className={mode === 'recovery' ? 'on' : ''} onClick={() => { setMode('recovery'); setSecret('') }}><Fingerprint size={13} /> {t('brainSecurity.common.recoveryPhrase')}</button>
          </div>
          <div className="wka-field" style={{ maxWidth: 520 }}>
            <label htmlFor="wcb-unlock">{mode === 'recovery' ? t('brainSecurity.custody.recoveryLabel') : t('brainSecurity.common.passphrase')}</label>
            {mode === 'recovery'
              ? <textarea id="wcb-unlock" className="wka-input" rows={2} value={secret} autoComplete="off" spellCheck={false} placeholder={t('brainSecurity.common.phrasePlaceholder')} onChange={(e) => setSecret(e.target.value)} style={{ resize: 'vertical' }} />
              : <PassInput id="wcb-unlock" value={secret} onChange={setSecret} placeholder={t('brainSecurity.custody.yourPassphrase')} autoComplete="current-password" />}
          </div>
          <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="wka-btn primary" disabled={busy || !secret.trim()}>{busy ? <Spinning /> : <Unlock size={14} />} {t('brainSecurity.custody.unlockBtn')}</button>
            <button type="button" className="wka-btn ghost" onClick={() => setRotating((v) => !v)} disabled={busy}><RefreshCw size={14} /> {t('brainSecurity.common.changePassphrase')}</button>
          </div>
        </form>
      ) : (
        <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="wka-btn" onClick={lock} disabled={busy}>{busy ? <Spinning /> : <Lock size={14} />} {t('brainSecurity.custody.lockNow')}</button>
          <button type="button" className="wka-btn ghost" onClick={() => setRotating((v) => !v)} disabled={busy}><RefreshCw size={14} /> {t('brainSecurity.common.changePassphrase')}</button>
        </div>
      )}

      {rotating ? (
        <div className="wcb-sub">
          <h3><RefreshCw size={14} /> {t('brainSecurity.custody.rotateTitle')}</h3>
          <p className="desc">{t('brainSecurity.custody.rotateDesc')}</p>
          <div className="wcb-seg" role="tablist" aria-label={t('brainSecurity.custody.proveWith')}>
            <button type="button" role="tab" aria-selected={rMode === 'passphrase'} className={rMode === 'passphrase' ? 'on' : ''} onClick={() => { setRMode('passphrase'); setRCurrent('') }}><KeyRound size={13} /> {t('brainSecurity.common.currentPassphrase')}</button>
            <button type="button" role="tab" aria-selected={rMode === 'recovery'} className={rMode === 'recovery' ? 'on' : ''} onClick={() => { setRMode('recovery'); setRCurrent('') }}><Fingerprint size={13} /> {t('brainSecurity.common.recoveryPhrase')}</button>
          </div>
          <div className="wka-formgrid" style={{ maxWidth: 640, marginBottom: 10 }}>
            <div className="wka-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="wcb-rcur">{rMode === 'recovery' ? t('brainSecurity.common.recoveryPhrase') : t('brainSecurity.common.currentPassphrase')}</label>
              {rMode === 'recovery'
                ? <textarea id="wcb-rcur" className="wka-input" rows={2} value={rCurrent} autoComplete="off" spellCheck={false} placeholder={t('brainSecurity.common.phrasePlaceholder')} onChange={(e) => setRCurrent(e.target.value)} style={{ resize: 'vertical' }} />
                : <PassInput id="wcb-rcur" value={rCurrent} onChange={setRCurrent} placeholder={t('brainSecurity.common.currentPassphrase')} autoComplete="current-password" />}
            </div>
            <div className="wka-field">
              <label htmlFor="wcb-rnew">{t('brainSecurity.custody.newPassphrase')}</label>
              <PassInput id="wcb-rnew" value={rNew} onChange={setRNew} placeholder={t('brainSecurity.common.atLeast8')} />
              <StrengthBar value={rNew} />
            </div>
            <div className="wka-field">
              <label htmlFor="wcb-rnew2">{t('brainSecurity.custody.repeatNewPassphrase')}</label>
              <PassInput id="wcb-rnew2" value={rNew2} onChange={setRNew2} placeholder={t('brainSecurity.common.typeItAgain')} />
              {rNew2 && rNew2 !== rNew ? <span className="hint" style={{ color: 'var(--wka-red)' }}>{t('brainSecurity.common.passphrasesNoMatch')}</span> : null}
            </div>
          </div>
          {rErr ? <div style={{ marginBottom: 10 }}><ErrorBox error={rErr} /></div> : null}
          <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="wka-btn primary" onClick={rotate} disabled={rBusy}>{rBusy ? <Spinning /> : <KeyRound size={14} />} {t('brainSecurity.common.changePassphrase')}</button>
            <button type="button" className="wka-btn ghost" onClick={() => { setRotating(false); setRErr(null); setRCurrent(''); setRNew(''); setRNew2('') }} disabled={rBusy}>{t('brainSecurity.common.cancel')}</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export: privacy contacts + export password + download
// ---------------------------------------------------------------------------
const emptyContact = () => ({ id: '', name: '', email: '', phone: '', title: '', canReceivePassword: true, canRetrieveSensitive: false })

function Toggle({ on, onChange, label, disabled }) {
  return (
    <label className={`wka-toggle${on ? ' on' : ''}${disabled ? ' disabled' : ''}`} style={{ gap: 8, fontSize: 12.5 }}>
      <input type="checkbox" checked={!!on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <span className="track" style={{ width: 36, height: 20 }}><span className="knob" style={{ width: 14, height: 14, left: on ? 19 : 3 }} /></span>
      <span>{label}</span>
    </label>
  )
}

function PrivacyContacts({ data, onSaved }) {
  const t = useT()
  const [rows, setRows] = useState(() => (data.recipients || []).map((r) => ({ ...r })))
  const [dirty, setDirty] = useState(false)
  const [modal, setModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')
  useEffect(() => { setRows((data.recipients || []).map((r) => ({ ...r }))); setDirty(false) }, [data])

  const edit = (i, patch) => { setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r))); setDirty(true) }
  const remove = (i) => { setRows((rs) => rs.filter((_, k) => k !== i)); setDirty(true) }
  const add = () => { setRows((rs) => [...rs, emptyContact()]); setDirty(true) }
  const invalid = rows.find((r) => !String(r.name || '').trim() || !/^\S+@\S+\.\S+$/.test(String(r.email || '').trim()))

  const save = async (reason) => {
    setBusy(true); setErr(null)
    try {
      const out = await api.workTeamSetPrivacyContacts(rows.map((r) => ({ ...(r.id ? { id: r.id } : {}), name: r.name, email: r.email, phone: r.phone, title: r.title, canReceivePassword: !!r.canReceivePassword, canRetrieveSensitive: !!r.canRetrieveSensitive })), reason)
      setModal(false); setDirty(false); setOk(t('brainSecurity.contacts.saved')); setTimeout(() => setOk(''), 3200)
      onSaved(out)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <div className="wcb-sub">
      <h3><Users size={14} /> {t('brainSecurity.contacts.title')}</h3>
      <p className="desc">{t.rich('brainSecurity.contacts.desc')}</p>
      {ok ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div> : null}
      {rows.length === 0 ? <div className="wka-note"><Info size={14} /> {t('brainSecurity.contacts.empty')}</div> : null}
      <div className="wcb-contacts">
        {rows.map((r, i) => (
          <div key={r.id || `new-${i}`} className="wcb-contact">
            <div className="wcb-contact-grid">
              <div className="wka-field"><label>{t('brainSecurity.contacts.name')}</label><input className="wka-input" value={r.name || ''} maxLength={120} placeholder={t('brainSecurity.contacts.namePlaceholder')} onChange={(e) => edit(i, { name: e.target.value })} /></div>
              <div className="wka-field"><label>{t('brainSecurity.contacts.email')}</label><input className="wka-input" type="email" value={r.email || ''} maxLength={160} placeholder={t('brainSecurity.contacts.emailPlaceholder')} onChange={(e) => edit(i, { email: e.target.value })} /></div>
              <div className="wka-field"><label>{t('brainSecurity.contacts.phone')} <span className="hint">{t('brainSecurity.common.optional')}</span></label><input className="wka-input" value={r.phone || ''} maxLength={40} placeholder={t('brainSecurity.contacts.phonePlaceholder')} onChange={(e) => edit(i, { phone: e.target.value })} /></div>
              <div className="wka-field"><label>{t('brainSecurity.contacts.jobTitle')} <span className="hint">{t('brainSecurity.common.optional')}</span></label><input className="wka-input" value={r.title || ''} maxLength={120} placeholder={t('brainSecurity.contacts.jobTitlePlaceholder')} onChange={(e) => edit(i, { title: e.target.value })} /></div>
            </div>
            <div className="wcb-contact-foot">
              <Toggle on={r.canReceivePassword} onChange={(v) => edit(i, { canReceivePassword: v })} label={t('brainSecurity.contacts.mayReceivePassword')} />
              <Toggle on={r.canRetrieveSensitive} onChange={(v) => edit(i, { canRetrieveSensitive: v })} label={t('brainSecurity.contacts.mayRetrieveSensitive')} />
              <button type="button" className="wka-btn sm ghost" style={{ marginLeft: 'auto', color: 'var(--wka-red)' }} onClick={() => remove(i)} title={t('brainSecurity.contacts.removeTitle')}><Trash2 size={13} /> {t('brainSecurity.contacts.remove')}</button>
            </div>
          </div>
        ))}
      </div>
      {err && !modal ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="wka-btn sm" onClick={add}><Plus size={13} /> {t('brainSecurity.contacts.add')}</button>
        <button type="button" className="wka-btn sm primary" disabled={!dirty || !!invalid || busy} onClick={() => { setErr(null); setModal(true) }} title={invalid ? t('brainSecurity.contacts.invalidTitle') : ''}>
          <Check size={13} /> {t('brainSecurity.contacts.save')}
        </button>
        {dirty ? <span style={{ fontSize: 12, color: 'var(--wka-amber)' }}>{t('brainSecurity.contacts.unsaved')}</span> : null}
      </div>
      {modal ? (
        <ReasonModal
          title={t('brainSecurity.contacts.modalTitle')}
          message={t.n('brainSecurity.contacts.modalMessage', rows.length)}
          confirmLabel={t('brainSecurity.contacts.save')} danger={false}
          busy={busy} error={err}
          onConfirm={save}
          onCancel={() => { if (!busy) setModal(false) }}
        />
      ) : null}
    </div>
  )
}

function ExportPassword({ contacts }) {
  const t = useT()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)      // { delivery, emailedCount, password?, note?, setAt }
  const [copied, copy] = useCopy()
  const eligible = (contacts || []).filter((c) => c.canReceivePassword && c.email).length

  const set = async () => {
    if (busy) return
    if (pw.length < 8) { setErr(new Error(t('brainSecurity.exportPw.errTooShort'))); return }
    if (pw !== pw2) { setErr(new Error(t('brainSecurity.common.passwordsNoMatch'))); return }
    setBusy(true); setErr(null); setResult(null)
    try { const r = await api.workTeamSetExportPassword(pw); setResult(r); setPw(''); setPw2('') }
    catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <div className="wcb-sub">
      <h3><KeyRound size={14} /> {t('brainSecurity.exportPw.title')}</h3>
      <p className="desc">{t('brainSecurity.exportPw.desc')}</p>
      {eligible === 0 ? <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={14} /> {t('brainSecurity.exportPw.noEligible')}</div> : null}
      <div className="wka-formgrid" style={{ maxWidth: 640, marginBottom: 10 }}>
        <div className="wka-field">
          <label htmlFor="wcb-xpw">{t('brainSecurity.exportPw.newLabel')}</label>
          <PassInput id="wcb-xpw" value={pw} onChange={setPw} placeholder={t('brainSecurity.common.atLeast8')} />
          <StrengthBar value={pw} />
        </div>
        <div className="wka-field">
          <label htmlFor="wcb-xpw2">{t('brainSecurity.exportPw.repeatLabel')}</label>
          <PassInput id="wcb-xpw2" value={pw2} onChange={setPw2} placeholder={t('brainSecurity.common.typeItAgain')} />
          {pw2 && pw2 !== pw ? <span className="hint" style={{ color: 'var(--wka-red)' }}>{t('brainSecurity.common.passwordsNoMatch')}</span> : null}
        </div>
      </div>
      {err ? <div style={{ marginBottom: 10 }}><ErrorBox error={err} /></div> : null}
      <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="wka-btn primary" onClick={set} disabled={busy || pw.length < 8 || pw !== pw2}>{busy ? <Spinning /> : <KeyRound size={14} />} {t('brainSecurity.exportPw.setBtn')}</button>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('brainSecurity.exportPw.replacesNote')}</span>
      </div>
      {result ? (
        result.delivery === 'onscreen' ? (
          <div className="wcb-onscreen">
            <div className="k"><AlertTriangle size={14} /> {t('brainSecurity.exportPw.onscreenTitle')}</div>
            <div className="pw"><code className="wka-mono">{result.password}</code>
              <button type="button" className="wka-btn sm" onClick={() => copy(result.password)}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('brainSecurity.common.copied') : t('brainSecurity.common.copy')}</button>
            </div>
            <div className="n">{result.note || t('brainSecurity.exportPw.onscreenNote')}</div>
            <button type="button" className="wka-btn sm ghost" style={{ marginTop: 8 }} onClick={() => setResult(null)}><X size={13} /> {t('brainSecurity.exportPw.sharedHide')}</button>
          </div>
        ) : (
          <div className="wka-note" style={{ marginTop: 12, color: 'var(--wka-emerald)' }}><Mail size={14} /> {t.n('brainSecurity.exportPw.emailed', result.emailedCount || 0, { when: result.setAt ? ` (${fmtWhen(result.setAt)})` : '' })}</div>
        )
      ) : null}
    </div>
  )
}

function DownloadExport({ brainLockedHint }) {
  const t = useT()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)         // { filename, brain, note }
  const run = async (e) => {
    if (e) e.preventDefault()
    if (busy || !pw) return
    setBusy(true); setErr(null); setDone(null)
    try {
      const r = await api.workTeamDataExport(pw)
      const url = URL.createObjectURL(r.blob)
      const a = document.createElement('a'); a.href = url; a.download = r.filename; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setDone({ filename: r.filename, brain: r.brain, note: r.note }); setPw('')
    } catch (er) { setErr(er) } finally { setBusy(false) }
  }
  const needsPw = err && err.status === 409 && err.data && err.data.needsPassword
  return (
    <div className="wcb-sub">
      <h3><FileArchive size={14} /> {t('brainSecurity.download.title')}</h3>
      <p className="desc">{t.rich('brainSecurity.download.desc', null, { code: (c) => <code className="wka-mono">{c}</code> })}</p>
      {brainLockedHint ? <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> {t('brainSecurity.download.lockedHint')}</div> : null}
      <form onSubmit={run} className="wcb-actions" style={{ justifyContent: 'flex-start', alignItems: 'flex-end', marginTop: 0 }}>
        <div className="wka-field" style={{ minWidth: 260, flex: '0 1 360px' }}>
          <label htmlFor="wcb-dlpw">{t('brainSecurity.download.pwLabel')}</label>
          <PassInput id="wcb-dlpw" value={pw} onChange={setPw} placeholder={t('brainSecurity.download.pwPlaceholder')} autoComplete="current-password" />
        </div>
        <button type="submit" className="wka-btn primary" disabled={busy || !pw}>{busy ? <Spinning /> : <Download size={14} />} {t('brainSecurity.download.btn')}</button>
      </form>
      {err ? (
        <div style={{ marginTop: 10 }}>
          {needsPw
            ? <div className="wka-note" style={{ color: 'var(--wka-amber)', marginBottom: 0 }}><AlertTriangle size={14} /> {t('brainSecurity.download.needsPw')}</div>
            : <ErrorBox error={err} />}
        </div>
      ) : null}
      {done ? (
        <div className="wka-note" style={{ marginTop: 12, marginBottom: 0, color: done.brain === 'skipped' ? 'var(--wka-amber)' : 'var(--wka-emerald)', alignItems: 'flex-start' }}>
          {done.brain === 'skipped' ? <AlertTriangle size={14} style={{ marginTop: 2 }} /> : <Check size={14} style={{ marginTop: 2 }} />}
          <span>
            {t.rich('brainSecurity.download.done', { file: done.filename, state: done.brain === 'skipped' ? t('brainSecurity.download.skipped') : t('brainSecurity.download.included') }, { code: (c) => <code className="wka-mono">{c}</code> })}
            {done.note ? <> {done.note}</> : null}
          </span>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------
export default function BrainSecurity() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, sec: null, contacts: null })
  const [refreshing, setRefreshing] = useState(false)
  const [wizard, setWizard] = useState(false)
  // Re-armed inside the effect (not just initialised) so React 18 StrictMode's
  // dev mount -> unmount -> mount cycle cannot leave it stuck at false.
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [sec, contacts] = await Promise.all([api.workBrainSecurity(), api.workTeamPrivacyContacts()])
      if (mounted.current) setState({ loading: false, error: null, sec, contacts })
    } catch (error) {
      if (mounted.current && !isRefresh) setState({ loading: false, error, sec: null, contacts: null })
    } finally { if (mounted.current) setRefreshing(false) }
  }, [])
  useEffect(() => { load(false) }, [load])

  if (state.loading) return <Loading label={t('brainSecurity.common.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />
  const sec = state.sec || {}
  const contacts = state.contacts || { recipients: [] }

  return (
    <div className="wcb">
      <style>{WCB_CSS}</style>

      <div className="wka-cards">
        <div className={`wka-card${sec.enabled ? ' accent' : ''}`}>
          <div className="k"><Lock size={15} /> {t('brainSecurity.section.keyCustody')}</div>
          <div className="v" style={{ fontSize: 22 }}>{sec.enabled ? t('brainSecurity.section.custodyYou') : t('brainSecurity.section.custodyPlatform')}</div>
          <div className="foot">{sec.enabled ? t('brainSecurity.section.custodyYouFoot') : t('brainSecurity.section.custodyPlatformFoot')}</div>
        </div>
        <div className="wka-card">
          <div className="k">{sec.enabled && sec.locked ? <Lock size={15} /> : <Unlock size={15} />} {t('brainSecurity.section.brainState')}</div>
          <div className="v" style={{ fontSize: 22 }}>{!sec.enabled ? t('brainSecurity.section.stateAvailable') : sec.locked ? t('brainSecurity.section.stateLocked') : t('brainSecurity.section.stateUnlocked')}</div>
          <div className="foot">{!sec.enabled ? t('brainSecurity.section.footAvailable') : sec.locked ? t('brainSecurity.section.footLocked') : t('brainSecurity.section.footRelocks', { n: sec.unlockWindowMinutes || 30 })}</div>
        </div>
        <div className="wka-card">
          <div className="k"><FileArchive size={15} /> {t('brainSecurity.section.privacyContacts')}</div>
          <div className="v" style={{ fontSize: 22 }}>{(contacts.recipients || []).length}</div>
          <div className="foot">{t('brainSecurity.section.mayReceiveFoot', { n: (contacts.recipients || []).filter((c) => c.canReceivePassword).length })}</div>
        </div>
      </div>

      {sec.semanticSearchReady === false ? (
        <div className="wka-note" style={{ color: 'var(--wka-amber)', borderColor: 'color-mix(in srgb, var(--wka-amber) 36%, transparent)' }}>
          <ShieldAlert size={14} /> {sec.note || t('brainSecurity.section.semanticFallback')}
        </div>
      ) : null}

      <div className="wka-toolbar" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>{refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('brainSecurity.common.refresh')}</button>
      </div>

      {/* ---- Custody ---- */}
      {sec.enabled ? (
        <CustodyPanel sec={sec} onChanged={() => load(true)} />
      ) : wizard ? (
        <EnableWizard onDone={() => { setWizard(false); load(true) }} onCancel={() => setWizard(false)} />
      ) : (
        <div className="wka-panel">
          <h2><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('brainSecurity.section.offTitle')}</h2>
          <p className="desc">{t('brainSecurity.section.offDesc')}</p>
          <ul className="wcb-facts">
            <li><ShieldCheck size={13} /> {t('brainSecurity.section.fact1')}</li>
            <li><Clock size={13} /> {t('brainSecurity.section.fact2', { n: sec.unlockWindowMinutes || 30 })}</li>
            <li><AlertTriangle size={13} /> {t('brainSecurity.section.fact3')}</li>
          </ul>
          <button type="button" className="wka-btn primary" onClick={() => setWizard(true)}><Lock size={14} /> {t('brainSecurity.section.enable')}</button>
        </div>
      )}

      {/* ---- Export ---- */}
      <div className="wka-panel">
        <h2><Download size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('brainSecurity.section.exportTitle')}</h2>
        <p className="desc">{t('brainSecurity.section.exportDesc')}</p>
        <PrivacyContacts data={contacts} onSaved={(out) => setState((s) => ({ ...s, contacts: out }))} />
        <ExportPassword contacts={contacts.recipients} />
        <DownloadExport brainLockedHint={!!(sec.enabled && sec.locked)} />
      </div>
    </div>
  )
}

// Scoped styles for this section only (tokens come from the console theme).
const WCB_CSS = `
.wcb-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
.wcb-status { display:flex; gap:6px; flex-wrap:wrap; }
.wcb-facts { list-style:none; margin:0 0 16px; padding:0; display:flex; flex-direction:column; gap:7px; }
.wcb-facts li { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--wka-muted); line-height:1.5; }
.wcb-facts li svg { color:var(--wka-accent); flex:none; margin-top:3px; }
.wcb-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:14px; justify-content:flex-end; }
.wcb-sub { border-top:1px solid var(--wka-line); margin-top:16px; padding-top:14px; }
.wcb-sub h3 { display:flex; align-items:center; gap:7px; margin:0 0 5px; font-family:var(--wka-font-head); font-size:14px; font-weight:700; color:var(--wka-text); }
.wcb-sub h3 svg { color:var(--wka-accent); }
.wcb-pass { position:relative; display:flex; }
.wcb-pass .wka-input { width:100%; padding-right:36px; }
.wcb-pass .eye { position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--wka-faint); padding:4px; border-radius:6px; display:grid; place-items:center; }
.wcb-pass .eye:hover { color:var(--wka-accent); }
.wcb-strength { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; }
.wcb-strength .track { flex:1; height:4px; border-radius:999px; background:var(--wka-line-2); overflow:hidden; }
.wcb-strength .fill { height:100%; border-radius:999px; transition:width .2s, background .2s; }
.wcb-ack { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:11px; border:1px solid color-mix(in srgb, var(--wka-amber) 36%, transparent); background:color-mix(in srgb, var(--wka-amber) 8%, transparent); font-size:13px; color:var(--wka-text); line-height:1.5; cursor:pointer; max-width:640px; }
.wcb-ack input { width:16px; height:16px; margin-top:2px; flex:none; accent-color:var(--wka-accent); }
.wcb-steps { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
.wcb-step { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:600; color:var(--wka-faint); padding:4px 10px 4px 4px; border-radius:999px; border:1px solid var(--wka-line); background:var(--wka-panel); }
.wcb-step i { width:20px; height:20px; border-radius:50%; display:grid; place-items:center; font-style:normal; font-size:11px; background:var(--wka-line); color:var(--wka-muted); }
.wcb-step.on { color:var(--wka-accent-ink); border-color:var(--wka-accent-line); }
.wcb-step.on i { background:var(--wka-accent); color:#fff; }
.wcb-step.done { color:var(--wka-emerald); }
.wcb-step.done i { background:color-mix(in srgb, var(--wka-emerald) 18%, transparent); color:var(--wka-emerald); }
.wcb-words { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; padding:14px; border-radius:12px; border:1px solid var(--wka-accent-line); background:var(--wka-panel); }
.wcb-word { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:9px; background:var(--wka-bg-2); border:1px solid var(--wka-line); font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:13.5px; font-weight:600; color:var(--wka-text); letter-spacing:.01em; user-select:all; }
.wcb-word i { font-style:normal; font-size:10.5px; font-weight:700; color:var(--wka-faint); min-width:18px; text-align:right; font-variant-numeric:tabular-nums; }
.wcb-verify { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 220px)); gap:12px; }
.wcb-seg { display:inline-flex; gap:4px; padding:3px; border-radius:10px; background:var(--wka-bg-2); border:1px solid var(--wka-line); margin-bottom:12px; }
.wcb-seg button { display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; font:inherit; font-size:12.5px; font-weight:600; color:var(--wka-muted); padding:6px 11px; border-radius:8px; cursor:pointer; }
.wcb-seg button.on { background:var(--wka-panel); color:var(--wka-accent-ink); box-shadow:0 1px 2px rgba(26,31,54,0.08); }
.wcb-contacts { display:flex; flex-direction:column; gap:10px; }
.wcb-contact { border:1px solid var(--wka-line); border-radius:12px; background:var(--wka-bg-2); padding:12px; }
.wcb-contact-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px 12px; }
.wcb-contact-foot { display:flex; align-items:center; gap:18px; flex-wrap:wrap; margin-top:10px; }
.wcb-contact-foot .wka-toggle { position:relative; }
.wcb-onscreen { margin-top:12px; padding:12px 14px; border-radius:12px; border:1px solid color-mix(in srgb, var(--wka-amber) 40%, transparent); background:color-mix(in srgb, var(--wka-amber) 9%, transparent); max-width:640px; }
.wcb-onscreen .k { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:var(--wka-amber); text-transform:uppercase; letter-spacing:.05em; }
.wcb-onscreen .pw { display:flex; align-items:center; gap:10px; margin:8px 0 6px; }
.wcb-onscreen .pw code { font-size:16px; font-weight:700; padding:8px 12px; border-radius:9px; background:var(--wka-panel); border:1px solid var(--wka-line); word-break:break-all; }
.wcb-onscreen .n { font-size:12.5px; color:var(--wka-muted); line-height:1.5; }
`
