import { KeyboardEvent, useRef } from 'react'

/** The props each option needs for the group to behave like a radio group. */
export type RovingRadioProps = {
  ref: (element: HTMLButtonElement | null) => void
  tabIndex: number
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}

/**
 * Keyboard behaviour for a single-select group of buttons: one tab stop, arrow keys to move the selection,
 * Home and End for the ends.
 *
 * This is the contract `role="radiogroup"` promises, and it is not what a row of buttons does on its own —
 * every option would be its own tab stop and the arrow keys would do nothing, so a screen reader announces
 * "radio 1 of 4" and then refuses to move. Markup-agnostic on purpose: the caller keeps its own roles,
 * labels, and skin, and only borrows the focus management.
 */
export function useRovingRadio<T>(
  options: readonly T[],
  value: T,
  onChange: (next: T) => void
): (index: number) => RovingRadioProps {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const selected = options.indexOf(value)
  // Nothing selected yet still needs somewhere to land, or the group drops out of the tab order entirely.
  const focusIndex = selected >= 0 ? selected : 0

  const moveTo = (index: number) => {
    const next = (index + options.length) % options.length
    onChange(options[next])
    buttons.current[next]?.focus()
  }

  return (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      buttons.current[index] = element
    },
    tabIndex: index === focusIndex ? 0 : -1,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const moves: Record<string, number | undefined> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: options.length - 1,
      }
      const target = moves[event.key]
      if (target === undefined) return
      event.preventDefault()
      moveTo(target)
    },
  })
}
