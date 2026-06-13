import { GamePhase } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import styles from './GameHUD.module.scss'
import { SectorProgress } from './SectorProgress'
import { TopBar } from './TopBar'
import { BossHpBar } from './BossHpBar'
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
      <SectorProgress uiState={uiState} dimmed={uiState.boss !== null} />
      <BossHpBar boss={uiState.boss} />
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
