import { useCallback, useEffect, useRef } from 'react'

// Tracks object URLs a component mints so they can be revoked together, and
// always revokes whatever is left on unmount. Shared by the encode and decode
// hooks, which each own a set of preview/result URLs.
export function useObjectUrls() {
  const urls = useRef<Set<string>>(new Set())

  const track = useCallback((url: string) => {
    urls.current.add(url)
    return url
  }, [])

  const revokeAll = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url))
    urls.current.clear()
  }, [])

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url))
      urls.current.clear()
    },
    []
  )

  return { track, revokeAll }
}
