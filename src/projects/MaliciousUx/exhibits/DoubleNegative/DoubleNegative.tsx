import { useState } from 'react'
import styles from './DoubleNegative.module.scss'
import { copy } from './data'

const Choice = { optIn: 'optIn', optOut: 'optOut' } as const
type Choice = (typeof Choice)[keyof typeof Choice]

export function DoubleNegative() {
  const [picked, setPicked] = useState<Choice | null>(null)
  const [confirmed, setConfirmed] = useState<Choice | null>(null)

  return (
    <div className={styles.panel}>
      <h4 className={styles.heading}>{copy.heading}</h4>
      <p className={styles.detail}>{copy.detail}</p>

      <fieldset className={styles.options}>
        <legend className={styles.visuallyHidden}>{copy.heading}</legend>
        {[Choice.optIn, Choice.optOut].map((choice) => (
          <label className={styles.option} key={choice}>
            <input
              type="radio"
              name="double-negative"
              checked={picked === choice}
              onChange={() => setPicked(choice)}
            />
            <span>{copy[choice].label}</span>
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        className={styles.confirm}
        disabled={picked === null}
        onClick={() => setConfirmed(picked)}
      >
        {copy.confirm}
      </button>

      {/* The museum's translation. The form itself would never put it this way. */}
      <p className={styles.readout} aria-live="polite">
        {confirmed !== null && (
          <>
            <span className={styles.translateLabel}>{copy.translate}</span> {copy[confirmed].plain}
          </>
        )}
        {confirmed === null && (picked === null ? copy.quiet : copy.pending)}
      </p>
    </div>
  )
}
