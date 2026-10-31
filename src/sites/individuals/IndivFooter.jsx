// The LinkNotes site footer: the brand line, three link groups (explore,
// legal, help). The legal pages are the SHARED ones (owner decision: kept as
// they are), so their labels come from the shared footer.* keys and the links
// point at the existing routes; nothing company-only (Enterprise, DPA) is
// linked here. Support is reached through its label (the mailto carries the
// address), so no other product name shows anywhere in this footer. Rendered
// by SiteFooter on every public page when the edition has `individual_site`.
import { ArrowRight, Mail } from 'lucide-react'
import LinkNotesLogo from '../../components/brand/LinkNotesLogo.jsx'
import { SUPPORT_CONTACT } from '../../components/LegalPage.jsx'
import { useT } from '../../i18n/index.jsx'
import { openPreferences } from '../../consent.js'
import { INDIV_LINKS, SIGN_IN, START, CONTACT } from './links.js'

const LEGAL = [
  ['footer.privacy', '/workcopilot/privacy'], ['footer.terms', '/workcopilot/terms'], ['footer.refund', '/workcopilot/refund'],
  ['footer.aup', '/workcopilot/acceptable-use'], ['footer.cookiePolicy', '/workcopilot/cookie-policy'], ['footer.subprocessors', '/workcopilot/subprocessors'],
  ['footer.disclaimer', '/workcopilot/disclaimer'], ['footer.accessibility', '/workcopilot/accessibility'],
]

export default function IndivFooter() {
  const t = useT()
  return (
    <footer className="lnf" aria-label={t('indiv.footer.aria')}>
      <style>{CSS}</style>
      <div className="lnf-in">
        <div className="lnf-brand">
          <a href="/" aria-label={t('indiv.nav.home')}><LinkNotesLogo size={30} idSuffix="lnf" product onDark /></a>
          <p>{t('indiv.footer.tag')}</p>
          <div className="lnf-ctas">
            <a className="lnf-btn" href={START}>{t('indiv.nav.start')} <ArrowRight size={14} aria-hidden="true" className="ln-arrow" /></a>
            <a className="lnf-btn alt" href={SIGN_IN}>{t('indiv.nav.signIn')}</a>
          </div>
        </div>
        <nav className="lnf-group" aria-label={t('indiv.footer.explore')}>
          <div className="lnf-k">{t('indiv.footer.explore')}</div>
          <ul>{INDIV_LINKS.map((l) => <li key={l.href}><a href={l.href}>{t('indiv.nav.' + l.key)}</a></li>)}</ul>
        </nav>
        <nav className="lnf-group" aria-label={t('indiv.footer.legal')}>
          <div className="lnf-k">{t('indiv.footer.legal')}</div>
          <ul>{LEGAL.map(([k, href]) => <li key={href}><a href={href}>{t(k)}</a></li>)}</ul>
        </nav>
        <div className="lnf-group" aria-label={t('indiv.footer.help')}>
          <div className="lnf-k">{t('indiv.footer.help')}</div>
          <ul>
            <li><a href={CONTACT}>{t('indiv.footer.contact')}</a></li>
            <li><a href={'mailto:' + SUPPORT_CONTACT}><Mail size={13} aria-hidden="true" /> {t('indiv.footer.support')}</a></li>
            <li><a href="/workcopilot/faq">{t('indiv.nav.faq')}</a></li>
          </ul>
          <p className="lnf-note">{t('indiv.footer.note')}</p>
        </div>
      </div>
      <div className="lnf-bottom-wrap">
        <div className="lnf-bottom">
          <span>&copy; {new Date().getFullYear()} LinkNotes. {t('indiv.footer.made')}</span>
          <button type="button" className="lnf-cookie" onClick={openPreferences}>{t('indiv.footer.cookiePrefs')}</button>
        </div>
      </div>
    </footer>
  )
}

// The one dark surface of the site: navy, the brand and its line on the left,
// the link columns, then a lighter copyright strip across the bottom.
const CSS = `
.lnf{position:relative;margin-top:auto;background:var(--ln-dark,#14122b);color:#fff;font-family:var(--ln-body,"Figtree",system-ui,sans-serif);text-align:start}
.lnf *{box-sizing:border-box}
.lnf a{color:inherit;text-decoration:none}
.lnf-in{max-width:1180px;margin:0 auto;padding:72px 24px 40px;display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));gap:32px}
.lnf-brand{display:flex;flex-direction:column;gap:18px;align-items:flex-start;min-width:0}
.lnf-brand p{margin:0;font-size:15px;line-height:1.6;color:var(--ln-on-dark-2,#b9b6d9);max-width:40ch}
.lnf-ctas{display:flex;gap:8px;flex-wrap:wrap}
.lnf-btn{display:inline-flex;align-items:center;gap:6px;height:42px;padding:0 18px;border-radius:12px;font-size:14px;font-weight:700;background:var(--ln-lime,#c9f23a);color:var(--ln-ink,#14122b);white-space:nowrap;transition:transform .15s}
.lnf-btn:hover{transform:translateY(-1px)}
.lnf-btn.alt{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.22)}
.lnf-k{font-family:var(--ln-display,"Bricolage Grotesque",sans-serif);font-size:17px;font-weight:700;color:#fff;margin-bottom:16px;letter-spacing:-.01em}
.lnf-group ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.lnf-group a{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:500;color:var(--ln-on-dark-2,#b9b6d9);transition:color .15s;overflow-wrap:anywhere}
.lnf-group a:hover{color:#fff}
.lnf-note{margin:18px 0 0;font-size:13px;line-height:1.5;color:var(--ln-on-dark-2,#b9b6d9);opacity:.8}
.lnf a:focus-visible,.lnf button:focus-visible{outline:3px solid var(--ln-lime,#c9f23a);outline-offset:3px;border-radius:6px}
.lnf-bottom-wrap{background:rgba(255,255,255,.06)}
.lnf-bottom{max-width:1180px;margin:0 auto;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--ln-on-dark-2,#b9b6d9)}
.lnf-cookie{flex-shrink:0;white-space:nowrap;background:none;border:0;padding:0;font:inherit;font-size:13px;font-weight:600;color:var(--ln-lime,#c9f23a);cursor:pointer}
.lnf-cookie:hover{text-decoration:underline}
@media (prefers-reduced-motion:reduce){.lnf-btn{transition:none}.lnf-btn:hover{transform:none}}
@media (max-width:980px){.lnf-in{grid-template-columns:1fr 1fr 1fr}.lnf-brand{grid-column:1 / -1}}
@media (max-width:640px){.lnf-in{grid-template-columns:1fr 1fr;gap:24px;padding:48px 16px 28px}.lnf-group:last-child{grid-column:1 / -1}.lnf-bottom{flex-direction:column;align-items:flex-start;gap:6px;padding:16px 16px 20px}}
`
