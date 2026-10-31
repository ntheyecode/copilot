// Browser-side network boundary. The SPA loads two things from public CDNs on
// demand: the OCR engine that masks recorded screenshots (tesseract.js, version in src/shared/ocr_engine.js, +
// its core) and the English language data. The suite serves the SAME versions
// from the repo's local copies (the desktop app bundles them), so a run never
// depends on, or leaks to, a third party. Every other non-local request is
// aborted and recorded; the `as` fixture fails the test if any happened.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { REPO } from '../support/server.mjs'
import { OCR_DIST, OCR_CORE, OCR_LANG } from '../../src/shared/ocr_engine.js'

const WC = path.join(REPO, 'workcopilot')
// The URLs come from the app's one OCR module, so a version bump moves both.
const lit = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const MAP = [
  [new RegExp(`^${lit(OCR_DIST)}/([\\w.-]+)$`), (m) => path.join(WC, 'node_modules', 'tesseract.js', 'dist', m[1])],
  [new RegExp(`^${lit(OCR_CORE)}/([\\w.-]+)$`), (m) => path.join(WC, 'node_modules', 'tesseract.js-core', m[1])],
  [new RegExp(`^${lit(OCR_LANG)}/eng\\.traineddata(\\.gz)?$`), () => path.join(WC, 'ocr-lang', 'eng.traineddata')],
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
