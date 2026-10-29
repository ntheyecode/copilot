# WorkCoPilot - Product Documentation

Version: 2026-10-28. Audience: product, sales, customer success, and enterprise buyers. US spelling.
Companion documents: [USER-GUIDE.md](USER-GUIDE.md) (how-to, by role) and the product presentation (slide deck).

---

## 1. What WorkCoPilot is

WorkCoPilot is a **read-only, screen-aware guide**. A person tells it what they want to accomplish; it builds a short plan, then watches their screen and guides them through the task one step at a time, in their own application, until the work is done and verified.

It is deliberately **not** an agent that takes over the machine. It never clicks, types, or moves the mouse. The person stays in control and does the work; WorkCoPilot sees what is on screen, says what to do next, confirms each step actually happened, and produces a record at the end. This "step, then watch" loop is the heart of the product.

**The one-line pitch:** *the expert sitting next to you for any task on any screen, that proves the work got done.*

**Where it runs:** a signed **desktop app** (Windows, with an enterprise MSI), an **Android app**, and the **web** (admireveda.com/work). The guide UI is the same across all three.

---

## 2. The problem it solves, and the benefit

| Pain today | What WorkCoPilot does | Benefit |
|---|---|---|
| People get stuck in unfamiliar software and lose hours to trial and error | Watches the actual screen and gives the next concrete step | Tasks finish faster, with fewer mistakes |
| Onboarding and standard procedures live in stale wikis nobody reads | Guides each person through the real procedure, live | Consistent execution; faster ramp |
| Managers cannot see whether work was really done | Every guided task produces a verified, timestamped record | Auditable proof of completion |
| Knowledge walks out the door when an expert leaves | The company brain captures proven workflows and reuses them | Institutional knowledge compounds |
| Global teams work in many languages | The whole product is localized into 14 languages | One tool for the whole workforce |
| Security teams fear screen tools that "take over" | Read-only by design; on-device redaction; never acts for the user | Passes security review |

Benefits are expressed as outcomes the product supports, never as guarantees.

---

## 3. How it works - the guided task loop

A guided session moves through a fixed, legible sequence. Each stage maps to a real capability in the product.

1. **Set the goal.** The person states what they want to achieve. A readiness coach helps them scope it before they start.
2. **Bring context (optional).** They can attach reference documents, paste text, or pick a company knowledge space to ground the guidance. (Desktop keeps files on-device; web scrubs server-side.)
3. **Plan.** The product returns a short, ordered plan - a handful of beats, never an overwhelming wall of steps. The plan is locked to the goal so it cannot drift.
4. **Clarify.** If the goal is ambiguous, it asks focused questions first rather than guessing.
5. **Guide, step then watch.** For each step it says what to do, then watches the screen to confirm the person did it before moving on. It reads status, content, and change - not just a snapshot.
6. **Ask, any time.** The person can ask "what am I looking at?" or "what do I do here?" and get an answer grounded in the current screen.
7. **Adapt.** If the screen is not what the plan expected, it adjusts rather than pushing a dead step.
8. **Compute / compose / research (where enabled).** It can help compute on local spreadsheets/CSVs, compose text the person will paste, and pull reference facts - always handing the person a result to use, never generating documents or taking the action itself.
9. **Finalize.** The task closes with an **outcome**, a **report** (what was done, step by step, with scrubbed milestone screenshots for confirmed steps only), and an **audit log**.
10. **Verify.** Reports carry an authenticity seal; an optional per-task compliance report maps the work to frameworks.

**Design principles baked into the loop:** read-only (never acts), honest (reports what actually happened, "N of M steps done", never overclaims), privacy-first (on-device OCR redaction, server-side scrubbing on web), and quality-first (five clean beats beat fifty noisy ones).

---

## 4. Feature catalog

