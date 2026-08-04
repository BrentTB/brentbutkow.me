import { apiRoutes, fetchJson, postJsonFor } from '../api/api'
import {
  MoveResult,
  RoomCredentials,
  RoomState,
  RoomStatus,
  Seat,
  SeatInfo,
} from './multiplayer.types'

// Typed client for the rooms endpoints. Every response is validated before use — the API is untrusted
// input like any other network source, so shapes are checked rather than cast.

const roomPath = (code: string) => `${apiRoutes.rooms}/${encodeURIComponent(code)}`

const isRecord = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === 'object' && raw !== null

const isStatus = (value: unknown): value is RoomStatus =>
  typeof value === 'string' && (Object.values(RoomStatus) as string[]).includes(value)

const isSeat = (value: unknown): value is Seat => value === Seat.first || value === Seat.second

const isWireMoves = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'number')

const isSeatInfo = (raw: unknown): raw is SeatInfo =>
  isRecord(raw) &&
  isSeat(raw.seat) &&
  typeof raw.colour === 'string' &&
  typeof raw.joined === 'boolean'

const isRoomCredentials = (raw: unknown): raw is RoomCredentials =>
  isRecord(raw) &&
  typeof raw.code === 'string' &&
  typeof raw.gameId === 'string' &&
  typeof raw.cellCount === 'number' &&
  isSeat(raw.seat) &&
  typeof raw.token === 'string' &&
  isStatus(raw.status)

const isRoomState = (raw: unknown): raw is RoomState =>
  isRecord(raw) &&
  typeof raw.code === 'string' &&
  typeof raw.gameId === 'string' &&
  typeof raw.cellCount === 'number' &&
  isWireMoves(raw.moves) &&
  Array.isArray(raw.seats) &&
  raw.seats.every(isSeatInfo) &&
  isStatus(raw.status) &&
  typeof raw.version === 'number' &&
  typeof raw.expiresAt === 'string'

const isMoveResult = (raw: unknown): raw is MoveResult =>
  isRecord(raw) && typeof raw.version === 'number' && isWireMoves(raw.moves) && isStatus(raw.status)

export function createRoom(
  gameId: string,
  colour: string,
  cellCount: number
): Promise<RoomCredentials> {
  return postJsonFor(apiRoutes.rooms, { gameId, colour, cellCount }, isRoomCredentials)
}

export function joinRoom(code: string, colour: string): Promise<RoomCredentials> {
  return postJsonFor(`${roomPath(code)}/join`, { colour }, isRoomCredentials)
}

export function getRoom(code: string, signal?: AbortSignal): Promise<RoomState> {
  return fetchJson(roomPath(code), signal, isRoomState)
}

export function submitMove(
  code: string,
  token: string,
  move: number,
  expectedVersion: number,
  finished: boolean
): Promise<MoveResult> {
  return postJsonFor(
    `${roomPath(code)}/move`,
    { token, move, expectedVersion, finished },
    isMoveResult
  )
}
