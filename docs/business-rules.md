# WorkCoPilot - Business Rules (Protected)

**Status: binding. These rules must be protected by all means.**
Owner: Ravi Yerra. Last updated: 2026-10-23.

These are product + IP + trust rules, not style preferences. Every change to
WorkCoPilot - code, copy, dashboards, documents, API responses, error messages,
marketing, or the desktop/mobile apps - must comply. When a change would violate
one of these, the change is wrong, not the rule. If a rule needs to change, the
owner changes it here first.

Enforcement is defense-in-depth: the UI must not render it, AND the server must
not send it. Hiding something only in the client is NOT compliance, because the
network response is readable in the browser.

---

## 1. Model confidentiality (IP)

**AI model names are platform IP. No one may see them except the superadmin.**

- Never expose a model name or model id to any user, team member, or company
  admin - not in the UI, not in an API response, not in the audit log, not in a
  downloadable document, not in an error message, not in marketing.
- "Which model planned/handled this" is never surfaced. The user-facing wording
  is a tier or capability descriptor only: "a stronger model", "a vision-capable
  model", "an approved AI handled it, with no silent substitution". Never the
  name.
- The superadmin console (`src/pages/workadmin/sections/*`, `WorkAdmin.jsx`,
  Incidents) and the internal/on-disk audit record KEEP the model, for governance
  and forensics. That is the only place it lives.
- Config fields where a user/admin brings their own key must NOT name models.
  The provider/model is auto-detected server-side; the form shows "a
  vision-capable model (auto-detected)" at most.

## 2. Cost confidentiality (IP)

**AI / token cost is platform IP. No one may see it except the superadmin.**

- Never show per-token pricing (`$/Mtok`), per-model price, per-session AI cost,
  AI spend, or token counts tied to cost to a user, team member, or company admin.
- Company admins and users see usage in the PRODUCT'S units only: minutes/hours
  of guidance, session counts, seats. Never the dollar cost of the AI.
- The subscription PRICE the customer pays (plan $/month) and their own Stripe
  invoices ARE shown - that is their bill, not our AI cost. Keep those.
- The superadmin console keeps the full cost/consumption dollar view.

## 3. No excess / build-enabling information - anywhere

**Nobody should be able to rebuild WorkCoPilot by reading our website,
dashboards, documents, or errors.** Sell the WHAT and the BENEFIT and the
user-facing GUARANTEE. Never ship the HOW-IT'S-BUILT.

Remove / never add, on any public or customer-facing surface:
- The engine mechanism as a recipe (the read-screen / plan / watch / confirm /
  advance loop spelled out, the vision pipeline, replan logic).
- On-device redaction internals: the OCR step, the recognize-then-mask pipeline,
  downscale sizes (e.g. 1280), the "same module on device and server" framing,
  detector regexes, token-to-value map internals. Keep the GUARANTEE instead.
- Named AI providers as "what we use" (OpenAI, Google, Groq, etc.). A neutral
  provider field for the customer's OWN key is allowed only where they must pick
  one; never as our recommendation or our stack.
- Method-grounding internals ("51 disciplines", method anchors), exact rule
  counts, internal module names, internal endpoints, the failover ladder.
- Benchmark internals (harness, graders, corpus construction, held-out mechanics).
  Report results per tier, honestly, with no model named.

Accepted unavoidable exposure: on-device screen redaction runs in the browser, so
the OCR library (tesseract.js) is visible in client code. That is the price of
the "nothing leaves your device" guarantee; moving it server-side would break the
guarantee. Source-code comments are stripped at build, so only the library itself
is visible, never the mechanism write-up.

## 4. Privacy and data protection (guarantees we DO make)

- Read-only: WorkCoPilot never clicks, types, or runs anything.
- On-device protection: sensitive data (PII, PHI, secrets, keys, card numbers,
  IPs, and custom rules) is stripped or tokenized on the device before anything
  is sent; the least is sent. State the guarantee, not the mechanism.
