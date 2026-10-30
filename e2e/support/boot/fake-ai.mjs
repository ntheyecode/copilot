// Deterministic fake AI provider (OpenAI-compatible) for E2E.
//
// The server's provider calls are redirected here by net-fakes.mjs as
// http://127.0.0.1:<port>/<original host>/<original path>. The fake answers:
//   GET  .../models                -> a small model catalog
//   POST .../chat/completions      -> a canned answer chosen by the call's KIND
//   POST .../audio/transcriptions  -> a fixed transcript
// The kind is read from the prompt (see responders.mjs). Tests can push extra
// rules (ai.script) that win over the defaults, and read back every call (ai.calls)
// to prove WHICH AI ran (SUPREME RULE III: verify the requested AI actually fired).
import http from 'node:http'
import { classify, defaultAnswer } from './responders.mjs'

export function startFakeAi() {
  const calls = []
  let rules = []

  function pickRule(kind, text) {
    for (const r of rules) {
      if (r.times != null && r.times <= 0) continue
      if (r.kind && r.kind !== kind) continue
      if (r.match && !new RegExp(r.match, 'i').test(text)) continue
      if (r.times != null) r.times -= 1
      return r
    }
    return null
  }

  const srv = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', async () => {
      const [, host, ...rest] = req.url.split('/')
      const path = '/' + rest.join('/')
      const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)) }
      try {
        if (req.method === 'GET' && /\/models\/?(\?|$)/.test(path)) {
          calls.push({ host, path, kind: 'models', at: Date.now() })
          return send(200, { object: 'list', data: ['gpt-4o-mini', 'gpt-4o'].map((id) => ({ id, object: 'model', owned_by: 'e2e' })) })
        }
        if (/audio\/transcriptions/.test(path)) {
          calls.push({ host, path, kind: 'transcribe', at: Date.now() })
          const r = pickRule('transcribe', '')
          if (r && r.status) return send(r.status, { error: { message: r.error || 'scripted failure' } })
          return send(200, { text: (r && r.content) || 'Open the billing page. Click Save.', segments: [] })
        }
        if (/chat\/completions/.test(path)) {
          const body = raw ? JSON.parse(raw) : {}
          const { text, images } = flatten(body.messages || [])
          const kind = classify(text, images)
          const rule = pickRule(kind, text)
          calls.push({ host, path, kind, model: body.model, images, at: Date.now(), excerpt: text.slice(0, 160), scripted: !!rule })
          if (rule && rule.delayMs) await new Promise((r) => setTimeout(r, rule.delayMs))
          if (rule && rule.status) return send(rule.status, { error: { message: rule.error || 'scripted failure', type: 'e2e' } })
          const answer = rule && rule.content !== undefined ? rule.content : defaultAnswer(kind, text)
          const content = typeof answer === 'string' ? answer : JSON.stringify(answer)
          return send(200, {
            id: `chatcmpl-e2e-${calls.length}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: body.model || 'gpt-4o-mini',
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
            usage: { prompt_tokens: Math.ceil(text.length / 4), completion_tokens: Math.ceil(content.length / 4), total_tokens: Math.ceil((text.length + content.length) / 4) },
          })
        }
        calls.push({ host, path, kind: 'unknown', at: Date.now() })
        return send(404, { error: { message: `E2E fake provider has no route for ${req.method} ${path}` } })
      } catch (e) {
        return send(500, { error: { message: `E2E fake provider error: ${e.message}` } })
      }
    })
  })

  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve({
      port: srv.address().port,
      script(newRules) { rules = [...(Array.isArray(newRules) ? newRules : [newRules]), ...rules]; return rules.length },
      reset() { rules = []; calls.length = 0; return true },
      calls(kind) { return calls.filter((c) => !kind || c.kind === kind) },
      close: () => new Promise((r) => srv.close(r)),
    }))
  })
}

function flatten(messages) {
  let text = ''
  let images = 0
  for (const m of messages) {
    if (typeof m.content === 'string') text += `\n[${m.role}] ${m.content}`
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === 'text') text += `\n[${m.role}] ${part.text}`
        else if (part.type === 'image_url') images += 1
      }
    }
  }
  return { text, images }
}
