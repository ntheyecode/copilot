# WorkCoPilot editions and sensitivity tiers

Status: mixed. This document consolidates the five deployment configurations
WorkCoPilot is designed around, who holds the encryption key in each, where the
data lives, and what protections apply. It marks clearly what is BUILT today
versus what is PLANNED (designed only). It is written to be honest about the
ceiling of each configuration and to avoid over-claiming. US spelling, no em
dashes.

Source of truth:
- `docs/company-brain.md` and `docs/company-brain-security.md` (the built
  server-side Company Brain and its key custody).
- `server/store.js` (the custody accessors and the company-vs-individual gate)
  and `server/customer_export.js` (the encrypted WCPX v1 export).
- `SESSION-HANDOFF.md` decision 11 (the editions table) and decisions 1, 3, 4,
  5, 6, 10 (encryption, key custody, on-prem activation, offline local models,
  on-device perception, and IP protection) for the planned editions.

---

## 1. The two sensitivity tiers, and the gate

WorkCoPilot runs at one of two sensitivity tiers. The gate between them is
simply whether the signed-in user belongs to a company:

**`user.companyId` is present (company user) = the protected tier.**
**`user.companyId` is absent (individual user) = the lighter tier.**

This is the same gate used throughout the server (`server/store.js`: a company
user resolves to the company object and its policy; an individual user has no
company brain and no company scrub policy). Concretely:

- A company user gets a per-tenant Company Brain, the company's armed scrub
  policy applied to ingested and injected content, the option of customer-held
  key custody, privacy contacts and governance policy, and the encrypted WCPX
  export. The brain and skills live on the company object (private to the
  tenant).
- An individual user has no company brain, no per-tenant encrypted store, and
  the lighter default scrub floor. Their data lives in the shared platform
  portal, and their de-identified learning can feed the shared intelligence
  pool.

The tier is a property of the account, not a separate setting the user toggles.

---

## 2. The five configurations at a glance

| # | Edition | Status | Server | AI inference | Key held by | Data lives | Sensitivity tier |
|---|---|---|---|---|---|---|---|
| 1 | Individual (SaaS) | BUILT | ours (admireveda.com) | our cloud models | platform | our portal | lighter |
| 2 | Company (SaaS) | BUILT (server-side) | ours (admireveda.com) | our cloud models | customer (opt-in) or platform (default) | our server, per-tenant encrypted | protected |
| 3 | Managed Private Cloud | PLANNED (design only) | a VM we operate in the customer's cloud | our cloud models | customer KMS (we are denied decrypt) | the customer's own disk | protected |
| 4 | On-prem, cloud-AI | PLANNED (design only) | the customer's own servers | cloud models via the customer's own provider keys | customer | the customer's own servers | protected |
| 5 | On-prem, offline | PLANNED (design only) | the customer's own servers | fast local models on the customer's server | customer | the customer's own servers | protected |

"BUILT (server-side)" for edition 2 means the Company Brain, its envelope
encryption, both custody models, and the encrypted export exist and are wired on
the server today (see `docs/company-brain.md` and
`docs/company-brain-security.md`). The desktop ingestion and connector work that
feeds the brain is a separate track and is not all shipped; this document is
about the deployment configuration and key custody, not the full ingestion
pipeline.

---

## 3. Built today

### Edition 1: Individual (SaaS)

- **Server:** ours (admireveda.com).
- **AI inference:** our cloud models.
- **Key custody:** platform. There is no per-tenant encrypted brain for an
  individual user.
- **Where data lives:** the AdmireVeda portal (our platform).
- **Intelligence pool:** an individual user's de-identified learning feeds the
  shared, cross-user intelligence pool. This is the design distinction of the
  lighter tier: the individual benefits from, and contributes to, shared
  de-identified learning.
- **Export:** plaintext export (no customer-held key, no WCPX envelope).
- **Sensitivity tier:** lighter (`user.companyId` absent).
- **Protections:** the default scrub floor on learning; standard platform
  access controls. No per-tenant data-encryption key, no customer-held custody.

