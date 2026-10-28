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
    // ---- The pre-plan starter (src/pages/work/Guiding.jsx): the screen before
    // the plan exists: goal box, Plan button, the photo button on mobile, and
    // the one-line help under them. helpShare/helpFloat carry <b> (t.rich);
    // "Float on top" names the English button label, so it stays as-is. ----
    pre: {
      title: 'What do you want to get done?',
      sub: 'Type or paste your goal. It becomes a clear checklist that follows your screen step by step.',
      placeholder: 'Build an AWS VPC with two public and two private subnets and a NAT gateway.',
      plan: 'Plan the steps',
      photo: 'Photo',
      retakePhoto: 'Retake photo',
      photoTip: 'Snap a photo of a screen, a device or paper',
      helpMobile: 'Tap Photo to snap the screen, device or paper, then Plan reads it.',
      helpShare: 'Share your <b>whole screen</b> (not just a tab) so it can guide you through any app.',
      helpFloat: 'Then use <b>Float on top</b> to keep the steps above your work.',
    },
  },
}
