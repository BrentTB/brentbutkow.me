import { describe, expect, it } from 'vitest'
import { encodeRoomInvite, parseRoomInvite } from './room-code'

const parse = (params: Record<string, string>) => parseRoomInvite(new URLSearchParams(params))

describe('room-code', () => {
  it('round-trips a code', () => {
    expect(parse(encodeRoomInvite('AB2K9M'))).toBe('AB2K9M')
  })

  it('carries nothing but the code', () => {
    // The page says which game it is and the joiner picks their own colour, so neither is in the link.
    expect(Object.keys(encodeRoomInvite('AB2K9M'))).toEqual(['room'])
  })

  it('uppercases the code so a hand-typed link still matches', () => {
    expect(parse({ room: 'ab2k9m' })).toBe('AB2K9M')
  })

  it('returns null when there is no code', () => {
    expect(parse({})).toBeNull()
  })

  it('rejects a malformed code', () => {
    expect(parse({ room: 'no' })).toBeNull() // too short
    expect(parse({ room: 'way-too-long-to-be-real' })).toBeNull()
    expect(parse({ room: 'BAD CODE' })).toBeNull()
  })
})
