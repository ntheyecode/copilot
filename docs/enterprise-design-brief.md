# WorkCoPilot — Enterprise Presentation & Website Design Brief
### A complete, copy-paste prompt for a design agent (web page / pitch deck / landing experience)

> **How to use this:** paste this whole document into your design agent (Figma AI, a web-design agent, a deck generator, etc.). It contains the product, every component, the enterprise value story, cross-industry use cases, illustrative case studies, metrics, and the buyer-psychology playbook. Nothing is left out. Adapt the illustrative case studies and any “up to” metrics to your verified data before publishing publicly.

---

## 0) The one-line brief for the designer

> Design a **powerful, enterprise-grade, security-first** presentation for **WorkCoPilot by AdmireVeda** — an AI expert that watches a person’s screen and guides them, step by exact step, to complete *any* task in *any* field, correctly the first time, while stripping sensitive data on-device. The presentation must make a time-pressed executive feel: *“This lets my existing team do specialist, high-stakes work in-house, safely, and documented — and it pays for itself.”* Lead with **value and trust**, not features.

**Deliverables:** (a) a long-form marketing/landing page, and (b) a 12–16 slide enterprise pitch deck built from the same system. Responsive, light theme primary (dark optional), motion-rich but fast.

---

## 1) Brand & art direction

- **Name:** WorkCoPilot, a product of **AdmireVeda**. Domain: admireveda.com.
- **Positioning line:** *“Your expert, on every screen.”* Supporting: *“Get anything done right, the first time.”*
- **Personality:** a sharp senior specialist sitting beside you — calm, precise, trustworthy, never flashy. Enterprise-credible, not “startup toy.”
- **Color system (light-first):**
  - Page background `#f4f7fb`; elevated surfaces `#ffffff`; hairlines `#e2e7f0`.
  - Text strong `#0c1222`; muted `#3f4a5c`; **display headings in deep brand-green ink `#062a22`**.
  - **Brand accent gradient: emerald `#0a9d66` → cyan `#0a86cf`** (deeper variants on light so it pops; brighter `#8cf5c4 → #39d3ff` on dark surfaces).
  - Warm CTA accent only for primary actions: `#ff9a4d → #f26a43`.
  - Severity/support cues: success green, caution amber, danger red — used sparingly.
- **Depth language:** light page + **elevated white cards with soft shadows** + **premium DARK “product screenshot” cards** (the live-guidance UI, code diffs, terminals) that add contrast and realism. This contrast is the signature.
- **Typography:** display = a characterful grotesque (e.g., *Bricolage Grotesque*, 800); body = a clean humanist sans (e.g., *Figtree*, 400–600); mono = *JetBrains Mono* for commands/code. High weight-and-size contrast. Colored, uppercase, tracked **eyebrow kickers** above every section.
- **Motion:** staggered scroll reveals; **count-up stat numbers**; a live, looping “watch-and-guide” demo; subtle pointer-parallax ambient color; micro-delight (a brief fireworks burst on a positive moment). Fast, never gratuitous. Respect `prefers-reduced-motion`.
- **Imagery:** real human “moment it matters” photography (a person finishing a hard task with quiet relief), plus crisp custom vector/iso illustrations for concepts (redaction, guidance, audit). Avoid generic stock and purple-on-white AI clichés.

---

## 2) What WorkCoPilot *is* (so the designer gets the substance right)

A **read-only, screen-aware AI guide**. The user states a goal; WorkCoPilot watches their screen (or phone camera), and gives the **exact next action** — the precise click, command, code, setting, or official link — one step at a time, **verifying each step worked before advancing**, catching mistakes the moment they happen, researching the current best practice, and finishing with a **documented write-up**. It **never clicks, types or runs anything** — the human stays in control. It works for **any task in any field**, technical and non-technical.

**Crucially for enterprises:** when a redaction policy is on, it **strips PII, PHI, secrets, passwords, IPs and private hosts on the device, before anything is sent** to our servers or any AI — and it keeps a **per-session audit log** of exactly what was transmitted.

---

## 3) Every component / feature to showcase (do not bury these)

Group them for the page; each should get a visible, benefit-led treatment.

