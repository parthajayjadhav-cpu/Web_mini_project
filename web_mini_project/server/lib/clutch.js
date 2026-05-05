/**
 * Clutch player = member with the most task completions in the last 30 minutes.
 * Returns null if no completions in that window.
 */
export function computeClutch(workspace, windowMinutes = 30) {
  const cutoff = Date.now() - windowMinutes * 60_000
  const counts = new Map()
  for (const t of workspace.tasks) {
    if (t.status !== 'done' || !t.completedAt) continue
    const ts = new Date(t.completedAt).getTime()
    if (ts < cutoff) continue
    const actor = t.completedBy || t.assignedTo
    if (!actor) continue
    counts.set(actor, (counts.get(actor) || 0) + 1)
  }
  if (counts.size === 0) return null
  let best = null
  let bestN = 0
  for (const [name, n] of counts) {
    if (n > bestN) {
      best = name
      bestN = n
    }
  }
  return { name: best, completions: bestN, windowMinutes }
}
