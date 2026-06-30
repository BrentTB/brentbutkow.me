import { AdminSession, isAdminSession } from './admin.types'

const SESSION_KEY = 'admin-session'

// Carries the HTTP status so callers can react to 401 specifically.
export class AdminApiError extends Error {
  constructor(public readonly status: number) {
    super(`Admin request failed (${status})`)
    this.name = 'AdminApiError'
  }
}

// sessionStorage (not localStorage) so the token dies with the tab.
export function saveSession(session: AdminSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage unavailable / over quota — non-fatal; the in-memory token still works for this tab.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

// Returns the stored session only if it's well-formed and not yet expired; otherwise null.
export function loadSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isAdminSession(parsed) || isExpired(parsed.expiresAt)) return null
    return parsed
  } catch {
    return null
  }
}

export function isExpired(expiresAt: string): boolean {
  const expiry = Date.parse(expiresAt)
  return Number.isNaN(expiry) || expiry <= Date.now()
}
