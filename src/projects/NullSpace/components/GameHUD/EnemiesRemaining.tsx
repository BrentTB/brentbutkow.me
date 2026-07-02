import { GamePhase } from '../../engine/types'
import { useGameUIState } from '../../useGameUIState'
import { enemiesRemaining, shouldShowEnemiesRemaining } from './enemies-remaining'
import styles from './WaveNotice.module.scss'

// A small count that appears once a wave is nearly clear (and at least one enemy has
// fallen). Hidden on boss waves — the boss carries its own HP bar and doesn't fit a
// "3 enemies left" framing.
export function EnemiesRemaining() {
  const { phase, totalWaveEnemies, spawnedInWave, enemiesAlive, boss } = useGameUIState()
  const show =
    phase === GamePhase.playing &&
    boss === null &&
    shouldShowEnemiesRemaining(totalWaveEnemies, spawnedInWave, enemiesAlive)
  if (!show) return null

  const remaining = enemiesRemaining(totalWaveEnemies, spawnedInWave, enemiesAlive)

  return (
    <div className={`${styles.pill} ${styles.count}`} role="status" aria-live="polite">
      <span className={styles.value}>{remaining}</span> {remaining === 1 ? 'enemy' : 'enemies'} left
    </div>
  )
}
