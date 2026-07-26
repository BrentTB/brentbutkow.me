import { simCopy } from '../../data'
import styles from './PausedOverlay.module.scss'

type PausedOverlayProps = {
  onStart(): void
}

/**
 * Sits over a world that arrived from a link already paused, until the visitor starts it.
 *
 * A still world with no explanation reads as a broken page, and the line under the controls saying it is
 * paused is the line nobody reads. A frozen picture with a play button over it is the one arrangement that
 * explains itself, so this borrows it wholesale from every video player.
 *
 * Only for worlds that arrive paused. An overlay every time somebody pressed pause to build something would
 * be in the way of the reason they paused.
 */
export function PausedOverlay({ onStart }: PausedOverlayProps) {
  return (
    <button type="button" className={styles.overlay} onClick={onStart}>
      <span className={styles.badge}>
        {/* A triangle's mass sits toward its base, so the centroid — not the bounding box — is what has to
            land on the middle of the circle. Spanning 8.7 to 18.7 puts it at exactly 12. */}
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false">
          <path d="M8.7 6 18.7 12 8.7 18Z" fill="currentColor" />
        </svg>
      </span>
      <span className={styles.label}>{simCopy.paused.title}</span>
      <span className={styles.hint}>{simCopy.paused.hint}</span>
    </button>
  )
}
