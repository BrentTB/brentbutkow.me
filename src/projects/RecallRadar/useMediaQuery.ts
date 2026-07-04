import { useEffect, useState } from 'react'

const queryMatches = (query: string): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches

// Tracks whether a CSS media query currently matches, updating live on resize/rotate. Drives the
// dashboard tweaks CSS alone can't do (rendering the location scope as a dropdown before its tabs
// overflow the bar). Returns false where matchMedia is unavailable (SSR / old runtimes).
export function useMediaQuery(query: string): boolean {
  const [matched, setMatched] = useState(() => queryMatches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatched(event.matches)
    // Re-sync in case the query changed between render and effect.
    setMatched(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matched
}
