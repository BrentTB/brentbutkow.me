// A shareable invite to a room, carried in a URL query param so a link drops the recipient straight
// into the join flow. The URL is untrusted input: a malformed code yields null rather than a bad join.
//
// Only the code travels. The page itself already says which game this is, and the joiner picks their
// own colour, so neither belongs in the link.

// Short key keeps the link legible.
const CODE_KEY = 'room'

const CODE_PATTERN = /^[A-Za-z0-9]{4,12}$/

export function encodeRoomInvite(code: string): Record<string, string> {
  return { [CODE_KEY]: code }
}

export function parseRoomInvite(params: URLSearchParams): string | null {
  const code = params.get(CODE_KEY)
  if (code === null || !CODE_PATTERN.test(code)) return null
  return code.toUpperCase()
}
