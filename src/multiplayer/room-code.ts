// A shareable invite to a room, carried in URL query params so a link drops the recipient straight
// into the join flow. The URL is untrusted input: every field is validated on parse, and anything
// malformed makes the whole invite null rather than a half-filled object.

export interface RoomInvite {
  code: string
  gameId: string
  // A colour suggested for the joiner (the creator's isn't sent). "r,g,b" channels.
  colour?: string
}

// Short keys keep the link legible.
const Key = { code: 'room', gameId: 'g', colour: 'c' } as const

const CODE_PATTERN = /^[A-Za-z0-9]{4,12}$/
const GAME_ID_PATTERN = /^[a-z0-9-]{1,40}$/
const COLOUR_PATTERN = /^\d{1,3},\d{1,3},\d{1,3}$/

export function encodeRoomInvite(invite: RoomInvite): Record<string, string> {
  const params: Record<string, string> = {
    [Key.code]: invite.code,
    [Key.gameId]: invite.gameId,
  }
  if (invite.colour) params[Key.colour] = invite.colour
  return params
}

export function parseRoomInvite(params: URLSearchParams): RoomInvite | null {
  const code = params.get(Key.code)
  const gameId = params.get(Key.gameId)
  if (code === null || gameId === null) return null
  if (!CODE_PATTERN.test(code) || !GAME_ID_PATTERN.test(gameId)) return null

  const colour = params.get(Key.colour)
  const invite: RoomInvite = { code: code.toUpperCase(), gameId }
  if (colour !== null && COLOUR_PATTERN.test(colour)) invite.colour = colour
  return invite
}
