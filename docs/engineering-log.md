# WorkCoPilot — Engineering Log (traceability)

A dated, honest record of what we built and why. Feeds the investor-pitch
technical doc. Append new entries as work lands; never rewrite history.

---

## 2026-10-22 — Security, trust and enterprise hardening sprint

Driven in part by an external (ChatGPT) risk review of the public Security page.
Owner directive: **fix the gaps, do not just disclose them.** Every item below is
shipped to production (admireveda.com) and gated by automated tests unless noted.

### Trust & security (fixes, not disclosures)
- **Encryption at rest (keys + secrets).** db.json secrets (AI keys, web-search
  keys, Stripe secret + webhook, SSO client secret, session secret) are AES-256-GCM
  encrypted at the load/persist boundary; in-memory stays plaintext so no getter
  changed. Master key = `WORK_ENC_KEY` or an auto-created `.enc.key` (0600). Legacy
  plaintext is eagerly migrated on startup; an undecryptable key refuses to start
  (never silently blanks a key). Prod migrated: 5 encrypted fields.
- **Encryption at rest (report artifacts).** Milestone screenshots are encrypted
  on disk (ENCIMG1 magic header, same key); the PDF report reads them decrypted;
  one-time migration of any legacy plaintext shots.
- **Security gate (SCA + secure-coding backstop).** Every plan, and every
  code-type Result/Compose output, is deterministically checked: dangerous command
  patterns + known-vulnerable dependency versions (OSV.dev) flagged with the safe
  fix BEFORE the user acts. Honest when the vuln DB is unreachable.
- **Destructive-step confirm.** Irreversible commands (rm -rf, DROP, git push -f,
  terraform destroy, mkfs, etc.) are flagged on plan + how-to steps; the app hides
  the command behind an explicit "I understand" acknowledge.
- **Never expose the model.** Model/provider names removed from all user-facing
  surfaces (plan event + response, /ask //result //compute //compose, failover
  message, marketing band, how-it-works). Kept in the server audit + superadmin
  incidents only.
- **On-device redaction (prior work, reaffirmed).** PII/PHI/secrets stripped or
  tokenized on the device before anything leaves; answers rebuilt locally; the AI
  never sees real sensitive values. Read-only by design: never acts on systems.
- **"Guidance, not professional advice" disclaimer** in the AI prompt + report
  footer (legal/tax/financial/medical/compliance).
- **AI reliability failover.** Retired/rate-limited model → next current model on
  same key → next provider key (platform mode only; own/company keys stay put =
  data boundary) → crisp coded error; every switch is a superadmin incident; keys
  never masked.

### Compliance posture
- Per-company DLP policy (arm + lock), block words, custom fields, scrub vs
  tokenize; per-session audit log; member session oversight for admins.
- Compliance-READY mapping for 21 frameworks (GDPR/UK-GDPR/CCPA/PIPEDA/LGPD/
  APPs/POPIA/DPDP, HIPAA/HITECH, PCI/SOX/GLBA, SOC2/ISO 27001/27701/NIST 800-53/
  CSF/CIS, FedRAMP-readiness, FERPA) — framed as controls + evidence, never
  "certified/compliant".
- Public Security page: real before/after, data-flow + retention disclosure,
  compliance showcase. Public Privacy Policy + Disclaimer pages.
- **Configurable data retention**: superadmin auto-purge window (0 = keep forever
  default); hourly + on-save sweep; deletions logged + shot files removed.
- **Authorization attestation**: company admin affirms the org authorizes use;
  recorded with who + when.

### Product / commercial
- **Daily task cap** (Basic 4 / Advanced 8 / Premium 12 / Corporate unlimited),
  superadmin-editable, on top of the minutes model; finish-current-before-new.
- **Dynamic homepage hero** (superadmin-editable rotating headline/subtext).
- **Feature matrix + honest ROI** on the homepage (no fabricated numbers).
- **Profession capability** (audited complete): Result channel (returns the
  answer), Compose (authors documents), on-device CSV/XLSX Compute (rows never
  leave the device), 56 method anchors grounding guidance per discipline.

