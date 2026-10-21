/*
 * compliance-presets.js  —  DLP policy-engine default-handling presets
 * =====================================================================
 *
 * Pure ES-module DATA file (no logic, no imports). Maps data-protection
 * frameworks and country/regional regimes to a DEFAULT handling ACTION
 * per sensitive-data category, for the scrubber/DLP engine.
 *
 * Scrubber categories (exactly 13, every preset below defines all of them):
 *   pii, phi, secrets, credentials, ip, host, account, email, phone,
 *   dob, ssn, card, custom
 *
 * Actions (exactly these four strings):
 *   "send"      -> pass the value through unchanged (lowest protection)
 *   "mask"      -> redact / partially obscure (e.g. ***-**-1234) but keep shape
 *   "tokenize"  -> replace with a reversible pseudonymous token (recoverable)
 *   "withhold"  -> never emit; strip the value entirely (highest protection)
 *
 * Grounding / sources (verified 2026-10-21):
 *   - PCI DSS: Sensitive Authentication Data (full track, CVV2/CID, PIN) must
 *     never be stored post-authorization even encrypted; PAN must be rendered
 *     unreadable (Req. 3.x) and is typically truncated/tokenized. -> card,
 *     account, secrets => withhold. Refs: PCI Security Standards Council;
 *     https://blog.rsisecurity.com/pci-compliance-sensitive-authentication-data-requirements/
 *     https://finance.ubc.ca/node/2691
 *   - HIPAA: De-identification Safe Harbor (45 CFR 164.514(a)-(b)) requires
 *     removing all 18 identifiers (names, SSN, MRN/account, email, phone,
 *     dates incl. DOB -> year only, IP, etc.). -> phi/pii/ssn/account/email/
 *     phone => withhold; dob/ip/host => mask (generalize). Refs: eCFR 45 CFR
 *     164.514; https://www.accountablehq.com/post/the-18-phi-identifiers-explained-best-practices-for-hipaa-compliance
 *   - GDPR / EU / UK GDPR (DPA 2018): personal data incl. online identifiers
 *     (IP) and special-category data (Art. 9); pseudonymisation is an endorsed
 *     safeguard (Art. 4(5), Recital 28). -> pii/dob/ssn/phi => withhold;
 *     email/phone/ip/account => tokenize (pseudonymise). Refs: GDPR Arts. 4,
 *     9, 25, 32; https://lw.com/en/insights/2023/12/Indias-Digital-Personal-Data-Protection-Act-2023-vs-the-GDPR-A-Comparison
 *   - CCPA / CPRA (US-CA): "sensitive personal information" (SSN, financial
 *     account + access code, precise geo, health) gets heightened handling;
 *     general PI gets consumer-rights protection. -> ssn/card/credentials/phi
 *     => withhold; general identifiers => mask.
 *   - India DPDP Act 2023: applies one uniform standard to all digital
 *     personal data (no statutory sensitive tier), but the prior SPDI Rules
 *     treated passwords + financial (bank/card) + health as sensitive, so we
 *     keep protective defaults. -> pii/phi/account/ssn/card/credentials/secrets
 *     => withhold; email/phone/ip => tokenize. Refs: DPDP Act 2023 (notified
 *     11 Aug 2023); https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-
 *   - SOC 2 (AICPA Trust Services Criteria) & ISO/IEC 27001 (ISMS, Annex A):
 *     control frameworks, not privacy statutes; strongest on protecting
 *     secrets/credentials (RBAC, least privilege, rotation, encryption).
 *     -> secrets/credentials/card/ssn/phi => withhold; general PII => mask.
 *     Refs: AICPA TSC (CC6.x); ISO/IEC 27001 Annex A;
 *     https://www.konfirmity.com/blog/soc-2-secrets-management-for-soc-2
 *     https://www.akeyless.io/secrets-management-glossary/secrets-management-for-compliance
 *
 * NOTE: These are safe, conservative DEFAULTS. Operators can override any
 * category per policy; nothing here is legal advice — verify against the
 * authoritative standard text for the regime in force.
 */

