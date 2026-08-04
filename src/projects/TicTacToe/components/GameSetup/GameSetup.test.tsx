import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GameSetup } from './GameSetup'
import {
  DIFFICULTY_BLURBS,
  DIFFICULTY_LABELS,
  MODE_LABELS,
  MOVE_COMMIT_LABELS,
  STARTER_LABELS,
  gameCopy,
} from '../../data'
import { Difficulty, GameMode, MoveCommit, Starter } from '../../tic-tac-toe.types'

afterEach(cleanup)

function renderSetup(overrides: Partial<Parameters<typeof GameSetup>[0]> = {}) {
  const props = {
    mode: GameMode.onePlayer,
    difficulty: Difficulty.medium,
    starter: Starter.you,
    started: false,
    commit: MoveCommit.instant,
    onCommitChange: vi.fn(),
    onModeChange: vi.fn(),
    onDifficultyChange: vi.fn(),
    onStarterChange: vi.fn(),
    ...overrides,
  }
  render(<GameSetup {...props} />)
  return props
}

const option = (name: string) => screen.getByRole('radio', { name })

describe('GameSetup', () => {
  it('offers the difficulty and first move only against the computer', () => {
    renderSetup({ mode: GameMode.twoPlayer })

    expect(screen.queryByRole('radio', { name: DIFFICULTY_LABELS[Difficulty.medium] })).toBeNull()
    expect(screen.queryByRole('radio', { name: STARTER_LABELS[Starter.you] })).toBeNull()
    expect(option(MODE_LABELS[GameMode.twoPlayer])).toBeTruthy()
  })

  it('offers the confirm-moves choice only online, and explains it once chosen', () => {
    renderSetup({ mode: GameMode.onePlayer })
    expect(screen.queryByRole('radio', { name: MOVE_COMMIT_LABELS[MoveCommit.confirm] })).toBeNull()

    cleanup()
    const props = renderSetup({ mode: GameMode.online, commit: MoveCommit.instant })
    expect(screen.queryByText(gameCopy.online.commitHint)).toBeNull()
    fireEvent.click(option(MOVE_COMMIT_LABELS[MoveCommit.confirm]))
    expect(props.onCommitChange).toHaveBeenCalledWith(MoveCommit.confirm)

    cleanup()
    renderSetup({ mode: GameMode.online, commit: MoveCommit.confirm })
    expect(screen.getByText(gameCopy.online.commitHint)).toBeTruthy()
  })

  it('shows what the chosen difficulty actually plays like', () => {
    renderSetup({ difficulty: Difficulty.godly })
    expect(screen.getByText(DIFFICULTY_BLURBS[Difficulty.godly])).toBeTruthy()
  })

  it('reports each choice as it is made', () => {
    const props = renderSetup()

    fireEvent.click(option(MODE_LABELS[GameMode.twoPlayer]))
    expect(props.onModeChange).toHaveBeenCalledWith(GameMode.twoPlayer)

    fireEvent.click(option(DIFFICULTY_LABELS[Difficulty.hard]))
    expect(props.onDifficultyChange).toHaveBeenCalledWith(Difficulty.hard)

    fireEvent.click(option(STARTER_LABELS[Starter.computer]))
    expect(props.onStarterChange).toHaveBeenCalledWith(Starter.computer)
  })

  /**
   * Switching who starts hands the seats over, so the pieces already on the board change owner. That is
   * the behaviour we want — it is how you swap colours mid-game — but only if the control says so.
   */
  it('says what switching the first move will do, once there is a game to disturb', () => {
    renderSetup({ started: false })
    expect(screen.queryByText(gameCopy.starterSwapNote)).toBeNull()

    cleanup()
    renderSetup({ started: true })
    expect(screen.getByText(gameCopy.starterSwapNote)).toBeTruthy()
  })

  it('leaves the note out in a two-player game, where there is nothing to swap with', () => {
    renderSetup({ mode: GameMode.twoPlayer, started: true })
    expect(screen.queryByText(gameCopy.starterSwapNote)).toBeNull()
  })

  /** Each group is a radio group: one tab stop, arrows to move, and a name a screen reader can read. */
  it('names each group and keeps one tab stop per group', () => {
    renderSetup({ difficulty: Difficulty.medium })

    for (const label of [gameCopy.opponentLabel, gameCopy.difficultyLabel, gameCopy.starterLabel]) {
      expect(screen.getByRole('radiogroup', { name: label })).toBeTruthy()
    }

    expect(option(DIFFICULTY_LABELS[Difficulty.medium]).tabIndex).toBe(0)
    expect(option(DIFFICULTY_LABELS[Difficulty.easy]).tabIndex).toBe(-1)
  })

  it('moves the difficulty with the arrow keys', () => {
    const props = renderSetup({ difficulty: Difficulty.medium })

    fireEvent.keyDown(option(DIFFICULTY_LABELS[Difficulty.medium]), { key: 'ArrowRight' })
    expect(props.onDifficultyChange).toHaveBeenCalledWith(Difficulty.hard)

    fireEvent.keyDown(option(DIFFICULTY_LABELS[Difficulty.medium]), { key: 'End' })
    expect(props.onDifficultyChange).toHaveBeenLastCalledWith(Difficulty.godly)
  })
})
