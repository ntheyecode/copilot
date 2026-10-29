// English strings for the TASK OVERVIEW block (src/pages/work/TaskOverview.jsx):
// the rich "what you'll be doing" paragraph under a task, on every list row and
// resume / open screen. The overview TEXT itself arrives from the server already
// in the user's language (written at plan time), so only the chrome lives here.
// One partial per i18n wave, deep-merged into the English base by
// src/i18n/index.jsx. Keys live under the `taskOverview` namespace.
export default {
  taskOverview: {
    showMore: 'Show more',
    showLess: 'Show less',
    projectChip: 'Project: {name}',
  },
}
