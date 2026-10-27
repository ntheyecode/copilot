import React from 'react'
import { ArrowRight } from 'lucide-react'
import { useT } from '../i18n/index.jsx'

// FieldVignettes - a strip of real-screen photographs, one per field (finance
// ops, logistics, healthcare admin, retail, HR, engineering, support), each
// captioned and deep-linking to the matching scenario in the use-cases
// showcase (#watch-<id>). The pictures are generated brand assets under
// public/ (wow-<id>.webp, 1600x900, plus a -sm 800x450 variant for phones),
// always lazy-loaded below the fold with width/height set so nothing shifts.
// Captions and alt text come from the catalog (fieldsPage.vignettes).
//
// `ids` picks the subset; `cols` the grid density (4 on the home strip, 7 on
// the fields page); `to` the page the captions link to.

const STYLE_ID = 'fieldvignettes-css'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style')
    s.id = STYLE_ID; s.textContent = CSS
    document.head.appendChild(s)
  }
}

export const VIGNETTE_IDS = ['finance', 'logistics', 'healthcare', 'retail', 'hr', 'engineering', 'support']

export default function FieldVignettes({ ids = VIGNETTE_IDS, to = '/workcopilot/use-cases', className = '' }) {
  ensureStyle()
  const t = useT()
  const all = t('fieldsPage.vignettes') || {}
  const list = ids.filter((id) => all[id])
  if (!list.length) return null
  return (
    <ul className={`fv ${className}`} aria-label={t('fieldsPage.vignettesAria')}>
      {list.map((id) => {
        const v = all[id]
        return (
          <li key={id} className="fv-item">
            <a className="fv-link" href={`${to}#watch-${id}`}>
              <figure className="fv-fig">
                <img
                  src={`/wow-${id}.webp`} srcSet={`/wow-${id}-sm.webp 800w, /wow-${id}.webp 1600w`} sizes="(max-width: 560px) 92vw, (max-width: 900px) 46vw, 300px"
                  width="1600" height="900" loading="lazy" decoding="async" alt={v.alt}
                />
                <figcaption><b>{v.cap}</b><span>{v.job} <ArrowRight size={12} aria-hidden="true" className="fv-arrow" /></span></figcaption>
              </figure>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

const CSS = `
.fv{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;min-width:0}
.fv-item{min-width:0}
.fv-link{display:block;color:inherit;text-decoration:none;border-radius:16px;outline-offset:3px}
.fv-link:focus-visible{outline:2px solid #0a84c2}
.fv-fig{position:relative;margin:0;border-radius:16px;overflow:hidden;background:#0e1020;box-shadow:0 1px 2px rgba(10,13,18,.05),0 20px 44px -28px rgba(10,13,18,.35);isolation:isolate}
.fv-fig img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.fv-link:hover .fv-fig img{transform:scale(1.04)}
.fv-fig figcaption{position:absolute;inset:auto 0 0 0;padding:34px 13px 11px;color:#fff;background:linear-gradient(180deg,rgba(8,10,20,0),rgba(8,10,20,.78));display:flex;flex-direction:column;gap:2px}
.fv-fig figcaption b{font-family:"Bricolage Grotesque","Figtree",sans-serif;font-weight:700;font-size:15px;letter-spacing:-.01em;line-height:1.2}
.fv-fig figcaption span{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:rgba(255,255,255,.82);line-height:1.3}
.fv-arrow{flex:none;transition:transform .3s}
.fv-link:hover .fv-arrow{transform:translateX(3px)}
[dir="rtl"] .fv-arrow{transform:scaleX(-1)}
[dir="rtl"] .fv-link:hover .fv-arrow{transform:scaleX(-1) translateX(3px)}
@media(max-width:560px){.fv{grid-template-columns:1fr 1fr;gap:10px}.fv-fig figcaption{padding:26px 10px 9px}.fv-fig figcaption b{font-size:13.5px}.fv-fig figcaption span{font-size:11px}}
@media(max-width:380px){.fv{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.fv-fig img,.fv-arrow{transition:none}.fv-link:hover .fv-fig img{transform:none}}
`
