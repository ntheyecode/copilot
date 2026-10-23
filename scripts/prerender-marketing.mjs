// Prerender-lite for the public marketing routes (audit IP-16).
//
// WHAT: a pure-Node post-build step. It reads the Vite-built dist/index.html (the
// SPA shell) and, for each public marketing route, writes dist/<route>/index.html:
// the SAME shell (same /copilot-assets/ module script + stylesheet, untouched) with
//   - a per-route <title>, meta description, canonical, Open Graph + Twitter tags,
//   - a per-route JSON-LD block (Organization + WebPage; replaces the home-page
//     SoftwareApplication/FAQPage graph so it is not duplicated on every URL),
//   - a crawler-visible content block (h1, lede, key points, links to the sibling
//     pages) placed INSIDE <div id="root">.
// WHY inside #root: main.jsx uses ReactDOM.createRoot(...).render(), which discards
// any existing children of the container on first commit. So humans get the real
// interactive page exactly as before, crawlers that do not run JS (and users whose
// bundle fails to load) see real copy, and nothing is left behind to duplicate in
// the DOM or for screen readers. There is no hydration involved, so no mismatch
// risk. (Do NOT switch main.jsx to hydrateRoot without a real SSR render.)
//
// WHAT IT DOES NOT DO: no SSR, no headless browser, no dependency, no network, no
// edit of dist/index.html (that file stays the pristine fallback for every other
// route), no write outside dist/. Idempotent: it always derives from dist/index.html
// and overwrites its own outputs; re-run after every `vite build` (a build wipes dist/).
//
// COPY ACCURACY: titles and descriptions mirror the useSeo({...}) call in each page
// (src/pages/Work*.jsx) and the body copy is lifted from those pages. `--check`
// (also run on every normal run, as warnings) greps the page sources for the exact
// strings so drift is reported. The Fields page numbers are derived from
// WorkFields.jsx, never typed here. Prices are deliberately NOT stated: the live
// pricing page loads them from /api/work/pricing and they have already drifted once.
//
// Usage:
//   node scripts/prerender-marketing.mjs              generate into dist/
//   node scripts/prerender-marketing.mjs --check      only verify copy vs sources
//   node scripts/prerender-marketing.mjs --clean      delete files this script generated
//   node scripts/prerender-marketing.mjs --strict     exit 1 if any copy-drift warning
//   node scripts/prerender-marketing.mjs --dist <dir> operate on another dist dir (tests)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const distArg = argv.indexOf('--dist')
const DIST = distArg >= 0 ? path.resolve(argv[distArg + 1]) : path.join(ROOT, 'dist')
const SRC_PAGES = path.join(ROOT, 'src', 'pages')

const ORIGIN = 'https://admireveda.com'
const MARKER = '<!-- prerendered-by: scripts/prerender-marketing.mjs (prerender-lite, audit IP-16) -->'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ---- derive the Fields numbers from the page source (single source of truth) ----
function readFields() {
  const f = path.join(SRC_PAGES, 'WorkFields.jsx')
  try {
    const src = fs.readFileSync(f, 'utf8')
    const block = src.slice(src.indexOf('export const FIELD_FAMILIES'), src.indexOf('export const FIELD_TOTAL'))
    const fams = []
    const re = /\{\s*k:\s*'([^']+)'[\s\S]*?items:\s*\[([^\]]*)\]/g
    let m
    while ((m = re.exec(block))) {
      const items = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
      fams.push({ k: m[1], items })
    }
    const total = fams.reduce((n, x) => n + x.items.length, 0)
    if (fams.length >= 3 && total >= 10) return { fams, total }
  } catch { /* fall through */ }
  return null
}
const FIELDS = readFields()

// ---- the routes -------------------------------------------------------------
// label: short link text for the sibling-page nav. `source`: page file used by --check.
const R = []
const route = (r) => R.push(r)

