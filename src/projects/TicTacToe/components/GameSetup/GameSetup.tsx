import { useRovingRadio } from '../../../../components/utils/useRovingRadio'
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
  /** True once the game is under way, when changing who starts also swaps the pieces already played. */
  started: boolean
  /** Locks the opponent choice, for when switching away would walk out of a room mid-game. */
  modeLocked?: boolean
  /** Says why the choice is locked, so a disabled control is not a dead end. */
  modeLockedReason?: string
  onModeChange: (mode: GameMode) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onStarterChange: (starter: Starter) => void
}

const MODES = Object.values(GameMode)
const DIFFICULTIES = Object.values(Difficulty)
const STARTERS = Object.values(Starter)

/** Who you are playing, how well it plays, and who moves first. The last two only apply on your own. */
export function GameSetup({
  mode,
  difficulty,
  starter,
  started,
  modeLocked = false,
  modeLockedReason,
  onModeChange,
  onDifficultyChange,
  onStarterChange,
}: GameSetupProps) {
  const solo = mode === GameMode.onePlayer

  const modeKeys = useRovingRadio(MODES, mode, onModeChange)
  const difficultyKeys = useRovingRadio(DIFFICULTIES, difficulty, onDifficultyChange)
  const starterKeys = useRovingRadio(STARTERS, starter, onStarterChange)

  return (
    <section className={styles.setup} aria-labelledby="game-heading">
      <h2 id="game-heading" className={styles.heading}>
        {gameCopy.gameTitle}
      </h2>

      <div className={styles.row}>
        <span className={styles.label} id="opponent-label">
          {gameCopy.opponentLabel}
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="opponent-label">
          {MODES.map((option, index) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={mode === option}
              disabled={modeLocked && mode !== option}
              title={modeLocked && mode !== option ? modeLockedReason : undefined}
              onClick={() => onModeChange(option)}
              {...modeKeys(index)}
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
              {DIFFICULTIES.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === option}
                  className={styles.tier}
                  onClick={() => onDifficultyChange(option)}
                  {...difficultyKeys(index)}
                >
                  {DIFFICULTY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <p className={styles.blurb}>{DIFFICULTY_BLURBS[difficulty]}</p>

          <div className={styles.row}>
            <span className={styles.label} id="starter-label">
              {gameCopy.starterLabel}
            </span>
            <div className={styles.segmented} role="radiogroup" aria-labelledby="starter-label">
              {STARTERS.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={starter === option}
                  onClick={() => onStarterChange(option)}
                  {...starterKeys(index)}
                >
                  {STARTER_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {started && <p className={styles.note}>{gameCopy.starterSwapNote}</p>}
        </>
      )}
    </section>
  )
}
