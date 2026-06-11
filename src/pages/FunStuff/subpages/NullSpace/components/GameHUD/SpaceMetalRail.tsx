import { SPACE_METAL_ABILITIES, SpaceMetalAbilityKind } from '../../engine/spaceMetalAbilities'
import type { GameUIState } from '../../useNullSpace'
import { Icon } from '../Icon/Icon'
import sharedStyles from './shared.module.scss'
import styles from './SpaceMetalRail.module.scss'

type SpaceMetalRailProps = {
  uiState: GameUIState
  onUseSpaceMetalAbility: (kind: SpaceMetalAbilityKind) => void
}

export function SpaceMetalRail({ uiState, onUseSpaceMetalAbility }: SpaceMetalRailProps) {
  return (
    <div className={styles.spaceMetalRail}>
      <span className={styles.spaceMetalCounter}>⬢ {uiState.spaceMetal}</span>
      <span className={styles.shardCounter}>◆ {uiState.singularityShard}</span>
      {SPACE_METAL_ABILITIES.map((ability) => {
        const canUse = ability.canUse(uiState)
        return (
          <button
            key={ability.kind}
            type="button"
            className={styles.spaceMetalBtn}
            onClick={() => onUseSpaceMetalAbility(ability.kind)}
            disabled={!canUse}
            aria-label={`${ability.meta.label} (${ability.cost} space metal, press ${ability.hotkey})`}
          >
            <span className={sharedStyles.hotkeyBadge}>{ability.hotkey}</span>
            <span className={sharedStyles.abilityIcon}>
              <Icon name={ability.meta.icon} />
            </span>
            <span className={sharedStyles.abilityLabel}>{ability.meta.label}</span>
            <span className={styles.spaceMetalCost}>⬢ {ability.cost}</span>
          </button>
        )
      })}
    </div>
  )
}
