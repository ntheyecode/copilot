import { Fragment } from 'react'
import { useT } from '../i18n/index.jsx'
import { legalDocTitle } from './LegalConsentGate.jsx'

// The signup clickwrap sentence: "I have read and agree to the Terms of Service,
// Privacy Policy, ... and Disclaimer." The sentence is ONE keyed string with a
// {docs} slot (login.form.agreeDocs), so each language places the list where its
// grammar needs it; the list itself is joined by Intl.ListFormat in the active
// locale ("A, B and C" / "A, B y C" / "A、B、C"), and every agreement name is
// keyed by its manifest doc key (legalDocTitle). Each name stays a link.
function listParts(locale, names) {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).formatToParts(names)
  } catch {
    // A runtime without Intl.ListFormat: a plain comma list, still every link.
    return names.flatMap((n, i) => (i ? [{ type: 'literal', value: ', ' }, { type: 'element', value: n }] : [{ type: 'element', value: n }]))
  }
}

export default function AgreementLinks({ docs }) {
  const t = useT()
  const list = Array.isArray(docs) ? docs : []
  const names = list.map((d) => legalDocTitle(t, d))
  let el = 0
  const links = listParts(t.locale, names).map((p, i) => {
    if (p.type !== 'element') return <Fragment key={i}>{p.value}</Fragment>
    const d = list[el++]
    return <a key={i} href={d && d.path} target="_blank" rel="noopener">{p.value}</a>
  })
  const [before, after = ''] = String(t('login.form.agreeDocs')).split('{docs}')
  return <>{before}{links}{after}</>
}
