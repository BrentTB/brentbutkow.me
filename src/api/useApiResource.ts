import { useEffect, useState } from 'react'
import { fetchJson, type Validate } from './api'

export type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

// Generic GET-and-track hook: loading/error state plus in-flight cancellation on path change /
// unmount. `validate` rejects a malformed payload, so `data` is a checked `T`. Reused by every
// module's data hooks.
export function useApiResource<T>(path: string, validate: Validate<T>): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    setState((prev) => ({ ...prev, loading: true, error: null }))

    fetchJson<T>(path, controller.signal, validate)
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
  }, [path, validate])

  return state
}
