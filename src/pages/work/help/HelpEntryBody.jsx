// Renders one role-gated help entry from a small spec, so each surface's help
// module (help/entries/*.jsx) holds only WHAT to show, never layout:
//   lead          dashboardsHelp.<k>.lead            (benefit first, one or two lines)
//   note          dashboardsHelp.<k>.<note(v)>       (optional, role-specific)
//   path          dashboardsHelp.<k>.<path(v)|'path'> (array: the task as numbered steps)
//   shots[]       dashboardsHelp.<k>.<id>.{h, alt, caption, marks.<key>}
// A shot or a single callout can carry show(v) to appear only for the roles
// that can do that thing (v = roleViewOf(user)). Image paths and callout
// geometry stay in code (assets), every word is translated.
import { Fragment } from 'react'
import { Info } from 'lucide-react'
import AnnotatedShot, { HelpPath } from './AnnotatedShot.jsx'
import { visibleShots, shotMarks } from './helpSpecs.js'

export default function HelpEntryBody({ k, spec, v, t }) {
  const base = 'dashboardsHelp.' + k
  const noteKey = spec.note ? spec.note(v) : null
  return (<>
    <p className="hs-lead">{t(base + '.lead')}</p>
    {noteKey && <p className="hs-note"><Info size={15} /> <span>{t(base + '.' + noteKey)}</span></p>}
    <HelpPath items={t(base + '.' + (spec.path ? spec.path(v) : 'path'))} />
    {visibleShots(spec.shots, v).map((s) => (
      <Fragment key={s.id}>
        <h3 className="sub">{t(`${base}.${s.id}.h`)}</h3>
        <AnnotatedShot name={s.name} alt={t(`${base}.${s.id}.alt`)} caption={t(`${base}.${s.id}.caption`)}
          marks={shotMarks(s, v, t, base)} />
      </Fragment>
    ))}
  </>)
}
