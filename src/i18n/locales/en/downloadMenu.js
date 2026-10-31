// English strings for DownloadMenu (src/components/DownloadMenu.jsx): the download
// format chooser (PDF / text report / audit log). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx under the `downloadMenu`
// namespace. A non-English locale that lacks a key falls back to this English.
// US spelling; no em dashes.
export default {
  downloadMenu: {
    triggerTip: 'Download this session',
    menuAria: 'Download format',
    heading: 'Download as',
    label: 'Download',
    formats: {
      pdf: 'PDF report',
      pdfHint: 'Formatted, with screenshots',
      txt: 'Text report (.txt)',
      txtHint: 'Plain text, same content',
      log: 'Audit log (.log)',
      logHint: 'Every AI transmission',
    },
    errDownload: 'Could not download. Please try again.',
  },
}