### Edition 2: Company (SaaS)

- **Server:** ours (admireveda.com).
- **AI inference:** our cloud models.
- **Where data lives:** our server, in a per-tenant store under
  `DATA_DIR/brain/<companyId>/`, with every byte sealed with AES-256-GCM under a
  per-company data encryption key (DEK).
- **Key custody (two models, both built):**
  - **Platform-held (default):** the per-tenant DEK is wrapped under the
    platform master key (KEK). The platform can decrypt. Zero-configuration
    default. At-rest data is AES-256-GCM encrypted, but the platform holds the
    key material to open it.
  - **Customer-held (opt-in):** a company admin enables customer custody. The
    DEK is re-wrapped under a Customer Master Key (CMK) that the platform never
    stores. The customer holds the CMK through two independent factors, either
    of which unlocks: a **passphrase** (minimum 8 characters, scrypt-derived)
    and a **24-word BIP39 recovery phrase** returned exactly once at enable
    time and never stored by the platform. Losing both factors is
    unrecoverable by design (wallet model); the admin must acknowledge this to
    enable it.
- **Export:** encrypted WCPX v1 archive (`server/customer_export.js`). The
  archive is a password-encrypted bundle: magic `WCPX1\n`, a JSON header
  (format `WCPX`, format version 1, `companyId`, created-at, KDF parameters, and
  for a brain the DEK re-wrapped under scrypt(password)), then the sealed body.
  The header and body are cryptographically bound by using the canonical header
  bytes as AES-GCM additional authenticated data, so a tampered header fails the
  body decrypt. For a customer-custody company the brain must be unlocked to
  export it.
- **Privacy and governance (protected tier):** the company's armed scrub policy
  is applied to ingested chunks and to injected grounding through the single
  `govScrub` chokepoint; privacy contacts and a governance policy apply; brain
  content carries per-source provenance.
- **Sensitivity tier:** protected (`user.companyId` present).

#### The honest ceiling for edition 2

- **At-rest zero-access is real under customer custody.** Nothing on disk opens
  without the customer's passphrase or recovery phrase. The platform stores only
  the salt, the passphrase-sealed CMK, the CMK-wrapped DEK, and the KDF
  parameters, none of which yields the CMK or DEK without the customer secret.
- **Runtime access is NOT eliminated.** This is a server we operate. During an
  unlock window the DEK is resident in our server's memory so the brain can
  serve retrieval. An operator with root on that box could in principle reach
  decrypted memory during that window. Idle auto-lock (default 30 minutes)
  bounds the window, and a locked brain serves nothing and drops its working
  set from memory.
- **Do not call this "zero-knowledge."** It is not. The accurate phrasing is
  "customer-held key, at-rest zero-access; the platform cannot decrypt your data
  at rest." Absolute runtime zero-access is only true on-prem (editions 4 and
  5), where we have no root.
- The cipher is **AES-256-GCM**, authenticated, per-tenant DEK under an
  envelope. Never "512-bit AES" (AES has no 512-bit key). No post-quantum key
  wrapping is implemented. Never claim any certification.

---

## 4. Planned (design only, not built)

The three configurations below are designed in `SESSION-HANDOFF.md` (decision 11
and the supporting decisions). No code ships them today. They are described here
so the editions story is complete and the ceilings are set honestly in advance.

### Edition 3: Managed Private Cloud (planned)

- **Server:** a VM we operate inside the customer's own cloud account.
- **AI inference:** our cloud models.
- **Where data lives:** the customer's own disk, inside their cloud tenancy.
- **Key custody:** the master key comes from the customer's own key management
  service (KMS). The design intent is that we are **denied decrypt**: we operate
  the VM, but the key the data is sealed under is held in the customer's KMS and
  we are not granted the permission to use it outside the customer's policy.
