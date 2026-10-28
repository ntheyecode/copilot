// Recommended Practices: the curated, deterministic catalog (model-free).
//
// Day-one suggestion quality must not depend on an empty brain, so the launch
// source is a small, hand-vetted set of practices for high-stakes domains where
// a missed step is costly (security, cloud rollout, data migration). The brain
// and the model are layered on later (see docs/recommended-practices-spec.md);
// this catalog is the narrow, trustworthy floor.
//
// Each discipline has a `match` (regexes tested against the project goal and the
// task goals) and `practices`. Each practice proposes a REAL task: a goal plus a
// screen-visible `doneState`, so roping it in passes the zero-tolerance
// breakdown gate unchanged. Keep rationales plain, honest, and free of any model
// or provider name; never phrase a practice as a guarantee. US spelling.

export const PRACTICE_CATALOG = [
  {
    key: 'security',
    match: [/\b(security|harden(?:ing)?|firewall|auth(?:entication)?|\bmfa\b|\brbac\b|\biam\b|secrets?|encryption|\btls\b|\bssl\b|vulnerab|pen[-\s]?test|compliance|least[-\s]privilege)\b/i],
    practices: [
      { id: 'sec-backup', title: 'Take a restorable backup first', rationale: 'Before a change, capture a backup you can roll back to.', task: { goal: 'Take and verify a restorable backup before making changes', doneState: 'A backup is listed and a test restore succeeds' } },
      { id: 'sec-mfa', title: 'Require multi-factor sign-in before exposing anything', rationale: 'A standard practice for this kind of work: turn on multi-factor sign-in before the service is reachable.', task: { goal: 'Enable multi-factor authentication on the admin and service accounts', doneState: 'Multi-factor sign-in is shown enabled on each account' } },
      { id: 'sec-least-priv', title: 'Apply least-privilege roles', rationale: 'Grant each role only the permissions it needs, rather than broad admin.', task: { goal: 'Review and tighten roles to least privilege', doneState: 'Each role shows only the permissions it needs' } },
      { id: 'sec-secrets', title: 'Move secrets out of config into a vault', rationale: 'Keep keys and tokens out of plain config and source files.', task: { goal: 'Move secrets into a managed secret store and reference them', doneState: 'No secret value appears in config or source; references resolve' } },
    ],
  },
  {
    key: 'cloud',
    match: [/\b(cloud|migrat|\baws\b|azure|\bgcp\b|kubernetes|\bk8s\b|terraform|deploy(?:ment)?|roll[-\s]?out|infrastructure|\bvpc\b|load[-\s]balanc|provision)\b/i],
    practices: [
      { id: 'cloud-sandbox', title: 'Stage in a sandbox before production', rationale: 'Prove the change in a non-production environment first.', task: { goal: 'Run the change in a staging or sandbox environment first', doneState: 'The change is shown working in staging' } },
      { id: 'cloud-rollback', title: 'Prepare rollback and a go-live check', rationale: 'Know how to undo, and how to confirm success, before cutting over.', task: { goal: 'Prepare a rollback path and a go-live validation check', doneState: 'A rollback path and a validation checklist are ready' } },
      { id: 'cloud-budget', title: 'Set a budget alert', rationale: 'Catch runaway spend early with a billing alert.', task: { goal: 'Configure a billing or budget alert with a threshold', doneState: 'A budget alert is shown active with a threshold' } },
      { id: 'cloud-iac', title: 'Capture the setup as code', rationale: 'Record the configuration as infrastructure-as-code so it is repeatable.', task: { goal: 'Capture the configuration as infrastructure-as-code and commit it', doneState: 'The configuration is in a committed infrastructure-as-code file' } },
    ],
  },
  {
    key: 'data',
    match: [/\b(migrat|database|\bdata\b|\betl\b|import|export|backup|restore|schema|reconcil)\b/i],
    practices: [
      { id: 'data-backup', title: 'Back up before migrating', rationale: 'Capture a restorable snapshot before any data move.', task: { goal: 'Take and verify a restorable backup of the data', doneState: 'A snapshot exists and a test restore succeeds' } },
      { id: 'data-dryrun', title: 'Dry-run on a sample first', rationale: 'Validate the migration on a subset before the full run.', task: { goal: 'Run the migration on a sample and verify the result', doneState: 'The sample migrated correctly and is verified' } },
      { id: 'data-reconcile', title: 'Reconcile counts after the move', rationale: 'Confirm record counts and key fields match after migrating.', task: { goal: 'Reconcile record counts and key fields after the migration', doneState: 'Source and destination counts match' } },
    ],
  },
]

export default { PRACTICE_CATALOG }