export const COMPLIANCE_PRESETS = {
  // -- Frameworks -----------------------------------------------------------

  // HIPAA: PHI + Safe Harbor identifier stripping. Health context => strict.
  hipaa: {
    pii: "withhold",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "mask",
    host: "mask",
    account: "withhold",
    email: "withhold",
    phone: "withhold",
    dob: "mask",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // GDPR: EU personal data; pseudonymisation endorsed for contact identifiers.
  gdpr: {
    pii: "withhold",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "tokenize",
    host: "mask",
    account: "tokenize",
    email: "tokenize",
    phone: "tokenize",
    dob: "withhold",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // PCI-DSS: cardholder data + SAD. PAN/account/secrets never emitted.
  pci: {
    pii: "mask",
    phi: "mask",
    secrets: "withhold",
    credentials: "withhold",
    ip: "mask",
    host: "mask",
    account: "withhold",
    email: "mask",
    phone: "mask",
    dob: "mask",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // SOC 2: Trust Services Criteria; strongest on secrets/credentials.
  soc2: {
    pii: "mask",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "mask",
    host: "mask",
    account: "mask",
    email: "mask",
    phone: "mask",
    dob: "mask",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // ISO/IEC 27001: ISMS controls; lifecycle protection of secrets.
  iso27001: {
    pii: "mask",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "mask",
    host: "mask",
    account: "mask",
    email: "mask",
    phone: "mask",
    dob: "mask",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // CCPA / CPRA: California; sensitive PI (SSN, financial, health) => strict.
  ccpa: {
    pii: "mask",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "mask",
    host: "mask",
    account: "mask",
    email: "mask",
    phone: "mask",
    dob: "mask",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // -- Regional regimes -----------------------------------------------------

  // EU: GDPR regime (mirrors gdpr).
  eu: {
    pii: "withhold",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "tokenize",
    host: "mask",
    account: "tokenize",
    email: "tokenize",
    phone: "tokenize",
    dob: "withhold",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // US-California: CCPA/CPRA regime (mirrors ccpa).
  us_ca: {
    pii: "mask",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "mask",
    host: "mask",
    account: "mask",
    email: "mask",
    phone: "mask",
    dob: "mask",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // India: Digital Personal Data Protection Act 2023 (protective defaults).
  india_dpdp: {
    pii: "withhold",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "tokenize",
    host: "mask",
    account: "withhold",
    email: "tokenize",
    phone: "tokenize",
    dob: "withhold",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },

  // United Kingdom: UK GDPR + DPA 2018 (mirrors gdpr/eu).
  uk: {
    pii: "withhold",
    phi: "withhold",
    secrets: "withhold",
    credentials: "withhold",
    ip: "tokenize",
    host: "mask",
    account: "tokenize",
    email: "tokenize",
    phone: "tokenize",
    dob: "withhold",
    ssn: "withhold",
    card: "withhold",
    custom: "mask",
  },
};

export const COMPLIANCE_LABELS = {
  hipaa: "US health data (PHI) protection under HIPAA Safe Harbor de-identification",
  gdpr: "EU General Data Protection Regulation — personal data of EU residents",
  pci: "PCI-DSS — payment cardholder data and sensitive authentication data",
  soc2: "SOC 2 Trust Services Criteria — security & confidentiality controls",
  iso27001: "ISO/IEC 27001 — information security management system controls",
  ccpa: "California CCPA/CPRA — consumer personal & sensitive personal information",
  eu: "European Union regime — GDPR personal-data handling defaults",
  us_ca: "US California regime — CCPA/CPRA consumer-privacy defaults",
  india_dpdp: "India Digital Personal Data Protection Act 2023 — all digital personal data",
  uk: "United Kingdom regime — UK GDPR & Data Protection Act 2018",
};
