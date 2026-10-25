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
  const label = s.length < 8 ? 'Too short' : ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'][n]
  return { score: n, label, pct: s.length < 8 ? 12 : [28, 48, 70, 88, 100][n] }
}

function StrengthBar({ value }) {
  const st = passStrength(value)
  if (!value) return null
  const tone = st.label === 'Too short' || st.score === 0 ? 'var(--wka-red)' : st.score === 1 ? 'var(--wka-amber)' : 'var(--wka-emerald)'
  return (
    <div className="wcb-strength" aria-live="polite">
      <div className="track"><div className="fill" style={{ width: `${st.pct}%`, background: tone }} /></div>
      <span style={{ color: tone }}>{st.label}</span>
    </div>
  )
}

function PassInput({ value, onChange, placeholder, autoFocus, autoComplete = 'new-password', id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="wcb-pass">
      <input id={id} className="wka-input" type={show ? 'text' : 'password'} value={value} autoFocus={autoFocus} autoComplete={autoComplete}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide' : 'Show'} title={show ? 'Hide' : 'Show'}>
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
    if (bad.length) { setVerifyErr(`Word${bad.length === 1 ? '' : 's'} #${bad.map((i) => i + 1).join(', #')} ${bad.length === 1 ? 'does' : 'do'} not match. Check your saved copy and try again.`); return }
    setResult(null)   // drop the phrase from memory; it is never shown again
    onDone()
  }

  return (
    <div className="wka-panel wcb-wizard">
      <div className="wcb-steps" aria-label="Progress">
        {['Passphrase', 'Recovery phrase', 'Confirm saved'].map((label, i) => (
          <span key={label} className={`wcb-step${step === i + 1 ? ' on' : step > i + 1 ? ' done' : ''}`}>
            <i>{step > i + 1 ? <Check size={11} /> : i + 1}</i>{label}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <>
          <h2><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />Choose your passphrase</h2>
          <p className="desc">Your Company Brain is encrypted at rest with AES-256-GCM under a key only you hold. This passphrase wraps that key. WorkCoPilot never stores the passphrase or the recovery phrase, so there is no backdoor - like a crypto wallet.</p>
          <div className="wka-formgrid" style={{ maxWidth: 640 }}>
            <div className="wka-field">
              <label htmlFor="wcb-pass">Passphrase</label>
              <PassInput id="wcb-pass" value={pass} onChange={setPass} placeholder="At least 8 characters - a long sentence is best" autoFocus />
              <StrengthBar value={pass} />
              {!pass ? <span className="hint">Tip: 4-5 unrelated words are easy to remember and hard to guess.</span> : null}
            </div>
            <div className="wka-field">
              <label htmlFor="wcb-pass2">Repeat passphrase</label>
              <PassInput id="wcb-pass2" value={pass2} onChange={setPass2} placeholder="Type it again" />
              {pass2 && pass2 !== pass ? <span className="hint" style={{ color: 'var(--wka-red)' }}>The passphrases do not match.</span> : pass2 && pass2 === pass ? <span className="hint" style={{ color: 'var(--wka-emerald)' }}>Matches.</span> : null}
            </div>
          </div>
          <label className="wcb-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>I understand that if I lose <b>both</b> my passphrase and my recovery phrase, the data cannot be recovered - there is no backdoor, and WorkCoPilot cannot reset it for me.</span>
          </label>
          {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
          <div className="wcb-actions">
            <button type="button" className="wka-btn ghost" onClick={onCancel} disabled={busy}><X size={14} /> Cancel</button>
            <button type="button" className="wka-btn primary" onClick={enable} disabled={!canEnable} title={!ack ? 'Tick the acknowledgement first' : st.label === 'Too short' ? 'At least 8 characters' : ''}>
              {busy ? <Spinning /> : <Lock size={14} />} Enable private encryption
            </button>
          </div>
        </>
      ) : null}

      {step === 2 && result ? (
        <>
          <h2><Fingerprint size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />Your recovery phrase - shown only once</h2>
          <p className="desc">Write these {words.length} words down, in order, and keep them somewhere safe and offline (a password manager or a safe). They unlock your Company Brain if you forget the passphrase. WorkCoPilot does not keep a copy and cannot show them again.</p>
          <div className="wcb-words" role="list" aria-label="Recovery phrase">
            {words.map((w, i) => (
              <span key={i} className="wcb-word" role="listitem"><i>{i + 1}</i>{w}</span>
            ))}
          </div>
          <div className="wcb-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="wka-btn sm" onClick={() => copy(words.join(' '))}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy phrase'}</button>
            <button type="button" className="wka-btn primary" onClick={toVerify}><Check size={14} /> I have saved it</button>
          </div>
          <div className="wka-note" style={{ marginTop: 14, marginBottom: 0, color: 'var(--wka-amber)' }}><AlertTriangle size={14} /> Anyone holding this phrase can unlock your Company Brain. Do not paste it into chat, email or a ticket.</div>
        </>
      ) : null}

      {step === 3 && result ? (
        <>
          <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />Confirm you saved it</h2>
          <p className="desc">Type the requested words from your saved copy. This is the last time the phrase can be checked against what WorkCoPilot holds in memory for this step.</p>
          <div className="wcb-verify">
            {checks.map((i) => (
              <div key={i} className="wka-field">
                <label htmlFor={`wcb-w${i}`}>Word #{i + 1}</label>
                <input id={`wcb-w${i}`} className="wka-input" value={answers[i] || ''} autoComplete="off" spellCheck={false} autoFocus={i === checks[0]}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') verify() }} />
              </div>
            ))}
          </div>
          {verifyErr ? <div className="wka-error" style={{ marginTop: 10 }}><span className="msg"><AlertTriangle size={16} /> {verifyErr}</span></div> : null}
          <div className="wcb-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="wka-btn ghost" onClick={() => { setStep(2); setVerifyErr(null) }}>Show the phrase again</button>
            <button type="button" className="wka-btn primary" onClick={verify} disabled={checks.some((i) => !String(answers[i] || '').trim())}><ArrowRight size={14} /> Confirm and continue</button>
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
      setSecret(''); flash(`Unlocked. It re-locks after ${sec.unlockWindowMinutes || 30} idle minutes.`); onChanged()
    } catch (er) { setErr(er) } finally { setBusy(false) }
  }
  const lock = async () => {
    if (busy) return
    setBusy(true); setErr(null)
    try { await api.workBrainLock(); flash('Locked. Guidance stops drawing on the Company Brain until it is unlocked again.'); onChanged() }
    catch (er) { setErr(er) } finally { setBusy(false) }
  }
  const rotate = async () => {
    if (rBusy) return
    if (rNew.length < 8) { setRErr(new Error('Choose a new passphrase of at least 8 characters.')); return }
    if (rNew !== rNew2) { setRErr(new Error('The new passphrases do not match.')); return }
    if (!rCurrent.trim()) { setRErr(new Error(rMode === 'recovery' ? 'Enter your recovery phrase.' : 'Enter your current passphrase.')); return }
    setRBusy(true); setRErr(null)
    try {
      await api.workBrainRotatePassphrase({ ...(rMode === 'recovery' ? { recoveryPhrase: rCurrent.trim() } : { currentPassphrase: rCurrent }), newPassphrase: rNew })
      setRotating(false); setRCurrent(''); setRNew(''); setRNew2('')
      flash('Passphrase changed. Your recovery phrase is unchanged and still works.'); onChanged()
    } catch (er) { setRErr(er) } finally { setRBusy(false) }
  }

  const locked = !!sec.locked
  return (
    <div className="wka-panel">
      <div className="wcb-head">
        <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-emerald)' }} />Private encryption is on</h2>
        <div className="wcb-status">
          <span className="wka-badge active"><Lock size={11} /> Encrypted - key held by you</span>
          {locked
            ? <span className="wka-badge paused"><Lock size={11} /> Locked</span>
            : <span className="wka-badge active"><Unlock size={11} /> Unlocked</span>}
          <span className="wka-badge" title="After this much idle time the brain re-locks on its own."><Clock size={11} /> {sec.unlockWindowMinutes || 30} min idle window</span>
        </div>
      </div>
      <p className="desc">Your Company Brain is encrypted at rest with AES-256-GCM under a key only you hold{sec.dekId ? <> (key id <code className="wka-mono">{String(sec.dekId).slice(0, 12)}</code>)</> : null}. While locked, guidance cannot draw on it and the encrypted export skips it. Unlock it for your team with the passphrase; it re-locks after {sec.unlockWindowMinutes || 30} idle minutes.</p>

      {ok ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div> : null}
      {err ? <div style={{ marginBottom: 12 }}><ErrorBox error={err} /></div> : null}

      {locked ? (
        <form onSubmit={unlock} className="wcb-unlock">
          <div className="wcb-seg" role="tablist" aria-label="Unlock with">
            <button type="button" role="tab" aria-selected={mode === 'passphrase'} className={mode === 'passphrase' ? 'on' : ''} onClick={() => { setMode('passphrase'); setSecret('') }}><KeyRound size={13} /> Passphrase</button>
            <button type="button" role="tab" aria-selected={mode === 'recovery'} className={mode === 'recovery' ? 'on' : ''} onClick={() => { setMode('recovery'); setSecret('') }}><Fingerprint size={13} /> Recovery phrase</button>
          </div>
          <div className="wka-field" style={{ maxWidth: 520 }}>
            <label htmlFor="wcb-unlock">{mode === 'recovery' ? 'Your 24-word recovery phrase' : 'Passphrase'}</label>
            {mode === 'recovery'
              ? <textarea id="wcb-unlock" className="wka-input" rows={2} value={secret} autoComplete="off" spellCheck={false} placeholder="word1 word2 word3 ..." onChange={(e) => setSecret(e.target.value)} style={{ resize: 'vertical' }} />
              : <PassInput id="wcb-unlock" value={secret} onChange={setSecret} placeholder="Your passphrase" autoComplete="current-password" />}
          </div>
          <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="wka-btn primary" disabled={busy || !secret.trim()}>{busy ? <Spinning /> : <Unlock size={14} />} Unlock Company Brain</button>
            <button type="button" className="wka-btn ghost" onClick={() => setRotating((v) => !v)} disabled={busy}><RefreshCw size={14} /> Change passphrase</button>
          </div>
        </form>
      ) : (
        <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="wka-btn" onClick={lock} disabled={busy}>{busy ? <Spinning /> : <Lock size={14} />} Lock now</button>
          <button type="button" className="wka-btn ghost" onClick={() => setRotating((v) => !v)} disabled={busy}><RefreshCw size={14} /> Change passphrase</button>
        </div>
      )}

      {rotating ? (
        <div className="wcb-sub">
          <h3><RefreshCw size={14} /> Change the passphrase</h3>
          <p className="desc">Prove you hold the current passphrase or the recovery phrase, then choose a new one. The recovery phrase stays the same.</p>
          <div className="wcb-seg" role="tablist" aria-label="Prove with">
            <button type="button" role="tab" aria-selected={rMode === 'passphrase'} className={rMode === 'passphrase' ? 'on' : ''} onClick={() => { setRMode('passphrase'); setRCurrent('') }}><KeyRound size={13} /> Current passphrase</button>
            <button type="button" role="tab" aria-selected={rMode === 'recovery'} className={rMode === 'recovery' ? 'on' : ''} onClick={() => { setRMode('recovery'); setRCurrent('') }}><Fingerprint size={13} /> Recovery phrase</button>
          </div>
          <div className="wka-formgrid" style={{ maxWidth: 640, marginBottom: 10 }}>
            <div className="wka-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="wcb-rcur">{rMode === 'recovery' ? 'Recovery phrase' : 'Current passphrase'}</label>
              {rMode === 'recovery'
                ? <textarea id="wcb-rcur" className="wka-input" rows={2} value={rCurrent} autoComplete="off" spellCheck={false} placeholder="word1 word2 word3 ..." onChange={(e) => setRCurrent(e.target.value)} style={{ resize: 'vertical' }} />
                : <PassInput id="wcb-rcur" value={rCurrent} onChange={setRCurrent} placeholder="Current passphrase" autoComplete="current-password" />}
            </div>
            <div className="wka-field">
              <label htmlFor="wcb-rnew">New passphrase</label>
              <PassInput id="wcb-rnew" value={rNew} onChange={setRNew} placeholder="At least 8 characters" />
              <StrengthBar value={rNew} />
            </div>
            <div className="wka-field">
              <label htmlFor="wcb-rnew2">Repeat new passphrase</label>
              <PassInput id="wcb-rnew2" value={rNew2} onChange={setRNew2} placeholder="Type it again" />
              {rNew2 && rNew2 !== rNew ? <span className="hint" style={{ color: 'var(--wka-red)' }}>The passphrases do not match.</span> : null}
            </div>
          </div>
          {rErr ? <div style={{ marginBottom: 10 }}><ErrorBox error={rErr} /></div> : null}
          <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="wka-btn primary" onClick={rotate} disabled={rBusy}>{rBusy ? <Spinning /> : <KeyRound size={14} />} Change passphrase</button>
            <button type="button" className="wka-btn ghost" onClick={() => { setRotating(false); setRErr(null); setRCurrent(''); setRNew(''); setRNew2('') }} disabled={rBusy}>Cancel</button>
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
      setModal(false); setDirty(false); setOk('Privacy contacts saved. Logged to the audit trail.'); setTimeout(() => setOk(''), 3200)
      onSaved(out)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <div className="wcb-sub">
      <h3><Users size={14} /> Privacy contacts</h3>
      <p className="desc">The named people at your company who may <b>receive the export password</b> (by email, when you set it) and who are authorized to <b>retrieve sensitive data</b>. These are people, not app roles. Changes need a reason and are logged.</p>
      {ok ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div> : null}
      {rows.length === 0 ? <div className="wka-note"><Info size={14} /> No privacy contacts yet. Add at least one person who may receive the export password.</div> : null}
      <div className="wcb-contacts">
        {rows.map((r, i) => (
          <div key={r.id || `new-${i}`} className="wcb-contact">
            <div className="wcb-contact-grid">
              <div className="wka-field"><label>Name</label><input className="wka-input" value={r.name || ''} maxLength={120} placeholder="Alex Morgan" onChange={(e) => edit(i, { name: e.target.value })} /></div>
              <div className="wka-field"><label>Email</label><input className="wka-input" type="email" value={r.email || ''} maxLength={160} placeholder="alex@yourcompany.com" onChange={(e) => edit(i, { email: e.target.value })} /></div>
              <div className="wka-field"><label>Phone <span className="hint">optional</span></label><input className="wka-input" value={r.phone || ''} maxLength={40} placeholder="+1 555 0100" onChange={(e) => edit(i, { phone: e.target.value })} /></div>
              <div className="wka-field"><label>Title <span className="hint">optional</span></label><input className="wka-input" value={r.title || ''} maxLength={120} placeholder="Data Protection Officer" onChange={(e) => edit(i, { title: e.target.value })} /></div>
            </div>
            <div className="wcb-contact-foot">
              <Toggle on={r.canReceivePassword} onChange={(v) => edit(i, { canReceivePassword: v })} label="May receive the export password" />
              <Toggle on={r.canRetrieveSensitive} onChange={(v) => edit(i, { canRetrieveSensitive: v })} label="May retrieve sensitive data" />
              <button type="button" className="wka-btn sm ghost" style={{ marginLeft: 'auto', color: 'var(--wka-red)' }} onClick={() => remove(i)} title="Remove this contact"><Trash2 size={13} /> Remove</button>
            </div>
          </div>
        ))}
      </div>
      {err && !modal ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="wka-btn sm" onClick={add}><Plus size={13} /> Add contact</button>
        <button type="button" className="wka-btn sm primary" disabled={!dirty || !!invalid || busy} onClick={() => { setErr(null); setModal(true) }} title={invalid ? 'Every contact needs a name and a valid email' : ''}>
          <Check size={13} /> Save contacts
        </button>
        {dirty ? <span style={{ fontSize: 12, color: 'var(--wka-amber)' }}>Unsaved changes</span> : null}
      </div>
      {modal ? (
        <ReasonModal
          title="Save privacy contacts"
          message={`Update the list of people who may receive the export password or retrieve sensitive data (${rows.length} contact${rows.length === 1 ? '' : 's'}). Anyone removed stops receiving the export password from now on.`}
          confirmLabel="Save contacts" danger={false}
          busy={busy} error={err}
          onConfirm={save}
          onCancel={() => { if (!busy) setModal(false) }}
        />
      ) : null}
    </div>
  )
}

function ExportPassword({ contacts }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)      // { delivery, emailedCount, password?, note?, setAt }
  const [copied, copy] = useCopy()
  const eligible = (contacts || []).filter((c) => c.canReceivePassword && c.email).length

  const set = async () => {
    if (busy) return
    if (pw.length < 8) { setErr(new Error('The export password must be at least 8 characters.')); return }
    if (pw !== pw2) { setErr(new Error('The passwords do not match.')); return }
    setBusy(true); setErr(null); setResult(null)
    try { const r = await api.workTeamSetExportPassword(pw); setResult(r); setPw(''); setPw2('') }
    catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <div className="wcb-sub">
      <h3><KeyRound size={14} /> Export password</h3>
      <p className="desc">The archive is encrypted with AES-256-GCM under a key derived from this password. WorkCoPilot keeps only a verifier (enough to check the password, not to decrypt the archive). When you set it, the password alone is emailed to the privacy contacts who may receive it - never the archive, never a link.</p>
      {eligible === 0 ? <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={14} /> No privacy contact is marked "may receive the export password". If email is on, nobody will be sent the password - add a contact above first.</div> : null}
      <div className="wka-formgrid" style={{ maxWidth: 640, marginBottom: 10 }}>
        <div className="wka-field">
          <label htmlFor="wcb-xpw">New export password</label>
          <PassInput id="wcb-xpw" value={pw} onChange={setPw} placeholder="At least 8 characters" />
          <StrengthBar value={pw} />
        </div>
        <div className="wka-field">
          <label htmlFor="wcb-xpw2">Repeat password</label>
          <PassInput id="wcb-xpw2" value={pw2} onChange={setPw2} placeholder="Type it again" />
          {pw2 && pw2 !== pw ? <span className="hint" style={{ color: 'var(--wka-red)' }}>The passwords do not match.</span> : null}
        </div>
      </div>
      {err ? <div style={{ marginBottom: 10 }}><ErrorBox error={err} /></div> : null}
      <div className="wcb-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="wka-btn primary" onClick={set} disabled={busy || pw.length < 8 || pw !== pw2}>{busy ? <Spinning /> : <KeyRound size={14} />} Set export password</button>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>Setting a new one replaces the old; earlier archives still open with the password they were made with.</span>
      </div>
      {result ? (
        result.delivery === 'onscreen' ? (
          <div className="wcb-onscreen">
            <div className="k"><AlertTriangle size={14} /> Shown once - email is not configured</div>
            <div className="pw"><code className="wka-mono">{result.password}</code>
              <button type="button" className="wka-btn sm" onClick={() => copy(result.password)}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div className="n">{result.note || 'Share it with your authorized recipients now; it is not shown again.'}</div>
            <button type="button" className="wka-btn sm ghost" style={{ marginTop: 8 }} onClick={() => setResult(null)}><X size={13} /> I have shared it - hide</button>
          </div>
        ) : (
          <div className="wka-note" style={{ marginTop: 12, color: 'var(--wka-emerald)' }}><Mail size={14} /> Export password set{result.setAt ? ` (${fmtWhen(result.setAt)})` : ''}. Emailed to {result.emailedCount || 0} privacy contact{result.emailedCount === 1 ? '' : 's'} - password only, no archive.</div>
        )
      ) : null}
    </div>
  )
}

function DownloadExport({ brainLockedHint }) {
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
      <h3><FileArchive size={14} /> Download my data</h3>
      <p className="desc">Everything WorkCoPilot holds for your company - people, sessions, knowledge base, skills, policies and (when unlocked) the Company Brain - as one <code className="wka-mono">.wcpx</code> archive encrypted with AES-256-GCM. Open it on your side with the standalone WCPX opener and the export password. Every download is logged.</p>
      {brainLockedHint ? <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> Your Company Brain is locked, so it will be skipped in this export. Unlock it above first if you want it included.</div> : null}
      <form onSubmit={run} className="wcb-actions" style={{ justifyContent: 'flex-start', alignItems: 'flex-end', marginTop: 0 }}>
        <div className="wka-field" style={{ minWidth: 260, flex: '0 1 360px' }}>
          <label htmlFor="wcb-dlpw">Export password</label>
          <PassInput id="wcb-dlpw" value={pw} onChange={setPw} placeholder="The export password you set" autoComplete="current-password" />
        </div>
        <button type="submit" className="wka-btn primary" disabled={busy || !pw}>{busy ? <Spinning /> : <Download size={14} />} Download .wcpx</button>
      </form>
      {err ? (
        <div style={{ marginTop: 10 }}>
          {needsPw
            ? <div className="wka-note" style={{ color: 'var(--wka-amber)', marginBottom: 0 }}><AlertTriangle size={14} /> No export password is set yet. Set one above, then download.</div>
            : <ErrorBox error={err} />}
        </div>
      ) : null}
      {done ? (
        <div className="wka-note" style={{ marginTop: 12, marginBottom: 0, color: done.brain === 'skipped' ? 'var(--wka-amber)' : 'var(--wka-emerald)', alignItems: 'flex-start' }}>
          {done.brain === 'skipped' ? <AlertTriangle size={14} style={{ marginTop: 2 }} /> : <Check size={14} style={{ marginTop: 2 }} />}
          <span>
            Downloaded <code className="wka-mono">{done.filename}</code>. Company Brain: <b>{done.brain === 'skipped' ? 'skipped' : 'included'}</b>.
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

  if (state.loading) return <Loading label="Checking your encryption and export settings" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />
  const sec = state.sec || {}
  const contacts = state.contacts || { recipients: [] }

  return (
    <div className="wcb">
      <style>{WCB_CSS}</style>

      <div className="wka-cards">
        <div className={`wka-card${sec.enabled ? ' accent' : ''}`}>
          <div className="k"><Lock size={15} /> Key custody</div>
          <div className="v" style={{ fontSize: 22 }}>{sec.enabled ? 'You' : 'WorkCoPilot'}</div>
          <div className="foot">{sec.enabled ? 'Only you hold the key' : 'Platform-managed key, encrypted at rest'}</div>
        </div>
        <div className="wka-card">
          <div className="k">{sec.enabled && sec.locked ? <Lock size={15} /> : <Unlock size={15} />} Brain state</div>
          <div className="v" style={{ fontSize: 22 }}>{!sec.enabled ? 'Available' : sec.locked ? 'Locked' : 'Unlocked'}</div>
          <div className="foot">{!sec.enabled ? 'Guidance can use it' : sec.locked ? 'Guidance paused until unlocked' : `Re-locks after ${sec.unlockWindowMinutes || 30} idle min`}</div>
        </div>
        <div className="wka-card">
          <div className="k"><FileArchive size={15} /> Privacy contacts</div>
          <div className="v" style={{ fontSize: 22 }}>{(contacts.recipients || []).length}</div>
          <div className="foot">{(contacts.recipients || []).filter((c) => c.canReceivePassword).length} may receive the export password</div>
        </div>
      </div>

      {sec.semanticSearchReady === false ? (
        <div className="wka-note" style={{ color: 'var(--wka-amber)', borderColor: 'color-mix(in srgb, var(--wka-amber) 36%, transparent)' }}>
          <ShieldAlert size={14} /> {sec.note || 'Semantic search is running in keyword-only mode until the on-device model is available.'}
        </div>
      ) : null}

      <div className="wka-toolbar" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>{refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh</button>
      </div>

      {/* ---- Custody ---- */}
      {sec.enabled ? (
        <CustodyPanel sec={sec} onChanged={() => load(true)} />
      ) : wizard ? (
        <EnableWizard onDone={() => { setWizard(false); load(true) }} onCancel={() => setWizard(false)} />
      ) : (
        <div className="wka-panel">
          <h2><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />Private encryption (customer-held key)</h2>
          <p className="desc">Today your Company Brain is encrypted at rest with a key WorkCoPilot manages for you. Turn on private encryption and the key is wrapped under a passphrase only you hold, with a 24-word recovery phrase as the only backup. WorkCoPilot can no longer open it on its own - like a crypto wallet, there is no backdoor.</p>
          <ul className="wcb-facts">
            <li><ShieldCheck size={13} /> AES-256-GCM at rest; your passphrase wraps the data key, which is never stored in the clear.</li>
            <li><Clock size={13} /> You unlock it for your team; it re-locks after {sec.unlockWindowMinutes || 30} idle minutes.</li>
            <li><AlertTriangle size={13} /> Lose both the passphrase and the recovery phrase and the data is gone - nobody can recover it.</li>
          </ul>
          <button type="button" className="wka-btn primary" onClick={() => setWizard(true)}><Lock size={14} /> Enable private encryption</button>
        </div>
      )}

      {/* ---- Export ---- */}
      <div className="wka-panel">
        <h2><Download size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />Encrypted data export</h2>
        <p className="desc">Take a complete, password-encrypted copy of your company's data whenever you want. Decide who may receive the password, set it, then download.</p>
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
