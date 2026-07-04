import { useCallback, useState } from 'react'
import { apiRoutes, apiUrl } from '../../api/api'
import { AdminApiError, clearSession, isExpired, loadSession, saveSession } from './admin-auth'
import { AdminSession, isAdminSession } from './admin.types'

// Login outcome — values double as UI state keys; no magic strings.
export const AdminAuthStatus = {
  idle: 'idle',
  authenticating: 'authenticating',
  wrongPassword: 'wrongPassword',
  rateLimited: 'rateLimited',
  error: 'error',
} as const
export type AdminAuthStatus = (typeof AdminAuthStatus)[keyof typeof AdminAuthStatus]

type AdminRequestOptions<T> = {
  signal?: AbortSignal
  method?: string
  body?: unknown
  validate?: (raw: unknown) => raw is T
}

export type AdminRequest = <T>(path: string, options?: AdminRequestOptions<T>) => Promise<T>

export type AdminAuth = {
  token: string | null
  status: AdminAuthStatus
  login: (password: string) => Promise<void>
  logout: () => void
  request: AdminRequest
}

export function useAdminAuth(): AdminAuth {
  const [session, setSession] = useState<AdminSession | null>(loadSession)
  const [status, setStatus] = useState<AdminAuthStatus>(AdminAuthStatus.idle)

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    setStatus(AdminAuthStatus.idle)
  }, [])

  const login = useCallback(async (password: string) => {
    setStatus(AdminAuthStatus.authenticating)
    try {
      const res = await fetch(apiUrl(apiRoutes.admin.login), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 401) return setStatus(AdminAuthStatus.wrongPassword)
      if (res.status === 429) return setStatus(AdminAuthStatus.rateLimited)
      if (!res.ok) return setStatus(AdminAuthStatus.error)

      const raw: unknown = await res.json()
      if (!isAdminSession(raw)) return setStatus(AdminAuthStatus.error)

      saveSession(raw)
      setSession(raw)
      setStatus(AdminAuthStatus.idle)
    } catch {
      setStatus(AdminAuthStatus.error)
    }
  }, [])

  // Authed fetch for every non-login admin call. Bounces to login (logout) on a missing/expired
  // token or a 401, so a stale session can never wedge the dashboard.
  const request = useCallback(
    async <T>(path: string, options: AdminRequestOptions<T> = {}): Promise<T> => {
      if (!session || isExpired(session.expiresAt)) {
        logout()
        throw new AdminApiError(401)
      }
      const res = await fetch(apiUrl(path), {
        method: options.method ?? 'GET',
        signal: options.signal,
        headers: {
          Authorization: `Bearer ${session.token}`,
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      if (res.status === 401) {
        logout()
        throw new AdminApiError(401)
      }
      if (!res.ok) throw new AdminApiError(res.status)
      const raw: unknown = await res.json()
      if (options.validate && !options.validate(raw)) {
        throw new Error('Unexpected response shape')
      }
      return raw as T
    },
    [session, logout]
  )

  return { token: session?.token ?? null, status, login, logout, request }
}
