import { RefObject, useEffect, useRef } from 'react'

/** Anything a keyboard can land on inside a panel. Enough for the sim's dialogs, which hold no links. */
const FOCUSABLE = 'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

export type DialogChrome = {
  /** Put this on the panel: the Tab trap reads its contents. */
  panelRef: RefObject<HTMLDivElement>
}

/**
 * The keyboard side of a modal, shared by every dialog in the sim: Escape closes, Tab cycles inside the
 * panel instead of wandering onto the world behind it, focus starts inside on open and goes back to
 * whatever opened it on close.
 *
 * `onClose` is read through a ref rather than depended on, because the page re-renders about ten times a
 * second as the readout ticks and hands down a fresh callback each time. Depending on it re-ran this effect
 * constantly and yanked focus back to the first control mid-interaction.
 */
export function useDialogChrome(
  onClose: () => void,
  /** Where focus should land on open. Defaults to the first control in the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>
): DialogChrome {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement
    const focusable = () => panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)

    // Settings opens on its Done button rather than on a toggle: the dialog is a thing you close, and
    // landing on a switch invites flipping it by feel.
    const landing = initialFocusRef?.current ?? focusable()?.[0]
    landing?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const inside = focusable()
      if (inside === undefined || inside.length === 0) return
      const first = inside[0]
      const last = inside[inside.length - 1]

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement) opener.focus()
    }
    // `initialFocusRef` is read once on open by design: this effect must not re-run on a parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { panelRef }
}
