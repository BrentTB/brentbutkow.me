import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Board } from './Board'
import { BoardSize, FlipSpeed, Player } from '../../othello.types'
import { createBoard, idx, legalMoves } from '../../engine/board'
import { gameCopy } from '../../data'

const name = (player: Player) => (player === Player.dark ? 'Dark' : 'Light')
const isDisabled = (element: HTMLElement) => element.hasAttribute('disabled')

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

  it('does not offer moves when not interactive', () => {
    const { onPlay } = renderBoard({ interactive: false })
    for (const cell of screen.getAllByRole('button')) expect(isDisabled(cell)).toBe(true)
    expect(onPlay).not.toHaveBeenCalled()
  })
})
