import styles from './ModeToggle.module.scss'

type ModeToggleProps = {
  isEnabled: boolean
  onToggle: (value: boolean) => void
  label1: string
  label2: string
  className?: string
}

function ModeToggle({ isEnabled, onToggle, label1, label2, className }: ModeToggleProps) {
  return (
    <li className={`${styles.modeControl} ${className || ''}`}>
      <button
        className={styles.modeToggle}
        onClick={() => onToggle(false)}
        aria-label={`Switch to ${label1} mode`}
      >
        <p className={`${styles.modeLabel} ${!isEnabled ? styles.activeText : ''}`}>{label1}</p>
      </button>
      <button
        className={styles.modeToggle}
        onClick={() => onToggle(!isEnabled)}
        aria-label={`Switch to ${isEnabled ? label1 : label2} mode`}
        role="switch"
        aria-checked={isEnabled}
      >
        <span className={styles.toggleTrack}>
          <span className={styles.toggleThumb} />
        </span>
      </button>
      <button
        className={styles.modeToggle}
        onClick={() => onToggle(true)}
        aria-label={`Switch to ${label2} mode`}
      >
        <p className={`${styles.modeLabel} ${isEnabled ? styles.activeText : ''}`}>{label2}</p>
      </button>
    </li>
  )
}

export default ModeToggle
