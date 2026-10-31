// English strings for DestructiveGate (src/pages/work/DestructiveGate.jsx): the
// acknowledge gate that hides a destructive step's command until the person
// confirms they read the impact. One partial per i18n wave, deep-merged into the
// English base by src/i18n/index.jsx under the `destructiveGate` namespace. A
// non-English locale that lacks a key falls back to this English. US spelling;
// no em dashes.
export default {
  destructiveGate: {
    label: 'Destructive step.',
    reveal: 'I understand, show the command',
    body: 'This {why}. Read it carefully before you run it.',
  },
}
