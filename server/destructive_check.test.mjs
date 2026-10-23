// Destructive-step detector: plan steps whose command would irreversibly delete,
// overwrite or disrupt are flagged so the app can require a deliberate acknowledge.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { destructiveCheck } from './work.js'

test('flags irreversible/disruptive commands', () => {
  const cases = [
    ['rm -rf /var/data'],
    ['sudo rm -rf ~/project'],
    ['DROP TABLE users;'],
    ['DELETE FROM orders'],            // no WHERE
    ['git push --force origin main'],
    ['git reset --hard HEAD~3'],
    ['kubectl delete deployment api'],
    ['terraform destroy -auto-approve'],
    ['shutdown -h now'],
    ['mkfs.ext4 /dev/sdb'],
    ['chmod -R 777 /etc'],
  ]
  for (const c of cases) {
    const r = destructiveCheck(c, null)
    assert.equal(r.destructive, true, `should flag: ${c[0]}`)
    assert.ok(r.why && r.why.length > 3, `should give a reason for: ${c[0]}`)
  }
})

test('does NOT flag safe commands', () => {
  const safe = [
    ['ls -la'],
    ['git status'],
    ['DELETE FROM orders WHERE id = 5'],   // scoped delete
    ['npm install'],
    ['cat README.md'],
    ['kubectl get pods'],
  ]
  for (const c of safe) {
    assert.equal(destructiveCheck(c, null).destructive, false, `should NOT flag: ${c[0]}`)
  }
})

test('checks code bodies too, and empty is safe', () => {
  assert.equal(destructiveCheck([], { content: 'db.collection.drop()' }).destructive, false) // not in pattern list (js api) - stays safe
  assert.equal(destructiveCheck([], { content: 'DROP DATABASE prod;' }).destructive, true)
  assert.equal(destructiveCheck([], null).destructive, false)
  assert.equal(destructiveCheck(null, null).destructive, false)
})
