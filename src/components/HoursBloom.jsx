// HoursBloom - the HOURS hero of a plan card (owner, 2026-10-27: "show hours
// in a flower or something, WOW factor, so a user can see and feel the plan
// gives what he needs, than burying it").
//
// A bloom of 24 petals around the plan's monthly hours. The number of LIT
// petals is the plan's hours as a share of the largest plan's hours
// (pricingModel.planHoursShare), so Lite is a few petals, Premium a full
// flower, and the eye ranks the plans before reading a word. Every value comes
// in as a prop from the pricing view model; nothing here knows a plan.
//
// Accessibility: the hours are REAL text (<b>60</b> hours / of expert guidance
// a month) read in DOM order; the SVG is decorative (aria-hidden). Pure
// CSS/SVG, no library. The hero is VISIBLE BY DEFAULT (number, petals): the
// IntersectionObserver only ADDS the bloom-in animation (staggered petal
// scale, number pop) once the card scrolls into view, so a hidden tab, a
// prerender or a browser without IO never shows an empty hero. No motion under
// prefers-reduced-motion.
//
// Sizes: md (pricing page cards), sm (home teaser cards). Colors are the
// page's own accents through --hb-a / --hb-b (green -> blue), ink/muted
// through --hb-ink / --hb-mut, set by the host page's CSS.
import { useEffect, useId, useRef, useState } from 'react'

export const BLOOM_PETALS = 24
// One petal, pointing up from the disc edge (r=22) to the rim (r=52) around
// the 120x120 viewBox center, as control points. Every petal is these points
// ROTATED IN JS (not an SVG rotate() group) so all petals share one user
// space and ONE green-to-blue gradient sweeps across the whole flower instead
// of restarting inside every petal.
const PETAL_PTS = [[60, 38], [65.5, 31], [65.5, 15], [60, 8], [54.5, 15], [54.5, 31], [60, 38]]
const petalPath = (deg) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a)
  const r = ([x, y]) => `${(60 + (x - 60) * c - (y - 60) * si).toFixed(2)},${(60 + (x - 60) * si + (y - 60) * c).toFixed(2)}`
  const [p0, p1, p2, p3, p4, p5, p6] = PETAL_PTS.map(r)
  return `M${p0} C${p1} ${p2} ${p3} C${p4} ${p5} ${p6} Z`
}
const PETAL_D = Array.from({ length: BLOOM_PETALS }, (_, i) => petalPath((i * 360) / BLOOM_PETALS))

// hours: display string (already formatted) | null while loading
// share: 0..1 | null  (null = nothing lit)
// custom: true for the Enterprise card (full bloom, cool tint, "Custom")
export default function HoursBloom({ hours, share, custom = false, size = 'md', unit, sub, customLabel, customSub, loadingLabel }) {
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  const loading = !custom && hours == null
  const lit = custom ? BLOOM_PETALS : (share == null || loading ? 0 : Math.max(1, Math.round(BLOOM_PETALS * share)))
  const petals = Array.from({ length: BLOOM_PETALS }, (_, i) => i)
  return (
    <div ref={ref} className={`hb hb-${size}${seen ? ' hb-in' : ''}${custom ? ' hb-custom' : ''}${loading ? ' hb-loading' : ''}`}>
      <div className="hb-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`${gid}-p`} gradientUnits="userSpaceOnUse" x1="8" y1="112" x2="112" y2="8">
              <stop offset="0" style={{ stopColor: "var(--hb-a)" }} />
              <stop offset="1" style={{ stopColor: "var(--hb-b)" }} />
            </linearGradient>
            <radialGradient id={`${gid}-d`} cx="50%" cy="42%" r="60%">
              <stop offset="0" style={{ stopColor: "var(--hb-disc)" }} />
              <stop offset="1" style={{ stopColor: "var(--hb-disc2)" }} />
            </radialGradient>
          </defs>
          <circle className="hb-halo" cx="60" cy="60" r="56" />
          {petals.map((i) => (
            <path key={i} d={PETAL_D[i]} className={`hb-p${i < lit ? ' on' : ''}`} fill={i < lit ? `url(#${gid}-p)` : 'currentColor'} style={{ '--i': i }} />
          ))}
          <circle className="hb-disc" cx="60" cy="60" r="31" fill={`url(#${gid}-d)`} />
        </svg>
        <div className="hb-num">
          {custom
            ? <b className="hb-word">{customLabel}</b>
            : loading
              ? <span className="hb-skel" role="status" aria-label={loadingLabel} />
              : <b>{hours}</b>}
          {!loading && <span>{unit}</span>}
        </div>
      </div>
      <div className="hb-sub">{custom ? customSub : sub}</div>
    </div>
  )
}

// Appended to the host page's CSS string (the project keeps page CSS in JS).
// The host sets --hb-a / --hb-b / --hb-ink / --hb-mut from its own tokens.
export const HOURS_BLOOM_CSS = `
.hb{--hb-a:#0e9f6e;--hb-b:#0a84c2;--hb-ink:#161a2b;--hb-mut:#5c6484;--hb-dim:#dfe3ee;--hb-disc:#ffffff;--hb-disc2:#eef7f3;--hb-size:148px;
  position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;max-width:100%}
.hb-sm{--hb-size:122px}
.hb-ring{position:relative;width:var(--hb-size);height:var(--hb-size);max-width:100%;flex-shrink:0}
.hb-ring svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;color:var(--hb-dim);transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.hb-halo{fill:var(--hb-a);opacity:.07}
.hb-custom .hb-halo{fill:var(--hb-b)}
.hb-p{opacity:.55;transform-origin:60px 60px;transform-box:view-box}
.hb-p.on{opacity:1}
.hb-in .hb-p{animation:hb-petal .55s cubic-bezier(.2,.9,.3,1.25) both;animation-delay:calc(var(--i)*18ms)}
@keyframes hb-petal{from{transform:scale(.001)}to{transform:none}}
.hb-disc{filter:drop-shadow(0 4px 10px rgba(10,13,18,.12))}
.hb-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1;pointer-events:none;padding:0 22%}
.hb-num b{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:700;font-size:calc(var(--hb-size)*.27);letter-spacing:-.035em;color:var(--hb-ink)}
.hb-num b.hb-word{font-size:calc(var(--hb-size)*.14);letter-spacing:-.01em;background:linear-gradient(120deg,var(--hb-a),var(--hb-b));-webkit-background-clip:text;background-clip:text;color:transparent}
.hb-in .hb-num b{animation:hb-pop .5s cubic-bezier(.2,.9,.3,1.2) .28s both}
@keyframes hb-pop{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
.hb-num>span{font-size:calc(var(--hb-size)*.072);font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--hb-a);margin-top:5px;white-space:nowrap}
.hb-custom .hb-num>span{color:var(--hb-b)}
.hb-skel{display:block;width:34%;height:12%;border-radius:6px;background:linear-gradient(90deg,var(--hb-dim),var(--hb-disc2),var(--hb-dim));background-size:200% 100%;animation:hb-shimmer 1.2s linear infinite}
@keyframes hb-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.hb-sub{font-size:12.5px;line-height:1.35;color:var(--hb-mut);text-align:center;max-width:100%;text-wrap:balance}
.hb-sm .hb-sub{font-size:12px}
@media(prefers-reduced-motion:reduce){.hb-in .hb-p,.hb-in .hb-num b,.hb-skel{animation:none}.hb-ring svg{transition:none}}
`
