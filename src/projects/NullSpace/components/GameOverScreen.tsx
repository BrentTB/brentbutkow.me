import { useState } from 'react'
import { WAVES_PER_LEVEL } from '../data'
import { loadPlayerName } from '../engine/world/persistence'
import { MAX_NAME_LENGTH } from '../leaderboard/score-submission'
import sharedStyles from './OverlayShared.module.scss'

type GameOverScreenProps = {
  score: number
  highScore: number
  isNewHighScore: boolean
  kills: number
  level: number
  wave: number
  onSubmitScore: (name: string) => Promise<boolean>
  onShowLeaderboard: () => void
  onRestart: () => void
}

const SubmitStatus = {
  idle: 'idle',
  submitting: 'submitting',
  submitted: 'submitted',
  error: 'error',
} as const
type SubmitStatus = (typeof SubmitStatus)[keyof typeof SubmitStatus]

export function GameOverScreen({
  score,
  highScore,
  isNewHighScore,
  kills,
  level,
  wave,
  onSubmitScore,
  onShowLeaderboard,
  onRestart,
}: GameOverScreenProps) {
  const waveInLevel = wave > 0 ? ((wave - 1) % WAVES_PER_LEVEL) + 1 : 0
  const [name, setName] = useState(loadPlayerName)
  const [status, setStatus] = useState<SubmitStatus>(SubmitStatus.idle)

  const submit = async () => {
    if (status === SubmitStatus.submitting || status === SubmitStatus.submitted) return
    if (name.trim().length === 0) return
    setStatus(SubmitStatus.submitting)
    setStatus((await onSubmitScore(name)) ? SubmitStatus.submitted : SubmitStatus.error)
  }

  return (
    <>
      <h2 className={sharedStyles.title}>Game Over</h2>
      <p className={sharedStyles.stat}>
        Reached Sector {level}, Wave {waveInLevel}/{WAVES_PER_LEVEL}
      </p>
      <p className={sharedStyles.stat}>Score: {score}</p>
      <p className={sharedStyles.stat}>Enemies destroyed: {kills}</p>
      {isNewHighScore && <p className={sharedStyles.highScoreNew}>New High Score!</p>}
      <p className={sharedStyles.highScore}>Best: {highScore}</p>

      {status === SubmitStatus.submitted ? (
        <p className={sharedStyles.highScoreNew}>Score submitted!</p>
      ) : (
        <form
          className={sharedStyles.submitRow}
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <input
            className={sharedStyles.nameInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={MAX_NAME_LENGTH}
            aria-label="Name for the leaderboard"
          />
          <button
            type="submit"
            className={sharedStyles.secondaryBtn}
            disabled={status === SubmitStatus.submitting || name.trim().length === 0}
          >
            {status === SubmitStatus.submitting ? 'Submitting…' : 'Submit Score'}
          </button>
        </form>
      )}
      {status === SubmitStatus.error && (
        <p className={sharedStyles.errorText}>Couldn’t submit — try again.</p>
      )}

      <button className={sharedStyles.secondaryBtn} onClick={onShowLeaderboard}>
        View Leaderboard
      </button>
      <button className={sharedStyles.primaryBtn} onClick={onRestart}>
        Play Again
      </button>
    </>
  )
}
