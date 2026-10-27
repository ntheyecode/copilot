// Verification-only config (NOT used by the build, not deployed): serves THIS
// worktree and proxies /api to the live site so the "try it on your task" widget
// can be exercised end to end against the real live check and pricing endpoints
// without running a local API. Nothing is written to production by a GET/POST
// to /api/work/coverage; a lead is only created if the lead form is submitted.
//   npx vite --config vite.verify.config.js            dev server on the source
//   npx vite preview --config vite.verify.config.js    the BUILT dist/ (run
//     `npm run build` or `npm run build:harden` first), same proxy, so the
//     shipped (optionally obfuscated) bundle is what gets exercised
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, realpathSync, readFileSync } from 'node:fs'
import base from './vite.config.js'

const ROOT = dirname(fileURLToPath(import.meta.url))
// node_modules is either this worktree's own install or a junction to another
// checkout. Allow its resolved location so the self-hosted fonts load in both
// cases, without hardcoding any machine path.
const NODE_MODULES = existsSync(join(ROOT, 'node_modules')) ? realpathSync(join(ROOT, 'node_modules')) : null
// Where /api goes: the live site by default. To exercise a server change that
// is not deployed yet (a new prompt), point it at a local server instead, via
// VERIFY_API=http://127.0.0.1:4455 or a one-line `.verify-api.local` file in
// this folder (gitignored by *.local, so it can never ship). Logged at start so
// a screenshot can never be mistaken for the other target.
const apiTarget = () => {
  const file = join(ROOT, '.verify-api.local')
  const fromFile = existsSync(file) ? readFileSync(file, 'utf8').trim() : ''
  const target = process.env.VERIFY_API || fromFile || 'https://admireveda.com'
  console.log(`[verify] /api -> ${target}`)
  return target
}
const liveApiProxy = () => { const target = apiTarget(); return { '/api': { target, changeOrigin: true, secure: target.startsWith('https://') } } }

export default defineConfig((env) => {
  const b = typeof base === 'function' ? base(env) : base
  return {
    ...b,
    root: ROOT,
    server: {
      host: '127.0.0.1',
      port: 5191,
      strictPort: true,
      fs: { allow: [ROOT, NODE_MODULES].filter(Boolean) },
      proxy: liveApiProxy(),
    },
    // Not strict (preview would otherwise inherit server.strictPort): if 5192 is
    // taken, Vite moves to the next free port and prints it.
    preview: { host: '127.0.0.1', port: 5192, strictPort: false, proxy: liveApiProxy() },
  }
})
