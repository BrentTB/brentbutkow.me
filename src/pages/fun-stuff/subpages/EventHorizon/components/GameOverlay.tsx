import { GAME_NAME } from '../data'
import type { GameUIState } from '../useEventHorizon'
import styles from './GameOverlay.module.scss'

type GameOverlayProps = {
  uiState: GameUIState
  onStart: () => void
  onNextWave: () => void
  onRestart: () => void
}

export function GameOverlay({ uiState, onStart, onNextWave, onRestart }: GameOverlayProps) {
  if (uiState.phase === 'playing') return null

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {uiState.phase === 'menu' && <MenuScreen onStart={onStart} />}
        {uiState.phase === 'waveComplete' && (
          <WaveCompleteScreen wave={uiState.wave} score={uiState.score} onNextWave={onNextWave} />
        )}
        {uiState.phase === 'gameOver' && (
          <GameOverScreen
            score={uiState.score}
            highScore={uiState.highScore}
            wave={uiState.wave}
            onRestart={onRestart}
          />
        )}
      </div>
    </div>
  )
}

function MenuScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <h2 className={styles.title}>{GAME_NAME}</h2>
      <p className={styles.subtitle}>Control space itself to protect your ship</p>
      <p className={styles.hint}>Click anywhere during gameplay to launch meteor strikes</p>
      <button className={styles.primaryBtn} onClick={onStart}>
        Start Game
      </button>
    </>
  )
}

function WaveCompleteScreen({
  wave,
  score,
  onNextWave,
}: {
  wave: number
  score: number
  onNextWave: () => void
}) {
  return (
    <>
      <h2 className={styles.title}>Wave {wave} Complete</h2>
      <p className={styles.stat}>Score: {score}</p>
      <button className={styles.primaryBtn} onClick={onNextWave}>
        Next Wave
      </button>
    </>
  )
}

function GameOverScreen({
  score,
  highScore,
  wave,
  onRestart,
}: {
  score: number
  highScore: number
  wave: number
  onRestart: () => void
}) {
  const isNewHighScore = score >= highScore && score > 0

  return (
    <>
      <h2 className={styles.title}>Game Over</h2>
      <p className={styles.stat}>
        Survived {wave} wave{wave !== 1 ? 's' : ''}
      </p>
      <p className={styles.stat}>Score: {score}</p>
      {isNewHighScore && <p className={styles.highScoreNew}>New High Score!</p>}
      <p className={styles.highScore}>Best: {highScore}</p>
      <button className={styles.primaryBtn} onClick={onRestart}>
        Play Again
      </button>
    </>
  )
}
