// Types shared by the game-agnostic multiplayer layer. Nothing here knows any game's rules — a game
// plugs in with its own gameId and a MoveCodec that maps its move to the wire integer the server stores.

export const RoomStatus = {
  waiting: 'waiting',
  active: 'active',
  finished: 'finished',
  abandoned: 'abandoned',
} as const
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus]

// Two seats, numbered so `version % 2` names whose turn it is (seat 0 opens).
export const Seat = { first: 0, second: 1 } as const
export type Seat = (typeof Seat)[keyof typeof Seat]

export interface SeatInfo {
  seat: Seat
  colour: string
  joined: boolean
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
}
