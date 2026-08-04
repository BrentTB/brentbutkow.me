import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Board } from './Board'
import { DEFAULT_PLAYERS, gameCopy } from '../../data'
import { createBoard } from '../../engine/board'
import { BOARD_SIZE, cellIndex } from '../../engine/lines'
import { VIEW_LAYOUTS } from '../../engine/geometry'
import { Player, ViewMode } from '../../tic-tac-toe.types'

afterEach(cleanup)

const layout = VIEW_LAYOUTS[ViewMode.orbit]

function renderBoard(overrides: Partial<Parameters<typeof Board>[0]> = {}) {
  const onPlay = vi.fn()
  const props = {
    board: createBoard(),
    win: null,
    locked: false,
    focusedLayer: null,
    lastMove: null,
    players: DEFAULT_PLAYERS,
    mode: ViewMode.orbit,
    camera: { yaw: layout.yaw, pitch: layout.pitch, zoom: 1 },
    spacing: 40,
    shift: 0,
    turnRgb: DEFAULT_PLAYERS[Player.one].rgb,
    isDragging: false,
    stageRef: createRef<HTMLDivElement>(),
    onPlay,
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerEnd: vi.fn(),
    ...overrides,
  }
  render(<Board {...props} />)
  return { onPlay }
}

/** The button for a cell, found by the label a screen reader would read out. */
const cell = (x: number, y: number, layer: number) =>
  screen.getByRole('button', { name: gameCopy.cellLabel(layer + 1, x + 1, y + 1) })

const isDisabled = (element: HTMLElement) => element.hasAttribute('disabled')

describe('Board', () => {
  it('offers every cell of every layer', () => {
    renderBoard()
    expect(screen.getAllByRole('button')).toHaveLength(BOARD_SIZE ** 3)
  })

  it('marks an aimed move as waiting to be confirmed, and leaves it playable', () => {
    const aimed = cellIndex(1, 2, 0)
    renderBoard({ pendingCell: aimed })

    const button = screen.getByRole('button', { name: gameCopy.cellPendingLabel(1, 2, 3) })
    // Still open: pressing it again is how the move is sent, so it must not be disabled.
    expect(isDisabled(button)).toBe(false)
    expect(button.dataset.pending).toBe('true')
    // Every other cell is an ordinary empty site.
    expect(screen.queryAllByRole('button', { name: /waiting to be confirmed/ })).toHaveLength(1)
  })

  it('plays the cell that was clicked', () => {
    const { onPlay } = renderBoard()

    fireEvent.click(cell(2, 1, 3), { detail: 1 })

    expect(onPlay).toHaveBeenCalledWith(cellIndex(2, 1, 3), false)
  })

  /** A keyboard activation reports no click count, and must not be mistaken for the end of a drag. */
  it('marks an activation with no pointer behind it as coming from the keyboard', () => {
    const { onPlay } = renderBoard()

    fireEvent.click(cell(0, 0, 0), { detail: 0 })

    expect(onPlay).toHaveBeenCalledWith(cellIndex(0, 0, 0), true)
  })

  it('disables a cell that is already taken', () => {
    const board = createBoard().slice()
    board[cellIndex(1, 1, 1)] = Player.two
    renderBoard({ board })

    const taken = screen.getByRole('button', {
      name: gameCopy.cellTakenLabel(2, 2, 2, DEFAULT_PLAYERS[Player.two].name),
    })
    expect(isDisabled(taken)).toBe(true)
  })

  it('disables the whole board once the game is won', () => {
    renderBoard({
      win: { player: Player.one, cells: [0, 1, 2, 3] },
    })

    expect(screen.getAllByRole('button').every(isDisabled)).toBe(true)
  })

  /**
   * Regression: a cell on a hidden layer used to be click-through but still focusable, so tabbing to it
   * and pressing Enter dropped a bead into a layer nobody could see.
   */
  it('disables the layers that are hidden while one is singled out', () => {
    const { onPlay } = renderBoard({ focusedLayer: 2 })

    const hidden = cell(0, 0, 0)
    expect(isDisabled(hidden)).toBe(true)

    fireEvent.click(hidden, { detail: 0 })
    expect(onPlay).not.toHaveBeenCalled()

    expect(isDisabled(cell(0, 0, 2))).toBe(false)
  })

  /**
   * Regression: while the computer holds the turn the board must take nothing. Left open, a tap during
   * its think pause played the computer's move for it, in the computer's colour.
   */
  it('takes no input while locked', () => {
    const { onPlay } = renderBoard({ locked: true })

    const target = cell(3, 3, 3)

    fireEvent.click(target, { detail: 1 })
    expect(onPlay).not.toHaveBeenCalled()
  })

  /**
   * The lock says `aria-disabled` rather than `disabled`, so the cell a keyboard player just activated
   * keeps focus instead of being blurred and dropping them back to the top of the page every turn.
   */
  it('marks a locked cell as disabled without taking its focus away', () => {
    renderBoard({ locked: true })

    const target = cell(3, 3, 3)
    expect(target.getAttribute('aria-disabled')).toBe('true')
    expect(isDisabled(target)).toBe(false)

    target.focus()
    expect(document.activeElement).toBe(target)
  })
})
