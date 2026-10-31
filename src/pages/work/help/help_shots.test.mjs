// The annotated help can only fail quietly: a callout whose region is missing is
// skipped (never misplaced), an image that is gone shows a broken frame, a copy
// key that is missing shows the raw key. This test turns each of those into a
// red build, for every shot of every help entry and console area, and checks the
// per-role gating and the copy rules (no dashes, no AI provider names).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SHOT_GEOMETRY } from './shotGeometry.js'
import { DASHBOARD_HELP_SPECS, COMPANY_HELP_SHOTS, visibleShots, shotMarks } from './helpSpecs.js'
import { pinPositions, PIN_GAP } from './pinLayout.js'
import { roleViewOf } from '../../../shared/work_roles_options.js'
import { deepMergeEn } from '../../../i18n/deep_merge_en.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const LOCALES = join(ROOT, 'src/i18n/locales')
const load = async (f) => (await import(pathToFileURL(f).href)).default
const en = { ...(await load(join(LOCALES, 'en.js'))) }
for (const f of readdirSync(join(LOCALES, 'en')).filter((x) => x.endsWith('.js')).sort()) deepMergeEn(en, (await load(join(LOCALES, 'en', f))) || {})
const get = (p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), en)

// Width and height from a WebP header (lossy VP8, lossless VP8L or extended VP8X).
function webpSize(file) {
  const b = readFileSync(file)
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP')
  const kind = b.toString('ascii', 12, 16)
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 } }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
}

// Every shot of both help surfaces, one shape: regions = captured regions it
// outlines, copyKeys = its callout copy keys (a role variant reuses a region).
const allShots = [
  ...Object.entries(DASHBOARD_HELP_SPECS).flatMap(([k, spec]) => spec.shots.map((s) => ({ ...s, base: `dashboardsHelp.${k}`, heading: true }))),
  ...Object.entries(COMPANY_HELP_SHOTS).flatMap(([area, shots]) => shots.map((s) => ({ ...s, base: `helpCompany.${area}.shots` }))),
].map((s) => ({ ...s, copy: `${s.base}.${s.id}`, regions: [...new Set(s.marks.map((m) => m.region || m.key))], copyKeys: s.marks.map((m) => m.key) }))
const ROLES = [['member'], ['member', ['trainer']], ['project_manager'], ['project_manager', ['trainer']], ['senior_project_manager'], ['grc'], ['executive'], ['company_admin']]
const views = ROLES.map(([r, g = []]) => roleViewOf({ companyId: 'c', companyRole: r, workFlow: 'mixed', grants: g }))

test('every help shot has its image, matching geometry, and callout regions inside it', () => {
  for (const s of allShots) {
    const g = SHOT_GEOMETRY[s.name]
    assert.ok(g, `no geometry for ${s.name} (re-run scripts/help-shots)`)
    const file = join(ROOT, 'public/help', s.name + '.webp')
    assert.ok(existsSync(file), `missing image ${file}`)
    assert.deepEqual(webpSize(file), { w: g.w, h: g.h }, `${s.name}: image size differs from its geometry (captured in different runs)`)
    for (const key of s.regions) {
      const r = g.marks[key]
      assert.ok(r, `${s.name}: callout "${key}" has no captured region`)
      const [x, y, w, h] = r
      assert.ok(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= g.w + 1 && y + h <= g.h + 1, `${s.name}: callout "${key}" is outside the image`)
    }
  }
})

test('pins never overlap: each shot places every pin on a free corner of its region', () => {
  // Unit: a region right under another takes its top-right corner, not the shared edge.
  const [a, b2] = pinPositions([[100, 100, 200, 30], [100, 132, 200, 20]], 1000)
  assert.deepEqual(a, [100, 100]); assert.deepEqual(b2, [300, 132])
  // Boxed in on every corner: the roomiest corner, never simply the first.
  const [, c2] = pinPositions([[100, 100, 30, 30], [100, 110, 30, 30]], 1000)
  assert.deepEqual(c2, [130, 140])
  // Every real shot, as EACH role sees it (a hidden callout shifts the others).
  for (const s of allShots) for (const v of views) {
    if (!visibleShots([s], v).length) continue
    const g = SHOT_GEOMETRY[s.name]
    const pins = pinPositions(shotMarks(s, v, (k) => k, s.base).map((m) => g.marks[m.key]), g.w)
    for (let i = 0; i < pins.length; i++) for (let j = 0; j < i; j++) {
      const d = Math.hypot(pins[i][0] - pins[j][0], pins[i][1] - pins[j][1])
      assert.ok(d >= PIN_GAP * g.w - 0.5, `${s.name} (${v.role}): pins ${j + 1} and ${i + 1} overlap (${Math.round(d)}px apart)`)
    }
  }
})

