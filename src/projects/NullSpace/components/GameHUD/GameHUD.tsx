import { GamePhase } from '../../engine/types'
import { useGameUIState } from '../../useGameUIState'
import styles from './GameHUD.module.scss'
import { SectorProgress } from './SectorProgress'
import { SpeedUpWarning } from './SpeedUpWarning'
import { TopBar } from './TopBar'
import { BossHpBar } from './BossHpBar'

type GameHUDProps = {
  onPause: () => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
  gameSpeed: number
}

// Overlay HUD pinned over the play area — sector progress, boss bar, and the top
// stat bar. The action controls (ability bar + Space Metal rail) live in their
// own component (GameControls) so they can sit outside the play area on mobile.
export function GameHUD({ onPause, onToggleFullscreen, isFullscreen, gameSpeed }: GameHUDProps) {
  const uiState = useGameUIState()
  if (uiState.phase === GamePhase.menu || uiState.phase === GamePhase.shipSelection) return null

  return (
    <div className={styles.hud}>
      <SectorProgress dimmed={uiState.boss !== null} />
      <SpeedUpWarning countdown={uiState.speedUpCountdown} />
      <BossHpBar boss={uiState.boss} />
      <TopBar
        isFullscreen={isFullscreen}
        gameSpeed={gameSpeed}
        onPause={onPause}
        onToggleFullscreen={onToggleFullscreen}
      />
    </div>
  )
}
