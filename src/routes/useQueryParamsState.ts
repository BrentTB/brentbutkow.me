import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type QueryParamsState<K extends string> = {
  values: Record<K, string>
  patch: (next: Partial<Record<K, string>>) => void
  reset: () => void
}

// A reusable bridge between URL query params and typed UI state. Pass the params you manage and
// their defaults; get back the current values (the default when a param is absent), a `patch` to
// merge changes, and a `reset` to clear them all. A value equal to its default (or empty) is dropped
// from the URL, so the query string carries only active selections and stays shareable. Everything
// is strings — the URL's native type — so callers validate/coerce what they read back.
//
// `defaults` must be stable across renders (declare it at module scope); the memoised values and
// callbacks key off it. Unrelated params already in the URL are always preserved.
export function useQueryParamsState<K extends string>(
  defaults: Record<K, string>,
  options: { replace?: boolean } = {}
): QueryParamsState<K> {
  // Filter changes shouldn't stack the back button, so replace history by default.
  const { replace = true } = options
  const [searchParams, setSearchParams] = useSearchParams()

  const values = useMemo(() => {
    const result = { ...defaults }
    for (const key of Object.keys(defaults) as K[]) {
      const raw = searchParams.get(key)
      if (raw !== null) result[key] = raw
    }
    return result
  }, [searchParams, defaults])

  const patch = useCallback(
    (next: Partial<Record<K, string>>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          for (const key of Object.keys(next) as K[]) {
            const value = next[key]
            if (value === undefined) continue
            if (value === '' || value === defaults[key]) params.delete(key)
            else params.set(key, value)
          }
          return params
        },
        { replace }
      )
    },
    [setSearchParams, defaults, replace]
  )

  const reset = useCallback(() => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        for (const key of Object.keys(defaults)) params.delete(key)
        return params
      },
      { replace }
    )
  }, [setSearchParams, defaults, replace])

  return { values, patch, reset }
}