route({
  path: '/workcopilot',
  label: 'Sign in or create an account',
  source: 'WorkLogin.jsx',
  title: 'Sign In or Create an Account - WorkCoPilot by AdmireVeda',
  description: 'Sign in to WorkCoPilot, or create a free account, to get step-by-step guidance on your own screen. Company single sign-on is supported.',
  h1: 'WorkCoPilot by AdmireVeda: your expert, on every screen',
  lede: [
    'AdmireVeda\'s WorkCoPilot sits beside you and guides any task, step by step, all the way to done.',
    'It is free to sign up. Pick a plan when you are ready to start guiding. Company single sign-on is supported.',
  ],
  points: [
    'Read-only by design: it watches and guides, and never clicks, types or runs anything in your systems.',
    'Runs in your browser and floats over your work, so it guides you even on locked-down machines. A Windows desktop app is available too.',
  ],
})

route({
  path: '/workcopilot/how-it-works',
  label: 'How it works',
  source: 'WorkCapabilities.jsx',
  title: 'How It Works - WorkCoPilot by AdmireVeda',
  description: 'Everything WorkCoPilot does: step-by-step guidance on your screen, the exact command or click, starting from zero, catching and correcting mistakes, any app, grounded in your own documents, a record you keep, staying current by learning your tools, and plans from the strongest AI available to you.',
  h1: 'Like having the best person in the room, every time.',
  lede: [
    'WorkCoPilot watches your screen and tells you the exact next step for any task, in any app, checks that each step worked, and stays current with how your tools work today.',
  ],
  points: [
    'Guided, step by step: it watches your screen and tells you the exact next move, one step at a time, and checks each one really worked before moving on.',
    'The exact how, every time: the precise click, command or setting to use, spelled out and copy-ready.',
    'Starts from zero: opens the right page, signs you in, and walks you to the exact spot. Nothing assumed, nothing skipped.',
    'Catches and corrects mistakes: spots a wrong turn the moment it happens, tells you why, and shows the exact fix.',
    'Any app, not just the browser: web apps, installed desktop apps, on-prem consoles at a local address, and your own custom tools.',
    'A record you keep: finish with a clean, picture-rich write-up of exactly what you did, ready to share or repeat.',
  ],
})

route({
  path: '/workcopilot/use-cases',
  label: 'Use cases',
  source: 'WorkUseCases.jsx',
  title: 'Use Cases - WorkCoPilot by AdmireVeda',
  description: 'What WorkCoPilot guides, in detail: technical setup and config, builds and integrations, AI and automation, product work, marketing, accounting and office tasks, legal and compliance, and everyday work on any screen.',
  h1: 'Every kind of work. Guided in detail.',
  lede: [
    'Not just a to-do list. For each task, WorkCoPilot shows the exact step, exactly how to do it, and how to know it worked. Here is what that looks like, across the work people actually do.',
  ],
  points: [
    'Technical setup and config: configure a firewall or security group, harden a Linux server, set up IDS / IPS rules, wire up a CI/CD pipeline.',
    'Build and implement: scaffold a new app or service, connect two systems with an API, build a data pipeline, deploy to the cloud.',
    'AI and automation: build an n8n workflow, stand up a RAG assistant, automate a repetitive task, wire an AI into your tools.',
    'Product and innovation: prototype a new feature, spin up a landing page, run a quick experiment, ship a first version.',
    'Marketing and growth: launch an ad campaign, set up conversion tracking, read a traffic report, plan a product launch.',
    'Accounting and office: reconcile a bank statement, build a financial report, create and send invoices, prepare a filing.',
    'Legal and compliance: review a contract clause by clause, complete a compliance checklist, fill a regulatory form, prepare an audit trail.',
    'Everyday and anything else: learn a new tool fast, fix a confusing error, fill a tricky form, get unstuck on anything.',
  ],
})

