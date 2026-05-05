const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(method, path, body) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP_${res.status}`)
    err.status = res.status
    err.code = data?.error
    throw err
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),

  // High-level helpers
  joinOrCreate: (payload) => request('POST', '/api/workspace/join', payload),
  fetchWorkspace: (code) => request('GET', `/api/workspace/${code}`),
  addTask: (code, payload) => request('POST', `/api/workspace/${code}/task`, payload),
  setStatus: (code, taskId, payload) =>
    request('PATCH', `/api/workspace/${code}/task/${taskId}/status`, payload),
  setUrgent: (code, taskId, payload) =>
    request('PATCH', `/api/workspace/${code}/task/${taskId}/urgent`, payload),
  setNote: (code, taskId, payload) =>
    request('PATCH', `/api/workspace/${code}/task/${taskId}/note`, payload),
  setSettings: (code, payload) =>
    request('PATCH', `/api/workspace/${code}/settings`, payload),
  reset: (code, payload) => request('POST', `/api/workspace/${code}/reset`, payload),
  exportSummary: (code) => request('GET', `/api/workspace/${code}/export`),
}

export const apiBaseUrl = BASE
