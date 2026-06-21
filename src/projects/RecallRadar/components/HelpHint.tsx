import { useState, type ReactNode } from 'react'
import styles from './HelpHint.module.scss'

type HelpHintProps = {
  // Accessible name for the button, e.g. "What's a theme?"
  label: string
  children: ReactNode
}

// A small "?" affordance next to a heading. The hint shows on hover and keyboard focus (CSS), and a
// click toggles it so it stays open on touch devices, where there's no hover. `aria-expanded`
// reflects the click state; the hint itself is a `role="note"` the button describes.
export function HelpHint({ label, children }: HelpHintProps) {
  const [open, setOpen] = useState(false)
  return (
    <span className={styles.root} data-open={open || undefined}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      <span role="note" className={styles.bubble}>
        {children}
      </span>
    </span>
  )
}
