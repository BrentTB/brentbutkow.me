import { BOSS_LEVEL_INTERVAL, WAVES_PER_LEVEL } from '../../data'
import type { GameUIState } from '../../useNullSpace'
import styles from './SectorProgress.module.scss'

type SectorProgressProps = {
  uiState: GameUIState
  // When true (a boss is on-screen), the bar fades so the boss HP bar can cross-fade in.
  dimmed: boolean
}

// Kill-based progress through the current sector (0..1). Advances as enemies die,
// reaching the next dot when a wave is cleared — mirrors the in-world hold line.
function getSectorProgress(uiState: GameUIState): number {
  if (uiState.wave <= 0) return 0
  const waveInSector = (uiState.wave - 1) % WAVES_PER_LEVEL
  const cleared =
    uiState.totalWaveEnemies > 0
      ? Math.max(
          0,
          Math.min(1, (uiState.spawnedInWave - uiState.enemiesAlive) / uiState.totalWaveEnemies)
        )
      : 0
  return (waveInSector + cleared) / WAVES_PER_LEVEL
}

export function SectorProgress({ uiState, dimmed }: SectorProgressProps) {
  const progress = getSectorProgress(uiState)
  const dots = Array.from({ length: WAVES_PER_LEVEL + 1 }, (_, i) => i)
  const isBossSector = uiState.level > 0 && uiState.level % BOSS_LEVEL_INTERVAL === 0

  return (
    <div className={`${styles.sectorProgress} ${dimmed ? styles.dimmed : ''}`}>
      <span className={styles.sectorLabel}>Sector {uiState.level}</span>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
        {dots.map((i) => {
          const pos = i / WAVES_PER_LEVEL
          return (
            <div
              key={i}
              className={`${styles.dot} ${progress >= pos ? styles.dotFilled : ''}`}
              style={{ left: `${pos * 100}%` }}
            />
          )
        })}
        {/* Ship marker rides the fill toward the portal at the far end. */}
        <div className={styles.shipMarker} style={{ left: `${progress * 100}%` }} aria-hidden />
        {/* Portal end-cap — tinted red on boss sectors (the boss is the gate). */}
        <div className={`${styles.endCap} ${isBossSector ? styles.endCapBoss : ''}`} aria-hidden />
      </div>
    </div>
  )
}
