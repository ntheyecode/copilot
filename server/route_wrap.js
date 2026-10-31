// Route error wrapper, sync AND async. Before this, `wrap` only caught errors a
// handler threw synchronously: an async handler's rejection escaped it, so the
// request never got an answer, and with no unhandledRejection listener Node ends
// the whole process on it. Eight routes (Company Brain chunks/manifest/inventory/
// sources/clear/query/reembed, coverage) passed async handlers. Now every error,
// thrown or rejected, reaches sendError exactly once.
//
// makeWrap(sendError) -> wrap(fn) -> (req, res) => void
export function makeWrap(sendError) {
  return (fn) => (req, res) => {
    const fail = (e) => {
      if (res.headersSent) { console.warn(`[route] error after response: ${e && e.message}`); return }
      sendError(res, e, req)
    }
    try {
      const out = fn(req, res)
      if (out && typeof out.then === 'function') out.then(null, fail)
    } catch (e) { fail(e) }
  }
}

export default { makeWrap }
