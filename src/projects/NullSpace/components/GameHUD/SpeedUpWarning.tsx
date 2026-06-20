import styles from './SpeedUpWarning.module.scss'

type SpeedUpWarningProps = {
  // Seconds until the wave's enemies start speeding up, or null when the warning
  // window isn't open. Driven by secondsUntilSpeedUp in the loop's UI sync.
  countdown: number | null
}

// Telegraphs the wave speed-up: a countdown over the final seconds before enemies
// ramp up, so the lurch reads as a warned event instead of a random spike. Purely
// cosmetic — waveSpeedEscalation drives the actual speed change.
export function SpeedUpWarning({ countdown }: SpeedUpWarningProps) {
  if (countdown === null) return null
  return (
    <div className={styles.warning} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden>
        ⚠
      </span>
      Enemies speed up in {Math.ceil(countdown)}s
    </div>
  )
}
