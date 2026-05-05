/** Pure helpers for the session timer. All times are ms since epoch. */

export function endTime(workspace) {
  if (!workspace) return 0
  return new Date(workspace.createdAt).getTime() + workspace.sessionDuration * 60_000
}

export function remainingMs(workspace, now = Date.now()) {
  return Math.max(0, endTime(workspace) - now)
}

export function elapsedMs(workspace, now = Date.now()) {
  return Math.max(0, now - new Date(workspace.createdAt).getTime())
}

export function totalMs(workspace) {
  return workspace.sessionDuration * 60_000
}

export function percentElapsed(workspace, now = Date.now()) {
  const t = totalMs(workspace)
  if (!t) return 0
  return Math.min(100, Math.max(0, (elapsedMs(workspace, now) / t) * 100))
}

/** Format ms as HH:MM:SS, trimming the leading "00:" if hours = 0. */
export function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function timerColor(remaining) {
  const min = remaining / 60_000
  if (min <= 10) return 'red'
  if (min <= 30) return 'amber'
  return 'teal'
}
