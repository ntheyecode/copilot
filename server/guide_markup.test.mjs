// The ONE rule for removing Guide's **bold** / `code` markers (guide_markup.js),
// and a gate that no other server module keeps its own copy of the regex.
// Origin: e2e/FINDINGS.md #2 (raw markup shown in the Workflow issues inbox).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripGuideMarkup } from './guide_markup.js'
import { v1Incident } from './api_v1_shapes.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))

test('stripGuideMarkup removes bold and code markers and nothing else', () => {
  assert.equal(stripGuideMarkup('Click **Save** then `Enter`'), 'Click Save then Enter')
  assert.equal(stripGuideMarkup(null), '')
  assert.equal(stripGuideMarkup('2 * 3 = 6'), '2  3 = 6')
  assert.equal(stripGuideMarkup('Plain text, 42%.'), 'Plain text, 42%.')
})

test('the integration API incident shape carries plain step text', () => {
  const x = v1Incident({ id: 'wi1', kind: 'error', state: 'open', why: 'w', stepIndex: 0, stepText: 'Open **Billing**', workflowRef: { id: 'w', groupId: 'g', version: 1, title: 't' } })
  assert.equal(x.stepText, 'Open Billing')
})

test('no other server module hand-rolls the guide-markup regex', () => {
  const offenders = fs.readdirSync(HERE)
    .filter((f) => f.endsWith('.js') && f !== 'guide_markup.js')
    .filter((f) => fs.readFileSync(path.join(HERE, f), 'utf8').includes(".replace(/[*`]+/g, '')"))
  assert.deepEqual(offenders, [], 'use stripGuideMarkup from server/guide_markup.js')
})
