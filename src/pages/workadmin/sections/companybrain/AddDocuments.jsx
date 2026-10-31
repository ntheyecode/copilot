// "Add documents" (company console, Company Brain section): the company admin
// adds the company's own documents here. The promise comes first (read it,
// mask private details under the company policy, keep only the passages,
// never store the file), then the drop zone, then one row per file with its
// honest phase and its outcome. A locked private brain is shown up front
// (GET /api/work/brain/security) with the pointer to the unlock control
// (Encryption & export), and again on a 423 per file. When this server has no
// meaning-based search, that is said once, plainly, never with a model name.
// Orchestration only: rules in uploadModel.js, the queue in useDocumentQueue.js.
// Strings: companyBrain.add.*.
import { useCallback, useEffect, useState } from 'react'
import { FilePlus2, ShieldCheck, Lock, RefreshCw, Search, Trash2 } from 'lucide-react'
import { api } from '../../../../api.js'
import { useT } from '../../../../i18n/index.jsx'
import { Spinning } from '../_shared.jsx'
import { ADD_DOCUMENTS_CSS } from './addDocuments.css.js'
import { useDocumentQueue } from './useDocumentQueue.js'
import { keywordsOnly } from './uploadModel.js'
import DocDropZone from './DocDropZone.jsx'
import DocQueueRow, { rowSentences } from './DocQueueRow.jsx'

export default function AddDocuments({ onAdded, onOpen }) {
  const t = useT()
  // Lock state and search mode from the server; null until known. A failure
  // to read it never blocks adding (the add itself answers 423 when locked).
  const [sec, setSec] = useState(null)
  const [checking, setChecking] = useState(false)
  const [kwFromAdd, setKwFromAdd] = useState(false)
  const [announce, setAnnounce] = useState({ id: '', text: '' })   // keyed by row, so the same sentence twice is still announced

  const readSecurity = useCallback(async () => {
    setChecking(true)
    try { setSec(await api.workBrainSecurity()) } catch { setSec((s) => s || { locked: false }) } finally { setChecking(false) }
  }, [])
  useEffect(() => { readSecurity() }, [readSecurity])

  const queue = useDocumentQueue({
    onAdded: (r) => { if (keywordsOnly(r)) setKwFromAdd(true); if (onAdded) onAdded(r) },
  })

  // Announce each finished row once (the first sentence says what happened).
  useEffect(() => {
    const last = [...queue.items].reverse().find((it) => it.phase === 'done' || it.phase === 'failed')
    if (!last) return
    const s = rowSentences(t, last)
    if (s.length) setAnnounce((cur) => (cur.id === last.id ? cur : { id: last.id, text: s[0] }))
  }, [queue.items, t])

  const locked = !!(sec && sec.enabled && sec.locked)
  const keywords = kwFromAdd || !!(sec && sec.semanticSearchReady === false)
  const openUnlock = onOpen ? () => onOpen('brainsecurity') : null
  const finished = queue.items.filter((it) => it.phase === 'done' || it.phase === 'failed').length

  return (
    <div className="wka-panel wka-brain-add" data-testid="brain-add">
      <style>{ADD_DOCUMENTS_CSS}</style>
      <h2 id="wka-brain-add-h"><FilePlus2 size={15} />{t('companyBrain.add.title')}</h2>
      <p className="desc">{t('companyBrain.add.desc')}</p>

      <div className="wka-brain-promise" id="wka-brain-add-promise" data-testid="brain-add-promise">
        <ShieldCheck size={16} aria-hidden="true" />
        <div>
          <span className="wka-brain-promise-t">{t('companyBrain.add.promiseTitle')}</span>
          <span className="wka-brain-promise-b">{t('companyBrain.add.promise')}</span>
        </div>
      </div>

      {locked ? (
        <div className="wka-brain-locked" role="status" data-testid="brain-add-locked">
          <Lock size={16} aria-hidden="true" />
          <div>
            <span className="wka-brain-locked-t">{t('companyBrain.add.locked.title')}</span>
            <span className="wka-brain-locked-b">{t('companyBrain.add.locked.body')}</span>
            <div className="wka-brain-locked-acts">
              {openUnlock ? <button type="button" className="wka-btn primary sm" onClick={openUnlock}><Lock size={12} /> {t('companyBrain.add.locked.open')}</button> : null}
              <button type="button" className="wka-btn sm ghost" onClick={readSecurity} disabled={checking}>{checking ? <Spinning /> : <RefreshCw size={12} />} {t('companyBrain.add.locked.check')}</button>
            </div>
          </div>
        </div>
      ) : (
        <DocDropZone onFiles={queue.add} disabled={false} describedBy="wka-brain-add-promise" />
      )}

      {queue.items.length ? (
        <>
          <div className="wka-brain-qhead-bar">
            <h3 id="wka-brain-add-queue-h">{t('companyBrain.add.queueLabel')}</h3>
            {finished > 0 ? (
              <button type="button" className="wka-btn sm ghost" onClick={queue.clearFinished}><Trash2 size={12} /> {t('companyBrain.add.clearFinished')}</button>
            ) : null}
          </div>
          <ul className="wka-brain-queue" aria-labelledby="wka-brain-add-queue-h" data-testid="brain-add-queue">
            {queue.items.map((it) => (
              <DocQueueRow key={it.id} item={it} onRetry={queue.retry} onDismiss={queue.dismiss} onOpenUnlock={openUnlock} />
            ))}
          </ul>
        </>
      ) : null}

      {keywords ? (
        <div className="wka-note wka-brain-kw" data-testid="brain-add-keywords"><Search size={14} /> {t('companyBrain.add.keywordsNote')}</div>
      ) : null}

      <div className="wka-brain-sr" role="status" aria-live="polite" aria-atomic="true">{announce.text ? <span key={announce.id}>{announce.text}</span> : null}</div>
    </div>
  )
}
