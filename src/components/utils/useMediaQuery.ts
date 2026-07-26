import { useEffect, useState } from 'react'

const queryMatches = (query: string): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches

// Tracks whether a CSS media query currently matches, updating live on resize/rotate. For the choices CSS
// alone can't make: the recall dashboard renders its location scope as a dropdown before the tabs overflow,
// and the pixel world moves its palette into a sheet on a phone rather than rendering both and hiding one.
// Returns false where matchMedia is unavailable (SSR / old runtimes).
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
