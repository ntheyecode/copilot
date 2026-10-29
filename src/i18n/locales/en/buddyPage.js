// English strings for the floating desktop buddy (src/pages/WorkBuddy.jsx),
// keyed under the `buddyPage` namespace. The buddy is a thin read-only overlay:
// a cloud with the current step, the next move, progress and remaining time,
// plus a hover control strip (titles + aria-labels below). Interpolations:
// {n} = the current step number, {total} = the step count. WorkCoPilot is
// never translated.
export default {
  buddyPage: {
    allDone: 'All steps done',
    gettingReady: 'Getting ready',
    allSet: 'You are all set. Open the full window to finish up.',
    watching: 'Watching your screen for the next move',
    progressDone: '{total} of {total}',
    progressStep: 'Step {n} of {total}',
    noTimeLeft: 'No time left',
    calm: {
      completed: 'Session completed. Your summary is ready in the main window.',
      loading: 'Waking up and connecting',
      error: 'Cannot reach the server. Retrying.',
      signin: 'Sign in to WorkCoPilot in the main window and your steps show up here.',
      empty: 'No active task yet. Open WorkCoPilot to start one.',
    },
    pickBuddy: 'Pick your buddy',
    stepConfirmed: 'Step confirmed',
    openWorkCoPilot: 'Open WorkCoPilot',
    controls: {
      closePicker: 'Close buddy picker',
      changeBuddy: 'Change buddy',
      showBuddy: 'Show the buddy',
      textOnly: 'Text only',
      resumeMotion: 'Resume buddy motion',
      freezeMotion: 'Freeze buddy motion',
      resumeGuidance: 'Resume guidance',
      pauseGuidance: 'Pause guidance',
      openGuide: 'Open full guide',
      openWindow: 'Open full window',
      hideTitle: 'Hide buddy (pauses and saves your progress)',
      hide: 'Hide buddy',
      close: 'Close buddy',
    },
  },
}
