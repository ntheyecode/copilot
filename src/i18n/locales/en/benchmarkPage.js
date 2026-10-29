// English strings for the public accuracy-benchmark page
// (src/pages/WorkBenchmark.jsx), keyed under the `benchmarkPage` namespace.
// en.js already carries benchmark.* (the "how a task is scored" rail and the
// confidence-interval figure); this partial owns the rest of the page under its
// own namespace and deep-merges beside it.
//
// HONESTY (docs/accuracy-benchmark-spec.md): generic tier labels only, never a
// model name; every number on the page comes from /api/work/benchmark and these
// strings only carry the words around it. {pass} {n} {ci} {lo} {hi} {when}
// {title} are filled in by the page.
export default {
  benchmarkPage: {
    eyebrow: 'Accuracy benchmark',
    h1: 'How accurate is WorkCoPilot?',
    lead: 'One measure: given a task with a known-correct answer, does WorkCoPilot return it. Real pass rates, with sample size and 95% confidence interval. Nothing rounded up.',
    chipsAria: 'How these numbers stay honest',
    chips: [
      'Graded mechanically where possible',
      'A held-out set kept private',
      'Per tier, never a model name',
    ],

    // First-run state
    pendingTitle: 'First public run pending.',
    pendingP: 'The benchmark is built and tested. Numbers land here once a public run is recorded.',

    // Results
    resultsH2: 'Results by AI tier',
    tierStrong: 'Higher-capability tier',
    tierFast: 'Speed-optimized tier',
    lastRun: 'Last run {when}.',
    sampleH2: 'Sample tasks',
    sampleP: 'A public sample. Held-out tasks are scored but never shown.',

    // One tier scorecard
    meta: '{pass}/{n} correct · 95% CI {ci}',
    aiGraded: ' · {n} AI-graded',
    ciRange: '{lo} to {hi}',
    tableCaption: '{title}: result correctness by domain',
    colDomain: 'Domain',
    colCorrect: 'Correct',
    colRate: 'Rate',
    colCi: '95% CI',
    domains: {
      dev: 'Dev / data',
      finance: 'Spreadsheet / finance',
      cross: 'Cross-profession',
      security: 'Security / code review',
    },

    // Method
    methodH2: 'How we measure',
    method: [
      { t: 'Result correctness', d: 'Each task runs through the product, then is graded against a known-correct reference.' },
      { t: 'Verified first', d: 'Mechanical checks where an answer allows it. An AI judge only otherwise, flagged, with a human spot-check each run.' },
      { t: 'Four domains', d: 'Dev and data, spreadsheet and finance, a cross-profession mix, security and code review.' },
      { t: 'Honest numbers', d: 'Pass rates with sample sizes and 95% CIs. A private held-out set resists overfitting.' },
    ],
    note: 'We would rather publish a true, smaller number with its confidence interval than a round one without. Thin domains are labeled.',

    // Closing band + related links
    ctaH2: 'See what it does, then what it costs',
    ctaP: 'WorkCoPilot guides people through real work to a finished result.',
    seePricing: 'See pricing',
    howItWorks: 'How it works',
    relatedAria: 'Related pages',
    securityLink: 'Security & data handling',
    backHome: 'Back to home',
  },
}
