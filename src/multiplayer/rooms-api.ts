import { apiRoutes, apiUrl, fetchJson, postJsonFor } from '../api/api'
import {
  MoveResult,
  Outcome,
  RoomCredentials,
  RoomOptions,
  RoomState,
  RoomStatus,
  Seat,
  SeatInfo,
  SeatProfile,
} from './multiplayer.types'

// Typed client for the rooms endpoints. Every response is validated before use — the API is untrusted
// input like any other network source, so shapes are checked rather than cast.

const roomPath = (code: string) => `${apiRoutes.rooms}/${encodeURIComponent(code)}`

/** Identifies the reader to the room, which is what keeps their seat counted as present. */
const seatHeader = (token: string) => ({ 'X-Seat-Token': token })

const isRecord = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === 'object' && raw !== null

const isStatus = (value: unknown): value is RoomStatus =>
  typeof value === 'string' && (Object.values(RoomStatus) as string[]).includes(value)

const isOutcome = (value: unknown): value is Outcome | null =>
  value === null ||
  (typeof value === 'string' && (Object.values(Outcome) as string[]).includes(value))

const isSeat = (value: unknown): value is Seat => value === Seat.first || value === Seat.second

const isSeatOrNull = (value: unknown): value is Seat | null => value === null || isSeat(value)

const isWireMoves = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'number')

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || typeof value === 'number'

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

const isSeatInfo = (raw: unknown): raw is SeatInfo =>
  isRecord(raw) &&
  isSeat(raw.seat) &&
  typeof raw.name === 'string' &&
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
  typeof raw.expiresAt === 'string' &&
  isSeat(raw.firstSeat) &&
  isSeat(raw.ownerSeat) &&
  typeof raw.isOpen === 'boolean' &&
  isNumberOrNull(raw.moveLimitSeconds) &&
  isStringOrNull(raw.turnEndsAt) &&
  isOutcome(raw.outcome) &&
  isSeatOrNull(raw.winnerSeat)

const isMoveResult = (raw: unknown): raw is MoveResult =>
  isRecord(raw) &&
  typeof raw.version === 'number' &&
  isWireMoves(raw.moves) &&
  isStatus(raw.status) &&
  isOutcome(raw.outcome) &&
  isSeatOrNull(raw.winnerSeat)

export function createRoom(
  gameId: string,
  profile: SeatProfile,
  cellCount: number,
  options: RoomOptions = {}
): Promise<RoomCredentials> {
  return postJsonFor(
    apiRoutes.rooms,
    {
      gameId,
      name: profile.name,
      colour: profile.colour,
      cellCount,
      firstSeat: options.firstSeat ?? Seat.first,
      isOpen: options.isOpen ?? false,
      moveLimitSeconds: options.moveLimitSeconds ?? null,
    },
    isRoomCredentials
  )
}

/**
 * Joins whoever is waiting for this game, or opens a room and waits when nobody is.
 *
 * The options only take effect on the room it opens: joining somebody means playing by theirs.
 */
export function matchmake(
  gameId: string,
  profile: SeatProfile,
  cellCount: number,
  options: RoomOptions = {}
): Promise<RoomCredentials> {
  return postJsonFor(
    `${apiRoutes.rooms}/matchmake`,
    {
      gameId,
      name: profile.name,
      colour: profile.colour,
      cellCount,
      firstSeat: options.firstSeat ?? Seat.first,
      moveLimitSeconds: options.moveLimitSeconds ?? null,
    },
    isRoomCredentials
  )
}

export function joinRoom(code: string, profile: SeatProfile): Promise<RoomCredentials> {
  return postJsonFor(
    `${roomPath(code)}/join`,
    { name: profile.name, colour: profile.colour },
    isRoomCredentials
  )
}

/** Change your own seat's name and colour; the opponent picks it up on their next poll. */
export function updateProfile(
  code: string,
  token: string,
  profile: SeatProfile
): Promise<RoomState> {
  return postJsonFor(
    `${roomPath(code)}/profile`,
    { token, name: profile.name, colour: profile.colour },
    isRoomState
  )
}

/** Gives up your seat. Mid-game that hands the win to the other player. */
export function leaveRoom(code: string, token: string): Promise<RoomState> {
  return postJsonFor(`${roomPath(code)}/leave`, { token }, isRoomState)
}

/**
 * Changes a waiting room's settings.
 *
 * The server allows it only before the game starts and only from the seat that opened the room, so the
 * terms are not one side's to rewrite once both players are in.
 */
export function updateSettings(
  code: string,
  token: string,
  options: RoomOptions
): Promise<RoomState> {
  return postJsonFor(
    `${roomPath(code)}/settings`,
    {
      token,
      firstSeat: options.firstSeat ?? Seat.first,
      isOpen: options.isOpen ?? false,
      moveLimitSeconds: options.moveLimitSeconds ?? null,
    },
    isRoomState
  )
}

/** Clears the board and begins play. Either player may, once both are present. */
export function startGame(code: string, token: string): Promise<RoomState> {
  return postJsonFor(`${roomPath(code)}/start`, { token }, isRoomState)
}

/**
 * Frees the seat as the page goes away.
 *
 * `sendBeacon` because a tab being closed will not wait for a normal request to finish. Nothing can be
 * read back, so a failure here falls to the presence timeout instead.
 */
export function beaconLeave(code: string, token: string): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
  const body = new Blob([JSON.stringify({ token })], { type: 'application/json' })
  navigator.sendBeacon(apiUrl(`${roomPath(code)}/leave`), body)
}

export function getRoom(code: string, token?: string, signal?: AbortSignal): Promise<RoomState> {
  return fetchJson(roomPath(code), signal, isRoomState, token ? seatHeader(token) : undefined)
}

export function submitMove(
  code: string,
  token: string,
  move: number,
  expectedVersion: number,
  finished: boolean,
  won: boolean
): Promise<MoveResult> {
  return postJsonFor(
    `${roomPath(code)}/move`,
    { token, move, expectedVersion, finished, won },
    isMoveResult
  )
}
