// Output safety (AI-06). Model output is rendered by React as TEXT nodes (no
// dangerouslySetInnerHTML anywhere in src/), and the text helpers that prepare
// guidance never create or decode markup. So script / onerror / javascript:
// payloads in model output stay inert text. Two layers are proven here:
//   1. A static guard: no HTML-injection sink exists in the client source, so a
//      future change that adds one fails this test (the class, not the instance).
//   2. The pure text preparation (scrubGuidance / scrubForRender): payloads pass
//      through as the same inert characters, with no markup added and no HTML
//      entities decoded back into tags.
// renderRich (LiveValidate.jsx) is a private JSX helper that only emits React
// text / <strong> / <code> elements from plain strings, so React escaping covers
// it; the static guard below is what protects it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubGuidance, scrubForRender } from './ai_language.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(here, '..', 'src')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

test('client source has no HTML-injection or dynamic-code sink', () => {
  const files = walk(srcDir)
  assert.ok(files.length > 10, 'sanity: found the client source files')
  const sinks = [
    { name: 'dangerouslySetInnerHTML', re: /dangerouslySetInnerHTML/ },
    { name: '.innerHTML =', re: /\.(?:inner|outer)HTML\s*(?:\+)?=/ },
    { name: 'insertAdjacentHTML', re: /insertAdjacentHTML/ },
    // document.write is only tolerated with a pure string-literal argument (no
    // concatenation, no template interpolation, no variable). The one existing use
    // writes a fixed blank skeleton into the app's own pop-out window (WorkPage).
    { name: 'document.write (non-literal)', re: /document\.write\s*\((?!\s*(?:'[^'$+\\]*'|"[^"$+\\]*")\s*\))/ },
    { name: 'eval(', re: /(?<![\w.])eval\s*\(/ },
    { name: 'new Function(', re: /new Function\s*\(/ },
  ]
  const hits = []
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8')
    for (const s of sinks) if (s.re.test(text)) hits.push(`${s.name} in ${path.relative(srcDir, f)}`)
  }
  assert.deepEqual(hits, [], 'no injection sinks: ' + hits.join('; '))
})

const PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '[click](javascript:alert(1))',
  '<a href="javascript:alert(1)">x</a>',
  '<iframe src="javascript:alert(1)"></iframe>',
]

test('text preparation adds no markup: no more < or > in the output than the input had', () => {
  for (const p of PAYLOADS) {
    for (const fn of [scrubGuidance, scrubForRender]) {
      const input = 'Run the check. ' + p + ' Then continue.'
      const out = fn(input)
      assert.ok((out.match(/</g) || []).length <= (input.match(/</g) || []).length, `no extra "<" from ${fn.name} on ${p}`)
      assert.ok((out.match(/>/g) || []).length <= (input.match(/>/g) || []).length, `no extra ">" from ${fn.name} on ${p}`)
    }
  }
})

test('HTML entities are NOT decoded back into live tags', () => {
  const encoded = '&lt;script&gt;alert(1)&lt;/script&gt; and &#60;img onerror=alert(1)&#62;'
  for (const fn of [scrubGuidance, scrubForRender]) {
    const out = fn(encoded)
    assert.ok(!/<\s*script/i.test(out) && !/<\s*img/i.test(out), `${fn.name} must not decode entities into tags`)
  }
})

test('payloads stay inert text and inline code spans are preserved verbatim', () => {
  const g = scrubGuidance('Paste `<img src=x onerror=alert(1)>` into the test page.')
  assert.ok(g.includes('`<img src=x onerror=alert(1)>`'), 'code span kept exactly as text')
  const t = scrubGuidance('Result: <script>alert(1)</script>')
  assert.ok(t.includes('alert(1)'), 'text still present as plain characters (React renders it escaped)')
})

test('javascript: URLs are never rewritten into something navigable', () => {
  const out = scrubGuidance('See [docs](javascript:alert(1)) for details.')
  assert.ok(!/href\s*=/i.test(out), 'no href attribute is produced')
  assert.ok(!/<a\b/i.test(out), 'no anchor element is produced')
})
