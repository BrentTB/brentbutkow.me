import { isRecord } from '../utils/is-record'
import { Seat } from './multiplayer.types'
import { ROOM_CODE_PATTERN } from './room-code'

/**
 * The seat you are holding, kept so a reload puts you back in it.
 *
 * A reload otherwise throws away the seat token, and rejoining is not the same thing: the room is still
 * full until your old seat times out, and once it does you come back as a new player rather than the one
 * whose name, colour and side are already on the board. Resuming keeps the seat you had.
 *
 * `sessionStorage` rather than `localStorage` or the URL: it belongs to this one tab and goes away with
 * it, so a link you copy out of the address bar is still only an invite, and a token never travels.
 */

export interface RoomSession {
  code: string
  token: string
  seat: Seat
}

const key = (gameId: string) => `room-session:${gameId}`

/** The longest token the server issues. A longer one could not have come from it. */
export const MAX_TOKEN_LENGTH = 128

// Storage is untrusted input: another script on the origin can write anything here, so the restored
// session is held to the same shape the server could have issued rather than to `string` alone.
const isSession = (raw: unknown): raw is RoomSession =>
  isRecord(raw) &&
  typeof raw.code === 'string' &&
  ROOM_CODE_PATTERN.test(raw.code) &&
  typeof raw.token === 'string' &&
  raw.token.length > 0 &&
  raw.token.length <= MAX_TOKEN_LENGTH &&
  (raw.seat === Seat.first || raw.seat === Seat.second)

export function saveRoomSession(gameId: string, session: RoomSession): void {
  try {
    window.sessionStorage.setItem(key(gameId), JSON.stringify(session))
  } catch {
    // Private browsing and full quotas both throw. Losing a resume is not worth breaking the game over.
  }
}

/** The stored seat for this game, or null when there is nothing usable to resume. */
export function loadRoomSession(gameId: string): RoomSession | null {
  try {
    const stored = window.sessionStorage.getItem(key(gameId))
    if (stored === null) return null
    const parsed: unknown = JSON.parse(stored)
    return isSession(parsed) ? parsed : null
  } catch {
    // Unreadable or malformed storage is treated as nothing stored.
    return null
  }
}

export function clearRoomSession(gameId: string): void {
  try {
    window.sessionStorage.removeItem(key(gameId))
  } catch {
    // Nothing to do: the session is already unreachable.
  }
}
