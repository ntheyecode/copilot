// WorkCoPilot - public affiliate program page (/affiliate, also /affliate).
// Two faces in one route:
//   LANDING   - what the program is, how it pays, and the application form.
//   DASHBOARD - for a signed-in, approved affiliate: referral link, stats,
//               Stripe payout setup, and the referral ledger.
// The server decides which face applies: api.affiliateDashboard() succeeds for
// an affiliate and 404s for everyone else. Copy stays honest: the only promise
// is the stated percentage of each referral's FIRST payment, paid through Stripe.
// Light theme, orange accent (#f26a43). US spelling, no em-dashes.
import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Copy, Loader2, Link2, MousePointerClick, UserCheck,
  Wallet, Clock, BadgeCheck, CreditCard, ShieldCheck, Send, Megaphone, Share2,
  AlertTriangle, PauseCircle, FileText, Sparkles, Search, KeyRound, Gift, Phone, AtSign, Mail,
  Rocket, Coins, Zap, TrendingUp, Star,
} from 'lucide-react'
import AdmireVedaLogo from '../components/AdmireVedaLogo.jsx'
import { api } from '../api.js'
import useSeo from '../useSeo.js'

const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`
const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '-'
  try { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d.toISOString().slice(0, 10) }
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Social platforms we ask for (key = what the server stores under `socials`).
// lucide has no brand marks, so each gets a short text monogram instead.
const SOCIALS = [
  { k: 'tiktok', label: 'TikTok', mark: 'TT', ph: '@yourhandle', at: true },
  { k: 'instagram', label: 'Instagram', mark: 'IG', ph: '@yourhandle', at: true },
  { k: 'youtube', label: 'YouTube', mark: 'YT', ph: '@channel or channel link', at: false },
  { k: 'twitter', label: 'X (Twitter)', mark: 'X', ph: '@yourhandle', at: true },
  { k: 'facebook', label: 'Facebook', mark: 'FB', ph: 'Page name or link', at: false },
  { k: 'linkedin', label: 'LinkedIn', mark: 'in', ph: 'Profile or company page link', at: false },
  { k: 'other', label: 'Other', mark: '+', ph: 'Newsletter, podcast, Discord, blog...', at: false },
]
const EMPTY_SOCIALS = Object.fromEntries(SOCIALS.map((s) => [s.k, '']))

export default function AffiliatePage() {
  useSeo({
    title: 'WorkCoPilot Affiliate Program - Partner with AdmireVeda',
    description: 'Recommend WorkCoPilot and earn a share of every referred person\'s first payment, paid out through Stripe. Applications are reviewed by our team.',
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

  // Same display + body faces as the marketing page so the two read as one site.
  useEffect(() => {
    const id = 'wm-fonts'
    if (document.getElementById(id)) return
    const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap'
    document.head.appendChild(l)
  }, [])

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
        else setPubErr((pubR.reason && pubR.reason.message) || 'Could not load the program details.')
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
                  ? 'Stripe setup is complete. Payouts are active on your account.'
                  : connect === 'refresh'
                    ? 'Your Stripe setup link expired or was interrupted. You can resume it below.'
                    : 'Stripe has not finished verifying your details yet. You can resume setup below.')
              }
            } catch (e) {
              if (alive) setConnectNote(`Could not refresh your Stripe status: ${(e && e.message) || 'please try again.'}`)
            }
            const next = new URLSearchParams(sp); next.delete('connect')
            setSp(next, { replace: true })
          }
          if (alive) setDash(d)
        } catch (e) {
          if (e && e.status === 404) return   // signed in, not an affiliate: landing view
          if (alive) setDashErr((e && e.message) || 'Could not load your affiliate dashboard.')
        }
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rate = pub && pub.defaultRatePct != null ? Number(pub.defaultRatePct) : null

  return (
    <div className="af">
      <style>{CSS}</style>
      <header className="af-nav">
        <div className="af-wrap af-nav-in">
          <a href="/" aria-label="AdmireVeda home"><AdmireVedaLogo size={26} /></a>
          <a className="af-back" href="/"><ArrowLeft size={15} /> Back to WorkCoPilot</a>
        </div>
      </header>

      <main className="af-main">
        <div className="af-wrap">
          {loading ? (
            <div className="af-loading"><Loader2 size={20} className="af-spin" /> Loading the affiliate program</div>
          ) : dash ? (
            <Dashboard d={dash} payoutsEnabled={payoutsEnabled} connectNote={connectNote} onDashChange={setDash} />
          ) : (
            <Landing pub={pub} pubErr={pubErr} rate={rate} me={me} dashErr={dashErr} />
          )}
        </div>
      </main>

      <footer className="af-foot">
        <div className="af-wrap af-foot-in">
          <span>&copy; {new Date().getFullYear()} COE Security LLC &middot; WorkCoPilot by AdmireVeda</span>
          <nav className="af-foot-links">
            <a href="/workcopilot/terms">Terms</a>
            <a href="/workcopilot/privacy">Privacy</a>
            <a href="mailto:support@admireveda.com">Support</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ LANDING */
function Landing({ pub, pubErr, rate, me, dashErr }) {
  const user = me && me.user
  const rateWord = rate != null ? `${rate}%` : 'a commission'
  // Primary CTA: glide to the form and put the cursor in the first field.
  const goApply = () => {
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = document.getElementById('apply')
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setTimeout(() => { const i = document.getElementById('af-name'); if (i) i.focus({ preventScroll: true }) }, reduce ? 0 : 520)
  }
  return (
    <div className="af-land">
      <div className="af-aurora" aria-hidden><span className="b1" /><span className="b2" /><span className="b3" /><span className="b4" /></div>

      <section className="af-hero">
        <Sparks />
        <div className="af-hero-copy">
          <div className="af-eyebrow"><Megaphone size={14} /> Affiliate program</div>
          <h1 className="af-h1">Partner with WorkCoPilot. <span className="af-h1-b">Earn on every referral.</span></h1>
          <p className="af-lead">
            Help the people you already reach do their best work, and earn real money doing it: <b>{rateWord} of every referral&rsquo;s first payment</b>, paid automatically through Stripe.
            Your audience gets <b>a free month on annual billing</b>. Approved affiliates only: every application is reviewed by a person.
          </p>
          <div className="af-hero-cta">
            <button type="button" className="af-cta af-cta-hero" onClick={goApply}><Rocket size={17} /> Apply to become an affiliate <ArrowRight size={16} /></button>
            <a className="af-cta alt" href="/">See what you&rsquo;d be recommending <ArrowRight size={15} /></a>
          </div>
          <div className="af-hero-facts" aria-label="Program at a glance">
            <div className="af-fact" style={{ '--c1': '#ffb02e', '--c2': '#f26a43' }}><b>{rate != null ? `${rate}%` : 'Set %'}</b><span>of each referral&rsquo;s first payment</span></div>
            <div className="af-fact" style={{ '--c1': '#ff3d8d', '--c2': '#d63aff' }}><b>Stripe</b><span>automatic payouts to your account</span></div>
            <div className="af-fact" style={{ '--c1': '#d63aff', '--c2': '#7c3aed' }}><b>Free month</b><span>for everyone you refer, on annual billing</span></div>
          </div>
        </div>
        <HeroVisual rate={rate} />
      </section>

      <Boosters />

      <Flow rateWord={rateWord} />

      <section className="af-apply" id="apply">
        <div className="af-apply-grid">
          <div>
            <div className="af-eyebrow"><Send size={14} /> Apply</div>
            <h2 className="af-h2">This could be the easiest yes you say this year.</h2>
            <p className="af-sub">A two-minute form. You get a confirmation email right away, and we email you the moment we decide. Your social handles help us say yes faster.</p>
            <PerkCard rateWord={rateWord} />
            {pubErr ? <div className="af-note warn"><AlertTriangle size={14} /> {pubErr}</div> : null}
            {dashErr ? <div className="af-note warn"><AlertTriangle size={14} /> {dashErr}</div> : null}
            <ul className="af-rules">
              <li><ShieldCheck size={15} /> <span>Commission is <b>{rateWord} of the referred person&rsquo;s first payment</b>. Renewals and later purchases do not earn commission.</span></li>
              <li><CreditCard size={15} /> <span>Payouts are sent through <b>Stripe</b> once your pending balance reaches the program minimum, shown in your dashboard.</span></li>
              <li><Gift size={15} /> <span>The people you refer get <b>a free month</b> when they sign up through your link and choose annual billing.</span></li>
              <li><UserCheck size={15} /> <span>Referrals are tracked by your link. A referral counts when the person signs up through it and then pays.</span></li>
              <li><FileText size={15} /> <span>Honest promotion only: no spam, no misleading claims, no bidding on the WorkCoPilot or AdmireVeda names in paid search.</span></li>
            </ul>
          </div>
          {pub && pub.enabled === false ? (
            <div className="af-card af-closed">
              <div className="af-closed-ic"><PauseCircle size={26} /></div>
              <h3>Affiliate applications are closed right now.</h3>
              <p>We are not taking new affiliates at the moment. Check back later, or <a href="/workcopilot/contact">contact us</a> if you have a partnership in mind.</p>
            </div>
          ) : (
            <ApplyForm user={user} />
          )}
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------ landing-only decorations */
// Confetti-style sparks scattered around the hero band (pure inline SVG, CSS
// float animation; hidden on phones where the band is tight).
const STAR = 'M12 1.5l2.7 7.1 7.8 2.4-7.8 2.4L12 20.5l-2.7-7.1L1.5 11l7.8-2.4z'
const SPARKS = [
  { s: 's1', c: '#ffb02e', k: 'star' }, { s: 's2', c: '#ff3d8d', k: 'dot' }, { s: 's3', c: '#7c3aed', k: 'rect' },
  { s: 's4', c: '#f26a43', k: 'ring' }, { s: 's5', c: '#d63aff', k: 'star' }, { s: 's6', c: '#38bdf8', k: 'rect' },
  { s: 's7', c: '#ffb02e', k: 'dot' }, { s: 's8', c: '#ff3d8d', k: 'star' }, { s: 's9', c: '#7c3aed', k: 'ring' },
]
function Sparks() {
  return (
    <>
      {SPARKS.map((p) => (
        <span key={p.s} className={`af-spark ${p.s}`} aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22">
            {p.k === 'star' ? <path d={STAR} fill={p.c} /> : null}
            {p.k === 'dot' ? <circle cx="12" cy="12" r="6" fill={p.c} /> : null}
            {p.k === 'rect' ? <rect x="6" y="9" width="12" height="6" rx="2" fill={p.c} transform="rotate(-22 12 12)" /> : null}
            {p.k === 'ring' ? <circle cx="12" cy="12" r="6.5" fill="none" stroke={p.c} strokeWidth="3.5" /> : null}
          </svg>
        </span>
      ))}
    </>
  )
}

// Hero visual: a breathing "You earn N%" badge inside a spinning conic halo
// with floating coin motifs, plus a rising referrals line that draws itself in.
// The chart is labeled as an illustration (not a forecast) to stay honest.
const CHART_PTS = [[0, 104], [46, 90], [92, 96], [138, 74], [184, 66], [230, 44], [276, 34], [320, 16]]
function HeroVisual({ rate }) {
  const line = CHART_PTS.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
  const area = `${line} L320 120 L0 120 Z`
  return (
    <div className="af-vis" aria-hidden>
      <div className="af-badge-wrap">
        <span className="af-badge-halo" />
        <span className="af-badge-ring" />
        <div className="af-badge">
          <span className="af-badge-k">You earn</span>
          <b className="af-badge-v">{rate != null ? `${rate}%` : '%'}</b>
          <span className="af-badge-s">of every referral&rsquo;s first payment</span>
        </div>
        <span className="af-coin c1"><Coins size={16} /></span>
        <span className="af-coin c2">$</span>
        <span className="af-coin c3"><Star size={13} /></span>
        <span className="af-coin c4">$</span>
      </div>
      <div className="af-chart">
        <div className="af-chart-head"><span><TrendingUp size={14} /> Referrals over time</span><b>Illustration</b></div>
        <svg viewBox="0 0 320 120">
          <defs>
            <linearGradient id="afLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#ffb02e" /><stop offset=".5" stopColor="#f26a43" /><stop offset="1" stopColor="#d63aff" /></linearGradient>
            <linearGradient id="afArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff3d8d" stopOpacity=".32" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
          </defs>
          {[24, 48, 72, 96].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} className="af-gridline" />)}
          <path d={area} fill="url(#afArea)" className="af-area" />
          <path d={line} fill="none" stroke="url(#afLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="af-line" />
          {CHART_PTS.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={i === CHART_PTS.length - 1 ? 5 : 3} className={`af-dot${i === CHART_PTS.length - 1 ? ' last' : ''}`} style={{ '--d': `${0.35 + i * 0.14}s` }} />
          ))}
        </svg>
        <div className="af-chart-foot">An illustration, not a forecast. Your results depend on your audience.</div>
      </div>
    </div>
  )
}

// Vivid benefit strip under the hero: each card owns a slice of the gradient.
const BOOSTERS = [
  { ic: Coins, t: 'Earn on every referral', d: 'A share of each first payment, credited to you.', c1: '#ffb02e', c2: '#f26a43' },
  { ic: Zap, t: 'Quick, human review', d: 'A person reads every application and emails you the decision.', c1: '#f26a43', c2: '#ff3d8d' },
  { ic: CreditCard, t: 'Automatic Stripe payouts', d: 'Connect once. Earnings land in your Stripe account.', c1: '#ff3d8d', c2: '#d63aff' },
  { ic: Gift, t: 'A free month for your audience', d: 'Your referrals get a month free on annual billing.', c1: '#d63aff', c2: '#7c3aed' },
]
function Boosters() {
  return (
    <section className="af-boost" aria-label="Why affiliates love it">
      {BOOSTERS.map((b, i) => (
        <div className="af-boost-card" key={b.t} style={{ '--i': i, '--c1': b.c1, '--c2': b.c2 }}>
          <span className="af-boost-ic"><b.ic size={19} /></span>
          <b>{b.t}</b>
          <p>{b.d}</p>
        </div>
      ))}
    </section>
  )
}

// The hero's right-hand card: both sides of the deal in one glance. The exact
// percentage comes from the server; the free month is the referred person's perk.
function PerkCard({ rateWord }) {
  return (
    <div className="af-card af-perk" aria-label="What you earn and what your referrals get">
      <svg className="af-perk-burst" viewBox="0 0 80 80" aria-hidden>
        <path d="M40 6l4.6 12.4L57 23l-12.4 4.6L40 40l-4.6-12.4L23 23l12.4-4.6z" fill="#ffb02e" className="tw t1" />
        <path d="M62 38l2.6 7 7 2.6-7 2.6-2.6 7-2.6-7-7-2.6 7-2.6z" fill="#ff3d8d" className="tw t2" />
        <circle cx="22" cy="54" r="4" fill="#7c3aed" className="tw t3" />
        <circle cx="60" cy="66" r="3" fill="#d63aff" className="tw t1" />
      </svg>
      <div className="af-perk-row you">
        <span className="af-perk-ic"><Wallet size={20} /></span>
        <div>
          <span className="af-perk-k">You earn</span>
          <b className="af-perk-v">{rateWord}</b>
          <p>of each referred person&rsquo;s first payment, paid out through Stripe.</p>
        </div>
      </div>
      <div className="af-perk-plus" aria-hidden><span>+</span></div>
      <div className="af-perk-row them">
        <span className="af-perk-ic"><Gift size={20} /></span>
        <div>
          <span className="af-perk-k">They get</span>
          <b className="af-perk-v">A free month</b>
          <p>when they sign up through your link and choose annual billing.</p>
        </div>
      </div>
      <div className="af-perk-foot"><ShieldCheck size={13} /> Approved affiliates only. Every application is reviewed by a person.</div>
    </div>
  )
}

// The "how it works" centerpiece: five connected steps on an orange track.
// Horizontal on desktop, a vertical timeline on phones (CSS handles the swap).
const FLOW = (rateWord) => [
  { ic: Send, t: 'Apply', d: 'Fill in the short form below. A confirmation lands in your inbox right away.', c1: '#ffb02e', c2: '#f26a43' },
  { ic: Search, t: 'We review', d: 'A person reads every application, including your audience and social channels.', c1: '#f26a43', c2: '#ff6b6b' },
  { ic: KeyRound, t: 'Approved', d: 'Your approval email has a link to set your password and open your dashboard.', c1: '#ff6b6b', c2: '#ff3d8d' },
  { ic: Share2, t: 'Share your link', d: 'Your personal referral link and code are ready. Share them wherever your audience listens.', c1: '#ff3d8d', c2: '#d63aff' },
  { ic: Coins, t: 'Earn', d: `You get ${rateWord} of each referral's first payment. They get a free month on annual billing.`, c1: '#d63aff', c2: '#7c3aed' },
]
function Flow({ rateWord }) {
  const steps = FLOW(rateWord)
  return (
    <section className="af-flow-sec" aria-label="How the affiliate program works">
      <div className="af-flow-head">
        <div className="af-eyebrow"><Sparkles size={14} /> How it works</div>
        <h2 className="af-h2">Five steps, from application to payout.</h2>
      </div>
      <ol className="af-flow">
        {steps.map((s, i) => (
          <li key={s.t} className="af-flow-step" style={{ '--i': i, '--c1': s.c1, '--c2': s.c2 }}>
            <div className="af-flow-node">
              <span className="af-flow-ic"><s.ic size={22} /></span>
              <span className="af-flow-n">{i + 1}</span>
            </div>
            {i < steps.length - 1 ? <span className="af-flow-arrow" aria-hidden><ArrowRight size={14} /></span> : null}
            <b>{s.t}</b>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ApplyForm({ user }) {
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
    if (!name) { setErr('Please add your name.'); return }
    if (!email || !EMAIL_RE.test(email)) { setErr('Please add a valid email address.'); return }
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
      if (error && error.status === 409) setErr((error && error.message) || 'An application for this email already exists. We will be in touch.')
      else setErr((error && error.message) || 'Could not send your application. Please try again.')
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="af-card af-ok">
        <div className="af-ok-ic"><Check size={26} /></div>
        <h3>Application received.</h3>
        <p>Thank you, {form.name.split(' ')[0] || 'there'}. We emailed you a confirmation at <b>{form.email}</b>. We review every application, and you&rsquo;ll get an email the moment we decide. If approved, that email has a link to set your password and open your dashboard.</p>
        <ul className="af-ok-steps" aria-label="What happens next">
          <li><span className="af-ok-dot"><Mail size={13} /></span><span><b>Now:</b> a confirmation is in your inbox.</span></li>
          <li><span className="af-ok-dot"><Search size={13} /></span><span><b>Next:</b> a person reviews your application.</span></li>
          <li><span className="af-ok-dot"><KeyRound size={13} /></span><span><b>If approved:</b> set your password from the email and open your dashboard.</span></li>
        </ul>
        <a className="af-cta alt" href="/">Back to WorkCoPilot</a>
      </div>
    )
  }

  return (
    <div className="af-formwrap">
      <div className="af-formhead">
        <span className="af-formhead-ic"><Rocket size={17} /></span>
        <div><b>Your partner application</b><span>About two minutes. Name and email are all we need; everything else helps us say yes faster.</span></div>
      </div>
    <form className="af-form" onSubmit={submit} noValidate>
      {user && user.email ? (
        <div className="af-note"><UserCheck size={14} /> You are signed in as <b>{user.email}</b>. You can apply with this account, and your affiliate dashboard will live under it once approved.</div>
      ) : null}
      <div className="af-form-sec"><span className="af-form-sec-ic"><UserCheck size={13} /></span> Contact</div>
      <div className="af-grid2">
        <div className="af-field"><label htmlFor="af-name">Your name</label><input id="af-name" value={form.name} maxLength={120} autoComplete="name" onChange={(e) => set('name', e.target.value)} placeholder="Alex Morgan" /></div>
        <div className="af-field"><label htmlFor="af-email">Email</label><input id="af-email" type="email" value={form.email} maxLength={160} autoComplete="email" onChange={(e) => set('email', e.target.value)} placeholder="you@yourdomain.com" /></div>
      </div>
      <div className="af-grid2">
        <div className="af-field"><label htmlFor="af-phone">Phone <span className="opt">(optional)</span></label><div className="af-prefix"><Phone size={14} /><input id="af-phone" type="tel" value={form.phone} maxLength={40} inputMode="tel" autoComplete="tel" onChange={(e) => set('phone', e.target.value)} placeholder="+1 555 123 4567" /></div></div>
        <div className="af-field"><label htmlFor="af-web">Website <span className="opt">(optional)</span></label><input id="af-web" value={form.website} maxLength={300} inputMode="url" autoComplete="url" onChange={(e) => set('website', e.target.value)} placeholder="https://yoursite.com" /></div>
      </div>

      <div className="af-form-sec"><span className="af-form-sec-ic"><AtSign size={13} /></span> Social media <span className="opt">(optional, but it is how we vet affiliates){socialCount ? ` - ${socialCount} added` : ''}</span></div>
      <div className="af-socials">
        {SOCIALS.map((s) => (
          <div className="af-social" key={s.k}>
            <label htmlFor={`af-so-${s.k}`}><span className={`af-social-mark m-${s.k}`} aria-hidden>{s.mark}</span>{s.label}</label>
            <div className={`af-prefix${s.at ? ' at' : ''}`}>
              {s.at ? <span className="af-at" aria-hidden>@</span> : null}
              <input id={`af-so-${s.k}`} value={form.socials[s.k]} maxLength={200} autoComplete="off" spellCheck={false}
                onChange={(e) => setSocial(s.k, s.at ? e.target.value.replace(/^@+/, '') : e.target.value)} placeholder={s.at ? s.ph.replace(/^@/, '') : s.ph} />
            </div>
          </div>
        ))}
      </div>

      <div className="af-form-sec"><span className="af-form-sec-ic"><Megaphone size={13} /></span> Your audience</div>
      <div className="af-field"><label htmlFor="af-aud">Who is your audience? <span className="opt">(optional)</span></label><input id="af-aud" value={form.audience} maxLength={300} onChange={(e) => set('audience', e.target.value)} placeholder="For example: IT admins at small companies, bootcamp students, finance teams" /></div>
      <div className="af-field"><label htmlFor="af-notes">Anything else <span className="opt">(optional)</span></label><textarea id="af-notes" rows={4} value={form.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} placeholder="How you plan to share WorkCoPilot, or anything we should know." /></div>
      {err ? <div className="af-err" role="alert"><AlertTriangle size={14} /> {err}</div> : null}
      <button className="af-cta" type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="af-spin" /> : <Send size={16} />} Send application</button>
      <p className="af-fine">By applying you agree to promote WorkCoPilot honestly. We only use these details to review your application and run the program. You get a confirmation email right away, and a decision email when we have reviewed it.</p>
    </form>
    </div>
  )
}

/* ---------------------------------------------------------------- DASHBOARD */
function Dashboard({ d, payoutsEnabled, connectNote, onDashChange }) {
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
      setOnboardErr('Stripe did not return a setup link. Please try again in a moment.')
    } catch (e) { setOnboardErr((e && e.message) || 'Could not start Stripe setup. Please try again.') }
    finally { setOnboardBusy(false) }
  }

  // Manual re-check for an affiliate who finished Stripe in another tab.
  const recheck = async () => {
    if (refreshBusy) return
    setRefreshBusy(true); setRefreshErr('')
    try {
      const r = await api.affiliateConnectRefresh()
      onDashChange({ ...d, stripeOnboarded: !!r.onboarded, stripeConnected: !!r.connected })
    } catch (e) { setRefreshErr((e && e.message) || 'Could not check your Stripe status.') }
    finally { setRefreshBusy(false) }
  }

  const suspended = d.status === 'suspended'
  const rows = Array.isArray(d.referralRows) ? d.referralRows : []
  const firstName = (d.name || '').split(' ')[0]

  return (
    <>
      <section className="af-dash-head">
        <div>
          <div className="af-eyebrow"><Megaphone size={14} /> Affiliate dashboard</div>
          <h1 className="af-h1 sm">{firstName ? <>Welcome back, <em>{firstName}.</em></> : <>Your <em>affiliate</em> dashboard.</>}</h1>
          <p className="af-lead">You earn <b>{Number(d.ratePct) || 0}%</b> of each referral&rsquo;s first payment. Share your link, and this page keeps the score.</p>
        </div>
        <div className="af-dash-meta">
          <span className={`af-chip ${suspended ? 'warn' : 'ok'}`}>{suspended ? <PauseCircle size={13} /> : <BadgeCheck size={13} />} {suspended ? 'On hold' : 'Approved affiliate'}</span>
          <span className="af-chip mono"><Link2 size={13} /> {d.code || '-'}</span>
        </div>
      </section>

      {suspended ? (
        <div className="af-note warn big" role="status">
          <PauseCircle size={16} />
          <div><b>Your affiliate account is on hold.</b> New referrals are not being credited while it is paused. Your earned balance stays on record. If you have questions, write to <a href="mailto:support@admireveda.com">support@admireveda.com</a>.</div>
        </div>
      ) : null}

      <section className="af-card af-linkcard">
        <div className="af-linkcard-top">
          <div>
            <div className="af-card-k"><Link2 size={14} /> Your referral link</div>
            <p className="af-card-d">Anyone who signs up through this link and makes their first payment earns you {Number(d.ratePct) || 0}% of that payment.</p>
          </div>
        </div>
        <div className="af-linkrow">
          <input className="af-linkinput" readOnly value={d.referralLink || ''} onFocus={(e) => e.target.select()} aria-label="Your referral link" />
          <button type="button" className={`af-cta${copied ? ' done' : ''}`} onClick={copy} disabled={!d.referralLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </section>

      <section className="af-stats" aria-label="Your numbers">
        <Stat ic={MousePointerClick} k="Clicks" v={Number(d.clicks) || 0} hint="visits through your link" />
        <Stat ic={UserCheck} k="Conversions" v={Number(d.conversions) || 0} hint="referrals who paid" />
        <Stat ic={Wallet} k="Earned" v={usd(d.earnedUsd)} hint="commission credited" />
        <Stat ic={Clock} k="Pending" v={usd(d.pendingUsd)} hint={d.minPayoutUsd != null ? `paid out at ${usd(d.minPayoutUsd)}` : 'awaiting payout'} />
        <Stat ic={BadgeCheck} k="Paid" v={usd(d.paidUsd)} hint="sent to your Stripe account" />
      </section>

      <section className="af-two">
        <div className="af-card">
          <div className="af-card-k"><CreditCard size={14} /> Payouts</div>
          {connectNote ? <div className={`af-note${d.stripeOnboarded ? '' : ' warn'}`} style={{ marginTop: 10 }}>{d.stripeOnboarded ? <Check size={14} /> : <AlertTriangle size={14} />} {connectNote}</div> : null}
          {d.stripeOnboarded ? (
            <>
              <div className="af-payout-state"><span className="af-chip ok"><BadgeCheck size={13} /> Payouts active (Stripe)</span></div>
              <p className="af-card-d">
                Your Stripe account is connected. The WorkCoPilot team runs payouts{d.minPayoutUsd != null ? ` once your pending balance reaches ${usd(d.minPayoutUsd)}` : ''}; each payout appears in the Paid total and in your Stripe dashboard.
                {payoutsEnabled === false ? ' Stripe is still reviewing your account details, so a payout may be held until that review finishes.' : ''}
              </p>
            </>
          ) : (
            <>
              <h3 className="af-h3">{d.stripeConnected ? 'Finish setting up payouts' : 'Set up payouts'}</h3>
              <p className="af-card-d">
                {d.stripeConnected
                  ? 'You started Stripe setup but it is not finished yet. Pick up where you left off so your earnings can be paid out.'
                  : 'Connect a Stripe account to receive your commission. Stripe handles identity and bank details; we never see them.'}
              </p>
              {onboardErr ? <div className="af-err" role="alert"><AlertTriangle size={14} /> {onboardErr}</div> : null}
              {refreshErr ? <div className="af-err" role="alert"><AlertTriangle size={14} /> {refreshErr}</div> : null}
              <div className="af-btnrow">
                <button type="button" className="af-cta" onClick={startOnboard} disabled={onboardBusy}>
                  {onboardBusy ? <Loader2 size={16} className="af-spin" /> : <CreditCard size={16} />} {d.stripeConnected ? 'Resume Stripe setup' : 'Set up with Stripe'}
                </button>
                {d.stripeConnected ? (
                  <button type="button" className="af-cta alt" onClick={recheck} disabled={refreshBusy}>
                    {refreshBusy ? <Loader2 size={15} className="af-spin" /> : null} I already finished
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
        <div className="af-card af-ratecard">
          <div className="af-card-k"><Sparkles size={14} /> Your rate</div>
          <div className="af-rate"><b>{Number(d.ratePct) || 0}%</b><span>of each referral&rsquo;s first payment</span></div>
          <ul className="af-rules compact">
            <li><Check size={14} /> <span>Credited when the referred person&rsquo;s first payment clears.</span></li>
            <li><Check size={14} /> <span>Renewals and later purchases do not earn commission.</span></li>
            <li><Check size={14} /> <span>Voided if the payment is refunded or reversed.</span></li>
          </ul>
        </div>
      </section>

      <section className="af-ledger">
        <div className="af-ledger-head">
          <h2 className="af-h2">Referrals</h2>
          <span className="af-ledger-count">{rows.length} {rows.length === 1 ? 'referral' : 'referrals'}</span>
        </div>
        {rows.length === 0 ? (
          <div className="af-card af-empty">
            <Share2 size={22} />
            <b>No referrals yet.</b>
            <p>Share your link above. When someone signs up through it and makes their first payment, the referral appears here with your commission.</p>
          </div>
        ) : (
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Referred user</th>
                  <th>Their first payment</th>
                  <th>Rate</th>
                  <th>Your commission</th>
                  <th>Status</th>
                  <th>Date</th>
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
                    <td className="af-mono af-faint" title={r.paidAt ? `Paid ${fmtDate(r.paidAt)}` : undefined}>{fmtDate(r.createdAt)}{r.status === 'paid' && r.paidAt ? <span className="af-paidon"> &middot; paid {fmtDate(r.paidAt)}</span> : null}</td>
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
  const k = String(s || '').toLowerCase()
  if (k === 'paid') return <span className="af-chip ok"><BadgeCheck size={12} /> Paid</span>
  if (k === 'void') return <span className="af-chip muted">Void</span>
  return <span className="af-chip pend"><Clock size={12} /> Earned</span>
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

/* ---------- landing */
.af-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:44px;align-items:center}
.af-hero>*{min-width:0}
.af-hero-cta{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:26px}
.af-hero-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:30px;max-width:560px}
.af-fact{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 14px 12px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 14px 30px -24px rgba(17,23,38,.2)}
.af-fact b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:24px;letter-spacing:-.02em;background:linear-gradient(120deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.05}
.af-fact span{display:block;margin-top:5px;color:var(--mut);font-size:12.5px;line-height:1.4}
/* perk card (hero right): you earn + they get */
.af-perk{position:relative;padding:24px 26px 18px;margin:22px 0 24px;border:2px solid transparent;border-radius:22px;overflow:hidden;
  background:linear-gradient(180deg,rgba(255,176,46,.10),rgba(255,61,141,.06) 50%,#fff 95%) padding-box,linear-gradient(120deg,#ffb02e,#f26a43 30%,#ff3d8d 62%,#7c3aed) border-box;
  box-shadow:0 24px 56px -28px rgba(124,58,237,.45),0 18px 40px -26px rgba(242,106,67,.45)}
.af-perk:after{content:"";position:absolute;width:260px;height:260px;right:-120px;top:-130px;border-radius:50%;background:radial-gradient(circle,rgba(255,61,141,.18),transparent 68%);pointer-events:none}
.af-perk-burst{position:absolute;right:14px;top:10px;width:76px;height:76px;pointer-events:none;z-index:1}
.af-perk-burst .tw{animation:af-twinkle 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.af-perk-burst .t2{animation-delay:-.8s}.af-perk-burst .t3{animation-delay:-1.6s}
@keyframes af-twinkle{0%,100%{opacity:.35;transform:scale(.7) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(18deg)}}
.af-perk-row{display:flex;gap:14px;align-items:flex-start;position:relative;z-index:1}
.af-perk-ic{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:50px;height:50px;border-radius:16px;color:#fff;background:linear-gradient(135deg,#ffb02e,#f26a43 60%,#ff3d8d);box-shadow:0 12px 26px -12px rgba(255,61,141,.8)}
.af-perk-row.them .af-perk-ic{background:linear-gradient(135deg,#ff3d8d,#d63aff 55%,#7c3aed);box-shadow:0 12px 26px -12px rgba(124,58,237,.8)}
.af-perk-k{display:block;font-size:11.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#c9472a}
.af-perk-row.them .af-perk-k{color:#7c3aed}
.af-perk-v{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:clamp(30px,3.4vw,40px);letter-spacing:-.03em;line-height:1.02;margin-top:2px;background:linear-gradient(120deg,#ffb02e,#f26a43 45%,#ff3d8d);-webkit-background-clip:text;background-clip:text;color:transparent}
.af-perk-row.them .af-perk-v{background:linear-gradient(120deg,#ff3d8d,#d63aff 50%,#7c3aed);-webkit-background-clip:text;background-clip:text}
.af-perk-row p{color:var(--mut);font-size:14px;line-height:1.5;margin-top:4px}
.af-perk-plus{display:flex;align-items:center;gap:12px;margin:14px 0;color:var(--faint)}
.af-perk-plus:before,.af-perk-plus:after{content:"";flex:1;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(242,106,67,.35),rgba(124,58,237,.35))}
.af-perk-plus span{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;color:#fff;background:linear-gradient(135deg,#f26a43,#d63aff);font-weight:800;font-size:16px;line-height:1;box-shadow:0 8px 18px -8px rgba(214,58,255,.8)}
.af-perk-foot{display:flex;align-items:center;gap:7px;margin-top:18px;padding-top:14px;border-top:1px solid var(--line);color:var(--mut);font-size:12.5px;position:relative;z-index:1}
.af-perk-foot svg{color:#d63aff;flex-shrink:0}

/* how-it-works flow: five nodes on an orange track */
.af-flow-sec{margin-top:72px;padding:46px 0 10px;border-top:1px solid var(--line)}
.af-flow-head{text-align:center;max-width:60ch;margin:0 auto 36px}
.af-flow-head .af-eyebrow{display:inline-flex}
.af-flow{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,1fr);gap:18px;position:relative;counter-reset:fl}
/* the track: a flowing sunset-to-violet ribbon behind the nodes */
.af-flow:before{content:"";position:absolute;left:10%;right:10%;top:33px;height:5px;border-radius:5px;background:linear-gradient(90deg,#ffb02e,#f26a43,#ff3d8d,#d63aff,#7c3aed,#ffb02e);background-size:200% 100%;animation:af-track 7s linear infinite;opacity:.8;box-shadow:0 6px 18px -8px rgba(214,58,255,.5)}
@keyframes af-track{to{background-position:200% 0}}
@keyframes af-track-v{to{background-position:0 200%}}
.af-flow-step{--c1:#f26a43;--c2:#ff9a4d;position:relative;text-align:center;padding:0 6px;animation:af-rise .6s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i) * 90ms)}
@keyframes af-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.af-flow-node{position:relative;display:inline-flex;margin-bottom:16px}
.af-flow-ic{display:inline-flex;align-items:center;justify-content:center;width:70px;height:70px;border-radius:22px;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 0 0 5px #fff,0 0 0 6.5px var(--c1),0 18px 36px -14px var(--c2);transition:transform .25s cubic-bezier(.2,.8,.2,1)}
.af-flow-step:hover .af-flow-ic{transform:translateY(-5px) rotate(-5deg) scale(1.05)}
.af-flow-n{position:absolute;right:-7px;top:-7px;width:25px;height:25px;border-radius:50%;background:#fff;border:1.5px solid var(--c1);color:var(--c2);font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:12px;display:grid;place-items:center;box-shadow:0 4px 10px -4px rgba(17,23,38,.3)}
.af-flow-arrow{position:absolute;top:23px;right:-19px;width:24px;height:24px;border-radius:50%;background:#fff;border:1.5px solid var(--c2);color:var(--c2);display:grid;place-items:center;z-index:1;animation:af-nudge 1.6s ease-in-out infinite;animation-delay:calc(var(--i) * 200ms)}
@keyframes af-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
.af-flow-step b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:17px;letter-spacing:-.01em;background:linear-gradient(120deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.af-flow-step p{color:var(--mut);font-size:13.5px;line-height:1.5;margin-top:5px}
.af-apply{margin-top:56px;padding-top:50px;border-top:1px solid var(--line)}
.af-apply-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:40px;align-items:start}
.af-apply-grid>*{min-width:0}
.af-rules{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.af-rules li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.5;color:var(--mut)}
.af-rules li svg{flex-shrink:0;margin-top:4px;color:var(--acc)}
.af-rules li b{color:var(--tx)}
.af-rules.compact{gap:9px;margin-top:14px}
.af-rules.compact li{font-size:13.5px}
/* the application: gradient shell + a colorful header strip over a clean white form */
.af-formwrap{border-radius:24px;padding:2px;background:linear-gradient(120deg,#ffb02e,#f26a43 30%,#ff3d8d 62%,#7c3aed);background-size:200% 100%;animation:af-shift 9s ease-in-out infinite alternate;box-shadow:0 30px 70px -34px rgba(124,58,237,.5),0 20px 50px -30px rgba(242,106,67,.45)}
.af-formhead{display:flex;align-items:center;gap:12px;padding:16px 22px 14px;color:#fff}
.af-formhead-ic{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.af-formhead b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:17.5px;letter-spacing:-.01em;text-shadow:0 1px 2px rgba(0,0,0,.12)}
.af-formhead span{display:block;font-size:13px;line-height:1.4;opacity:.95}
.af-form{padding:24px 26px;background:#fff;border-radius:0 0 22px 22px}
.af-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.af-field{display:flex;flex-direction:column;margin-bottom:14px}
.af-field label{font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
.af-field .opt{color:var(--faint);font-weight:400}
.af-field input,.af-field textarea{border:1px solid var(--line);border-radius:11px;padding:11px 13px;font:inherit;font-size:14.5px;color:var(--tx);background:#fcfdfe;outline:none;resize:vertical;width:100%}
.af-field input:focus,.af-field textarea:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-soft)}
.af-form-sec{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--acc-deep);margin:4px 0 12px;padding-top:14px;border-top:1px solid var(--line)}
.af-form-sec:first-child,.af-note+.af-form-sec{border-top:none;padding-top:0}
.af-form-sec .opt{text-transform:none;letter-spacing:0;font-weight:500;color:var(--faint);font-size:12.5px}
.af-form-sec-ic{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:var(--acc-soft);color:var(--acc-deep)}
/* an input with a leading glyph (phone icon or an @) */
.af-prefix{position:relative;display:flex;align-items:center}
.af-prefix>svg{position:absolute;left:12px;color:var(--faint);pointer-events:none}
.af-prefix>input{padding-left:36px}
.af-prefix.at>input{padding-left:30px}
.af-at{position:absolute;left:12px;color:var(--faint);font-weight:600;font-size:14px;pointer-events:none}
.af-prefix:focus-within>svg,.af-prefix:focus-within .af-at{color:var(--acc)}
/* social handles grid with text monograms (no brand marks in lucide) */
.af-socials{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px;margin-bottom:6px}
.af-social{display:flex;flex-direction:column}
.af-social label{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--tx);margin-bottom:6px}
.af-social input{border:1px solid var(--line);border-radius:11px;padding:10px 12px;font:inherit;font-size:14px;color:var(--tx);background:#fcfdfe;outline:none;width:100%}
.af-social input:focus{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-soft)}
.af-social-mark{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.02em;color:#fff;background:#3f4a5c;line-height:1}
.af-social-mark.m-tiktok{background:#111318}
.af-social-mark.m-instagram{background:linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)}
.af-social-mark.m-youtube{background:#e02424}
.af-social-mark.m-twitter{background:#0c1222}
.af-social-mark.m-facebook{background:#1877f2}
.af-social-mark.m-linkedin{background:#0a66c2;font-weight:700;font-size:12px}
.af-social-mark.m-other{background:var(--acc);font-size:14px}
.af-social:focus-within label{color:var(--acc-deep)}
/* thank-you: what happens next */
.af-ok-steps{list-style:none;margin:0 auto 20px;padding:0;display:flex;flex-direction:column;gap:9px;max-width:420px;text-align:left}
.af-ok-steps li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--mut);line-height:1.45}
.af-ok-steps li b{color:var(--tx)}
.af-ok-dot{display:inline-grid;place-items:center;flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--acc-soft);border:1px solid var(--acc-line);color:var(--acc-deep)}
.af-ok,.af-closed{text-align:center;padding:36px 28px}
.af-ok-ic,.af-closed-ic{width:58px;height:58px;border-radius:50%;background:var(--acc-soft);border:1px solid var(--acc-line);color:var(--acc-deep);display:grid;place-items:center;margin:0 auto 14px}
.af-closed-ic{background:#f1f4f8;border-color:var(--line);color:var(--mut)}
.af-ok h3,.af-closed h3{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:22px;margin:0 0 8px}
.af-ok p,.af-closed p{color:var(--mut);font-size:15px;line-height:1.55;max-width:44ch;margin:0 auto 18px}
.af-closed a{color:var(--acc-deep);text-decoration:underline;text-underline-offset:3px}

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

/* ============================================================
   LANDING ONLY - the vibrant layer. Scoped under .af-land so the
   signed-in dashboard keeps its calm, orange-only treatment.
   Light page; the energy comes from gradients, glow and motion.
   ============================================================ */
.af-land{--sun:#ffb02e;--or:#f26a43;--coral:#ff6b6b;--pink:#ff3d8d;--mag:#d63aff;--vio:#7c3aed;--sky:#38bdf8;
  --grad:linear-gradient(120deg,var(--sun),var(--or) 28%,var(--pink) 60%,var(--vio));
  --grad-soft:linear-gradient(120deg,rgba(255,176,46,.16),rgba(242,106,67,.14) 30%,rgba(255,61,141,.12) 62%,rgba(124,58,237,.16));
  position:relative}
.af-land>*:not(.af-aurora){position:relative;z-index:1}
@keyframes af-shift{from{background-position:0% 50%}to{background-position:100% 50%}}
/* drifting aurora blobs behind everything on the landing */
.af-aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.af-aurora span{position:absolute;border-radius:50%;filter:blur(72px);opacity:.5;animation:af-drift 18s ease-in-out infinite alternate}
.af-aurora .b1{width:46vw;height:46vw;left:-14vw;top:-14vw;background:radial-gradient(circle,rgba(255,176,46,.55),transparent 65%)}
.af-aurora .b2{width:40vw;height:40vw;right:-12vw;top:-6vw;background:radial-gradient(circle,rgba(255,61,141,.42),transparent 65%);animation-delay:-6s}
.af-aurora .b3{width:38vw;height:38vw;left:28vw;top:46vh;background:radial-gradient(circle,rgba(124,58,237,.30),transparent 65%);animation-delay:-11s}
.af-aurora .b4{width:30vw;height:30vw;right:6vw;top:62vh;background:radial-gradient(circle,rgba(56,189,248,.26),transparent 65%);animation-delay:-3s}
@keyframes af-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(4vw,3vw) scale(1.08)}}

/* hero band: gradient border, tinted interior, sparks */
.af-land .af-hero{position:relative;isolation:isolate;padding:38px 36px 34px;border-radius:30px;border:2px solid transparent;
  background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box;
  box-shadow:0 34px 80px -44px rgba(124,58,237,.42),0 24px 56px -34px rgba(242,106,67,.5)}
.af-land .af-hero:before{content:"";position:absolute;inset:0;border-radius:28px;z-index:0;pointer-events:none;
  background:var(--grad-soft),radial-gradient(520px 260px at 0% 0%,rgba(255,176,46,.26),transparent 60%),radial-gradient(620px 320px at 100% 110%,rgba(124,58,237,.22),transparent 60%)}
.af-land .af-hero>*{position:relative;z-index:1}
.af-land .af-eyebrow{padding:6px 12px 6px 9px;border-radius:999px;background:#fff;border:1px solid rgba(242,106,67,.3);box-shadow:0 8px 22px -12px rgba(255,61,141,.7);color:#c9472a}
.af-land .af-eyebrow svg{color:var(--pink)}
.af-land .af-h1{font-size:clamp(38px,5.4vw,66px);background:var(--grad);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:af-shift 7s ease-in-out infinite alternate}
.af-land .af-h1-b{display:block;background:none;-webkit-text-fill-color:var(--ink-brand);color:var(--ink-brand);font-size:.74em;letter-spacing:-.025em;margin-top:6px}
.af-land .af-lead{color:var(--mut)}
.af-land .af-lead b{color:var(--tx)}
.af-land .af-h2{color:var(--ink-brand)}
.af-land .af-cta{background:var(--grad);background-size:200% 100%;color:#fff;box-shadow:0 14px 34px -12px rgba(255,61,141,.6);transition:transform .15s,box-shadow .15s,background-position .5s}
.af-land .af-cta:hover:not(:disabled){background-position:100% 50%}
.af-land .af-cta.alt{background:#fff;color:var(--tx);border:1px solid var(--line);box-shadow:none}
.af-land .af-cta.alt:hover:not(:disabled){border-color:var(--pink);color:#b8266b}
.af-land .af-cta.done{background:#fff;color:#c9472a;border:1px solid rgba(242,106,67,.35)}
.af-cta-hero{position:relative;overflow:hidden;padding:16px 24px;font-size:16.5px;border-radius:14px;animation:af-glow 2.6s ease-in-out infinite}
.af-cta-hero:after{content:"";position:absolute;top:0;left:-70%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);transform:skewX(-20deg);animation:af-shine 3.4s ease-in-out infinite}
@keyframes af-glow{0%,100%{box-shadow:0 14px 34px -12px rgba(255,61,141,.55),0 0 0 0 rgba(242,106,67,0)}50%{box-shadow:0 18px 44px -12px rgba(124,58,237,.6),0 0 0 9px rgba(242,106,67,.12)}}
@keyframes af-shine{0%{left:-70%}60%,100%{left:140%}}
.af-land .af-fact{position:relative;overflow:hidden;--c1:#f26a43;--c2:#ff9a4d}
.af-land .af-fact:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--c1),var(--c2))}
.af-land .af-fact b{background:linear-gradient(120deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
/* sparks */
.af-spark{position:absolute;z-index:2;pointer-events:none;animation:af-float 5s ease-in-out infinite}
.af-spark svg{display:block;filter:drop-shadow(0 4px 10px rgba(17,23,38,.14))}
.af-spark.s1{left:3%;top:9%;animation-delay:-1s}.af-spark.s2{left:44%;top:5%;animation-delay:-2.3s}.af-spark.s3{left:58%;top:12%;animation-delay:-3.4s;transform:scale(.8)}
.af-spark.s4{right:4%;top:7%;animation-delay:-.6s}.af-spark.s5{right:3%;top:48%;animation-delay:-4.1s}.af-spark.s6{right:9%;bottom:8%;animation-delay:-1.7s}
.af-spark.s7{left:47%;bottom:10%;animation-delay:-2.9s}.af-spark.s8{left:2%;bottom:14%;animation-delay:-3.9s}.af-spark.s9{left:36%;top:46%;animation-delay:-.3s;transform:scale(.7)}
@keyframes af-float{0%,100%{translate:0 0;rotate:0deg}50%{translate:0 -12px;rotate:16deg}}
/* hero visual: badge + chart */
.af-vis{display:flex;flex-direction:column;gap:14px;align-self:center}
.af-badge-wrap{position:relative;display:flex;justify-content:center;align-items:center;height:250px}
.af-badge-halo{position:absolute;width:240px;height:240px;border-radius:50%;background:conic-gradient(from 0deg,var(--sun),var(--or),var(--pink),var(--mag),var(--vio),var(--sky),var(--sun));filter:blur(26px);opacity:.5;animation:af-spin 14s linear infinite}
.af-badge-ring{position:absolute;width:212px;height:212px;border-radius:50%;background:conic-gradient(from 0deg,var(--sun),var(--or),var(--pink),var(--mag),var(--vio),var(--sun));animation:af-spin 9s linear infinite;box-shadow:0 20px 50px -22px rgba(124,58,237,.6)}
@keyframes af-spin{to{transform:rotate(360deg)}}
.af-badge{position:relative;width:200px;height:200px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18px;box-shadow:inset 0 0 0 1px rgba(242,106,67,.18),0 12px 30px -18px rgba(17,23,38,.35);animation:af-breathe 4s ease-in-out infinite}
@keyframes af-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
.af-badge-k{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#c9472a}
.af-badge-v{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:66px;letter-spacing:-.045em;line-height:1;margin:4px 0 6px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.af-badge-s{font-size:12px;color:var(--mut);line-height:1.3;max-width:150px}
.af-coin{position:absolute;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:#fff;font-weight:800;font-size:15px;box-shadow:0 12px 24px -10px rgba(17,23,38,.5),inset 0 0 0 2px rgba(255,255,255,.35);animation:af-float 4.5s ease-in-out infinite}
.af-coin.c1{left:10%;top:12%;background:linear-gradient(135deg,var(--sun),var(--or))}
.af-coin.c2{right:11%;top:20%;width:30px;height:30px;background:linear-gradient(135deg,var(--pink),var(--mag));animation-delay:-1.5s}
.af-coin.c3{left:16%;bottom:12%;width:28px;height:28px;background:linear-gradient(135deg,var(--mag),var(--vio));animation-delay:-3s}
.af-coin.c4{right:14%;bottom:7%;background:linear-gradient(135deg,var(--or),var(--pink));animation-delay:-.7s}
.af-chart{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 16px 12px;box-shadow:0 18px 42px -26px rgba(124,58,237,.4)}
.af-chart-head{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--mut);font-weight:600;margin-bottom:6px}
.af-chart-head span{display:inline-flex;gap:6px;align-items:center}
.af-chart-head span svg{color:var(--pink)}
.af-chart-head b{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.af-chart svg{display:block;width:100%;height:auto;overflow:visible}
.af-gridline{stroke:#eef1f6;stroke-width:1}
.af-area{animation:af-fade 1.2s ease-out .7s both}
.af-line{stroke-dasharray:540;stroke-dashoffset:540;animation:af-draw 1.9s cubic-bezier(.2,.7,.2,1) .3s forwards}
@keyframes af-draw{to{stroke-dashoffset:0}}
@keyframes af-fade{from{opacity:0}to{opacity:1}}
.af-dot{fill:#fff;stroke:var(--or);stroke-width:2.5;opacity:0;transform-box:fill-box;transform-origin:center;animation:af-pop .4s ease-out var(--d) forwards}
.af-dot.last{stroke:var(--mag);animation:af-pop .4s ease-out var(--d) forwards,af-pulse 2s ease-in-out calc(var(--d) + .4s) infinite}
@keyframes af-pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@keyframes af-pulse{0%,100%{stroke-width:2.5}50%{stroke-width:6}}
.af-chart-foot{font-size:11px;color:var(--faint);margin-top:6px}
/* booster strip */
.af-boost{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
.af-boost-card{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 18px 16px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 16px 36px -26px rgba(17,23,38,.25);transition:transform .2s,box-shadow .2s;animation:af-rise .6s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i) * 80ms + .25s)}
.af-boost-card:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--c1),var(--c2))}
.af-boost-card:after{content:"";position:absolute;width:160px;height:160px;right:-70px;bottom:-90px;border-radius:50%;background:radial-gradient(circle,var(--c2),transparent 70%);opacity:.16;pointer-events:none}
.af-boost-card:hover{transform:translateY(-4px);box-shadow:0 1px 2px rgba(17,23,38,.05),0 26px 50px -26px rgba(17,23,38,.35)}
.af-boost-ic{display:inline-grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 10px 22px -10px var(--c2);margin-bottom:12px}
.af-boost-card b{display:block;font-family:"Bricolage Grotesque",sans-serif;font-weight:800;font-size:16px;letter-spacing:-.01em;color:var(--ink-brand)}
.af-boost-card p{color:var(--mut);font-size:13.5px;line-height:1.5;margin-top:4px}
/* thank-you / closed cards get the same gradient shell */
.af-land .af-ok,.af-land .af-closed{border:2px solid transparent;background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box;box-shadow:0 30px 70px -34px rgba(124,58,237,.45)}
.af-land .af-ok-ic{background:var(--grad);border:none;color:#fff;box-shadow:0 14px 30px -12px rgba(255,61,141,.7)}
.af-land .af-ok-dot{background:#fff;border-color:rgba(255,61,141,.35);color:#b8266b}
.af-land .af-rules li svg{color:var(--pink)}
.af-land .af-form-sec-ic{background:linear-gradient(135deg,var(--or),var(--pink));color:#fff}
.af-land .af-social:focus-within label{color:#b8266b}
/* motion off: everything lands in its final state */
@media(prefers-reduced-motion:reduce){
  .af-land *,.af-land *:before,.af-land *:after{animation:none !important}
  .af-dot{opacity:1}.af-line{stroke-dashoffset:0}.af-area{opacity:1}
}

/* ---------- responsive */
@media(max-width:900px){
  .af-hero{grid-template-columns:1fr;gap:28px}
  .af-land .af-hero{padding:28px 24px 26px}
  .af-vis{max-width:420px;width:100%;margin:0 auto}
  .af-boost{grid-template-columns:1fr 1fr}
  .af-flow:before{background:linear-gradient(180deg,#ffb02e,#f26a43,#ff3d8d,#d63aff,#7c3aed,#ffb02e);background-size:100% 200%;animation:af-track-v 7s linear infinite}
  .af-apply-grid{grid-template-columns:1fr;gap:26px}
  /* flow becomes a vertical timeline: track on the left, nodes down the side */
  .af-flow-sec{margin-top:52px;padding-top:36px}
  .af-flow-head{text-align:left;margin-bottom:24px}
  .af-flow{grid-template-columns:1fr;gap:0}
  .af-flow:before{left:34px;right:auto;top:20px;bottom:20px;width:3px;height:auto;background:linear-gradient(180deg,var(--acc-line),var(--acc) 50%,var(--acc-line))}
  .af-flow-step{display:grid;grid-template-columns:70px 1fr;column-gap:18px;text-align:left;padding:0 0 26px}
  .af-flow-step:last-child{padding-bottom:0}
  .af-flow-node{margin-bottom:0;grid-row:1/3}
  .af-flow-ic{width:60px;height:60px;border-radius:18px;margin-left:4px}
  .af-flow-arrow{display:none}
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
  .af-hero-cta{flex-direction:column;align-items:stretch}
  .af-hero-cta .af-cta{width:100%}
  .af-hero-facts{grid-template-columns:1fr 1fr 1fr;gap:8px}
  .af-fact{padding:12px 10px 10px}
  .af-fact b{font-size:19px}
  .af-fact span{font-size:11.5px}
  .af-grid2{grid-template-columns:1fr}
  .af-stats{grid-template-columns:1fr 1fr;gap:10px}
  .af-stat-v{font-size:24px}
  .af-linkrow{flex-direction:column}
  .af-linkrow .af-cta{width:100%}
  .af-apply{margin-top:48px;padding-top:36px}
  .af-form .af-cta{width:100%}
  .af-socials{grid-template-columns:1fr}
  .af-perk{padding:20px 18px 14px}
  .af-land .af-hero{padding:22px 16px 20px;border-radius:22px}
  .af-land .af-h1{font-size:clamp(32px,9vw,40px)}
  .af-spark{display:none}
  .af-badge-wrap{height:220px}
  .af-badge-halo{width:200px;height:200px}
  .af-badge-ring{width:184px;height:184px}
  .af-badge{width:172px;height:172px}
  .af-badge-v{font-size:54px}
  .af-boost{grid-template-columns:1fr;gap:10px}
  .af-cta-hero{padding:15px 18px;font-size:15.5px}
  .af-formhead{padding:14px 16px 12px}
  .af-form{padding:18px 16px}
  .af-flow-step{grid-template-columns:60px 1fr;column-gap:14px}
  .af-flow:before{left:30px}
  .af-flow-ic{width:52px;height:52px;border-radius:16px}
  .af-flow-n{width:22px;height:22px;font-size:11px}
}
`
