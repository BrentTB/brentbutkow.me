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
// only the card opts back in. The canvas spotlight (drawn in the renderer)
// directs attention; this just narrates and gates.
export function TutorialOverlay({ tutorial, onAck, onSkip }: TutorialOverlayProps) {
  const { copy, awaitingAck, ackLabel, isFinal, stepNumber, stepCount } = tutorial
  return (
    <div className={styles.root}>
      <div className={`${styles.card} ${awaitingAck ? styles.cardTappable : ''}`}>
        {/* On a narration beat the whole card advances: a big, forgiving tap
            target (kinder on touch than hunting for the button), still a
            deliberate press so an unread strip can't be skipped by a stray
            gesture. A full-card button sits behind the content; the text and
            dots are pointer-events:none so taps fall through to it, and Skip
            opts back in. The copy stays a plain readable <p> for screen
            readers — the button carries its own label. */}
        {awaitingAck && ackLabel && (
          <button type="button" className={styles.advance} onClick={onAck} aria-label={ackLabel} />
        )}
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
            <span className={`${sharedStyles.primaryBtn} ${styles.ackHint}`} aria-hidden="true">
              {ackLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
