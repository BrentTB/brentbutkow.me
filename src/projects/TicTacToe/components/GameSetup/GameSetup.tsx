import { Difficulty, GameMode, Starter } from '../../tic-tac-toe.types'
import {
  DIFFICULTY_BLURBS,
  DIFFICULTY_LABELS,
  MODE_LABELS,
  STARTER_LABELS,
  gameCopy,
} from '../../data'
import styles from './GameSetup.module.scss'

interface GameSetupProps {
  mode: GameMode
  difficulty: Difficulty
  starter: Starter
  onModeChange: (mode: GameMode) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onStarterChange: (starter: Starter) => void
}

const MODES: readonly GameMode[] = [GameMode.onePlayer, GameMode.twoPlayer]
const DIFFICULTIES: readonly Difficulty[] = [
  Difficulty.easy,
  Difficulty.medium,
  Difficulty.hard,
  Difficulty.godly,
]
const STARTERS: readonly Starter[] = [Starter.you, Starter.computer]

/** Who you are playing, how well it plays, and who moves first. The last two only apply on your own. */
export function GameSetup({
  mode,
  difficulty,
  starter,
  onModeChange,
  onDifficultyChange,
  onStarterChange,
}: GameSetupProps) {
  const solo = mode === GameMode.onePlayer

  return (
    <section className={styles.setup} aria-labelledby="game-heading">
      <h2 id="game-heading" className={styles.heading}>
        {gameCopy.gameTitle}
      </h2>

      <div className={styles.row}>
        <span className={styles.label}>{gameCopy.opponentLabel}</span>
        <div className={styles.segmented}>
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => onModeChange(option)}
            >
              {MODE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {solo && (
        <>
          <div className={styles.row}>
            <span className={styles.label} id="difficulty-label">
              {gameCopy.difficultyLabel}
            </span>
            <div className={styles.tiers} role="radiogroup" aria-labelledby="difficulty-label">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === option}
                  className={styles.tier}
                  onClick={() => onDifficultyChange(option)}
                >
                  {DIFFICULTY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <p className={styles.blurb}>{DIFFICULTY_BLURBS[difficulty]}</p>

          <div className={styles.row}>
            <span className={styles.label}>{gameCopy.starterLabel}</span>
            <div className={styles.segmented}>
              {STARTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={starter === option}
                  onClick={() => onStarterChange(option)}
                >
                  {STARTER_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