- **Honest ceiling:** at-rest zero-access can be real here (the key is the
  customer's KMS key, not ours). But because we still operate the VM, runtime
  access during processing is NOT eliminated, exactly as with edition 2. This
  configuration must never be described as "zero-knowledge" and must never be
  described as removing our runtime reach. It removes at-rest platform access
  via the customer KMS; it does not make runtime access absolute. Only on-prem
  (editions 4 and 5) makes runtime access absolute.

### Edition 4: On-prem, cloud-AI (planned)

- **Server:** the customer's own servers (their hardware, their network).
- **AI inference:** cloud models, reached using the **customer's own provider
  keys and provider access**. Their server needs outbound HTTPS to the
  providers; the keys are stored encrypted on their server.
- **Where data lives:** the customer's own servers. Data never reaches our
  cloud.
- **Key custody:** the customer. The server is activated through the planned
  System Key to Activation Key flow (`SESSION-HANDOFF.md` decision 4): a signed,
  time-bound, offline activation that carries entitlements and the wrapped
  Company Brain key, verified on-prem against an embedded platform public key.
- **Honest ceiling:** because the customer runs the server and we have no root,
  **absolute runtime zero-access is achievable here.** IP protection applies
  (server code ships on the customer's premises): the honest ceiling for the
  anti-reverse-engineering measures is "practically and economically
  infeasible, not mathematically impossible" (`SESSION-HANDOFF.md` decision 10).
  No certification claim.

### Edition 5: On-prem, offline (planned)

- **Server:** the customer's own servers.
- **AI inference:** **fast local models running on the customer's own server**
  (centralized: one server, GPU recommended, serving every user in the company;
  Ollama or vLLM). No cloud, no phone-home.
- **Screen hand-holding:** bundled on-device perception (OCR plus a small UI
  element detector) runs on each desktop and produces a compact scrubbed
  structured screen description; the screenshot never leaves the device. The
  fast local reasoning or vision model runs server-side. Tiers are keyed to the
  on-prem server hardware (GPU server = continuous hand-holding; CPU-only server
  = a watch-light cadence that the UI states; no model = a retrieval-only
  floor).
- **Where data lives:** the customer's own servers.
- **Key custody:** the customer, with the same activation flow as edition 4,
  plus the customer's own local model keys where applicable.
- **Honest ceiling:** this is the strongest confidentiality posture. The
  customer runs everything, there is no cloud call, and runtime zero-access is
  absolute. Offline is honestly a strong-but-lesser capability tier than the
  cloud editions (smaller local models), and the product should say so. IP
  protection and the same "practically and economically infeasible, not
  mathematically impossible" ceiling apply.

---

## 5. One-line ceiling per configuration

- **Individual (SaaS):** lighter tier, platform-held, plaintext export, feeds
  the shared de-identified pool. No per-tenant encryption key.
- **Company (SaaS):** protected tier, AES-256-GCM per-tenant, customer-held key
  available. At-rest zero-access is real under customer custody; runtime access
  during an unlock window is not eliminated; not "zero-knowledge."
- **Managed Private Cloud (planned):** at-rest zero-access via the customer's
  KMS is real; runtime access is not eliminated because we operate the VM; not
  "zero-knowledge."
- **On-prem cloud-AI (planned):** customer runs the server with their own
  provider keys; runtime zero-access is absolute; IP protection is "infeasible,
  not impossible."
- **On-prem offline (planned):** customer runs everything with local models and
  bundled on-device perception; runtime zero-access is absolute; honestly a
  strong-but-lesser capability tier than cloud.

Across all five: the cipher is AES-256-GCM (never "512-bit"), there is no
"zero-knowledge" claim for any configuration where we operate the server, and
nothing is "certified."

---

## 6. Related documents

- `docs/company-brain.md` - the Company Brain architecture as built (ingestion,
  per-tenant encrypted store, retrieval).
- `docs/company-brain-security.md` - envelope encryption, the two custody
  models, the custody routes, and the honest security ceiling.
- `SESSION-HANDOFF.md` - the editions decision (11) and the supporting on-prem,
  activation, local-model, perception, and IP-protection decisions that the
  planned editions 3 to 5 descend from.
