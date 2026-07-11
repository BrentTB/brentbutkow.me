import { formatNumber } from '../chart-format'
import styles from './StatusStrip.module.scss'

type StatusStripProps = {
  total: number
  topCategoryLabel?: string
  topCategoryPct?: number
  // The region with the most recalls in scope — a US state ("CA") or, for EU, a country
  // ("Germany"). Already resolved to its display string by the caller.
  topRegion?: string
  freshness?: { label: string; stale: boolean } | null
}

// A live-console status line: the running recall count plus the headline facts (leading-cause share,
// the region with the most recalls, sync freshness). Replaces the old four-card grid — same
// information, a fraction of the vertical weight, and it reads like instrumentation, not a dashboard.
export function StatusStrip({
  total,
  topCategoryLabel,
  topCategoryPct,
  topRegion,
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
      {topRegion && (
        <>
          <span className={styles.sep} aria-hidden="true">
            /
          </span>
          <span className={styles.item}>
            most in <b>{topRegion}</b>
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
