import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../api/api'
import { Outcome, RoomStatus, Seat } from './multiplayer.types'
import {
  beaconLeave,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  matchmake,
  startGame,
  submitMove,
  updateProfile,
  updateSettings,
} from './rooms-api'

// The hook's own tests mock this module away, so the guards are only ever exercised here: `fetch` is
// stubbed and every endpoint is asked to accept a whole payload and to turn down a broken one.

const CODE = 'AB2K9M'
const TOKEN = 'tok'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

/** Typed on the call it records, so a test can read back the URL and body that went out. */
const stubFetch = (body: unknown, status = 200) => {
  const spy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(mockRes(body, status))
  )
  vi.stubGlobal('fetch', spy)
  return spy
}

const seatPayload = (seat: Seat, name: string) => ({
  seat,
  name,
  colour: '1,2,3',
  joined: true,
})

const roomPayload = (over: Record<string, unknown> = {}) => ({
  code: CODE,
  gameId: 'ttt',
  cellCount: 64,
  moves: [1, 2],
  seats: [seatPayload(Seat.first, 'Ada'), seatPayload(Seat.second, 'Bo')],
  status: RoomStatus.active,
  version: 2,
  expiresAt: '2030-01-01T00:00:00.000Z',
  firstSeat: Seat.first,
  ownerSeat: Seat.first,
  isOpen: false,
  moveLimitSeconds: 30,
  turnEndsAt: '2030-01-01T00:00:30.000Z',
  outcome: null,
  winnerSeat: null,
  ...over,
})

const credentialsPayload = (over: Record<string, unknown> = {}) => ({
  code: CODE,
  gameId: 'ttt',
  cellCount: 64,
  seat: Seat.first,
  token: TOKEN,
  status: RoomStatus.waiting,
  ...over,
})

const movePayload = (over: Record<string, unknown> = {}) => ({
  version: 3,
  moves: [1, 2, 3],
  status: RoomStatus.active,
  outcome: null,
  winnerSeat: null,
  turnEndsAt: '2030-01-01T00:01:00.000Z',
  ...over,
})

/** What a rejected shape looks like from a caller's side, whatever field was wrong. */
const SHAPE = 'Unexpected response shape'

afterEach(() => vi.unstubAllGlobals())

describe('getRoom', () => {
  it('reads a whole room and identifies the seat while doing it', async () => {
    const spy = stubFetch(roomPayload())
    await expect(getRoom(CODE, TOKEN)).resolves.toMatchObject({
      code: CODE,
      moves: [1, 2],
      turnEndsAt: '2030-01-01T00:00:30.000Z',
    })
    expect(spy).toHaveBeenCalledWith(apiUrl(`/rooms/${CODE}`), {
      signal: undefined,
      headers: { 'X-Seat-Token': TOKEN },
    })
  })

  it('sends no seat header when it has no token to send', async () => {
    const spy = stubFetch(roomPayload())
    await getRoom(CODE)
    expect(spy).toHaveBeenCalledWith(apiUrl(`/rooms/${CODE}`), {
      signal: undefined,
      headers: undefined,
    })
  })

  it('escapes the code rather than pasting it into the path', async () => {
    const spy = stubFetch(roomPayload())
    await getRoom('A/../B')
    expect(spy.mock.calls[0][0]).toBe(apiUrl('/rooms/A%2F..%2FB'))
  })

  it('passes the abort signal through, so a poll can be called off', async () => {
    const spy = stubFetch(roomPayload())
    const controller = new AbortController()
    await getRoom(CODE, TOKEN, controller.signal)
    expect(spy.mock.calls[0][1]).toMatchObject({ signal: controller.signal })
  })

  it.each([
    ['a missing code', { code: undefined }],
    ['a numeric code', { code: 7 }],
    ['a missing gameId', { gameId: undefined }],
    ['a missing cellCount', { cellCount: undefined }],
    ['a status the room never reports', { status: 'paused' }],
    ['moves that are not numbers', { moves: ['1'] }],
    ['moves that are not a list', { moves: 1 }],
    ['seats that are not a list', { seats: {} }],
    ['a seat missing everything', { seats: [{}] }],
    ['a seat off the board', { seats: [{ ...seatPayload(Seat.first, 'Ada'), seat: 2 }] }],
    ['a seat with no joined flag', { seats: [{ seat: 0, name: 'Ada', colour: '1,2,3' }] }],
    ['a seat whose name is not a string', { seats: [{ ...seatPayload(0, 'Ada'), name: 7 }] }],
    ['a missing version', { version: undefined }],
    ['a missing expiry', { expiresAt: undefined }],
    ['a firstSeat off the board', { firstSeat: 2 }],
    ['an ownerSeat off the board', { ownerSeat: 'first' }],
    ['a missing isOpen', { isOpen: undefined }],
    ['a move limit that is neither number nor null', { moveLimitSeconds: '30' }],
    ['a deadline that is neither string nor null', { turnEndsAt: 5 }],
    ['an outcome nothing ends in', { outcome: 'quit' }],
    ['a winner off the board', { winnerSeat: 3 }],
  ])('turns down a room with %s', async (_label, over) => {
    stubFetch(roomPayload(over))
    await expect(getRoom(CODE, TOKEN)).rejects.toThrow(SHAPE)
  })

  it('turns down a payload that is not an object at all', async () => {
    stubFetch(null)
    await expect(getRoom(CODE, TOKEN)).rejects.toThrow(SHAPE)
  })

  it('surfaces a gone room as an HttpError carrying the status', async () => {
    stubFetch(null, 410)
    await expect(getRoom(CODE, TOKEN)).rejects.toMatchObject({ name: 'HttpError', status: 410 })
  })
})

