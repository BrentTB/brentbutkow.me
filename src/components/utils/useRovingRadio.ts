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
 *
 * `isDisabled` marks options the group must not select. The keys step over them rather than through them:
 * an arrow that selected a locked option would take an action the mouse is not allowed to take, which in
 * one case walked out of a live game.
 */
export function useRovingRadio<T>(
  options: readonly T[],
  value: T,
  onChange: (next: T) => void,
  isDisabled?: (option: T) => boolean
): (index: number) => RovingRadioProps {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const enabled = (option: T) => isDisabled === undefined || !isDisabled(option)

  const selected = options.indexOf(value)
  // Nothing selected yet still needs somewhere to land, or the group drops out of the tab order entirely.
  const fallback = options.findIndex(enabled)
  const focusIndex = selected >= 0 ? selected : Math.max(0, fallback)

  /** Selects the first option `step` can reach from `index`, itself included. Does nothing if none can. */
  const moveTo = (index: number, step: 1 | -1) => {
    const count = options.length
    for (let hop = 0; hop < count; hop++) {
      const at = (((index + hop * step) % count) + count) % count
      if (!enabled(options[at])) continue
      // Re-selecting what is already selected is not a change: a caller may act on every call it gets.
      if (options[at] !== value) onChange(options[at])
      buttons.current[at]?.focus()
      return
    }
  }

  return (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      buttons.current[index] = element
    },
    tabIndex: index === focusIndex ? 0 : -1,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      // Each key names where to start looking and which way to keep looking if that option is locked.
      const moves: Record<string, [number, 1 | -1] | undefined> = {
        ArrowRight: [index + 1, 1],
        ArrowDown: [index + 1, 1],
        ArrowLeft: [index - 1, -1],
        ArrowUp: [index - 1, -1],
        Home: [0, 1],
        End: [options.length - 1, -1],
      }
      const move = moves[event.key]
      if (move === undefined) return
      event.preventDefault()
      moveTo(move[0], move[1])
    },
  })
}