### 4.1 Core guide features
- **Screen-aware, step-then-watch guidance** across any application on screen.
- **Vision watch loop** that reads status + content + change, with tolerance for the occasional unreadable frame.
- **Plan with goal-lock** - the goal is frozen once planned; a bounded re-plan budget prevents drift.
- **Ask about the screen** at any moment, grounded in what is visible.
- **Clarify-first** for ambiguous goals.
- **Mid-session context upload** and automatic re-plan only when the path actually changes.
- **Compute** on local spreadsheets/CSVs; **Compose** text to paste; **Research** reference facts.
- **No generation policy** - WorkCoPilot hands over a result or a prompt; it never produces the deliverable or performs the outward action for the user.
- **Full-screen guide** on a second monitor, a resizable **buddy/floater** card, and an **alive avatar** (inclusive, non-biased rendering).
- **Method anchors:** 138 discipline-specific guidance profiles so advice fits the kind of work (security, data, cloud, finance, and more).

### 4.2 Output, reporting, and proof
- **Task report** (PDF/text): confirmed steps with how-to detail, the outcome, and scrubbed milestone screenshots for confirmed steps only.
- **Audit log** per session.
- **Authenticity seal** (SHA-256 + HMAC) with a public verify endpoint, so a report can be proven genuine.
- **Per-task compliance report** mapping the work to 18 frameworks (see 7).
- **Executive dashboard** with completion, effectiveness, hypothetical time/cost saved (never AI cost), exportable to PDF/JPG/CSV, white-label-ready.

### 4.3 Guidance Projects (Depth-2)
For larger bodies of work, a **Customer > Project > Task > Step** hierarchy:
- An up-front **project map** with a dependency graph.
- **Just-in-time** task expansion (steps are generated when a task is reached, grounded in a forward-learnings ledger from earlier tasks).
- **Mid-project task injection** without breaking the plan.
- A **recommended-practices** layer that suggests proven best practices for the project type and ropes them in on request, improving over time from what the organization actually accepts and completes.

### 4.4 The company brain and knowledge spaces
- A **shared company knowledge base**: proven workflows and tool-specific facts learned from one person's successful sessions are served to everyone in the company.
- **Knowledge spaces**: the brain can be organized into named, pickable collections (for example Security, Runbooks, Onboarding); at plan time a person can scope guidance to a chosen space.
- Everything that enters the brain passes a single policy-aware **scrub chokepoint**.

### 4.5 Personalization and accessibility
- **Theme**: Light, Dark, and Heavy modes; a personal choice, applied live, remembered **across devices**.
- **Brand accent**: a set of contrast-tested suggested color combinations (no free-form hex), so the product stays on-brand and legible.
- **Accessibility**: text-size scaling, reduced motion, high contrast, larger targets, and a readable-font option.

### 4.6 Languages
- The entire product UI and the emails it sends are localized into **14 languages** - Arabic, German, Spanish, French, Hindi, Indonesian, Italian, Japanese, Korean, Brazilian Portuguese, Russian, Turkish, Vietnamese, and Simplified Chinese - plus English (US) and British English.
- A person picks their language on first sign-in and can change it any time; it drives both the app and their email.
- Translation parity is enforced by a build gate so a shipped string is never translated in one language and missing in another on the gated surfaces.

### 4.7 Platforms and apps
- **Desktop** (signed; Windows build ships both a per-user installer and a **per-machine MSI** for IT network deployment via GPO/SCCM/Intune), with **on-device OCR** so images and diagrams are read locally and offline.
- **Android** universal app (installs on every architecture).
- **Web** at admireveda.com/work.
- The guide UI is served from the web, so UI improvements reach desktop and Android without a reinstall.

---

## 5. Roles and work flows (enterprise RBAC)

WorkCoPilot separates **what a person does** (their work flow) from **what they manage** (their role). Both are set by a company admin.

### 5.1 Work flows (how a person receives work)
| Flow | Meaning |
|---|---|
| **Independent** | Starts their own tasks. Not assigned work by others. |
| **Worker** | Does only the tasks a project manager assigns. No "Start a task" entry point - they work from a queue. |
| **Mixed** | Both - can start their own tasks and receive assigned ones. |

