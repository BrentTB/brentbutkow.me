import {
  MoveCodec,
  PASS_WIRE,
  RoomState,
  Seat,
  SeatInfo,
} from '../../multiplayer/multiplayer.types'
import { BoardSize, Player, isBoardSize } from './othello.types'

// This game's slot in the generic multiplayer layer: an id, a board size that varies with the room,
// and a move codec. A move is a cell index, or `PASS_WIRE` (-1) for a forfeited turn, so the codec is
// the identity — the wire integer is the move.

export const OTHELLO_GAME_ID = 'othello'

/** A square board has size² cells; the room is created with the size the host picked. */
export const othelloCellCount = (size: BoardSize): number => size * size

/** The board size a cell count decodes to, or null when it is not one Othello offers. */
export const boardSizeFor = (cellCount: number): BoardSize | null => {
  const size = Math.round(Math.sqrt(cellCount))
  if (size * size !== cellCount || !isBoardSize(size)) return null
  return size
}

/**
 * Whether this client can play a room it lands in. Matchmaking pairs Othello players across sizes to
 * make a small audience more likely to find a game, so a room is fine as long as its board is a size
 * Othello offers — the board simply adopts it.
 */
export const acceptsOthelloRoom = (room: RoomState): boolean =>
  boardSizeFor(room.cellCount) !== null

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

/** The disc colours as rgb, matching the board, for the online panel's seat swatches. */
const DISC_SWATCH_RGB: Record<Player, string> = {
  [Player.dark]: '22, 23, 28',
  [Player.light]: '233, 227, 214',
}

/** A seat's swatch in the online panel: the disc it plays, since Othello colours are fixed. */
export const seatSwatchRgb = (entry: SeatInfo, firstSeat: Seat): string =>
  DISC_SWATCH_RGB[colourForSeat(entry.seat, firstSeat)]
