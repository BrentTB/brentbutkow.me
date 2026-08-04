import { MoveCodec, Seat } from '../../multiplayer/multiplayer.types'
import { CELL_COUNT } from './engine/lines'
import { Player } from './tic-tac-toe.types'

// This game's slot in the generic multiplayer layer: an id, its board size, and a move codec. A move
// is just its cell index (0–63), so the codec is the identity — the wire integer is the move.

export const TIC_TAC_TOE_GAME_ID = 'tic-tac-toe'
export const TIC_TAC_TOE_CELL_COUNT = CELL_COUNT

export const cellCodec: MoveCodec<number> = {
  toWire: (cell) => cell,
  fromWire: (wire) => wire,
}

/** Seat 0 opens the game as player one, seat 1 replies as player two. */
export const seatPlayer = (seat: Seat): Player => (seat === Seat.first ? Player.one : Player.two)
