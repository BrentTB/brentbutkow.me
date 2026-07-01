import { useEffect, useRef, type ReactNode } from 'react'
import styles from './AlertsDialog.module.scss'

type AlertsDialogProps = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

// A centered modal for the alert-signup form. Reachable from the command strip on any tab and at any
// scroll position (a top-of-page panel vanished once you scrolled down). Closes on Escape, backdrop
// click, or the × button; locks body scroll and focuses the panel while open.
export function AlertsDialog({ title, description, onClose, children }: AlertsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerts-dialog-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.headText}>
            <h2 id="alerts-dialog-title" className={styles.title}>
              {title}
            </h2>
            {description && <p className={styles.hint}>{description}</p>}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close alerts form"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
