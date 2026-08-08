import { FormEvent, useState } from 'react'
import {
  checkAll,
  discloseFor,
  LATE_RULE_ORDER,
  RULES_KNOWN_UP_FRONT,
} from '../../engine/late-rules'
import { useFocusWhen } from '../../useFocusWhen'
import styles from './LateRules.module.scss'
import { copy } from './data'

const Status = {
  quiet: 'quiet',
  broken: 'broken',
  newRule: 'newRule',
  accepted: 'accepted',
} as const
type Status = (typeof Status)[keyof typeof Status]

export function LateRules() {
  const [value, setValue] = useState('')
  const [revealed, setRevealed] = useState(RULES_KNOWN_UP_FRONT)
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<Status>(Status.quiet)
  /** How many clauses the last submit shook loose, so the list can mark all of them as new. */
  const [fresh, setFresh] = useState(0)

  // Live for the clauses already disclosed. The undisclosed half of the policy stays secret, which is
  // the whole trick; ticking off the part you have been told about is the least the form owes you.
  const met = checkAll(value)
  const started = value.length > 0

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Counters advance from their own latest value: two submits landing in one batch would both read
    // the same stale count and only one of them would stick.
    setAttempts((count) => count + 1)

    const disclosure = discloseFor(value, revealed)
    const gained = disclosure.revealed - revealed
    setRevealed(disclosure.revealed)
    setFresh(gained)

    if (disclosure.broken === null) {
      setStatus(Status.accepted)
      return
    }
    // Clauses the password already cleared are admitted to in one go; the reveal stops at the failure.
    setStatus(gained > 0 ? Status.newRule : Status.broken)
  }

  const restart = () => {
    setValue('')
    setRevealed(RULES_KNOWN_UP_FRONT)
    setAttempts(0)
    setFresh(0)
    setStatus(Status.quiet)
  }

  const done = status === Status.accepted
  // Acceptance swaps submit for "start over" and restart swaps back; keep focus on whichever shows.
  const againRef = useFocusWhen<HTMLButtonElement>(done)
  const submitRef = useFocusWhen<HTMLButtonElement>(!done)

  return (
    <form className={styles.field} onSubmit={onSubmit}>
      <label className={styles.label} htmlFor="late-rules">
        {copy.label}
      </label>
      <input
        id="late-rules"
        className={styles.input}
        type="text"
        value={value}
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
      />

      <p className={styles.knownTitle}>{copy.knownTitle}</p>
      <ul className={styles.rules}>
        {LATE_RULE_ORDER.slice(0, revealed).map((rule, index) => {
          const passing = started && met[rule]
          const failing = started && !met[rule]

          return (
            <li
              key={rule}
              className={`${index >= revealed - fresh ? styles.newest : ''} ${
                passing ? styles.isMet : ''
              } ${failing ? styles.isBroken : ''}`}
            >
              {/* An empty field leaves every clause neutral: marks before a keystroke read as a bug. */}
              <span className={styles.mark} aria-hidden="true">
                {!started ? '·' : passing ? '✓' : '✗'}
              </span>
              {copy.rules[rule]}
              {started && (
                <span className={styles.visuallyHidden}>
                  {` (${passing ? copy.ruleMet : copy.ruleUnmet})`}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {done ? (
        <button type="button" ref={againRef} className={styles.again} onClick={restart}>
          {copy.again}
        </button>
      ) : (
        <button type="submit" ref={submitRef} className={styles.submit}>
          {copy.submit}
        </button>
      )}

      <p
        className={`${styles.readout} ${status === Status.broken ? styles.errorText : ''}`}
        aria-live="polite"
      >
        {status === Status.accepted && copy.accepted(attempts)}
        {status === Status.newRule && copy.newRule(fresh)}
        {status === Status.broken && copy.broken}
        {status === Status.quiet && copy.quiet}
      </p>
    </form>
  )
}
