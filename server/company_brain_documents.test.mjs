import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { documentSourceId } from './company_brain_documents.js'

test('one stable source id per document name, so a re-upload replaces it', () => {
  assert.equal(documentSourceId('Expense SOP.txt'), documentSourceId('  expense   sop.TXT '))
  assert.notEqual(documentSourceId('Expense SOP.txt'), documentSourceId('Expense SOP v2.txt'))
  assert.ok(documentSourceId('x'.repeat(500)).length <= 164)
})

test('the upload route never writes the file: no file-system access in the module', () => {
  const src = fs.readFileSync(new URL('./company_brain_documents.js', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /from ['"](node:)?(fs|fs\/promises)['"]/)
})
