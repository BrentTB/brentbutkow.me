import { describe, expect, it } from 'vitest'
import { Seat } from '../../multiplayer/multiplayer.types'
import { CELL_COUNT } from './engine/lines'
import { Player } from './tic-tac-toe.types'
import { TIC_TAC_TOE_CELL_COUNT, cellCodec, playerForSeat } from './online'

describe('online adapter', () => {
  it('sends a move as its own cell index', () => {
    for (const cell of [0, 31, CELL_COUNT - 1]) {
      expect(cellCodec.toWire(cell)).toBe(cell)
      expect(cellCodec.fromWire(cell)).toBe(cell)
    }
  })

  it('bounds the board by the engine cell count', () => {
    expect(TIC_TAC_TOE_CELL_COUNT).toBe(CELL_COUNT)
  })

  it('makes whichever seat opens the player who moves first', () => {
    // Seat 0 opening: the creator is player one.
    expect(playerForSeat(Seat.first, Seat.first)).toBe(Player.one)
    expect(playerForSeat(Seat.second, Seat.first)).toBe(Player.two)
    // Seat 1 opening: the same two people swap slots, which is what a rematch does.
    expect(playerForSeat(Seat.second, Seat.second)).toBe(Player.one)
    expect(playerForSeat(Seat.first, Seat.second)).toBe(Player.two)
  })
})
