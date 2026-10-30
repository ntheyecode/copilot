import test from 'node:test'
import assert from 'node:assert/strict'
import { startGateOutcome } from './start_gate.js'

const err = (status, data, message = 'server text') => Object.assign(new Error(message), { status, data })

test('tooManyOpen: the server max, else the plan max, else the server sentence; usage re-read', () => {
  assert.deepEqual(startGateOutcome(err(409, { tooManyOpen: true, maxOpen: 3 })), { key: 'workStart.gateTooManyOpen', vars: { max: 3 }, refresh: true })
  assert.deepEqual(startGateOutcome(err(409, { tooManyOpen: true }), { planMaxOpen: 2 }), { key: 'workStart.gateTooManyOpen', vars: { max: 2 }, refresh: true })
  assert.deepEqual(startGateOutcome(err(409, { tooManyOpen: true })), { message: 'server text', refresh: true })
})

test('outOfHours: company members ask their admin; individuals may add hours', () => {
  assert.deepEqual(startGateOutcome(err(402, { outOfHours: true, resetLabel: 'Nov 1' }), { isCompanyMember: true, canBuyHours: true }),
    { key: 'workStart.gateOutOfHoursCompany', vars: { reset: 'Nov 1' }, act: null, refresh: true })
  assert.deepEqual(startGateOutcome(err(402, { outOfHours: true }), { canBuyHours: true, renewLabel: 'Dec 1' }),
    { key: 'workStart.gateOutOfHours', vars: { reset: 'Dec 1' }, act: 'hours', refresh: true })
})

test('taskLimit, unlicensed member, no plan, and anything else', () => {
  assert.deepEqual(startGateOutcome(err(402, { taskLimit: true, resetLabel: 'Nov 1' })), { key: 'workStart.gateCompanyTaskLimit', vars: { reset: 'Nov 1' } })
  assert.deepEqual(startGateOutcome(err(402, { trialExhausted: true }), { isCompanyMember: true }), { key: 'workStart.gateCompanyTrialUsed', vars: {} })
  assert.deepEqual(startGateOutcome(err(402, {}), { isCompanyMember: true }), { key: 'workStart.gateCompanyNoLicense', vars: {} })
  assert.deepEqual(startGateOutcome(err(402, {})), { needsSub: true })
  assert.deepEqual(startGateOutcome(err(409, { code: 'WORKFLOW_EMPTY' })), { other: true })
  assert.deepEqual(startGateOutcome(new TypeError('Failed to fetch')), { other: true })
})
