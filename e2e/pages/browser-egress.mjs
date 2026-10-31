// Browser-side network boundary. The SPA loads two things from public CDNs on
// demand: the OCR engine that masks recorded screenshots (tesseract.js 5.1.1 +
// its core) and the English language data. The suite serves the SAME versions
// from the repo's local copies (the desktop app bundles them), so a run never
// depends on, or leaks to, a third party. Every other non-local request is
// aborted and recorded; the `as` fixture fails the test if any happened.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { REPO } from '../support/server.mjs'

const WC = path.join(REPO, 'workcopilot')
const MAP = [
  [/^https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@5\.1\.1\/dist\/([\w.-]+)$/, (m) => path.join(WC, 'node_modules', 'tesseract.js', 'dist', m[1])],
  [/^https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js-core@5\.1\.1\/([\w.-]+)$/, (m) => path.join(WC, 'node_modules', 'tesseract.js-core', m[1])],
  [/^https:\/\/tessdata\.projectnaptha\.com\/4\.0\.0\/eng\.traineddata(\.gz)?$/, () => path.join(WC, 'ocr-lang', 'eng.traineddata')],
]

const TYPES = { '.js': 'application/javascript', '.wasm': 'application/wasm', '.map': 'application/json' }

export async function guardBrowserEgress(context) {
  const blocked = []
  await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/]|localhost[:/])/, async (route) => {
    const url = route.request().url()
    for (const [re, fileOf] of MAP) {
      const m = url.match(re)
      if (!m) continue
      const file = fileOf(m)
      if (!fs.existsSync(file)) {
        // A setup gap, not a leak: say how to fix it instead of "third-party host".
        blocked.push(`${url} (the local copy is missing: ${file}. Run: npm ci --prefix workcopilot)`)
        return route.abort('blockedbyclient')
      }
      let body = fs.readFileSync(file)
      if (/\.gz$/.test(url)) body = zlib.gzipSync(body)
      const ext = path.extname(file)
      return route.fulfill({ status: 200, body, headers: { 'content-type': TYPES[ext] || 'application/octet-stream', 'access-control-allow-origin': '*' } })
    }
    blocked.push(url)
    return route.abort('blockedbyclient')
  })
  return blocked
}
