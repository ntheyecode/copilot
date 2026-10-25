import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext(null)
const KEY = 'yerra-theme'

export function ThemeProvider({ children }) {
  // WorkCoPilot is WHITE-ONLY in-product (owner design law: no dark theme). Force
  // data-theme=light regardless of any stored value, and overwrite a stale 'dark'
  // left by the old toggle so existing users stop seeing dark global tokens leak
  // into the admin/guide. Marketing keeps its own .wm/.wk palette (independent of
  // data-theme), so this does not affect the public site.
  const theme = 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    try { localStorage.setItem(KEY, 'light') } catch { /* ignore */ }
  }, [])

  const noop = () => {}

  return (
    <ThemeContext.Provider value={{ theme, setTheme: noop, toggle: noop }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
