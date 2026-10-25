// "Validate it live" search log: every query + AI response a visitor submits at
// the public widget must be logged against their lead and surface in the
// superadmin leads listing (listWorkLeads = what GET /api/work/admin/leads
// returns). Newest first, with timestamps. Covers the captured-lead path and the
// anon-before-capture path (searches attach when the visitor converts).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-leadsearch-'))
process.env.PORT = '0'
const store = await import(storePath)

const findLead = (id) => store.listWorkLeads({ limit: 2000 }).find((l) => l.id === id)

test('a query + AI response is logged against the lead and returned in the superadmin listing', () => {
  const { id } = store.addWorkLead({ firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@acme.test', phone: '+15550100100', company: 'Acme' }, { ip: '1.2.3.4' })
  store.recordWorkLeadSearch({ leadId: id, query: 'Set up a VPC on AWS and lock it down', response: 'Covered. WorkCoPilot guides you step by step: create the VPC, subnets, then the security groups.' })

  const lead = findLead(id)
  assert.ok(lead, 'the lead is in the superadmin listing')
  assert.ok(Array.isArray(lead.searches) && lead.searches.length === 1, 'exactly one search is logged against the lead')
  const s = lead.searches[0]
  assert.equal(s.query, 'Set up a VPC on AWS and lock it down', 'the submitted query text is stored')
  assert.ok(/guides you step by step/.test(s.response), 'the AI response TEXT is stored against the lead')
  assert.ok(s.at, 'the search carries a timestamp')
})

test('multiple searches are ALL kept against one lead, newest first', () => {
  const { id } = store.addWorkLead({ firstName: 'Sam', lastName: 'Lee', email: 'sam@acme.test', phone: '+15550100101', company: 'Acme' })
  store.recordWorkLeadSearch({ leadId: id, query: 'first task', response: 'answer one' })
  store.recordWorkLeadSearch({ leadId: id, query: 'second task', response: 'answer two' })

  const lead = findLead(id)
  assert.equal(lead.searches.length, 2, 'both searches are kept')
  assert.equal(lead.searches[0].query, 'second task', 'newest search is first')
  assert.equal(lead.searches[1].query, 'first task', 'older search follows')
})

test('searches submitted before capture attach to the lead when they convert', () => {
  const anonId = 'anon-xyz-123'
  store.recordWorkLeadSearch({ anonId, query: 'pre-capture task', response: 'pre-capture answer' })
  const { id } = store.addWorkLead({ firstName: 'Pat', lastName: 'Kim', email: 'pat@acme.test', phone: '+15550100102', company: 'Acme' }, { anonId })

  const lead = findLead(id)
  assert.ok(lead.searches.some((x) => x.query === 'pre-capture task' && /pre-capture answer/.test(x.response)),
    'the pre-capture search is attached to the lead on conversion and visible to the superadmin')
})

test('per-lead search log is capped so it cannot grow without limit', () => {
  const { id } = store.addWorkLead({ firstName: 'Cap', lastName: 'Test', email: 'cap@acme.test', phone: '+15550100103', company: 'Acme' })
  for (let i = 0; i < 60; i++) store.recordWorkLeadSearch({ leadId: id, query: `task ${i}`, response: `answer ${i}` })
  const lead = findLead(id)
  assert.ok(lead.searches.length <= 50, 'the log is capped at 50 entries')
  assert.equal(lead.searches[0].query, 'task 59', 'the newest entry is retained at the top')
})
