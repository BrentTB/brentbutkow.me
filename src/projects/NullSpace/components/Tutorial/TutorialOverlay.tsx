import sharedStyles from '../OverlayShared.module.scss'
import styles from './TutorialOverlay.module.scss'

type TutorialOverlayProps = {
  copy: string
  // True when the only way forward is the Next / Finish button.
  awaitingAck: boolean
  ackLabel: string | null
  // The last beat: hide Skip (Finish already ends the tutorial — same action).
  isFinal: boolean
  onAck: () => void
  onSkip: () => void
}

// Tutorial text card. Pinned over the play area but `pointer-events: none` on
// the root, so canvas clicks/flings (the taught actions) pass straight through —
// only the card's own buttons are interactive. The canvas spotlight (drawn in
// the renderer) directs attention; this just narrates and gates.
export function TutorialOverlay({
  copy,
  awaitingAck,
  ackLabel,
  isFinal,
  onAck,
  onSkip,
}: TutorialOverlayProps) {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
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
