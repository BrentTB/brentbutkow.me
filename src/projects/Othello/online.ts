import { MoveCodec, PASS_WIRE, Seat } from '../../multiplayer/multiplayer.types'
import { Player } from './othello.types'

// This game's slot in the generic multiplayer layer: an id, a board size that varies with the room,
// and a move codec. A move is a cell index, or `PASS_WIRE` (-1) for a forfeited turn, so the codec is
// the identity — the wire integer is the move.

export const OTHELLO_GAME_ID = 'othello'

/** A square board has size² cells; the room is created with the size the host picked. */
export const othelloCellCount = (size: number): number => size * size

/** A pass on the wire, re-exported so the page can route it without reaching into the multiplayer layer. */
export const PASS_MOVE = PASS_WIRE

export const cellCodec: MoveCodec<number> = {
  toWire: (move) => move,
  fromWire: (wire) => wire,
}

/**
 * Which colour a seat plays. Dark always opens by the rules of Othello, so the seat the room says
 * opens — `firstSeat` — is dark, and the other seat is light.
 *
 * **Cross-repo invariant:** the server's judge maps the winning colour back to a seat the same way
 * (the opener is dark) in `app/modules/rooms/othello.py`. Change one, change the other.
 */
export const colourForSeat = (seat: Seat, firstSeat: Seat): Player =>
  seat === firstSeat ? Player.dark : Player.light

/** The colour that opens any game: always dark. */
export const openingColour = (): Player => Player.dark
