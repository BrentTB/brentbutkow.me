import { useState } from 'react'
import { hostileFormatPhone } from '../../engine/hostile-format'
import styles from './DigitEater.module.scss'
import { copy } from './data'

const digitsIn = (value: string) => value.replace(/\D/g, '').length

export function DigitEater() {
  const [value, setValue] = useState('')
  const [typed, setTyped] = useState(0)

  const onChange = (next: string) => {
    const before = digitsIn(value)
    const after = digitsIn(next)

    // A backspace or non-digit edit counts as nothing typed and eats nothing.
    if (after <= before) {
      setValue(hostileFormatPhone(next, 0).value)
      return
    }

    // Each added digit is its own bite, so a paste is eaten in the same proportion as typing it out.
    const incoming = next.replace(/\D/g, '')
    let running = value
    let count = typed
    for (let index = before; index < after; index += 1) {
      count += 1
      running = hostileFormatPhone(running + incoming[index], count).value
    }
    setTyped(count)
    setValue(running)
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
