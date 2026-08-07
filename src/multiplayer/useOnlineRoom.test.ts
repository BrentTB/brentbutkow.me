import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../api/api'
import * as api from './rooms-api'
import {
  MoveCodec,
  Outcome,
  RoomChange,
  RoomCredentials,
  RoomState,
  RoomStatus,
  Seat,
  SeatInfo,
} from './multiplayer.types'
import { loadRoomSession, saveRoomSession } from './room-session'
import { Connection, useOnlineRoom } from './useOnlineRoom'

vi.mock('./rooms-api')
const mocked = vi.mocked(api)

// The two players' profiles, distinct so a test can prove the seats never render alike.
const ADA = { name: 'Ada', colour: '1,2,3' }
const BO = { name: 'Bo', colour: '4,5,6' }

/** What a room opens on: the creator first, private, no clock. The whole triple, as the endpoint wants. */
const STANDARD: RoomChange = {
  firstSeat: Seat.first,
  isOpen: false,
  moveLimitSeconds: null,
}

// A move is just its cell index on the wire, so the codec is the identity.
const idCodec: MoveCodec<number> = { toWire: (m) => m, fromWire: (w) => w }

const seat = (n: Seat, name: string, colour: string, joined = true): SeatInfo => ({
  seat: n,
  name,
  colour,
  joined,
})

const state = (over: Partial<RoomState>): RoomState => ({
  code: 'AB2K9M',
  gameId: 'ttt',
  cellCount: 64,
  moves: [],
  seats: [seat(Seat.first, 'Ada', '1,2,3'), seat(Seat.second, 'Bo', '4,5,6')],
  status: RoomStatus.active,
  version: 0,
  expiresAt: '',
  firstSeat: Seat.first,
  ownerSeat: Seat.first,
  isOpen: false,
  moveLimitSeconds: null,
  turnEndsAt: null,
  outcome: null,
  winnerSeat: null,
  ...over,
})

const credentials = (over: Partial<RoomCredentials> = {}): RoomCredentials => ({
  code: 'AB2K9M',
  gameId: 'ttt',
  cellCount: 64,
  seat: Seat.first,
  token: 'tok',
  status: RoomStatus.waiting,
  ...over,
})

const setup = (
  onRemoteMove = vi.fn(),
  onReset = vi.fn(),
  extra: Partial<Parameters<typeof useOnlineRoom>[0]> = {}
) => {
  const view = renderHook(() =>
    useOnlineRoom({
      gameId: 'ttt',
      cellCount: 64,
      codec: idCodec,
      onRemoteMove,
      onReset,
      pollMs: 1000,
      ...extra,
    })
  )
  return { view, onRemoteMove, onReset }
}

