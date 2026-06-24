import { Select } from '../../../components/inputs/Select'
import styles from './YearStepper.module.scss'

type YearStepperProps = {
  year: number
  // The available years (any order). The arrows move to the adjacent one and stop at each end; the
  // year itself is a dropdown for jumping directly.
  years: number[]
  // Optional per-year recall counts under the active filters. When given, the dropdown shows each
  // count and greys years with none — so you can see (and jump to) where the data is — while the
  // arrows still walk every year linearly, so "next" never skips unpredictably.
  counts?: Record<number, number>
  onChange: (year: number) => void
}

// A compact year control: ‹ / › step to the adjacent (older / newer) available year — nicer than a
// dropdown for walking a contiguous range — and the year between them is itself a dropdown for
// jumping directly. Each arrow disables at its end; gaps in the data are skipped, not landed on.
export function YearStepper({ year, years, counts, onChange }: YearStepperProps) {
  const sorted = [...years].sort((a, b) => a - b)
  const idx = sorted.indexOf(year)
  const older = idx > 0 ? sorted[idx - 1] : null
  const newer = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
  // Latest first in the menu — the conventional year-picker order.
  const options = [...sorted].reverse().map((y) => {
    const base = { value: String(y), label: String(y) }
    if (!counts) return base
    const count = counts[y] ?? 0
    // Grey years with no recalls under the filters — but never the current selection, so it still
    // reads as chosen. (The arrows can still walk onto an empty year; the dropdown just won't jump there.)
    return { ...base, count, disabled: count === 0 && y !== year }
  })
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.arrow}
        aria-label={older !== null ? `Show ${older}` : 'No earlier year'}
        disabled={older === null}
        onClick={() => older !== null && onChange(older)}
      >
        ‹
      </button>
      <Select
        ariaLabel="Year"
        value={String(year)}
        options={options}
        onChange={(value) => onChange(Number(value))}
        triggerClassName={styles.yearTrigger}
      />
      <button
        type="button"
        className={styles.arrow}
        aria-label={newer !== null ? `Show ${newer}` : 'No later year'}
        disabled={newer === null}
        onClick={() => newer !== null && onChange(newer)}
      >
        ›
      </button>
    </div>
  )
}