{
  const n = FIELDS ? FIELDS.total : null
  const fam = FIELDS ? FIELDS.fams.length : null
  route({
    path: '/workcopilot/fields',
    label: 'Fields we cover',
    source: 'WorkFields.jsx',
    title: n ? `Fields we cover - ${n} professional fields - WorkCoPilot by AdmireVeda` : 'Fields we cover - WorkCoPilot by AdmireVeda',
    description: n
      ? `WorkCoPilot guides work across ${n} professional fields in ${fam} families, from software and security to finance, operations, marketing, healthcare and education. One tool your whole company can use.`
      : 'WorkCoPilot guides work across many professional fields, from software and security to finance, operations, marketing, healthcare and education. One tool your whole company can use.',
    h1: 'Expert in your field, whatever your field is.',
    lede: [
      n
        ? `One tool your whole company can use. WorkCoPilot guides work across ${n} professional fields, and the steps read like an expert in that field wrote them.`
        : 'One tool your whole company can use. WorkCoPilot guides work across many professional fields, and the steps read like an expert in that field wrote them.',
    ],
    // One bullet per family: "Family (count): field, field, ..." straight from WorkFields.jsx.
    points: FIELDS ? FIELDS.fams.map((f) => `${f.k} (${f.items.length}): ${f.items.join(', ')}.`) : [],
  })
}

route({
  path: '/workcopilot/pricing',
  label: 'Pricing',
  source: 'WorkPricing.jsx',
  title: 'Pricing - WorkCoPilot by AdmireVeda',
  description: 'WorkCoPilot plans compared side by side: Basic, Advanced and Premium with daily live guidance hours, document upload, generated visuals, security on every plan, overage and cancellation terms. Enterprise is custom.',
  h1: 'Simple plans. Real guided time.',
  lede: [
    'Hours of live, step-by-step guidance every day. Plans differ in daily capacity and a few power features. Security and privacy are built into every plan, never sold as an upgrade.',
    'Current prices are shown on the live page.',
  ],
  points: [
    'Basic: 2 hours of daily live guidance, up to 4 tasks a day.',
    'Advanced: 4 hours of daily live guidance, up to 8 tasks a day, plus uploading your own reference documents and visual examples.',
    'Premium: 6 hours of daily live guidance, up to 12 tasks a day, plus generated visuals on demand and the highest priority.',
    'Enterprise: custom, for regulated teams, with SSO, company policy, seat pools and a DPA.',
    'Plans are billed monthly and you can cancel yourself anytime. Extra guided time never expires.',
  ],
})

route({
  path: '/workcopilot/security',
  label: 'Security and privacy',
  source: 'WorkSecurity.jsx',
  title: 'Security and Privacy - WorkCoPilot by AdmireVeda',
  description: 'How WorkCoPilot protects your data: sensitive values redacted or tokenized on your device before anything is sent, read-only guidance, encryption at rest, the full data flow, retention, and compliance readiness.',
  h1: 'See exactly what is protected',
  lede: [
    'Before anything is sent, sensitive data is stripped or tokenized on your own device, in screenshots and in text. You decide what counts as sensitive, on top of the industry-standard detectors.',
  ],
  points: [
    'On your screen: each outbound frame is checked on your device, and any line with a sensitive value is blacked out before the frame leaves.',
    'In your text: typed or pasted text gets the same protection. Each sensitive value becomes a token, the real values never leave your device, and the answer is rebuilt locally.',
    'Read-only by design: it never clicks, types or runs anything in your systems.',
    'A plain account of how your data moves and how long we keep it, as a disclosure of what the product does today, not a compliance claim.',
    'Controls and audit evidence to support compliance across the frameworks you report to. Your admin arms a policy per company and locks it.',
  ],
})