**A. Core guidance engine**
1. **Live, step-by-step guidance** — reads the whole screen vs the whole plan each change; relocates the user; rewrites the next instruction for *this* exact screen.
2. **The exact how, every time** — real commands, code, clicks, settings, official links; copy-ready; the best proven way, no shortcuts.
3. **Starts from zero** — opens the right page, signs you in, walks you to the exact spot; nothing assumed.
4. **Catches & corrects mistakes** — spots a wrong value/turn before it costs you; gives the exact fix.
5. **Guide styles / modes** — Step-by-step, Beginner, Architect-level, Problem-solving/Debug.
6. **One micro-action at a time** — type this, run that, check it worked, continue — like a genius pairing with you.
7. **Code review & correction** — old line → new line diffs; “what to change and where” cookbook.
8. **Deep research before it guides** — current best practice, real official links, matches how tools work *today*.
9. **Intelligent model routing** — fast model by default, auto-escalates to a stronger model when needed, plus a one-shot “Deep pass.”

**B. Multimodal & surfaces**
10. **Reads screens, cameras and documents** — your live screen, your phone camera, your own files for context.
11. **Runs anywhere** — Desktop app (stealth overlay, hidden from screen-share, see-through / click-behind), **Browser (no install** — works on locked-down / virtual desktops), **Mobile app** (snap a photo / live-watch).
12. **Floating overlay / buddy** — guidance floats over your work; continues when minimized; multi-monitor aware.

**C. Knowledge & output**
13. **Bring your own documents (Advanced/Premium)** — ground steps in your runbooks/policies; flags anything in them that is wrong and gives the better way.
14. **Documented write-up** — a clean, picture-rich report of exactly what was done; shareable, repeatable.
15. **Generated visuals on demand (Premium)** — diagrams/illustrations where they help.

**D. Security, privacy & governance (the flagship)**
16. **On-device redaction (DLP)** — PII, PHI, secrets, passwords, cards, IPs (v4/v6), private hosts, IBAN, labelled PHI/PII — stripped *before anything is sent*; placeholders preserve task structure so guidance quality is kept.
17. **Read-only by design** — never acts on your behalf; refuses harmful work; hidden on screen-share.
18. **Per-session audit log** — downloadable `.log` of exactly what was transmitted, with timestamps and redaction state. Audit-ready.
19. **Conditional policy control** — superadmin turns redaction on **per company or per user** (off by default).
20. **Bring your own AI keys / self-hosted model (Enterprise)**; custom data-retention & on-prem option.

**E. Administration & tenancy**
21. **Multi-tenancy** — Companies → Company admins → Company users, with role-based access.
22. **Superadmin portal** — companies, users, plans/seats, redaction policy, platform-AI config, sessions, support tickets, overview dashboards.
23. **Company-admin self-service** — create & manage their own company’s users.
24. **SSO (roadmap, build-ready)** — OIDC for Google / Microsoft Entra / Okta; license consumption by provisioning.
25. **Support tickets** — users raise feature/bug/billing/access requests; superadmin responds in-thread.
26. **Plans** — Basic / Advanced / Premium by daily guided hours; **Enterprise (Contact sales)**.
27. **Live “Is your scenario covered?” assistant** on the site — guard-railed: only answers coverage questions, says how it’s covered and which plan fits.

---

## 4) The enterprise value story (the spine of the presentation)

Lead with these outcomes, in this order:

1. **Do specialist, high-stakes work with the team you already have.** No new hires, no long ramp. Any employee or lean consultant delivers like a specialist — the first time, correctly.
2. **Take on the toughest projects in-house** — cloud migrations, security hardening, pentests, full builds, compliance work — that you’d normally postpone or outsource.
3. **Clear the backlog.** The tasks that pile up because “no one has time” or “only one person knows how” finally get done — step by step, verified — *up to 70% faster*.
4. **Cut outsourcing — keep control.** Bring work back in-house; reduce external spend *by up to 50%* while raising consistency and keeping context, data and institutional knowledge on your side.
5. **Secure & best-practice by default.** Hardened configs, reviewed code, real pentest steps — no shortcuts; mistakes caught before they cost you.
6. **Everything documented & audit-ready.** Every implementation, code change, configuration, pentest and cloud setup ends with a shareable write-up and a per-session audit log.
7. **Safe for regulated work.** On-device redaction + read-only means even sensitive, compliance-bound work can be done in-house, safely.

**Hero stat band (animated count-up):** `+70%` faster through stuck/pending work · `−50%` outsourcing spend (quality kept) · `100%` documented · `Days → hours` on work nobody had time for. *(Label these as representative/target outcomes until verified with your own data.)*

---

## 5) Cross-industry use cases (show breadth without diluting focus)

Present as an interactive grid or tabbed “pick your world” component. For each: the pain → what WorkCoPilot does → the outcome.

