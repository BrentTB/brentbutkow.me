import { useCallback, useEffect, useRef } from 'react'

// Guards async work that ends in a state update. `begin()` marks a new request
// the current one and returns an `isStale` probe: it reports true once a newer
// request has begun, or once the component unmounts — so callbacks that resolve
// after teardown (or after a fresher request supersedes them) skip their writes.
export function useLatestRequest() {
  const tokenRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return useCallback(() => {
    const token = ++tokenRef.current
    return () => !mountedRef.current || token !== tokenRef.current
  }, [])
}
