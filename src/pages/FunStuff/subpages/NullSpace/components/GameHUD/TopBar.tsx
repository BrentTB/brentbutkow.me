import { CURRENCY_NAME } from '../../data'
import { Icon, IconName } from '../Icon/Icon'
import { GamePhase } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import styles from './TopBar.module.scss'

type TopBarProps = {
  uiState: GameUIState
  isFullscreen: boolean
  gameSpeed: number
  onPause: () => void
  onToggleFullscreen: () => void
}

function getHpColor(ratio: number) {
  return ratio > 0.5 ? '#44bb44' : ratio > 0.25 ? '#ccaa22' : '#cc3333'
}

export function TopBar({
  uiState,
  isFullscreen,
  gameSpeed,
  onPause,
  onToggleFullscreen,
}: TopBarProps) {
  const hpRatio = Math.max(0, uiState.shipHp / uiState.shipMaxHp)
  const hpColor = getHpColor(hpRatio)
  const shieldRatio = Math.max(0, uiState.shipShield / uiState.shipMaxShield)
  const shieldOnCooldown = uiState.shieldCooldownRemaining > 0
  const powerRatio = Math.max(0, uiState.power / uiState.maxPower)

  return (
    <div className={styles.topBar}>
      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.label}>SHD</span>
          <div className={styles.barOuter}>
            <div
              className={`${styles.barInner} ${shieldOnCooldown ? styles.barShieldCooldown : ''}`}
              style={{
                width: `${shieldRatio * 100}%`,
                backgroundColor: shieldOnCooldown ? '#335566' : '#6ae8f5',
              }}
            />
          </div>
          <span className={styles.barText}>
            {Math.ceil(uiState.shipShield)}/{uiState.shipMaxShield}
          </span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.label}>HP</span>
          <div className={styles.barOuter}>
            <div
              className={styles.barInner}
              style={{ width: `${hpRatio * 100}%`, backgroundColor: hpColor }}
            />
          </div>
          <span className={styles.barText}>
            {Math.ceil(uiState.shipHp)}/{uiState.shipMaxHp}
          </span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.label}>PWR</span>
          <div className={styles.barOuter}>
            <div
              className={styles.barInner}
              style={{ width: `${powerRatio * 100}%`, backgroundColor: '#5588dd' }}
            />
          </div>
          <span className={styles.barText}>
            {Math.floor(uiState.power)}/{uiState.maxPower}
          </span>
        </div>
      </div>
      <div className={styles.info}>
        <span className={styles.score}>Score: {uiState.score}</span>
        <span className={styles.currency}>
          {CURRENCY_NAME}: {uiState.currency}
        </span>
        {gameSpeed !== 1 && <span className={styles.speedBadge}>{gameSpeed}×</span>}
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <Icon name={isFullscreen ? IconName.exitFullscreen : IconName.fullscreen} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onPause}
          disabled={uiState.phase !== GamePhase.playing}
          aria-label="Pause game"
        >
          <Icon name={IconName.pause} />
        </button>
      </div>
    </div>
  )
}
