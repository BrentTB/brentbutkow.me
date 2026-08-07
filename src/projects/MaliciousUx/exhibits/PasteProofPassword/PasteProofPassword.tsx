import { useState } from 'react'
import { checkPassword, PASSWORD_RULE_ORDER, passwordAccepted } from '../../engine/password-rules'
import styles from './PasteProofPassword.module.scss'
import { copy } from './data'

export function PasteProofPassword() {
  const [value, setValue] = useState('')
  const [blocked, setBlocked] = useState(0)

  const met = checkPassword(value)
  const started = value.length > 0

  const status = () => {
    if (blocked > 0) return copy.blocked(blocked)
    if (!started) return copy.quiet
    if (passwordAccepted(value)) return copy.accepted
    return copy.typed(value.length)
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="paste-proof">
        {copy.label}
      </label>
      <input
        id="paste-proof"
        className={styles.input}
        type="password"
        value={value}
        autoComplete="new-password"
        onChange={(event) => setValue(event.target.value)}
        onPaste={(event) => {
          event.preventDefault()
          setBlocked((count) => count + 1)
        }}
      />
      <p className={styles.hint}>{copy.hint}</p>

      <p className={styles.rulesTitle}>{copy.rulesTitle}</p>
      <ul className={styles.rules}>
        {PASSWORD_RULE_ORDER.map((rule) => (
          <li key={rule} className={`${styles.rule} ${started && met[rule] ? styles.isMet : ''}`}>
            {/* An empty field leaves every rule neutral: all-green before a keystroke reads as a bug. */}
            <span className={styles.mark} aria-hidden="true">
              {!started ? '·' : met[rule] ? '✓' : '✗'}
            </span>
            {copy.rules[rule]}
            {started && (
              <span
                className={styles.visuallyHidden}
              >{` (${met[rule] ? copy.met : copy.unmet})`}</span>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.readout} aria-live="polite">
        {status()}
      </p>
    </div>
  )
}
