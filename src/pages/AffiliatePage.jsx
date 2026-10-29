// WorkCoPilot - public affiliate program page (/affiliate, also /affliate).
// Two faces in one route:
//   LANDING   - what the program is, how it pays, and the application form.
//   DASHBOARD - for a signed-in, approved affiliate: referral link, stats,
//               Stripe payout setup, and the referral ledger.
// The server decides which face applies: api.affiliateDashboard() succeeds for
// an affiliate and 404s for everyone else. Copy stays honest: the only promise
// is the stated percentage of each referral's FIRST payment, paid through Stripe,
// plus the referred person's free month on annual billing.
// Visual system = the WorkCoPilot site (WorkMarketing.jsx, light theme): page
// #f4f7fb, white hairline cards, deep-green display headings, green #0e9f6e and
// blue #0a84c2 as the emphasis accents, orange #f26a43 for the primary CTA only.
// US spelling, no em-dashes. Every user-facing string comes from the
// affiliatePage i18n namespace (src/i18n/locales/en/affiliatePage.js); the
// icons, ids and layout stay in code.
import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Copy, Loader2, Link2, MousePointerClick, UserCheck,
  Wallet, Clock, BadgeCheck, CreditCard, ShieldCheck, Send, Megaphone, Share2,
  AlertTriangle, PauseCircle, FileText, Sparkles, Search, KeyRound, Gift, Phone, AtSign, Mail,
  Coins, Zap, Users,
} from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'
import { api } from '../api.js'
import useSeo from '../useSeo.js'
import { useT } from '../i18n/index.jsx'

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`
const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '-'
  try { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d.toISOString().slice(0, 10) }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Social platforms we ask for (key = what the server stores under `socials`).
// lucide has no brand marks, so each gets a short text monogram instead. The
// labels are the networks' own names (never translated); "Other" and every
// placeholder come from affiliatePage.form.socials.*.
const SOCIALS = [
  { k: 'tiktok', label: 'TikTok', mark: 'TT', at: true },
  { k: 'instagram', label: 'Instagram', mark: 'IG', at: true },
  { k: 'youtube', label: 'YouTube', mark: 'YT', at: false },
  { k: 'twitter', label: 'X (Twitter)', mark: 'X', at: true },
  { k: 'facebook', label: 'Facebook', mark: 'FB', at: false },
  { k: 'linkedin', label: 'LinkedIn', mark: 'in', at: false },
  { k: 'other', label: null, mark: '+', at: false },
]
const EMPTY_SOCIALS = Object.fromEntries(SOCIALS.map((s) => [s.k, '']))
// Fallback commission shown ONLY while /api/affiliate/public has not delivered a
// number (fetch pending or failed). The server's defaultRatePct always wins when
// present, so the page never renders a bare "%".
const DEFAULT_RATE_PCT = 30

export default function AffiliatePage() {
  const t = useT()
  useSeo({
    title: t('affiliatePage.seo.title'),
    description: t('affiliatePage.seo.description'),
    path: '/affiliate',
  })
  const [sp, setSp] = useSearchParams()
  const [pub, setPub] = useState(null)          // { enabled, defaultRatePct } or null when the call failed
  const [pubErr, setPubErr] = useState('')
  const [me, setMe] = useState({ signedIn: false, user: null })
  const [dash, setDash] = useState(null)        // affiliate dashboard object, when the account is an affiliate
  const [payoutsEnabled, setPayoutsEnabled] = useState(null)
  const [dashErr, setDashErr] = useState('')
  const [connectNote, setConnectNote] = useState('')
  const [loading, setLoading] = useState(true)

  // Display + body faces are self-hosted and loaded globally in src/main.jsx.

  // Mount: program config + who is signed in, in parallel. If signed in, try the
  // dashboard (404 = a regular account, show the landing). A ?connect=done or
  // ?connect=refresh return from Stripe onboarding re-reads the Connect state and
  // then strips the param so a reload does not re-run the refresh.
  useEffect(() => {
    let alive = true
    const connect = sp.get('connect')
    ;(async () => {
      try {
        const [pubR, meR] = await Promise.allSettled([api.affiliatePublic(), api.workMe()])
        if (!alive) return
        if (pubR.status === 'fulfilled' && pubR.value) setPub(pubR.value)
        else setPubErr((pubR.reason && pubR.reason.message) || t('affiliatePage.errors.loadProgram'))
        const m = meR.status === 'fulfilled' && meR.value ? meR.value : { signedIn: false, user: null }
        setMe(m)
        if (!m.signedIn) return
        try {
          let d = await api.affiliateDashboard()
          if (connect === 'done' || connect === 'refresh') {
            try {
              const r = await api.affiliateConnectRefresh()
              d = { ...d, stripeOnboarded: !!r.onboarded, stripeConnected: !!r.connected }
              if (alive) setPayoutsEnabled(r.payoutsEnabled == null ? null : !!r.payoutsEnabled)
              if (alive) {
                setConnectNote(r.onboarded
                  ? t('affiliatePage.connect.complete')
                  : connect === 'refresh'
                    ? t('affiliatePage.connect.expired')
                    : t('affiliatePage.connect.pending'))
              }
            } catch (e) {
              if (alive) setConnectNote(t('affiliatePage.errors.refreshStripe', { reason: (e && e.message) || t('affiliatePage.errors.refreshStripeFallback') }))
            }
            const next = new URLSearchParams(sp); next.delete('connect')
            setSp(next, { replace: true })
          }
          if (alive) setDash(d)
        } catch (e) {
          if (e && e.status === 404) return   // signed in, not an affiliate: landing view
          if (alive) setDashErr((e && e.message) || t('affiliatePage.errors.loadDashboard'))
        }
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Always a number: the server's defaultRatePct when it arrived, else the fallback.
  const serverRate = pub && pub.defaultRatePct != null ? Number(pub.defaultRatePct) : NaN
  const rate = Number.isFinite(serverRate) ? serverRate : DEFAULT_RATE_PCT

  return (
    <div className="af">
      <style>{CSS}</style>
      <header className="af-nav">
        <div className="af-wrap af-nav-in">
          <a href="/" aria-label={t('affiliatePage.nav.homeAria')}><AdmireVedaLogo size={26} /></a>
          <a className="af-back" href="/"><ArrowLeft size={15} /> {t('affiliatePage.nav.back')}</a>
        </div>
      </header>

      <main className="af-main">
        <div className="af-wrap">
          {loading ? (
            <div className="af-loading"><Loader2 size={20} className="af-spin" /> {t('affiliatePage.loading')}</div>
          ) : dash ? (
            <Dashboard d={dash} payoutsEnabled={payoutsEnabled} connectNote={connectNote} onDashChange={setDash} />
          ) : (
            <Landing pub={pub} pubErr={pubErr} rate={rate} me={me} dashErr={dashErr} />
          )}
        </div>
      </main>

      <footer className="af-foot">
        <div className="af-wrap af-foot-in">
          <span>&copy; {new Date().getFullYear()} {t('affiliatePage.footer.copyright')}</span>
          <nav className="af-foot-links">
            <a href="/workcopilot/terms">{t('affiliatePage.footer.terms')}</a>
            <a href="/workcopilot/privacy">{t('affiliatePage.footer.privacy')}</a>
            <a href="mailto:support@admireveda.com">{t('affiliatePage.footer.support')}</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ LANDING */
// Section header in the site's pattern: centered eyebrow, big h2, sub.
function SecHead({ icon: Ic, kicker, title, sub }) {
  return (
    <div className="af-sechead">
      <div className="af-eyebrow"><Ic size={14} /> {kicker}</div>
      <h2 className="af-h2">{title}</h2>
      {sub ? <p className="af-sub">{sub}</p> : null}
    </div>
  )
}

function Landing({ pub, pubErr, rate, me, dashErr }) {
  const t = useT()
  const user = me && me.user
  const rateWord = `${rate}%`
  // Primary CTA: glide to the form and put the cursor in the first field.
  const goApply = () => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = document.getElementById('apply')
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setTimeout(() => { const i = document.getElementById('af-name'); if (i) i.focus({ preventScroll: true }) }, reduce ? 0 : 520)
  }
  return (
    <div className="af-land">
      <div className="af-backdrop" aria-hidden />

      {/* HERO: copy left, the real illustration right. Balanced, no voids. */}
      <section className="af-hero">
        <div className="af-hero-copy">
          <div className="af-eyebrow"><Megaphone size={14} /> {t('affiliatePage.hero.eyebrow')}</div>
          <h1 className="af-h1">{t.rich('affiliatePage.hero.h1', { rate: rateWord })}</h1>
          <p className="af-lead">
            {t.rich('affiliatePage.hero.lead', { rate: rateWord })}
          </p>
          <div className="af-hero-cta">
            <button type="button" className="af-cta" onClick={goApply}>{t('affiliatePage.hero.apply')} <ArrowRight size={16} /></button>
            <a className="af-textlink" href="/">{t('affiliatePage.hero.see')} <ArrowRight size={14} /></a>
          </div>
          <ul className="af-trust" aria-label={t('affiliatePage.hero.trustAria')}>
            <li><Check size={14} /> {t('affiliatePage.hero.trust1')}</li>
            <li><Check size={14} /> {t('affiliatePage.hero.trust2')}</li>
            <li><Check size={14} /> {t('affiliatePage.hero.trust3')}</li>
          </ul>
        </div>
        <figure className="af-hero-fig">
          <img src="/affiliate-hero.webp" alt={t('affiliatePage.hero.imgAlt')} width="1600" height="1066" fetchpriority="high" decoding="async" />
          <figcaption className="af-fig-chip earn"><Coins size={15} /> {t.rich('affiliatePage.hero.chipEarn', { rate: rateWord })}</figcaption>
          <figcaption className="af-fig-chip gift"><Gift size={15} /> {t.rich('affiliatePage.hero.chipGift')}</figcaption>
        </figure>
      </section>

      {/* at-a-glance stats, in the site's stat-tile language */}
      <div className="af-stats3" aria-label={t('affiliatePage.glance.aria')}>
        <div className="af-stat3"><b>{rateWord}</b><span>{t('affiliatePage.glance.rate')}</span></div>
        <div className="af-stat3"><b>Stripe</b><span>{t('affiliatePage.glance.stripe')}</span></div>
        <div className="af-stat3"><b>{t('affiliatePage.glance.month')}</b><span>{t('affiliatePage.glance.monthSub')}</span></div>
        <div className="af-stat3"><b>{t('affiliatePage.glance.min')}</b><span>{t('affiliatePage.glance.minSub')}</span></div>
      </div>

      <Boosters rateWord={rateWord} />
      <Flow rateWord={rateWord} />
      <Audience />

      {/* APPLY */}
      <section className="af-apply" id="apply">
        <SecHead icon={Send} kicker={t('affiliatePage.applySec.kicker')} title={t('affiliatePage.applySec.title')} sub={t('affiliatePage.applySec.sub')} />
        <div className="af-apply-grid">
          <div className="af-apply-side">
            <PerkCard rateWord={rateWord} />
            {pubErr ? <div className="af-note warn"><AlertTriangle size={14} /> {pubErr}</div> : null}
            {dashErr ? <div className="af-note warn"><AlertTriangle size={14} /> {dashErr}</div> : null}
            <div className="af-card af-rulescard">
              <div className="af-card-k"><ShieldCheck size={14} /> {t('affiliatePage.applySec.rulesK')}</div>
              <ul className="af-rules">
                <li><Check size={15} /> <span>{t.rich('affiliatePage.applySec.rule1', { rate: rateWord })}</span></li>
                <li><Check size={15} /> <span>{t.rich('affiliatePage.applySec.rule2')}</span></li>
                <li><Check size={15} /> <span>{t('affiliatePage.applySec.rule3')}</span></li>
                <li><Check size={15} /> <span>{t('affiliatePage.applySec.rule4')}</span></li>
              </ul>
            </div>
          </div>
          {pub && pub.enabled === false ? (
            <div className="af-card af-closed">
              <div className="af-closed-ic"><PauseCircle size={26} /></div>
              <h3>{t('affiliatePage.applySec.closedTitle')}</h3>
              <p>{t.rich('affiliatePage.applySec.closedBody', null, { a: (c) => <a href="/workcopilot/contact">{c}</a> })}</p>
            </div>
          ) : (
            <ApplyForm user={user} />
          )}
        </div>
      </section>
    </div>
  )
}

// Why people join: four white cards with the site's green->blue icon tiles.
// Icons + ids live here; the title/description per id come from
// affiliatePage.boosters.<id>.t / .d ({rate} interpolated).
const BOOSTERS = [
  { ic: Coins, k: 'money' },
  { ic: Gift, k: 'gift' },
  { ic: CreditCard, k: 'stripe' },
  { ic: Zap, k: 'review' },
]
function Boosters({ rateWord }) {
  const t = useT()
  return (
    <section className="af-sec">
      <SecHead icon={Sparkles} kicker={t('affiliatePage.boosters.kicker')} title={t('affiliatePage.boosters.title')} sub={t('affiliatePage.boosters.sub')} />
      <div className="af-boost">
        {BOOSTERS.map((b) => (
          <div className="af-card af-boost-card" key={b.k}>
            <span className="af-tile"><b.ic size={20} /></span>
            <b>{t(`affiliatePage.boosters.${b.k}.t`, { rate: rateWord })}</b>
            <p>{t(`affiliatePage.boosters.${b.k}.d`, { rate: rateWord })}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// How it works: five connected steps on a green->blue track. Horizontal on
// desktop, a vertical timeline on phones (CSS handles the swap). Copy per step
// id comes from affiliatePage.flow.<id>.t / .d.
const FLOW = [
  { ic: Send, k: 'apply' },
  { ic: Search, k: 'review' },
  { ic: KeyRound, k: 'approved' },
  { ic: Share2, k: 'share' },
  { ic: Wallet, k: 'earn' },
]
function Flow({ rateWord }) {
  const t = useT()
  return (
    <section className="af-sec af-flow-sec">
      <SecHead icon={Sparkles} kicker={t('affiliatePage.flow.kicker')} title={t('affiliatePage.flow.title')} />
      <ol className="af-flow">
        {FLOW.map((s, i) => (
          <li key={s.k} className="af-flow-step" style={{ '--i': i }}>
            <div className="af-flow-node">
              <span className="af-flow-ic"><s.ic size={22} /></span>
              <span className="af-flow-n">{i + 1}</span>
            </div>
            <b>{t(`affiliatePage.flow.${s.k}.t`, { rate: rateWord })}</b>
            <p>{t(`affiliatePage.flow.${s.k}.d`, { rate: rateWord })}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

// Who you would be recommending it to: the site's own photos, honest captions.
function Audience() {
  const t = useT()
  return (
    <section className="af-sec af-aud">
      <SecHead icon={Users} kicker={t('affiliatePage.audience.kicker')} title={t('affiliatePage.audience.title')} sub={t('affiliatePage.audience.sub')} />
      <div className="af-aud-grid">
        <figure className="af-photo">
          <img src="/people-done.jpg" alt={t('affiliatePage.audience.teamsAlt')} loading="lazy" width="1200" height="900" />
          <figcaption><b>{t('affiliatePage.audience.teamsT')}</b><span>{t('affiliatePage.audience.teamsD')}</span></figcaption>
        </figure>
        <figure className="af-photo">
          <img src="/people-focus.jpg" alt={t('affiliatePage.audience.soloAlt')} loading="lazy" width="1200" height="900" />
          <figcaption><b>{t('affiliatePage.audience.soloT')}</b><span>{t('affiliatePage.audience.soloD')}</span></figcaption>
        </figure>
      </div>
    </section>
  )
}

// The deal in one card: what you earn, what they get.
function PerkCard({ rateWord }) {
  const t = useT()
  return (
    <div className="af-card af-perk" aria-label={t('affiliatePage.perk.aria')}>
      <div className="af-perk-row">
        <span className="af-tile"><Wallet size={20} /></span>
        <div>
          <span className="af-perk-k">{t('affiliatePage.perk.youEarn')}</span>
          <b className="af-perk-v">{rateWord}</b>
          <p>{t('affiliatePage.perk.youEarnSub')}</p>
        </div>
      </div>
      <div className="af-perk-plus" aria-hidden><span>+</span></div>
      <div className="af-perk-row">
        <span className="af-tile"><Gift size={20} /></span>
        <div>
          <span className="af-perk-k">{t('affiliatePage.perk.theyGet')}</span>
          <b className="af-perk-v">{t('affiliatePage.perk.freeMonth')}</b>
          <p>{t('affiliatePage.perk.theyGetSub')}</p>
        </div>
      </div>
    </div>
  )
}

function ApplyForm({ user }) {
  const t = useT()
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '', audience: '', notes: '', socials: { ...EMPTY_SOCIALS } })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => { setErr(''); setForm((f) => ({ ...f, [k]: v })) }
  const setSocial = (k, v) => { setErr(''); setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } })) }
  const socialCount = SOCIALS.filter((s) => (form.socials[s.k] || '').trim()).length

  // Signed in but not an affiliate: prefill from the account so the application
  // lands on the account they already use.
  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      email: f.email || user.email || '',
      name: f.name || user.displayName || user.name || '',
    }))
  }, [user])

  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy) return
    const name = form.name.trim(), email = form.email.trim()
    if (!name) { setErr(t('affiliatePage.form.errName')); return }
    if (!email || !EMAIL_RE.test(email)) { setErr(t('affiliatePage.form.errEmail')); return }
    setBusy(true); setErr('')
    try {
      // Only the socials they filled in travel (the server trims anyway).
      const socials = {}
      for (const s of SOCIALS) { const v = (form.socials[s.k] || '').trim(); if (v) socials[s.k] = v }
      await api.affiliateApply({
        name, email,
        phone: form.phone.trim(),
        website: form.website.trim(),
        audience: form.audience.trim(),
        notes: form.notes.trim(),
        socials,
      })
      setDone(true)
    } catch (error) {
      if (error && error.status === 409) setErr((error && error.message) || t('affiliatePage.form.errDuplicate'))
      else setErr((error && error.message) || t('affiliatePage.form.errSend'))
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="af-card af-ok">
        <div className="af-ok-ic"><Check size={26} /></div>
        <h3>{t('affiliatePage.form.doneTitle')}</h3>
        <p>{t.rich('affiliatePage.form.doneBody', { name: form.name.split(' ')[0] || t('affiliatePage.form.thereFallback'), email: form.email })}</p>
        <ul className="af-ok-steps" aria-label={t('affiliatePage.form.nextAria')}>
          <li><span className="af-ok-dot"><Mail size={13} /></span><span>{t.rich('affiliatePage.form.nextNow')}</span></li>
          <li><span className="af-ok-dot"><Search size={13} /></span><span>{t.rich('affiliatePage.form.nextReview')}</span></li>
          <li><span className="af-ok-dot"><KeyRound size={13} /></span><span>{t.rich('affiliatePage.form.nextApproved')}</span></li>
        </ul>
        <a className="af-cta alt" href="/">{t('affiliatePage.form.backHome')}</a>
      </div>
    )
  }

  const opt = <span className="opt">{t('affiliatePage.form.optional')}</span>
  return (
    <div className="af-card af-formcard">
      <div className="af-formhead">
        <span className="af-tile sm"><Send size={16} /></span>
        <div><b>{t('affiliatePage.form.headTitle')}</b><span>{t('affiliatePage.form.headSub')}</span></div>
      </div>
      <form className="af-form" onSubmit={submit} noValidate>
      {user && user.email ? (
        <div className="af-note"><UserCheck size={14} /> {t.rich('affiliatePage.form.signedInAs', { email: user.email })}</div>
      ) : null}
      <div className="af-form-sec"><span className="af-form-sec-ic"><UserCheck size={13} /></span> {t('affiliatePage.form.secContact')}</div>
      <div className="af-grid2">
        <div className="af-field"><label htmlFor="af-name">{t('affiliatePage.form.nameLabel')}</label><input id="af-name" value={form.name} maxLength={120} autoComplete="name" onChange={(e) => set('name', e.target.value)} placeholder={t('affiliatePage.form.namePlaceholder')} /></div>
        <div className="af-field"><label htmlFor="af-email">{t('affiliatePage.form.emailLabel')}</label><input id="af-email" type="email" value={form.email} maxLength={160} autoComplete="email" onChange={(e) => set('email', e.target.value)} placeholder={t('affiliatePage.form.emailPlaceholder')} /></div>
      </div>
      <div className="af-grid2">
        <div className="af-field"><label htmlFor="af-phone">{t('affiliatePage.form.phoneLabel')} {opt}</label><div className="af-prefix"><Phone size={14} /><input id="af-phone" type="tel" value={form.phone} maxLength={40} inputMode="tel" autoComplete="tel" onChange={(e) => set('phone', e.target.value)} placeholder={t('affiliatePage.form.phonePlaceholder')} /></div></div>
        <div className="af-field"><label htmlFor="af-web">{t('affiliatePage.form.websiteLabel')} {opt}</label><input id="af-web" value={form.website} maxLength={300} inputMode="url" autoComplete="url" onChange={(e) => set('website', e.target.value)} placeholder={t('affiliatePage.form.websitePlaceholder')} /></div>
      </div>

      <div className="af-form-sec"><span className="af-form-sec-ic"><AtSign size={13} /></span> {t('affiliatePage.form.secSocial')} <span className="opt">{t('affiliatePage.form.socialOptional')}{socialCount ? t('affiliatePage.form.socialAdded', { n: socialCount }) : ''}</span></div>
      <div className="af-socials">
        {SOCIALS.map((s) => {
          const ph = t(`affiliatePage.form.socials.${s.k}`)
          return (
          <div className="af-social" key={s.k}>
            <label htmlFor={`af-so-${s.k}`}><span className={`af-social-mark m-${s.k}`} aria-hidden>{s.mark}</span>{s.label || t('affiliatePage.form.socials.otherLabel')}</label>
            <div className={`af-prefix${s.at ? ' at' : ''}`}>
              {s.at ? <span className="af-at" aria-hidden>@</span> : null}
              <input id={`af-so-${s.k}`} value={form.socials[s.k]} maxLength={200} autoComplete="off" spellCheck={false}
                onChange={(e) => setSocial(s.k, s.at ? e.target.value.replace(/^@+/, '') : e.target.value)} placeholder={s.at ? ph.replace(/^@/, '') : ph} />
            </div>
          </div>
          )
        })}
      </div>

      <div className="af-form-sec"><span className="af-form-sec-ic"><Megaphone size={13} /></span> {t('affiliatePage.form.secAudience')}</div>
      <div className="af-field"><label htmlFor="af-aud">{t('affiliatePage.form.audienceLabel')} {opt}</label><input id="af-aud" value={form.audience} maxLength={300} onChange={(e) => set('audience', e.target.value)} placeholder={t('affiliatePage.form.audiencePlaceholder')} /></div>
      <div className="af-field"><label htmlFor="af-notes">{t('affiliatePage.form.notesLabel')} {opt}</label><textarea id="af-notes" rows={4} value={form.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} placeholder={t('affiliatePage.form.notesPlaceholder')} /></div>
      {err ? <div className="af-err" role="alert"><AlertTriangle size={14} /> {err}</div> : null}
      <button className="af-cta" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="af-spin" /> : <Send size={16} />} {t('affiliatePage.form.send')}</button>
      <p className="af-fine">{t('affiliatePage.form.fine')}</p>
      </form>
    </div>
  )
}

/* ---------------------------------------------------------------- DASHBOARD */
function Dashboard({ d, payoutsEnabled, connectNote, onDashChange }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [onboardBusy, setOnboardBusy] = useState(false)
  const [onboardErr, setOnboardErr] = useState('')
  const [refreshBusy, setRefreshBusy] = useState(false)
  const [refreshErr, setRefreshErr] = useState('')

  const copy = useCallback(async () => {
    const text = d.referralLink || ''
    if (!text) return
    let ok = false
    try { await navigator.clipboard.writeText(text); ok = true } catch { /* fall back below */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok = true
      } catch { /* clipboard blocked: the link stays selectable in the field */ }
    }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }, [d.referralLink])

  const startOnboard = async () => {
    if (onboardBusy) return
    setOnboardBusy(true); setOnboardErr('')
    try {
      const r = await api.affiliateConnectOnboard()
      if (r && r.url) { window.location = r.url; return }
      setOnboardErr(t('affiliatePage.dash.errNoLink'))
    } catch (e) { setOnboardErr((e && e.message) || t('affiliatePage.dash.errStart')) }
    finally { setOnboardBusy(false) }
  }

  // Manual re-check for an affiliate who finished Stripe in another tab.
  const recheck = async () => {
    if (refreshBusy) return
    setRefreshBusy(true); setRefreshErr('')
    try {
      const r = await api.affiliateConnectRefresh()
      onDashChange({ ...d, stripeOnboarded: !!r.onboarded, stripeConnected: !!r.connected })
    } catch (e) { setRefreshErr((e && e.message) || t('affiliatePage.dash.errCheck')) }
    finally { setRefreshBusy(false) }
  }

  const suspended = d.status === 'suspended'
  const rows = Array.isArray(d.referralRows) ? d.referralRows : []
  const firstName = (d.name || '').split(' ')[0]
  const ratePct = `${Number(d.ratePct) || 0}%`

  return (
    <>
      <section className="af-dash-head">
        <div>
          <div className="af-eyebrow"><Megaphone size={14} /> {t('affiliatePage.dash.eyebrow')}</div>
          <h1 className="af-h1 sm">{firstName ? t.rich('affiliatePage.dash.welcome', { name: firstName }) : t.rich('affiliatePage.dash.welcomeAnon')}</h1>
          <p className="af-lead">{t.rich('affiliatePage.dash.lead', { rate: ratePct })}</p>
        </div>
        <div className="af-dash-meta">
          <span className={`af-chip ${suspended ? 'warn' : 'ok'}`}>{suspended ? <PauseCircle size={13} /> : <BadgeCheck size={13} />} {suspended ? t('affiliatePage.dash.onHold') : t('affiliatePage.dash.approved')}</span>
          <span className="af-chip mono"><Link2 size={13} /> {d.code || '-'}</span>
        </div>
      </section>

      {suspended ? (
        <div className="af-note warn big" role="status">
          <PauseCircle size={16} />
          <div>{t.rich('affiliatePage.dash.holdNote', null, { a: (c) => <a href="mailto:support@admireveda.com">{c}</a> })}</div>
        </div>
      ) : null}

      <section className="af-card af-linkcard">
        <div className="af-linkcard-top">
          <div>
            <div className="af-card-k"><Link2 size={14} /> {t('affiliatePage.dash.linkK')}</div>
            <p className="af-card-d">{t('affiliatePage.dash.linkD', { rate: ratePct })}</p>
          </div>
        </div>
        <div className="af-linkrow">
          <input className="af-linkinput" readOnly value={d.referralLink || ''} onFocus={(e) => e.target.select()} aria-label={t('affiliatePage.dash.linkAria')} />
          <button type="button" className={`af-cta${copied ? ' done' : ''}`} onClick={copy} disabled={!d.referralLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('affiliatePage.dash.copied') : t('affiliatePage.dash.copy')}
          </button>
        </div>
      </section>

      <section className="af-stats" aria-label={t('affiliatePage.dash.statsAria')}>
        <Stat ic={MousePointerClick} k={t('affiliatePage.dash.clicks')} v={Number(d.clicks) || 0} hint={t('affiliatePage.dash.clicksHint')} />
        <Stat ic={UserCheck} k={t('affiliatePage.dash.conversions')} v={Number(d.conversions) || 0} hint={t('affiliatePage.dash.conversionsHint')} />
        <Stat ic={Wallet} k={t('affiliatePage.dash.earned')} v={usd(d.earnedUsd)} hint={t('affiliatePage.dash.earnedHint')} />
        <Stat ic={Clock} k={t('affiliatePage.dash.pending')} v={usd(d.pendingUsd)} hint={d.minPayoutUsd != null ? t('affiliatePage.dash.pendingHintMin', { amount: usd(d.minPayoutUsd) }) : t('affiliatePage.dash.pendingHint')} />
        <Stat ic={BadgeCheck} k={t('affiliatePage.dash.paid')} v={usd(d.paidUsd)} hint={t('affiliatePage.dash.paidHint')} />
      </section>

      <section className="af-two">
        <div className="af-card">
          <div className="af-card-k"><CreditCard size={14} /> {t('affiliatePage.dash.payoutsK')}</div>
          {connectNote ? <div className={`af-note${d.stripeOnboarded ? '' : ' warn'}`} style={{ marginTop: 10 }}>{d.stripeOnboarded ? <Check size={14} /> : <AlertTriangle size={14} />} {connectNote}</div> : null}
          {d.stripeOnboarded ? (
            <>
              <div className="af-payout-state"><span className="af-chip ok"><BadgeCheck size={13} /> {t('affiliatePage.dash.payoutsActive')}</span></div>
              <p className="af-card-d">
                {d.minPayoutUsd != null ? t('affiliatePage.dash.payoutsConnectedMin', { amount: usd(d.minPayoutUsd) }) : t('affiliatePage.dash.payoutsConnected')}
                {payoutsEnabled === false ? ' ' + t('affiliatePage.dash.payoutsReview') : ''}
              </p>
            </>
          ) : (
            <>
              <h3 className="af-h3">{d.stripeConnected ? t('affiliatePage.dash.finishPayouts') : t('affiliatePage.dash.setupPayouts')}</h3>
              <p className="af-card-d">
                {d.stripeConnected ? t('affiliatePage.dash.resumeBody') : t('affiliatePage.dash.connectBody')}
              </p>
              {onboardErr ? <div className="af-err" role="alert"><AlertTriangle size={14} /> {onboardErr}</div> : null}
              {refreshErr ? <div className="af-err" role="alert"><AlertTriangle size={14} /> {refreshErr}</div> : null}
              <div className="af-btnrow">
                <button type="button" className="af-cta" onClick={startOnboard} disabled={onboardBusy}>
                  {onboardBusy ? <Loader2 size={16} className="af-spin" /> : <CreditCard size={16} />} {d.stripeConnected ? t('affiliatePage.dash.resumeStripe') : t('affiliatePage.dash.setupStripe')}
                </button>
                {d.stripeConnected ? (
                  <button type="button" className="af-cta alt" onClick={recheck} disabled={refreshBusy}>
                    {refreshBusy ? <Loader2 size={15} className="af-spin" /> : null} {t('affiliatePage.dash.alreadyFinished')}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
        <div className="af-card af-ratecard">
          <div className="af-card-k"><Sparkles size={14} /> {t('affiliatePage.dash.rateK')}</div>
          <div className="af-rate"><b>{ratePct}</b><span>{t('affiliatePage.dash.rateSub')}</span></div>
          <ul className="af-rules compact">
            <li><Check size={14} /> <span>{t('affiliatePage.dash.rateRule1')}</span></li>
            <li><Check size={14} /> <span>{t('affiliatePage.dash.rateRule2')}</span></li>
            <li><Check size={14} /> <span>{t('affiliatePage.dash.rateRule3')}</span></li>
          </ul>
        </div>
      </section>

      <section className="af-ledger">
        <div className="af-ledger-head">
          <h2 className="af-h2">{t('affiliatePage.dash.referrals')}</h2>
          <span className="af-ledger-count">{t.n('affiliatePage.dash.referralCount', rows.length)}</span>
        </div>
        {rows.length === 0 ? (
          <div className="af-card af-empty">
            <Share2 size={22} />
            <b>{t('affiliatePage.dash.emptyTitle')}</b>
            <p>{t('affiliatePage.dash.emptyBody')}</p>
          </div>
        ) : (
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>{t('affiliatePage.dash.thUser')}</th>
                  <th>{t('affiliatePage.dash.thPayment')}</th>
                  <th>{t('affiliatePage.dash.thRate')}</th>
                  <th>{t('affiliatePage.dash.thCommission')}</th>
                  <th>{t('affiliatePage.dash.thStatus')}</th>
                  <th>{t('affiliatePage.dash.thDate')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="af-strong">{r.refUsername || '-'}</td>
                    <td className="af-mono">{usd(r.amountUsd)}</td>
                    <td className="af-mono">{r.rate != null ? `${Number(r.rate) <= 1 ? Math.round(Number(r.rate) * 100) : Number(r.rate)}%` : '-'}</td>
                    <td className="af-mono af-strong">{usd(r.commissionUsd)}</td>
                    <td><RefStatus s={r.status} /></td>
                    <td className="af-mono af-faint" title={r.paidAt ? t('affiliatePage.dash.paidOnTitle', { date: fmtDate(r.paidAt) }) : undefined}>{fmtDate(r.createdAt)}{r.status === 'paid' && r.paidAt ? <span className="af-paidon"> &middot; {t('affiliatePage.dash.paidOn', { date: fmtDate(r.paidAt) })}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function Stat({ ic: Ic, k, v, hint }) {
  return (
    <div className="af-stat">
      <div className="af-stat-k"><Ic size={14} /> {k}</div>
      <div className="af-stat-v">{v}</div>
      {hint ? <div className="af-stat-h">{hint}</div> : null}
    </div>
  )
}

function RefStatus({ s }) {
  const t = useT()
  const k = String(s || '').toLowerCase()
  if (k === 'paid') return <span className="af-chip ok"><BadgeCheck size={12} /> {t('affiliatePage.dash.statusPaid')}</span>
  if (k === 'void') return <span className="af-chip muted">{t('affiliatePage.dash.statusVoid')}</span>
  return <span className="af-chip pend"><Clock size={12} /> {t('affiliatePage.dash.statusEarned')}</span>
}

const CSS = `
.af{--bg:#f4f7fb;--panel:#ffffff;--line:#e2e7f0;--tx:#0c1222;--mut:#3f4a5c;--faint:#7b8798;--ink-brand:#2a1208;
  --acc:#f26a43;--acc2:#ff9a4d;--acc-soft:rgba(242,106,67,.10);--acc-line:rgba(242,106,67,.32);--acc-deep:#c9472a;
  --amber:#b5790f;--red:#b91c1c;
  min-height:100vh;display:flex;flex-direction:column;color:var(--tx);
  font-family:"Figtree",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;
  background:radial-gradient(1000px 520px at 85% -8%,rgba(242,106,67,.14),transparent 60%),radial-gradient(820px 480px at -6% 4%,rgba(255,154,77,.12),transparent 58%),var(--bg)}
