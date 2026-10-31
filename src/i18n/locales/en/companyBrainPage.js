// English strings for /workcopilot/company-brain (src/pages/WorkCompanyBrain.jsx
// and its sections in src/pages/company_brain/) and for the Company Brain
// section of the organization home page (src/components/company_brain/).
// Keyed under the `companyBrainPage` namespace; the i18n loader deep-merges
// every en/*.js partial into the English base.
//
// HONESTY CONTRACT (owner, binding): every line below rests on code that ships
// today. Per-company sealed store (server/brain_store.js, brain_crypto.js),
// retrieval that cites the source (server/index.js plan handler, brain_query.js),
// private encryption with a passphrase, recovery phrase and timed re-lock
// (brain_crypto.js + the brain routes), admin inventory with reason-logged
// removal (CompanyBrain.jsx), knowledge spaces (server/kb_spaces_routes.js),
// trainer grant + draft / publish / retire workflows (server/workflows_*.js),
// de-identified company-scoped learning from clean finishes (server/work.js
// distillWorkflowTemplate, store.captureWorkflowTemplate), executive-only
// download with an authenticator step-up on the hosted service
// (server/export_key.js), a read-only brain:query scope on company API keys
// (server/api_scopes.js, routes_v1.js), on-device masking under the company
// policy (src/frame_scrub.js, src/scrub.js). Not claimed on purpose: a desktop
// document uploader (exists, not wired), a knowledge on/off switch (no route),
// per-person access trimming, brain figures on the executive dashboard.
// No prices (the corporate site publishes none), no model or provider names,
// no em-dashes. <hl>..</hl> is the brand highlight span in display headings;
// <b> renders as itself. Arrays translate as units and are joined to their
// icons by position in the page.
export default {
  companyBrainPage: {
    seo: {
      title: 'Company Brain - WorkCoPilot by AdmireVeda',
      description: 'The Company Brain is your company\'s private knowledge inside WorkCoPilot: your documents, your trainers\' recorded workflows and the tasks your people finish, turned into guidance that follows your own apps, playbooks and conventions. Encrypted per company, curated by your admin, never shared.',
    },
    hero: {
      eyebrow: 'Company Brain',
      h1: 'Guidance that knows <hl>how your company works.</hl>',
      sub: 'The Company Brain is your company\'s private knowledge inside WorkCoPilot. It turns your documents, your trainers\' recorded workflows and the tasks your people finish into guidance that follows your own apps, playbooks and conventions.',
      cta: 'Talk to us',
      ctaHow: 'See how it works',
      proofAria: 'At a glance',
      proof: [
        'Private to your company, sealed with its own key',
        'Every step drawn from it names its source',
        'Your admin sees, curates and clears what is stored',
        'Never used to train a shared model',
      ],
      // The hero card: one guided step, as a person sees it, with its source.
      card: {
        aria: 'Illustration: a guided step on a person\'s screen, with the company document it came from and a private-to-your-company badge',
        app: 'Guided task',
        step: 'Step 3 of 7',
        title: 'Set Assignment group to Platform-Ops, then pick template CHG-STD-07.',
        from: 'From your Change Playbook, section 3.2',
        check: 'Checked on screen before the next step',
        private: 'Private to your company',
      },
    },
    learn: {
      eyebrow: 'How it learns',
      h2: 'Three sources. One brain, <hl>yours alone.</hl>',
      lead: 'The brain grows from what your company already has and from the work your people do every day. Nothing is typed in twice.',
      sources: [
        {
          t: 'Your documents',
          d: 'SOPs, playbooks, app guides and policies become scrubbed, searchable passages. Each passage keeps the name of the document it came from, so a step can cite it.',
          chips: ['Scrubbed before storage', 'Cited by name', 'Removable one by one'],
        },
        {
          t: 'Your trainers\' recorded workflows',
          d: 'Your admin grants the trainer role. A trainer records how a task is done in your own app and publishes it; everyone in the company then gets it as a guided workflow.',
          chips: ['Draft, publish, retire', 'Recordings sealed per company', 'Trainer role granted by your admin'],
        },
        {
          t: 'The tasks your people finish',
          d: 'When someone finishes a guided task cleanly, every step confirmed, the brain keeps the de-identified pattern. The next person with the same task starts from it.',
          chips: ['Only fully finished tasks', 'Names and numbers removed', 'Kept for your company only'],
        },
      ],
      note: 'A workflow a trainer has published always comes first. A learned pattern fills in where no trainer has recorded one.',
    },
    use: {
      eyebrow: 'How it is used',
      h2: 'Every step in your words, <hl>in your apps.</hl>',
      lead: 'When a person starts a task, the guide searches your Company Brain first and builds the steps from what it finds there.',
      cards: [
        { t: 'Grounded in your own apps', d: 'Steps use your system names, your fields and your approval chain, taken from your documents and workflows. Not a generic how-to.' },
        { t: 'The source is named', d: 'A step drawn from your knowledge says which document or workflow it came from, so people can check it and trust it.' },
        { t: 'Fewer questions, higher accuracy', d: 'The more documents your admins add, the more workflows your trainers record and the more tasks your people finish, the more specific the guidance gets.' },
        { t: 'Knowledge spaces', d: 'Your admin groups company learnings into spaces such as Finance close or Customer onboarding. People pick the space that fits the task they are starting.' },
        { t: 'Honest when it has nothing', d: 'If the brain holds nothing on a task, or is locked, the guide says so and continues from general knowledge. It never pretends.' },
        { t: 'Read-only, as always', d: 'The Company Brain changes what the guide says, never what it does. WorkCoPilot still never clicks, types or runs anything for anyone.' },
      ],
    },
    how: {
      eyebrow: 'How it works',
      h2: 'From your knowledge to the next step on screen.',
      lead: 'Four stages, and a loop that closes every time a task is finished well.',
      // The drawn labels of the flow diagram (BrainFlowArt), short on purpose.
      art: {
        aria: 'Diagram: documents, recorded workflows and finished tasks are masked on the device, sealed in your encrypted Company Brain, and surface as a cited step on a person\'s screen; clean finishes flow back into the brain',
        docs: 'Documents',
        workflows: 'Recorded workflows',
        finished: 'Finished tasks',
        masked: 'Masked on the device',
        brain: 'Your encrypted brain',
        step: 'A cited step on screen',
        loop: 'Clean finishes flow back',
      },
      steps: [
        { t: 'Gather', d: 'Documents, your trainers\' recordings and your people\'s clean finishes.' },
        { t: 'Mask', d: 'Sensitive values are masked on the device under your company policy; passages are scrubbed again before they are stored.' },
        { t: 'Seal', d: 'Everything is sealed under your company\'s own key. Only the few passages a search returns are ever opened.' },
        { t: 'Guide', d: 'The next step appears on the person\'s screen, in your words, with its source named.' },
      ],
    },
    control: {
      eyebrow: 'Control and privacy',
      h2: 'Your company\'s knowledge <hl>stays your company\'s.</hl>',
      lead: 'The Company Brain is scoped to one company, sealed with that company\'s own key, and curated by your admin.',
      items: [
        { t: 'Company-scoped, never shared', d: 'Each company\'s brain is stored separately under its own key. Nothing crosses to another company, and nothing trains a shared model.' },
        { t: 'Encrypted at rest', d: 'Passages, vectors and the index are sealed with AES-256-GCM. A tampered or wrongly keyed file raises an error instead of an empty brain.' },
        { t: 'Your admin curates it', d: 'The company console lists every source with its size and status. Removing one, or clearing everything, needs a reason and lands in the audit trail.' },
        { t: 'Private brain, your passphrase', d: 'Turn on private encryption and the brain is sealed under a passphrase only your company holds, with a recovery phrase shown once. Lock it, open it for your team, change the passphrase, and it re-locks on a timer.' },
        { t: 'Masked on the device', d: 'Sensitive values on a person\'s screen and in their text are masked on their device under your company policy before anything is sent.' },
        { t: 'Executive download', d: 'Executives download the Company Brain as one encrypted archive under a passphrase they set. On the hosted service, viewing or replacing that passphrase asks for a fresh authenticator code.' },
        { t: 'A read-only door for your own tools', d: 'Your admin can issue company API keys with a read-only search scope, so your own systems can query the brain. Keys are shown once, can be revoked, and carry IP allow-lists, expiry and rate limits. No key can write to, export or clear the brain.' },
        { t: 'Says so when it is locked', d: 'While a private brain is locked, nothing is served and guidance tells the person it is working without company knowledge. No silent fallback.' },
      ],
    },
    leaders: {
      eyebrow: 'For admins and executives',
      h2: 'What leaders can see.',
      lead: 'Leaders see the shape of the brain and the work it supports, never a colleague\'s raw session.',
      items: [
        { t: 'What is in it', d: 'The company console lists every source with its passages, size, status and last update.' },
        { t: 'Who recorded what', d: 'Trainers\' workflows show as draft, published or retired, with versions, so you know what your people are being guided by.' },
        { t: 'The productivity picture', d: 'The executive dashboard shows tasks, time and projects across the company, with an illustrative view of time saved, and exports to PDF, image or CSV.' },
        { t: 'An audit trail', d: 'Every removal of brain content, and every download of the archive, is logged with who, what and when.' },
      ],
    },
    final: {
      h2: 'Give your people a guide that knows your company.',
      p: 'Talk to us about your rollout, your documents and your trainers. A named owner, a DPA and on-prem options on request.',
      cta: 'Talk to us',
      ctaEnterprise: 'See every enterprise control',
    },
    // The Company Brain section of the organization home page
    // (src/components/company_brain/CompanyBrainSection.jsx).
    home: {
      eyebrow: 'Company Brain',
      h2: 'A brain that knows <em>your</em> company.',
      sub: 'Your documents, your trainers\' recorded workflows and the tasks your people finish, turned into guidance in your own apps.',
      points: [
        { t: 'Grounded in your own playbooks', d: 'Steps use your systems, your fields and your approvals, and name the source they came from.' },
        { t: 'Sharper the more you use it', d: 'Every clean finish and every published workflow makes the next task more specific.' },
        { t: 'Private to your company', d: 'Sealed with your own key, curated by your admin, never shared and never used to train a shared model.' },
      ],
      cta: 'Learn about the Company Brain',
    },
  },
}
