// PreferencesPanel - the ONE per-user personalization panel, three groups:
//
//   1. Theme mode      Light (default) / Dark / Heavy
//   2. Brand colors    a vetted combination (AccentPicker)
//   3. Accessibility   text size, reduce motion, high contrast, larger click
//                      targets, readable font
//
// Every control applies at once (live preview) and persists through the
// preferences store (src/theme/prefs.js): localStorage immediately, then the
// profile endpoint fire-and-forget. The panel holds no state of its own, so
// two mounted panels (the shell modal and the guide's Tools menu) always agree.
//
// Variants map the tokens of the host design system (same contract as
// AccentPicker): "wka" (admin consoles), "guide" (guiding console Tools menu),
// "wd" (the signed-in app shell). `hide` lists control ids to omit where the
// host already has an equivalent (the guide menu has its own reading-size
// stepper, so it passes hide={['textSize']}). Minimal, overflow-safe: every
// segment and switch is nowrap + flex-shrink:0; rows wrap as whole items.
import { Sun, Moon, Contrast } from 'lucide-react'
import AccentPicker from './AccentPicker.jsx'
import { THEME_MODES, TEXT_SIZES } from '../theme/prefs.js'
import { usePrefs } from '../theme/usePrefs.js'
import { useT } from '../i18n/index.jsx'

const PP_CSS = `
.pp{--pp-line:var(--wka-line-2,#d5d9e6);--pp-line-soft:var(--wka-line,#e7eaf2);--pp-muted:var(--wka-muted,#5c6484);--pp-text:var(--wka-text,#1b2033);--pp-panel:var(--wka-panel,#ffffff);--pp-chip:var(--wka-surface-2,#f3f5f9);--pp-ring:var(--wka-accent,#0e9f6e);--pp-ring-soft:var(--wka-accent-soft,rgba(14,159,110,.12));--pp-h:34px;
  display:flex;flex-direction:column;gap:18px;min-width:0;max-width:100%;font-size:13px;color:var(--pp-text)}
.pp.pp-guide{--pp-line:var(--border,#e7eaf2);--pp-line-soft:var(--border,#e7eaf2);--pp-muted:var(--text-muted,#5c6484);--pp-text:var(--text,#1b2033);--pp-panel:var(--surface,#ffffff);--pp-chip:var(--surface-2,#f3f5f9);--pp-ring:var(--em,#0e9f6e);--pp-ring-soft:var(--em-soft,rgba(14,159,110,.12));--pp-h:30px;gap:12px}
.pp.pp-wd{--pp-line:var(--line-2,#d3d8e4);--pp-line-soft:var(--line-soft,#eef0f5);--pp-muted:var(--mut,#5f6887);--pp-text:var(--tx,#1a1f33);--pp-panel:var(--panel,#ffffff);--pp-chip:var(--panel-3,#f3f5f9);--pp-ring:var(--em,#0e9f6e);--pp-ring-soft:var(--em-fill,#eaf7f0)}
.pp-g{display:flex;flex-direction:column;gap:9px;min-width:0}
.pp-k{font-size:12.5px;font-weight:600;color:var(--pp-muted);white-space:nowrap}
/* A segmented choice: equal pills in one row; whole pills wrap, never their text. */
.pp-seg{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.pp-seg button{display:inline-flex;align-items:center;justify-content:center;gap:7px;flex:0 0 auto;white-space:nowrap;height:var(--pp-h);padding:0 13px;border-radius:999px;border:1px solid var(--pp-line);background:var(--pp-panel);color:var(--pp-text);font:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.pp-seg button svg{flex-shrink:0;width:14px;height:14px}
.pp-seg button:hover{background:var(--pp-chip)}
.pp-seg button[aria-pressed="true"]{background:var(--pp-ring-soft);border-color:var(--pp-ring);color:var(--pp-text)}
.pp-seg button:focus-visible{outline:2px solid var(--pp-ring);outline-offset:2px}
.pp-hint{font-size:11.5px;color:var(--pp-muted);line-height:1.4}
/* Switch rows: label + hint on the left, the switch pinned right. */
.pp-rows{display:flex;flex-direction:column;gap:2px;min-width:0}
.pp-row{display:flex;align-items:center;gap:12px;min-width:0;padding:8px 0;border-top:1px solid var(--pp-line-soft)}
.pp-row:first-child{border-top:none;padding-top:2px}
.pp-row-t{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.pp-row-t b{font-size:13px;font-weight:600;color:var(--pp-text);line-height:1.3}
.pp-row-t small{font-size:11.5px;color:var(--pp-muted);line-height:1.4}
.pp-sw{position:relative;flex:0 0 auto;width:40px;height:22px;border-radius:999px;border:1px solid var(--pp-line);background:var(--pp-chip);padding:0;cursor:pointer;transition:background .15s,border-color .15s}
.pp-sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--pp-panel);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.pp-sw[aria-checked="true"]{background:var(--pp-ring);border-color:var(--pp-ring)}
.pp-sw[aria-checked="true"]::after{transform:translateX(18px)}
.pp-sw:focus-visible{outline:2px solid var(--pp-ring);outline-offset:2px}
.pp-sw-l{flex:0 0 auto;width:28px;font-size:11.5px;font-weight:600;color:var(--pp-muted);white-space:nowrap}
@media(prefers-reduced-motion:reduce){.pp-seg button,.pp-sw,.pp-sw::after{transition:none}}
[data-a11y-motion='reduce'] .pp-seg button,[data-a11y-motion='reduce'] .pp-sw,[data-a11y-motion='reduce'] .pp-sw::after{transition:none}
[data-a11y-targets='1'] .pp{--pp-h:44px}
[data-a11y-targets='1'] .pp-sw{width:48px;height:28px}
[data-a11y-targets='1'] .pp-sw::after{width:22px;height:22px}
[data-a11y-targets='1'] .pp-sw[aria-checked="true"]::after{transform:translateX(20px)}
[data-a11y-targets='1'] .pp-row{padding:12px 0}
`
function PreferencesPanelStyle() { return <style data-pp="1">{PP_CSS}</style> }

