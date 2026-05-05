/**
 * Build an SVG path string for a list of numeric values, mapped to a fixed
 * width × height box. Returns "" when no data so callers can early-exit.
 */
export function sparklinePath(values, width = 60, height = 20) {
  const v = Array.isArray(values) ? values : []
  if (v.length === 0) return ''
  if (v.length === 1) {
    const y = height / 2
    return `M0 ${y} L${width} ${y}`
  }
  const min = Math.min(...v)
  const max = Math.max(...v)
  const range = max - min || 1
  const stepX = width / (v.length - 1)
  return v
    .map((val, i) => {
      const x = i * stepX
      const y = height - ((val - min) / range) * (height - 2) - 1
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

/**
 * Bin point-history events into one running-total point per hour bucket.
 * Used by both the leaderboard sparkline and the My Stats per-hour chart.
 */
export function pointsPerHour(history, hours = 6) {
  if (!history?.length) return new Array(hours).fill(0)
  const now = Date.now()
  const buckets = new Array(hours).fill(0)
  let prevTotal = 0
  // history is chronological; values are running totals.
  for (const h of history) {
    const ageHours = Math.floor((now - new Date(h.time).getTime()) / 3_600_000)
    const idx = hours - 1 - ageHours
    if (idx >= 0 && idx < hours) {
      buckets[idx] += h.points - prevTotal
    }
    prevTotal = h.points
  }
  return buckets.map((n) => Math.max(0, n))
}
