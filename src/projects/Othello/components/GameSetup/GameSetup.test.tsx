import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GameSetup } from './GameSetup'
import {
  BOARD_SIZE_BLURBS,
  BOARD_SIZE_LABELS,
  DIFFICULTY_LABELS,
  FLIP_SPEED_LABELS,
  MOVE_COMMIT_LABELS,
  STARTER_LABELS,
  gameCopy,
} from '../../data'
import {
  BoardSize,
  Difficulty,
  FlipSpeed,
  GameMode,
  MoveCommit,
  Starter,
} from '../../othello.types'

afterEach(cleanup)

function renderSetup(overrides: Partial<Parameters<typeof GameSetup>[0]> = {}) {
  const props = {
    mode: GameMode.onePlayer,
    difficulty: Difficulty.intermediate,
    starter: Starter.you,
    boardSize: BoardSize.standard,
    started: false,
    commit: MoveCommit.instant,
    flipSpeed: FlipSpeed.fast,
    onCommitChange: vi.fn(),
    onFlipSpeedChange: vi.fn(),
    onModeChange: vi.fn(),
    onDifficultyChange: vi.fn(),
    onStarterChange: vi.fn(),
    onBoardSizeChange: vi.fn(),
    ...overrides,
  }
  render(<GameSetup {...props} />)
  return props
}

const option = (name: string) => screen.getByRole('radio', { name })

describe('Othello GameSetup', () => {
  it('offers board size and flip speed in every mode, and reports each choice', () => {
    const props = renderSetup({ mode: GameMode.twoPlayer })

    fireEvent.click(option(BOARD_SIZE_LABELS[BoardSize.large]))
    expect(props.onBoardSizeChange).toHaveBeenCalledWith(BoardSize.large)

    fireEvent.click(option(FLIP_SPEED_LABELS[FlipSpeed.slow]))
    expect(props.onFlipSpeedChange).toHaveBeenCalledWith(FlipSpeed.slow)
  })

  it('describes the chosen board size', () => {
    renderSetup({ boardSize: BoardSize.small })
    expect(screen.getByText(BOARD_SIZE_BLURBS[BoardSize.small])).toBeTruthy()

    cleanup()
    renderSetup({ boardSize: BoardSize.large })
    expect(screen.getByText(BOARD_SIZE_BLURBS[BoardSize.large])).toBeTruthy()
  })

  it('shows difficulty and first move only against the computer', () => {
    renderSetup({ mode: GameMode.twoPlayer })
    expect(screen.queryByRole('radio', { name: DIFFICULTY_LABELS[Difficulty.hard] })).toBeNull()
    expect(screen.queryByRole('radio', { name: STARTER_LABELS[Starter.you] })).toBeNull()
  })

  it('shows the confirm-moves choice only online, explaining whichever is chosen', () => {
    renderSetup({ mode: GameMode.onePlayer })
    expect(screen.queryByRole('radio', { name: MOVE_COMMIT_LABELS[MoveCommit.confirm] })).toBeNull()

    cleanup()
    renderSetup({ mode: GameMode.online, commit: MoveCommit.instant })
    expect(screen.getByText(gameCopy.online.commitHintInstant)).toBeTruthy()

    cleanup()
    renderSetup({ mode: GameMode.online, commit: MoveCommit.confirm })
    expect(screen.getByText(gameCopy.online.commitHint)).toBeTruthy()
  })

  it('moves the board size with the arrow keys', () => {
    const props = renderSetup({ boardSize: BoardSize.standard })
    fireEvent.keyDown(option(BOARD_SIZE_LABELS[BoardSize.standard]), { key: 'ArrowRight' })
    expect(props.onBoardSizeChange).toHaveBeenCalledWith(BoardSize.large)
  })

  /**
   * Regression mirror of the opponent lock: a room fixes its board size, so the size buttons are
   * disabled — and the arrow keys must not change it either, or a guest would silently repaint onto a
   * size the room is not playing.
   */
  it('refuses the arrow keys on a locked board size', () => {
    const props = renderSetup({
      mode: GameMode.online,
      modeLocked: true,
      modeLockedReason: gameCopy.online.modeLocked,
    })
    const size = option(BOARD_SIZE_LABELS[BoardSize.standard])
    fireEvent.keyDown(size, { key: 'ArrowRight' })
    fireEvent.keyDown(size, { key: 'ArrowLeft' })
    fireEvent.keyDown(size, { key: 'Home' })
    fireEvent.keyDown(size, { key: 'End' })
    expect(props.onBoardSizeChange).not.toHaveBeenCalled()
  })

  it('shows the lock reason in text, not just a tooltip', () => {
    renderSetup({
      mode: GameMode.online,
      modeLocked: true,
      modeLockedReason: gameCopy.online.modeLocked,
    })
    expect(screen.getByText(gameCopy.online.modeLocked)).toBeTruthy()
  })
})
