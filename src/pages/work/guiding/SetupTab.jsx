// The Setup tab of the guiding console: what a person rarely needs mid-task.
//   1. What the guide reads: My screen, or A camera (offered only where the
//      user may use it: src/pages/work/guiding/captureSource.js), the camera
//      picker, the live preview to aim it, and the "show the live view while
//      guiding" switch.
//   2. Reading & look: text size, guidance level, the per-user preferences
//      (theme mode, brand colors, accessibility) and the light / dark toggle.
// Presentation only: the console owns the stream, the source and every
// setting (one source of truth); this tab shows them and calls back.
import { useEffect, useRef } from 'react'
import { Monitor, Camera, Eye, RefreshCw, Square, Play, ShieldCheck, AlertTriangle, Sun, Moon, Settings, ScanLine } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import GuideFontControl from '../../../components/GuideFontScale.jsx'
import GuideLevelControl from '../../../components/GuideLevel.jsx'
import PreferencesPanel from '../../../components/PreferencesPanel.jsx'
import { cameraOffered, cameraLockReason, CAMERA_ERROR_KEYS } from './captureSource.js'
import { useCameraDevices } from './useCameraDevices.js'

const GUIDE_THEME = { border: 'var(--border)', text: 'var(--text)', muted: 'var(--text-muted)', panel: 'var(--surface)', accent: 'var(--em)', accentSoft: 'var(--em-soft)' }

// The live view: a second <video> on the SAME stream the console captures
// from (a MediaStream can feed several elements), so what you aim here is
// exactly what the guide reads.
function CameraPreview({ stream }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (el.srcObject !== stream) { el.srcObject = stream || null; if (stream) el.play().catch(() => {}) }
    return () => { try { el.srcObject = null } catch { /* ignore */ } }
  }, [stream])
  return <video ref={ref} muted playsInline autoPlay data-testid="wc-camera-preview" />
}

