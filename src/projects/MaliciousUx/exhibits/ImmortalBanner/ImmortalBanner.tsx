import { useFunMode } from '../../../../contexts/useFunMode'
import { hostilityFor } from '../../data'
import { useFocusWhen } from '../../useFocusWhen'
import { usePointerIntent } from '../../usePointerIntent'
import { useReturningPrompt } from '../../useReturningPrompt'
import styles from './ImmortalBanner.module.scss'
import { copy } from './data'

export function ImmortalBanner() {
  const { isFunMode } = useFunMode()
  const { bannerReviveMs } = hostilityFor(isFunMode)
  const { visible, gone, returns, secondsLeft, dismiss, reset } = useReturningPrompt(bannerReviveMs)
  const { viaPointer, intentProps } = usePointerIntent()
  // When the keyboard sends the banner away for good, carry focus to the reset control it leaves behind.
  const resetRef = useFocusWhen<HTMLButtonElement>(gone)

  // A mouse gets thirty seconds of quiet; the keyboard gets what the button promised.
  const onDismiss = () => dismiss(!viaPointer.current)

  const status = () => {
    if (gone) return copy.keyboardGone
    if (secondsLeft !== null) return copy.waiting(secondsLeft)
    if (returns > 0) return copy.returned(returns)
    return copy.quiet
  }

  return (
    <div className={styles.site}>
      <h4 className={styles.page}>{copy.page}</h4>
      <p className={styles.body}>{copy.body}</p>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {status()}
        </p>
        {gone && (
          <button type="button" ref={resetRef} className={styles.reset} onClick={reset}>
            {copy.reset}
          </button>
        )}
      </div>

      {visible && (
        <div className={styles.banner} role="region" aria-label={copy.title}>
          <div className={styles.text}>
            <p className={styles.title}>{copy.title}</p>
            <p className={styles.detail}>{copy.detail}</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.save} onClick={onDismiss} {...intentProps}>
              {copy.save}
            </button>
            <button type="button" className={styles.accept} onClick={onDismiss} {...intentProps}>
              {copy.accept}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
