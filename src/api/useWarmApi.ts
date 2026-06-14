import { useEffect } from 'react'
import { apiRoutes, fetchJson } from './api'

// Fire-and-forget GET /health on mount: a free-tier backend's cold start then runs in the
// background while the visitor browses, instead of when they first open a data page.
// No-op when the API base isn't configured (don't ping our own origin).
export function useWarmApi(): void {
  useEffect(() => {
    if (!import.meta.env.VITE_API_URL) return
    const controller = new AbortController()
    void fetchJson<unknown>(apiRoutes.health, controller.signal).catch(() => {
      // Warm-up only — failures (offline backend, aborted request) are intentionally ignored.
    })
    return () => controller.abort()
  }, [])
}
