// What the guiding console reads from: the shared screen, or a camera pointed
// at another computer or a physical system (industrial HMIs, OT consoles,
// machines, robots: places where screen sharing is not an option).
//
// Pure rules + the per-browser memory of the person's choice. The server holds
// the permission rule (server/capture_sources.js): the signed-in user carries
// `cameraCapture` (on for a personal account, a company admin's switch for a
// company), and every /api/work/sessions request says which source it reads
// (src/api.js setCaptureSource). The console only OFFERS the camera where the
// user may use it; the server still refuses a camera read it does not allow
// (403 CAMERA_OFF), which the console turns into an actionable banner.
export const CAPTURE_SOURCES = Object.freeze(['screen', 'camera'])
// The one event src/api.js raises when the server refused a camera read, so a
// single listener in the console handles every call site (plan, watch, ask...).
export const CAMERA_OFF_EVENT = 'wc:camera-off'

const SOURCE_KEY = 'wc-capture-source'
const CAMERA_KEY = 'wc-camera-device'

// May this person choose the camera at all? A phone has no screen share, so
// the camera is its only live source; elsewhere it is the user's grant.
export function cameraOffered({ user = null, mobile = false } = {}) {
  if (user && user.cameraCapture === true) return true
  return !!mobile && !(user && user.companyId)
}

// Why the camera is not offered (null when it is): a company user whose admin
// has not turned it on reads an actionable hint instead of a missing option.
export function cameraLockReason({ user = null, mobile = false } = {}) {
  if (cameraOffered({ user, mobile })) return null
  return user && user.companyId ? 'managed' : 'unavailable'
}

export function sourceOptions(ctx) {
  return cameraOffered(ctx) ? [...CAPTURE_SOURCES] : ['screen']
}

// Where a session starts reading: the remembered choice when it is still
// allowed, else the camera on a phone, else the screen.
export function defaultSource({ user = null, mobile = false, stored = '' } = {}) {
  const offered = cameraOffered({ user, mobile })
  if (stored === 'camera' && offered) return 'camera'
  if (stored === 'screen') return 'screen'
  return (mobile && offered) ? 'camera' : 'screen'
}

export function normalizeSource(v) { return CAPTURE_SOURCES.includes(v) ? v : 'screen' }

// Per-browser memory (storage can be blocked: every access is guarded).
export function readStoredSource() { try { return normalizeSource(localStorage.getItem(SOURCE_KEY) || '') } catch { return '' } }
export function storeSource(s) { try { localStorage.setItem(SOURCE_KEY, normalizeSource(s)) } catch { /* private mode: the choice lasts the session */ } }
export function readCameraId() { try { return localStorage.getItem(CAMERA_KEY) || '' } catch { return '' } }
export function storeCameraId(id) {
  try { if (id) localStorage.setItem(CAMERA_KEY, String(id)); else localStorage.removeItem(CAMERA_KEY) } catch { /* ignore */ }
}

// getUserMedia constraints for reading text on another screen: a 1080p ideal
// (the frame pipeline downscales to its own budget), a modest frame rate (the
// watch loop reads one frame every few seconds; the preview only needs to be
// smooth), the chosen camera exactly when one is chosen, else the back camera
// where a device has one (a phone pointed at a panel).
export function cameraConstraints(deviceId = '') {
  const video = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15, max: 30 } }
  if (deviceId) video.deviceId = { exact: String(deviceId) }
  else video.facingMode = { ideal: 'environment' }
  return { video, audio: false }
}

// Why getUserMedia failed, as one of four actionable kinds.
export function cameraErrorKind(err) {
  const name = String((err && err.name) || '')
  if (/NotAllowed|PermissionDenied|Security/i.test(name)) return 'denied'
  if (/NotFound|DevicesNotFound|Overconstrained/i.test(name)) return 'none'
  if (/NotReadable|TrackStart|Abort/i.test(name)) return 'busy'
  return 'other'
}
// The chosen camera is gone (unplugged, or a stale id from another day): retry
// once without the exact id instead of failing the whole capture.
export function shouldRetryWithoutDevice(err, deviceId) {
  return !!deviceId && /Overconstrained|NotFound/i.test(String((err && err.name) || ''))
}
// The i18n key of each kind (literal keys, so the keys-exist gate sees them).
export const CAMERA_ERROR_KEYS = Object.freeze({
  denied: 'guideConsole.setup.camDenied',
  none: 'guideConsole.setup.camNone',
  busy: 'guideConsole.setup.camBusy',
  other: 'guideConsole.err.capture',
})

// The server refused a camera read (server/capture_sources.js cameraRefusal).
export function isCameraOff(err) {
  return !!(err && err.status === 403 && err.data && err.data.code === 'CAMERA_OFF')
}
