// electron-builder afterPack: code protection for the desktop app (owner's
// supreme rule: the desktop app is distributed to untrusted machines, so what
// ships is obfuscated and carries no source maps). Runs on the packed app
// folder BEFORE the NSIS/MSI installers are built from it, so every installer
// carries the protected files. The source in workcopilot/ is never touched.
//
//  - main.js (Electron main process) and preload.js are obfuscated with the
//    ONE shared option set (scripts/obfuscation_options.mjs), heaviest tier;
//  - every *.map file in the packed app is removed (the files list already
//    excludes them; this is the backstop);
//  - the build FAILS if a step fails or a map survives: a protected build
//    or no build, never a silent unprotected one.
const fs = require('node:fs')
const path = require('node:path')

const REPO = path.resolve(__dirname, '..', '..')
const TARGETS = [['main.js', 'node'], ['preload.js', 'browser'], ['brand.js', 'node']]

function mapsUnder(dir) {
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.map')) out.push(p)
    }
  }
  walk(dir)
  return out
}

exports.default = async function afterPack(context) {
  const appDir = path.join(context.appOutDir, 'resources', 'app')
  if (!fs.existsSync(appDir)) throw new Error(`[after-pack] packed app folder not found: ${appDir} (asar must stay off for this step)`)
  const { obfuscationOptions } = await import(require('node:url').pathToFileURL(path.join(REPO, 'scripts', 'obfuscation_options.mjs')).href)
  let Obfuscator
  try { Obfuscator = require(require.resolve('javascript-obfuscator', { paths: [REPO] })) } catch {
    throw new Error('[after-pack] javascript-obfuscator is not installed in the repo root. Run: npm ci (in the repo root), then build again.')
  }
  for (const [file, target] of TARGETS) {
    const p = path.join(appDir, file)
    const src = fs.readFileSync(p, 'utf8')
    const out = Obfuscator.obfuscate(src, obfuscationOptions({ target, max: true })).getObfuscatedCode()
    if (!out || out.length < src.length / 4) throw new Error(`[after-pack] obfuscating ${file} produced no usable output`)
    fs.writeFileSync(p, out)
    console.log(`  • after-pack: obfuscated ${file} (${src.length} -> ${out.length} bytes)`)
  }
  for (const m of mapsUnder(appDir)) fs.rmSync(m)
  const left = mapsUnder(appDir)
  if (left.length) throw new Error(`[after-pack] ${left.length} source map(s) remain, e.g. ${left[0]}`)
  console.log('  • after-pack: no source maps in the packed app')
}
