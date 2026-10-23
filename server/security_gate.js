// ===========================================================================
// WorkCoPilot - security gate. A DETERMINISTIC backstop to the WORK_MODE prompt,
// so the product does not (a) hand over dangerous code/commands or (b) recommend
// a dependency at a version with a known vulnerability.
//
//   scanCode(text)      -> dangerous-pattern + hard-coded-secret findings (pure, no network)
//   extractDeps(text)   -> {name, ecosystem, version}[] from install commands + manifests (pure)
//   scanDeps(deps)      -> real CVEs (OSV.dev) + latest stable (npm/PyPI registry), bounded + cached
//   securityReview(text)-> both, combined and HONEST (if the vuln lookup cannot run,
//                          `checked:false` - it never claims "clean" when it did not verify)
//
// Privacy: scanDeps sends ONLY public package coordinates (name + ecosystem +
// version) to OSV / the public registry. It never sends the user's code or data.
// ===========================================================================

// ---- (A) dangerous code / command patterns --------------------------------
// Each: { id, severity, title, re, fix }. Kept high-signal to avoid noise.
const CODE_RULES = [
  { id: 'pipe-to-shell', severity: 'high', title: 'Piping a downloaded script straight into a shell', re: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba)?sh\b/i, fix: 'Download the script, read it, verify a checksum or signature, then run it.' },
  { id: 'chmod-777', severity: 'high', title: 'World-writable permissions (chmod 777)', re: /\bchmod\s+(?:-R\s+)?0?777\b/i, fix: 'Grant the least permission that works (for example 750 or 640), owned by the right user.' },
  { id: 'rm-rf-root', severity: 'critical', title: 'Recursive delete from the filesystem root', re: /\brm\s+-rf?\s+(?:--no-preserve-root\s+)?\/(?:\s|$|\*)/i, fix: 'Target a specific, checked path; never the root. Double-check the variable is set before deleting.' },
  { id: 'tls-verify-off', severity: 'high', title: 'TLS certificate verification disabled', re: /--insecure\b|--no-check-certificate\b|verify\s*=\s*False\b|rejectUnauthorized\s*:\s*false\b|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|InsecureSkipVerify\s*:\s*true\b|CURLOPT_SSL_VERIFYPEER[^\n]*(?:0|false)/i, fix: 'Keep certificate verification on; fix the trust store or use a valid certificate instead.' },
  { id: 'iam-wildcard', severity: 'high', title: 'Over-broad permission (wildcard action or resource)', re: /"(?:Action|Resource)"\s*:\s*"\*"|"(?:Action|Resource)"\s*:\s*\[\s*"\*"/i, fix: 'Scope the policy to the exact actions and resources needed (least privilege).' },
  { id: 'open-ingress', severity: 'high', title: 'Open to the whole internet (0.0.0.0/0)', re: /0\.0\.0\.0\/0/, fix: 'Restrict the source range to known IPs or a private network, especially for admin or database ports.' },
  { id: 'unsafe-deser', severity: 'high', title: 'Unsafe deserialization', re: /\bpickle\.loads?\s*\(|yaml\.load\s*\((?![^)]*Loader\s*=)|cPickle\.loads?\s*\(|ObjectInputStream\b|unserialize\s*\(/i, fix: 'Use a safe loader (yaml.safe_load), a data-only format (JSON), or a vetted schema; never deserialize untrusted input.' },
  { id: 'shell-eval', severity: 'medium', title: 'Evaluating a string as code or a shell command', re: /\beval\s*\(|\bexec\s*\(|shell\s*=\s*True\b|os\.system\s*\(|child_process\.exec\s*\(/i, fix: 'Avoid eval/exec on dynamic input; pass arguments as a list (no shell), or use a safe parser.' },
  { id: 'sql-concat', severity: 'medium', title: 'SQL built by string concatenation (injection risk)', re: /(?:SELECT|INSERT|UPDATE|DELETE)\b[^\n;'"]*(?:"\s*\+|'\s*\+|\+\s*(?:req|request|params|input|user)|\$\{|%s['"]?\s*%)/i, fix: 'Use parameterized queries or a query builder; never concatenate user input into SQL.' },
  { id: 'hardcoded-secret', severity: 'high', title: 'Hard-coded credential or key', re: /\b(?:AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_\-]{30,})\b|(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, fix: 'Move it to an environment variable or a secret manager; never commit a real credential.' },
]
// Scan emitted code/commands for dangerous patterns. Returns [{id,severity,title,fix,sample}].
export function scanCode(text) {
  const s = String(text || '')
  if (!s.trim()) return []
  const out = []
  for (const r of CODE_RULES) {
    const m = r.re.exec(s)
    if (m) out.push({ id: r.id, severity: r.severity, title: r.title, fix: r.fix, sample: String(m[0]).slice(0, 80) })
  }
  return out
}

// ---- (B) dependency extraction (pure) -------------------------------------
// Maps a few ecosystems to OSV's names. Best-effort, high-precision patterns.
const SEMVERish = '[0-9]+(?:\\.[0-9]+){0,2}(?:[.-][0-9A-Za-z.-]+)?'
function pushDep(set, name, ecosystem, version) {
  const n = String(name || '').trim(); const v = String(version || '').replace(/^[\^~>=<\s]+/, '').trim()
  if (!n || !v || !/^[0-9]/.test(v)) return
  set.set(`${ecosystem}:${n}@${v}`, { name: n, ecosystem, version: v })
}
export function extractDeps(text) {
  const s = String(text || '')
  const set = new Map()
  // npm/yarn/pnpm install pkg@1.2.3  (scoped @scope/pkg@1.2.3 too)
  for (const m of s.matchAll(new RegExp(`\\b(?:npm\\s+(?:i|install)|yarn\\s+add|pnpm\\s+add)\\s+((?:@[\\w.-]+\\/)?[\\w.-]+)@(${SEMVERish})`, 'gi'))) pushDep(set, m[1], 'npm', m[2])
  // package.json "pkg": "^1.2.3"
  for (const m of s.matchAll(new RegExp(`"((?:@[\\w.-]+\\/)?[\\w.-]+)"\\s*:\\s*"[\\^~>=<\\s]*(${SEMVERish})"`, 'g'))) pushDep(set, m[1], 'npm', m[2])
  // pip install pkg==1.2.3  and requirements.txt pkg==1.2.3
  for (const m of s.matchAll(new RegExp(`\\bpip\\s+install\\s+([A-Za-z0-9._-]+)==(${SEMVERish})`, 'gi'))) pushDep(set, m[1], 'PyPI', m[2])
  for (const m of s.matchAll(new RegExp(`(?:^|\\n)\\s*([A-Za-z0-9._-]+)==(${SEMVERish})`, 'g'))) pushDep(set, m[1], 'PyPI', m[2])
  // go get module@v1.2.3
  for (const m of s.matchAll(new RegExp(`\\bgo\\s+get\\s+([\\w./-]+)@v?(${SEMVERish})`, 'gi'))) pushDep(set, m[1], 'Go', m[2])
  // cargo add pkg@1.2.3
  for (const m of s.matchAll(new RegExp(`\\bcargo\\s+add\\s+([\\w-]+)@(${SEMVERish})`, 'gi'))) pushDep(set, m[1], 'crates.io', m[2])
  return [...set.values()].slice(0, 25)
}

// ---- (C) real vulnerability + latest-version lookup -----------------------
const CACHE = new Map(); const CACHE_TTL = 6 * 60 * 60 * 1000  // 6h
const cacheGet = (k) => { const e = CACHE.get(k); return (e && Date.now() - e.at < CACHE_TTL) ? e.v : undefined }
const cacheSet = (k, v) => { CACHE.set(k, { v, at: Date.now() }); if (CACHE.size > 2000) CACHE.delete(CACHE.keys().next().value) }
async function timed(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]) }

// OSV.dev single query (full vuln objects, so we can read severity + fixed version).
async function osvQuery(dep) {
  const key = `osv:${dep.ecosystem}:${dep.name}@${dep.version}`
  const hit = cacheGet(key); if (hit !== undefined) return hit
  const res = await timed(fetch('https://api.osv.dev/v1/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: dep.version, package: { name: dep.name, ecosystem: dep.ecosystem } }),
  }), 6000)
  if (!res.ok) throw new Error(`osv ${res.status}`)
  const data = await res.json().catch(() => ({}))
  const vulns = (data.vulns || []).map((v) => {
    const sev = (Array.isArray(v.severity) && v.severity[0] && v.severity[0].score) || (v.database_specific && v.database_specific.severity) || null
    let fixedIn = null
    for (const a of (v.affected || [])) {
      if (a.package && a.package.name && a.package.name.toLowerCase() !== dep.name.toLowerCase()) continue
      for (const r of (a.ranges || [])) for (const e of (r.events || [])) if (e.fixed) fixedIn = e.fixed
    }
    const cve = (v.aliases || []).find((x) => /^CVE-/i.test(x)) || v.id
    return { id: cve, osvId: v.id, severity: sev, fixedIn }
  })
  cacheSet(key, vulns); return vulns
}
// Latest stable version from the public registry (npm / PyPI). null for others.
async function latestVersion(dep) {
  const key = `lat:${dep.ecosystem}:${dep.name}`
  const hit = cacheGet(key); if (hit !== undefined) return hit
  let v = null
  try {
    if (dep.ecosystem === 'npm') {
      const r = await timed(fetch(`https://registry.npmjs.org/${encodeURIComponent(dep.name)}/latest`), 5000)
      if (r.ok) v = (await r.json()).version || null
    } else if (dep.ecosystem === 'PyPI') {
      const r = await timed(fetch(`https://pypi.org/pypi/${encodeURIComponent(dep.name)}/json`), 5000)
      if (r.ok) v = ((await r.json()).info || {}).version || null
    }
  } catch { v = null }
  cacheSet(key, v); return v
}
// Scan a set of deps. Returns { deps:[{...,vulns,latest}], checked } where checked
// is false if the lookup could not run (so we never claim "no vulns" when we did
// not actually verify).
export async function scanDeps(deps) {
  const list = (deps || []).slice(0, 25)
  if (!list.length) return { deps: [], checked: true }
  let anyChecked = false
  const results = await Promise.all(list.map(async (d) => {
    let vulns = [], latest = null, ok = false
    try { vulns = await osvQuery(d); ok = true; anyChecked = true } catch { ok = false }
    try { latest = await latestVersion(d) } catch { latest = null }
    return { name: d.name, ecosystem: d.ecosystem, version: d.version, vulns, latest, checked: ok }
  }))
  return { deps: results, checked: anyChecked }
}

// ---- (D) combined review --------------------------------------------------
// text = the code/commands WorkCoPilot is about to hand the user. Returns a
// combined, honest advisory. `vulnerable` deps are the ones with findings.
export async function securityReview(text) {
  const codeIssues = scanCode(text)
  const deps = extractDeps(text)
  let sca = { deps: [], checked: deps.length === 0 }
  if (deps.length) { try { sca = await scanDeps(deps) } catch { sca = { deps: deps.map((d) => ({ ...d, vulns: [], latest: null, checked: false })), checked: false } } }
  const vulnerable = sca.deps.filter((d) => d.vulns && d.vulns.length)
  const outdated = sca.deps.filter((d) => d.latest && d.latest !== d.version && (!d.vulns || !d.vulns.length))
  return {
    codeIssues,
    deps: sca.deps,
    vulnerable,
    outdated,
    checkedDeps: sca.checked,          // false => could not verify (say so, do not claim clean)
    clean: codeIssues.length === 0 && vulnerable.length === 0 && sca.checked,
    hasFindings: codeIssues.length > 0 || vulnerable.length > 0,
  }
}
