import { BOSS_LEVEL_INTERVAL, WAVES_PER_LEVEL } from '../../data'
import { sectorProgress } from '../../engine/world/waves'
import { useGameUIState } from '../../useGameUIState'
import styles from './SectorProgress.module.scss'

type SectorProgressProps = {
  // When true (a boss is on-screen), the bar fades so the boss HP bar can cross-fade in.
  dimmed: boolean
}

export function SectorProgress({ dimmed }: SectorProgressProps) {
  const uiState = useGameUIState()
  const progress = sectorProgress({
    wave: uiState.wave,
    spawnedInWave: uiState.spawnedInWave,
    enemiesAlive: uiState.enemiesAlive,
    totalWaveEnemies: uiState.totalWaveEnemies,
  })
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
