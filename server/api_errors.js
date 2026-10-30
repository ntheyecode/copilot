// ===========================================================================
// WorkCoPilot integration API: the ONE machine-readable error shape.
//
// Every /api/v1 response that is not a success, and every API-key / webhook
// admin route, answers `{ error, code }`: `error` is a sentence a person can act
// on, `code` is a stable id a program can branch on. A 5xx never leaks internals:
// the caller gets a generic message and `INTERNAL`, and the cause goes to the
// injected incident recorder.
// ===========================================================================

const CODE_FOR_STATUS = {
  400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT',
  410: 'GONE', 413: 'PAYLOAD_TOO_LARGE', 415: 'UNSUPPORTED_MEDIA_TYPE', 423: 'LOCKED', 429: 'RATE_LIMITED',
}

export function codeForStatus(status) { return CODE_FOR_STATUS[status] || (status >= 500 ? 'INTERNAL' : 'ERROR') }

export function sendApiError(res, status, code, error) {
  if (res.headersSent) return
  res.status(status).json({ error, code })
}

// Map a thrown error to the shape. `onInternal(e)` records a 5xx cause.
export function sendThrown(res, e, onInternal = () => {}) {
  const status = Number(e && (e.status || e.statusCode)) || 500
  if (status >= 500) {
    try { onInternal(e) } catch { /* never fail on logging */ }
    return sendApiError(res, 500, 'INTERNAL', 'Something went wrong on our side. Please try again shortly.')
  }
  // body-parser errors carry a `type` (entity.parse.failed, entity.too.large).
  if (e && e.type === 'entity.parse.failed') return sendApiError(res, 400, 'BAD_JSON', 'The request body is not valid JSON.')
  if (e && e.type === 'entity.too.large') return sendApiError(res, 413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.')
  return sendApiError(res, status, (e && typeof e.code === 'string' && /^[A-Z][A-Z0-9_]{1,40}$/.test(e.code)) ? e.code : codeForStatus(status), (e && e.message) || 'Request failed.')
}

// Async route wrapper with the shape above (mirrors route_wrap.js, which answers
// in the app's own `{ error }` shape for session routes).
export function makeApiWrap(onInternal) {
  return (fn) => (req, res, next) => {
    try {
      const out = fn(req, res, next)
      if (out && typeof out.then === 'function') out.catch((e) => sendThrown(res, e, (x) => onInternal(x, req)))
    } catch (e) { sendThrown(res, e, (x) => onInternal(x, req)) }
  }
}

export default { codeForStatus, sendApiError, sendThrown, makeApiWrap }
