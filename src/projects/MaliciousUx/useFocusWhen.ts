import { RefObject, useLayoutEffect, useRef } from 'react'

/**
 * Focus an element the moment a condition turns true, and only then — never on mount, so a control
 * that starts active is left alone. Exhibits that swap a pressed control for a successor use it to
 * carry a keyboard user onto the new control instead of dropping focus onto the document body.
 */
export function useFocusWhen<T extends HTMLElement>(active: boolean): RefObject<T> {
  const ref = useRef<T>(null)
  const was = useRef(active)

  useLayoutEffect(() => {
    if (active && !was.current) ref.current?.focus()
    was.current = active
  }, [active])

  return ref
}
