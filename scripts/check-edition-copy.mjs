// BUILD GATE: edition wording (scripts/edition_copy_scan.mjs has the rules).
//   - every audience overlay only replaces existing base keys, same type;
//   - every locale carries exactly its audience's en overlay keys;
//   - the individuals audience reads no company wording, the organizations
//     audience reads no personal-plan wording, in every namespace it can see.
//   node scripts/check-edition-copy.mjs        exit 1 on any problem
import { runAll } from './edition_copy_scan.mjs'

const { problems, hits, legalPending } = await runAll()
if (legalPending.length) console.warn(`[edition-copy] NOTE: ${legalPending.length} legal-page string(s) mention companies on the individuals edition (terms, privacy, refund, ...). Changing legal text per audience is an owner + counsel decision (LEGAL_PENDING in scripts/edition_copy_scan.mjs); not a build failure.`)
for (const p of problems) console.error(`[edition-copy] ${p}`)
for (const [aud, list] of Object.entries(hits)) for (const h of list) console.error(`[edition-copy] ${aud}: ${h.path} reads "${h.word}" (add it to src/i18n/overlays/${aud}/en.js, or hide the surface and list the key in HIDDEN with the reason)`)
const n = problems.length + Object.values(hits).reduce((a, l) => a + l.length, 0)
if (n) { console.error(`\n[edition-copy] FAILED: ${n} problem(s).`); process.exit(1) }
console.log(`[edition-copy] OK: ${Object.keys(hits).length} audience overlay(s), every locale complete, no banned wording on a visible surface.`)
