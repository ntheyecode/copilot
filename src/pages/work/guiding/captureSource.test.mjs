// The capture-source rules the guiding console applies (who is offered the
// camera, where a session starts reading, how a camera failure is explained).
import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraOffered, cameraLockReason, sourceOptions, defaultSource, cameraConstraints, cameraErrorKind, shouldRetryWithoutDevice, isCameraOff, CAMERA_ERROR_KEYS } from './captureSource.js'

const solo = { id: 'u1', cameraCapture: true }
const memberOff = { id: 'u2', companyId: 'c1', cameraCapture: false }
const memberOn = { id: 'u3', companyId: 'c1', cameraCapture: true }

test('the camera is offered on the user grant; a company member without it reads a managed lock', () => {
  assert.equal(cameraOffered({ user: solo }), true)
  assert.equal(cameraOffered({ user: memberOn }), true)
  assert.equal(cameraOffered({ user: memberOff }), false)
  assert.equal(cameraOffered({ user: memberOff, mobile: true }), false, 'a phone does not bypass the company switch')
  assert.equal(cameraOffered({ user: null, mobile: true }), true, 'a phone with no user object still has its camera')
  assert.deepEqual(sourceOptions({ user: solo }), ['screen', 'camera'])
  assert.deepEqual(sourceOptions({ user: memberOff }), ['screen'])
  assert.equal(cameraLockReason({ user: memberOff }), 'managed')
  assert.equal(cameraLockReason({ user: solo }), null)
})

test('a session starts on the remembered source only while it is allowed; phones default to the camera', () => {
  assert.equal(defaultSource({ user: solo }), 'screen')
  assert.equal(defaultSource({ user: solo, stored: 'camera' }), 'camera')
  assert.equal(defaultSource({ user: memberOff, stored: 'camera' }), 'screen', 'the admin turned it off since')
  assert.equal(defaultSource({ user: solo, mobile: true }), 'camera')
  assert.equal(defaultSource({ user: solo, mobile: true, stored: 'screen' }), 'screen')
  assert.equal(defaultSource({ user: memberOff, mobile: true }), 'screen')
})

test('camera constraints read text on another screen and pin the chosen device exactly', () => {
  const any = cameraConstraints('')
  assert.equal(any.audio, false)
  assert.equal(any.video.width.ideal, 1920)
  assert.equal(any.video.facingMode.ideal, 'environment')
  const picked = cameraConstraints('cam-2')
  assert.deepEqual(picked.video.deviceId, { exact: 'cam-2' })
  assert.equal(picked.video.facingMode, undefined)
})

test('getUserMedia failures map to actionable kinds, each with a catalog key', () => {
  assert.equal(cameraErrorKind({ name: 'NotAllowedError' }), 'denied')
  assert.equal(cameraErrorKind({ name: 'NotFoundError' }), 'none')
  assert.equal(cameraErrorKind({ name: 'OverconstrainedError' }), 'none')
  assert.equal(cameraErrorKind({ name: 'NotReadableError' }), 'busy')
  assert.equal(cameraErrorKind(new Error('x')), 'other')
  for (const k of ['denied', 'none', 'busy', 'other']) assert.match(CAMERA_ERROR_KEYS[k], /^guideConsole\./)
  assert.equal(shouldRetryWithoutDevice({ name: 'OverconstrainedError' }, 'cam-2'), true)
  assert.equal(shouldRetryWithoutDevice({ name: 'OverconstrainedError' }, ''), false)
  assert.equal(shouldRetryWithoutDevice({ name: 'NotAllowedError' }, 'cam-2'), false)
})

test('only the server refusal code is a camera-off', () => {
  assert.equal(isCameraOff({ status: 403, data: { code: 'CAMERA_OFF' } }), true)
  assert.equal(isCameraOff({ status: 403, data: { error: 'nope' } }), false)
  assert.equal(isCameraOff({ status: 500, data: { code: 'CAMERA_OFF' } }), false)
  assert.equal(isCameraOff(null), false)
})