.af *{box-sizing:border-box}
.af a{color:inherit;text-decoration:none}
.af h1,.af h2,.af h3{margin:0;color:var(--ink-brand)}
.af p{margin:0}
.af-wrap{max-width:1100px;margin:0 auto;padding:0 24px;width:100%}

/* nav + footer */
.af-nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(16px);background:rgba(255,255,255,.84);border-bottom:1px solid var(--line);box-shadow:0 1px 0 rgba(17,23,38,.04),0 12px 34px -26px rgba(17,23,38,.3)}
.af-nav-in{display:flex;align-items:center;justify-content:space-between;gap:14px;height:66px}
.af-back{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-size:14px;font-weight:600}
.af-back:hover{color:var(--tx)}
.af-main{flex:1;padding:56px 0 72px}
.af-foot{position:relative;z-index:1;border-top:1px solid var(--line);padding:22px 0 28px;color:var(--mut);font-size:13px}
.af-foot-in{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.af-foot-links{display:flex;gap:16px}
.af-foot-links a{text-decoration:underline;text-underline-offset:4px}
.af-foot-links a:hover{color:var(--tx)}
.af-loading{display:flex;align-items:center;gap:10px;color:var(--mut);font-weight:500;padding:60px 0;justify-content:center}
.af-spin{animation:af-sp .8s linear infinite}@keyframes af-sp{to{transform:rotate(360deg)}}

/* type */
.af-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);margin-bottom:14px}
.af-h1{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(34px,5vw,58px);line-height:1.04;letter-spacing:-.03em;text-wrap:balance}
.af-h1.sm{font-size:clamp(30px,3.8vw,44px)}
.af-h1 em{font-style:normal;background:linear-gradient(120deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}
.af-h2{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(22px,2.6vw,30px);letter-spacing:-.02em;line-height:1.12}
.af-h3{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:19px;letter-spacing:-.01em;margin:12px 0 6px}
.af-lead{font-size:18px;color:var(--mut);max-width:56ch;margin-top:18px;line-height:1.55}
.af-lead b{color:var(--tx)}
.af-sub{color:var(--mut);font-size:16px;margin:10px 0 18px;max-width:50ch}

/* buttons */
.af-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--acc2),var(--acc));color:#fff;border:none;border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap;box-shadow:0 12px 30px -12px rgba(242,106,67,.7);transition:transform .15s,box-shadow .15s,opacity .15s}
.af-cta:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 18px 40px -14px rgba(242,106,67,.75)}
.af-cta:disabled{opacity:.65;cursor:default}
.af-cta.alt{background:#fff;color:var(--tx);border:1px solid var(--line);box-shadow:none}
.af-cta.alt:hover:not(:disabled){border-color:var(--acc);color:var(--acc-deep);box-shadow:none}
.af-cta.done{background:#fff;color:var(--acc-deep);border:1px solid var(--acc-line);box-shadow:none}
.af-btnrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}

/* cards + notes */
.af-card{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:26px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 18px 42px -26px rgba(17,23,38,.22)}
.af-card-k{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}
.af-card-d{color:var(--mut);font-size:14.5px;line-height:1.55;margin-top:8px}
.af-note{display:flex;align-items:flex-start;gap:9px;background:var(--acc-soft);border:1px solid var(--acc-line);color:var(--tx);border-radius:12px;padding:10px 13px;font-size:13.5px;line-height:1.5;margin-bottom:14px}
.af-note svg{flex-shrink:0;margin-top:3px;color:var(--acc-deep)}
.af-note.warn{background:#fff7ed;border-color:#fdd9b5;color:#5a3a12}
.af-note.warn svg{color:var(--amber)}
.af-note.big{padding:14px 16px;font-size:14.5px;margin:0 0 22px}
.af-note a{text-decoration:underline;text-underline-offset:3px}
.af-err{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fecaca;color:var(--red);border-radius:10px;padding:10px 13px;font-size:13.5px;margin:0 0 14px}
.af-err svg{flex-shrink:0}
.af-fine{color:var(--faint);font-size:12.5px;margin-top:14px;line-height:1.5}

/* chips */
.af-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid var(--line);color:var(--mut);background:#fff;white-space:nowrap}
.af-chip.ok{color:var(--acc-deep);border-color:var(--acc-line);background:var(--acc-soft)}
.af-chip.pend{color:var(--amber);border-color:rgba(181,121,15,.35);background:#fff8e8}
.af-chip.warn{color:var(--amber);border-color:rgba(181,121,15,.35);background:#fff8e8}
.af-chip.muted{color:var(--faint)}
.af-chip.mono{font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;letter-spacing:.04em}

/* ============================================================
   LANDING - the WorkCoPilot site system (see WorkMarketing.jsx):
   page #f4f7fb, white hairline cards, deep-green display ink,
   green #0e9f6e / blue #0a84c2 emphasis, orange CTA only.
   Scoped under .af-land so the signed-in dashboard is untouched.
   ============================================================ */
.af-land{--em:#0e9f6e;--em2:#0a84c2;--ink-brand:#062a22;--em-soft:rgba(10,157,102,.10);--em2-soft:rgba(10,134,207,.10);--em-line:rgba(10,157,102,.28);
  --grad:linear-gradient(120deg,var(--em),var(--em2));--tile:linear-gradient(135deg,rgba(10,157,102,.16),rgba(10,134,207,.12));
  position:relative}
.af-land>*:not(.af-backdrop){position:relative;z-index:1}
/* the site's light backdrop (green + blue radials on #f4f7fb) over the page root */
.af-backdrop{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1000px 520px at 85% -8%,rgba(10,134,207,.16),transparent 60%),radial-gradient(820px 480px at -6% 4%,rgba(10,157,102,.14),transparent 58%),#f4f7fb}
.af-land .af-eyebrow{color:var(--em)}
.af-land .af-eyebrow svg{color:var(--em)}
.af-land .af-h1{color:var(--ink-brand);font-size:clamp(36px,4.6vw,56px)}
.af-land .af-h1 em{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.af-land .af-h2{color:var(--ink-brand);font-size:clamp(28px,4.2vw,44px);letter-spacing:-.025em;line-height:1.06}
.af-land .af-lead{color:var(--mut)}
.af-land .af-lead b{color:var(--tx)}
.af-land .af-cta{background:linear-gradient(135deg,#ff9a4d,#f26a43);color:#1a0e08;box-shadow:0 12px 34px -12px rgba(255,122,89,.65)}
.af-land .af-cta:hover:not(:disabled){box-shadow:0 18px 44px -14px rgba(255,122,89,.75)}
.af-land .af-cta.alt{background:#fff;color:var(--tx);border:1px solid var(--line);box-shadow:none}
.af-land .af-cta.alt:hover:not(:disabled){border-color:var(--em);color:var(--em)}
.af-textlink{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-weight:600;font-size:14.5px;text-decoration:underline;text-underline-offset:4px}
.af-textlink:hover{color:var(--em)}
.af-land .af-card-k{color:var(--em)}
.af-land .af-note{background:var(--em-soft);border-color:var(--em-line)}
.af-land .af-note svg{color:var(--em)}
.af-land .af-note.warn{background:#fff7ed;border-color:#fdd9b5;color:#5a3a12}
.af-land .af-note.warn svg{color:var(--amber)}
/* the shared icon tile: green->blue, like the site's cards */
.af-tile{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:46px;height:46px;border-radius:13px;background:var(--tile);color:var(--em)}
.af-tile.sm{width:38px;height:38px;border-radius:11px}
/* section header: centered eyebrow + h2 + sub */
.af-sec{padding:58px 0 0}
.af-sechead{text-align:center;max-width:720px;margin:0 auto 34px}
.af-sechead .af-eyebrow{justify-content:center}
.af-sechead .af-h2{max-width:22ch;margin:0 auto 14px}
.af-sechead .af-sub{font-size:18px;max-width:58ch;margin:0 auto}

/* HERO: copy left, framed illustration right */
.af-hero{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
.af-hero>*{min-width:0}
.af-hero-cta{display:flex;align-items:center;flex-wrap:wrap;gap:16px;margin-top:26px}
.af-trust{list-style:none;margin:22px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px 22px}
.af-trust li{display:inline-flex;align-items:center;gap:7px;color:var(--mut);font-size:13.5px;font-weight:500}
.af-trust li svg{color:var(--em);flex-shrink:0}
.af-hero-fig{position:relative;margin:0;border-radius:22px;overflow:hidden;background:#fff;border:1px solid var(--line);box-shadow:0 1px 2px rgba(17,23,38,.04),0 30px 64px -40px rgba(17,23,38,.5)}
.af-hero-fig img{display:block;width:100%;height:auto;aspect-ratio:1600/1066;object-fit:cover}
/* opaque white chips over the clean (left) side of the picture: dark text, legible */
.af-fig-chip{position:absolute;left:16px;display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 13px 8px 11px;font-size:13px;color:var(--mut);box-shadow:0 10px 26px -14px rgba(17,23,38,.4);animation:af-rise .6s cubic-bezier(.2,.7,.2,1) both}
.af-fig-chip b{color:var(--tx);font-weight:700}
.af-fig-chip svg{flex-shrink:0;color:var(--em)}
.af-fig-chip.earn{top:16px;animation-delay:.25s}
.af-fig-chip.gift{bottom:16px;animation-delay:.45s}
.af-fig-chip.gift svg{color:var(--em2)}
@keyframes af-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
/* at-a-glance stat tiles (site's wm-fld-stat language) */
.af-stats3{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:40px}
.af-stat3{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 18px 18px;text-align:center;box-shadow:0 1px 2px rgba(17,23,38,.04),0 16px 36px -26px rgba(17,23,38,.2)}
.af-stat3 b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(26px,3.2vw,36px);letter-spacing:-.02em;line-height:1.02;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.af-stat3 span{display:block;margin-top:8px;color:var(--mut);font-size:13px;line-height:1.4}

/* boosters: four white cards, green->blue tiles */
.af-boost{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.af-boost-card{padding:22px 22px 20px;transition:transform .18s,box-shadow .2s}
.af-boost-card:hover{transform:translateY(-3px);box-shadow:0 1px 2px rgba(17,23,38,.05),0 28px 56px -26px rgba(17,23,38,.3)}
.af-boost-card .af-tile{margin-bottom:14px}
.af-boost-card b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:17px;letter-spacing:-.01em;line-height:1.25;color:var(--ink-brand)}
.af-boost-card p{color:var(--mut);font-size:14.5px;line-height:1.55;margin-top:8px}

/* flow: five nodes on a green->blue track */
.af-flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:18px;position:relative}
.af-flow:before{content:"";position:absolute;left:10%;right:10%;top:34px;height:3px;border-radius:3px;background:var(--grad);opacity:.35}
.af-flow-step{position:relative;text-align:center;padding:0 6px;animation:af-rise .6s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i) * 90ms)}
.af-flow-node{position:relative;display:inline-flex;margin-bottom:16px}
.af-flow-ic{display:inline-flex;align-items:center;justify-content:center;width:70px;height:70px;border-radius:22px;color:#fff;background:linear-gradient(135deg,var(--em),var(--em2));box-shadow:0 0 0 6px #fff,0 0 0 7px var(--line),0 18px 36px -16px rgba(10,134,207,.6);transition:transform .2s}
.af-flow-step:hover .af-flow-ic{transform:translateY(-3px)}
.af-flow-n{position:absolute;right:-6px;top:-6px;width:24px;height:24px;border-radius:50%;background:#fff;border:1px solid var(--line);color:var(--em);font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:12px;display:grid;place-items:center;box-shadow:0 4px 10px -4px rgba(17,23,38,.3)}
.af-flow-step b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:17px;letter-spacing:-.01em;color:var(--ink-brand)}
.af-flow-step p{color:var(--mut);font-size:13.5px;line-height:1.5;margin-top:5px}

/* audience photos (the site's own images), honest captions */
.af-aud-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.af-photo{position:relative;margin:0;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:#fff;box-shadow:0 1px 2px rgba(17,23,38,.04),0 30px 64px -40px rgba(17,23,38,.5)}
.af-photo img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
.af-photo figcaption{display:flex;flex-direction:column;gap:3px;padding:14px 18px 16px;background:#fff;border-top:1px solid var(--line)}
.af-photo figcaption b{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:16px;color:var(--ink-brand)}
.af-photo figcaption span{color:var(--mut);font-size:13.5px;line-height:1.45}

/* APPLY */
.af-apply{padding:58px 0 0}
.af-apply-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:22px;align-items:start}
.af-apply-grid>*{min-width:0}
.af-apply-side{display:flex;flex-direction:column;gap:16px}
.af-rulescard{padding:22px 24px}
.af-rules{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:11px}
.af-rules li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5;color:var(--mut)}
.af-rules li svg{flex-shrink:0;margin-top:4px;color:var(--em)}
.af-rules li b{color:var(--tx)}
.af-rules.compact{gap:9px;margin-top:14px}
.af-rules.compact li{font-size:13.5px}
/* the deal card */
.af-perk{padding:24px 26px 22px;background:linear-gradient(180deg,rgba(10,157,102,.06),#fff 90px)}
.af-perk-row{display:flex;gap:14px;align-items:flex-start}
.af-perk-k{display:block;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--em)}
.af-perk-v{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(28px,3.2vw,36px);letter-spacing:-.025em;line-height:1.05;margin-top:2px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.af-perk-row p{color:var(--mut);font-size:14px;line-height:1.5;margin-top:4px}
.af-perk-plus{display:flex;align-items:center;gap:12px;margin:14px 0}
.af-perk-plus:before,.af-perk-plus:after{content:"";flex:1;height:1px;background:var(--line)}
.af-perk-plus span{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;border:1px solid var(--em-line);background:#fff;color:var(--em);font-weight:800;font-size:15px;line-height:1}
/* the form: white card, soft green/blue header */
.af-formcard{padding:0;overflow:hidden}
.af-formhead{display:flex;align-items:center;gap:12px;padding:18px 24px;background:linear-gradient(100deg,rgba(10,157,102,.10),rgba(10,134,207,.08));border-bottom:1px solid var(--line)}
.af-formhead b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:17.5px;letter-spacing:-.01em;color:var(--ink-brand)}
.af-formhead span{display:block;font-size:13px;line-height:1.4;color:var(--mut)}
.af-form{padding:22px 24px 24px}
.af-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.af-field{display:flex;flex-direction:column;margin-bottom:14px}
.af-field label{font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
.af-field .opt{color:var(--faint);font-weight:400}
.af-field input,.af-field textarea{border:1px solid var(--line);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;color:var(--tx);background:#fcfdfe;outline:none;resize:vertical;width:100%}
.af-field input:focus,.af-field textarea:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(10,157,102,.14)}
.af-form-sec{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--em);margin:4px 0 12px;padding-top:14px;border-top:1px solid var(--line)}
.af-form-sec:first-child,.af-note+.af-form-sec{border-top:none;padding-top:0}
.af-form-sec .opt{text-transform:none;letter-spacing:0;font-weight:500;color:var(--faint);font-size:12.5px}
.af-form-sec-ic{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:var(--tile);color:var(--em)}
/* an input with a leading glyph (phone icon or an @) */
.af-prefix{position:relative;display:flex;align-items:center}
.af-prefix>svg{position:absolute;left:12px;color:var(--faint);pointer-events:none}
.af-prefix>input{padding-left:36px}
.af-prefix.at>input{padding-left:30px}
.af-at{position:absolute;left:12px;color:var(--faint);font-weight:600;font-size:14px;pointer-events:none}
.af-prefix:focus-within>svg,.af-prefix:focus-within .af-at{color:var(--em)}
/* social handles grid with text monograms (no brand marks in lucide) */
.af-socials{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px;margin-bottom:6px}
.af-social{display:flex;flex-direction:column}
.af-social label{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
.af-social input{border:1px solid var(--line);border-radius:11px;padding:10px 12px;font:inherit;font-size:14px;color:var(--tx);background:#fcfdfe;outline:none;width:100%}
.af-social input:focus{border-color:var(--em);box-shadow:0 0 0 3px rgba(10,157,102,.14)}
.af-social-mark{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.02em;color:#fff;background:#3f4a5c;line-height:1}
.af-social-mark.m-tiktok{background:#111318}
.af-social-mark.m-instagram{background:linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)}
.af-social-mark.m-youtube{background:#e02424}
.af-social-mark.m-twitter{background:#0c1222}
.af-social-mark.m-facebook{background:#1877f2}
.af-social-mark.m-linkedin{background:#0a66c2;font-weight:700;font-size:12px}
.af-social-mark.m-other{background:var(--em2);font-size:14px}
.af-social:focus-within label{color:var(--em)}
/* thank-you + closed */
.af-ok,.af-closed{text-align:center;padding:36px 28px}
.af-ok-ic,.af-closed-ic{width:58px;height:58px;border-radius:50%;background:var(--em-soft);border:1px solid var(--em-line);color:var(--em);display:grid;place-items:center;margin:0 auto 14px}
.af-closed-ic{background:#f1f4f8;border-color:var(--line);color:var(--mut)}
.af-ok h3,.af-closed h3{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:22px;margin:0 0 8px;color:var(--ink-brand)}
.af-ok p,.af-closed p{color:var(--mut);font-size:15px;line-height:1.55;max-width:44ch;margin:0 auto 18px}
.af-closed a{color:var(--em);text-decoration:underline;text-underline-offset:3px}
.af-ok-steps{list-style:none;margin:0 auto 20px;padding:0;display:flex;flex-direction:column;gap:9px;max-width:420px;text-align:left}
.af-ok-steps li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--mut);line-height:1.45}
.af-ok-steps li b{color:var(--tx)}
.af-ok-dot{display:inline-grid;place-items:center;flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--em-soft);border:1px solid var(--em-line);color:var(--em)}
@media(prefers-reduced-motion:reduce){.af-land *,.af-land *:before,.af-land *:after{animation:none !important}}

/* ---------- dashboard */
.af-dash-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:26px}
.af-dash-meta{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding-bottom:6px}
.af-linkcard{background:linear-gradient(180deg,rgba(242,106,67,.07),#fff 80px);border-color:var(--acc-line)}
.af-linkcard-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.af-linkrow{display:flex;gap:10px;margin-top:16px}
.af-linkinput{flex:1;min-width:0;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font:inherit;font-size:14.5px;font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;color:var(--tx);background:#fff;outline:none}
.af-linkinput:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-soft)}
.af-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin:18px 0}
.af-stat{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 16px 14px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 30px -24px rgba(17,23,38,.2)}
.af-stat-k{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--mut)}
.af-stat-k svg{color:var(--acc)}
.af-stat-v{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:28px;letter-spacing:-.02em;margin-top:8px;line-height:1.05;font-variant-numeric:tabular-nums}
.af-stat-h{font-size:11.5px;color:var(--faint);margin-top:5px}
.af-two{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
.af-two>*{min-width:0}
.af-payout-state{margin-top:12px}
.af-rate{margin-top:12px;display:flex;flex-direction:column}
.af-rate b{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:44px;letter-spacing:-.03em;line-height:1;background:linear-gradient(120deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}
.af-rate span{color:var(--mut);font-size:13.5px;margin-top:6px}
.af-ledger{margin-top:34px}
.af-ledger-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px}
.af-ledger-count{color:var(--faint);font-size:13px;font-weight:600}
.af-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:34px 24px;color:var(--mut)}
.af-empty svg{color:var(--acc);margin-bottom:4px}
.af-empty b{color:var(--tx);font-size:15.5px}
.af-empty p{font-size:14px;max-width:46ch;line-height:1.5}
.af-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 30px -24px rgba(17,23,38,.2)}
.af-table{width:100%;border-collapse:collapse;font-size:14px;min-width:640px}
.af-table th{text-align:left;padding:11px 16px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);background:#f7f9fc;border-bottom:1px solid var(--line);white-space:nowrap}
.af-table td{padding:12px 16px;border-bottom:1px solid var(--line);vertical-align:middle;white-space:nowrap}
.af-table tr:last-child td{border-bottom:none}
.af-table tbody tr:hover{background:#fbfcfe}
.af-strong{font-weight:600}
.af-mono{font-variant-numeric:tabular-nums}
.af-faint{color:var(--mut)}
.af-paidon{color:var(--faint);font-size:12.5px}

/* ---------- responsive */
@media(max-width:900px){
  .af-hero{grid-template-columns:1fr;gap:28px}
  .af-stats3{grid-template-columns:1fr 1fr;margin-top:28px}
  .af-boost{grid-template-columns:1fr 1fr}
  .af-aud-grid{grid-template-columns:1fr}
  .af-apply-grid{grid-template-columns:1fr}
  .af-sec,.af-apply{padding-top:46px}
  /* flow becomes a vertical timeline: track on the left, nodes down the side */
  .af-flow{grid-template-columns:1fr;gap:0}
  .af-flow:before{left:34px;right:auto;top:20px;bottom:20px;width:3px;height:auto;background:linear-gradient(180deg,var(--em),var(--em2))}
  .af-flow-step{display:grid;grid-template-columns:70px 1fr;column-gap:18px;text-align:left;padding:0 0 26px}
  .af-flow-step:last-child{padding-bottom:0}
  .af-flow-node{margin-bottom:0;grid-row:1/3}
  .af-flow-ic{width:60px;height:60px;border-radius:18px;margin-left:4px}
  .af-flow-step b{margin-top:6px}
  .af-stats{grid-template-columns:repeat(3,1fr)}
  .af-two{grid-template-columns:1fr}
  .af-dash-head{flex-direction:column;align-items:flex-start}
  .af-dash-meta{justify-content:flex-start}
}
@media(max-width:600px){
  .af-main{padding:36px 0 54px}
  .af-wrap{padding:0 16px}
  .af-card{padding:20px;border-radius:16px}
  .af-land .af-h1{font-size:clamp(30px,8.6vw,38px)}
  .af-land .af-h2{font-size:clamp(24px,7vw,30px)}
  .af-sechead{margin-bottom:22px}
  .af-sechead .af-sub{font-size:16px}
  .af-hero-cta{flex-direction:column;align-items:stretch}
  .af-hero-cta .af-cta{width:100%}
  .af-hero-cta .af-textlink{justify-content:center}
  .af-fig-chip{font-size:12px;padding:7px 11px 7px 9px}
  .af-stats3{grid-template-columns:1fr 1fr;gap:10px}
  .af-stat3{padding:14px 10px 12px}
  .af-stat3 span{font-size:12px}
  .af-boost{grid-template-columns:1fr;gap:10px}
  .af-flow-step{grid-template-columns:60px 1fr;column-gap:14px}
  .af-flow:before{left:30px}
  .af-flow-ic{width:52px;height:52px;border-radius:16px}
  .af-flow-n{width:22px;height:22px;font-size:11px}
  .af-grid2{grid-template-columns:1fr}
  .af-socials{grid-template-columns:1fr}
  .af-formhead{padding:14px 16px}
  .af-form{padding:18px 16px 20px}
  .af-form .af-cta{width:100%}
  .af-perk{padding:20px 18px 18px}
  .af-stats{grid-template-columns:1fr 1fr;gap:10px}
  .af-stat-v{font-size:24px}
  .af-linkrow{flex-direction:column}
  .af-linkrow .af-cta{width:100%}
}
`
