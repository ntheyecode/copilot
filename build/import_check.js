// Find the imports in a JavaScript file. One scanner for two jobs: the
// deploy-contract gate (server modules import nothing outside server/) and the
// composer's check that every shipped module finds what it imports in the
// bundle.
import fs from 'node:fs'
import path from 'node:path'
import { builtinModules } from 'node:module'

// import x from 'a' | import 'a' | import('a') | export ... from 'a'
// | new URL('a', import.meta.url) | require('a')   (string literals only)
const IMPORT_RE = /(?:import\s[^'"`]*?from\s*|import\s*\(\s*|import\s*|export\s[^'"`]*?from\s*|new URL\(\s*|require\(\s*)['"`]([^'"`\s]+)['"`]/g

export function importSpecifiers(source) {
  const out = []
  let m
  IMPORT_RE.lastIndex = 0
  while ((m = IMPORT_RE.exec(source))) out.push(m[1])
  return out
}

export const isRelative = (spec) => spec.startsWith('./') || spec.startsWith('../')
const BUILTINS = new Set(builtinModules)
export const isBuiltin = (spec) => spec.startsWith('node:') || BUILTINS.has(spec) || BUILTINS.has(spec.split('/')[0])
// 'pg' -> 'pg', '@scope/pkg/sub' -> '@scope/pkg'
export const packageName = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])

// [{ file, spec, target }] for every relative import of `file`.
export function importsOf(file) {
  const src = fs.readFileSync(file, 'utf8')
  return importSpecifiers(src).filter(isRelative).map((spec) => ({ file, spec, target: path.resolve(path.dirname(file), spec) }))
}

// Package names a file imports (not relative, not Node built-ins, not URLs).
export function packagesOf(file) {
  const src = fs.readFileSync(file, 'utf8')
  return [...new Set(importSpecifiers(src).filter((s) => !isRelative(s) && !s.startsWith('/') && !/^[a-z]+:/.test(s) && !isBuiltin(s)).map(packageName))]
}