- Data boundary: a customer's own / company key stays with them. Their data is
  subject to their provider's terms, not silently rerouted.
- Secrets at rest are encrypted (AES-256-GCM) - this standard posture disclosure
  is allowed and expected.
- The installed app is hidden from screen shares by default; the user chooses
  when to share and which display.

## 5. Security-first code + supply chain (a SELLING point - advertise it)

WorkCoPilot's answers are quality-assured, and we SHOULD say so (benefit-framed,
never the tool/recipe):
- **SAST / secure-by-default:** every command, snippet, script and fix is written
  the secure way and checked for common risks (injection, hard-coded secrets,
  least privilege, validated input, current versions) before it reaches the user.
- **SCA / supply chain:** dependencies are checked for known-vulnerable versions
  before they are recommended.
- Advertise the BENEFIT ("secure, vetted answers; no known-vulnerable libraries")
  and never name the scanner, database, or internal rule set.

## 6. Honesty and claims

- Never "certified" or "compliant". Only "compliance-ready" / "controls and
  evidence that support your compliance under the frameworks you choose".
- No fabricated metrics or numbers. Benchmark numbers are published only from a
  real run, with a held-out set, reported per tier.
- Every claim must be true and at or below what the code actually does.

## 7. Lead capture placement

- The public "Validate it live" lead widget appears ONLY on the public web
  (marketing, demo, use-cases, login). It must render NOTHING inside the desktop
  app (`window.workDesktop`) or the mobile app (`WorkCoPilotApp/<n>` user agent),
  where the person is already a user.

## 8. Errors

- Users never see raw system or AI errors. They see a calm, generic message
  ("system busy"); the detail (including any model/provider) goes only to the
  superadmin Incidents feed. Error text must never leak a model, provider, stack,
  internal path, or cost.

## 9. Language

- US English spelling everywhere (outputs, UI, prompts, docs).
- No em-dashes in user-facing copy.

---

## Enforcement points (single sources of truth)

- In-app lead gate: `isInApp()` in `src/components/LiveValidate.jsx`
  (`window.workDesktop` or `WorkCoPilotApp/<n>` UA).
- Model/cost confidentiality, server side: the company-admin routes in
  `server/index.js` (`/api/work/team/ai`, `/api/work/team/ai-recommendation`,
  `/api/work/team/consumption`) strip model/provider/cost; the watch + replan
  responses and the `appendWorkEvent` texts carry no model name; the user audit
  log (`formatWorkAuditLog` in `server/store.js`) omits the model.
- Public-page scrub: the public `Work*` pages under `src/pages/` and the Security
  & Privacy paper (`docs/security-paper-content.mjs` -> regenerated PDF) are kept
  free of mechanism / model / provider / cost detail.
- Superadmin-only visibility: everything model/cost lives under
  `src/pages/workadmin/sections/*`, `WorkAdmin.jsx`, Incidents, and the internal
  audit record.

## How to verify before shipping

Run these over the built bundle and the customer-facing surfaces:

```bash
# No specific model names in the shipped client bundle:
JS=$(ls dist/copilot-assets/index-*.js | head -1)
grep -oiE "claude-[a-z0-9.-]+|gpt-4[a-z0-9.-]*|gemini-[a-z0-9.-]+|gpt-4o-mini|deepseek|mistral-[a-z0-9.-]+" "$JS" | sort -u   # expect: empty

# No AI cost in company-admin / user client code:
grep -rniE "usdPerMtok|/Mtok|totalUsd|\\\$.*model" src/pages/WorkTeam.jsx src/pages/workadmin/WorkCompanyAdmin.jsx src/pages/WorkPage.jsx   # expect: no displays

# No secrets / source maps / infra in the bundle:
grep -oE "sk-[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|-----BEGIN" "$JS"   # expect: only detector patterns, never a real key
ls dist/copilot-assets/*.map 2>/dev/null   # expect: none
```

Any violation blocks the ship.
