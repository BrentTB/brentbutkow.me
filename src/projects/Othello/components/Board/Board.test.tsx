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

  it('announces an aimed cell as pending', () => {
    const legal = idx(2, 3, BoardSize.standard)
    renderBoard({ pendingMove: legal })
    expect(screen.getByRole('button', { name: gameCopy.cellPendingLabel(3, 4) })).toBeTruthy()
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
