import { useState } from 'react'
import { useFocusWhen } from '../../useFocusWhen'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './BackButtonTrap.module.scss'
import { copy } from './data'

/**
 * The trap is drawn, not real: the back arrow below belongs to a picture of a browser and the site's own
 * history is never touched. A page that actually stuffed `history` would break the visitor's way out of
 * this one.
 */

/** Fake history entries the arrow walks through before it gives up. */
const DEAD_ENDS = [
  '15 Foods You Are Storing Wrong (No. 4 Will Shock You)',
  '15 Foods You Are Storing Wrong: page 2',
  '15 Foods You Are Storing Wrong: continue reading',
]

export function BackButtonTrap() {
  const [presses, setPresses] = useState(0)
  const [escaped, setEscaped] = useState(false)
  const [byKeyboard, setByKeyboard] = useState(false)
  const { viaPointer, intentProps } = usePointerIntent()
  // Escaping disables the Back button and mounts "go back in"; restarting does the reverse. Move focus
  // with the control that appears so a keyboard user is never dropped onto the body.
  const againRef = useFocusWhen<HTMLButtonElement>(escaped)
  const backRef = useFocusWhen<HTMLButtonElement>(!escaped)

  const page = DEAD_ENDS[Math.min(presses, DEAD_ENDS.length - 1)]

  const onBack = () => {
    const next = presses + 1
    setPresses(next)
    if (!viaPointer.current) {
      setByKeyboard(true)
      setEscaped(true)
      return
    }
    if (next >= DEAD_ENDS.length) setEscaped(true)
  }

  const restart = () => {
    setPresses(0)
    setEscaped(false)
    setByKeyboard(false)
  }

  const status = () => {
    if (escaped) return byKeyboard ? copy.keyboardEscaped : copy.escaped(presses)
    if (presses === 0) return copy.quiet
    return copy.trapped(presses)
  }

  return (
    <div className={styles.browser}>
      <div className={styles.chrome}>
        <button
          type="button"
          ref={backRef}
          className={styles.back}
          onClick={onBack}
          disabled={escaped}
          aria-label={copy.backLabel}
          {...intentProps}
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className={styles.url}>{copy.url}</span>
      </div>

      <div className={styles.viewport}>
        {escaped ? (
          <p className={styles.exit}>{copy.exit}</p>
        ) : (
          <>
            <p className={styles.headline}>{page}</p>
            <p className={styles.filler}>{copy.filler}</p>
          </>
        )}
      </div>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {status()}
        </p>
        {escaped && (
          <button type="button" ref={againRef} className={styles.again} onClick={restart}>
            {copy.again}
          </button>
        )}
      </div>
    </div>
  )
}
