# WorkCoPilot — Data Governance + Company Onboarding spec

Status: design locked with the operator (pending build). This is the single
source of truth for the governance wizard, tokenize+rehydrate, company
onboarding, AI-source control, the free trial, per-session cost, and image-gen
gating.

Honesty guardrails (hold these in every surface and claim):
- We provide **controls and audit evidence to support** a customer's compliance.
  We never claim we **make** them HIPAA/PCI/GDPR "compliant" or "certified."
- We hide the model/prompting in **our** UI. We cannot hide model usage from the
  customer's **own** provider billing when they use their own key — state this plainly.
- When a value is blocked or tokenized and the model does not return it intact,
  we **leave the placeholder and flag it. We never guess or fabricate a value.**

---

## 1. Who gets what

| Audience | AI source | Governance wizard | Image generation | Notes |
|---|---|---|---|---|
| Individual Basic / Advanced | Platform model, no key | Simple scrub on/off (as today) | Per plan | Unchanged, day-one. |
| Individual Premium | Platform model, no key | **Full governance wizard** | Premium default | |
| **Company** (any) | **Superadmin selects** per company | **Full governance wizard** (always Premium) | **OFF until superadmin enables** | Forced intake on creation. 10x1h trial pooled. |

- Companies are **always treated as Premium** for features **except image
  generation**, which is **off by default** and only the **superadmin** can turn
  it on per company (cost gate).

## 2. Company onboarding (forced intake)

On creating a new company, the superadmin completes an intake before the company
can run:
1. Company identity (name, admin user).
2. **AI source (required — no default):** the superadmin must explicitly select
   either **Platform keys** (we provide the model) or **Company keys** (the
   company admin will add their own provider API keys). The company cannot start
   sessions until this is chosen.
3. **Image generation:** off. A superadmin toggle enables it per company.
4. Kick off the **Data Governance wizard** (section 5) to arm the company policy.
5. Grant the **free trial** (section 4).

Company admins can later manage their own AI keys (section 3) and run the
governance wizard, within what the superadmin allowed.

## 3. AI keys and the model

- **Company keys path:** the company admin adds **provider API keys**. For each
  provider we show a short "where to get a key" link to that provider. We do
  **not** display which model or prompting we run. (Caveat: their provider
  dashboard still shows model usage — stated in the UI.)
- **Platform keys path:** we run on the operator-pinned platform model; the
  company adds nothing.
- The **superadmin** sets, per company, which path is active and can switch it.
- Model selection is always ours; the admin only supplies keys.

## 4. Free trial

- Every onboarded company gets **10 sessions of up to 1 hour each**, **pooled
  across all its users** (one shared counter, not per-user).
- Tracked as a company-level balance (sessions + minutes). When the pool is
  exhausted, guiding is gated until the company subscribes / is granted more.
- Spans one or many users freely.

## 5. Data Governance wizard (arm & lock)

Premium + all companies. Produces a **policy object** per company/user that the
scrubber/sender enforces on every outbound call.

Captured:
- **Sensitivity classes** and what counts as **secret** vs **sensitive**.
- **Send / withhold / mask / tokenize** decision per category (PII, PHI, secrets,
  credentials, internal hosts, IPs, account/ids, free-text custom...).
- **Free-flow block list:** a box where the user types exact words/phrases that
  must **never leave the device**. As they type we show the risk inline:
  *"blocking these can make an answer incomplete or wrong where the word is
  needed; we will never guess a blocked value."*
- **Frameworks** (presets, operator-tunable): GDPR, HIPAA, PCI-DSS, SOC 2,
  ISO 27001, CCPA. **Country regimes:** EU, US-state, India DPDP, etc.
  A preset maps categories to send/withhold defaults (HIPAA -> withhold PHI;
  PCI -> withhold card data; GDPR -> withhold personal data).
- **Mode:** `scrub` (remove, lossy) or **`tokenize` (keep full response via
  on-device rehydration — section 6)**.
- **Arm & lock:** the policy becomes the enforced criteria. A **locked** policy
  needs superadmin re-auth + an audit entry to change.

