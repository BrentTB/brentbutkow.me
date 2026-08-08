import { useState } from 'react'
import { useFocusWhen } from '../../useFocusWhen'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './InvisibleUnsubscribe.module.scss'
import { copy } from './data'

export function InvisibleUnsubscribe() {
  const [gone, setGone] = useState(false)
  const [byKeyboard, setByKeyboard] = useState(false)
  const { viaPointer, intentProps } = usePointerIntent()
  // Unsubscribing swaps the hidden link for "put it back" and back again; focus rides along.
  const againRef = useFocusWhen<HTMLButtonElement>(gone)
  const linkRef = useFocusWhen<HTMLButtonElement>(!gone)

  const onUnsubscribe = () => {
    setByKeyboard(!viaPointer.current)
    setGone(true)
  }

  const status = () => {
    if (!gone) return copy.quiet
    return byKeyboard ? copy.keyboardFound : copy.found
  }

  return (
    <div className={styles.email}>
      <h4 className={styles.subject}>{copy.subject}</h4>
      <p className={styles.body}>{copy.body}</p>

      <div className={styles.footer}>
        {copy.footer.map((paragraph) => (
          <p className={styles.smallPrint} key={paragraph}>
            {paragraph}
          </p>
        ))}
        {/* Present, labelled, and focusable. Just not visible, which is the part the law forgot. */}
        {!gone && (
          <button
            type="button"
            ref={linkRef}
            className={styles.hidden}
            onClick={onUnsubscribe}
            {...intentProps}
          >
            {copy.unsubscribe}
          </button>
        )}
      </div>

      <div className={styles.readoutRow}>
        <p className={styles.readout} aria-live="polite">
          {status()}
        </p>
        {gone && (
          <button
            type="button"
            ref={againRef}
            className={styles.again}
            onClick={() => setGone(false)}
          >
            {copy.again}
          </button>
        )}
      </div>
    </div>
  )
}
