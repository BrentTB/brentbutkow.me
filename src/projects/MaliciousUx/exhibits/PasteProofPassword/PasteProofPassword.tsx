import { useEffect, useState } from 'react'
import styles from './PasteProofPassword.module.scss'
import { copy, REVEAL_MS } from './data'

// What the readout last had to report, so a newer action always wins over an older one.
const Mode = { quiet: 'quiet', typed: 'typed', blocked: 'blocked', peeked: 'peeked' } as const
type Mode = (typeof Mode)[keyof typeof Mode]

export function PasteProofPassword() {
  const [value, setValue] = useState('')
  const [blocked, setBlocked] = useState(0)
  const [shown, setShown] = useState(false)
  const [mode, setMode] = useState<Mode>(Mode.quiet)

  // A look at what you typed, rationed. The one second is the whole feature.
  useEffect(() => {
    if (!shown) return
    const hide = setTimeout(() => {
      setShown(false)
      setMode(Mode.peeked)
    }, REVEAL_MS)
    return () => clearTimeout(hide)
  }, [shown])

  const onChange = (next: string) => {
    setValue(next)
    setMode(next.length > 0 ? Mode.typed : Mode.quiet)
  }

  const refusePaste = () => setBlocked((count) => count + 1)

  const status = () => {
    if (mode === Mode.blocked) return copy.blocked(blocked)
    if (mode === Mode.peeked) return copy.peeked
    if (mode === Mode.typed) return copy.typed(value.length)
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
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => {
            event.preventDefault()
            refusePaste()
            setMode(Mode.blocked)
          }}
          onDrop={(event) => {
            event.preventDefault()
            refusePaste()
            setMode(Mode.blocked)
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
