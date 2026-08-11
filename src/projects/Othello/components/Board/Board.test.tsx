import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Board } from './Board'
import { BoardSize, FlipSpeed, Player } from '../../othello.types'
import { createBoard, idx, legalMoves } from '../../engine/board'
import { gameCopy } from '../../data'

const name = (player: Player) => (player === Player.dark ? 'Dark' : 'Light')
const isDisabled = (element: HTMLElement) => element.hasAttribute('disabled')
const isAriaDisabled = (element: HTMLElement) => element.getAttribute('aria-disabled') === 'true'

afterEach(cleanup)

const renderBoard = (overrides = {}) => {
  const board = createBoard(BoardSize.standard)
  const onPlay = vi.fn()
  render(
    <Board
      board={board}
      legalCells={legalMoves(board, Player.dark)}
      currentPlayer={Player.dark}
      lastMove={null}
      flipped={[]}
      interactive
      flipSpeed={FlipSpeed.fast}
      onPlay={onPlay}
      playerName={name}
      {...overrides}
    />
  )
  return { board, onPlay }
}

describe('Board', () => {
  it('renders one cell per square', () => {
    renderBoard()
    expect(screen.getAllByRole('button')).toHaveLength(BoardSize.standard * BoardSize.standard)
  })

  it('plays a legal cell on click', () => {
    const { onPlay } = renderBoard()
    const legal = idx(2, 3, BoardSize.standard)
    fireEvent.click(screen.getByRole('button', { name: gameCopy.cellLegalLabel(3, 4, 'Dark') }))
    expect(onPlay).toHaveBeenCalledWith(legal)
  })

  it('leaves illegal and occupied cells disabled', () => {
    renderBoard()
    expect(isDisabled(screen.getByRole('button', { name: gameCopy.cellLabel(1, 1) }))).toBe(true)
    expect(
      isDisabled(screen.getByRole('button', { name: gameCopy.cellTakenLabel(4, 4, 'Light') }))
    ).toBe(true)
  })

  it('keeps legal cells focusable but inert while the turn is locked', () => {
    // The turn lock is transient, so a legal cell stays in the tab order (aria-disabled, not disabled)
    // — disabling the button the keyboard holds would blur it every turn — but clicking it does nothing.
    const { onPlay } = renderBoard({ interactive: false })
    const legalCell = screen.getByRole('button', { name: gameCopy.cellLegalLabel(3, 4, 'Dark') })
    expect(isDisabled(legalCell)).toBe(false)
    expect(isAriaDisabled(legalCell)).toBe(true)
    fireEvent.click(legalCell)
    expect(onPlay).not.toHaveBeenCalled()

    // A cell that is never a move target stays fully disabled.
    expect(isDisabled(screen.getByRole('button', { name: gameCopy.cellLabel(1, 1) }))).toBe(true)
  })

  /**
   * The rings are what you are looking at while you decide, so they carry the colour to move: the
   * board itself says whose turn it is, and against the computer, which colour you are.
   */
  it('names the colour to move on every legal-move ring', () => {
    const board = createBoard(BoardSize.standard)
    const legalCells = legalMoves(board, Player.light)
    render(
      <Board
        board={board}
        legalCells={legalCells}
        currentPlayer={Player.light}
        lastMove={null}
        flipped={[]}
        interactive
        flipSpeed={FlipSpeed.fast}
        onPlay={vi.fn()}
        playerName={name}
      />
    )

    const rings = document.querySelectorAll('[aria-hidden="true"][data-player]')
    expect(rings).toHaveLength(legalCells.length)
    rings.forEach((ring) => expect(ring.getAttribute('data-player')).toBe(Player.light))
  })

  it('announces an aimed cell as pending', () => {
    const legal = idx(2, 3, BoardSize.standard)
    renderBoard({ pendingMove: legal })
    expect(screen.getByRole('button', { name: gameCopy.cellPendingLabel(3, 4) })).toBeTruthy()
  })

  /**
   * Regression: every disc carried both of its faces at all times, two circles at one depth, and the
   * compositor did not always pick a winner — a thin line of the reverse colour struck through discs at
   * rest until a scroll forced a repaint. A face is only drawn when there is a turn to show it in.
   */
  it('gives a resting disc one face, and its reverse only while it turns', () => {
    const board = createBoard(BoardSize.standard)
    const turning = idx(3, 3, BoardSize.standard)
    const capturedFrom = idx(2, 3, BoardSize.standard)
    const props = {
      legalCells: [],
      currentPlayer: Player.dark,
      interactive: false,
      flipSpeed: FlipSpeed.fast,
      onPlay: vi.fn(),
      playerName: name,
    }
    const backs = () => document.querySelectorAll('[data-side="back"]')

    const { rerender } = render(<Board board={board} lastMove={null} flipped={[]} {...props} />)

    // The four opening discs are down and settled: four faces between them, no reverses.
    expect(document.querySelectorAll('[data-side]')).toHaveLength(4)
    expect(backs()).toHaveLength(0)

    const captured = {
      ...board,
      cells: board.cells.map((cell, index) => (index === turning ? Player.dark : cell)),
    }
    rerender(<Board board={captured} lastMove={capturedFrom} flipped={[turning]} {...props} />)

    expect(backs()).toHaveLength(1)
    expect(backs()[0].getAttribute('data-player')).toBe(Player.dark)
  })

  it('marks the last move and the winner on the board', () => {
    const board = createBoard(BoardSize.standard)
    const centre = idx(3, 3, BoardSize.standard)
    render(
      <Board
        board={board}
        legalCells={[]}
        currentPlayer={Player.light}
        lastMove={centre}
        flipped={[]}
        interactive={false}
        flipSpeed={FlipSpeed.fast}
        winner={Player.light}
        onPlay={vi.fn()}
        playerName={name}
      />
    )
    const cells = screen.getAllByRole('button')
    expect(cells[centre].getAttribute('data-last')).toBe('true')
    // The four opening discs are split two-two, so exactly the two light discs are flagged as won.
    expect(cells.filter((cell) => cell.getAttribute('data-won') === 'true')).toHaveLength(2)
  })
})