test('no orphan geometry: every captured shot is shown by some help entry', () => {
  const used = new Set(allShots.map((s) => s.name))
  for (const name of Object.keys(SHOT_GEOMETRY)) assert.ok(used.has(name), `${name} is captured but no help entry shows it`)
})

const DASH = /[–—]/
const PROVIDERS = /\b(OpenAI|Anthropic|Claude|Gemini|Groq|GPT|Mistral|Llama|DeepSeek)\b/i
const copyOk = (path, v) => {
  assert.equal(typeof v, 'string', `missing English copy ${path}`)
  assert.ok(v.trim().length > 0, `empty English copy ${path}`)
  assert.ok(!DASH.test(v), `${path} has an em or en dash`)
  assert.ok(!PROVIDERS.test(v), `${path} names an AI provider or model`)
  assert.equal((v.match(/<b>/g) || []).length, (v.match(/<\/b>/g) || []).length, `${path}: unbalanced <b>`)
}

test('every entry, shot and callout has its English copy, within the copy rules', () => {
  for (const k of Object.keys(DASHBOARD_HELP_SPECS)) {
    copyOk(`dashboardsHelp.${k}.title`, get(`dashboardsHelp.${k}.title`))
    copyOk(`dashboardsHelp.${k}.lead`, get(`dashboardsHelp.${k}.lead`))
    const spec = DASHBOARD_HELP_SPECS[k]
    for (const pk of new Set(views.map((v) => (spec.path ? spec.path(v) : 'path')))) {
      const path = get(`dashboardsHelp.${k}.${pk}`)
      assert.ok(Array.isArray(path) && path.length >= 2, `dashboardsHelp.${k}.${pk} must be a list of steps`)
      path.forEach((p, i) => copyOk(`dashboardsHelp.${k}.${pk}[${i}]`, p))
    }
  }
  for (const s of allShots) {
    if (s.heading) copyOk(`${s.copy}.h`, get(`${s.copy}.h`))
    copyOk(`${s.copy}.alt`, get(`${s.copy}.alt`))
    copyOk(`${s.copy}.caption`, get(`${s.copy}.caption`))
    for (const key of s.copyKeys) copyOk(`${s.copy}.marks.${key}`, get(`${s.copy}.marks.${key}`))
  }
  copyOk('dashboardsHelp.issues.watch', get('dashboardsHelp.issues.watch'))
})

test('each role sees only the help for what it can do', () => {
  const view = (companyRole, grants = []) => roleViewOf({ companyId: 'c', companyRole, workFlow: 'mixed', grants })
  const shown = (spec, v) => visibleShots(spec.shots, v).map((s) => s.id + ':' + s.marks.filter((m) => !m.show || m.show(v)).map((m) => m.key).join(','))
  const { issues, exec, teach } = DASHBOARD_HELP_SPECS
  // GRC and executives watch: no action callout, no adopt shot, the watch note instead.
  for (const r of ['grc', 'executive']) {
    const v = view(r)
    assert.equal(issues.note(v), 'watch', r)
    assert.ok(!shown(issues, v).some((x) => x.startsWith('adopt') || x.includes('actions')), r)
  }
  // GRC and executives get the read-only path.
  assert.equal(issues.path(view('grc')), 'pathWatch'); assert.equal(issues.path(view('executive')), 'pathWatch')
  // Those who can add a step (trainers, company admins) get the adopt shot and the full actions.
  for (const v of [view('member', ['trainer']), view('project_manager', ['trainer']), view('company_admin')]) {
    assert.equal(issues.note(v), null); assert.equal(issues.path(v), 'path')
    const s = shown(issues, v)
    assert.ok(s.some((x) => x.startsWith('adopt')) && s.some((x) => /actions(,|$)/.test(x)) && !s.some((x) => x.includes('actionsPlain')))
  }
  // A PM or Sr PM without the grant acts on issues but can never add a step.
  for (const v of [view('project_manager'), view('senior_project_manager')]) {
    const s = shown(issues, v)
    assert.ok(!s.some((x) => x.startsWith('adopt')) && s.some((x) => x.includes('actionsPlain')))
    assert.equal(issues.path(v), 'path')
  }
  // The Brain export shot is executive-only; a company admin sees the drill-downs only.
  assert.ok(shown(exec, view('executive')).some((x) => x.startsWith('brain')))
  assert.ok(!shown(exec, view('company_admin')).some((x) => x.startsWith('brain')))
  // A trainer without the incident inbox would not see the Workflow issues callout (none today: the grant implies it).
  assert.ok(shown(teach, view('member', ['trainer']))[0].includes('issues'))
})
