// Single base URL for the whole backend; every module's routes hang off it.
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

// Central registry of backend route paths, grouped by module.
// Add a new module = add a key here — no new env var needed.
export const apiRoutes = {
  health: '/health',
  recalls: {
    list: '/recalls',
    stats: '/recalls/stats',
    trend: '/recalls/trend',
    companies: '/recalls/companies',
    topics: '/recalls/topics',
    events: '/recalls/events',
  },
  contact: '/contact',
  nullspace: {
    score: '/nullspace/score',
    leaderboard: '/nullspace/leaderboard',
  },
} as const

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export async function fetchJson<T>(
  path: string,
  signal?: AbortSignal,
  validate?: (raw: unknown) => raw is T
): Promise<T> {
  const res = await fetch(apiUrl(path), { signal })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const raw: unknown = await res.json()
  if (validate && !validate(raw)) throw new Error('Unexpected response shape')
  return raw as T
}

// Fire-and-forget POST — caller cares only about success/failure, so the response body is ignored.
export async function postJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
}
