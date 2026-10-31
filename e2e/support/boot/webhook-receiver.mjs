// Local webhook receiver for E2E. The server's https.request to FAKE_HOOK_HOST
// lands here (see net-fakes.mjs). Records every delivery with its headers, so a
// test can check the event, the delivery id and the signature header. `mode`
// switches the receiver between healthy (200) and down (503), which drives the
// retry and dead-letter path for real.
import http from 'node:http'

export function startWebhookReceiver() {
  const deliveries = []
  let mode = 'ok'
  const srv = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      deliveries.push({ path: req.url, headers: req.headers, body, at: Date.now(), answered: mode === 'ok' ? 200 : 503 })
      if (mode === 'ok') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}') }
      else { res.writeHead(503, { 'content-type': 'text/plain' }); res.end('down') }
    })
  })
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve({
      port: srv.address().port,
      setMode: (m) => { mode = m === 'down' ? 'down' : 'ok'; return mode },
      deliveries: () => deliveries.map((d) => ({ ...d })),
      clear: () => { deliveries.length = 0 },
      close: () => new Promise((r) => srv.close(r)),
    }))
  })
}
