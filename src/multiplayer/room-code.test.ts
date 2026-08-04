import { afterEach, describe, expect, it } from 'vitest'
import {
  ROOM_CODE_LENGTH,
  clearRoomFromUrl,
  encodeRoomInvite,
  parseRoomInvite,
  roomInviteUrl,
  showRoomInUrl,
} from './room-code'

const parse = (params: Record<string, string>) => parseRoomInvite(new URLSearchParams(params))

/** A code of exactly the length the server mints, so the tests cannot drift from the constant. */
const CODE = 'AB2K9M'.slice(0, ROOM_CODE_LENGTH).padEnd(ROOM_CODE_LENGTH, 'X')

afterEach(() => clearRoomFromUrl())

describe('room-code', () => {
  it('round-trips a code', () => {
    expect(parse(encodeRoomInvite(CODE))).toBe(CODE)
  })

  it('carries nothing but the code', () => {
    // The page says which game it is and the joiner picks their own colour, so neither is in the link.
    expect(Object.keys(encodeRoomInvite(CODE))).toEqual(['room'])
  })

  it('uppercases the code so a hand-typed link still matches', () => {
    expect(parse({ room: CODE.toLowerCase() })).toBe(CODE)
  })

  it('returns null when there is no code', () => {
    expect(parse({})).toBeNull()
  })

  it('accepts only a code of the length the server issues', () => {
    expect(parse({ room: 'A'.repeat(ROOM_CODE_LENGTH) })).not.toBeNull()
    expect(parse({ room: 'A'.repeat(ROOM_CODE_LENGTH - 1) })).toBeNull()
    expect(parse({ room: 'A'.repeat(ROOM_CODE_LENGTH + 1) })).toBeNull()
  })

  it('rejects a code with characters a code never contains', () => {
    expect(parse({ room: 'BAD CO' })).toBeNull()
    expect(parse({ room: 'AB-K9M' })).toBeNull()
  })

  it('builds an absolute invite url carrying the code', () => {
    const url = roomInviteUrl(CODE)
    expect(url.startsWith(`${window.location.origin}${window.location.pathname}`)).toBe(true)
    expect(parse(Object.fromEntries(new URL(url).searchParams))).toBe(CODE)
  })

  it('shows the code in the address bar and takes it back out', () => {
    showRoomInUrl(CODE)
    expect(parseRoomInvite(new URLSearchParams(window.location.search))).toBe(CODE)

    clearRoomFromUrl()
    expect(window.location.search).toBe('')
  })
})
