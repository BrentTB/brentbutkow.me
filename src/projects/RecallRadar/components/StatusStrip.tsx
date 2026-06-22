import { formatNumber } from '../chart-format'
import styles from './StatusStrip.module.scss'

type StatusStripProps = {
  total: number
  topCategoryLabel?: string
  topCategoryPct?: number
  topState?: string
  freshness?: { label: string; stale: boolean } | null
}

// A live-console status line: the running recall count plus the headline facts (leading-cause share,
// hottest state, sync freshness). Replaces the old four-card grid — same information, a fraction of
// the vertical weight, and it reads like instrumentation rather than a dashboard of tiles.
export function StatusStrip({
  total,
  topCategoryLabel,
  topCategoryPct,
  topState,
  freshness,
}: StatusStripProps) {
  return (
    <div className={styles.strip}>
      <span className={styles.live}>
        <span className={styles.blip} aria-hidden="true" />
        LIVE
      </span>
      <span className={styles.item}>
        <span className={styles.count}>{formatNumber(total)}</span> recalls tracked
      </span>
      {topCategoryLabel && topCategoryPct !== undefined && (
        <>
          <span className={styles.sep} aria-hidden="true">
            /
          </span>
          <span className={styles.item}>
            {topCategoryLabel}-led <b>{topCategoryPct}%</b>
          </span>
        </>
      )}
      {topState && (
        <>
          <span className={styles.sep} aria-hidden="true">
            /
          </span>
          <span className={styles.item}>
            hottest <b>{topState}</b>
          </span>
        </>
      )}
      {freshness && (
        <>
          <span className={styles.sep} aria-hidden="true">
            /
          </span>
          <span className={`${styles.item} ${freshness.stale ? styles.stale : ''}`}>
            {freshness.label}
          </span>
        </>
      )}
    </div>
  )
}
