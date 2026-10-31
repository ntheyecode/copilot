import React from 'react'
import ReactDOM from 'react-dom/client'
// React Router v7: BrowserRouter runs every navigation inside
// React.startTransition (the v6 v7_startTransition flag is now the default), so
// a lazy route keeps the current screen up until its chunk is ready instead of
// flashing a Suspense fallback. useTransitions={false} is the opt-out.
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
import { confirmCaps } from './edition/active.js'   // deployment-edition capabilities: stamped into the page, confirmed with the server

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
// The capabilities are already known from the page stamp (src/edition/active.js);
// the server's confirmation runs alongside the first paint, never before it.
confirmCaps()

const LOCALE_PRELOAD_BUDGET_MS = 1200
Promise.race([
  preloadActiveLocale(),
  new Promise((resolve) => setTimeout(resolve, LOCALE_PRELOAD_BUDGET_MS)),
]).finally(mount)
