// Camera reading (company admin): the switch that lets this company's people
// guide from a camera pointed at another computer or a physical system
// (industrial systems, OT consoles, machines, robots: where screen sharing is
// not an option). Off by default; personal accounts have it always
// (server/capture_sources.js holds the rule, GET/PUT /api/work/company/capture
// stores and audits it). Camera frames are masked on the device exactly like
// screen frames, so nothing else changes in the data path.
import { useCallback, useEffect, useState } from 'react'
import { Camera, AlertTriangle } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { SavedTag, Spinning } from './_shared.jsx'

const CAM_CSS = `
.wca-cam-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.wca-cam-sw{display:inline-flex;align-items:center;gap:10px;flex-shrink:0}
.wca-cam-sw-l{font-size:12.5px;font-weight:700;color:var(--wka-muted);white-space:nowrap;min-width:26px;text-align:right}
.wca-sw{position:relative;flex:0 0 auto;width:44px;height:24px;border-radius:999px;border:1px solid var(--wka-line-2);background:var(--wka-bg-2);padding:0;cursor:pointer;transition:background .15s,border-color .15s}
.wca-sw::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--wka-panel);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.wca-sw[aria-checked="true"]{background:var(--wka-accent);border-color:var(--wka-accent)}
.wca-sw[aria-checked="true"]::after{transform:translateX(20px)}
.wca-sw:disabled{opacity:.55;cursor:default}
.wca-sw:focus-visible{outline:2px solid var(--wka-accent);outline-offset:2px}
.wca-cam-uses{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.wca-cam-uses span{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:999px;font-size:11.5px;font-weight:600;color:var(--wka-muted);background:var(--wka-bg-2);border:1px solid var(--wka-line);white-space:nowrap}
@media(prefers-reduced-motion:reduce){.wca-sw,.wca-sw::after{transition:none}}
`

export default function CameraCapture() {
  const t = useT()
  const [on, setOn] = useState(null)      // null until loaded
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)

  const load = useCallback(() => {
    api.workCompanyCapture().then((r) => setOn(!!(r && r.camera))).catch((e) => { setErr(e); setOn(false) })
  }, [])
  useEffect(() => { load() }, [load])

  const apply = async (next) => {
    if (saving || on === null || next === on) return
    setSaving(true); setErr(null); setSaved(false)
    const prev = on
    setOn(next)   // optimistic; reverted on failure
    try {
      const r = await api.workSetCompanyCapture(next)
      setOn(!!(r && r.camera))
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setOn(prev); setErr(error) } finally { setSaving(false) }
  }

  const loaded = on !== null
  return (
    <div className="wka-panel" data-testid="wca-camera-capture">
      <style>{CAM_CSS}</style>
      <div className="wca-cam-head">
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <h2 style={{ margin: 0 }} id="wca-cam-title"><Camera size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.capture.title')}</h2>
          <p className="desc" style={{ marginBottom: 0 }}>{t('companyAdmin.capture.desc')}</p>
        </div>
        <div className="wca-cam-sw">
          <span className="wca-cam-sw-l" aria-hidden="true">{loaded ? (on ? t('companyAdmin.capture.on') : t('companyAdmin.capture.off')) : ''}</span>
          {saving ? <Spinning /> : null}
          <button type="button" role="switch" aria-checked={!!on} aria-labelledby="wca-cam-title" className="wca-sw" disabled={saving || !loaded} onClick={() => apply(!on)} />
        </div>
      </div>
      <div className="wca-cam-uses" aria-hidden="true">
        <span>{t('companyAdmin.capture.useIndustrial')}</span><span>{t('companyAdmin.capture.useOt')}</span><span>{t('companyAdmin.capture.usePhysical')}</span><span>{t('companyAdmin.capture.useRobots')}</span>
      </div>
      <div style={{ marginTop: 12 }}>
        {!loaded ? <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('companyAdmin.capture.loading')}</span>
          : <span style={{ fontSize: 12.5, color: on ? 'var(--wka-emerald)' : 'var(--wka-muted)', fontWeight: 600 }} data-testid="wca-camera-state">
            {on ? t('companyAdmin.capture.onDetail') : t('companyAdmin.capture.offDetail')}
          </span>}
        <SavedTag show={saved} />
        <div style={{ fontSize: 12, color: 'var(--wka-faint)', marginTop: 8, lineHeight: 1.5 }}>{t('companyAdmin.capture.privacy')}</div>
        {err ? <div className="wka-note" style={{ color: 'var(--wka-red)', marginTop: 8 }}><AlertTriangle size={14} /> {(err && err.message) || t('companyAdmin.capture.changeError')}</div> : null}
      </div>
    </div>
  )
}
