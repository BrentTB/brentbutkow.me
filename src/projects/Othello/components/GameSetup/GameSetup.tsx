import { useRovingRadio } from '../../../../components/utils/useRovingRadio'
import { BoardSize, Difficulty, GameMode, MoveCommit, Starter } from '../../othello.types'
import {
  BOARD_SIZES,
  BOARD_SIZE_BLURBS,
  BOARD_SIZE_LABELS,
  DIFFICULTY_BLURBS,
  DIFFICULTY_LABELS,
  MODE_LABELS,
  MOVE_COMMIT_LABELS,
  STARTER_LABELS,
  gameCopy,
} from '../../data'
import styles from './GameSetup.module.scss'

interface GameSetupProps {
  mode: GameMode
  difficulty: Difficulty
  starter: Starter
  boardSize: BoardSize
  /** True once discs beyond the opening four are down, when switching who starts also trades colours. */
  started: boolean
  /** Locks the choices that a room fixes — the opponent, and the board size baked into the room. */
  modeLocked?: boolean
  /** Says why a choice is locked. Shown as text, so touch and screen readers get it too. */
  modeLockedReason?: string
  /** Whether a tap online plays the move or only aims it. This player's preference, not the room's. */
  commit: MoveCommit
  onCommitChange: (commit: MoveCommit) => void
  onModeChange: (mode: GameMode) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onStarterChange: (starter: Starter) => void
  onBoardSizeChange: (size: BoardSize) => void
}

const MODES = Object.values(GameMode)
const DIFFICULTIES = Object.values(Difficulty)
const STARTERS = Object.values(Starter)
const COMMITS = Object.values(MoveCommit)

/** Who you play, how big the board is, and — on your own — how well it plays and who opens. */
export function GameSetup({
  mode,
  difficulty,
  starter,
  boardSize,
  started,
  modeLocked = false,
  modeLockedReason,
  commit,
  onCommitChange,
  onModeChange,
  onDifficultyChange,
  onStarterChange,
  onBoardSizeChange,
}: GameSetupProps) {
  const solo = mode === GameMode.onePlayer
  const online = mode === GameMode.online

  const modeKeys = useRovingRadio(
    MODES,
    mode,
    onModeChange,
    (option) => modeLocked && option !== mode
  )
  const difficultyKeys = useRovingRadio(DIFFICULTIES, difficulty, onDifficultyChange)
  const starterKeys = useRovingRadio(STARTERS, starter, onStarterChange)
  const commitKeys = useRovingRadio(COMMITS, commit, onCommitChange)
  const sizeKeys = useRovingRadio(
    BOARD_SIZES,
    boardSize,
    onBoardSizeChange,
    () => modeLocked // a room fixes its board size at creation
  )

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

      {modeLocked && modeLockedReason !== undefined && (
        <p className={styles.note}>{modeLockedReason}</p>
      )}

      <div className={styles.row}>
        <span className={styles.label} id="size-label">
          {gameCopy.boardSizeLabel}
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="size-label">
          {BOARD_SIZES.map((option, index) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={boardSize === option}
              disabled={modeLocked && boardSize !== option}
              title={modeLocked && boardSize !== option ? modeLockedReason : undefined}
              onClick={() => onBoardSizeChange(option)}
              {...sizeKeys(index)}
            >
              {BOARD_SIZE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.blurb}>{BOARD_SIZE_BLURBS[boardSize]}</p>

      {online && (
        <>
          <div className={styles.row}>
            <span className={styles.label} id="commit-label">
              {gameCopy.online.commitLabel}
            </span>
            <div className={styles.segmented} role="radiogroup" aria-labelledby="commit-label">
              {COMMITS.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={commit === option}
                  onClick={() => onCommitChange(option)}
                  {...commitKeys(index)}
                >
                  {MOVE_COMMIT_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {commit === MoveCommit.confirm && (
            <p className={styles.blurb}>{gameCopy.online.commitHint}</p>
          )}
        </>
      )}

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
