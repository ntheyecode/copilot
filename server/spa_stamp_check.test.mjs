// The startup check that the built SPA carries this server's capability stamp.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeCaps } from './edition_registry.js'
import { spaStampProblem } from './spa_stamp_check.js'

const stamped = (list) => `<html><head><meta charset="UTF-8" />\n<meta name="wcp-capabilities" content="${list.join(',')}" data-origin="https://x.test" /></head></html>`
const plain = '<html><head><meta charset="UTF-8" /></head></html>'

test('an unstamped build is right only for the default edition', () => {
  assert.equal(spaStampProblem(plain, makeCaps('all').list()), null)
  assert.match(spaStampProblem(plain, makeCaps('paid').list()), /stamped for \[nothing.*stamp:spa/)
})

test('a matching stamp passes; another edition\'s stamp is reported with the fix', () => {
  assert.equal(spaStampProblem(stamped(makeCaps('saas').list()), makeCaps('saas').list()), null)
  assert.match(spaStampProblem(stamped(makeCaps('saas').list()), makeCaps('paid').list()), /but this server runs \[solo_signup,paid_only/)
  // order of the server's list does not matter
  assert.equal(spaStampProblem(stamped(makeCaps('paid').list()), [...makeCaps('paid').list()].reverse()), null)
})
