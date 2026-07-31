import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FunModeProvider } from '../../contexts/FunModeProvider'
import { TicTacToe } from './TicTacToe'
import { MODE_LABELS, STARTER_LABELS, gameCopy } from './data'
import { THINKING_TIME_MS } from './useComputerTurn'
import { GameMode, Starter } from './tic-tac-toe.types'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const renderGame = () =>
  render(
    <MemoryRouter>
      <FunModeProvider>
        <TicTacToe />
      </FunModeProvider>
    </MemoryRouter>
  )

const button = (name: string) => screen.getByRole('button', { name })

const cell = (x: number, y: number, layer: number) =>
  button(gameCopy.cellLabel(layer + 1, x + 1, y + 1))

/** Every cell holding a bead, whichever player owns it. */
const played = () => screen.getAllByRole('button', { name: /taken by/ })

/** Runs the computer's whole turn: the paint beat, the search, and the pause that follows it. */
const letTheComputerMove = () => act(() => vi.advanceTimersByTime(THINKING_TIME_MS + 50))

describe('TicTacToe — one player', () => {
  /**
   * Regression: the board must take nothing while the computer holds the turn. Left open, a tap inside
   * the think pause ran the move through as the computer — a bead in the computer's colour on the cell
   * you picked — and the change of board cancelled the reply it had already chosen, handing the turn
   * back to you. You played both sides and the opponent never moved.
   */
  it('ignores a click while the computer is thinking', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(button(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(cell(0, 0, 0), { detail: 1 })

    expect(screen.getByText(gameCopy.thinking(gameCopy.computerName))).toBeTruthy()

    const elsewhere = cell(2, 2, 2)
    expect(elsewhere.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(elsewhere, { detail: 1 })
    expect(played()).toHaveLength(1)

    letTheComputerMove()
    expect(played()).toHaveLength(2)
  })

  it('hands the board back once the computer has moved', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(button(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    letTheComputerMove()

    expect(cell(2, 2, 2).hasAttribute('aria-disabled')).toBe(false)
  })

  /**
   * Regression: with the computer opening, the only position behind the player is the empty board —
   * which is the computer's to move. Resting there started its turn again, and the reply it landed
   * dropped the rest of the history, so Undo destroyed the game instead of stepping back through it.
   */
  it('offers no undo when the only move so far is the computer opening', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(button(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(button(STARTER_LABELS[Starter.computer]))
    letTheComputerMove()

    expect(played()).toHaveLength(1)
    expect(button(gameCopy.undo).hasAttribute('disabled')).toBe(true)
  })

  it('steps back over the pair once both sides have moved', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(button(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    letTheComputerMove()
    expect(played()).toHaveLength(2)

    fireEvent.click(button(gameCopy.undo))
    expect(screen.queryAllByRole('button', { name: /taken by/ })).toHaveLength(0)
  })
})

describe('TicTacToe — two players', () => {
  it('lets both seats play in turn with no lock between them', () => {
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    expect(played()).toHaveLength(1)

    fireEvent.click(cell(1, 0, 0), { detail: 1 })
    expect(played()).toHaveLength(2)
  })
})