/** Creates a room and settles the first poll, which is where both seats become known. */
const connect = async (view: ReturnType<typeof setup>['view'], room = state({})) => {
  mocked.getRoom.mockResolvedValue(room)
  await act(async () => {
    await view.result.current.create(ADA)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mocked.createRoom.mockResolvedValue(credentials())
  mocked.getRoom.mockResolvedValue(state({}))
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  // A session saved by one test would otherwise be resumed by the next one's mount.
  window.sessionStorage.clear()
})

/** A read that answers only when the test says so, for proving what a late response does. */
const pendingRead = () => {
  let release: (state: RoomState) => void = () => undefined
  mocked.getRoom.mockReturnValue(
    new Promise<RoomState>((resolve) => {
      release = resolve
    })
  )
  return (answer: RoomState) => release(answer)
}

describe('useOnlineRoom', () => {
  it('creates a room and connects as seat 0', async () => {
    const { view } = setup()
    await connect(
      view,
      state({ status: RoomStatus.waiting, seats: [seat(Seat.first, 'Ada', '1,2,3')] })
    )
    expect(mocked.createRoom).toHaveBeenCalledWith('ttt', ADA, 64, {})
    expect(view.result.current.connection).toBe('connected')
    expect(view.result.current.mySeat).toBe(Seat.first)
    expect(view.result.current.opponentPresent).toBe(false)
    expect(view.result.current.opponentLeft).toBe(false)
  })

  it('passes the room settings the creator chose', async () => {
    const { view } = setup()
    mocked.getRoom.mockResolvedValue(state({}))
    await act(async () => {
      await view.result.current.create(ADA, {
        firstSeat: Seat.second,
        isOpen: true,
        moveLimitSeconds: 60,
      })
    })
    expect(mocked.createRoom).toHaveBeenCalledWith('ttt', ADA, 64, {
      firstSeat: Seat.second,
      isOpen: true,
      moveLimitSeconds: 60,
    })
  })

  it('reads the poll with the seat token, which is what keeps the seat present', async () => {
    const { view } = setup()
    await connect(view)
    expect(mocked.getRoom).toHaveBeenCalledWith('AB2K9M', 'tok')
  })

  it('applies the opponent move it sees on the next poll', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    mocked.getRoom.mockResolvedValue(state({ moves: [9], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).toHaveBeenCalledWith(9, 0)
    expect(view.result.current.opponentPresent).toBe(true)
    expect(view.result.current.isMyTurn).toBe(false) // one move in, so seat 1 is on turn
  })

  it('reports whose turn it is from whichever seat opens', async () => {
    const { view } = setup()
    // Seat 1 opens, so seat 0 (me) waits even at move zero.
    await connect(view, state({ firstSeat: Seat.second }))
    expect(view.result.current.firstSeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false)

    mocked.getRoom.mockResolvedValue(state({ firstSeat: Seat.second, moves: [4], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.isMyTurn).toBe(true)
  })

  it('submits a move and applies the confirmed result', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    expect(view.result.current.isMyTurn).toBe(true)

    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.active,
      outcome: null,
      winnerSeat: null,
    })
    let accepted: boolean | undefined
    await act(async () => {
      accepted = await view.result.current.submit(5)
    })
    expect(accepted).toBe(true)
    expect(mocked.submitMove).toHaveBeenCalledWith('AB2K9M', 'tok', 5, 0, false, false)
    expect(onRemoteMove).toHaveBeenCalledWith(5, 0)
  })

  it('passes on a winning move so the server can record who took it', async () => {
    const { view } = setup()
    await connect(view)
    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.finished,
      outcome: Outcome.win,
      winnerSeat: Seat.first,
    })
    await act(async () => {
      await view.result.current.submit(5, true, true)
    })
    expect(mocked.submitMove).toHaveBeenCalledWith('AB2K9M', 'tok', 5, 0, true, true)
    expect(view.result.current.outcome).toBe(Outcome.win)
    expect(view.result.current.winnerSeat).toBe(Seat.first)
  })

  it('reports a rejected move without applying it', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    onRemoteMove.mockClear()
    mocked.submitMove.mockRejectedValueOnce(new HttpError(403))

    let accepted: boolean | undefined
    await act(async () => {
      accepted = await view.result.current.submit(5)
    })
    expect(accepted).toBe(false)
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.error).toMatch(/your turn/i)
  })

  it('notices an opponent who was here and left', async () => {
    const { view } = setup()
    await connect(view)
    expect(view.result.current.opponentLeft).toBe(false)

    mocked.getRoom.mockResolvedValue(
      state({
        seats: [seat(Seat.first, 'Ada', '1,2,3'), seat(Seat.second, 'Bo', '4,5,6', false)],
        status: RoomStatus.finished,
        outcome: Outcome.forfeit,
        winnerSeat: Seat.first,
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.opponentLeft).toBe(true)
    expect(view.result.current.outcome).toBe(Outcome.forfeit)
  })

  it('surfaces a loss on time from the room', async () => {
    const { view } = setup()
    await connect(view, state({ moveLimitSeconds: 30, turnEndsAt: '2030-01-01T00:00:30.000Z' }))
    expect(view.result.current.moveLimitSeconds).toBe(30)
    expect(view.result.current.turnEndsAt).toBe('2030-01-01T00:00:30.000Z')

    mocked.getRoom.mockResolvedValue(
      state({
        status: RoomStatus.finished,
        outcome: Outcome.timeout,
        winnerSeat: Seat.second,
        turnEndsAt: null,
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.outcome).toBe(Outcome.timeout)
    expect(view.result.current.winnerSeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false)
  })

  it('clears the board when another game starts in the same room', async () => {
    const { view, onRemoteMove, onReset } = setup()
    await connect(view, state({ moves: [1, 2], version: 2 }))
    expect(onRemoteMove).toHaveBeenCalledTimes(2)
    onReset.mockClear()
    onRemoteMove.mockClear()

    // Starting a game empties the move list, which is how a fresh one announces itself.
    mocked.startGame.mockResolvedValue(state({ moves: [], version: 0, firstSeat: Seat.second }))
    await act(async () => {
      await view.result.current.start()
    })
    expect(mocked.startGame).toHaveBeenCalledWith('AB2K9M', 'tok')
    expect(onReset).toHaveBeenCalled()
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.firstSeat).toBe(Seat.second)
  })

  it('explains a start nobody is around for', async () => {
    const { view } = setup()
    await connect(view)
    mocked.startGame.mockRejectedValueOnce(new HttpError(409))
    await act(async () => {
      await view.result.current.start()
    })
    expect(view.result.current.error).toMatch(/both players/i)
  })

  it('offers a start only while both are here and no game is running', async () => {
    const { view } = setup()
    // Alone in a fresh room: nothing to start yet.
    await connect(
      view,
      state({ status: RoomStatus.waiting, seats: [seat(Seat.first, 'Ada', '1,2,3')] })
    )
    expect(view.result.current.canStart).toBe(false)

    // Both present and nothing running: ready.
    mocked.getRoom.mockResolvedValue(state({ status: RoomStatus.waiting }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.canStart).toBe(true)
    expect(view.result.current.canChangeSettings).toBe(true)

    // Mid-game: neither starting nor re-settling the terms.
    mocked.getRoom.mockResolvedValue(state({ status: RoomStatus.active }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.canStart).toBe(false)
    expect(view.result.current.canChangeSettings).toBe(false)

    // Finished: the settings open back up and another game can be started.
    mocked.getRoom.mockResolvedValue(
      state({ status: RoomStatus.finished, outcome: Outcome.win, winnerSeat: Seat.first })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.canStart).toBe(true)
    expect(view.result.current.canChangeSettings).toBe(true)
  })

  it('leaves the start to the player who owns the room', async () => {
    const { view } = setup()
    mocked.matchmake.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    mocked.getRoom.mockResolvedValue(state({ status: RoomStatus.waiting }))
    await act(async () => {
      await view.result.current.findGame(BO, {})
    })
    expect(view.result.current.mySeat).toBe(Seat.second)
    // Both players are here, so the only thing withholding the start is the seat.
    expect(view.result.current.opponentPresent).toBe(true)
    expect(view.result.current.canStart).toBe(false)
    expect(view.result.current.canChangeSettings).toBe(false)

    // The owner walks out and the server hands the room over: the seat that stayed takes it on.
    mocked.getRoom.mockResolvedValue(state({ status: RoomStatus.waiting, ownerSeat: Seat.second }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.canChangeSettings).toBe(true)
  })

  it('finds a game against anyone', async () => {
    const { view } = setup()
    mocked.matchmake.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    mocked.getRoom.mockResolvedValue(state({}))
    await act(async () => {
      await view.result.current.findGame(BO, { moveLimitSeconds: 60 })
    })
    // The options only shape a room it opens; joining somebody plays by theirs.
    expect(mocked.matchmake).toHaveBeenCalledWith('ttt', BO, 64, { moveLimitSeconds: 60 })
    expect(view.result.current.mySeat).toBe(Seat.second)
    expect(view.result.current.connection).toBe('connected')
  })

  it('opens create and find rooms at a dialog-picked board size', async () => {
    // A game whose board size varies passes it through `cellCount`; both entry points must honour it,
    // or a matchmade/opened room silently sits at this client's default instead.
    const { view } = setup(vi.fn(), vi.fn(), { acceptsRoom: () => true })
    mocked.getRoom.mockResolvedValue(state({ cellCount: 36 }))

    await act(async () => {
      await view.result.current.create(ADA, { cellCount: 36 })
    })
    expect(mocked.createRoom).toHaveBeenCalledWith('ttt', ADA, 36, { cellCount: 36 })

    mocked.matchmake.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    await act(async () => {
      await view.result.current.findGame(BO, { cellCount: 36 })
    })
    expect(mocked.matchmake).toHaveBeenCalledWith('ttt', BO, 36, { cellCount: 36 })
  })

  it('tells the server when you leave, and forgets the room', async () => {
    const { view } = setup()
    await connect(view)
    mocked.leaveRoom.mockResolvedValue(state({}))
    act(() => view.result.current.leave())

    expect(mocked.leaveRoom).toHaveBeenCalledWith('AB2K9M', 'tok')
    expect(view.result.current.connection).toBe('idle')
    expect(view.result.current.code).toBeNull()
    expect(view.result.current.mySeat).toBeNull()
  })

  it('gives up the seat when the page goes away', async () => {
    const { view } = setup()
    await connect(view)
    act(() => void window.dispatchEvent(new Event('pagehide')))
    expect(mocked.beaconLeave).toHaveBeenCalledWith('AB2K9M', 'tok')
  })

  it('replays the existing moves when joining a game in progress', async () => {
    mocked.joinRoom.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    mocked.getRoom.mockResolvedValue(state({ moves: [3, 7], version: 2 }))

    const { view, onRemoteMove } = setup()
    await act(async () => {
      await view.result.current.join('AB2K9M', BO)
    })
    expect(onRemoteMove).toHaveBeenNthCalledWith(1, 3, 0)
    expect(onRemoteMove).toHaveBeenNthCalledWith(2, 7, 1)
    expect(view.result.current.mySeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false) // two moves in, so seat 0 is on turn
  })

  it('puts you back in the seat this tab was holding', async () => {
    saveRoomSession('ttt', { code: 'AB2K9M', token: 'tok2', seat: Seat.second })
    mocked.getRoom.mockResolvedValue(state({ moves: [3], version: 1 }))

    const { view, onRemoteMove } = setup()
    await act(async () => {
      await Promise.resolve()
    })
    expect(mocked.getRoom).toHaveBeenCalledWith('AB2K9M', 'tok2')
    expect(view.result.current.mySeat).toBe(Seat.second)
    expect(view.result.current.connection).toBe(Connection.connected)
    expect(onRemoteMove).toHaveBeenCalledWith(3, 0)
  })

  it('does not resume into a room playing something else', async () => {
    saveRoomSession('ttt', { code: 'AB2K9M', token: 'tok2', seat: Seat.second })
    mocked.getRoom.mockResolvedValue(state({ gameId: 'othello' }))

    const { view } = setup()
    await act(async () => {
      await Promise.resolve()
    })
    expect(view.result.current.connection).toBe(Connection.idle)
    expect(loadRoomSession('ttt')).toBeNull()
  })

  it('refuses a room whose board is not the one it is playing on', async () => {
    const { view } = setup()
    mocked.getRoom.mockResolvedValue(state({ cellCount: 9 }))
    await act(async () => {
      await view.result.current.join('AB2K9M', BO)
    })
    expect(view.result.current.connection).toBe(Connection.error)
    expect(view.result.current.error).toMatch(/different game/i)
    expect(view.result.current.code).toBeNull()
  })

  it('catches up as soon as the tab comes back to the foreground', async () => {
    const { view } = setup()
    await connect(view)
    mocked.getRoom.mockResolvedValue(state({ moves: [2], version: 1 }))
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })
    expect(view.result.current.version).toBe(1)
  })

  it('tells a full room from one that was never there', async () => {
    const { view } = setup()
    const failWith = async (err: unknown) => {
      mocked.joinRoom.mockRejectedValueOnce(err)
      await act(async () => {
        await view.result.current.join('AB2K9M', BO)
      })
      return view.result.current.error
    }
    expect(await failWith(new HttpError(409))).toMatch(/already full/i)
    expect(await failWith(new HttpError(404))).toMatch(/not found/i)
    expect(await failWith(new HttpError(410))).toMatch(/not found/i)
    expect(await failWith(new Error('offline'))).toMatch(/could not join/i)
  })

  it.each([
    [403, /your turn/i],
    [409, /moved on/i],
    [422, /not allowed/i],
    [500, /could not send/i],
  ])('explains a move the server turned down with %i', async (status, message) => {
    const { view } = setup()
    await connect(view)
    mocked.submitMove.mockRejectedValueOnce(new HttpError(status))
    await act(async () => {
      await view.result.current.submit(5)
    })
    expect(view.result.current.error).toMatch(message)
  })

  it('says something even when the failure carries no status', async () => {
    const { view } = setup()
    await connect(view)
    mocked.submitMove.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await view.result.current.submit(5)
    })
    expect(view.result.current.error).toMatch(/could not send/i)
  })

  it('drops a rejection once the next read comes back clean', async () => {
    // Regression: only entering and leaving a room used to clear the error, so "It is not your turn."
    // stayed on screen as a live alert for the rest of the session.
    const { view } = setup()
    await connect(view)
    mocked.submitMove.mockRejectedValueOnce(new HttpError(403))
    await act(async () => {
      await view.result.current.submit(5)
    })
    expect(view.result.current.error).toMatch(/your turn/i)

    mocked.getRoom.mockResolvedValue(state({ moves: [5], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.error).toBeNull()
  })

  it('restarts the clock on the deadline the move came back with', async () => {
    const { view } = setup()
    await connect(view, state({ moveLimitSeconds: 30, turnEndsAt: '2030-01-01T00:00:30.000Z' }))
    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.active,
      outcome: null,
      winnerSeat: null,
      turnEndsAt: '2030-01-01T00:01:00.000Z',
    })
    await act(async () => {
      await view.result.current.submit(5)
    })
    expect(view.result.current.turnEndsAt).toBe('2030-01-01T00:01:00.000Z')
  })

  it('stops the clock when the move that finished the game comes back', async () => {
    const { view } = setup()
    await connect(view, state({ moveLimitSeconds: 30, turnEndsAt: '2030-01-01T00:00:30.000Z' }))
    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.finished,
      outcome: Outcome.win,
      winnerSeat: Seat.first,
      turnEndsAt: null,
    })
    await act(async () => {
      await view.result.current.submit(5, true, true)
    })
    expect(view.result.current.turnEndsAt).toBeNull()
  })

  it('sends the room version it is appending to, the same one turn order reads', async () => {
    const { view } = setup()
    await connect(view, state({ moves: [1, 2], version: 2 }))
    mocked.submitMove.mockResolvedValue({
      version: 3,
      moves: [1, 2, 5],
      status: RoomStatus.active,
      outcome: null,
      winnerSeat: null,
    })
    await act(async () => {
      await view.result.current.submit(5)
    })
    expect(mocked.submitMove).toHaveBeenCalledWith('AB2K9M', 'tok', 5, 2, false, false)
    expect(view.result.current.version).toBe(3)
  })

  it('replaces every room setting at once, and says when it is too late to', async () => {
    const { view } = setup()
    await connect(view, state({ status: RoomStatus.waiting }))
    mocked.updateSettings.mockResolvedValue(
      state({ status: RoomStatus.waiting, firstSeat: Seat.second, moveLimitSeconds: 30 })
    )
    await act(async () => {
      await view.result.current.changeSettings({
        firstSeat: Seat.second,
        isOpen: false,
        moveLimitSeconds: 30,
      })
    })
    expect(mocked.updateSettings).toHaveBeenCalledWith('AB2K9M', 'tok', {
      firstSeat: Seat.second,
      isOpen: false,
      moveLimitSeconds: 30,
    })
    expect(view.result.current.firstSeat).toBe(Seat.second)
    expect(view.result.current.moveLimitSeconds).toBe(30)
    expect(view.result.current.error).toBeNull()

    const failWith = async (err: unknown) => {
      mocked.updateSettings.mockRejectedValueOnce(err)
      await act(async () => {
        await view.result.current.changeSettings(STANDARD)
      })
      return view.result.current.error
    }
    expect(await failWith(new HttpError(409))).toMatch(/already started/i)
    expect(await failWith(new Error('offline'))).toMatch(/could not change/i)
  })

  it('says something when a start fails for no stated reason', async () => {
    const { view } = setup()
    await connect(view)
    mocked.startGame.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await view.result.current.start()
    })
    expect(view.result.current.error).toMatch(/could not start/i)
  })

  it('lets a failed rename pass rather than interrupting the game', async () => {
    const { view } = setup()
    await connect(view)
    mocked.updateProfile.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await view.result.current.publishProfile({ name: 'Ada!', colour: '7,7,7' })
    })
    expect(view.result.current.error).toBeNull()
    expect(view.result.current.connection).toBe(Connection.connected)
  })

  it('shows the opponent the name and colour a publish came back with', async () => {
    const { view } = setup()
    await connect(view)
    mocked.updateProfile.mockResolvedValue(
      state({ seats: [seat(Seat.first, 'Ada!', '7,7,7'), seat(Seat.second, 'Bo', '4,5,6')] })
    )
    await act(async () => {
      await view.result.current.publishProfile({ name: 'Ada!', colour: '7,7,7' })
    })
    expect(view.result.current.seats[0]).toMatchObject({ name: 'Ada!', colour: '7,7,7' })
  })

  it('rides out a blip and keeps reading the room', async () => {
    const { view } = setup()
    await connect(view)
    mocked.getRoom.mockRejectedValueOnce(new HttpError(500))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.connection).toBe(Connection.connected)
    expect(view.result.current.code).toBe('AB2K9M')

    mocked.getRoom.mockResolvedValue(state({ moves: [4], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.version).toBe(1)
  })

  it('ends the session on a room that is gone, so nothing points at it any more', async () => {
    const { view } = setup()
    await connect(view)
    mocked.getRoom.mockRejectedValue(new HttpError(404))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.connection).toBe(Connection.error)
    expect(view.result.current.error).toMatch(/no longer available/i)
    // The code is out of the join form and out of storage, so nothing retries a room that always fails.
    expect(view.result.current.code).toBeNull()
    expect(loadRoomSession('ttt')).toBeNull()

    const reads = mocked.getRoom.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(mocked.getRoom).toHaveBeenCalledTimes(reads)
  })

  it('refuses a snapshot carrying a move that is not on the board', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    onRemoteMove.mockClear()

    // An out-of-range move no-ops in the consumer's engine while the version marches on, so the turn
    // would flip with nothing placed and the two boards would never agree again.
    mocked.getRoom.mockResolvedValue(state({ moves: [64], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.connection).toBe(Connection.error)
    expect(view.result.current.error).toMatch(/board/i)
  })

  it('caps a no-pass game at one move per cell', async () => {
    // No passes means no headroom: a 65th move on a 64-cell board cannot be real, so it is refused
    // rather than replayed into a desync.
    const { view, onRemoteMove } = setup()
    await connect(view)
    onRemoteMove.mockClear()

    mocked.getRoom.mockResolvedValue(
      state({ moves: Array.from({ length: 65 }, (_, i) => i % 64), version: 65 })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.connection).toBe(Connection.error)
  })

  it('gives a pass-game headroom above the cell count but still caps it', async () => {
    // Passes ride in the list without filling a cell, so the ceiling is a multiple of the cell count:
    // 65 is fine on a 64-cell board, but well past the multiple is still corruption.
    const { view, onRemoteMove } = setup(vi.fn(), vi.fn(), { allowsPass: true })
    await connect(view)
    onRemoteMove.mockClear()

    mocked.getRoom.mockResolvedValue(
      state({ moves: Array.from({ length: 65 }, (_, i) => i % 64), version: 65 })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).toHaveBeenCalledTimes(65)
    expect(view.result.current.connection).toBe(Connection.connected)

    mocked.getRoom.mockResolvedValue(
      state({ moves: Array.from({ length: 129 }, (_, i) => i % 64), version: 129 })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.connection).toBe(Connection.error)
  })

  it('joins a room of another size when acceptsRoom allows, bounding moves by the room', async () => {
    const onRemoteMove = vi.fn()
    const { view } = setup(onRemoteMove, vi.fn(), { acceptsRoom: (s) => s.cellCount === 100 })
    await connect(view, state({ cellCount: 100 }))
    expect(view.result.current.connection).toBe(Connection.connected)
    onRemoteMove.mockClear()

    // Cell 80 is off a 64-board but on this 100-board: bounding by the room's own size keeps it legal.
    mocked.getRoom.mockResolvedValue(state({ cellCount: 100, moves: [80], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).toHaveBeenCalledWith(80, 0)
    expect(view.result.current.connection).toBe(Connection.connected)
  })

  it('sends an aimed move to the server, tagged with the current version', async () => {
    const { view } = setup()
    await connect(view, state({ moves: [1, 2], version: 2 }))
    await act(async () => {
      await view.result.current.aim(9)
    })
    expect(mocked.aimMove).toHaveBeenCalledWith('AB2K9M', 'tok', 9, 2)
  })

  it('accepts a pass (-1) as a move for a game that passes, and hands it to the consumer', async () => {
    const { view, onRemoteMove } = setup(vi.fn(), vi.fn(), { allowsPass: true })
    await connect(view)
    onRemoteMove.mockClear()

    // A pass is a real turn in games like Othello: it rides in the list as -1 and must reach the
    // consumer, not trip the board-range guard.
    mocked.getRoom.mockResolvedValue(state({ moves: [19, -1], version: 2 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).toHaveBeenCalledWith(19, 0)
    expect(onRemoteMove).toHaveBeenCalledWith(-1, 1)
    expect(view.result.current.connection).toBe(Connection.connected)
  })

  it('rejects a pass (-1) for a game that never passes, ending the session', async () => {
    // Default `allowsPass` is off: a stray -1 in a no-pass game is corruption, not a move. Accepting it
    // would no-op in the engine while the version advanced, desyncing the two boards silently.
    const { view, onRemoteMove } = setup()
    await connect(view)
    onRemoteMove.mockClear()

    mocked.getRoom.mockResolvedValue(state({ moves: [19, -1], version: 2 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.connection).toBe(Connection.error)
  })

  it('throws away a read that a move of your own overtook', async () => {
    // Regression: a read issued before the submit but answered after it used to look like a new game
    // (5 moves where 6 were applied), clearing the board, replaying it, and losing the newest move.
    const { view, onRemoteMove, onReset } = setup()
    await connect(view)
    onReset.mockClear()
    onRemoteMove.mockClear()

    const answer = pendingRead()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.active,
      outcome: null,
      winnerSeat: null,
    })
    await act(async () => {
      await view.result.current.submit(5)
    })
    expect(onRemoteMove).toHaveBeenCalledWith(5, 0)

    // The read finally answers, from before the move.
    await act(async () => {
      answer(state({ moves: [], version: 0 }))
      await Promise.resolve()
    })
    expect(onReset).not.toHaveBeenCalled()
    expect(onRemoteMove).toHaveBeenCalledTimes(1)
    expect(view.result.current.version).toBe(1)
  })

  it('never has two reads out at once', async () => {
    const { view } = setup()
    await connect(view)
    pendingRead()
    const reads = mocked.getRoom.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    // Five ticks passed with one read still unanswered, and only that one went out.
    expect(mocked.getRoom).toHaveBeenCalledTimes(reads + 1)
  })

  it('ignores a read that lands after you left the room', async () => {
    // Regression: the late response used to repopulate the room and feed every move back into the
    // consumer, dumping an abandoned game onto a board that had already been cleared.
    const { view, onRemoteMove } = setup()
    await connect(view)
    onRemoteMove.mockClear()

    const answer = pendingRead()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    mocked.leaveRoom.mockResolvedValue(state({}))
    act(() => view.result.current.leave())
    await act(async () => {
      answer(state({ moves: [1, 2, 3], version: 3 }))
      await Promise.resolve()
    })

    expect(view.result.current.code).toBeNull()
    expect(view.result.current.connection).toBe(Connection.idle)
    expect(onRemoteMove).not.toHaveBeenCalled()
  })

  it('ignores a join that answers after you have walked away', async () => {
    const { view } = setup()
    mocked.joinRoom.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    const answer = pendingRead()

    let joining: Promise<void> | undefined
    act(() => {
      joining = view.result.current.join('AB2K9M', BO)
    })
    act(() => view.result.current.leave())
    await act(async () => {
      answer(state({ moves: [1], version: 1 }))
      await joining
    })
    expect(view.result.current.connection).toBe(Connection.idle)
    expect(view.result.current.code).toBeNull()
  })

  it('stops reading the room once it unmounts', async () => {
    const { view } = setup()
    await connect(view)
    const reads = mocked.getRoom.mock.calls.length
    view.unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(mocked.getRoom).toHaveBeenCalledTimes(reads)
  })

  it('gives up the seat when the router navigates away, not only when the tab closes', async () => {
    const { view } = setup()
    await connect(view)
    view.unmount()
    expect(mocked.beaconLeave).toHaveBeenCalledWith('AB2K9M', 'tok')
  })
})
