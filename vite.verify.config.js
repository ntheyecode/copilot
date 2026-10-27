// Verification-only dev config (NOT used by the build, not deployed): serves THIS
// worktree and proxies /api to the live site so the "try it on your task" widget
// can be exercised end to end against the real live check and pricing endpoints
// without running a local API. Nothing is written to production by a GET/POST
// to /api/work/coverage; a lead is only created if the lead form is submitted.
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import base from './vite.config.js'

export default defineConfig((env) => {
  const b = typeof base === 'function' ? base(env) : base
  return {
    ...b,
    root: dirname(fileURLToPath(import.meta.url)),
    server: {
      host: '127.0.0.1',
      port: 5191,
      strictPort: true,
      // node_modules is a junction to the main checkout, which resolves outside
      // this root; allow it so the self-hosted fonts load in the preview.
      fs: { allow: [dirname(fileURLToPath(import.meta.url)), 'D:/RadarOps/copilot/node_modules'] },
      proxy: { '/api': { target: 'https://admireveda.com', changeOrigin: true, secure: true } },
    },
  }
})
