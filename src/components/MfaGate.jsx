import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import qrcode from 'qrcode-generator'
import { ShieldCheck, Smartphone, ScanLine, KeyRound, Copy, Check, Download, Loader2, ArrowRight, AlertCircle, ChevronDown } from 'lucide-react'

// ---------------------------------------------------------------------------
// MfaGate - the two-factor step of WorkCoPilot sign-in.
//
// Props
//   mode        'setup' | 'verify'
//   enroll      { secret, otpauthUri }   setup mode only
//   onSubmit    async (code) => {}       parent calls the API; THROWS on a bad
//                                        code (err.message is shown inline)
//   onDone      () => {}                 setup mode: called after the user
//                                        confirms they saved their backup codes
//   busy        boolean                  parent-controlled in-flight flag
//   username    string                   shown as "Signing in as X"
//   backupCodes string[]                 setup mode: once the parent sets this
//                                        (after onSubmit resolves) the
//                                        component moves to the backup-codes
//                                        panel. Derived, no extra state.
//
// Phases (setup):  form -> (onSubmit resolves) verified -> (backupCodes set) codes
// Phases (verify): form -> (onSubmit resolves) verified; parent navigates away.
//
// Design: calm "security card" in the sign-in screen's own language (Bricolage
// Grotesque headings, Figtree body, JetBrains Mono for codes, emerald / blue
// accents, the warm CTA). The one memorable detail is the QR "viewfinder": four
// emerald corner brackets and a slow scan line, so the screen reads as "point
// your phone here". The QR itself stays dark on white so it always scans.
// ---------------------------------------------------------------------------

const CODE_LEN = 6

