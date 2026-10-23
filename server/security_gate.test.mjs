// Tests for the security gate (server/security_gate.js): deterministic dangerous-
// code detection, dependency extraction, and the OSV + registry SCA (stubbed).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanCode, extractDeps, scanDeps, securityReview } from './security_gate.js'

test('scanCode flags the dangerous classes', () => {
  const ids = (t) => scanCode(t).map((f) => f.id)
  assert.ok(ids('curl https://x.sh | bash').includes('pipe-to-shell'))
  assert.ok(ids('chmod 777 /var/www').includes('chmod-777'))
  assert.ok(ids('rm -rf /').includes('rm-rf-root'))
  assert.ok(ids('requests.get(url, verify=False)').includes('tls-verify-off'))
  assert.ok(ids('"Action": "*"').includes('iam-wildcard'))
  assert.ok(ids('cidr = "0.0.0.0/0"').includes('open-ingress'))
  assert.ok(ids('data = pickle.loads(blob)').includes('unsafe-deser'))
  assert.ok(ids('api_key = "sk-abcdefghij0123456789"').includes('hardcoded-secret'))
})

test('scanCode is quiet on safe code', () => {
  assert.equal(scanCode('const sum = a + b; console.log(sum)').length, 0)
})

test('extractDeps parses npm, package.json, pip and go', () => {
  const d = extractDeps('npm install lodash@4.17.11\n"express": "^4.17.1"\npip install Django==3.2.0\ngo get github.com/x/y@v1.2.3')
  const has = (name, eco, ver) => d.some((x) => x.name === name && x.ecosystem === eco && x.version === ver)
  assert.ok(has('lodash', 'npm', '4.17.11'))
  assert.ok(has('express', 'npm', '4.17.1'))
  assert.ok(has('Django', 'PyPI', '3.2.0'))
  assert.ok(has('github.com/x/y', 'Go', '1.2.3'))
})

// Stub fetch for OSV + registry
const realFetch = global.fetch
test('scanDeps returns real CVEs + latest version (stubbed OSV/registry)', async () => {
  global.fetch = async (url, opts) => {
    url = String(url)
    if (url.includes('api.osv.dev')) {
      const body = JSON.parse(opts.body)
      if (body.package.name === 'lodash') return { ok: true, json: async () => ({ vulns: [{ id: 'GHSA-xxxx', aliases: ['CVE-2021-23337'], severity: [{ type: 'CVSS_V3', score: '7.2' }], affected: [{ package: { name: 'lodash' }, ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.21' }] }] }] }] }) }
      return { ok: true, json: async () => ({ vulns: [] }) }
    }
    if (url.includes('registry.npmjs.org')) return { ok: true, json: async () => ({ version: '4.17.21' }) }
    throw new Error('x')
  }
  const r = await scanDeps([{ name: 'lodash', ecosystem: 'npm', version: '4.17.11' }])
  global.fetch = realFetch
  assert.equal(r.checked, true)
  const dep = r.deps[0]
  assert.equal(dep.vulns[0].id, 'CVE-2021-23337')
  assert.equal(dep.vulns[0].fixedIn, '4.17.21')
  assert.equal(dep.latest, '4.17.21')
})

test('securityReview is HONEST: checkedDeps false when the lookup cannot run', async () => {
  global.fetch = async () => { throw new Error('offline') }
  const r = await securityReview('npm install leftpad@1.0.0')
  global.fetch = realFetch
  assert.equal(r.checkedDeps, false)
  assert.equal(r.clean, false) // never claim clean when not verified
})
