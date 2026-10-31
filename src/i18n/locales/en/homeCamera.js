// English strings for the "Where screen sharing is not an option" section of
// the organization home page (src/components/camera_read/CameraReadSection.jsx),
// keyed under the existing `home` namespace: the i18n loader deep-merges every
// en/*.js partial into the English base, so these keys sit BESIDE home.* in
// en.js (never duplicate those here). The section renders only where companies
// exist (ed.companies: the company administrator turns camera reading on), so
// the individuals edition never reads it (HIDDEN in
// scripts/edition_copy_scan.mjs).
//
// Honest claims only: the guide reads what the camera sees (screens, panels,
// labels, displays); it never controls equipment; masking covers readable text
// in the frame; no certification or safety rating is claimed; "many" never
// "any"; no em-dashes, no AI provider or model names. HMI and SCADA are
// industry terms and stay as written. The visual's values (2.4 bar, L3-FILL-02)
// are format samples, not language.
export default {
  home: {
    camera: {
      eyebrow: 'Where screen sharing is not an option',
      h2: 'Point a camera at the panel. <em>Get the next step.</em>',
      sub: 'Control panels and HMIs, SCADA consoles, lab and medical device screens, machines and robots, a locked-down kiosk, a second computer that cannot run the app. WorkCoPilot reads what the camera sees and guides the person standing in front of it.',
      points: [
        { t: 'Reads the panel or machine screen', d: 'A phone or a webcam aimed at the display is all it takes. Nothing is installed on the equipment and nothing touches its network.' },
        { t: 'The exact next step, checked', d: 'The right menu, the right value, in order. After each step it reads the display again and confirms the change took.' },
        { t: 'Catches a wrong turn', d: 'A wrong mode, a wrong recipe, a value out of range: flagged as it happens, before the next step.' },
        { t: 'Masked on the device, read-only', d: 'Frames are shrunk and readable sensitive values are blacked out on the person\'s device before anything is sent. The guide only reads: it never clicks, types or sends a command to the equipment.' },
      ],
      admin: 'Your company administrator turns camera reading on, and every camera session is logged like a screen session.',
      cta: 'Talk to us',
      // The illustration: a phone camera aimed at a control panel, the step card
      // beside it. Labels only; the readings are format samples.
      visual: {
        aria: 'Illustration: a phone camera aimed at an industrial control panel, with the next step and a check shown beside it',
        panel: 'Line 3 filler',
        mode: 'Mode',
        manual: 'Manual',
        pressure: 'Pressure',
        recipe: 'Recipe',
        masked: 'masked on the device',
        reading: 'Reading the camera',
        stepLabel: 'Step 3 of 7',
        step: 'On the panel open Setup, then Recipe, and select the one named for this batch.',
        check: 'Checked: the recipe name on the display matches',
        caught: 'Still in Manual. Switch the panel to Auto before you load the recipe.',
      },
    },
  },
}
