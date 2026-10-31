// Guide | Setup: the console's two views as a real tablist (roles, selection,
// arrow-key / Home / End movement, focus follows selection). The panels carry
// role="tabpanel" with the ids this strip points at (tabPanelId / tabId).
import { Compass, Settings } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export const CONSOLE_TABS = Object.freeze(['guide', 'setup'])
export const tabId = (id) => `wc-tab-${id}`
export const tabPanelId = (id) => `wc-panel-${id}`
const ICONS = { guide: Compass, setup: Settings }

export default function ConsoleTabs({ tab, onTab }) {
  const t = useT()
  const onKey = (e) => {
    const i = CONSOLE_TABS.indexOf(tab)
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = CONSOLE_TABS[(i + 1) % CONSOLE_TABS.length]
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = CONSOLE_TABS[(i - 1 + CONSOLE_TABS.length) % CONSOLE_TABS.length]
    else if (e.key === 'Home') next = CONSOLE_TABS[0]
    else if (e.key === 'End') next = CONSOLE_TABS[CONSOLE_TABS.length - 1]
    if (!next) return
    e.preventDefault()
    onTab(next)
    try { const el = document.getElementById(tabId(next)); if (el) el.focus() } catch { /* ignore */ }
  }
  return (
    <div className="wc-tabs" role="tablist" aria-label={t('guideConsole.tabs.aria')} onKeyDown={onKey}>
      {CONSOLE_TABS.map((id) => {
        const Icon = ICONS[id]
        const on = tab === id
        return (
          <button key={id} type="button" role="tab" id={tabId(id)} className="wc-tab" aria-selected={on} aria-controls={tabPanelId(id)} tabIndex={on ? 0 : -1} onClick={() => onTab(id)}>
            <Icon size={14} /> {t(id === 'guide' ? 'guideConsole.tabs.guide' : 'guideConsole.tabs.setup')}
          </button>
        )
      })}
    </div>
  )
}
