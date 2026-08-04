// Types shared by the game-agnostic multiplayer layer. Nothing here knows any game's rules — a game
// plugs in with its own gameId and a MoveCodec that maps its move to the wire integer the server stores.

export const RoomStatus = {
  waiting: 'waiting',
  active: 'active',
  finished: 'finished',
  abandoned: 'abandoned',
} as const
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus]

/** How a finished game ended. The server decides a timeout or a forfeit; the client reports the rest. */
export const Outcome = {
  win: 'win',
  draw: 'draw',
  /** Somebody ran out of time on their move. */
  timeout: 'timeout',
  /** Somebody walked out of a game in progress. */
  forfeit: 'forfeit',
} as const
export type Outcome = (typeof Outcome)[keyof typeof Outcome]

// Two seats, numbered so the turn alternates from whichever one the room says opens.
export const Seat = { first: 0, second: 1 } as const
export type Seat = (typeof Seat)[keyof typeof Seat]

export interface SeatInfo {
  seat: Seat
  /** What that player calls themselves. Blank until they set one, so callers supply the fallback. */
  name: string
  colour: string
  /** Whether they are still here: false once they leave or stop reading the room. */
  joined: boolean
}

/** How a player presents themselves in a room, shared with the opponent. */
export interface SeatProfile {
  name: string
  colour: string
}

/** What the room is set up to do, chosen by whoever opens it. */
export interface RoomOptions {
  /** Which seat opens the game. The creator takes seat 0, so 1 hands the first move to the joiner. */
  firstSeat?: Seat
  /** Whether a stranger looking for a game may be dropped in here. */
  isOpen?: boolean
  /** How long each move may take before that player loses on time. Omitted means no clock. */
  moveLimitSeconds?: number | null
}

// A game's move as the wire integer the server exchanges, and back. The reserved value -1 is a pass,
// for games that allow it; placement games never emit it.
export interface MoveCodec<Move> {
  toWire(move: Move): number
  fromWire(wire: number): Move
}

// The public room view, safe to poll. Seat tokens never appear here.
export interface RoomState {
  code: string
  gameId: string
  cellCount: number
  moves: number[]
  seats: SeatInfo[]
  status: RoomStatus
  version: number
  expiresAt: string
  firstSeat: Seat
  isOpen: boolean
  moveLimitSeconds: number | null
  /** When the player on turn runs out of time, or null when no clock is running. */
  turnEndsAt: string | null
  outcome: Outcome | null
  winnerSeat: Seat | null
}

// Returned only to the seat that owns it, on create/join — carries the secret token.
export interface RoomCredentials {
  code: string
  gameId: string
  cellCount: number
  seat: Seat
  token: string
  status: RoomStatus
}

export interface MoveResult {
  version: number
  moves: number[]
  status: RoomStatus
  outcome: Outcome | null
  winnerSeat: Seat | null
}
