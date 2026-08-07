import { useState } from 'react'
import { hostileFormatPhone } from '../../engine/hostile-format'
import styles from './DigitEater.module.scss'
import { copy } from './data'

const digitsIn = (value: string) => value.replace(/\D/g, '').length

export function DigitEater() {
  const [value, setValue] = useState('')
  const [typed, setTyped] = useState(0)

  const onChange = (next: string) => {
    // Only additions count as typing; a backspace should not read as another digit entered.
    const added = digitsIn(next) > digitsIn(value)
    const count = added ? typed + 1 : typed

    setTyped(count)
    setValue(hostileFormatPhone(next, count).value)
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="digit-eater">
        {copy.label}
      </label>
      <input
        id="digit-eater"
        className={styles.input}
        type="tel"
        inputMode="numeric"
        value={value}
        placeholder="(012) 345-6789"
        onChange={(event) => onChange(event.target.value)}
      />
      <p className={styles.hint}>{copy.hint}</p>

      <p className={styles.readout} aria-live="polite">
        {typed === 0 ? copy.quiet : copy.count(typed, digitsIn(value))}
      </p>
    </div>
  )
}