- **IT / DevOps / Cloud:** set up a VPC and lock down security groups; migrate to Kubernetes; Terraform a landing zone; wire CI/CD; fix a misconfiguration *before* it ships. → senior-grade infra from a mixed-skill team.
- **Security / Pentesting:** run an authenticated API test with Burp; validate hardening against a baseline; produce an evidence-backed report. → in-house security assurance, documented.
- **Software engineering:** build a tool-calling RAG agent; review & correct code (old→new line); debug a failing pipeline step by step. → unblock juniors, raise quality.
- **Data / AI:** stand up embeddings + a vector store; evaluate retrieval; wire an automation in n8n. → ship AI features without a dedicated platform team.
- **Finance / Accounting:** reconcile the month and build a P&L in Excel from exported CSVs; prepare a filing. → finance ops done right, with a trail.
- **Healthcare / Life-sciences (regulated):** configure a system, document a validation, handle PHI-adjacent screens — with on-device redaction. → compliance-safe productivity.
- **Legal / Compliance:** complete and check forms; follow a controlled process; evidence each step. → consistent, auditable execution.
- **Marketing / Growth:** launch a campaign, wire analytics, configure a platform correctly. → self-serve specialist tasks.
- **Operations / Onboarding / Procurement:** follow complex vendor/portal workflows exactly, every time. → fewer errors, faster cycles.
- **Field / trades (future products on the same engine):** plumbers, solar, mechanics — camera-guided, step-by-step.

---

## 6) Illustrative case studies (clearly labeled as representative scenarios — replace with real ones when available)

Design each as a “story card”: context → challenge → with WorkCoPilot → result (with a metric and a one-line quote-style takeaway). **Do not present these as named real customers until verified.**

1. **Regional hospital IT (regulated).** *Challenge:* a lean team had a backlog of system configs touching PHI they couldn’t send to outside help. *With WorkCoPilot:* on-device redaction + step-by-step configuration + a per-session audit log. *Result (representative):* backlog cleared ~65% faster; zero PHI left the device; every change documented for audit.
2. **Mid-market SaaS platform team.** *Challenge:* only one engineer knew the Kubernetes + Terraform stack; everything queued behind them. *With WorkCoPilot:* three generalist engineers guided through migrations and hardening. *Result:* delivery throughput roughly doubled; the single-point-of-failure dependency removed.
3. **Financial services, security assurance.** *Challenge:* API pentests were fully outsourced and slow. *With WorkCoPilot:* in-house, guided authenticated testing with Burp + an evidence report. *Result:* ~50% lower external security spend, faster turnaround, full documentation retained in-house.
4. **Professional-services consultancy.** *Challenge:* consultants billed hours on tasks outside their specialty. *With WorkCoPilot:* each consultant guided to specialist-grade output across clients. *Result:* more billable scope per consultant; consistent quality; reusable write-ups.

---

## 7) Industry metrics & proof framing (use honestly)

