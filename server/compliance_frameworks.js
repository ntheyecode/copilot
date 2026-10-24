// ---------------------------------------------------------------------------
// WorkCoPilot - canonical compliance framework registry
//
// SINGLE SOURCE OF TRUTH (SUPREME RULE II). Every compliance framework the
// product advertises is defined ONCE here, each mapped to the WorkCoPilot
// controls that support it. The compliance report (appendix + per-framework
// focus) reads from this, so the set can never drift across surfaces the way
// the public chips, the /security page, the coverage prompt and the report had
// drifted into four separate hand-maintained lists.
//
// HONESTY (business rules): these are CONTROLS and EVIDENCE that SUPPORT an
// organization's compliance program - never a certification claim, and the
// organization (with its auditors) achieves and holds the compliance. FedRAMP
// is readiness support, not an authorization.
//
// Control ids referenced here MUST match the ids emitted by
// store.getWorkComplianceEvidence: access-mfa, data-minimization, audit-trail,
// encryption-at-rest, secure-output, human-in-loop, retention,
// execution-evidence.
// ---------------------------------------------------------------------------

export const COMPLIANCE_FRAMEWORKS = [
  // ---- Security attestations / management systems ----
  { id: 'soc2', name: 'SOC 2 (Type I / II)', region: 'Global', category: 'Security attestation',
    controls: ['access-mfa', 'data-minimization', 'audit-trail', 'encryption-at-rest', 'secure-output', 'human-in-loop', 'retention', 'execution-evidence'],
    support: 'Role-based policy control, withheld secrets, encryption at rest and a full per-session audit trail give evidence across the Security, Confidentiality and Availability criteria.' },
  { id: 'iso27001', name: 'ISO/IEC 27001', region: 'Global', category: 'Security management',
    controls: ['access-mfa', 'data-minimization', 'audit-trail', 'encryption-at-rest', 'secure-output', 'human-in-loop', 'retention', 'execution-evidence'],
    support: 'Maps to Annex A controls for access, cryptography, logging, secure development and information handling, with per-session evidence.' },
  { id: 'hitrust', name: 'HITRUST CSF', region: 'US / Global', category: 'Security framework',
    controls: ['access-mfa', 'data-minimization', 'encryption-at-rest', 'audit-trail', 'secure-output', 'retention'],
    support: 'Access control, data protection, encryption and audit logging support the CSF control families; evidence is produced per session.' },
  { id: 'cis', name: 'CIS Controls v8', region: 'Global', category: 'Security framework',
    controls: ['data-minimization', 'audit-trail', 'access-mfa', 'secure-output'],
    support: 'On-device redaction supports Data Protection (Control 3), per-session logs support Audit Log Management (Control 8), and MFA supports Access Control Management (Control 6).' },
  { id: 'nist80053', name: 'NIST SP 800-53', region: 'US', category: 'Security controls',
    controls: ['access-mfa', 'audit-trail', 'encryption-at-rest', 'secure-output', 'data-minimization'],
    support: 'Supports the Access Control (AC), Audit and Accountability (AU) and System and Communications Protection (SC) families: MFA, an audit record of every send, and nothing sensitive in transit.' },
  { id: 'nistairmf', name: 'NIST AI RMF', region: 'US', category: 'AI governance',
    controls: ['human-in-loop', 'secure-output'],
    support: 'Human-in-the-loop operation (the tool guides, never acts) and secure, reviewed output support the GOVERN and MANAGE functions for AI use.' },
  { id: 'fedramp', name: 'FedRAMP (readiness)', region: 'US Gov', category: 'Government',
    readiness: true,
    controls: ['access-mfa', 'audit-trail', 'encryption-at-rest', 'secure-output', 'data-minimization'],
    support: 'Readiness support, not an authorization. NIST 800-53 aligned controls, MFA, audit evidence and on-device redaction help you document the tool inside your authorization boundary.' },
  { id: 'owaspasvs', name: 'OWASP ASVS', region: 'Global', category: 'Secure development',
    controls: ['secure-output'],
    support: 'Every command and code block is reviewed by a mandatory security gate for injection, hard-coded secrets and least privilege before it reaches the operator.' },

  // ---- Privacy / data protection ----
  { id: 'gdpr', name: 'GDPR (EU)', region: 'EU', category: 'Privacy',
    controls: ['data-minimization', 'encryption-at-rest', 'audit-trail', 'retention', 'access-mfa', 'human-in-loop'],
    support: 'Personal data is tokenized on the device before anything is sent (data minimization, Art.5/25), encrypted at rest (Art.32), retained to a set window (Art.5(1)(e)) and logged (Art.30).' },
  { id: 'ukdpa', name: 'UK GDPR / DPA 2018', region: 'UK', category: 'Privacy',
    controls: ['data-minimization', 'encryption-at-rest', 'audit-trail', 'retention', 'access-mfa'],
    support: 'The same on-device minimization, encryption, retention and audit evidence support the UK GDPR and Data Protection Act 2018 duties.' },
  { id: 'ccpa', name: 'CCPA / CPRA', region: 'California', category: 'Privacy',
    controls: ['data-minimization', 'retention', 'audit-trail', 'access-mfa'],
    support: 'Data minimization on the device, a set retention window and per-session logs support the CCPA/CPRA minimization, retention and accountability expectations.' },
  { id: 'lgpd', name: 'LGPD (Brazil)', region: 'Brazil', category: 'Privacy',
    controls: ['data-minimization', 'encryption-at-rest', 'audit-trail', 'retention'],
    support: 'Personal data is redacted or tokenized before sending, encrypted at rest, and per-session audit logs give a record of what was processed.' },
  { id: 'ferpa', name: 'FERPA', region: 'US Education', category: 'Privacy',
    controls: ['data-minimization', 'access-mfa', 'audit-trail', 'retention'],
    support: 'Education records are minimized on the device, access is MFA-gated, every send is logged and retention is bounded.' },

  // ---- Healthcare ----
  { id: 'hipaa', name: 'HIPAA', region: 'US Health', category: 'Healthcare',
    controls: ['data-minimization', 'encryption-at-rest', 'access-mfa', 'audit-trail', 'retention', 'human-in-loop'],
    support: 'PHI is stripped or tokenized on the device so it never reaches the AI, access is MFA-gated, evidence is encrypted at rest, and every send is logged - supporting the Privacy and Security Rule safeguards.' },
  { id: 'hitech', name: 'HITECH', region: 'US Health', category: 'Healthcare',
    controls: ['audit-trail', 'encryption-at-rest', 'data-minimization'],
    support: 'Per-member session logs record exactly what left each device, supporting the audit-trail and accounting expectations HITECH strengthened.' },

  // ---- Payments / finance ----
  { id: 'pcidss', name: 'PCI DSS', region: 'Global', category: 'Payments',
    controls: ['data-minimization', 'encryption-at-rest', 'access-mfa', 'audit-trail', 'secure-output', 'retention'],
    support: 'Cardholder data (PAN) is masked or tokenized on the device before anything is sent, access is MFA-gated, evidence is encrypted, and output is security-reviewed - supporting the data-protection and access requirements.' },
  { id: 'sox', name: 'SOX', region: 'US', category: 'Financial reporting',
    controls: ['human-in-loop', 'audit-trail', 'execution-evidence'],
    support: 'Read-only by design: WorkCoPilot never changes a system of record. Session reports and audit logs give auditors a record of guided work on financial systems.' },
  { id: 'glba', name: 'GLBA', region: 'US', category: 'Financial privacy',
    controls: ['data-minimization', 'encryption-at-rest', 'access-mfa', 'audit-trail'],
    support: 'Non-public personal information is minimized on the device, encrypted at rest and access-gated, supporting the Safeguards Rule.' },
]

export const FRAMEWORK_IDS = COMPLIANCE_FRAMEWORKS.map((f) => f.id)

export function getFramework(id) {
  const k = String(id || '').trim().toLowerCase()
  return COMPLIANCE_FRAMEWORKS.find((f) => f.id === k) || null
}

// Every framework that a given control helps support (control -> frameworks).
export function frameworksForControl(controlId) {
  return COMPLIANCE_FRAMEWORKS.filter((f) => f.controls.includes(controlId))
}
