// English strings for the superadmin Homepage hero editor
// (src/pages/workadmin/sections/Hero.jsx). One partial per i18n wave,
// deep-merged into the English base by src/i18n/index.jsx. Keys live under the
// `heroAdmin` namespace. Only the editor UI CHROME is keyed here; the hero
// headline/subtext/emphasis pairs the superadmin edits are DATA and are never
// keyed or translated.
export default {
  heroAdmin: {
    loading: 'Loading hero copy',
    heading: 'Homepage hero',
    emptyHeadline: 'empty headline',

    // Collapsed preview record
    descBase: 'The headline + subtext the homepage rotates through.',
    customYes: 'Showing your custom copy.',
    customNo: 'Showing the built-in default - edit and save to make it yours.',
    clickEdit: 'Click Edit to change the copy.',
    superadminNote: 'Only a superadmin can edit the hero. The current copy is shown below.',
    noLines: 'No hero lines saved; the marketing page shows its built-in default.',
    lineN: 'Line {n}',

    // Edit view
    editDesc: 'The headline + subtext the homepage rotates through, one every few seconds. The <strong>emphasis</strong> word is a word or phrase inside the headline rendered in the brand gradient.',
    headlineLabel: 'Headline',
    headlinePlaceholder: 'e.g. Get anything done right, the first time.',
    emphasisLabel: 'Emphasis word',
    emphasisHint: '(a word or phrase inside the headline)',
    emphasisPlaceholder: 'e.g. anything',
    subtextLabel: 'Subtext',
    subtextPlaceholder: 'One or two sentences under the headline.',
    preview: 'Preview',
    moveUp: 'Move up',
    moveDown: 'Move down',
    removeLine: 'Remove line',
    addLine: 'Add line',
    maxLines: 'Maximum {max} lines.',
    saveHero: 'Save hero',
    cancel: 'Cancel',
    resetDefault: 'Reset to default',
    resetTitle: 'Replace with the built-in default copy',
    unsaved: 'Unsaved changes',
    needLine: 'Add at least one line with a headline and subtext.',
    close: 'Close',
  },
}