export default function SetupTab({
  user = null, mobile = false,
  source, onSource, cameraId = '', onCameraId, preview = true, onPreview,
  stream = null, cameraError = '', onStartCamera, onStopCapture, busy = false,
  view,
}) {
  const t = useT()
  const offered = cameraOffered({ user, mobile })
  const lock = cameraLockReason({ user, mobile })
  const isCamera = source === 'camera'
  const live = !!(stream && isCamera)
  // Re-read the camera list once a capture starts: labels only exist after the
  // permission was granted.
  const { cameras, state: camState, refresh } = useCameraDevices({ enabled: offered, revision: live ? 1 : 0 })
  const errKey = cameraError ? CAMERA_ERROR_KEYS[cameraError] || CAMERA_ERROR_KEYS.other : ''
  const chosenGone = !!(cameraId && cameras.length && !cameras.some((c) => c.id === cameraId))

  return (
    <div className="wc-setup" data-testid="wc-setup">
      <p className="wc-setup-lead">{t('guideConsole.setup.lead')}</p>

      <section className="wc-setup-card" aria-labelledby="wc-setup-src-k">
        <div className="wc-setup-k" id="wc-setup-src-k"><ScanLine size={12} /> {t('guideConsole.setup.sourceK')}</div>
        <div className="wc-src" role="radiogroup" aria-labelledby="wc-setup-src-k">
          <button type="button" role="radio" aria-checked={!isCamera} className="wc-src-opt" disabled={busy} onClick={() => onSource('screen')} data-testid="wc-src-screen">
            <span className="wc-src-ic"><Monitor size={16} /></span>
            <span className="wc-src-t"><b>{t('guideConsole.setup.screen')}</b><small>{t('guideConsole.setup.screenSub')}</small></span>
          </button>
          {offered && (
            <button type="button" role="radio" aria-checked={isCamera} className="wc-src-opt" disabled={busy} onClick={() => onSource('camera')} data-testid="wc-src-camera">
              <span className="wc-src-ic"><Camera size={16} /></span>
              <span className="wc-src-t"><b>{t('guideConsole.setup.camera')}</b><small>{t('guideConsole.setup.cameraSub')}</small></span>
            </button>
          )}
        </div>
        {lock === 'managed' && (
          <div className="wc-setup-note" data-testid="wc-camera-locked"><ShieldCheck size={14} /><span>{t('guideConsole.setup.cameraLocked')}</span></div>
        )}

        {offered && isCamera && (
          <>
            <div className="wc-setup-row">
              <label className="wc-setup-row-k" htmlFor="wc-cam-select">{t('guideConsole.setup.cameraK')}</label>
              <div className="wc-cam-row" style={{ flex: '1 1 260px' }}>
                <select id="wc-cam-select" className="wc-cam-sel" value={chosenGone ? '' : cameraId} disabled={busy || camState === 'unsupported'} onChange={(e) => onCameraId(e.target.value)}>
                  <option value="">{t('guideConsole.setup.cameraDefault')}</option>
                  {cameras.map((c, i) => c.id ? <option key={c.id} value={c.id}>{c.label || t('guideConsole.setup.cameraN', { n: i + 1 })}</option> : null)}
                </select>
                <button type="button" className="wc-tbtn" onClick={refresh} disabled={camState === 'unsupported'} title={t('guideConsole.setup.refreshTip')}><RefreshCw size={14} /> {t('guideConsole.setup.refresh')}</button>
              </div>
            </div>
            {camState === 'none' && !errKey && <div className="wc-setup-warn" role="status"><AlertTriangle size={14} /><span>{t('guideConsole.setup.camNone')}</span></div>}
            {camState === 'unsupported' && <div className="wc-setup-warn" role="status"><AlertTriangle size={14} /><span>{t('guideConsole.setup.camUnsupported')}</span></div>}
            {errKey && <div className="wc-setup-warn" role="alert" data-testid="wc-camera-error"><AlertTriangle size={14} /><span>{t(errKey)}</span></div>}

            <div className="wc-setup-row-k">{t('guideConsole.setup.previewK')}</div>
            {live ? (
              <div className="wc-cam-view"><CameraPreview stream={stream} /><span className="wc-cam-live"><i aria-hidden="true" /> {t('guideConsole.setup.live')}</span></div>
            ) : (
              <div className="wc-cam-view idle">
                <div className="wc-cam-idle"><Camera size={26} /><span>{t('guideConsole.setup.aim')}</span></div>
              </div>
            )}
            <div className="wc-cam-acts">
              {live
                ? <button type="button" className="wc-tbtn" onClick={onStopCapture} disabled={busy}><Square size={13} /> {t('guideConsole.setup.stop')}</button>
                : <button type="button" className="wc-tbtn primary" onClick={onStartCamera} disabled={busy} data-testid="wc-camera-start"><Play size={14} /> {t('guideConsole.setup.start')}</button>}
              {live && <span className="wc-setup-hint">{t('guideConsole.setup.aim')}</span>}
            </div>

            <div className="wc-sw-row">
              <div className="wc-sw-t" id="wc-preview-l"><b>{t('guideConsole.setup.previewLabel')}</b><small>{t('guideConsole.setup.previewHint')}</small></div>
              <span className="wc-sw-l" aria-hidden="true">{preview ? t('prefs.a11y.on') : t('prefs.a11y.off')}</span>
              <button type="button" role="switch" aria-checked={preview} aria-labelledby="wc-preview-l" className="wc-sw" onClick={() => onPreview(!preview)} />
            </div>
            <div className="wc-setup-note"><ShieldCheck size={14} /><span>{t('guideConsole.setup.masked')}</span></div>
          </>
        )}
      </section>

      <section className="wc-setup-card" aria-labelledby="wc-setup-view-k">
        <div className="wc-setup-k" id="wc-setup-view-k"><Eye size={12} /> {t('guideConsole.setup.viewK')}</div>
        <div className="wc-setup-row"><span className="wc-setup-row-k">{t('guideConsole.tools.textSize')}</span><GuideFontControl scale={view.fsScale} dec={view.fsDec} inc={view.fsInc} reset={view.fsReset} atMin={view.fsAtMin} atMax={view.fsAtMax} theme={GUIDE_THEME} /></div>
        <div className="wc-setup-row"><span className="wc-setup-row-k">{t('guideConsole.tools.guidance')}</span><GuideLevelControl level={view.level} onChange={view.setLevel} compact theme={GUIDE_THEME} /></div>
        {/* Per-user preferences (theme mode, brand combination, accessibility):
            apply live everywhere and persist; the reading-size stepper above is
            the guide's own, so the panel hides its text-size row. */}
        <PreferencesPanel variant="guide" hide={['textSize']} />
        <div className="wc-setup-row">
          <span className="wc-setup-row-k">{t('guideConsole.tools.themeSub')}</span>
          <button type="button" className="wc-tbtn" onClick={view.toggleAppTheme}>{view.appTheme === 'light' ? <Moon size={14} /> : <Sun size={14} />} {view.appTheme === 'light' ? t('guideConsole.tools.darkMode') : t('guideConsole.tools.lightMode')}</button>
        </div>
      </section>
      <p className="wc-setup-hint" style={{ margin: '0 2px' }}><Settings size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('guideConsole.setup.back')}</p>
    </div>
  )
}
