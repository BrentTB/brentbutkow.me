import styles from './CloseButton.module.scss'

type CloseButtonProps = {
  onClick: () => void
  label: string
  className?: string
}

/** Close control whose × assembles from two bars flying in and rotating — the navbar hamburger's
 *  move, run when the dialog/panel it lives in appears. */
export function CloseButton({ onClick, label, className }: CloseButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.close}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      <span className={styles.glyph} aria-hidden="true">
        <span className={styles.line} />
        <span className={styles.line} />
      </span>
    </button>
  )
}
