// A client for a server running in hosted mode (WORK_HOSTED=1) behind a TLS
// proxy, the way production runs: every request says it arrived over https
// (X-Forwarded-Proto, honored because hosted mode trusts one proxy hop), and
// the cookie jar keeps the Secure session cookie the server then sets.
export function hostedClient(baseURL) {
  const jar = new Map()
  async function call(method, path, body, headers = {}) {
    const h = { 'content-type': 'application/json', 'x-forwarded-proto': 'https', ...headers }
    if (jar.size) h.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
    const res = await fetch(baseURL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' })
    for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const nv = c.split(';')[0]; const i = nv.indexOf('=')
      if (i > 0) jar.set(nv.slice(0, i), nv.slice(i + 1))
    }
    let data = null
    try { data = await res.json() } catch { /* empty or binary */ }
    return { status: res.status, data, headers: Object.fromEntries(res.headers) }
  }
  return {
    get: (p, h) => call('GET', p, undefined, h),
    post: (p, b = {}, h) => call('POST', p, b, h),
    cookies: () => new Map(jar),
  }
}