const MODE_ICONS = { light: Sun, dark: Moon, heavy: Contrast }
const A11Y_SWITCHES = ['reducedMotion', 'highContrast', 'largerTargets', 'readableFont']

export default function PreferencesPanel({ variant = 'wka', hide = [] }) {
  const t = useT()
  const { prefs, setThemeMode, setA11y } = usePrefs()
  const hidden = new Set(hide || [])
  const a = prefs.a11y

  return (
    <div className={`pp pp-${variant}`} role="group" aria-label={t('prefs.title')}>
      <PreferencesPanelStyle />

      {!hidden.has('mode') && (
        <div className="pp-g" role="group" aria-label={t('prefs.mode.label')}>
          <span className="pp-k">{t('prefs.mode.label')}</span>
          <div className="pp-seg">
            {THEME_MODES.map((m) => {
              const Icon = MODE_ICONS[m]
              return (
                <button key={m} type="button" aria-pressed={prefs.themeMode === m} title={t(`prefs.mode.${m}Hint`)} onClick={() => setThemeMode(m)}>
                  <Icon aria-hidden="true" /> {t(`prefs.mode.${m}`)}
                </button>
              )
            })}
          </div>
          <span className="pp-hint">{t(`prefs.mode.${prefs.themeMode}Hint`)}</span>
        </div>
      )}

      {!hidden.has('brand') && (
        <div className="pp-g">
          <AccentPicker variant={variant} />
        </div>
      )}

      {!hidden.has('a11y') && (
        <div className="pp-g" role="group" aria-label={t('prefs.a11y.label')}>
          <span className="pp-k">{t('prefs.a11y.label')}</span>
          {!hidden.has('textSize') && (
            <div className="pp-g" role="group" aria-label={t('prefs.a11y.textSize')}>
              <span className="pp-hint">{t('prefs.a11y.textSize')}</span>
              <div className="pp-seg">
                {Object.keys(TEXT_SIZES).map((s) => (
                  <button key={s} type="button" aria-pressed={a.textSize === s} onClick={() => setA11y({ textSize: s })}>{t(`prefs.a11y.sizes.${s}`)}</button>
                ))}
              </div>
            </div>
          )}
          <div className="pp-rows">
            {A11Y_SWITCHES.filter((k) => !hidden.has(k)).map((k) => {
              const on = !!a[k]
              const id = `pp-${variant}-${k}`
              return (
                <div key={k} className="pp-row">
                  <div className="pp-row-t" id={`${id}-l`}><b>{t(`prefs.a11y.${k}`)}</b><small>{t(`prefs.a11y.${k}Hint`)}</small></div>
                  <span className="pp-sw-l" aria-hidden="true">{on ? t('prefs.a11y.on') : t('prefs.a11y.off')}</span>
                  <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-l`} className="pp-sw" onClick={() => setA11y({ [k]: !on })} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
