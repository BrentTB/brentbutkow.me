import { useMemo, useState } from 'react'
import { uselessOrder } from '../../engine/hostile-format'
import styles from './BirthdaySpinners.module.scss'
import { copy, FIRST_YEAR, LAST_YEAR } from './data'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const days = Array.from({ length: 31 }, (_, index) => String(index + 1))
const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, index) =>
  String(FIRST_YEAR + index)
)

export function BirthdaySpinners() {
  const months = useMemo(() => uselessOrder(MONTHS), [])
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')

  const complete = day !== '' && month !== '' && year !== ''

  return (
    <fieldset className={styles.dob}>
      <legend className={styles.legend}>{copy.legend}</legend>

      <div className={styles.spinners}>
        <label className={styles.spinner}>
          <span className={styles.label}>{copy.day}</span>
          <select
            className={styles.select}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          >
            <option value="">-</option>
            {days.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.spinner}>
          <span className={styles.label}>{copy.month}</span>
          <select
            className={styles.select}
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value="">-</option>
            {months.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.spinner}>
          <span className={styles.label}>{copy.year}</span>
          <select
            className={styles.select}
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="">-</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className={styles.hint}>{copy.hint}</p>

      <p className={styles.readout} aria-live="polite">
        {complete ? copy.chosen(day, month, year, Number(year) - FIRST_YEAR) : copy.quiet}
      </p>
    </fieldset>
  )
}
