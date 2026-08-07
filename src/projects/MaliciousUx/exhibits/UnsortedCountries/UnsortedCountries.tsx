import { useMemo, useState } from 'react'
import { COUNTRIES } from '../../countries'
import { uselessOrder } from '../../engine/hostile-format'
import styles from './UnsortedCountries.module.scss'
import { copy } from './data'

export function UnsortedCountries() {
  const ordered = useMemo(() => uselessOrder(COUNTRIES), [])
  const [chosen, setChosen] = useState('')

  const position = ordered.indexOf(chosen) + 1

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="unsorted-countries">
        {copy.label}
      </label>
      <select
        id="unsorted-countries"
        className={styles.select}
        value={chosen}
        onChange={(event) => setChosen(event.target.value)}
      >
        <option value="">{copy.placeholder}</option>
        {/* Leading the label with a reference code kills the one thing that made this list usable:
            a native select jumps to the option starting with the letter you press, and none of these
            start with a letter. */}
        {ordered.map((country, index) => (
          <option key={country} value={country}>
            {`${String(index + 1).padStart(3, '0')} ${country}`}
          </option>
        ))}
      </select>
      <p className={styles.hint}>{copy.hint(ordered.length)}</p>

      <p className={styles.readout} aria-live="polite">
        {chosen === '' ? copy.quiet(ordered[0]) : copy.chosen(chosen, position, ordered.length)}
      </p>
    </div>
  )
}
