// Mock OpenID Connect provider for E2E. Its issuer is https://FAKE_IDP_HOST (the
// product requires an https issuer); the server reaches it through net-fakes.mjs
// (fetch to that host lands here) and the browser through
// e2e/pages/idp-route.mjs (the start redirect is pointed at this port).
//
//   GET  /.well-known/openid-configuration   discovery
//   GET  /jwks                               the RS256 public key
//   GET  /authorize                          signs in the configured person at
//                                            once and redirects back with a code
//   POST /token                              checks client id + secret, the
//                                            redirect URI and the PKCE verifier,
//                                            and returns a signed id_token
// configure({ email, mode }): who signs in; mode 'tamper' signs the id_token with
// a key that is NOT the published one (the product must refuse it).
import http from 'node:http'
import crypto from 'node:crypto'

export const FAKE_IDP_HOST = 'idp.e2e-sso.net'
export const FAKE_IDP_ISSUER = `https://${FAKE_IDP_HOST}`
export const FAKE_IDP_CLIENT = Object.freeze({ clientId: 'e2e-oidc-client', clientSecret: 'e2e-oidc-secret-value' })

const b64u = (b) => Buffer.from(b).toString('base64url')

export function startFakeOidc() {
  const calls = []
  const codes = new Map()
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const rogue = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
  const kid = 'e2e-key-1'
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }
  let person = { email: '', mode: 'ok' }

  const sign = (claims) => {
    const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }))
    const body = b64u(JSON.stringify(claims))
    const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), person.mode === 'tamper' ? rogue : privateKey)
    return `${head}.${body}.${b64u(sig)}`
  }

  const srv = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      const url = new URL(req.url, FAKE_IDP_ISSUER)
      calls.push({ method: req.method, path: url.pathname, at: Date.now() })
      const json = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)) }
      if (url.pathname === '/.well-known/openid-configuration') {
        return json(200, {
          issuer: FAKE_IDP_ISSUER,
          authorization_endpoint: `${FAKE_IDP_ISSUER}/authorize`,
          token_endpoint: `${FAKE_IDP_ISSUER}/token`,
          jwks_uri: `${FAKE_IDP_ISSUER}/jwks`,
          response_types_supported: ['code'],
          id_token_signing_alg_values_supported: ['RS256'],
          code_challenge_methods_supported: ['S256'],
        })
      }
      if (url.pathname === '/jwks') return json(200, { keys: [jwk] })
      if (url.pathname === '/authorize') {
        const q = url.searchParams
        if (q.get('client_id') !== FAKE_IDP_CLIENT.clientId) return json(400, { error: 'unauthorized_client' })
        if (q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) return json(400, { error: 'invalid_request', error_description: 'PKCE S256 is required' })
        if (!person.email) return json(400, { error: 'access_denied', error_description: 'no test person configured' })
        const code = crypto.randomBytes(16).toString('base64url')
        codes.set(code, { redirectUri: q.get('redirect_uri'), challenge: q.get('code_challenge'), nonce: q.get('nonce'), email: person.email })
        const back = new URL(q.get('redirect_uri'))
        back.searchParams.set('code', code)
        back.searchParams.set('state', q.get('state') || '')
        res.writeHead(302, { location: back.toString() })
        return res.end()
      }
      if (url.pathname === '/token' && req.method === 'POST') {
        const f = new URLSearchParams(raw)
        const c = codes.get(f.get('code') || '')
        codes.delete(f.get('code') || '')
        if (!c) return json(400, { error: 'invalid_grant' })
        if (f.get('client_id') !== FAKE_IDP_CLIENT.clientId || f.get('client_secret') !== FAKE_IDP_CLIENT.clientSecret) return json(401, { error: 'invalid_client' })
        if (f.get('redirect_uri') !== c.redirectUri) return json(400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' })
        const verifier = f.get('code_verifier') || ''
        if (crypto.createHash('sha256').update(verifier).digest('base64url') !== c.challenge) return json(400, { error: 'invalid_grant', error_description: 'PKCE verification failed' })
        const now = Math.floor(Date.now() / 1000)
        const idToken = sign({ iss: FAKE_IDP_ISSUER, aud: FAKE_IDP_CLIENT.clientId, sub: `e2e|${c.email}`, email: c.email, email_verified: true, nonce: c.nonce, iat: now, exp: now + 300 })
        calls[calls.length - 1].pkce = 'ok'
        return json(200, { access_token: crypto.randomBytes(16).toString('hex'), token_type: 'Bearer', expires_in: 300, id_token: idToken })
      }
      return json(404, { error: 'not_found' })
    })
  })
  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => resolve({
      port: srv.address().port,
      configure: ({ email = '', mode = 'ok' } = {}) => { person = { email: String(email || ''), mode: mode === 'tamper' ? 'tamper' : 'ok' }; return { ...person } },
      calls: () => calls.map((c) => ({ ...c })),
      clear: () => { calls.length = 0 },
      close: () => new Promise((r) => srv.close(r)),
    }))
  })
}
