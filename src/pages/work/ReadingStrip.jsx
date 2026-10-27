import { useState } from 'react'
import { Eye, AlertTriangle, ChevronDown } from 'lucide-react'
import RichText from '../../components/RichText.jsx'

// The observation, used WISELY: the hero of the view is the step, not a
// recitation of what is on screen. So this is a quiet "I can see" glance, one
// clamped line under the step, expandable on tap for the full sentence. It
// rises to a prominent amber strip ONLY when it matters: the engine says the
// user is in the wrong place, or it sent a flag (something the observation did
// not already say). Then the strip belongs ABOVE the step. The `prominent`
// prop reports which it is, so a host can place it accordingly; a host that
// wants only one placement can render it in one spot and let it change tone.
//
// While a frame is in flight the glance shows three quiet dots. Renders
// nothing when there is nothing to show (not watching yet).
export function readingIsProminent({ offTrack, flag, observation }) {
  const fl = String(flag || '').trim()
  return !!offTrack || (!!fl && fl !== String(observation || '').trim())
}

export default function ReadingStrip({ watching, analyzing, offTrack, observation, flag, source = 'screen' }) {
  const [open, setOpen] = useState(false)
  const obs = String(observation || '').trim()
  const fl = String(flag || '').trim()
  const what = source === 'camera' ? 'the camera' : 'your screen'
  const prominent = readingIsProminent({ offTrack, flag: fl, observation: obs })

  if (prominent) {
    return (
      <div className={`gv-reading${offTrack ? ' is-wrong' : ''}`} role="alert">
        <div className="gv-reading-row">
          <span className="gv-reading-ic" aria-hidden="true"><AlertTriangle size={14} strokeWidth={2.4} /></span>
          <span className="gv-reading-t">
            {offTrack
              ? <><b>Not the right place yet.</b> {obs && <RichText text={obs} accent="var(--gv-warn)" chips={false} />}</>
              : <RichText text={fl} accent="var(--gv-warn)" />}
          </span>
        </div>
        {offTrack && fl && fl !== obs && (
          <div className="gv-reading-flag"><AlertTriangle size={13} strokeWidth={2.4} aria-hidden="true" /><span><RichText text={fl} accent="var(--gv-warn)" /></span></div>
        )}
      </div>
    )
  }
  if (!analyzing && !(watching && obs)) return null
  return (
    <button type="button" className={`gv-glance${open ? ' open' : ''}${analyzing ? ' is-analyzing' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} title={open ? 'Hide what I can see' : 'Show what I can see'}>
      <span className="gv-glance-ic" aria-hidden="true">{analyzing ? <span className="gv-ana"><i /><i /><i /></span> : <Eye size={12} strokeWidth={2.4} />}</span>
      <span className="gv-glance-k">{analyzing ? `Reading ${what}` : 'I can see'}</span>
      {!analyzing && <span className="gv-glance-t"><RichText text={obs} accent="var(--gv-muted)" chips={false} /></span>}
      {!analyzing && <ChevronDown size={12} className="gv-glance-chev" aria-hidden="true" />}
    </button>
  )
}
