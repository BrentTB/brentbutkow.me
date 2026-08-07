import { useCallback, useState } from 'react'

/**
 * A single preference kept in `localStorage`, validated on the way in so a stale or hand-edited value
 * falls back to the default rather than being trusted off disk. Blocked storage (private mode, a quota
 * error) reads and writes as if nothing were saved — a game that plays beats a saved preference.
 *
 * The value is a string identifier (the `const`-object union the site uses), so it stores as-is.
 */
export function usePersistedChoice<T extends string>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T
): [T, (value: T) => void] {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      return isValid(raw) ? raw : fallback
    } catch {
      return fallback
    }
  }

  const [choice, setChoice] = useState<T>(read)

  const choose = useCallback(
    (value: T) => {
      setChoice(value)
      try {
        localStorage.setItem(key, value)
      } catch {
        // A game that plays is worth more than a saved preference.
      }
    },
    [key]
  )

  return [choice, choose]
}
