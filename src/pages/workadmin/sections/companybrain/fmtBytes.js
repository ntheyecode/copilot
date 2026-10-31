// Human-readable byte size (1024-based, one decimal above KB). Shared by the
// Company Brain inventory cards and the "Add documents" queue rows.
export function fmtBytes(n) {
  const v = Number(n)
  if (!isFinite(v) || v <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0, x = v
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++ }
  return `${i === 0 ? Math.round(x) : x.toFixed(x >= 100 ? 0 : 1)} ${units[i]}`
}
