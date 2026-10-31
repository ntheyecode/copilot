// English strings for the guidance-strength control (src/components/GuideLevel.jsx):
// the Easy / Medium / Technical / Executive segmented control. One partial per
// i18n wave, deep-merged into the English base by src/i18n/index.jsx under the
// `guideLevel` namespace. A non-English locale that lacks a key falls back to this
// English. US spelling; no em dashes.
export default {
  guideLevel: {
    groupAria: 'Guidance strength',
    levels: {
      easy: {
        label: 'Easy',
        title: 'Plain words, every click spelled out',
      },
      medium: {
        label: 'Medium',
        title: 'Clear steps with the key details',
      },
      technical: {
        label: 'Technical',
        title: 'Precise, with commands, paths and values',
        short: 'Tech',
      },
      executive: {
        label: 'Executive',
        title: 'Short, outcome-first, only what matters',
        short: 'Exec',
      },
    },
  },
}
