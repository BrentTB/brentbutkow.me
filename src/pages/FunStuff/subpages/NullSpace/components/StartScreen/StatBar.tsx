import styles from './StatBar.module.scss'

type StatBarProps = {
  label: string
  value: number
  max: number
  color: string
}

export function StatBar({ label, value, max, color }: StatBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statTrack}>
        <div className={styles.statFill} style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