function groupSecret(s) {
  return String(s || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

// Backup code entry: keep letters and digits, show as xxxxx-xxxxx.
function formatBackup(raw) {
  const clean = String(raw || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 10)
  return clean.length > 5 ? clean.slice(0, 5) + '-' + clean.slice(5) : clean
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

export default function MfaGate({ mode = 'verify', enroll, onSubmit, onDone, busy = false, username, backupCodes }) {
  const isSetup = mode === 'setup'
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [err, setErr] = useState('')
  const [errTick, setErrTick] = useState(0)          // re-triggers the shake on every failure
  const [localBusy, setLocalBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [copied, setCopied] = useState('')           // 'key' | 'codes' | ''
  const [saved, setSaved] = useState(false)

  const inputRef = useRef(null)
  const headRef = useRef(null)
  const inflight = useRef(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const working = busy || localBusy
  const showCodes = isSetup && Array.isArray(backupCodes) && backupCodes.length > 0

  // Focus the code input on mount, and whenever the entry type is switched.
  useEffect(() => { if (!showCodes && inputRef.current) inputRef.current.focus() }, [showCodes, useBackup])
  // When the backup-codes panel appears, move focus to its heading so screen readers announce it.
  useEffect(() => { if (showCodes && headRef.current) headRef.current.focus() }, [showCodes])

  // QR: pure-JS generation, no network. Rendered as an <img> data URL (not raw
  // HTML) so there is no markup-injection sink. Dark on white so it always scans.
  const qrSvg = useMemo(() => {
    if (!isSetup || !enroll || !enroll.otpauthUri) return ''
    try {
      const qr = qrcode(0, 'M')
      qr.addData(enroll.otpauthUri)
      qr.make()
      return qr.createDataURL(6, 2)   // 'data:image/gif;base64,...'
    } catch { return '' }
  }, [isSetup, enroll && enroll.otpauthUri])

  const flash = (key) => { setCopied(key); setTimeout(() => { if (alive.current) setCopied((c) => (c === key ? '' : c)) }, 1800) }

  const submit = useCallback(async (value) => {
    if (inflight.current || busy) return
    const v = String(value == null ? code : value).trim()
    const ok = useBackup ? v.replace(/-/g, '').length >= 8 : /^\d{6}$/.test(v)
    if (!ok) {
      setErr(useBackup ? 'Enter your full backup code.' : 'Enter the 6-digit code from your authenticator app.')
      setErrTick((n) => n + 1)
      return
    }
    inflight.current = true
    setLocalBusy(true); setErr('')
    try {
      await onSubmit(v)
      if (alive.current) setVerified(true)
    } catch (e) {
      if (alive.current) {
        setErr((e && e.message) || 'That code did not work. Please try again.')
        setErrTick((n) => n + 1)
        setCode('')
        setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, 0)   // after the input is re-enabled
      }
    } finally {
      inflight.current = false
      if (alive.current) setLocalBusy(false)
    }
  }, [code, useBackup, busy, onSubmit])

  const onChange = (e) => {
    if (useBackup) { setCode(formatBackup(e.target.value)); if (err) setErr(''); return }
    const digits = e.target.value.replace(/\D/g, '').slice(0, CODE_LEN)
    setCode(digits)
    if (err) setErr('')
    if (digits.length === CODE_LEN) submit(digits)   // auto-submit at 6 digits (also covers paste)
  }

  const onFormSubmit = (e) => { e.preventDefault(); submit() }

  const switchEntry = () => { setUseBackup((v) => !v); setCode(''); setErr('') }

  const copyKey = async () => { if (await copyText(String((enroll && enroll.secret) || '').replace(/\s+/g, ''))) flash('key') }
  const copyAll = async () => { if (await copyText((backupCodes || []).join('\n'))) flash('codes') }
  const download = () => {
    const body = [
      'WorkCoPilot backup codes' + (username ? ' for ' + username : ''),
      'Generated ' + new Date().toISOString().slice(0, 10),
      '',
      'Each code works once. Use one if you cannot reach your authenticator app.',
      'Keep this file somewhere safe and private.',
      '',
      ...(backupCodes || []),
      '',
    ].join('\r\n')
    try {
      const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url; a.download = 'workcopilot-backup-codes.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { /* download blocked: the user still has Copy all */ }
  }

  const codeInput = (idSuffix) => {
    const filled = useBackup ? 0 : code.length
    return (
      <>
        <label className="mg-lbl" htmlFor={'mg-code-' + idSuffix}>
          {useBackup ? 'Backup code' : '6-digit code'}
        </label>
        <input
          key={useBackup ? 'backup' : 'totp'}
          id={'mg-code-' + idSuffix}
          ref={inputRef}
          className={'mg-input' + (useBackup ? ' mg-input-backup' : '') + (err ? ' mg-input-bad' : '')}
          name="mfa-code"
          type="text"
          inputMode={useBackup ? 'text' : 'numeric'}
          pattern={useBackup ? undefined : '[0-9]*'}
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={useBackup ? 11 : CODE_LEN}
          value={code}
          onChange={onChange}
          placeholder={useBackup ? 'xxxxx-xxxxx' : '000000'}
          disabled={working || verified}
          aria-required="true"
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? 'mg-err' : undefined}
          data-shake={errTick}
        />
        {!useBackup && (
          <div className="mg-pips" aria-hidden="true">
            {Array.from({ length: CODE_LEN }).map((_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
          </div>
        )}
        <div className="mg-live" id="mg-err" role="alert" aria-live="assertive">
          {err ? <span className="mg-err"><AlertCircle size={15} aria-hidden="true" /> {err}</span> : null}
        </div>
      </>
    )
  }

  // ------------------------------------------------------------------ backup codes
  if (showCodes) {
    return (
      <div className="mg">
        <style>{CSS}</style>
        <div className="mg-head">
          <span className="mg-badge mg-badge-ok"><Check size={20} aria-hidden="true" /></span>
          <div>
            <div className="mg-eyebrow">Two-factor is on</div>
            <h2 className="mg-h" tabIndex={-1} ref={headRef}>Save your backup codes</h2>
          </div>
        </div>
        <p className="mg-p">
          If you lose your phone, each of these one-time codes lets you sign in once. They are shown only now, so keep them somewhere safe, such as a password manager.
        </p>

        <ul className="mg-codes" aria-label="Backup codes">
          {backupCodes.map((c, i) => <li key={c + i}><span className="mg-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{c}</li>)}
        </ul>

        <div className="mg-row">
          <button type="button" className="mg-ghost" onClick={copyAll}>
            {copied === 'codes' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied === 'codes' ? 'Copied' : 'Copy all'}
          </button>
          <button type="button" className="mg-ghost" onClick={download}>
            <Download size={15} aria-hidden="true" /> Download .txt
          </button>
        </div>
        <span className="mg-sr" role="status" aria-live="polite">{copied === 'codes' ? 'Backup codes copied to the clipboard.' : ''}</span>

        <label className="mg-check">
          <input className="mg-checkbox" type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          <span>I have saved these codes</span>
        </label>

        <button type="button" className="mg-cta" disabled={!saved} onClick={() => onDone && onDone()}>
          Continue <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    )
  }

  // ------------------------------------------------------------------ verify mode
  if (!isSetup) {
    return (
      <div className="mg">
        <style>{CSS}</style>
        <div className="mg-head">
          <span className="mg-badge"><ShieldCheck size={20} aria-hidden="true" /></span>
          <div>
            <div className="mg-eyebrow">Two-step check</div>
            <h2 className="mg-h">Enter your authenticator code</h2>
          </div>
        </div>
        {username && <div className="mg-who">Signing in as <strong>{username}</strong></div>}
        <p className="mg-p">
          {useBackup
            ? 'Enter one of the backup codes you saved when you set up two-factor. Each one works only once.'
            : 'Open your authenticator app and type the 6-digit code shown for WorkCoPilot.'}
        </p>

        <form onSubmit={onFormSubmit} aria-busy={working} noValidate>
          {codeInput('v')}
          <button className="mg-cta" type="submit" disabled={working || verified || !code}>
            {working ? <Loader2 size={16} className="mg-spin" aria-hidden="true" /> : verified ? <Check size={16} aria-hidden="true" /> : null}
            {working ? <span className="mg-sr">Working, please wait. </span> : null}
            {verified ? 'Verified' : 'Verify'} {!working && !verified ? <ArrowRight size={16} aria-hidden="true" /> : null}
          </button>
        </form>

        <button type="button" className="mg-link" onClick={switchEntry} disabled={working || verified}>
          {useBackup ? 'Use my authenticator app instead' : 'Use a backup code instead'}
        </button>
      </div>
    )
  }

  // ------------------------------------------------------------------ setup mode
  const secret = enroll && enroll.secret
  const acct = 'WorkCoPilot: ' + (username || 'your account')
  return (
    <div className="mg">
      <style>{CSS}</style>
      <div className="mg-head">
        <span className="mg-badge"><ShieldCheck size={20} aria-hidden="true" /></span>
        <div>
          <div className="mg-eyebrow">Required security step</div>
          <h2 className="mg-h">Set up two-factor authentication</h2>
        </div>
      </div>
      {username && <div className="mg-who">Signing in as <strong>{username}</strong></div>}
      <p className="mg-p">
        Two-factor protects your account even if your password is ever stolen. It takes about a minute and is required to continue.
      </p>

      <ol className="mg-steps">
        <li className="mg-step">
          <span className="mg-num" aria-hidden="true"><Smartphone size={14} /></span>
          <div className="mg-body">
            <h3>1. Install Microsoft Authenticator</h3>
            <p>It is free on the App Store and Google Play. Any standard authenticator app works too.</p>
          </div>
        </li>

        <li className="mg-step">
          <span className="mg-num" aria-hidden="true"><ScanLine size={14} /></span>
          <div className="mg-body">
            <h3>2. Scan this QR code in the app</h3>
            <p>In the app, add an account, choose a work or other account, and point the camera here.</p>
            {qrSvg ? (
              <div className="mg-qrwrap">
                <div className="mg-qr" role="img" aria-label={'QR code for ' + acct}>
                  <img className="mg-qrimg" src={qrSvg} alt={'QR code for ' + acct} width="216" height="216" />
                  <i className="mg-c tl" /><i className="mg-c tr" /><i className="mg-c bl" /><i className="mg-c br" />
                  <i className="mg-scan" />
                </div>
              </div>
            ) : (
              <div className="mg-qrfail" role="status">The QR code could not be drawn. Use the manual key below instead.</div>
            )}

            <button type="button" className="mg-link mg-link-left" aria-expanded={manualOpen} aria-controls="mg-manual" onClick={() => setManualOpen((v) => !v)}>
              Can't scan? Enter the key manually <ChevronDown size={14} className={manualOpen ? 'mg-flip' : ''} aria-hidden="true" />
            </button>
            {manualOpen && (
              <div className="mg-manual" id="mg-manual">
                <div className="mg-kv"><span>Account</span><b>{acct}</b></div>
                <div className="mg-kv">
                  <span>Key</span>
                  <b className="mg-key">{groupSecret(secret) || 'Not available'}</b>
                </div>
                <div className="mg-kv"><span>Type</span><b>Time-based (6 digits)</b></div>
                <button type="button" className="mg-ghost mg-ghost-sm" onClick={copyKey} disabled={!secret}>
                  {copied === 'key' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied === 'key' ? 'Copied' : 'Copy key'}
                </button>
                <span className="mg-sr" role="status" aria-live="polite">{copied === 'key' ? 'Key copied to the clipboard.' : ''}</span>
              </div>
            )}
          </div>
        </li>

        <li className="mg-step">
          <span className="mg-num" aria-hidden="true"><KeyRound size={14} /></span>
          <div className="mg-body">
            <h3>3. Enter the 6-digit code</h3>
            <p>Type the code the app shows for WorkCoPilot to confirm it is working.</p>
            <form onSubmit={onFormSubmit} aria-busy={working} noValidate>
              {codeInput('s')}
              <button className="mg-cta" type="submit" disabled={working || verified || code.length < CODE_LEN}>
                {working ? <Loader2 size={16} className="mg-spin" aria-hidden="true" /> : verified ? <Check size={16} aria-hidden="true" /> : null}
                {working ? <span className="mg-sr">Working, please wait. </span> : null}
                {verified ? 'Verified, preparing your backup codes' : 'Verify and continue'} {!working && !verified ? <ArrowRight size={16} aria-hidden="true" /> : null}
              </button>
            </form>
          </div>
        </li>
      </ol>
    </div>
  )
}

// Variables fall back to the sign-in screen's palette so the component also
// looks right if it is ever rendered outside the .wl wrapper.
const CSS = `
.mg{--mg-tx:var(--tx,#0f1a16);--mg-mut:var(--mut,#5a6472);--mg-line:var(--line,rgba(17,23,38,.12));--mg-em:var(--em,#0a9d66);--mg-em2:var(--em2,#0a86cf);--mg-warm:var(--warm,#ffb35c);--mg-warm2:var(--warm2,#ff7a59);
  --mg-bad:#c0392b;--mg-soft:rgba(10,157,102,.08);
  width:100%;max-width:420px;color:var(--mg-tx);font-family:"Figtree",system-ui,sans-serif;animation:mgrise .5s cubic-bezier(.2,.7,.2,1) both}
.mg *{box-sizing:border-box}
@keyframes mgrise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.mg-head{display:flex;align-items:center;gap:13px;margin-bottom:10px}
.mg-badge{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,var(--mg-em),var(--mg-em2));box-shadow:0 10px 24px -12px rgba(10,134,207,.7),inset 0 1px 0 rgba(255,255,255,.35)}
.mg-badge-ok{background:linear-gradient(135deg,#12b87a,var(--mg-em))}
.mg-eyebrow{font-family:"JetBrains Mono",monospace;font-weight:500;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mg-em);margin-bottom:3px}
.mg .mg-h{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:700;font-size:24px;line-height:1.1;letter-spacing:-.02em;margin:0;color:var(--mg-tx)}
.mg .mg-h:focus{outline:none}
.mg-who{display:inline-block;font-size:12.5px;color:var(--mg-mut);background:var(--mg-soft);border:1px solid rgba(10,157,102,.18);border-radius:999px;padding:4px 11px;margin:4px 0 2px}
.mg-who strong{color:var(--mg-tx);font-weight:600}
.mg-p{color:var(--mg-mut);font-size:14.5px;line-height:1.5;margin:10px 0 18px}

/* steps with a connecting rail */
.mg-steps{list-style:none;margin:0;padding:0;position:relative}
.mg-step{position:relative;display:flex;gap:14px;padding-bottom:22px}
.mg-step:last-child{padding-bottom:0}
.mg-step:not(:last-child)::before{content:"";position:absolute;left:14px;top:32px;bottom:2px;width:2px;border-radius:2px;background:linear-gradient(var(--mg-line),transparent)}
.mg-num{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:var(--mg-em);background:#fff;border:1.5px solid rgba(10,157,102,.45);box-shadow:0 0 0 4px var(--mg-soft)}
.mg-body{min-width:0;flex:1}
.mg .mg-body h3{font-family:"Bricolage Grotesque",system-ui,sans-serif;font-weight:700;font-size:16px;letter-spacing:-.01em;margin:4px 0 4px;color:var(--mg-tx)}
.mg-body>p{color:var(--mg-mut);font-size:13.5px;line-height:1.45;margin:0 0 12px}

/* QR viewfinder */
.mg-qrwrap{display:flex;justify-content:center;margin:2px 0 10px}
.mg-qr{position:relative;width:100%;max-width:216px;padding:14px;background:#fff;border-radius:14px;border:1px solid var(--mg-line);box-shadow:0 18px 40px -26px rgba(17,23,38,.55)}
.mg-qr svg{display:block;width:100%;height:auto;shape-rendering:crispEdges;background:#fff}
.mg-c{position:absolute;width:20px;height:20px;border:3px solid var(--mg-em);pointer-events:none}
.mg-c.tl{top:-1px;left:-1px;border-right:0;border-bottom:0;border-top-left-radius:14px}
.mg-c.tr{top:-1px;right:-1px;border-left:0;border-bottom:0;border-top-right-radius:14px}
.mg-c.bl{bottom:-1px;left:-1px;border-right:0;border-top:0;border-bottom-left-radius:14px}
.mg-c.br{bottom:-1px;right:-1px;border-left:0;border-top:0;border-bottom-right-radius:14px}
.mg-scan{position:absolute;left:10px;right:10px;top:14px;height:2px;border-radius:2px;pointer-events:none;
  background:linear-gradient(90deg,transparent,var(--mg-em),transparent);box-shadow:0 0 14px 1px rgba(10,157,102,.55);animation:mgscan 3.4s ease-in-out infinite}
@keyframes mgscan{0%,100%{transform:translateY(0);opacity:0}12%{opacity:1}50%{transform:translateY(170px);opacity:1}88%{opacity:1}}
.mg-qrfail{background:#fff7f0;border:1px solid rgba(255,122,89,.4);color:#8a3b1f;border-radius:12px;padding:12px 14px;font-size:13.5px;margin-bottom:10px}

/* manual key */
.mg-manual{margin-top:8px;background:#fff;border:1px solid var(--mg-line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:9px;animation:mgrise .25s ease both}
.mg-kv{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--mg-mut)}
.mg-kv b{font-weight:600;font-size:13.5px;color:var(--mg-tx);overflow-wrap:anywhere}
.mg-kv b.mg-key{font-family:"JetBrains Mono",monospace;font-weight:500;font-size:15px;letter-spacing:.06em;line-height:1.5;word-spacing:.35em;user-select:all}

/* code input - specificity beats the host card's generic input rules */
.mg .mg-lbl{display:block;font-size:12.5px;color:var(--mg-mut);margin:0 0 6px;letter-spacing:.02em}
.mg .mg-input{display:block;width:100%;margin:0;padding:14px 14px;text-align:center;background:#fff;border:1px solid var(--mg-line);border-radius:12px;color:var(--mg-tx);
  font-family:"JetBrains Mono",monospace;font-weight:500;font-size:26px;letter-spacing:.42em;text-indent:.42em;transition:border-color .15s,box-shadow .15s}
.mg .mg-input::placeholder{color:#c3c9d2;letter-spacing:.42em}
.mg .mg-input.mg-input-backup{font-size:20px;letter-spacing:.14em;text-indent:.14em}
.mg .mg-input.mg-input-backup::placeholder{letter-spacing:.14em}
.mg .mg-input:focus{border-color:var(--mg-em)}
.mg .mg-input:focus-visible{outline:2px solid var(--mg-em);outline-offset:1px;box-shadow:0 0 0 5px var(--mg-soft)}
.mg .mg-input.mg-input-bad{border-color:var(--mg-bad);animation:mgshake .38s}
.mg .mg-input:disabled{opacity:.75}
@keyframes mgshake{20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
.mg-pips{display:flex;justify-content:center;gap:7px;margin:10px 0 2px}
.mg-pips span{width:8px;height:8px;border-radius:50%;background:rgba(17,23,38,.12);transition:background .15s,transform .15s}
.mg-pips span.on{background:var(--mg-em);transform:scale(1.15)}
.mg-live{min-height:24px;margin:8px 0 6px}
.mg-err{display:flex;align-items:flex-start;gap:6px;color:var(--mg-bad);font-size:13.5px;line-height:1.35}
.mg-err svg{flex:none;margin-top:1px}

/* buttons */
.mg-cta{width:100%;justify-content:center;background:linear-gradient(135deg,var(--mg-warm),var(--mg-warm2));color:#1a0e08;border:none;border-radius:12px;padding:14px;font:inherit;font-weight:600;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 12px 34px -12px rgba(255,122,89,.65);transition:transform .15s,opacity .15s}
.mg-cta:hover:not(:disabled){transform:translateY(-2px)}
.mg-cta:disabled{opacity:.55;cursor:default;box-shadow:none}
.mg-ghost{flex:1;justify-content:center;display:inline-flex;align-items:center;gap:7px;background:#fff;color:var(--mg-tx);border:1px solid var(--mg-line);border-radius:12px;padding:11px 12px;font:inherit;font-weight:600;font-size:14.5px;cursor:pointer;transition:border-color .15s}
.mg-ghost:hover:not(:disabled){border-color:var(--mg-em)}
.mg-ghost:disabled{opacity:.6;cursor:default}
.mg-ghost svg{color:var(--mg-em2)}
.mg-ghost-sm{flex:none;align-self:flex-start;padding:8px 12px;font-size:13px;border-radius:10px}
.mg-link{display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:6px 0;margin:10px auto 0;font:inherit;font-size:13.5px;color:var(--mg-em);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.mg-link-left{margin:0}
.mg-link:disabled{opacity:.6;cursor:default}
.mg-link svg{transition:transform .2s}
.mg-flip{transform:rotate(180deg)}
.mg button:focus-visible,.mg a:focus-visible{outline:2px solid var(--mg-em2);outline-offset:3px;border-radius:8px}

/* backup codes */
.mg-codes{list-style:none;margin:0 0 14px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;background:#fff;border:1px dashed rgba(10,157,102,.5);border-radius:14px;position:relative}
.mg-codes li{display:flex;align-items:baseline;gap:8px;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:14.5px;letter-spacing:.04em;color:var(--mg-tx);user-select:all;padding:5px 0;border-bottom:1px solid rgba(17,23,38,.06);overflow-wrap:anywhere}
.mg-n{font-size:10px;color:var(--mg-mut);letter-spacing:.08em}
.mg-row{display:flex;gap:10px;margin-bottom:16px}
.mg-check{display:flex;align-items:center;gap:10px;margin:0 0 16px;font-size:14.5px;color:var(--mg-tx);cursor:pointer}
.mg .mg-checkbox{width:20px;height:20px;margin:0;padding:0;flex:none;accent-color:var(--mg-em);cursor:pointer}
.mg .mg-checkbox:focus-visible{outline:2px solid var(--mg-em2);outline-offset:2px}

.mg-spin{animation:mgrot 1s linear infinite}@keyframes mgrot{to{transform:rotate(360deg)}}
.mg-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

@media(max-width:420px){
  .mg .mg-h{font-size:21px}
  .mg-step{gap:11px}
  .mg-codes{grid-template-columns:1fr}
  .mg-row{flex-direction:column}
  .mg .mg-input{font-size:24px}
}
@media(prefers-reduced-motion:reduce){
  .mg,.mg-manual{animation:none}
  .mg-scan{animation:none;opacity:0}
  .mg .mg-input.mg-input-bad{animation:none}
  .mg-cta,.mg-pips span,.mg-link svg{transition:none}
}
`
