// AccentPicker - the per-user accent-color control for the dashboards and the guide.
//
// Not everyone likes green. This is the ONE control (single source - SUPREME RULE
// II) through which a user picks the accent that every in-product surface adopts
// live: the 8 curated presets from src/theme/accent.js, a custom color, or
// "Default" (each console keeps its own color - green for the company console and
// the guide, blue for the superadmin console).
//
// Behaviour contract:
//   - picking recolors the whole document IMMEDIATELY via applyAccent() (sets the
//     --accent vars on :root; every dashboard/guide token derives from them), and
//   - persists per-user via api.workSetAccent() fire-and-forget: the UI never
//     waits on the network, and a failed save never surfaces as an error here -
//     the choice is already live and in localStorage, and the next sign-in on
//     this device restores it.
// The active swatch reflects the signed-in user's `accent` (auth context), falling
// back to the device's stored value, so the control is correct before the profile
// has loaded and stays in sync when it does.
//
// Two visual variants so it reads native in both design systems:
//   variant="wka"   - the admin dashboards (wka-* tokens)
//   variant="guide" - the guiding console / Tools menu (--border / --text tokens)
// Both are the same markup; only the token mapping differs (see ACP_CSS).
import { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { ACCENT_PRESETS, DEFAULT_ACCENT_HEX, accentHexFor, applyAccent, currentAccentKey, deriveAccentVars, storedAccent } from '../theme/accent.js'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useT } from '../i18n/index.jsx'

const ACP_CSS = `
.acp{--acp-line:var(--wka-line-2,#d5d9e6);--acp-muted:var(--wka-muted,#5c6484);--acp-text:var(--wka-text,#1b2033);--acp-panel:var(--wka-panel,#ffffff);--acp-ring:var(--wka-accent,#0e9f6e);--acp-sw:26px;--acp-gap:9px;
  display:flex;flex-direction:column;gap:9px;min-width:0;max-width:100%;font-size:13px;color:var(--acp-text)}
.acp.acp-guide{--acp-line:var(--border,#e7eaf2);--acp-muted:var(--text-muted,#5c6484);--acp-text:var(--text,#1b2033);--acp-panel:var(--surface,#ffffff);--acp-ring:var(--em,#0e9f6e);--acp-sw:22px;--acp-gap:7px;gap:7px}
.acp-k{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.acp-k .t{font-size:12.5px;font-weight:600;color:var(--acp-muted);white-space:nowrap}
.acp-k .cur{font-size:12px;font-weight:600;color:var(--acp-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.acp-row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--acp-gap);min-width:0}
.acp-sw{position:relative;width:var(--acp-sw);height:var(--acp-sw);flex:0 0 auto;border-radius:50%;border:none;padding:0;margin:0;cursor:pointer;
  background:var(--sw);color:var(--sw-ink,#fff);display:grid;place-items:center;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.10);transition:transform .12s ease,box-shadow .12s ease}
.acp-sw:hover{transform:scale(1.1)}
.acp-sw:focus-visible{outline:2px solid var(--acp-ring);outline-offset:2px}
.acp-sw.on{box-shadow:0 0 0 2px var(--acp-panel),0 0 0 4px var(--sw)}
.acp-sw svg{width:12px;height:12px;stroke-width:3}
.acp-sw.acp-custom{overflow:hidden}
.acp-sw.acp-custom:not(.on){background:conic-gradient(from 180deg,#e11d48,#b7791f,#0e9f6e,#0a84c2,#7c3aed,#e11d48)}
.acp-sw.acp-custom input{position:absolute;inset:-4px;width:calc(100% + 8px);height:calc(100% + 8px);opacity:0;cursor:pointer;border:none;padding:0;margin:0}
.acp-sw.acp-custom .plus{font-size:13px;font-weight:800;line-height:1;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.35);pointer-events:none}
.acp-sw.acp-reset{background:var(--acp-panel);color:var(--acp-muted);box-shadow:inset 0 0 0 1.5px var(--acp-line)}
.acp-sw.acp-reset:hover{color:var(--acp-text)}
.acp-sw.acp-reset.on{color:var(--acp-ring);box-shadow:0 0 0 2px var(--acp-panel),0 0 0 2px var(--acp-ring) inset,0 0 0 4px var(--acp-ring)}
.acp-note{font-size:11.5px;color:var(--acp-muted);line-height:1.4}
@media(prefers-reduced-motion:reduce){.acp-sw{transition:none}.acp-sw:hover{transform:none}}
`

