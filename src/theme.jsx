import { createContext, useContext, useMemo } from 'react'
import { usePrefs } from './theme/usePrefs.js'

// The theme context is a thin view over the per-user preferences store
// (src/theme/prefs.js). `theme` is the user's saved mode: 'light' (the default
// and the owner's white law for anyone who has chosen nothing), 'dark' or
// 'heavy'. The store writes `data-theme` on <html> only while a product shell
// is mounted, so the public site stays light whatever the user saved.
// `toggle` flips light <-> dark (heavy counts as a light variant, so it goes to
// dark); the Preferences panel sets any of the three directly.
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { prefs, setThemeMode } = usePrefs()
  const theme = prefs.themeMode
  const value = useMemo(() => ({
    theme,
    setTheme: (m) => setThemeMode(m),
    toggle: () => setThemeMode(theme === 'dark' ? 'light' : 'dark'),
  }), [theme, setThemeMode])
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