describe('createRoom', () => {
  it('opens a room on the settings it is given', async () => {
    const spy = stubFetch(credentialsPayload())
    await expect(
      createRoom('ttt', { name: 'Ada', colour: '1,2,3' }, 64, {
        firstSeat: Seat.second,
        isOpen: true,
        moveLimitSeconds: 30,
      })
    ).resolves.toMatchObject({ code: CODE, token: TOKEN })
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      gameId: 'ttt',
      name: 'Ada',
      colour: '1,2,3',
      cellCount: 64,
      firstSeat: Seat.second,
      isOpen: true,
      moveLimitSeconds: 30,
    })
  })

  it('falls back to a private room that you open, with no clock', async () => {
    const spy = stubFetch(credentialsPayload())
    await createRoom('ttt', { name: 'Ada', colour: '1,2,3' }, 64)
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toMatchObject({
      firstSeat: Seat.first,
      isOpen: false,
      moveLimitSeconds: null,
    })
  })

  it.each([
    ['a missing code', { code: undefined }],
    ['a missing gameId', { gameId: undefined }],
    ['a cellCount that is not a number', { cellCount: '64' }],
    ['a seat off the board', { seat: 2 }],
    ['a missing token', { token: undefined }],
    ['a status the room never reports', { status: 'paused' }],
  ])('turns down credentials with %s', async (_label, over) => {
    stubFetch(credentialsPayload(over))
    await expect(createRoom('ttt', { name: 'Ada', colour: '1,2,3' }, 64)).rejects.toThrow(SHAPE)
  })

  it('surfaces a rejected creation as an HttpError carrying the status', async () => {
    stubFetch(null, 422)
    await expect(createRoom('ttt', { name: 'Ada', colour: '1,2,3' }, 64)).rejects.toMatchObject({
      status: 422,
    })
  })
})

describe('matchmake', () => {
  it('asks for a game on the terms of the room it might open', async () => {
    const spy = stubFetch(credentialsPayload({ seat: Seat.second }))
    await expect(
      matchmake('ttt', { name: 'Bo', colour: '4,5,6' }, 64, { moveLimitSeconds: 60 })
    ).resolves.toMatchObject({ seat: Seat.second })
    // A matchmade room is always open, so openness is the server's to decide and never travels.
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      gameId: 'ttt',
      name: 'Bo',
      colour: '4,5,6',
      cellCount: 64,
      firstSeat: Seat.first,
      moveLimitSeconds: 60,
    })
  })
})

describe('joinRoom', () => {
  it('takes the free seat with your own name and colour', async () => {
    const spy = stubFetch(credentialsPayload({ seat: Seat.second, token: 'tok2' }))
    await expect(joinRoom(CODE, { name: 'Bo', colour: '4,5,6' })).resolves.toMatchObject({
      seat: Seat.second,
      token: 'tok2',
    })
    expect(spy.mock.calls[0][0]).toBe(apiUrl(`/rooms/${CODE}/join`))
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      name: 'Bo',
      colour: '4,5,6',
    })
  })

  it('surfaces a full room as an HttpError carrying the status', async () => {
    stubFetch(null, 409)
    await expect(joinRoom(CODE, { name: 'Bo', colour: '4,5,6' })).rejects.toMatchObject({
      status: 409,
    })
  })
})

