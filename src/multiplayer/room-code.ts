// A shareable invite to a room, carried in a URL query param so a link drops the recipient straight
// into the join flow. The URL is untrusted input: a malformed code yields null rather than a bad join.
//
// Only the code travels. The page itself already says which game this is, and the joiner picks their
// own colour, so neither belongs in the link.

/**
 * Length of every room code the server mints.
 *
 * One source for the join field's limit and the pattern below, so a code that types cleanly is exactly
 * the code the server could have issued.
 */
export const ROOM_CODE_LENGTH = 6

/**
 * The alphabet the server draws a code from.
 *
 * No I, L, O, 0 or 1: the pairs that get misread off a screen or misheard down a phone are simply not
 * in play, so a code only has one plausible spelling.
 */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

// Short key keeps the link legible.
const CODE_KEY = 'room'

/** Case-insensitive, since a code is uppercased before it is used. */
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`, 'i')

export function encodeRoomInvite(code: string): Record<string, string> {
  return { [CODE_KEY]: code }
}

/** The invite link for a room, absolute so it can be pasted anywhere. */
export function roomInviteUrl(code: string): string {
  const params = new URLSearchParams(encodeRoomInvite(code))
  return `${window.location.origin}${window.location.pathname}?${params}`
}

export function parseRoomInvite(params: URLSearchParams): string | null {
  const code = params.get(CODE_KEY)
  if (code === null || !ROOM_CODE_PATTERN.test(code)) return null
  return code.toUpperCase()
}

/**
 * Puts the room code in the address bar, so the URL itself is shareable without the copy button.
 *
 * `replaceState` rather than a navigation: the room is already on screen, and pushing history would
 * make the back button walk through every room the visitor has been in.
 */
export function showRoomInUrl(code: string): void {
  window.history.replaceState(null, '', roomInviteUrl(code))
}

/** Takes the room code back out of the address bar, for when a session ends. */
export function clearRoomFromUrl(): void {
  window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}`)
}
