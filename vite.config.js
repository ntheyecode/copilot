import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Everything is bundled locally - no CDN, no external runtime deps.
// In dev, /api is proxied to the Express server on :4444.
// assetsDir is 'copilot-assets' (not the default 'assets') so, when WorkCoPilot
// and the interview app share one box + domain behind nginx, their hashed asset
// paths never collide (interview keeps /assets/, copilot uses /copilot-assets/).
//
// ---------------------------------------------------------------------------
// IP HARDENING (owner rule: "minify, obfuscate (jumble names), optionally
// encrypt the SHIPPED files - keep ORIGINAL SOURCE readable in local + git").
//
// The SOURCE under src/ is NEVER touched - hardening is a BUILD-OUTPUT step.
// Hardening is OFF by default so `npm run dev` and a plain `npm run build`
// stay fast and debuggable. It turns on only via Vite's --mode (cross-platform,
// no env-var shell syntax, no extra dependency):
//   npm run build:harden      (--mode harden)    -> minify + jumble names + base64 strings  (web default)
//   npm run build:harden:max  (--mode hardenmax) -> the above + control-flow flattening     (on-prem/desktop)
// (The HARDEN env var is also honoured as an override for CI pipelines.)
//
// It runs the BATTLE-TESTED `javascript-obfuscator` library (SCA-vetted,
// pinned 5.2.1) - NOT a hand-rolled mangler (honours the project's
// "use authoritative tooling, never a hand-rolled approximation" rule).
//
// It obfuscates ONLY first-party chunks (any chunk that contains a module
// from /src/). Pure-vendor chunks (react bundle, jspdf, html2canvas,
// dompurify, lucide icons) are left as esbuild already minified them - that
// keeps the bundle from ballooning and keeps runtime cost low, and those
// libraries are public anyway (no IP to protect there).
// ---------------------------------------------------------------------------

function ipHardenPlugin(mode) {
  const envHarden = process.env.HARDEN || ''
  const HARDEN_ON = mode === 'harden' || mode === 'hardenmax' || envHarden === '1' || envHarden === 'max'
  const HARDEN_MAX = mode === 'hardenmax' || envHarden === 'max'
  if (!HARDEN_ON) return null
  let obfuscator
  return {
    name: 'workcopilot-ip-harden',
    apply: 'build',
    enforce: 'post',
    // IMPORTANT: obfuscate in generateBundle, NOT renderChunk. renderChunk runs
    // BEFORE Rollup/Vite resolve their internal chunk-filename placeholders
    // (the `!~{NNN}~` tokens inside Vite's __vite__mapDeps preload map). If the
    // obfuscator base64-encodes those placeholders into its string array, Vite
    // can no longer substitute the real hashed filenames and lazy imports 404
    // at runtime. generateBundle is the documented hook where chunk code is
    // FINAL (placeholders already resolved) while chunk.modules is still
    // available for first-party detection. (Caveat: the content hash in the
    // filename reflects the pre-obfuscation bytes, which is harmless - all
    // cross-chunk references are already resolved and internally consistent.)
    async generateBundle(_options, bundle) {
      if (!obfuscator) obfuscator = (await import('javascript-obfuscator')).default

      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue
        // Only first-party code (a module physically under /src/). This skips
        // pure-vendor chunks (react, jspdf, html2canvas, dompurify) so we don't
        // balloon public library code that has no IP to protect.
        const ids = Object.keys(file.modules || {})
        const isFirstParty = ids.some((id) => id.replace(/\\/g, '/').includes('/src/'))
        if (!isFirstParty) continue

        const options = {
          target: 'browser',
          compact: true,
          sourceMap: false,
          // "jumble names" - rename every local/function identifier to hex.
          identifierNamesGenerator: 'hexadecimal',
          // SAFETY: never rename module-scope (exported/imported) bindings or
          // real globals - that is what preserves ESM import/export wiring and
          // is the #1 thing that breaks React obfuscation.
          renameGlobals: false,
          // "optionally encrypt" - collect string literals into a rotated array
          // and base64-encode them (light: raises the bar without the runtime
          // cost of rc4 on a 2.5 MB bundle).
          stringArray: true,
          stringArrayThreshold: 0.75,
          stringArrayEncoding: ['base64'],
          stringArrayRotate: true,
          stringArrayShuffle: true,
          // splitStrings fragments every literal - strong, but it roughly
          // doubles the string-array cost on top of base64. It adds little once
          // strings are already base64-encoded, so keep it for the heaviest tier.
          splitStrings: HARDEN_MAX,
          splitStringsChunkLength: 10,
          numbersToExpressions: true,
          simplify: true,
          // Deliberately OFF by default (SUPREME RULE VI - never degrade):
          //  - selfDefending / debugProtection break some WebView/Electron
          //    contexts and are trivially stripped anyway.
          //  - disableConsoleOutput would hide the app's own real logs.
          //  - deadCodeInjection + transformObjectKeys bloat size / risk props.
          selfDefending: false,
          debugProtection: false,
          disableConsoleOutput: false,
          deadCodeInjection: false,
          transformObjectKeys: false,
          // HARDEN=max adds control-flow flattening (the heaviest layer) - this
          // is the knob the on-prem/desktop "heaviest protection" path uses.
          controlFlowFlattening: HARDEN_MAX,
          controlFlowFlatteningThreshold: HARDEN_MAX ? 0.5 : 0,
        }

        file.code = obfuscator.obfuscate(file.code, options).getObfuscatedCode()
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ipHardenPlugin(mode)].filter(Boolean),
  build: {
    assetsDir: 'copilot-assets',
    // Defense-in-depth: NEVER ship source maps to production (they would leak
    // the readable original source). Vite's default is already false; we pin
    // it so a future accidental flip is a visible diff, not a silent leak.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the always-loaded React ecosystem into its own `vendor` chunk.
        // Two wins: (1) under hardening it is a pure-vendor chunk, so the IP
        // plugin skips it - we don't pay to obfuscate public library code that
        // has no IP to protect, which keeps the entry chunk small and fast;
        // (2) it fixes the pre-existing >500 kB entry-chunk warning. Lazy
        // vendor libs (jspdf, html2canvas, dompurify) are left to Rollup's
        // default splitting so they stay lazily loaded.
        manualChunks(id) {
          const p = id.replace(/\\/g, '/')
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(p)) {
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:4444' },
  },
}))
