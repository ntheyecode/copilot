// English strings for the top-level error boundary fallback
// (src/components/ErrorBoundary.jsx). The fallback renders through a small
// function component so it can read these keys; if the locale provider itself is
// unavailable (the crash was inside it), useT falls back to English, so this copy
// is always shown. One partial per i18n wave, deep-merged into the English base by
// src/i18n/index.jsx under the `errorBoundary` namespace. US spelling; no em dashes.
export default {
  errorBoundary: {
    title: 'Something went wrong',
    body: 'We hit an unexpected error loading this page. Please reload to try again.',
    reload: 'Reload',
  },
}
