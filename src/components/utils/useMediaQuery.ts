import { useCallback, useSyncExternalStore } from 'react'

const hasMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'

const noop = () => {}

// Tracks whether a CSS media query currently matches, updating live on resize/rotate. For the choices CSS
// alone can't make: the recall dashboard renders its location scope as a dropdown before the tabs overflow,
// and the pixel world moves its palette into a sheet on a phone rather than rendering both and hiding one.
// Prerendered HTML and hydration see false (the server snapshot); the live value follows straight after,
// so a matching query re-renders instead of failing hydration. Also false where matchMedia is unavailable.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!hasMatchMedia()) return noop
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    [query]
  )
  const getSnapshot = () => hasMatchMedia() && window.matchMedia(query).matches
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
