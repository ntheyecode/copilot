// English strings for DestructiveGate (src/pages/work/DestructiveGate.jsx): the
// acknowledge gate that hides a destructive step's command until the person
// confirms they read the impact. One partial per i18n wave, deep-merged into the
// English base by src/i18n/index.jsx under the `destructiveGate` namespace. A
// non-English locale that lacks a key falls back to this English. US spelling;
// no em dashes.
//
// reason.<code>: one sentence per reason code the server sends
// (server/destructive_rules.js DESTRUCTIVE_CODES; a test keeps the two in step).
export default {
  destructiveGate: {
    label: 'Destructive step.',
    reveal: 'I understand, show the command',
    check: 'Read it carefully before you run it.',
    flagged: 'Flagged:',
    reason: {
      deleteFiles: 'This command permanently deletes files, and it cannot be undone.',
      forceDelete: 'This command force-deletes files without asking first.',
      dropDbObject: 'This command drops a database object, along with its data.',
      emptyTable: 'This command empties a table.',
      deleteAllRows: 'This command deletes every row, because it has no WHERE clause.',
      overwriteDisk: 'This command formats or overwrites a disk.',
      rewriteGitHistory: 'This command discards changes or force-overwrites Git history.',
      shutdown: 'This command shuts down or restarts the machine.',
      killProcesses: 'This command force-stops running processes.',
      teardownInfra: 'This command tears down infrastructure or cloud resources.',
      recursivePermissions: 'This command changes permissions or ownership for everything inside a folder.',
      unknown: 'This step makes changes that may be hard to undo.',
    },
  },
}
