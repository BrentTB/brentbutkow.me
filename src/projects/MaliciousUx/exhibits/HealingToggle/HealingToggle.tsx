import { useCallback, useRef, useState } from 'react'
import { useOffscreenReset } from '../../useOffscreenReset'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './HealingToggle.module.scss'
import { copy } from './data'

export function HealingToggle() {
  const [on, setOn] = useState(true)
  const [heals, setHeals] = useState(0)
  const [keyboardHeld, setKeyboardHeld] = useState(false)
  const { viaPointer, intentProps } = usePointerIntent()
  // Only a setting switched off with a mouse is worth quietly restoring.
  const revertable = useRef(false)

  const onReturn = useCallback(() => {
    if (!revertable.current) return
    revertable.current = false
    setOn(true)
    setHeals((count) => count + 1)
  }, [])

  const rowRef = useOffscreenReset<HTMLDivElement>(onReturn)

  const toggle = () => {
    const next = !on
    setOn(next)
    revertable.current = !next && viaPointer.current
    setKeyboardHeld(!next && !viaPointer.current)
  }

  const status = () => {
    if (keyboardHeld && !on) return copy.keyboardHeld
    if (heals > 0) return copy.healed(heals)
    return copy.quiet
  }

  return (
    <div className={styles.settings} ref={rowRef}>
      <h4 className={styles.heading}>{copy.heading}</h4>

      <div className={styles.row}>
        <div className={styles.text}>
          <p className={styles.label}>{copy.label}</p>
          <p className={styles.detail}>{copy.detail}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={copy.label}
          className={`${styles.switch} ${on ? styles.isOn : ''}`}
          onClick={toggle}
          {...intentProps}
        >
          <span className={styles.knob} aria-hidden="true" />
          <span className={styles.state}>{on ? copy.on : copy.off}</span>
        </button>
      </div>

      <p className={styles.readout} aria-live="polite">
        {status()}
      </p>
    </div>
  )
}
