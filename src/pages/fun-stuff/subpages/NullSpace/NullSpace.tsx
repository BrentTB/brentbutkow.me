import { useRef } from 'react'
import { BackButton } from '../../../../components/PageFormatting/BackButton'
import { useNullSpace } from './useNullSpace'
import { GameHUD } from './components/GameHUD'
import { GameOverlay } from './components/GameOverlay'
import styles from './NullSpace.module.scss'

function NullSpace() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    uiState,
    handleStart,
    handleNextWave,
    handleRestart,
    setSelectedAbility,
    handlePurchaseUpgrade,
    handleFinishUpgrades,
  } = useNullSpace(canvasRef)

  return (
    <div className={styles.wrapper}>
      <BackButton />
      <div className={styles.gameContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <GameHUD uiState={uiState} onAbilitySelect={setSelectedAbility} />
        <GameOverlay
          uiState={uiState}
          onStart={handleStart}
          onNextWave={handleNextWave}
          onRestart={handleRestart}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onFinishUpgrades={handleFinishUpgrades}
        />
      </div>
    </div>
  )
}

export default NullSpace
