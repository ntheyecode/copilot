// The ONE visual of the camera-reading section: an industrial control panel
// (dark bezel, three readings, one of them masked), a phone held up to it with
// the camera reading, and the WorkCoPilot step card beside it (the step, the
// check, the wrong turn it caught). Labels come from home.camera.visual.*; the
// readings (2.4 bar, L3-FILL-02) are format samples, not language. Fixed dark
// colors on the panel and the phone (a device, not a theme), the card follows
// the page's light tokens.
import { Check, AlertTriangle } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'

export default function CameraPanelVisual() {
  const t = useT()
  const v = (k) => t(`home.camera.visual.${k}`)
  return (
    <div className="wcr-vis" role="img" aria-label={v('aria')}>
      <style>{CSS}</style>
      <div className="wcr-panel" aria-hidden="true">
        <div className="wcr-panel-bar"><i className="wcr-led" /><b>{v('panel')}</b><span className="wcr-panel-id">L3-FILL-02</span></div>
        <div className="wcr-panel-body">
          <div className="wcr-row"><span>{v('mode')}</span><b className="warn">{v('manual')}</b></div>
          <div className="wcr-row"><span>{v('pressure')}</span><b>2.4 bar</b></div>
          <div className="wcr-row"><span>{v('recipe')}</span><b><span className="wcr-mask" title={v('masked')} /></b></div>
          <div className="wcr-keys"><i /><i /><i /><i className="go" /></div>
        </div>
        <div className="wcr-phone">
          <div className="wcr-phone-screen">
            <span className="wcr-scan" />
            <span className="wcr-reading"><i />{v('reading')}</span>
          </div>
        </div>
      </div>
      <div className="wcr-card" aria-hidden="true">
        <div className="wcr-card-head"><span className="d r" /><span className="d y" /><span className="d g" /><b>WorkCoPilot</b><span className="wcr-live"><i />{v('reading')}</span></div>
        <div className="wcr-card-step"><span>{v('stepLabel')}</span><p>{v('step')}</p></div>
        <div className="wcr-card-check"><Check size={13} strokeWidth={3} /> {v('check')}</div>
        <div className="wcr-card-caught"><AlertTriangle size={13} /> {v('caught')}</div>
      </div>
    </div>
  )
}

const CSS = `
.wcr-vis{display:grid;gap:18px;width:100%;max-width:520px;margin-inline:auto;min-width:0}
/* the control panel */
.wcr-panel{position:relative;background:linear-gradient(180deg,#2a2f3a,#1b1f28);border:1px solid #3a4150;border-radius:16px;padding:10px 10px 14px;box-shadow:0 30px 60px -36px rgba(10,20,45,.6),inset 0 1px 0 rgba(255,255,255,.06);margin-block-end:26px}
.wcr-panel-bar{display:flex;align-items:center;gap:8px;font-size:12px;color:#c9d1e0;padding:4px 6px 10px;min-width:0}
.wcr-panel-bar b{font-weight:700;color:#eef1f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.wcr-led{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px rgba(52,211,153,.8);flex:none}
.wcr-panel-id{margin-inline-start:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:.08em;color:#8a94a8;flex:none}
.wcr-panel-body{background:#0b0f18;border:1px solid #2b3240;border-radius:10px;padding:12px 12px 10px;display:grid;gap:9px}
.wcr-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;color:#9aa6ba;min-width:0}
.wcr-row>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.wcr-row b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;font-weight:700;color:#8cf5c4;white-space:nowrap;flex:none}
.wcr-row b.warn{color:#ffb35c}
.wcr-mask{display:inline-block;width:72px;height:12px;border-radius:3px;background:repeating-linear-gradient(135deg,#3a4150 0 4px,#2b3240 4px 8px);vertical-align:middle}
.wcr-keys{display:flex;gap:8px;margin-top:4px}
.wcr-keys i{flex:1;height:16px;border-radius:5px;background:#1c2230;border:1px solid #2b3240}
.wcr-keys i.go{background:#15402f;border-color:#1f7a55}
/* the phone held up to the panel, bottom end corner, overlapping the bezel */
.wcr-phone{position:absolute;inset-inline-end:14px;bottom:-26px;width:150px;background:#0a0c12;border:2px solid #3a4150;border-radius:14px;padding:6px;box-shadow:0 18px 40px -16px rgba(0,0,0,.7)}
/* the viewfinder grows with its label (long languages wrap, nothing clips) */
.wcr-phone-screen{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:68px;padding:30px 7px 6px;border-radius:9px;overflow:hidden;background:linear-gradient(180deg,#1b1f28,#0b0f18);border:1px solid #2b3240}
.wcr-scan{position:absolute;inset-inline:6px;top:8px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#39d3ff,transparent);animation:wcr-scan 2.4s ease-in-out infinite}
@keyframes wcr-scan{0%,100%{top:8px}50%{top:24px}}
.wcr-reading{display:flex;align-items:flex-start;gap:5px;font-size:9.5px;line-height:1.25;font-weight:700;letter-spacing:.02em;color:#8cf5c4;min-width:0;overflow-wrap:anywhere}
.wcr-reading i{margin-top:3px}
.wcr-reading i{width:6px;height:6px;border-radius:50%;background:#34d399;flex:none;animation:wcr-pulse 1.6s infinite}
@keyframes wcr-pulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 5px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
/* the step card */
.wcr-card{background:var(--panel,#fff);border:1px solid var(--line,#e2e7f0);border-radius:16px;padding:14px 16px 16px;box-shadow:0 1px 2px rgba(17,23,38,.04),0 18px 42px -26px rgba(17,23,38,.22);display:grid;gap:10px;min-width:0}
.wcr-card-head{display:flex;align-items:center;gap:6px;font-size:13px;min-width:0}
.wcr-card-head .d{width:8px;height:8px;border-radius:50%;flex:none}
.wcr-card-head .d.r{background:#ff5f57}.wcr-card-head .d.y{background:#febc2e}.wcr-card-head .d.g{background:#28c840}
.wcr-card-head b{font-family:"Bricolage Grotesque",sans-serif;margin-inline-start:4px;color:var(--tx,#0c1222);white-space:nowrap}
.wcr-live{display:inline-flex;align-items:center;gap:6px;margin-inline-start:auto;font-size:11px;font-weight:700;color:#07784f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.wcr-live i{width:7px;height:7px;border-radius:50%;background:#34d399;flex:none;animation:wcr-pulse 1.6s infinite}
.wcr-card-step{border:1px solid rgba(14,159,110,.3);background:rgba(14,159,110,.07);border-radius:12px;padding:10px 12px}
.wcr-card-step span{display:block;font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#07784f;margin-bottom:4px}
.wcr-card-step p{margin:0;font-size:14px;line-height:1.45;color:var(--tx,#0c1222);font-weight:600}
.wcr-card-check,.wcr-card-caught{display:flex;align-items:flex-start;gap:7px;font-size:12.5px;line-height:1.4;color:var(--mut,#3f4a5c)}
.wcr-card-check svg{color:#0e9f6e;flex:none;margin-top:2px}
.wcr-card-caught{color:#8a4b00;background:rgba(255,154,77,.12);border:1px solid rgba(255,154,77,.35);border-radius:10px;padding:8px 10px}
.wcr-card-caught svg{flex:none;margin-top:2px}
@media(prefers-reduced-motion:reduce){.wcr-scan,.wcr-reading i,.wcr-live i{animation:none}}
@media(max-width:560px){.wcr-phone{width:136px;bottom:-22px}.wcr-phone-screen{min-height:60px;padding-top:26px}.wcr-mask{width:56px}}
`
