// Task overview: the rich "what you'll be doing" description. The planner supplies
// it (kept verbatim); a task without one gets a derived overview with the project
// name + emphasis markers; a session falls back to its goal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-ovt-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('task overview: AI kept, derived has project name + markers, session falls back', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const pm = store.createManagedUser({ username: uniq('pm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const p = store.createCompanyProject(pm.id, {
    name: 'Portal', goal: 'launch the portal end to end',
    tasks: [
      { title: 'A', goal: 'register the domain', doneState: 'HTTPS padlock', overview: '**Register the domain** and install the cert. ==Done when HTTPS works==.' },
      { title: 'B', goal: 'migrate the articles', doneState: 'all links resolve' },   // no overview -> derived
    ],
  })
  assert.equal(p.tasks[0].overview, '**Register the domain** and install the cert. ==Done when HTTPS works==.', 'AI overview kept verbatim')
  const d = p.tasks[1].overview
  assert.ok(d.includes('**Portal**'), 'derived overview names the project')
  assert.ok(d.includes('**migrate the articles**') && d.includes('==done when all links resolve=='), 'derived overview has emphasis + done-state')

  // Manual mid-journey add -> derived overview too.
  const inj = store.injectWorkProjectTask(pm.id, p.id, { request: 'export the final report', doneState: 'report downloaded' })
  assert.ok(inj.created && inj.created.overview.includes('**export the final report**'), 'injected task gets a derived overview')

  // Session fallback from the goal when the planner gave none.
  const s = store.createWorkSession(pm.id, { goal: 'reconcile the October statement' })
  store.setWorkSessionOverview(pm.id, s.id, '')
  assert.equal(store.getWorkSession(pm.id, s.id).overview, '**reconcile the October statement**.', 'session overview falls back to the goal')
  store.setWorkSessionOverview(pm.id, s.id, '**Do the thing** across ==three systems==.')
  assert.equal(store.getWorkSession(pm.id, s.id).overview, '**Do the thing** across ==three systems==.', 'session overview kept when supplied')
})
