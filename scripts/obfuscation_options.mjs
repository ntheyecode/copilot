// The ONE set of javascript-obfuscator options for every shipped build: the web
// bundle (vite.config.js, build:harden / build:harden:max) and the desktop app
// (workcopilot/build/after-pack.cjs). One place, so a safety choice made for one
// surface (e.g. "never renameGlobals") can never drift on the other.
//
// target: 'browser' for the SPA and the Electron preload, 'node' for the
//   Electron main process.
// max: the heaviest tier (control-flow flattening + split strings), used for
//   build:harden:max and the desktop app (distributed to untrusted machines).
export function obfuscationOptions({ target = 'browser', max = false } = {}) {
  return {
    target,
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
    splitStrings: max,
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
    // The heaviest tier adds control-flow flattening - the knob the
    // on-prem/desktop "heaviest protection" path uses.
    controlFlowFlattening: max,
    controlFlowFlatteningThreshold: max ? 0.5 : 0,
  }
}
