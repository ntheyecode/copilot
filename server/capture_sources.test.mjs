import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraAllowed, cameraRefusal, captureSourceOf } from './capture_sources.js'

test('the camera is on for personal accounts and off for a company until its admin turns it on', () => {
  assert.equal(cameraAllowed({ user: { id: 'u1' } }), true)
  assert.equal(cameraAllowed({ user: { id: 'u2', companyId: 'c1' }, company: { id: 'c1' } }), false)
  assert.equal(cameraAllowed({ user: { id: 'u2', companyId: 'c1' }, company: { id: 'c1', cameraCapture: true } }), true)
  assert.equal(cameraAllowed({}), false)
})

test('only a camera request can be refused, and the refusal says what to do', () => {
  const member = { user: { id: 'u2', companyId: 'c1' }, company: { id: 'c1' } }
  assert.equal(cameraRefusal({ source: 'screen', ...member }), null)
  assert.equal(cameraRefusal({ source: undefined, ...member }), null)
  const r = cameraRefusal({ source: 'camera', ...member })
  assert.equal(r.code, 'CAMERA_OFF')
  assert.match(r.error, /company admin/)
  assert.equal(captureSourceOf('CAMERA'), 'camera')
  assert.equal(captureSourceOf('webcam'), 'screen')
})
