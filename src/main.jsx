import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
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
preloadActiveLocale().finally(mount)
