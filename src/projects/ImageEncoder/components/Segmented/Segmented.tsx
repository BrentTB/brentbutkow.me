import styles from './Segmented.module.scss'

export interface SegmentedOption<T extends string | number> {
  value: T
  label: string
}

interface SegmentedProps<T extends string | number> {
  ariaLabel: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

// Controlled pill toggle, generic over string or numeric option values.
export function Segmented<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            className={selected ? styles.active : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
