// Workflow matching in non-Latin scripts (goal_tokens.js through
// workflow_playback.pickPublishedWorkflow and work.workflowGoalSignature).
// Before goal_tokens.js the tokenizer kept [a-z0-9] only, so every one of these
// goals reduced to the product name (or to nothing) and never matched its
// workflow. Real sentences, as an employee would type them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pickPublishedWorkflow } from './workflow_playback.js'
import { workflowGoalSignature, matchWorkflowTemplate } from './work.js'
import { goalTokens, legacyGoalTokens, hasSegmenter } from './goal_tokens.js'

const wf = (id, title, productName = 'Okta') => ({ id, state: 'published', meta: { title, productName }, steps: [{ instruction: 'Open' }] })

// lang: [goal naming the product, the workflow title, an unrelated workflow title, an unrelated goal]
const CASES = {
  ja: ['Oktaで新しいユーザーを作成する方法', '新しいユーザーを作成', '経費精算書を提出する', 'ノートパソコンのパスワードをリセットしたい'],
  zh: ['如何在Okta中创建新用户', '创建新用户', '提交报销单', '我想重置笔记本电脑的密码'],
  'zh-Hant': ['如何在Okta中建立新使用者', '建立新使用者', '提交報銷單', '我想重設筆記型電腦的密碼'],
  ko: ['Okta에서 새 사용자 계정을 생성하는 방법', '새 사용자 계정 생성', '경비 보고서 제출', '노트북 비밀번호를 재설정하고 싶어요'],
  ar: ['كيفية إنشاء مستخدم جديد في Okta', 'إنشاء مستخدم جديد', 'تقديم تقرير المصروفات', 'أريد إعادة تعيين كلمة مرور الحاسوب المحمول'],
  hi: ['Okta में नया उपयोगकर्ता कैसे बनाएं', 'नया उपयोगकर्ता बनाएं', 'खर्च रिपोर्ट जमा करें', 'मुझे लैपटॉप का पासवर्ड रीसेट करना है'],
  th: ['วิธีสร้างผู้ใช้ใหม่ใน Okta', 'สร้างผู้ใช้ใหม่', 'ส่งรายงานค่าใช้จ่าย', 'ฉันต้องการรีเซ็ตรหัสผ่านแล็ปท็อป'],
  ru: ['Как создать нового пользователя в Okta', 'Создать нового пользователя', 'Отправить отчёт о расходах', 'Хочу сбросить пароль на ноутбуке'],
}

test('Intl.Segmenter is available on this runtime (word segmentation for CJK and Thai)', () => {
  assert.equal(hasSegmenter(), true)
})

for (const [lang, [goal, title, otherTitle, unrelated]] of Object.entries(CASES)) {
  test(`${lang}: the goal finds its workflow as a strong match, ahead of an unrelated one`, () => {
    const m = pickPublishedWorkflow({ goal }, [wf('other', otherTitle), wf('mine', title)])
    assert.equal(m.tier, 'strong', `${lang}: ${JSON.stringify(goalTokens(goal))} vs ${JSON.stringify(goalTokens(title))}`)
    assert.equal(m.workflow.id, 'mine')
  })
  test(`${lang}: without the product named it is a partial match; an unrelated goal is none`, () => {
    assert.equal(pickPublishedWorkflow({ goal: title }, [wf('mine', title)]).tier, 'partial')
    const none = pickPublishedWorkflow({ goal: unrelated }, [wf('mine', title)])
    assert.equal(none.tier, 'none', `${lang}: ${JSON.stringify(goalTokens(unrelated))}`)
    assert.equal(none.workflow, null)
  })
  test(`${lang}: the goal keeps its task words (the old tokenizer kept none of them)`, () => {
    const t = workflowGoalSignature(goal).tokens.filter((x) => x !== 'okta')
    assert.ok(t.length >= 2, JSON.stringify(t))
  })
}

test('function words are dropped per language; Korean particles and Arabic articles are removed', () => {
  assert.ok(!goalTokens('Oktaで新しいユーザーを作成する方法').some((t) => ['で', 'を', 'する', '方法'].includes(t)))
  assert.ok(!goalTokens('如何在Okta中创建新用户').some((t) => ['如何', '在', '中'].includes(t)))
  assert.deepEqual(goalTokens('사용자를'), goalTokens('사용자'))
  assert.deepEqual(goalTokens('المستخدم'), goalTokens('مستخدم'))
  assert.ok(!goalTokens('Как создать нового пользователя в Okta').includes('в'))
})

test('a product named in a non-Latin script is the app signal (normalizeApp keeps it)', () => {
  const w = wf('f', '経費精算書を提出', 'freee会計')
  const m = pickPublishedWorkflow({ goal: 'freee会計で経費精算書を提出する' }, [w])
  assert.equal(m.tier, 'strong')
  const ru = wf('r', 'Оформить командировку', 'СберБизнес')
  assert.equal(pickPublishedWorkflow({ goal: 'Оформить командировку в СберБизнес' }, [ru]).tier, 'strong')
})

test('without Intl.Segmenter, CJK and Thai fall back to character bigrams', () => {
  const t = goalTokens('创建新用户', { useSegmenter: false })
  assert.deepEqual(t, ['创建', '建新', '新用', '用户'])
  const th = goalTokens('สร้างผู้ใช้', { useSegmenter: false })
  assert.ok(th.length >= 2 && th.every((x) => !/^\p{M}/u.test(x)), JSON.stringify(th))   // never starts on a bare mark
})

test('the tokenizer is stable on its own output (stored signatures re-tokenize to the same tokens)', () => {
  for (const [goal, title] of Object.values(CASES)) {
    for (const s of [goal, title]) {
      const t = goalTokens(s)
      assert.deepEqual(goalTokens(t.join(' ')), t, s)
    }
  }
})

test('templates stored by the old [a-z0-9] tokenizer match no worse than before', () => {
  // "Créer un utilisateur" was stored as "cr er un utilisateur", app "freee会計" as "freee".
  const legacy = { id: 'old', goalSig: 'cr er un utilisateur', app: 'freee', environment: {}, steps: [] }
  const m = matchWorkflowTemplate('Créer un utilisateur', 'freee会計', {}, [legacy])
  assert.equal(m.tier, 'strong')
  assert.equal(m.score, 0.925)
  assert.deepEqual(legacyGoalTokens('Créer un utilisateur'), ['cr', 'er', 'un', 'utilisateur'])
})

test('ASCII goals tokenize exactly as before', () => {
  for (const s of ["Deactivate a former employee's Okta account.", 'File my 2024 taxes in TurboTax v3 x', 'Reset the VPN password for user@example.com https://x.io/a']) {
    assert.deepEqual(goalTokens(s), legacyGoalTokens(s), s)
  }
  assert.deepEqual(workflowGoalSignature("Deactivate a former employee's Okta account.").tokens, ['deactivate', 'former', 'employee', 'okta', 'account'])
  assert.deepEqual(workflowGoalSignature('File my 2024 taxes in TurboTax v3 x').tokens, ['file', 'taxe', 'turbotax'])
})
