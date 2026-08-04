// A shareable invite to a room, carried in a URL query param so a link drops the recipient straight
// into the join flow. The URL is untrusted input: a malformed code yields null rather than a bad join.
//
// Only the code travels. The page itself already says which game this is, and the joiner picks their
// own colour, so neither belongs in the link.

/**
 * Length of every room code the server mints.
 *
 * One source for the join field's limit and the pattern below, so a code that types cleanly is exactly
 * the code the server could have issued. The server draws from an alphabet with no I, O, 0 or 1, which
 * is why a code is characters rather than digits.
 */
export const ROOM_CODE_LENGTH = 6

// Short key keeps the link legible.
const CODE_KEY = 'room'

const CODE_PATTERN = new RegExp(`^[A-Za-z0-9]{${ROOM_CODE_LENGTH}}$`)

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
  if (code === null || !CODE_PATTERN.test(code)) return null
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
