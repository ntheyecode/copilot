// Recommended Practices - phase 3: the pure outcome-ranking core.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { smoothedRate, practiceScore, rankSuggestions } from './practice_stats.js'

test('smoothedRate: prior with no trials, approaches raw with evidence', () => {
  assert.equal(smoothedRate(0, 0, 0.35, 4), 0.35)                 // no data -> prior
  assert.ok(Math.abs(smoothedRate(10, 10, 0.35, 4) - (10 + 1.4) / 14) < 1e-9)
  // Heavy evidence pulls toward the raw rate.
  assert.ok(smoothedRate(90, 100, 0.35, 4) > 0.85)
})

test('practiceScore: platform prior orders a fresh company, org history overrides', () => {
  // No org data: scores track the platform accept prior.
  const platform = { pop: { offered: 100, accepted: 90, completed: 80 }, dud: { offered: 100, accepted: 5, completed: 1 } }
  const hi = practiceScore(undefined, platform.pop)
  const lo = practiceScore(undefined, platform.dud)
  assert.ok(hi > lo, 'platform-popular practice scores higher for a new company')
  // Org history that contradicts the platform wins once it is substantial.
  const orgLovesDud = practiceScore({ offered: 40, accepted: 38, completed: 30 }, platform.dud)
  assert.ok(orgLovesDud > lo, 'strong org acceptance lifts a platform-unpopular practice')
})

test('rankSuggestions: reorders by score, is stable, never adds or drops', () => {
  const suggestions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const platformStats = {
    a: { offered: 50, accepted: 5, completed: 1 },    // unpopular
    b: { offered: 50, accepted: 45, completed: 40 },  // popular
    c: { offered: 50, accepted: 25, completed: 12 },  // middling
  }
  const ranked = rankSuggestions(suggestions, { platformStats })
  assert.deepEqual(ranked.map((s) => s.id), ['b', 'c', 'a'])
  assert.equal(ranked.length, suggestions.length)                 // none added/dropped
  // Stable tiebreak: equal (empty) stats keep incoming order.
  const tie = rankSuggestions(suggestions, {})
  assert.deepEqual(tie.map((s) => s.id), ['a', 'b', 'c'])
})
