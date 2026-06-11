import { useEffect, useState } from 'react'
import { AbilityKind, GamePhase, ShipKind, ShipWeaponKind, UpgradeId } from '../engine/types'
import type { GameUIState } from '../useNullSpace'
import styles from './GameOverlay.module.scss'
import { HelpScreen } from './PauseMenu/HelpScreen'
import { PauseMenu } from './PauseMenu/PauseMenu'
import { SettingsScreen } from './PauseMenu/SettingsScreen'
import { MenuScreen } from './StartScreen/MenuScreen'
import { ShipSelectionScreen } from './StartScreen/ShipSelectionScreen'
import { WaveCompleteScreen } from './WaveCompleteScreen'
import { UpgradeScreen } from './UpgradeScreen/UpgradeScreen'
import { GameOverScreen } from './GameOverScreen'

type GameOverlayProps = {
  uiState: GameUIState
  onStart: () => void
  onSelectShip: (kind: ShipKind) => void
  onNextWave: () => void
  onRestart: () => void
  onPurchaseUpgrade: (upgradeId: UpgradeId) => void
  onPurchaseUltimate: (baseKind: AbilityKind) => void
  onFinishUpgrades: () => void
  onResume: () => void
  onSetSpeed: (speed: number) => void
  onEquipShipWeapon: (slotIndex: number, weapon: ShipWeaponKind) => void
  gameSpeed: number
}

const SettingsSubPages = { settings: 'settings', help: 'help' }
type SettingsSubPages = (typeof SettingsSubPages)[keyof typeof SettingsSubPages]

export function GameOverlay({
  uiState,
  onStart,
  onSelectShip,
  onNextWave,
  onRestart,
  onPurchaseUpgrade,
  onPurchaseUltimate,
  onFinishUpgrades,
  onResume,
  onSetSpeed,
  onEquipShipWeapon,
  gameSpeed,
}: GameOverlayProps) {
  const [pauseSubPage, setPauseSubPage] = useState<SettingsSubPages | null>(null)

  // Sub-pages only exist while paused. Resuming via the P-key bypasses this
  // component's handlers, so reset here to land back on the pause menu next pause.
  useEffect(() => {
    if (uiState.phase !== GamePhase.paused) setPauseSubPage(null)
  }, [uiState.phase])

  if (uiState.phase === GamePhase.playing) return null

  // Settings sits on top of the pause screen — close it on resume/restart
  const handleResume = () => {
    setPauseSubPage(null)
    onResume()
  }
  const handleRestart = () => {
    setPauseSubPage(null)
    onRestart()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {uiState.phase === GamePhase.menu && <MenuScreen onStart={onStart} />}
        {uiState.phase === GamePhase.shipSelection && (
          <ShipSelectionScreen onSelect={onSelectShip} />
        )}
        {uiState.phase === GamePhase.paused &&
          (pauseSubPage === SettingsSubPages.settings ? (
            <SettingsScreen
              gameSpeed={gameSpeed}
              onSetSpeed={onSetSpeed}
              onClose={() => setPauseSubPage(null)}
            />
          ) : pauseSubPage === SettingsSubPages.help ? (
            <HelpScreen onClose={() => setPauseSubPage(null)} />
          ) : (
            <PauseMenu
              onResume={handleResume}
              onSettings={() => setPauseSubPage(SettingsSubPages.settings)}
              onHelp={() => setPauseSubPage(SettingsSubPages.help)}
              onRestart={handleRestart}
            />
          ))}
        {uiState.phase === GamePhase.waveComplete && (
          <WaveCompleteScreen
            wave={uiState.wave}
            level={uiState.level}
            score={uiState.score}
            onNextWave={onNextWave}
          />
        )}
        {uiState.phase === GamePhase.upgradeScreen && (
          <UpgradeScreen
            uiState={uiState}
            onPurchase={onPurchaseUpgrade}
            onPurchaseUltimate={onPurchaseUltimate}
            onContinue={onFinishUpgrades}
            onEquipShipWeapon={onEquipShipWeapon}
          />
        )}
        {uiState.phase === GamePhase.gameOver && (
          <GameOverScreen
            score={uiState.score}
            highScore={uiState.highScore}
            isNewHighScore={uiState.isNewHighScore}
            level={uiState.level}
            wave={uiState.wave}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  )
}
