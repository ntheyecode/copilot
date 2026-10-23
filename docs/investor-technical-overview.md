# WorkCoPilot — Technical Overview (WIP, for investor discussion)

> Status: working draft. Every claim here is grounded in shipped code and gated
> by tests; where something is in progress or operator-dependent, it says so.
> We do not publish fabricated metrics, and we never claim to make a customer
> "certified" or "compliant" — we provide the controls and the evidence.

Product: **WorkCoPilot by AdmireVeda** — a read-only, screen-aware AI that guides
one person through their own work in real time, on any app and in any field.
Live at admireveda.com. Desktop, mobile and browser; one subscription covers all
three.

---

## 1. What it is, in one paragraph

You set a goal. The strongest AI model your key can reach **plans** it. A fast
model then **watches your screen** and tells you the exact next move, one step at
a time, until the job is done — with the precise command, click-path, value or
official link, and a "done when" check at each step. It can also **return the
actual result** (a number, table, draft, query or code), **author a document**,
and **compute over a spreadsheet entirely on your device**. Every session ends
with a documented write-up you keep. It never acts on your systems — it guides,
you decide.

## 2. The core bet, and why it is defensible

1. **Read-only, screen-aware guidance is a different product than an agent.** We
   do not take actions on the user's systems. That removes the single biggest
   enterprise blocker to AI adoption (an autonomous agent with write access) and
   makes the product deployable into regulated, security-sensitive environments.
2. **Privacy is enforced on the device, not promised in a policy.** Sensitive
   data (PII, PHI, secrets) is stripped or tokenized **on the user's machine**
   before anything leaves; the full answer is rebuilt locally. The AI never sees
   the real values. Spreadsheet compute runs entirely in the browser — the rows
   never leave the device. This is a structural moat for finance, healthcare,
   security and government buyers.
3. **Security-first by construction.** Every command, snippet and dependency we
   put in front of a user is checked the secure way before they see it, by a
   deterministic gate, not just a prompt. Destructive steps are flagged and gated.
4. **Model-agnostic with a quality floor.** We route to the top-ranked model a
   customer's key can reach (ranking informed by public community leaderboards),
   fail over cleanly when a model retires or rate-limits, and let enterprises
   bring their own provider keys so usage bills to their own account and their
   data boundary holds. We are not locked to one vendor.

## 3. How it works (architecture)

- **Single-origin app**: React SPA + an Express (Node, ESM) server; a desktop
  shell (Electron) and a mobile/camera path share the same engine. JSON
  persistence with atomic writes (temp + fsync + rename, ownership preserved).
- **Guidance engine**: a short, hardened base persona + a detailed read-only,
  accuracy-first, security-first "work mode" prompt, grounded per discipline by
  **56 method anchors** (one canonical methodology per field injected into the
  plan). A step-then-watch loop: plan once with the strong model, watch + guide
  continuously with the fast model; a just-in-time "deep pass" escalates a single
  frame to the strong model when the fast one is unsure.
- **The result channels** (audited, end-to-end, tested):
  - *Result* — returns the actual answer with an honesty contract (confidence
    meter, "how I got it", "verify by", visible caveats; a soft answer is never
    shown as a trusted one).
  - *Compose* — authors the finished document (email, doc, table, code, notes).
  - *Compute* — parses CSV/XLSX **on the device**, sends only `{what, schema,
    rowCount}` (never the rows), gets back a spec, and runs it locally on the
    full data.
- **On-device governance**: an armed, lockable DLP policy per company (block
  words, per-category scrub vs tokenize, custom regex fields) applied before any
  outbound call, plus a per-session audit log of exactly what was transmitted.
- **AI reliability ladder**: retired/rate-limited model → another current model
  on the same key → the next provider key (platform mode only; own/company keys
  stay put) → a crisp, coded error. Every switch is a logged operator incident;
  key/auth errors are never masked. Users see a quiet "switched to keep going",
  never a raw failure, and never the model name.

## 4. Security & trust posture (shipped)

- **Encryption at rest** (AES-256-GCM) for stored secrets (AI/web-search/Stripe/
  SSO/session keys) and for report artifacts (milestone screenshots). Transparent
  at the storage boundary; a key that cannot decrypt refuses to start rather than
  silently losing data. Managed-key (`WORK_ENC_KEY`) and rotation runbook in ops
  docs.
