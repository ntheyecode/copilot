import test from 'node:test'
import assert from 'node:assert/strict'
import { sessionIdForSwitch } from './work_switch_scope.js'

test('only a work-session route names the session a model switch belongs to', () => {
  assert.equal(sessionIdForSwitch({ originalUrl: '/api/work/sessions/abc/plan', params: { id: 'abc' } }), 'abc')
  assert.equal(sessionIdForSwitch({ originalUrl: '/api/work/projects/p1/tasks/t1/expand', params: { id: 'p1' } }), null)
  assert.equal(sessionIdForSwitch({ originalUrl: '/api/work/workflows/w1/steps/s1/read', params: { id: 'w1' } }), null)
  assert.equal(sessionIdForSwitch({ originalUrl: '/api/work/transcribe', params: {} }), null)
  assert.equal(sessionIdForSwitch(null), null)
})
