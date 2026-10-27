import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
// Self-hosted display + mono fonts (ePrivacy: no third-party Google Fonts request
// before consent). Static @fontsource packages register the exact family names
// the UI references ('Bricolage Grotesque', 'Figtree', 'JetBrains Mono'), so no
// font-family reference changes are needed and no fonts.googleapis.com link loads.
import '@fontsource/bricolage-grotesque'
import '@fontsource/figtree'
import '@fontsource/jetbrains-mono'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/polish.css'
import './styles/refigold.css'
import App from './App.jsx'
import { ThemeProvider } from './theme.jsx'
import { AuthProvider } from './auth.jsx'
import { LocaleProvider, preloadActiveLocale } from './i18n/index.jsx'   // language (16 locales, RTL for Arabic); outermost so every surface can read it

function mount() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </React.StrictMode>
  )
}

// Preload the chosen locale's dictionary BEFORE first paint so a non-English
// visitor never sees a flash of English on load or reload. preloadActiveLocale
// never rejects, so mount always runs (English resolves instantly from cache).
// Cap the wait: if the dictionary chunk is slow (flaky network), mount anyway
// after a short budget rather than leaving the splash up indefinitely - the
// LocaleProvider re-renders when the dictionary lands (SUPREME RULE VIII: degrade
// gracefully, never a stuck screen). The HTML splash covers this brief window.
const LOCALE_PRELOAD_BUDGET_MS = 1200
Promise.race([
  preloadActiveLocale(),
  new Promise((resolve) => setTimeout(resolve, LOCALE_PRELOAD_BUDGET_MS)),
]).finally(mount)
