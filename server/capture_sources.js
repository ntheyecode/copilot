// Where the guide may read from: the shared screen, or a camera pointed at
// another computer or a physical system (industrial HMIs, OT consoles, robots,
// machines: places where screen sharing is not an option).
//
// Owner rule (2026-10-31): the camera is ON by default for personal accounts
// (MyTaskPilot, web floater and desktop app); for a company (WorkCoPilot) it is
// OFF until the company admin turns it on. Camera frames go through the same
// on-device masking and compression as screen frames.
//
// Pure: the store and the routes call these with the user and their company.
export const CAPTURE_SOURCES = Object.freeze(['screen', 'camera'])
// The header the console sends with every frame-bearing session request.
export const CAPTURE_HEADER = 'x-wc-capture'

export function cameraAllowed({ user = null, company = null } = {}) {
  if (!user) return false
  if (!user.companyId) return true                 // a personal account: on by default
  return !!(company && company.cameraCapture === true)   // a company: only when its admin turned it on
}

// What a request says it carries; anything unknown is treated as the screen.
export function captureSourceOf(value) {
  const v = String(value || '').toLowerCase()
  return CAPTURE_SOURCES.includes(v) ? v : 'screen'
}

// null when the request may go ahead, else the refusal to send (403).
export function cameraRefusal({ source, user, company }) {
  if (captureSourceOf(source) !== 'camera' || cameraAllowed({ user, company })) return null
  return { error: 'Reading from a camera is turned off for your company. Ask your company admin to turn it on, or share your screen.', code: 'CAMERA_OFF' }
}
