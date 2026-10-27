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
import { existsSync, realpathSync } from 'node:fs'
import base from './vite.config.js'

const ROOT = dirname(fileURLToPath(import.meta.url))
// node_modules is either this worktree's own install or a junction to another
// checkout. Allow its resolved location so the self-hosted fonts load in both
// cases, without hardcoding any machine path.
const NODE_MODULES = existsSync(join(ROOT, 'node_modules')) ? realpathSync(join(ROOT, 'node_modules')) : null
// `--mode localapi` points /api at a LOCAL API server instead (the seeded one
// on :4444, or LOCAL_API_PORT), for signed-in surfaces that must not touch
// production data (dashboards, consoles). Any other mode keeps the live proxy.
const apiProxy = (mode) => (mode === 'localapi'
  ? { '/api': { target: `http://localhost:${process.env.LOCAL_API_PORT || 4444}`, changeOrigin: true } }
  : { '/api': { target: 'https://admireveda.com', changeOrigin: true, secure: true } })

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
      proxy: apiProxy(env.mode),
    },
    // Not strict (preview would otherwise inherit server.strictPort): if 5192 is
    // taken, Vite moves to the next free port and prints it.
    preview: { host: '127.0.0.1', port: 5192, strictPort: false, proxy: apiProxy(env.mode) },
  }
})
