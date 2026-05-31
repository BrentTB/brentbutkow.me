import type { GameUIState } from '../useEventHorizon'
import type { AbilityKind } from '../engine/types'
import styles from './GameHUD.module.scss'

type GameHUDProps = {
  uiState: GameUIState
  onAbilitySelect: (kind: AbilityKind) => void
}

export function GameHUD({ uiState, onAbilitySelect }: GameHUDProps) {
  if (uiState.phase === 'menu') return null

  const hpRatio = Math.max(0, uiState.shipHp / uiState.shipMaxHp)
  const hpColor = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc3333'
  const powerRatio = Math.max(0, uiState.power / uiState.maxPower)

  return (
    <div className={styles.hud}>
      <div className={styles.topBar}>
        <div className={styles.bars}>
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
          <span className={styles.wave}>Wave {uiState.wave}</span>
          <span className={styles.score}>Score: {uiState.score}</span>
        </div>
      </div>
      <div className={styles.abilities}>
        {uiState.abilities.map((ability) => {
          const isReady = ability.cooldownRemaining <= 0 && uiState.power >= ability.powerCost
          const onCooldown = ability.cooldownRemaining > 0
          const cdPercent = onCooldown ? ability.cooldownRemaining / ability.cooldown : 0
          return (
            <button
              key={ability.kind}
              className={styles.abilityBtn}
              onClick={() => onAbilitySelect(ability.kind)}
              disabled={!isReady}
              aria-label={`${ability.kind} ability (${ability.powerCost} power)${onCooldown ? ` — ${Math.ceil(ability.cooldownRemaining)}s cooldown` : ''}`}
            >
              <span className={styles.abilityIcon}>☄</span>
              <span className={styles.abilityLabel}>Meteor</span>
              <span className={styles.abilityCost}>{ability.powerCost}</span>
              {onCooldown && (
                <div className={styles.cooldownOverlay} style={{ height: `${cdPercent * 100}%` }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
