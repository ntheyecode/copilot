// English strings for the per-user accent-color control
// (src/components/AccentPicker.jsx). One partial per i18n wave, deep-merged into
// the English base by src/i18n/index.jsx. Keys live under the `accentPicker`
// namespace. Preset display names are keyed by the preset KEY from
// src/theme/accent.js (the keys and hex values themselves are not localized).
export default {
  accentPicker: {
    // Group label (default when the host passes no label) + accessible name
    label: 'Accent color',

    // The current selection, read out next to the label
    customName: 'Custom {hex}',
    defaultName: 'Default',

    // Preset swatch display names, by preset key
    presets: {
      green: 'Green',
      teal: 'Teal',
      blue: 'Blue',
      indigo: 'Indigo',
      purple: 'Purple',
      rose: 'Rose',
      amber: 'Amber',
      slate: 'Slate',
    },
    presetAria: '{name} accent',

    // Custom color swatch
    customColor: 'Custom color',
    customColorHex: 'Custom color {hex}',
    customAria: 'Custom accent color',

    // Default / reset swatch
    defaultTitle: 'Default - each console keeps its own color',
    defaultAria: 'Default accent',
  },
}
