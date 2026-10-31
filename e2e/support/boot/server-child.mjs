// The E2E server process. Order matters:
//   1. fake clock (before anything reads the date),
//   2. fake AI provider + webhook receiver, and the network boundary around them,
//   3. the REAL server (server/index.js start()) on the port the OS hands out,
//   4. "ready" over IPC; afterwards, whitelisted control commands (ctl.mjs).
// The platform AI comes from <data dir>/ai-seed.json, the product's own deploy
// seed (written by ../server.mjs): provider openai, whose host the boundary
// sends to the fake.
import { installClock } from './clock.mjs'
import { installNetFakes } from './net-fakes.mjs'
import { startFakeAi } from './fake-ai.mjs'
import { startWebhookReceiver } from './webhook-receiver.mjs'
import { startFakeSmtp } from './fake-smtp.mjs'
import { startFakeOidc, FAKE_IDP_HOST } from './fake-oidc.mjs'
import { startFakeStripe } from './fake-stripe.mjs'

installClock()

const { PROVIDERS } = await import('../../../server/ai.js')
const aiHosts = Object.values(PROVIDERS).flatMap((p) => [new URL(p.base).hostname, ...(p.altHosts || [])])
const fakeAi = await startFakeAi()
const receiver = await startWebhookReceiver()
// Mail, single sign-on and Stripe fakes (all on loopback). SMTP is used only
// once a test points the product's email settings at it. The fake Stripe always
// runs and the SDK is always pointed at it through the product's own hook
// (STRIPE_API_BASE, loopback only: server/stripe_endpoint.js), set here before
// the server loads; it is used only on a server that carries Stripe keys
// (test.use({ serverEnv: STRIPE_E2E_ENV }), support/stripe-events.mjs).
const smtp = await startFakeSmtp()
const oidc = await startFakeOidc()
const stripe = await startFakeStripe()
process.env.STRIPE_API_BASE = stripe.base
installNetFakes({ aiHosts, aiPort: fakeAi.port, hookPort: receiver.port, idp: { host: FAKE_IDP_HOST, port: oidc.port } })

const index = await import('../../../server/index.js')
const store = await import('../../../server/store.js')
const srv = await index.start()
const port = srv.address().port

const { makeCtl } = await import('./ctl.mjs')
const ctl = makeCtl({ store, fakeAi, receiver, srv, smtp, oidc, stripe })

process.on('message', async (m) => {
  if (!m || m.type !== 'ctl') return
  try {
    const result = await ctl(m.cmd, m.args || {})
    process.send({ type: 'reply', id: m.id, result: result === undefined ? null : result })
    if (m.cmd === 'shutdown') setTimeout(() => process.exit(0), 50)
  } catch (e) {
    process.send({ type: 'reply', id: m.id, error: (e && e.stack) || String(e) })
  }
})
process.on('disconnect', () => process.exit(0))

process.send({ type: 'ready', port, aiPort: fakeAi.port, hookPort: receiver.port, smtpPort: smtp.port, idpPort: oidc.port, stripePort: stripe.port, edition: process.env.WORK_EDITION })
