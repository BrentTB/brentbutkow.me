import sharedStyles from '../OverlayShared.module.scss'
import styles from './TutorialOverlay.module.scss'
import type { TutorialUIState } from '../../useNullSpace'

type TutorialOverlayProps = {
  tutorial: TutorialUIState
  onAck: () => void
  onSkip: () => void
}

// Tutorial text card. Pinned over the play area but `pointer-events: none` on
// the root, so canvas clicks/flings (the taught actions) pass straight through —
// only the card's own buttons are interactive. The canvas spotlight (drawn in
// the renderer) directs attention; this just narrates and gates.
export function TutorialOverlay({ tutorial, onAck, onSkip }: TutorialOverlayProps) {
  const { copy, awaitingAck, ackLabel, isFinal, stepNumber, stepCount } = tutorial
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={stepCount}
          aria-valuenow={stepNumber}
          aria-label={`Tutorial step ${stepNumber} of ${stepCount}`}
        >
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i < stepNumber ? styles.dotDone : ''} ${
                i === stepNumber - 1 ? styles.dotCurrent : ''
              }`}
            />
          ))}
        </div>
        <p className={styles.copy}>{copy}</p>
        <div className={styles.footer}>
          {!isFinal && (
            <button type="button" className={styles.skip} onClick={onSkip}>
              Skip tutorial
            </button>
          )}
          {awaitingAck && ackLabel && (
            <button type="button" className={sharedStyles.primaryBtn} onClick={onAck}>
              {ackLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
