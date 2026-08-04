import { describe, expect, it } from 'vitest'
import { RoomInvite, encodeRoomInvite, parseRoomInvite } from './room-code'

const parse = (params: Record<string, string>) => parseRoomInvite(new URLSearchParams(params))

describe('room-code', () => {
  it('round-trips a full invite', () => {
    const invite: RoomInvite = { code: 'AB2K9M', gameId: 'tic-tac-toe', colour: '233,164,84' }
    expect(parse(encodeRoomInvite(invite))).toEqual(invite)
  })

  it('round-trips without a colour', () => {
    const invite: RoomInvite = { code: 'AB2K9M', gameId: 'othello' }
    const encoded = encodeRoomInvite(invite)
    expect('c' in encoded).toBe(false)
    expect(parse(encoded)).toEqual(invite)
  })

  it('uppercases the code so a hand-typed link still matches', () => {
    expect(parse({ room: 'ab2k9m', g: 'othello' })?.code).toBe('AB2K9M')
  })

  it('returns null when the code or game is missing', () => {
    expect(parse({ g: 'othello' })).toBeNull()
    expect(parse({ room: 'AB2K9M' })).toBeNull()
  })

  it('rejects a malformed code or game id', () => {
    expect(parse({ room: 'no', g: 'othello' })).toBeNull() // too short
    expect(parse({ room: 'AB2K9M', g: 'Bad Game!' })).toBeNull()
  })

  it('drops a malformed colour but keeps the rest of the invite', () => {
    const invite = parse({ room: 'AB2K9M', g: 'othello', c: 'not-a-colour' })
    expect(invite).toEqual({ code: 'AB2K9M', gameId: 'othello' })
  })
})
