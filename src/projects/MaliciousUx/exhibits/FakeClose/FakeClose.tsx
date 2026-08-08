import { useState } from 'react'
import { useFocusWhen } from '../../useFocusWhen'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './FakeClose.module.scss'
import { copy, popups } from './data'

export function FakeClose() {
  const [index, setIndex] = useState(0)
  const [keyboardEscape, setKeyboardEscape] = useState(false)
  const { viaPointer, intentProps } = usePointerIntent()
  const popup = popups[index]
  // Focus follows the swap between the × and the "reopen" button so the keyboard never lands on body.
  const reopenRef = useFocusWhen<HTMLButtonElement>(popup === undefined)
  const closeRef = useFocusWhen<HTMLButtonElement>(popup !== undefined)

  // Clicking the × buys you the next one; pressing it with the keyboard clears the stack.
  const onClose = () => {
    if (viaPointer.current) {
      setIndex(index + 1)
      return
    }
    setKeyboardEscape(true)
    setIndex(popups.length)
  }

  const reopen = () => {
    setKeyboardEscape(false)
    setIndex(0)
  }

  return (
    <div className={styles.article}>
      <h4 className={styles.heading}>{copy.page}</h4>
      <p className={styles.body}>{copy.body}</p>

      {popup === undefined ? (
        <div className={styles.done}>
          <p className={styles.readout} aria-live="polite">
            {keyboardEscape ? copy.keyboardCleared : copy.cleared}
          </p>
          <button type="button" ref={reopenRef} className={styles.reopen} onClick={reopen}>
            {copy.reopen}
          </button>
        </div>
      ) : (
        <div className={styles.overlay}>
          <div className={styles.panel} role="dialog" aria-label={popup.heading}>
            <button
              type="button"
              ref={closeRef}
              className={styles.close}
              aria-label={copy.closeLabel(index)}
              onClick={onClose}
              {...intentProps}
            >
              <span aria-hidden="true">×</span>
            </button>
            <h5 className={styles.popupHeading}>{popup.heading}</h5>
            <p className={styles.popupBody}>{popup.body}</p>
            <div className={styles.signup}>
              <input
                className={styles.email}
                type="email"
                aria-label="Email address"
                placeholder={copy.email}
              />
              <button type="button" className={styles.subscribe}>
                {copy.subscribe}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
