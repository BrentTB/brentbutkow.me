import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from 'react'

const noSubscription = () => () => {}

/** True while prerendering, and while hydrating prerendered HTML — when only build-time values may render. */
export const useIsHydrating = (): boolean =>
  useSyncExternalStore(
    noSubscription,
    () => false,
    () => true
  )

/**
 * useState seeded from browser storage (or any other browser-only read) without breaking hydration:
 * prerender and hydration render `fallback`, and the stored value replaces it straight after. A plain
 * client render (in-app navigation, Fun mode) reads up front, so it never shows the fallback.
 */
export function useStoredState<T>(read: () => T, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const hydrating = useIsHydrating()
  const [value, setValue] = useState(() => (hydrating ? fallback : read()))
  const pending = useRef(hydrating ? read : null)

  useEffect(() => {
    if (pending.current) setValue(pending.current())
    pending.current = null
  }, [])

  return [value, setValue]
}