### 5.2 Roles (management and oversight)
| Role | What they can do |
|---|---|
| **Member** | Uses the guide for their own (or assigned) tasks. |
| **Project manager (PM)** | Creates projects, breaks them into tasks, assigns tasks to company users, reassigns tasks between users, sees who is doing what and which tasks are complete/incomplete, and pulls productivity reports for people assigned to the projects they manage. |
| **Senior project manager (Sr PM)** | Everything a PM can do, across the whole company: sees which projects each PM manages, can start a task and assign a PM, and can reassign whole projects from one PM to another. |
| **GRC (governance, risk, compliance)** | Read-only oversight of every project: a dashboard with status (completed / ongoing / held) and graphs, plus a **risk register** that flags tasks waiting more than a configurable SLA (default 5 days since assignment). Cannot create, assign, or change work. |
| **Company admin** | Manages people, roles, flows, plan, SSO, AI keys, governance, the company brain, billing, and enterprise deployment. |
| **Executive** | A read-only executive dashboard (effectiveness, hypothetical savings), white-label-ready. |
| **Superadmin** | Platform operator: companies, users, pricing, AI configuration, content, finance, and support, across all tenants. |

Every management action is enforced **server-side** - the UI simply reflects what the person's role allows. A worker-flow user has no way to start an ad-hoc task; a GRC user has no action controls; a PM sees only the projects they manage; and no role can reach another company's data.

### 5.3 Team projects - clone-to-many
A PM or admin can turn a project into a **template** and assign it to many people at once. Each person gets their **own run** of the same task map; **completion is per person**, and the admin sees an aggregated **rollup** (who has finished, how far each has got) that shows progress and completion only - never one person's raw session evidence. Ideal for onboarding, standard operating procedures, and compliance drills at workforce scale.

---

## 6. Enterprise features

- **Company admin console** with 18 sections: Overview, Team, Usage & limits, Company SSO, AI keys, Billing, Data governance, Company Brain, Encryption & export, Alerts, SOC/SIEM, Sessions, Support, Help, Activity, Settings (plus Customers and Knowledge spaces).
- **Single sign-on**: connect your own identity provider - Okta, Microsoft Entra, Auth0, Google Workspace, Azure AD, AWS Cognito, Keycloak, OneLogin, Ping, GitLab, GitHub and others (OIDC), separate from the public Google/Microsoft/Facebook social sign-in. Invite-only provisioning.
- **Seat and hour pools** with per-person and per-group limits, and requests for more hours.
- **Bring your own AI keys**: run WorkCoPilot on the company's own provider account so AI usage is billed to them, or use platform-managed keys. AI configuration never silently fails - a pinned choice that cannot be honored is surfaced, not swapped silently - and model/provider names and AI cost are never shown to end users.
- **Data governance / DLP**: role-based scrub rules that run on-device; admins can pull member reports.
- **Company brain** controls (enable/disable, export/import, knowledge spaces, retention).
- **Encryption & export** of company data; **SOC/SIEM** integration for security telemetry; **webhooks**.
- **Enterprise deployment**: per-machine MSI (silent install via GPO/SCCM/Intune), company-admin-gated download.
- **White-label** branding on the executive dashboard.
- **Session telemetry** with per-session AI-call accounting (operator-visible), automatic short-window retention, and destructive-action logging (who/what/when/why) on every irreversible action.

---

## 7. Security, privacy, and compliance

### 7.1 Security and privacy by design
- **Read-only.** WorkCoPilot never clicks, types, or acts for the user.
- **On-device OCR and redaction** so sensitive content in images is read and masked locally; on the web, content is scrubbed server-side before any processing.
- **Mandatory multi-factor sign-in** (TOTP) on first login.
- **Encryption at rest** (AES-256-GCM) for stored secrets; secrets are never returned to a client.
- **Input guardrail** aligned to the OWASP LLM risks on every user-text channel (goal, plan, ask, context, and the project/template planning channels): high-risk input is refused, medium-risk is warned.
- **Single scrub chokepoint** for everything that enters the brain or skills.
- **Tenant isolation** on every data path; a person can only ever act within their own company.
- **Users never see raw errors**; failures are surfaced as actionable, human messages.

