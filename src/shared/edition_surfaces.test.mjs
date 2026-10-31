// src/edition/surfaces.js: which links and "start" destinations each edition
// shows, from the edition view (src/edition/useCaps.js editionView).
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeCaps } from '../../server/edition_registry.js'
import { capsFromList } from './edition_caps.js'
import { editionView } from '../edition/useCaps.js'
import { shows, visibleLinks, startPath, CONTACT_PATH } from '../edition/surfaces.js'

const view = (id) => editionView(capsFromList(makeCaps(id).list()))
const LINKS = [{ key: 'how' }, { key: 'enterprise', needs: 'companies' }, { key: 'pricing' }]

test('the default edition shows every link and starts at sign-up, as before', () => {
  assert.deepEqual(visibleLinks(view('all'), LINKS).map((l) => l.key), ['how', 'enterprise', 'pricing'])
  assert.equal(startPath(view('all')), '/workcopilot')
  assert.equal(startPath(undefined), '/workcopilot')
})

test('organizations only: start is the sales conversation; individuals only: no company links', () => {
  assert.equal(startPath(view('saas')), CONTACT_PATH)
  assert.deepEqual(visibleLinks(view('paid'), LINKS).map((l) => l.key), ['how', 'pricing'])
  assert.equal(startPath(view('paid')), '/workcopilot')
})

test('a customer\'s own install (no public site) never points at our sales page', () => {
  for (const id of ['onprem', 'managed']) {
    assert.equal(view(id).publicSite, false)
    assert.equal(startPath(view(id)), '/workcopilot')
  }
})

test('an unknown requirement fails loudly', () => {
  assert.throws(() => shows(view('all'), 'nope'), /unknown surface requirement/)
})
