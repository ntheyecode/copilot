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
          <a href="/" aria-label={t('indiv.nav.home')}><LinkNotesLogo size={30} idSuffix="lnf" product /></a>
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
      <div className="lnf-bottom">
        <span>&copy; {new Date().getFullYear()} LinkNotes. {t('indiv.footer.made')}</span>
        <button type="button" className="lnf-cookie" onClick={openPreferences}>{t('indiv.footer.cookiePrefs')}</button>
      </div>
    </footer>
  )
}

const CSS = `
.lnf{position:relative;margin-top:auto;background:var(--ln-bg-2,#f6f5fc);color:var(--ln-ink,#14122b);font-family:var(--ln-body,"Inter Variable","Inter",system-ui,sans-serif);text-align:start;border-top:1.5px solid var(--ln-line,#e4e2f3)}
.lnf::before{content:"";position:absolute;left:0;right:0;top:-1.5px;height:6px;background:repeating-linear-gradient(90deg,var(--ln-violet,#5b3df5) 0 28px,var(--ln-lime,#c9f23a) 28px 56px,var(--ln-ink,#14122b) 56px 84px)}
.lnf *{box-sizing:border-box}
.lnf a{color:inherit;text-decoration:none}
.lnf-in{max-width:1180px;margin:0 auto;padding:56px 24px 28px;display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));gap:28px}
.lnf-brand{display:flex;flex-direction:column;gap:16px;align-items:flex-start;min-width:0}
.lnf-brand p{margin:0;font-size:14.5px;line-height:1.55;color:var(--ln-ink-2,#4a4870);max-width:40ch}
.lnf-ctas{display:flex;gap:8px;flex-wrap:wrap}
.lnf-btn{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 16px;border-radius:999px;font-size:13.5px;font-weight:800;background:var(--ln-violet,#5b3df5);color:#fff;border:1.5px solid var(--ln-ink,#14122b);box-shadow:3px 3px 0 var(--ln-lime,#c9f23a);white-space:nowrap}
.lnf-btn.alt{background:#fff;color:var(--ln-ink,#14122b);box-shadow:none;border-color:var(--ln-line-2,#cfcbe8)}
.lnf-k{font-family:var(--ln-mono,ui-monospace,monospace);font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ln-violet-ink,#4a2fe0);margin-bottom:14px}
.lnf-group ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.lnf-group a{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:500;color:var(--ln-ink-2,#4a4870);transition:color .15s;overflow-wrap:anywhere}
.lnf-group a:hover{color:var(--ln-ink,#14122b)}
.lnf-note{margin:16px 0 0;font-size:12.5px;line-height:1.5;color:var(--ln-ink-3,#77759a)}
.lnf a:focus-visible,.lnf button:focus-visible{outline:3px solid var(--ln-violet,#5b3df5);outline-offset:3px;border-radius:6px}
.lnf-bottom{max-width:1180px;margin:0 auto;padding:16px 24px 28px;border-top:1.5px solid var(--ln-line,#e4e2f3);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--ln-ink-3,#77759a)}
.lnf-cookie{flex-shrink:0;white-space:nowrap;background:none;border:0;padding:0;font:inherit;font-size:12.5px;font-weight:700;color:var(--ln-violet-ink,#4a2fe0);cursor:pointer}
.lnf-cookie:hover{text-decoration:underline}
@media (max-width:980px){.lnf-in{grid-template-columns:1fr 1fr 1fr}.lnf-brand{grid-column:1 / -1}}
@media (max-width:640px){.lnf-in{grid-template-columns:1fr 1fr;gap:22px;padding:36px 16px 20px}.lnf-group:last-child{grid-column:1 / -1}.lnf-bottom{flex-direction:column;align-items:flex-start;gap:6px;padding:14px 16px 24px}}
`
