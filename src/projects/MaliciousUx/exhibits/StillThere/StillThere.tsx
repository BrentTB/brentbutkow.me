import { useFunMode } from '../../../../contexts/useFunMode'
import { hostilityFor } from '../../data'
import { usePointerIntent } from '../../usePointerIntent'
import { useReturningPrompt } from '../../useReturningPrompt'
import styles from './StillThere.module.scss'
import { copy } from './data'

export function StillThere() {
  const { isFunMode } = useFunMode()
  const { nagIntervalMs } = hostilityFor(isFunMode)
  const { visible, gone, returns, secondsLeft, dismiss, reset } = useReturningPrompt(nagIntervalMs)
  const { viaPointer, intentProps } = usePointerIntent()

  const status = () => {
    if (gone) return copy.keyboardGone
    if (secondsLeft !== null) return copy.waiting(secondsLeft)
    if (returns > 0) return copy.asked(returns)
    return copy.quiet
  }

  return (
    <div className={styles.player}>
      <div className={styles.screen}>
        <p className={styles.show}>{copy.show}</p>
        <p className={styles.playing}>{copy.playing}</p>

        {visible && (
          <div className={styles.overlay}>
            <div className={styles.panel} role="dialog" aria-label={copy.title}>
              <p className={styles.title}>{copy.title}</p>
              <p className={styles.detail}>{copy.detail}</p>
              <button
                type="button"
                className={styles.confirm}
                onClick={() => dismiss(!viaPointer.current)}
                {...intentProps}
              >
                {copy.confirm}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {status()}
        </p>
        {gone && (
          <button type="button" className={styles.reset} onClick={reset}>
            {copy.reset}
          </button>
        )}
      </div>
    </div>
  )
}
