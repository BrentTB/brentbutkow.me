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

/**
 * Which local player a seat plays as.
 *
 * The game itself always has player one moving first, so whichever seat the room says opens is player
 * one and the other is player two. That keeps the engine's own rule intact while letting either seat
 * start, and it flips cleanly when a rematch hands the opening move over. Colours and names live on
 * the seat, so a player keeps their own even as their slot changes between games.
 */
export const playerForSeat = (seat: Seat, firstSeat: Seat): Player =>
  seat === firstSeat ? Player.one : Player.two
