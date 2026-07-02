import { GamePhase } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import { useGameUIState } from '../../useGameUIState'
import { SpaceMetalAbilityKind } from '../../engine/spaceMetalAbilities'
import { SpaceMetalRail } from './SpaceMetalRail'
import { Abilities } from './Abilities'
import styles from './GameControls.module.scss'

type GameControlsProps = {
  onAbilitySelect: (kind: GameUIState['selectedAbility']) => void
  onUseSpaceMetalAbility: (kind: SpaceMetalAbilityKind) => void
}

// The player's action controls (Space Metal rail + ability bar). On desktop this
// is a transparent overlay pinned over the play area; on mobile / short-landscape
// it flows in a control bar OUTSIDE the canvas (see NullSpace.module.scss) so the
// buttons never sit on top of the draggable/tappable play area.
export function GameControls({ onAbilitySelect, onUseSpaceMetalAbility }: GameControlsProps) {
  const uiState = useGameUIState()
  if (uiState.phase === GamePhase.menu || uiState.phase === GamePhase.shipSelection) return null

  return (
    <div className={styles.actionGroup}>
      <SpaceMetalRail onUseSpaceMetalAbility={onUseSpaceMetalAbility} />
      <Abilities onAbilitySelect={onAbilitySelect} />
    </div>
  )
}
