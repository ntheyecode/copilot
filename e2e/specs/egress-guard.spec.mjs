// The browser network guard itself: a local page that redirects to a third-party
// host must be caught. context.route() alone does not see redirect hops, so this
// failed before guardBrowserEgress also checked every request (redirects included).
import http from 'node:http'
import { test, expect } from '@playwright/test'
import { guardBrowserEgress } from '../pages/browser-egress.mjs'

test('a redirect to a third-party host is caught by the browser guard', async ({ browser }) => {
  const srv = http.createServer((req, res) => {
    res.writeHead(302, { Location: 'https://third-party.example/collect?x=1' })
    res.end()
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  const context = await browser.newContext()
  try {
    const blocked = await guardBrowserEgress(context)
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${srv.address().port}/go`).catch(() => {})
    expect(blocked.join('\n')).toContain('https://third-party.example/collect')
  } finally {
    await context.close()
    await new Promise((r) => srv.close(r))
  }
})