route({
  path: '/workcopilot/faq',
  label: 'FAQ',
  source: 'WorkFaq.jsx',
  title: 'FAQ - WorkCoPilot by AdmireVeda',
  description: 'Straight answers about WorkCoPilot: what it is, how the step-by-step guidance works, platforms and install, what leaves your device, pricing and billing, how it stays current by learning your tools, who it is for, data and compliance, and getting started.',
  h1: 'Straight answers, before you start.',
  lede: [
    'Everything people ask about WorkCoPilot, in plain words: what it is, how it guides you, what leaves your device, what it costs, and how it stays current when your tools change.',
  ],
  // Q&A lifted verbatim (answer sentence) from WorkFaq.jsx.
  points: [
    'What is WorkCoPilot? WorkCoPilot is a screen-aware guide that watches your screen and tells you the exact next step for any task, in any app, until the job is done.',
    'Is WorkCoPilot a chatbot? No. WorkCoPilot is live, step-by-step guidance tied to what is actually on your screen, not a chat window you paste questions into.',
    'Does WorkCoPilot do the work for me? No. WorkCoPilot is read-only by design: it watches and guides, and never clicks, types or runs anything in your systems.',
    'Do I need to install anything? No. WorkCoPilot runs in your browser and floats over your work, so it guides you even on locked-down machines, restricted laptops and virtual desktops.',
    'Which platforms does WorkCoPilot support? WorkCoPilot works in any modern browser with nothing to install, as a Windows desktop app, and on mobile, with the Android app coming soon.',
  ],
})

// ---- templating ---------------------------------------------------------------
function jsonLd(r) {
  const url = ORIGIN + r.path
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': ORIGIN + '/#org', name: 'AdmireVeda', url: ORIGIN + '/',
        description: 'AdmireVeda builds WorkCoPilot, a screen-aware guide that walks you through any task step by step.',
      },
      { '@type': 'WebPage', '@id': url + '#page', url, name: r.title, description: r.description, isPartOf: { '@id': ORIGIN + '/#org' } },
    ],
  }, null, 2).replace(/</g, '\\u003c')
}

function seoBlock(r) {
  const links = [{ path: '/', label: 'WorkCoPilot home' }, ...R.filter((x) => x.path !== r.path)]
  // Inline styles only (no new CSS file, no script): readable on the page's own
  // background until React replaces the whole of #root on mount.
  const wrap = 'max-width:760px;margin:0 auto;padding:32px 20px 48px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:inherit'
  return `<div id="prerender-seo" data-prerender-route="${esc(r.path)}" style="${wrap}">
      <main>
        <h1 style="font-size:1.9rem;line-height:1.2;margin:0 0 16px">${esc(r.h1)}</h1>
${r.lede.map((p) => `        <p style="margin:0 0 14px">${esc(p)}</p>`).join('\n')}
${r.points.length ? `        <ul style="margin:0 0 20px;padding-left:20px">\n${r.points.map((p) => `          <li style="margin:0 0 8px">${esc(p)}</li>`).join('\n')}\n        </ul>` : ''}
      </main>
      <nav aria-label="WorkCoPilot pages" style="margin-top:24px">
        <ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px">
${links.map((l) => `          <li><a href="${esc(l.path)}">${esc(l.label)}</a></li>`).join('\n')}
        </ul>
      </nav>
    </div>`
}

// Replace exactly one occurrence or fail loudly: a silent no-op here would ship a
// page that still carries the home-page SEO.
function swap(html, re, replacement, what) {
  if (!re.test(html)) throw new Error(`template is missing ${what}; index.html shape changed, update the script`)
  return html.replace(re, () => replacement)
}

