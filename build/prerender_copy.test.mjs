// Gate: the prerendered crawler copy (scripts/prerender-marketing.mjs) matches
// what each page sets itself. The strict check existed but no gate ran it, so
// the Security page's title moved to the catalog (securityPage.seo) while the
// prerender kept a hand-copied literal and nobody noticed (2026-10-31).
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('prerendered titles and descriptions match the pages (strict check)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'prerender-marketing.mjs'), '--check', '--strict'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`)
  assert.doesNotMatch(r.stdout + r.stderr, /WARN/)
})