Policy schema (sketch):
```
{ id, scope: {companyId|userId}, armed, locked,
  frameworks: ["hipaa","gdpr",...], regions: ["eu","us-ca",...],
  categories: { phi:"withhold", pii:"tokenize", secrets:"withhold",
                ip:"tokenize", host:"mask", custom:"withhold" },
  blockWords: ["Project Atlas","acme-prod-db", ...],
  mode: "scrub"|"tokenize",
  updatedBy, updatedAt, version }
```

## 6. Tokenize + on-device rehydrate (the differentiator)

Instead of deleting sensitive spans, replace each with a **stable, typed token**;
keep the token->value map **only on the device**; send tokens to the model; on
the response, **re-substitute the real values locally**. Provider never sees raw
data; the user gets a complete answer.

- **Token format:** distinctive + unambiguous so the model preserves it verbatim,
  carrying a **safe type/class hint** so the model still reasons correctly, e.g.
  `[[IP_PRIVATE_1]]`, `[[ACCOUNT_2]]`, `[[PERSON_1]]`. Same value -> same token.
- **Map lives only on the client** (browser SPA + desktop + mobile). Never sent,
  never logged server-side.
- **Rehydration** happens on-device, **including streaming** (replace tokens as
  text arrives).
- **Fallback:** if a token is missing/garbled in the output, leave the
  placeholder and flag it. Never guess a value.
- **Single enforcement chokepoint:** tokenize/scrub applies at ONE outbound layer
  that every send path (plan, watch, ask, research, deliverables, coverage) goes
  through. No per-endpoint duplication (single source of truth).
- **Stored text is governed too (skills/playbooks + KB learnings).** Text that is
  PERSISTED and later re-injected into a prompt runs through the same engine, not
  a weaker secrets-only filter:
  - **On the device, before upload:** skill content and title are scrubbed with
    the user's effective policy (`cleanForStore` in `src/scrub.js`), redacting
    rather than tokenizing since a stored skill is shared and never rehydrated.
  - **On the server, on write:** `addSkill`, `importCompanySkills` (the admin
    re-upload path) and `addLearning` apply the policy-aware scrub (`scrubWithPolicy`
    with the company's armed policy, else a full `scrubSensitive` floor) via one
    helper (`scrubStoredText` in `server/store.js`). Never a pass-through.
  - **On inject:** skills and KB learnings pass through the same `govScrub`
    chokepoint as the goal and documents before they enter the prompt
    (`server/index.js` plan handler).
  - **Audit:** what was stripped on write is recorded as counts only (never the
    values) — per-user PII alert for a skill add, a reason-logged admin action for
    an import.
  - **Migration:** a one-time, guarded pass (`migrateScrubStoredText`) re-scrubs
    skills and learnings stored before this control existed.

## 7. Per-session cost

- Meter **tokens per AI call** (providers return usage counts) and multiply by a
  maintained **price table per model** to show the **raw provider cost** per
  session, with a per-model breakdown.
- Shown to the **company admin** (and in the superadmin view). Raw cost, not a
  markup.

## 8. Audit and evidence

- Per-session audit log already records what was transmitted. Extend it to record
  the **armed policy version**, the **mode** (scrub/tokenize), and **counts** of
  what was withheld/tokenized/blocked — so the customer has evidence of the
  policy in force without the sensitive values themselves.

## 9. Build increments

1. **Policy model + Governance wizard + policy-driven scrubber** (replace the
   boolean scrub with the policy object; block-words box with the risk warning;
   framework presets; arm & lock). Scrubber reads the policy at the single
   chokepoint.
2. **Tokenize + on-device rehydrate** as the premium mode (token format,
   client-only map, streaming rehydration, fallback). Wire it into the single
   chokepoint.
3. **Company onboarding + AI-source control + 10x1h pooled trial + image-gen
   gate** (superadmin selects AI source, manages company keys, enables image gen;
   trial pool).
4. **Per-session cost metering + price table + display.**
5. Audit extensions; marketing copy for the governance + on-device story.