### Quality
- Test suite: 98 passing (was 79 at sprint start). New gates: ai_failover,
  work_result/compose/compute, security_gate, encryption_at_rest,
  work_task_cap, work_retention, destructive_check.
- Every feature verified live on production; honesty guardrails enforced
  (no "certified/compliant", no fabricated metrics, model never exposed to users).

### In progress (this session, autonomous completion run)
- Docs-style guide redesign (Microsoft-Learn density + user font-size control).
- Admin cards elevated to the marketing "Option C" look.
- Accuracy benchmark (result-correctness; harness + corpus + honest scoreboard).

---

## 2026-10-22 (cont.) — Autonomous completion run (waves)

- **Docs-style guide redesign (Wave 1).** Rebuilt the guidance reading experience
  to Microsoft-Learn conventions: compact default body text (full-screen guide
  current-step 28px→16px, body 17→13.5; console hero 19→15), bold-where-clicked,
  blue inline "Open" links, dark code copy-boxes preserved (CmdBlock/CodeBlock +
  the destructive-step gate untouched), tighter rhythm, and a **shared,
  persistent A-/A/A+ font-size control** (`GuideFontScale.jsx`, localStorage
  `wc-guide-fontscale`, default compact). Live.
- **Admin cards elevated to Option C (Wave 2a).** Visual-only refinement of the
  shared admin design system (layered soft shadows, faint header gradient tint,
  roomier padding) - no class/structure changes, so all 11 sections lift at once
  with no regression risk. Live.
- **Accuracy benchmark (Wave 3).** Built the harness (`server/eval/`): graders
  (deterministic exact/number/json/table/regex + sandboxed JS exec + injected
  LLM-judge; 8 unit tests), a 20-task validated pilot corpus (5/domain, 4
  held-out), a runner that feeds tasks through the REAL result pipeline and
  reports per-domain + overall with 95% CIs for a strong + fast model separately,
  and a public **scoreboard page** (`/workcopilot/benchmark`, honest pending
  state until a run) + API. Internal detail (exact model/per-task) never
  published. Producing numbers is a one-command operator step (needs an AI key).
  Spec: `docs/accuracy-benchmark-spec.md`. Suite now 106.
- **Encryption key runbook (Wave 5).** `docs/ops-encryption-keys.md` - backup,
  move to a managed `WORK_ENC_KEY`, rotation procedure, failure handling.
- **Quality review + fixes.** A fresh-eyes adversarial review of the session's new
  backend logic was run. It validated the encryption core, db-load safety, task-cap
  and timezone logic as solid, and surfaced issues that were then fixed + gated:
  - H1 (high): `deleteWorkSession` left milestone screenshots orphaned on disk -
    now removes the files + session shot dir (honors the deletion guarantee).
  - H2 (high): retention purge aged ACTIVE sessions by `startedAt`, risking purge
    of a long-lived but recently-used session - now ages by last activity.
  - M1: benchmark `exec` grader could hang on an async/never-resolving candidate -
    now bounded by a wall-clock deadline.
  - M3: `gradeTable` could false-pass with duplicate reference rows - now multiset.
  - M4: `exec(js)` task without `expected` is rejected by the validator.
  - L1: `.enc.key` now created exclusively (`wx`) to survive a concurrent first boot.
  - M2/L3: grader comment + a detail-string typo corrected.
  Suite 106 → 110 (new gates for H1/H2/M1/M3). Deployed + clean boot.

### Held for explicit owner "build"
- Signed desktop v1.0.5 + MSI (carries buddy auto-grow, full-guide IPC, the guide
  redesign, task-cap + destructive-confirm UI to desktop users). Build-ready; not
  built (outward-facing ship step, gated per standing rule).

<!-- append new dated entries below -->
