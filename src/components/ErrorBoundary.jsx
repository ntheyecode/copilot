import { Component } from 'react'
import { useT } from '../i18n/index.jsx'

// The fallback is its OWN function component so it can read i18n via useT. If the
// crash was inside the locale provider itself, useT falls back to English (see
// useLocale in src/i18n/index.jsx), so this copy always renders - never a blank.
function ErrorFallback() {
  const t = useT()
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg, #f4f7fb)', color: 'var(--text, #1b2033)', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{t('errorBoundary.title')}</div>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-dim, #5c6484)', margin: '0 0 18px' }}>{t('errorBoundary.body')}</p>
        <button type="button" onClick={() => { try { window.location.reload() } catch { /* ignore */ } }} style={{ height: 44, padding: '0 20px', border: 'none', borderRadius: 12, background: 'var(--brand-600, #0b8259)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{t('errorBoundary.reload')}</button>
      </div>
    </div>
  )
}

// Top-level error boundary. A single render throw anywhere in the tree would
// otherwise unmount the whole app and leave a BLANK page - exactly how a bad
// locale array hole blanked the site for en-GB visitors on 2026-10-27. This
// catches any render error and shows a calm, actionable fallback with a reload,
// instead of a blank screen (SUPREME RULE VIII: degrade gracefully, never a dead
// end). Error boundaries must be class components. No AI-tell wording, no em-dashes.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Surface for diagnosis; never swallow silently.
    try { console.error('App error boundary caught:', error, info) } catch { /* ignore */ }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <ErrorFallback />
  }
}
