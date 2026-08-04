// Single base URL for the whole backend; every module's routes hang off it.
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

// Central registry of backend route paths, grouped by module.
// Add a new module = add a key here — no new env var needed.
export const apiRoutes = {
  recalls: {
    list: '/recalls',
    stats: '/recalls/stats',
    trend: '/recalls/trend',
    facets: '/recalls/facets',
    companies: '/recalls/companies',
    topics: '/recalls/topics',
    events: '/recalls/events',
  },
  contact: '/contact',
  nullspace: {
    score: '/nullspace/score',
    leaderboard: '/nullspace/leaderboard',
  },
  subscriptions: {
    create: '/subscriptions',
    confirm: '/subscriptions/confirm',
    manage: '/subscriptions/manage',
    unsubscribe: '/subscriptions/unsubscribe',
  },
  admin: {
    login: '/admin/login',
    overview: '/admin/overview',
    messages: '/admin/messages',
    subscriptions: '/admin/subscriptions',
    nullspace: '/admin/nullspace',
  },
  // Turn-based multiplayer rooms. Param paths (`/rooms/:code[...]`) are composed from this base.
  rooms: '/rooms',
} as const

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

// Carries the HTTP status so a caller can tell a rejected move (403/409/422) from a network failure.
// The message keeps the historic `Request failed (NNN)` wording so existing catch sites read the same.
export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Request failed (${status})`)
    this.name = 'HttpError'
  }
}

export async function fetchJson<T>(
  path: string,
  signal?: AbortSignal,
  validate?: (raw: unknown) => raw is T
): Promise<T> {
  const res = await fetch(apiUrl(path), { signal })
  if (!res.ok) throw new HttpError(res.status)
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
  if (!res.ok) throw new HttpError(res.status)
}

// POST that returns a validated JSON body — for endpoints whose response the caller needs (a room
// code, the appended move list). Throws HttpError on a non-2xx so 4xx rejections stay distinguishable.
export async function postJsonFor<T>(
  path: string,
  body: unknown,
  validate?: (raw: unknown) => raw is T,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new HttpError(res.status)
  const raw: unknown = await res.json()
  if (validate && !validate(raw)) throw new Error('Unexpected response shape')
  return raw as T
}
