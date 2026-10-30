// A steady beat for the Teach recorder. While a trainer demonstrates in another
// app this tab is in the background, where browsers slow plain page timers down
// (and, after a few minutes, throttle them hard). Timers inside a worker are not
// throttled that way, so the beat comes from a tiny inline worker (the CSP allows
// `worker-src blob:`), falling back to a page interval if a worker cannot start.
// createTicker(fn, ms) -> { stop() }. Small, single purpose.

const WORKER_SRC = 'let h=null;onmessage=(e)=>{clearInterval(h);if(e.data>0)h=setInterval(()=>postMessage(0),e.data)}'

export function createTicker(fn, ms) {
  let worker = null, url = null, interval = null, stopped = false
  const beat = () => { if (!stopped) { try { fn() } catch { /* one bad beat never stops the clock */ } } }
  try {
    url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))
    worker = new Worker(url)
    worker.onmessage = beat
    worker.onerror = () => { cleanupWorker(); if (!stopped && !interval) interval = setInterval(beat, ms) }
    worker.postMessage(ms)
  } catch {
    cleanupWorker()
    interval = setInterval(beat, ms)
  }
  function cleanupWorker() {
    if (worker) { try { worker.postMessage(0); worker.terminate() } catch { /* already gone */ } worker = null }
    if (url) { try { URL.revokeObjectURL(url) } catch { /* ignore */ } url = null }
  }
  return {
    stop() {
      stopped = true
      cleanupWorker()
      if (interval) { clearInterval(interval); interval = null }
    },
  }
}

export default { createTicker }
