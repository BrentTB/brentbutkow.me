import styles from './SegmentedToggle.module.scss'

type SegmentedToggleProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

// A segmented toggle for a small mutually-exclusive set (2–3 options) — both choices visible, one
// tap to switch. Clearer than a dropdown when the options are few; matches the country tabs' look
// (active = solid accent).
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <div className={styles.tabs} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.tab} ${value === option.value ? styles.on : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
