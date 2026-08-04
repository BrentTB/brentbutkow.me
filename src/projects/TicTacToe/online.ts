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
 * Which local player a seat plays as: seat 0 is player one, seat 1 is player two, always.
 *
 * Fixed on purpose. Who opens is a separate question the room answers, and mapping seats through it
 * instead would relabel both players' colours and names every time the opening move changed hands.
 */
export const playerForSeat = (seat: Seat): Player => (seat === Seat.first ? Player.one : Player.two)

/** Which player opens, given the seat the room says goes first. */
export const openingPlayer = (firstSeat: Seat): Player => playerForSeat(firstSeat)

/**
 * Whether this seat is the one that has to move off a shared colour.
 *
 * Only the second seat gives way. Both players start on the same default, and a rule that told
 * whoever noticed to move had both of them move at once, to the same replacement, over and over: the
 * two boards never settled and each one briefly showed the pair swapped.
 */
export const yieldsColour = (
  mySeat: Seat | null,
  mine: string,
  theirs: string | undefined
): boolean => mySeat === Seat.second && theirs !== undefined && mine === theirs

/** The first colour nobody in the room, or the other local slot, is already using. */
export const freeColour = (
  palette: readonly { rgb: string }[],
  taken: readonly (string | undefined)[]
): string | undefined => palette.find((colour) => !taken.includes(colour.rgb))?.rgb
