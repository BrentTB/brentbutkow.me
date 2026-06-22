import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import styles from './HelpHint.module.scss'

type HelpHintProps = {
  // Accessible name for the button, e.g. "What's a theme?"
  label: string
  children: ReactNode
}

// A small "?" affordance next to a heading. The hint shows on hover and keyboard focus (CSS), and a
// click toggles it so it stays open on touch devices, where there's no hover. `aria-expanded`
// reflects the click state, and `aria-controls`/`aria-describedby` tie the button to the
// `role="note"` hint it reveals.
export function HelpHint({ label, children }: HelpHintProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const bubbleId = useId()

  // Once toggled open on touch, dismiss on outside click or Escape — like the app's other popovers.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span className={styles.root} data-open={open || undefined} ref={rootRef}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-expanded={open}
        aria-controls={bubbleId}
        aria-describedby={bubbleId}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      <span id={bubbleId} role="note" className={styles.bubble}>
        {children}
      </span>
    </span>
  )
}
