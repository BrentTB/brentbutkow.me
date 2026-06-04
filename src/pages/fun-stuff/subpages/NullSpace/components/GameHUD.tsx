import { CURRENCY_NAME, WAVES_PER_LEVEL } from '../data'
import { ABILITY_META } from '../engine/abilities'
import { GamePhase } from '../engine/types'
import type { GameUIState } from '../useNullSpace'
import styles from './GameHUD.module.scss'

type GameHUDProps = {
  uiState: GameUIState
  onAbilitySelect: (kind: GameUIState['selectedAbility']) => void
  onPause: () => void
  onToggleFullscreen: () => void
  onUseSpaceMetalShield: () => void
  isFullscreen: boolean
  gameSpeed: number
}

function getLevelProgress(uiState: GameUIState): number {
  if (uiState.wave <= 0) return 0
  const waveIndexInLevel = (uiState.wave - 1) % WAVES_PER_LEVEL
  const spawnFraction =
    uiState.totalWaveEnemies > 0 ? uiState.spawnedInWave / uiState.totalWaveEnemies : 0
  return (waveIndexInLevel + spawnFraction) / WAVES_PER_LEVEL
}

export function GameHUD({
  uiState,
  onAbilitySelect,
  onPause,
  onToggleFullscreen,
  onUseSpaceMetalShield,
  isFullscreen,
  gameSpeed,
}: GameHUDProps) {
  if (uiState.phase === GamePhase.menu || uiState.phase === GamePhase.shipSelection) return null

  const hpRatio = Math.max(0, uiState.shipHp / uiState.shipMaxHp)
  const hpColor = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc3333'
  const shieldRatio = Math.max(0, uiState.shipShield / uiState.shipMaxShield)
  const shieldOnCooldown = uiState.shieldCooldownRemaining > 0
  const powerRatio = Math.max(0, uiState.power / uiState.maxPower)
  const canRechargeShield = uiState.spaceMetal >= 1 && uiState.shipShield < uiState.shipMaxShield
  const progressRatio = getLevelProgress(uiState)
  const dots = Array.from({ length: WAVES_PER_LEVEL + 1 }, (_, i) => i)

  return (
    <div className={styles.hud}>
      <div className={styles.levelProgress}>
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
          {uiState.spaceMetal > 0 && (
            <span className={styles.spaceMetal}>
              ⬡ {uiState.spaceMetal}
              <button
                type="button"
                className={`${styles.shieldRechargeBtn} ${canRechargeShield ? styles.shieldRechargeBtnActive : ''}`}
                onClick={onUseSpaceMetalShield}
                disabled={!canRechargeShield}
                aria-label="Recharge shield (costs 1 space metal, press F)"
              >
                ⟳ F
              </button>
            </span>
          )}
          {gameSpeed !== 1 && <span className={styles.speedBadge}>{gameSpeed}×</span>}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onPause}
            disabled={uiState.phase !== GamePhase.playing}
            aria-label="Pause game"
          >
            ⏸
          </button>
        </div>
      </div>
      <div className={styles.abilities}>
        {uiState.abilities.map((ability, index) => {
          const meta = ABILITY_META[ability.kind]
          const hotkey = String(index + 1)
          const isSelected = uiState.selectedAbility === ability.kind
          const isReady =
            ability.unlocked && ability.cooldownRemaining <= 0 && uiState.power >= ability.powerCost
          const onCooldown = ability.cooldownRemaining > 0
          const cdPercent = onCooldown ? ability.cooldownRemaining / ability.cooldown : 0

          const btnClass = [
            styles.abilityBtn,
            isSelected ? styles.abilitySelected : '',
            !ability.unlocked ? styles.abilityLocked : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={ability.kind}
              className={btnClass}
              onClick={() => onAbilitySelect(ability.kind)}
              disabled={!ability.unlocked}
              aria-label={
                ability.unlocked
                  ? `${meta.label} (${ability.powerCost} power)${onCooldown ? ` — ${Math.ceil(ability.cooldownRemaining)}s cooldown` : ''}`
                  : `${meta.label} — locked`
              }
            >
              <span className={styles.hotkeyBadge}>{hotkey}</span>
              <span className={styles.abilityIcon}>{ability.unlocked ? meta.icon : '🔒'}</span>
              <span className={styles.abilityLabel}>{meta.label}</span>
              {ability.unlocked && <span className={styles.abilityCost}>{ability.powerCost}</span>}
              {ability.unlocked && onCooldown && (
                <div className={styles.cooldownOverlay} style={{ height: `${cdPercent * 100}%` }} />
              )}
              {ability.unlocked && !isReady && !onCooldown && (
                <div className={styles.cooldownOverlay} style={{ height: '100%', opacity: 0.3 }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