describe('submitMove', () => {
  it('sends the move with the version it expects to be appending to', async () => {
    const spy = stubFetch(movePayload())
    await expect(submitMove(CODE, TOKEN, 3, 2, false, false)).resolves.toMatchObject({
      version: 3,
      moves: [1, 2, 3],
      turnEndsAt: '2030-01-01T00:01:00.000Z',
    })
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      token: TOKEN,
      move: 3,
      expectedVersion: 2,
      finished: false,
      won: false,
    })
  })

  it('accepts a result from a server that sends no deadline', async () => {
    stubFetch(movePayload({ turnEndsAt: undefined }))
    await expect(submitMove(CODE, TOKEN, 3, 2, false, false)).resolves.toMatchObject({ version: 3 })
  })

  it('accepts a finished game with a declared winner', async () => {
    stubFetch(
      movePayload({
        status: RoomStatus.finished,
        outcome: Outcome.win,
        winnerSeat: Seat.first,
        turnEndsAt: null,
      })
    )
    await expect(submitMove(CODE, TOKEN, 3, 2, true, true)).resolves.toMatchObject({
      outcome: Outcome.win,
      winnerSeat: Seat.first,
    })
  })

  it.each([
    ['a missing version', { version: undefined }],
    ['moves that are not numbers', { moves: ['1'] }],
    ['a status the room never reports', { status: 'paused' }],
    ['an outcome nothing ends in', { outcome: 'quit' }],
    ['a winner off the board', { winnerSeat: 2 }],
    ['a deadline that is neither string nor null', { turnEndsAt: 60 }],
  ])('turns down a move result with %s', async (_label, over) => {
    stubFetch(movePayload(over))
    await expect(submitMove(CODE, TOKEN, 3, 2, false, false)).rejects.toThrow(SHAPE)
  })

  it('surfaces a move played out of turn as an HttpError carrying the status', async () => {
    stubFetch(null, 403)
    await expect(submitMove(CODE, TOKEN, 3, 2, false, false)).rejects.toMatchObject({ status: 403 })
  })
})

describe('the room writes that answer with the whole room', () => {
  it('updates your profile and hands back the room both seats are in', async () => {
    const spy = stubFetch(roomPayload())
    await expect(
      updateProfile(CODE, TOKEN, { name: 'Ada', colour: '9,9,9' })
    ).resolves.toMatchObject({ code: CODE })
    expect(spy.mock.calls[0][0]).toBe(apiUrl(`/rooms/${CODE}/profile`))
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      token: TOKEN,
      name: 'Ada',
      colour: '9,9,9',
    })
  })

  it('replaces every setting at once, since the endpoint is not a patch', async () => {
    const spy = stubFetch(roomPayload())
    await updateSettings(CODE, TOKEN, {
      firstSeat: Seat.second,
      isOpen: true,
      moveLimitSeconds: null,
    })
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({
      token: TOKEN,
      firstSeat: Seat.second,
      isOpen: true,
      moveLimitSeconds: null,
    })
  })

  it('starts a game', async () => {
    const spy = stubFetch(roomPayload({ moves: [], version: 0 }))
    await expect(startGame(CODE, TOKEN)).resolves.toMatchObject({ moves: [] })
    expect(spy.mock.calls[0][0]).toBe(apiUrl(`/rooms/${CODE}/start`))
  })

  it('gives up the seat', async () => {
    const spy = stubFetch(roomPayload())
    await leaveRoom(CODE, TOKEN)
    expect(spy.mock.calls[0][0]).toBe(apiUrl(`/rooms/${CODE}/leave`))
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ token: TOKEN })
  })

  it('turns down a malformed room from a write, not only from a read', async () => {
    stubFetch(roomPayload({ seats: [{}] }))
    await expect(startGame(CODE, TOKEN)).rejects.toThrow(SHAPE)
  })
})

describe('beaconLeave', () => {
  it('beacons the leave, since a closing tab will not wait for a request', () => {
    const send = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: send })
    beaconLeave(CODE, TOKEN)
    expect(send).toHaveBeenCalledWith(apiUrl(`/rooms/${CODE}/leave`), expect.any(Blob))
  })

  it('does nothing where there is no beacon to send', () => {
    vi.stubGlobal('navigator', {})
    expect(() => beaconLeave(CODE, TOKEN)).not.toThrow()
  })
})
