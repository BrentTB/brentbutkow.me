import { WAVES_PER_LEVEL } from '../../data'
import type { GameUIState } from '../../useNullSpace'
import styles from './LevelProgress.module.scss'

type LevelProgressProps = {
  uiState: GameUIState
  // When true (a boss is on-screen), the bar fades out so the boss HP bar can
  // cross-fade in over the same spot.
  dimmed: boolean
}

function getLevelProgress(uiState: GameUIState): number {
  if (uiState.wave <= 0) return 0
  const waveIndexInLevel = (uiState.wave - 1) % WAVES_PER_LEVEL
  const spawnFraction =
    uiState.totalWaveEnemies > 0 ? uiState.spawnedInWave / uiState.totalWaveEnemies : 0
  return (waveIndexInLevel + spawnFraction) / WAVES_PER_LEVEL
}

export function LevelProgress({ uiState, dimmed }: LevelProgressProps) {
  const progressRatio = getLevelProgress(uiState)
  const dots = Array.from({ length: WAVES_PER_LEVEL + 1 }, (_, i) => i)

  return (
    <div className={`${styles.levelProgress} ${dimmed ? styles.dimmed : ''}`}>
      <span className={styles.levelLabel}>Level {uiState.level}</span>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressRatio * 100}%` }} />
        {dots.map((i) => {
          const dotPosition = i / WAVES_PER_LEVEL
          const filled = progressRatio >= dotPosition
          return (
            <div
              key={i}
              className={`${styles.progressDot} ${filled ? styles.progressDotFilled : ''}`}
              style={{ left: `${dotPosition * 100}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}
