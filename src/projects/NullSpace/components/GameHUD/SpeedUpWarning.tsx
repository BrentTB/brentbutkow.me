import { useEffect, useRef, useState } from 'react'
import { useGameUIState } from '../../useGameUIState'
import styles from './SpeedUpWarning.module.scss'

// How long the "sped up" sign lingers after the countdown fires, in ms.
const SPED_UP_FLASH_MS = 2500

// Telegraphs the wave speed-up: a countdown over the final seconds before enemies
// ramp up, and then — the instant the countdown lapses — a brief "sped up" sign so
// the lurch reads as a warned, confirmed event instead of the timer just vanishing.
// Purely cosmetic — waveSpeedEscalation drives the actual speed change. `countdown`
// is the seconds until enemies speed up, or null when the warning window is shut.
export function SpeedUpWarning() {
  const { speedUpCountdown: countdown } = useGameUIState()
  const prevCountdown = useRef<number | null>(countdown)
  const [spedUp, setSpedUp] = useState(false)

  useEffect(() => {
    // Countdown lapsed (a number → null) → the enemies just sped up. Flash the
    // sign, then clear it. Other transitions (window opening, idle) don't fire it.
    const justSpedUp = prevCountdown.current !== null && countdown === null
    prevCountdown.current = countdown
    if (!justSpedUp) return
    setSpedUp(true)
    const timer = setTimeout(() => setSpedUp(false), SPED_UP_FLASH_MS)
    return () => clearTimeout(timer)
  }, [countdown])

  if (countdown !== null) {
    return (
      <div className={styles.warning} role="status" aria-live="polite">
        <span aria-hidden>
          <span className={styles.icon}>⚠</span> Enemies speed up in {Math.ceil(countdown)}s
        </span>
        <span className={styles.srOnly}>Enemies speeding up soon</span>
      </div>
    )
  }

  if (spedUp) {
    return (
      <div className={`${styles.warning} ${styles.spedUp}`} role="status" aria-live="assertive">
        <span aria-hidden>
          <span className={styles.icon}>⚠</span> Enemies sped up!
        </span>
        <span className={styles.srOnly}>Enemies have sped up</span>
      </div>
    )
  }

  return null
}
