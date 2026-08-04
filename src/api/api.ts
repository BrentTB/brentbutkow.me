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
// `useApiResource` and `useSubscriptionForm` render `err.message`, so the wording is user-visible.
export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Request failed (${status})`)
    this.name = 'HttpError'
  }
}

/** Every payload guard has this shape, so the helpers below can demand one. */
export type Validate<T> = (raw: unknown) => raw is T

/** Runs the request and turns a non-2xx into an `HttpError` before any caller sees the body. */
async function send(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(apiUrl(path), init)
  if (!res.ok) throw new HttpError(res.status)
  return res
}

/** Reads the body and checks it against the caller's guard, so nothing untrusted is ever cast. */
async function parse<T>(res: Response, validate: Validate<T>): Promise<T> {
  const raw: unknown = await res.json()
  if (!validate(raw)) throw new Error('Unexpected response shape')
  return raw
}

const jsonBody = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function fetchJson<T>(
  path: string,
  signal: AbortSignal | undefined,
  validate: Validate<T>,
  headers?: Record<string, string>
): Promise<T> {
  return parse(await send(path, { signal, headers }), validate)
}

// Fire-and-forget POST — caller cares only about success/failure, so the response body is ignored.
export async function postJson(path: string, body: unknown): Promise<void> {
  await send(path, jsonBody(body))
}

// POST that returns a validated JSON body — for endpoints whose response the caller needs (a room
// code, the appended move list). Throws HttpError on a non-2xx so 4xx rejections stay distinguishable.
export async function postJsonFor<T>(
  path: string,
  body: unknown,
  validate: Validate<T>,
  signal?: AbortSignal
): Promise<T> {
  return parse(await send(path, { ...jsonBody(body), signal }), validate)
}
