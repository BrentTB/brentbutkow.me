// Types shared by the game-agnostic multiplayer layer. Nothing here knows any game's rules — a game
// plugs in with its own gameId and a MoveCodec that maps its move to the wire integer the server stores.

export const RoomStatus = {
  waiting: 'waiting',
  active: 'active',
  finished: 'finished',
  abandoned: 'abandoned',
} as const
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus]

/**
 * How a finished game ended. The server decides a timeout or a forfeit; the client reports the rest.
 *
 * A win or a draw is therefore whatever a client claimed, unverified — the server does not know the
 * game's rules. Fine for showing two players a result they both watched happen; never sound enough to
 * stand behind a leaderboard, an unlock, or anything else a stranger could inflate. Same for
 * `winnerSeat`.
 */
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

/**
 * The reserved wire value for a turn spent without placing anything — a pass.
 *
 * A pass still consumes a turn, so it rides in the move list and keeps the seat alternation honest.
 * The server reserves the same sentinel (`_MIN_MOVE` in the backend's rooms schema); games without
 * passes never send it, so this changes nothing for them.
 */
export const PASS_WIRE = -1

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
  /**
   * How long each move may take before that player loses on time. Omitted or null means no clock.
   * The server accepts 5 seconds to 86400 (a day) and rejects anything outside that window.
   */
  moveLimitSeconds?: number | null
  /**
   * The board size, as a cell count, for a game whose size can change between games (Othello). Omitted
   * leaves the room's current size. Changing it resets the board — a different size cannot keep the
   * moves that were played on the old one.
   */
  cellCount?: number
}

/**
 * A full settings write: every room-level term required, except the board size, which stays optional
 * because most games have a single one and never send it.
 */
export type RoomChange = Required<Omit<RoomOptions, 'cellCount'>> & Pick<RoomOptions, 'cellCount'>

// A game's move as the wire integer the server exchanges, and back. The room bounds a wire move to
// `[0, cellCount)`, so a codec maps onto a cell index rather than inventing sentinels.
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
  /** Whose room it is: the seat that may change the settings and start a game. */
  ownerSeat: Seat
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
  /**
   * The next player's deadline, so the clock restarts on the move rather than on the next poll.
   * Null when no clock is running; absent from an older server that does not send it.
   */
  turnEndsAt?: string | null
}