- **Security gate (SCA + secure-coding backstop)**: every plan and every
  code-type result/composition is deterministically checked for dangerous command
  patterns and known-vulnerable dependency versions (OSV.dev) and flagged with the
  safe fix *before* the user acts. Honest when the vulnerability database is
  unreachable.
- **Destructive-step confirm**: irreversible commands (delete, drop, force-push,
  infra teardown, disk format) are flagged and hidden behind an explicit
  acknowledge.
- **Model privacy**: the specific model/provider is never shown to end users
  (kept in the server audit + operator incidents only).
- **Accountable data lifecycle**: user/admin deletion removes a session *and* its
  on-disk screenshots and transmission log; a configurable retention window can
  auto-purge on a schedule; company admins get member-session oversight.
- **Enterprise access**: invite-only SSO across 14 OIDC providers, separate
  user/admin seat pools, per-company minute pools, and a recorded **authorization
  attestation** (the org affirms it authorizes use).

## 5. Compliance posture (honest framing)

WorkCoPilot provides **controls and audit evidence that support** a customer's
compliance; it does not make anyone certified or compliant. We ship
compliance-ready mappings and one-click armable policies for **21 frameworks**:
GDPR / UK-GDPR / CCPA-CPRA / PIPEDA / LGPD / Australian APPs / POPIA / India DPDP;
HIPAA / HITECH; PCI DSS / SOX / GLBA; SOC 2 / ISO 27001 / ISO 27701 / NIST 800-53
/ NIST CSF / CIS Controls; FedRAMP-readiness; FERPA. Public Security page (real
before/after, full data-flow + retention disclosure), Privacy Policy, Disclaimer,
and a downloadable security paper back this.

## 6. Accuracy & quality discipline

- **Accuracy benchmark** (result correctness): a built, tested harness
  (deterministic + execution + AI-judge grading with human spot-check), a validated
  task corpus across dev/data, finance, cross-profession and security, scored per
  domain with 95% confidence intervals for a top-ranked and a fast model
  separately, a held-out set to resist overfitting, and a public scoreboard page.
  We report true numbers with their sample size, never a rounded figure; numbers
  populate from an operator run. (Honesty over marketing: the page is live in a
  transparent "pending first run" state today.)
- **Engineering discipline**: 110 automated tests gate the backend (AI failover,
  the three result channels, the security gate, encryption at rest, the task cap,
  retention, destructive detection, benchmark graders). Every shipped change is
  verified on production; UI is built by capable models and reviewed; new
  high-risk logic gets a fresh-eyes adversarial review before close-out. A dated
  engineering log maintains traceability.
- **Honesty guardrails are enforced in code**: a shared language scrubber keeps
  output from sounding like generic AI; no "certified/compliant" claims; no
  fabricated metrics; the model is never exposed to users.

## 7. Product surface (features)

Guidance (step-by-step, exact commands/code/links, roadmaps, diagrams, floating
guide, full-screen second-monitor guide with a reader-controlled font size,
session write-up) · Result / Compose / on-device Compute · mid-session
attachments with auto-replan · per-session report with scrubbed milestone
screenshots · desktop + mobile/camera + browser · enterprise SSO, seats, minute
pools, per-company AI keys, governance, billing + invoices · superadmin console
(AI config, pricing, companies, governance, incidents, dynamic homepage hero,
leads, retention) · public marketing with an honest feature matrix and ROI
framing.

## 8. Commercial model

Subscription tiers by daily guiding time (Basic/Advanced/Premium) with a daily
task allowance (4 / 8 / 12) and corporate = unlimited; hourly overage and image
packs; annual option; Enterprise (custom, unlimited seats + tasks, SSO, BYO keys,
on-prem option). All limits are operator-configurable.

## 9. Roadmap (near-term)

- Publish the first accuracy-benchmark numbers (operator run) and grow the corpus
  to 200+ with sandboxed SQL/Python execution grading.
- Extend the benchmark beyond result correctness (plan quality, screen-reading,
  security detection).
- Per-company retention windows; one-command encryption-key rotation.
- Signed desktop + MSI release carrying the latest guide + security UX.

## 10. The thesis for investors

A privacy-by-construction, read-only, security-first AI copilot that enterprises
in regulated industries can actually deploy — model-agnostic, bring-your-own-key,
with the governance, audit, honest accuracy measurement and compliance evidence
that procurement asks for, built with a visible discipline of tests, reviews and
traceability. We compete not on "an agent that does it for you," but on "the
sharpest expert on every screen, that your security and compliance teams will
sign off on."
