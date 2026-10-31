// A small HTTP client for one signed-in identity: its own cookie jar (a
// Playwright APIRequestContext), JSON in, { status, data, headers } out.
// Used for setup and for the API-level scenarios; UI scenarios use pages.
import { request as pwRequest } from '@playwright/test'

export async function apiClient(baseURL, { extraHTTPHeaders } = {}) {
  const ctx = await pwRequest.newContext({ baseURL, extraHTTPHeaders })
  return wrap(ctx)
}

// Wrap any APIRequestContext (e.g. page.context().request, which shares the
// browser's cookies) in the same small interface.
export function wrap(ctx) {
  async function call(method, path, body, headers = {}) {
    const res = await ctx.fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      data: body === undefined ? undefined : body,
      failOnStatusCode: false,
      maxRedirects: 0,
    })
    const ct = res.headers()['content-type'] || ''
    let data = null
    if (ct.includes('application/json')) { try { data = await res.json() } catch { data = null } }
    else if (/^text\//.test(ct)) { data = await res.text() }
    else { data = await res.body() }
    return { status: res.status(), data, headers: res.headers() }
  }
  const api = {
    ctx,
    get: (p, h) => call('GET', p, undefined, h),
    post: (p, b = {}, h) => call('POST', p, b, h),
    patch: (p, b = {}, h) => call('PATCH', p, b, h),
    put: (p, b = {}, h) => call('PUT', p, b, h),
    del: (p, b, h) => call('DELETE', p, b, h),
    async login(username, password) {
      const r = await call('POST', '/api/work/login', { username, password })
      if (r.status !== 200 || !r.data || !r.data.user) throw new Error(`login ${username} failed: ${r.status} ${JSON.stringify(r.data)}`)
      api.user = r.data.user
      return r.data.user
    },
    dispose: () => ctx.dispose(),
  }
  return api
}
