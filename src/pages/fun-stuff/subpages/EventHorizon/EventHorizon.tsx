import { useRef } from 'react'
import { useEventHorizon } from './useEventHorizon'
import { GameHUD } from './components/GameHUD'
import { GameOverlay } from './components/GameOverlay'
import styles from './EventHorizon.module.scss'

function EventHorizon() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { uiState, handleStart, handleNextWave, handleRestart, setSelectedAbility } =
    useEventHorizon(canvasRef)

  return (
    <div className={styles.wrapper}>
      <div className={styles.gameContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <GameHUD uiState={uiState} onAbilitySelect={setSelectedAbility} />
        <GameOverlay
          uiState={uiState}
          onStart={handleStart}
          onNextWave={handleNextWave}
          onRestart={handleRestart}
        />
      </div>
    </div>
  )
}

export default EventHorizon
