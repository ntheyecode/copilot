// English strings for the per-user Preferences panel
// (src/components/PreferencesPanel.jsx): theme mode, brand combination and
// accessibility. One partial per i18n wave, deep-merged into the English base
// by src/i18n/index.jsx. Keys live under the `prefs` namespace; a locale that
// lacks a key falls back to this English. Combination display names are keyed
// by the combination KEY from src/theme/accent.js.
export default {
  prefs: {
    title: 'Preferences',
    sub: 'Your look and reading comfort. Every change applies at once and follows you across devices.',
    open: 'Preferences',
    close: 'Close preferences',

    mode: {
      label: 'Theme',
      light: 'Light',
      lightHint: 'Calm and white, the default',
      dark: 'Dark',
      darkHint: 'Low light, same layout',
      heavy: 'Heavy',
      heavyHint: 'Bolder type, stronger edges',
    },

    brand: {
      label: 'Brand colors',
      current: 'Default',
      combos: {
        meadow: 'Meadow',
        lagoon: 'Lagoon',
        harbor: 'Harbor',
        twilight: 'Twilight',
        orchid: 'Orchid',
        berry: 'Berry',
        honey: 'Honey',
        graphite: 'Graphite',
      },
      comboAria: '{name} color combination',
      defaultTitle: 'Default colors for each console',
      defaultAria: 'Default colors',
      note: 'Suggested combinations only, each checked for readable contrast.',
    },

    a11y: {
      label: 'Accessibility',
      textSize: 'Text size',
      sizes: { sm: 'Small', md: 'Default', lg: 'Large', xl: 'Extra large' },
      reducedMotion: 'Reduce motion',
      reducedMotionHint: 'Turns off non-essential animation. Your system setting is always respected.',
      highContrast: 'High contrast',
      highContrastHint: 'Stronger text, edges and focus rings.',
      largerTargets: 'Larger click targets',
      largerTargetsHint: 'Bigger buttons and more space between controls.',
      readableFont: 'Readable font',
      readableFontHint: 'A clearer letterform with wider spacing.',
      on: 'On',
      off: 'Off',
    },
  },
}