- Frame quantified claims as **“up to”** or **“representative”** outcomes until you have verified data; cite categories, not invented sources.
- Pair every number with a mechanism (why it’s true): e.g., *“−50% outsourcing because specialist tasks are now done in-house, with the same documented rigor.”*
- Trust signals to design slots for: **on-device PII/PHI/secret redaction**, **read-only by design**, **per-session audit log**, **bring-your-own-keys / self-hosted**, **SSO (OIDC)**, **DPA & security review available**. (Use “SOC 2 — in progress” **only if true**; otherwise say “Security review & DPA available.”) Never fabricate badges.
- Add a **TCO / savings calculator** component (inputs: team size, avg outsourced $/project, # pending tasks → estimated savings & time back). Interactive, animated.

---

## 8) Buyer psychology by industry (apply these to copy, order, and visuals)

Design the page/deck to move each persona from pain → trust → action. Give the designer these levers:

- **CISO / Security lead** — *Fears:* data leaving the perimeter, shadow AI, audit exposure. *Triggers:* “stripped on-device,” “read-only,” “audit log,” “bring your own model.” *Lead with the Safe & Private flagship + audit.* Tone: precise, understated, evidence-first.
- **CIO / VP Engineering** — *Fears:* key-person risk, backlog, inconsistent quality, hiring cost. *Triggers:* “existing team does specialist work,” “toughest projects in-house,” “documented.” *Lead with ROI + tenancy/control.* Tone: pragmatic, outcomes.
- **CFO / Procurement** — *Fears:* runaway outsourcing cost, unclear ROI. *Triggers:* “−50% outsourcing,” “pays for itself,” TCO calculator. *Lead with the stat band + calculator.* Tone: numbers, savings, risk reduction.
- **Compliance / Legal (healthcare, finance, gov)** — *Fears:* PHI/PII handling, regulatory breach. *Triggers:* on-device redaction, audit trail, DPA, on-prem. *Lead with regulated-teams section.* Tone: reassurance, controls, documentation.
- **Head of Delivery / Consulting** — *Fears:* utilization, specialist scarcity. *Triggers:* “ship like specialists,” per-consultant scope. *Lead with case studies.* Tone: throughput, margin.
- **IT Manager / Team lead (champion/user)** — *Fears:* tool that creates more work, learning curve. *Triggers:* “the exact how,” “catches mistakes,” “no install,” write-up to keep. *Lead with the live demo.* Tone: relief, confidence.

**Universal psychology to apply:** loss-aversion (risk/cost of *not* acting, breaches, missed deadlines) > gain-framing where it lands; **authority** (senior-expert persona, best-practice); **social proof** (case studies, logos when real); **reduce perceived risk** (free to start, read-only, on-device, audit); **specificity beats superlatives** (exact commands, exact savings); **cognitive ease** (one clear CTA per section, generous whitespace, scannable).

---

## 9) Recommended page / deck structure (order matters — value first, features in service of value)

1. **Hero** — “Your expert, on every screen.” One-line value + primary CTA (Start) + secondary (See how it works). A **live looping demo** of watch-and-guide (goal → “I can see…” → exact step → verify). Trust chip row: *Enterprise-ready · On-device PII/PHI redaction · Read-only by design · No training on your data.*
2. **Security / Enterprise band (flagship)** — “Your data never leaves your device unprotected.” Three cards: stripped on-device · read-only · audited & yours. (This is the #1 enterprise-assurance moment — keep it near the top.)
3. **How companies benefit (ROI)** — animated stat band + the six benefit cards + optional TCO calculator.
4. **The product, live** — the core guidance engine with real product “dark card” visuals (exact commands, code diff, hold-on correction, verified step).
5. **Built to be the best** — the pillar spotlight, with **Safe & Private as the flagship #1**, then Powerful, Accurate, Fast, Multimodal, Intelligent, Deep research, All-around-the-goal, Recorded & hand-held.
6. **Use it your way — anywhere** — desktop / browser (no install) / mobile.
7. **One copilot for every kind of work** — the cross-industry grid.
8. **Case studies** — representative story cards (label honestly).
9. **For regulated teams** — redaction policy, audit log, BYO-keys/self-hosted, DPA — just before pricing.
10. **Pricing** — Basic / Advanced / Premium + a strong **Enterprise “Contact sales”** anchor (dark premium block: SSO/SAML, BYO keys/self-hosted, redaction policy controls, custom retention/on-prem, DPA & priority SLA).
11. **Final CTA** — “Stop guessing. Start being guided.”
12. **Footer** — product of AdmireVeda; security review & DPA link; responsible-use note.

**Deck version:** compress to Title → Problem (key-person risk/backlog/cost/compliance) → The shift (guided, in-house) → How it works (demo) → Security flagship → ROI + metrics → Use cases → Case studies → Pricing/Enterprise → Security & compliance → Call to action.

---

## 10) Components the designer must create (component inventory)

Hero with live demo player · trust chip row · colored eyebrow kickers · elevated benefit cards · **dark “product screenshot” cards** (terminal, code-diff, correction, verified-step, redaction visual) · **animated count-up stats** · TCO/savings calculator · industry tab/grid selector · pillar spotlight (auto-cycling, flagship-first) · case-study story cards · pricing tiers + Enterprise anchor · security/compliance band · floating “Is your scenario covered?” assistant · audit-log/report mockups · footer. All responsive; all with tasteful motion; all accessible (WCAG AA contrast, reduced-motion support, keyboard-navigable).

---

## 11) Voice & copy rules

- Plain, confident, specific. Short sentences. No AI clichés, no em-dash-heavy hedging, no “revolutionary.”
- Every claim pairs with a mechanism. Specificity over superlatives.
- One clear CTA per section. Enterprise sections use reassurance, not hype.
- Benefits first; features in service of the benefit.

---

### Final instruction to the design agent
Build the most **trustworthy, high-contrast, value-first** enterprise experience you can — where a CISO feels safe, a CFO sees the savings, a CIO sees the backlog clearing, and a team lead can’t wait to try it. Make **Safe & Private** and **ROI** impossible to miss. Keep it fast, elegant, and unmistakably enterprise-grade.
