import { useEffect, useState } from 'react'
import styles from './PasteProofPassword.module.scss'
import { copy, REVEAL_MS } from './data'

export function PasteProofPassword() {
  const [value, setValue] = useState('')
  const [blocked, setBlocked] = useState(0)
  const [shown, setShown] = useState(false)
  const [peeked, setPeeked] = useState(false)

  // A look at what you typed, rationed. The one second is the whole feature.
  useEffect(() => {
    if (!shown) return
    const hide = setTimeout(() => {
      setShown(false)
      setPeeked(true)
    }, REVEAL_MS)
    return () => clearTimeout(hide)
  }, [shown])

  const status = () => {
    if (blocked > 0) return copy.blocked(blocked)
    if (peeked && !shown) return copy.peeked
    if (value.length > 0) return copy.typed(value.length)
    return copy.quiet
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="paste-proof">
        {copy.label}
      </label>

      <div className={styles.control}>
        <input
          id="paste-proof"
          className={styles.input}
          type={shown ? 'text' : 'password'}
          value={value}
          autoComplete="new-password"
          onChange={(event) => setValue(event.target.value)}
          onPaste={(event) => {
            event.preventDefault()
            setBlocked((count) => count + 1)
          }}
        />
        <button
          type="button"
          className={styles.reveal}
          aria-label={copy.revealLabel}
          aria-pressed={shown}
          onClick={() => setShown(true)}
        >
          {copy.reveal}
        </button>
      </div>

      <p className={styles.hint}>{copy.hint}</p>

      <p className={styles.readout} aria-live="polite">
        {status()}
      </p>
    </div>
  )
}