### 7.2 Compliance support
Each guided task can produce a compliance report mapping the work to **18 frameworks**:
SOC 2 (Type I/II), ISO/IEC 27001, HITRUST CSF, CIS Controls v8, NIST SP 800-53, NIST AI RMF, FedRAMP (readiness), OWASP ASVS, GDPR (EU), UK GDPR / DPA 2018, CCPA/CPRA, LGPD (Brazil), FERPA, HIPAA, HITECH, PCI DSS, SOX, and GLBA.

Reports carry an **authenticity seal** (SHA-256 + HMAC) and a public **verify** endpoint. The product describes what it supports and helps teams meet; it does not claim certification on a customer's behalf.

### 7.3 Continuous software supply-chain security (SCA)
Dependencies are checked for known vulnerabilities continuously, and customer-facing builds ship with zero known high/critical issues.

---

## 8. The AI architecture (operator-facing)

- **Multi-provider**, with an operator-pinned active provider and a single failover ladder; a sign-in/authorization failure is never masked, and every substitution is logged and surfaced as an incident with a user-visible note.
- **AI configurations never silently fail**: a pinned model that cannot be honored returns a clear "AI not configured / switched" state rather than a hidden default.
- **Live model discovery** is cached and visible to the operator (last-refresh time, tier assignment).
- **Cost metering** at a single choke point; AI cost and model/provider identity are superadmin-only and never exposed to end users.
- **UI work is routed to a fast, design-tuned model; everything else to the strongest model** - an internal routing rule, invisible to users.

---

## 9. Plans and pricing (shape)

- Tiers: **Lite, Basic, Advanced, Premium**. Reference documents (context grounding) are available on **every** tier; richer outputs (roadmaps, diagrams, images) scale up by tier.
- **Hours are the unit**: each plan grants guided hours; usage is metered only while actively guiding; overage is per-hour.
- **Open-task slots** (several tasks can be in progress at once) replaced the old per-day task cap.
- **Annual billing** at a discount; billing is Stripe-backed with a webhook-fed ledger, invoices, and MRR reporting.
- An **affiliate program** pays a share of a referred customer's first payment via Stripe Connect.

Exact per-tier numbers are operator-configured at runtime and are the source of truth over any code default.

---

## 10. Benefits by audience

- **The individual:** finish unfamiliar tasks without getting stuck, in your own language, with a record you can show.
- **The team lead / PM:** assign standard work, see who is doing what, catch stalls early, and prove completion.
- **The Sr PM / operations:** standardize a procedure once and roll it out to a whole workforce; rebalance work across managers.
- **GRC / risk:** continuous, read-only visibility into status and risk, with per-task compliance evidence.
- **The company admin / IT:** your identity provider, your AI keys, your branding, silent enterprise deployment, and data governance that runs on-device.
- **The executive:** a white-label dashboard of effectiveness and hypothetical savings.
- **The security reviewer:** a read-only tool that never acts, redacts on-device, encrypts at rest, guards its inputs, and isolates tenants.

---

## 11. At a glance (numbers)

| | |
|---|---|
| Platforms | Desktop (Windows + enterprise MSI), Android, Web |
| Languages | 14 translated + English (US) + British English |
| Roles | Member, PM, Sr PM, GRC, Company admin, Executive, Superadmin |
| Work flows | Independent, Worker, Mixed |
| Compliance frameworks mapped | 18 |
| SSO / identity providers | Okta, Entra, Auth0, Google, Azure AD, Cognito, Keycloak, OneLogin, Ping, GitLab, GitHub (OIDC) + social |
| Discipline guidance profiles | 138 method anchors |
| Guide capabilities | plan, watch, ask, clarify, compute, compose, research, deliverables, report, compliance report, audit log, finalize, practices |

*This document avoids naming specific AI models/providers and quoting AI cost, per product policy; it states supported outcomes, not guarantees.*
