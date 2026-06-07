import { ABILITY_META } from '../../engine/abilities'
import { getUnlockedAbilitiesInOrder } from '../../useNullSpace'
import type { GameUIState } from '../../useNullSpace'
import { Icon } from '../Icon/Icon'
import sharedStyles from './shared.module.scss'
import styles from './Abilities.module.scss'

type AbilitiesProps = {
  uiState: GameUIState
  onAbilitySelect: (kind: GameUIState['selectedAbility']) => void
}

export function Abilities({ uiState, onAbilitySelect }: AbilitiesProps) {
  return (
    <div className={styles.abilities}>
      {getUnlockedAbilitiesInOrder(uiState.abilities).map((ability, index) => {
        const meta = ABILITY_META[ability.kind]
        const hotkey = String(index + 1)
        const isSelected = uiState.selectedAbility === ability.kind
        const isReady = ability.cooldownRemaining <= 0 && uiState.power >= ability.powerCost
        const onCooldown = ability.cooldownRemaining > 0
        const cdPercent = onCooldown ? ability.cooldownRemaining / ability.cooldown : 0

        const btnClass = [styles.abilityBtn, isSelected ? styles.abilitySelected : '']
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={ability.kind}
            className={btnClass}
            onClick={() => onAbilitySelect(ability.kind)}
            aria-label={`${meta.label} (${ability.powerCost} power)${
              onCooldown ? ` — ${Math.ceil(ability.cooldownRemaining)}s cooldown` : ''
            }`}
          >
            <span className={sharedStyles.hotkeyBadge}>{hotkey}</span>
            <span className={sharedStyles.abilityIcon}>
              <Icon name={meta.icon} />
            </span>
            <span className={sharedStyles.abilityLabel}>{meta.label}</span>
            <span className={styles.abilityCost}>{ability.powerCost}</span>
            {onCooldown && (
              <div className={styles.cooldownOverlay} style={{ height: `${cdPercent * 100}%` }} />
            )}
            {!isReady && !onCooldown && (
              <div className={styles.cooldownOverlay} style={{ height: '100%', opacity: 0.3 }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