// Each instance carries its own <style> (the same pattern every wka section and
// the guide use). A "mount once" module flag was tried and is WRONG here: React
// StrictMode double-invokes state initializers and sections unmount/remount, so
// the only instance holding the sheet disappears and every later picker renders
// unstyled (invisible swatches). Duplicate identical sheets are harmless.
function AccentPickerStyle() { return <style data-acp="1">{ACP_CSS}</style> }

export default function AccentPicker({ variant = 'wka', label, note, onChange }) {
  const t = useT()
  // The label prop keeps its contract: omitted -> the localized default; an
  // explicit empty/null value still hides the label row (and the aria-label
  // falls back to the default name below).
  const labelText = label === undefined ? t('accentPicker.label') : label
  // Preset display names are localized by preset KEY; an unkeyed preset (one
  // added to accent.js without a string) falls back to its catalog name.
  const presetName = (p) => (t.has(`accentPicker.presets.${p.key}`) ? t(`accentPicker.presets.${p.key}`) : p.name)
  const auth = useAuth()
  const user = auth && auth.user
  const serverAccent = user && user.accent != null ? user.accent : null
  // The displayed selection: server value first (follows the user across devices),
  // else what this device last applied. Picks update it locally at once.
  const [value, setValue] = useState(() => serverAccent || storedAccent())
  useEffect(() => { if (serverAccent) setValue(serverAccent) }, [serverAccent])

  const persistTimer = useRef(null)
  const persist = (v) => {
    clearTimeout(persistTimer.current)
    // Fire-and-forget; the choice is already live. A refused save (offline, signed
    // out) is swallowed - localStorage still restores it on this device.
    persistTimer.current = setTimeout(() => { try { Promise.resolve(api.workSetAccent(v)).catch(() => {}) } catch { /* ignore */ } }, 250)
  }
  useEffect(() => () => clearTimeout(persistTimer.current), [])

  const pick = (v) => {
    const next = v || null
    setValue(next)
    applyAccent(next)       // live, everywhere, right now
    persist(next)
    if (onChange) onChange(next)
  }
  // Dragging inside the native color dialog streams `input` events: recolor live on
  // each, but only persist the settled value (same debounce; the last one wins).
  const onCustomInput = (e) => pick(e.target.value)

  const activeKey = currentAccentKey(value)        // 'green' | ... | 'custom' | null
  const customHex = activeKey === 'custom' ? accentHexFor(value) : null
  const customInk = customHex ? deriveAccentVars(customHex)['--accent-contrast'] : '#fff'
  const activePreset = activeKey && activeKey !== 'custom' ? ACCENT_PRESETS.find((p) => p.key === activeKey) : null
  const currentName = activeKey === 'custom' ? t('accentPicker.customName', { hex: customHex.toUpperCase() })
    : activeKey ? (activePreset ? presetName(activePreset) : undefined)
      : t('accentPicker.defaultName')

  return (
    <div className={`acp acp-${variant}`} role="group" aria-label={labelText || t('accentPicker.label')}>
      <AccentPickerStyle />
      {labelText ? <div className="acp-k"><span className="t">{labelText}</span><span className="cur" aria-live="polite">{currentName}</span></div> : null}
      <div className="acp-row">
        {ACCENT_PRESETS.map((p) => {
          const on = activeKey === p.key
          return (
            <button key={p.key} type="button" className={`acp-sw${on ? ' on' : ''}`} style={{ '--sw': p.hex }}
              title={presetName(p)} aria-label={t('accentPicker.presetAria', { name: presetName(p) })} aria-pressed={on} onClick={() => pick(p.key)}>
              {on ? <Check aria-hidden="true" /> : null}
            </button>
          )
        })}
        <label className={`acp-sw acp-custom${activeKey === 'custom' ? ' on' : ''}`} style={{ '--sw': customHex || DEFAULT_ACCENT_HEX, '--sw-ink': customInk }}
          title={customHex ? t('accentPicker.customColorHex', { hex: customHex.toUpperCase() }) : t('accentPicker.customColor')}>
          {activeKey === 'custom' ? <Check aria-hidden="true" /> : <span className="plus" aria-hidden="true">+</span>}
          <input type="color" aria-label={t('accentPicker.customAria')} value={customHex || accentHexFor(value) || DEFAULT_ACCENT_HEX} onInput={onCustomInput} onChange={onCustomInput} />
        </label>
        <button type="button" className={`acp-sw acp-reset${activeKey == null ? ' on' : ''}`} title={t('accentPicker.defaultTitle')}
          aria-label={t('accentPicker.defaultAria')} aria-pressed={activeKey == null} onClick={() => pick(null)}>
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
      {note ? <div className="acp-note">{note}</div> : null}
    </div>
  )
}
