// English strings for the GUIDE console + floating panel features that are
// i18n-keyed (src/pages/work/VerifyStep.jsx for now). One partial per
// feature wave, deep-merged into the English base by src/i18n/index.jsx under
// the `workGuide` namespace. A non-English locale that lacks a key falls back
// to this English. US spelling; no em dashes.
export default {
  workGuide: {
    // ---- Optional "Verify on my screen": a one-off read of the current step,
    // never forced, never moves the plan. The verdict is a calm inline strip. ----
    verify: {
      btn: 'Verify on my screen',
      btnTip: 'Read your screen once and check this step. Nothing changes until you mark it done.',
      checking: 'Checking your screen...',
      done: 'Looks done',
      doneHint: 'Mark done when you are ready.',
      notYet: 'Not yet',
      notYetDefault: 'I could not confirm this step on your screen yet. Finish it, then check again.',
      noFrame: 'Share your screen first, then verify again.',
      failed: 'Could not check your screen. Try again.',
      again: 'Check again',
      dismiss: 'Dismiss',
      saw: 'I can see',
    },
  },
}