function render(template, r) {
  const url = ORIGIN + r.path
  let h = template
  h = swap(h, /<title>[\s\S]*?<\/title>/, `<title>${esc(r.title)}</title>`, '<title>')
  h = swap(h, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(r.description)}" />`, 'meta description')
  h = swap(h, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`, 'canonical')
  h = swap(h, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(r.title)}" />`, 'og:title')
  h = swap(h, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(r.description)}" />`, 'og:description')
  h = swap(h, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(url)}" />`, 'og:url')
  h = swap(h, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(r.title)}" />`, 'twitter:title')
  h = swap(h, /<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(r.description)}" />`, 'twitter:description')
  h = swap(h, /<!-- Structured data:[^>]*-->/, '<!-- Structured data: Organization + WebPage -->', 'structured-data comment')
  h = swap(h, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n    ${jsonLd(r).replace(/\n/g, '\n    ')}\n    </script>`, 'JSON-LD block')
  // The shell's <noscript> repeats the HOME copy; on these pages that would
  // contradict the route, and the content block below already serves no-JS users.
  h = swap(h, /\s*<noscript>[\s\S]*?<\/noscript>/, '', '<noscript> block')
  h = swap(h, /<div id="root"><\/div>/, `<div id="root">\n    ${seoBlock(r)}\n    </div>`, 'empty <div id="root"></div>')
  return h.replace(/<!doctype html>/i, (m) => `${m}\n${MARKER}`)
}

// ---- checks ---------------------------------------------------------------------
function tags(html, re) { return [...html.matchAll(re)].map((m) => m[0]).sort() }
const BUNDLE_RE = /<(script)\b[^>]*\bsrc="\/copilot-assets\/[^"]+"[^>]*><\/script>|<link\b[^>]*\bhref="\/copilot-assets\/[^"]+"[^>]*>/g

function checkCopy() {
  const warnings = []
  for (const r of R) {
    let src = ''
    try { src = fs.readFileSync(path.join(SRC_PAGES, r.source), 'utf8') } catch { warnings.push(`${r.path}: cannot read ${r.source}`); continue }
    if (r.source === 'WorkFields.jsx') continue   // template-literal strings, derived from source above
    for (const [k, v] of [['title', r.title], ['description', r.description]]) {
      if (!src.includes(v)) warnings.push(`${r.path}: ${k} no longer matches useSeo() in src/pages/${r.source}`)
    }
  }
  if (!FIELDS) warnings.push('/workcopilot/fields: could not parse WorkFields.jsx; generated generic copy without counts')
  return warnings
}

function main() {
  const warnings = checkCopy()
  for (const w of warnings) console.warn('WARN  ' + w)
  if (flag('--check')) { console.log(warnings.length ? `check: ${warnings.length} warning(s)` : 'check: copy matches page sources'); process.exit(flag('--strict') && warnings.length ? 1 : 0) }

  const tplPath = path.join(DIST, 'index.html')
  if (!fs.existsSync(tplPath)) { console.error('prerender: dist/index.html not found, run `vite build` first'); process.exit(1) }

  if (flag('--clean')) {
    let n = 0
    for (const r of R) {
      const f = path.join(DIST, r.path, 'index.html')
      if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(MARKER)) { fs.rmSync(f); n++ ; try { fs.rmdirSync(path.dirname(f)) } catch { /* dir not empty */ } }
    }
    try { fs.rmdirSync(path.join(DIST, 'workcopilot')) } catch { /* not empty / absent */ }
    console.log(`prerender: removed ${n} generated file(s)`); return
  }

  const template = fs.readFileSync(tplPath, 'utf8')
  if (template.includes(MARKER)) { console.error('prerender: dist/index.html carries the prerender marker; it must stay the pristine shell. Rebuild.'); process.exit(1) }
  const bundle = tags(template, BUNDLE_RE)
  if (!bundle.some((t) => t.startsWith('<script'))) { console.error('prerender: no /copilot-assets/ <script> in dist/index.html; refusing to write pages that would not load the app'); process.exit(1) }

  for (const r of R) {
    const out = render(template, r)
    // The one invariant that protects the live SPA: identical bundle tags.
    const got = tags(out, BUNDLE_RE)
    if (JSON.stringify(got) !== JSON.stringify(bundle)) throw new Error(`${r.path}: bundle tags changed during render`)
    const file = path.join(DIST, r.path, 'index.html')
    if (!path.resolve(file).startsWith(DIST + path.sep)) throw new Error('refusing to write outside dist/')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, out)
    fs.renameSync(tmp, file)   // atomic replace: a crawler never sees a half-written page
    console.log(`prerender: ${r.path.padEnd(30)} -> dist${r.path}/index.html  (${out.length} bytes)`)
  }
  console.log(`prerender: ${R.length} route(s). "/" intentionally left to dist/index.html (already carries home SEO + noscript copy).`)
  if (flag('--strict') && warnings.length) process.exit(1)
}

main()
