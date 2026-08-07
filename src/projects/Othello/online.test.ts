import { describe, expect, it } from 'vitest'
import { BoardSize, Player } from './othello.types'
import { Seat, SeatInfo } from '../../multiplayer/multiplayer.types'
import {
  acceptsOthelloRoom,
  boardSizeFor,
  cellCodec,
  colourForSeat,
  othelloCellCount,
  seatSwatchRgb,
} from './online'

const seat = (s: Seat): SeatInfo => ({ seat: s, name: '', colour: '', joined: true })

describe('othello online mapping', () => {
  it('round-trips every board size through its cell count', () => {
    // Imported so a new BoardSize can't be forgotten here: each must decode back to itself.
    for (const size of Object.values(BoardSize)) {
      expect(boardSizeFor(othelloCellCount(size))).toBe(size)
    }
  })

  it('rejects a cell count that is not a size Othello offers', () => {
    expect(boardSizeFor(49)).toBeNull() // 7×7 is a perfect square, but not an offered size
    expect(boardSizeFor(63)).toBeNull() // not a perfect square at all
    expect(acceptsOthelloRoom({ cellCount: 49 } as never)).toBe(false)
    expect(acceptsOthelloRoom({ cellCount: 64 } as never)).toBe(true)
  })

  it('maps the opening seat to dark and the other to light', () => {
    // The server's judge relies on this exact mapping (the opener is dark) — see the note in online.ts.
    expect(colourForSeat(Seat.first, Seat.first)).toBe(Player.dark)
    expect(colourForSeat(Seat.second, Seat.first)).toBe(Player.light)
    expect(colourForSeat(Seat.second, Seat.second)).toBe(Player.dark)
    expect(colourForSeat(Seat.first, Seat.second)).toBe(Player.light)
  })

  it('gives each seat the swatch of the disc it plays', () => {
    const first = seatSwatchRgb(seat(Seat.first), Seat.first)
    const second = seatSwatchRgb(seat(Seat.second), Seat.first)
    expect(first).not.toBe(second)
    // Same seat, opposite opener → the swatches swap with the colours.
    expect(seatSwatchRgb(seat(Seat.first), Seat.second)).toBe(second)
  })

  it('passes cell indices through the wire unchanged', () => {
    expect(cellCodec.toWire(27)).toBe(27)
    expect(cellCodec.fromWire(27)).toBe(27)
  })
})
