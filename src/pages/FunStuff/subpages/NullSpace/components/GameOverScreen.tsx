import { WAVES_PER_LEVEL } from '../data'
import sharedStyles from './OverlayShared.module.scss'

type GameOverScreenProps = {
  score: number
  highScore: number
  isNewHighScore: boolean
  level: number
  wave: number
  onRestart: () => void
}

export function GameOverScreen({
  score,
  highScore,
  isNewHighScore,
  level,
  wave,
  onRestart,
}: GameOverScreenProps) {
  const waveInLevel = wave > 0 ? ((wave - 1) % WAVES_PER_LEVEL) + 1 : 0

  return (
    <>
      <h2 className={sharedStyles.title}>Game Over</h2>
      <p className={sharedStyles.stat}>
        Reached Sector {level}, Wave {waveInLevel}/{WAVES_PER_LEVEL}
      </p>
      <p className={sharedStyles.stat}>Score: {score}</p>
      {isNewHighScore && <p className={sharedStyles.highScoreNew}>New High Score!</p>}
      <p className={sharedStyles.highScore}>Best: {highScore}</p>
      <button className={sharedStyles.primaryBtn} onClick={onRestart}>
        Play Again
      </button>
    </>
  )
}
