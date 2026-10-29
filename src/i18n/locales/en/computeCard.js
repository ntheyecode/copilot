// English strings for the on-device computation result card
// (src/components/ComputeCard.jsx), keyed under the `computeCard` namespace.
// `spec.*` renders the validated computation DSL as plain-language steps (the
// reproducible basis): cmp.* are the comparison words, fn.* the aggregate
// words. Interpolations: {where} = joined clauses, {as} = an output column
// name, {expr} = an expression, {cols}/{by} = column lists, {aggs} = joined
// aggregates, {dir} = the sort direction phrase, {fn}/{col} = an aggregate +
// column, {n}/{count} = row counts (formatted), {shown}/{total} = row counts.
// CSV is never translated.
export default {
  computeCard: {
    cmp: {
      eq: 'is', ne: 'is not', gt: 'is greater than', gte: 'is at least',
      lt: 'is less than', lte: 'is at most', contains: 'contains', in: 'is one of',
    },
    fn: {
      sum: 'total', avg: 'average', min: 'minimum', max: 'maximum',
      count: 'count', countDistinct: 'distinct count',
    },
    spec: {
      and: 'and',
      countRows: 'count of rows',
      countRowsAs: 'count of rows as "{as}"',
      fnOfCol: '{fn} of {col}',
      fnOfColAs: '{fn} of {col} as "{as}"',
      filter: 'Keep only rows where {where}.',
      derive: 'Add a column "{as}" computed as {expr}.',
      select: 'Keep the columns: {cols}.',
      group: 'Group by {by}, then take the {aggs}.',
      wholeTable: 'the whole table',
      sort: 'Sort by {by} ({dir}).',
      highToLow: 'high to low',
      lowToHigh: 'low to high',
      limit_one: 'Take the first {n} row.',
      limit_other: 'Take the first {n} rows.',
      returnCount: 'Return the count of rows.',
      returnFn: 'Return the {fn} of {col}.',
      returnTable: 'Return the resulting table.',
    },
    copy: 'Copy',
    copied: 'Copied',
    copyCsv: 'Copy as CSV',
    downloadCsv: 'Download CSV',
    eyebrow: 'Computed on your device',
    kindNumber: 'Number',
    kindTable: 'Table',
    titleNumber: 'The number',
    titleTable: 'The table',
    emptyTable: 'No rows matched, so the table is empty.',
    truncated: 'Showing the first {shown} of {total} result rows. Download the CSV for the full set.',
    howK: 'How it was computed',
    runAcross_one: 'Run across {count} row on your device.',
    runAcross_other: 'Run across {count} rows on your device.',
    privacy: 'Run on your device. Your data never left it.',
  },
}
