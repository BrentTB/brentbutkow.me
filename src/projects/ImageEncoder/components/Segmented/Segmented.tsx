import { KeyboardEvent, useRef } from 'react'
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
  disabled?: boolean
}

// Controlled single-select pill toggle, generic over string or numeric values.
// Exposes radiogroup semantics: one tab stop, arrow keys move the selection.
export function Segmented<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedProps<T>) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0

  const moveTo = (index: number) => {
    const next = (index + options.length) % options.length
    onChange(options[next].value)
    buttonsRef.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveTo(index + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveTo(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveTo(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveTo(options.length - 1)
    }
  }

  return (
    <div className={styles.segmented} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            ref={(element) => {
              buttonsRef.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            tabIndex={disabled ? -1 : index === focusIndex ? 0 : -1}
            className={selected ? styles.active : undefined}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
