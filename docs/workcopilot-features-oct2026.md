# WorkCoPilot — feature log (building toward the Oct 2026 release)

Living record of what we shipped, for the website and marketing docs. Grouped by
theme. Each item is written so it can be lifted into marketing copy. Keep adding
as features land. (Owner rule: document every implementation; market each feature
on completion.)

> Positioning: WorkCoPilot is a read-only, screen-aware copilot that plans any
> task, guides you step by step on your own screen, catches a wrong move and
> corrects it — private by design, documented when you finish.

---

## Security & privacy (the differentiator)

- **On-device redaction, now ON by default.** PII/PHI/secrets — API keys,
  passwords, tokens, account/SSN/tax IDs, medical record/DOB, card numbers, IPs —
  are stripped on the device and replaced with `[REDACTED]` **before anything is
  sent**. Applies to the goal, questions, the WRITE/Compose request and any pasted
  source. Company governance policies (block/mask) apply on top.
- **Per-session audit log that proves it.** Every interaction records: what was
  sent, what the assistant read from your screen, the security checks run on any
  code, what sensitive content was filtered (shown as `[REDACTED]` with a count),
  and any flags raised. Times in UTC. When you enter PII/PHI it says so explicitly
  and shows the redacted query that was actually sent. SHA-256 + HMAC authenticity
  seal; verifiable at a public endpoint.
- **Built-in SAST + live SCA on code.** Any command or code block the copilot
  hands over passes a mandatory security gate: static review for injection,
  hard-coded secrets and least-privilege, plus a **live dependency CVE check
  against the OSV database**. Findings are surfaced to you and logged.
- **Company-admin PII alerts.** When a member enters PII/PHI (redacted on device),
  the company admin is notified on a dashboard Alerts page — WHO (name + email),
  WHAT (categories + count, never the values), WHERE (which task), WHEN.
- **SOC / SIEM relay (in progress).** Integrations so those alerts auto-relay into
  the customer's threat-management stack (Splunk, Microsoft Sentinel, QRadar,
  Elastic, Datadog, Sumo Logic, Chronicle, PagerDuty, Opsgenie, Slack, Teams,
  ServiceNow, plus generic Webhook and Syslog/CEF). [building]
- **Encryption at rest** for report artifacts (milestone screenshots), AES-256-GCM.
- **Mandatory MFA (TOTP)** on first login; social sign-in also requires it.
- **Compliance evidence** mapped to 18 frameworks (SOC 2, ISO 27001, NIST CSF,
  PCI DSS, HIPAA, GDPR, FedRAMP readiness, and more), produced per session.

## Guidance experience

- **Plan any task** with a short scoping interview — now choose **Quick or
  Detailed** up front. "Other… type my own" on every question.
- **Pre-task readiness coach** (prevents wasted tasks): pick the kind of task,
  answer a few readiness questions, get a tailored sample and tips, then write
  your task. 100% on-device, no cost.
- **One step at a time**, screen-aware: the copilot reads your screen, confirms
  each step, catches a wrong move (bold alert that clears when you're back on
  track), and reveals the next step when you're ready.
- **The buddy** — small, unobtrusive, fully animated mascots (boy / girl / dog /
  cat) that blink, glance, speak, celebrate a done step and look concerned on an
  alert. Hidden means zero footprint; hiding pauses and saves; opens with the app.
- **Attention "magic"**: the current action is highlighted, key words/commands
  emphasized, confirmations animate — all reduced-motion safe.
- **Maximized view**: centered, boxed stage with a plan mini-map rail and a
  controls rail — composed, not stretched — for both the floating overlay and the
  desktop app.
- **Make something**: Answer, Write (code or a ready-to-use prompt for your own
  AI) and Compute (on-device spreadsheet/CSV) — one clean dropdown → focused modal.
- **Links done right**: a real link-out when it's a URL, a Copy button when it's a
  command or value.

## Reporting

- **Session report**, redesigned to a formal, Big-4-grade document: cover,
  contents, running header/footer, numbered sections, an authenticity seal — and
  **3–5 scrubbed milestone screenshots as evidence**, shown only for steps you
  actually confirmed. Detail (commands, code, sub-steps) never leaks for steps you
  did not perform.
- **Compliance evidence report** for company admins, with per-framework coverage,
  posture and gauges, and the same authenticity seal.
- Downloadable audit log (above).

## Enterprise & accounts

- **Login/sign-up**, redesigned (split-panel, brand): email + password, **social
  sign-in (Google, Microsoft, Facebook)**, **Company SSO** with **email-domain
  auto-detect** (type your work email → routed to your org's SSO), and a
  **profile-completion step** for new social users.
- **Company SSO** (OIDC, 14 providers), invite-only; per-company pricing; seat
  pools; billing statements + invoices.
- **Executive dashboard** (ROI: hypothetical time/$ saved), white-label branding.
- **Affiliate program** with automated Stripe Connect payouts.
- **Governance / DLP**: custom scrub rules, retention windows, member oversight.

## Platform

- Desktop (Windows/Mac/Linux overlay with see-through + click-behind, hidden from
  screen shares), web, and mobile/tablet.
- No document/image/media generation — WorkCoPilot hands you a ready-to-use prompt
  for your own AI (privacy + efficiency by design).

---

_Last updated: 2026-10-24. Keep this current as features ship; feed into
WorkMarketing.jsx, /security, /how-it-works and the sales deck._
