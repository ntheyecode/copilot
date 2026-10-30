// Regression gate: the WorkCoPilot task (session) report must NOT leak the
// detailed how-to of steps that were not confirmed on screen. It carries:
//   - every step by name + status (completed AND incomplete), and
//   - the full detail (commands, code, target URL, "done when", sub-steps,
//     exhibits) ONLY for steps the operator confirmed.
// If this ever regresses, an unperformed step's exact commands/code would be
// exposed in a downloadable, shareable report. See server/pdf.js stepEntry's
// `completedOnly` gate.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// pdf.js loads store.js: set a temp data dir BEFORE importing it (a static import
// would be hoisted above this line and open the real server/data).
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-report-privacy-'))
const { buildWorkReportPdf } = await import('./pdf.js')

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

function renderToText(session, opts = {}) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const sink = new Writable({ write(c, _e, cb) { chunks.push(Buffer.from(c)); cb() } })
    sink.on('finish', async () => {
      try {
        const parser = new PDFParse({ data: new Uint8Array(Buffer.concat(chunks)) })
        const parsed = await parser.getText()
        const text = parsed.text || (parsed.pages || []).map((p) => p.text || '').join('\n')
        resolve(text.replace(/\s+/g, ''))
      } catch (e) { reject(e) }
    })
    sink.on('error', reject)
    buildWorkReportPdf(session, sink, opts)
  })
}

const session = {
  id: 'sess_privacy_gate',
  title: 'Implement AWS EC2 Service',
  goal: 'Provision a hardened EC2 instance.',
  status: 'ended',
  startedAt: '2026-10-24T14:00:00.000Z',
  endedAt: '2026-10-24T14:52:00.000Z',
  steps: [
    { text: 'Open the AWS Management Console.', status: 'done', doneAt: '2026-10-24T14:02:00.000Z' },
    { text: 'Create the Terraform file and apply it.', status: 'done', doneAt: '2026-10-24T14:30:00.000Z',
      commands: ['ZKEEPAPPLYZ'], sub: [{ text: 'Initialize first.', commands: ['ZKEEPSUBZ'] }] },
    { text: 'Verify the instance is reachable via SSM.', status: 'current',
      commands: ['ZLEAKCURRENTZ'], validate: 'SSM session opens.', url: 'https://leak-current.example',
      sub: [{ text: 'Open the EC2 console.', commands: ['ZLEAKCURRENTSUBZ'] }] },
    { text: 'Install and configure MariaDB.', status: 'pending',
      commands: ['ZLEAKPENDINGZ'], code: { file: 'db.sh', content: 'echo ZLEAKPENDINGCODEZ' } },
  ],
  events: [],
  shots: [],
}

test('task report lists every step by name (completed and incomplete)', async () => {
  const t = await renderToText(session, { modeLabel: 'Standard' })
  assert.ok(t.includes('CreatetheTerraformfile'), 'completed step title must be listed')
  assert.ok(t.includes('VerifytheinstanceisreachableviaSSM'), 'incomplete (current) step title must be listed')
  assert.ok(t.includes('InstallandconfigureMariaDB'), 'incomplete (pending) step title must be listed')
})

test('task report keeps the detailed how-to of CONFIRMED steps', async () => {
  const t = await renderToText(session, { modeLabel: 'Standard' })
  assert.ok(t.includes('ZKEEPAPPLYZ'), 'confirmed step command must be present')
  assert.ok(t.includes('ZKEEPSUBZ'), 'confirmed step sub-step detail must be present')
})

test('task report NEVER leaks the how-to of steps that were not confirmed', async () => {
  const t = await renderToText(session, { modeLabel: 'Standard' })
  for (const leak of ['ZLEAKCURRENTZ', 'ZLEAKCURRENTSUBZ', 'leak-current.example', 'ZLEAKPENDINGZ', 'ZLEAKPENDINGCODEZ']) {
    assert.ok(!t.includes(leak.replace(/\s+/g, '')), `must not leak "${leak}" from an unperformed step`)
  }
})
