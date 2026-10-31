// The promise, up front: what happens to a document (learned from, then
// deleted; private details masked first; the same document refreshes; forget
// anything any time). Shown above the drop zone so nobody uploads before they
// know. Strings: brainPage.promise.*.
import { ShieldCheck, Check } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export default function BrainPromise({ id }) {
  const t = useT()
  const points = t('brainPage.promise.points')
  return (
    <div className="wd-brain-promise" id={id}>
      <span className="wd-ic"><ShieldCheck size={17} /></span>
      <div>
        <span className="wd-brain-promise-t">{t('brainPage.promise.title')}</span>
        <span className="wd-brain-promise-b">{t('brainPage.promise.body')}</span>
        <ul className="wd-brain-points">
          {(Array.isArray(points) ? points : []).map((p, i) => <li key={i}><Check size={14} /><span>{p}</span></li>)}
        </ul>
      </div>
    </div>
  )
}
