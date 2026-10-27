// HoursBadge - the HOURS hero of a plan card, as a corporate badge (owner,
// 2026-10-27: hours must be the hero, "like BADGEs", professional, not
// decorative; the earlier petal flower was rejected).
//
// A crisp seal: a white disc inside a thin brand ring. The ring carries a
// thin progress arc whose length is the plan's monthly hours as a share of the
// largest plan's hours (pricingModel.planHoursShare), so a bigger plan reads
// as more at a glance without any ornament. The big number is the centerpiece
// with a small "hours" label under it; one line below the seal says what the
// number is. Enterprise shows "Custom" with the full ring.
//
// Accessibility: the hours are REAL text (<b>60</b> hours / of expert guidance
// a month) read in DOM order; the SVG is decorative (aria-hidden). Pure
// CSS/SVG, no library. VISIBLE BY DEFAULT: the IntersectionObserver only ADDS
// the arc draw-in once the card scrolls into view, so a hidden tab, a
// prerender or a browser without IO never shows an empty hero. No motion
// under prefers-reduced-motion.
//
// Sizes: md (pricing page cards), sm (home teaser cards). Colors come from
// the host page through --hbg-a / --hbg-b (green -> blue), --hbg-ink,
// --hbg-mut, --hbg-track, --hbg-disc, set by the host page's CSS.
import { useEffect, useId, useRef, useState } from 'react'

const R = 54                       // ring radius in the 120x120 viewBox
const C = 2 * Math.PI * R          // ring circumference (arc lengths are a share of it)

// hours: display string (already formatted) | null while loading
// share: 0..1 | null  (null = no arc)
// custom: true for the Enterprise card (full ring, "Custom")
export default function HoursBadge({ hours, share, custom = false, size = 'md', unit, sub, customLabel, customSub, loadingLabel }) {
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
  const frac = custom ? 1 : (share == null || loading ? 0 : Math.max(0.04, Math.min(1, share)))
  const len = C * frac
  return (
    <div ref={ref} className={`hbg hbg-${size}${seen ? ' hbg-in' : ''}${custom ? ' hbg-custom' : ''}${loading ? ' hbg-loading' : ''}`}>
      <div className="hbg-seal">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`${gid}-r`} gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="120" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--hbg-a)' }} />
              <stop offset="1" style={{ stopColor: 'var(--hbg-b)' }} />
            </linearGradient>
          </defs>
          <circle className="hbg-track" cx="60" cy="60" r={R} />
          {frac > 0 && (
            <circle className="hbg-arc" cx="60" cy="60" r={R} stroke={custom ? 'var(--hbg-b)' : `url(#${gid}-r)`}
              strokeDasharray={`${len.toFixed(2)} ${C.toFixed(2)}`} style={{ '--hbg-len': len.toFixed(2) }} />
          )}
          <circle className="hbg-disc" cx="60" cy="60" r="45" />
        </svg>
        <div className="hbg-num">
          {custom
            ? <b className="hbg-word">{customLabel}</b>
            : loading
              ? <span className="hbg-skel" role="status" aria-label={loadingLabel} />
              : <b>{hours}</b>}
          {!loading && <span>{unit}</span>}
        </div>
      </div>
      <div className="hbg-sub">{custom ? customSub : sub}</div>
    </div>
  )
}

// Appended to the host page's CSS string (the project keeps page CSS in JS).
// The host sets --hbg-a / --hbg-b / --hbg-ink / --hbg-mut / --hbg-track /
// --hbg-disc from its own tokens.
export const HOURS_BADGE_CSS = `
.hbg{--hbg-a:#0e9f6e;--hbg-b:#0a84c2;--hbg-ink:#161a2b;--hbg-mut:#5c6484;--hbg-track:#e3e7f0;--hbg-disc:#ffffff;--hbg-size:132px;
  position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;max-width:100%}
.hbg-sm{--hbg-size:112px}
.hbg-seal{position:relative;width:var(--hbg-size);height:var(--hbg-size);max-width:100%;flex-shrink:0}
.hbg-seal svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.hbg-track{fill:none;stroke:var(--hbg-track);stroke-width:5}
.hbg-arc{fill:none;stroke-width:5;stroke-linecap:round;transform:rotate(-90deg);transform-origin:60px 60px;transform-box:view-box}
.hbg-in .hbg-arc{animation:hbg-draw .9s cubic-bezier(.2,.7,.2,1) both}
@keyframes hbg-draw{from{stroke-dashoffset:var(--hbg-len)}to{stroke-dashoffset:0}}
.hbg-disc{fill:var(--hbg-disc);stroke:var(--hbg-track);stroke-width:1;filter:drop-shadow(0 2px 6px rgba(10,13,18,.08))}
.hbg-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1;pointer-events:none;padding:0 18%}
.hbg-num b{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:700;font-size:calc(var(--hbg-size)*.3);letter-spacing:-.035em;color:var(--hbg-ink)}
.hbg-num b.hbg-word{font-size:calc(var(--hbg-size)*.17);letter-spacing:-.01em;color:var(--hbg-b)}
.hbg-num>span{font-size:calc(var(--hbg-size)*.082);font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--hbg-a);margin-top:6px;white-space:nowrap}
.hbg-custom .hbg-num>span{color:var(--hbg-b)}
.hbg-skel{display:block;width:38%;height:12%;border-radius:6px;background:linear-gradient(90deg,var(--hbg-track),var(--hbg-disc),var(--hbg-track));background-size:200% 100%;animation:hbg-shimmer 1.2s linear infinite}
@keyframes hbg-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.hbg-sub{font-size:12.5px;line-height:1.35;color:var(--hbg-mut);text-align:center;max-width:100%;text-wrap:balance}
.hbg-sm .hbg-sub{font-size:12px}
@media(prefers-reduced-motion:reduce){.hbg-in .hbg-arc,.hbg-skel{animation:none}}
`
