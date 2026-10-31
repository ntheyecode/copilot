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
import { startFakeStripe } from './fake-stripe.mjs'

installClock()

const { PROVIDERS } = await import('../../../server/ai.js')
const aiHosts = Object.values(PROVIDERS).flatMap((p) => [new URL(p.base).hostname, ...(p.altHosts || [])])
const fakeAi = await startFakeAi()
const receiver = await startWebhookReceiver()
// The fake Stripe always runs; it only answers when a test's server carries
// Stripe keys (the product makes no Stripe call otherwise).
const fakeStripe = await startFakeStripe()
installNetFakes({ aiHosts, aiPort: fakeAi.port, hookPort: receiver.port, stripePort: fakeStripe.port })

const index = await import('../../../server/index.js')
const store = await import('../../../server/store.js')
const srv = await index.start()
const port = srv.address().port

const { makeCtl } = await import('./ctl.mjs')
const ctl = makeCtl({ store, fakeAi, receiver, srv, fakeStripe })

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

process.send({ type: 'ready', port, aiPort: fakeAi.port, hookPort: receiver.port, stripePort: fakeStripe.port, edition: process.env.WORK_EDITION })
