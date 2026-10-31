// Planner DATA for the Start-a-task wizard (src/pages/work/StartTask.jsx). Every
// string here is sent to the planner / server as data and is NEVER shown on
// screen: the on-screen label and hint of each option, and each question's text,
// come from the i18n catalog (workStart.*). The values stay English on purpose:
// they are recorded in the session's answers and read by the planner, so the
// scope contract must not change with the user's language.
//
// Pure module (no React), so the planner contract is testable on its own and the
// .jsx surface carries only translated copy.

// The two wizard-owned interview questions. `v` is the recorded answer value;
// `l` / `h` are the workStart.* leaf keys for the on-screen label and hint.
export const ENV_OPTS = [
  { v: 'A website / web app', l: 'envWebsite', h: 'envWebsiteH' },
  { v: 'A desktop or installed app', l: 'envDesktop', h: 'envDesktopH' },
  { v: 'Install & configure software', l: 'envInstall', h: 'envInstallH' },
  { v: 'An on-prem product at a local address', l: 'envOnprem', h: 'envOnpremH' },
  { v: 'Not sure / mixed', l: 'envMixed', h: 'envMixedH' },
]
export const STYLE_OPTS = [
  { v: 'Plain and simple', l: 'stylePlain', h: 'stylePlainH' },
  { v: 'Short bullets only', l: 'styleBullets', h: 'styleBulletsH' },
  { v: 'Detailed, with context', l: 'styleDetailed', h: 'styleDetailedH' },
  { v: 'Expert, no hand-holding', l: 'styleExpert', h: 'styleExpertH' },
]

// The canonical (English) question recorded with each answer, so the planner
// reads the same question whatever language the user saw it in.
export const Q_CANON = {
  environment: 'Where does this work happen?',
  phrasing: 'How should I phrase each step?',
  monitor: 'Which screen should I watch?',
}

// Fold the interview context into the goal text the planner sees (prepended).
// Preserved verbatim from StartTask so the planner contract does not change.
export function buildTaskContext({ place, appName, appUrl, otherText, docsChoice }) {
  const parts = []
  if (place === 'saas') parts.push(appName ? `Working in: ${appName}${appUrl ? ` (${appUrl})` : ''} - a website or SaaS app.` : 'Working in a website or SaaS app.')
  else if (place === 'desktop') parts.push(appName ? `Working in: ${appName} - a desktop app.` : 'Working in a desktop app.')
  else if (place === 'files') parts.push('Working with my own files or data.')
  else if (place === 'other' && String(otherText || '').trim()) parts.push(`Working on: ${String(otherText).trim()}.`)
  if (docsChoice === 'use') parts.push('Reference documents are attached to ground this.')
  return parts.join(' ')
}
