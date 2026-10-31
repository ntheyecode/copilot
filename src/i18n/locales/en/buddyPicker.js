// English strings for BuddyPicker (src/components/BuddyPicker.jsx): the buddy
// character chooser. One partial per i18n wave, deep-merged into the English base
// by src/i18n/index.jsx under the `buddyPicker` namespace. A non-English locale
// that lacks a key falls back to this English. US spelling; no em dashes.
export default {
  buddyPicker: {
    groupAria: 'Choose your buddy',
    surprise: 'Surprise (a random pet)',
    // {name} = the character's name below.
    buddyAria: 'WorkCoPilot buddy ({name})',
    characters: { boy: 'Boy', girl: 'Girl', dog: 'Dog', cat: 'Cat', bot: 'Bot' },
  },
}
