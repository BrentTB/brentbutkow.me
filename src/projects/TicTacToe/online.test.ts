import { describe, expect, it } from 'vitest'
import { Seat } from '../../multiplayer/multiplayer.types'
import { CELL_COUNT } from './engine/lines'
import { Player } from './tic-tac-toe.types'
import { TIC_TAC_TOE_CELL_COUNT, cellCodec, openingPlayer, playerForSeat } from './online'

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

  it('pins each seat to one player, whoever happens to open', () => {
    expect(playerForSeat(Seat.first)).toBe(Player.one)
    expect(playerForSeat(Seat.second)).toBe(Player.two)
  })

  it('names the opening player from the seat that goes first', () => {
    expect(openingPlayer(Seat.first)).toBe(Player.one)
    expect(openingPlayer(Seat.second)).toBe(Player.two)
  })
})
