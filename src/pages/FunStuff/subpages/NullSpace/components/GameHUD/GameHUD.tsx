import { GamePhase } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import styles from './GameHUD.module.scss'
import { LevelProgress } from './LevelProgress'
import { TopBar } from './TopBar'
import { SpaceMetalRail } from './SpaceMetalRail'
import { Abilities } from './Abilities'
import { SpaceMetalAbilityKind } from '../../engine/spaceMetalAbilities'

type GameHUDProps = {
  uiState: GameUIState
  onAbilitySelect: (kind: GameUIState['selectedAbility']) => void
  onPause: () => void
  onToggleFullscreen: () => void
  onUseSpaceMetalAbility: (kind: SpaceMetalAbilityKind) => void
  isFullscreen: boolean
  gameSpeed: number
}

export function GameHUD({
  uiState,
  onAbilitySelect,
  onPause,
  onToggleFullscreen,
  onUseSpaceMetalAbility,
  isFullscreen,
  gameSpeed,
}: GameHUDProps) {
  if (uiState.phase === GamePhase.menu || uiState.phase === GamePhase.shipSelection) return null

  return (
    <div className={styles.hud}>
      <LevelProgress uiState={uiState} />
      <TopBar
        uiState={uiState}
        isFullscreen={isFullscreen}
        gameSpeed={gameSpeed}
        onPause={onPause}
        onToggleFullscreen={onToggleFullscreen}
      />
      <div className={styles.actionGroup}>
        <SpaceMetalRail uiState={uiState} onUseSpaceMetalAbility={onUseSpaceMetalAbility} />
        <Abilities uiState={uiState} onAbilitySelect={onAbilitySelect} />
      </div>
    </div>
  )
}
