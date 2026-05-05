const KEY = 'sprintboard'

export function readSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.name && parsed.workspaceCode) return parsed
    return null
  } catch {
    return null
  }
}

export function writeSession(name, workspaceCode) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, workspaceCode }))
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
