import { formatBytes } from '../../data'
import { largestBandWithin } from '../../engine/capacity-bands'
import styles from './CapacityMeter.module.scss'

interface CapacityMeterProps {
  usedBytes: number
  maxBytes: number
  fits: boolean
}

export function CapacityMeter({ usedBytes, maxBytes, fits }: CapacityMeterProps) {
  const pct = maxBytes > 0 ? Math.min(100, (usedBytes / maxBytes) * 100) : 100
  const band = largestBandWithin(maxBytes)

  return (
    <div className={styles.meter}>
      <div className={styles.head}>
        <span className={styles.label}>Capacity</span>
        <span className={`${styles.count} ${fits ? '' : styles.over}`}>
          {formatBytes(usedBytes)} / {formatBytes(maxBytes)}
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`${styles.fill} ${fits ? '' : styles.over}`} style={{ width: `${pct}%` }} />
      </div>
      {band && <p className={styles.note}>Enough room for {band.label}.</p>}
    </div>
  )
}
