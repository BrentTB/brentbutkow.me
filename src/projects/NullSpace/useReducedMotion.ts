import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const prefersReduced = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(QUERY).matches

// Tracks the OS "reduce motion" preference, updating live if the user toggles
// it. The JS counterpart to the global `prefers-reduced-motion` CSS rule — game
// animations read this to dampen themselves. Returns false where matchMedia is
// unavailable (SSR / old runtimes).
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReduced)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
