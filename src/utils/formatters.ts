export function formatRuntime(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Box office / revenue: $42M, $1.2B */
export function formatRevenue(revenue: number | null | undefined): string {
  if (revenue == null || revenue <= 0) return '—'
  if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(1)}B`
  if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(0)}M`
  if (revenue >= 1_000) return `$${(revenue / 1_000).toFixed(1)}K`
  return `$${revenue}`
}
