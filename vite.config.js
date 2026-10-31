import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nullIndirectCallZeros } from './scripts/harden-indirect-calls.mjs'
import { obfuscationOptions } from './scripts/obfuscation_options.mjs'

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
// dompurify, lucide icons) are left as Vite's minifier (Oxc since Vite 8)
// already minified them - that keeps the bundle from ballooning and keeps
// runtime cost low, and those libraries are public anyway (no IP to protect).
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
    // BEFORE the bundler (Rolldown since Vite 8) and Vite resolve their internal
    // chunk-filename placeholders (the `!~{NNN}~` tokens inside Vite's
    // __vite__mapDeps preload map). If the obfuscator base64-encodes those
    // placeholders into its string array, Vite can no longer substitute the
    // real hashed filenames and lazy imports 404 at runtime.
    // ORDER 'post': run AFTER Vite's own generateBundle hooks. Vite's
    // build-import-analysis fills each lazy import's preload list by reading
    // the literal `import('./X.js')` specifier. Obfuscating before it (as this
    // plugin did up to the Vite 8 upgrade) moved most specifiers into the string
    // array, so Vite wrote empty lists and lazy chunks fetched their imports one
    // after another. Running last, the chunk code is final (preload lists
    // written) and chunk.modules is still there for first-party detection.
    // (Caveat: the content hash in the filename reflects the pre-obfuscation
    // bytes, which is harmless - all cross-chunk references are already
    // resolved and internally consistent.)
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        if (!obfuscator) obfuscator = (await import('javascript-obfuscator')).default
        let hardened = 0
        let nulled = 0

        for (const file of Object.values(bundle)) {
          if (file.type !== 'chunk') continue
          // Only first-party code (a module physically under /src/). This skips
          // pure-vendor chunks (react, jspdf, html2canvas, dompurify) so we don't
          // balloon public library code that has no IP to protect.
          const ids = Object.keys(file.modules || {})
          const isFirstParty = ids.some((id) => id.replace(/\\/g, '/').includes('/src/'))
          if (!isFirstParty) continue

          // Keep Rolldown's indirect CommonJS calls `(0, ns.fn)()` from being
          // inflated by numbersToExpressions (see scripts/harden-indirect-calls.mjs).
          const pre = nullIndirectCallZeros(file.code, (code) => this.parse(code))
          if (pre.skipped) this.warn(`${file.fileName}: indirect-call pre-pass skipped (${pre.skipped}); the chunk is still obfuscated, only larger`)
          nulled += pre.count

          // The one option set for every shipped build (scripts/obfuscation_options.mjs).
          const options = obfuscationOptions({ target: 'browser', max: HARDEN_MAX })

          file.code = obfuscator.obfuscate(pre.code, options).getObfuscatedCode()
          hardened++
        }
        // One visible line per build, so a hardened build is provably hardened.
        this.info(`obfuscated ${hardened} first-party chunk(s); ${nulled} indirect-call zero(s) kept as null`)
      },
    },
  }
}

// Browser floor (SUPREME RULE VI - never degrade). Vite 8's default target,
// 'baseline-widely-available' (Chrome/Edge 111, Firefox 114, Safari/iOS 16.4),
// is narrower than what this site shipped on Vite 5 ('modules': es2020, Edge 88,
// Firefox 78, Chrome 87, Safari 14). Pinning the Vite 5 floor keeps every
// browser and Android WebView that loaded the site before the upgrade working
// after it. build.cssTarget follows build.target, so CSS lowering matches too.
const BROWSER_FLOOR = ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']

// The always-loaded React ecosystem. `[\\/]` matches the path separator on
// Windows and POSIX alike (the bundler sees native module ids).
const VENDOR_RE = /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/

export const VITE_WATCH_IGNORED = ['**/out/**', '**/dist/**', '**/.claude/worktrees/**', '**/.e2e-results/**', '**/workcopilot/release-workcopilot/**', '**/workcopilot/node_modules/**']

export default defineConfig(({ mode }) => ({
  plugins: [react(), ipHardenPlugin(mode)].filter(Boolean),
  build: {
    target: BROWSER_FLOOR,
    assetsDir: 'copilot-assets',
    // Defense-in-depth: NEVER ship source maps to production (they would leak
    // the readable original source). Vite's default is already false; we pin
    // it so a future accidental flip is a visible diff, not a silent leak.
    sourcemap: false,
    // Vite 8 bundles with Rolldown: rolldownOptions replaces the deprecated
    // rollupOptions alias, and output.codeSplitting replaces manualChunks.
    rolldownOptions: {
      output: {
        // Split the always-loaded React ecosystem into its own `vendor` chunk.
        // Two wins: (1) under hardening it is a pure-vendor chunk, so the IP
        // plugin skips it - we don't pay to obfuscate public library code that
        // has no IP to protect, which keeps the entry chunk small and fast;
        // (2) the library code caches separately from app releases (the entry
        // chunk itself is still over the 500 kB warning line). Lazy
        // vendor libs (jspdf, html2canvas, dompurify) are left to the default
        // splitting so they stay lazily loaded. A group also takes in the
        // captured modules' own dependencies (includeDependenciesRecursively),
        // so the chunk stays pure vendor.
        codeSplitting: {
          groups: [{ name: 'vendor', test: VENDOR_RE }],
        },
      },
    },
  },
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:4444' },
    // Never watch build output, other worktrees or test results: on Windows the
    // watcher's handle on a new folder blocks renaming it (compose.test failed
    // with EPERM while a dev server ran, 2026-10-31), and none of it is source.
    watch: { ignored: VITE_WATCH_IGNORED },
  },
}))
