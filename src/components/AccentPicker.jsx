// AccentPicker - the per-user BRAND COMBINATION control (the "Brand colors"
// group of the Preferences panel; also usable alone).
//
// Not everyone likes green, but a free color can look wrong or fail contrast,
// so the user picks ONE of the vetted combinations from src/theme/accent.js
// (single source - SUPREME RULE II): a primary + secondary pair whose every
// shade is derived with a WCAG AA guarantee. "Default" lets each console keep
// its own colors (green for the app and company console, blue for superadmin).
//
// Behaviour contract:
//   - picking recolors the whole document IMMEDIATELY (the preferences store
//     calls applyAccent(), which sets the --accent / --accent-2 vars on :root;
//     every dashboard/guide token derives from them), and
//   - persists per user through the same store (localStorage at once, then the
//     profile endpoint, fire-and-forget): the UI never waits on the network and
//     a failed save never surfaces here.
// The active swatch reflects the store, which the auth hydration seeds from the
// signed-in user's profile (server value first) and localStorage.
//
// Three visual variants so it reads native in each design system:
//   variant="wka"   - the admin dashboards (wka-* tokens)
//   variant="guide" - the guiding console / Tools menu (--border / --text tokens)
//   variant="wd"    - the signed-in app shell (the .wd token set)
// Same markup; only the token mapping differs (see ACP_CSS).
import { Check, RotateCcw } from 'lucide-react'
import { ACCENT_COMBOS, currentAccentKey } from '../theme/accent.js'
import { usePrefs } from '../theme/usePrefs.js'
import { useT } from '../i18n/index.jsx'

const ACP_CSS = `
.acp{--acp-line:var(--wka-line-2,#d5d9e6);--acp-muted:var(--wka-muted,#5c6484);--acp-text:var(--wka-text,#1b2033);--acp-panel:var(--wka-panel,#ffffff);--acp-ring:var(--wka-accent,#0e9f6e);--acp-sw:28px;--acp-gap:9px;
  display:flex;flex-direction:column;gap:9px;min-width:0;max-width:100%;font-size:13px;color:var(--acp-text)}
.acp.acp-guide{--acp-line:var(--border,#e7eaf2);--acp-muted:var(--text-muted,#5c6484);--acp-text:var(--text,#1b2033);--acp-panel:var(--surface,#ffffff);--acp-ring:var(--em,#0e9f6e);--acp-sw:24px;--acp-gap:7px;gap:7px}
.acp.acp-wd{--acp-line:var(--line-2,#d3d8e4);--acp-muted:var(--mut,#5f6887);--acp-text:var(--tx,#1a1f33);--acp-panel:var(--panel,#ffffff);--acp-ring:var(--em,#0e9f6e);--acp-sw:30px;--acp-gap:10px}
.acp-k{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.acp-k .t{font-size:12.5px;font-weight:600;color:var(--acp-muted);white-space:nowrap}
.acp-k .cur{font-size:12px;font-weight:600;color:var(--acp-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.acp-row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--acp-gap);min-width:0}
/* A two-tone swatch: the primary fills the left, the secondary the right. */
.acp-sw{position:relative;width:var(--acp-sw);height:var(--acp-sw);flex:0 0 auto;border-radius:50%;border:none;padding:0;margin:0;cursor:pointer;
  background:linear-gradient(90deg,var(--sw) 0 50%,var(--sw2,var(--sw)) 50% 100%);color:var(--sw-ink,#fff);display:grid;place-items:center;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.10);transition:transform .12s ease,box-shadow .12s ease}
.acp-sw:hover{transform:scale(1.1)}
.acp-sw:focus-visible{outline:2px solid var(--acp-ring);outline-offset:2px}
.acp-sw.on{box-shadow:0 0 0 2px var(--acp-panel),0 0 0 4px var(--sw)}
.acp-sw svg{width:12px;height:12px;stroke-width:3;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.acp-sw.acp-reset{background:var(--acp-panel);color:var(--acp-muted);box-shadow:inset 0 0 0 1.5px var(--acp-line)}
.acp-sw.acp-reset:hover{color:var(--acp-text)}
.acp-sw.acp-reset.on{color:var(--acp-ring);box-shadow:0 0 0 2px var(--acp-panel),0 0 0 2px var(--acp-ring) inset,0 0 0 4px var(--acp-ring)}
.acp-sw.acp-reset svg{filter:none}
.acp-note{font-size:11.5px;color:var(--acp-muted);line-height:1.4}
@media(prefers-reduced-motion:reduce){.acp-sw{transition:none}.acp-sw:hover{transform:none}}
[data-a11y-motion='reduce'] .acp-sw{transition:none}
[data-a11y-motion='reduce'] .acp-sw:hover{transform:none}
[data-a11y-targets='1'] .acp{--acp-sw:36px;--acp-gap:12px}
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
  const labelText = label === undefined ? t('prefs.brand.label') : label
  // Combination display names are localized by KEY; an unkeyed combination (one
  // added to accent.js without a string) falls back to its catalog name.
  const comboName = (c) => (t.has(`prefs.brand.combos.${c.key}`) ? t(`prefs.brand.combos.${c.key}`) : c.name)
  const { prefs, setAccent } = usePrefs()
  const activeKey = currentAccentKey(prefs.accent)
  const active = activeKey ? ACCENT_COMBOS.find((c) => c.key === activeKey) : null
  const currentName = active ? comboName(active) : t('prefs.brand.current')

  const pick = (key) => {
    setAccent(key || null)     // live everywhere, stored, persisted by the store
    if (onChange) onChange(key || null)
  }

  return (
    <div className={`acp acp-${variant}`} role="group" aria-label={labelText || t('prefs.brand.label')}>
      <AccentPickerStyle />
      {labelText ? <div className="acp-k"><span className="t">{labelText}</span><span className="cur" aria-live="polite">{currentName}</span></div> : null}
      <div className="acp-row">
        {ACCENT_COMBOS.map((c) => {
          const on = activeKey === c.key
          return (
            <button key={c.key} type="button" className={`acp-sw${on ? ' on' : ''}`} style={{ '--sw': c.primary, '--sw2': c.secondary }}
              title={comboName(c)} aria-label={t('prefs.brand.comboAria', { name: comboName(c) })} aria-pressed={on} onClick={() => pick(c.key)}>
              {on ? <Check aria-hidden="true" /> : null}
            </button>
          )
        })}
        <button type="button" className={`acp-sw acp-reset${activeKey == null ? ' on' : ''}`} title={t('prefs.brand.defaultTitle')}
          aria-label={t('prefs.brand.defaultAria')} aria-pressed={activeKey == null} onClick={() => pick(null)}>
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
      {note !== null ? <div className="acp-note">{note === undefined ? t('prefs.brand.note') : note}</div> : null}
    </div>
  )
}
