// "Your brain" (/work/brain): a personal account teaches its own guide with
// documents. The server learns, masks private details, de-duplicates and
// refreshes, then deletes the file; the person sees only what it learned and
// every task from then on reads from it. A child route of WorkAppLayout (rail
// + top bar persist). Thin page: each block is its own module here (SUPREME
// XV); the rules live in brainModel.js, the state in useBrain.js. Company
// users have the company brain and read CompanyNotice instead.
import { useMemo, useState } from 'react'
import { Brain, Loader2, Trash2 } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useEditionView } from '../../../edition/useCaps.js'
import { useWorkApp } from '../WorkAppContext.jsx'
import { BRAIN_CSS } from './brain.css.js'
import { useBrain } from './useBrain.js'
import { groupBySource, docMeter } from './brainModel.js'
import BrainPromise from './BrainPromise.jsx'
import DocMeter from './DocMeter.jsx'
import DropZone from './DropZone.jsx'
import { ResultBanner, ErrorBanner, resultSentences } from './LearnResult.jsx'
import SourceRows from './SourceRows.jsx'
import EmptyState from './EmptyState.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import CompanyNotice from './CompanyNotice.jsx'

export default function BrainPage() {
  const t = useT()
  const { user, upgradeHref } = useWorkApp()
  const { individualPlans } = useEditionView()
  const company = !!(user && user.companyId)
  const brain = useBrain({ enabled: !company })
  const [confirm, setConfirm] = useState(null)   // { kind: 'source' | 'all', row? }

  const rows = useMemo(() => groupBySource(brain.data), [brain.data])
  const meter = useMemo(() => docMeter(brain.data), [brain.data])
  const total = brain.data ? (brain.data.learnings || []).length : 0
  const loaded = brain.data !== null
  const nothingYet = loaded && total === 0
  // One persistent live region announces the working state and the result;
  // errors are role=alert banners of their own.
  const live = brain.working ? t('brainPage.working.aria', { name: brain.working.name }) : brain.result ? resultSentences(t, brain.result).join(' ') : ''

  const askSource = (row) => setConfirm({ kind: 'source', row })
  // The dialog closes either way: on failure the error banner is readable
  // only once the scrim is gone.
  const doConfirm = async () => {
    if (!confirm) return
    if (confirm.kind === 'all') await brain.clear(); else await brain.forgetSource(confirm.row.id)
    setConfirm(null)
  }
  const confirmBusy = !!confirm && brain.busyId === (confirm.kind === 'all' ? 'all' : confirm.row.id)

  return (
    <section className="wd-brain" aria-label={t('brainPage.sectionAria')}>
      <style>{BRAIN_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic ai"><Brain size={17} /></span>
        <div>
          <h2>{t('brainPage.title')}</h2>
          <p>{t('brainPage.lead')}</p>
        </div>
        {!company && <div className="wd-brain-head-right"><DocMeter meter={meter} upgradeHref={upgradeHref} canUpgrade={individualPlans} /></div>}
      </div>

      {company ? <CompanyNotice /> : (<>
        <div className="wd-brain-sr" aria-live="polite" role="status">{live}</div>
        <BrainPromise id="wd-brain-promise" />
        <DropZone onFile={brain.learn} working={brain.working} disabled={!loaded} full={meter.reached} describedBy="wd-brain-promise" />
        <ResultBanner result={brain.result} onDismiss={brain.dismissResult} />
        <ErrorBanner err={brain.err} upgradeHref={upgradeHref} canUpgrade={individualPlans} onDismiss={brain.dismissErr} />
        {brain.loadErr && <ErrorBanner err={{ key: brain.loadErr.key === 'signedOut' ? 'signedOut' : 'load' }} onRetry={brain.load} />}

        {!loaded && !brain.loadErr && <div className="wd-brain-loading" role="status"><Loader2 size={15} className="wd-brain-spin" /> {t('brainPage.list.loading')}</div>}
        {nothingYet && <EmptyState />}
        {loaded && (
          <>
            <div className="wd-brain-listhead">
              <h3>{t('brainPage.list.title')}</h3>
              {total > 0 && <span className="wd-sec-count">{t.n('brainPage.list.count', total)}</span>}
              {total > 0 && (
                <button type="button" className="wd-brain-forgetall" onClick={() => setConfirm({ kind: 'all' })} aria-label={t('brainPage.list.forgetAllAria')} title={t('brainPage.list.forgetAllAria')}>
                  <Trash2 size={13} /> <span>{t('brainPage.list.forgetAll')}</span>
                </button>
              )}
            </div>
            <SourceRows rows={rows} busyId={brain.busyId} onForgetLearning={brain.forgetLearning} onForgetSource={askSource} />
          </>
        )}
      </>)}

      {confirm && confirm.kind === 'source' && (
        <ConfirmDialog
          title={confirm.row.kind === 'sessions' ? t('brainPage.confirm.sessionsTitle') : t('brainPage.confirm.sourceTitle', { name: confirm.row.name })}
          body={t.n(confirm.row.kind === 'sessions' ? 'brainPage.confirm.sessionsBody' : 'brainPage.confirm.sourceBody', confirm.row.learnings.length)}
          confirmLabel={t('brainPage.confirm.forgetSource')} busy={confirmBusy} onConfirm={doConfirm} onCancel={() => setConfirm(null)} />
      )}
      {confirm && confirm.kind === 'all' && (
        <ConfirmDialog strong
          title={t('brainPage.confirm.allTitle')} body={t.n('brainPage.confirm.allBody', total)}
          confirmLabel={t('brainPage.confirm.forgetAll')} busy={confirmBusy} onConfirm={doConfirm} onCancel={() => setConfirm(null)} />
      )}
    </section>
  )
}
