import { useCallback, useEffect, useState } from 'react'
import { AdminRequest } from './useAdminAuth'

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export type AdminResourceState<T> = FetchState<T> & {
  // Splice a mutation's result into the loaded data without a full refetch.
  setData: (updater: (prev: T | null) => T | null) => void
  // Force a refetch — e.g. after a mutation elsewhere invalidates this resource.
  reload: () => void
}

// Authed GET-and-track hook: loading/error state plus in-flight cancellation on path/unmount.
// Mirrors useApiResource but routes through the admin `request` (Bearer header + 401→logout).
// `request` is stable from the auth context, so it's a safe effect dependency.
export function useAdminResource<T>(
  request: AdminRequest,
  path: string,
  validate?: (raw: unknown) => raw is T
): AdminResourceState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((prev) => ({ ...prev, loading: true, error: null }))

    request<T>(path, { signal: controller.signal, validate })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load',
        })
      })

    return () => controller.abort()
  }, [request, path, validate, reloadKey])

  const setData = useCallback((updater: (prev: T | null) => T | null) => {
    setState((prev) => ({ ...prev, data: updater(prev.data) }))
  }, [])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, setData, reload }
}
