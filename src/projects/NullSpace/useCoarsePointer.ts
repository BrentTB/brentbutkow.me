import { useEffect, useState } from 'react'

const QUERY = '(pointer: coarse)'

const prefersCoarse = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(QUERY).matches

// Tracks whether the primary pointer is coarse (touch), updating live if it
// changes (e.g. a 2-in-1 switching modes). The tutorial reads this to swap
// "click" copy for "tap" and to drop the keyboard-only "press WASD" beat.
// Returns false where matchMedia is unavailable (SSR / old runtimes).
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(prefersCoarse)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return coarse
}
