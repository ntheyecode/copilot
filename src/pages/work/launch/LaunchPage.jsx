// ============================================================================
// WorkCoPilot - Launch link  (/work/launch#<token>)
// ----------------------------------------------------------------------------
// A company's own app minted a one-time link (POST /api/v1/workflows/:id/launch)
// for a specific person; opening it starts that workflow as a guided session.
// Flow: token from the fragment (or the parked hop) -> who is signed in ->
// not signed in: park the token, go through the normal sign-in, come back ->
// redeem -> start the workflow -> /work/session/<id>. The page shows one calm
// working state and, for each refusal, a plain explanation plus the one action
// that fixes it (sign out and switch account; ask your company app for a
// fresh link; open WorkCoPilot). The token never appears in the URL after
// load (replaced) and never reaches a server except the redeem body.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Loader2, AlertTriangle, LogOut, RefreshCw, ArrowRight, UserRound } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { WORKADMIN_CSS, ensureWorkAdminFonts } from '../../workadmin/workadmin.css.js'
import { stashLaunchToken, peekLaunchToken, clearLaunchToken, tokenFromHash } from './launchHop.js'
import { redeemOutcome, startOutcome } from './launchModel.js'

const STEPS = ['checking', 'redeeming', 'starting']

export default function LaunchPage() {
  const t = useT()
  const navigate = useNavigate()
  const token = useRef('')
  const alive = useRef(true)
  const [step, setStep] = useState('checking')      // checking | signingIn | redeeming | starting | error
  const [title, setTitle] = useState('')
  const [me, setMe] = useState(null)
  const [fail, setFail] = useState(null)            // { heading, body, retry, signOut, dashboard }

  useEffect(() => { ensureWorkAdminFonts() }, [])

  const run = useCallback(async () => {
    const tok = token.current
    if (!tok) { setFail({ heading: t('launchPage.err.missing.title'), body: t('launchPage.err.missing.body') }); setStep('error'); return }
    setFail(null); setStep('checking')
    let user = null
    try { const r = await api.workMe(); user = r && r.signedIn && r.user ? r.user : null } catch { user = null }
    if (!alive.current) return
    if (!user) { stashLaunchToken(tok); setStep('signingIn'); window.location.href = '/workcopilot'; return }
    setMe(user)
    setStep('redeeming')
    let redeemed
    try { redeemed = await api.workLaunchRedeem(tok) } catch (e) {
      if (!alive.current) return
      const o = redeemOutcome(e)
      // Wrong person / session ended: park the token so "sign out and switch
      // account" (or a re-sign-in) lands back here and finishes the launch.
      if (o.keepStash) stashLaunchToken(tok); else clearLaunchToken()
      setFail({
        heading: t(`launchPage.err.${o.kind}.title`),
        body: t(`launchPage.err.${o.kind}.body`, { name: user.displayName || user.username || user.email || '' }),
        retry: o.retry, signOut: o.signOut, dashboard: !o.signOut,
      })
      setStep('error'); return
    }
    clearLaunchToken()
    if (!alive.current) return
    setTitle((redeemed && redeemed.title) || '')
    setStep('starting')
    try {
      const r = await api.workflowStart(redeemed.workflowId)
      if (!alive.current) return
      if (r && r.sessionId) { navigate('/work/session/' + r.sessionId, { replace: true }); return }
      setFail({ heading: t('launchPage.err.start.title'), body: t('launchPage.err.generic.body'), retry: false, dashboard: true })
    } catch (e) {
      if (!alive.current) return
      const o = startOutcome(e, { isCompanyMember: !!user.companyId })
      const body = o.key ? t(o.key, o.vars) : o.needsSub ? t('launchPage.err.start.needsPlan') : o.message || friendlyError(e, t('launchPage.err.generic.body'))
      setFail({ heading: t('launchPage.err.start.title'), body, retry: !o.gone && !o.needsSub, dashboard: true })
    }
    setStep('error')
  }, [navigate, t])

  useEffect(() => {
    alive.current = true
    const fromHash = tokenFromHash(window.location.hash)
    token.current = fromHash || peekLaunchToken()
    // The token leaves the address bar at once (no history entry, no share by
    // copy-paste); the parked copy carries it through a sign-in if one is needed.
    if (fromHash) { try { window.history.replaceState(null, '', '/work/launch') } catch { /* ignore */ } }
    run()
    return () => { alive.current = false }
  }, [run])

  const signOut = async () => { try { await api.workLogout() } catch { /* the sign-in page handles it */ } window.location.href = '/workcopilot' }
  const working = step !== 'error'
  const idx = Math.max(0, STEPS.indexOf(step))

  return (
    <div className="wka wd-tokens" style={{ minHeight: '100vh', background: 'var(--wka-bg)' }}>
      <style>{WORKADMIN_CSS}{LAUNCH_CSS}</style>
      <main className="wka-launch" aria-live="polite" aria-busy={working}>
        <div className="wka-panel wka-launch-card">
          <div className={`wka-launch-ic${working ? '' : ' err'}`} aria-hidden>
            {working ? <Loader2 size={24} style={{ animation: 'wka-spin 0.9s linear infinite' }} /> : <AlertTriangle size={24} />}
          </div>
          {working ? (
            <>
              <h2>{step === 'starting' && title ? t('launchPage.ready', { title }) : t('launchPage.title')}</h2>
              <p className="desc">{step === 'signingIn' ? t('launchPage.signingIn') : t('launchPage.working')}</p>
              <ol className="wka-launch-steps">
                {STEPS.map((s, i) => <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''}><span className="dot" aria-hidden />{t(`launchPage.steps.${s}`)}</li>)}
              </ol>
            </>
          ) : (
            <>
              <h2>{fail && fail.heading}</h2>
              <p className="desc">{fail && fail.body}</p>
              {me ? <p className="wka-launch-who"><UserRound size={13} /> {t('launchPage.signedInAs', { name: me.displayName || me.username || me.email || '' })}</p> : null}
              <div className="wka-launch-acts">
                {fail && fail.signOut ? <button type="button" className="wka-btn primary" onClick={signOut}><LogOut size={14} /> {t('launchPage.actions.signOut')}</button> : null}
                {fail && fail.retry ? <button type="button" className="wka-btn primary" onClick={run}><RefreshCw size={14} /> {t('launchPage.actions.retry')}</button> : null}
                {fail && fail.dashboard ? <a className={`wka-btn${fail.retry || fail.signOut ? ' ghost' : ' primary'}`} href="/work">{t('launchPage.actions.dashboard')} <ArrowRight size={14} /></a> : null}
              </div>
              <p className="wka-launch-foot"><Rocket size={12} /> {t('launchPage.foot')}</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

const LAUNCH_CSS = `
.wka-launch { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
.wka-launch-card { width: 100%; max-width: 480px; text-align: center; }
.wka-launch-card h2 { justify-content: center; }
.wka-launch-card .desc { text-align: center; }
.wka-launch-ic { width: 52px; height: 52px; border-radius: 14px; margin: 4px auto 14px; display: grid; place-items: center; color: var(--wka-accent); background: var(--wka-accent-soft); border: 1px solid var(--wka-accent-line); }
.wka-launch-ic.err { color: var(--wka-amber); background: var(--wka-tint-amber); border-color: color-mix(in srgb, var(--wka-amber) 35%, transparent); }
.wka-launch-steps { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; text-align: left; }
.wka-launch-steps li { display: flex; gap: 10px; align-items: center; font-size: 13px; color: var(--wka-faint); }
.wka-launch-steps li .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--wka-line-2); flex-shrink: 0; }
.wka-launch-steps li.done { color: var(--wka-muted); }
.wka-launch-steps li.done .dot { background: var(--wka-emerald); }
.wka-launch-steps li.now { color: var(--wka-text); font-weight: 600; }
.wka-launch-steps li.now .dot { background: var(--wka-accent); box-shadow: 0 0 0 4px var(--wka-accent-soft); }
.wka-launch-who { display: inline-flex; gap: 6px; align-items: center; font-size: 12.5px; color: var(--wka-muted); margin: 0 0 14px; }
.wka-launch-acts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.wka-launch-acts .wka-btn { white-space: nowrap; flex-shrink: 0; }
.wka-launch-foot { display: inline-flex; gap: 6px; align-items: center; font-size: 11.5px; color: var(--wka-faint); margin: 16px 0 0; }
`
